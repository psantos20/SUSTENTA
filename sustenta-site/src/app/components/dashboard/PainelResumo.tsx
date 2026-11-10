import React from 'react';
import clsx from 'clsx';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from 'recharts';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase';
import type { Registro } from '../../../services/consumo';
import { useTheme } from '../../contexts/ThemeContext';
import { calcularCarbono } from '../../pages/education/carbono';
import { DESAFIOS_SEMANA } from '../../pages/education/dados';
import { dataLocal } from '../../pages/habits/ofensiva';
import { ofensivaAtual, proximoMarco } from '../../pages/habits/ofensiva';
import { diasDaSemana, inicioDaSemana } from '../../pages/habits/missoesFamilia';
import { montarLiga, nomeAbreviado, TAMANHO_LIGA } from '../../pages/habits/liga';
import type { EntradaLiga } from '../../pages/habits/liga';
import { calcularDadosProjecao } from './dadosProjecao';

export interface AlertaPainel {
  id: string;
  tipo: 'aviso' | 'info' | 'positivo' | 'dica';
  icone: React.ElementType;
  titulo: string;
  descricao: string;
}

interface PainelResumoProps {
  mes: string;
  mesAtual: string;
  mesLabel: string;
  total: number;
  score: number;
  registrosMes: Registro[];
  todosRegistros: Registro[];
  historicoPronto: boolean;
  alertas: AlertaPainel[];
  onNavigate?: (page: string) => void;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const mesDeslocado = (mes: string, deslocamento: number) => {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + deslocamento, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const nomeDoMes = (mes: string, formato: 'long' | 'short' = 'long') =>
  new Date(`${mes}-02`).toLocaleDateString('pt-BR', { month: formato }).replace('.', '');

const PRIORIDADE: Record<AlertaPainel['tipo'], number> = { aviso: 0, dica: 1, info: 2, positivo: 3 };

const TILE: Record<AlertaPainel['tipo'], string> = {
  aviso: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  positivo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400',
  dica: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400',
};

const CARTAO = 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[20px]';

function Variacao({ atual, anterior, mesAnterior }: { atual: number; anterior: number; mesAnterior: string }) {
  if (anterior <= 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">Sem {nomeDoMes(mesAnterior)} para comparar</p>;
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const menos = pct <= 0;
  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          'text-xs font-bold px-2 py-0.5 rounded-md',
          menos
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        )}
      >
        {pct > 0 ? '+' : ''}{pct}%
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">vs. {nomeDoMes(mesAnterior)}</span>
    </div>
  );
}

function CartaoKpi({ rotulo, valor, unidade, children, testId }: { rotulo: string; valor: string; unidade?: string; children: React.ReactNode; testId: string }) {
  return (
    <div className={clsx(CARTAO, 'p-6 flex flex-col gap-3')} data-testid={testId}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{rotulo}</p>
      <p className="font-display font-bold text-[32px] leading-none text-slate-900 dark:text-slate-100 tracking-tight">
        {valor}
        {unidade && <span className="text-[32px]"> {unidade}</span>}
      </p>
      {children}
    </div>
  );
}

export const PainelResumo: React.FC<PainelResumoProps> = ({
  mes, mesAtual, mesLabel, total, score, registrosMes, todosRegistros, historicoPronto, alertas, onNavigate,
}) => {
  const { darkMode } = useTheme();
  const hoje = new Date();
  const emAndamento = mes === mesAtual;
  const mesPassado = mesDeslocado(mes, -1);

  // --- Sequência (Hábitos) e Liga semanal: só leitura ---
  const [streakInfo, setStreakInfo] = React.useState<{ streak: number; melhor: number } | null>(null);
  const [liga, setLiga] = React.useState<EntradaLiga[]>([]);
  const [ligaPronta, setLigaPronta] = React.useState(false);
  const [alertasAbertos, setAlertasAbertos] = React.useState(false);
  const ligaCarregada = ligaPronta || !auth.currentUser;
  const dataHoje = dataLocal();
  const semana = inicioDaSemana(dataHoje);

  React.useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    let ativo = true;
    getDoc(doc(db, 'habitos_usuarios', user.uid))
      .then((snap) => {
        if (!ativo) return;
        const d = snap.exists() ? snap.data() : {};
        const streak = ofensivaAtual(d.streak || 0, d.ultimoRegistro || '', dataHoje);
        setStreakInfo({ streak, melhor: Math.max(d.maiorStreak || 0, streak) });
      })
      .catch(() => { if (ativo) setStreakInfo({ streak: 0, melhor: 0 }); });
    getDocs(query(collection(db, 'ranking_semanal'), where('semana', '==', semana), limit(100)))
      .then((snap) => { if (ativo) setLiga(snap.docs.map((d) => d.data() as EntradaLiga)); })
      .catch(() => { /* sem liga: o card mostra o convite */ })
      .finally(() => { if (ativo) setLigaPronta(true); });
    return () => { ativo = false; };
  }, [dataHoje, semana]);

  // --- Números ---
  const kgAtual = React.useMemo(() => calcularCarbono(registrosMes).totalKg, [registrosMes]);
  const totalMesPassado = React.useMemo(
    () => todosRegistros.filter((r) => r.mes === mesPassado).reduce((s, r) => s + r.valor, 0),
    [todosRegistros, mesPassado]
  );
  const kgMesPassado = React.useMemo(
    () => calcularCarbono(todosRegistros.filter((r) => r.mes === mesPassado)).totalKg,
    [todosRegistros, mesPassado]
  );

  const serie = React.useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const m = mesDeslocado(mes, i - 5);
        const regs = m === mes ? registrosMes : todosRegistros.filter((r) => r.mes === m);
        return { mes: m, rotulo: nomeDoMes(m, 'short'), kg: Math.round(calcularCarbono(regs).totalKg) };
      }),
    [mes, registrosMes, todosRegistros]
  );
  const temSerie = serie.some((s) => s.kg > 0);

  const projecao = React.useMemo(
    () => (emAndamento && historicoPronto ? calcularDadosProjecao(mes, hoje.getDate(), registrosMes, todosRegistros) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emAndamento, historicoPronto, mes, registrosMes, todosRegistros]
  );

  const nivelScore = score >= 80 ? 'Ótimo' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Atenção';
  const marco = proximoMarco(streakInfo?.streak ?? 0);
  const desafio = DESAFIOS_SEMANA[hoje.getDay()];

  const insights = [...alertas].sort((a, b) => PRIORIDADE[a.tipo] - PRIORIDADE[b.tipo]);
  const insightsVisiveis = alertasAbertos ? insights : insights.slice(0, 3);

  const uid = auth.currentUser?.uid;
  const ranking = montarLiga(liga, semana, TAMANHO_LIGA);
  const meuIndice = ranking.findIndex((e) => e.uid === uid);
  const linhasLiga = ranking.slice(0, 3);
  if (meuIndice >= 3) linhasLiga.push(ranking[meuIndice]);
  const diasRestantesLiga = 7 - Math.max(0, diasDaSemana(semana).indexOf(dataHoje));

  const corBarra = darkMode ? '#2a5a43' : '#bfe0cb';
  const corDestaque = darkMode ? '#6ee7a8' : '#15803d';
  const corEixo = darkMode ? '#8fa89a' : '#4f6b5c';

  return (
    <div className="space-y-6">
      {/* 4 números-chave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <CartaoKpi rotulo="Gasto do mês" valor={brl(total).replace(/,\d{2}$/, '')} testId="kpi-gasto">
          <Variacao atual={total} anterior={totalMesPassado} mesAnterior={mesPassado} />
        </CartaoKpi>
        <CartaoKpi rotulo="Pegada de carbono" valor={num(kgAtual)} unidade="kg" testId="kpi-carbono">
          <Variacao atual={kgAtual} anterior={kgMesPassado} mesAnterior={mesPassado} />
        </CartaoKpi>
        <CartaoKpi rotulo="Score sustentável" valor={`${score} / 100`} testId="kpi-score">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{nivelScore}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">meta: 85</span>
          </div>
        </CartaoKpi>
        <CartaoKpi rotulo="Sequência ativa" valor={String(streakInfo?.streak ?? 0)} unidade={(streakInfo?.streak ?? 0) === 1 ? 'dia' : 'dias'} testId="kpi-sequencia">
          <div className="flex items-center gap-2">
            {streakInfo && streakInfo.streak > 0 && streakInfo.streak >= streakInfo.melhor ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Recorde</span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Melhor: {streakInfo?.melhor ?? 0}</span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {marco ? `faltam ${marco.dias - (streakInfo?.streak ?? 0)} para o selo` : 'todos os selos conquistados'}
            </span>
          </div>
        </CartaoKpi>
      </div>

      {/* Evolução da pegada + desafio do dia + projeção */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={clsx(CARTAO, 'xl:col-span-2 p-6')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Evolução da pegada de carbono</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Emissões estimadas por mês, em kg de CO₂</p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full whitespace-nowrap">Últimos 6 meses</span>
          </div>
          {temSerie ? (
            <div className="h-[280px] mt-4" data-testid="grafico-pegada">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
                  <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={{ fill: corEixo, fontSize: 13 }} />
                  <Bar dataKey="kg" radius={[10, 10, 10, 10]} maxBarSize={44}>
                    {serie.map((s) => (
                      <Cell key={s.mes} fill={s.mes === mes ? corDestaque : corBarra} />
                    ))}
                    <LabelList
                      dataKey="kg"
                      position="top"
                      content={(props) => {
                        const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number };
                        const atual = serie[index]?.mes === mes;
                        return (
                          <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={atual ? 700 : 400} fill={atual ? corDestaque : corEixo}>
                            {value}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-16 text-center">Registre seus gastos para acompanhar a evolução da sua pegada.</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-[20px] border border-emerald-600/40 dark:border-emerald-400/40 bg-emerald-50 dark:bg-emerald-900/30" data-testid="desafio-do-dia">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Desafio do dia</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">+{desafio.xp} XP</span>
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 mt-4 leading-snug">
              {desafio.titulo.replace('Desafio do Dia: ', '')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{desafio.descricao}</p>
            <button
              type="button"
              onClick={() => onNavigate?.('education')}
              className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-5 rounded-full transition-all active:scale-95"
            >
              Concluir desafio
            </button>
          </div>

          {projecao && projecao.projecao.total > 0 && (
            <div className={clsx(CARTAO, 'p-6')} data-testid="projecao-resumo">
              <p className="text-sm text-slate-500 dark:text-slate-400">Projeção para o fim do mês</p>
              <p className="font-display font-bold text-[32px] leading-none text-slate-900 dark:text-slate-100 mt-3 tracking-tight">
                {brl(projecao.projecao.total).replace(/,\d{2}$/, '')}
              </p>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 mt-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                  style={{ width: `${Math.min(100, projecao.projecao.total > 0 ? (total / projecao.projecao.total) * 100 : 0)}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                {projecao.mesAnterior && projecao.totalMesAnterior > 0
                  ? `Mantendo o ritmo, você fecha ${mesLabel.split(' ')[0]} ${brl(Math.abs(projecao.projecao.total - projecao.totalMesAnterior))} ${projecao.projecao.total <= projecao.totalMesAnterior ? 'abaixo' : 'acima'} de ${nomeDoMes(projecao.mesAnterior)}.`
                  : 'Estimativa baseada no seu ritmo de gastos até agora.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insights + Liga semanal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={clsx(CARTAO, 'xl:col-span-2 p-6')} data-testid="insights">
          <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Insights do SUSTENTA
          </h2>
          {insights.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-5">Sem alertas para exibir.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {insightsVisiveis.map((a) => {
                const Icone = a.icone;
                return (
                  <li key={a.id} className="flex items-start gap-4">
                    <span className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', TILE[a.tipo])}>
                      <Icone className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">{a.titulo}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{a.descricao}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {insights.length > 3 && (
            <button
              type="button"
              onClick={() => setAlertasAbertos((v) => !v)}
              aria-expanded={alertasAbertos}
              className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline"
            >
              {alertasAbertos ? 'Mostrar menos' : `Ver todos (${insights.length})`}
              {!alertasAbertos && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className={clsx(CARTAO, 'p-6')} data-testid="liga-resumo">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Liga semanal</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400 whitespace-nowrap">
              Termina em {diasRestantesLiga} {diasRestantesLiga === 1 ? 'dia' : 'dias'}
            </span>
          </div>
          {!ligaCarregada ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-5">Carregando…</p>
          ) : linhasLiga.length === 0 ? (
            <div className="mt-5">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Ninguém na liga ainda esta semana. Entre e dispute o topo com o XP dos seus hábitos.</p>
              <button
                type="button"
                onClick={() => onNavigate?.('habits')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Ir para a Liga <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {linhasLiga.map((e) => {
                const eu = e.uid === uid;
                const nome = eu ? `${nomeAbreviado(e.nome)} (você)` : e.nome;
                return (
                  <li
                    key={e.uid}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      eu && 'bg-emerald-100 dark:bg-emerald-900'
                    )}
                  >
                    <span className="w-5 text-sm text-slate-500 dark:text-slate-400 text-center">{e.posicao}</span>
                    <span
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        eu ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {(e.nome || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{nome}</span>
                    <span className={clsx('text-sm', eu ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                      {e.xp.toLocaleString('pt-BR')} XP
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
