import { Users, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../../../services/firebase';
import { MissoesFamiliaCard } from './MissoesFamiliaCard';
import type { HabitosCtx } from './useHabitos';

export function RankingTab(p: HabitosCtx) {
  const { rankingFamilia, concluidos, total, streak, xpHabitos } = p;
  return (
    <motion.div
      key="ranking"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <MissoesFamiliaCard {...p} />

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <Users className="w-5 h-5 text-amber-500" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Ranking Familiar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              XP acumulado em hábitos
            </p>
          </div>
        </div>

        {rankingFamilia.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">
              Nenhum grupo familiar ativo
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Crie ou entre em um grupo em <strong>Perfil → Modo Família</strong>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {rankingFamilia.map((membro, i) => {
              const isUser = membro.uid === auth.currentUser?.uid;
              const medalha =
                i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

              return (
                <div
                  key={membro.uid}
                  className={`flex items-center gap-4 px-8 py-5 transition-colors ${
                    isUser
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <span className="text-xl w-8 text-center">{medalha}</span>

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isUser
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {membro.nome
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`text-sm font-bold ${
                        isUser
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {membro.nome}{' '}
                      {isUser && (
                        <span className="text-[10px] font-bold text-emerald-500">
                          (você)
                        </span>
                      )}
                    </p>

                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width:
                            rankingFamilia[0].xp > 0
                              ? `${(membro.xp / rankingFamilia[0].xp) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>

                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 shrink-0">
                    {membro.xp} <span className="text-xs font-bold text-slate-400">XP</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-200/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold">Seu desempenho</h4>
          <Award className="w-5 h-5 text-emerald-300" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'XP Total', value: String(xpHabitos) },
            { label: 'Streak', value: `${streak} dias` },
            { label: 'Hoje', value: `${concluidos}/${total}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-emerald-700/50 rounded-2xl p-3 text-center">
              <p className="text-xl font-black">{value}</p>
              <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
