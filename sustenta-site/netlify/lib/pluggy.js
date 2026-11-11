/**
 * Cliente mínimo da API da Pluggy (Open Finance), usado só no servidor.
 * As credenciais (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET) ficam nas variáveis
 * de ambiente da Netlify e nunca vão para o navegador.
 * Docs: https://docs.pluggy.ai
 */
import { ErroHttp } from './seguranca.js';

const BASE = 'https://api.pluggy.ai';
/** A apiKey da Pluggy vale 2 horas; renovamos antes disso. */
const VALIDADE_API_KEY_MS = 100 * 60 * 1000;
/** Limite de páginas de transações por conta (500 por página). */
const MAX_PAGINAS = 10;

export function pluggyConfigurado() {
  return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

let cacheChave = null;

/** Só o texto do erro da Pluggy (nada de tokens), limitado para não poluir o log. */
function motivo(dados) {
  const m = dados && (dados.message || dados.code || dados.error);
  return typeof m === 'string' ? m.slice(0, 200) : '';
}

/** Só para testes: esquece a apiKey guardada. */
export function _limparCacheChave() {
  cacheChave = null;
}

/**
 * @param {{ fetchFn?: typeof fetch, agora?: () => number }} [opcoes]
 */
export function criarClientePluggy({ fetchFn = fetch, agora = Date.now } = {}) {
  async function obterApiKey(forcar = false) {
    if (!forcar && cacheChave && cacheChave.expira > agora()) return cacheChave.apiKey;
    const res = await fetchFn(`${BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: (process.env.PLUGGY_CLIENT_ID || '').trim(),
        clientSecret: (process.env.PLUGGY_CLIENT_SECRET || '').trim(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const dados = await res.json().catch(() => ({}));
    if (!res.ok || typeof dados.apiKey !== 'string') {
      // A mensagem da Pluggy explica o motivo (ex.: credenciais inválidas) e não contém as chaves.
      console.error('[pluggy] falha na autenticação', res.status, motivo(dados));
      throw new ErroHttp(502, 'Serviço do banco indisponível no momento.');
    }
    cacheChave = { apiKey: dados.apiKey, expira: agora() + VALIDADE_API_KEY_MS };
    return dados.apiKey;
  }

  async function chamar(caminho, { method = 'GET', body } = {}, tentouDeNovo = false) {
    const apiKey = await obterApiKey(tentouDeNovo);
    const res = await fetchFn(`${BASE}${caminho}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 && !tentouDeNovo) return chamar(caminho, { method, body }, true);
    if (res.status === 204) return null;
    const dados = await res.json().catch(() => null);
    if (!res.ok) {
      console.error('[pluggy] erro', method, caminho.split('?')[0], res.status, motivo(dados));
      throw new ErroHttp(res.status === 404 ? 404 : 502, 'Serviço do banco indisponível no momento.');
    }
    return dados;
  }

  return {
    /** Token de uso único (30 min) para abrir o widget da Pluggy no navegador. */
    async criarConnectToken(uid, webhookUrl) {
      // Sem avoidDuplicates: uma tentativa cancelada no meio travaria as próximas.
      // A função `streaming` já revoga a conexão anterior quando a pessoa conecta de novo.
      const options = { clientUserId: uid };
      if (webhookUrl) options.webhookUrl = webhookUrl;
      const dados = await chamar('/connect_token', { method: 'POST', body: { options } });
      if (!dados || typeof dados.accessToken !== 'string') throw new ErroHttp(502, 'Serviço do banco indisponível no momento.');
      return dados.accessToken;
    },

    obterItem(itemId) {
      return chamar(`/items/${encodeURIComponent(itemId)}`);
    },

    /** Pede para a Pluggy buscar os dados de novo no banco (assíncrono). */
    atualizarItem(itemId) {
      return chamar(`/items/${encodeURIComponent(itemId)}`, { method: 'PATCH', body: {} });
    },

    apagarItem(itemId) {
      return chamar(`/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    },

    obterConta(accountId) {
      return chamar(`/accounts/${encodeURIComponent(accountId)}`);
    },

    async listarContas(itemId) {
      const dados = await chamar(`/accounts?itemId=${encodeURIComponent(itemId)}`);
      return Array.isArray(dados?.results) ? dados.results : [];
    },

    /** Transações desde dateFrom (AAAA-MM-DD), pela API v2 (paginação por cursor). */
    async listarTransacoes(accountId, dateFrom) {
      const todas = [];
      let caminho = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&dateFrom=${encodeURIComponent(dateFrom)}`;
      for (let pagina = 0; pagina < MAX_PAGINAS && caminho; pagina++) {
        const dados = await chamar(caminho);
        if (Array.isArray(dados?.results)) todas.push(...dados.results);
        const proximo = typeof dados?.next === 'string' && dados.next ? dados.next : null;
        caminho = proximo ? `/v2/transactions${proximo.startsWith('?') ? proximo : `?${proximo}`}` : null;
      }
      return todas;
    },
  };
}
