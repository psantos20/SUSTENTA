/**
 * Comparador de modais de transporte: quanto de CO₂ cada jeito de fazer o mesmo
 * trajeto emite. Função pura, sem Firebase, para poder ser testada.
 *
 * FONTE DOS FATORES (todos do mesmo estudo, para a comparação ser coerente):
 *   CARVALHO, C. H. R. de. Emissões relativas de poluentes do transporte motorizado
 *   de passageiros nos grandes centros urbanos brasileiros. Brasília: Ipea, abr. 2011.
 *   (Texto para Discussão nº 1606), Tabelas 3 e 4.
 *     - Metrô:       0,0035 kg CO₂ por passageiro·km (3,16 kg/km ÷ 900 passageiros)
 *     - Ônibus:      0,0160 kg CO₂ por passageiro·km (1,28 kg/km ÷ 80 passageiros)
 *     - Automóvel:   0,19 kg CO₂ por km do veículo (média 1,5 pessoa/veículo = 0,1268 por passageiro·km)
 *     - Motocicleta: 0,0711 kg CO₂ por passageiro·km (ocupação 1)
 *
 * LIMITES (mostrados ao usuário na tela):
 *  - São médias de grandes cidades brasileiras, de 2011. A matriz elétrica usada
 *    para o metrô é a de 2008, o que torna o metrô um pouco pior do que seria hoje.
 *  - Os fatores do Ipea incluem a produção e distribuição do combustível; por isso
 *    NÃO se somam à pegada calculada no resto do app (que conta só a queima).
 *  - Bicicleta e a pé: sem emissão direta; a fabricação da bicicleta e a alimentação
 *    de quem pedala não entram na conta (não são do estudo).
 */

export const FONTE_MODAIS = {
  citacao: 'Ipea, Texto para Discussão nº 1606 (Carvalho, 2011), Tabelas 3 e 4',
  ano: 2011,
} as const;

export type ModalId = 'metro' | 'onibus' | 'carro' | 'moto' | 'bicicleta' | 'a_pe';

export interface ModalTransporte {
  id: ModalId;
  nome: string;
  emoji: string;
}

export const MODAIS: ModalTransporte[] = [
  { id: 'a_pe', nome: 'A pé', emoji: '🚶' },
  { id: 'bicicleta', nome: 'Bicicleta', emoji: '🚲' },
  { id: 'metro', nome: 'Metrô / trem', emoji: '🚇' },
  { id: 'onibus', nome: 'Ônibus', emoji: '🚌' },
  { id: 'moto', nome: 'Moto', emoji: '🏍️' },
  { id: 'carro', nome: 'Carro', emoji: '🚗' },
];

/** kg de CO₂ por passageiro·km (carro depende de quantas pessoas vão no veículo). */
export const KG_POR_PASSAGEIRO_KM = {
  a_pe: 0,
  bicicleta: 0,
  metro: 0.0035,
  onibus: 0.016,
  moto: 0.0711,
} as const;

/** Automóvel: kg de CO₂ por km do VEÍCULO (Tabela 3 do estudo). */
export const KG_POR_KM_CARRO = 0.19;

/** Ocupação média de carros nas grandes cidades, segundo o estudo. */
export const OCUPACAO_MEDIA_CARRO = 1.5;

export const MAX_PESSOAS_NO_CARRO = 7;
export const KM_MAXIMO = 1000;
export const DIAS_MAXIMO = 31;

/** Pessoas no carro válidas: inteiro de 1 a 7 (outro valor vira 1). */
export function pessoasValidas(n: number): number {
  return Number.isInteger(n) && n >= 1 && n <= MAX_PESSOAS_NO_CARRO ? n : 1;
}

/** kg de CO₂ por passageiro·km do modal. */
export function fatorDoModal(id: ModalId, pessoasNoCarro = 1): number {
  if (id === 'carro') return KG_POR_KM_CARRO / pessoasValidas(pessoasNoCarro);
  return KG_POR_PASSAGEIRO_KM[id];
}

/** Lê "12,5" ou "12.5". Devolve null se não for um número positivo até o limite. */
export function lerNumero(texto: string, maximo: number): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= maximo ? n : null;
}

export interface EntradaComparacao {
  /** Distância de um trecho, em km. */
  km: number;
  /** Dias de deslocamento por mês. */
  diasPorMes: number;
  idaEVolta: boolean;
  pessoasNoCarro: number;
}

export interface LinhaComparacao extends ModalTransporte {
  /** kg de CO₂ por passageiro·km. */
  fator: number;
  /** kg de CO₂ no mês. */
  kgMes: number;
  /** Quanto emite a menos (positivo) ou a mais (negativo) que o carro, em kg no mês. */
  economiaVsCarro: number;
  /** % a menos que o carro (0 para o carro; negativo se emitir mais). */
  percentualVsCarro: number;
}

/** Do que menos emite ao que mais emite. Empates (a pé e bicicleta) mantêm a ordem de MODAIS. */
export function compararModais(e: EntradaComparacao): LinhaComparacao[] {
  const km = e.km > 0 && Number.isFinite(e.km) ? e.km : 0;
  const dias = e.diasPorMes > 0 && Number.isFinite(e.diasPorMes) ? e.diasPorMes : 0;
  const kmNoMes = km * (e.idaEVolta ? 2 : 1) * dias;

  const kgCarro = kmNoMes * fatorDoModal('carro', e.pessoasNoCarro);

  return MODAIS.map((m) => {
    const fator = fatorDoModal(m.id, e.pessoasNoCarro);
    const kgMes = kmNoMes * fator;
    return {
      ...m,
      fator,
      kgMes,
      economiaVsCarro: kgCarro - kgMes,
      percentualVsCarro: kgCarro > 0 ? Math.round(((kgCarro - kgMes) / kgCarro) * 100) : 0,
    };
  }).sort((a, b) => a.kgMes - b.kgMes);
}
