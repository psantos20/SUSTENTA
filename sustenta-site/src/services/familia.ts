import { db, auth } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, serverTimestamp,
  arrayUnion, arrayRemove
} from 'firebase/firestore';

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

// ─── Gera código de convite único ─────────────────────────────────────────────

const gerarCodigo = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// ─── Cria grupo familiar ───────────────────────────────────────────────────────

export async function criarGrupo(nomeGrupo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  // Busca dados do usuário
  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const userData = userSnap.data() || {};

  const grupoId = `grupo_${user.uid}`;
  const codigo  = gerarCodigo();

  const membro: MembroFamilia = {
    uid:      user.uid,
    nome:     userData.nome     || user.displayName || 'Usuário',
    email:    userData.email    || user.email        || '',
    role:     'dono',
    xp:       0,
    joinedAt: new Date().toISOString(),
  };

  const grupo: GrupoFamilia = {
    id:            grupoId,
    nome:          nomeGrupo,
    donoUid:       user.uid,
    membros:       [membro],
    codigoConvite: codigo,
    criadoEm:      new Date().toISOString(),
  };

  await setDoc(doc(db, 'grupos_familia', grupoId), grupo);

  // Salva referência do grupo no perfil do usuário
  await updateDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: grupoId });

  return grupo;
}

// ─── Busca grupo do usuário atual ─────────────────────────────────────────────

export async function buscarMeuGrupo(): Promise<GrupoFamilia | null> {
  const user = auth.currentUser;
  if (!user) return null;

  // Verifica se usuário tem grupo salvo no perfil
  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const grupoId  = userSnap.data()?.grupoFamiliaId;
  if (!grupoId) return null;

  const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));
  if (!grupoSnap.exists()) return null;

  return grupoSnap.data() as GrupoFamilia;
}

// ─── Entra no grupo via código de convite ────────────────────────────────────

export async function entrarNoGrupo(codigo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  // Busca grupo pelo código
  const q    = query(collection(db, 'grupos_familia'), where('codigoConvite', '==', codigo.toUpperCase()));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error('Código de convite inválido ou expirado.');

  const grupoSnap = snap.docs[0];
  const grupo     = grupoSnap.data() as GrupoFamilia;

  // Verifica se já é membro
  if (grupo.membros.some(m => m.uid === user.uid)) {
    throw new Error('Você já faz parte deste grupo.');
  }

  // Verifica limite de membros
  if (grupo.membros.length >= 5) {
    throw new Error('Este grupo já atingiu o limite de 5 membros.');
  }

  // Busca dados do usuário
  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const userData = userSnap.data() || {};

  const novoMembro: MembroFamilia = {
    uid:      user.uid,
    nome:     userData.nome  || user.displayName || 'Usuário',
    email:    userData.email || user.email        || '',
    role:     'membro',
    xp:       0,
    joinedAt: new Date().toISOString(),
  };

  // Adiciona membro ao grupo
  const membrosAtualizados = [...grupo.membros, novoMembro];
  await updateDoc(doc(db, 'grupos_familia', grupoSnap.id), {
    membros: membrosAtualizados,
  });

  // Salva referência no perfil do usuário
  await updateDoc(doc(db, 'usuarios', user.uid), {
    grupoFamiliaId: grupoSnap.id,
  });

  return { ...grupo, membros: membrosAtualizados };
}

// ─── Remove membro do grupo ───────────────────────────────────────────────────

export async function removerMembro(grupoId: string, membroUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));
  if (!grupoSnap.exists()) throw new Error('Grupo não encontrado.');

  const grupo = grupoSnap.data() as GrupoFamilia;
  if (grupo.donoUid !== user.uid) throw new Error('Apenas o dono pode remover membros.');

  const novosMembros = grupo.membros.filter(m => m.uid !== membroUid);
  await updateDoc(doc(db, 'grupos_familia', grupoId), { membros: novosMembros });

  // Remove referência do grupo no perfil do membro removido
  await updateDoc(doc(db, 'usuarios', membroUid), { grupoFamiliaId: null }).catch(() => {});
}

// ─── Sair do grupo ────────────────────────────────────────────────────────────

export async function sairDoGrupo(grupoId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));
  if (!grupoSnap.exists()) return;

  const grupo = grupoSnap.data() as GrupoFamilia;

  // Dono não pode sair, apenas excluir
  if (grupo.donoUid === user.uid) throw new Error('O dono não pode sair. Exclua o grupo.');

  const novosMembros = grupo.membros.filter(m => m.uid !== user.uid);
  await updateDoc(doc(db, 'grupos_familia', grupoId), { membros: novosMembros });
  await updateDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: null });
}

// ─── Regenera código de convite ───────────────────────────────────────────────

export async function regenerarCodigo(grupoId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const novoCodigo = gerarCodigo();
  await updateDoc(doc(db, 'grupos_familia', grupoId), { codigoConvite: novoCodigo });
  return novoCodigo;
}

// ─── Monta link de convite compartilhável ────────────────────────────────────

export function montarLinkConvite(codigo: string): string {
  const base = window.location.origin;
  return `${base}?convite=${codigo}`;
}

// ─── URLs para compartilhar nas redes sociais ────────────────────────────────

export function compartilharWhatsApp(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Junte-se ao meu grupo familiar no Sustenta!\n\nVamos monitorar o consumo e economizar juntos.\n\nAcesse: ${link}`
  );
  window.open(`https://wa.me/?text=${texto}`, '_blank');
}

export function compartilharInstagram(link: string): void {
  // Instagram não tem API de compartilhamento — copia o link
  navigator.clipboard.writeText(link);
}

export function compartilharX(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Junte-se ao meu grupo no @SustentaApp e vamos economizar juntos! ${link} #Sustenta #Sustentabilidade`
  );
  window.open(`https://x.com/intent/tweet?text=${texto}`, '_blank');
}

export function compartilharEmail(link: string, nomeGrupo: string): void {
  const assunto = encodeURIComponent(`Convite para o grupo ${nomeGrupo} no Sustenta`);
  const corpo   = encodeURIComponent(
    `Olá!\n\nVocê foi convidado para participar do grupo "${nomeGrupo}" no Sustenta.\n\nClique no link abaixo para entrar:\n${link}\n\nOu use o código de convite diretamente no app.\n\nAté logo! 🌿`
  );
  window.open(`mailto:?subject=${assunto}&body=${corpo}`, '_blank');
}