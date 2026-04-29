exports.handler = async function (event) {
  try {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          status: 'error',
          message: 'NEWS_API_KEY não configurada no Netlify.',
        }),
      };
    }

    const params = event.queryStringParameters || {};
    const categoria = params.categoria || 'sustentabilidade';

    const termos = {
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

    const q = termos[categoria] || termos.sustentabilidade;

    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', q);
    url.searchParams.set('language', 'pt');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', '20');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          status: 'error',
          message: data.message || `Erro da NewsAPI: ${response.status}`,
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro interno na função news.',
      }),
    };
  }
};