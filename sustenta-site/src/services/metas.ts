import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { LIMITES, validarValor } from './validacao';

/**
 * Metas mensais de gasto por categoria. Ficam no perfil do usuário
 * (usuarios/{uid}.metas) e valem para todos os meses. Sem meta = sem limite.
 */

export const CATEGORIAS_META = ['energia', 'agua', 'outro'] as const;
export type CategoriaMeta = (typeof CATEGORIAS_META)[number];
export type Metas = Partial<Record<CategoriaMeta, number>>;

export type StatusMeta = 'ok' | 'atencao' | 'estourou';

export interface ProgressoMeta {
  /** Percentual consumido da meta, arredondado (pode passar de 100). */
  percentual: number;
  status: StatusMeta;
  /** Quanto falta (positivo) ou quanto passou (negativo) da meta, em R$. */
  restante: number;
}

/** Abaixo de 80% está ok; de 80% a 100% pede atenção; acima de 100% estourou. */
export const LIMITE_ATENCAO = 0.8;

export function calcularProgresso(gasto: number, meta: number): ProgressoMeta {
  const gastoSeguro = Number.isFinite(gasto) && gasto > 0 ? gasto : 0;
  if (!Number.isFinite(meta) || meta <= 0) {
    return { percentual: 0, status: 'ok', restante: 0 };
  }
  const razao = gastoSeguro / meta;
  const status: StatusMeta = razao > 1 ? 'estourou' : razao >= LIMITE_ATENCAO ? 'atencao' : 'ok';
  return {
    percentual: Math.round(razao * 100),
    status,
    restante: Math.round((meta - gastoSeguro) * 100) / 100,
  };
}

/** Mensagem de erro ou null. Campo vazio é válido (remove a meta). */
export function validarMeta(texto: string): string | null {
  if (texto.trim() === '') return null;
  const numero = parseFloat(texto.replace(',', '.'));
  const erro = validarValor(numero);
  return erro ? erro.replace('Informe um valor válido.', 'Informe uma meta válida (ou deixe vazio para remover).') : null;
}

/** Converte o que veio do Firestore em metas seguras (ignora lixo e valores inválidos). */
export function normalizarMetas(bruto: unknown): Metas {
  if (typeof bruto !== 'object' || bruto === null) return {};
  const origem = bruto as Record<string, unknown>;
  const metas: Metas = {};
  for (const cat of CATEGORIAS_META) {
    const v = origem[cat];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= LIMITES.valorMax) {
      metas[cat] = v;
    }
  }
  return metas;
}

export async function buscarMetas(): Promise<Metas> {
  const user = auth.currentUser;
  if (!user) return {};
  const snap = await getDoc(doc(db, 'usuarios', user.uid));
  return normalizarMetas(snap.data()?.metas);
}

/** Substitui todas as metas do usuário (categoria ausente = sem meta). */
export async function salvarMetas(metas: Metas): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  const limpas = normalizarMetas(metas);
  const ref = doc(db, 'usuarios', user.uid);
  try {
    await updateDoc(ref, { metas: limpas });
  } catch {
    // Perfil ainda não existe: cria só com as metas.
    await setDoc(ref, { metas: limpas }, { merge: true });
  }
}
