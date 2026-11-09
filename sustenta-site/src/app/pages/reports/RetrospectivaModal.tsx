import React from 'react';
import { Download, Loader2, MessageCircle, Share2, X, Eye, EyeOff } from 'lucide-react';
import { useFeedback } from '../../contexts/FeedbackContext';
import { ALTURA_IMAGEM, LARGURA_IMAGEM, baixarImagem, compartilharImagem, gerarImagemPNG, nomeDoArquivo, podeCompartilharArquivo } from './imagemRetrospectiva';
import { textoCompartilhamento } from './retrospectiva';
import type { Retrospectiva } from './retrospectiva';

interface RetrospectivaModalProps {
  mes: string;
  retro: Retrospectiva;
  onFechar: () => void;
}

export function RetrospectivaModal({ mes, retro, onFechar }: RetrospectivaModalProps) {
  const { avisar } = useFeedback();
  const [mostrarValores, setMostrarValores] = React.useState(true);
  const [imagem, setImagem] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [erro, setErro] = React.useState(false);
  const [compartilhando, setCompartilhando] = React.useState(false);
  const podeCompartilhar = React.useMemo(() => podeCompartilharArquivo(), []);

  // A prévia é o próprio PNG que será baixado/compartilhado: refaz quando muda a opção de valores.
  React.useEffect(() => {
    let ativo = true;
    let urlCriada: string | null = null;
    gerarImagemPNG(retro, mostrarValores)
      .then((blob) => {
        if (!ativo) return;
        urlCriada = URL.createObjectURL(blob);
        setImagem({ blob, url: urlCriada });
        setErro(false);
      })
      .catch((e) => {
        console.error('Erro ao gerar a imagem da retrospectiva:', e);
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
  }, [retro, mostrarValores]);

  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  const baixar = () => {
    if (imagem) baixarImagem(imagem.blob, nomeDoArquivo(mes));
  };

  const compartilhar = async () => {
    if (!imagem || compartilhando) return;
    setCompartilhando(true);
    try {
      await compartilharImagem(imagem.blob, nomeDoArquivo(mes), textoCompartilhamento(retro, mostrarValores));
    } catch (e) {
      console.error('Erro ao compartilhar a imagem:', e);
      avisar('Não foi possível abrir o compartilhamento. Baixe a imagem e envie por lá.', 'erro');
    } finally {
      setCompartilhando(false);
    }
  };

  const enviarTextoWhatsApp = () => {
    const texto = encodeURIComponent(textoCompartilhamento(retro, mostrarValores));
    window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Retrospectiva de ${retro.mesLabel}`}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Retrospectiva de {retro.mesLabel}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uma imagem para guardar ou mostrar para os amigos.</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="mx-auto w-full max-w-[324px] rounded-2xl overflow-hidden shadow-lg bg-emerald-900 flex items-center justify-center"
          style={{ aspectRatio: `${LARGURA_IMAGEM} / ${ALTURA_IMAGEM}` }}
        >
          {imagem ? (
            <img src={imagem.url} alt={`Retrospectiva de ${retro.mesLabel}`} className="w-full h-full" data-testid="retrospectiva-previa" />
          ) : erro ? (
            <p className="text-xs text-emerald-100 px-6 text-center">Não foi possível gerar a imagem. Tente fechar e abrir de novo.</p>
          ) : (
            <Loader2 className="w-6 h-6 text-emerald-200 animate-spin" />
          )}
        </div>

        <button
          onClick={() => setMostrarValores((v) => !v)}
          aria-pressed={!mostrarValores}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          {mostrarValores ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {mostrarValores ? 'Ocultar valores em R$' : 'Mostrar valores em R$'}
        </button>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={baixar}
            disabled={!imagem}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            Baixar imagem
          </button>

          {podeCompartilhar && (
            <button
              onClick={compartilhar}
              disabled={!imagem || compartilhando}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-60 text-slate-800 dark:text-slate-100 font-bold text-sm"
            >
              {compartilhando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              Compartilhar imagem
            </button>
          )}

          <button
            onClick={enviarTextoWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar resumo no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
