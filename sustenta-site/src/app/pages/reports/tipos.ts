
export interface Registro {
  id: string;
  uid: string;
  categoria: 'energia' | 'agua' | 'outro';
  subcategoria?: string;
  valor: number;
  mes: string;
  descricao: string;
  criadoEm: any;
}


export interface Usuario {
  nome: string;
  email: string;
  estado: string;
  cidade: string;
}


export interface ReportData {
  mes: string;
  mesLabel: string;
  usuario: Usuario | null;
  registros: Registro[];
  totalGeral: number;
  totalEnergia: number;
  totalAgua: number;
  totalOutro: number;
  scoreAnterior: number;
  scoreMes: number;
  xpTotal: number;
  nivel: string;
  maioresGastos: Registro[];
  alertas: string[];
  dicas: string[];
  historico: HistoricoMes[];
}


export interface HistoricoMes {
  mes: string;
  label: string;
  total: number;
  energia: number;
  agua: number;
  outro: number;
  score: number;
}
