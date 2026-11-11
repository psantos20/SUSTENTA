import React from 'react';
import { Headphones, Landmark, Monitor, Tv } from 'lucide-react';
import { NOME_SERVICO, TIPO_SERVICO, type AvaliacaoAssinatura, type ConexaoBanco, type RespostaTv, type ResumoRelatorio } from '../../../services/streaming';
import { CATALOGO_PLANOS } from '../../../services/catalogoPlanos';
import type { ModoStreaming } from './useStreaming';
import type { SituacaoExtensao } from '../../../services/assinaturas';
import { CartaoAssinatura, Kpi } from './componentes';
import { cn, useTons } from './tons';
import { ONDE_FORA, formatarHoras, moeda } from './textos';

interface Props {
  modo: ModoStreaming;
  conexoes: (ConexaoBanco & { nome: string })[];
  extensao: SituacaoExtensao | null;
  avaliacoes: AvaliacaoAssinatura[];
  resumo: ResumoRelatorio;
  onResponderTv: (servico: AvaliacaoAssinatura['assinatura']['servico'], resposta: RespostaTv) => Promise<void>;
}

function quando(iso: string | null): string {
  if (!iso) return 'ainda não sincronizado';
  const d = new Date(iso);
  return `atualizado em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const OPCOES_TV: { valor: RespostaTv; rotulo: string }[] = [
  { valor: 'nao', rotulo: 'Não usei' },
  { valor: 'pouco', rotulo: 'Pouco' },
  { valor: 'bastante', rotulo: 'Bastante' },
];

export const AssinaturasTab: React.FC<Props> = ({ modo, conexoes, extensao, avaliacoes, resumo, onResponderTv }) => {
  const tons = useTons();
  const pendentes = avaliacoes.filter((a) => a.precisaPerguntarTv);
  const acoes = avaliacoes.filter((a) => a.recomendacao.economiaAnual > 0).length;

  const [erro, setErro] = React.useState('');
  const real = modo === 'real';

  const fontes = [
    {
      icone: Landmark,
      titulo: 'Banco ou cartão (Open Finance)',
      detalhe: real
        ? `${conexoes.map((c) => c.nome).join(', ')} · ${quando(conexoes[0]?.ultimaSync ?? null)}`
        : 'Exemplo: cobranças de setembro e outubro',
      selo: real ? (conexoes.length > 1 ? `${conexoes.length} bancos` : 'Conectado') : 'Exemplo',
      ativo: real,
    },
    {
      icone: Monitor,
      titulo: 'Extensão do navegador',
      detalhe: real
        ? extensao?.vinculada
          ? extensao.ultimoEnvio
            ? `Vinculada · ${quando(extensao.ultimoEnvio)}`
            : 'Vinculada · aguardando o primeiro envio'
          : 'Não vinculada · vincule em Conectar fontes'
        : 'Exemplo: minutos medidos em outubro',
      selo: real ? (extensao?.vinculada ? 'Ativa' : 'Não vinculada') : 'Exemplo',
      ativo: real && !!extensao?.vinculada,
    },
  ];

  const responder = async (servico: AvaliacaoAssinatura['assinatura']['servico'], resposta: RespostaTv) => {
    setErro('');
    try {
      await onResponderTv(servico, resposta);
    } catch {
      setErro('Não foi possível salvar sua resposta. Tente de novo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {fontes.map(({ icone: Icone, titulo, detalhe, selo, ativo }) => (
          <div key={titulo} className={cn('flex items-center gap-3 p-4 rounded-[20px] border', tons.cartao)}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tons.marcaSuave)}>
              <Icone className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold', tons.texto)}>{titulo}</p>
              <p className={cn('text-sm', tons.suave)}>{detalhe}</p>
            </div>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', ativo ? tons.marcaSuave : tons.neutro)}>{selo}</span>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi rotulo="Gasto com streaming" valor={moeda(resumo.totalPago)} complemento={`${avaliacoes.length} ${avaliacoes.length === 1 ? 'assinatura ativa' : 'assinaturas ativas'} no mês`} />
        <Kpi rotulo="Horas de uso" valor={formatarHoras(resumo.horas)} complemento="extensão + suas respostas" />
        <Kpi
          rotulo="Economia possível"
          valor={moeda(resumo.economiaAnual)}
          complemento={acoes > 0 ? `por ano, seguindo ${acoes} ${acoes === 1 ? 'recomendação' : 'recomendações'}` : 'nenhuma ação recomendada'}
        />
      </div>

      {pendentes.map((a) => {
        const musica = TIPO_SERVICO[a.assinatura.servico] === 'musica';
        const Icone = musica ? Headphones : Tv;
        const nome = NOME_SERVICO[a.assinatura.servico];
        return (
        <div
          key={a.assinatura.servico}
          className={cn('flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-[20px]', tons.info)}
          role="group"
          aria-label={`Pergunta sobre o uso de ${nome} ${ONDE_FORA(a.assinatura.servico)}`}
        >
          <Icone className="w-6 h-6 shrink-0" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="font-semibold">
              {musica ? `Você ouviu ${nome} no celular ou app este mês?` : `Você assistiu ${nome} pela TV este mês?`}
            </p>
            <p className={cn('text-sm', tons.texto)}>
              Você pagou {moeda(a.assinatura.valor)} e não detectamos uso no computador. Um toque e o relatório fica completo.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {OPCOES_TV.map((o) => (
              <button
                key={o.valor}
                onClick={() => responder(a.assinatura.servico, o.valor)}
                className={cn('px-4 py-2 rounded-full border text-sm font-semibold transition-colors', tons.botaoSecundario)}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>
        );
      })}

      {erro && (
        <p role="alert" className={cn('text-sm px-4 py-3 rounded-xl', tons.aviso)}>
          {erro}
        </p>
      )}

      {avaliacoes.length === 0 ? (
        <div className={cn('p-8 rounded-[20px] border text-center', tons.cartao)}>
          <p className={cn('font-display font-bold text-lg', tons.texto)}>Nenhuma assinatura encontrada</p>
          <p className={cn('text-sm mt-2', tons.suave)}>
            Olhamos as cobranças dos últimos 3 meses e não achamos Netflix, Disney+, HBO Max, Prime Video, YouTube Premium, Spotify nem Deezer. Se você paga por outro
            cartão, conecte também esse banco.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {avaliacoes.map((a) => (
            <CartaoAssinatura key={a.assinatura.servico} avaliacao={a} planos={CATALOGO_PLANOS[a.assinatura.servico] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
};
