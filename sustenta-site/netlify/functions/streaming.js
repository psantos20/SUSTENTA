/**
 * SUSTENTA Streaming: conexão com o banco via Open Finance (Pluggy).
 *
 * POST /.netlify/functions/streaming   (exige login: Authorization: Bearer <token do Firebase>)
 *   { acao: 'conectar' }               → token de uso único para abrir o widget da Pluggy
 *   { acao: 'registrar', itemId }      → adiciona a conexão criada no widget (até 5 bancos) e sincroniza
 *   { acao: 'sincronizar' }            → busca as cobranças de todos os bancos de novo
 *   { acao: 'desconectar', itemId? }   → revoga um banco (ou todos, sem itemId) na Pluggy e atualiza/apaga os dados
 *
 * Padrão de segurança do projeto: protegerHandler + verificarUsuario + limitarTaxa,
 * segredos só no servidor, erros genéricos para o cliente.
 */
import { resposta, verificarUsuario, limitarTaxa, protegerHandler, ErroHttp } from '../lib/seguranca.js';
import { criarClientePluggy, pluggyConfigurado } from '../lib/pluggy.js';
import { adminConfigurado, bancoAdmin } from '../lib/firebaseAdmin.js';
import { atualizarNaPluggy, itensRegistrados, sincronizarStreaming, UUID } from '../lib/sincronizarStreaming.js';
import { MAX_CONEXOES } from '../../src/services/streaming.ts';

const ACOES = ['conectar', 'registrar', 'sincronizar', 'desconectar'];

/** URL do webhook (só em produção: a Pluggy exige HTTPS público). */
function urlWebhook() {
  const base = process.env.URL;
  const segredo = process.env.STREAMING_WEBHOOK_SECRET;
  if (!base || !segredo || !base.startsWith('https://')) return undefined;
  return `${base}/.netlify/functions/streaming-webhook?chave=${encodeURIComponent(segredo)}`;
}

function resumo(dados) {
  return { status: 'ok', assinaturas: dados.assinaturas.length, bancos: dados.conexoes.length, ultimaSync: dados.atualizadoEm };
}

export const handler = protegerHandler(['POST'], async (event) => {
  const usuario = await verificarUsuario(event);
  limitarTaxa(`streaming:${usuario.uid}`, 10, 60_000);

  if (!pluggyConfigurado() || !adminConfigurado()) {
    return resposta(event, 503, {
      status: 'error',
      codigo: 'nao_configurado',
      message: 'A conexão com bancos ainda não está configurada no servidor.',
    });
  }

  if ((event.body || '').length > 1000) throw new ErroHttp(413, 'Requisição muito grande.');
  let corpo;
  try {
    corpo = JSON.parse(event.body || '{}');
  } catch {
    throw new ErroHttp(400, 'JSON inválido.');
  }
  const acao = corpo?.acao;
  if (!ACOES.includes(acao)) throw new ErroHttp(400, 'Ação inválida.');

  const pluggy = criarClientePluggy();

  if (acao === 'conectar') {
    const accessToken = await pluggy.criarConnectToken(usuario.uid, urlWebhook());
    return resposta(event, 200, { status: 'ok', accessToken });
  }

  const db = bancoAdmin();
  const itens = await itensRegistrados(db, usuario.uid);

  if (acao === 'registrar') {
    const itemId = corpo.itemId;
    if (typeof itemId !== 'string' || !UUID.test(itemId)) throw new ErroHttp(400, 'Conexão inválida.');
    if (!itens.includes(itemId) && itens.length >= MAX_CONEXOES) {
      // A conexão nova não fica: revoga na Pluggy e avisa.
      await pluggy.apagarItem(itemId).catch(() => {});
      throw new ErroHttp(400, `Você já tem ${MAX_CONEXOES} bancos conectados. Desconecte um para adicionar outro.`);
    }
    const dados = await sincronizarStreaming({ uid: usuario.uid, itemIds: [...itens, itemId], pluggy, db });
    return resposta(event, 200, resumo(dados));
  }

  if (acao === 'sincronizar') {
    if (itens.length === 0) throw new ErroHttp(404, 'Nenhum banco conectado.');
    limitarTaxa(`streaming-sync:${usuario.uid}`, 3, 60_000);
    // "Atualizar agora" = buscar no banco de novo, não só reler o que a Pluggy já tinha.
    await atualizarNaPluggy({ itemIds: itens, pluggy });
    const dados = await sincronizarStreaming({ uid: usuario.uid, itemIds: itens, pluggy, db });
    return resposta(event, 200, resumo(dados));
  }

  // desconectar: um banco (itemId) ou todos (sem itemId)
  const alvo = corpo.itemId;
  if (alvo !== undefined && (typeof alvo !== 'string' || !UUID.test(alvo) || !itens.includes(alvo))) {
    throw new ErroHttp(400, 'Conexão inválida.');
  }
  const remover = alvo ? [alvo] : itens;
  for (const itemId of remover) {
    await pluggy.apagarItem(itemId).catch((e) => {
      if (!(e instanceof ErroHttp && e.status === 404)) throw e;
    });
  }
  const restantes = itens.filter((i) => !remover.includes(i));
  if (restantes.length === 0) {
    await db.collection('streaming').doc(usuario.uid).delete();
  } else {
    await sincronizarStreaming({ uid: usuario.uid, itemIds: restantes, pluggy, db });
  }
  return resposta(event, 200, { status: 'ok' });
});
