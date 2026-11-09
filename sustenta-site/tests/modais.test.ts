/**
 * Comparador de modais de transporte (lógica pura, fatores do Ipea TD 1606).
 */
import { describe, it, expect } from 'vitest';
import {
  KG_POR_KM_CARRO,
  OCUPACAO_MEDIA_CARRO,
  compararModais,
  fatorDoModal,
  lerNumero,
  pessoasValidas,
} from '../src/app/pages/education/modais';

describe('fatores por passageiro·km', () => {
  it('batem com a Tabela 4 do estudo do Ipea', () => {
    expect(fatorDoModal('metro')).toBe(0.0035);
    expect(fatorDoModal('onibus')).toBe(0.016);
    expect(fatorDoModal('moto')).toBe(0.0711);
    // carro com a ocupação média (1,5): ≈ 0,1268 da tabela
    expect(fatorDoModal('carro', 1)).toBeCloseTo(0.19, 5);
    expect(KG_POR_KM_CARRO / OCUPACAO_MEDIA_CARRO).toBeCloseTo(0.1268, 3);
  });

  it('bicicleta e a pé não têm emissão direta', () => {
    expect(fatorDoModal('bicicleta')).toBe(0);
    expect(fatorDoModal('a_pe')).toBe(0);
  });

  it('o carro divide a emissão entre as pessoas que vão nele', () => {
    expect(fatorDoModal('carro', 2)).toBeCloseTo(0.095, 5);
    expect(fatorDoModal('carro', 4)).toBeCloseTo(0.0475, 5);
  });

  it('número de pessoas inválido vira 1', () => {
    expect(pessoasValidas(0)).toBe(1);
    expect(pessoasValidas(2.5)).toBe(1);
    expect(pessoasValidas(99)).toBe(1);
    expect(pessoasValidas(NaN)).toBe(1);
    expect(pessoasValidas(3)).toBe(3);
  });
});

describe('lerNumero', () => {
  it('aceita vírgula e ponto', () => {
    expect(lerNumero('12,5', 1000)).toBe(12.5);
    expect(lerNumero(' 8.25 ', 1000)).toBe(8.25);
  });

  it('rejeita vazio, zero, negativo, texto e acima do limite', () => {
    expect(lerNumero('', 1000)).toBeNull();
    expect(lerNumero('0', 1000)).toBeNull();
    expect(lerNumero('-3', 1000)).toBeNull();
    expect(lerNumero('abc', 1000)).toBeNull();
    expect(lerNumero('1001', 1000)).toBeNull();
    expect(lerNumero('Infinity', 1000)).toBeNull();
  });
});

describe('compararModais', () => {
  const base = { km: 10, diasPorMes: 22, idaEVolta: true, pessoasNoCarro: 1 };

  it('calcula o mês: km × (ida e volta) × dias × fator', () => {
    const linhas = compararModais(base);
    const carro = linhas.find((l) => l.id === 'carro')!;
    // 10 km × 2 × 22 dias = 440 km × 0,19
    expect(carro.kgMes).toBeCloseTo(83.6, 5);
    const onibus = linhas.find((l) => l.id === 'onibus')!;
    expect(onibus.kgMes).toBeCloseTo(7.04, 5);
  });

  it('só ida: metade da distância', () => {
    const ida = compararModais({ ...base, idaEVolta: false }).find((l) => l.id === 'carro')!;
    expect(ida.kgMes).toBeCloseTo(41.8, 5);
  });

  it('ordena do que menos emite ao que mais emite', () => {
    const ordem = compararModais(base).map((l) => l.id);
    expect(ordem).toEqual(['a_pe', 'bicicleta', 'metro', 'onibus', 'moto', 'carro']);
  });

  it('economia contra o carro: positiva para quem emite menos, zero para o próprio carro', () => {
    const linhas = compararModais(base);
    const carro = linhas.find((l) => l.id === 'carro')!;
    const onibus = linhas.find((l) => l.id === 'onibus')!;
    const aPe = linhas.find((l) => l.id === 'a_pe')!;
    expect(carro.economiaVsCarro).toBe(0);
    expect(carro.percentualVsCarro).toBe(0);
    expect(onibus.economiaVsCarro).toBeCloseTo(76.56, 5);
    expect(onibus.percentualVsCarro).toBe(92);
    expect(aPe.percentualVsCarro).toBe(100);
  });

  it('carro cheio pode emitir menos que a moto (e a economia fica negativa para a moto)', () => {
    const linhas = compararModais({ ...base, pessoasNoCarro: 4 });
    const carro = linhas.find((l) => l.id === 'carro')!;
    const moto = linhas.find((l) => l.id === 'moto')!;
    expect(carro.fator).toBeLessThan(moto.fator);
    expect(moto.economiaVsCarro).toBeLessThan(0);
    expect(moto.percentualVsCarro).toBeLessThan(0);
  });

  it('entrada inválida não gera NaN: tudo zero', () => {
    const linhas = compararModais({ km: NaN, diasPorMes: -1, idaEVolta: true, pessoasNoCarro: 1 });
    for (const l of linhas) {
      expect(l.kgMes).toBe(0);
      expect(l.percentualVsCarro).toBe(0);
      expect(Number.isNaN(l.economiaVsCarro)).toBe(false);
    }
  });
});
