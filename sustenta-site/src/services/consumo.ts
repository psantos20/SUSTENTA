import { db, auth } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface Registro {
  id: string;
  categoria: 'energia' | 'agua' | 'outro';
  subcategoria?: string;
  valor: number;
  mes: string;
  descricao: string;
}

export async function buscarRegistrosMes(mes: string): Promise<Registro[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(
    collection(db, 'registros'),
    where('uid', '==', user.uid),
    where('mes', '==', mes)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registro));
}

export async function buscarTodosRegistros(): Promise<Registro[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const q = query(collection(db, 'registros'), where('uid', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registro));
}

const NOMES_NIVEL = ['Iniciante', 'Consciente', 'Engajado', 'Ativo', 'Dedicado', 'Guardião', 'Protetor', 'Mestre', 'Guardião Verde', 'Eco Herói'];
const XP_POR_REGISTRO = 100;
const XP_POR_NIVEL = 1000;

export function calcularNivel(totalRegistros: number) {
  // Entrada inválida (NaN, negativa, Infinity) conta como 0 registros.
  const total = Number.isFinite(totalRegistros) ? Math.max(0, Math.floor(totalRegistros)) : 0;
  const xp = total * XP_POR_REGISTRO;
  const nivelMax = NOMES_NIVEL.length;
  const nivel = Math.min(Math.floor(xp / XP_POR_NIVEL) + 1, nivelMax);
  // No nível máximo a barra fica cheia (não existe "próximo nível").
  const xpAtual = nivel === nivelMax ? XP_POR_NIVEL : xp % XP_POR_NIVEL;
  return { nivel, xpAtual, xpTotal: XP_POR_NIVEL, nome: NOMES_NIVEL[nivel - 1] };
}
