/**
 * Retrospectiva do mês: resumo, destaques e texto de compartilhamento (lógica pura).
 */
import { describe, it, expect } from 'vitest';
import {
  mesAnteriorDe,
  montarRetrospectiva,
  primeiroNome,
  textoCompartilhamento,
} from '../src/app/pages/reports/retrospectiva';
import type { EntradaRetrospectiva } from '../src/app/pages/reports/retrospectiva';
import { quebrarLinhas } from '../src/app/pages/reports/imagemRetrospectiva';
import type { HistoricoMes } from '../src/app/pages/reports/tipos';

const h = (mes: string, e: number, a: number, t: number, o: number, score = 70): HistoricoMes => ({
  mes,
  label: mes,
  total: e + a + t + o,
  energia: e,
  agua: a,
  transporte: t,
  outro: o,
  score,
});

const base = (parcial: Partial<EntradaRetrospectiva> = {}): EntradaRetrospectiva => ({
  mes: '2026-10',
  mesLabel: 'Outubro 2026',
  nome: 'Pedro Santos de Almeida',
  totais: { energia: 200, agua: 100, transporte: 300, outro: 100 },
  scoreMes: 70,
  nivel: 'Consciente',
  kgCO2: 103.24,
  registros: 6,
  historico: [h('2026-09', 200, 100, 300, 100, 70)],
  ...parcial,
});

describe('mesAnteriorDe / primeiroNome', () => {
  it('janeiro volta para dezembro do ano anterior', () => {
    expect(mesAnteriorDe('2026-01')).toBe('2025-12');
    expect(mesAnteriorDe('2026-10')).toBe('2026-09');
    expect(mesAnteriorDe('lixo')).toBe('');
  });

  it('mostra só o primeiro nome (a imagem é pública)', () => {
    expect(primeiroNome('Pedro Santos de Almeida')).toBe('Pedro');
    expect(primeiroNome('  Ana ')).toBe('Ana');
    expect(primeiroNome(null)).toBe('');
    expect(primeiroNome(undefined)).toBe('');
  });
});

describe('montarRetrospectiva — números', () => {
  it('soma o total e calcula a variação contra o mês anterior', () => {
    const r = montarRetrospectiva(base({ totais: { energia: 220, agua: 110, transporte: 330, outro: 110 }, historico: [h('2026-09', 200, 100, 300, 100)] }));
    expect(r.total).toBe(770);
    expect(r.variacaoPercentual).toBe(10);
    expect(r.nomeCurto).toBe('Pedro');
  });

  it('sem mês anterior com dados não há variação nem delta de score', () => {
    const r = montarRetrospectiva(base({ historico: [] }));
    expect(r.variacaoPercentual).toBeNull();
    expect(r.deltaScore).toBeNull();
    // mês anterior zerado também não conta
    expect(montarRetrospectiva(base({ historico: [h('2026-09', 0, 0, 0, 0)] })).variacaoPercentual).toBeNull();
  });

  it('só compara com o mês imediatamente anterior (mês antigo não serve)', () => {
    const r = montarRetrospectiva(base({ historico: [h('2026-07', 100, 100, 100, 100)] }));
    expect(r.variacaoPercentual).toBeNull();
  });

  it('delta de score usa o score do mês anterior', () => {
    const r = montarRetrospectiva(base({ scoreMes: 78, historico: [h('2026-09', 200, 100, 300, 100, 70)] }));
    expect(r.deltaScore).toBe(8);
  });

  it('identifica a categoria que mais pesou e o seu percentual', () => {
    const r = montarRetrospectiva(base());
    expect(r.maisPesou).toMatchObject({ chave: 'transporte', rotulo: 'Transporte', valor: 300, percentual: 43 });
  });

  it('sem gastos não há categoria e o mês não tem dados', () => {
    const r = montarRetrospectiva(base({ totais: { energia: 0, agua: 0, transporte: 0, outro: 0 }, registros: 0 }));
    expect(r.temDados).toBe(false);
    expect(r.maisPesou).toBeNull();
    expect(r.total).toBe(0);
  });

  it('valores inválidos viram zero', () => {
    const r = montarRetrospectiva(base({ totais: { energia: NaN, agua: -5, transporte: 50, outro: 0 }, kgCO2: NaN }));
    expect(r.total).toBe(50);
    expect(r.kgCO2).toBe(0);
  });
});

describe('montarRetrospectiva — maior queda', () => {
  it('destaca a categoria que mais caiu (a partir de 10%)', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 100, agua: 90, transporte: 300, outro: 100 },
      historico: [h('2026-09', 200, 100, 300, 100)],
    }));
    expect(r.maiorQueda).toMatchObject({ chave: 'energia', percentual: 50 });
  });

  it('queda pequena ou categoria sem gasto no mês anterior não vira destaque', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 195, agua: 100, transporte: 300, outro: 100 },
      historico: [h('2026-09', 200, 100, 300, 100)],
    }));
    expect(r.maiorQueda).toBeNull();
    const semAntes = montarRetrospectiva(base({ historico: [h('2026-09', 0, 0, 300, 0)] }));
    expect(semAntes.maiorQueda).toBeNull();
  });
});

describe('montarRetrospectiva — frase de destaque', () => {
  it('mês mais econômico entre os anteriores tem prioridade', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 100, agua: 50, transporte: 100, outro: 50 },
      historico: [h('2026-08', 300, 100, 300, 100), h('2026-09', 250, 100, 250, 100)],
    }));
    expect(r.destaque).toEqual({ tom: 'positivo', texto: 'Seu mês mais econômico dos últimos 3 meses!' });
  });

  it('com só um mês anterior não declara "mais econômico"', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 100, agua: 50, transporte: 100, outro: 50 },
      historico: [h('2026-09', 300, 100, 300, 100)],
    }));
    expect(r.destaque.texto).toBe('Você gastou 62% menos que no mês passado.');
  });

  it('score excelente quando não há queda relevante', () => {
    const r = montarRetrospectiva(base({ scoreMes: 85, historico: [] }));
    expect(r.destaque).toEqual({ tom: 'positivo', texto: 'Score excelente! Hábitos sustentáveis em dia.' });
  });

  it('alta relevante vira mensagem neutra e sem culpa', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 300, agua: 150, transporte: 450, outro: 150 },
      historico: [h('2026-09', 200, 100, 300, 100)],
    }));
    expect(r.destaque.tom).toBe('neutro');
    expect(r.destaque.texto).toContain('subiram 50%');
  });

  it('mês parecido com o anterior cai na frase padrão', () => {
    expect(montarRetrospectiva(base()).destaque).toEqual({ tom: 'neutro', texto: 'Mais um mês acompanhando o seu consumo. Continue assim!' });
  });

  it('categoria que caiu aparece quando o total não caiu o bastante', () => {
    const r = montarRetrospectiva(base({
      totais: { energia: 140, agua: 100, transporte: 330, outro: 110 },
      historico: [h('2026-09', 200, 100, 300, 100)],
    }));
    expect(r.destaque.texto).toBe('Energia caiu 30% em relação ao mês passado.');
  });
});

describe('textoCompartilhamento', () => {
  const r = montarRetrospectiva(base({
    totais: { energia: 220, agua: 110, transporte: 330, outro: 110 },
    historico: [h('2026-09', 200, 100, 300, 100)],
  }));

  it('inclui os valores em R$ quando permitido', () => {
    const t = textoCompartilhamento(r, true);
    expect(t).toContain('Outubro 2026');
    expect(t).toMatch(/Gastei R\$\s770,00/);
    expect(t).toContain('+10% em relação ao mês anterior');
    expect(t).toContain('103,2 kg de CO₂');
    expect(t).toContain('Score: 70/100');
  });

  it('esconde os valores em R$ mas mantém os percentuais', () => {
    const t = textoCompartilhamento(r, false);
    expect(t).not.toMatch(/R\$/);
    expect(t).toContain('+10% em relação ao mês anterior');
  });

  it('não cita variação sem mês anterior', () => {
    const t = textoCompartilhamento(montarRetrospectiva(base({ historico: [] })), false);
    expect(t).not.toContain('em relação');
    expect(t).not.toContain('Meus gastos');
  });
});

describe('quebrarLinhas (texto da imagem)', () => {
  // Cada caractere mede 10px: simples de raciocinar.
  const medir = (t: string) => t.length * 10;

  it('mantém numa linha o que cabe', () => {
    expect(quebrarLinhas('Mês bom', 200, medir)).toEqual(['Mês bom']);
  });

  it('quebra entre palavras quando passa da largura', () => {
    expect(quebrarLinhas('Seu mês mais econômico dos últimos 3 meses!', 200, medir)).toEqual([
      'Seu mês mais',
      'econômico dos',
      'últimos 3 meses!',
    ]);
  });

  it('palavra maior que a largura fica sozinha (sem laço infinito)', () => {
    expect(quebrarLinhas('a supercalifragilistico b', 50, medir)).toEqual(['a', 'supercalifragilistico', 'b']);
  });

  it('texto vazio não gera linhas', () => {
    expect(quebrarLinhas('   ', 100, medir)).toEqual([]);
  });
});
