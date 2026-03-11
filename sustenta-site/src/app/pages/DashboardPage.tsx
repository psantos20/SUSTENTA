import React from 'react';
import { Zap, Droplets, Wallet, CheckCircle2, Calendar, AlertCircle, ArrowUpRight, Leaf, Loader2 } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { SustainabilityChart, CategoryChart } from '../components/dashboard/SustainabilityChart';
import { motion } from 'motion/react';
import { buscarRegistrosMes, calcularNivel } from '../../services/consumo';

export const DashboardPage: React.FC = () => {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mes, setMes] = React.useState(mesAtual);
  const [carregando, setCarregando] = React.useState(true);
  const [energia, setEnergia] = React.useState(0);
  const [agua, setAgua] = React.useState(0);
  const [outro, setOutro] = React.useState(0);
  const [totalRegistros, setTotalRegistros] = React.useState(0);

  React.useEffect(() => {
    setCarregando(true);
    buscarRegistrosMes(mes).then(registros => {
      setTotalRegistros(registros.length);
      setEnergia(registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0));
      setAgua(registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0));
      setOutro(registros.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0));
      setCarregando(false);
    });
  }, [mes]);

  const total = energia + agua + outro;
  const nivel = calcularNivel(totalRegistros);
  const score = Math.min(100, Math.max(0, Math.round(100 - (total / 10))));
  const mesLabel = new Date(mes + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard Financeiro & Sustentável</h1>
          <p className="text-slate-500">Acompanhamento mensal de gastos e impacto ambiental.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
            />
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95">
            Registrar Novo Gasto
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : totalRegistros === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h2 className="text-xl font-bold text-slate-700">Nenhum registro ainda</h2>
          <p className="text-slate-500 mt-2">Adicione seus gastos em <strong>Registrar Consumo</strong> para ver seu dashboard!</p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Gasto Total (Mês)" value={total.toFixed(2)} unit="R$" icon={Wallet} color="indigo" delay={0.1} />
            <StatCard title="Energia Elétrica" value={energia.toFixed(2)} unit="R$" icon={Zap} color="amber" delay={0.2} />
            <StatCard title="Consumo de Água" value={agua.toFixed(2)} unit="R$" icon={Droplets} color="blue" delay={0.3} />
            <StatCard title="Outros Gastos" value={outro.toFixed(2)} unit="R$" icon={CheckCircle2} color="emerald" delay={0.4} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Distribuição de Gastos em {mesLabel}</h3>
              <CategoryChart energia={energia} agua={agua} outro={outro} />
            </div>

            <div className="bg-emerald-900 p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between text-white">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-emerald-800 p-2.5 rounded-xl border border-emerald-700">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div className="bg-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-700">
                    Nível {nivel.nivel}: {nivel.nome}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Seu Score Sustenta</h3>
                <p className="text-emerald-200 text-sm leading-relaxed mb-4">
                  Você tem {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''} este mês. Continue registrando para melhorar seu score!
                </p>
                <div className="w-full h-2 bg-emerald-800 rounded-full mb-2">
                  <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${nivel.xpAtual / nivel.xpTotal * 100}%` }} />
                </div>
                <p className="text-xs text-emerald-300">{nivel.xpAtual}/{nivel.xpTotal} XP para próximo nível</p>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-5xl font-black">{score}</span>
                  <span className="text-emerald-300 font-bold text-lg mb-1">/100</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Alertas & Insights</h3>
            </div>
            <div className="space-y-3">
              {energia > 200 && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-100 bg-amber-50">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Energia acima de R$ 200</p>
                    <p className="text-xs text-slate-500">Considere reduzir o uso de aparelhos de alto consumo.</p>
                  </div>
                </div>
              )}
              {agua > 100 && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-blue-100 bg-blue-50">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Água acima de R$ 100</p>
                    <p className="text-xs text-slate-500">Verifique possíveis vazamentos e reduza o tempo no banho.</p>
                  </div>
                </div>
              )}
              {totalRegistros > 0 && energia <= 200 && agua <= 100 && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Tudo dentro da meta! 🎉</p>
                    <p className="text-xs text-slate-500">Seus gastos estão controlados este mês. Continue assim!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};