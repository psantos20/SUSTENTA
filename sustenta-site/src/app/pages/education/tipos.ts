
export interface Registro {
  categoria: 'energia' | 'agua' | 'outro';
  valor: number;
  /** kWh (energia) ou m³ (água), quando o usuário informou. */
  quantidade?: number | null;
  mes: string;
}


export interface UserProgress {
  artigosLidos: string[];
  quizzesCompletos: { catId: string; acertos: number; total: number; data: any }[];
  desafiosAceitos: string[];
  xpEducacao: number;
}


export interface RankingEntry {
  uid: string;
  nome: string;
  xp: number;
  posicao?: number;
}


export interface Noticia {
  id: string;
  titulo: string;
  descricao: string;
  fonte: string;
  autor: string | null;
  urlOriginal: string;
  urlImagem: string | null;
  publicadoEm: string;
  categoria: string;
  cachadoEm: number;
}
