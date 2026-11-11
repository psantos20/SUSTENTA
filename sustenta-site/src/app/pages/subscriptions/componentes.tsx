import React from 'react';
import { cn, useTons } from './tons';
import { NOME_SERVICO, type AvaliacaoAssinatura, type Plano, type TipoRecomendacao } from '../../../services/streaming';
import { ROTULO_RECOMENDACAO, formatarDia, formatarHoras, mensagemRecomendacao, moeda, origemDasHoras } from './textos';

const TOM_SELO: Record<TipoRecomendacao, 'marcaSuave' | 'info' | 'aviso' | 'neutro'> = {
  manter: 'marcaSuave',
  trocar: 'info',
  cancelar: 'aviso',
  atencao: 'aviso',
  rodizio: 'info',
  sem_dados: 'neutro',
};

export const SeloRecomendacao: React.FC<{ tipo: TipoRecomendacao }> = ({ tipo }) => {
  const tons = useTons();
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap', tons[TOM_SELO[tipo]])}>
      {ROTULO_RECOMENDACAO[tipo]}
    </span>
  );
};

export const Kpi: React.FC<{ rotulo: string; valor: string; complemento: string }> = ({ rotulo, valor, complemento }) => {
  const tons = useTons();
  return (
    <div className={cn('p-5 rounded-[20px] border', tons.cartao)}>
      <p className={cn('text-sm', tons.suave)}>{rotulo}</p>
      <p className={cn('font-display text-2xl md:text-3xl font-bold mt-1', tons.texto)}>{valor}</p>
      <p className={cn('text-xs mt-2', tons.suave)}>{complemento}</p>
    </div>
  );
};

function nomeDoPlano(plano: string | null, planos: Plano[]): string {
  if (plano) return plano;
  return planos.length > 0 ? 'Plano a confirmar' : 'Plano não identificado';
}

export const CartaoAssinatura: React.FC<{ avaliacao: AvaliacaoAssinatura; planos: Plano[] }> = ({ avaliacao, planos }) => {
  const tons = useTons();
  const { assinatura, horas, recomendacao } = avaliacao;
  const nome = NOME_SERVICO[assinatura.servico];
  const numeros = [
    { rotulo: 'Horas no mês', valor: avaliacao.precisaPerguntarTv ? '—' : formatarHoras(horas.total) },
    { rotulo: 'Custo por hora', valor: recomendacao.custoPorHora !== null ? moeda(recomendacao.custoPorHora) : '—' },
    { rotulo: 'Próxima cobrança', valor: formatarDia(assinatura.proximaCobranca) },
  ];
  return (
    <article className={cn('min-w-0 p-4 sm:p-6 rounded-[20px] border flex flex-col gap-4', tons.cartao)} aria-label={`Assinatura ${nome}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className={cn('w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-display font-bold text-lg', tons.marcaSuave)}>
          {nome.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-display font-bold text-lg', tons.texto)}>{nome}</h3>
          <p className={cn('text-sm truncate', tons.suave)}>
            {nomeDoPlano(assinatura.plano, planos)} · {moeda(assinatura.valor)} por mês
          </p>
        </div>
        <SeloRecomendacao tipo={recomendacao.tipo} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {numeros.map((n) => (
          <div key={n.rotulo} className={cn('min-w-0 rounded-xl p-2.5 sm:p-3', tons.alto)}>
            <p className={cn('text-xs', tons.suave)}>{n.rotulo}</p>
            <p className={cn('font-display font-bold text-base sm:text-lg mt-0.5', tons.texto)}>{n.valor}</p>
          </div>
        ))}
      </div>
      <p className={cn('text-sm font-semibold', tons.texto)}>{mensagemRecomendacao(avaliacao)}</p>
      <p className={cn('text-xs mt-auto', tons.suave)}>{origemDasHoras(avaliacao)}</p>
    </article>
  );
};
