/**
 * Textos e formatação da aba Assinaturas (sem React, para manter os componentes enxutos).
 */
import { NOME_SERVICO, TIPO_SERVICO, type AvaliacaoAssinatura, type Servico, type TipoRecomendacao } from '../../../services/streaming';

/** Onde a pessoa usa fora do computador: TV (vídeo) ou celular/app (música). */
export const ONDE_FORA = (servico: Servico) => (TIPO_SERVICO[servico] === 'musica' ? 'no celular ou app' : 'na TV');

export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** 4,03 → "4 h"; 0,5 → "30 min"; 23,17 → "23 h 10 min". */
export function formatarHoras(horas: number): string {
  const totalMin = Math.round(Math.max(0, horas) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}

/** "2026-11-12" → "12 nov". */
export function formatarDia(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

export const ROTULO_RECOMENDACAO: Record<TipoRecomendacao, string> = {
  cancelar: 'Cancelar',
  trocar: 'Trocar de plano',
  atencao: 'Atenção',
  rodizio: 'Rodízio',
  manter: 'Manter',
  sem_dados: 'Sem dados',
};

/** Frase curta que explica a recomendação no cartão. */
export function mensagemRecomendacao(a: AvaliacaoAssinatura): string {
  const { recomendacao: r, assinatura } = a;
  const custo = r.custoPorHora !== null ? moeda(r.custoPorHora) : null;
  switch (r.tipo) {
    case 'sem_dados':
      return `Nenhum uso medido no computador. Responda a pergunta sobre o uso ${ONDE_FORA(assinatura.servico)} para fechar o relatório.`;
    case 'cancelar':
      return `Nenhum uso em 2 meses seguidos. Cancelando, você economiza ${moeda(r.economiaAnual)} por ano.`;
    case 'trocar':
      return `${custo} por hora assistida. No plano ${r.planoSugerido?.nome} você economiza ${moeda(r.economiaAnual)} por ano.`;
    case 'atencao':
      return `Uso baixo este mês (${formatarHoras(a.horas.total)}). Vamos acompanhar o próximo.`;
    case 'rodizio':
      return `Você usou ${NOME_SERVICO[assinatura.servico]} em poucos dias. Cancele agora e assine de novo no próximo lançamento.`;
    case 'manter':
      return `${custo} por hora assistida. Vale a pena manter.`;
  }
}

/** De onde vieram as horas do mês. */
export function origemDasHoras(a: AvaliacaoAssinatura): string {
  const { horas } = a;
  const partes: string[] = [];
  partes.push(horas.medidas > 0 ? `Extensão: ${formatarHoras(horas.medidas)}` : 'Extensão: 0 min');
  const onde = ONDE_FORA(a.assinatura.servico);
  if (horas.estimadas > 0) partes.push(`Uso ${onde} (estimativa): ${formatarHoras(horas.estimadas)}`);
  else if (!a.precisaPerguntarTv && horas.medidas === 0) partes.push(`Você respondeu: não usei ${onde}`);
  if (a.precisaPerguntarTv) partes.push(`aguardando sua resposta sobre o uso ${onde}`);
  return partes.join(' · ');
}

/** ["a", "b", "c"] → "a, b e c". */
export function juntarComE(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}
