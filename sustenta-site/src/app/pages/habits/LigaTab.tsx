import { Loader2, LogOut, ShieldCheck, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../../../services/firebase';
import { TAMANHO_LIGA } from './liga';
import type { HabitosCtx } from './useHabitos';

const MEDALHAS = ['🥇', '🥈', '🥉'];

export function LigaTab(p: HabitosCtx) {
  const { liga, entrarNaLiga, sairDaLiga, salvando } = p;
  const meuUid = auth.currentUser?.uid;
  const ocupado = salvando === 'liga';
  const maior = liga.entradas[0]?.xp || 0;

  return (
    <motion.div
      key="liga"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl text-amber-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Liga da semana</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {liga.diasRestantes <= 1
                  ? 'Termina hoje · zera na segunda-feira'
                  : `Termina em ${liga.diasRestantes} dias · zera na segunda-feira`}
              </p>
            </div>
          </div>

          {liga.participa && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {liga.xpSemana} <span className="text-sm font-bold">XP</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {liga.minhaPosicao ? `${liga.minhaPosicao}º lugar` : `fora do top ${TAMANHO_LIGA}`}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Todo mundo que entra disputa o XP ganho em Hábitos nesta semana. Na segunda-feira a contagem volta a zero e começa uma liga nova.
        </p>

        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            A participação é opcional. O ranking mostra só seu primeiro nome com a inicial do sobrenome (como "{liga.nome}") e o XP da semana, para outros usuários logados. Ao sair, esses dados são apagados.
          </span>
        </div>

        {liga.participa ? (
          <button
            onClick={sairDaLiga}
            disabled={ocupado}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sair da liga
          </button>
        ) : (
          <button
            onClick={entrarNaLiga}
            disabled={ocupado}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar na liga
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-50 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Top {TAMANHO_LIGA} da semana</h3>
        </div>

        {liga.carregando && liga.entradas.length === 0 ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : liga.erro && liga.entradas.length === 0 ? (
          <p className="py-12 px-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Não foi possível carregar a liga agora. Tente de novo em instantes.
          </p>
        ) : liga.entradas.length === 0 ? (
          <p className="py-12 px-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Ninguém na liga ainda. Seja o primeiro a entrar!
          </p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {liga.entradas.map((e) => {
              const souEu = e.uid === meuUid;
              return (
                <div
                  key={e.uid}
                  className={`flex items-center gap-4 px-8 py-4 ${souEu ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                >
                  <span className="text-lg w-8 text-center shrink-0">
                    {e.posicao <= 3 ? MEDALHAS[e.posicao - 1] : `${e.posicao}º`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        souEu ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {e.nome}{' '}
                      {souEu && <span className="text-[10px] font-bold text-emerald-500">(você)</span>}
                    </p>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: maior > 0 ? `${(e.xp / maior) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 shrink-0">
                    {e.xp} <span className="text-xs font-bold text-slate-400">XP</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
