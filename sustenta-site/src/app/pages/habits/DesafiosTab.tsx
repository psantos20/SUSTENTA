import { Trophy, CheckCircle2, Plus, Loader2, Target, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { COR_CATEGORIA, COR_DIFICULDADE, DESAFIOS_PREDEFINIDOS } from './dados';
import type { HabitosCtx } from './useHabitos';

export function DesafiosTab(p: HabitosCtx) {
  const { dados, salvando, participarDesafio, avancarDesafio } = p;
  return (
    <motion.div
      key="desafios"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {DESAFIOS_PREDEFINIDOS.map((desafio) => {
        const progresso = dados?.progressoDesafios.find((p) => p.desafioId === desafio.id);
        const iniciado = !!progresso;
        const concluido = progresso?.concluido || false;
        const pct = progresso?.progresso || 0;
        const cor = COR_CATEGORIA[desafio.categoria];
        const CatIcon = cor.icon;
        const carregandoEste = salvando === desafio.id;

        return (
          <motion.div
            key={desafio.id}
            layout
            className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl dark:hover:shadow-slate-900/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${COR_DIFICULDADE[desafio.dificuldade]}`}
                >
                  {desafio.dificuldade}
                </span>

                <span
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cor.bg} ${cor.text}`}
                >
                  <CatIcon className="w-3 h-3" />
                  {desafio.categoria}
                </span>
              </div>

              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {desafio.titulo}
              </h4>

              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {desafio.descricao}
              </p>

              {iniciado && (
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Progresso
                    </span>

                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        concluido ? 'bg-emerald-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Meta: {desafio.meta}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />

                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  +{desafio.recompensa} XP
                </span>

                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  · {desafio.duracaoDias} dias
                </span>
              </div>

              {concluido ? (
                <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Concluído
                </span>
              ) : iniciado ? (
                <button
                  onClick={() => avancarDesafio(desafio)}
                  disabled={!!carregandoEste}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 active:scale-95 disabled:opacity-60"
                >
                  {carregandoEste ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Target className="w-3.5 h-3.5" />
                  )}
                  Registrar avanço
                </button>
              ) : (
                <button
                  onClick={() => participarDesafio(desafio)}
                  disabled={!!carregandoEste}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-60"
                >
                  {carregandoEste ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Participar
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {[1, 2].map((_, i) => (
        <div
          key={i}
          className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4 opacity-60"
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <Lock className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>

          <div>
            <p className="font-bold text-slate-400 dark:text-slate-500">
              Próximos Desafios
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Em breve</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
