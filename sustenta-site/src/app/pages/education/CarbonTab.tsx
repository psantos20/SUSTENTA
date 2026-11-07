import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Zap, Droplets, Sparkles, Calculator, Loader2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import clsx from 'clsx';
import type { Registro } from './tipos';
import { CARBON_FACTORS, FATOR_ENERGIA_KG_POR_KWH } from './dados';
import { calcularCarbono, gerarDicaIA, getMesLabel } from './carbono';
import { GlassCard } from './componentes';


export function CarbonTab() {
  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [mesSel, setMesSel] = useState(meses6[0]);
  const [loading, setLoading] = useState(false);
  const [carbono, setCarbono] = useState<ReturnType<typeof calcularCarbono> | null>(null);
  const [historico, setHistorico] = useState<{ label: string; kg: number }[]>([]);
  const [dicaIA, setDicaIA] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);

  async function calcular() {
    const uid = auth.currentUser?.uid;

    if (!uid) return;

    setLoading(true);
    setCarbono(null);
    setDicaIA('');
    setHistorico([]);

    try {
      const snap = await getDocs(
        query(collection(db, 'registros'), where('uid', '==', uid), where('mes', '==', mesSel))
      );

      const regs = snap.docs.map((d) => d.data() as Registro);
      const res = calcularCarbono(regs);

      const e = regs
        .filter((r) => r.categoria === 'energia')
        .reduce((s, r) => s + r.valor, 0);

      const a = regs
        .filter((r) => r.categoria === 'agua')
        .reduce((s, r) => s + r.valor, 0);

      const o = regs
        .filter((r) => r.categoria === 'outro')
        .reduce((s, r) => s + r.valor, 0);

      setCarbono(res);

      const hist = await Promise.all(
        meses6.slice().reverse().map(async (m) => {
          const s = await getDocs(
            query(collection(db, 'registros'), where('uid', '==', uid), where('mes', '==', m))
          );

          const rs = s.docs.map((d) => d.data() as Registro);
          const kg = calcularCarbono(rs).totalKg;

          return {
            label: getMesLabel(m, true),
            kg: +kg.toFixed(1),
          };
        })
      );

      setHistorico(hist);

      setLoadingIA(true);

      try {
        const dica = await gerarDicaIA(e, a, o, res.totalKg);
        setDicaIA(dica);
      } catch (erro) {
        // Sem ANTHROPIC_API_KEY, sem login ou com limite de uso: a análise por IA
        // não roda. Avisa o usuário em vez de fingir que a dica é personalizada.
        console.warn('[dica-ia] indisponível:', erro instanceof Error ? erro.message : erro);
        setDicaIA('A análise personalizada por IA está indisponível no momento. Enquanto isso: continue reduzindo seu consumo e acompanhe sua evolução mensal.');
      }
    } finally {
      setLoading(false);
      setLoadingIA(false);
    }
  }

  const nivel = carbono
    ? carbono.totalKg < 50
      ? {
          label: 'Baixo',
          color: 'text-emerald-400',
          bg: 'bg-emerald-600/20 border-emerald-600/30',
          bar: 'bg-emerald-500',
        }
      : carbono.totalKg < 120
        ? {
            label: 'Medio',
            color: 'text-yellow-400',
            bg: 'bg-yellow-600/20 border-yellow-600/30',
            bar: 'bg-yellow-500',
          }
        : {
            label: 'Alto',
            color: 'text-red-400',
            bg: 'bg-red-600/20 border-red-600/30',
            bar: 'bg-red-500',
          }
    : null;

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Mes de referencia
          </label>

          <select
            value={mesSel}
            onChange={(e) => {
              setMesSel(e.target.value);
              setCarbono(null);
              setDicaIA('');
            }}
            className="bg-white/10 border border-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl outline-none"
          >
            {meses6.map((m) => (
              <option key={m} value={m} className="bg-slate-800">
                {getMesLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={calcular}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
          {loading ? 'Calculando...' : 'Calcular pegada'}
        </motion.button>
      </GlassCard>

      {!carbono && !loading && (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Wind size={28} className="text-emerald-500" />
          </div>

          <div>
            <p className="font-bold text-white">Calcule sua pegada de carbono</p>
            <p className="text-sm mt-1 text-slate-400">
              Selecione um mes e clique em{' '}
              <span className="text-emerald-400">Calcular pegada</span>.
            </p>
          </div>
        </GlassCard>
      )}

      <AnimatePresence>
        {carbono && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <GlassCard className="p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 to-transparent pointer-events-none" />

              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
                Pegada de Carbono - {getMesLabel(mesSel)}
              </p>

              <div className="flex items-end justify-center gap-2 mb-3">
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-6xl font-black text-white"
                >
                  {carbono.totalKg.toFixed(1)}
                </motion.span>

                <span className="text-xl text-slate-400 pb-2">kg CO2</span>
              </div>

              {nivel && (
                <>
                  <span
                    className={clsx(
                      'inline-block text-sm font-bold px-4 py-1 rounded-full border mb-3',
                      nivel.bg,
                      nivel.color
                    )}
                  >
                    Nivel {nivel.label}
                  </span>

                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((carbono.totalKg / 167) * 100, 100)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className={clsx('h-full rounded-full', nivel.bar)}
                    />
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5">
                    Referencia: 167 kg CO2/mes (2 t/ano) e o orcamento de uma pessoa somando TODAS as
                    atividades (transporte, alimentacao etc.). Aqui contamos so o que voce registrou.
                  </p>
                </>
              )}
            </GlassCard>

            <GlassCard className="p-4 space-y-2">
              {carbono.registrosEstimados > 0 ? (
                <p className="text-xs text-amber-300">
                  Estimativa: {carbono.registrosEstimados} de {carbono.totalRegistros} registro
                  {carbono.totalRegistros !== 1 ? 's' : ''} neste mes usa{carbono.registrosEstimados !== 1 ? 'm' : ''} o
                  valor em reais para estimar o carbono ({carbono.estimadoKg.toFixed(1)} kg dos{' '}
                  {carbono.totalKg.toFixed(1)} kg). Informe os kWh da conta de luz em Consumo para um
                  calculo mais preciso.
                </p>
              ) : (
                <p className="text-xs text-emerald-300">
                  Todos os registros deste mes tem a quantidade em kWh: calculo com o fator oficial.
                </p>
              )}

              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer text-slate-300 font-medium">Como calculamos</summary>
                <ul className="list-disc pl-5 mt-2 space-y-1.5">
                  <li>
                    <strong>Energia com kWh informado:</strong> kWh x {FATOR_ENERGIA_KG_POR_KWH.toLocaleString('pt-BR')} kg
                    CO2/kWh. E a media da geracao eletrica do Brasil (SIN) em 2023, divulgada pelo MCTI
                    (38,5 kg CO2/MWh). Em 2025 o MCTI passou a incluir mais usinas solares e eolicas e os
                    valores mensais ficaram menores, entao este fator tende a ser conservador.
                  </li>
                  <li>
                    <strong>Sem quantidade (estimativa):</strong> valor em R$ x fator aproximado (energia{' '}
                    {CARBON_FACTORS.energia.toLocaleString('pt-BR')}, agua {CARBON_FACTORS.agua.toLocaleString('pt-BR')},
                    outros {CARBON_FACTORS.outro.toLocaleString('pt-BR')} kg CO2 por real). Sao valores
                    de referencia do projeto, sem fonte oficial: a tarifa muda de cidade para cidade.
                  </li>
                  <li>
                    <strong>Agua e outros gastos:</strong> sempre estimados por enquanto (ainda nao ha fator
                    oficial adotado para m3 de agua).
                  </li>
                  <li>
                    <strong>Equivalencias</strong> (arvores, km de carro, voo) sao aproximacoes ilustrativas.
                  </li>
                </ul>
              </details>
            </GlassCard>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Energia', kg: carbono.energiaKg, icon: Zap, cor: 'from-amber-500 to-yellow-500' },
                { label: 'Agua', kg: carbono.aguaKg, icon: Droplets, cor: 'from-blue-500 to-cyan-500' },
                { label: 'Outros', kg: carbono.outroKg, icon: Wind, cor: 'from-violet-500 to-indigo-500' },
              ].map((c) => (
                <motion.div key={c.label} whileHover={{ scale: 1.04 }}>
                  <GlassCard className="p-4 text-center">
                    <div
                      className={clsx(
                        'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-2',
                        c.cor
                      )}
                    >
                      <c.icon size={16} className="text-white" />
                    </div>

                    <p className="text-xl font-black text-white">{c.kg.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-500">kg CO2</p>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">{c.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {historico.length > 0 && (
              <GlassCard className="p-5 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium flex items-center gap-2">
                  <BarChart3 size={12} /> Evolucao - ultimos 6 meses (kg CO2)
                </p>

                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={historico} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      formatter={(v: any) => [`${v} kg CO2`]}
                    />
                    <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
                      {historico.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.label === getMesLabel(mesSel, true) ? '#22c55e' : '#334155'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            )}

            <GlassCard className="p-5 space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Isso equivale a...
              </p>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    emoji: '🌳',
                    label: `${carbono.arvoresTotais} arvore${carbono.arvoresTotais !== 1 ? 's' : ''}`,
                    sub: 'para absorver em 1 ano',
                  },
                  {
                    emoji: '🚗',
                    label: `${carbono.kmCarro.toLocaleString('pt-BR')} km`,
                    sub: 'rodados de carro',
                  },
                  {
                    emoji: '✈️',
                    label: `${carbono.horasAviao}h de voo`,
                    sub: 'em altitude de cruzeiro',
                  },
                ].map((eq, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-2xl">{eq.emoji}</span>

                    <div>
                      <p className="text-sm font-bold text-white">{eq.label}</p>
                      <p className="text-[10px] text-slate-500">{eq.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5 space-y-3 border-emerald-500/20 bg-emerald-600/5">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-emerald-400" />
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Analise Personalizada - IA
                </p>
              </div>

              {loadingIA ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  Analisando seus dados...
                </div>
              ) : dicaIA ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-emerald-200 leading-relaxed"
                >
                  {dicaIA}
                </motion.p>
              ) : null}
            </GlassCard>

            <GlassCard className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Acoes de Alto Impacto
              </p>

              <div className="space-y-2">
                {[
                  { acao: 'Comer menos carne bovina (2x/semana menos)', reducao: '-6 kg CO2/mes', emoji: '🥗' },
                  { acao: 'Usar transporte publico 3x por semana', reducao: '-4 kg CO2/mes', emoji: '🚌' },
                  { acao: 'Trocar todas as lampadas por LED', reducao: '-2 kg CO2/mes', emoji: '💡' },
                  { acao: 'Reduzir 5 min no banho diario', reducao: '-1,5 kg CO2/mes', emoji: '🚿' },
                  { acao: 'Desligar stand-by dos aparelhos', reducao: '-0,8 kg CO2/mes', emoji: '🔌' },
                ].map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{a.emoji}</span>
                      <p className="text-xs text-slate-300">{a.acao}</p>
                    </div>

                    <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                      {a.reducao}
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
