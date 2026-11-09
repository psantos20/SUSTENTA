/**
 * Projeção do mês: contas do mês x gastos do dia a dia (lógica pura).
 */
import { describe, it, expect } from 'vitest';
import {
  DIA_MINIMO_RITMO,
  diasDoMes,
  projetarCategoria,
  projetarMes,
  valorHabitual,
} from '../src/services/projecao';

describe('diasDoMes', () => {
  it('conta os dias, inclusive fevereiro bissexto', () => {
    expect(diasDoMes('2026-10')).toBe(31);
    expect(diasDoMes('2026-11')).toBe(30);
    expect(diasDoMes('2026-02')).toBe(28);
    expect(diasDoMes('2028-02')).toBe(29);
  });

  it('mês inválido vira 30', () => {
    expect(diasDoMes('')).toBe(30);
    expect(diasDoMes('2026-13')).toBe(30);
    expect(diasDoMes('lixo')).toBe(30);
  });
});

describe('valorHabitual', () => {
  it('sem histórico é 0', () => {
    expect(valorHabitual([])).toBe(0);
    expect(valorHabitual([0, 0])).toBe(0);
  });

  it('um mês só: o próprio valor', () => {
    expect(valorHabitual([120])).toBe(120);
  });

  it('pondera os últimos 3 meses (mais recente pesa mais) e ignora os mais antigos', () => {
    // pesos 1, 2, 3 → (100*1 + 200*2 + 300*3) / 6
    expect(valorHabitual([999, 100, 200, 300])).toBeCloseTo(233.333, 2);
  });

  it('ignora meses zerados e valores inválidos', () => {
    expect(valorHabitual([0, 150, NaN, -5])).toBe(150);
  });
});

describe('projetarCategoria — contas (energia, água)', () => {
  it('conta ainda não registrada: espera o valor habitual', () => {
    expect(projetarCategoria('conta', 0, [180, 200], 10, 31)).toEqual({ valor: 193.33, base: 'historico' });
  });

  it('conta já registrada acima do habitual: fica o que foi registrado', () => {
    expect(projetarCategoria('conta', 250, [180], 10, 31)).toEqual({ valor: 250, base: 'atual' });
  });

  it('conta registrada abaixo do habitual: ainda projeta o habitual', () => {
    expect(projetarCategoria('conta', 100, [180], 10, 31).valor).toBe(180);
  });

  it('sem histórico: projeta só o que já foi registrado (não multiplica a conta)', () => {
    expect(projetarCategoria('conta', 200, [], 3, 31)).toEqual({ valor: 200, base: 'atual' });
    expect(projetarCategoria('conta', 200, [], 25, 31)).toEqual({ valor: 200, base: 'atual' });
  });
});

describe('projetarCategoria — dia a dia (transporte, outros)', () => {
  it('com histórico: gasto atual + a parte do mês habitual que falta', () => {
    // meio do mês (15/30): 100 já gastos + metade dos 300 habituais
    expect(projetarCategoria('rotina', 100, [300], 15, 30)).toEqual({ valor: 250, base: 'historico' });
  });

  it('no último dia a projeção é o que já foi gasto', () => {
    expect(projetarCategoria('rotina', 320, [300], 30, 30).valor).toBe(320);
  });

  it('no começo do mês com histórico projeta perto do habitual, sem multiplicar o gasto', () => {
    const p = projetarCategoria('rotina', 50, [300], 2, 30);
    expect(p.valor).toBeCloseTo(50 + 300 * (28 / 30), 2);
  });

  it('sem histórico usa o ritmo a partir do dia 7', () => {
    expect(projetarCategoria('rotina', 100, [], DIA_MINIMO_RITMO, 28)).toEqual({ valor: 400, base: 'ritmo' });
    expect(projetarCategoria('rotina', 150, [], 15, 30)).toEqual({ valor: 300, base: 'ritmo' });
  });

  it('sem histórico antes do dia 7 não projeta: devolve o gasto e avisa que falta base', () => {
    expect(projetarCategoria('rotina', 100, [], 3, 30)).toEqual({ valor: 100, base: 'insuficiente' });
  });

  it('sem gasto e sem histórico é zero e não conta como "sem base"', () => {
    expect(projetarCategoria('rotina', 0, [], 3, 30)).toEqual({ valor: 0, base: 'atual' });
  });

  it('entradas estranhas não quebram (gasto negativo/NaN, dia fora do mês)', () => {
    expect(projetarCategoria('rotina', -10, [], 10, 30).valor).toBe(0);
    expect(projetarCategoria('rotina', NaN, [], 10, 30).valor).toBe(0);
    expect(projetarCategoria('rotina', 100, [], 99, 30)).toEqual({ valor: 100, base: 'ritmo' });
    expect(projetarCategoria('rotina', 100, [], 0, 30).valor).toBe(100);
  });
});

describe('projetarMes', () => {
  const vazio = { energia: [], agua: [], transporte: [], outro: [] };

  it('soma as categorias e é confiável quando todas têm base', () => {
    const r = projetarMes(
      { energia: 200, agua: 0, transporte: 100, outro: 50 },
      { energia: [], agua: [80], transporte: [300], outro: [100] },
      15,
      30
    );
    expect(r.porCategoria.energia.valor).toBe(200);
    expect(r.porCategoria.agua.valor).toBe(80);
    expect(r.porCategoria.transporte.valor).toBe(250);
    expect(r.porCategoria.outro.valor).toBe(100);
    expect(r.total).toBe(630);
    expect(r.confiavel).toBe(true);
  });

  it('marca como pouco confiável no começo do mês sem histórico', () => {
    const r = projetarMes({ energia: 0, agua: 0, transporte: 40, outro: 0 }, vazio, 2, 30);
    expect(r.total).toBe(40);
    expect(r.confiavel).toBe(false);
  });

  it('sem nenhum dado, tudo zero e confiável', () => {
    const r = projetarMes({ energia: 0, agua: 0, transporte: 0, outro: 0 }, vazio, 10, 31);
    expect(r.total).toBe(0);
    expect(r.confiavel).toBe(true);
  });
});
