import { useState } from 'react';
import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import clsx from 'clsx';
import { VIDEOS } from './dados';

export function VideosTab() {
  const [playing, setPlaying] = useState<string | null>(null);
  const tags = ['Todos', 'Consumo', 'Clima', 'Energia', 'Agua', 'Residuos', 'Economia'];
  const [tagAtiva, setTagAtiva] = useState('Todos');

  const videosFiltrados = VIDEOS.filter(
    (v) => tagAtiva === 'Todos' || v.tag === tagAtiva
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTagAtiva(t)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-full border transition-all',
              tagAtiva === t
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videosFiltrados.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-sm hover:border-white/25 transition-all group cursor-pointer"
          >
            {playing === v.id ? (
              <div className="relative" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div
                className="relative"
                style={{ paddingTop: '56.25%' }}
                onClick={() => setPlaying(v.id)}
              >
                <img
                  src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                  alt={v.titulo}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div className={clsx('absolute inset-0 bg-gradient-to-t opacity-60', v.cor)} />

                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl"
                  >
                    <Play size={18} className="text-white ml-0.5" fill="white" />
                  </motion.div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {v.duracao}
                </div>

                <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                  {v.tag}
                </div>
              </div>
            )}

            <div className="p-3.5">
              <p className="font-bold text-white text-sm leading-tight">{v.titulo}</p>
              <p className="text-xs text-slate-400 mt-0.5">{v.canal}</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{v.descricao}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
