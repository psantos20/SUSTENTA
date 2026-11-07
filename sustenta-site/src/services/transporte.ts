/**
 * Categoria "Transporte": tipos (subcategoria) e unidade da quantidade.
 * Combustíveis aceitam a quantidade em litros (GNV em m³) para o cálculo de
 * carbono com fator oficial; os demais tipos registram só o valor em R$.
 */

export const COMBUSTIVEIS = ['Gasolina', 'Etanol', 'Diesel', 'GNV'] as const;
export type Combustivel = (typeof COMBUSTIVEIS)[number];

export const TIPOS_TRANSPORTE = [
  ...COMBUSTIVEIS,
  'Ônibus',
  'Metrô/Trem',
  'App/Táxi',
  'Passagem aérea',
  'Outro',
] as const;

export function ehCombustivel(subcategoria: string | null | undefined): subcategoria is Combustivel {
  return (COMBUSTIVEIS as readonly string[]).includes(subcategoria ?? '');
}

/**
 * Unidade da quantidade opcional de um registro, ou null se a categoria/tipo
 * não tem quantidade (outros gastos, ônibus, app etc.).
 */
export function unidadeDeQuantidade(
  categoria: string,
  subcategoria?: string | null
): 'kWh' | 'm³' | 'L' | null {
  if (categoria === 'energia') return 'kWh';
  if (categoria === 'agua') return 'm³';
  if (categoria === 'transporte' && ehCombustivel(subcategoria)) {
    return subcategoria === 'GNV' ? 'm³' : 'L';
  }
  return null;
}
