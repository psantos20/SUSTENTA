/**
 * Pegada de carbono e quantidade (kWh/m³): lógica pura.
 * Rodar: npm test
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('../src/services/api', () => ({ chamarFuncaoAutenticada: vi.fn() }));

import { calcularCarbono, carbonoDoRegistro, classificarNivel } from '../src/app/pages/education/carbono';
import { CARBON_FACTORS, FATOR_COMBUSTIVEL, FATOR_ENERGIA_KG_POR_KWH } from '../src/app/pages/education/dados';
import { COMBUSTIVEIS, TIPOS_TRANSPORTE, ehCombustivel, unidadeDeQuantidade } from '../src/services/transporte';
import { validarQuantidade } from '../src/services/validacao';

const reg = (
  categoria: 'energia' | 'agua' | 'transporte' | 'outro',
  valor: number,
  quantidade?: number | null,
  subcategoria?: string
) => ({
  categoria,
  valor,
  mes: '2026-10',
  ...(quantidade === undefined ? {} : { quantidade }),
  ...(subcategoria === undefined ? {} : { subcategoria }),
});

describe('Carbono: energia com kWh usa o fator oficial (MCTI)', () => {
  it('100 kWh x 0,0385 = 3,85 kg CO2, independente do valor em R$', () => {
    const r = carbonoDoRegistro(reg('energia', 999, 100));
    expect(r.preciso).toBe(true);
    expect(r.kg).toBeCloseTo(100 * FATOR_ENERGIA_KG_POR_KWH, 10);
    expect(r.kg).toBeCloseTo(3.85, 10);
  });

  it('sem quantidade usa a estimativa por R$ e marca como não preciso', () => {
    const r = carbonoDoRegistro(reg('energia', 200));
    expect(r.preciso).toBe(false);
    expect(r.kg).toBeCloseTo(200 * CARBON_FACTORS.energia, 10);
  });

  it.each([[null], [0], [-5], [Number.NaN]])('quantidade inválida (%s) cai na estimativa', (q) => {
    const r = carbonoDoRegistro(reg('energia', 100, q as number | null));
    expect(r.preciso).toBe(false);
    expect(r.kg).toBeCloseTo(100 * CARBON_FACTORS.energia, 10);
  });
});

describe('Carbono: água e outros continuam estimados', () => {
  it('água com m³ ainda usa a estimativa por R$ (sem fator oficial adotado)', () => {
    const r = carbonoDoRegistro(reg('agua', 80, 12));
    expect(r.preciso).toBe(false);
    expect(r.kg).toBeCloseTo(80 * CARBON_FACTORS.agua, 10);
  });
});

describe('Carbono: total do mês', () => {
  it('soma por categoria e informa quanto é estimativa', () => {
    const res = calcularCarbono([reg('energia', 300, 150), reg('energia', 100), reg('agua', 50), reg('outro', 20)]);
    const esperadoEnergia = 150 * FATOR_ENERGIA_KG_POR_KWH + 100 * CARBON_FACTORS.energia;
    expect(res.energiaKg).toBeCloseTo(esperadoEnergia, 10);
    expect(res.aguaKg).toBeCloseTo(50 * CARBON_FACTORS.agua, 10);
    expect(res.outroKg).toBeCloseTo(20 * CARBON_FACTORS.outro, 10);
    expect(res.totalKg).toBeCloseTo(res.energiaKg + res.aguaKg + res.outroKg, 10);
    expect(res.totalRegistros).toBe(4);
    expect(res.registrosEstimados).toBe(3);
    expect(res.estimadoKg).toBeCloseTo(100 * CARBON_FACTORS.energia + 50 * CARBON_FACTORS.agua + 20 * CARBON_FACTORS.outro, 10);
  });

  it('mês sem registros dá zero', () => {
    const res = calcularCarbono([]);
    expect(res.totalKg).toBe(0);
    expect(res.registrosEstimados).toBe(0);
  });

  it('todos com kWh: nada estimado', () => {
    const res = calcularCarbono([reg('energia', 120, 100), reg('energia', 130, 110)]);
    expect(res.registrosEstimados).toBe(0);
    expect(res.estimadoKg).toBe(0);
  });
});

describe('Nível do mês: comparação com a média dos outros meses (Valor Limite em ±10%)', () => {
  const outros = [100, 100, 100]; // média 100

  it.each([
    [89.9, 'abaixo'],
    [90, 'media'], // exatamente -10%: ainda na média
    [100, 'media'],
    [110, 'media'], // exatamente +10%: ainda na média
    [110.1, 'acima'],
    [0, 'abaixo'],
  ])('mês com %s kg (média 100) -> %s', (total, esperado) => {
    expect(classificarNivel(total, outros)?.chave).toBe(esperado);
  });

  it('informa a variação percentual e a média usada', () => {
    const r = classificarNivel(120, [100, 100]);
    expect(r).toMatchObject({ chave: 'acima', variacaoPercentual: 20, mediaKg: 100, meses: 2 });
  });

  it('ignora meses sem registro (0 kg) na média', () => {
    const r = classificarNivel(50, [0, 100, 0, 0, 100]);
    expect(r?.meses).toBe(2);
    expect(r?.chave).toBe('abaixo');
  });

  it('sem outros meses com dados não classifica (não inventa nível)', () => {
    expect(classificarNivel(5, [])).toBeNull();
    expect(classificarNivel(5, [0, 0])).toBeNull();
  });

  it('entradas inválidas não classificam', () => {
    expect(classificarNivel(Number.NaN, [100])).toBeNull();
    expect(classificarNivel(-1, [100])).toBeNull();
  });
});

describe('Quantidade (kWh/m³): validação do campo (Valor Limite)', () => {
  it.each([
    [null, null], [undefined, null], [0.01, null], [150, null], [1_000_000, null],
  ])('%s é aceito', (q) => { expect(validarQuantidade(q as number | null | undefined)).toBeNull(); });

  it.each([[0], [-1], [Number.NaN], [Infinity], [1_000_000.01], [1.234]])('%s é rejeitado', (q) => {
    expect(validarQuantidade(q)).not.toBeNull();
  });
});

describe('Transporte: combustível com quantidade usa fator por unidade', () => {
  it.each([
    ['Gasolina', 40],
    ['Etanol', 40],
    ['Diesel', 50],
    ['GNV', 10],
  ] as const)('%s: quantidade x fator, independente do valor em R$', (sub, qtd) => {
    const r = carbonoDoRegistro(reg('transporte', 999, qtd, sub));
    expect(r.calculado).toBe(true);
    expect(r.preciso).toBe(true);
    expect(r.kg).toBeCloseTo(qtd * FATOR_COMBUSTIVEL[sub].kg, 10);
  });

  it('gasolina emite bem mais que etanol por litro (CO2 biogênico fora da conta)', () => {
    expect(FATOR_COMBUSTIVEL.Gasolina.kg).toBeGreaterThan(1.5);
    expect(FATOR_COMBUSTIVEL.Gasolina.kg).toBeLessThan(1.8);
    expect(FATOR_COMBUSTIVEL.Etanol.kg).toBeLessThan(0.05);
    expect(FATOR_COMBUSTIVEL.Diesel.kg).toBeGreaterThan(2);
    expect(FATOR_COMBUSTIVEL.GNV.kg).toBeGreaterThan(2);
  });

  it.each([['Ônibus'], ['Metrô/Trem'], ['App/Táxi'], ['Passagem aérea'], ['Outro']])(
    '%s não tem fator: fica fora do cálculo e é sinalizado',
    (sub) => {
      const r = carbonoDoRegistro(reg('transporte', 80, 5, sub));
      expect(r).toEqual({ kg: 0, preciso: false, calculado: false });
    }
  );

  it.each([[null], [0], [-2], [Number.NaN]])('combustível sem quantidade válida (%s) não é calculado', (q) => {
    const r = carbonoDoRegistro(reg('transporte', 200, q as number | null, 'Gasolina'));
    expect(r.calculado).toBe(false);
    expect(r.kg).toBe(0);
  });

  it('total do mês soma transporte e conta os registros não calculados', () => {
    const res = calcularCarbono([
      reg('transporte', 250, 40, 'Gasolina'),
      reg('transporte', 60, undefined, 'Ônibus'),
      reg('energia', 300, 150),
    ]);
    expect(res.transporteKg).toBeCloseTo(40 * FATOR_COMBUSTIVEL.Gasolina.kg, 10);
    expect(res.registrosNaoCalculados).toBe(1);
    expect(res.registrosEstimados).toBe(0);
    expect(res.totalKg).toBeCloseTo(res.energiaKg + res.transporteKg, 10);
  });
});

describe('Transporte: subtipos e unidade da quantidade', () => {
  it('lista os subtipos pedidos e só 4 são combustíveis', () => {
    expect(TIPOS_TRANSPORTE).toEqual([
      'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Ônibus', 'Metrô/Trem', 'App/Táxi', 'Passagem aérea', 'Outro',
    ]);
    expect(COMBUSTIVEIS).toEqual(['Gasolina', 'Etanol', 'Diesel', 'GNV']);
  });

  it('ehCombustivel reconhece só os combustíveis', () => {
    expect(ehCombustivel('Gasolina')).toBe(true);
    expect(ehCombustivel('GNV')).toBe(true);
    expect(ehCombustivel('Ônibus')).toBe(false);
    expect(ehCombustivel(undefined)).toBe(false);
  });

  it('unidade: kWh na energia, m³ na água, L nos líquidos, m³ no GNV, nenhuma no resto', () => {
    expect(unidadeDeQuantidade('energia')).toBe('kWh');
    expect(unidadeDeQuantidade('agua')).toBe('m³');
    expect(unidadeDeQuantidade('transporte', 'Gasolina')).toBe('L');
    expect(unidadeDeQuantidade('transporte', 'Etanol')).toBe('L');
    expect(unidadeDeQuantidade('transporte', 'Diesel')).toBe('L');
    expect(unidadeDeQuantidade('transporte', 'GNV')).toBe('m³');
    expect(unidadeDeQuantidade('transporte', 'Ônibus')).toBeNull();
    expect(unidadeDeQuantidade('transporte')).toBeNull();
    expect(unidadeDeQuantidade('outro')).toBeNull();
  });
});
