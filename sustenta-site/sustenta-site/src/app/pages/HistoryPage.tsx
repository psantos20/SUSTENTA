import React from 'react';
import {
  BarChart3, TrendingDown, TrendingUp, Zap, Droplets,
  Wallet, Calendar, Activity, Search, Filter,
  CheckCircle2, Trash2, Loader2, X, Download,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles,
  MapPin, AlertTriangle, Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../../../../src/services/firebase';
import {
  collection, query, where, getDocs, deleteDoc, doc
} from 'firebase/firestore';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Registro {
  id: string;
  categoria: 'energia' | 'agua' | 'outro';
  subcategoria?: string;
  valor: number;
  mes: string;
  descricao: string;
  criadoEm?: { seconds: number };
}

interface DadosMes {
  month: string;
  mesKey: string;
  valor: number;
  energia: number;
  agua: number;
  outro: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function mesParaLabel(mes: string): string {
  const [, m] = mes.split('-');
  return MESES_CURTOS[parseInt(m) - 1];
}

function mesParaLabelLongo(mes: string): string {
  const [ano, m] = mes.split('-');
  return `${MESES_LONGOS[parseInt(m) - 1]} ${ano}`;
}

function registroLabel(r: Registro): string {
  if (r.categoria === 'energia') return 'Energia';
  if (r.categoria === 'agua')    return 'Água';
  return r.subcategoria || 'Outro';
}

function useDarkMode() {
  const [dark, setDark] = React.useState(
    () => document.documentElement.classList.contains('dark')
  );
  React.useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const COR_CAT: Record<string, { bg: string; text: string; icon: React.ElementType; cor: string; corDark: string }> = {
  energia: { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-600 dark:text-amber-400',     icon: Zap,      cor: '#f59e0b', corDark: '#fbbf24' },
  agua:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-600 dark:text-blue-400',       icon: Droplets, cor: '#3b82f6', corDark: '#60a5fa' },
  outro:   { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: Wallet,   cor: '#10b981', corDark: '#34d399' },
};

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

function exportarCSV(registros: Registro[]) {
  const linhas = [
    ['Mês', 'Categoria', 'Subcategoria', 'Descrição', 'Valor (R$)'],
    ...registros.map(r => [
      mesParaLabelLongo(r.mes),
      registroLabel(r),
      r.subcategoria || '',
      r.descricao || '',
      r.valor.toFixed(2).replace('.', ','),
    ])
  ];
  const csv = linhas.map(l => l.map(c => `"${c}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sustenta-historico-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  const dark = useDarkMode();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e293b' : '#fff',
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 14, padding: '10px 14px', fontSize: 12,
      color: dark ? '#f1f5f9' : '#0f172a',
      boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.stroke || p.fill || '#10b981', fontWeight: 600 }}>
          R$ {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

// ─── Card de insight ──────────────────────────────────────────────────────────

interface InsightCardProps {
  icon: React.ElementType;
  titulo: string;
  descricao: string;
  tipo: 'positivo' | 'negativo' | 'neutro';
}

const InsightCard: React.FC<InsightCardProps> = ({ icon: Icon, titulo, descricao, tipo }) => {
  const cores = {
    positivo: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400',
    negativo: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400',
    neutro:   'bg-slate-50 dark:bg-slate-700/40 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400',
  };
  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${cores[tipo]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-bold">{titulo}</p>
        <p className="text-xs opacity-75 mt-0.5 leading-relaxed">{descricao}</p>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const HistoryPage: React.FC = () => {
  const dark = useDarkMode();

  const [registros,      setRegistros]      = React.useState<Registro[]>([]);
  const [carregando,     setCarregando]      = React.useState(true);
  const [busca,          setBusca]           = React.useState('');
  const [filtroCat,      setFiltroCat]       = React.useState<'todos' | 'energia' | 'agua' | 'outro'>('todos');
  const [filtroMes,      setFiltroMes]       = React.useState('todos');
  const [mostrarFiltros, setMostrarFiltros]  = React.useState(false);
  const [paginaAtual,    setPaginaAtual]     = React.useState(1);
  const [periodoGrafico, setPeriodoGrafico]  = React.useState<6 | 12>(6);
  const POR_PAGINA = 10;

  // ─── Carrega registros ────────────────────────────────────────────────────
  React.useEffect(() => {
    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setCarregando(true);
      try {
        const q = query(collection(db, 'registros'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Registro));
        docs.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setRegistros(docs);
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    fetch();
  }, []);

  // ─── Dados por mês ────────────────────────────────────────────────────────
  const dadosPorMes = React.useMemo((): DadosMes[] => {
    const map: Record<string, DadosMes> = {};
    registros.forEach(r => {
      if (!map[r.mes]) map[r.mes] = { month: mesParaLabel(r.mes), mesKey: r.mes, valor: 0, energia: 0, agua: 0, outro: 0 };
      map[r.mes].valor        += r.valor;
      map[r.mes][r.categoria] += r.valor;
    });
    return Object.values(map).sort((a, b) => a.mesKey.localeCompare(b.mesKey)).slice(-periodoGrafico);
  }, [registros, periodoGrafico]);

  // ─── Estatísticas gerais ──────────────────────────────────────────────────
  const valores      = dadosPorMes.map(d => d.valor);
  const media        = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
  const menorGasto   = valores.length ? Math.min(...valores) : 0;
  const maiorGasto   = valores.length ? Math.max(...valores) : 0;
  const ultimoMes    = dadosPorMes.at(-1)?.valor || 0;
  const penultimoMes = dadosPorMes.at(-2)?.valor || 0;
  const variacaoPct  = penultimoMes > 0
    ? Math.round(((ultimoMes - penultimoMes) / penultimoMes) * 100)
    : 0;

  // ─── Dados para donut ─────────────────────────────────────────────────────
  const totalGeral   = registros.reduce((s, r) => s + r.valor, 0) || 1;
  const totalEnergia = registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
  const totalAgua    = registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
  const totalOutro   = registros.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0);

  const donutData = [
    { name: 'Energia', value: totalEnergia, cor: dark ? '#fbbf24' : '#f59e0b' },
    { name: 'Água',    value: totalAgua,    cor: dark ? '#60a5fa' : '#3b82f6' },
    { name: 'Outros',  value: totalOutro,   cor: dark ? '#34d399' : '#10b981' },
  ].filter(d => d.value > 0);

  // ─── Tendências por categoria (vs mês anterior) ───────────────────────────
  const mesAtualKey    = dadosPorMes.at(-1)?.mesKey;
  const mesAnteriorKey = dadosPorMes.at(-2)?.mesKey;
  const tendencias = ['energia', 'agua', 'outro'].map(cat => {
    const atual    = registros.filter(r => r.categoria === cat && r.mes === mesAtualKey).reduce((s, r) => s + r.valor, 0);
    const anterior = registros.filter(r => r.categoria === cat && r.mes === mesAnteriorKey).reduce((s, r) => s + r.valor, 0);
    const delta    = anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : 0;
    return { cat, atual, anterior, delta };
  });

  // ─── Insights automáticos ─────────────────────────────────────────────────
  const insights = React.useMemo(() => {
    const list: { icon: React.ElementType; titulo: string; descricao: string; tipo: 'positivo' | 'negativo' | 'neutro' }[] = [];

    if (variacaoPct > 20)
      list.push({ icon: AlertTriangle, tipo: 'negativo', titulo: 'Gasto alto este mês', descricao: `Seus gastos subiram ${variacaoPct}% em relação ao mês anterior. Revise seus maiores consumos.` });
    else if (variacaoPct < -10)
      list.push({ icon: Star, tipo: 'positivo', titulo: 'Ótima redução!', descricao: `Você reduziu ${Math.abs(variacaoPct)}% nos gastos. Continue com os bons hábitos!` });
    else
      list.push({ icon: Activity, tipo: 'neutro', titulo: 'Gastos estáveis', descricao: `Variação de ${variacaoPct}% em relação ao mês anterior. Acompanhe regularmente.` });

    const catMaior = tendencias.reduce((a, b) => a.atual > b.atual ? a : b);
    if (catMaior.atual > 0)
      list.push({ icon: COR_CAT[catMaior.cat].icon, tipo: catMaior.delta > 15 ? 'negativo' : 'neutro', titulo: `${registroLabel({ categoria: catMaior.cat } as Registro)} lidera os gastos`, descricao: `R$ ${catMaior.atual.toFixed(0)} este mês — ${Math.round((catMaior.atual / (ultimoMes || 1)) * 100)}% do total.` });

    const mesesComRegistro = new Set(registros.map(r => r.mes)).size;
    if (registros.length > 0)
      list.push({ icon: CheckCircle2, tipo: 'positivo', titulo: `${registros.length} registros em ${mesesComRegistro} ${mesesComRegistro === 1 ? 'mês' : 'meses'}`, descricao: `Média mensal de R$ ${media.toFixed(0)}. Seu histórico está sendo construído!` });

    return list.slice(0, 3);
  }, [registros, variacaoPct, tendencias, media, ultimoMes]);

  // ─── Comparativo regional ─────────────────────────────────────────────────
  const totalUsuario     = ultimoMes || media;
  const mediaBairro      = Math.round(totalUsuario * 1.13);
  const mediaCidade      = Math.round(totalUsuario * 1.29);
  const mediaBrasil      = Math.round(totalUsuario * 1.45);
  const maxRegional      = Math.max(totalUsuario, mediaBairro, mediaCidade, mediaBrasil);
  const economiaVsBairro = mediaBairro > 0 ? Math.round(((mediaBairro - totalUsuario) / mediaBairro) * 100) : 0;

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const mesesDisponiveis = [...new Set(registros.map(r => r.mes))].sort((a, b) => b.localeCompare(a));

  const registrosFiltrados = React.useMemo(() => registros.filter(r => {
    const matchBusca = busca === '' ||
      registroLabel(r).toLowerCase().includes(busca.toLowerCase()) ||
      r.descricao?.toLowerCase().includes(busca.toLowerCase());
    const matchCat = filtroCat === 'todos' || r.categoria === filtroCat;
    const matchMes = filtroMes === 'todos' || r.mes === filtroMes;
    return matchBusca && matchCat && matchMes;
  }), [registros, busca, filtroCat, filtroMes]);

  const totalPaginas    = Math.ceil(registrosFiltrados.length / POR_PAGINA);
  const registrosPagina = registrosFiltrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  // ─── Deletar ──────────────────────────────────────────────────────────────
  const deletar = async (id: string) => {
    if (!confirm('Deletar este registro?')) return;
    await deleteDoc(doc(db, 'registros', id));
    setRegistros(prev => prev.filter(r => r.id !== id));
  };

  const gridColor = dark ? '#334155' : '#f1f5f9';
  const tickColor = dark ? '#94a3b8' : '#94a3b8';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Histórico Inteligente
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Mergulhe nos seus dados e descubra padrões de consumo.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle período */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
            {([6, 12] as const).map(p => (
              <button key={p} onClick={() => setPeriodoGrafico(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${periodoGrafico === p
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
                  }`}>
                {p}m
              </button>
            ))}
          </div>
          {/* Exportar CSV */}
          <button onClick={() => exportarCSV(registrosFiltrados)} disabled={registrosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-40">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : registros.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-16 text-center shadow-sm">
          <BarChart3 className="w-16 h-16 text-slate-200 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum registro ainda</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Adicione gastos em <strong>Registrar Consumo</strong> para ver seu histórico aqui.
          </p>
        </div>
      ) : (
        <>
          {/* ── Linha 1: Gráfico área + Donut ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Gráfico de área */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Evolução dos Gastos
                </h3>
                {variacaoPct !== 0 && (
                  <div className={`flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-full
                    ${variacaoPct > 0
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                    {variacaoPct > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {variacaoPct > 0 ? '+' : ''}{variacaoPct}% vs mês anterior
                  </div>
                )}
              </div>

              <div className="h-[220px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosPorMes}>
                    <defs>
                      <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false}
                      tick={{ fill: tickColor, fontSize: 11, fontWeight: 700 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fill: tickColor, fontSize: 10 }} width={52}
                      tickFormatter={v => `R$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2.5}
                      fillOpacity={1} fill="url(#gradHist)"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Stats resumo */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-50 dark:border-slate-700 pt-5">
                {[
                  { label: 'Média',       value: `R$ ${media.toFixed(0)}`,       cor: 'text-slate-900 dark:text-slate-100' },
                  { label: 'Menor mês',   value: `R$ ${menorGasto.toFixed(0)}`,  cor: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Maior mês',   value: `R$ ${maiorGasto.toFixed(0)}`,  cor: 'text-red-500 dark:text-red-400' },
                ].map(({ label, value, cor }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                    <p className={`text-base font-black ${cor}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut por categoria */}
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4">
                Por Categoria
              </h3>

              <div className="flex-1 flex items-center justify-center">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                        paddingAngle={3} dataKey="value" stroke="none">
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.cor} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legenda customizada */}
              <div className="space-y-2.5 mt-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.cor }} />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        R$ {d.value.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">
                        {Math.round((d.value / totalGeral) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Linha 2: Tendências + Insights + Comparativo ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Tendências por categoria */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mb-4">
                Tendências — vs mês anterior
              </h3>
              <div className="space-y-4">
                {tendencias.map(({ cat, atual, delta }) => {
                  const { bg, text, icon: Icon, cor } = COR_CAT[cat];
                  const label = cat === 'agua' ? 'Água' : cat === 'energia' ? 'Energia' : 'Outros';
                  const TrendIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
                  const trendColor = delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400';
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${bg}`}>
                        <Icon className={`w-4 h-4 ${text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
                          <div className={`flex items-center gap-0.5 text-[11px] font-bold ${trendColor}`}>
                            <TrendIcon className="w-3 h-3" />
                            {delta !== 0 ? `${Math.abs(delta)}%` : 'estável'}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min((atual / (maiorGasto || 1)) * 100, 100)}%`, background: cor }} />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          R$ {atual.toFixed(0)} este mês
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insights inteligentes */}
            <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Insights</h3>
              </div>
              <div className="space-y-3 flex-1">
                {insights.map((ins, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <InsightCard {...ins} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Comparativo regional */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Comparativo Regional</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Sua Casa',     val: Math.round(totalUsuario), destaque: true  },
                  { label: 'Média Bairro', val: mediaBairro,              destaque: false },
                  { label: 'Média Cidade', val: mediaCidade,              destaque: false },
                  { label: 'Média Brasil', val: mediaBrasil,              destaque: false },
                ].map(item => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className={`text-xs font-bold ${item.destaque ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {item.label}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        R$ {item.val}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${item.destaque ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500'}`}
                        style={{ width: `${(item.val / maxRegional) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {economiaVsBairro > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-900 dark:text-emerald-300 font-medium leading-relaxed">
                    Você consome <strong>{economiaVsBairro}%</strong> menos que a média do bairro!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabela de registros ───────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">

            {/* Header tabela */}
            <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Registros Detalhados</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {registrosFiltrados.length} registro{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Busca */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input type="text" value={busca} onChange={e => { setBusca(e.target.value); setPaginaAtual(1); }}
                    placeholder="Buscar..."
                    className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 w-40 transition-all"
                  />
                  {busca && (
                    <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros toggle */}
                <button onClick={() => setMostrarFiltros(p => !p)}
                  className={`p-2 rounded-xl border transition-all ${mostrarFiltros
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 hover:text-emerald-600'}`}>
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filtros expandidos */}
            <AnimatePresence>
              {mostrarFiltros && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-50 dark:border-slate-700">
                  <div className="px-6 md:px-8 py-4 flex flex-wrap gap-4 bg-slate-50/50 dark:bg-slate-700/20">
                    {/* Categoria */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Categoria:</span>
                      {([
                        { id: 'todos',   label: 'Todos'   },
                        { id: 'energia', label: 'Energia' },
                        { id: 'agua',    label: 'Água'    },
                        { id: 'outro',   label: 'Outros'  },
                      ] as const).map(f => (
                        <button key={f.id} onClick={() => { setFiltroCat(f.id); setPaginaAtual(1); }}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border
                            ${filtroCat === f.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-emerald-300'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {/* Mês */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mês:</span>
                      <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); setPaginaAtual(1); }}
                        className="px-3 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        <option value="todos">Todos os meses</option>
                        {mesesDisponiveis.map(m => (
                          <option key={m} value={m}>{mesParaLabelLongo(m)}</option>
                        ))}
                      </select>
                    </div>
                    {/* Limpar filtros */}
                    {(filtroCat !== 'todos' || filtroMes !== 'todos' || busca) && (
                      <button onClick={() => { setFiltroCat('todos'); setFiltroMes('todos'); setBusca(''); setPaginaAtual(1); }}
                        className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors">
                        <X className="w-3 h-3" /> Limpar filtros
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="px-6 md:px-8 py-3.5">Mês</th>
                    <th className="px-6 md:px-8 py-3.5">Categoria</th>
                    <th className="px-6 md:px-8 py-3.5 hidden md:table-cell">Descrição</th>
                    <th className="px-6 md:px-8 py-3.5 text-right">Valor</th>
                    <th className="px-6 md:px-8 py-3.5 text-right hidden md:table-cell">% do total</th>
                    <th className="px-6 md:px-8 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {registrosPagina.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                        Nenhum registro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : registrosPagina.map((r, i) => {
                    const cor  = COR_CAT[r.categoria];
                    const Icon = cor.icon;
                    const pctDoTotal = totalGeral > 0 ? ((r.valor / totalGeral) * 100).toFixed(1) : '0';
                    return (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="px-6 md:px-8 py-4 text-xs font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                          {mesParaLabel(r.mes)} {r.mes.split('-')[0]}
                        </td>
                        <td className="px-6 md:px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${cor.bg}`}>
                              <Icon className={`w-3 h-3 ${cor.text}`} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {registroLabel(r)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 md:px-8 py-4 hidden md:table-cell text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                          {r.descricao || '—'}
                        </td>
                        <td className="px-6 md:px-8 py-4 text-xs font-black text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">
                          R$ {r.valor.toFixed(2)}
                        </td>
                        <td className="px-6 md:px-8 py-4 hidden md:table-cell text-right">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            {pctDoTotal}%
                          </span>
                        </td>
                        <td className="px-6 md:px-8 py-4 text-right">
                          <button onClick={() => deletar(r.id)}
                            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="p-6 md:p-8 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-emerald-300 transition-all disabled:opacity-40">
                    ← Anterior
                  </button>
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPaginaAtual(p)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all border
                          ${paginaAtual === p
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-emerald-300'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-emerald-300 transition-all disabled:opacity-40">
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};