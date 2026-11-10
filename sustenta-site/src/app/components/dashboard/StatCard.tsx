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
  color: 'emerald' | 'blue' | 'amber' | 'indigo' | 'violet';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, unit, icon: Icon, trend, color, delay = 0,
}) => {
  // Design novo: ícones em tom único (marca). A categoria continua clara pelo título.
  const tom = 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400';
  const iconClasses = { emerald: tom, blue: tom, amber: tom, indigo: tom, violet: tom };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-slate-800 p-6 rounded-[20px] border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-shadow"
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