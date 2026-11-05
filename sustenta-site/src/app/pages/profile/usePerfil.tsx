import React from 'react';
import { auth, db } from '../../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification, reload } from 'firebase/auth';
import { buscarTodosRegistros, calcularNivel } from '../../../services/consumo';
import { useTheme } from '../../contexts/ThemeContext';
import { criarGrupo, buscarMeuGrupo, entrarNoGrupo, removerMembro, regenerarCodigo, montarLinkConvite } from '../../../services/familia';
import { excluirConta, exportarMeusDados } from '../../../services/conta';
import { LIMITES, limparTexto, validarSenha } from '../../../services/validacao';
import type { EstatisticasData, GrupoFamiliaDetalhado, UsuarioData } from './tipos';
import { NIVEIS_CORES, formatarMesAno } from './auxiliares';
import { buscarDadosMembro } from './membros';

export function usePerfil() {
  const { darkMode, toggleDarkMode } = useTheme();

  const [activeTab, setActiveTab] = React.useState<'perfil' | 'familia' | 'config'>('perfil');
  const [usuario, setUsuario] = React.useState<UsuarioData | null>(null);
  const [estatisticas, setEstatisticas] = React.useState<EstatisticasData | null>(null);
  const [carregando, setCarregando] = React.useState(true);

  const [grupo, setGrupo] = React.useState<GrupoFamiliaDetalhado | null>(null);
  const [carregandoGrupo, setCarregandoGrupo] = React.useState(false);
  const [codigoEntrada, setCodigoEntrada] = React.useState('');
  const [nomeNovoGrupo, setNomeNovoGrupo] = React.useState('');
  const [linkCopiado, setLinkCopiado] = React.useState(false);
  const [modalConvite, setModalConvite] = React.useState(false);

  const [modalAberto, setModalAberto] = React.useState<'dados' | 'localizacao' | 'senha' | null>(null);
  const [formNome, setFormNome] = React.useState('');
  const [formTelefone, setFormTelefone] = React.useState('');
  const [formEstado, setFormEstado] = React.useState('');
  const [formCidade, setFormCidade] = React.useState('');
  const [senhaAtual, setSenhaAtual] = React.useState('');
  const [novaSenha, setNovaSenha] = React.useState('');
  const [confirmarSenha, setConfirmarSenha] = React.useState('');

  const [salvando, setSalvando] = React.useState(false);
  const [sucesso, setSucesso] = React.useState('');
  const [erro, setErro] = React.useState('');

  const [toggleNotif, setToggleNotif] = React.useState(true);

  const [emailVerificado, setEmailVerificado] = React.useState(false);
  const [modal2FA, setModal2FA] = React.useState(false);
  const [modalExcluir, setModalExcluir] = React.useState(false);
  const [senhaExclusao, setSenhaExclusao] = React.useState('');
  const [confirmacaoExclusao, setConfirmacaoExclusao] = React.useState('');
  const [excluindo, setExcluindo] = React.useState(false);
  const [enviando2FA, setEnviando2FA] = React.useState(false);
  const [verificando2FA, setVerificando2FA] = React.useState(false);
  const [linkEnviado, setLinkEnviado] = React.useState(false);

  const [modalDados, setModalDados] = React.useState(false);
  const [salvandoDados, setSalvandoDados] = React.useState(false);
  const [dadosCompartilhados, setDadosCompartilhados] = React.useState({
    gastos: true,
    nivel: true,
    conquistas: true,
  });

  const ok = (msg: string) => {
    setSucesso(msg);
    setErro('');
    setTimeout(() => setSucesso(''), 3500);
  };

  const err = (msg: string) => {
    setErro(msg);
    setSucesso('');
  };

  const carregarGrupo = React.useCallback(async () => {
    setCarregandoGrupo(true);

    try {
      const grupoBase = await buscarMeuGrupo();

      if (!grupoBase) {
        setGrupo(null);
        return;
      }

      const membrosDetalhados = await Promise.all(
        grupoBase.membros.map((membro) => buscarDadosMembro(membro))
      );

      setGrupo({
        ...grupoBase,
        membros: membrosDetalhados,
      });
    } catch (e) {
      console.error('Erro ao carregar grupo:', e);
      setGrupo(null);
    } finally {
      setCarregandoGrupo(false);
    }
  }, []);

  React.useEffect(() => {
    const fetchDados = async () => {
      const user = auth.currentUser;

      if (!user) {
        setCarregando(false);
        return;
      }

      try {
        await reload(user);
        setEmailVerificado(user.emailVerified);

        const snap = await getDoc(doc(db, 'usuarios', user.uid));

        if (snap.exists()) {
          const data = snap.data() as UsuarioData;
          setUsuario(data);
          setFormNome(data.nome || '');
          setFormTelefone(data.telefone || '');
          setFormEstado(data.estado || '');
          setFormCidade(data.cidade || '');

          if (data.dadosCompartilhados) {
            setDadosCompartilhados(data.dadosCompartilhados);
          }
        }

        const registros = await buscarTodosRegistros();
        const meses = new Set(registros.map((r) => r.mes)).size;

        setEstatisticas({
          totalRegistros: registros.length,
          totalGasto: registros.reduce((s, r) => s + r.valor, 0),
          energiaTotal: registros
            .filter((r) => r.categoria === 'energia')
            .reduce((s, r) => s + r.valor, 0),
          aguaTotal: registros
            .filter((r) => r.categoria === 'agua')
            .reduce((s, r) => s + r.valor, 0),
          mesesAtivos: meses,
        });
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      } finally {
        setCarregando(false);
      }
    };

    fetchDados();
  }, []);

  React.useEffect(() => {
    if (activeTab === 'familia') carregarGrupo();
  }, [activeTab, carregarGrupo]);

  const fecharModal = () => {
    if (usuario) {
      setFormNome(usuario.nome || '');
      setFormTelefone(usuario.telefone || '');
      setFormEstado(usuario.estado || '');
      setFormCidade(usuario.cidade || '');
    }

    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    setModalAberto(null);
    setErro('');
  };

  const salvarDados = async () => {
    if (!formNome.trim()) {
      err('Informe seu nome.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSalvando(true);

    try {
      const nome = limparTexto(formNome, LIMITES.nome);
      const telefone = limparTexto(formTelefone, LIMITES.telefone);

      await updateDoc(doc(db, 'usuarios', user.uid), { nome, telefone });

      setUsuario((p) => (p ? { ...p, nome, telefone } : p));
      fecharModal();
      ok('Dados atualizados!');
    } catch {
      err('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarLocalizacao = async () => {
    if (!formEstado) {
      err('Selecione seu estado.');
      return;
    }

    if (!formCidade) {
      err('Selecione sua cidade.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSalvando(true);

    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        estado: limparTexto(formEstado, 2).toUpperCase(),
        cidade: limparTexto(formCidade, LIMITES.cidade),
      });

      setUsuario((p) => (p ? { ...p, estado: formEstado, cidade: formCidade } : p));
      fecharModal();
      ok('Localizacao atualizada!');
    } catch {
      err('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarSenha = async () => {
    if (!senhaAtual) {
      err('Informe a senha atual.');
      return;
    }

    const erroSenha = validarSenha(novaSenha);
    if (erroSenha) {
      err(erroSenha);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      err('As senhas nao coincidem.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setSalvando(true);

    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, novaSenha);
      fecharModal();
      ok('Senha alterada com sucesso!');
    } catch {
      err('Senha atual incorreta.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExportarDados = async () => {
    try {
      await exportarMeusDados();
      ok('Arquivo com seus dados gerado!');
    } catch {
      err('Nao foi possivel exportar seus dados.');
    }
  };

  const handleExcluirConta = async () => {
    if (confirmacaoExclusao.trim().toUpperCase() !== 'EXCLUIR') {
      err('Digite EXCLUIR para confirmar.');
      return;
    }

    setExcluindo(true);
    setErro('');

    try {
      await excluirConta(senhaExclusao);
      // onAuthStateChanged leva o usuário de volta ao login.
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') err('Senha incorreta.');
      else if (code === 'auth/popup-closed-by-user') err('Confirmacao cancelada.');
      else err((e as Error)?.message || 'Erro ao excluir a conta. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleEnviarVerificacao = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setEnviando2FA(true);
    setErro('');

    try {
      await sendEmailVerification(user);
      setLinkEnviado(true);
      ok('E-mail de verificacao enviado!');
    } catch {
      err('Erro ao enviar e-mail. Tente novamente em alguns minutos.');
    } finally {
      setEnviando2FA(false);
    }
  };

  const handleVerificarEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setVerificando2FA(true);
    setErro('');

    try {
      await reload(user);

      if (user.emailVerified) {
        setEmailVerificado(true);
        setModal2FA(false);
        setLinkEnviado(false);
        ok('E-mail verificado! Sua conta esta protegida.');
      } else {
        err('E-mail ainda nao confirmado. Verifique sua caixa de entrada e clique no link.');
      }
    } catch {
      err('Erro ao verificar. Tente novamente.');
    } finally {
      setVerificando2FA(false);
    }
  };

  const handleSalvarDados = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSalvandoDados(true);

    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { dadosCompartilhados });
      setUsuario((p) => (p ? { ...p, dadosCompartilhados } : p));
      setModalDados(false);
      ok('Preferencias de compartilhamento salvas!');
      if (activeTab === 'familia') carregarGrupo();
    } catch {
      err('Erro ao salvar preferencias.');
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleCriarGrupo = async () => {
    if (!nomeNovoGrupo.trim()) {
      err('Informe o nome do grupo.');
      return;
    }

    setSalvando(true);

    try {
      await criarGrupo(nomeNovoGrupo.trim());
      setNomeNovoGrupo('');
      await carregarGrupo();
      ok('Grupo familiar criado!');
    } catch (e: any) {
      err(e.message || 'Erro ao criar grupo.');
    } finally {
      setSalvando(false);
    }
  };

  const handleEntrarGrupo = async () => {
    if (!codigoEntrada.trim()) {
      err('Informe o codigo de convite.');
      return;
    }

    setSalvando(true);

    try {
      await entrarNoGrupo(codigoEntrada.trim());
      setCodigoEntrada('');
      await carregarGrupo();
      ok('Voce entrou no grupo!');
    } catch (e: any) {
      err(e.message || 'Codigo invalido.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverMembro = async (membroUid: string) => {
    if (!grupo) return;

    setSalvando(true);

    try {
      await removerMembro(grupo.id, membroUid);
      await carregarGrupo();
      ok('Membro removido.');
    } catch (e: any) {
      err(e.message || 'Erro ao remover membro.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRegenerarCodigo = async () => {
    if (!grupo) return;

    setSalvando(true);

    try {
      const novoCodigo = await regenerarCodigo(grupo.id);
      setGrupo((prev) => (prev ? { ...prev, codigoConvite: novoCodigo } : prev));
      ok('Novo codigo gerado!');
    } catch {
      err('Erro ao gerar codigo.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiarLink = () => {
    if (!grupo) return;

    const link = montarLinkConvite(grupo.codigoConvite);
    navigator.clipboard.writeText(link);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  const nivel = calcularNivel(estatisticas?.totalRegistros ?? 0);
  const xpPercent = Math.round((nivel.xpAtual / nivel.xpTotal) * 100);
  const nivelCor = NIVEIS_CORES[Math.min(nivel.nivel - 1, NIVEIS_CORES.length - 1)];
  const nomeUsuario = usuario?.nome || 'Usuario';
  const xpTotal = (usuario?.xpHabitos || 0) + (estatisticas?.totalRegistros ?? 0) * 100;
  const isDono = grupo?.donoUid === auth.currentUser?.uid;
  const linkConvite = grupo ? montarLinkConvite(grupo.codigoConvite) : '';
  const membrosOrdenados = grupo ? [...grupo.membros].sort((a, b) => b.xp - a.xp) : [];
  const maiorXp = membrosOrdenados[0]?.xp || 0;
  const totalGrupoGasto = grupo?.membros.reduce((s, m) => s + (m.dados?.totalGasto || 0), 0) || 0;
  const totalGrupoEnergia = grupo?.membros.reduce((s, m) => s + (m.dados?.energiaTotal || 0), 0) || 0;
  const totalGrupoAgua = grupo?.membros.reduce((s, m) => s + (m.dados?.aguaTotal || 0), 0) || 0;

  const conquistas = [
    estatisticas && estatisticas.totalRegistros >= 1
      ? { title: 'Primeiro registro realizado no Sustenta', date: usuario?.criadoEm ? formatarMesAno(usuario.criadoEm) : '', pts: 100 }
      : null,
    estatisticas && estatisticas.mesesAtivos >= 1
      ? { title: `${estatisticas.mesesAtivos} meses ativos monitorando consumo`, date: 'Recente', pts: estatisticas.mesesAtivos * 50 }
      : null,
    estatisticas && estatisticas.totalRegistros >= 5
      ? { title: `${estatisticas.totalRegistros} registros concluidos`, date: 'Recente', pts: estatisticas.totalRegistros * 100 }
      : null,
    estatisticas && estatisticas.energiaTotal > 0
      ? { title: 'Monitoramento de energia eletrica ativado', date: 'Recente', pts: 200 }
      : null,
    usuario?.cidade
      ? { title: `Localizacao definida: ${usuario.cidade}, ${usuario.estado}`, date: 'Configuracao', pts: 50 }
      : null,
  ].filter(Boolean) as { title: string; date: string; pts: number }[];

  return {
    darkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
    usuario,
    setUsuario,
    estatisticas,
    setEstatisticas,
    carregando,
    setCarregando,
    grupo,
    setGrupo,
    carregandoGrupo,
    setCarregandoGrupo,
    codigoEntrada,
    setCodigoEntrada,
    nomeNovoGrupo,
    setNomeNovoGrupo,
    linkCopiado,
    setLinkCopiado,
    modalConvite,
    setModalConvite,
    modalAberto,
    setModalAberto,
    formNome,
    setFormNome,
    formTelefone,
    setFormTelefone,
    formEstado,
    setFormEstado,
    formCidade,
    setFormCidade,
    senhaAtual,
    setSenhaAtual,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    salvando,
    setSalvando,
    sucesso,
    setSucesso,
    erro,
    setErro,
    toggleNotif,
    setToggleNotif,
    emailVerificado,
    setEmailVerificado,
    modal2FA,
    setModal2FA,
    modalExcluir,
    setModalExcluir,
    senhaExclusao,
    setSenhaExclusao,
    confirmacaoExclusao,
    setConfirmacaoExclusao,
    excluindo,
    setExcluindo,
    enviando2FA,
    setEnviando2FA,
    verificando2FA,
    setVerificando2FA,
    linkEnviado,
    setLinkEnviado,
    modalDados,
    setModalDados,
    salvandoDados,
    setSalvandoDados,
    dadosCompartilhados,
    setDadosCompartilhados,
    ok,
    err,
    carregarGrupo,
    fecharModal,
    salvarDados,
    salvarLocalizacao,
    salvarSenha,
    handleExportarDados,
    handleExcluirConta,
    handleEnviarVerificacao,
    handleVerificarEmail,
    handleSalvarDados,
    handleCriarGrupo,
    handleEntrarGrupo,
    handleRemoverMembro,
    handleRegenerarCodigo,
    handleCopiarLink,
    nivel,
    xpPercent,
    nivelCor,
    nomeUsuario,
    xpTotal,
    isDono,
    linkConvite,
    membrosOrdenados,
    maiorXp,
    totalGrupoGasto,
    totalGrupoEnergia,
    totalGrupoAgua,
    conquistas,
  };
}

export type PerfilCtx = ReturnType<typeof usePerfil>;
