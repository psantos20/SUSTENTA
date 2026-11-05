import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/**
 * Avisos (toasts) e confirmações do app, no lugar de alert() e confirm()
 * do navegador. Uso:
 *   const { avisar, confirmar } = useFeedback();
 *   avisar('Salvo!', 'sucesso');
 *   if (await confirmar({ mensagem: 'Deletar este registro?', perigo: true })) { ... }
 */

export type TipoAviso = 'sucesso' | 'erro' | 'info';

export interface OpcoesConfirmacao {
  titulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Deixa o botão de confirmar vermelho (ações destrutivas). */
  perigo?: boolean;
}

interface Aviso {
  id: number;
  mensagem: string;
  tipo: TipoAviso;
}

interface FeedbackContextType {
  avisar: (mensagem: string, tipo?: TipoAviso) => void;
  confirmar: (opcoes: OpcoesConfirmacao) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType>({
  avisar: () => {},
  confirmar: async () => false,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useFeedback = () => useContext(FeedbackContext);

const DURACAO_AVISO_MS = 5000;

const ESTILO_AVISO: Record<TipoAviso, { classe: string; Icone: React.ElementType }> = {
  sucesso: {
    classe: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
    Icone: CheckCircle2,
  },
  erro: {
    classe: 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',
    Icone: XCircle,
  },
  info: {
    classe: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100',
    Icone: Info,
  },
};

interface ConfirmacaoPendente extends OpcoesConfirmacao {
  resolver: (valor: boolean) => void;
}

function DialogoConfirmacao({ pendente, onFechar }: { pendente: ConfirmacaoPendente; onFechar: (valor: boolean) => void }) {
  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoConfirmarRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar(false);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => onFechar(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-titulo"
        aria-describedby="feedback-mensagem"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${pendente.perigo ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 id="feedback-titulo" className="text-base font-bold text-slate-900 dark:text-slate-100">
              {pendente.titulo ?? 'Confirmar'}
            </h2>
            <p id="feedback-mensagem" className="mt-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {pendente.mensagem}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onFechar(false)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {pendente.textoCancelar ?? 'Cancelar'}
          </button>
          <button
            ref={botaoConfirmarRef}
            type="button"
            onClick={() => onFechar(true)}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${pendente.perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {pendente.textoConfirmar ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pendente, setPendente] = useState<ConfirmacaoPendente | null>(null);
  const proximoId = useRef(1);

  const removerAviso = useCallback((id: number) => {
    setAvisos((atual) => atual.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback((mensagem: string, tipo: TipoAviso = 'info') => {
    const id = proximoId.current++;
    setAvisos((atual) => [...atual.slice(-3), { id, mensagem, tipo }]);
    window.setTimeout(() => removerAviso(id), DURACAO_AVISO_MS);
  }, [removerAviso]);

  const confirmar = useCallback((opcoes: OpcoesConfirmacao) => {
    return new Promise<boolean>((resolve) => {
      setPendente({ ...opcoes, resolver: resolve });
    });
  }, []);

  const fecharConfirmacao = useCallback((valor: boolean) => {
    setPendente((atual) => {
      atual?.resolver(valor);
      return null;
    });
  }, []);

  const valor = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <FeedbackContext.Provider value={valor}>
      {children}

      <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]" aria-live="polite">
        {avisos.map((aviso) => {
          const { classe, Icone } = ESTILO_AVISO[aviso.tipo];
          return (
            <div
              key={aviso.id}
              role={aviso.tipo === 'erro' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm ${classe}`}
            >
              <Icone className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="flex-1 whitespace-pre-line">{aviso.mensagem}</p>
              <button type="button" aria-label="Fechar aviso" onClick={() => removerAviso(aviso.id)} className="opacity-60 hover:opacity-100">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {pendente && <DialogoConfirmacao pendente={pendente} onFechar={fecharConfirmacao} />}
    </FeedbackContext.Provider>
  );
};
