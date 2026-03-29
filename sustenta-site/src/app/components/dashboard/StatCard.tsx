import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TrendingUp, TrendingDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  trend?: { value: number; isUp: boolean };
  color: 'emerald' | 'blue' | 'amber' | 'indigo';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, unit, icon: Icon, trend, color, delay = 0,
}) => {
  const iconClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    blue:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    amber:   'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    indigo:  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
            {unit && <span className="text-slate-400 dark:text-slate-500 text-sm">{unit}</span>}
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full w-fit',
              trend.isUp
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            )}>
              {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend.value}% vs mês passado</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};