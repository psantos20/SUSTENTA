import React from 'react';
import { Info, Loader2 } from 'lucide-react';
import { AssinaturasTab } from './subscriptions/AssinaturasTab';
import { RelatorioTab } from './subscriptions/RelatorioTab';
import { ConectarTab } from './subscriptions/ConectarTab';
import { useStreaming } from './subscriptions/useStreaming';
import { cn, useTons } from './subscriptions/tons';

type Aba = 'assinaturas' | 'relatorio' | 'conectar';

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'assinaturas', rotulo: 'Assinaturas' },
  { id: 'relatorio', rotulo: 'Relatório do mês' },
  { id: 'conectar', rotulo: 'Conectar fontes' },
];

export const SubscriptionsPage: React.FC = () => {
  const tons = useTons();
  const [aba, setAba] = React.useState<Aba>('assinaturas');
  const estado = useStreaming();
  const { modo, dados, extensao, conexoes, avaliacoes, resumo, mesRotulo, responderTv } = estado;

  if (modo === 'carregando') {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className={cn('text-2xl md:text-3xl font-bold', tons.texto)}>Assinaturas</h1>
          <p className={tons.suave}>Seus streamings, quanto você usa e se vale a pena continuar pagando. {mesRotulo}.</p>
        </div>
        <div className={cn('flex p-1 gap-1 border rounded-full w-fit max-w-full overflow-x-auto', tons.cartao)} role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={cn('px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all', aba === a.id ? tons.botaoPrimario : tons.suave)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      {modo === 'exemplo' && (
        <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-[20px] text-sm', tons.neutro)} role="note">
          <Info className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          <p className="flex-1">
            <strong>Prévia com dados de exemplo.</strong> Conecte seu banco ou cartão para ver as suas assinaturas de verdade.
          </p>
          {aba !== 'conectar' && (
            <button onClick={() => setAba('conectar')} className={cn('px-4 py-2 rounded-full border text-sm font-semibold w-fit', tons.botaoSecundario)}>
              Conectar fontes
            </button>
          )}
        </div>
      )}

      {aba === 'assinaturas' && (
        <AssinaturasTab modo={modo} conexoes={conexoes} extensao={extensao} avaliacoes={avaliacoes} resumo={resumo} onResponderTv={responderTv} />
      )}
      {aba === 'relatorio' && <RelatorioTab avaliacoes={avaliacoes} resumo={resumo} mesRotulo={mesRotulo} exemplo={modo === 'exemplo'} />}
      {aba === 'conectar' && <ConectarTab conexoes={conexoes} totalAssinaturas={dados?.assinaturas.length ?? 0} extensao={extensao} />}
    </div>
  );
};
