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

export function calcularNivel(totalRegistros: number) {
  const xp = totalRegistros * 100;
  const nivel = Math.floor(xp / 1000) + 1;
  const xpAtual = xp % 1000;
  const nomes = ['Iniciante', 'Consciente', 'Engajado', 'Ativo', 'Dedicado', 'Guardião', 'Protetor', 'Mestre', 'Guardião Verde', 'Eco Herói'];
  return { nivel, xpAtual, xpTotal: 1000, nome: nomes[Math.min(nivel - 1, nomes.length - 1)] };
}