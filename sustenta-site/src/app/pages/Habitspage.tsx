import React from 'react';
import {
  Trophy, CheckCircle2, Circle, Zap, Droplets, Trash2,
  Calendar, Star, Plus, X, Loader2, AlertCircle,
  Flame, Users, Target, Award, Leaf, ChevronRight,
  Wallet, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../services/firebase';
import {
  collection, doc, getDoc, setDoc, updateDoc,
  arrayUnion, arrayRemove, getDocs, query, where, Timestamp
} from 'firebase/firestore';
import { useNotificacoes } from '../../app/contexts/NotificacoesPage';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Categoria = 'Água' | 'Energia' | 'Resíduos' | 'Alimentação' | 'Transporte' | 'Geral';

interface Habito {
  id: string;
  titulo: string;
  categoria: Categoria;
  pontos: number;
  personalizado: boolean;
}

interface ProgressoHabito {
  habitoId: string;
  data: string; // YYYY-MM-DD
  xpGanho: number;
}

interface Desafio {
  id: string;
  titulo: string;
  descricao: string;
  recompensa: number; // XP
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  duracaoDias: number;
  categoria: Categoria;
  meta: string;
}

interface ProgressoDesafio {
  desafioId: string;
  progresso: number; // 0-100
  iniciado: string;
  concluido: boolean;
  xpGanho: number;
}

interface DadosUsuarioHabitos {
  uid: string;
  streak: number;
  ultimoRegistro: string;
  diasAtivos: string[]; // últimos 7 dias YYYY-MM-DD
  habitosPersonalizados: Habito[];
  progressoHabitos: ProgressoHabito[];
  progressoDesafios: ProgressoDesafio[];
  xpHabitos: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hoje = () => new Date().toISOString().split('T')[0];

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function ultimos7Dias(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function diaDaSemana(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DIAS_SEMANA[d.getDay()];
}

// ─── Hábitos pré-definidos ────────────────────────────────────────────────────

const HABITOS_PREDEFINIDOS: Habito[] = [
  { id: 'h1', titulo: 'Banho de até 5 minutos',         categoria: 'Água',        pontos: 15,  personalizado: false },
  { id: 'h2', titulo: 'Fechar torneira ao escovar dentes', categoria: 'Água',     pontos: 10,  personalizado: false },
  { id: 'h3', titulo: 'Apagar luzes ao sair do cômodo', categoria: 'Energia',     pontos: 10,  personalizado: false },
  { id: 'h4', titulo: 'Desligar eletrônicos em standby', categoria: 'Energia',    pontos: 15,  personalizado: false },
  { id: 'h5', titulo: 'Usar sacolas reutilizáveis',      categoria: 'Resíduos',   pontos: 5,   personalizado: false },
  { id: 'h6', titulo: 'Separar lixo reciclável',         categoria: 'Resíduos',   pontos: 20,  personalizado: false },
  { id: 'h7', titulo: 'Usar transporte público',         categoria: 'Transporte', pontos: 25,  personalizado: false },
  { id: 'h8', titulo: 'Evitar desperdício de comida',    categoria: 'Alimentação', pontos: 20,  personalizado: false },
];

// ─── Desafios pré-definidos ───────────────────────────────────────────────────

const DESAFIOS_PREDEFINIDOS: Desafio[] = [
  {
    id: 'd1', titulo: 'Semana Zero Plástico',
    descricao: 'Não utilize sacolas ou garrafas plásticas por 7 dias.',
    recompensa: 500, dificuldade: 'Difícil', duracaoDias: 7,
    categoria: 'Resíduos', meta: 'Complete 7 dias sem plástico',
  },
  {
    id: 'd2', titulo: 'Mestre da Água',
    descricao: 'Reduza seu consumo de água em 15% comparado ao mês passado.',
    recompensa: 300, dificuldade: 'Médio', duracaoDias: 30,
    categoria: 'Água', meta: 'Registre conta de água abaixo da meta',
  },
  {
    id: 'd3', titulo: 'Luz de Velas',
    descricao: 'Desligue todos os eletrônicos por 1h todas as noites durante 5 dias.',
    recompensa: 200, dificuldade: 'Fácil', duracaoDias: 5,
    categoria: 'Energia', meta: 'Complete 5 dias sem eletrônicos à noite',
  },
  {
    id: 'd4', titulo: 'Semana Verde',
    descricao: 'Complete todos os hábitos diários por 7 dias consecutivos.',
    recompensa: 700, dificuldade: 'Difícil', duracaoDias: 7,
    categoria: 'Geral', meta: 'Streak de 7 dias completos',
  },
  {
    id: 'd5', titulo: 'Compostagem Doméstica',
    descricao: 'Inicie uma compostagem em casa e registre por 14 dias.',
    recompensa: 400, dificuldade: 'Médio', duracaoDias: 14,
    categoria: 'Resíduos', meta: 'Registre compostagem por 14 dias',
  },
];

// ─── Cores por categoria ──────────────────────────────────────────────────────

const COR_CATEGORIA: Record<Categoria, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  'Água':        { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-100 dark:border-blue-800/40',    icon: Droplets },
  'Energia':     { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-100 dark:border-amber-800/40',  icon: Zap      },
  'Resíduos':    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800/40', icon: Trash2 },
  'Alimentação': { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800/40', icon: Leaf  },
  'Transporte':  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800/40', icon: Target },
  'Geral':       { bg: 'bg-slate-50 dark:bg-slate-700/30',  text: 'text-slate-600 dark:text-slate-400',  border: 'border-slate-100 dark:border-slate-700',     icon: Star   },
};

const COR_DIFICULDADE = {
  'Fácil':  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40',
  'Médio':  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
  'Difícil':'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/40',
};

// ─── Componente ──────────────────────────────────────────────────────────────

export const HabitsPage: React.FC = () => {
  const { recarregar: recarregarNotifs } = useNotificacoes();

  const [activeTab, setActiveTab] = React.useState<'habitos' | 'desafios' | 'ranking'>('habitos');
  const [dados, setDados]         = React.useState<DadosUsuarioHabitos | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando]   = React.useState<string | null>(null);

  // Modal novo hábito
  const [modalHabito, setModalHabito]   = React.useState(false);
  const [novoTitulo, setNovoTitulo]     = React.useState('');
  const [novaCategoria, setNovaCategoria] = React.useState<Categoria>('Geral');
  const [novoPontos, setNovoPontos]     = React.useState('20');

  // Ranking familiar
  const [rankingFamilia, setRankingFamilia] = React.useState<{ nome: string; xp: number; uid: string }[]>([]);

  // ─── Carrega dados do usuário ─────────────────────────────────────────────
  React.useEffect(() => {
    const fetchDados = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setCarregando(true);
      try {
        const snap = await getDoc(doc(db, 'habitos_usuarios', user.uid));
        if (snap.exists()) {
          setDados(snap.data() as DadosUsuarioHabitos);
        } else {
          // Inicializa documento
          const inicial: DadosUsuarioHabitos = {
            uid: user.uid,
            streak: 0,
            ultimoRegistro: '',
            diasAtivos: [],
            habitosPersonalizados: [],
            progressoHabitos: [],
            progressoDesafios: [],
            xpHabitos: 0,
          };
          await setDoc(doc(db, 'habitos_usuarios', user.uid), inicial);
          setDados(inicial);
        }

        // Ranking familiar
        const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
        const grupoId  = userSnap.data()?.grupoFamiliaId;
        if (grupoId) {
          const grupoSnap = await getDoc(doc(db, 'grupos_familia', grupoId));
          if (grupoSnap.exists()) {
            const membros = grupoSnap.data().membros || [];
            const ranking = await Promise.all(
              membros.map(async (m: any) => {
                const hSnap = await getDoc(doc(db, 'habitos_usuarios', m.uid));
                return {
                  uid: m.uid,
                  nome: m.nome,
                  xp: hSnap.exists() ? (hSnap.data().xpHabitos || 0) : 0,
                };
              })
            );
            setRankingFamilia(ranking.sort((a, b) => b.xp - a.xp));
          }
        }
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    fetchDados();
  }, []);

  // ─── Marca hábito como feito ──────────────────────────────────────────────
  const marcarHabito = async (habito: Habito) => {
    const user = auth.currentUser;
    if (!user || !dados) return;
    const dataHoje = hoje();

    // Já foi marcado hoje?
    const jaFeito = dados.progressoHabitos.some(
      p => p.habitoId === habito.id && p.data === dataHoje
    );
    if (jaFeito) return;

    setSalvando(habito.id);
    try {
      const novoProgresso: ProgressoHabito = {
        habitoId: habito.id,
        data: dataHoje,
        xpGanho: habito.pontos,
      };

      // Atualiza streak
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const ontemStr = ontem.toISOString().split('T')[0];
      const streakAtual = dados.ultimoRegistro === ontemStr || dados.ultimoRegistro === dataHoje
        ? dados.streak + (dados.ultimoRegistro === dataHoje ? 0 : 1)
        : 1;

      const diasAtivosNovos = [...new Set([...dados.diasAtivos, dataHoje])].slice(-7);
      const novoXP = (dados.xpHabitos || 0) + habito.pontos;

      const dadosAtualizados: Partial<DadosUsuarioHabitos> = {
        progressoHabitos: [...dados.progressoHabitos, novoProgresso],
        streak: streakAtual,
        ultimoRegistro: dataHoje,
        diasAtivos: diasAtivosNovos,
        xpHabitos: novoXP,
      };

      await updateDoc(doc(db, 'habitos_usuarios', user.uid), dadosAtualizados);

      // Atualiza XP no perfil de usuário também
      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      const xpAtual = userSnap.data()?.xpHabitos || 0;
      await updateDoc(doc(db, 'usuarios', user.uid), { xpHabitos: xpAtual + habito.pontos });

      setDados(prev => prev ? { ...prev, ...dadosAtualizados } : prev);
      recarregarNotifs();
    } catch (e) { console.error(e); }
    setSalvando(null);
  };

  // ─── Desmarca hábito ──────────────────────────────────────────────────────
  const desmarcarHabito = async (habito: Habito) => {
    const user = auth.currentUser;
    if (!user || !dados) return;
    const dataHoje = hoje();

    const progresso = dados.progressoHabitos.find(
      p => p.habitoId === habito.id && p.data === dataHoje
    );
    if (!progresso) return;

    setSalvando(habito.id);
    try {
      const novoProgresso = dados.progressoHabitos.filter(
        p => !(p.habitoId === habito.id && p.data === dataHoje)
      );
      const novoXP = Math.max(0, (dados.xpHabitos || 0) - habito.pontos);

      await updateDoc(doc(db, 'habitos_usuarios', user.uid), {
        progressoHabitos: novoProgresso,
        xpHabitos: novoXP,
      });
      setDados(prev => prev ? { ...prev, progressoHabitos: novoProgresso, xpHabitos: novoXP } : prev);
    } catch (e) { console.error(e); }
    setSalvando(null);
  };

  // ─── Participar / atualizar desafio ───────────────────────────────────────
  const participarDesafio = async (desafio: Desafio) => {
    const user = auth.currentUser;
    if (!user || !dados) return;
    setSalvando(desafio.id);
    try {
      const jaExiste = dados.progressoDesafios.find(p => p.desafioId === desafio.id);
      if (jaExiste) { setSalvando(null); return; }

      const novoProgresso: ProgressoDesafio = {
        desafioId: desafio.id,
        progresso: 0,
        iniciado: hoje(),
        concluido: false,
        xpGanho: 0,
      };

      const novosDesafios = [...dados.progressoDesafios, novoProgresso];
      await updateDoc(doc(db, 'habitos_usuarios', user.uid), { progressoDesafios: novosDesafios });
      setDados(prev => prev ? { ...prev, progressoDesafios: novosDesafios } : prev);
    } catch (e) { console.error(e); }
    setSalvando(null);
  };

  // ─── Avançar progresso do desafio ────────────────────────────────────────
  const avancarDesafio = async (desafio: Desafio) => {
    const user = auth.currentUser;
    if (!user || !dados) return;
    setSalvando(desafio.id);
    try {
      const progAtual = dados.progressoDesafios.find(p => p.desafioId === desafio.id);
      if (!progAtual || progAtual.concluido) { setSalvando(null); return; }

      const novoProgresso = Math.min(100, progAtual.progresso + Math.round(100 / desafio.duracaoDias));
      const concluido     = novoProgresso >= 100;
      const xpGanho       = concluido ? desafio.recompensa : 0;

      const novosDesafios = dados.progressoDesafios.map(p =>
        p.desafioId === desafio.id
          ? { ...p, progresso: novoProgresso, concluido, xpGanho }
          : p
      );

      await updateDoc(doc(db, 'habitos_usuarios', user.uid), {
        progressoDesafios: novosDesafios,
        xpHabitos: (dados.xpHabitos || 0) + xpGanho,
      });
      setDados(prev => prev ? {
        ...prev,
        progressoDesafios: novosDesafios,
        xpHabitos: (prev.xpHabitos || 0) + xpGanho,
      } : prev);

      if (concluido) recarregarNotifs();
    } catch (e) { console.error(e); }
    setSalvando(null);
  };

  // ─── Criar hábito personalizado ───────────────────────────────────────────
  const criarHabito = async () => {
    if (!novoTitulo.trim()) return;
    const user = auth.currentUser;
    if (!user || !dados) return;
    setSalvando('novo');
    try {
      const novoHabito: Habito = {
        id: `custom_${Date.now()}`,
        titulo: novoTitulo.trim(),
        categoria: novaCategoria,
        pontos: parseInt(novoPontos) || 20,
        personalizado: true,
      };
      const novosPersonalizados = [...dados.habitosPersonalizados, novoHabito];
      await updateDoc(doc(db, 'habitos_usuarios', user.uid), {
        habitosPersonalizados: novosPersonalizados,
      });
      setDados(prev => prev ? { ...prev, habitosPersonalizados: novosPersonalizados } : prev);
      setNovoTitulo(''); setNovaCategoria('Geral'); setNovoPontos('20');
      setModalHabito(false);
    } catch (e) { console.error(e); }
    setSalvando(null);
  };

  // ─── Deletar hábito personalizado ────────────────────────────────────────
  const deletarHabito = async (id: string) => {
    const user = auth.currentUser;
    if (!user || !dados) return;
    const novos = dados.habitosPersonalizados.filter(h => h.id !== id);
    await updateDoc(doc(db, 'habitos_usuarios', user.uid), { habitosPersonalizados: novos });
    setDados(prev => prev ? { ...prev, habitosPersonalizados: novos } : prev);
  };

  if (carregando) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  // ─── Derivações ───────────────────────────────────────────────────────────
  const todosHabitos    = [...HABITOS_PREDEFINIDOS, ...(dados?.habitosPersonalizados || [])];
  const dataHoje        = hoje();
  const feitos          = todosHabitos.filter(h =>
    dados?.progressoHabitos.some(p => p.habitoId === h.id && p.data === dataHoje)
  );
  const concluidos      = feitos.length;
  const total           = todosHabitos.length;
  const percentual      = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const dias7           = ultimos7Dias();
  const streak          = dados?.streak || 0;
  const xpHabitos       = dados?.xpHabitos || 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">

      {/* Header + tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Ação Sustentável
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Transforme sua rotina com pequenos hábitos e desafios mensais.
          </p>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
          {([
            { id: 'habitos',  label: 'Checklist Diário'  },
            { id: 'desafios', label: 'Desafios Mensais'  },
            { id: 'ranking',  label: 'Ranking'           },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg font-bold text-sm transition-all
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════ ABA HÁBITOS ══════════════ */}
        {activeTab === 'habitos' && (
          <motion.div key="habitos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Lista de hábitos */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">
                  Tarefas para hoje — {concluidos}/{total}
                </h3>
                <button onClick={() => setModalHabito(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 hover:underline">
                  <Plus className="w-3 h-3" /> Adicionar Hábito
                </button>
              </div>

              <div className="space-y-3">
                {todosHabitos.map(habito => {
                  const feito    = feitos.some(h => h.id === habito.id);
                  const carregandoEste = salvando === habito.id;
                  const cor      = COR_CATEGORIA[habito.categoria];
                  const CatIcon  = cor.icon;
                  return (
                    <motion.div key={habito.id} layout
                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all
                        ${feito
                          ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/40'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 shadow-sm hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => feito ? desmarcarHabito(habito) : marcarHabito(habito)}
                          disabled={carregandoEste}
                          className="transition-transform active:scale-90 shrink-0"
                        >
                          {carregandoEste
                            ? <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
                            : feito
                              ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                              : <Circle className="w-7 h-7 text-slate-200 dark:text-slate-600 hover:text-emerald-400 transition-colors" />
                          }
                        </button>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 ${cor.bg} ${cor.text}`}>
                              <CatIcon className="w-2.5 h-2.5" />
                              {habito.categoria}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              +{habito.pontos} XP
                            </span>
                            {habito.personalizado && (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                Personalizado
                              </span>
                            )}
                          </div>
                          <h4 className={`font-bold text-sm transition-all
                            ${feito
                              ? 'line-through text-slate-400 dark:text-slate-500 decoration-slate-300'
                              : 'text-slate-900 dark:text-slate-100'
                            }`}>
                            {habito.titulo}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {habito.personalizado && (
                          <button onClick={() => deletarHabito(habito.id)}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar — progresso + streak */}
            <div className="space-y-6">
              {/* Progresso diário */}
              <div className="bg-emerald-700 p-6 rounded-3xl shadow-xl shadow-emerald-200/30 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-600 rounded-full blur-2xl opacity-50" />
                <div className="relative z-10">
                  <div className="bg-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/50">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Progresso Diário</h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-black">{concluidos}/{total}</span>
                    <span className="text-emerald-200 font-medium">concluídos</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-800 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-emerald-100 font-medium">
                    {concluidos === total && total > 0
                      ? '🎉 Parabéns! Todos os hábitos concluídos hoje!'
                      : `Complete mais ${total - concluidos} hábito${total - concluidos !== 1 ? 's' : ''} para ganhar bônus!`
                    }
                  </p>
                  <div className="mt-4 pt-4 border-t border-emerald-600 flex items-center justify-between">
                    <span className="text-xs text-emerald-200">XP de hábitos</span>
                    <span className="text-sm font-black">{xpHabitos} XP</span>
                  </div>
                </div>
              </div>

              {/* Streak semanal */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Sua Sequência</h3>
                  <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400">{streak}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center px-1">
                  {dias7.map((dia, i) => {
                    const ativo = dados?.diasAtivos?.includes(dia);
                    const label = diaDaSemana(dia);
                    const ehHoje = dia === dataHoje;
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{label}</span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                          ${ativo
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : ehHoje
                              ? 'bg-white dark:bg-slate-700 border-emerald-300 dark:border-emerald-700 text-emerald-400'
                              : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                          }`}>
                          {ativo
                            ? <CheckCircle2 className="w-4 h-4" />
                            : <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                {streak > 0 && (
                  <div className="mt-5 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                    <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl text-emerald-600 shadow-sm shrink-0">
                      <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        {streak >= 7 ? 'Mestre da Consistência! 🏆' : streak >= 3 ? 'Ótima sequência! 🔥' : 'Continue assim!'}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                        {streak} dia{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''} ativo{streak !== 1 ? 's' : ''}!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ ABA DESAFIOS ══════════════ */}
        {activeTab === 'desafios' && (
          <motion.div key="desafios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {DESAFIOS_PREDEFINIDOS.map(desafio => {
              const progresso  = dados?.progressoDesafios.find(p => p.desafioId === desafio.id);
              const iniciado   = !!progresso;
              const concluido  = progresso?.concluido || false;
              const pct        = progresso?.progresso || 0;
              const cor        = COR_CATEGORIA[desafio.categoria];
              const CatIcon    = cor.icon;
              const carregandoEste = salvando === desafio.id;

              return (
                <motion.div key={desafio.id} layout
                  className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl dark:hover:shadow-slate-900/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${COR_DIFICULDADE[desafio.dificuldade]}`}>
                        {desafio.dificuldade}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cor.bg} ${cor.text}`}>
                        <CatIcon className="w-3 h-3" />
                        {desafio.categoria}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {desafio.titulo}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                      {desafio.descricao}
                    </p>

                    {iniciado && (
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Progresso</span>
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 rounded-full ${concluido ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Meta: {desafio.meta}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        +{desafio.recompensa} XP
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        · {desafio.duracaoDias} dias
                      </span>
                    </div>

                    {concluido ? (
                      <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                      </span>
                    ) : iniciado ? (
                      <button onClick={() => avancarDesafio(desafio)} disabled={!!carregandoEste}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 active:scale-95 disabled:opacity-60">
                        {carregandoEste ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
                        Registrar avanço
                      </button>
                    ) : (
                      <button onClick={() => participarDesafio(desafio)} disabled={!!carregandoEste}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60">
                        {carregandoEste ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Participar
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Próximos desafios (placeholder) */}
            {[1, 2].map((_, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4 opacity-60">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-400 dark:text-slate-500">Próximos Desafios</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Em breve</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ══════════════ ABA RANKING ══════════════ */}
        {activeTab === 'ranking' && (
          <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Ranking Familiar</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">XP acumulado em hábitos</p>
                </div>
              </div>

              {rankingFamilia.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Nenhum grupo familiar ativo</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Crie ou entre em um grupo em <strong>Perfil → Modo Família</strong>
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {rankingFamilia.map((membro, i) => {
                    const isUser = membro.uid === auth.currentUser?.uid;
                    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
                    return (
                      <div key={membro.uid}
                        className={`flex items-center gap-4 px-8 py-5 transition-colors
                          ${isUser ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                        <span className="text-xl w-8 text-center">{medalha}</span>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                          ${isUser
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                          {membro.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${isUser ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {membro.nome} {isUser && <span className="text-[10px] font-bold text-emerald-500">(você)</span>}
                          </p>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: rankingFamilia[0].xp > 0 ? `${(membro.xp / rankingFamilia[0].xp) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100 shrink-0">
                          {membro.xp} <span className="text-xs font-bold text-slate-400">XP</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card do usuário atual */}
            <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-200/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Seu desempenho</h4>
                <Award className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'XP Total',    value: String(xpHabitos)                        },
                  { label: 'Streak',      value: `${streak} dias`                          },
                  { label: 'Hoje',        value: `${concluidos}/${total}`                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-emerald-700/50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black">{value}</p>
                    <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL NOVO HÁBITO ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalHabito && (
          <>
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setModalHabito(false)} />
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Novo Hábito Personalizado</h3>
                  <button onClick={() => setModalHabito(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Título</label>
                    <input type="text" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
                      placeholder="Ex: Reduzir uso do ar-condicionado"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Categoria</label>
                    <select value={novaCategoria} onChange={e => setNovaCategoria(e.target.value as Categoria)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100">
                      {(['Água', 'Energia', 'Resíduos', 'Alimentação', 'Transporte', 'Geral'] as Categoria[]).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">XP por conclusão</label>
                    <input type="number" min="5" max="100" value={novoPontos} onChange={e => setNovoPontos(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={() => setModalHabito(false)}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm">
                    Cancelar
                  </button>
                  <button onClick={criarHabito} disabled={!novoTitulo.trim() || salvando === 'novo'}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60 shadow-sm shadow-emerald-200">
                    {salvando === 'novo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Criar Hábito
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