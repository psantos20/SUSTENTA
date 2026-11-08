
export type Categoria = 'Água' | 'Energia' | 'Resíduos' | 'Alimentação' | 'Transporte' | 'Geral';


export interface Habito {
  id: string;
  titulo: string;
  categoria: Categoria;
  pontos: number;
  personalizado: boolean;
}


export interface ProgressoHabito {
  habitoId: string;
  data: string;
  xpGanho: number;
}


export interface Desafio {
  id: string;
  titulo: string;
  descricao: string;
  recompensa: number;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  duracaoDias: number;
  categoria: Categoria;
  meta: string;
}


export interface ProgressoDesafio {
  desafioId: string;
  progresso: number;
  iniciado: string;
  concluido: boolean;
  xpGanho: number;
}


import type { DicasDoDia } from './dicas';
import type { MissoesResgatadas } from './missoesFamilia';


export interface DadosUsuarioHabitos {
  uid: string;
  streak: number;
  /** Maior sequência já alcançada (opcional: contas antigas não têm). */
  maiorStreak?: number;
  ultimoRegistro: string;
  diasAtivos: string[];
  habitosPersonalizados: Habito[];
  progressoHabitos: ProgressoHabito[];
  progressoDesafios: ProgressoDesafio[];
  xpHabitos: number;
  /** Respostas às dicas do dia (opcional: contas antigas não têm). */
  dicasDoDia?: DicasDoDia;
  /** Missões da família já resgatadas nesta semana (opcional). */
  missoesFamilia?: MissoesResgatadas;
}
