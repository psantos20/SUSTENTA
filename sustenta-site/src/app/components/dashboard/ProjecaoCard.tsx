import React from 'react';
import { TrendingUp, TrendingDown, Zap, Droplets, Car, Wallet, Leaf, Info, Loader2 } from 'lucide-react';
import type { Registro } from '../../../services/consumo';
import { buscarMetas, calcularProgresso } from '../../../services/metas';
import type { Metas, StatusMeta } from '../../../services/metas';
import { CATEGORIAS_PROJECAO, TIPO_CATEGORIA } from '../../../services/projecao';
import type { CategoriaProjecao } from '../../../services/projecao';
import { getMesLabel } from '../../pages/education/carbono';
import { calcularDadosProjecao } from './dadosProjecao';

interface ProjecaoCardProps {
  /** Mês exibido ("AAAA-MM"). O card só faz sentido para o mês em andamento. */
  mes: string;
  /** Dia de hoje no mês. */
  dia: number;
  registrosMes: Registro[];
  /** Todos os registros do usuário (o histórico vem dos meses anteriores a `mes`). */
  todosRegistros: Registro[];
}

const ROTULO: Record<CategoriaProjecao, string> = { energia: 'Energia', agua: 'Água', transporte: 'Transporte', outro: 'Outros gastos' };
const ICONE: Record<CategoriaProjecao, React.ElementType> = { energia: Zap, agua: Droplets, transporte: Car, outro: Wallet };

const TEXTO_STATUS: Record<StatusMeta, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  estourou: 'text-red-600 dark:text-red-400',
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const kg = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

export const ProjecaoCard: React.FC<ProjecaoCardProps> = ({ mes, dia, registrosMes, todosRegistros }) => {
  const [metas, setMetas] = React.useState<Metas>({});
  const [metasProntas, setMetasProntas] = React.useState(false);

  React.useEffect(() => {
    let ativo = true;
    buscarMetas()
      .then((m) => { if (ativo) setMetas(m); })
      .catch(() => { /* sem metas: o card segue sem a comparação */ })
      .finally(() => { if (ativo) setMetasProntas(true); });
    return () => { ativo = false; };
  }, []);

  const dados = React.useMemo(
    () => calcularDadosProjecao(mes, dia, registrosMes, todosRegistros),
    [mes, dia, registrosMes, todosRegistros]
  );

  const { diasNoMes, projecao, gastoAtual, kgProjetado, mesAnterior, totalMesAnterior, nivelCarbono } = dados;
  const diferenca = mesAnterior && totalMesAnterior > 0 ? projecao.total - totalMesAnterior : null;
  const percentualMes = Math.min(100, Math.round((dia / diasNoMes) * 100));

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5" data-testid="projecao-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900 p-2.5 rounded-xl text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Projeção do mês</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Dia {dia} de {diasNoMes} · uma estimativa, não um valor garantido</p>
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentualMes}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Você fecha o mês com</p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1" data-testid="projecao-total">{brl(projecao.total)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Já registrado: {brl(CATEGORIAS_PROJECAO.reduce((s, c) => s + gastoAtual[c], 0))}
          </p>
          {diferenca !== null && mesAnterior && (
            <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${diferenca > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {diferenca > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {brl(Math.abs(diferenca))} {diferenca > 0 ? 'a mais' : 'a menos'} que em {getMesLabel(mesAnterior)}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pegada de carbono prevista</p>
          <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2" data-testid="projecao-co2">
            <Leaf className="w-6 h-6 text-emerald-500" />
            {kg(kgProjetado)} <span className="text-base font-bold text-slate-400">CO₂</span>
          </p>
          {nivelCarbono ? (
            <p className={`text-xs font-bold mt-2 ${nivelCarbono.chave === 'acima' ? 'text-red-600 dark:text-red-400' : nivelCarbono.chave === 'abaixo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {nivelCarbono.chave === 'media'
                ? 'Na média dos seus outros meses'
                : `${Math.abs(nivelCarbono.variacaoPercentual)}% ${nivelCarbono.chave === 'acima' ? 'acima' : 'abaixo'} da média dos seus outros meses`}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Sem outros meses para comparar ainda.</p>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {CATEGORIAS_PROJECAO.map((cat) => {
          const Icone = ICONE[cat];
          const p = projecao.porCategoria[cat];
          const meta = metas[cat];
          const progresso = meta ? calcularProgresso(p.valor, meta) : null;
          if (p.valor === 0 && !meta) return null;
          return (
            <div key={cat} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3" data-testid={`projecao-${cat}`}>
              <div className="flex items-center gap-3 min-w-0">
                <Icone className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ROTULO[cat]}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {p.base === 'historico' && TIPO_CATEGORIA[cat] === 'conta' && 'Conta deste mês ainda não registrada: valor habitual'}
                    {p.base === 'historico' && TIPO_CATEGORIA[cat] === 'rotina' && 'Registrado + o que falta do seu mês habitual'}
                    {p.base === 'ritmo' && 'No ritmo dos dias que já passaram'}
                    {p.base === 'atual' && 'Apenas o que já foi registrado'}
                    {p.base === 'insuficiente' && 'Poucos dados ainda: só o registrado'}
                  </p>
                </div>
              </div>
              <div className="pl-7 sm:pl-0 sm:text-right sm:shrink-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{brl(p.valor)}</p>
                {progresso && meta && (
                  <p className={`text-[11px] font-bold ${TEXTO_STATUS[progresso.status]}`}>
                    {progresso.status === 'estourou'
                      ? `${brl(Math.abs(progresso.restante))} acima da meta de ${brl(meta)}`
                      : progresso.status === 'atencao'
                        ? `Perto da meta de ${brl(meta)}`
                        : `Dentro da meta de ${brl(meta)}`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {!metasProntas && (
          <div className="py-3 flex justify-center"><Loader2 className="w-4 h-4 text-slate-300 animate-spin" /></div>
        )}
      </div>

      {!projecao.confiavel && (
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          Ainda há poucos dados neste mês e você não tem meses anteriores para comparar. A projeção fica mais confiável a partir do dia 7.
        </p>
      )}
      {dados.temHistorico === false && projecao.confiavel && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Sem meses anteriores, a projeção usa só o que você registrou neste mês.</p>
      )}
      {dados.naoCalculados > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          O CO₂ não inclui transporte sem litros informados (ônibus, apps, avião), que não tem fator confiável por real gasto.
        </p>
      )}
    </div>
  );
};
