import React from 'react';
import {
  TrendingUp, TrendingDown, Zap, Droplets, Wallet,
  BarChart3, MapPin, Loader2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, Info,
  Lightbulb, Star, ThumbsDown
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, PieChart, Pie
} from 'recharts';
import { buscarTodosRegistros, type Registro } from '../../../../src/services/consumo';
import { auth, db } from '../../../../src/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { tarifas } from '../../../../src/services/localidades';

// ─── Dark mode hook ───────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = React.useState(() =>
    document.documentElement.classList.contains('dark')
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

// ─── Tooltip customizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  const dark = useDarkMode();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e293b' : '#fff',
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12, padding: '10px 14px', fontSize: 13,
      color: dark ? '#f1f5f9' : '#0f172a',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: R$ {Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  const dark = useDarkMode();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: dark ? '#1e293b' : '#fff',
      border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12, padding: '8px 12px', fontSize: 12,
      color: dark ? '#f1f5f9' : '#0f172a',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <p style={{ fontWeight: 700, color: payload[0].payload.color }}>
        {payload[0].name}: R$ {Number(payload[0].value).toFixed(2)} ({payload[0].payload.pct}%)
      </p>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function mesLabel(mes: string) {
  const [ano, m] = mes.split('-');
  return `${MESES_PT[parseInt(m) - 1]}/${ano.slice(2)}`;
}

function mediaRegional(estado: string, categoria: 'energia' | 'agua') {
  const tarifa = tarifas[estado];
  if (!tarifa) return categoria === 'energia' ? 180 : 90;
  const base = categoria === 'energia' ? 200 : 100;
  return Math.round(base * (tarifa[categoria] / 0.80));
}

function preverProximoMes(valores: number[]): number {
  if (valores.length === 0) return 0;
  if (valores.length === 1) return valores[0];
  const ultimos = valores.slice(-3);
  const pesos = [1, 2, 3].slice(0, ultimos.length);
  const soma = ultimos.reduce((s, v, i) => s + v * pesos[i], 0);
  return soma / pesos.reduce((s, p) => s + p, 0);
}

type Periodo = '3m' | '6m' | '12m' | 'tudo';

// ─── Insights automáticos ─────────────────────────────────────────────────────
function gerarInsights(params: {
  porMes: any[];
  totalEnergia: number;
  totalAgua: number;
  totalOutro: number;
  totalGeral: number;
  mediaMensal: number;
  estado: string;
  melhorMes: any;
  piorMes: any;
  variacaoTotal: number;
}) {
  const insights: { tipo: 'positivo' | 'negativo' | 'neutro'; texto: string; icone: string }[] = [];
  const { totalEnergia, totalAgua, totalGeral, mediaMensal, estado, melhorMes, piorMes, variacaoTotal, porMes } = params;

  const mediaRegE = estado ? mediaRegional(estado, 'energia') : 180;
  const mediaRegA = estado ? mediaRegional(estado, 'agua') : 90;
  const mediaRegMesE = porMes.length > 0 ? totalEnergia / porMes.length : 0;
  const mediaRegMesA = porMes.length > 0 ? totalAgua / porMes.length : 0;

  if (mediaRegMesE < mediaRegE * 0.8)
    insights.push({ tipo: 'positivo', icone: '⚡', texto: `Seu gasto médio com energia (R$ ${mediaRegMesE.toFixed(0)}/mês) está ${Math.round(((mediaRegE - mediaRegMesE) / mediaRegE) * 100)}% abaixo da média regional. Continue assim!` });
  else if (mediaRegMesE > mediaRegE * 1.2)
    insights.push({ tipo: 'negativo', icone: '⚡', texto: `Seu gasto com energia está ${Math.round(((mediaRegMesE - mediaRegE) / mediaRegE) * 100)}% acima da média regional. Considere trocar lâmpadas por LED e desligar aparelhos em stand-by.` });

  if (mediaRegMesA < mediaRegA * 0.8)
    insights.push({ tipo: 'positivo', icone: '💧', texto: `Excelente! Seu consumo de água (R$ ${mediaRegMesA.toFixed(0)}/mês) está bem abaixo da média regional.` });
  else if (mediaRegMesA > mediaRegA * 1.2)
    insights.push({ tipo: 'negativo', icone: '💧', texto: `Água acima da média regional. Verifique vazamentos e reduza o tempo de banho para economizar.` });

  if (variacaoTotal < -10)
    insights.push({ tipo: 'positivo', icone: '📉', texto: `Ótimo progresso! Seus gastos caíram ${Math.abs(variacaoTotal).toFixed(0)}% no último mês.` });
  else if (variacaoTotal > 20)
    insights.push({ tipo: 'negativo', icone: '📈', texto: `Seus gastos subiram ${variacaoTotal.toFixed(0)}% no último mês. Revise seus hábitos de consumo.` });

  if (melhorMes && piorMes && melhorMes.mes !== piorMes.mes) {
    const economia = piorMes.total - melhorMes.total;
    insights.push({ tipo: 'neutro', icone: '📊', texto: `Sua maior economia foi em ${mesLabel(melhorMes.mes)} (R$ ${melhorMes.total.toFixed(0)}). Se replicar esse mês todo ano, economizaria R$ ${(economia * 12).toFixed(0)}/ano.` });
  }

  const pctOutro = totalGeral > 0 ? (params.totalOutro / totalGeral) * 100 : 0;
  if (pctOutro > 60)
    insights.push({ tipo: 'negativo', icone: '🏷️', texto: `"Outros gastos" representa ${pctOutro.toFixed(0)}% do seu total. Detalhe melhor as subcategorias para identificar onde cortar.` });

  if (insights.length === 0)
    insights.push({ tipo: 'neutro', icone: '🌱', texto: 'Continue registrando seus gastos mensalmente para receber insights cada vez mais precisos!' });

  return insights;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const AnalysisPage: React.FC = () => {
  const dark = useDarkMode();
  const [carregando, setCarregando] = React.useState(true);
  const [registros,  setRegistros]  = React.useState<Registro[]>([]);
  const [estado,     setEstado]     = React.useState('');
  const [periodo,    setPeriodo]    = React.useState<Periodo>('tudo');

  const gridColor = dark ? '#334155' : '#f1f5f9';
  const tickColor = dark ? '#94a3b8' : '#64748b';

  React.useEffect(() => {
    const carregar = async () => {
      const [regs, user] = await Promise.all([
        buscarTodosRegistros(),
        Promise.resolve(auth.currentUser),
      ]);
      setRegistros(regs);
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) setEstado(snap.data().estado || '');
      }
      setCarregando(false);
    };
    carregar();
  }, []);

  // ── Filtra por período ──────────────────────────────────────────────────────
  const registrosFiltrados = React.useMemo(() => {
    if (periodo === 'tudo') return registros;
    const meses = periodo === '3m' ? 3 : periodo === '6m' ? 6 : 12;
    const hoje = new Date();
    const limite = new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1);
    const limiteStr = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}`;
    return registros.filter(r => r.mes >= limiteStr);
  }, [registros, periodo]);

  // ── Agrupa por mês ──────────────────────────────────────────────────────────
  const porMes = React.useMemo(() => {
    const map: Record<string, { energia: number; agua: number; outro: number; total: number }> = {};
    registrosFiltrados.forEach(r => {
      if (!map[r.mes]) map[r.mes] = { energia: 0, agua: 0, outro: 0, total: 0 };
      map[r.mes][r.categoria] += r.valor;
      map[r.mes].total += r.valor;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, label: mesLabel(mes), ...v }));
  }, [registrosFiltrados]);

  // ── Estatísticas ────────────────────────────────────────────────────────────
  const totalGeral   = registrosFiltrados.reduce((s, r) => s + r.valor, 0);
  const totalEnergia = registrosFiltrados.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
  const totalAgua    = registrosFiltrados.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
  const totalOutro   = registrosFiltrados.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0);
  const mediaMensal  = porMes.length > 0 ? totalGeral / porMes.length : 0;

  const ultimoMes    = porMes[porMes.length - 1];
  const penultimoMes = porMes[porMes.length - 2];
  const variacaoTotal = penultimoMes && ultimoMes
    ? ((ultimoMes.total - penultimoMes.total) / penultimoMes.total) * 100 : 0;

  // Melhor e pior mês
  const melhorMes = porMes.length > 0 ? porMes.reduce((m, c) => c.total < m.total ? c : m) : null;
  const piorMes   = porMes.length > 0 ? porMes.reduce((m, c) => c.total > m.total ? c : m) : null;

  // ── Previsão ─────────────────────────────────────────────────────────────────
  const previsoesProxMes = {
    energia: preverProximoMes(porMes.map(m => m.energia)),
    agua:    preverProximoMes(porMes.map(m => m.agua)),
    outro:   preverProximoMes(porMes.map(m => m.outro)),
  };
  const previsaoTotal = previsoesProxMes.energia + previsoesProxMes.agua + previsoesProxMes.outro;

  const dadosLinha = React.useMemo(() => {
    if (porMes.length === 0) return [];
    const hoje = new Date();
    const proxMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 2).padStart(2, '0')}`;
    return [
      ...porMes,
      { mes: proxMes, label: `${mesLabel(proxMes)} ✦`, ...previsoesProxMes, total: previsaoTotal, previsao: true },
    ];
  }, [porMes, previsoesProxMes, previsaoTotal]);

  // ── Média regional ──────────────────────────────────────────────────────────
  const mediaRegEnergia = estado ? mediaRegional(estado, 'energia') : 180;
  const mediaRegAgua    = estado ? mediaRegional(estado, 'agua')    : 90;
  const mediaRegMes     = porMes.length > 0
    ? { energia: totalEnergia / porMes.length, agua: totalAgua / porMes.length }
    : { energia: 0, agua: 0 };

  const dadosRegional = [
    { name: 'Energia', voce: Math.round(mediaRegMes.energia), media: mediaRegEnergia, color: '#f59e0b' },
    { name: 'Água',    voce: Math.round(mediaRegMes.agua),    media: mediaRegAgua,    color: '#0ea5e9' },
  ];

  // ── Subcategorias ────────────────────────────────────────────────────────────
  const subcats: Record<string, number> = {};
  registrosFiltrados.filter(r => r.categoria === 'outro').forEach(r => {
    const nome = (r as any).subcategoria || 'Outro';
    subcats[nome] = (subcats[nome] || 0) + r.valor;
  });
  const dadosSubs = Object.entries(subcats)
    .sort(([, a], [, b]) => b - a)
    .map(([name, valor]) => ({ name, valor }));

  const CORES_SUBS = ['#10b981','#8b5cf6','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316'];

  // ── Pizza ────────────────────────────────────────────────────────────────────
  const dadosPizza = [
    { name: 'Energia', value: totalEnergia, color: '#f59e0b', pct: totalGeral > 0 ? Math.round((totalEnergia / totalGeral) * 100) : 0 },
    { name: 'Água',    value: totalAgua,    color: '#0ea5e9', pct: totalGeral > 0 ? Math.round((totalAgua    / totalGeral) * 100) : 0 },
    { name: 'Outros',  value: totalOutro,   color: '#10b981', pct: totalGeral > 0 ? Math.round((totalOutro   / totalGeral) * 100) : 0 },
  ].filter(d => d.value > 0);

  // ── Insights ─────────────────────────────────────────────────────────────────
  const insights = React.useMemo(() => gerarInsights({
    porMes, totalEnergia, totalAgua, totalOutro: totalOutro, totalGeral,
    mediaMensal, estado, melhorMes, piorMes, variacaoTotal,
  }), [porMes, totalEnergia, totalAgua, totalOutro, totalGeral, mediaMensal, estado, melhorMes, piorMes, variacaoTotal]);

  if (carregando) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  if (registros.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nenhum dado ainda</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Registre seus gastos em <strong>Registrar Consumo</strong> para ver as análises!
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8 pb-8">

      {/* Header + Filtro de período */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Análises & Insights</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {porMes.length} {porMes.length === 1 ? 'mês' : 'meses'} de dados analisados.
          </p>
        </div>

        {/* Filtro período */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
          {(['3m', '6m', '12m', 'tudo'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all
                ${periodo === p
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {p === 'tudo' ? 'Tudo' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Acumulado', value: totalGeral,   icon: Wallet,   color: 'indigo'  },
          { label: 'Média Mensal',    value: mediaMensal,  icon: BarChart3, color: 'emerald' },
          { label: 'Energia Total',   value: totalEnergia, icon: Zap,      color: 'amber'   },
          { label: 'Água Total',      value: totalAgua,    icon: Droplets, color: 'blue'    },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center
              ${color === 'indigo'  ? 'bg-indigo-50 dark:bg-indigo-900/20'   : ''}
              ${color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}
              ${color === 'amber'   ? 'bg-amber-50 dark:bg-amber-900/20'     : ''}
              ${color === 'blue'    ? 'bg-blue-50 dark:bg-blue-900/20'       : ''}
            `}>
              <Icon className={`w-5 h-5
                ${color === 'indigo'  ? 'text-indigo-600 dark:text-indigo-400'   : ''}
                ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                ${color === 'amber'   ? 'text-amber-600 dark:text-amber-400'     : ''}
                ${color === 'blue'    ? 'text-blue-600 dark:text-blue-400'       : ''}
              `} />
            </div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">R$ {value.toFixed(0)}</p>
          </motion.div>
        ))}
      </div>

      {/* Melhor e pior mês */}
      {melhorMes && piorMes && melhorMes.mes !== piorMes.mes && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl">
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl shrink-0">
              <Star className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Melhor Mês</p>
              <p className="text-lg font-black text-emerald-900 dark:text-emerald-300">{mesLabel(melhorMes.mes)}</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">R$ {melhorMes.total.toFixed(2)}</p>
            </div>
            {piorMes && (
              <div className="ml-auto text-right">
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Economia vs pior mês</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  R$ {(piorMes.total - melhorMes.total).toFixed(2)}
                </p>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl">
            <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-xl shrink-0">
              <ThumbsDown className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-0.5">Pior Mês</p>
              <p className="text-lg font-black text-red-900 dark:text-red-300">{mesLabel(piorMes.mes)}</p>
              <p className="text-sm text-red-700 dark:text-red-400 font-semibold">R$ {piorMes.total.toFixed(2)}</p>
            </div>
            {melhorMes && (
              <div className="ml-auto text-right">
                <p className="text-xs text-red-500 dark:text-red-400">Acima do melhor mês</p>
                <p className="text-sm font-black text-red-500 dark:text-red-400">
                  +{(((piorMes.total - melhorMes.total) / melhorMes.total) * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Variação último mês */}
      {ultimoMes && penultimoMes && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-bold
            ${variacaoTotal > 5
              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-400'
              : variacaoTotal < -5
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
          {variacaoTotal > 5 ? <TrendingUp className="w-4 h-4" /> : variacaoTotal < -5 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          <span>
            {variacaoTotal > 0 ? '+' : ''}{variacaoTotal.toFixed(1)}% em relação a {penultimoMes.label} →{' '}
            {ultimoMes.label}: R$ {ultimoMes.total.toFixed(2)} vs R$ {penultimoMes.total.toFixed(2)}
          </span>
        </motion.div>
      )}

      {/* Gráfico de evolução mensal */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Evolução Mensal</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Histórico + previsão do próximo mês <span className="text-emerald-500 font-bold">✦</span>
            </p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosLinha} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={55}
                tickFormatter={v => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
              <Line type="monotone" dataKey="energia" name="Energia" stroke="#f59e0b" strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="agua" name="Água" stroke="#0ea5e9" strokeWidth={2.5}
                dot={{ r: 3, fill: '#0ea5e9' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="outro" name="Outros" stroke="#10b981" strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" strokeWidth={2.5}
                strokeDasharray="5 3" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Grid: Comparação categorias + Pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Barras por categoria */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Comparação por Categoria</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Total acumulado no período</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Energia', valor: totalEnergia, color: '#f59e0b' },
                { name: 'Água',    valor: totalAgua,    color: '#0ea5e9' },
                { name: 'Outros',  valor: totalOutro,   color: '#10b981' },
              ]} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={55}
                  tickFormatter={v => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Total" radius={[8, 8, 0, 0]} barSize={48}>
                  {[{ color: '#f59e0b' }, { color: '#0ea5e9' }, { color: '#10b981' }].map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Energia', valor: totalEnergia, color: '#f59e0b' },
              { label: 'Água',    valor: totalAgua,    color: '#0ea5e9' },
              { label: 'Outros',  valor: totalOutro,   color: '#10b981' },
            ].map(({ label, valor, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{label}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">R$ {valor.toFixed(2)}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">
                  {totalGeral > 0 ? Math.round((valor / totalGeral) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pizza */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Distribuição %</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Proporção de cada categoria no total</p>
          {dadosPizza.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value" nameKey="name">
                      {dadosPizza.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 shrink-0">
                {dadosPizza.map(({ name, value, color, pct }) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">R$ {value.toFixed(0)} • {pct}%</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total</p>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">R$ {totalGeral.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sem dados suficientes</div>
          )}
        </motion.div>
      </div>

      {/* Subcategorias */}
      {dadosSubs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Detalhamento — Outros</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Distribuição das subcategorias</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosSubs} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                  tick={{ fill: tickColor, fontSize: 11 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: dark ? '#334155' : '#f8fafc' }} />
                <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]} barSize={14}>
                  {dadosSubs.map((_, i) => (
                    <Cell key={i} fill={CORES_SUBS[i % CORES_SUBS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {dadosSubs.map(({ name, valor }, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_SUBS[i % CORES_SUBS.length] }} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{name}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">R$ {valor.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Comparação regional */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Comparação Regional</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {estado ? `Média mensal — ${estado}` : 'Configure sua localização no perfil'}
            </p>
          </div>
          {!estado && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5" /> Localização não definida
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dadosRegional.map(({ name, voce, media, color }) => {
            const diff = media > 0 ? ((voce - media) / media) * 100 : 0;
            const melhor = voce < media;
            return (
              <div key={name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{name}</span>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full
                    ${melhor ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                             : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                    {melhor ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs média
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Você (média/mês)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">R$ {voce}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min((voce / Math.max(voce, media)) * 100, 100)}%`, background: color }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Média regional</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">R$ {media}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 opacity-40"
                      style={{ width: `${Math.min((media / Math.max(voce, media)) * 100, 100)}%`, background: color }} />
                  </div>
                </div>
                <p className={`text-xs font-semibold ${melhor ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {melhor ? `✅ ${Math.abs(diff).toFixed(0)}% abaixo da média regional!` : `⚠️ ${Math.abs(diff).toFixed(0)}% acima da média regional.`}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Média regional calculada com base nas tarifas oficiais do seu estado.
          </p>
        </div>
      </motion.div>

      {/* Insights automáticos */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-xl">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Insights Personalizados</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Baseados no seu histórico de consumo</p>
          </div>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.06 }}
              className={`flex items-start gap-4 p-4 rounded-xl border
                ${insight.tipo === 'positivo' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40' : ''}
                ${insight.tipo === 'negativo' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40' : ''}
                ${insight.tipo === 'neutro'   ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700' : ''}
              `}>
              <span className="text-xl shrink-0 mt-0.5">{insight.icone}</span>
              <p className={`text-sm font-medium leading-relaxed
                ${insight.tipo === 'positivo' ? 'text-emerald-800 dark:text-emerald-300' : ''}
                ${insight.tipo === 'negativo' ? 'text-red-800 dark:text-red-300' : ''}
                ${insight.tipo === 'neutro'   ? 'text-slate-700 dark:text-slate-300' : ''}
              `}>
                {insight.texto}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Previsão próximo mês */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-emerald-900 to-emerald-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-700 rounded-full blur-3xl opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Previsão — Próximo Mês</h3>
              <p className="text-xs text-emerald-300 mt-0.5">Média ponderada dos últimos registros</p>
            </div>
            <div className="bg-emerald-800 border border-emerald-700 px-3 py-1.5 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Previsto', value: previsaoTotal,             color: 'text-white',       big: true  },
              { label: 'Energia',        value: previsoesProxMes.energia,  color: 'text-amber-300',   big: false },
              { label: 'Água',           value: previsoesProxMes.agua,     color: 'text-sky-300',     big: false },
              { label: 'Outros',         value: previsoesProxMes.outro,    color: 'text-emerald-300', big: false },
            ].map(({ label, value, color, big }) => (
              <div key={label} className="bg-emerald-800/50 border border-emerald-700/50 rounded-xl p-4">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-black ${color} ${big ? 'text-2xl' : 'text-lg'}`}>R$ {value.toFixed(0)}</p>
              </div>
            ))}
          </div>
          {ultimoMes && (
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              {previsaoTotal > ultimoMes.total
                ? <><TrendingUp className="w-4 h-4 text-red-400" /> Alta prevista de R$ {(previsaoTotal - ultimoMes.total).toFixed(2)} vs este mês</>
                : <><TrendingDown className="w-4 h-4 text-emerald-400" /> Queda prevista de R$ {(ultimoMes.total - previsaoTotal).toFixed(2)} vs este mês</>
              }
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
};