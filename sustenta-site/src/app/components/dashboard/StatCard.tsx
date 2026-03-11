import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrendingUp, TrendingDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  trend?: { value: number; isUp: boolean; };
  color: 'emerald' | 'blue' | 'amber' | 'indigo';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon: Icon, trend, color, delay = 0 }) => {
  const iconClasses = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {unit && <span className="text-slate-400 text-sm">{unit}</span>}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full w-fit",
              trend.isUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend.value}% vs mês passado</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};