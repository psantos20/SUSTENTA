/**
 * Utilitários de segurança compartilhados pelas funções serverless.
 * Padrão para toda função nova:
 *   1. Aceitar só os métodos necessários.
 *   2. CORS restrito ao domínio do próprio site.
 *   3. Validar o token do Firebase quando a função usar dados ou custo (IA, banco).
 *   4. Validar/limitar toda entrada.
 *   5. Nunca devolver detalhes internos de erro ao cliente.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Chaves públicas do Firebase Auth (tokens de ID).
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function originsPermitidas() {
  const extras = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // URL e DEPLOY_PRIME_URL são definidas automaticamente pela Netlify.
  return [process.env.URL, process.env.DEPLOY_PRIME_URL, 'http://localhost:5173', 'http://localhost:8888', ...extras]
    .filter(Boolean);
}

function cabecalhos(event, extra = {}) {
  const origem = event.headers?.origin || event.headers?.Origin;
  const permitida = origem && originsPermitidas().includes(origem) ? origem : null;
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...(permitida ? { 'Access-Control-Allow-Origin': permitida, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...extra,
  };
}

export function resposta(event, statusCode, corpo, extra = {}) {
  return { statusCode, headers: cabecalhos(event, extra), body: JSON.stringify(corpo) };
}

/** Valida o token de ID do Firebase enviado em "Authorization: Bearer <token>". */
export async function verificarUsuario(event) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new ErroHttp(500, 'Servidor sem FIREBASE_PROJECT_ID configurado.');

  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ErroHttp(401, 'Login necessário.');

  try {
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('sem sub');
    return { uid: payload.sub, email: payload.email || null, emailVerificado: !!payload.email_verified };
  } catch {
    throw new ErroHttp(401, 'Sessão inválida ou expirada.');
  }
}

/**
 * Limite simples de requisições por chave (ex.: uid). Fica na memória da
 * instância — não é perfeito em serverless, mas freia abuso básico.
 * Para produção com dinheiro envolvido, use um store externo (ex.: Upstash).
 */
const janelas = new Map();
export function limitarTaxa(chave, maxPorJanela = 10, janelaMs = 60_000) {
  const agora = Date.now();
  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio > janelaMs) {
    janelas.set(chave, { inicio: agora, total: 1 });
    return;
  }
  atual.total += 1;
  if (atual.total > maxPorJanela) throw new ErroHttp(429, 'Muitas requisições. Tente novamente em instantes.');
}

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

/** Envolve o handler com tratamento padrão de método, CORS e erros. */
export function protegerHandler(metodos, handler) {
  return async (event, context) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cabecalhos(event), body: '' };
    if (!metodos.includes(event.httpMethod)) return resposta(event, 405, { status: 'error', message: 'Método não permitido.' });
    try {
      return await handler(event, context);
    } catch (e) {
      if (e instanceof ErroHttp) return resposta(event, e.status, { status: 'error', message: e.message });
      console.error('[funcao] erro interno', e);
      return resposta(event, 500, { status: 'error', message: 'Erro interno.' });
    }
  };
}

