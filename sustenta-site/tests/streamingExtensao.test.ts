/**
 * Extensão do navegador do SUSTENTA Streaming: validação dos envios e a função
 * streaming-extensao (código → chave → minutos), com Firestore simulado.
 */
import { describe, expect, it } from 'vitest';
import { diaEmBrasilia, hashChave, normalizarCodigo, validarEnvio } from '../netlify/lib/extensao.js';
import { criarHandler } from '../netlify/functions/streaming-extensao.js';
import { ErroHttp } from '../netlify/lib/seguranca.js';

const AGORA = new Date('2026-11-11T15:00:00Z'); // 12h em Brasília

describe('normalizarCodigo', () => {
  it.each([
    ['482913', '482913'],
    ['482 913', '482913'],
    ['482-913', '482913'],
  ])('"%s" vira "%s"', (entrada, saida) => {
    expect(normalizarCodigo(entrada)).toBe(saida);
  });
  it.each(['48291', '4829134', 'abcdef', '', null, 123456])('%s é inválido', (entrada) => {
    expect(normalizarCodigo(entrada as never)).toBeNull();
  });
});

describe('diaEmBrasilia', () => {
  it('usa o horário de Brasília (UTC-3)', () => {
    expect(diaEmBrasilia(new Date('2026-11-12T02:00:00Z'))).toBe('2026-11-11');
    expect(diaEmBrasilia(new Date('2026-11-12T04:00:00Z'))).toBe('2026-11-12');
  });
});

describe('validarEnvio', () => {
  it('aceita o envio de hoje e devolve mês e dia do mês', () => {
    expect(validarEnvio({ dia: '2026-11-11', minutos: { netflix: 42, prime: 0, spotify: 30 } }, AGORA)).toEqual({
      dia: '2026-11-11',
      mes: '2026-11',
      diaDoMes: '11',
      minutos: { netflix: 42, prime: 0, spotify: 30 },
    });
  });

  it('aceita até 7 dias para trás e 1 para frente', () => {
    expect(() => validarEnvio({ dia: '2026-11-04', minutos: { max: 10 } }, AGORA)).not.toThrow();
    expect(() => validarEnvio({ dia: '2026-11-12', minutos: { max: 10 } }, AGORA)).not.toThrow();
    expect(() => validarEnvio({ dia: '2026-11-03', minutos: { max: 10 } }, AGORA)).toThrow('Dia fora do período aceito.');
    expect(() => validarEnvio({ dia: '2026-11-13', minutos: { max: 10 } }, AGORA)).toThrow('Dia fora do período aceito.');
  });

  it.each([
    [{ dia: '11/11/2026', minutos: { netflix: 1 } }, 'Dia inválido.'],
    [{ dia: '2026-11-11', minutos: { tidal: 1 } }, 'Serviço inválido.'],
    [{ dia: '2026-11-11', minutos: { netflix: 1441 } }, 'Minutos inválidos.'],
    [{ dia: '2026-11-11', minutos: { netflix: -1 } }, 'Minutos inválidos.'],
    [{ dia: '2026-11-11', minutos: { netflix: 1.5 } }, 'Minutos inválidos.'],
    [{ dia: '2026-11-11', minutos: [] }, 'Minutos inválidos.'],
    [{ dia: '2026-11-11', minutos: {} }, 'Nada para enviar.'],
    [null, 'Envio inválido.'],
  ])('recusa %j', (corpo, erro) => {
    expect(() => validarEnvio(corpo as never, AGORA)).toThrow(erro);
  });
});

/** Firestore em memória: doc get/set(merge)/delete, where('==').get, runTransaction. */
function dbFalso() {
  const docs = new Map<string, Record<string, unknown>>();
  const mesclar = (a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> => {
    const r: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      r[k] = v && typeof v === 'object' && !Array.isArray(v) && r[k] && typeof r[k] === 'object' ? mesclar(r[k] as Record<string, unknown>, v as Record<string, unknown>) : v;
    }
    return r;
  };
  const ref = (caminho: string) => ({
    caminho,
    get: async () => ({ exists: docs.has(caminho), data: () => docs.get(caminho) }),
    set: async (v: Record<string, unknown>, op?: { merge?: boolean }) =>
      void docs.set(caminho, op?.merge && docs.has(caminho) ? mesclar(docs.get(caminho)!, v) : v),
    delete: async () => void docs.delete(caminho),
  });
  const db = {
    docs,
    collection: (nome: string) => ({
      doc: (id: string) => ref(`${nome}/${id}`),
      where: (campo: string, _op: string, valor: unknown) => ({
        get: async () => ({
          docs: [...docs.entries()]
            .filter(([c, v]) => c.startsWith(`${nome}/`) && v[campo] === valor)
            .map(([c]) => ({ ref: ref(c) })),
        }),
      }),
    }),
    runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        get: (r: ReturnType<typeof ref>) => r.get(),
        set: (r: ReturnType<typeof ref>, v: Record<string, unknown>, op?: { merge?: boolean }) => void r.set(v, op),
        delete: (r: ReturnType<typeof ref>) => void r.delete(),
      }),
  };
  return db;
}

function montar() {
  const db = dbFalso();
  let relogio = AGORA;
  const handler = criarHandler({
    dbFactory: () => db as never,
    verificar: async (event: { headers?: Record<string, string> }) => {
      if (event.headers?.authorization !== 'Bearer token-da-alice') throw new ErroHttp(401, 'Login necessário.');
      return { uid: 'alice' };
    },
    agora: () => relogio,
  });
  const chamar = async (corpo: unknown, headers: Record<string, string> = {}) => {
    const r = await handler({ httpMethod: 'POST', headers: { 'x-forwarded-for': `ip-${Math.random()}`, ...headers }, body: JSON.stringify(corpo) }, {});
    return { status: r.statusCode, corpo: JSON.parse(r.body || '{}') };
  };
  return { db, chamar, avancar: (ms: number) => (relogio = new Date(relogio.getTime() + ms)) };
}

describe('função streaming-extensao', () => {
  const app = { authorization: 'Bearer token-da-alice' };

  it('fluxo completo: gerar código → vincular → enviar minutos', async () => {
    const { db, chamar } = montar();
    const gerado = await chamar({ acao: 'gerar-codigo' }, app);
    expect(gerado.status).toBe(200);
    expect(gerado.corpo.codigo).toMatch(/^\d{6}$/);

    const vinculo = await chamar({ acao: 'vincular', codigo: gerado.corpo.codigo });
    expect(vinculo.status).toBe(200);
    const chave = vinculo.corpo.chave as string;
    expect(chave.length).toBeGreaterThanOrEqual(40);
    // Só o hash da chave é guardado; o código foi consumido.
    expect(db.docs.has(`extensoes_tokens/${hashChave(chave)}`)).toBe(true);
    expect(JSON.stringify([...db.docs.values()])).not.toContain(chave);
    expect(db.docs.has(`extensoes_codigos/${gerado.corpo.codigo}`)).toBe(false);

    const envio = await chamar({ acao: 'enviar', dia: '2026-11-11', minutos: { netflix: 42 } }, { authorization: `Bearer ${chave}` });
    expect(envio.status).toBe(200);
    await chamar({ acao: 'enviar', dia: '2026-11-10', minutos: { prime: 75 } }, { authorization: `Bearer ${chave}` });
    expect(db.docs.get('streaming_uso/alice_2026-11')).toMatchObject({
      uid: 'alice',
      mes: '2026-11',
      dias: { '11': { netflix: 42 }, '10': { prime: 75 } },
    });
    expect(db.docs.get('streaming_extensao/alice')).toMatchObject({ vinculada: true, ultimoEnvio: AGORA.toISOString() });
  });

  it('código vale uma vez só', async () => {
    const { chamar } = montar();
    const { corpo } = await chamar({ acao: 'gerar-codigo' }, app);
    expect((await chamar({ acao: 'vincular', codigo: corpo.codigo })).status).toBe(200);
    expect(await chamar({ acao: 'vincular', codigo: corpo.codigo })).toEqual({
      status: 400,
      corpo: { status: 'error', message: 'Código inválido ou expirado.' },
    });
  });

  it('código expira em 10 minutos', async () => {
    const { chamar, avancar } = montar();
    const { corpo } = await chamar({ acao: 'gerar-codigo' }, app);
    avancar(10 * 60 * 1000 + 1);
    expect((await chamar({ acao: 'vincular', codigo: corpo.codigo })).status).toBe(400);
  });

  it('gerar código e desvincular exigem login no app', async () => {
    const { chamar } = montar();
    expect((await chamar({ acao: 'gerar-codigo' })).status).toBe(401);
    expect((await chamar({ acao: 'desvincular' })).status).toBe(401);
  });

  it('enviar sem chave ou com chave desconhecida: 401', async () => {
    const { chamar } = montar();
    expect((await chamar({ acao: 'enviar', dia: '2026-11-11', minutos: { netflix: 1 } })).status).toBe(401);
    const r = await chamar({ acao: 'enviar', dia: '2026-11-11', minutos: { netflix: 1 } }, { authorization: `Bearer ${'x'.repeat(43)}` });
    expect(r.status).toBe(401);
  });

  it('envio inválido: 400 com o motivo, nada gravado', async () => {
    const { db, chamar } = montar();
    const { corpo } = await chamar({ acao: 'gerar-codigo' }, app);
    const { corpo: v } = await chamar({ acao: 'vincular', codigo: corpo.codigo });
    const r = await chamar({ acao: 'enviar', dia: '2026-11-11', minutos: { netflix: 5000 } }, { authorization: `Bearer ${v.chave}` });
    expect(r).toEqual({ status: 400, corpo: { status: 'error', message: 'Minutos inválidos.' } });
    expect(db.docs.has('streaming_uso/alice_2026-11')).toBe(false);
  });

  it('desvincular invalida a chave', async () => {
    const { chamar } = montar();
    const { corpo } = await chamar({ acao: 'gerar-codigo' }, app);
    const { corpo: v } = await chamar({ acao: 'vincular', codigo: corpo.codigo });
    expect((await chamar({ acao: 'desvincular' }, app)).status).toBe(200);
    const r = await chamar({ acao: 'enviar', dia: '2026-11-11', minutos: { netflix: 1 } }, { authorization: `Bearer ${v.chave}` });
    expect(r.status).toBe(401);
  });

  it('ação desconhecida: 400', async () => {
    const { chamar } = montar();
    expect((await chamar({ acao: 'apagar-tudo' })).status).toBe(400);
  });
});
