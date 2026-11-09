/**
 * Liga da semana: XP semanal, renovação toda segunda e ranking com empates (lógica pura).
 */
import { describe, it, expect } from 'vitest';
import { TAMANHO_LIGA, entrarNaLiga, montarLiga, nomeAbreviado, posicaoDe, renovarLiga, xpDaSemana } from '../src/app/pages/habits/liga';
import type { EntradaLiga } from '../src/app/pages/habits/liga';

const SEMANA = '2026-10-19';
const e = (uid: string, xp: number, nome = `Pessoa ${uid}`, semana = SEMANA): EntradaLiga => ({ uid, nome, semana, xp });

describe('Nome abreviado (só o necessário no ranking público)', () => {
  it.each([
    ['Pedro Santos de Almeida', 'Pedro A.'],
    ['Ana Silva', 'Ana S.'],
    ['  maria   souza  ', 'maria S.'],
    ['Pedro', 'Pedro'],
    ['', 'Anônimo'],
    ['   ', 'Anônimo'],
  ])('%j vira %j', (entrada, saida) => {
    expect(nomeAbreviado(entrada)).toBe(saida);
  });

  it('null e undefined viram Anônimo; primeiro nome enorme é cortado', () => {
    expect(nomeAbreviado(null)).toBe('Anônimo');
    expect(nomeAbreviado(undefined)).toBe('Anônimo');
    expect(nomeAbreviado('A'.repeat(60) + ' Souza')).toBe('A'.repeat(20) + ' S.');
  });
});

describe('XP da semana', () => {
  it('é o XP atual menos a base', () => {
    expect(xpDaSemana(350, 300)).toBe(50);
    expect(xpDaSemana(300, 300)).toBe(0);
  });
  it('nunca fica negativo (desmarcar hábito depois de ganhar na semana anterior)', () => {
    expect(xpDaSemana(280, 300)).toBe(0);
  });
  it('valores inválidos viram zero', () => {
    expect(xpDaSemana(Number.NaN, 10)).toBe(0);
    expect(xpDaSemana(50, Number.NaN)).toBe(50);
  });
});

describe('Entrar e renovar a liga', () => {
  it('ao entrar, a semana começa do zero', () => {
    const l = entrarNaLiga(SEMANA, 400);
    expect(l).toEqual({ participa: true, semana: SEMANA, base: 400 });
    expect(xpDaSemana(400, l.base)).toBe(0);
  });

  it('na semana seguinte a base é anotada de novo e o XP semanal zera', () => {
    const antiga = { participa: true, semana: '2026-10-12', base: 100 };
    const nova = renovarLiga(antiga, SEMANA, 260)!;
    expect(nova).toEqual({ participa: true, semana: SEMANA, base: 260 });
    expect(xpDaSemana(260, nova.base)).toBe(0);
  });

  it('na mesma semana nada muda; quem não participa não é renovado', () => {
    const atual = { participa: true, semana: SEMANA, base: 100 };
    expect(renovarLiga(atual, SEMANA, 999)).toBe(atual);
    const fora = { participa: false, semana: '2026-10-12', base: 0 };
    expect(renovarLiga(fora, SEMANA, 999)).toBe(fora);
    expect(renovarLiga(undefined, SEMANA, 999)).toBeUndefined();
  });
});

describe('Ranking da semana', () => {
  it('ordena do maior para o menor XP', () => {
    const r = montarLiga([e('a', 10), e('b', 50), e('c', 30)], SEMANA);
    expect(r.map((x) => x.uid)).toEqual(['b', 'c', 'a']);
    expect(r.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });

  it('empates dividem a posição (1, 1, 3)', () => {
    const r = montarLiga([e('a', 50, 'Ana'), e('b', 50, 'Bia'), e('c', 20)], SEMANA);
    expect(r.map((x) => x.posicao)).toEqual([1, 1, 3]);
    expect(r[0].nome).toBe('Ana'); // desempate estável por nome
  });

  it('ignora outras semanas, XP inválido e repetições da mesma pessoa', () => {
    const r = montarLiga(
      [
        e('a', 10),
        e('velho', 999, 'Velho', '2026-10-12'),
        e('neg', -5),
        e('nan', Number.NaN),
        { uid: 'str', nome: 'x', semana: SEMANA, xp: '9' as unknown as number },
        e('a', 40), // duplicada: vale a maior
      ],
      SEMANA
    );
    expect(r.map((x) => x.uid)).toEqual(['a']);
    expect(r[0].xp).toBe(40);
  });

  it('mostra só os 10 primeiros', () => {
    const muitas = Array.from({ length: 25 }, (_, i) => e(`u${i}`, i));
    const r = montarLiga(muitas, SEMANA);
    expect(r).toHaveLength(TAMANHO_LIGA);
    expect(r[0].uid).toBe('u24');
  });

  it('lista vazia dá ranking vazio', () => {
    expect(montarLiga([], SEMANA)).toEqual([]);
  });

  it('posição de uma pessoa fora do top 10, e de quem não participa', () => {
    const muitas = Array.from({ length: 25 }, (_, i) => e(`u${i}`, i + 1));
    expect(posicaoDe(muitas, 'u24', SEMANA)).toBe(1);
    expect(posicaoDe(muitas, 'u0', SEMANA)).toBe(25); // fora do top 10, mas com posição
    expect(posicaoDe(muitas, 'fantasma', SEMANA)).toBeNull();
  });
});
