/**
 * Missões da semana em família: metas coletivas calculadas com os hábitos que
 * os membros do grupo marcaram de segunda a domingo. Só lê o que as regras do
 * Firestore já deixam a família ler (a coleção de hábitos), sem expor gastos.
 *
 * Função pura, sem Firebase, para poder ser testada.
 */
import { HABITOS_PREDEFINIDOS } from './dados';
import { ofensivaAtual, somarDias } from './ofensiva';
import type { Categoria } from './tipos';

export interface MembroHabitosResumo {
  uid: string;
  nome: string;
  streak: number;
  ultimoRegistro: string;
  progressoHabitos: { habitoId: string; data: string }[];
  habitosPersonalizados: { id: string; categoria: Categoria }[];
}

export interface ContribuicaoMembro {
  uid: string;
  nome: string;
  valor: number;
}

export interface MissaoFamilia {
  id: string;
  titulo: string;
  descricao: string;
  /** XP que cada membro pode resgatar ao cumprir. */
  xp: number;
  atual: number;
  meta: number;
  concluida: boolean;
  /** Rótulo do que está sendo contado (marcações, pessoas, dias). */
  unidade: string;
  /** Quanto cada membro contribuiu (só nas missões somadas). */
  porMembro?: ContribuicaoMembro[];
}

export interface SemanaFamilia {
  /** Segunda-feira da semana (AAAA-MM-DD): também identifica a semana. */
  semana: string;
  /** Domingo (último dia). */
  fim: string;
  diasRestantes: number;
  missoes: MissaoFamilia[];
}

/** Mínimo de pessoas para missões em família fazerem sentido. */
export const MIN_MEMBROS_MISSAO = 2;

export const MARCACOES_POR_MEMBRO = 10;
export const MARCACOES_CATEGORIA_POR_MEMBRO = 4;
export const DIAS_ATIVOS_POR_MEMBRO = 3;
export const SEQUENCIA_MINIMA = 3;

const CATEGORIAS_DA_SEMANA: Categoria[] = ['Água', 'Energia', 'Resíduos', 'Alimentação', 'Transporte'];

/** Segunda-feira da semana de `data` (semana de segunda a domingo). */
export function inicioDaSemana(data: string): string {
  const [a, m, d] = data.split('-').map(Number);
  const diaSemana = new Date(a, m - 1, d, 12).getDay(); // 0 = domingo
  return somarDias(data, -((diaSemana + 6) % 7));
}

export function diasDaSemana(inicio: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/** Categoria em foco: troca a cada semana, igual para todas as famílias. */
export function categoriaDaSemana(inicio: string): Categoria {
  const [a, m, d] = inicio.split('-').map(Number);
  const dias = Math.round(Date.UTC(a, m - 1, d) / 86_400_000);
  return CATEGORIAS_DA_SEMANA[Math.floor(dias / 7) % CATEGORIAS_DA_SEMANA.length];
}

function categoriaDoHabito(habitoId: string, membro: MembroHabitosResumo): Categoria | null {
  const predefinido = HABITOS_PREDEFINIDOS.find((h) => h.id === habitoId);
  if (predefinido) return predefinido.categoria;
  return membro.habitosPersonalizados.find((h) => h.id === habitoId)?.categoria ?? null;
}

export function calcularMissoes(membros: MembroHabitosResumo[], hoje: string): SemanaFamilia {
  const semana = inicioDaSemana(hoje);
  const dias = diasDaSemana(semana);
  const fim = dias[6];
  const diasRestantes = dias.filter((d) => d >= hoje).length;
  const n = membros.length;
  const noPeriodo = (data: string) => dias.includes(data);

  // marcações (hábito x dia) de cada membro nesta semana, sem contar duplicadas
  const marcacoes = membros.map((m) => {
    const vistas = new Set<string>();
    const lista = m.progressoHabitos.filter((p) => noPeriodo(p.data) && !vistas.has(`${p.habitoId}|${p.data}`) && vistas.add(`${p.habitoId}|${p.data}`));
    return { membro: m, lista };
  });

  const contribuicao = (valor: (m: typeof marcacoes[number]) => number): ContribuicaoMembro[] =>
    marcacoes.map((m) => ({ uid: m.membro.uid, nome: m.membro.nome, valor: valor(m) }));

  const soma = (c: ContribuicaoMembro[]) => c.reduce((s, x) => s + x.valor, 0);

  const categoria = categoriaDaSemana(semana);
  const porMembroTotal = contribuicao((m) => m.lista.length);
  const porMembroCategoria = contribuicao((m) => m.lista.filter((p) => categoriaDoHabito(p.habitoId, m.membro) === categoria).length);

  const diasAtivos = (m: typeof marcacoes[number]) => new Set(m.lista.map((p) => p.data)).size;
  const todosParticipam = marcacoes.filter((m) => diasAtivos(m) >= DIAS_ATIVOS_POR_MEMBRO).length;

  const diasPerfeitos =
    n === 0 ? 0 : dias.filter((dia) => marcacoes.every((m) => m.lista.some((p) => p.data === dia))).length;

  const comSequencia = membros.filter((m) => ofensivaAtual(m.streak, m.ultimoRegistro, hoje) >= SEQUENCIA_MINIMA).length;

  const fecha = (m: Omit<MissaoFamilia, 'concluida'>): MissaoFamilia => ({ ...m, concluida: m.meta > 0 && m.atual >= m.meta });

  const missoes: MissaoFamilia[] = [
    fecha({
      id: 'mf-movimento',
      titulo: 'Semana em movimento',
      descricao: `Somem ${MARCACOES_POR_MEMBRO * n} hábitos marcados na semana (${MARCACOES_POR_MEMBRO} por pessoa).`,
      xp: 40,
      atual: Math.min(soma(porMembroTotal), MARCACOES_POR_MEMBRO * n),
      meta: MARCACOES_POR_MEMBRO * n,
      unidade: 'hábitos',
      porMembro: porMembroTotal,
    }),
    fecha({
      id: 'mf-todos',
      titulo: 'Todo mundo participa',
      descricao: `Cada pessoa da família marca hábitos em pelo menos ${DIAS_ATIVOS_POR_MEMBRO} dias diferentes.`,
      xp: 60,
      atual: todosParticipam,
      meta: n,
      unidade: 'pessoas',
    }),
    fecha({
      id: 'mf-dia-perfeito',
      titulo: 'Dia perfeito',
      descricao: 'Um dia em que todos da família marcaram pelo menos um hábito.',
      xp: 60,
      atual: Math.min(diasPerfeitos, 1),
      meta: 1,
      unidade: 'dia',
    }),
    fecha({
      id: 'mf-sequencia',
      titulo: 'Sequência coletiva',
      descricao: `Todos com uma sequência de pelo menos ${SEQUENCIA_MINIMA} dias seguidos.`,
      xp: 50,
      atual: comSequencia,
      meta: n,
      unidade: 'pessoas',
    }),
    fecha({
      id: 'mf-categoria',
      titulo: `Foco da semana: ${categoria}`,
      descricao: `Somem ${MARCACOES_CATEGORIA_POR_MEMBRO * n} hábitos da categoria ${categoria} (${MARCACOES_CATEGORIA_POR_MEMBRO} por pessoa).`,
      xp: 40,
      atual: Math.min(soma(porMembroCategoria), MARCACOES_CATEGORIA_POR_MEMBRO * n),
      meta: MARCACOES_CATEGORIA_POR_MEMBRO * n,
      unidade: 'hábitos',
      porMembro: porMembroCategoria,
    }),
  ];

  return { semana, fim, diasRestantes, missoes };
}

// ── Resgate do XP ────────────────────────────────────────────────────────────

/** Guardado em cada usuário: quais missões da semana atual ele já resgatou. */
export interface MissoesResgatadas {
  semana: string;
  resgatadas: string[];
}

export function resgatadasDaSemana(registro: MissoesResgatadas | undefined, semana: string): string[] {
  return registro && registro.semana === semana && Array.isArray(registro.resgatadas) ? registro.resgatadas : [];
}

/** Só dá para resgatar uma missão cumprida e ainda não resgatada nesta semana. */
export function podeResgatar(missao: MissaoFamilia, resgatadas: string[]): boolean {
  return missao.concluida && !resgatadas.includes(missao.id);
}
