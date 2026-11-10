import type { Registro } from '../../../services/consumo';
import { CATEGORIAS_PROJECAO, TIPO_CATEGORIA, diasDoMes, projetarCategoria, projetarMes } from '../../../services/projecao';
import type { CategoriaProjecao } from '../../../services/projecao';
import { calcularCarbono, classificarNivel } from '../../pages/education/carbono';

const somaPorCategoria = (registros: Registro[]): Record<CategoriaProjecao, number> => ({
  energia: registros.filter((r) => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0),
  agua: registros.filter((r) => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0),
  transporte: registros.filter((r) => r.categoria === 'transporte').reduce((s, r) => s + r.valor, 0),
  outro: registros.filter((r) => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0),
});

/** Números da projeção do mês (também usados pelo resumo do Painel). */
export function calcularDadosProjecao(mes: string, dia: number, registrosMes: Registro[], todosRegistros: Registro[]) {
  const diasNoMes = diasDoMes(mes);

  // Histórico: só meses anteriores ao exibido, do mais antigo ao mais recente.
  const porMes = new Map<string, Registro[]>();
  for (const r of todosRegistros) {
    if (r.mes < mes) porMes.set(r.mes, [...(porMes.get(r.mes) ?? []), r]);
  }
  const mesesAnteriores = [...porMes.keys()].sort();

  const gastoPorMes = mesesAnteriores.map((m) => somaPorCategoria(porMes.get(m)!));
  const carbonoPorMes = mesesAnteriores.map((m) => calcularCarbono(porMes.get(m)!));

  const historicoGasto = {} as Record<CategoriaProjecao, number[]>;
  const historicoKg = {} as Record<CategoriaProjecao, number[]>;
  for (const cat of CATEGORIAS_PROJECAO) {
    historicoGasto[cat] = gastoPorMes.map((g) => g[cat]);
    historicoKg[cat] = carbonoPorMes.map((c) => c[`${cat}Kg` as 'energiaKg' | 'aguaKg' | 'transporteKg' | 'outroKg']);
  }

  const gastoAtual = somaPorCategoria(registrosMes);
  const projecao = projetarMes(gastoAtual, historicoGasto, dia, diasNoMes);

  // CO₂ com a mesma regra de cada categoria.
  const carbonoAtual = calcularCarbono(registrosMes);
  const kgAtual: Record<CategoriaProjecao, number> = {
    energia: carbonoAtual.energiaKg,
    agua: carbonoAtual.aguaKg,
    transporte: carbonoAtual.transporteKg,
    outro: carbonoAtual.outroKg,
  };
  const kgProjetado = CATEGORIAS_PROJECAO.reduce(
    (s, cat) => s + projetarCategoria(TIPO_CATEGORIA[cat], kgAtual[cat], historicoKg[cat], dia, diasNoMes).valor,
    0
  );

  const mesAnterior = mesesAnteriores[mesesAnteriores.length - 1] ?? null;
  const totalMesAnterior = gastoPorMes.length > 0
    ? CATEGORIAS_PROJECAO.reduce((s, cat) => s + gastoPorMes[gastoPorMes.length - 1][cat], 0)
    : 0;
  const nivelCarbono = classificarNivel(kgProjetado, carbonoPorMes.map((c) => c.totalKg));

  return { diasNoMes, projecao, gastoAtual, kgProjetado, mesAnterior, totalMesAnterior, nivelCarbono, temHistorico: mesesAnteriores.length > 0, naoCalculados: carbonoAtual.registrosNaoCalculados };
}

