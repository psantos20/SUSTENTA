/**
 * Metas mensais por categoria: regras de cálculo (lógica pura).
 * Rodar: npm test
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn() }));

import { calcularProgresso, validarMeta, normalizarMetas } from '../src/services/metas';

describe('Meta: progresso (Valor Limite nas fronteiras 80% e 100%)', () => {
  const casos: [number, number, string, number][] = [
    [0, 100, 'ok', 0],
    [79.99, 100, 'ok', 80],
    [80, 100, 'atencao', 80],
    [100, 100, 'atencao', 100],
    [100.01, 100, 'estourou', 100],
    [250, 100, 'estourou', 250],
  ];
  for (const [gasto, meta, status, percentual] of casos) {
    it(`gasto ${gasto} para meta ${meta} -> ${status} (${percentual}%)`, () => {
      const r = calcularProgresso(gasto, meta);
      expect(r.status).toBe(status);
      expect(r.percentual).toBe(percentual);
    });
  }

  it('calcula quanto falta e quanto passou', () => {
    expect(calcularProgresso(60, 100).restante).toBe(40);
    expect(calcularProgresso(130.5, 100).restante).toBe(-30.5);
  });

  it('sem meta (0, negativa ou inválida) nunca alerta', () => {
    for (const meta of [0, -5, NaN, Infinity]) {
      expect(calcularProgresso(999, meta)).toEqual({ percentual: 0, status: 'ok', restante: 0 });
    }
  });

  it('gasto inválido conta como zero', () => {
    expect(calcularProgresso(NaN, 100).percentual).toBe(0);
    expect(calcularProgresso(-10, 100).percentual).toBe(0);
  });
});

describe('Meta: validação do campo', () => {
  it('vazio é válido (remove a meta)', () => {
    expect(validarMeta('')).toBeNull();
    expect(validarMeta('   ')).toBeNull();
  });
  it('aceita número com vírgula ou ponto', () => {
    expect(validarMeta('150,50')).toBeNull();
    expect(validarMeta('150.5')).toBeNull();
  });
  it('rejeita zero, negativo, texto, fração de centavo e acima do limite', () => {
    for (const v of ['0', '-10', 'abc', '10,005', '1000000,01']) {
      expect(validarMeta(v)).not.toBeNull();
    }
  });
});

describe('Meta: normalização do que vem do banco', () => {
  it('mantém só categorias conhecidas com número válido', () => {
    expect(normalizarMetas({ energia: 200, agua: 80.5, outro: 0, hack: 1 })).toEqual({ energia: 200, agua: 80.5 });
  });
  it('lixo vira objeto vazio', () => {
    expect(normalizarMetas(null)).toEqual({});
    expect(normalizarMetas('x')).toEqual({});
    expect(normalizarMetas({ energia: '200', agua: -1, outro: 2_000_000 })).toEqual({});
  });
});
