/**
 * Retrospectiva do mês: o resumo que vira imagem para compartilhar.
 *
 * Função pura, sem Firebase nem DOM, para poder ser testada. A tela só desenha
 * o que sai daqui. Todos os números vêm do relatório mensal já carregado.
 */
import type { HistoricoMes } from './tipos';

export const CATEGORIAS_RETRO = ['energia', 'agua', 'transporte', 'outro'] as const;
export type CategoriaRetro = (typeof CATEGORIAS_RETRO)[number];

export const ROTULO_RETRO: Record<CategoriaRetro, string> = {
  energia: 'Energia',
  agua: 'Água',
  transporte: 'Transporte',
  outro: 'Outros gastos',
};

/** Queda mínima (em %) de uma categoria para virar destaque positivo. */
export const QUEDA_MINIMA_DESTAQUE = 10;
/** Variação do total (em %) a partir da qual o mês vira conquista ou alerta. */
export const VARIACAO_RELEVANTE = 5;
/** Score a partir do qual o mês é chamado de excelente (mesmo limite do relatório). */
export const SCORE_EXCELENTE = 80;

export interface EntradaRetrospectiva {
  /** Mês "AAAA-MM". */
  mes: string;
  mesLabel: string;
  nome?: string | null;
  totais: Record<CategoriaRetro, number>;
  scoreMes: number;
  nivel: string;
  /** Estimativa de CO₂ do mês, em kg. */
  kgCO2: number;
  registros: number;
  /** Últimos meses, do mais antigo ao mais recente (pode incluir o próprio mês). */
  historico: HistoricoMes[];
}

export interface CategoriaDestaque {
  chave: CategoriaRetro;
  rotulo: string;
  valor: number;
  /** Para a categoria que mais pesou: % do total. Para a maior queda: % de queda. */
  percentual: number;
}

export type TomDestaque = 'positivo' | 'neutro';

export interface Retrospectiva {
  temDados: boolean;
  mesLabel: string;
  /** Só o primeiro nome (vai numa imagem pública). */
  nomeCurto: string;
  total: number;
  /** Variação do total contra o mês anterior, em % (null sem mês anterior com dados). */
  variacaoPercentual: number | null;
  scoreMes: number;
  deltaScore: number | null;
  nivel: string;
  kgCO2: number;
  maisPesou: CategoriaDestaque | null;
  maiorQueda: CategoriaDestaque | null;
  /** Frase de destaque do mês. */
  destaque: { tom: TomDestaque; texto: string };
}

/** Mês anterior de "AAAA-MM" (janeiro volta para dezembro do ano anterior). */
export function mesAnteriorDe(mes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "Pedro Santos de Almeida" vira "Pedro". Vazio vira "". */
export function primeiroNome(nome: string | null | undefined): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? '';
  return primeiro.slice(0, 20);
}

const positivo = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function montarRetrospectiva(e: EntradaRetrospectiva): Retrospectiva {
  const totais = {} as Record<CategoriaRetro, number>;
  for (const c of CATEGORIAS_RETRO) totais[c] = positivo(e.totais[c]);
  const total = CATEGORIAS_RETRO.reduce((s, c) => s + totais[c], 0);

  const anterior = e.historico.find((h) => h.mes === mesAnteriorDe(e.mes) && h.total > 0) ?? null;
  const variacaoPercentual = anterior ? Math.round(((total - anterior.total) / anterior.total) * 100) : null;
  const deltaScore = anterior ? Math.round(e.scoreMes - anterior.score) : null;

  let maisPesou: CategoriaDestaque | null = null;
  if (total > 0) {
    const topo = CATEGORIAS_RETRO.reduce((m, c) => (totais[c] > totais[m] ? c : m), CATEGORIAS_RETRO[0]);
    maisPesou = { chave: topo, rotulo: ROTULO_RETRO[topo], valor: totais[topo], percentual: Math.round((totais[topo] / total) * 100) };
  }

  let maiorQueda: CategoriaDestaque | null = null;
  if (anterior) {
    for (const c of CATEGORIAS_RETRO) {
      const antes = positivo(anterior[c]);
      if (antes <= 0) continue;
      const queda = Math.round(((antes - totais[c]) / antes) * 100);
      if (queda >= QUEDA_MINIMA_DESTAQUE && (!maiorQueda || queda > maiorQueda.percentual)) {
        maiorQueda = { chave: c, rotulo: ROTULO_RETRO[c], valor: totais[c], percentual: queda };
      }
    }
  }

  // Frase de destaque: a mais animadora que for verdadeira.
  const anteriores = e.historico.filter((h) => h.mes < e.mes && h.total > 0);
  const maisEconomico = total > 0 && anteriores.length >= 2 && anteriores.every((h) => total < h.total);
  let destaque: Retrospectiva['destaque'];
  if (maisEconomico) {
    destaque = { tom: 'positivo', texto: `Seu mês mais econômico dos últimos ${anteriores.length + 1} meses!` };
  } else if (variacaoPercentual !== null && variacaoPercentual <= -VARIACAO_RELEVANTE) {
    destaque = { tom: 'positivo', texto: `Você gastou ${Math.abs(variacaoPercentual)}% menos que no mês passado.` };
  } else if (e.scoreMes >= SCORE_EXCELENTE) {
    destaque = { tom: 'positivo', texto: 'Score excelente! Hábitos sustentáveis em dia.' };
  } else if (maiorQueda) {
    destaque = { tom: 'positivo', texto: `${maiorQueda.rotulo} caiu ${maiorQueda.percentual}% em relação ao mês passado.` };
  } else if (variacaoPercentual !== null && variacaoPercentual >= VARIACAO_RELEVANTE) {
    destaque = { tom: 'neutro', texto: `Os gastos subiram ${variacaoPercentual}%. O próximo mês é a chance de virar o jogo.` };
  } else {
    destaque = { tom: 'neutro', texto: 'Mais um mês acompanhando o seu consumo. Continue assim!' };
  }

  return {
    temDados: e.registros > 0 && total > 0,
    mesLabel: e.mesLabel,
    nomeCurto: primeiroNome(e.nome),
    total,
    variacaoPercentual,
    scoreMes: Math.round(e.scoreMes),
    deltaScore,
    nivel: e.nivel,
    kgCO2: positivo(e.kgCO2),
    maisPesou,
    maiorQueda,
    destaque,
  };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Texto para acompanhar a imagem (ou ir sozinho no WhatsApp). */
export function textoCompartilhamento(r: Retrospectiva, mostrarValores: boolean): string {
  const linhas = [`🌱 *Minha retrospectiva no Sustenta — ${r.mesLabel}*`, ''];

  const variacao =
    r.variacaoPercentual === null
      ? ''
      : r.variacaoPercentual === 0
        ? ' (igual ao mês anterior)'
        : ` (${r.variacaoPercentual > 0 ? '+' : '−'}${Math.abs(r.variacaoPercentual)}% em relação ao mês anterior)`;
  if (mostrarValores) linhas.push(`💰 Gastei ${brl(r.total)}${variacao}`);
  else if (variacao) linhas.push(`💰 Meus gastos${variacao}`);

  if (r.kgCO2 > 0) linhas.push(`🌍 Pegada estimada: ${r.kgCO2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg de CO₂`);
  linhas.push(`⭐ Score: ${r.scoreMes}/100 · ${r.nivel}`);
  linhas.push('', r.destaque.texto, '', 'Acompanhe o seu consumo no Sustenta 🍃');
  return linhas.join('\n');
}
