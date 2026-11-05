import { Plus, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LIMITES } from '../../../services/validacao';
import type { Categoria } from './tipos';
import type { HabitosCtx } from './useHabitos';

export function ModaisHabitos(p: HabitosCtx) {
  const { salvando, modalHabito, setModalHabito, habitoDetalhe, setHabitoDetalhe, novoTitulo, setNovoTitulo, novaCategoria, setNovaCategoria, novoPontos, setNovoPontos, alternarHabito, criarHabito, feitos } = p;
  return (
    <>
      <AnimatePresence>
        {habitoDetalhe && (
          <>
            <motion.div
              key="detalhe-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setHabitoDetalhe(null)}
            />

            <motion.div
              key="detalhe-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Detalhes do hábito
                  </h3>

                  <button
                    onClick={() => setHabitoDetalhe(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Tarefa
                    </p>
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {habitoDetalhe.titulo}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Categoria
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {habitoDetalhe.categoria}
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">
                        Recompensa
                      </p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        +{habitoDetalhe.pontos} XP
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Como funciona
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Ao concluir essa tarefa no dia de hoje, você ganha XP e contribui para sua
                      sequência diária de hábitos sustentáveis.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => setHabitoDetalhe(null)}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                  >
                    Fechar
                  </button>

                  <button
                    onClick={() => {
                      const feito = feitos.some((h) => h.id === habitoDetalhe.id);
                      alternarHabito(habitoDetalhe, feito);
                      setHabitoDetalhe(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm shadow-sm shadow-emerald-200"
                  >
                    {feitos.some((h) => h.id === habitoDetalhe.id)
                      ? 'Desmarcar'
                      : 'Concluir'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalHabito && (
          <>
            <motion.div
              key="ov"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setModalHabito(false)}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    Novo Hábito Personalizado
                  </h3>

                  <button
                    onClick={() => setModalHabito(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Título
                    </label>

                    <input
                      type="text"
                      maxLength={LIMITES.tituloHabito}
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Ex: Reduzir uso do ar-condicionado"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Categoria
                    </label>

                    <select
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value as Categoria)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100"
                    >
                      {(['Água', 'Energia', 'Resíduos', 'Alimentação', 'Transporte', 'Geral'] as Categoria[]).map(
                        (c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      XP por conclusão
                    </label>

                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={novoPontos}
                      onChange={(e) => setNovoPontos(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => setModalHabito(false)}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={criarHabito}
                    disabled={!novoTitulo.trim() || salvando === 'novo'}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all text-sm disabled:opacity-60 shadow-sm shadow-emerald-200"
                  >
                    {salvando === 'novo' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Criar Hábito
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
