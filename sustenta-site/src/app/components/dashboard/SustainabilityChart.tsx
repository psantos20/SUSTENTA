import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplets, Zap, Wallet } from 'lucide-react';

const weekData = [
  { name: 'Jan', valor: 520 },
  { name: 'Fev', valor: 480 },
  { name: 'Mar', valor: 510 },
  { name: 'Abr', valor: 460 },
  { name: 'Mai', valor: 490 },
  { name: 'Jun', valor: 453 },
];

export const SustainabilityChart: React.FC = () => (
  <div className="h-[220px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={weekData}>
        <defs>
          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const COLORS = [
  '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#f43f5e',
  '#84cc16', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
];

interface CategoryChartProps {
  energia: number;
  agua: number;
  outro: number;
  subcategorias?: Record<string, number>;
}

interface BarItem {
  name: string;
  valor: number;
  color: string;
  icon: React.ElementType;
  subs?: { name: string; valor: number; color: string }[];
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ energia, agua, subcategorias }) => {
  const subEntries = Object.entries(subcategorias ?? {}).filter(([, v]) => v > 0);
  const totalOutros = subEntries.reduce((s, [, v]) => s + v, 0);

  const bars: BarItem[] = [];
  if (agua > 0) bars.push({ name: 'Água', valor: agua, color: '#0ea5e9', icon: Droplets });
  if (energia > 0) bars.push({ name: 'Energia', valor: energia, color: '#f59e0b', icon: Zap });
  if (totalOutros > 0) bars.push({
    name: 'Outros',
    valor: totalOutros,
    color: COLORS[0],
    icon: Wallet,
    subs: subEntries.map(([nome, val], i) => ({ name: nome, valor: val, color: COLORS[i % COLORS.length] })),
  });

  const totalGeral = bars.reduce((s, b) => s + b.valor, 0);
  if (totalGeral === 0) return <p className="text-slate-400 text-sm text-center py-8">Nenhum dado ainda.</p>;

  return (
    <div className="space-y-5">
      {bars.map((bar) => {
        const pct = Math.round((bar.valor / totalGeral) * 100);
        const Icon = bar.icon;
        return (
          <div key={bar.name} className="space-y-2">
            {/* Header da categoria */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: bar.color + '20' }}>
                  <Icon className="w-4 h-4" style={{ color: bar.color }} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{bar.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: bar.color + '15', color: bar.color }}>
                  {pct}%
                </span>
                <span className="text-sm font-bold text-slate-800">R$ {bar.valor.toFixed(2)}</span>
              </div>
            </div>

            {/* Barra */}
            {bar.subs ? (
              <div className="w-full h-7 bg-slate-100 rounded-full overflow-hidden flex">
                {bar.subs.map((sub, i) => (
                  <div
                    key={sub.name}
                    className="h-full transition-all duration-700 relative group"
                    style={{
                      width: `${(sub.valor / totalGeral) * 100}%`,
                      background: sub.color,
                      borderRadius: i === 0 ? '9999px 0 0 9999px' : i === bar.subs!.length - 1 ? '0 9999px 9999px 0' : '0',
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-7 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: bar.color }}
                />
              </div>
            )}

            {/* Cards de subcategorias */}
            {bar.subs && bar.subs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {bar.subs.map((sub) => (
                  <div key={sub.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sub.color }} />
                    <span className="text-xs font-semibold text-slate-600">{sub.name}</span>
                    <span className="text-xs font-bold text-slate-800">R$ {sub.valor.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">{Math.round((sub.valor / totalGeral) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};