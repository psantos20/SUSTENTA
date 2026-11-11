/**
 * Sincronização do SUSTENTA Streaming: busca as transações de TODOS os bancos
 * conectados na Pluggy, detecta as assinaturas e grava o resultado em streaming/{uid}.
 * Usada pela função `streaming` (conectar, Atualizar, desconectar um banco) e pelo
 * `streaming-webhook` (quando a Pluggy avisa que há dados novos).
 *
 * Guarda o mínimo: só as assinaturas detectadas (serviço, valor, plano, datas) e,
 * de cada conexão, o nome do banco e a situação. O extrato nunca é gravado.
 */
import { conexoesDe, converterTransacoesPluggy, detectarAssinaturas, nomeDaInstituicao } from '../../src/services/streaming.ts';
import { CATALOGO_PLANOS } from '../../src/services/catalogoPlanos.ts';
import { ErroHttp } from './seguranca.js';

/** Quantos dias de transações olhamos (3 meses + folga, para achar 2 cobranças seguidas). */
export const DIAS_HISTORICO = 95;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESPERAS_ATUALIZACAO = new Set(['UPDATING', 'CREATED']);

/**
 * Pede para a Pluggy buscar os dados de novo em cada conexão e espera terminar
 * (até `limiteMs`). Sem isso, um banco recém-adicionado no MeuPluggy só aparece
 * na próxima atualização automática da Pluggy. Erros aqui não impedem a leitura.
 */
export async function atualizarNaPluggy({ itemIds, pluggy, limiteMs = 25_000, intervaloMs = 2_000, dormir }) {
  const esperar = dormir ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const pendentes = [];
  for (const itemId of new Set(itemIds)) {
    try {
      await pluggy.atualizarItem(itemId);
      pendentes.push(itemId);
    } catch {
      // Ex.: atualização já em andamento ou limite da Pluggy. Lemos o que houver.
    }
  }
  const fim = Date.now() + limiteMs;
  while (pendentes.length > 0 && Date.now() < fim) {
    await esperar(intervaloMs);
    for (let i = pendentes.length - 1; i >= 0; i--) {
      const item = await pluggy.obterItem(pendentes[i]).catch(() => null);
      if (!item || !ESPERAS_ATUALIZACAO.has(item.status)) pendentes.splice(i, 1);
    }
  }
  return { aindaAtualizando: pendentes.length };
}

function diasAtras(agora, dias) {
  return new Date(agora.getTime() - dias * 86_400_000).toISOString().slice(0, 10);
}

/** Itens (conexões) atualmente registrados para a pessoa. */
export async function itensRegistrados(db, uid) {
  const doc = await db.collection('streaming').doc(uid).get();
  return doc.exists ? conexoesDe(doc.data()).map((c) => c.itemId) : [];
}

/**
 * Lê todas as conexões da pessoa e regrava streaming/{uid}.
 * Uma conexão que não pertence à pessoa interrompe tudo (403). Uma conexão que
 * sumiu na Pluggy (404) é descartada; outros erros ficam marcados como ERRO.
 *
 * @param {{ uid: string, itemIds: string[], pluggy: ReturnType<import('./pluggy.js').criarClientePluggy>,
 *           db: FirebaseFirestore.Firestore, agora?: Date }} p
 */
export async function sincronizarStreaming({ uid, itemIds, pluggy, db, agora = new Date() }) {
  const ref = db.collection('streaming').doc(uid);
  const unicos = [...new Set(itemIds)];
  if (unicos.length === 0) {
    await ref.delete();
    return { conexoes: [], assinaturas: [], atualizadoEm: agora.toISOString() };
  }

  const desde = diasAtras(agora, DIAS_HISTORICO);
  const transacoes = [];
  const conexoes = [];
  for (const itemId of unicos) {
    let item;
    try {
      item = await pluggy.obterItem(itemId);
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 404) continue; // conexão apagada na Pluggy
      conexoes.push({ itemId, banco: null, status: 'ERRO', ultimaSync: null });
      continue;
    }
    // Cada conexão precisa ter sido criada por esta mesma conta (clientUserId = uid).
    if (!item || item.clientUserId !== uid) throw new ErroHttp(403, 'Esta conexão não pertence à sua conta.');

    const contas = await pluggy.listarContas(itemId);
    // Diagnóstico sem dados sensíveis: quantas contas e de que tipo/nome a Pluggy devolveu.
    console.info(
      `[streaming] conexão ${itemId.slice(0, 8)}… (${item.connector?.name ?? '?'}, ${item.status}): ` +
        (contas.map((c) => `${c?.type}/${String(c?.marketingName || c?.name || '').slice(0, 30)}`).join(', ') || 'nenhuma conta'),
    );
    for (const conta of contas) {
      if (conta?.type !== 'BANK' && conta?.type !== 'CREDIT') continue;
      const lista = await pluggy.listarTransacoes(conta.id, desde);
      transacoes.push(...converterTransacoesPluggy(lista, conta.type));
    }
    conexoes.push({
      itemId,
      banco: nomeDaInstituicao(item.connector?.name, contas.map((c) => c?.marketingName || c?.name)),
      status: typeof item.status === 'string' ? item.status.slice(0, 40) : 'UPDATED',
      ultimaSync: agora.toISOString(),
    });
  }

  const dados = {
    conexoes,
    assinaturas: detectarAssinaturas(transacoes, CATALOGO_PLANOS),
    atualizadoEm: agora.toISOString(),
  };
  // set sem merge: some o campo antigo "conexao" (formato de uma conexão só).
  await ref.set(dados);
  return dados;
}

/**
 * Para o webhook: sincroniza só se a pessoa registrou esse item pelo app.
 * Devolve true se sincronizou.
 */
export async function sincronizarSeRegistrado({ itemId, pluggy, db, agora }) {
  const item = await pluggy.obterItem(itemId);
  const uid = item?.clientUserId;
  if (typeof uid !== 'string' || !uid) return false;
  const itens = await itensRegistrados(db, uid);
  if (!itens.includes(itemId)) return false;
  await sincronizarStreaming({ uid, itemIds: itens, pluggy, db, agora });
  return true;
}
