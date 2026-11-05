import { auth, db } from '../../../services/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { calcularNivel } from '../../../services/consumo';
import { type MembroFamilia } from '../../../services/familia';
import type { MembroFamiliaDetalhado, UsuarioData } from './tipos';


export async function buscarRegistrosPorUid(uid: string) {
  const q = query(collection(db, 'registros'), where('uid', '==', uid));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      categoria: data.categoria || '',
      valor: Number(data.valor || 0),
      mes: data.mes || '',
    };
  });
}


export async function buscarDadosMembro(membro: MembroFamilia): Promise<MembroFamiliaDetalhado> {
  const uidAtual = auth.currentUser?.uid;
  const ehMeuUsuario = uidAtual === membro.uid;

  let permissoes = {
    gastos: false,
    nivel: true,
    conquistas: false,
  };

  let nome = membro.nome;
  let email = membro.email;
  let xpHabitos = membro.xp || 0;

  try {
    const usuarioSnap = await getDoc(doc(db, 'usuarios', membro.uid));

    if (usuarioSnap.exists()) {
      const usuario = usuarioSnap.data() as UsuarioData;
      nome = usuario.nome || nome;
      email = usuario.email || email;
      xpHabitos = usuario.xpHabitos ?? xpHabitos;
      permissoes = usuario.dadosCompartilhados || permissoes;
    }
  } catch {
    // Se a regra do Firestore não permitir ler usuarios de outros membros, segue com os dados básicos do grupo.
  }

  const podeVerGastos = ehMeuUsuario || permissoes.gastos;
  const podeVerNivel = ehMeuUsuario || permissoes.nivel;
  const podeVerConquistas = ehMeuUsuario || permissoes.conquistas;

  let totalGasto = 0;
  let energiaTotal = 0;
  let aguaTotal = 0;
  let totalRegistros = 0;

  if (podeVerGastos || podeVerNivel || podeVerConquistas) {
    try {
      const registros = await buscarRegistrosPorUid(membro.uid);
      totalRegistros = registros.length;
      totalGasto = registros.reduce((s, r) => s + r.valor, 0);
      energiaTotal = registros
        .filter((r) => r.categoria === 'energia')
        .reduce((s, r) => s + r.valor, 0);
      aguaTotal = registros
        .filter((r) => r.categoria === 'agua')
        .reduce((s, r) => s + r.valor, 0);
    } catch {
      // Se registros de outros membros estiverem bloqueados nas regras, os campos ficam ocultos/zerados.
    }
  }

  const nivelInfo = calcularNivel(totalRegistros || Math.floor(xpHabitos / 100));
  const conquistas = [totalRegistros >= 1, totalRegistros >= 5, energiaTotal > 0, aguaTotal > 0].filter(Boolean).length;

  return {
    ...membro,
    nome,
    email,
    xp: xpHabitos || totalRegistros * 100,
    dados: {
      totalGasto: podeVerGastos ? totalGasto : undefined,
      energiaTotal: podeVerGastos ? energiaTotal : undefined,
      aguaTotal: podeVerGastos ? aguaTotal : undefined,
      nivel: podeVerNivel ? nivelInfo.nivel : undefined,
      nomeNivel: podeVerNivel ? nivelInfo.nome : undefined,
      xpTotal: podeVerNivel ? xpHabitos || totalRegistros * 100 : undefined,
      conquistas: podeVerConquistas ? conquistas : undefined,
      podeVerGastos,
      podeVerNivel,
      podeVerConquistas,
    },
  };
}
