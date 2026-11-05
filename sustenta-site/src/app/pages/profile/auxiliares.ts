export const NOME_POR_SIGLA: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana',
  PE: 'Pernambuco', PI: 'Piaui', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia',
  RR: 'Roraima', SC: 'Santa Catarina', SP: 'Sao Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};


export const NIVEIS_CORES = [
  'from-slate-400 to-slate-500',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-amber-400 to-amber-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
];


export const formatarMesAno = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};


export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'US';


export const moeda = (valor?: number) => `R$ ${(valor || 0).toFixed(0)}`;
