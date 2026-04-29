import React from 'react';
import {
  User, MapPin, Calendar, Mail, Phone, Leaf, Trophy,
  Users, Edit2, Camera, Award, Bell, Lock, Globe,
  Moon, HelpCircle, LogOut, Star, Info, ShieldCheck,
  Plus, Trash2, ChevronRight, Save, X, Loader2,
  CheckCircle2, AlertCircle, Zap, Wallet, TrendingUp,
  Copy, Share2, Link, Sun, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  sendEmailVerification, reload,
} from 'firebase/auth';
import { buscarTodosRegistros, calcularNivel } from '../../services/consumo';
import MapaBrasil from '../components/MapaBrasil';
import { useTheme } from '../contexts/ThemeContext';
import {
  criarGrupo, buscarMeuGrupo, entrarNoGrupo, removerMembro,
  sairDoGrupo, regenerarCodigo, montarLinkConvite,
  compartilharWhatsApp, compartilharInstagram,
  compartilharX, compartilharEmail,
  type GrupoFamilia,
} from '../../services/familia';

interface UsuarioData {
  nome: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  criadoEm: string;
  dadosCompartilhados?: { gastos: boolean; nivel: boolean; conquistas: boolean };
}

interface EstatisticasData {
  totalRegistros: number;
  totalGasto: number;
  energiaTotal: number;
  aguaTotal: number;
  mesesAtivos: number;
}

const NOME_POR_SIGLA: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana',
  PE: 'Pernambuco', PI: 'Piaui', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia',
  RR: 'Roraima', SC: 'Santa Catarina', SP: 'Sao Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

const NIVEIS_CORES = [
  'from-slate-400 to-slate-500',   'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',     'from-cyan-400 to-cyan-600',
  'from-blue-400 to-blue-600',     'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600', 'from-amber-400 to-amber-600',
  'from-orange-400 to-orange-600', 'from-rose-400 to-rose-600',
];

const formatarMesAno = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

const iniciais = (nome: string) =>
  nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

const Campo: React.FC<{
  label: string; icon: React.ElementType; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}> = ({ label, icon: Icon, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-all hover:border-emerald-200 dark:hover:border-emerald-700 placeholder:text-slate-300 dark:placeholder:text-slate-500"
      />
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  const [activeTab,    setActiveTab]    = React.useState<'perfil' | 'familia' | 'config'>('perfil');
  const [usuario,      setUsuario]      = React.useState<UsuarioData | null>(null);
  const [estatisticas, setEstatisticas] = React.useState<EstatisticasData | null>(null);
  const [carregando,   setCarregando]   = React.useState(true);

  const [grupo,           setGrupo]           = React.useState<GrupoFamilia | null>(null);
  const [carregandoGrupo, setCarregandoGrupo] = React.useState(false);
  const [codigoEntrada,   setCodigoEntrada]   = React.useState('');
  const [nomeNovoGrupo,   setNomeNovoGrupo]   = React.useState('');
  const [linkCopiado,     setLinkCopiado]     = React.useState(false);
  const [modalConvite,    setModalConvite]    = React.useState(false);

  const [modalAberto,    setModalAberto]    = React.useState<'dados' | 'localizacao' | 'senha' | null>(null);
  const [formNome,       setFormNome]       = React.useState('');
  const [formTelefone,   setFormTelefone]   = React.useState('');
  const [formEstado,     setFormEstado]     = React.useState('');
  const [formCidade,     setFormCidade]     = React.useState('');
  const [senhaAtual,     setSenhaAtual]     = React.useState('');
  const [novaSenha,      setNovaSenha]      = React.useState('');
  const [confirmarSenha, setConfirmarSenha] = React.useState('');

  const [salvando,    setSalvando]    = React.useState(false);
  const [sucesso,     setSucesso]     = React.useState('');
  const [erro,        setErro]        = React.useState('');

  const [toggleNotif, setToggleNotif] = React.useState(true);

  // 2FA real — estado baseado no emailVerified do Firebase
  const [emailVerificado,  setEmailVerificado]  = React.useState(false);
  const [modal2FA,         setModal2FA]         = React.useState(false);
  const [enviando2FA,      setEnviando2FA]      = React.useState(false);
  const [verificando2FA,   setVerificando2FA]   = React.useState(false);
  const [reenvioOk,        setReenvioOk]        = React.useState(false);
  const [linkEnviado,      setLinkEnviado]      = React.useState(false);

  // Dados Compartilhados
  const [modalDados,          setModalDados]          = React.useState(false);
  const [salvandoDados,       setSalvandoDados]        = React.useState(false);
  const [dadosCompartilhados, setDadosCompartilhados] = React.useState({
    gastos: true, nivel: true, conquistas: true,
  });

  React.useEffect(() => {
    const fetchDados = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        // Verifica status real do e-mail
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
          if (data.dadosCompartilhados) setDadosCompartilhados(data.dadosCompartilhados);
        }
        const registros = await buscarTodosRegistros();
        const meses = new Set(registros.map(r => r.mes)).size;
        setEstatisticas({
          totalRegistros: registros.length,
          totalGasto:   registros.reduce((s, r) => s + r.valor, 0),
          energiaTotal: registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0),
          aguaTotal:    registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0),
          mesesAtivos:  meses,
        });
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    fetchDados();
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'familia') return;
    setCarregandoGrupo(true);
    buscarMeuGrupo()
      .then(g => setGrupo(g))
      .catch(() => setGrupo(null))
      .finally(() => setCarregandoGrupo(false));
  }, [activeTab]);

  const ok  = (msg: string) => { setSucesso(msg); setErro('');   setTimeout(() => setSucesso(''), 3500); };
  const err = (msg: string) => { setErro(msg);    setSucesso(''); };

  const fecharModal = () => {
    if (usuario) {
      setFormNome(usuario.nome || '');
      setFormTelefone(usuario.telefone || '');
      setFormEstado(usuario.estado || '');
      setFormCidade(usuario.cidade || '');
    }
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    setModalAberto(null); setErro('');
  };

  const salvarDados = async () => {
    if (!formNome.trim()) { err('Informe seu nome.'); return; }
    const user = auth.currentUser; if (!user) return;
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { nome: formNome.trim(), telefone: formTelefone.trim() });
      setUsuario(p => p ? { ...p, nome: formNome.trim(), telefone: formTelefone.trim() } : p);
      fecharModal(); ok('Dados atualizados!');
    } catch { err('Erro ao salvar.'); }
    setSalvando(false);
  };

  const salvarLocalizacao = async () => {
    if (!formEstado) { err('Selecione seu estado.'); return; }
    if (!formCidade) { err('Selecione sua cidade.'); return; }
    const user = auth.currentUser; if (!user) return;
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { estado: formEstado, cidade: formCidade });
      setUsuario(p => p ? { ...p, estado: formEstado, cidade: formCidade } : p);
      fecharModal(); ok('Localizacao atualizada!');
    } catch { err('Erro ao salvar.'); }
    setSalvando(false);
  };

  const salvarSenha = async () => {
    if (!senhaAtual)                  { err('Informe a senha atual.'); return; }
    if (novaSenha.length < 6)         { err('Minimo 6 caracteres.'); return; }
    if (novaSenha !== confirmarSenha) { err('As senhas nao coincidem.'); return; }
    const user = auth.currentUser; if (!user || !user.email) return;
    setSalvando(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, novaSenha);
      fecharModal(); ok('Senha alterada com sucesso!');
    } catch { err('Senha atual incorreta.'); }
    setSalvando(false);
  };

  // 2FA real — envia link de verificacao de e-mail
  const handleEnviarVerificacao = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setEnviando2FA(true);
    setErro('');
    try {
      await sendEmailVerification(user);
      setLinkEnviado(true);
      setReenvioOk(true);
      setTimeout(() => setReenvioOk(false), 4000);
    } catch { err('Erro ao enviar e-mail. Tente novamente em alguns minutos.'); }
    setEnviando2FA(false);
  };

  // Verifica se o usuario ja clicou no link
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
    } catch { err('Erro ao verificar. Tente novamente.'); }
    setVerificando2FA(false);
  };

  // Dados Compartilhados
  const handleSalvarDados = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSalvandoDados(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { dadosCompartilhados });
      setModalDados(false);
      ok('Preferencias de compartilhamento salvas!');
    } catch { err('Erro ao salvar preferencias.'); }
    setSalvandoDados(false);
  };

  // Familia
  const handleCriarGrupo = async () => {
    if (!nomeNovoGrupo.trim()) { err('Informe o nome do grupo.'); return; }
    setSalvando(true);
    try {
      const g = await criarGrupo(nomeNovoGrupo.trim());
      setGrupo(g); setNomeNovoGrupo(''); ok('Grupo familiar criado!');
    } catch (e: any) { err(e.message || 'Erro ao criar grupo.'); }
    setSalvando(false);
  };

  const handleEntrarGrupo = async () => {
    if (!codigoEntrada.trim()) { err('Informe o codigo de convite.'); return; }
    setSalvando(true);
    try {
      const g = await entrarNoGrupo(codigoEntrada.trim());
      setGrupo(g); setCodigoEntrada(''); ok('Voce entrou no grupo!');
    } catch (e: any) { err(e.message || 'Codigo invalido.'); }
    setSalvando(false);
  };

  const handleRemoverMembro = async (membroUid: string) => {
    if (!grupo) return;
    setSalvando(true);
    try {
      await removerMembro(grupo.id, membroUid);
      const g = await buscarMeuGrupo();
      setGrupo(g); ok('Membro removido.');
    } catch (e: any) { err(e.message); }
    setSalvando(false);
  };

  const handleRegenerarCodigo = async () => {
    if (!grupo) return;
    setSalvando(true);
    try {
      const novoCodigo = await regenerarCodigo(grupo.id);
      setGrupo(prev => prev ? { ...prev, codigoConvite: novoCodigo } : prev);
      ok('Novo codigo gerado!');
    } catch { err('Erro ao gerar codigo.'); }
    setSalvando(false);
  };

  const handleCopiarLink = () => {
    if (!grupo) return;
    const link = montarLinkConvite(grupo.codigoConvite);
    navigator.clipboard.writeText(link);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2500);
  };

  if (carregando) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  const nivel      = calcularNivel(estatisticas?.totalRegistros ?? 0);
  const xpPercent  = Math.round((nivel.xpAtual / nivel.xpTotal) * 100);
  const nivelCor   = NIVEIS_CORES[Math.min(nivel.nivel - 1, NIVEIS_CORES.length - 1)];
  const nomeUsuario = usuario?.nome || 'Usuario';
  const xpTotal    = (estatisticas?.totalRegistros ?? 0) * 100;
  const isDono     = grupo?.donoUid === auth.currentUser?.uid;
  const linkConvite = grupo ? montarLinkConvite(grupo.codigoConvite) : '';

  const conquistas = [
    estatisticas && estatisticas.totalRegistros >= 1  ? { title: 'Primeiro registro realizado no Sustenta', date: usuario?.criadoEm ? formatarMesAno(usuario.criadoEm) : '', pts: 100 } : null,
    estatisticas && estatisticas.mesesAtivos >= 1     ? { title: `${estatisticas.mesesAtivos} meses ativos monitorando consumo`, date: 'Recente', pts: estatisticas.mesesAtivos * 50 } : null,
    estatisticas && estatisticas.totalRegistros >= 5  ? { title: `${estatisticas.totalRegistros} registros concluidos`, date: 'Recente', pts: estatisticas.totalRegistros * 100 } : null,
    estatisticas && estatisticas.energiaTotal > 0     ? { title: 'Monitoramento de energia eletrica ativado', date: 'Recente', pts: 200 } : null,
    usuario?.cidade                                   ? { title: `Localizacao definida: ${usuario.cidade}, ${usuario.estado}`, date: 'Configuracao', pts: 50 } : null,
  ].filter(Boolean) as { title: string; date: string; pts: number }[];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">

      {/* Toasts */}
      <AnimatePresence>
        {sucesso && (
          <motion.div key="ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{sucesso}
          </motion.div>
        )}
        {erro && (
          <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{erro}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Configuracao de Conta</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie sua identidade, grupo familiar e preferencias.</p>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
          {(['perfil', 'familia', 'config'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-bold text-sm transition-all
                ${activeTab === tab
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {tab === 'perfil' ? 'Seu Perfil' : tab === 'familia' ? 'Modo Familia' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ABA PERFIL */}
        {activeTab === 'perfil' && (
          <motion.div key="perfil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="relative mb-8">
              <div className="h-48 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl overflow-hidden relative">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-4 right-4 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold">Nivel {nivel.nivel} — {nivel.nome}</span>
                </div>
              </div>
              <div className="px-8 -mt-16 flex flex-col md:flex-row items-end gap-6 relative z-10">
                <div className="relative shrink-0">
                  <div className={`w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl bg-gradient-to-br ${nivelCor} flex items-center justify-center`}>
                    <span className="text-4xl font-black text-white">{iniciais(nomeUsuario)}</span>
                  </div>
                  <button onClick={() => setModalAberto('dados')}
                    className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors border-2 border-white dark:border-slate-800">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{nomeUsuario}</h1>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {nivel.nome} Nivel {nivel.nivel}
                        {usuario?.cidade && usuario?.estado && ` - ${usuario.cidade}, ${usuario.estado}`}
                      </p>
                    </div>
                    <button onClick={() => setModalAberto('dados')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-sm">
                      <Edit2 className="w-4 h-4" /> Editar Perfil
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Informacoes</h3>
                  <div className="space-y-4">
                    {[
                      { icon: MapPin,   value: usuario?.cidade && usuario?.estado ? `${usuario.cidade}, ${usuario.estado}` : 'Localizacao nao definida' },
                      { icon: Mail,     value: usuario?.email    || '' },
                      { icon: Phone,    value: usuario?.telefone || 'Telefone nao informado' },
                      { icon: Calendar, value: usuario?.criadoEm ? `Membro desde ${formatarMesAno(usuario.criadoEm)}` : '' },
                    ].map(({ icon: Icon, value }, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-sm truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-700 space-y-1">
                    <button onClick={() => setModalAberto('localizacao')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all">
                      <MapPin className="w-3.5 h-3.5" /> Atualizar localizacao
                    </button>
                    <button onClick={() => setModalAberto('senha')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all">
                      <Lock className="w-3.5 h-3.5" /> Alterar senha
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-400 mb-4">Selo Sustenta</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`bg-gradient-to-br ${nivelCor} p-3 rounded-2xl shadow-lg`}>
                      <Leaf className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-emerald-900 dark:text-emerald-300 font-bold">{nivel.nome}</p>
                      <p className="text-emerald-600 dark:text-emerald-500 text-xs">Nivel {nivel.nivel} de 10</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${xpPercent}%` }} />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 font-medium text-center">
                    {nivel.xpAtual}/{nivel.xpTotal} XP para o proximo nivel
                  </p>
                </div>

                {estatisticas && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Resumo Financeiro</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Total registrado', value: `R$ ${estatisticas.totalGasto.toFixed(0)}`,    icon: Wallet,     cor: 'text-emerald-600' },
                        { label: 'Energia',           value: `R$ ${estatisticas.energiaTotal.toFixed(0)}`, icon: Zap,        cor: 'text-amber-500'   },
                        { label: 'Agua',              value: `R$ ${estatisticas.aguaTotal.toFixed(0)}`,    icon: TrendingUp, cor: 'text-blue-500'    },
                      ].map(({ label, value, icon: Icon, cor }) => (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${cor}`} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Registros', value: String(estatisticas?.totalRegistros ?? 0), icon: Users,    bg: 'bg-blue-50 dark:bg-blue-900/20',     cor: 'text-blue-600 dark:text-blue-400'       },
                    { label: 'XP Total',  value: String(xpTotal),                           icon: Trophy,   bg: 'bg-amber-50 dark:bg-amber-900/20',   cor: 'text-amber-600 dark:text-amber-400'     },
                    { label: 'Meses',     value: String(estatisticas?.mesesAtivos ?? 0),    icon: Calendar, bg: 'bg-emerald-50 dark:bg-emerald-900/20',cor: 'text-emerald-600 dark:text-emerald-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                      <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.cor} flex items-center justify-center mx-auto mb-3`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{s.value}</p>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Informacoes de Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'E-mail',      icon: Mail,   value: usuario?.email     || '' },
                      { label: 'Telefone',    icon: Phone,  value: usuario?.telefone  || 'Nao informado' },
                      { label: 'Localizacao', icon: MapPin, value: usuario?.cidade && usuario?.estado ? `${usuario.cidade}, ${NOME_POR_SIGLA[usuario.estado] || usuario.estado}` : 'Nao definida' },
                    ].map(({ label, icon: Icon, value }) => (
                      <div key={label} className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-600 group hover:border-emerald-200 dark:hover:border-emerald-700 transition-colors">
                          <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6">Sustentabilidade em Familia</h3>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/40 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl shadow-sm text-emerald-600">
                          <Users className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-900 dark:text-emerald-300">
                            {grupo ? `${grupo.membros.length} membro${grupo.membros.length !== 1 ? 's' : ''} no grupo` : 'Modo Familia'}
                          </h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500">Compartilhe metas e economize em familia.</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('familia')}
                        className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">
                        Gerenciar Grupo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Historico de Conquistas Recentes</h3>
                  {conquistas.length === 0 ? (
                    <div className="text-center py-8">
                      <Leaf className="w-10 h-10 text-slate-200 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Registre consumos para ganhar conquistas!</p>
                    </div>
                  ) : (
                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-700">
                      {conquistas.map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative pl-12">
                          <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white dark:bg-slate-700 border-4 border-slate-50 dark:border-slate-800 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Leaf className="w-4 h-4" />
                          </div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.date}</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full shrink-0 ml-3">+{item.pts} pts</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <button className="w-full mt-8 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors border-t border-slate-50 dark:border-slate-700">
                    Ver historico completo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA FAMILIA */}
        {activeTab === 'familia' && (
          <motion.div key="familia" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                {carregandoGrupo ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                ) : !grupo ? (
                  <div className="space-y-8">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Modo Familia</h3>
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Criar novo grupo</h4>
                      <div className="flex gap-3">
                        <input type="text" placeholder="Nome do grupo (ex: Familia Silva)" value={nomeNovoGrupo}
                          onChange={e => setNomeNovoGrupo(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
                        <button onClick={handleCriarGrupo} disabled={salvando}
                          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2">
                          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ou</span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Entrar com codigo de convite</h4>
                      <div className="flex gap-3">
                        <input type="text" placeholder="Cole o codigo aqui (ex: AB12CD34)" value={codigoEntrada}
                          onChange={e => setCodigoEntrada(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-mono tracking-widest" />
                        <button onClick={handleEntrarGrupo} disabled={salvando}
                          className="px-6 py-3 bg-slate-800 dark:bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-60">
                          Entrar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{grupo.nome}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{grupo.membros.length}/5 membros</p>
                      </div>
                      {isDono && (
                        <button onClick={() => setModalConvite(true)}
                          className="flex items-center gap-2 bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-200">
                          <Share2 className="w-4 h-4" /> Convidar
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {grupo.membros.map(membro => (
                        <div key={membro.uid}
                          className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 rounded-2xl transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${NIVEIS_CORES[0]} flex items-center justify-center shadow-sm`}>
                              <span className="text-white font-black text-sm">{iniciais(membro.nome)}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 transition-colors">
                                {membro.nome}
                                {membro.role === 'dono' && (
                                  <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Dono</span>
                                )}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{membro.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-600">{membro.xp} XP</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Impacto</p>
                            </div>
                            {isDono && membro.uid !== auth.currentUser?.uid && (
                              <button onClick={() => handleRemoverMembro(membro.uid)}
                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {grupo.membros.length < 5 && isDono && (
                      <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 text-center">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Ainda {5 - grupo.membros.length} vaga{5 - grupo.membros.length !== 1 ? 's' : ''} disponivel{5 - grupo.membros.length !== 1 ? 'is' : ''}
                        </p>
                        <button onClick={() => setModalConvite(true)} className="mt-3 text-emerald-600 font-bold text-xs hover:underline">
                          Convidar mais membros
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Metricas do Grupo</h3>
                {grupo ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase">Membros</span>
                        <span className="text-xs font-black text-emerald-600">{grupo.membros.length}/5</span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(grupo.membros.length / 5) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {grupo.membros.sort((a, b) => b.xp - a.xp).map((m, i) => (
                        <div key={m.uid} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.nome}</p>
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: grupo.membros[0].xp > 0 ? `${(m.xp / grupo.membros[0].xp) * 100}%` : '0%' }} />
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-500 dark:text-slate-400">{m.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                    Crie ou entre em um grupo para ver as metricas
                  </p>
                )}
              </div>
              <div className="p-6 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-200">
                <h4 className="font-bold text-lg mb-2">Desafio Familiar</h4>
                <p className="text-[10px] text-emerald-100 leading-relaxed mb-4">
                  Convide membros para economizar juntos e ganhar bonus de XP compartilhados.
                </p>
                {grupo && (
                  <div className="flex items-center gap-2">
                    <div className="w-full h-2 bg-emerald-800 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${(grupo.membros.length / 5) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold shrink-0">{grupo.membros.length}/5</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ABA AJUSTES */}
        {activeTab === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto space-y-6">
            {[
              { title: 'Preferencias do Sistema', items: [
                {
                  icon: darkMode ? Sun : Moon,
                  label: darkMode ? 'Modo Claro' : 'Modo Escuro',
                  desc: darkMode ? 'Clique para voltar ao tema claro' : 'Interface adaptada para ambientes escuros',
                  toggle: true, ativo: darkMode, onToggle: toggleDarkMode,
                },
                {
                  icon: Bell, label: 'Notificacoes',
                  desc: 'Alertas de faturas, habitos e conquistas',
                  toggle: true, ativo: toggleNotif, onToggle: () => setToggleNotif(p => !p),
                },
                { icon: Globe, label: 'Idioma', desc: 'Portugues (Brasil)', toggle: false },
              ]},
              { title: 'Seguranca e Privacidade', items: [
                { icon: Lock, label: 'Alterar Senha', desc: 'Mantenha sua conta protegida', toggle: false, onClick: () => setModalAberto('senha') },
                {
                  icon: ShieldCheck,
                  label: 'Verificacao de E-mail',
                  desc: emailVerificado
                    ? 'E-mail verificado — conta protegida'
                    : 'Verifique seu e-mail para maior seguranca',
                  toggle: false,
                  onClick: emailVerificado ? undefined : () => { setLinkEnviado(false); setModal2FA(true); setErro(''); },
                  isVerified: emailVerificado,
                },
                {
                  icon: Info, label: 'Dados Compartilhados',
                  desc: 'Gerencie o que a familia visualiza',
                  toggle: false, onClick: () => setModalDados(true),
                },
              ]},
              { title: 'Sobre o Sustenta', items: [
                { icon: HelpCircle, label: 'Central de Ajuda',  desc: 'Duvidas frequentes e suporte',       toggle: false },
                { icon: Star,       label: 'Avaliar o App',     desc: 'Ajude-nos a melhorar o Sustenta',    toggle: false },
                { icon: LogOut,     label: 'Excluir Conta',     desc: 'Remover permanentemente seus dados', toggle: false, isDanger: true },
              ]},
            ].map((group, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{group.title}</h3>
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  {group.items.map((item, i) => (
                    <button key={i} onClick={(item as any).onClick}
                      disabled={(item as any).isVerified}
                      className={`w-full flex items-center justify-between p-5 transition-colors group ${i !== group.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-700' : ''} ${(item as any).isVerified ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-2xl shadow-sm ${
                          (item as any).isDanger      ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                          : (item as any).isVerified  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 transition-all'}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${(item as any).isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.label}
                          </p>
                          <p className={`text-[10px] font-medium ${(item as any).isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      {(item as any).toggle ? (
                        <div onClick={e => { e.stopPropagation(); (item as any).onToggle?.(); }}
                          className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${(item as any).ativo ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${(item as any).ativo ? 'translate-x-6' : ''}`} />
                        </div>
                      ) : (item as any).isVerified ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-all" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center py-8">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sustenta Web v1.0.0 - 2026</p>
              <div className="flex justify-center gap-6 mt-2">
                <button className="text-[10px] font-bold text-emerald-600 hover:underline">Politicas de Privacidade</button>
                <button className="text-[10px] font-bold text-emerald-600 hover:underline">Termos de Uso</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONVITE */}
      <AnimatePresence>
        {modalConvite && grupo && (
          <>
            <motion.div key="ov2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setModalConvite(false)} />
            <motion.div key="mc" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Convidar para {grupo.nome}</h3>
                  <button onClick={() => setModalConvite(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Codigo de convite</p>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600">
                      <span className="flex-1 text-2xl font-black text-slate-800 dark:text-slate-100 tracking-[0.3em] text-center">{grupo.codigoConvite}</span>
                      <button onClick={handleRegenerarCodigo} disabled={salvando}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Gerar novo codigo">
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">Compartilhe este codigo para que alguem entre no grupo</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link de convite</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                      <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">{linkConvite}</span>
                      <button onClick={handleCopiarLink}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${linkCopiado ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'}`}>
                        {linkCopiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {linkCopiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Compartilhar via</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => compartilharWhatsApp(linkConvite, grupo.nome)}
                        className="flex items-center gap-3 p-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-2xl transition-all">
                        <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        </div>
                        <span className="text-sm font-bold text-[#25D366]">WhatsApp</span>
                      </button>
                      <button onClick={() => { compartilharInstagram(linkConvite); ok('Link copiado! Cole no Instagram.'); }}
                        className="flex items-center gap-3 p-4 bg-[#E1306C]/10 hover:bg-[#E1306C]/20 border border-[#E1306C]/30 rounded-2xl transition-all">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </div>
                        <span className="text-sm font-bold text-[#E1306C]">Instagram</span>
                      </button>
                      <button onClick={() => compartilharX(linkConvite, grupo.nome)}
                        className="flex items-center gap-3 p-4 bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 border border-slate-900/20 dark:border-white/20 rounded-2xl transition-all">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 fill-current text-white dark:text-slate-900" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">X (Twitter)</span>
                      </button>
                      <button onClick={() => compartilharEmail(linkConvite, grupo.nome)}
                        className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40 rounded-2xl transition-all">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">E-mail</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL VERIFICACAO DE EMAIL (2FA real) */}
      <AnimatePresence>
        {modal2FA && (
          <>
            <motion.div key="ov-2fa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => { setModal2FA(false); setErro(''); }} />
            <motion.div key="mod-2fa" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Verificacao de E-mail</h3>
                  </div>
                  <button onClick={() => { setModal2FA(false); setErro(''); }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {!linkEnviado ? (
                    <>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl p-4 text-center">
                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-1">Proteja sua conta</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                          Um link de verificacao sera enviado para <strong>{usuario?.email}</strong>.
                          Clique no link para confirmar que este e-mail pertence a voce.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {[
                          'Seu e-mail fica vinculado e confirmado',
                          'Recuperacao de conta mais segura',
                          'Protecao extra contra acessos nao autorizados',
                        ].map((txt, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{txt}</span>
                          </div>
                        ))}
                      </div>
                      {erro && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />{erro}
                        </div>
                      )}
                      <button onClick={handleEnviarVerificacao} disabled={enviando2FA}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                        {enviando2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Enviar link de verificacao
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                          <Mail className="w-8 h-8 text-emerald-600" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-bold text-slate-900 dark:text-slate-100">E-mail enviado!</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Verifique a caixa de entrada de <strong className="text-slate-700 dark:text-slate-200">{usuario?.email}</strong>
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Clique no link e volte aqui para confirmar</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-2">
                        {['Abra sua caixa de entrada', 'Clique em "Confirmar meu e-mail"', 'Volte aqui e clique em "Ja verifiquei"'].map((txt, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{txt}</span>
                          </div>
                        ))}
                      </div>
                      {reenvioOk && (
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-4 py-3 text-emerald-700 dark:text-emerald-400 text-sm">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> E-mail reenviado!
                        </div>
                      )}
                      {erro && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3 text-red-600 dark:text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />{erro}
                        </div>
                      )}
                      <button onClick={handleVerificarEmail} disabled={verificando2FA}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                        {verificando2FA
                          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verificando...</>
                          : <><CheckCircle2 className="w-4 h-4" /> Ja verifiquei meu e-mail</>
                        }
                      </button>
                      <button onClick={handleEnviarVerificacao} disabled={enviando2FA || reenvioOk}
                        className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50">
                        Reenviar e-mail de verificacao
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL DADOS COMPARTILHADOS */}
      <AnimatePresence>
        {modalDados && (
          <>
            <motion.div key="ov-dados" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setModalDados(false)} />
            <motion.div key="mod-dados" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-xl">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Dados Compartilhados</h3>
                  </div>
                  <button onClick={() => setModalDados(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Escolha quais informacoes os membros do seu grupo familiar podem visualizar:
                  </p>
                  {[
                    { key: 'gastos',     label: 'Gastos mensais', desc: 'Energia, agua e outros gastos',      icon: Wallet  },
                    { key: 'nivel',      label: 'Nivel e XP',     desc: 'Seu progresso e ranking no grupo',   icon: Trophy  },
                    { key: 'conquistas', label: 'Conquistas',     desc: 'Historico de metas alcancadas',      icon: Award   },
                  ].map(({ key, label, desc, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm">
                          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
                        </div>
                      </div>
                      <div onClick={() => setDadosCompartilhados(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${dadosCompartilhados[key as keyof typeof dadosCompartilhados] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${dadosCompartilhados[key as keyof typeof dadosCompartilhados] ? 'translate-x-6' : ''}`} />
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Essas configuracoes so afetam membros do seu grupo familiar. Seus dados nunca sao compartilhados publicamente.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setModalDados(false)}
                      className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                      Cancelar
                    </button>
                    <button onClick={handleSalvarDados} disabled={salvandoDados}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60">
                      {salvandoDados ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAIS DE EDICAO */}
      <AnimatePresence>
        {modalAberto && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={fecharModal} />
            <motion.div key="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {modalAberto === 'dados'       && 'Editar Dados Pessoais'}
                    {modalAberto === 'localizacao' && 'Atualizar Localizacao'}
                    {modalAberto === 'senha'       && 'Alterar Senha'}
                  </h3>
                  <button onClick={fecharModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {erro && (
                  <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{erro}
                  </div>
                )}
                <div className="p-6 space-y-4">
                  {modalAberto === 'dados' && (
                    <>
                      <Campo label="Nome completo" icon={User}  value={formNome}     onChange={setFormNome}     placeholder="Seu nome completo" />
                      <Campo label="Email"         icon={Mail}  value={usuario?.email || ''} onChange={() => {}} disabled />
                      <Campo label="Telefone"      icon={Phone} value={formTelefone} onChange={setFormTelefone} placeholder="(11) 99999-9999" type="tel" />
                    </>
                  )}
                  {modalAberto === 'localizacao' && (
                    <div className="max-h-[55vh] overflow-y-auto">
                      <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">Clique no seu estado e selecione a cidade:</p>
                      <MapaBrasil estadoSelecionado={formEstado} cidadeSelecionada={formCidade}
                        onEstadoClick={s => { setFormEstado(s); setFormCidade(''); }}
                        onCidadeChange={setFormCidade} />
                    </div>
                  )}
                  {modalAberto === 'senha' && (
                    <>
                      <Campo label="Senha atual"          icon={Lock} value={senhaAtual}     onChange={setSenhaAtual}     type="password" placeholder="••••••••" />
                      <Campo label="Nova senha"           icon={Lock} value={novaSenha}      onChange={setNovaSenha}      type="password" placeholder="Minimo 6 caracteres" />
                      <Campo label="Confirmar nova senha" icon={Lock} value={confirmarSenha} onChange={setConfirmarSenha} type="password" placeholder="Repita a nova senha" />
                    </>
                  )}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={fecharModal}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={modalAberto === 'dados' ? salvarDados : modalAberto === 'localizacao' ? salvarLocalizacao : salvarSenha}
                    disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60 shadow-sm shadow-emerald-200">
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};