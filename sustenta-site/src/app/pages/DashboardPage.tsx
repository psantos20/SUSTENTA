import React from 'react';
import { Zap, Droplets, Car, CheckCircle2, Calendar, AlertCircle, Loader2, TrendingUp, PieChart, Lightbulb, Receipt } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { CategoryChart } from '../components/dashboard/SustainabilityChart';
import { MetasCard } from '../components/dashboard/MetasCard';
import { ProjecaoCard } from '../components/dashboard/ProjecaoCard';
import { PainelResumo } from '../components/dashboard/PainelResumo';
import { auth } from '../../services/firebase';
import { motion } from 'motion/react';
import { buscarRegistrosMes, buscarTodosRegistros } from '../../services/consumo';
import type { Registro } from '../../services/consumo';

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

// --- Organização da informação ---

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TituloSecao: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</h2>
);

// --- Componente ---

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [mes, setMes] = React.useState(mesAtual);
  const [carregando, setCarregando] = React.useState(true);
  const [energia, setEnergia] = React.useState(0);
  const [agua, setAgua] = React.useState(0);
  const [transporte, setTransporte] = React.useState(0);
  const [outro, setOutro] = React.useState(0);
  const [totalRegistros, setTotalRegistros] = React.useState(0);
  const [subcategorias, setSubcategorias] = React.useState<Record<string, number>>({});
  const [registrosMes, setRegistrosMes] = React.useState<Registro[]>([]);
  const [todosRegistros, setTodosRegistros] = React.useState<Registro[]>([]);
  const [historicoPronto, setHistoricoPronto] = React.useState(false);

  React.useEffect(() => {
    setCarregando(true);
    buscarRegistrosMes(mes).then(registros => {
      setTotalRegistros(registros.length);
      setRegistrosMes(registros);
      setEnergia(registros.filter(r => r.categoria === 'energia').reduce((s, r) => s + r.valor, 0));
      setAgua(registros.filter(r => r.categoria === 'agua').reduce((s, r) => s + r.valor, 0));
      setTransporte(registros.filter(r => r.categoria === 'transporte').reduce((s, r) => s + r.valor, 0));
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

  React.useEffect(() => {
    buscarTodosRegistros()
      .then(r => { setTodosRegistros(r); })
      .catch(() => {})
      .finally(() => setHistoricoPronto(true));
  }, []);

  const total = energia + agua + transporte + outro;
  const score = Math.min(100, Math.max(0, Math.round(100 - (total / 10))));
  const mesLabel = new Date(mes + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const alertas = gerarAlertas({ energia, agua, outro, total, subcategorias, totalRegistros });
  const mesPassado = (() => {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const totalMesPassado = todosRegistros.filter(r => r.mes === mesPassado).reduce((s, r) => s + r.valor, 0);
  const emAndamento = mes === mesAtual;
  const primeiroNomeBruto = (auth.currentUser?.displayName || '').trim().split(/\s+/)[0] || '';
  const primeiroNome = primeiroNomeBruto.charAt(0).toUpperCase() + primeiroNomeBruto.slice(1).toLowerCase();
  const nomeMes = new Date(mes + '-02').toLocaleDateString('pt-BR', { month: 'long' });
  const nomeMesPassado = new Date(mesPassado + '-02').toLocaleDateString('pt-BR', { month: 'long' });
  const pct = totalMesPassado > 0 ? Math.round((Math.abs(total - totalMesPassado) / totalMesPassado) * 100) : 0;
  const frase = totalMesPassado > 0
    ? `${emAndamento ? 'Até agora, seu' : 'Seu'} consumo de ${nomeMes} está ${pct}% ${total <= totalMesPassado ? 'mais leve' : 'mais pesado'} que o de ${nomeMesPassado}.${total <= totalMesPassado ? ' Continue assim.' : ' Veja abaixo onde dá para melhorar.'}`
    : `${emAndamento ? 'Até agora você gastou' : 'Você gastou'} ${brl(total)} em ${mesLabel}.`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Painel'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {carregando || totalRegistros === 0 ? 'Acompanhe seus gastos e o impacto ambiental do mês.' : frase}
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
        <div className="space-y-6">
          <PainelResumo
            mes={mes}
            mesAtual={mesAtual}
            mesLabel={mesLabel}
            total={total}
            score={score}
            registrosMes={registrosMes}
            todosRegistros={todosRegistros}
            historicoPronto={historicoPronto}
            alertas={alertas}
            onNavigate={onNavigate}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-12 text-center"
          >
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Nenhum registro ainda</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Adicione seus gastos em <strong>Gastos</strong> para ver seu dashboard!
            </p>
            <button
              onClick={() => onNavigate?.('consumption')}
              className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Receipt className="w-4 h-4" /> Registrar primeiro gasto
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* 1. Resumo (igual ao Figma): números-chave, pegada, desafio, insights e liga */}
          <PainelResumo
            mes={mes}
            mesAtual={mesAtual}
            mesLabel={mesLabel}
            total={total}
            score={score}
            registrosMes={registrosMes}
            todosRegistros={todosRegistros}
            historicoPronto={historicoPronto}
            alertas={alertas}
            onNavigate={onNavigate}
          />

          {/* 2. Detalhes do mês */}
          <div className="space-y-4">
            <TituloSecao>Para onde foi o dinheiro</TituloSecao>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard title="Energia Eletrica"  value={energia.toFixed(2)} unit="R$" icon={Zap}          color="amber"   delay={0.1} />
              <StatCard title="Consumo de Agua"   value={agua.toFixed(2)}    unit="R$" icon={Droplets}     color="blue"    delay={0.2} />
              <StatCard title="Transporte"       value={transporte.toFixed(2)} unit="R$" icon={Car}        color="violet"  delay={0.3} />
              <StatCard title="Outros Gastos"     value={outro.toFixed(2)}   unit="R$" icon={CheckCircle2} color="emerald" delay={0.4} />
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">
                Distribuicao de Gastos em {mesLabel}
              </h3>
              <CategoryChart energia={energia} agua={agua} transporte={transporte} outro={outro} subcategorias={subcategorias} />
            </div>
          </div>

          {/* 3. Planejamento */}
          <TituloSecao>Planejamento</TituloSecao>

          {/* Projeção: só faz sentido para o mês em andamento */}
          {mes === mesAtual && historicoPronto && (
            <ProjecaoCard mes={mes} dia={hoje.getDate()} registrosMes={registrosMes} todosRegistros={todosRegistros} />
          )}

          {/* Metas mensais por categoria */}
          <MetasCard gastos={{ energia, agua, transporte, outro }} mesLabel={mesLabel} />

        </>
      )}
    </div>
  );
};