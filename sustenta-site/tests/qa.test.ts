/**
 * DESAFIO QA+ — testes executados sobre o código REAL do SUSTENTA
 * (src/services/validacao.ts e calcularNivel em src/services/consumo.ts).
 * Cada bloco describe corresponde a um caso de teste (CTxx) do relatório.
 * Rodar:  npm test   (ou: npx vitest run tests/qa.test.ts --reporter=verbose)
 */
import { describe, it, expect, vi } from 'vitest';

// consumo.ts importa o Firebase; aqui só testamos a lógica pura, então simulamos os módulos.
vi.mock('../src/services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), query: vi.fn(), where: vi.fn(), getDocs: vi.fn() }));

import {
  validarValor, validarMes, validarSenha, limparTexto, urlExternaSegura, limitarPontosHabito, LIMITES,
} from '../src/services/validacao';
import { calcularNivel } from '../src/services/consumo';

const fmt = (v: unknown) => (typeof v === 'number' ? String(v) : JSON.stringify(v, (_k, x) => (typeof x === 'number' && Number.isNaN(x) ? 'NaN' : x)));
const log = (id: string, entrada: unknown, obtido: unknown) =>
  console.log(`[${id}] entrada=${fmt(entrada)} -> obtido=${fmt(obtido)}`);

function tabela(id: string, casos: [string, number | string | null | undefined, boolean][], fn: (x: any) => unknown, aceita: (r: any) => boolean, verbo: [string, string]) {
  for (const [nome, entrada, valido] of casos) {
    it(`${nome}: ${fmt(entrada)} deve ser ${valido ? verbo[0] : verbo[1]}`, () => {
      const r = fn(entrada); log(id, entrada, r);
      expect(aceita(r)).toBe(valido);
    });
  }
}

describe('CT01 - Valor do gasto: limites (Análise de Valor Limite)', () => {
  tabela('CT01', [
    ['negativo', -1, false], ['zero', 0, false], ['limite inferior (0,01)', 0.01, true],
    ['limite superior (1.000.000)', 1_000_000, true], ['acima do limite (1.000.000,01)', 1_000_000.01, false],
    ['campo vazio (NaN)', NaN, false], ['Infinity', Infinity, false],
  ], validarValor, (r) => r === null, ['aceito', 'rejeitado']);
});

describe('CT02 - Valor do gasto: fração de centavo', () => {
  it('0,001 deve ser rejeitado (moeda tem 2 casas; o campo declara step=0,01)', () => {
    const r = validarValor(0.001); log('CT02', 0.001, r);
    expect(r).not.toBeNull();
  });
});

describe('CT03 - Senha de cadastro: partições de equivalência', () => {
  tabela('CT03', [
    ['7 caracteres (curta)', 'abc1234', false], ['8 caracteres letras+números (limite)', 'abcd1234', true],
    ['8 caracteres só letras', 'abcdefgh', false], ['8 caracteres só números', '12345678', false],
    ['espaços + 1 número', '       1', false], ['senha forte longa', 'Sust3ntaSegura2026', true],
  ], validarSenha, (r) => r === null, ['aceita', 'rejeitada']);
});

describe('CT04 - Senha de cadastro: letras acentuadas', () => {
  it('"áéíóúãç1" (só letras acentuadas + número) deve ser aceita', () => {
    const r = validarSenha('áéíóúãç1'); log('CT04', 'áéíóúãç1', r);
    expect(r).toBeNull();
  });
});

describe('CT05 - Mês de referência: formato (Valor Limite)', () => {
  tabela('CT05', [
    ['janeiro (limite inf.)', '2026-01', true], ['dezembro (limite sup.)', '2026-12', true],
    ['mês 00', '2026-00', false], ['mês 13', '2026-13', false], ['sem zero à esquerda', '2026-1', false], ['vazio', '', false],
  ], validarMes, (r) => r === null, ['aceito', 'rejeitado']);
});

describe('CT06 - Mês de referência: anos extremos', () => {
  tabela('CT06', [['ano 0001', '0001-01', false], ['ano 9999 (futuro distante)', '9999-12', false]],
    validarMes, (r) => r === null, ['aceito', 'rejeitado']);
});

describe('CT07 - Texto livre: caracteres de controle e tamanho máximo', () => {
  it('remove caracteres de controle', () => {
    const r = limparTexto('conta\u0000de\u0007luz\n', 300); log('CT07a', 'conta<NUL>de<BEL>luz<LF>', r);
    expect(r).toBe('conta de luz');
  });
  it('limita a 300 caracteres', () => {
    const r = limparTexto('a'.repeat(500), LIMITES.descricao); log('CT07b', "'a' x500 (tamanho)", r.length);
    expect(r.length).toBe(300);
  });
  it('null/undefined viram texto vazio', () => {
    expect(limparTexto(null, 10)).toBe(''); expect(limparTexto(undefined, 10)).toBe('');
  });
});

describe('CT08 - Links externos (segurança)', () => {
  tabela('CT08', [
    ['https válido', 'https://exemplo.com/noticia', true], ['http válido', 'http://exemplo.com', true],
    ['javascript:', 'javascript:alert(1)', false], ['JaVaScRiPt: (maiúsc./minúsc.)', 'JaVaScRiPt:alert(1)', false],
    ['data:', 'data:text/html,<script>1</script>', false], ['ftp', 'ftp://exemplo.com', false],
    ['texto que não é URL', 'não é url', false], ['vazia', '', false], ['null', null, false],
  ], urlExternaSegura, (r) => r !== undefined, ['aceito', 'bloqueado']);
});

describe('CT09 - Texto livre: emoji no limite de tamanho', () => {
  it("299 letras + 🌱 não pode deixar meio-emoji (surrogate solto) no texto salvo", () => {
    const r = limparTexto('a'.repeat(299) + '🌱', LIMITES.descricao);
    const ultimo = r.charCodeAt(r.length - 1);
    log('CT09', "'a' x299 + 🌱", { tamanho: r.length, ultimoCodigoHex: ultimo.toString(16) });
    expect(ultimo >= 0xd800 && ultimo <= 0xdbff).toBe(false);
  });
});

describe('CT10 - Nível/XP: fronteiras (Transição de Estados)', () => {
  const casos: [number, number, string][] = [
    [0, 1, 'Iniciante'], [9, 1, 'Iniciante'], [10, 2, 'Consciente'], [19, 2, 'Consciente'],
    [20, 3, 'Engajado'], [50, 6, 'Guardião'], [90, 10, 'Eco Herói'],
  ];
  for (const [n, nivel, nome] of casos) {
    it(`${n} registros -> nível ${nivel} (${nome})`, () => {
      const r = calcularNivel(n); log('CT10', n, r);
      expect(r.nivel).toBe(nivel); expect(r.nome).toBe(nome);
    });
  }
});

describe('CT11 - Nível/XP: além do nível máximo (10 níveis)', () => {
  it('100 registros: o nível exibido não pode passar de 10', () => {
    const r = calcularNivel(100); log('CT11', 100, r);
    expect(r.nivel).toBeLessThanOrEqual(10);
  });
});

describe('CT12 - Nível/XP: entradas inválidas', () => {
  it('total negativo (-1) deve gerar nível >= 1 e nome válido', () => {
    const r = calcularNivel(-1); log('CT12a', -1, r);
    expect(r.nivel).toBeGreaterThanOrEqual(1); expect(r.nome).toBeTruthy();
  });
  it('NaN não deve gerar nível NaN', () => {
    const r = calcularNivel(NaN); log('CT12b', NaN, r);
    expect(Number.isNaN(r.nivel)).toBe(false);
  });
});

describe('CT13 - Pontos de hábito (Valor Limite)', () => {
  const casos: [number, number][] = [[4, 5], [5, 5], [100, 100], [101, 100], [-50, 5], [NaN, 20], [Infinity, 20], [7.6, 8]];
  for (const [e, s] of casos) {
    it(`${e} -> ${s}`, () => { const r = limitarPontosHabito(e); log('CT13', e, r); expect(r).toBe(s); });
  }
});
