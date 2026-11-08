/**
 * Medalhas: conquistas calculadas a partir dos dados que o usuário já tem
 * (registros, hábitos e desafios). Nada é gravado: se o dado existe, a medalha
 * existe; se o usuário apagar registros, a medalha acompanha o que sobrou.
 *
 * Função pura, sem Firebase, para poder ser testada.
 */
import { calcularCarbono, classificarNivel } from '../education/carbono';
import type { Registro } from '../education/tipos';

export type GrupoMedalha = 'Consumo' | 'Carbono' | 'Hábitos' | 'Família';
export type TomMedalha = 'bronze' | 'prata' | 'ouro';

export interface Medalha {
  id: string;
  nome: string;
  descricao: string;
  grupo: GrupoMedalha;
  tom: TomMedalha;
  /** Quanto o usuário já tem (limitado à meta) e quanto precisa. */
  atual: number;
  meta: number;
  conquistada: boolean;
}

export interface EntradaMedalhas {
  registros: Registro[];
  /** Maior sequência de dias já alcançada em Hábitos. */
  maiorStreak: number;
  desafiosConcluidos: number;
  xpHabitos: number;
  temGrupoFamilia: boolean;
}

/** Quantos meses (completos) ficaram mais de 10% abaixo da média dos outros meses do próprio usuário. */
export function mesesAbaixoDaMedia(registros: Registro[], mesAtual: string): number {
  const porMes = new Map<string, Registro[]>();
  for (const r of registros) {
    if (!r.mes || r.mes === mesAtual) continue; // o mês em andamento ainda está incompleto
    porMes.set(r.mes, [...(porMes.get(r.mes) ?? []), r]);
  }

  const kgPorMes = [...porMes.entries()].map(([mes, regs]) => ({ mes, kg: calcularCarbono(regs).totalKg }));

  return kgPorMes.filter(({ mes, kg }) => {
    if (kg <= 0) return false;
    const outros = kgPorMes.filter((m) => m.mes !== mes).map((m) => m.kg);
    return classificarNivel(kg, outros)?.chave === 'abaixo';
  }).length;
}

type Definicao = Omit<Medalha, 'atual' | 'conquistada'> & { valor: number };

export function calcularMedalhas(e: EntradaMedalhas, mesAtual: string): Medalha[] {
  const totalRegistros = e.registros.length;
  const mesesAtivos = new Set(e.registros.map((r) => r.mes).filter(Boolean)).size;
  const categoriasUsadas = new Set(
    e.registros.map((r) => r.categoria).filter((c) => c === 'energia' || c === 'agua' || c === 'transporte')
  ).size;
  const comQuantidade = e.registros.filter((r) => typeof r.quantidade === 'number' && r.quantidade > 0).length;
  const mesesVerdes = mesesAbaixoDaMedia(e.registros, mesAtual);

  const defs: Definicao[] = [
    { id: 'primeiro-registro', grupo: 'Consumo', tom: 'bronze', nome: 'Primeiro passo', descricao: 'Faça o seu primeiro registro de consumo.', meta: 1, valor: totalRegistros },
    { id: 'dez-registros', grupo: 'Consumo', tom: 'prata', nome: 'Em ritmo', descricao: 'Chegue a 10 registros.', meta: 10, valor: totalRegistros },
    { id: 'cinquenta-registros', grupo: 'Consumo', tom: 'ouro', nome: 'Rotina de acompanhar', descricao: 'Chegue a 50 registros.', meta: 50, valor: totalRegistros },
    { id: 'tres-meses', grupo: 'Consumo', tom: 'bronze', nome: 'Trimestre', descricao: 'Tenha registros em 3 meses diferentes.', meta: 3, valor: mesesAtivos },
    { id: 'seis-meses', grupo: 'Consumo', tom: 'prata', nome: 'Semestre', descricao: 'Tenha registros em 6 meses diferentes.', meta: 6, valor: mesesAtivos },
    { id: 'um-ano', grupo: 'Consumo', tom: 'ouro', nome: 'Um ano de cuidado', descricao: 'Tenha registros em 12 meses diferentes.', meta: 12, valor: mesesAtivos },
    { id: 'visao-completa', grupo: 'Consumo', tom: 'prata', nome: 'Visão completa', descricao: 'Registre energia, água e transporte.', meta: 3, valor: categoriasUsadas },
    { id: 'de-olho-no-medidor', grupo: 'Consumo', tom: 'prata', nome: 'De olho no medidor', descricao: 'Informe a quantidade (kWh, m³ ou litros) em 5 registros.', meta: 5, valor: comQuantidade },

    { id: 'mes-verde', grupo: 'Carbono', tom: 'bronze', nome: 'Mês verde', descricao: 'Feche um mês com a pegada de carbono mais de 10% abaixo da sua média.', meta: 1, valor: mesesVerdes },
    { id: 'tres-meses-verdes', grupo: 'Carbono', tom: 'prata', nome: 'Constância verde', descricao: 'Tenha 3 meses abaixo da sua média de carbono.', meta: 3, valor: mesesVerdes },
    { id: 'seis-meses-verdes', grupo: 'Carbono', tom: 'ouro', nome: 'Pegada leve', descricao: 'Tenha 6 meses abaixo da sua média de carbono.', meta: 6, valor: mesesVerdes },

    { id: 'sequencia-3', grupo: 'Hábitos', tom: 'bronze', nome: 'Pegando o jeito', descricao: 'Marque hábitos por 3 dias seguidos.', meta: 3, valor: e.maiorStreak },
    { id: 'sequencia-7', grupo: 'Hábitos', tom: 'prata', nome: 'Semana firme', descricao: 'Marque hábitos por 7 dias seguidos.', meta: 7, valor: e.maiorStreak },
    { id: 'sequencia-30', grupo: 'Hábitos', tom: 'ouro', nome: 'Mês inteiro', descricao: 'Marque hábitos por 30 dias seguidos.', meta: 30, valor: e.maiorStreak },
    { id: 'desafiante', grupo: 'Hábitos', tom: 'bronze', nome: 'Desafiante', descricao: 'Conclua um desafio mensal.', meta: 1, valor: e.desafiosConcluidos },
    { id: 'cinco-desafios', grupo: 'Hábitos', tom: 'prata', nome: 'Cumpridor de desafios', descricao: 'Conclua 5 desafios mensais.', meta: 5, valor: e.desafiosConcluidos },
    { id: 'xp-500', grupo: 'Hábitos', tom: 'prata', nome: '500 XP de hábitos', descricao: 'Some 500 XP em hábitos, desafios e dicas.', meta: 500, valor: e.xpHabitos },
    { id: 'xp-2000', grupo: 'Hábitos', tom: 'ouro', nome: '2000 XP de hábitos', descricao: 'Some 2000 XP em hábitos, desafios e dicas.', meta: 2000, valor: e.xpHabitos },

    { id: 'em-familia', grupo: 'Família', tom: 'bronze', nome: 'Em família', descricao: 'Participe de um grupo familiar.', meta: 1, valor: e.temGrupoFamilia ? 1 : 0 },
  ];

  return defs.map(({ valor, ...d }) => {
    const atual = Math.max(0, Math.min(Number.isFinite(valor) ? valor : 0, d.meta));
    return { ...d, atual, conquistada: atual >= d.meta };
  });
}

export const GRUPOS_MEDALHA: GrupoMedalha[] = ['Consumo', 'Carbono', 'Hábitos', 'Família'];
