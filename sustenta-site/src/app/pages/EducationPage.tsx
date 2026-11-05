import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Play, Brain, Wind, Flame, Bolt } from 'lucide-react';
import { auth } from '../../services/firebase';
import { useTheme } from '../contexts/ThemeContext';
import clsx from 'clsx';
import type { UserProgress } from './education/tipos';
import { DESAFIOS_SEMANA, NOTICIAS_CATEGORIAS, QUIZ_CATEGORIAS } from './education/dados';
import { carregarProgresso, salvarArtigoLido, salvarDesafioAceito, salvarQuizCompleto } from './education/progresso';
import { DesafioCard, TabBtn } from './education/componentes';
import { ArtigosTab } from './education/ArtigosTab';
import { VideosTab } from './education/VideosTab';
import { QuizTab } from './education/QuizTab';
import { CarbonTab } from './education/CarbonTab';


export default function EducationPage() {
  const { darkMode } = useTheme();
  const [tab, setTab] = useState<'artigos' | 'videos' | 'quiz' | 'carbono'>('artigos');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const uid = auth.currentUser?.uid;
  const userName =
    auth.currentUser?.displayName ??
    auth.currentUser?.email?.split('@')[0] ??
    'Usuario';

  useEffect(() => {
    if (!uid) {
      setLoadingProgress(false);
      return;
    }

    carregarProgresso(uid).then((p) => {
      setProgress(p);
      setLoadingProgress(false);
    });
  }, [uid]);

  async function handleArtigoLido(id: string) {
    if (!uid) return;

    await salvarArtigoLido(uid, id);

    setProgress((p) =>
      p
        ? {
            ...p,
            artigosLidos: [...p.artigosLidos, id],
            xpEducacao: p.xpEducacao + 50,
          }
        : p
    );
  }

  async function handleQuizCompleto(
    catId: string,
    acertos: number,
    total: number,
    xp: number
  ) {
    if (!uid) return;

    await salvarQuizCompleto(uid, catId, acertos, total, xp, userName);

    setProgress((p) =>
      p
        ? {
            ...p,
            quizzesCompletos: [
              ...p.quizzesCompletos,
              { catId, acertos, total, data: new Date() },
            ],
            xpEducacao: p.xpEducacao + xp,
          }
        : p
    );
  }

  async function handleAceitarDesafio(desafio: typeof DESAFIOS_SEMANA[0]) {
    if (!uid) return;

    await salvarDesafioAceito(uid, desafio.id, desafio.xp, userName);

    setProgress((p) =>
      p
        ? {
            ...p,
            desafiosAceitos: [...p.desafiosAceitos, desafio.id],
            xpEducacao: p.xpEducacao + desafio.xp,
          }
        : p
    );
  }

  const artigosLidos = progress?.artigosLidos.length ?? 0;
  const quizCompletos = progress?.quizzesCompletos.length ?? 0;
  const xpEducacao = progress?.xpEducacao ?? 0;

  const TABS = [
    { id: 'artigos', label: 'Noticias', icon: BookOpen, badge: artigosLidos },
    { id: 'videos', label: 'Videos', icon: Play, badge: 0 },
    { id: 'quiz', label: 'Quiz', icon: Brain, badge: quizCompletos },
    { id: 'carbono', label: 'Carbono', icon: Wind, badge: 0 },
  ] as const;

  return (
    <div
      className={clsx(
        'min-h-screen p-6 space-y-6',
        darkMode ? 'bg-slate-900' : 'bg-slate-50'
      )}
    >
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-600/6 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-600/5 rounded-full blur-3xl" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-900/40">
            <BookOpen size={22} className="text-white" />
          </div>

          <div>
            <h1
              className={clsx(
                'text-2xl font-black',
                darkMode ? 'text-white' : 'text-slate-900'
              )}
            >
              Educacao Ambiental
            </h1>

            <p className={clsx('text-sm', darkMode ? 'text-slate-400' : 'text-slate-500')}>
              Noticias, videos, quiz e calculadora de carbono
            </p>
          </div>
        </div>

        {!loadingProgress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30"
          >
            <Flame size={14} className="text-emerald-400" />
            <span className="text-emerald-300 font-bold text-sm">{xpEducacao} XP</span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <DesafioCard progress={progress} onAceitarDesafio={handleAceitarDesafio} />
      </motion.div>

      {!loadingProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={clsx(
            'rounded-2xl border p-4 flex items-center gap-4',
            darkMode
              ? 'bg-white/5 border-white/10'
              : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex gap-4 flex-wrap">
            {[
              {
                label: 'Noticias lidas',
                value: `${artigosLidos}/${NOTICIAS_CATEGORIAS.length}`,
                icon: BookOpen,
                color: 'text-blue-400',
              },
              {
                label: 'Quizzes',
                value: `${quizCompletos}/${QUIZ_CATEGORIAS.length}`,
                icon: Brain,
                color: 'text-violet-400',
              },
              {
                label: 'Desafios',
                value: `${progress?.desafiosAceitos.length ?? 0}/7`,
                icon: Bolt,
                color: 'text-amber-400',
              },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <s.icon size={13} className={s.color} />
                <span className={clsx('text-xs font-bold', s.color)}>{s.value}</span>
                <span className={clsx('text-xs', darkMode ? 'text-slate-500' : 'text-slate-400')}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className={clsx('h-1.5 rounded-full', darkMode ? 'bg-white/10' : 'bg-slate-200')}>
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round(
                    ((artigosLidos + quizCompletos) /
                      (NOTICIAS_CATEGORIAS.length + QUIZ_CATEGORIAS.length)) *
                      100
                  )}%`,
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>

            <p className={clsx('text-[10px] mt-1', darkMode ? 'text-slate-500' : 'text-slate-400')}>
              Progresso geral
            </p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={clsx(
          'flex gap-1 p-1.5 rounded-2xl overflow-x-auto border backdrop-blur-sm',
          darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        {TABS.map((t) => (
          <TabBtn
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            badge={t.badge}
          />
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'artigos' && (
            <ArtigosTab progress={progress} onArtigoLido={handleArtigoLido} />
          )}
          {tab === 'videos' && <VideosTab />}
          {tab === 'quiz' && (
            <QuizTab progress={progress} onQuizCompleto={handleQuizCompleto} />
          )}
          {tab === 'carbono' && <CarbonTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
