import { CheckCircle2, Loader2, Lightbulb, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { COR_CATEGORIA, COR_DIFICULDADE } from './dados';
import { PONTOS_ESFORCO, pagouPontos } from './dicas';
import type { HabitosCtx } from './useHabitos';

export function DicasTab(p: HabitosCtx) {
  const { dicasHoje, respostasDicas, resumoDicas, responderDica, salvando } = p;

  return (
    <motion.div
      key="dicas"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl text-amber-500">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Dicas do dia</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Novas dicas todo dia. Responda com sinceridade: "Já faço" vale os pontos na hora; "Vou fazer" vale quando você cumprir.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{resumoDicas.xpGanho} <span className="text-sm font-bold">XP</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {resumoDicas.respondidas}/{resumoDicas.total} respondidas · até {resumoDicas.xpPossivel} XP hoje
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dicasHoje.map((dica) => {
          const resposta = respostasDicas[dica.id];
          const pontos = PONTOS_ESFORCO[dica.esforco];
          const cor = COR_CATEGORIA[dica.categoria];
          const CatIcon = cor.icon;
          const ocupado = salvando === `dica:${dica.id}`;
          const pago = pagouPontos(resposta);

          return (
            <div
              key={dica.id}
              className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 transition-colors ${
                pago
                  ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${cor.bg} ${cor.text}`}>
                    <CatIcon className="w-3 h-3" />
                    {dica.categoria}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${COR_DIFICULDADE[dica.esforco]}`}>
                    {dica.esforco} · +{pontos} XP
                  </span>
                </div>

                <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">{dica.texto}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{dica.porque}</p>
              </div>

              {pago ? (
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {resposta === 'ja_faco' ? 'Você já faz isso' : 'Você fez!'} · +{pontos} XP
                </p>
              ) : resposta === 'vou_fazer' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responderDica(dica, 'fiz')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
                    Fiz! +{pontos} XP
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responderDica(dica, 'pulei')}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Desistir
                  </button>
                </div>
              ) : resposta === 'pulei' ? (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => responderDica(dica, 'vou_fazer')}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Pulada · mudar de ideia
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responderDica(dica, 'ja_faco')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
                    Já faço
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responderDica(dica, 'vou_fazer')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    Vou fazer
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responderDica(dica, 'pulei')}
                    className="px-3 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 text-sm font-bold hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    Pular
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {resumoDicas.pendentes > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
          Você tem {resumoDicas.pendentes} dica{resumoDicas.pendentes !== 1 ? 's' : ''} marcada{resumoDicas.pendentes !== 1 ? 's' : ''} como "Vou fazer". Volte aqui hoje e confirme para ganhar os pontos.
        </p>
      )}
    </motion.div>
  );
}
