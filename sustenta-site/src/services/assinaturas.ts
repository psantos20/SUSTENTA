/**
 * SUSTENTA Streaming no app: lê as assinaturas detectadas pelo servidor e grava
 * as respostas sobre a TV. A conexão com o banco passa sempre pela função
 * `streaming` (a chave da Pluggy nunca vem para o navegador).
 */
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { chamarFuncaoAutenticada } from './api';
import type { DadosStreaming, RespostaTv, Servico, UsoMensal } from './streaming';

export type RespostasTv = Partial<Record<Servico, RespostaTv>>;

export function ouvirStreaming(uid: string, aoMudar: (dados: DadosStreaming | null) => void, aoFalhar?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'streaming', uid),
    (snap) => aoMudar(snap.exists() ? (snap.data() as DadosStreaming) : null),
    (e) => aoFalhar?.(e),
  );
}

export function ouvirRespostasTv(uid: string, mes: string, aoMudar: (tv: RespostasTv) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'streaming_respostas', `${uid}_${mes}`),
    (snap) => aoMudar(snap.exists() ? ((snap.data().tv ?? {}) as RespostasTv) : {}),
    () => aoMudar({}),
  );
}

export function salvarRespostaTv(uid: string, mes: string, atuais: RespostasTv, servico: Servico, resposta: RespostaTv) {
  return setDoc(doc(db, 'streaming_respostas', `${uid}_${mes}`), {
    uid,
    mes,
    tv: { ...atuais, [servico]: resposta },
    atualizadoEm: serverTimestamp(),
  });
}

export function apagarStreaming(uid: string) {
  return deleteDoc(doc(db, 'streaming', uid));
}

type Resumo = { status: 'ok'; assinaturas: number; bancos: number; ultimaSync: string | null };

export const pedirTokenConexao = () =>
  chamarFuncaoAutenticada<{ status: 'ok'; accessToken: string }>('streaming', { acao: 'conectar' }).then((r) => r.accessToken);

export const registrarConexao = (itemId: string) => chamarFuncaoAutenticada<Resumo>('streaming', { acao: 'registrar', itemId });

export const sincronizarAssinaturas = () => chamarFuncaoAutenticada<Resumo>('streaming', { acao: 'sincronizar' });

/** Sem itemId: desconecta todos os bancos. */
export const desconectarBanco = (itemId?: string) =>
  chamarFuncaoAutenticada<{ status: 'ok' }>('streaming', itemId ? { acao: 'desconectar', itemId } : { acao: 'desconectar' });

// ─── Nome personalizado de cada banco ───────────────────────────────────────

/** itemId → nome dado pela pessoa. */
export type NomesBancos = Record<string, string>;

export function ouvirNomesBancos(uid: string, aoMudar: (nomes: NomesBancos) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'streaming_nomes'), where('uid', '==', uid)),
    (snap) => {
      const nomes: NomesBancos = {};
      snap.forEach((d) => {
        const v = d.data();
        if (typeof v.itemId === 'string' && typeof v.nome === 'string') nomes[v.itemId] = v.nome;
      });
      aoMudar(nomes);
    },
    () => aoMudar({}),
  );
}

export function salvarNomeBanco(uid: string, itemId: string, nome: string) {
  const limpo = nome.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const ref = doc(db, 'streaming_nomes', `${uid}_${itemId}`);
  if (!limpo) return deleteDoc(ref);
  return setDoc(ref, { uid, itemId, nome: limpo, atualizadoEm: serverTimestamp() });
}

// ─── Extensão do navegador ───────────────────────────────────────────────────

export interface SituacaoExtensao {
  vinculada: boolean;
  vinculadaEm?: string | null;
  ultimoEnvio: string | null;
}

export function ouvirUsoMensal(uid: string, mes: string, aoMudar: (uso: UsoMensal | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'streaming_uso', `${uid}_${mes}`),
    (snap) => aoMudar(snap.exists() ? (snap.data() as UsoMensal) : null),
    () => aoMudar(null),
  );
}

export function ouvirExtensao(uid: string, aoMudar: (s: SituacaoExtensao | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'streaming_extensao', uid),
    (snap) => aoMudar(snap.exists() ? (snap.data() as SituacaoExtensao) : null),
    () => aoMudar(null),
  );
}

export const gerarCodigoExtensao = () =>
  chamarFuncaoAutenticada<{ status: 'ok'; codigo: string; expiraEm: number }>('streaming-extensao', { acao: 'gerar-codigo' });

export const desvincularExtensoes = () => chamarFuncaoAutenticada<{ status: 'ok' }>('streaming-extensao', { acao: 'desvincular' });
