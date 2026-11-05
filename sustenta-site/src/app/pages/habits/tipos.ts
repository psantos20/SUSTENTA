
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


export interface DadosUsuarioHabitos {
  uid: string;
  streak: number;
  ultimoRegistro: string;
  diasAtivos: string[];
  habitosPersonalizados: Habito[];
  progressoHabitos: ProgressoHabito[];
  progressoDesafios: ProgressoDesafio[];
  xpHabitos: number;
}
