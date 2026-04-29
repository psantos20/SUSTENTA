import React from 'react';
import {
  User,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Leaf,
  Trophy,
  Users,
  Edit2,
  Camera,
  Award,
  Bell,
  Lock,
  Globe,
  Moon,
  HelpCircle,
  LogOut,
  Star,
  Info,
  ShieldCheck,
  Plus,
  Trash2,
  ChevronRight,
  Save,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Wallet,
  TrendingUp,
  Copy,
  Share2,
  Link,
  Sun,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { buscarTodosRegistros, calcularNivel } from '../../services/consumo';
import { useTheme } from '../contexts/ThemeContext';
import {
  criarGrupo,
  buscarMeuGrupo,
  entrarNoGrupo,
  removerMembro,
  regenerarCodigo,
  montarLinkConvite,
  compartilharWhatsApp,
  compartilharInstagram,
  compartilharX,
  compartilharEmail,
  type GrupoFamilia,
  type MembroFamilia,
} from '../../services/familia';

interface UsuarioData {
  nome: string;
  email: string;
  telefone: string;
  estado: string;
  cidade: string;
  criadoEm: string;
  grupoFamiliaId?: string | null;
  xpHabitos?: number;
  dadosCompartilhados?: {
    gastos: boolean;
    nivel: boolean;
    conquistas: boolean;
  };
}

interface EstatisticasData {
  totalRegistros: number;
  totalGasto: number;
  energiaTotal: number;
  aguaTotal: number;
  mesesAtivos: number;
}

interface DadosMembroCompartilhados {
  totalGasto?: number;
  energiaTotal?: number;
  aguaTotal?: number;
  nivel?: number;
  nomeNivel?: string;
  xpTotal?: number;
  conquistas?: number;
  podeVerGastos: boolean;
  podeVerNivel: boolean;
  podeVerConquistas: boolean;
}

type MembroFamiliaDetalhado = MembroFamilia & {
  dados?: DadosMembroCompartilhados;
};

type GrupoFamiliaDetalhado = Omit<GrupoFamilia, 'membros'> & {
  membros: MembroFamiliaDetalhado[];
};

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
  'from-slate-400 to-slate-500',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-cyan-400 to-cyan-600',
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-amber-400 to-amber-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
];

const formatarMesAno = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'US';

const moeda = (valor?: number) => `R$ ${(valor || 0).toFixed(0)}`;

const Campo: React.FC<{
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, icon: Icon, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-all hover:border-emerald-200 dark:hover:border-emerald-700 placeholder:text-slate-300 dark:placeholder:text-slate-500"
      />
    </div>
  </div>
);

async function buscarRegistrosPorUid(uid: string) {
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

async function buscarDadosMembro(membro: MembroFamilia): Promise<MembroFamiliaDetalhado> {
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

export const ProfilePage: React.FC = () => {
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
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nome: formNome.trim(),
        telefone: formTelefone.trim(),
      });

      setUsuario((p) => (p ? { ...p, nome: formNome.trim(), telefone: formTelefone.trim() } : p));
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
        estado: formEstado,
        cidade: formCidade,
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

    if (novaSenha.length < 6) {
      err('Minimo 6 caracteres.');
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

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

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

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-8">
      <AnimatePresence>
        {sucesso && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {sucesso}
          </motion.div>
        )}

        {erro && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {erro}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Configuracao de Conta
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie sua identidade, grupo familiar e preferencias.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
          {(['perfil', 'familia', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'perfil' ? 'Seu Perfil' : tab === 'familia' ? 'Modo Familia' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'perfil' && (
          <motion.div
            key="perfil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="relative mb-8">
              <div className="h-48 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl overflow-hidden relative">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />
                <div className="absolute top-4 right-4 bg-white/15 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold">
                    Nivel {nivel.nivel} — {nivel.nome}
                  </span>
                </div>
              </div>

              <div className="px-8 -mt-16 flex flex-col md:flex-row items-end gap-6 relative z-10">
                <div className="relative shrink-0">
                  <div className={`w-32 h-32 rounded-3xl border-4 border-white dark:border-slate-800 shadow-xl bg-gradient-to-br ${nivelCor} flex items-center justify-center`}>
                    <span className="text-4xl font-black text-white">{iniciais(nomeUsuario)}</span>
                  </div>
                  <button
                    onClick={() => setModalAberto('dados')}
                    className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors border-2 border-white dark:border-slate-800"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {nomeUsuario}
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {nivel.nome} Nivel {nivel.nivel}
                        {usuario?.cidade && usuario?.estado && ` - ${usuario.cidade}, ${usuario.estado}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setModalAberto('dados')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-sm"
                    >
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
                      { icon: MapPin, value: usuario?.cidade && usuario?.estado ? `${usuario.cidade}, ${usuario.estado}` : 'Localizacao nao definida' },
                      { icon: Mail, value: usuario?.email || auth.currentUser?.email || '' },
                      { icon: Phone, value: usuario?.telefone || 'Telefone nao informado' },
                      { icon: Calendar, value: usuario?.criadoEm ? `Membro desde ${formatarMesAno(usuario.criadoEm)}` : '' },
                    ].map(({ icon: Icon, value }, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="text-sm truncate">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-700 space-y-1">
                    <button
                      onClick={() => setModalAberto('localizacao')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Atualizar localizacao
                    </button>
                    <button
                      onClick={() => setModalAberto('senha')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
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
                        { label: 'Total registrado', value: moeda(estatisticas.totalGasto), icon: Wallet, cor: 'text-emerald-600' },
                        { label: 'Energia', value: moeda(estatisticas.energiaTotal), icon: Zap, cor: 'text-amber-500' },
                        { label: 'Agua', value: moeda(estatisticas.aguaTotal), icon: TrendingUp, cor: 'text-blue-500' },
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
                    { label: 'Registros', value: String(estatisticas?.totalRegistros ?? 0), icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/20', cor: 'text-blue-600 dark:text-blue-400' },
                    { label: 'XP Total', value: String(xpTotal), icon: Trophy, bg: 'bg-amber-50 dark:bg-amber-900/20', cor: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Meses', value: String(estatisticas?.mesesAtivos ?? 0), icon: Calendar, bg: 'bg-emerald-50 dark:bg-emerald-900/20', cor: 'text-emerald-600 dark:text-emerald-400' },
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
                      { label: 'E-mail', icon: Mail, value: usuario?.email || auth.currentUser?.email || '' },
                      { label: 'Telefone', icon: Phone, value: usuario?.telefone || 'Nao informado' },
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
                      <button
                        onClick={() => setActiveTab('familia')}
                        className="w-full md:w-auto px-8 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                      >
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
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'familia' && (
          <motion.div
            key="familia"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
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
                        <input
                          type="text"
                          placeholder="Nome do grupo (ex: Familia Silva)"
                          value={nomeNovoGrupo}
                          onChange={(e) => setNomeNovoGrupo(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        <button
                          onClick={handleCriarGrupo}
                          disabled={salvando}
                          className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                        >
                          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Criar
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
                        <input
                          type="text"
                          placeholder="Cole o codigo aqui (ex: AB12CD34)"
                          value={codigoEntrada}
                          onChange={(e) => setCodigoEntrada(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-mono tracking-widest"
                        />
                        <button
                          onClick={handleEntrarGrupo}
                          disabled={salvando}
                          className="px-6 py-3 bg-slate-800 dark:bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-60"
                        >
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
                        <button
                          onClick={() => setModalConvite(true)}
                          className="flex items-center gap-2 bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-200"
                        >
                          <Share2 className="w-4 h-4" /> Convidar
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {grupo.membros.map((membro) => {
                        const dados = membro.dados;

                        return (
                          <div
                            key={membro.uid}
                            className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 rounded-2xl transition-all group"
                          >
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

                                <div className="flex flex-wrap gap-2 mt-2">
                                  {dados?.podeVerNivel && dados.nivel !== undefined && (
                                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                      Nivel {dados.nivel} - {dados.nomeNivel}
                                    </span>
                                  )}
                                  {dados?.podeVerGastos && dados.totalGasto !== undefined && (
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                      {moeda(dados.totalGasto)} registrados
                                    </span>
                                  )}
                                  {dados?.podeVerConquistas && dados.conquistas !== undefined && (
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                      {dados.conquistas} conquistas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm font-black text-emerald-600">{membro.xp} XP</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Impacto</p>
                              </div>

                              {isDono && membro.uid !== auth.currentUser?.uid && (
                                <button
                                  onClick={() => handleRemoverMembro(membro.uid)}
                                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                  <div className="space-y-5">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-400 uppercase">Membros</span>
                        <span className="text-xs font-black text-emerald-600">{grupo.membros.length}/5</span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(grupo.membros.length / 5) * 100}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Gasto visivel do grupo</p>
                        <p className="text-xl font-black text-slate-900 dark:text-slate-100">{moeda(totalGrupoGasto)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Soma apenas membros que liberaram gastos.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Energia</p>
                          <p className="text-sm font-black text-amber-500">{moeda(totalGrupoEnergia)}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Agua</p>
                          <p className="text-sm font-black text-blue-500">{moeda(totalGrupoAgua)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {membrosOrdenados.map((m, i) => (
                        <div key={m.uid} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.nome}</p>
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: maiorXp > 0 ? `${(m.xp / maiorXp) * 100}%` : '0%' }}
                              />
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

        {activeTab === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {[
              {
                title: 'Preferencias do Sistema',
                items: [
                  {
                    icon: darkMode ? Sun : Moon,
                    label: darkMode ? 'Modo Claro' : 'Modo Escuro',
                    desc: darkMode ? 'Clique para voltar ao tema claro' : 'Interface adaptada para ambientes escuros',
                    toggle: true,
                    ativo: darkMode,
                    onToggle: toggleDarkMode,
                  },
                  {
                    icon: Bell,
                    label: 'Notificacoes',
                    desc: 'Alertas de faturas, habitos e conquistas',
                    toggle: true,
                    ativo: toggleNotif,
                    onToggle: () => setToggleNotif((p) => !p),
                  },
                  { icon: Globe, label: 'Idioma', desc: 'Portugues (Brasil)', toggle: false },
                ],
              },
              {
                title: 'Seguranca e Privacidade',
                items: [
                  { icon: Lock, label: 'Alterar Senha', desc: 'Mantenha sua conta protegida', toggle: false, onClick: () => setModalAberto('senha') },
                  {
                    icon: ShieldCheck,
                    label: 'Verificacao de E-mail',
                    desc: emailVerificado ? 'E-mail verificado — conta protegida' : 'Verifique seu e-mail para maior seguranca',
                    toggle: false,
                    onClick: emailVerificado ? undefined : () => { setLinkEnviado(false); setModal2FA(true); setErro(''); },
                    isVerified: emailVerificado,
                  },
                  { icon: Info, label: 'Dados Compartilhados', desc: 'Gerencie o que a familia visualiza', toggle: false, onClick: () => setModalDados(true) },
                ],
              },
              {
                title: 'Sobre o Sustenta',
                items: [
                  { icon: HelpCircle, label: 'Central de Ajuda', desc: 'Duvidas frequentes e suporte', toggle: false },
                  { icon: Star, label: 'Avaliar o App', desc: 'Ajude-nos a melhorar o Sustenta', toggle: false },
                  { icon: LogOut, label: 'Excluir Conta', desc: 'Remover permanentemente seus dados', toggle: false, isDanger: true },
                ],
              },
            ].map((group, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{group.title}</h3>
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  {group.items.map((item: any, i) => (
                    <button
                      key={i}
                      onClick={item.onClick}
                      disabled={item.isVerified}
                      className={`w-full flex items-center justify-between p-5 transition-colors group ${i !== group.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-700' : ''} ${item.isVerified ? 'cursor-default' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-2xl shadow-sm ${item.isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : item.isVerified ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 group-hover:text-emerald-600 transition-all'}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${item.isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{item.label}</p>
                          <p className={`text-[10px] font-medium ${item.isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{item.desc}</p>
                        </div>
                      </div>

                      {item.toggle ? (
                        <div
                          onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }}
                          className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${item.ativo ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${item.ativo ? 'translate-x-6' : ''}`} />
                        </div>
                      ) : item.isVerified ? (
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

      <AnimatePresence>
        {modalConvite && grupo && (
          <>
            <motion.div
              key="ov2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setModalConvite(false)}
            />
            <motion.div
              key="mc"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
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
                      <button onClick={handleRegenerarCodigo} disabled={salvando} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Gerar novo codigo">
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">Compartilhe este codigo para que alguem entre no grupo</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Link de convite</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                      <span className="flex-1 text-xs text-slate-600 dark:text-slate-300 truncate font-mono">{linkConvite}</span>
                      <button onClick={handleCopiarLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${linkCopiado ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'}`}>
                        {linkCopiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {linkCopiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Compartilhar via</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => compartilharWhatsApp(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl text-sm font-bold text-emerald-600">
                        WhatsApp
                      </button>
                      <button onClick={() => { compartilharInstagram(linkConvite); ok('Link copiado! Cole no Instagram.'); }} className="flex items-center justify-center gap-2 p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/40 rounded-2xl text-sm font-bold text-pink-600">
                        Instagram
                      </button>
                      <button onClick={() => compartilharX(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200">
                        X/Twitter
                      </button>
                      <button onClick={() => compartilharEmail(linkConvite, grupo.nome)} className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl text-sm font-bold text-blue-600">
                        E-mail
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalDados && (
          <>
            <motion.div
              key="ov-dados"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setModalDados(false)}
            />
            <motion.div
              key="mod-dados"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
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
                    { key: 'gastos', label: 'Gastos mensais', desc: 'Energia, agua e outros gastos', icon: Wallet },
                    { key: 'nivel', label: 'Nivel e XP', desc: 'Seu progresso e ranking no grupo', icon: Trophy },
                    { key: 'conquistas', label: 'Conquistas', desc: 'Historico de metas alcancadas', icon: Award },
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
                      <div
                        onClick={() => setDadosCompartilhados((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`w-12 h-6 rounded-full relative p-1 transition-colors cursor-pointer ${dadosCompartilhados[key as keyof typeof dadosCompartilhados] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                      >
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
                    <button onClick={() => setModalDados(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                      Cancelar
                    </button>
                    <button onClick={handleSalvarDados} disabled={salvandoDados} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60">
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

      <AnimatePresence>
        {modal2FA && (
          <>
            <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal2FA(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Verificacao de E-mail</h3>
                  <button onClick={() => setModal2FA(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Envie um link de verificacao para seu e-mail e depois clique em verificar.
                </p>
                {linkEnviado && (
                  <p className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                    Link enviado. Verifique sua caixa de entrada.
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={handleEnviarVerificacao} disabled={enviando2FA} className="flex-1 py-3 bg-slate-800 dark:bg-slate-600 text-white rounded-2xl font-bold text-sm">
                    {enviando2FA ? 'Enviando...' : 'Enviar link'}
                  </button>
                  <button onClick={handleVerificarEmail} disabled={verificando2FA} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm">
                    {verificando2FA ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalAberto && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={fecharModal} />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {modalAberto === 'dados' ? 'Editar Perfil' : modalAberto === 'localizacao' ? 'Atualizar Localizacao' : 'Alterar Senha'}
                  </h3>
                  <button onClick={fecharModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {modalAberto === 'dados' && (
                    <>
                      <Campo label="Nome" icon={User} value={formNome} onChange={setFormNome} placeholder="Seu nome" />
                      <Campo label="Telefone" icon={Phone} value={formTelefone} onChange={setFormTelefone} placeholder="Seu telefone" />
                    </>
                  )}

                  {modalAberto === 'localizacao' && (
                    <>
                      <Campo label="Estado" icon={MapPin} value={formEstado} onChange={(v) => setFormEstado(v.toUpperCase())} placeholder="Ex: SP" />
                      <Campo label="Cidade" icon={MapPin} value={formCidade} onChange={setFormCidade} placeholder="Ex: Sumare" />
                    </>
                  )}

                  {modalAberto === 'senha' && (
                    <>
                      <Campo label="Senha atual" icon={Lock} value={senhaAtual} onChange={setSenhaAtual} type="password" />
                      <Campo label="Nova senha" icon={Lock} value={novaSenha} onChange={setNovaSenha} type="password" />
                      <Campo label="Confirmar senha" icon={Lock} value={confirmarSenha} onChange={setConfirmarSenha} type="password" />
                    </>
                  )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={fecharModal} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={modalAberto === 'dados' ? salvarDados : modalAberto === 'localizacao' ? salvarLocalizacao : salvarSenha}
                    disabled={salvando}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60"
                  >
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
