/**
 * Medalhas: regras de conquista e progresso (lógica pura).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('../src/services/api', () => ({ chamarFuncaoAutenticada: vi.fn() }));

import { calcularMedalhas, mesesAbaixoDaMedia } from '../src/app/pages/profile/medalhas';
import type { EntradaMedalhas } from '../src/app/pages/profile/medalhas';
import type { Registro } from '../src/app/pages/education/tipos';

const MES_ATUAL = '2026-11';
const base: EntradaMedalhas = { registros: [], maiorStreak: 0, desafiosConcluidos: 0, xpHabitos: 0, temGrupoFamilia: false };
const reg = (mes: string, categoria: Registro['categoria'] = 'energia', quantidade?: number): Registro => ({
  mes,
  categoria,
  valor: 100,
  ...(quantidade === undefined ? {} : { quantidade }),
});
const medalha = (e: EntradaMedalhas, id: string) => calcularMedalhas(e, MES_ATUAL).find((m) => m.id === id)!;
/** kWh que resultam em ~ kg de carbono (fator oficial de energia). */
const kwh = (mes: string, qtd: number) => reg(mes, 'energia', qtd);

describe('Medalhas: catálogo', () => {
  const todas = calcularMedalhas(base, MES_ATUAL);

  it('19 medalhas com ids únicos, sem nenhuma conquistada para quem não fez nada', () => {
    expect(todas).toHaveLength(19);
    expect(new Set(todas.map((m) => m.id)).size).toBe(19);
    expect(todas.every((m) => !m.conquistada && m.atual === 0)).toBe(true);
  });

  it('toda meta é positiva e todo grupo tem ao menos uma medalha', () => {
    expect(todas.every((m) => m.meta > 0)).toBe(true);
    for (const g of ['Consumo', 'Carbono', 'Hábitos', 'Família']) {
      expect(todas.some((m) => m.grupo === g)).toBe(true);
    }
  });
});

describe('Medalhas: consumo (Valor Limite nas metas)', () => {
  it.each([
    [0, false],
    [1, true],
  ])('primeiro registro com %i registro(s): %s', (n, ganhou) => {
    const registros = Array.from({ length: n }, () => reg('2026-10'));
    expect(medalha({ ...base, registros }, 'primeiro-registro').conquistada).toBe(ganhou);
  });

  it.each([
    [9, false],
    [10, true],
  ])('10 registros: com %i => %s', (n, ganhou) => {
    const registros = Array.from({ length: n }, () => reg('2026-10'));
    expect(medalha({ ...base, registros }, 'dez-registros').conquistada).toBe(ganhou);
  });

  it('progresso nunca passa da meta', () => {
    const registros = Array.from({ length: 80 }, () => reg('2026-10'));
    const m = medalha({ ...base, registros }, 'dez-registros');
    expect(m.atual).toBe(10);
    expect(medalha({ ...base, registros }, 'cinquenta-registros').conquistada).toBe(true);
  });

  it('meses ativos contam meses diferentes, não registros', () => {
    const mesmoMes = Array.from({ length: 5 }, () => reg('2026-10'));
    expect(medalha({ ...base, registros: mesmoMes }, 'tres-meses').atual).toBe(1);
    const tres = [reg('2026-08'), reg('2026-09'), reg('2026-10')];
    expect(medalha({ ...base, registros: tres }, 'tres-meses').conquistada).toBe(true);
    expect(medalha({ ...base, registros: tres }, 'seis-meses').atual).toBe(3);
  });

  it('visão completa exige energia, água e transporte (outros não contam)', () => {
    const duas = [reg('2026-10', 'energia'), reg('2026-10', 'agua'), reg('2026-10', 'outro')];
    expect(medalha({ ...base, registros: duas }, 'visao-completa').atual).toBe(2);
    const tres = [...duas, reg('2026-10', 'transporte')];
    expect(medalha({ ...base, registros: tres }, 'visao-completa').conquistada).toBe(true);
  });

  it('"de olho no medidor" conta só quantidades válidas (> 0)', () => {
    const registros = [kwh('2026-10', 100), kwh('2026-10', 0), kwh('2026-10', -4), reg('2026-10'), kwh('2026-10', 50)];
    expect(medalha({ ...base, registros }, 'de-olho-no-medidor').atual).toBe(2);
    const cinco = Array.from({ length: 5 }, () => kwh('2026-10', 10));
    expect(medalha({ ...base, registros: cinco }, 'de-olho-no-medidor').conquistada).toBe(true);
  });
});

describe('Medalhas: carbono abaixo da própria média', () => {
  it('conta meses completos mais de 10% abaixo da média dos outros', () => {
    // 100, 100 e 50 kWh: o último fica bem abaixo da média (100)
    const registros = [kwh('2026-08', 100), kwh('2026-09', 100), kwh('2026-10', 50)];
    expect(mesesAbaixoDaMedia(registros, MES_ATUAL)).toBe(1);
    expect(medalha({ ...base, registros }, 'mes-verde').conquistada).toBe(true);
    expect(medalha({ ...base, registros }, 'tres-meses-verdes').atual).toBe(1);
  });

  it('o mês em andamento não conta (está incompleto)', () => {
    const registros = [kwh('2026-09', 100), kwh('2026-10', 100), kwh('2026-11', 5)];
    expect(mesesAbaixoDaMedia(registros, '2026-11')).toBe(0);
  });

  it('sem outros meses para comparar, não há medalha', () => {
    expect(mesesAbaixoDaMedia([kwh('2026-10', 50)], MES_ATUAL)).toBe(0);
    expect(mesesAbaixoDaMedia([], MES_ATUAL)).toBe(0);
  });

  it('meses iguais ou dentro dos 10% não contam', () => {
    const registros = [kwh('2026-08', 100), kwh('2026-09', 100), kwh('2026-10', 95)];
    expect(mesesAbaixoDaMedia(registros, MES_ATUAL)).toBe(0);
  });

  it('transporte com combustível entra na conta de carbono', () => {
    const gasolina = (mes: string, litros: number): Registro => ({ mes, categoria: 'transporte', subcategoria: 'Gasolina', valor: 300, quantidade: litros });
    const registros = [gasolina('2026-08', 60), gasolina('2026-09', 60), gasolina('2026-10', 20)];
    expect(mesesAbaixoDaMedia(registros, MES_ATUAL)).toBe(1);
  });
});

describe('Medalhas: hábitos e família', () => {
  it.each([
    [2, 'sequencia-3', false],
    [3, 'sequencia-3', true],
    [6, 'sequencia-7', false],
    [7, 'sequencia-7', true],
    [29, 'sequencia-30', false],
    [30, 'sequencia-30', true],
  ])('sequência %i dias => %s: %s', (maiorStreak, id, ganhou) => {
    expect(medalha({ ...base, maiorStreak }, id).conquistada).toBe(ganhou);
  });

  it('desafios concluídos', () => {
    expect(medalha({ ...base, desafiosConcluidos: 1 }, 'desafiante').conquistada).toBe(true);
    expect(medalha({ ...base, desafiosConcluidos: 4 }, 'cinco-desafios').conquistada).toBe(false);
    expect(medalha({ ...base, desafiosConcluidos: 5 }, 'cinco-desafios').conquistada).toBe(true);
  });

  it('XP de hábitos', () => {
    expect(medalha({ ...base, xpHabitos: 499 }, 'xp-500').conquistada).toBe(false);
    expect(medalha({ ...base, xpHabitos: 500 }, 'xp-500').conquistada).toBe(true);
    expect(medalha({ ...base, xpHabitos: 2000 }, 'xp-2000').conquistada).toBe(true);
  });

  it('grupo familiar', () => {
    expect(medalha(base, 'em-familia').conquistada).toBe(false);
    expect(medalha({ ...base, temGrupoFamilia: true }, 'em-familia').conquistada).toBe(true);
  });

  it('dados inválidos (NaN, negativo) viram zero, sem quebrar', () => {
    const m = calcularMedalhas({ ...base, maiorStreak: Number.NaN, xpHabitos: -50 }, MES_ATUAL);
    expect(m.find((x) => x.id === 'sequencia-3')!.atual).toBe(0);
    expect(m.find((x) => x.id === 'xp-500')!.atual).toBe(0);
  });
});
