import { CheckCircle2, Loader2, Target } from 'lucide-react';
import { podeResgatar } from './missoesFamilia';
import type { HabitosCtx } from './useHabitos';

export function MissoesFamiliaCard(p: HabitosCtx) {
  const { semanaFamilia, missoesResgatadas, resgatarMissao, salvando, rankingFamilia } = p;

  // Sem grupo familiar: a explicação já aparece no ranking logo abaixo.
  if (rankingFamilia.length === 0) return null;

  const cabecalho = (
    <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-700 flex items-center gap-3">
      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
        <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Missões da semana</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {semanaFamilia
            ? semanaFamilia.diasRestantes <= 1
              ? 'Termina hoje · de segunda a domingo'
              : `Terminam em ${semanaFamilia.diasRestantes} dias · de segunda a domingo`
            : 'Metas para cumprir juntos'}
        </p>
      </div>
    </div>
  );

  if (!semanaFamilia) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {cabecalho}
        <p className="px-8 py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
          As missões em família começam quando o grupo tem pelo menos 2 pessoas. Convide alguém em{' '}
          <strong>Perfil → Modo Família</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {cabecalho}

      <ul className="divide-y divide-slate-50 dark:divide-slate-700">
        {semanaFamilia.missoes.map((m) => {
          const resgatada = missoesResgatadas.includes(m.id);
          const pct = m.meta > 0 ? Math.round((m.atual / m.meta) * 100) : 0;
          const ocupado = salvando === `missao:${m.id}`;

          return (
            <li key={m.id} data-testid={m.id} data-concluida={m.concluida} className="px-8 py-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {m.concluida && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />}
                    {m.titulo}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.descricao}</p>
                </div>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full shrink-0">
                  +{m.xp} XP
                </span>
              </div>

              <div>
                <div
                  className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={m.atual}
                  aria-valuemin={0}
                  aria-valuemax={m.meta}
                  aria-label={`Progresso: ${m.titulo}`}
                >
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {m.atual} de {m.meta} {m.unidade}
                </p>
              </div>

              {m.porMembro && m.porMembro.some((c) => c.valor > 0) && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {m.porMembro.map((c) => `${c.nome.split(' ')[0]}: ${c.valor}`).join(' · ')}
                </p>
              )}

              {resgatada ? (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Resgatado · +{m.xp} XP</p>
              ) : (
                podeResgatar(m, missoesResgatadas) && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => resgatarMissao(m)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Resgatar +{m.xp} XP
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
