import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { excluirGrupo, sairDoGrupo } from './familia';

/** Pede a senha (ou o Google) de novo antes de ações sensíveis. */
export async function reautenticar(senha?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const usaSenha = user.providerData.some((p) => p.providerId === 'password');
  if (usaSenha) {
    if (!senha || !user.email) throw new Error('Informe sua senha para confirmar.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, senha));
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
}

export function contaUsaSenha(): boolean {
  return !!auth.currentUser?.providerData.some((p) => p.providerId === 'password');
}

/** LGPD — portabilidade: baixa um JSON com todos os dados do usuário. */
export async function exportarMeusDados(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const [perfil, habitos, ranking, registros] = await Promise.all([
    getDoc(doc(db, 'usuarios', user.uid)),
    getDoc(doc(db, 'habitos_usuarios', user.uid)),
    getDoc(doc(db, 'ranking_educacao', user.uid)),
    getDocs(query(collection(db, 'registros'), where('uid', '==', user.uid))),
  ]);

  const dados = {
    exportadoEm: new Date().toISOString(),
    conta: { uid: user.uid, email: user.email, criadaEm: user.metadata.creationTime },
    perfil: perfil.data() ?? null,
    habitos: habitos.data() ?? null,
    ranking: ranking.data() ?? null,
    registros: registros.docs.map((d) => ({ id: d.id, ...d.data() })),
  };

  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sustenta-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * LGPD — direito de exclusão: apaga todos os dados do usuário e a conta.
 * A reautenticação acontece antes, para ninguém excluir a conta de outra
 * pessoa a partir de um computador esquecido logado.
 */
export async function excluirConta(senha?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  await reautenticar(senha);

  // 1. Grupo familiar
  const perfil = await getDoc(doc(db, 'usuarios', user.uid));
  const grupoId = perfil.data()?.grupoFamiliaId as string | undefined;
  if (grupoId) {
    try {
      if (grupoId === `grupo_${user.uid}`) await excluirGrupo(grupoId);
      else await sairDoGrupo(grupoId);
    } catch {
      // Grupo já removido ou sem acesso: segue com a exclusão.
    }
  }

  // 2. Registros de consumo (em lotes de até 450 operações)
  const registros = await getDocs(query(collection(db, 'registros'), where('uid', '==', user.uid)));
  for (let i = 0; i < registros.docs.length; i += 450) {
    const lote = writeBatch(db);
    registros.docs.slice(i, i + 450).forEach((d) => lote.delete(d.ref));
    await lote.commit();
  }

  // 3. Demais documentos do usuário
  await Promise.all([
    deleteDoc(doc(db, 'habitos_usuarios', user.uid)),
    deleteDoc(doc(db, 'ranking_educacao', user.uid)),
  ]);
  await deleteDoc(doc(db, 'usuarios', user.uid));

  // 4. Conta de login
  await deleteUser(user);

  try {
    localStorage.removeItem('sustenta_dark');
  } catch {
    /* ignora */
  }
}
