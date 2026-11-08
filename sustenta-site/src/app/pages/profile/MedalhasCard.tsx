import { Medal, Lock } from 'lucide-react';
import { GRUPOS_MEDALHA } from './medalhas';
import type { Medalha, TomMedalha } from './medalhas';

const TOM: Record<TomMedalha, { rotulo: string; icone: string; fundo: string }> = {
  bronze: {
    rotulo: 'Bronze',
    icone: 'text-amber-700 dark:text-amber-500',
    fundo: 'bg-amber-100 dark:bg-amber-900/30',
  },
  prata: {
    rotulo: 'Prata',
    icone: 'text-slate-500 dark:text-slate-300',
    fundo: 'bg-slate-100 dark:bg-slate-600/40',
  },
  ouro: {
    rotulo: 'Ouro',
    icone: 'text-yellow-500 dark:text-yellow-400',
    fundo: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
};

export function MedalhasCard({ medalhas }: { medalhas: Medalha[] }) {
  if (medalhas.length === 0) return null;

  const conquistadas = medalhas.filter((m) => m.conquistada).length;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Medalhas</h3>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
          {conquistadas} de {medalhas.length}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        Calculadas a partir dos seus registros, hábitos e desafios.
      </p>

      <div className="space-y-5">
        {GRUPOS_MEDALHA.map((grupo) => {
          const doGrupo = medalhas.filter((m) => m.grupo === grupo);
          if (doGrupo.length === 0) return null;

          return (
            <div key={grupo}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{grupo}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {doGrupo.map((m) => {
                  const tom = TOM[m.tom];
                  const pct = Math.round((m.atual / m.meta) * 100);

                  return (
                    <li
                      key={m.id}
                      data-testid={`medalha-${m.id}`}
                      data-conquistada={m.conquistada}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        m.conquistada
                          ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/20'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          m.conquistada ? tom.fundo : 'bg-slate-100 dark:bg-slate-700'
                        }`}
                      >
                        {m.conquistada ? (
                          <Medal className={`w-5 h-5 ${tom.icone}`} aria-hidden="true" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-300 dark:text-slate-500" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold ${
                            m.conquistada ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {m.nome} <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">· {tom.rotulo}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{m.descricao}</p>

                        {!m.conquistada && (
                          <div className="mt-2">
                            <div
                              className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden"
                              role="progressbar"
                              aria-valuenow={m.atual}
                              aria-valuemin={0}
                              aria-valuemax={m.meta}
                              aria-label={`Progresso: ${m.nome}`}
                            >
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                              {Math.round(m.atual)} de {m.meta}
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
