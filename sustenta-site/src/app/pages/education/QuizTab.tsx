import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, CheckCircle, XCircle, RotateCcw, ArrowRight, Loader2, Award, ChevronRight, Crown, Timer } from 'lucide-react';
import { auth } from '../../../services/firebase';
import clsx from 'clsx';
import type { RankingEntry, UserProgress } from './tipos';
import { QUIZ_CATEGORIAS, QUIZ_TEMPO } from './dados';
import { carregarRanking } from './progresso';
import { Confetti, GlassCard } from './componentes';


export function QuizTab({
  progress,
  onQuizCompleto,
}: {
  progress: UserProgress | null;
  onQuizCompleto: (catId: string, acertos: number, total: number, xp: number) => Promise<void>;
}) {
  const [catSel, setCatSel] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [acertos, setAcertos] = useState<boolean[]>([]);
  const [finalizado, setFinalizado] = useState(false);
  const [tempo, setTempo] = useState(QUIZ_TEMPO);
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cat = QUIZ_CATEGORIAS.find((c) => c.id === catSel);
  const pergunta = cat?.perguntas[qIdx];
  const totalAcertos = acertos.filter(Boolean).length;
  const xpGanho = totalAcertos * 75 + (tempo > 10 ? 25 : 0);

  useEffect(() => {
    if (!catSel || selecionada !== null || finalizado) return;

    setTempo(QUIZ_TEMPO);

    timerRef.current = setInterval(() => {
      setTempo((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setSelecionada(-1);
          setAcertos((p) => [...p, false]);
          setShake(true);
          setTimeout(() => setShake(false), 600);
          return 0;
        }

        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [catSel, qIdx, selecionada, finalizado]);

  function responder(i: number) {
    if (selecionada !== null || !pergunta) return;

    if (timerRef.current) clearInterval(timerRef.current);

    setSelecionada(i);

    const correto = i === pergunta.c;

    setAcertos((p) => [...p, correto]);

    if (correto) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1500);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  async function proxima() {
    if (!cat) return;

    if (qIdx + 1 >= cat.perguntas.length) {
      setFinalizado(true);
      await onQuizCompleto(catSel!, totalAcertos, cat.perguntas.length, xpGanho);
      setLoadingRanking(true);

      carregarRanking().then((r) => {
        setRanking(r);
        setLoadingRanking(false);
      });
    } else {
      setQIdx(qIdx + 1);
      setSelecionada(null);
      setConfetti(false);
    }
  }

  function reiniciar() {
    setCatSel(null);
    setQIdx(0);
    setSelecionada(null);
    setAcertos([]);
    setFinalizado(false);
    setConfetti(false);
    setShake(false);

    if (timerRef.current) clearInterval(timerRef.current);
  }

  if (!catSel) {
    return (
      <div className="space-y-4">
        <p className="text-slate-400 text-sm">
          Escolha uma categoria. Cada pergunta tem {QUIZ_TEMPO} segundos!
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {QUIZ_CATEGORIAS.map((c, i) => {
            const Icon = c.icon;
            const completou = progress?.quizzesCompletos.some((q) => q.catId === c.id) ?? false;

            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCatSel(c.id)}
                className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 transition-all text-left group relative"
              >
                {completou && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle size={14} className="text-emerald-400" />
                  </div>
                )}

                <div
                  className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br',
                    c.cor
                  )}
                >
                  <Icon size={22} className="text-white" />
                </div>

                <div>
                  <p className="font-bold text-white">{c.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.perguntas.length} perguntas · {QUIZ_TEMPO}s cada
                  </p>
                  {completou && (
                    <p className="text-[10px] text-emerald-400 mt-0.5">Completado!</p>
                  )}
                </div>

                <ChevronRight
                  size={16}
                  className="text-slate-500 ml-auto group-hover:translate-x-1 transition-transform"
                />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  if (finalizado && cat) {
    const pct = Math.round((totalAcertos / cat.perguntas.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4"
      >
        <GlassCard className="p-8 text-center space-y-5 relative overflow-hidden">
          <Confetti active={pct >= 60} />

          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/40">
            <Trophy size={36} className="text-white" />
          </div>

          <div>
            <h3 className="text-3xl font-black text-white">
              {totalAcertos}/{cat.perguntas.length}
            </h3>

            <p className="text-slate-400 text-sm mt-1">
              {pct >= 80
                ? 'Expert em sustentabilidade!'
                : pct >= 60
                  ? 'Bom trabalho!'
                  : 'Continue aprendendo!'}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 py-2.5 px-6 bg-emerald-600/20 border border-emerald-600/30 rounded-2xl">
            <Award size={18} className="text-emerald-400" />
            <span className="text-emerald-300 font-bold">+{xpGanho} XP ganhos!</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Acertos', value: totalAcertos, color: 'text-emerald-400' },
              { label: 'Erros', value: cat.perguntas.length - totalAcertos, color: 'text-red-400' },
              { label: 'Score', value: `${pct}%`, color: 'text-blue-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 bg-white/5 border border-white/10">
                <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setQIdx(0);
                setSelecionada(null);
                setAcertos([]);
                setFinalizado(false);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all"
            >
              <RotateCcw size={14} /> Repetir
            </button>

            <button
              onClick={reiniciar}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
            >
              Categorias <ArrowRight size={14} />
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Crown size={15} className="text-yellow-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ranking Global
            </p>
          </div>

          {loadingRanking ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Carregando ranking...
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-slate-500 text-sm">Seja o primeiro no ranking!</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isMe = r.uid === auth.currentUser?.uid;

                return (
                  <div
                    key={r.uid}
                    className={clsx(
                      'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                      isMe
                        ? 'bg-emerald-600/15 border border-emerald-600/30'
                        : 'hover:bg-white/5'
                    )}
                  >
                    <span className="text-base w-6 text-center">
                      {medals[i] ?? `#${i + 1}`}
                    </span>

                    <span
                      className={clsx(
                        'text-sm flex-1',
                        isMe ? 'text-emerald-300 font-bold' : 'text-slate-300'
                      )}
                    >
                      {r.nome}
                      {isMe ? ' (voce)' : ''}
                    </span>

                    <span className="text-xs font-bold text-amber-400">{r.xp} XP</span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </motion.div>
    );
  }

  if (!cat || !pergunta) return null;

  const tempoPct = (tempo / QUIZ_TEMPO) * 100;
  const tempoColor = tempo > 10 ? '#22c55e' : tempo > 5 ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setCatSel(null);
            setQIdx(0);
            setSelecionada(null);
            setAcertos([]);

            if (timerRef.current) clearInterval(timerRef.current);
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight size={12} className="rotate-180" /> Categorias
        </button>

        <div className="flex items-center gap-2">
          <Timer size={13} style={{ color: tempoColor }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: tempoColor }}>
            {tempo}s
          </span>
        </div>
      </div>

      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: tempoColor }}
          animate={{ width: `${tempoPct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      <div className="flex gap-1.5">
        {cat.perguntas.map((_, i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all',
              i < acertos.length
                ? acertos[i]
                  ? 'bg-emerald-400'
                  : 'bg-red-400'
                : i === qIdx
                  ? 'bg-emerald-600'
                  : 'bg-white/10'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0, rotate: shake ? [0, -2, 2, -2, 0] : 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <GlassCard className="p-5 space-y-4 relative overflow-hidden">
            <Confetti active={confetti} />

            <h3 className="font-bold text-white text-base leading-relaxed">{pergunta.p}</h3>

            <div className="space-y-2">
              {pergunta.ops.map((op, i) => {
                const resp = selecionada !== null;
                const isC = i === pergunta.c;
                const isSel = i === selecionada;

                return (
                  <motion.button
                    key={i}
                    onClick={() => responder(i)}
                    disabled={resp}
                    whileHover={!resp ? { scale: 1.01, x: 3 } : undefined}
                    whileTap={!resp ? { scale: 0.98 } : undefined}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3',
                      !resp &&
                        'hover:border-emerald-500/60 hover:bg-emerald-600/10 cursor-pointer',
                      resp && isC && 'bg-emerald-600/20 border-emerald-500 text-emerald-200',
                      resp && isSel && !isC && 'bg-red-600/20 border-red-500 text-red-200',
                      (!resp || (!isC && !isSel)) &&
                        'bg-white/5 border-white/10 text-slate-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                        resp && isC
                          ? 'bg-emerald-500 text-white scale-110'
                          : resp && isSel && !isC
                            ? 'bg-red-500 text-white'
                            : 'bg-white/10 text-slate-400'
                      )}
                    >
                      {resp
                        ? isC
                          ? <CheckCircle size={12} />
                          : isSel
                            ? <XCircle size={12} />
                            : String.fromCharCode(65 + i)
                        : String.fromCharCode(65 + i)}
                    </span>

                    {op}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selecionada !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  className={clsx(
                    'rounded-xl p-4 border text-xs leading-relaxed overflow-hidden',
                    acertos[acertos.length - 1]
                      ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-200'
                      : 'bg-slate-700/40 border-white/10 text-slate-300'
                  )}
                >
                  <p className="font-bold mb-1.5 flex items-center gap-1.5">
                    {acertos[acertos.length - 1] ? (
                      <>
                        <CheckCircle size={12} /> Correto!
                      </>
                    ) : (
                      <>
                        <XCircle size={12} /> Incorreto
                      </>
                    )}
                  </p>

                  {pergunta.exp}
                </motion.div>
              )}
            </AnimatePresence>

            {selecionada !== null && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={proxima}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
              >
                {qIdx + 1 >= cat.perguntas.length ? (
                  <>
                    <Trophy size={14} /> Ver resultado
                  </>
                ) : (
                  <>
                    Proxima <ArrowRight size={14} />
                  </>
                )}
              </motion.button>
            )}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
