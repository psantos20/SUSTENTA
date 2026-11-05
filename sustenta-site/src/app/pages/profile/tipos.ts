import { type GrupoFamilia, type MembroFamilia } from '../../../services/familia';


export interface UsuarioData {
  nome: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  criadoEm: string;
  grupoFamiliaId?: string | null;
  xpHabitos?: number;
  dadosCompartilhados?: {
    gastos: boolean;
    nivel: boolean;
    conquistas: boolean;
  };
}


export interface EstatisticasData {
  totalRegistros: number;
  totalGasto: number;
  energiaTotal: number;
  aguaTotal: number;
  mesesAtivos: number;
}


export interface DadosMembroCompartilhados {
  totalGasto?: number;
  energiaTotal?: number;
  aguaTotal?: number;
  nivel?: number;
  nomeNivel?: string;
  xpTotal?: number;
  conquistas?: number;
  podeVerGastos: boolean;
  podeVerNivel: boolean;
  podeVerConquistas: boolean;
}


export type MembroFamiliaDetalhado = MembroFamilia & {
  dados?: DadosMembroCompartilhados;
};


export type GrupoFamiliaDetalhado = Omit<GrupoFamilia, 'membros'> & {
  membros: MembroFamiliaDetalhado[];
};
