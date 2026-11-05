import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Leaf, RotateCcw, Search } from 'lucide-react';
import clsx from 'clsx';
import type { Noticia, UserProgress } from './tipos';
import { NOTICIAS_CATEGORIAS } from './dados';
import { buscarNoticias } from './noticias';
import { GlassCard, NoticiaCard } from './componentes';


export function ArtigosTab({
  progress,
  onArtigoLido,
}: {
  progress: UserProgress | null;
  onArtigoLido: (id: string) => Promise<void>;
}) {
  const [catAtiva, setCatAtiva] = useState(NOTICIAS_CATEGORIAS[0]);
  const [busca, setBusca] = useState('');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtt, setUltimaAtt] = useState<Date | null>(null);

  useEffect(() => {
    carregar(catAtiva);
  }, [catAtiva]);

  async function carregar(cat: typeof NOTICIAS_CATEGORIAS[0], forceRefresh = false) {
    setLoading(true);
    setErro(null);
    setNoticias([]);

    try {
      void forceRefresh;
      const resultado = await buscarNoticias(cat);

      setNoticias(resultado);
      setUltimaAtt(new Date());

      if (progress && !progress.artigosLidos.includes(`news-${cat.id}`)) {
        await onArtigoLido(`news-${cat.id}`);
      }
    } catch (e: any) {
      setErro(
        e?.message ||
          'Nao foi possivel carregar as noticias. Verifique sua conexao e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  const noticiasFiltradas = noticias.filter(
    (n) =>
      busca === '' ||
      n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      n.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
        <Leaf size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />

        <p className="text-xs text-emerald-300 leading-relaxed">
          Noticias reais sobre sustentabilidade, meio ambiente e consumo consciente via
          NewsAPI. Filtradas automaticamente para exibir apenas conteudo relevante ao
          tema.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {NOTICIAS_CATEGORIAS.map((cat) => {
          const Icon = cat.icon;

          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCatAtiva(cat)}
              className={clsx(
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium',
                catAtiva.id === cat.id
                  ? `bg-gradient-to-r ${cat.gradiente} text-white border-transparent shadow-lg`
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
              )}
            >
              <Icon size={11} /> {cat.label}
            </motion.button>
          );
        })}
      </div>

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar noticias carregadas..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = catAtiva.icon;
            return <Icon size={14} className="text-slate-400" />;
          })()}

          <span className="text-sm font-semibold text-white">{catAtiva.label}</span>

          {ultimaAtt && !loading && (
            <span className="text-[10px] text-slate-500">
              atualizado{' '}
              {ultimaAtt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        <button
          onClick={() => carregar(catAtiva, true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <RotateCcw size={11} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-4/5" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {erro && !loading && (
        <GlassCard className="p-6 text-center space-y-3 border-red-500/20 bg-red-600/5">
          <p className="text-sm font-semibold text-red-300">
            Nao foi possivel carregar as noticias
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">{erro}</p>

          <button
            onClick={() => carregar(catAtiva)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all mx-auto"
          >
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </GlassCard>
      )}

      {!loading && !erro && noticiasFiltradas.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {noticiasFiltradas.length} noticia
            {noticiasFiltradas.length !== 1 ? 's' : ''} encontrada
            {noticiasFiltradas.length !== 1 ? 's' : ''} sobre{' '}
            {catAtiva.label.toLowerCase()}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {noticiasFiltradas.map((n, i) => (
              <NoticiaCard key={n.id} noticia={n} index={i} />
            ))}
          </div>
        </>
      )}

      {!loading && !erro && noticiasFiltradas.length === 0 && noticias.length > 0 && (
        <GlassCard className="p-10 text-center">
          <p className="text-slate-400 text-sm">
            Nenhuma noticia encontrada para "{busca}".
          </p>
        </GlassCard>
      )}

      {!loading && !erro && noticias.length === 0 && (
        <GlassCard className="p-10 text-center space-y-3">
          <Leaf size={32} className="text-emerald-700 mx-auto" />

          <p className="text-slate-300 text-sm font-semibold">
            Nenhuma noticia de sustentabilidade encontrada
          </p>

          <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
            A NewsAPI nao retornou artigos relevantes para esta categoria no momento.
            Tente atualizar ou escolha outra categoria.
          </p>

          <button
            onClick={() => carregar(catAtiva, true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-xs font-semibold transition-all mx-auto hover:bg-emerald-600/30"
          >
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </GlassCard>
      )}
    </div>
  );
}
