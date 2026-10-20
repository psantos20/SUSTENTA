import { resposta, verificarUsuario, limitarTaxa, protegerHandler, ErroHttp } from '../lib/seguranca.js';

function numero(v, nome) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new ErroHttp(400, `Campo inválido: ${nome}`);
  return n;
}

export const handler = protegerHandler(['POST'], async (event) => {
  const usuario = await verificarUsuario(event);
  limitarTaxa(`dica:${usuario.uid}`, 5, 60_000);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[dica-ia] ANTHROPIC_API_KEY não configurada');
    return resposta(event, 503, { status: 'error', message: 'Dica indisponível no momento.' });
  }

  if ((event.body || '').length > 2000) throw new ErroHttp(413, 'Requisição muito grande.');
  let corpo;
  try {
    corpo = JSON.parse(event.body || '{}');
  } catch {
    throw new ErroHttp(400, 'JSON inválido.');
  }

  // Só números entram no prompt: nada de texto livre do usuário (evita prompt injection).
  const e = numero(corpo.energia, 'energia');
  const a = numero(corpo.agua, 'agua');
  const o = numero(corpo.outros, 'outros');
  const kg = numero(corpo.co2Kg, 'co2Kg');
  const maior = e >= a && e >= o ? 'energia eletrica' : a >= o ? 'agua' : 'outros gastos';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Consultor de sustentabilidade brasileiro. Dados mensais: Energia R$${e.toFixed(2)}, Agua R$${a.toFixed(2)}, Outros R$${o.toFixed(2)}, CO2 total ${kg.toFixed(1)}kg, maior gasto: ${maior}. Escreva analise personalizada de 3-4 frases em portugues brasileiro com: avaliacao do nivel atual, acao concreta para a categoria principal e impacto estimado com numeros.`,
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[dica-ia] API respondeu', res.status);
    return resposta(event, 502, { status: 'error', message: 'Dica indisponível no momento.' });
  }

  const dica = Array.isArray(data.content) && data.content[0] && typeof data.content[0].text === 'string'
    ? data.content[0].text.slice(0, 2000)
    : null;

  return resposta(event, 200, { status: 'ok', dica });
});
