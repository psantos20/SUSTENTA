/**
 * SUSTENTA Streaming: extensão do navegador.
 *
 * POST /.netlify/functions/streaming-extensao
 *   Pelo app (Authorization: Bearer <token do Firebase>):
 *     { acao: 'gerar-codigo' }  → código de 6 dígitos, vale 10 minutos e uma vez
 *     { acao: 'desvincular' }   → invalida as chaves de todas as extensões da pessoa
 *   Pela extensão:
 *     { acao: 'vincular', codigo }                      → troca o código por uma chave da extensão
 *     { acao: 'enviar', dia, minutos }  + Bearer <chave> → grava os minutos do dia
 *
 * Segurança: a chave da extensão só serve para enviar minutos; guardamos apenas o
 * hash dela. O envio é validado (serviços conhecidos, 0 a 1440 minutos, dias recentes).
 */
import { resposta, verificarUsuario, limitarTaxa, protegerHandler, ErroHttp } from '../lib/seguranca.js';
import { adminConfigurado, bancoAdmin } from '../lib/firebaseAdmin.js';
import {
  VALIDADE_CODIGO_MS,
  gerarChaveExtensao,
  gerarCodigo,
  hashChave,
  normalizarCodigo,
  validarEnvio,
} from '../lib/extensao.js';

const ACOES = ['gerar-codigo', 'desvincular', 'vincular', 'enviar'];

function ipDe(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || String(h['x-forwarded-for'] || '').split(',')[0].trim() || 'desconhecido';
}

function chaveDoCabecalho(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const m = auth.match(/^Bearer\s+([A-Za-z0-9_-]{20,100})$/);
  return m ? m[1] : null;
}

/** Dependências injetáveis, para testar sem Firebase. */
export function criarHandler({ dbFactory, verificar = verificarUsuario, agora = () => new Date() } = {}) {
  const obterDb = dbFactory ?? (() => bancoAdmin());
  return protegerHandler(['POST'], async (event) => {
    if (!dbFactory && !adminConfigurado()) {
      return resposta(event, 503, { status: 'error', codigo: 'nao_configurado', message: 'Extensão indisponível no momento.' });
    }
    if ((event.body || '').length > 2000) throw new ErroHttp(413, 'Requisição muito grande.');
    let corpo;
    try {
      corpo = JSON.parse(event.body || '{}');
    } catch {
      throw new ErroHttp(400, 'JSON inválido.');
    }
    const acao = corpo?.acao;
    if (!ACOES.includes(acao)) throw new ErroHttp(400, 'Ação inválida.');
    const db = obterDb();
    const instante = agora();

    // ── Pelo app ───────────────────────────────────────────────────────────
    if (acao === 'gerar-codigo') {
      const usuario = await verificar(event);
      limitarTaxa(`ext-codigo:${usuario.uid}`, 5, 60_000);
      const expiraEm = instante.getTime() + VALIDADE_CODIGO_MS;
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const codigo = gerarCodigo();
        const ref = db.collection('extensoes_codigos').doc(codigo);
        const existente = await ref.get();
        if (existente.exists && existente.data().expiraEm > instante.getTime()) continue;
        await ref.set({ uid: usuario.uid, expiraEm });
        return resposta(event, 200, { status: 'ok', codigo, expiraEm });
      }
      throw new ErroHttp(503, 'Tente de novo em instantes.');
    }

    if (acao === 'desvincular') {
      const usuario = await verificar(event);
      limitarTaxa(`ext-desvincular:${usuario.uid}`, 5, 60_000);
      const chaves = await db.collection('extensoes_tokens').where('uid', '==', usuario.uid).get();
      await Promise.all(chaves.docs.map((d) => d.ref.delete()));
      await db.collection('streaming_extensao').doc(usuario.uid).delete();
      return resposta(event, 200, { status: 'ok' });
    }

    // ── Pela extensão ──────────────────────────────────────────────────────
    if (acao === 'vincular') {
      limitarTaxa(`ext-vincular:${ipDe(event)}`, 10, 60_000);
      const codigo = normalizarCodigo(corpo.codigo);
      if (!codigo) throw new ErroHttp(400, 'Código inválido ou expirado.');
      const chave = gerarChaveExtensao();
      const uid = await db.runTransaction(async (tx) => {
        const refCodigo = db.collection('extensoes_codigos').doc(codigo);
        const snap = await tx.get(refCodigo);
        if (!snap.exists || !(snap.data().expiraEm > instante.getTime())) return null;
        const dono = snap.data().uid;
        tx.delete(refCodigo);
        tx.set(db.collection('extensoes_tokens').doc(hashChave(chave)), { uid: dono, criadoEm: instante.toISOString() });
        tx.set(
          db.collection('streaming_extensao').doc(dono),
          { vinculada: true, vinculadaEm: instante.toISOString(), ultimoEnvio: null },
          { merge: true },
        );
        return dono;
      });
      if (!uid) throw new ErroHttp(400, 'Código inválido ou expirado.');
      return resposta(event, 200, { status: 'ok', chave });
    }

    // enviar
    const chave = chaveDoCabecalho(event);
    if (!chave) throw new ErroHttp(401, 'Extensão não vinculada.');
    const hash = hashChave(chave);
    limitarTaxa(`ext-enviar:${hash}`, 20, 60_000);
    const token = await db.collection('extensoes_tokens').doc(hash).get();
    if (!token.exists) throw new ErroHttp(401, 'Extensão desvinculada. Gere um novo código no SUSTENTA.');
    const uid = token.data().uid;

    let envio;
    try {
      envio = validarEnvio(corpo, instante);
    } catch (e) {
      throw new ErroHttp(400, e.message);
    }
    await db
      .collection('streaming_uso')
      .doc(`${uid}_${envio.mes}`)
      .set({ uid, mes: envio.mes, dias: { [envio.diaDoMes]: envio.minutos }, atualizadoEm: instante.toISOString() }, { merge: true });
    await db.collection('streaming_extensao').doc(uid).set({ vinculada: true, ultimoEnvio: instante.toISOString() }, { merge: true });
    return resposta(event, 200, { status: 'ok' });
  });
}

export const handler = criarHandler();
