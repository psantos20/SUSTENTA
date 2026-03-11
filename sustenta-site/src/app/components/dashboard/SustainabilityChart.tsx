import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const weekData = [
  { name: 'Jan', valor: 520, meta: 480 },
  { name: 'Fev', valor: 480, meta: 480 },
  { name: 'Mar', valor: 510, meta: 460 },
  { name: 'Abr', valor: 460, meta: 450 },
  { name: 'Mai', valor: 490, meta: 440 },
  { name: 'Jun', valor: 453, meta: 430 },
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

interface CategoryChartProps {
  energia: number;
  agua: number;
  outro: number;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ energia, agua, outro }) => {
  const data = [
    { name: 'Água', valor: agua, color: '#0ea5e9' },
    { name: 'Energia', valor: energia, color: '#f59e0b' },
    { name: 'Outros', valor: outro, color: '#10b981' },
  ].filter(d => d.valor > 0);

  if (data.length === 0) return <p className="text-slate-400 text-sm text-center py-8">Nenhum dado ainda.</p>;

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontWeight: 500 }} width={60} />
          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Valor']} />
          <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};