/**
 * Projeção do mês: "no ritmo atual, quanto você fecha o mês gastando e emitindo?".
 *
 * Os registros guardam só o mês (não o dia), então não dá para medir um ritmo
 * diário de verdade. Por isso cada categoria usa a regra que combina com a sua natureza:
 *
 *  - Contas do mês (energia, água): chegam em um valor só. A projeção é o maior
 *    entre o que já foi registrado e o seu valor habitual (se a conta deste mês
 *    ainda não entrou, esperamos o valor de sempre).
 *  - Gastos do dia a dia (transporte, outros): vão acontecendo ao longo do mês.
 *    Projeção = o que já gastou + a parte do seu mês habitual que ainda falta.
 *    Sem histórico, usa o ritmo (gasto ÷ fração do mês), mas só a partir do dia 7,
 *    para não multiplicar um registro isolado do começo do mês.
 *
 * Função pura, sem Firebase, para poder ser testada.
 */

export const CATEGORIAS_PROJECAO = ['energia', 'agua', 'transporte', 'outro'] as const;
export type CategoriaProjecao = (typeof CATEGORIAS_PROJECAO)[number];

export type TipoCategoria = 'conta' | 'rotina';

export const TIPO_CATEGORIA: Record<CategoriaProjecao, TipoCategoria> = {
  energia: 'conta',
  agua: 'conta',
  transporte: 'rotina',
  outro: 'rotina',
};

/** Primeiro dia do mês em que o ritmo (sem histórico) já é confiável. */
export const DIA_MINIMO_RITMO = 7;

/** Quantos meses anteriores entram na média habitual. */
export const MESES_NA_MEDIA = 3;

/** Como o valor foi estimado. */
export type BaseProjecao = 'atual' | 'historico' | 'ritmo' | 'insuficiente';

export interface ProjecaoCategoria {
  valor: number;
  base: BaseProjecao;
}

/** Dias do mês "AAAA-MM" (28 a 31). Mês inválido: 30. */
export function diasDoMes(mes: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m) return 30;
  const ano = Number(m[1]);
  const numero = Number(m[2]);
  if (numero < 1 || numero > 12) return 30;
  return new Date(ano, numero, 0).getDate();
}

/** Valor habitual: média ponderada dos últimos meses com valor (os mais recentes pesam mais, como na Análise). */
export function valorHabitual(historico: number[]): number {
  const validos = historico.filter((v) => Number.isFinite(v) && v > 0).slice(-MESES_NA_MEDIA);
  if (validos.length === 0) return 0;
  const pesos = validos.map((_, i) => i + 1);
  const soma = validos.reduce((s, v, i) => s + v * pesos[i], 0);
  return soma / pesos.reduce((s, p) => s + p, 0);
}

const arredondar = (v: number) => Math.round(v * 100) / 100;

/**
 * Projeta uma categoria até o fim do mês.
 * @param atual gasto (ou kg de CO₂) já registrado no mês
 * @param historico valores dos meses anteriores, do mais antigo ao mais recente
 * @param dia dia de hoje no mês (1 a diasNoMes)
 */
export function projetarCategoria(
  tipo: TipoCategoria,
  atual: number,
  historico: number[],
  dia: number,
  diasNoMes: number
): ProjecaoCategoria {
  const g = Number.isFinite(atual) && atual > 0 ? atual : 0;
  const habitual = valorHabitual(historico);
  const total = diasNoMes > 0 ? diasNoMes : 30;
  const d = Math.min(Math.max(Math.round(dia) || 1, 1), total);
  const fracao = d / total;

  if (tipo === 'conta') {
    if (habitual > 0 && habitual > g) return { valor: arredondar(habitual), base: 'historico' };
    return { valor: arredondar(g), base: 'atual' };
  }

  // Rotina
  if (habitual > 0) {
    return { valor: arredondar(g + habitual * (1 - fracao)), base: 'historico' };
  }
  if (g === 0) return { valor: 0, base: 'atual' };
  if (d >= DIA_MINIMO_RITMO) return { valor: arredondar(g / fracao), base: 'ritmo' };
  return { valor: arredondar(g), base: 'insuficiente' };
}

export interface ProjecaoMes {
  porCategoria: Record<CategoriaProjecao, ProjecaoCategoria>;
  total: number;
  /** false quando alguma categoria ainda não tem base para projetar (começo do mês, sem histórico). */
  confiavel: boolean;
}

export function projetarMes(
  atual: Record<CategoriaProjecao, number>,
  historico: Record<CategoriaProjecao, number[]>,
  dia: number,
  diasNoMes: number
): ProjecaoMes {
  const porCategoria = {} as Record<CategoriaProjecao, ProjecaoCategoria>;
  let total = 0;
  let confiavel = true;
  for (const cat of CATEGORIAS_PROJECAO) {
    const p = projetarCategoria(TIPO_CATEGORIA[cat], atual[cat], historico[cat] ?? [], dia, diasNoMes);
    porCategoria[cat] = p;
    total += p.valor;
    if (p.base === 'insuficiente') confiavel = false;
  }
  return { porCategoria, total: arredondar(total), confiavel };
}
