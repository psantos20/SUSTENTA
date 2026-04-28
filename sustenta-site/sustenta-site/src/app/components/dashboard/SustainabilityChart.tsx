import React from 'react';
import { Zap, Droplets, Wallet } from 'lucide-react';

interface CategoryChartProps {
  energia: number;
  agua: number;
  outro: number;
  subcategorias: Record<string, number>;
}

const CORES_SUB = [
  '#10b981', '#8b5cf6', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
];

export const CategoryChart: React.FC<CategoryChartProps> = ({
  energia, agua, outro, subcategorias,
}) => {
  const total = energia + agua + outro || 1;

  const dadosSubs = Object.entries(subcategorias)
    .map(([name, valor], i) => ({ name, valor, color: CORES_SUB[i % CORES_SUB.length] }))
    .filter(d => d.valor > 0);

  return (
    <div className="space-y-6">
      {/* Barras de progresso visuais */}
      <div className="space-y-4">
        {[
          { icon: Droplets, label: 'Água',    valor: agua,    color: '#0ea5e9', pct: Math.round((agua / total) * 100)    },
          { icon: Zap,      label: 'Energia', valor: energia, color: '#f59e0b', pct: Math.round((energia / total) * 100) },
          { icon: Wallet,   label: 'Outros',  valor: outro,   color: '#10b981', pct: Math.round((outro / total) * 100)   },
        ].filter(d => d.valor > 0).map(({ icon: Icon, label, valor, color, pct }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  R$ {valor.toFixed(2)}
                </span>
              </div>
            </div>
            {label === 'Outros' && dadosSubs.length > 1 ? (
              <div className="w-full h-3 rounded-full overflow-hidden flex gap-0.5">
                {dadosSubs.map((sub, i) => (
                  <div
                    key={i}
                    style={{ width: `${(sub.valor / outro) * 100}%`, background: sub.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    title={`${sub.name}: R$ ${sub.valor.toFixed(2)}`}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legenda subcategorias */}
      {dadosSubs.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          {dadosSubs.map((sub, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: sub.color }} />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {sub.name} <span className="font-bold text-slate-700 dark:text-slate-300">R$ {sub.valor.toFixed(2)}</span>
                {' '}<span className="text-slate-400 dark:text-slate-500">{Math.round((sub.valor / outro) * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};