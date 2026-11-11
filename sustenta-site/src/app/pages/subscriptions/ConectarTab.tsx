import React from 'react';
import { Check, Landmark, Loader2, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { auth } from '../../../services/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { ErroFuncao } from '../../../services/api';
import {
  desconectarBanco,
  pedirTokenConexao,
  registrarConexao,
  salvarNomeBanco,
  sincronizarAssinaturas,
  type SituacaoExtensao,
} from '../../../services/assinaturas';
import { CartaoExtensao } from './CartaoExtensao';
import { MAX_CONEXOES, type ConexaoBanco } from '../../../services/streaming';
import { cn, useTons } from './tons';

const PRIVACIDADE = [
  {
    titulo: 'Guarda',
    ok: true,
    itens: ['Serviço, valor e data das cobranças de streaming', 'Minutos por dia em cada plataforma', 'Sua resposta sobre o uso na TV ou no celular'],
  },
  {
    titulo: 'Nunca guarda',
    ok: false,
    itens: ['Senha de streaming ou do banco', 'Extrato completo ou número do cartão', 'Títulos assistidos ou histórico de navegação'],
  },
  {
    titulo: 'Você controla',
    ok: true,
    itens: ['Desconectar o banco a qualquer momento', 'Pausar a medição na extensão', 'Apagar todos os dados da função'],
  },
];

type Acao = 'conectar' | 'sincronizar' | 'desconectar' | null;

function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroFuncao) {
    if (e.codigo === 'nao_configurado') return 'A conexão com bancos ainda não está configurada no servidor do SUSTENTA.';
    if (e.status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    if (e.mensagemServidor) return e.mensagemServidor;
  }
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}

type ConexaoComNome = ConexaoBanco & { nome: string };

interface Props {
  conexoes: ConexaoComNome[];
  totalAssinaturas: number;
  extensao: SituacaoExtensao | null;
}

export const ConectarTab: React.FC<Props> = ({ conexoes, totalAssinaturas, extensao }) => {
  const conectado = conexoes.length > 0;
  const tons = useTons();
  const { darkMode } = useTheme();
  const [acao, setAcao] = React.useState<Acao>(null);
  const [erro, setErro] = React.useState('');
  const [aviso, setAviso] = React.useState('');

  const executar = async (nome: Exclude<Acao, null>, fn: () => Promise<void>) => {
    setErro('');
    setAviso('');
    setAcao(nome);
    try {
      await fn();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setAcao(null);
    }
  };

  const conectar = () =>
    executar('conectar', async () => {
      const token = await pedirTokenConexao();
      // O widget da Pluggy só é baixado quando a pessoa clica em conectar.
      const { PluggyConnect } = await import('pluggy-connect-sdk');
      await new Promise<void>((resolve, reject) => {
        const widget = new PluggyConnect({
          connectToken: token,
          // Bancos de teste (Pluggy Bank): sempre no `npm run dev`; em produção, só com VITE_PLUGGY_SANDBOX=true.
          includeSandbox: import.meta.env.DEV || import.meta.env.VITE_PLUGGY_SANDBOX === 'true',
          language: 'pt',
          theme: darkMode ? 'dark' : 'light',
          onSuccess: async ({ item }) => {
            try {
              const r = await registrarConexao(item.id);
              setAviso(
                r.assinaturas > 0
                  ? `Banco conectado! Agora são ${r.assinaturas} ${r.assinaturas === 1 ? 'assinatura encontrada' : 'assinaturas encontradas'}.`
                  : 'Banco conectado! Nenhuma assinatura encontrada nos últimos 3 meses.',
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          onError: () => reject(new Error('widget')),
          onClose: () => resolve(),
        });
        widget.init().catch(reject);
      });
    });

  const sincronizar = () =>
    executar('sincronizar', async () => {
      const r = await sincronizarAssinaturas();
      setAviso(`Atualizado. ${r.assinaturas} ${r.assinaturas === 1 ? 'assinatura encontrada' : 'assinaturas encontradas'}.`);
    });

  const desconectar = (conexao?: ConexaoComNome) => {
    const pergunta = conexao
      ? `Desconectar ${conexao.nome}? As assinaturas encontradas só nele somem. Você pode conectar de novo depois.`
      : 'Desconectar todos os bancos e apagar as assinaturas encontradas? Você pode conectar de novo depois.';
    if (!window.confirm(pergunta)) return;
    return executar('desconectar', async () => {
      await desconectarBanco(conexao?.itemId);
      setAviso(conexao ? `${conexao.nome} desconectado.` : 'Bancos desconectados e dados apagados.');
    });
  };

  const [editando, setEditando] = React.useState<{ itemId: string; nome: string } | null>(null);
  const salvarNome = async () => {
    const uid = auth.currentUser?.uid;
    if (!editando || !uid) return;
    try {
      await salvarNomeBanco(uid, editando.itemId, editando.nome);
      setEditando(null);
    } catch {
      setErro('Não foi possível salvar o nome. Tente de novo.');
    }
  };

  const ocupado = acao !== null;
  const botao = 'px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6">
      {(erro || aviso) && (
        <p role={erro ? 'alert' : 'status'} className={cn('text-sm px-4 py-3 rounded-xl', erro ? tons.aviso : tons.marcaSuave)}>
          {erro || aviso}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className={cn('p-6 rounded-[20px] border flex flex-col gap-4', tons.cartao)}>
          <div className="flex items-center gap-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', tons.marcaSuave)}>
              <Landmark className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <h3 className={cn('font-display font-bold text-lg', tons.texto)}>Banco ou cartão</h3>
              <p className={cn('text-sm', tons.suave)}>Open Finance, via Pluggy</p>
            </div>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', conectado ? tons.marcaSuave : tons.neutro)}>
              {conexoes.length > 1 ? `${conexoes.length} bancos` : conectado ? 'Conectado' : 'Não conectado'}
            </span>
          </div>
          <p className={cn('text-sm leading-relaxed', tons.texto)}>
            Encontramos suas assinaturas nas cobranças do cartão. Você autoriza no app do seu banco e pode desconectar quando quiser.
            Dá para conectar até {MAX_CONEXOES} bancos. Nenhuma senha de streaming é pedida.
          </p>
          {conectado && (
            <ul className="space-y-2">
              {conexoes.map((c) => (
                <li key={c.itemId} className={cn('rounded-xl p-3 flex items-center gap-3', tons.alto)}>
                  <div className="flex-1 min-w-0">
                    {editando?.itemId === c.itemId ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void salvarNome();
                        }}
                      >
                        <input
                          autoFocus
                          maxLength={40}
                          value={editando.nome}
                          onChange={(e) => setEditando({ itemId: c.itemId, nome: e.target.value })}
                          aria-label="Nome do banco"
                          className={cn('flex-1 min-w-0 px-3 py-1.5 rounded-lg border text-sm', tons.cartao, tons.texto)}
                        />
                        <button type="submit" className={cn('px-3 py-1.5 rounded-full text-xs font-semibold', tons.botaoPrimario)}>
                          Salvar
                        </button>
                        <button type="button" onClick={() => setEditando(null)} className={cn('text-xs', tons.suave)}>
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <p className={cn('font-semibold truncate', tons.texto)}>{c.nome}</p>
                    )}
                    <p className={cn('text-xs', tons.suave)}>
                      {c.status === 'ERRO'
                        ? 'Não conseguimos ler este banco. Tente Atualizar agora.'
                        : c.ultimaSync
                          ? `Atualizado em ${new Date(c.ultimaSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                          : 'Ainda não sincronizado'}
                    </p>
                  </div>
                  {editando?.itemId !== c.itemId && (
                    <>
                      <button
                        onClick={() => setEditando({ itemId: c.itemId, nome: c.nome })}
                        title="Renomear"
                        aria-label={`Renomear ${c.nome}`}
                        className={cn('p-2 rounded-lg', tons.suave)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => desconectar(c)}
                        disabled={ocupado}
                        title="Desconectar"
                        aria-label={`Desconectar ${c.nome}`}
                        className={cn('p-2 rounded-lg disabled:opacity-60', tons.suave)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
              <li className={cn('text-xs', tons.suave)}>
                {totalAssinaturas} {totalAssinaturas === 1 ? 'assinatura encontrada' : 'assinaturas encontradas'} somando todos os bancos
              </li>
            </ul>
          )}
          <div className="mt-auto flex flex-wrap gap-3">
            {conectado ? (
              <>
                <button onClick={sincronizar} disabled={ocupado} className={cn(botao, 'border', tons.botaoSecundario)}>
                  {acao === 'sincronizar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Atualizar agora
                </button>
                {conexoes.length < MAX_CONEXOES && (
                  <button onClick={conectar} disabled={ocupado} className={cn(botao, tons.botaoPrimario)}>
                    {acao === 'conectar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar outro banco
                  </button>
                )}
                <button onClick={() => desconectar()} disabled={ocupado} className={cn(botao, tons.suave, 'hover:underline')}>
                  {acao === 'desconectar' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Desconectar todos
                </button>
              </>
            ) : (
              <button onClick={conectar} disabled={ocupado} className={cn(botao, tons.botaoPrimario)}>
                {acao === 'conectar' && <Loader2 className="w-4 h-4 animate-spin" />}
                Conectar banco
              </button>
            )}
          </div>
        </div>

        <CartaoExtensao extensao={extensao} />
      </div>

      <div className={cn('p-6 rounded-[20px] border', tons.cartao)}>
        <h2 className={cn('font-display text-lg font-bold mb-4', tons.texto)}>O que o SUSTENTA guarda</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PRIVACIDADE.map((col) => (
            <div key={col.titulo}>
              <p className={cn('text-xs font-semibold uppercase tracking-wide mb-3', tons.suave)}>{col.titulo}</p>
              <ul className="space-y-2">
                {col.itens.map((item) => (
                  <li key={item} className={cn('flex gap-2 text-sm', tons.texto)}>
                    {col.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /> : <X className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
