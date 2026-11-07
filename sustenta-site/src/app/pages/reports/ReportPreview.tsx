import { FileText, TrendingUp, TrendingDown, Minus, Leaf, Star, AlertTriangle, CheckCircle, BarChart2, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { ReportData } from './tipos';
import { DonutChart, ScoreGauge } from './graficos';


export function ReportPreview({ data }: { data: ReportData }) {
  const tendencia = data.scoreMes - data.scoreAnterior;

  return (
    <div
      id="report-preview"
      className="bg-slate-900 text-white p-8 rounded-2xl space-y-6 min-w-[640px]"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
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
          <p className="text-xs text-slate-500">
            {data.usuario?.cidade || 'Cidade'}, {data.usuario?.estado || 'UF'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Gasto', value: `R$ ${data.totalGeral.toFixed(2)}`, icon: BarChart2, color: 'from-violet-600 to-violet-800' },
          { label: 'Score', value: `${data.scoreMes}/100`, icon: Star, color: 'from-green-600 to-green-800' },
          { label: 'Nível', value: data.nivel, icon: Leaf, color: 'from-emerald-600 to-teal-800' },
          { label: 'Registros', value: `${data.registros.length}`, icon: FileText, color: 'from-blue-600 to-blue-800' },
        ].map((c) => (
          <div key={c.label} className={clsx('rounded-xl p-3 bg-gradient-to-br', c.color)}>
            <c.icon size={16} className="text-white/70 mb-1" />
            <p className="text-lg font-bold text-white leading-tight">{c.value}</p>
            <p className="text-xs text-white/60">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
          <ScoreGauge score={data.scoreMes} />

          <div className="flex items-center gap-2 mt-3">
            {tendencia > 0 ? (
              <TrendingUp size={14} className="text-green-400" />
            ) : tendencia < 0 ? (
              <TrendingDown size={14} className="text-red-400" />
            ) : (
              <Minus size={14} className="text-slate-400" />
            )}

            <span
              className={clsx(
                'text-xs font-semibold',
                tendencia > 0
                  ? 'text-green-400'
                  : tendencia < 0
                    ? 'text-red-400'
                    : 'text-slate-400'
              )}
            >
              {tendencia > 0 ? '+' : ''}
              {tendencia} pts vs. mês anterior
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">
            Distribuição
          </p>

          <DonutChart
            energia={data.totalEnergia}
            agua={data.totalAgua}
            transporte={data.totalTransporte}
            outro={data.totalOutro}
            total={data.totalGeral}
          />
        </div>
      </div>

      {data.historico.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Evolução dos Gastos
          </p>

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
              {data.historico.map((h) => (
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

      {data.maioresGastos.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={13} /> Top Gastos do Mês
          </p>

          {data.maioresGastos.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0"
            >
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

      {data.alertas.length > 0 && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 space-y-2">
          <p className="text-xs text-red-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={13} /> Alertas
          </p>

          {data.alertas.map((a, i) => (
            <p key={i} className="text-xs text-red-300">
              ⚠ {a}
            </p>
          ))}
        </div>
      )}

      {data.dicas.length > 0 && (
        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 space-y-2">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-2">
            <CheckCircle size={13} /> Dicas
          </p>

          {data.dicas.map((d, i) => (
            <p key={i} className="text-xs text-emerald-300">
              ✓ {d}
            </p>
          ))}
        </div>
      )}

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
              {data.registros.map((r) => (
                <tr key={r.id} className="border-b border-slate-700/30 last:border-0">
                  <td className="py-1.5 text-slate-300">{r.descricao || '—'}</td>
                  <td className="py-1.5 text-slate-400 capitalize">
                    {r.subcategoria || r.categoria}
                  </td>
                  <td className="py-1.5 text-right text-white font-medium">
                    R$ {r.valor.toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="border-t border-slate-600">
                <td colSpan={2} className="pt-2 text-slate-400 font-medium">
                  Total
                </td>
                <td className="pt-2 text-right text-white font-bold">
                  R$ {data.totalGeral.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
        <p className="text-xs text-slate-600">
          Gerado pelo Sustenta em {new Date().toLocaleDateString('pt-BR')}
        </p>
        <p className="text-xs text-slate-600">sustenta.app</p>
      </div>
    </div>
  );
}
