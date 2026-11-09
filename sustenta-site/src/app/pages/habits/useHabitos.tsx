import React from 'react';
import { auth, db } from '../../../services/firebase';
import { LIMITES, limitarPontosHabito, limparTexto } from '../../../services/validacao';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useNotificacoes } from '../../contexts/NotificacoesPage';
import type { Categoria, DadosUsuarioHabitos, Desafio, Habito, ProgressoDesafio, ProgressoHabito } from './tipos';
import { HABITOS_PREDEFINIDOS, hoje, ultimos7Dias } from './dados';
import { MIN_MEMBROS_MISSAO, calcularMissoes, diasDaSemana, inicioDaSemana, podeResgatar, resgatadasDaSemana } from './missoesFamilia';
import { TAMANHO_LIGA, entrarNaLiga as novoEstadoLiga, montarLiga, nomeAbreviado, renovarLiga, xpDaSemana } from './liga';
import type { EntradaLiga } from './liga';
import type { MembroHabitosResumo, MissaoFamilia } from './missoesFamilia';
import { dicasDoDia, respostasDeHoje, transicaoDica, resumoDoDia } from './dicas';
import type { Dica, RespostaDica } from './dicas';
import { bonusDosMarcos, marcosAlcancados, ofensivaAposMarcar, ofensivaAtual, ofensivaEmRisco, proximoMarco } from './ofensiva';

/** Só o que as missões da família precisam saber dos hábitos de um membro. */
function resumirHabitos(uid: string, nome: string, d: Partial<DadosUsuarioHabitos>): MembroHabitosResumo {
  return {
    uid,
    nome,
    streak: d.streak || 0,
    ultimoRegistro: d.ultimoRegistro || '',
    progressoHabitos: (d.progressoHabitos || []).map((p) => ({ habitoId: p.habitoId, data: p.data })),
    habitosPersonalizados: (d.habitosPersonalizados || []).map((h) => ({ id: h.id, categoria: h.categoria })),
  };
}

export function useHabitos() {
  const { recarregar: recarregarNotifs } = useNotificacoes();

  const [activeTab, setActiveTab] = React.useState<'habitos' | 'desafios' | 'dicas' | 'ranking' | 'liga'>('habitos');
  const [dados, setDados] = React.useState<DadosUsuarioHabitos | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState<string | null>(null);

  const [modalHabito, setModalHabito] = React.useState(false);
  const [habitoDetalhe, setHabitoDetalhe] = React.useState<Habito | null>(null);

  const [novoTitulo, setNovoTitulo] = React.useState('');
  const [novaCategoria, setNovaCategoria] = React.useState<Categoria>('Geral');
  const [novoPontos, setNovoPontos] = React.useState('20');

  const [marcoRecente, setMarcoRecente] = React.useState<{ dias: number; xp: number } | null>(null);

  const [rankingCarregado, setRankingFamilia] = React.useState<{ nome: string; xp: number; uid: string }[]>([]);
  const [membrosFamilia, setMembrosFamilia] = React.useState<MembroHabitosResumo[]>([]);

  const [nomePerfil, setNomePerfil] = React.useState('');
  const [ligaEntradas, setLigaEntradas] = React.useState<EntradaLiga[]>([]);
  const [ligaCarregando, setLigaCarregando] = React.useState(false);
  const [ligaErro, setLigaErro] = React.useState(false);
  // Última versão enviada ao ranking público (evita gravar de novo o mesmo valor).
  const ligaEnviada = React.useRef('');

  React.useEffect(() => {
    const fetchDados = async () => {
      const user = auth.currentUser;

      if (!user) {
        setCarregando(false);
        return;
      }

      setCarregando(true);

      try {
        const habitosRef = doc(db, 'habitos_usuarios', user.uid);
        const habitosSnap = await getDoc(habitosRef);

        let dadosUsuario: DadosUsuarioHabitos;

        if (habitosSnap.exists()) {
          dadosUsuario = habitosSnap.data() as DadosUsuarioHabitos;
        } else {
          dadosUsuario = {
            uid: user.uid,
            streak: 0,
            ultimoRegistro: '',
            diasAtivos: [],
            habitosPersonalizados: [],
            progressoHabitos: [],
            progressoDesafios: [],
            xpHabitos: 0,
          };

          await setDoc(habitosRef, dadosUsuario, { merge: true });
        }

        setDados(dadosUsuario);

        const usuarioSnap = await getDoc(doc(db, 'usuarios', user.uid));

        if (!usuarioSnap.exists()) {
          setRankingFamilia([]);
          return;
        }

        const usuarioData = usuarioSnap.data();
        setNomePerfil(typeof usuarioData?.nome === 'string' ? usuarioData.nome : '');
        const grupoId = usuarioData?.grupoFamiliaId;

        if (!grupoId) {
          setRankingFamilia([]);
          return;
        }

        const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));

        if (!grupoSnap.exists()) {
          setRankingFamilia([]);
          return;
        }

        const grupoData = grupoSnap.data();
        const membros = grupoData?.membros || [];

        if (!Array.isArray(membros) || membros.length === 0) {
          setRankingFamilia([]);
          return;
        }

        const ranking = await Promise.all(
          membros.map(async (membro: any) => {
            const nome = membro.nome || membro.email || 'Usuário';
            try {
              const membroHabitosSnap = await getDoc(doc(db, 'habitos_usuarios', membro.uid));
              const dm = (membroHabitosSnap.exists() ? membroHabitosSnap.data() : {}) as Partial<DadosUsuarioHabitos>;

              return {
                uid: membro.uid,
                nome,
                xp: dm.xpHabitos || 0,
                resumo: resumirHabitos(membro.uid, nome, dm),
              };
            } catch {
              return { uid: membro.uid, nome, xp: 0, resumo: resumirHabitos(membro.uid, nome, {}) };
            }
          })
        );

        setMembrosFamilia(ranking.map((r) => r.resumo));
        setRankingFamilia(ranking.map(({ uid, nome, xp }) => ({ uid, nome, xp })).sort((a, b) => b.xp - a.xp));
      } catch (e) {
        console.error('Erro ao carregar hábitos e ranking familiar:', e);
        setRankingFamilia([]);
      } finally {
        setCarregando(false);
      }
    };

    fetchDados();
  }, []);

  const marcarHabito = async (habito: Habito) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    const dataHoje = hoje();

    const jaFeito = dados.progressoHabitos.some(
      (p) => p.habitoId === habito.id && p.data === dataHoje
    );

    if (jaFeito) return;

    setSalvando(habito.id);

    const novoProgresso: ProgressoHabito = {
      habitoId: habito.id,
      data: dataHoje,
      xpGanho: habito.pontos,
    };

    const streakAnterior = ofensivaAtual(dados.streak || 0, dados.ultimoRegistro, dataHoje);
    const streakAtual = ofensivaAposMarcar(dados.streak || 0, dados.ultimoRegistro, dataHoje);
    const marcos = marcosAlcancados(streakAnterior, streakAtual);
    const bonus = bonusDosMarcos(streakAnterior, streakAtual);

    const diasAtivosNovos = [...new Set([...dados.diasAtivos, dataHoje])].slice(-7);
    const novoXP = (dados.xpHabitos || 0) + habito.pontos + bonus;

    const dadosAtualizados: DadosUsuarioHabitos = {
      ...dados,
      progressoHabitos: [...dados.progressoHabitos, novoProgresso],
      streak: streakAtual,
      maiorStreak: Math.max(dados.maiorStreak || 0, streakAtual),
      ultimoRegistro: dataHoje,
      diasAtivos: diasAtivosNovos,
      xpHabitos: novoXP,
    };

    try {
      setDados(dadosAtualizados);

      await setDoc(doc(db, 'habitos_usuarios', user.uid), dadosAtualizados, {
        merge: true,
      });

      try {
        const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
        const xpAtual = userSnap.data()?.xpHabitos || 0;

        await setDoc(
          doc(db, 'usuarios', user.uid),
          { xpHabitos: xpAtual + habito.pontos + bonus },
          { merge: true }
        );
      } catch (erroPerfil) {
        console.warn('XP do perfil não foi atualizado, mas o hábito foi salvo:', erroPerfil);
      }

      if (marcos.length > 0) {
        setMarcoRecente({ dias: marcos[marcos.length - 1].dias, xp: bonus });
      }

      recarregarNotifs();
    } catch (e) {
      console.error('Erro ao marcar hábito:', e);
      setDados(dados);
    } finally {
      setSalvando(null);
    }
  };

  const desmarcarHabito = async (habito: Habito) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    const dataHoje = hoje();

    const progresso = dados.progressoHabitos.find(
      (p) => p.habitoId === habito.id && p.data === dataHoje
    );

    if (!progresso) return;

    setSalvando(habito.id);

    const novoProgresso = dados.progressoHabitos.filter(
      (p) => !(p.habitoId === habito.id && p.data === dataHoje)
    );

    const novoXP = Math.max(0, (dados.xpHabitos || 0) - habito.pontos);

    const dadosAtualizados: DadosUsuarioHabitos = {
      ...dados,
      progressoHabitos: novoProgresso,
      xpHabitos: novoXP,
    };

    try {
      setDados(dadosAtualizados);

      await setDoc(doc(db, 'habitos_usuarios', user.uid), dadosAtualizados, {
        merge: true,
      });

      try {
        const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
        const xpAtual = userSnap.data()?.xpHabitos || 0;

        await setDoc(
          doc(db, 'usuarios', user.uid),
          { xpHabitos: Math.max(0, xpAtual - habito.pontos) },
          { merge: true }
        );
      } catch (erroPerfil) {
        console.warn('XP do perfil não foi atualizado, mas o hábito foi desmarcado:', erroPerfil);
      }
    } catch (e) {
      console.error('Erro ao desmarcar hábito:', e);
      setDados(dados);
    } finally {
      setSalvando(null);
    }
  };

  const alternarHabito = (habito: Habito, feito: boolean) => {
    if (salvando === habito.id) return;
    feito ? desmarcarHabito(habito) : marcarHabito(habito);
  };

  const participarDesafio = async (desafio: Desafio) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    setSalvando(desafio.id);

    try {
      const jaExiste = dados.progressoDesafios.find((p) => p.desafioId === desafio.id);
      if (jaExiste) return;

      const novoProgresso: ProgressoDesafio = {
        desafioId: desafio.id,
        progresso: 0,
        iniciado: hoje(),
        concluido: false,
        xpGanho: 0,
      };

      const novosDesafios = [...dados.progressoDesafios, novoProgresso];

      await setDoc(
        doc(db, 'habitos_usuarios', user.uid),
        { progressoDesafios: novosDesafios },
        { merge: true }
      );

      setDados((prev) => (prev ? { ...prev, progressoDesafios: novosDesafios } : prev));
    } catch (e) {
      console.error('Erro ao participar do desafio:', e);
    } finally {
      setSalvando(null);
    }
  };

  const avancarDesafio = async (desafio: Desafio) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    setSalvando(desafio.id);

    try {
      const progAtual = dados.progressoDesafios.find((p) => p.desafioId === desafio.id);
      if (!progAtual || progAtual.concluido) return;

      const novoProgresso = Math.min(
        100,
        progAtual.progresso + Math.round(100 / desafio.duracaoDias)
      );

      const concluido = novoProgresso >= 100;
      const xpGanho = concluido ? desafio.recompensa : 0;

      const novosDesafios = dados.progressoDesafios.map((p) =>
        p.desafioId === desafio.id
          ? { ...p, progresso: novoProgresso, concluido, xpGanho }
          : p
      );

      await setDoc(
        doc(db, 'habitos_usuarios', user.uid),
        {
          progressoDesafios: novosDesafios,
          xpHabitos: (dados.xpHabitos || 0) + xpGanho,
        },
        { merge: true }
      );

      setDados((prev) =>
        prev
          ? {
              ...prev,
              progressoDesafios: novosDesafios,
              xpHabitos: (prev.xpHabitos || 0) + xpGanho,
            }
          : prev
      );

      if (concluido) recarregarNotifs();
    } catch (e) {
      console.error('Erro ao avançar desafio:', e);
    } finally {
      setSalvando(null);
    }
  };

  const responderDica = async (dica: Dica, resposta: RespostaDica) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    const dataHoje = hoje();
    const atuais = respostasDeHoje(dados.dicasDoDia, dataHoje);
    const { permitida, xp } = transicaoDica(atuais[dica.id], resposta, dica.esforco);
    if (!permitida) return;

    setSalvando(`dica:${dica.id}`);

    const novasDicas = { data: dataHoje, respostas: { ...atuais, [dica.id]: resposta } };
    const novoXP = (dados.xpHabitos || 0) + xp;

    try {
      await setDoc(
        doc(db, 'habitos_usuarios', user.uid),
        { dicasDoDia: novasDicas, xpHabitos: novoXP },
        { merge: true }
      );

      setDados((prev) => (prev ? { ...prev, dicasDoDia: novasDicas, xpHabitos: novoXP } : prev));

      if (xp > 0) {
        try {
          const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
          const xpAtual = userSnap.data()?.xpHabitos || 0;
          await setDoc(doc(db, 'usuarios', user.uid), { xpHabitos: xpAtual + xp }, { merge: true });
        } catch (erroPerfil) {
          console.warn('XP do perfil não foi atualizado, mas a dica foi salva:', erroPerfil);
        }
      }
    } catch (e) {
      console.error('Erro ao responder dica:', e);
    } finally {
      setSalvando(null);
    }
  };

  const resgatarMissao = async (missao: MissaoFamilia) => {
    const user = auth.currentUser;
    if (!user || !dados || !semanaFamilia) return;

    const resgatadas = resgatadasDaSemana(dados.missoesFamilia, semanaFamilia.semana);
    if (!podeResgatar(missao, resgatadas)) return;

    setSalvando(`missao:${missao.id}`);

    const novoRegistro = { semana: semanaFamilia.semana, resgatadas: [...resgatadas, missao.id] };
    const novoXP = (dados.xpHabitos || 0) + missao.xp;

    try {
      await setDoc(
        doc(db, 'habitos_usuarios', user.uid),
        { missoesFamilia: novoRegistro, xpHabitos: novoXP },
        { merge: true }
      );

      setDados((prev) => (prev ? { ...prev, missoesFamilia: novoRegistro, xpHabitos: novoXP } : prev));

      try {
        const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
        const xpAtual = userSnap.data()?.xpHabitos || 0;
        await setDoc(doc(db, 'usuarios', user.uid), { xpHabitos: xpAtual + missao.xp }, { merge: true });
      } catch (erroPerfil) {
        console.warn('XP do perfil não foi atualizado, mas a missão foi resgatada:', erroPerfil);
      }
    } catch (e) {
      console.error('Erro ao resgatar missão da família:', e);
    } finally {
      setSalvando(null);
    }
  };

  const entrarNaLiga = async () => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    setSalvando('liga');

    const liga = novoEstadoLiga(inicioDaSemana(hoje()), dados.xpHabitos || 0);

    try {
      await setDoc(doc(db, 'habitos_usuarios', user.uid), { liga }, { merge: true });
      setDados((prev) => (prev ? { ...prev, liga } : prev));
    } catch (e) {
      console.error('Erro ao entrar na liga:', e);
    } finally {
      setSalvando(null);
    }
  };

  const sairDaLiga = async () => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    setSalvando('liga');

    const liga = { participa: false, semana: inicioDaSemana(hoje()), base: 0 };

    try {
      await setDoc(doc(db, 'habitos_usuarios', user.uid), { liga }, { merge: true });
      // Sair apaga o nome e o XP do ranking público.
      await deleteDoc(doc(db, 'ranking_semanal', user.uid));
      ligaEnviada.current = '';
      setDados((prev) => (prev ? { ...prev, liga } : prev));
      setLigaEntradas((prev) => prev.filter((e) => e.uid !== user.uid));
    } catch (e) {
      console.error('Erro ao sair da liga:', e);
    } finally {
      setSalvando(null);
    }
  };

  const criarHabito = async () => {
    if (!novoTitulo.trim()) return;

    const user = auth.currentUser;
    if (!user || !dados) return;

    setSalvando('novo');

    try {
      const novoHabito: Habito = {
        id: `custom_${Date.now()}`,
        titulo: limparTexto(novoTitulo, LIMITES.tituloHabito),
        categoria: novaCategoria,
        // Limita os pontos de hábitos criados pelo usuário (evita XP infinito).
        pontos: limitarPontosHabito(parseInt(novoPontos)),
        personalizado: true,
      };

      const novosPersonalizados = [...dados.habitosPersonalizados, novoHabito];

      await setDoc(
        doc(db, 'habitos_usuarios', user.uid),
        { habitosPersonalizados: novosPersonalizados },
        { merge: true }
      );

      setDados((prev) =>
        prev ? { ...prev, habitosPersonalizados: novosPersonalizados } : prev
      );

      setNovoTitulo('');
      setNovaCategoria('Geral');
      setNovoPontos('20');
      setModalHabito(false);
    } catch (e) {
      console.error('Erro ao criar hábito:', e);
    } finally {
      setSalvando(null);
    }
  };

  const deletarHabito = async (id: string) => {
    const user = auth.currentUser;
    if (!user || !dados) return;

    const novos = dados.habitosPersonalizados.filter((h) => h.id !== id);

    await updateDoc(doc(db, 'habitos_usuarios', user.uid), {
      habitosPersonalizados: novos,
    });

    setDados((prev) => (prev ? { ...prev, habitosPersonalizados: novos } : prev));
    setHabitoDetalhe(null);
  };

  const todosHabitos = [...HABITOS_PREDEFINIDOS, ...(dados?.habitosPersonalizados || [])];
  const dataHoje = hoje();

  const feitos = todosHabitos.filter((h) =>
    dados?.progressoHabitos.some((p) => p.habitoId === h.id && p.data === dataHoje)
  );

  const concluidos = feitos.length;
  const total = todosHabitos.length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const dias7 = ultimos7Dias();
  // A sequência guardada só muda ao marcar um hábito; a que vale hoje considera os dias sem marcar.
  const streak = ofensivaAtual(dados?.streak || 0, dados?.ultimoRegistro || '', dataHoje);
  const melhorStreak = Math.max(dados?.maiorStreak || 0, streak);
  const streakEmRisco = ofensivaEmRisco(dados?.streak || 0, dados?.ultimoRegistro || '', dataHoje);
  const marcoSeguinte = proximoMarco(streak);
  const xpHabitos = dados?.xpHabitos || 0;

  // Missões da família: o seu próprio progresso vem do estado local (atualiza na hora ao marcar um hábito).
  const meuUid = auth.currentUser?.uid;
  const membrosMissao = membrosFamilia.map((m) =>
    dados && m.uid === meuUid ? resumirHabitos(m.uid, m.nome, dados) : m
  );
  // O ranking mostra o seu XP atual (o carregado no início fica velho ao marcar hábitos, dicas ou missões).
  const rankingFamilia = rankingCarregado
    .map((r) => (r.uid === meuUid && dados ? { ...r, xp: dados.xpHabitos || 0 } : r))
    .sort((a, b) => b.xp - a.xp);
  const semanaFamilia = membrosMissao.length >= MIN_MEMBROS_MISSAO ? calcularMissoes(membrosMissao, dataHoje) : null;
  const missoesResgatadas = semanaFamilia ? resgatadasDaSemana(dados?.missoesFamilia, semanaFamilia.semana) : [];

  // Liga semanal: o XP da semana é o XP atual menos o que você tinha na segunda-feira.
  const semanaLiga = inicioDaSemana(dataHoje);
  const participaLiga = !!dados?.liga?.participa;
  const baseLiga = dados?.liga?.base || 0;
  const semanaGuardadaLiga = dados?.liga?.semana || '';
  const xpSemanaLiga = participaLiga ? xpDaSemana(xpHabitos, baseLiga) : 0;
  const nomeLiga = nomeAbreviado(nomePerfil || auth.currentUser?.displayName);
  const diasRestantesLiga = 7 - Math.max(0, diasDaSemana(semanaLiga).indexOf(dataHoje));
  // A sua linha usa o XP de agora (o ranking carregado pode estar um passo atrás).
  const entradasLiga = montarLiga(
    [
      ...ligaEntradas.filter((e) => !(participaLiga && e.uid === meuUid)),
      ...(participaLiga && meuUid ? [{ uid: meuUid, nome: nomeLiga, semana: semanaLiga, xp: xpSemanaLiga }] : []),
    ],
    semanaLiga,
    TAMANHO_LIGA
  );
  const minhaPosicaoLiga = entradasLiga.find((e) => e.uid === meuUid)?.posicao ?? null;

  const verLiga = activeTab === 'liga';
  React.useEffect(() => {
    const user = auth.currentUser;
    if (!user || carregando) return;
    const sincroniza = participaLiga && semanaGuardadaLiga === semanaLiga;
    // Semana nova: a liga zera na segunda-feira, então anota de novo o XP de partida.
    const precisaRenovar = participaLiga && semanaGuardadaLiga !== semanaLiga;
    if (!sincroniza && !precisaRenovar && !verLiga) return;

    let cancelado = false;

    const executar = async () => {
      if (precisaRenovar) {
        const renovada = renovarLiga({ participa: true, semana: semanaGuardadaLiga, base: baseLiga }, semanaLiga, xpHabitos);
        if (!renovada) return;
        try {
          await setDoc(doc(db, 'habitos_usuarios', user.uid), { liga: renovada }, { merge: true });
          if (!cancelado) setDados((prev) => (prev ? { ...prev, liga: renovada } : prev));
        } catch (e) {
          console.warn('Não foi possível renovar a liga:', e);
        }
        return;
      }

      if (sincroniza) {
        const chave = `${semanaLiga}|${nomeLiga}|${xpSemanaLiga}`;
        if (ligaEnviada.current !== chave) {
          try {
            await setDoc(doc(db, 'ranking_semanal', user.uid), {
              uid: user.uid,
              nome: nomeLiga,
              semana: semanaLiga,
              xp: xpSemanaLiga,
              updatedAt: serverTimestamp(),
            });
            ligaEnviada.current = chave;
          } catch (e) {
            console.warn('Não foi possível atualizar a liga:', e);
          }
        }
      }

      if (!verLiga || cancelado) return;

      setLigaCarregando(true);
      setLigaErro(false);
      try {
        const colecao = collection(db, 'ranking_semanal');
        let snap;
        try {
          snap = await getDocs(query(colecao, where('semana', '==', semanaLiga), orderBy('xp', 'desc'), limit(TAMANHO_LIGA)));
        } catch (e) {
          // Sem o índice composto publicado: busca sem ordenar e ordena aqui.
          console.warn('Índice da liga indisponível, ordenando no app:', e);
          snap = await getDocs(query(colecao, where('semana', '==', semanaLiga), limit(100)));
        }
        if (!cancelado) setLigaEntradas(snap.docs.map((d) => d.data() as EntradaLiga));
      } catch (e) {
        console.error('Erro ao carregar a liga:', e);
        if (!cancelado) setLigaErro(true);
      } finally {
        if (!cancelado) setLigaCarregando(false);
      }
    };

    executar();
    return () => {
      cancelado = true;
    };
  }, [carregando, participaLiga, semanaGuardadaLiga, semanaLiga, baseLiga, xpHabitos, nomeLiga, xpSemanaLiga, verLiga]);

  const dicasHoje = dicasDoDia(dataHoje);
  const respostasDicas = respostasDeHoje(dados?.dicasDoDia, dataHoje);
  const resumoDicas = resumoDoDia(dicasHoje, respostasDicas);

  return {
    recarregarNotifs,
    activeTab,
    setActiveTab,
    dados,
    setDados,
    carregando,
    setCarregando,
    salvando,
    setSalvando,
    modalHabito,
    setModalHabito,
    habitoDetalhe,
    setHabitoDetalhe,
    novoTitulo,
    setNovoTitulo,
    novaCategoria,
    setNovaCategoria,
    novoPontos,
    setNovoPontos,
    rankingFamilia,
    setRankingFamilia,
    marcarHabito,
    desmarcarHabito,
    alternarHabito,
    participarDesafio,
    avancarDesafio,
    responderDica,
    semanaFamilia,
    missoesResgatadas,
    resgatarMissao,
    membrosFamilia,
    liga: {
      participa: participaLiga,
      semana: semanaLiga,
      diasRestantes: diasRestantesLiga,
      entradas: entradasLiga,
      minhaPosicao: minhaPosicaoLiga,
      xpSemana: xpSemanaLiga,
      nome: nomeLiga,
      carregando: ligaCarregando,
      erro: ligaErro,
    },
    entrarNaLiga,
    sairDaLiga,
    dicasHoje,
    respostasDicas,
    resumoDicas,
    criarHabito,
    deletarHabito,
    todosHabitos,
    dataHoje,
    feitos,
    concluidos,
    total,
    percentual,
    dias7,
    streak,
    melhorStreak,
    streakEmRisco,
    marcoSeguinte,
    marcoRecente,
    setMarcoRecente,
    xpHabitos,
  };
}

export type HabitosCtx = ReturnType<typeof useHabitos>;
