/**
 * Liga da semana: ranking global do XP ganho em Hábitos, que zera toda segunda-feira.
 *
 * Entra quem quiser (opt-in). O ranking público guarda só um nome abreviado
 * ("Pedro S.") e o XP da semana. O XP da semana é o XP atual menos o XP que o
 * usuário tinha na segunda-feira (a "base").
 *
 * Função pura, sem Firebase, para poder ser testada.
 */

/** Estado guardado em cada usuário (habitos_usuarios.liga). */
export interface EstadoLiga {
  participa: boolean;
  /** Segunda-feira (AAAA-MM-DD) da semana em que `base` foi anotada. */
  semana: string;
  /** XP de hábitos que o usuário tinha no início da semana. */
  base: number;
}

/** Documento público em ranking_semanal/{uid}. */
export interface EntradaLiga {
  uid: string;
  nome: string;
  semana: string;
  xp: number;
}

export interface PosicaoLiga extends EntradaLiga {
  posicao: number;
}

export const TAMANHO_LIGA = 10;

/** "Pedro Santos de Almeida" vira "Pedro S."; só o primeiro nome fica como está. */
export function nomeAbreviado(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Anônimo';
  const primeiro = partes[0].slice(0, 20);
  if (partes.length === 1) return primeiro;
  const ultimo = partes[partes.length - 1];
  return `${primeiro} ${ultimo.charAt(0).toUpperCase()}.`;
}

/** XP ganho na semana: nunca negativo (desmarcar um hábito não pode "dever" pontos). */
export function xpDaSemana(xpAtual: number, base: number): number {
  const xp = Number.isFinite(xpAtual) ? xpAtual : 0;
  const b = Number.isFinite(base) ? base : 0;
  return Math.max(0, Math.round(xp - b));
}

/** Em uma semana nova, a base precisa ser anotada de novo com o XP atual. */
export function renovarLiga(liga: EstadoLiga | undefined, semanaAtual: string, xpAtual: number): EstadoLiga | undefined {
  if (!liga || !liga.participa) return liga;
  if (liga.semana === semanaAtual) return liga;
  return { participa: true, semana: semanaAtual, base: Math.max(0, Math.round(xpAtual)) };
}

/** Começa a participar: a contagem da semana parte do zero. */
export function entrarNaLiga(semanaAtual: string, xpAtual: number): EstadoLiga {
  return { participa: true, semana: semanaAtual, base: Math.max(0, Math.round(xpAtual)) };
}

/**
 * Monta o ranking da semana: ignora outras semanas e entradas inválidas, uma
 * por pessoa, do maior para o menor XP. Empates dividem a posição (1, 1, 3...).
 */
export function montarLiga(entradas: EntradaLiga[], semanaAtual: string, limite = TAMANHO_LIGA): PosicaoLiga[] {
  const porUid = new Map<string, EntradaLiga>();
  for (const e of entradas) {
    if (!e || typeof e.uid !== 'string' || e.semana !== semanaAtual) continue;
    if (typeof e.xp !== 'number' || !Number.isFinite(e.xp) || e.xp < 0) continue;
    const atual = porUid.get(e.uid);
    if (!atual || e.xp > atual.xp) porUid.set(e.uid, e);
  }

  const ordenadas = [...porUid.values()].sort((a, b) => b.xp - a.xp || a.nome.localeCompare(b.nome, 'pt-BR'));

  let posicao = 0;
  const comPosicao = ordenadas.map((e, i) => {
    if (i === 0 || e.xp < ordenadas[i - 1].xp) posicao = i + 1;
    return { ...e, posicao };
  });

  return comPosicao.slice(0, limite);
}

/** Posição de uma pessoa entre todas as entradas da semana (null se não participa). */
export function posicaoDe(entradas: EntradaLiga[], uid: string, semanaAtual: string): number | null {
  return montarLiga(entradas, semanaAtual, Number.MAX_SAFE_INTEGER).find((e) => e.uid === uid)?.posicao ?? null;
}
