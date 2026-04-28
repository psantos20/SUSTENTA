import React from 'react';
import { Zap, Droplets, Wallet, CheckCircle2, Calendar, AlertCircle, ArrowUpRight, Leaf, Loader2, TrendingUp, PieChart, Lightbulb } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { CategoryChart } from '../components/dashboard/SustainabilityChart';
import { motion } from 'motion/react';
import { buscarRegistrosMes, calcularNivel } from '../../../../src/services/consumo';

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

// --- Gerador de alertas inteligentes ---

interface Alerta {
  id: string;
  tipo: 'aviso' | 'info' | 'positivo' | 'dica';
  icone: React.ElementType;
  titulo: string;
  descricao: string;
}

function gerarAlertas(params: {
  energia: number;
  agua: number;
  outro: number;
  total: number;
  subcategorias: Record<string, number>;
  totalRegistros: number;
}): Alerta[] {
  const { energia, agua, outro, total, subcategorias, totalRegistros } = params;
  const alertas: Alerta[] = [];

  if (totalRegistros === 0) return alertas;

  // --- Analise de energia ---
  const percEnergia = total > 0 ? (energia / total) * 100 : 0;
  if (energia > 0) {
    if (percEnergia > 40) {
      alertas.push({
        id: 'energia_dominante',
        tipo: 'aviso',
        icone: Zap,
        titulo: `Energia representa ${percEnergia.toFixed(0)}% dos seus gastos`,
        descricao: 'Energia é seu maior gasto proporcional este mês. Revisar aparelhos de alto consumo como ar-condicionado, chuveiro elétrico e geladeira velha pode gerar economia real.',
      });
    } else if (energia > 300) {
      alertas.push({
        id: 'energia_alta',
        tipo: 'aviso',
        icone: Zap,
        titulo: 'Conta de energia acima da média brasileira',
        descricao: `R$ ${energia.toFixed(2)} em energia está acima da média residencial nacional (~R$ 250). Vale verificar se há equipamentos ligados sem necessidade.`,
      });
    }
  }

  // --- Analise de agua ---
  const percAgua = total > 0 ? (agua / total) * 100 : 0;
  if (agua > 0) {
    if (percAgua > 25) {
      alertas.push({
        id: 'agua_proporcional',
        tipo: 'aviso',
        icone: Droplets,
        titulo: `Agua representa ${percAgua.toFixed(0)}% dos seus gastos`,
        descricao: 'O consumo de agua está proporcionalmente alto. Verificar torneiras, vasos sanitarios e o tempo de banho pode reduzir significativamente esta conta.',
      });
    } else if (agua > 150) {
      alertas.push({
        id: 'agua_alta',
        tipo: 'aviso',
        icone: Droplets,
        titulo: 'Consumo de agua elevado',
        descricao: `R$ ${agua.toFixed(2)} em agua e saneamento e acima do esperado para uma residencia media. Considere verificar possiveis vazamentos.`,
      });
    }
  }

  // --- Analise de subcategorias ---
  const entradasSub = Object.entries(subcategorias).sort((a, b) => b[1] - a[1]);
  const totalSubs = entradasSub.reduce((s, [, v]) => s + v, 0);

  // Subcategoria dominante (mais de 60% dos "outros")
  if (entradasSub.length > 1 && totalSubs > 0) {
    const [nomeDominante, valDominante] = entradasSub[0];
    const percDominante = (valDominante / totalSubs) * 100;
    if (percDominante > 60) {
      alertas.push({
        id: 'sub_dominante',
        tipo: 'info',
        icone: PieChart,
        titulo: `${nomeDominante} concentra ${percDominante.toFixed(0)}% dos outros gastos`,
        descricao: `De R$ ${totalSubs.toFixed(2)} em outros gastos, R$ ${valDominante.toFixed(2)} e de ${nomeDominante}. Seus gastos estao concentrados em um unico item — isso e normal para compromissos fixos, mas vale monitorar.`,
      });
    }
  }

  // Subcategoria que representa muito do total geral (>30%)
  entradasSub.forEach(([nome, val]) => {
    const percDoTotal = total > 0 ? (val / total) * 100 : 0;
    if (percDoTotal > 30 && total > 500) {
      alertas.push({
        id: `sub_peso_${nome}`,
        tipo: 'info',
        icone: TrendingUp,
        titulo: `${nome} e ${percDoTotal.toFixed(0)}% do seu orcamento total`,
        descricao: `Este item tem peso significativo no seu orcamento. Se for um gasto fixo (parcela, aluguel), e apenas informativo. Se for variavel, pode valer renegociar ou reduzir.`,
      });
    }
  });

  // --- Gasto total alto em relacao a renda estimada ---
  if (total > 2000) {
    alertas.push({
      id: 'total_alto',
      tipo: 'aviso',
      icone: AlertCircle,
      titulo: `Total mensal de R$ ${total.toFixed(2)} merece atencao`,
      descricao: 'Seus gastos registrados este mes estao altos. Verifique se todos os lancamentos estao corretos e se ha oportunidades de reducao nos gastos variaveis.',
    });
  }

  // --- Poucos registros (pode estar incompleto) ---
  if (totalRegistros > 0 && totalRegistros < 3) {
    alertas.push({
      id: 'poucos_registros',
      tipo: 'dica',
      icone: Lightbulb,
      titulo: 'Dashboard pode estar incompleto',
      descricao: `Voce tem apenas ${totalRegistros} registro(s) este mes. Quanto mais gastos voce registrar, mais precisos serao os insights e o seu score de sustentabilidade.`,
    });
  }

  // --- Tudo equilibrado ---
  const tudoOk =
    percEnergia <= 40 &&
    percAgua <= 25 &&
    energia <= 300 &&
    agua <= 150 &&
    total <= 2000 &&
    totalRegistros >= 3;

  if (tudoOk) {
    alertas.push({
      id: 'tudo_ok',
      tipo: 'positivo',
      icone: CheckCircle2,
      titulo: 'Seus gastos estao equilibrados este mes!',
      descricao: 'Nenhuma categoria esta desproporcional. Continue registrando para manter o historico e melhorar seu score ao longo do tempo.',
    });
  }

  return alertas;
}

// --- Cores por tipo ---
const ESTILO_ALERTA = {
  aviso:    'border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20',
  info:     'border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20',
  positivo: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20',
  dica:     'border-purple-100 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-900/20',
};

const COR_ICONE = {
  aviso:    'text-amber-500',
  info:     'text-blue-500',
  positivo: 'text-emerald-500',
  dica:     'text-purple-500',
};

// --- Componente ---

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mes, setMes] = React.useState(mesAtual);
  const [carregando, setCarregando] = React.useState(true);
  const [energia, setEnergia] = React.useState(0);
  const [agua, setAgua] = React.useState(0);
  const [outro, setOutro] = React.useState(0);
  const [totalRegistros, setTotalRegistros] = React.useState(0);
  const [subcategorias, setSubcategorias] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    setCarregando(true);
    buscarRegistrosMes(mes).then(registros => {
      setTotalRegistros(registros.length);
      setEnergia(registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0));
      setAgua(registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0));
      setOutro(registros.filter(r => r.categoria === 'outro').reduce((s, r) => s + r.valor, 0));
      const subs: Record<string, number> = {};
      registros.filter(r => r.categoria === 'outro').forEach(r => {
        const nome = (r as any).subcategoria || 'Outro';
        subs[nome] = (subs[nome] || 0) + r.valor;
      });
      setSubcategorias(subs);
      setCarregando(false);
    });
  }, [mes]);

  const total = energia + agua + outro;
  const nivel = calcularNivel(totalRegistros);
  const score = Math.min(100, Math.max(0, Math.round(100 - (total / 10))));
  const mesLabel = new Date(mes + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const alertas = gerarAlertas({ energia, agua, outro, total, subcategorias, totalRegistros });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Dashboard Financeiro & Sustentavel
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Acompanhamento mensal de gastos e impacto ambiental.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div className="relative">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 pointer-events-none">
                {mesLabel}
              </span>
              <input
                type="month"
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('consumption')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95"
          >
            Registrar Novo Gasto
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : totalRegistros === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-12 text-center"
        >
          <div className="text-6xl mb-4">🌱</div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Nenhum registro ainda</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Adicione seus gastos em <strong>Registrar Consumo</strong> para ver seu dashboard!
          </p>
        </motion.div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Gasto Total (Mes)" value={total.toFixed(2)}   unit="R$" icon={Wallet}       color="indigo"  delay={0.1} />
            <StatCard title="Energia Eletrica"  value={energia.toFixed(2)} unit="R$" icon={Zap}          color="amber"   delay={0.2} />
            <StatCard title="Consumo de Agua"   value={agua.toFixed(2)}    unit="R$" icon={Droplets}     color="blue"    delay={0.3} />
            <StatCard title="Outros Gastos"     value={outro.toFixed(2)}   unit="R$" icon={CheckCircle2} color="emerald" delay={0.4} />
          </div>

          {/* Grafico + Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">
                Distribuicao de Gastos em {mesLabel}
              </h3>
              <CategoryChart energia={energia} agua={agua} outro={outro} subcategorias={subcategorias} />
            </div>

            {/* Score card */}
            <div className="bg-emerald-900 p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between text-white">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-800 rounded-full blur-3xl opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-emerald-800 p-2.5 rounded-xl border border-emerald-700">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div className="bg-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-700">
                    Nivel {nivel.nivel}: {nivel.nome}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">Seu Score Sustenta</h3>
                <p className="text-emerald-200 text-sm leading-relaxed mb-4">
                  Voce tem {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''} este mes. Continue registrando para melhorar seu score!
                </p>
                <div className="w-full h-2 bg-emerald-800 rounded-full mb-2">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${(nivel.xpAtual / nivel.xpTotal) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-300">{nivel.xpAtual}/{nivel.xpTotal} XP para proximo nivel</p>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-5xl font-black">{score}</span>
                  <span className="text-emerald-300 font-bold text-lg mb-1">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas inteligentes */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Alertas & Insights</h3>
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                {alertas.length} {alertas.length === 1 ? 'insight' : 'insights'}
              </span>
            </div>

            {alertas.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                Sem alertas para exibir.
              </div>
            ) : (
              <div className="space-y-3">
                {alertas.map(alerta => {
                  const Icon = alerta.icone;
                  return (
                    <motion.div
                      key={alerta.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-4 p-4 rounded-xl border ${ESTILO_ALERTA[alerta.tipo]}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${COR_ICONE[alerta.tipo]}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{alerta.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{alerta.descricao}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};