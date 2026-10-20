import { db, auth } from './firebase';
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  /** Lista de uids usada pelas regras do Firestore para checar participação. */
  membroUids?: string[];
  codigoConvite: string;
  criadoEm: string;
}

export interface ConviteFamilia {
  grupoId: string;
  nomeGrupo: string;
}

const LIMITE_MEMBROS = 5;
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I

/** Código de convite com gerador criptográfico (não previsível). */
const gerarCodigo = (tamanho = 10) => {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join('');
};

export const normalizarCodigo = (codigo: string) =>
  codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);

const limitarTexto = (texto: string, max: number) => texto.trim().slice(0, max);

async function montarMembro(role: 'dono' | 'membro'): Promise<MembroFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const userData = userSnap.data() || {};

  return {
    uid: user.uid,
    nome: limitarTexto(userData.nome || user.displayName || 'Usuário', 80),
    email: userData.email || user.email || '',
    role,
    xp: userData.xpHabitos || 0,
    joinedAt: new Date().toISOString(),
  };
}

async function registrarConvite(grupoId: string, codigo: string, nomeGrupo: string) {
  await setDoc(doc(db, 'convites_familia', codigo), {
    grupoId,
    nomeGrupo,
    criadoEm: serverTimestamp(),
  });
}

/**
 * Grupos criados antes das novas regras não têm `membroUids` nem o documento
 * de convite. O dono, ao abrir o app, completa essa estrutura.
 */
async function migrarGrupoAntigo(grupo: GrupoFamilia) {
  const user = auth.currentUser;
  if (!user || grupo.donoUid !== user.uid) return grupo;

  let atualizado = grupo;

  if (!Array.isArray(grupo.membroUids)) {
    const membros = (grupo.membros || []).slice(0, LIMITE_MEMBROS);
    const membroUids = membros.map((m) => m.uid);
    await updateDoc(doc(db, 'grupos_familia', grupo.id), { membros, membroUids });
    atualizado = { ...grupo, membros, membroUids };
  }

  const convite = await getDoc(doc(db, 'convites_familia', atualizado.codigoConvite));
  if (!convite.exists()) {
    await registrarConvite(atualizado.id, atualizado.codigoConvite, atualizado.nome);
  }

  return atualizado;
}

export async function criarGrupo(nomeGrupo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const nome = limitarTexto(nomeGrupo, 60);
  if (!nome) throw new Error('Informe o nome do grupo.');

  const grupoId = `grupo_${user.uid}`;
  const codigo = gerarCodigo();
  const membro = await montarMembro('dono');

  const grupo: GrupoFamilia = {
    id: grupoId,
    nome,
    donoUid: user.uid,
    membros: [membro],
    membroUids: [user.uid],
    codigoConvite: codigo,
    criadoEm: new Date().toISOString(),
  };

  await setDoc(doc(db, 'grupos_familia', grupoId), grupo);
  await setDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: grupoId }, { merge: true });
  await registrarConvite(grupoId, codigo, nome);

  return grupo;
}

export async function buscarMeuGrupo(): Promise<GrupoFamilia | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
  const grupoId = userSnap.data()?.grupoFamiliaId;

  if (!grupoId) return null;

  try {
    const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));

    if (!grupoSnap.exists()) {
      await desvincularGrupo();
      return null;
    }

    const grupo = { ...(grupoSnap.data() as GrupoFamilia), id: grupoSnap.id };
    return await migrarGrupoAntigo(grupo);
  } catch (e) {
    // Sem permissão = o usuário foi removido do grupo. Limpa o vínculo.
    if ((e as { code?: string })?.code === 'permission-denied') {
      await desvincularGrupo();
      return null;
    }
    throw e;
  }
}

async function desvincularGrupo() {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: null }, { merge: true }).catch(() => {});
}

/** Consulta um convite sem entrar no grupo (usado para pedir confirmação). */
export async function buscarConvite(codigo: string): Promise<ConviteFamilia | null> {
  const codigoNormalizado = normalizarCodigo(codigo);
  if (codigoNormalizado.length < 6) return null;

  const snap = await getDoc(doc(db, 'convites_familia', codigoNormalizado));
  return snap.exists() ? (snap.data() as ConviteFamilia) : null;
}

export async function entrarNoGrupo(codigo: string): Promise<GrupoFamilia> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const codigoNormalizado = normalizarCodigo(codigo);
  const convite = await buscarConvite(codigoNormalizado);

  if (!convite) {
    throw new Error('Código de convite inválido ou expirado.');
  }

  const grupoRef = doc(db, 'grupos_familia', convite.grupoId);

  // Já é membro? Então só garante o vínculo no perfil.
  try {
    const atual = await getDoc(grupoRef);
    if (atual.exists()) {
      const grupo = atual.data() as GrupoFamilia;
      await setDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: convite.grupoId }, { merge: true });
      return { ...grupo, id: atual.id };
    }
  } catch {
    // Sem permissão de leitura: ainda não é membro. Segue para a entrada.
  }

  const novoMembro = await montarMembro('membro');

  try {
    await updateDoc(grupoRef, {
      membroUids: arrayUnion(user.uid),
      membros: arrayUnion(novoMembro),
      ultimoCodigoUsado: codigoNormalizado,
    });
  } catch (e) {
    if ((e as { code?: string })?.code === 'permission-denied') {
      throw new Error(`Não foi possível entrar: o convite expirou ou o grupo já tem ${LIMITE_MEMBROS} membros.`, { cause: e });
    }
    throw e;
  }

  await setDoc(doc(db, 'usuarios', user.uid), { grupoFamiliaId: convite.grupoId }, { merge: true });

  const grupoSnap = await getDoc(grupoRef);
  return { ...(grupoSnap.data() as GrupoFamilia), id: grupoSnap.id };
}

export async function removerMembro(grupoId: string, membroUid: string): Promise<void> {
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

  const membros = grupo.membros.filter((m) => m.uid !== membroUid);

  // O perfil do membro removido NÃO é alterado daqui (cada um só escreve no
  // próprio perfil). O app dele limpa o vínculo ao perceber a remoção.
  await updateDoc(grupoRef, {
    membros,
    membroUids: membros.map((m) => m.uid),
  });
}

export async function sairDoGrupo(grupoId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoRef = doc(db, 'grupos_familia', grupoId);
  const grupoSnap = await getDoc(grupoRef);

  if (!grupoSnap.exists()) {
    await desvincularGrupo();
    return;
  }

  const grupo = grupoSnap.data() as GrupoFamilia;

  if (grupo.donoUid === user.uid) {
    throw new Error('O dono não pode sair do grupo. Exclua o grupo ou transfira a posse.');
  }

  const membroUids = (grupo.membroUids || []).filter((uid) => uid !== user.uid);
  const membros = grupo.membros.filter((m) => m.uid !== user.uid);

  await updateDoc(grupoRef, { membros, membroUids });
  await desvincularGrupo();
}

/** Exclui o grupo inteiro (somente o dono). */
export async function excluirGrupo(grupoId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');

  const grupoRef = doc(db, 'grupos_familia', grupoId);
  const grupoSnap = await getDoc(grupoRef);
  if (!grupoSnap.exists()) return;

  const grupo = grupoSnap.data() as GrupoFamilia;
  if (grupo.donoUid !== user.uid) throw new Error('Apenas o dono pode excluir o grupo.');

  await deleteDoc(doc(db, 'convites_familia', grupo.codigoConvite)).catch(() => {});
  await deleteDoc(grupoRef);
  await desvincularGrupo();
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

  await updateDoc(grupoRef, { codigoConvite: novoCodigo });
  await registrarConvite(grupoId, novoCodigo, grupo.nome);
  // Invalida o código antigo.
  await deleteDoc(doc(db, 'convites_familia', grupo.codigoConvite)).catch(() => {});

  return novoCodigo;
}

export function montarLinkConvite(codigo: string): string {
  const base = window.location.origin;
  return `${base}?convite=${encodeURIComponent(codigo)}`;
}

const abrirExterno = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export function compartilharWhatsApp(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Você foi convidado para participar do grupo "${nomeGrupo}" no Sustenta.\n\nAcesse: ${link}`
  );

  abrirExterno(`https://wa.me/?text=${texto}`);
}

export function compartilharInstagram(link: string): void {
  navigator.clipboard.writeText(link);
}

export function compartilharX(link: string, nomeGrupo: string): void {
  const texto = encodeURIComponent(
    `🌿 Fui convidado para o grupo "${nomeGrupo}" no Sustenta. Acesse: ${link}`
  );

  abrirExterno(`https://x.com/intent/tweet?text=${texto}`);
}

export function compartilharEmail(link: string, nomeGrupo: string): void {
  const assunto = encodeURIComponent(`Convite para o grupo ${nomeGrupo} no Sustenta`);
  const corpo = encodeURIComponent(
    `Olá!\n\nVocê foi convidado para participar do grupo "${nomeGrupo}" no Sustenta.\n\nAcesse pelo link abaixo:\n${link}`
  );

  window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
}
