/**
 * Testes das regras do Firestore (rodam no emulador).
 *   npm run test:rules
 * Requer firebase-tools (npm i -g firebase-tools) e Java instalado.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const ALICE = 'alice';
const BOB = 'bob';
const EVE = 'eve';

const db = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@teste.com` }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seed(fn: (db: ReturnType<typeof db>) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as unknown as ReturnType<typeof db>);
  });
}

function membro(uid: string, role: 'dono' | 'membro' = 'membro') {
  return { uid, nome: uid, email: `${uid}@teste.com`, role, xp: 0, joinedAt: '2026-01-01T00:00:00.000Z' };
}

function registro(uid: string, extra: Record<string, unknown> = {}) {
  return {
    uid,
    categoria: 'energia',
    subcategoria: null,
    valor: 120.5,
    descricao: 'Conta de luz',
    mes: '2026-09',
    criadoEm: serverTimestamp(),
    ...extra,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'sustenta-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('usuarios', () => {
  it('bloqueia acesso sem login', async () => {
    await assertFails(getDoc(doc(anon(), 'usuarios', ALICE)));
  });

  it('usuário cria e lê o próprio perfil', async () => {
    const ref = doc(db(ALICE), 'usuarios', ALICE);
    await assertSucceeds(setDoc(ref, { nome: 'Alice', email: 'alice@teste.com', estado: 'SP', cidade: 'São Paulo', telefone: '', criadoEm: 'x' }));
    await assertSucceeds(getDoc(ref));
  });

  it('não lê perfil de outra pessoa fora da família', async () => {
    await seed(async (d) => { await setDoc(doc(d, 'usuarios', BOB), { nome: 'Bob' }); });
    await assertFails(getDoc(doc(db(ALICE), 'usuarios', BOB)));
  });

  it('não escreve no perfil de outra pessoa', async () => {
    await assertFails(setDoc(doc(db(EVE), 'usuarios', ALICE), { nome: 'hack' }));
  });

  it('não aceita e-mail diferente do login nem campos desconhecidos', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'usuarios', ALICE), { email: 'outro@teste.com' }));
    await assertFails(setDoc(doc(db(ALICE), 'usuarios', ALICE), { nome: 'A', admin: true }));
  });

  it('não permite pular XP de forma absurda', async () => {
    await seed(async (d) => { await setDoc(doc(d, 'usuarios', ALICE), { nome: 'A', xpHabitos: 100 }); });
    await assertSucceeds(updateDoc(doc(db(ALICE), 'usuarios', ALICE), { xpHabitos: 150 }));
    await assertFails(updateDoc(doc(db(ALICE), 'usuarios', ALICE), { xpHabitos: 999999 }));
  });

  it('não permite apontar para um grupo do qual não faz parte', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'usuarios', EVE), { nome: 'Eve' });
      await setDoc(doc(d, 'grupos_familia', `grupo_${ALICE}`), {
        id: `grupo_${ALICE}`, nome: 'Casa', donoUid: ALICE, membroUids: [ALICE], membros: [membro(ALICE, 'dono')], codigoConvite: 'ABC',
      });
    });
    await assertFails(updateDoc(doc(db(EVE), 'usuarios', EVE), { grupoFamiliaId: `grupo_${ALICE}` }));
  });
});

describe('registros', () => {
  it('cria registro válido com o próprio uid', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'registros', 'r1'), registro(ALICE)));
  });

  it('rejeita registro em nome de outra pessoa ou com dados inválidos', async () => {
    await assertFails(setDoc(doc(db(EVE), 'registros', 'r1'), registro(ALICE)));
    await assertFails(setDoc(doc(db(ALICE), 'registros', 'r2'), registro(ALICE, { valor: -5 })));
    await assertFails(setDoc(doc(db(ALICE), 'registros', 'r3'), registro(ALICE, { categoria: 'hack' })));
    await assertFails(setDoc(doc(db(ALICE), 'registros', 'r4'), registro(ALICE, { mes: '2026-13' })));
    await assertFails(setDoc(doc(db(ALICE), 'registros', 'r5'), registro(ALICE, { descricao: 'x'.repeat(301) })));
    await assertFails(setDoc(doc(db(ALICE), 'registros', 'r6'), registro(ALICE, { criadoEm: Timestamp.fromDate(new Date('2020-01-01')) })));
  });

  it('só o dono lista, edita e apaga', async () => {
    await seed(async (d) => { await setDoc(doc(d, 'registros', 'r1'), { ...registro(ALICE), criadoEm: Timestamp.now() }); });
    await assertSucceeds(getDocs(query(collection(db(ALICE), 'registros'), where('uid', '==', ALICE))));
    await assertFails(getDocs(query(collection(db(EVE), 'registros'), where('uid', '==', ALICE))));
    await assertFails(getDocs(collection(db(EVE), 'registros')));
    await assertFails(updateDoc(doc(db(EVE), 'registros', 'r1'), { valor: 1 }));
    await assertFails(updateDoc(doc(db(ALICE), 'registros', 'r1'), { uid: EVE }));
    await assertSucceeds(updateDoc(doc(db(ALICE), 'registros', 'r1'), { valor: 99, descricao: 'ok' }));
    await assertFails(deleteDoc(doc(db(EVE), 'registros', 'r1')));
    await assertSucceeds(deleteDoc(doc(db(ALICE), 'registros', 'r1')));
  });
});

describe('família', () => {
  const GID = `grupo_${ALICE}`;

  async function seedGrupo(compartilhaGastos: boolean) {
    await seed(async (d) => {
      await setDoc(doc(d, 'grupos_familia', GID), {
        id: GID, nome: 'Casa', donoUid: ALICE, membroUids: [ALICE, BOB],
        membros: [membro(ALICE, 'dono'), membro(BOB)], codigoConvite: 'CODIGO123',
      });
      await setDoc(doc(d, 'convites_familia', 'CODIGO123'), { grupoId: GID, nomeGrupo: 'Casa' });
      await setDoc(doc(d, 'usuarios', ALICE), { nome: 'Alice', grupoFamiliaId: GID, dadosCompartilhados: { gastos: compartilhaGastos, nivel: true, conquistas: false } });
      await setDoc(doc(d, 'usuarios', BOB), { nome: 'Bob', grupoFamiliaId: GID });
      await setDoc(doc(d, 'usuarios', EVE), { nome: 'Eve' });
      await setDoc(doc(d, 'registros', 'ra'), { ...registro(ALICE), criadoEm: Timestamp.now() });
      await setDoc(doc(d, 'habitos_usuarios', ALICE), { uid: ALICE, xpHabitos: 10 });
    });
  }

  it('dono cria o próprio grupo, mas não um grupo com id de outra pessoa', async () => {
    const base = { nome: 'Casa', donoUid: ALICE, membroUids: [ALICE], membros: [membro(ALICE, 'dono')], codigoConvite: 'X1', criadoEm: 'x', id: GID };
    await assertSucceeds(setDoc(doc(db(ALICE), 'grupos_familia', GID), base));
    await assertFails(setDoc(doc(db(EVE), 'grupos_familia', GID), { ...base, donoUid: EVE }));
  });

  it('membros leem o grupo; estranhos não', async () => {
    await seedGrupo(false);
    await assertSucceeds(getDoc(doc(db(BOB), 'grupos_familia', GID)));
    await assertFails(getDoc(doc(db(EVE), 'grupos_familia', GID)));
    await assertFails(getDocs(collection(db(EVE), 'grupos_familia')));
  });

  it('membro da família lê perfil e hábitos; estranho não', async () => {
    await seedGrupo(false);
    await assertSucceeds(getDoc(doc(db(BOB), 'usuarios', ALICE)));
    await assertSucceeds(getDoc(doc(db(BOB), 'habitos_usuarios', ALICE)));
    await assertFails(getDoc(doc(db(EVE), 'usuarios', ALICE)));
    await assertFails(getDoc(doc(db(EVE), 'habitos_usuarios', ALICE)));
  });

  it('gastos só ficam visíveis à família se o dono autorizar', async () => {
    await seedGrupo(false);
    await assertFails(getDocs(query(collection(db(BOB), 'registros'), where('uid', '==', ALICE))));
    await seedGrupo(true);
    await assertSucceeds(getDocs(query(collection(db(BOB), 'registros'), where('uid', '==', ALICE))));
    await assertFails(getDocs(query(collection(db(EVE), 'registros'), where('uid', '==', ALICE))));
  });

  it('convite: lê por código, mas não lista todos', async () => {
    await seedGrupo(false);
    await assertSucceeds(getDoc(doc(db(EVE), 'convites_familia', 'CODIGO123')));
    await assertFails(getDocs(collection(db(EVE), 'convites_familia')));
  });

  it('entra no grupo com o código correto, adicionando só a si mesmo', async () => {
    await seedGrupo(false);
    const ref = doc(db(EVE), 'grupos_familia', GID);
    await assertFails(updateDoc(ref, { membroUids: arrayUnion(EVE), membros: arrayUnion(membro(EVE)), ultimoCodigoUsado: 'ERRADO' }));
    await assertFails(updateDoc(ref, { membroUids: [ALICE, BOB, EVE], membros: [membro(ALICE, 'dono'), membro(EVE), membro(EVE)], ultimoCodigoUsado: 'CODIGO123' }));
    await assertSucceeds(updateDoc(ref, { membroUids: arrayUnion(EVE), membros: arrayUnion(membro(EVE)), ultimoCodigoUsado: 'CODIGO123' }));
  });

  it('não passa de 5 membros', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'grupos_familia', GID), {
        id: GID, nome: 'Casa', donoUid: ALICE, membroUids: [ALICE, 'm2', 'm3', 'm4', 'm5'],
        membros: [membro(ALICE, 'dono'), membro('m2'), membro('m3'), membro('m4'), membro('m5')], codigoConvite: 'C',
      });
    });
    await assertFails(updateDoc(doc(db(EVE), 'grupos_familia', GID), { membroUids: arrayUnion(EVE), membros: arrayUnion(membro(EVE)), ultimoCodigoUsado: 'C' }));
  });

  it('membro sai removendo só a si; não remove outros nem vira dono', async () => {
    await seedGrupo(false);
    const ref = doc(db(BOB), 'grupos_familia', GID);
    await assertFails(updateDoc(ref, { donoUid: BOB }));
    await assertFails(updateDoc(ref, { membroUids: [BOB], membros: [membro(BOB)] }));
    await assertSucceeds(updateDoc(ref, { membroUids: [ALICE], membros: [membro(ALICE, 'dono')] }));
  });

  it('só o dono troca o código e cria convites', async () => {
    await seedGrupo(false);
    await assertFails(updateDoc(doc(db(BOB), 'grupos_familia', GID), { codigoConvite: 'NOVO' }));
    await assertSucceeds(updateDoc(doc(db(ALICE), 'grupos_familia', GID), { codigoConvite: 'NOVO' }));
    await assertFails(setDoc(doc(db(BOB), 'convites_familia', 'NOVO'), { grupoId: GID, nomeGrupo: 'Casa' }));
    await assertSucceeds(setDoc(doc(db(ALICE), 'convites_familia', 'NOVO'), { grupoId: GID, nomeGrupo: 'Casa' }));
  });
});

describe('ranking e cache', () => {
  it('ranking: lê logado, escreve só o próprio com XP limitado', async () => {
    await assertSucceeds(setDoc(doc(db(ALICE), 'ranking_educacao', ALICE), { uid: ALICE, nome: 'Alice', xp: 100, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db(EVE), 'ranking_educacao', ALICE), { uid: ALICE, nome: 'x', xp: 0, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db(ALICE), 'ranking_educacao', ALICE), { xp: 1000000 }));
    await assertSucceeds(getDocs(collection(db(EVE), 'ranking_educacao')));
    await assertFails(getDocs(collection(anon(), 'ranking_educacao')));
  });

  it('ninguém escreve no cache de notícias', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'noticias_cache', 'clima'), { noticias: [], cachadoEm: 0 }));
  });

  it('coleções desconhecidas são negadas', async () => {
    await assertFails(setDoc(doc(db(ALICE), 'qualquer', 'x'), { a: 1 }));
  });
});
