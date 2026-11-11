/**
 * SUSTENTA Streaming: detecção de assinaturas, horas e recomendação (lógica pura).
 */
import { describe, it, expect } from 'vitest';
import {
  acaoConfirmada,
  avaliarAssinatura,
  co2Gramas,
  converterTransacoesPluggy,
  conexoesDe,
  nomeDaInstituicao,
  custoPorHora,
  detectarAssinaturas,
  horasDoMes,
  identificarServico,
  inferirPlano,
  proximaData,
  resumirUsoMensal,
  recomendar,
  resumirRelatorio,
  usoConcentrado,
  type CatalogoPlanos,
  type Plano,
} from '../src/services/streaming';

const PLANOS_NETFLIX: Plano[] = [
  { nome: 'Padrão com anúncios', valor: 20.9, temAnuncios: true },
  { nome: 'Padrão', valor: 44.9, temAnuncios: false },
  { nome: 'Premium', valor: 59.9, temAnuncios: false },
];
const CATALOGO: CatalogoPlanos = { netflix: PLANOS_NETFLIX };

describe('identificarServico', () => {
  it.each([
    ['NETFLIX.COM', 'netflix'],
    ['Netflix Entretenimento Brasil', 'netflix'],
    ['DISNEY PLUS', 'disney'],
    ['DisneyPlus*Assinatura', 'disney'],
    ['DISNEY+ BR', 'disney'],
    ['HBO MAX', 'max'],
    ['HBOMAX*SP', 'max'],
    ['MAX.COM', 'max'],
    ['PRIMEVIDEO*BR', 'prime'],
    ['Amazon Prime Assinatura', 'prime'],
  ])('"%s" é %s', (descricao, servico) => {
    expect(identificarServico(descricao)).toBe(servico);
  });

  it.each(['Mercado do bairro', 'MAXIMA FARMACIA', 'AMAZON MARKETPLACE', 'DISNEYLANDIA TURISMO', ''])(
    '"%s" não é streaming',
    (descricao) => {
      expect(identificarServico(descricao)).toBeNull();
    },
  );
});

describe('proximaData', () => {
  it('mesmo dia no mês seguinte', () => {
    expect(proximaData('2026-10-12')).toBe('2026-11-12');
  });
  it('vira o ano', () => {
    expect(proximaData('2026-12-05')).toBe('2027-01-05');
  });
  it('dia que não existe vira o último dia do mês', () => {
    expect(proximaData('2026-01-31')).toBe('2026-02-28');
    expect(proximaData('2028-01-31')).toBe('2028-02-29');
  });
});

describe('inferirPlano', () => {
  it('acha o plano pelo valor exato ou muito próximo', () => {
    expect(inferirPlano(59.9, PLANOS_NETFLIX)?.nome).toBe('Premium');
    expect(inferirPlano(59.95, PLANOS_NETFLIX)?.nome).toBe('Premium');
  });
  it('nenhum plano parecido: null', () => {
    expect(inferirPlano(33, PLANOS_NETFLIX)).toBeNull();
  });
  it('dois planos com preço quase igual: null (perguntar à pessoa)', () => {
    const planos: Plano[] = [
      { nome: 'A', valor: 30, temAnuncios: false },
      { nome: 'B', valor: 30.1, temAnuncios: true },
    ];
    expect(inferirPlano(30.05, planos)).toBeNull();
  });
  it('valor inválido: null', () => {
    expect(inferirPlano(0, PLANOS_NETFLIX)).toBeNull();
    expect(inferirPlano(NaN, PLANOS_NETFLIX)).toBeNull();
  });
});

describe('detectarAssinaturas', () => {
  it('detecta cobrança em 2 meses seguidos com valor parecido', () => {
    const r = detectarAssinaturas([
      { descricao: 'DISNEY PLUS', valor: 66.9, data: '2026-09-18' },
      { descricao: 'DISNEY PLUS', valor: 66.9, data: '2026-10-18' },
    ]);
    expect(r).toEqual([
      {
        servico: 'disney',
        valor: 66.9,
        plano: null,
        ultimaCobranca: '2026-10-18',
        proximaCobranca: '2026-11-18',
        motivo: 'recorrente',
      },
    ]);
  });

  it('aceita reajuste de até 10%', () => {
    const r = detectarAssinaturas([
      { descricao: 'NETFLIX.COM', valor: 55.9, data: '2026-09-12' },
      { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].valor).toBe(59.9);
  });

  it('valores muito diferentes em meses seguidos não contam como assinatura', () => {
    const r = detectarAssinaturas([
      { descricao: 'AMAZON PRIME', valor: 19.9, data: '2026-09-03' },
      { descricao: 'AMAZON PRIME', valor: 166.8, data: '2026-10-03' },
    ]);
    expect(r).toEqual([]);
  });

  it('meses não seguidos e fora do catálogo não contam', () => {
    const r = detectarAssinaturas([
      { descricao: 'HBO MAX', valor: 55.9, data: '2026-07-28' },
      { descricao: 'HBO MAX', valor: 55.9, data: '2026-10-28' },
    ]);
    expect(r).toEqual([]);
  });

  it('uma cobrança só, com valor de um plano do catálogo, conta e já traz o plano', () => {
    const r = detectarAssinaturas([{ descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' }], CATALOGO);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ servico: 'netflix', plano: 'Premium', motivo: 'catalogo', proximaCobranca: '2026-11-12' });
  });

  it('ignora o que não é streaming, valores inválidos e datas inválidas', () => {
    const r = detectarAssinaturas([
      { descricao: 'Mercado do bairro', valor: 212.4, data: '2026-10-21' },
      { descricao: 'NETFLIX.COM', valor: -59.9, data: '2026-10-12' },
      { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-02-30' },
      { descricao: 'NETFLIX.COM', valor: NaN, data: '2026-09-12' },
    ]);
    expect(r).toEqual([]);
  });

  it('vários serviços, em qualquer ordem, saem na ordem fixa dos serviços', () => {
    const r = detectarAssinaturas(
      [
        { descricao: 'PRIMEVIDEO', valor: 19.9, data: '2026-10-03' },
        { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' },
        { descricao: 'PRIMEVIDEO', valor: 19.9, data: '2026-09-03' },
        { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-09-12' },
      ],
      CATALOGO,
    );
    expect(r.map((a) => a.servico)).toEqual(['netflix', 'prime']);
  });

  it('lista vazia: nenhuma assinatura', () => {
    expect(detectarAssinaturas([])).toEqual([]);
  });
});

describe('horasDoMes', () => {
  it('só extensão', () => {
    expect(horasDoMes(242)).toEqual({ medidas: 4.03, estimadas: 0, total: 4.03 });
  });
  it.each([
    ['nao', 0],
    ['pouco', 3],
    ['bastante', 10],
  ] as const)('resposta da TV "%s" soma %i h', (resposta, horas) => {
    expect(horasDoMes(60, resposta)).toEqual({ medidas: 1, estimadas: horas, total: 1 + horas });
  });
  it('minutos inválidos viram 0', () => {
    expect(horasDoMes(-10).total).toBe(0);
    expect(horasDoMes(NaN, null).total).toBe(0);
  });
});

describe('custoPorHora e co2Gramas', () => {
  it('divide o valor pelas horas', () => {
    expect(custoPorHora(59.9, 4)).toBe(14.98);
    expect(custoPorHora(19.9, 23)).toBe(0.87);
  });
  it('sem horas: null', () => {
    expect(custoPorHora(66.9, 0)).toBeNull();
  });
  it('55 g por hora', () => {
    expect(co2Gramas(27)).toBe(1485);
    expect(co2Gramas(0)).toBe(0);
    expect(co2Gramas(-3)).toBe(0);
  });
});

describe('usoConcentrado', () => {
  const mes = (usos: Record<number, number>) => Array.from({ length: 31 }, (_, i) => usos[i + 1] ?? 0);
  it('até 3 dias de uso e nada nos últimos 14 dias: sim', () => {
    expect(usoConcentrado(mes({ 2: 120, 3: 180, 5: 90 }))).toBe(true);
  });
  it('uso perto do fim do mês: não', () => {
    expect(usoConcentrado(mes({ 2: 120, 25: 60 }))).toBe(false);
  });
  it('mais de 3 dias de uso: não', () => {
    expect(usoConcentrado(mes({ 1: 30, 2: 30, 3: 30, 4: 30 }))).toBe(false);
  });
  it('sem uso: não', () => {
    expect(usoConcentrado(mes({}))).toBe(false);
  });
});

describe('recomendar', () => {
  it('mês atual sem dados: sem_dados', () => {
    expect(recomendar({ valorMensal: 55.9, horasPorMes: [5, null] })).toMatchObject({
      tipo: 'sem_dados',
      economiaAnual: 0,
      custoPorHora: null,
    });
    expect(recomendar({ valorMensal: 55.9, horasPorMes: [] }).tipo).toBe('sem_dados');
  });

  it('0 h em 2 meses seguidos: cancelar, economia de 12 mensalidades', () => {
    expect(recomendar({ valorMensal: 66.9, horasPorMes: [0, 0] })).toEqual({
      tipo: 'cancelar',
      planoSugerido: null,
      economiaAnual: 802.8,
      custoPorHora: null,
    });
  });

  it('0 h só neste mês (mês anterior sem dados ou com uso): ainda não cancela', () => {
    expect(recomendar({ valorMensal: 66.9, horasPorMes: [null, 0] }).tipo).toBe('atencao');
    expect(recomendar({ valorMensal: 66.9, horasPorMes: [8, 0] }).tipo).toBe('atencao');
  });

  it('custo por hora acima de R$ 10 e existe plano mais barato: trocar para o mais barato', () => {
    const r = recomendar({ valorMensal: 59.9, horasPorMes: [6, 4], planos: PLANOS_NETFLIX });
    expect(r.tipo).toBe('trocar');
    expect(r.planoSugerido?.nome).toBe('Padrão com anúncios');
    expect(r.economiaAnual).toBe(468);
    expect(r.custoPorHora).toBe(14.98);
  });

  it('custo alto mas já no plano mais barato: não sugere troca', () => {
    const r = recomendar({ valorMensal: 20.9, horasPorMes: [1.5], planos: PLANOS_NETFLIX });
    expect(r.tipo).toBe('atencao');
    expect(r.planoSugerido).toBeNull();
  });

  it('cancelar ganha de trocar', () => {
    expect(recomendar({ valorMensal: 59.9, horasPorMes: [0, 0], planos: PLANOS_NETFLIX }).tipo).toBe('cancelar');
  });

  it('menos de 2 h sem plano mais barato conhecido: atenção', () => {
    expect(recomendar({ valorMensal: 30, horasPorMes: [1] }).tipo).toBe('atencao');
  });

  it('uso concentrado no começo do mês: rodízio', () => {
    const minutosPorDia = Array.from({ length: 31 }, (_, i) => (i < 2 ? 240 : 0));
    expect(recomendar({ valorMensal: 30, horasPorMes: [8], minutosPorDia }).tipo).toBe('rodizio');
  });

  it('uso bom: manter, com o custo por hora', () => {
    expect(recomendar({ valorMensal: 19.9, horasPorMes: [20, 23] })).toEqual({
      tipo: 'manter',
      planoSugerido: null,
      economiaAnual: 0,
      custoPorHora: 0.87,
    });
  });
});

describe('acaoConfirmada', () => {
  it('cancelar: confirmada quando a cobrança seguinte não vem', () => {
    expect(acaoConfirmada('cancelar', 66.9, null)).toBe(true);
    expect(acaoConfirmada('cancelar', 66.9, 66.9)).toBe(false);
  });
  it('trocar: confirmada quando a cobrança seguinte fica menor', () => {
    expect(acaoConfirmada('trocar', 59.9, 20.9)).toBe(true);
    expect(acaoConfirmada('trocar', 59.9, 59.9)).toBe(false);
    expect(acaoConfirmada('trocar', 59.9, null)).toBe(false);
  });
  it('outras recomendações não dão XP de ação', () => {
    expect(acaoConfirmada('manter', 19.9, null)).toBe(false);
  });
});

describe('resumirRelatorio', () => {
  it('reproduz o exemplo do protótipo (outubro)', () => {
    const r = resumirRelatorio([
      { servico: 'netflix', valorPago: 59.9, horas: 4, recomendacao: recomendar({ valorMensal: 59.9, horasPorMes: [6, 4], planos: PLANOS_NETFLIX }) },
      { servico: 'disney', valorPago: 66.9, horas: 0, recomendacao: recomendar({ valorMensal: 66.9, horasPorMes: [0, 0] }) },
      { servico: 'max', valorPago: 55.9, horas: 0, recomendacao: recomendar({ valorMensal: 55.9, horasPorMes: [3, null] }) },
      { servico: 'prime', valorPago: 19.9, horas: 23, recomendacao: recomendar({ valorMensal: 19.9, horasPorMes: [20, 23] }) },
    ]);
    expect(r).toEqual({ totalPago: 202.6, horas: 27, custoMedioHora: 7.5, economiaAnual: 1270.8, co2g: 1485 });
  });

  it('sem itens: tudo zero', () => {
    expect(resumirRelatorio([])).toEqual({ totalPago: 0, horas: 0, custoMedioHora: null, economiaAnual: 0, co2g: 0 });
  });
});

describe('avaliarAssinatura', () => {
  const netflix = detectarAssinaturas([{ descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' }], CATALOGO)[0];

  it('nada medido e sem resposta: pede a pergunta da TV e fica sem dados', () => {
    const r = avaliarAssinatura(netflix, { minutosExtensao: 0, horasMesAnterior: 5 }, PLANOS_NETFLIX);
    expect(r.precisaPerguntarTv).toBe(true);
    expect(r.recomendacao.tipo).toBe('sem_dados');
  });

  it('a resposta da TV entra nas horas e muda a recomendação', () => {
    const pouco = avaliarAssinatura(netflix, { minutosExtensao: 0, respostaTv: 'pouco', horasMesAnterior: 5 }, PLANOS_NETFLIX);
    expect(pouco.precisaPerguntarTv).toBe(false);
    expect(pouco.horas.total).toBe(3);
    expect(pouco.recomendacao.tipo).toBe('trocar');
    const bastante = avaliarAssinatura(netflix, { minutosExtensao: 0, respostaTv: 'bastante', horasMesAnterior: 5 }, PLANOS_NETFLIX);
    expect(bastante.recomendacao.tipo).toBe('manter');
  });

  it('"não usei" em dois meses seguidos: cancelar', () => {
    const r = avaliarAssinatura(netflix, { minutosExtensao: 0, respostaTv: 'nao', horasMesAnterior: 0 });
    expect(r.recomendacao.tipo).toBe('cancelar');
  });

  it('com uso medido não pergunta da TV', () => {
    const r = avaliarAssinatura(netflix, { minutosExtensao: 600 }, PLANOS_NETFLIX);
    expect(r.precisaPerguntarTv).toBe(false);
    expect(r.horas.total).toBe(10);
  });
});

describe('converterTransacoesPluggy', () => {
  it('cartão: usa o valor absoluto e junta descrição e estabelecimento', () => {
    const r = converterTransacoesPluggy(
      [
        { description: 'NETFLIX.COM', amount: 59.9, date: '2026-10-12T03:00:00.000Z', type: 'CREDIT' },
        { description: 'Compra', merchant: { name: 'Disney Plus' }, amount: -66.9, date: '2026-10-18T00:00:00.000Z' },
      ],
      'CREDIT',
    );
    expect(r).toEqual([
      { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' },
      { descricao: 'Compra Disney Plus', valor: 66.9, data: '2026-10-18' },
    ]);
  });

  it('descarta estorno, pagamento da fatura, cashback e valores inválidos', () => {
    const r = converterTransacoesPluggy(
      [
        { description: 'NETFLIX.COM', amount: -59.9, date: '2026-10-13', operationType: 'ESTORNO' },
        { description: 'Pagamento recebido', amount: -1200, date: '2026-10-10', operationType: 'PAGAMENTO_FATURA' },
        { description: 'Estorno NETFLIX', amount: 59.9, date: '2026-10-14' },
        { description: 'NETFLIX.COM', amount: 0, date: '2026-10-12' },
        { description: 'NETFLIX.COM', amount: 59.9, date: 'ontem' },
      ],
      'CREDIT',
    );
    expect(r).toEqual([]);
  });

  it('conta corrente: só saídas', () => {
    const r = converterTransacoesPluggy(
      [
        { description: 'NETFLIX.COM', amount: -59.9, date: '2026-10-12', type: 'DEBIT' },
        { description: 'Salário', amount: 3000, date: '2026-10-05', type: 'CREDIT' },
      ],
      'BANK',
    );
    expect(r).toEqual([{ descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' }]);
  });

  it('o resultado alimenta a detecção', () => {
    const r = detectarAssinaturas(
      converterTransacoesPluggy(
        [
          { description: 'NETFLIX.COM', amount: 59.9, date: '2026-09-12' },
          { description: 'NETFLIX.COM', amount: 59.9, date: '2026-10-12' },
        ],
        'CREDIT',
      ),
    );
    expect(r.map((a) => a.servico)).toEqual(['netflix']);
  });
});

describe('resumirUsoMensal', () => {
  it('soma os minutos do mês por serviço e monta os dias', () => {
    const r = resumirUsoMensal({ dias: { '01': { netflix: 30, prime: 10 }, '15': { netflix: 12 } } }, '2026-11');
    expect(r.netflix.minutos).toBe(42);
    expect(r.netflix.porDia).toHaveLength(30);
    expect(r.netflix.porDia[0]).toBe(30);
    expect(r.netflix.porDia[14]).toBe(12);
    expect(r.prime.minutos).toBe(10);
    expect(r.disney).toEqual({ minutos: 0, porDia: Array(30).fill(0) });
  });

  it('ignora dias e valores inválidos e limita a 1440 por dia', () => {
    const r = resumirUsoMensal({ dias: { '00': { netflix: 5 }, '31': { netflix: 5 }, '02': { netflix: -3, max: 99999 } } }, '2026-11');
    expect(r.netflix.minutos).toBe(0);
    expect(r.max.minutos).toBe(1440);
  });

  it('sem documento: tudo zero', () => {
    expect(resumirUsoMensal(null, '2026-02').netflix).toEqual({ minutos: 0, porDia: Array(28).fill(0) });
  });
});

describe('música e YouTube', () => {
  it.each([
    ['SPOTIFY P1A2B3', 'spotify'],
    ['Spotify Brasil', 'spotify'],
    ['DEEZER*PREMIUM', 'deezer'],
    ['YOUTUBE PREMIUM', 'youtube'],
    ['GOOGLE *YOUTUBE', 'youtube'],
    ['YouTube Music', 'youtube'],
  ])('"%s" é %s', (descricao, servico) => {
    expect(identificarServico(descricao)).toBe(servico);
  });

  it('"YouTube" sozinho (ex.: compra avulsa) não conta como assinatura do Premium', () => {
    expect(identificarServico('YOUTUBE')).toBeNull();
  });

  it('música estima mais horas fora do computador que vídeo', () => {
    expect(horasDoMes(0, 'pouco', 'musica').total).toBe(5);
    expect(horasDoMes(0, 'bastante', 'musica').total).toBe(20);
    expect(horasDoMes(0, 'bastante').total).toBe(10);
  });

  it('sugere o plano gratuito com anúncios, mas nunca o universitário', () => {
    const planos: Plano[] = [
      { nome: 'Gratuito com anúncios', valor: 0, temAnuncios: true },
      { nome: 'Individual', valor: 21.9, temAnuncios: false },
      { nome: 'Universitário', valor: 11.9, temAnuncios: false, restrito: 'estudantes' },
    ];
    const r = recomendar({ valorMensal: 21.9, horasPorMes: [5, 1], planos });
    expect(r.tipo).toBe('trocar');
    expect(r.planoSugerido?.nome).toBe('Gratuito com anúncios');
    expect(r.economiaAnual).toBe(262.8);
  });

  it('CO2 do relatório conta só o vídeo', () => {
    const manter = recomendar({ valorMensal: 20, horasPorMes: [20, 20] });
    const r = resumirRelatorio([
      { servico: 'netflix', valorPago: 20, horas: 10, recomendacao: manter },
      { servico: 'spotify', valorPago: 21.9, horas: 40, recomendacao: manter },
    ]);
    expect(r.horas).toBe(50);
    expect(r.co2g).toBe(550);
  });
});

describe('vários bancos', () => {
  const c = (itemId: string) => ({ itemId, banco: 'X', status: 'UPDATED', ultimaSync: null });

  it('conexoesDe lê o formato novo e o antigo', () => {
    expect(conexoesDe({ conexoes: [c('a'), c('b')] }).map((x) => x.itemId)).toEqual(['a', 'b']);
    expect(conexoesDe({ conexao: c('a') }).map((x) => x.itemId)).toEqual(['a']);
    expect(conexoesDe({ conexao: null })).toEqual([]);
    expect(conexoesDe(null)).toEqual([]);
  });

  it('nomeDaInstituicao: conector direto usa o próprio nome', () => {
    expect(nomeDaInstituicao('Nubank', ['Conta'])).toBe('Nubank');
  });

  it('nomeDaInstituicao: pelo MeuPluggy procura o banco no nome das contas', () => {
    expect(nomeDaInstituicao('MeuPluggy', ['Conta Mercado Pago'])).toBe('Mercado Pago');
    expect(nomeDaInstituicao('MeuPluggy', [null, 'ITAUCARD PLATINUM'])).toBe('Itaú');
    expect(nomeDaInstituicao('MeuPluggy', ['GOLD Conta Corrente'])).toBe('MeuPluggy');
    expect(nomeDaInstituicao(null, [])).toBeNull();
  });
});
