import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, CheckCircle, Loader2, Clock, ChevronRight, Bolt } from 'lucide-react';
import clsx from 'clsx';
import type { Noticia, UserProgress } from './tipos';
import { DESAFIOS_SEMANA } from './dados';
import { formatarData } from './noticias';

export function GlassCard({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <motion.div
      whileHover={
        glow
          ? {
              scale: 1.01,
              boxShadow: '0 0 30px rgba(34,197,94,0.08)',
            }
          : undefined
      }
      className={clsx(
        'rounded-2xl border backdrop-blur-sm transition-colors bg-white/5 border-white/10 hover:border-white/20',
        className
      )}
    >
      {children}
    </motion.div>
  );
}


export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    color: ['#22c55e', '#eab308', '#3b82f6', '#a78bfa', '#f97316'][i % 5],
    size: 4 + Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ y: -10, x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{
            y: '110%',
            opacity: 0,
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: 1.2 + Math.random() * 0.5,
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute top-0 rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}


export function TabBtn({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={clsx(
        'relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon size={15} />
      {label}

      {!!badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center">
          {badge}
        </span>
      )}
    </motion.button>
  );
}


export function DesafioCard({
  progress,
  onAceitarDesafio,
}: {
  progress: UserProgress | null;
  onAceitarDesafio: (desafio: typeof DESAFIOS_SEMANA[0]) => Promise<void>;
}) {
  const desafio = DESAFIOS_SEMANA[new Date().getDay()];
  const jaAceito = progress?.desafiosAceitos.includes(desafio.id) ?? false;
  const [aceitando, setAceitando] = useState(false);

  async function handleAceitar() {
    if (jaAceito || aceitando) return;

    setAceitando(true);

    try {
      await onAceitarDesafio(desafio);
    } finally {
      setAceitando(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'edu-soft rounded-2xl border p-5 backdrop-blur-sm relative overflow-hidden',
        desafio.cor,
        desafio.border
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/3 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0 mt-0.5">{desafio.emoji}</span>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                Desafio do Dia
              </span>
              <span className="text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                {desafio.tag}
              </span>
            </div>

            <p className="font-bold text-white text-sm">
              {desafio.titulo.replace('Desafio do Dia: ', '')}
            </p>

            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              {desafio.descricao}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-emerald-300 bg-emerald-900/30 px-2 py-1 rounded-lg border border-emerald-700/40">
            +{desafio.xp} XP
          </span>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleAceitar}
            disabled={jaAceito || aceitando}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
              jaAceito
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 cursor-default'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            )}
          >
            {aceitando ? (
              <Loader2 size={11} className="animate-spin" />
            ) : jaAceito ? (
              <>
                <CheckCircle size={11} /> Aceito!
              </>
            ) : (
              <>
                <Bolt size={11} /> Aceitar
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}


export function NoticiaCard({ noticia, index }: { noticia: Noticia; index: number }) {
  const [expandida, setExpandida] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all overflow-hidden"
    >
      {noticia.urlImagem && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={noticia.urlImagem}
            alt={noticia.titulo}
            className="w-full h-full object-cover"
            onError={(e) => {
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) parent.style.display = 'none';
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

          <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white/70 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {noticia.fonte}
          </span>
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {!noticia.urlImagem && (
            <span className="text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
              {noticia.fonte}
            </span>
          )}

          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock size={9} /> {formatarData(noticia.publicadoEm)}
          </span>

          {noticia.autor && (
            <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
              por {noticia.autor.split(',')[0]}
            </span>
          )}
        </div>

        <h3 className="font-bold text-white text-sm leading-snug line-clamp-3">
          {noticia.titulo}
        </h3>

        <p
          className={clsx(
            'text-xs text-slate-400 leading-relaxed',
            expandida ? '' : 'line-clamp-2'
          )}
        >
          {noticia.descricao}
        </p>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setExpandida((v) => !v)}
            className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
          >
            {expandida ? 'Ver menos' : 'Ver mais'}
            <ChevronDown
              size={11}
              className={clsx('transition-transform', expandida && 'rotate-180')}
            />
          </button>

          <a
            href={noticia.urlOriginal}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Ler artigo completo <ChevronRight size={11} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
