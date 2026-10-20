import { resposta, protegerHandler } from '../lib/seguranca.js';

// Só estas categorias são aceitas (nada do usuário vai direto para a NewsAPI).
const TERMOS = {
  sustentabilidade:
    '"sustentabilidade" OR "meio ambiente" OR "impacto ambiental" OR "ecologia"',
  energia:
    '"energia solar" OR "energia renovavel" OR "energia eolica" OR "energia limpa" OR "painel solar" OR "biocombustivel"',
  agua:
    '"crise hidrica" OR "saneamento basico" OR "escassez de agua" OR "desperdicio de agua" OR "tratamento de esgoto"',
  clima:
    '"mudancas climaticas" OR "aquecimento global" OR "desmatamento" OR "emissao de carbono" OR "gases de efeito estufa" OR "COP" OR "acordo de paris"',
  residuos:
    '"reciclagem" OR "residuos solidos" OR "economia circular" OR "coleta seletiva" OR "lixo eletronico" OR "compostagem"',
};

function urlSegura(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function texto(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : null;
}

export const handler = protegerHandler(['GET'], async (event) => {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.error('[news] NEWS_API_KEY não configurada');
    return resposta(event, 500, { status: 'error', message: 'Serviço de notícias indisponível.' });
  }

  const categoria = (event.queryStringParameters || {}).categoria;
  const q = Object.prototype.hasOwnProperty.call(TERMOS, categoria) ? TERMOS[categoria] : TERMOS.sustentabilidade;

  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', q);
  url.searchParams.set('language', 'pt');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', '20');

  // Chave no cabeçalho (não na URL, para não aparecer em logs).
  const response = await fetch(url.toString(), {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[news] NewsAPI respondeu', response.status, data && data.code);
    return resposta(event, 502, { status: 'error', message: 'Não foi possível carregar as notícias agora.' });
  }

  // Devolve só os campos usados pelo app, já sanitizados.
  const articles = (Array.isArray(data.articles) ? data.articles : [])
    .map((a) => ({
      title: texto(a.title, 300),
      description: texto(a.description, 1000),
      author: texto(a.author, 120),
      source: { name: texto(a.source && a.source.name, 120) },
      url: urlSegura(a.url),
      urlToImage: urlSegura(a.urlToImage),
      publishedAt: texto(a.publishedAt, 40),
    }))
    .filter((a) => a.title && a.url);

  return resposta(
    event,
    200,
    { status: 'ok', articles },
    {
      // Cache na CDN por 1h (substitui o antigo cache no Firestore).
      'Cache-Control': 'public, max-age=300',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    }
  );
});
