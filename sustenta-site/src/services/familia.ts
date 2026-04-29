import { db, auth } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';

export interface MembroFamilia {
  uid: string;
  nome: string;
  email: string;
  role: 'dono' | 'membro';
  xp: number;
  joinedAt: string;
}

export interface GrupoFamilia {
  id: string;
  nome: string;
  donoUid: string;
  membros: MembroFamilia[];
  codigoConvite: string;
  criadoEm: string;
}

const gerarCodigo = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

export async function criarGrupo(nomeGrupo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const userRef = doc(db, 'usuarios', user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};

  const grupoId = `grupo_${user.uid}`;
  const codigo = gerarCodigo();

  const membro: MembroFamilia = {
    uid: user.uid,
    nome: userData.nome || user.displayName || 'Usuário',
    email: userData.email || user.email || '',
    role: 'dono',
    xp: userData.xpHabitos || 0,
    joinedAt: new Date().toISOString(),
  };

  const grupo: GrupoFamilia = {
    id: grupoId,
    nome: nomeGrupo,
    donoUid: user.uid,
    membros: [membro],
    codigoConvite: codigo,
    criadoEm: new Date().toISOString(),
  };

  await setDoc(doc(db, 'grupos_familia', grupoId), grupo);
  await setDoc(userRef, { grupoFamiliaId: grupoId }, { merge: true });

  return grupo;
}

export async function buscarMeuGrupo(): Promise<GrupoFamilia | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const grupoId = userSnap.data()?.grupoFamiliaId;

  if (!grupoId) return null;

  const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));

  if (!grupoSnap.exists()) return null;

  return grupoSnap.data() as GrupoFamilia;
}

export async function entrarNoGrupo(codigo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const codigoNormalizado = codigo.trim().toUpperCase();

  const q = query(
    collection(db, 'grupos_familia'),
    where('codigoConvite', '==', codigoNormalizado)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Código de convite inválido ou expirado.');
  }

  const grupoDoc = snap.docs[0];
  const grupo = grupoDoc.data() as GrupoFamilia;

  if (grupo.membros.some((m) => m.uid === user.uid)) {
    await setDoc(
      doc(db, 'usuarios', user.uid),
      { grupoFamiliaId: grupoDoc.id },
      { merge: true }
    );

    return grupo;
  }

  if (grupo.membros.length >= 5) {
    throw new Error('Este grupo já atingiu o limite de 5 membros.');
  }

  const userRef = doc(db, 'usuarios', user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};

  const novoMembro: MembroFamilia = {
    uid: user.uid,
    nome: userData.nome || user.displayName || 'Usuário',
    email: userData.email || user.email || '',
    role: 'membro',
    xp: userData.xpHabitos || 0,
    joinedAt: new Date().toISOString(),
  };

  const membrosAtualizados = [...grupo.membros, novoMembro];

  await updateDoc(doc(db, 'grupos_familia', grupoDoc.id), {
    membros: membrosAtualizados,
  });

  await setDoc(userRef, { grupoFamiliaId: grupoDoc.id }, { merge: true });

  return {
    ...grupo,
    id: grupoDoc.id,
    membros: membrosAtualizados,
  };
}

export async function removerMembro(
  grupoId: string,
  membroUid: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoRef = doc(db, 'grupos_familia', grupoId);
  const grupoSnap = await getDoc(grupoRef);

  if (!grupoSnap.exists()) throw new Error('Grupo não encontrado.');

  const grupo = grupoSnap.data() as GrupoFamilia;

  if (grupo.donoUid !== user.uid) {
    throw new Error('Apenas o dono pode remover membros.');
  }

  if (membroUid === grupo.donoUid) {
    throw new Error('O dono não pode ser removido.');
  }

  const novosMembros = grupo.membros.filter((m) => m.uid !== membroUid);

  await updateDoc(grupoRef, {
    membros: novosMembros,
  });

  await setDoc(
    doc(db, 'usuarios', membroUid),
    { grupoFamiliaId: null },
    { merge: true }
  ).catch(() => {});
}

export async function sairDoGrupo(grupoId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoRef = doc(db, 'grupos_familia', grupoId);
  const grupoSnap = await getDoc(grupoRef);

  if (!grupoSnap.exists()) return;

  const grupo = grupoSnap.data() as GrupoFamilia;

  if (grupo.donoUid === user.uid) {
    throw new Error('O dono não pode sair do grupo. Remova o grupo ou transfira a posse.');
  }

  const novosMembros = grupo.membros.filter((m) => m.uid !== user.uid);

  await updateDoc(grupoRef, {
    membros: novosMembros,
  });

  await setDoc(
    doc(db, 'usuarios', user.uid),
    { grupoFamiliaId: null },
    { merge: true }
  );
}

export async function regenerarCodigo(grupoId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoRef = doc(db, 'grupos_familia', grupoId);
  const grupoSnap = await getDoc(grupoRef);

  if (!grupoSnap.exists()) {
    throw new Error('Grupo não encontrado.');
  }

  const grupo = grupoSnap.data() as GrupoFamilia;

  if (grupo.donoUid !== user.uid) {
    throw new Error('Apenas o dono pode regenerar o código.');
  }

  const novoCodigo = gerarCodigo();

  await updateDoc(grupoRef, {
    codigoConvite: novoCodigo,
  });

  return novoCodigo;
}

export function montarLinkConvite(codigo: string): string {
  const base = window.location.origin;
  return `${base}?convite=${codigo}`;
}

export function compartilharWhatsApp(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Você foi convidado para participar do grupo "${nomeGrupo}" no Sustenta.\n\nAcesse: ${link}`
  );

  window.open(`https://wa.me/?text=${texto}`, '_blank');
}

export function compartilharInstagram(link: string): void {
  navigator.clipboard.writeText(link);
}

export function compartilharX(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Fui convidado para o grupo "${nomeGrupo}" no Sustenta. Acesse: ${link}`
  );

  window.open(`https://x.com/intent/tweet?text=${texto}`, '_blank');
}

export function compartilharEmail(link: string, nomeGrupo: string): void {
  const assunto = encodeURIComponent(`Convite para o grupo ${nomeGrupo} no Sustenta`);
  const corpo = encodeURIComponent(
    `Olá!\n\nVocê foi convidado para participar do grupo "${nomeGrupo}" no Sustenta.\n\nAcesse pelo link abaixo:\n${link}`
  );

  window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
}