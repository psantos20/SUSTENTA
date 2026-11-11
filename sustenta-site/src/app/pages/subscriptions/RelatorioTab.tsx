import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CO2_G_POR_HORA, NOME_SERVICO, type AvaliacaoAssinatura, type ResumoRelatorio } from '../../../services/streaming';
import { Kpi, SeloRecomendacao } from './componentes';
import { cn, useTons } from './tons';
import { ROTULO_RECOMENDACAO, formatarHoras, juntarComE, moeda } from './textos';
import { LINK_SERVICO } from './dadosExemplo';

interface Props {
  avaliacoes: AvaliacaoAssinatura[];
  resumo: ResumoRelatorio;
  mesRotulo: string;
  exemplo: boolean;
}

export const RelatorioTab: React.FC<Props> = ({ avaliacoes, resumo, mesRotulo, exemplo }) => {
  const tons = useTons();
  const comEconomia = avaliacoes.filter((a) => a.recomendacao.economiaAnual > 0);
  const kg = (resumo.co2g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return (
    <div className="space-y-6">
      <div className={cn('flex flex-col md:flex-row md:items-center gap-4 p-6 rounded-[20px]', tons.marcaSuave)}>
        <div className="flex-1">
          <p className={cn('font-display text-2xl md:text-3xl font-bold', tons.texto)}>
            {resumo.economiaAnual > 0
              ? `Você pode economizar ${moeda(resumo.economiaAnual)} por ano`
              : 'Suas assinaturas estão valendo a pena'}
          </p>
          <p className={cn('mt-1', tons.texto)}>
            {comEconomia.length > 0
              ? `Seguindo ${comEconomia.length} ${comEconomia.length === 1 ? 'recomendação' : 'recomendações'}: ` +
                juntarComE(
                  comEconomia.map(
                    (a) => `${NOME_SERVICO[a.assinatura.servico]} (${ROTULO_RECOMENDACAO[a.recomendacao.tipo].toLowerCase()})`,
                  ),
                ) +
                '.'
              : `Relatório de ${mesRotulo.toLowerCase()}.`}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi rotulo="Total pago" valor={moeda(resumo.totalPago)} complemento={`em ${avaliacoes.length} ${avaliacoes.length === 1 ? 'assinatura' : 'assinaturas'}`} />
        <Kpi rotulo="Horas de uso" valor={formatarHoras(resumo.horas)} complemento="extensão + suas respostas" />
        <Kpi
          rotulo="Custo médio por hora"
          valor={resumo.custoMedioHora !== null ? moeda(resumo.custoMedioHora) : '—'}
          complemento={`em ${mesRotulo.toLowerCase()}`}
        />
        <Kpi rotulo="CO2 do streaming" valor={`${kg} kg`} complemento={`estimativa de ${CO2_G_POR_HORA} g por hora`} />
      </div>

      <div className={cn('p-6 rounded-[20px] border overflow-x-auto', tons.cartao)}>
        <h2 className={cn('font-display text-lg font-bold mb-4', tons.texto)}>Por serviço</h2>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className={cn('text-left text-xs uppercase tracking-wide', tons.suave)}>
              <th className="py-2 font-semibold">Serviço</th>
              <th className="py-2 font-semibold">Pago no mês</th>
              <th className="py-2 font-semibold">Horas</th>
              <th className="py-2 font-semibold">Custo por hora</th>
              <th className="py-2 font-semibold">Recomendação</th>
              <th className="py-2 font-semibold">Economia por ano</th>
              <th className="py-2" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map((a) => {
              const s = a.assinatura.servico;
              return (
                <tr key={s} className={tons.texto}>
                  <td className="py-3 font-semibold">{NOME_SERVICO[s]}</td>
                  <td className="py-3">{moeda(a.assinatura.valor)}</td>
                  <td className="py-3">{a.precisaPerguntarTv ? '—' : formatarHoras(a.horas.total)}</td>
                  <td className="py-3">{a.recomendacao.custoPorHora !== null ? moeda(a.recomendacao.custoPorHora) : '—'}</td>
                  <td className="py-3"><SeloRecomendacao tipo={a.recomendacao.tipo} /></td>
                  <td className="py-3">{a.recomendacao.economiaAnual > 0 ? moeda(a.recomendacao.economiaAnual) : '—'}</td>
                  <td className="py-3 text-right">
                    <a
                      href={LINK_SERVICO[s]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn('inline-flex items-center gap-1 font-semibold hover:underline', tons.texto)}
                    >
                      Abrir conta <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={cn('text-xs', tons.suave)}>
        Horas medidas pela extensão no computador. O uso fora dele entra como estimativa quando você responde à pergunta: na TV
        (vídeo) Pouco = 3 h e Bastante = 10 h; no celular ou app (música) Pouco = 5 h e Bastante = 20 h. CO2 só do vídeo, estimado com{' '}
        {CO2_G_POR_HORA} g de CO2e por hora (Carbon Trust, 2021). {exemplo ? 'Dados e preços de exemplo.' : 'Preços dos planos a conferir no site de cada serviço.'}
      </p>
    </div>
  );
};
