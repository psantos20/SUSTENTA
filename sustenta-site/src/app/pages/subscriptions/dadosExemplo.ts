/**
 * Dados de EXEMPLO da aba Assinaturas.
 *
 * Enquanto o Open Finance (banco) e a extensão do navegador não estão ligados,
 * a tela usa estas transações e minutos para mostrar a função funcionando.
 * Os preços e planos são ilustrativos: confira os valores atuais de cada serviço
 * antes de usar o catálogo de verdade (coleção `catalogoPlanos` no Firestore).
 */
import type { CatalogoPlanos, RespostaTv, Servico, Transacao } from '../../../services/streaming';
import { CATALOGO_PLANOS } from '../../../services/catalogoPlanos';

export const MES_EXEMPLO = 'Outubro de 2026';

export const TRANSACOES_EXEMPLO: Transacao[] = [
  { descricao: 'AMAZON PRIME BR', valor: 19.9, data: '2026-09-03' },
  { descricao: 'SPOTIFY P1A2B3', valor: 21.9, data: '2026-09-05' },
  { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-09-12' },
  { descricao: 'DISNEY PLUS', valor: 66.9, data: '2026-09-18' },
  { descricao: 'HBO MAX', valor: 55.9, data: '2026-09-28' },
  { descricao: 'Mercado do bairro', valor: 212.4, data: '2026-10-01' },
  { descricao: 'AMAZON PRIME BR', valor: 19.9, data: '2026-10-03' },
  { descricao: 'SPOTIFY P4C5D6', valor: 21.9, data: '2026-10-05' },
  { descricao: 'NETFLIX.COM', valor: 59.9, data: '2026-10-12' },
  { descricao: 'DISNEY PLUS', valor: 66.9, data: '2026-10-18' },
  { descricao: 'Conta de luz', valor: 138.25, data: '2026-10-20' },
  { descricao: 'HBO MAX', valor: 55.9, data: '2026-10-28' },
];

/** Os mesmos planos usados pelo servidor (ver src/services/catalogoPlanos.ts). */
export const CATALOGO_EXEMPLO: CatalogoPlanos = CATALOGO_PLANOS;

/** Minutos por dia espalhados pelo mês (31 dias). */
function espalhar(totalMinutos: number, dias: number[]): number[] {
  const porDia = Math.round(totalMinutos / dias.length);
  return Array.from({ length: 31 }, (_, i) => (dias.includes(i + 1) ? porDia : 0));
}

export interface UsoExemplo {
  minutosExtensao: number;
  respostaTv: RespostaTv | null;
  minutosPorDia: number[];
  horasMesAnterior: number | null;
}

export const USO_EXEMPLO: Record<Servico, UsoExemplo> = {
  netflix: { minutosExtensao: 242, respostaTv: null, minutosPorDia: espalhar(242, [4, 11, 19, 26]), horasMesAnterior: 6 },
  disney: { minutosExtensao: 0, respostaTv: 'nao', minutosPorDia: espalhar(0, []), horasMesAnterior: 0 },
  max: { minutosExtensao: 0, respostaTv: null, minutosPorDia: espalhar(0, []), horasMesAnterior: 3 },
  prime: {
    minutosExtensao: 1390,
    respostaTv: null,
    minutosPorDia: espalhar(1390, [2, 5, 8, 12, 15, 19, 22, 26, 29, 30]),
    horasMesAnterior: 20,
  },
  youtube: { minutosExtensao: 0, respostaTv: null, minutosPorDia: espalhar(0, []), horasMesAnterior: null },
  spotify: { minutosExtensao: 0, respostaTv: null, minutosPorDia: espalhar(0, []), horasMesAnterior: 25 },
  deezer: { minutosExtensao: 0, respostaTv: null, minutosPorDia: espalhar(0, []), horasMesAnterior: null },
};

/** Página da conta de cada serviço, onde a pessoa troca de plano ou cancela. */
export const LINK_SERVICO: Record<Servico, string> = {
  netflix: 'https://www.netflix.com/account',
  disney: 'https://www.disneyplus.com/',
  max: 'https://www.max.com/',
  prime: 'https://www.primevideo.com/',
  youtube: 'https://www.youtube.com/paid_memberships',
  spotify: 'https://www.spotify.com/br-pt/account/overview/',
  deezer: 'https://www.deezer.com/account/subscription',
};
