import { Trophy, CheckCircle2, Circle, Trash2, Star, Plus, Loader2, Flame, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { COR_CATEGORIA, diaDaSemana } from './dados';
import type { HabitosCtx } from './useHabitos';

export function HabitosTab(p: HabitosCtx) {
  const { dados, salvando, setModalHabito, setHabitoDetalhe, alternarHabito, deletarHabito, todosHabitos, dataHoje, feitos, concluidos, total, percentual, dias7, streak, melhorStreak, streakEmRisco, marcoSeguinte, marcoRecente, setMarcoRecente, xpHabitos } = p;
  return (
    <motion.div
      key="habitos"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">
            Tarefas para hoje — {concluidos}/{total}
          </h3>

          <button
            onClick={() => setModalHabito(true)}
            className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3 h-3" />
            Adicionar Hábito
          </button>
        </div>

        <div className="space-y-3">
          {todosHabitos.map((habito) => {
            const feito = feitos.some((h) => h.id === habito.id);
            const carregandoEste = salvando === habito.id;
            const cor = COR_CATEGORIA[habito.categoria];
            const CatIcon = cor.icon;

            return (
              <motion.div
                key={habito.id}
                layout
                role="button"
                tabIndex={0}
                onClick={() => alternarHabito(habito, feito)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    alternarHabito(habito, feito);
                  }
                }}
                className={`cursor-pointer flex items-center justify-between p-5 rounded-2xl border transition-all ${
                  feito
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/40'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      alternarHabito(habito, feito);
                    }}
                    disabled={carregandoEste}
                    className="transition-transform active:scale-90 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {carregandoEste ? (
                      <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
                    ) : feito ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <Circle className="w-7 h-7 text-slate-300 dark:text-slate-600 hover:text-emerald-400 transition-colors" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 ${cor.bg} ${cor.text}`}
                      >
                        <CatIcon className="w-2.5 h-2.5" />
                        {habito.categoria}
                      </span>

                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{habito.pontos} XP
                      </span>

                      {habito.personalizado && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          Personalizado
                        </span>
                      )}
                    </div>

                    <h4
                      className={`font-bold text-sm transition-all ${
                        feito
                          ? 'line-through text-slate-400 dark:text-slate-500 decoration-slate-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {habito.titulo}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {habito.personalizado && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletarHabito(habito.id);
                      }}
                      className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHabitoDetalhe(habito);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-emerald-700 p-6 rounded-3xl shadow-xl shadow-emerald-200/30 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-600 rounded-full blur-2xl opacity-50" />

          <div className="relative z-10">
            <div className="bg-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/50">
              <Trophy className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold mb-2">Progresso Diário</h3>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-black">
                {concluidos}/{total}
              </span>
              <span className="text-emerald-200 font-medium">concluídos</span>
            </div>

            <div className="w-full h-2 bg-emerald-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <p className="text-[10px] text-emerald-100 font-medium">
              {concluidos === total && total > 0
                ? '🎉 Parabéns! Todos os hábitos concluídos hoje!'
                : `Complete mais ${total - concluidos} hábito${
                    total - concluidos !== 1 ? 's' : ''
                  } para ganhar bônus!`}
            </p>

            <div className="mt-4 pt-4 border-t border-emerald-600 flex items-center justify-between">
              <span className="text-xs text-emerald-200">XP de hábitos</span>
              <span className="text-sm font-black">{xpHabitos} XP</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Sua Sequência</h3>

            <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                {streak}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            {dias7.map((dia, i) => {
              const ativo = dados?.diasAtivos?.includes(dia);
              const label = diaDaSemana(dia);
              const ehHoje = dia === dataHoje;

              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    {label}
                  </span>

                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      ativo
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : ehHoje
                          ? 'bg-white dark:bg-slate-700 border-emerald-300 dark:border-emerald-700 text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {ativo ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {marcoRecente && (
            <div
              role="status"
              className="mt-5 flex items-center justify-between gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl"
            >
              <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
                🔥 {marcoRecente.dias} dias seguidos! Bônus de +{marcoRecente.xp} XP
              </p>
              <button
                type="button"
                onClick={() => setMarcoRecente(null)}
                className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
              >
                Fechar
              </button>
            </div>
          )}

          {streakEmRisco && (
            <p
              role="alert"
              className="mt-5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3"
            >
              Sua sequência de {streak} dia{streak !== 1 ? 's' : ''} termina hoje. Marque um hábito para mantê-la!
            </p>
          )}

          <div className="mt-5 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Melhor sequência: <strong className="text-slate-700 dark:text-slate-200">{melhorStreak} dia{melhorStreak !== 1 ? 's' : ''}</strong>
            </span>
            {marcoSeguinte ? (
              <span>
                Próximo bônus: {marcoSeguinte.dias} dias (+{marcoSeguinte.xp} XP)
              </span>
            ) : (
              <span>Todos os bônus alcançados</span>
            )}
          </div>

          {streak > 0 && (
            <div className="mt-5 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
              <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl text-emerald-600 shadow-sm shrink-0">
                <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
              </div>

              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  {streak >= 7
                    ? 'Mestre da Consistência! 🏆'
                    : streak >= 3
                      ? 'Ótima sequência! 🔥'
                      : 'Continue assim!'}
                </p>

                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  {streak} dia{streak !== 1 ? 's' : ''} seguido
                  {streak !== 1 ? 's' : ''} ativo{streak !== 1 ? 's' : ''}!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
