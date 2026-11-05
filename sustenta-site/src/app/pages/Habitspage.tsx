import React from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { ModaisHabitos } from './habits/ModaisHabitos';
import { DesafiosTab } from './habits/DesafiosTab';
import { RankingTab } from './habits/RankingTab';
import { HabitosTab } from './habits/HabitosTab';
import { useHabitos } from './habits/useHabitos';

export const HabitsPage: React.FC = () => {
  const ctx = useHabitos();
  const { activeTab, setActiveTab, carregando } = ctx;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Ação Sustentável
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Transforme sua rotina com pequenos hábitos e desafios mensais.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-fit">
          {[
            { id: 'habitos', label: 'Checklist Diário' },
            { id: 'desafios', label: 'Desafios Mensais' },
            { id: 'ranking', label: 'Ranking' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'habitos' | 'desafios' | 'ranking')}
              className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'habitos' && (
<HabitosTab key="habitos" {...ctx} />
        )}

        {activeTab === 'desafios' && (
<DesafiosTab key="desafios" {...ctx} />
        )}

        {activeTab === 'ranking' && (
<RankingTab key="ranking" {...ctx} />
        )}
      </AnimatePresence>

<ModaisHabitos {...ctx} />
    </div>
  );
};
