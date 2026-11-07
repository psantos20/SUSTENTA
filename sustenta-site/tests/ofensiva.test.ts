/**
 * Ofensiva (sequência de dias): regras de data local, validade e marcos de XP.
 */
import { describe, it, expect } from 'vitest';
import {
  MARCOS_OFENSIVA,
  bonusDosMarcos,
  dataLocal,
  marcosAlcancados,
  ofensivaAposMarcar,
  ofensivaAtual,
  ofensivaEmRisco,
  proximoMarco,
  somarDias,
} from '../src/app/pages/habits/ofensiva';

describe('Datas locais (sem UTC)', () => {
  it('dataLocal usa o dia do relógio local, mesmo às 23h', () => {
    expect(dataLocal(new Date(2026, 9, 23, 23, 30))).toBe('2026-10-23');
    expect(dataLocal(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('somarDias atravessa fim de mês, de ano e ano bissexto', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(somarDias('2027-02-28', 1)).toBe('2027-03-01');
    expect(somarDias('2026-10-23', 0)).toBe('2026-10-23');
  });
});

describe('Ofensiva atual: a sequência morre se um dia inteiro passa em branco', () => {
  const HOJE = '2026-10-23';
  it('marcou hoje: mantém', () => expect(ofensivaAtual(5, '2026-10-23', HOJE)).toBe(5));
  it('marcou ontem: mantém (ainda dá tempo hoje)', () => expect(ofensivaAtual(5, '2026-10-22', HOJE)).toBe(5));
  it('marcou anteontem: zera', () => expect(ofensivaAtual(5, '2026-10-21', HOJE)).toBe(0));
  it('virada de mês: ontem é dia 31', () => expect(ofensivaAtual(3, '2026-10-31', '2026-11-01')).toBe(3));
  it('nunca marcou ou dado inválido: zero', () => {
    expect(ofensivaAtual(0, '', HOJE)).toBe(0);
    expect(ofensivaAtual(4, '', HOJE)).toBe(0);
    expect(ofensivaAtual(-2, '2026-10-23', HOJE)).toBe(0);
    expect(ofensivaAtual(Number.NaN, '2026-10-23', HOJE)).toBe(0);
  });
  it('relógio adiantado (último registro no futuro) não zera', () => {
    expect(ofensivaAtual(5, '2026-10-24', HOJE)).toBe(5);
  });
});

describe('Ofensiva em risco', () => {
  it('só quando marcou ontem e ainda não hoje', () => {
    expect(ofensivaEmRisco(4, '2026-10-22', '2026-10-23')).toBe(true);
    expect(ofensivaEmRisco(4, '2026-10-23', '2026-10-23')).toBe(false);
    expect(ofensivaEmRisco(4, '2026-10-20', '2026-10-23')).toBe(false); // já perdeu
    expect(ofensivaEmRisco(0, '', '2026-10-23')).toBe(false);
  });
});

describe('Ofensiva ao marcar um hábito', () => {
  it('primeiro dia vira 1', () => expect(ofensivaAposMarcar(0, '', '2026-10-23')).toBe(1));
  it('dia seguinte soma 1', () => expect(ofensivaAposMarcar(4, '2026-10-22', '2026-10-23')).toBe(5));
  it('segundo hábito no mesmo dia não soma de novo', () => expect(ofensivaAposMarcar(5, '2026-10-23', '2026-10-23')).toBe(5));
  it('depois de perder a sequência recomeça em 1', () => expect(ofensivaAposMarcar(9, '2026-10-10', '2026-10-23')).toBe(1));
  it('às 22h (UTC já no dia seguinte) o dia local não muda', () => {
    const noite = new Date(2026, 9, 23, 22, 0);
    const manha = new Date(2026, 9, 24, 8, 0);
    expect(ofensivaAposMarcar(1, dataLocal(noite), dataLocal(manha))).toBe(2);
  });
});

describe('Marcos de sequência e bônus de XP (Valor Limite nos marcos)', () => {
  it('lista de marcos crescente, bônus positivos e abaixo do limite de 1000 XP por gravação', () => {
    const dias = MARCOS_OFENSIVA.map((m) => m.dias);
    expect([...dias].sort((a, b) => a - b)).toEqual(dias);
    expect(MARCOS_OFENSIVA.every((m) => m.xp > 0 && m.xp < 900)).toBe(true);
  });
  it.each([
    [1, 2, 0],
    [2, 3, 30],
    [3, 4, 0],
    [6, 7, 70],
    [13, 14, 150],
    [29, 30, 300],
    [59, 60, 500],
    [60, 61, 0],
    [0, 1, 0],
  ])('de %i para %i dias paga %i XP', (de, para, xp) => {
    expect(bonusDosMarcos(de, para)).toBe(xp);
  });
  it('não paga de novo quando a sequência não muda (mesmo dia)', () => {
    expect(marcosAlcancados(7, 7)).toEqual([]);
  });
  it('recomeçar e alcançar o marco de novo paga de novo', () => {
    expect(bonusDosMarcos(2, 3)).toBe(30);
  });
  it('próximo marco', () => {
    expect(proximoMarco(0)?.dias).toBe(3);
    expect(proximoMarco(3)?.dias).toBe(7);
    expect(proximoMarco(29)?.dias).toBe(30);
    expect(proximoMarco(60)).toBeNull();
  });
});
