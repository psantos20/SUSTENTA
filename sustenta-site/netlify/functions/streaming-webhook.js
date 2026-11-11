/**
 * Webhook da Pluggy para o SUSTENTA Streaming.
 *
 * A Pluggy chama esta URL quando há dados novos de uma conexão. Segurança:
 *  - a URL leva um segredo (?chave=STREAMING_WEBHOOK_SECRET), conferido em tempo constante;
 *  - o clientId do aviso precisa ser o nosso (PLUGGY_CLIENT_ID);
 *  - o aviso é só um sinal: os dados são buscados de novo na própria Pluggy, e só
 *    sincronizamos conexões que a pessoa registrou pelo app;
 *  - sempre respondemos rápido (a Pluggy espera até 10 s) e sem detalhes.
 */
import { timingSafeEqual } from 'node:crypto';
import { criarClientePluggy, pluggyConfigurado } from '../lib/pluggy.js';
import { adminConfigurado, bancoAdmin } from '../lib/firebaseAdmin.js';
import { sincronizarSeRegistrado, UUID } from '../lib/sincronizarStreaming.js';

const EVENTOS_ITEM = ['item/updated', 'item/login_succeeded'];

function vazio(statusCode) {
  return { statusCode, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }, body: '' };
}

function segredoConfere(recebido, esperado) {
  const a = Buffer.from(String(recebido));
  const b = Buffer.from(String(esperado));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Dependências injetáveis, para testar sem rede. */
export function criarHandler({ pluggyFactory = () => criarClientePluggy(), dbFactory = () => bancoAdmin() } = {}) {
  return async (event) => {
    if (event.httpMethod !== 'POST') return vazio(405);

    const segredo = process.env.STREAMING_WEBHOOK_SECRET;
    const chave = event.queryStringParameters?.chave ?? '';
    if (!segredo || !segredoConfere(chave, segredo)) return vazio(401);
    if ((event.body || '').length > 20_000) return vazio(413);

    let corpo;
    try {
      corpo = JSON.parse(event.body || '{}');
    } catch {
      return vazio(400);
    }
    if (corpo?.clientId && corpo.clientId !== process.env.PLUGGY_CLIENT_ID) return vazio(401);
    if (!pluggyConfigurado() || !adminConfigurado()) return vazio(200);

    try {
      const pluggy = pluggyFactory();
      const db = dbFactory();
      const evento = String(corpo?.event ?? '');
      if (EVENTOS_ITEM.includes(evento) && UUID.test(String(corpo.itemId ?? ''))) {
        await sincronizarSeRegistrado({ itemId: corpo.itemId, pluggy, db });
      } else if (evento === 'transactions/created' && UUID.test(String(corpo.accountId ?? ''))) {
        const conta = await pluggy.obterConta(corpo.accountId);
        if (conta && UUID.test(String(conta.itemId ?? ''))) {
          await sincronizarSeRegistrado({ itemId: conta.itemId, pluggy, db });
        }
      }
    } catch (e) {
      console.error('[streaming-webhook] falha ao sincronizar', e?.status ?? '');
    }
    return vazio(200);
  };
}

export const handler = criarHandler();
