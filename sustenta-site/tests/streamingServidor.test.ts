/**
 * SUSTENTA Streaming no servidor: cliente da Pluggy, sincronização e webhook,
 * com Pluggy e Firestore simulados (sem rede).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _limparCacheChave, criarClientePluggy } from '../netlify/lib/pluggy.js';
import { sincronizarSeRegistrado, sincronizarStreaming } from '../netlify/lib/sincronizarStreaming.js';
import { criarHandler } from '../netlify/functions/streaming-webhook.js';
import { ErroHttp } from '../netlify/lib/seguranca.js';

const UID = 'alice';
const ITEM = '11111111-2222-4333-8444-555555555555';
const CONTA = '99999999-8888-4777-8666-555555555555';
const AGORA = new Date('2026-11-01T12:00:00Z');

function respostaJson(status: number, corpo: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response;
}

/** Firestore em memória com o mínimo que as funções usam. */
function dbFalso(inicial: Record<string, unknown> = {}) {
  const docs = new Map(Object.entries(inicial));
  return {
    docs,
    collection: (nome: string) => ({
      doc: (id: string) => ({
        get: async () => ({ exists: docs.has(`${nome}/${id}`), data: () => docs.get(`${nome}/${id}`) }),
        set: async (v: unknown) => void docs.set(`${nome}/${id}`, v),
        delete: async () => void docs.delete(`${nome}/${id}`),
      }),
    }),
  };
}

function pluggyFalso(dono = UID) {
  return {
    obterItem: vi.fn(async () => ({ id: ITEM, clientUserId: dono, status: 'UPDATED', connector: { name: 'Nubank' } })),
    listarContas: vi.fn(async () => [
      { id: CONTA, type: 'CREDIT' },
      { id: 'outra', type: 'INVESTMENT' },
    ]),
    listarTransacoes: vi.fn(async () => [
      { description: 'NETFLIX.COM', amount: 59.9, date: '2026-09-12T03:00:00Z' },
      { description: 'NETFLIX.COM', amount: 59.9, date: '2026-10-12T03:00:00Z' },
      { description: 'Mercado do bairro', amount: 212.4, date: '2026-10-01T03:00:00Z' },
    ]),
    obterConta: vi.fn(async () => ({ id: CONTA, itemId: ITEM })),
    apagarItem: vi.fn(async () => null),
    criarConnectToken: vi.fn(async () => 'token'),
  };
}

describe('criarClientePluggy', () => {
  beforeEach(() => {
    process.env.PLUGGY_CLIENT_ID = 'id';
    process.env.PLUGGY_CLIENT_SECRET = 'segredo';
    _limparCacheChave();
  });

  it('autentica uma vez, reaproveita a apiKey e manda o cabeçalho X-API-KEY', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) return respostaJson(200, { apiKey: 'chave-1' });
      return respostaJson(200, { id: ITEM });
    });
    const cliente = criarClientePluggy({ fetchFn: fetchFn as unknown as typeof fetch });
    await cliente.obterItem(ITEM);
    await cliente.obterItem(ITEM);
    const chamadasAuth = fetchFn.mock.calls.filter(([u]) => String(u).endsWith('/auth'));
    expect(chamadasAuth).toHaveLength(1);
    const [, opcoes] = fetchFn.mock.calls[1] as unknown as [string, RequestInit];
    expect((opcoes.headers as Record<string, string>)['X-API-KEY']).toBe('chave-1');
  });

  it('segue o cursor "next" da API v2 de transações', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) return respostaJson(200, { apiKey: 'k' });
      if (url.includes('after=abc')) return respostaJson(200, { results: [{ id: 2 }], next: null });
      return respostaJson(200, { results: [{ id: 1 }], next: '?after=abc&accountId=x' });
    });
    const cliente = criarClientePluggy({ fetchFn: fetchFn as unknown as typeof fetch });
    const r = await cliente.listarTransacoes(CONTA, '2026-08-01');
    expect(r).toEqual([{ id: 1 }, { id: 2 }]);
    expect(String(fetchFn.mock.calls[1][0])).toContain('/v2/transactions?accountId=');
    expect(String(fetchFn.mock.calls[1][0])).toContain('dateFrom=2026-08-01');
  });

  it('connect token leva o clientUserId dentro de options', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) return respostaJson(200, { apiKey: 'k' });
      return respostaJson(200, { accessToken: 'tok' });
    });
    const cliente = criarClientePluggy({ fetchFn: fetchFn as unknown as typeof fetch });
    expect(await cliente.criarConnectToken(UID, undefined)).toBe('tok');
    const [, opcoes] = fetchFn.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(String(opcoes.body))).toEqual({ options: { clientUserId: UID } });
  });

  it('erro da Pluggy vira mensagem genérica', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith('/auth')) return respostaJson(200, { apiKey: 'k' });
      return respostaJson(500, { message: 'detalhe interno' });
    });
    const cliente = criarClientePluggy({ fetchFn: fetchFn as unknown as typeof fetch });
    await expect(cliente.obterItem(ITEM)).rejects.toThrow('Serviço do banco indisponível no momento.');
  });
});

describe('sincronizarStreaming', () => {
  it('detecta as assinaturas e grava só o resumo em streaming/{uid}', async () => {
    const db = dbFalso();
    const pluggy = pluggyFalso();
    const dados = await sincronizarStreaming({ uid: UID, itemIds: [ITEM], pluggy, db: db as never, agora: AGORA });
    expect(dados.assinaturas.map((a: { servico: string }) => a.servico)).toEqual(['netflix']);
    expect(dados.conexoes).toEqual([{ itemId: ITEM, banco: 'Nubank', status: 'UPDATED', ultimaSync: AGORA.toISOString() }]);
    expect(db.docs.get(`streaming/${UID}`)).toEqual(dados);
    // Só contas BANK e CREDIT; 95 dias de histórico.
    expect(pluggy.listarTransacoes).toHaveBeenCalledTimes(1);
    expect(pluggy.listarTransacoes).toHaveBeenCalledWith(CONTA, '2026-07-29');
    // Nada do extrato é gravado.
    expect(JSON.stringify(db.docs.get(`streaming/${UID}`))).not.toContain('Mercado');
  });

  it('recusa conexão criada por outra conta', async () => {
    const db = dbFalso();
    await expect(
      sincronizarStreaming({ uid: UID, itemIds: [ITEM], pluggy: pluggyFalso('bob'), db: db as never, agora: AGORA }),
    ).rejects.toThrow('Esta conexão não pertence à sua conta.');
    expect(db.docs.size).toBe(0);
  });
});

describe('vários bancos', () => {
  const ITEM2 = '22222222-3333-4444-8555-666666666666';

  it('junta as transações de todos os bancos e lista as conexões', async () => {
    const db = dbFalso();
    const pluggy = pluggyFalso();
    pluggy.obterItem.mockImplementation(async (id: string) =>
      id === ITEM
        ? { id, clientUserId: UID, status: 'UPDATED', connector: { name: 'Nubank' } }
        : { id, clientUserId: UID, status: 'UPDATED', connector: { name: 'MeuPluggy' } },
    );
    pluggy.listarContas.mockImplementation(async (id: string) =>
      id === ITEM ? [{ id: 'c1', type: 'CREDIT', name: 'Cartão' }] : [{ id: 'c2', type: 'CREDIT', marketingName: 'Cartão Mercado Pago' }],
    );
    pluggy.listarTransacoes.mockImplementation(async (conta: string) =>
      conta === 'c1'
        ? [
            { description: 'NETFLIX.COM', amount: 44.9, date: '2026-09-14' },
            { description: 'NETFLIX.COM', amount: 44.9, date: '2026-10-14' },
          ]
        : [
            { description: 'SPOTIFY', amount: 21.9, date: '2026-09-05' },
            { description: 'SPOTIFY', amount: 21.9, date: '2026-10-05' },
          ],
    );
    const dados = await sincronizarStreaming({ uid: UID, itemIds: [ITEM, ITEM2], pluggy, db: db as never, agora: AGORA });
    expect(dados.assinaturas.map((a: { servico: string }) => a.servico)).toEqual(['netflix', 'spotify']);
    expect(dados.conexoes.map((c: { banco: string }) => c.banco)).toEqual(['Nubank', 'Mercado Pago']);
  });

  it('conexão apagada na Pluggy (404) é descartada', async () => {
    const db = dbFalso();
    const pluggy = pluggyFalso();
    pluggy.obterItem.mockImplementation(async (id: string) => {
      if (id === ITEM2) throw new ErroHttp(404, 'x');
      return { id, clientUserId: UID, status: 'UPDATED', connector: { name: 'Nubank' } };
    });
    const dados = await sincronizarStreaming({ uid: UID, itemIds: [ITEM, ITEM2], pluggy, db: db as never, agora: AGORA });
    expect(dados.conexoes.map((c: { itemId: string }) => c.itemId)).toEqual([ITEM]);
  });

  it('sem conexões: apaga o documento', async () => {
    const db = dbFalso({ [`streaming/${UID}`]: { conexoes: [] } });
    await sincronizarStreaming({ uid: UID, itemIds: [], pluggy: pluggyFalso(), db: db as never, agora: AGORA });
    expect(db.docs.has(`streaming/${UID}`)).toBe(false);
  });
});

describe('sincronizarSeRegistrado', () => {
  it('só sincroniza se a pessoa registrou esse item pelo app', async () => {
    const semRegistro = dbFalso();
    expect(await sincronizarSeRegistrado({ itemId: ITEM, pluggy: pluggyFalso(), db: semRegistro as never, agora: AGORA })).toBe(false);

    const outroItem = dbFalso({ [`streaming/${UID}`]: { conexao: { itemId: 'outro' } } });
    expect(await sincronizarSeRegistrado({ itemId: ITEM, pluggy: pluggyFalso(), db: outroItem as never, agora: AGORA })).toBe(false);

    const registrado = dbFalso({ [`streaming/${UID}`]: { conexao: { itemId: ITEM } } });
    expect(await sincronizarSeRegistrado({ itemId: ITEM, pluggy: pluggyFalso(), db: registrado as never, agora: AGORA })).toBe(true);
  });
});

describe('streaming-webhook', () => {
  const ambiente = { ...process.env };
  beforeEach(() => {
    process.env.STREAMING_WEBHOOK_SECRET = 'segredo-do-webhook';
    process.env.PLUGGY_CLIENT_ID = 'meu-client';
    process.env.PLUGGY_CLIENT_SECRET = 'x';
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = 'x';
  });
  afterEach(() => {
    process.env = { ...ambiente };
  });

  const evento = (corpo: unknown, chave = 'segredo-do-webhook', httpMethod = 'POST') => ({
    httpMethod,
    queryStringParameters: { chave },
    body: JSON.stringify(corpo),
  });

  it('sem o segredo certo: 401 e nada acontece', async () => {
    const pluggy = pluggyFalso();
    const handler = criarHandler({ pluggyFactory: () => pluggy, dbFactory: () => dbFalso() as never });
    expect((await handler(evento({ event: 'item/updated', itemId: ITEM }, 'errado'))).statusCode).toBe(401);
    expect((await handler(evento({ event: 'item/updated', itemId: ITEM }, ''))).statusCode).toBe(401);
    expect(pluggy.obterItem).not.toHaveBeenCalled();
  });

  it('clientId de outra aplicação: 401', async () => {
    const handler = criarHandler({ pluggyFactory: () => pluggyFalso(), dbFactory: () => dbFalso() as never });
    expect((await handler(evento({ event: 'item/updated', itemId: ITEM, clientId: 'outro' }))).statusCode).toBe(401);
  });

  it('só aceita POST', async () => {
    const handler = criarHandler({ pluggyFactory: () => pluggyFalso(), dbFactory: () => dbFalso() as never });
    expect((await handler(evento({}, 'segredo-do-webhook', 'GET'))).statusCode).toBe(405);
  });

  it('item/updated de item registrado: sincroniza e responde 200', async () => {
    const db = dbFalso({ [`streaming/${UID}`]: { conexao: { itemId: ITEM } } });
    const handler = criarHandler({ pluggyFactory: () => pluggyFalso(), dbFactory: () => db as never });
    const r = await handler(evento({ event: 'item/updated', itemId: ITEM, clientId: 'meu-client' }));
    expect(r.statusCode).toBe(200);
    expect((db.docs.get(`streaming/${UID}`) as { assinaturas: unknown[] }).assinaturas).toHaveLength(1);
  });

  it('transactions/created: acha o item pela conta e sincroniza', async () => {
    const db = dbFalso({ [`streaming/${UID}`]: { conexao: { itemId: ITEM } } });
    const pluggy = pluggyFalso();
    const handler = criarHandler({ pluggyFactory: () => pluggy, dbFactory: () => db as never });
    expect((await handler(evento({ event: 'transactions/created', accountId: CONTA }))).statusCode).toBe(200);
    expect(pluggy.obterConta).toHaveBeenCalledWith(CONTA);
    expect((db.docs.get(`streaming/${UID}`) as { assinaturas: unknown[] }).assinaturas).toHaveLength(1);
  });

  it('falha na Pluggy não derruba o webhook (responde 200 sem detalhes)', async () => {
    const pluggy = pluggyFalso();
    pluggy.obterItem.mockRejectedValue(new Error('rede'));
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = criarHandler({ pluggyFactory: () => pluggy, dbFactory: () => dbFalso() as never });
    const r = await handler(evento({ event: 'item/updated', itemId: ITEM }));
    expect(r).toMatchObject({ statusCode: 200, body: '' });
    erro.mockRestore();
  });
});

describe('atualizarNaPluggy', () => {
  it('pede a atualização e espera sair de UPDATING', async () => {
    const { atualizarNaPluggy } = await import('../netlify/lib/sincronizarStreaming.js');
    const status = ['UPDATING', 'UPDATING', 'UPDATED'];
    const chamadas: string[] = [];
    const pluggy = {
      atualizarItem: async (id: string) => void chamadas.push(`patch:${id}`),
      obterItem: async () => ({ status: status.shift() ?? 'UPDATED' }),
    };
    const r = await atualizarNaPluggy({ itemIds: ['a', 'a'], pluggy: pluggy as never, intervaloMs: 0, dormir: async () => {} });
    expect(chamadas).toEqual(['patch:a']);
    expect(r).toEqual({ aindaAtualizando: 0 });
  });

  it('erro ao pedir a atualização não impede a leitura', async () => {
    const { atualizarNaPluggy } = await import('../netlify/lib/sincronizarStreaming.js');
    const pluggy = {
      atualizarItem: async () => {
        throw new Error('limite');
      },
      obterItem: async () => ({ status: 'UPDATING' }),
    };
    expect(await atualizarNaPluggy({ itemIds: ['a'], pluggy: pluggy as never, dormir: async () => {} })).toEqual({ aindaAtualizando: 0 });
  });

  it('para de esperar no limite de tempo', async () => {
    const { atualizarNaPluggy } = await import('../netlify/lib/sincronizarStreaming.js');
    const pluggy = { atualizarItem: async () => {}, obterItem: async () => ({ status: 'UPDATING' }) };
    const r = await atualizarNaPluggy({ itemIds: ['a'], pluggy: pluggy as never, limiteMs: 30, intervaloMs: 5 });
    expect(r).toEqual({ aindaAtualizando: 1 });
  });
});
