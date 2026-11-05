import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, limit, increment } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { LIMITES, limparTexto } from '../../../services/validacao';
import type { RankingEntry, UserProgress } from './tipos';


export async function carregarProgresso(uid: string): Promise<UserProgress> {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    const data = snap.data();

    return {
      artigosLidos: data?.educacao?.artigosLidos ?? [],
      quizzesCompletos: data?.educacao?.quizzesCompletos ?? [],
      desafiosAceitos: data?.educacao?.desafiosAceitos ?? [],
      xpEducacao: data?.educacao?.xpEducacao ?? 0,
    };
  } catch {
    return {
      artigosLidos: [],
      quizzesCompletos: [],
      desafiosAceitos: [],
      xpEducacao: 0,
    };
  }
}


export async function salvarArtigoLido(uid: string, artigoId: string) {
  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.artigosLidos': arrayUnion(artigoId),
    'educacao.xpEducacao': increment(50),
  });
}


export async function somarXpRanking(uid: string, nomeUsuario: string, xp: number) {
  await setDoc(
    doc(db, 'ranking_educacao', uid),
    {
      uid,
      nome: limparTexto(nomeUsuario, LIMITES.nome) || 'Usuário',
      xp: increment(xp),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}


export async function salvarQuizCompleto(
  uid: string,
  catId: string,
  acertos: number,
  total: number,
  xpGanho: number,
  nomeUsuario: string
) {
  const entry = { catId, acertos, total, data: new Date().toISOString() };

  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.quizzesCompletos': arrayUnion(entry),
    'educacao.xpEducacao': increment(xpGanho),
  });

  await somarXpRanking(uid, nomeUsuario, xpGanho);
}


export async function salvarDesafioAceito(uid: string, desafioId: string, xp: number, nomeUsuario: string) {
  await updateDoc(doc(db, 'usuarios', uid), {
    'educacao.desafiosAceitos': arrayUnion(desafioId),
    'educacao.xpEducacao': increment(xp),
  });

  await somarXpRanking(uid, nomeUsuario, xp);
}


export async function carregarRanking(): Promise<RankingEntry[]> {
  try {
    const q = query(collection(db, 'ranking_educacao'), orderBy('xp', 'desc'), limit(5));
    const snap = await getDocs(q);

    return snap.docs.map((d, i) => ({
      ...(d.data() as RankingEntry),
      posicao: i + 1,
    }));
  } catch {
    return [];
  }
}
