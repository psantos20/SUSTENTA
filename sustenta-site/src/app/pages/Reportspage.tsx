import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Download, Calendar, Zap, Droplets, Package,
  TrendingUp, TrendingDown, Minus, Leaf, Star, AlertTriangle,
  CheckCircle, ChevronDown, Loader2, Eye, BarChart2, Clock,
  Share2, TableProperties,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registro {
  id: string;
  uid: string;
  categoria: 'energia' | 'agua' | 'outro';
  subcategoria?: string;
  valor: number;
  mes: string;
  descricao: string;
  criadoEm: any;
}

interface Usuario {
  nome: string;
  email: string;
  estado: string;
  cidade: string;
}

interface ReportData {
  mes: string;
  mesLabel: string;
  usuario: Usuario | null;
  registros: Registro[];
  totalGeral: number;
  totalEnergia: number;
  totalAgua: number;
  totalOutro: number;
  scoreAnterior: number;
  scoreMes: number;
  xpTotal: number;
  nivel: string;
  maioresGastos: Registro[];
  alertas: string[];
  dicas: string[];
  historico: HistoricoMes[];
}

interface HistoricoMes {
  mes: string;
  label: string;
  total: number;
  energia: number;
  agua: number;
  outro: number;
  score: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez',
];
const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const NIVEIS = [
  'Iniciante','Consciente','Engajado','Ativo','Dedicado',
  'Guardião','Protetor','Mestre','Guardião Verde','Eco Herói',
];

function getMesLabel(mesStr: string, short = false): string {
  const [ano, mes] = mesStr.split('-');
  const arr = short ? MESES : MESES_FULL;
  return `${arr[parseInt(mes) - 1]}${short ? `/${ano.slice(2)}` : ` ${ano}`}`;
}

function calcularScore(energia: number, agua: number, outro: number): number {
  let score = 100;
  if (energia > 400) score -= 30; else if (energia > 200) score -= 15;
  if (agua > 200)    score -= 20; else if (agua > 100)    score -= 10;
  if (outro > 500)   score -= 10;
  return Math.max(0, Math.min(100, score));
}

function getNivel(xp: number): string {
  return NIVEIS[Math.min(Math.floor(xp / 1000), NIVEIS.length - 1)];
}

function gerarMesesDisponiveis(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: getMesLabel(value) };
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportarCSV(data: ReportData) {
  const header = 'Descrição,Categoria,Subcategoria,Valor (R$),Mês\n';
  const rows = data.registros.map(r =>
    `"${r.descricao || ''}","${r.categoria}","${r.subcategoria || ''}","${r.valor.toFixed(2)}","${data.mesLabel}"`
  ).join('\n');
  const rodape = `\n"TOTAL","","","${data.totalGeral.toFixed(2)}",""\n`;
  const csv = '\uFEFF' + header + rows + rodape; // BOM para Excel PT-BR
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sustenta_${data.mes}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

async function gerarPDF(elementId: string, mes: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2, useCORS: true, backgroundColor: '#0f172a', logging: false,
  });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const ratio = pdfW / canvas.width;
  const scaledH = canvas.height * ratio;

  let position = 0;
  let remaining = scaledH;
  while (remaining > 0) {
    pdf.addImage(imgData, 'PNG', 0, position, pdfW, scaledH);
    remaining -= pdfH;
    position -= pdfH;
    if (remaining > 0) pdf.addPage();
  }
  pdf.save(`Sustenta_Relatorio_${mes}.pdf`);
}

// ─── Donut Chart (SVG puro — funciona no html2canvas) ─────────────────────────

function DonutChart({ energia, agua, outro, total }: {
  energia: number; agua: number; outro: number; total: number;
}) {
  const cx = 64; const cy = 64; const r = 48; const sw = 18;
  const circum = 2 * Math.PI * r;

  const slices = [
    { valor: energia, color: '#eab308', label: 'Energia' },
    { valor: agua,    color: '#3b82f6', label: 'Água'    },
    { valor: outro,   color: '#8b5cf6', label: 'Outros'  },
  ];

  let offset = 0;
  const arcs = slices.map(s => {
    const pct   = total > 0 ? s.valor / total : 0;
    const dash  = pct * circum;
    const arc   = { ...s, dash, offset, pct };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={sw}
            strokeDasharray={`${a.dash} ${circum - a.dash}`}
            strokeDashoffset={circum / 4 - a.offset}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy - 4}  textAnchor="middle" fill="white" fontSize="10" opacity="0.6">Total</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
          R${total.toFixed(0)}
        </text>
      </svg>
      <div className="space-y-2">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-xs text-slate-300">{a.label}</span>
            <span className="text-xs text-white font-semibold ml-auto pl-3">
              {total > 0 ? `${(a.pct * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const r = 52; const cx = 64; const cy = 64;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcX  = (deg: number) => cx + r * Math.cos(toRad(deg - 90));
  const arcY  = (deg: number) => cy + r * Math.sin(toRad(deg - 90));
  const describeArc = (sa: number, ea: number) => {
    const large = ea - sa > 180 ? 1 : 0;
    return `M ${arcX(sa)} ${arcY(sa)} A ${r} ${r} 0 ${large} 1 ${arcX(ea)} ${arcY(ea)}`;
  };
  const filled = (score / 100) * 180 - 90;
  const angle  = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="72" viewBox="0 0 128 80">
        <path d={describeArc(-90, 90)}    fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
        <path d={describeArc(-90, filled)} fill="none" stroke={color}   strokeWidth="10" strokeLinecap="round" />
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 6) * Math.cos(toRad(angle - 90))}
          y2={cy + (r - 6) * Math.sin(toRad(angle - 90))}
          stroke="white" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill="white" />
        <text x={cx} y={cy + 20} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-xs text-slate-400">Score de Sustentabilidade</span>
    </div>
  );
}

// ─── Report Preview (para PDF) ───────────────────────────────────────────────

function ReportPreview({ data }: { data: ReportData }) {
  const tendencia = data.scoreMes - data.scoreAnterior;
  return (
    <div
      id="report-preview"
      className="bg-slate-900 text-white p-8 rounded-2xl space-y-6 min-w-[640px]"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sustenta</h1>
            <p className="text-xs text-slate-400">Relatório de Consumo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{data.mesLabel}</p>
          <p className="text-xs text-slate-400">{data.usuario?.nome || 'Usuário'}</p>
          <p className="text-xs text-slate-500">{data.usuario?.cidade}, {data.usuario?.estado}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Gasto', value: `R$ ${data.totalGeral.toFixed(2)}`, icon: BarChart2, color: 'from-violet-600 to-violet-800' },
          { label: 'Score',       value: `${data.scoreMes}/100`,             icon: Star,     color: 'from-green-600 to-green-800'   },
          { label: 'Nível',       value: data.nivel,                         icon: Leaf,     color: 'from-emerald-600 to-teal-800'  },
          { label: 'Registros',   value: `${data.registros.length}`,         icon: FileText, color: 'from-blue-600 to-blue-800'     },
        ].map(c => (
          <div key={c.label} className={clsx('rounded-xl p-3 bg-gradient-to-br', c.color)}>
            <c.icon size={16} className="text-white/70 mb-1" />
            <p className="text-lg font-bold text-white leading-tight">{c.value}</p>
            <p className="text-xs text-white/60">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Score + Donut */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
          <ScoreGauge score={data.scoreMes} />
          <div className="flex items-center gap-2 mt-3">
            {tendencia > 0
              ? <TrendingUp size={14} className="text-green-400" />
              : tendencia < 0
                ? <TrendingDown size={14} className="text-red-400" />
                : <Minus size={14} className="text-slate-400" />
            }
            <span className={clsx('text-xs font-semibold',
              tendencia > 0 ? 'text-green-400' : tendencia < 0 ? 'text-red-400' : 'text-slate-400'
            )}>
              {tendencia > 0 ? '+' : ''}{tendencia} pts vs. mês anterior
            </span>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Distribuição</p>
          <DonutChart
            energia={data.totalEnergia}
            agua={data.totalAgua}
            outro={data.totalOutro}
            total={data.totalGeral}
          />
        </div>
      </div>

      {/* Histórico no PDF */}
      {data.historico.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Evolução dos Gastos</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-2">Mês</th>
                <th className="text-right pb-2">Total</th>
                <th className="text-right pb-2">Energia</th>
                <th className="text-right pb-2">Água</th>
                <th className="text-right pb-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.historico.map(h => (
                <tr key={h.mes} className="border-b border-slate-700/30 last:border-0">
                  <td className="py-1.5 text-slate-300">{h.label}</td>
                  <td className="py-1.5 text-right text-white">R$ {h.total.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-yellow-400">R$ {h.energia.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-blue-400">R$ {h.agua.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-emerald-400">{h.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Gastos */}
      {data.maioresGastos.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={13} /> Top Gastos do Mês
          </p>
          {data.maioresGastos.map((r, i) => (
            <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                <div>
                  <p className="text-xs text-white">{r.descricao || r.subcategoria || r.categoria}</p>
                  <p className="text-xs text-slate-500 capitalize">{r.categoria}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-white">R$ {r.valor.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 space-y-2">
          <p className="text-xs text-red-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={13} /> Alertas
          </p>
          {data.alertas.map((a, i) => (
            <p key={i} className="text-xs text-red-300">⚠ {a}</p>
          ))}
        </div>
      )}

      {/* Dicas */}
      {data.dicas.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 space-y-2">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <CheckCircle size={13} /> Dicas
          </p>
          {data.dicas.map((d, i) => (
            <p key={i} className="text-xs text-emerald-300">✓ {d}</p>
          ))}
        </div>
      )}

      {/* Tabela de registros */}
      {data.registros.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <Clock size={13} /> Todos os Registros
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-2">Descrição</th>
                <th className="text-left pb-2">Categoria</th>
                <th className="text-right pb-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.registros.map(r => (
                <tr key={r.id} className="border-b border-slate-700/30 last:border-0">
                  <td className="py-1.5 text-slate-300">{r.descricao || '—'}</td>
                  <td className="py-1.5 text-slate-400 capitalize">{r.subcategoria || r.categoria}</td>
                  <td className="py-1.5 text-right text-white font-medium">R$ {r.valor.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-slate-600">
                <td colSpan={2} className="pt-2 text-slate-400 font-medium">Total</td>
                <td className="pt-2 text-right text-white font-bold">R$ {data.totalGeral.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
        <p className="text-xs text-slate-600">Gerado pelo Sustenta em {new Date().toLocaleDateString('pt-BR')}</p>
        <p className="text-xs text-slate-600">sustenta.app</p>
      </div>
    </div>
  );
}

// ─── Custom Tooltip para o gráfico ───────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">
            {p.dataKey === 'score' ? p.value : `R$ ${Number(p.value).toFixed(2)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { darkMode } = useTheme();
  const mesesDisponiveis = gerarMesesDisponiveis();
  const [mesSelecionado, setMesSelecionado]   = useState(mesesDisponiveis[0].value);
  const [loading, setLoading]                 = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [reportData, setReportData]           = useState<ReportData | null>(null);
  const [previewOpen, setPreviewOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [activeTab, setActiveTab]             = useState<'resumo' | 'evolucao' | 'registros'>('resumo');
  const [chartMetric, setChartMetric]         = useState<'total' | 'score'>('total');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function carregarDados() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      // Mês atual
      const q    = query(collection(db, 'registros'), where('uid', '==', uid), where('mes', '==', mesSelecionado));
      const snap = await getDocs(q);
      const registros: Registro[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Registro));

      // Mês anterior (para score comparativo)
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const mesAntDate  = new Date(ano, mes - 2, 1);
      const mesAnterior = `${mesAntDate.getFullYear()}-${String(mesAntDate.getMonth() + 1).padStart(2, '0')}`;
      const qAnt    = query(collection(db, 'registros'), where('uid', '==', uid), where('mes', '==', mesAnterior));
      const snapAnt = await getDocs(qAnt);
      const regAnt: Registro[] = snapAnt.docs.map(d => ({ id: d.id, ...d.data() } as Registro));

      // Histórico 6 meses
      const historico: HistoricoMes[] = [];
      for (let i = 5; i >= 0; i--) {
        const d     = new Date(ano, mes - 1 - i, 1);
        const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const qH    = query(collection(db, 'registros'), where('uid', '==', uid), where('mes', '==', mesStr));
        const sH    = await getDocs(qH);
        const regs  = sH.docs.map(dd => dd.data() as Registro);
        const e     = regs.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
        const a     = regs.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
        const o     = regs.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0);
        historico.push({
          mes: mesStr,
          label: getMesLabel(mesStr, true),
          total: e + a + o,
          energia: e, agua: a, outro: o,
          score: calcularScore(e, a, o),
        });
      }

      // Usuário
      const userDoc = await getDoc(doc(db, 'usuarios', uid));
      const usuario = userDoc.exists() ? (userDoc.data() as Usuario) : null;

      const totalEnergia = registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
      const totalAgua    = registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
      const totalOutro   = registros.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0);
      const totalGeral   = totalEnergia + totalAgua + totalOutro;
      const scoreMes     = calcularScore(totalEnergia, totalAgua, totalOutro);

      const eAnt = regAnt.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0);
      const aAnt = regAnt.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0);
      const oAnt = regAnt.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0);
      const scoreAnterior = regAnt.length > 0 ? calcularScore(eAnt, aAnt, oAnt) : scoreMes;

      const xpTotal       = registros.length * 100;
      const nivel         = getNivel(xpTotal);
      const maioresGastos = [...registros].sort((a, b) => b.valor - a.valor).slice(0, 5);

      const alertas: string[] = [];
      if (totalEnergia > 200) alertas.push(`Gasto com energia (R$ ${totalEnergia.toFixed(2)}) acima de R$ 200,00.`);
      if (totalAgua > 100)    alertas.push(`Gasto com água (R$ ${totalAgua.toFixed(2)}) acima de R$ 100,00.`);
      if (registros.some(r => r.categoria === 'outro' && r.valor > 300))
        alertas.push('Um gasto avulso ultrapassou R$ 300,00.');

      const dicas: string[] = [];
      if (totalEnergia > 0)  dicas.push('Substitua lâmpadas comuns por LED — reduz até 80% no consumo.');
      if (totalAgua > 0)     dicas.push('Redutores de vazão nas torneiras economizam até 50% na água.');
      if (totalOutro > 200)  dicas.push('Revise seus gastos avulsos — pequenos cortes geram grande impacto.');
      if (scoreMes < 60)     dicas.push('Score baixo: foque em reduzir o maior gasto deste mês.');
      if (scoreMes >= 80)    dicas.push('Score excelente! Continue mantendo seus hábitos sustentáveis.');

      setReportData({
        mes: mesSelecionado, mesLabel: getMesLabel(mesSelecionado),
        usuario, registros, totalGeral, totalEnergia, totalAgua, totalOutro,
        scoreAnterior, scoreMes, xpTotal, nivel, maioresGastos, alertas, dicas, historico,
      });
      setActiveTab('resumo');
    } finally {
      setLoading(false);
    }
  }

  async function handleGerarPDF() {
    if (!reportData) return;
    setGenerating(true);
    setPreviewOpen(true);
    await new Promise(r => setTimeout(r, 700));
    await gerarPDF('report-preview', reportData.mes);
    setGenerating(false);
  }

  function compartilharWhatsApp() {
    if (!reportData) return;
    const txt = encodeURIComponent(
      `📊 *Relatório Sustenta — ${reportData.mesLabel}*\n\n` +
      `💰 Total gasto: R$ ${reportData.totalGeral.toFixed(2)}\n` +
      `🌱 Score: ${reportData.scoreMes}/100\n` +
      `⚡ Energia: R$ ${reportData.totalEnergia.toFixed(2)}\n` +
      `💧 Água: R$ ${reportData.totalAgua.toFixed(2)}\n\n` +
      `Gerado pelo Sustenta 🍃`
    );
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  }

  // ── Estilos base ──────────────────────────────────────────────────────────
  const cardBase      = clsx('rounded-2xl border p-5 transition-all', darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm');
  const textPrimary   = darkMode ? 'text-white'     : 'text-slate-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textMuted     = darkMode ? 'text-slate-500' : 'text-slate-400';

  // recharts colors
  const chartColors = { total: '#22c55e', energia: '#eab308', agua: '#3b82f6', score: '#a78bfa' };

  return (
    <div className={clsx('min-h-screen p-6 space-y-6', darkMode ? 'bg-slate-900' : 'bg-slate-50')}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <FileText size={20} className="text-white" />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', textPrimary)}>Relatórios</h1>
            <p className={clsx('text-sm', textSecondary)}>Gere e exporte relatórios do seu consumo</p>
          </div>
        </div>
      </motion.div>

      {/* ── Controls ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className={clsx(cardBase, 'flex flex-col sm:flex-row items-start sm:items-center gap-4')}
      >
        {/* Dropdown mês */}
        <div className="flex-1 space-y-1">
          <label className={clsx('text-xs font-medium uppercase tracking-wider', textMuted)}>Período</label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                darkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                         : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              )}
            >
              <Calendar size={15} className="text-emerald-500" />
              {mesesDisponiveis.find(m => m.value === mesSelecionado)?.label}
              <ChevronDown size={14} className={clsx('ml-1 transition-transform', dropdownOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className={clsx(
                    'absolute top-full left-0 mt-1 z-50 rounded-xl border shadow-xl overflow-hidden min-w-[200px]',
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  )}
                >
                  {mesesDisponiveis.map(m => (
                    <button
                      key={m.value}
                      onClick={() => { setMesSelecionado(m.value); setDropdownOpen(false); setReportData(null); }}
                      className={clsx(
                        'w-full text-left px-4 py-2.5 text-sm transition-colors',
                        m.value === mesSelecionado
                          ? 'bg-emerald-600 text-white'
                          : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 flex-wrap">
          {/* Pré-visualizar */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={carregarDados} disabled={loading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                       : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
            )}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {loading ? 'Carregando...' : 'Visualizar'}
          </motion.button>

          {/* Exportar CSV */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => reportData && exportarCSV(reportData)}
            disabled={!reportData}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              reportData
                ? darkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                : darkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                           : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            <TableProperties size={15} />
            CSV
          </motion.button>

          {/* Compartilhar WhatsApp */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={compartilharWhatsApp} disabled={!reportData}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              reportData
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30'
                : darkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                           : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            <Share2 size={15} />
            Compartilhar
          </motion.button>

          {/* Baixar PDF */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleGerarPDF} disabled={!reportData || generating}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg',
              reportData && !generating
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-900/30'
                : darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                           : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {generating ? 'Gerando...' : 'PDF'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Empty state ── */}
      <AnimatePresence mode="wait">
        {!reportData && !loading && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={clsx(cardBase, 'flex flex-col items-center justify-center py-16 gap-4 text-center')}
          >
            <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center',
              darkMode ? 'bg-slate-700' : 'bg-slate-100'
            )}>
              <FileText size={28} className="text-emerald-500" />
            </div>
            <div>
              <p className={clsx('font-semibold text-base', textPrimary)}>Nenhum relatório gerado</p>
              <p className={clsx('text-sm mt-1', textSecondary)}>
                Selecione um período e clique em{' '}
                <span className="text-emerald-500 font-medium">Visualizar</span>.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Report content ── */}
        {reportData && !loading && (
          <motion.div key="report" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="space-y-4"
          >
            {/* Tabs */}
            <div className={clsx('flex gap-1 p-1 rounded-xl w-fit',
              darkMode ? 'bg-slate-800' : 'bg-slate-100'
            )}>
              {([
                { id: 'resumo',    label: 'Resumo',   icon: BarChart2        },
                { id: 'evolucao',  label: 'Evolução', icon: TrendingUp       },
                { id: 'registros', label: 'Registros',icon: TableProperties  },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Resumo ── */}
            <AnimatePresence mode="wait">
              {activeTab === 'resumo' && (
                <motion.div key="resumo" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-4"
                >
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Gasto', value: `R$ ${reportData.totalGeral.toFixed(2)}`, icon: BarChart2, color: 'text-violet-400', bg: darkMode ? 'bg-violet-900/20' : 'bg-violet-50'  },
                      { label: 'Score',       value: `${reportData.scoreMes}/100`,             icon: Star,     color: 'text-emerald-400', bg: darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50' },
                      { label: 'Registros',   value: `${reportData.registros.length}`,         icon: FileText, color: 'text-blue-400',    bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50'       },
                      { label: 'Nível',       value: reportData.nivel,                         icon: Leaf,     color: 'text-teal-400',    bg: darkMode ? 'bg-teal-900/20' : 'bg-teal-50'       },
                    ].map((c, i) => (
                      <motion.div key={c.label}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className={clsx(cardBase, c.bg, 'flex items-center gap-3')}
                      >
                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center',
                          darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'
                        )}>
                          <c.icon size={16} className={c.color} />
                        </div>
                        <div>
                          <p className={clsx('text-xs', textMuted)}>{c.label}</p>
                          <p className={clsx('text-sm font-bold', textPrimary)}>{c.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Score + Donut */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className={clsx(cardBase, 'flex flex-col items-center justify-center gap-3')}>
                      <ScoreGauge score={reportData.scoreMes} />
                      <div className="flex items-center gap-2">
                        {reportData.scoreMes - reportData.scoreAnterior > 0
                          ? <TrendingUp size={14} className="text-green-400" />
                          : reportData.scoreMes - reportData.scoreAnterior < 0
                            ? <TrendingDown size={14} className="text-red-400" />
                            : <Minus size={14} className="text-slate-400" />
                        }
                        <span className={clsx('text-xs font-semibold',
                          reportData.scoreMes - reportData.scoreAnterior > 0 ? 'text-green-400'
                            : reportData.scoreMes - reportData.scoreAnterior < 0 ? 'text-red-400'
                            : 'text-slate-400'
                        )}>
                          {reportData.scoreMes - reportData.scoreAnterior > 0 ? '+' : ''}
                          {reportData.scoreMes - reportData.scoreAnterior} pts vs. mês anterior
                        </span>
                      </div>
                    </div>
                    <div className={clsx(cardBase)}>
                      <p className={clsx('text-xs font-medium uppercase tracking-wider mb-4', textMuted)}>
                        Distribuição por Categoria
                      </p>
                      <DonutChart
                        energia={reportData.totalEnergia}
                        agua={reportData.totalAgua}
                        outro={reportData.totalOutro}
                        total={reportData.totalGeral}
                      />
                    </div>
                  </div>

                  {/* Alertas + Dicas */}
                  {(reportData.alertas.length > 0 || reportData.dicas.length > 0) && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {reportData.alertas.length > 0 && (
                        <div className={clsx(cardBase, 'border-red-800/40 space-y-2',
                          darkMode ? 'bg-red-950/20' : 'bg-red-50'
                        )}>
                          <p className="text-xs font-medium text-red-400 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle size={12} /> Alertas ({reportData.alertas.length})
                          </p>
                          {reportData.alertas.map((a, i) => (
                            <p key={i} className={clsx('text-xs', darkMode ? 'text-red-300' : 'text-red-600')}>{a}</p>
                          ))}
                        </div>
                      )}
                      {reportData.dicas.length > 0 && (
                        <div className={clsx(cardBase, 'border-emerald-800/40 space-y-2',
                          darkMode ? 'bg-emerald-950/20' : 'bg-emerald-50'
                        )}>
                          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle size={12} /> Dicas ({reportData.dicas.length})
                          </p>
                          {reportData.dicas.map((d, i) => (
                            <p key={i} className={clsx('text-xs', darkMode ? 'text-emerald-300' : 'text-emerald-700')}>{d}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Tab: Evolução ── */}
              {activeTab === 'evolucao' && (
                <motion.div key="evolucao" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-4"
                >
                  <div className={clsx(cardBase, 'space-y-4')}>
                    {/* Métrica toggle */}
                    <div className="flex items-center justify-between">
                      <p className={clsx('text-xs font-medium uppercase tracking-wider', textMuted)}>
                        Evolução — últimos 6 meses
                      </p>
                      <div className={clsx('flex gap-1 p-1 rounded-lg', darkMode ? 'bg-slate-700' : 'bg-slate-100')}>
                        {(['total', 'score'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setChartMetric(m)}
                            className={clsx(
                              'px-3 py-1 rounded-md text-xs font-medium transition-all',
                              chartMetric === m
                                ? 'bg-emerald-600 text-white'
                                : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500'
                            )}
                          >
                            {m === 'total' ? 'Gastos (R$)' : 'Score'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={reportData.historico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="label" tick={{ fill: darkMode ? '#64748b' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: darkMode ? '#64748b' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={45}
                          tickFormatter={v => chartMetric === 'score' ? String(v) : `R$${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        {chartMetric === 'total' ? (
                          <>
                            <Line type="monotone" dataKey="total"   name="Total"   stroke={chartColors.total}   strokeWidth={2} dot={{ r: 4, fill: chartColors.total }}   activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="energia" name="Energia" stroke={chartColors.energia} strokeWidth={2} dot={{ r: 3, fill: chartColors.energia }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
                            <Line type="monotone" dataKey="agua"    name="Água"    stroke={chartColors.agua}    strokeWidth={2} dot={{ r: 3, fill: chartColors.agua }}    activeDot={{ r: 5 }} strokeDasharray="4 2" />
                          </>
                        ) : (
                          <Line type="monotone" dataKey="score" name="Score" stroke={chartColors.score} strokeWidth={2.5} dot={{ r: 4, fill: chartColors.score }} activeDot={{ r: 6 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela resumo histórico */}
                  <div className={clsx(cardBase, 'space-y-3')}>
                    <p className={clsx('text-xs font-medium uppercase tracking-wider', textMuted)}>Tabela Comparativa</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={clsx('border-b', darkMode ? 'border-slate-700' : 'border-slate-200')}>
                            {['Mês','Total','Energia','Água','Outros','Score'].map(h => (
                              <th key={h} className={clsx('pb-2 font-medium', h === 'Mês' ? 'text-left' : 'text-right', textMuted)}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.historico.map((h, i) => (
                            <tr key={h.mes}
                              className={clsx(
                                'border-b last:border-0 transition-colors',
                                darkMode ? 'border-slate-700/40 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50',
                                h.mes === mesSelecionado && (darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50')
                              )}
                            >
                              <td className={clsx('py-2 font-medium', textPrimary)}>
                                {h.label}
                                {h.mes === mesSelecionado && (
                                  <span className="ml-1.5 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">atual</span>
                                )}
                              </td>
                              <td className={clsx('py-2 text-right font-semibold', textPrimary)}>R$ {h.total.toFixed(2)}</td>
                              <td className="py-2 text-right text-yellow-500">R$ {h.energia.toFixed(2)}</td>
                              <td className="py-2 text-right text-blue-400">R$ {h.agua.toFixed(2)}</td>
                              <td className="py-2 text-right text-violet-400">R$ {h.outro.toFixed(2)}</td>
                              <td className={clsx('py-2 text-right font-bold',
                                h.score >= 75 ? 'text-emerald-400' : h.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                              )}>{h.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Tab: Registros ── */}
              {activeTab === 'registros' && (
                <motion.div key="registros" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}
                >
                  <div className={clsx(cardBase, 'space-y-3')}>
                    <div className="flex items-center justify-between">
                      <p className={clsx('text-xs font-medium uppercase tracking-wider', textMuted)}>
                        {reportData.registros.length} registro{reportData.registros.length !== 1 ? 's' : ''} — {reportData.mesLabel}
                      </p>
                      <button
                        onClick={() => exportarCSV(reportData)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                      >
                        <Download size={12} /> Exportar CSV
                      </button>
                    </div>

                    {reportData.registros.length === 0 ? (
                      <p className={clsx('text-sm text-center py-8', textSecondary)}>
                        Nenhum registro encontrado para {reportData.mesLabel}.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className={clsx('border-b', darkMode ? 'border-slate-700' : 'border-slate-200')}>
                              {['Descrição','Categoria','Subcategoria','Valor'].map(h => (
                                <th key={h} className={clsx('pb-2 font-medium text-left', h === 'Valor' ? 'text-right' : '', textMuted)}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.registros.map(r => (
                              <tr key={r.id} className={clsx('border-b last:border-0', darkMode ? 'border-slate-700/40 hover:bg-slate-700/20' : 'border-slate-100 hover:bg-slate-50')}>
                                <td className={clsx('py-2', textPrimary)}>{r.descricao || '—'}</td>
                                <td className="py-2">
                                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize',
                                    r.categoria === 'energia' ? 'bg-yellow-500/20 text-yellow-400'
                                      : r.categoria === 'agua' ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-violet-500/20 text-violet-400'
                                  )}>
                                    {r.categoria}
                                  </span>
                                </td>
                                <td className={clsx('py-2', textSecondary)}>{r.subcategoria || '—'}</td>
                                <td className={clsx('py-2 text-right font-semibold', textPrimary)}>R$ {r.valor.toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className={clsx('border-t-2', darkMode ? 'border-slate-600' : 'border-slate-300')}>
                              <td colSpan={3} className={clsx('pt-2 font-bold', textPrimary)}>Total</td>
                              <td className={clsx('pt-2 text-right font-bold text-emerald-500')}>
                                R$ {reportData.totalGeral.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Preview PDF ── */}
      <AnimatePresence>
        {previewOpen && reportData && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-h-[90vh] overflow-y-auto rounded-2xl"
            >
              <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 bg-slate-950/80 backdrop-blur-sm rounded-t-2xl border-b border-slate-700">
                <span className="text-sm font-semibold text-white">
                  Preview PDF — {reportData.mesLabel}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleGerarPDF} disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                  >
                    {generating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Baixar PDF
                  </button>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              <ReportPreview data={reportData} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}