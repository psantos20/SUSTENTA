/**
 * Dicas do dia: sorteio determinístico, mix por esforço e regras de pontos.
 */
import { describe, it, expect } from 'vitest';
import {
  DICAS,
  DICAS_POR_DIA,
  PONTOS_ESFORCO,
  dicasDoDia,
  pagouPontos,
  respostasDeHoje,
  resumoDoDia,
  transicaoDica,
} from '../src/app/pages/habits/dicas';
import type { RespostaDica } from '../src/app/pages/habits/dicas';

const dia = (n: number) => `2026-${String(1 + Math.floor(n / 28)).padStart(2, '0')}-${String(1 + (n % 28)).padStart(2, '0')}`;

describe('Banco de dicas', () => {
  it('ids únicos e textos preenchidos', () => {
    const ids = DICAS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DICAS.every((d) => d.texto.trim().length > 10 && d.porque.trim().length > 10)).toBe(true);
  });

  it('há dicas suficientes de cada esforço para montar o dia', () => {
    expect(DICAS.filter((d) => d.esforco === 'Fácil').length).toBeGreaterThanOrEqual(2);
    expect(DICAS.filter((d) => d.esforco === 'Médio').length).toBeGreaterThanOrEqual(2);
    expect(DICAS.filter((d) => d.esforco === 'Difícil').length).toBeGreaterThanOrEqual(1);
  });

  it('pontos por esforço: 10, 20 e 40', () => {
    expect(PONTOS_ESFORCO).toEqual({ Fácil: 10, Médio: 20, Difícil: 40 });
  });
});

describe('Dicas do dia (sorteio por data)', () => {
  it('sempre 5 dicas: 2 fáceis, 2 médias e 1 difícil, sem repetir', () => {
    for (let n = 0; n < 120; n++) {
      const d = dicasDoDia(dia(n));
      expect(d).toHaveLength(DICAS_POR_DIA);
      expect(new Set(d.map((x) => x.id)).size).toBe(DICAS_POR_DIA);
      expect(d.filter((x) => x.esforco === 'Fácil')).toHaveLength(2);
      expect(d.filter((x) => x.esforco === 'Médio')).toHaveLength(2);
      expect(d.filter((x) => x.esforco === 'Difícil')).toHaveLength(1);
    }
  });

  it('a mesma data sempre devolve as mesmas dicas, na mesma ordem', () => {
    expect(dicasDoDia('2026-10-23').map((d) => d.id)).toEqual(dicasDoDia('2026-10-23').map((d) => d.id));
  });

  it('não altera o banco de dicas ao sortear', () => {
    const antes = DICAS.map((d) => d.id).join(',');
    for (let n = 0; n < 30; n++) dicasDoDia(dia(n));
    expect(DICAS.map((d) => d.id).join(',')).toBe(antes);
  });

  it('dias diferentes variam e, no mês, todas as dicas aparecem', () => {
    const jogos = new Set<string>();
    const vistas = new Set<string>();
    for (let n = 0; n < 60; n++) {
      const d = dicasDoDia(dia(n));
      jogos.add(d.map((x) => x.id).join(','));
      d.forEach((x) => vistas.add(x.id));
    }
    expect(jogos.size).toBeGreaterThan(30);
    expect(vistas.size).toBe(DICAS.length);
  });
});

describe('Transição de resposta (pontos pagos uma única vez)', () => {
  it.each<[RespostaDica | undefined, RespostaDica, boolean, number]>([
    [undefined, 'ja_faco', true, 10],
    [undefined, 'vou_fazer', true, 0],
    [undefined, 'pulei', true, 0],
    [undefined, 'fiz', false, 0], // "Fiz" só depois de "Vou fazer"
    ['vou_fazer', 'fiz', true, 10],
    ['vou_fazer', 'ja_faco', true, 10],
    ['vou_fazer', 'pulei', true, 0],
    ['pulei', 'vou_fazer', true, 0],
    ['pulei', 'ja_faco', true, 10],
    ['pulei', 'fiz', false, 0],
    ['vou_fazer', 'vou_fazer', false, 0],
    ['ja_faco', 'pulei', false, 0], // depois de pago não muda: não dá para repetir
    ['ja_faco', 'ja_faco', false, 0],
    ['ja_faco', 'vou_fazer', false, 0],
    ['fiz', 'vou_fazer', false, 0],
    ['fiz', 'fiz', false, 0],
  ])('%s -> %s: permitida=%s, xp=%i (dica fácil)', (de, para, permitida, xp) => {
    expect(transicaoDica(de, para, 'Fácil')).toEqual({ permitida, xp });
  });

  it('o XP acompanha o esforço da dica', () => {
    expect(transicaoDica(undefined, 'ja_faco', 'Médio').xp).toBe(20);
    expect(transicaoDica('vou_fazer', 'fiz', 'Difícil').xp).toBe(40);
  });

  it('o máximo possível por dia é 2×10 + 2×20 + 1×40 = 100 XP', () => {
    const d = dicasDoDia('2026-10-23');
    const todas = Object.fromEntries(d.map((x) => [x.id, 'ja_faco' as RespostaDica]));
    expect(resumoDoDia(d, todas).xpGanho).toBe(100);
    expect(resumoDoDia(d, {}).xpPossivel).toBe(100);
  });
});

describe('Respostas guardadas e resumo', () => {
  it('registro de outro dia não vale hoje', () => {
    const reg = { data: '2026-10-22', respostas: { d01: 'ja_faco' as RespostaDica } };
    expect(respostasDeHoje(reg, '2026-10-23')).toEqual({});
    expect(respostasDeHoje(reg, '2026-10-22')).toEqual({ d01: 'ja_faco' });
    expect(respostasDeHoje(undefined, '2026-10-23')).toEqual({});
  });

  it('pagouPontos só para "ja_faco" e "fiz"', () => {
    expect(pagouPontos('ja_faco')).toBe(true);
    expect(pagouPontos('fiz')).toBe(true);
    expect(pagouPontos('vou_fazer')).toBe(false);
    expect(pagouPontos('pulei')).toBe(false);
    expect(pagouPontos(undefined)).toBe(false);
  });

  it('resumo conta respondidas, pendentes ("vou fazer") e XP ganho', () => {
    const d = dicasDoDia('2026-10-23');
    const r = resumoDoDia(d, { [d[0].id]: 'ja_faco', [d[1].id]: 'vou_fazer', [d[2].id]: 'pulei' });
    expect(r.total).toBe(5);
    expect(r.respondidas).toBe(2); // ja_faco e pulei; "vou fazer" ainda está pendente
    expect(r.pendentes).toBe(1);
    expect(r.xpGanho).toBe(PONTOS_ESFORCO[d[0].esforco]);
  });
});
