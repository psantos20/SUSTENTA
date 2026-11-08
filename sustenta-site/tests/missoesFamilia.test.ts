/**
 * Missões da semana em família: semana, progresso coletivo e resgate (lógica pura).
 */
import { describe, it, expect } from 'vitest';
import {
  MARCACOES_CATEGORIA_POR_MEMBRO,
  MARCACOES_POR_MEMBRO,
  calcularMissoes,
  categoriaDaSemana,
  diasDaSemana,
  inicioDaSemana,
  podeResgatar,
  resgatadasDaSemana,
} from '../src/app/pages/habits/missoesFamilia';
import { somarDias } from '../src/app/pages/habits/ofensiva';
import type { MembroHabitosResumo } from '../src/app/pages/habits/missoesFamilia';

// 2026-10-19 é segunda-feira; 2026-10-25 é domingo
const SEG = '2026-10-19';
const QUA = '2026-10-21';
const DOM = '2026-10-25';

const membro = (uid: string, marcas: [string, string][] = [], extra: Partial<MembroHabitosResumo> = {}): MembroHabitosResumo => ({
  uid,
  nome: `Pessoa ${uid}`,
  streak: 0,
  ultimoRegistro: '',
  progressoHabitos: marcas.map(([habitoId, data]) => ({ habitoId, data })),
  habitosPersonalizados: [],
  ...extra,
});
const missao = (membros: MembroHabitosResumo[], hoje: string, id: string) =>
  calcularMissoes(membros, hoje).missoes.find((m) => m.id === id)!;

describe('Semana (segunda a domingo)', () => {
  it.each([
    ['2026-10-19', '2026-10-19'], // segunda
    ['2026-10-21', '2026-10-19'], // quarta
    ['2026-10-25', '2026-10-19'], // domingo ainda é da mesma semana
    ['2026-10-26', '2026-10-26'], // segunda seguinte
    ['2026-11-01', '2026-10-26'], // virada de mês
    ['2027-01-01', '2026-12-28'], // virada de ano
  ])('%s pertence à semana que começa em %s', (data, esperado) => {
    expect(inicioDaSemana(data)).toBe(esperado);
  });

  it('dias da semana: 7 dias seguidos de segunda a domingo', () => {
    expect(diasDaSemana(SEG)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  });

  it('dias restantes contam o dia de hoje', () => {
    expect(calcularMissoes([membro('a'), membro('b')], SEG).diasRestantes).toBe(7);
    expect(calcularMissoes([membro('a'), membro('b')], DOM).diasRestantes).toBe(1);
  });

  it('categoria da semana é estável na semana e muda de uma semana para outra', () => {
    expect(categoriaDaSemana(SEG)).toBe(categoriaDaSemana(inicioDaSemana(DOM)));
    const seguidas = Array.from({ length: 5 }, (_, i) => categoriaDaSemana(somarDias(SEG, i * 7)));
    expect(new Set(seguidas).size).toBe(5); // 5 semanas seguidas passam pelas 5 categorias
  });
});

describe('Missões: catálogo', () => {
  it('5 missões com ids únicos e XP positivo', () => {
    const { missoes } = calcularMissoes([membro('a'), membro('b')], QUA);
    expect(missoes).toHaveLength(5);
    expect(new Set(missoes.map((m) => m.id)).size).toBe(5);
    expect(missoes.every((m) => m.xp > 0 && m.meta > 0)).toBe(true);
  });

  it('o XP máximo da semana por pessoa é moderado (250)', () => {
    const { missoes } = calcularMissoes([membro('a'), membro('b')], QUA);
    expect(missoes.reduce((s, m) => s + m.xp, 0)).toBe(250);
  });
});

describe('Semana em movimento: soma de hábitos marcados', () => {
  it('meta é 10 por pessoa; só conta marcações da semana', () => {
    const a = membro('a', [['h1', SEG], ['h2', SEG], ['h1', '2026-10-18']]); // a última é da semana passada
    const b = membro('b', [['h1', QUA]]);
    const m = missao([a, b], QUA, 'mf-movimento');
    expect(m.meta).toBe(MARCACOES_POR_MEMBRO * 2);
    expect(m.atual).toBe(3);
    expect(m.concluida).toBe(false);
    expect(m.porMembro?.map((c) => c.valor)).toEqual([2, 1]);
  });

  it('conclui ao atingir a meta e não passa dela', () => {
    const muitas = (d: string[]): [string, string][] => d.flatMap((dia) => ['h1', 'h2', 'h3'].map((h) => [h, dia] as [string, string]));
    const a = membro('a', muitas(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'])); // 12
    const b = membro('b', muitas(['2026-10-19', '2026-10-20', '2026-10-21'])); // 9
    const m = missao([a, b], DOM, 'mf-movimento');
    expect(m.atual).toBe(20);
    expect(m.concluida).toBe(true);
  });

  it('a mesma marcação repetida no mesmo dia conta uma vez só', () => {
    const a = membro('a', [['h1', SEG], ['h1', SEG], ['h1', SEG]]);
    expect(missao([a, membro('b')], QUA, 'mf-movimento').atual).toBe(1);
  });
});

describe('Todo mundo participa (3 dias diferentes por pessoa)', () => {
  it('conta quem marcou em pelo menos 3 dias', () => {
    const tres = membro('a', [['h1', SEG], ['h1', '2026-10-20'], ['h2', QUA]]);
    const dois = membro('b', [['h1', SEG], ['h2', SEG], ['h1', QUA]]); // 2 dias
    const m = missao([tres, dois], QUA, 'mf-todos');
    expect(m.atual).toBe(1);
    expect(m.meta).toBe(2);
    expect(m.concluida).toBe(false);
  });

  it('conclui quando todos chegam a 3 dias', () => {
    const p = (uid: string) => membro(uid, [['h1', SEG], ['h1', '2026-10-20'], ['h1', QUA]]);
    expect(missao([p('a'), p('b'), p('c')], QUA, 'mf-todos').concluida).toBe(true);
  });
});

describe('Dia perfeito (todos marcaram no mesmo dia)', () => {
  it('só conclui se TODOS marcaram em um mesmo dia', () => {
    const a = membro('a', [['h1', SEG], ['h1', QUA]]);
    const b = membro('b', [['h1', '2026-10-20']]);
    expect(missao([a, b], QUA, 'mf-dia-perfeito').concluida).toBe(false);
    const c = membro('b', [['h1', '2026-10-20'], ['h2', QUA]]);
    expect(missao([a, c], QUA, 'mf-dia-perfeito').concluida).toBe(true);
  });

  it('um dia perfeito na semana passada não vale nesta', () => {
    const a = membro('a', [['h1', '2026-10-18']]);
    const b = membro('b', [['h1', '2026-10-18']]);
    expect(missao([a, b], QUA, 'mf-dia-perfeito').concluida).toBe(false);
  });
});

describe('Sequência coletiva', () => {
  it('conta quem tem sequência de 3+ dias que ainda vale hoje', () => {
    const ativo = membro('a', [], { streak: 4, ultimoRegistro: '2026-10-20' }); // marcou ontem: vale
    const quebrado = membro('b', [], { streak: 9, ultimoRegistro: '2026-10-15' }); // há dias: perdeu
    const curto = membro('c', [], { streak: 2, ultimoRegistro: QUA });
    const m = missao([ativo, quebrado, curto], QUA, 'mf-sequencia');
    expect(m.atual).toBe(1);
    expect(m.meta).toBe(3);
  });

  it('conclui quando todos têm sequência', () => {
    const p = (uid: string) => membro(uid, [], { streak: 3, ultimoRegistro: QUA });
    expect(missao([p('a'), p('b')], QUA, 'mf-sequencia').concluida).toBe(true);
  });
});

describe('Foco da semana (categoria)', () => {
  it('conta só hábitos da categoria em foco, inclusive os personalizados', () => {
    const cat = categoriaDaSemana(SEG);
    const dela = cat === 'Água' ? 'h1' : cat === 'Energia' ? 'h3' : cat === 'Resíduos' ? 'h5' : cat === 'Transporte' ? 'h7' : 'h8';
    const fora = cat === 'Água' ? 'h3' : 'h1';
    const a = membro('a', [[dela, SEG], [fora, SEG], ['meu-habito', QUA]], { habitosPersonalizados: [{ id: 'meu-habito', categoria: cat }] });
    const m = missao([a, membro('b')], QUA, 'mf-categoria');
    expect(m.atual).toBe(2);
    expect(m.meta).toBe(MARCACOES_CATEGORIA_POR_MEMBRO * 2);
    expect(m.titulo).toContain(cat);
  });

  it('hábito personalizado desconhecido não conta', () => {
    const a = membro('a', [['sumiu', SEG]]);
    expect(missao([a, membro('b')], QUA, 'mf-categoria').atual).toBe(0);
  });
});

describe('Resgate do XP', () => {
  const cumprida = missao([membro('a', [['h1', SEG]], { streak: 3, ultimoRegistro: QUA })], QUA, 'mf-dia-perfeito');
  const aberta = missao([membro('a'), membro('b')], QUA, 'mf-dia-perfeito');

  it('só resgata missão cumprida e ainda não resgatada', () => {
    expect(cumprida.concluida).toBe(true);
    expect(podeResgatar(cumprida, [])).toBe(true);
    expect(podeResgatar(cumprida, ['mf-dia-perfeito'])).toBe(false);
    expect(podeResgatar(aberta, [])).toBe(false);
  });

  it('o registro de outra semana não vale nesta', () => {
    expect(resgatadasDaSemana({ semana: '2026-10-12', resgatadas: ['mf-todos'] }, SEG)).toEqual([]);
    expect(resgatadasDaSemana({ semana: SEG, resgatadas: ['mf-todos'] }, SEG)).toEqual(['mf-todos']);
    expect(resgatadasDaSemana(undefined, SEG)).toEqual([]);
  });
});
