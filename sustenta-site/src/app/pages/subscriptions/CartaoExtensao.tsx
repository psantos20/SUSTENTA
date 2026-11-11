import React from 'react';
import { Copy, Loader2, Monitor } from 'lucide-react';
import { ErroFuncao } from '../../../services/api';
import { desvincularExtensoes, gerarCodigoExtensao, type SituacaoExtensao } from '../../../services/assinaturas';
import { cn, useTons } from './tons';

const PASSOS = [
  'Instale a extensão SUSTENTA Streaming no Chrome ou no Edge.',
  'Clique em "Gerar código" aqui e digite o código na extensão.',
  'Pronto: ela mede só o tempo com vídeo ou música tocando e envia o total por dia.',
];

function quando(iso: string | null | undefined): string {
  if (!iso) return 'ainda não enviou minutos';
  return `último envio em ${new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroFuncao) {
    if (e.codigo === 'nao_configurado') return 'A extensão ainda não está configurada no servidor do SUSTENTA.';
    if (e.status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    if (e.mensagemServidor) return e.mensagemServidor;
  }
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}

export const CartaoExtensao: React.FC<{ extensao: SituacaoExtensao | null }> = ({ extensao }) => {
  const tons = useTons();
  const [codigo, setCodigo] = React.useState<{ valor: string; expiraEm: number } | null>(null);
  const [agora, setAgora] = React.useState(() => Date.now());
  const [ocupado, setOcupado] = React.useState<'codigo' | 'desvincular' | null>(null);
  const [erro, setErro] = React.useState('');
  const [aviso, setAviso] = React.useState('');

  // Contagem regressiva do código (vale 10 minutos).
  React.useEffect(() => {
    if (!codigo) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [codigo]);

  const vinculada = !!extensao?.vinculada;
  const restante = codigo ? Math.max(0, codigo.expiraEm - agora) : 0;
  const codigoValido = codigo && restante > 0;
  // Quando a extensão usa o código, o servidor marca como vinculada: o código some.
  const codigoUsado = codigo && vinculada && extensao?.vinculadaEm && Date.parse(extensao.vinculadaEm) >= codigo.expiraEm - 10 * 60_000;

  const gerar = async () => {
    setErro('');
    setAviso('');
    setOcupado('codigo');
    try {
      const r = await gerarCodigoExtensao();
      setCodigo({ valor: r.codigo, expiraEm: r.expiraEm });
      setAgora(Date.now());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  };

  const desvincular = async () => {
    if (!window.confirm('Desvincular todas as extensões? Os minutos já enviados continuam salvos.')) return;
    setErro('');
    setAviso('');
    setOcupado('desvincular');
    try {
      await desvincularExtensoes();
      setCodigo(null);
      setAviso('Extensões desvinculadas. Elas param de enviar minutos.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  };

  const copiar = () => {
    if (codigo) navigator.clipboard?.writeText(codigo.valor).catch(() => {});
  };

  const botao = 'px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const mm = String(Math.floor(restante / 60_000));
  const ss = String(Math.floor((restante % 60_000) / 1000)).padStart(2, '0');

  return (
    <div className={cn('p-6 rounded-[20px] border flex flex-col gap-4', tons.cartao)}>
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', tons.marcaSuave)}>
          <Monitor className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h3 className={cn('font-display font-bold text-lg', tons.texto)}>Extensão do navegador</h3>
          <p className={cn('text-sm', tons.suave)}>{vinculada ? quando(extensao?.ultimoEnvio) : 'Chrome e Edge'}</p>
        </div>
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', vinculada ? tons.marcaSuave : tons.neutro)}>
          {vinculada ? 'Vinculada' : 'Não vinculada'}
        </span>
      </div>

      {!vinculada && (
        <ol className="space-y-2.5">
          {PASSOS.map((p, i) => (
            <li key={p} className={cn('flex items-start gap-3 text-sm', tons.texto)}>
              <span className={cn('w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-display font-bold text-xs', tons.marcaSuave)}>
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ol>
      )}
      {vinculada && (
        <p className={cn('text-sm leading-relaxed', tons.texto)}>
          A extensão mede o tempo com vídeo ou música tocando e envia o total por dia. Os minutos entram nas horas de cada assinatura. Para vincular
          outro navegador, gere um novo código.
        </p>
      )}

      {codigoValido && !codigoUsado && (
        <div className={cn('rounded-xl p-4 flex flex-col items-center gap-1', tons.alto)} aria-live="polite">
          <button onClick={copiar} title="Copiar código" className={cn('font-display text-3xl font-bold tracking-[0.2em] inline-flex items-center gap-3', tons.texto)}>
            {codigo.valor.slice(0, 3)} {codigo.valor.slice(3)}
            <Copy className={cn('w-4 h-4', tons.suave)} />
          </button>
          <p className={cn('text-xs', tons.suave)}>
            Válido por {mm}:{ss} e uma única vez
          </p>
        </div>
      )}
      {codigo && !codigoValido && !codigoUsado && <p className={cn('text-sm', tons.suave)}>O código expirou. Gere outro.</p>}

      {(erro || aviso) && (
        <p role={erro ? 'alert' : 'status'} className={cn('text-sm px-4 py-3 rounded-xl', erro ? tons.aviso : tons.marcaSuave)}>
          {erro || aviso}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-3">
        <button onClick={gerar} disabled={ocupado !== null} className={cn(botao, vinculada ? cn('border', tons.botaoSecundario) : tons.botaoPrimario)}>
          {ocupado === 'codigo' && <Loader2 className="w-4 h-4 animate-spin" />}
          {vinculada ? 'Vincular outro navegador' : 'Gerar código'}
        </button>
        {vinculada && (
          <button onClick={desvincular} disabled={ocupado !== null} className={cn(botao, tons.suave, 'hover:underline')}>
            {ocupado === 'desvincular' && <Loader2 className="w-4 h-4 animate-spin" />}
            Desvincular
          </button>
        )}
      </div>
    </div>
  );
};
