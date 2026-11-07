import React from 'react';
import { auth, db } from '../../../services/firebase';
import { LIMITES, limitarPontosHabito, limparTexto } from '../../../services/validacao';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useNotificacoes } from '../../contexts/NotificacoesPage';
import type { Categoria, DadosUsuarioHabitos, Desafio, Habito, ProgressoDesafio, ProgressoHabito } from './tipos';
import { HABITOS_PREDEFINIDOS, hoje, ultimos7Dias } from './dados';
import { bonusDosMarcos, marcosAlcancados, ofensivaAposMarcar, ofensivaAtual, ofensivaEmRisco, proximoMarco } from './ofensiva';

export function useHabitos() {
  const { recarregar: recarregarNotifs } = useNotificacoes();

  const [activeTab, setActiveTab] = React.useState<'habitos' | 'desafios' | 'ranking'>('habitos');
  const [dados, setDados] = React.useState<DadosUsuarioHabitos | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState<string | null>(null);

  const [modalHabito, setModalHabito] = React.useState(false);
  const [habitoDetalhe, setHabitoDetalhe] = React.useState<Habito | null>(null);

  const [novoTitulo, setNovoTitulo] = React.useState('');
  const [novaCategoria, setNovaCategoria] = React.useState<Categoria>('Geral');
  const [novoPontos, setNovoPontos] = React.useState('20');

  const [marcoRecente, setMarcoRecente] = React.useState<{ dias: number; xp: number } | null>(null);

  const [rankingFamilia, setRankingFamilia] = React.useState<{ nome: string; xp: number; uid: string }[]>([]);

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
            try {
              const membroHabitosSnap = await getDoc(doc(db, 'habitos_usuarios', membro.uid));

              return {
                uid: membro.uid,
                nome: membro.nome || membro.email || 'Usuário',
                xp: membroHabitosSnap.exists() ? membroHabitosSnap.data().xpHabitos || 0 : 0,
              };
            } catch {
              return {
                uid: membro.uid,
                nome: membro.nome || membro.email || 'Usuário',
                xp: 0,
              };
            }
          })
        );

        setRankingFamilia(ranking.sort((a, b) => b.xp - a.xp));
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
