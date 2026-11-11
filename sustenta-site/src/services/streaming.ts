/**
 * SUSTENTA Streaming: regras de detecção de assinaturas, horas do mês e recomendação.
 *
 * Tudo aqui é lógica pura (sem Firebase, sem rede), para ser usada tanto pela API
 * (que recebe as transações do Open Finance e os minutos da extensão) quanto pelo app,
 * e para poder ser testada.
 *
 * Especificação: doc "SUSTENTA Streaming — Especificação". Os limites (R$ 10 por hora,
 * 2 h por mês, 10% de variação de preço) são pontos de partida para ajustar com dados reais.
 */

export const SERVICOS = ['netflix', 'disney', 'max', 'prime', 'youtube', 'spotify', 'deezer'] as const;
export type Servico = (typeof SERVICOS)[number];

export const NOME_SERVICO: Record<Servico, string> = {
  netflix: 'Netflix',
  disney: 'Disney+',
  max: 'HBO Max',
  prime: 'Prime Video',
  youtube: 'YouTube Premium',
  spotify: 'Spotify',
  deezer: 'Deezer',
};

/** Vídeo ou música: muda a pergunta de um toque, a estimativa de horas e o CO2. */
export type TipoServico = 'video' | 'musica';
export const TIPO_SERVICO: Record<Servico, TipoServico> = {
  netflix: 'video',
  disney: 'video',
  max: 'video',
  prime: 'video',
  youtube: 'video',
  spotify: 'musica',
  deezer: 'musica',
};

/** Padrões na descrição da cobrança (já sem acentos e em maiúsculas). Ajustar com faturas reais. */
export const PADROES_COBRANCA: Record<Servico, RegExp[]> = {
  netflix: [/NETFLIX/],
  disney: [/DISNEY\s*(\+|PLUS)/],
  max: [/HBO\s*MAX/, /\bMAX\.COM\b/],
  prime: [/PRIME\s*VIDEO/, /AMAZON\s*PRIME/],
  youtube: [/YOUTUBE\s*(PREMIUM|MUSIC)/, /GOOGLE\s*\*?\s*YOUTUBE/],
  spotify: [/SPOTIFY/],
  deezer: [/DEEZER/],
};

/** Variação máxima de preço entre dois meses para contar como a mesma assinatura. */
export const VARIACAO_RECORRENCIA = 0.1;
/** Acima disso (R$ por hora), sugerimos trocar para um plano mais barato, se existir. */
export const LIMITE_CUSTO_HORA = 10;
/** Abaixo disso (horas no mês), o uso é considerado baixo. */
export const LIMITE_USO_BAIXO_H = 2;
/** Estimativa de CO2e por hora de streaming de VÍDEO (Carbon Trust, 2021, Europa). Música não entra. */
export const CO2_G_POR_HORA = 55;

/**
 * Resposta da pergunta de um toque sobre o uso fora do computador
 * (vídeo: "pela TV"; música: "pelo celular ou app") e quantas horas ela vale.
 */
export type RespostaTv = 'nao' | 'pouco' | 'bastante';
export const HORAS_ESTIMADAS: Record<TipoServico, Record<RespostaTv, number>> = {
  video: { nao: 0, pouco: 3, bastante: 10 },
  musica: { nao: 0, pouco: 5, bastante: 20 },
};
/** Atalho para vídeo (mantido por compatibilidade). */
export const HORAS_ESTIMADAS_TV = HORAS_ESTIMADAS.video;

export const XP_RELATORIO = 200;
export const XP_ACAO_CONFIRMADA = 500;

export interface Transacao {
  descricao: string;
  /** Valor da cobrança em reais; débitos são positivos. */
  valor: number;
  /** Data no formato AAAA-MM-DD. */
  data: string;
}

export interface Plano {
  nome: string;
  valor: number;
  temAnuncios: boolean;
  /** Plano com regra de acesso (ex.: universitário): nunca é sugerido automaticamente. */
  restrito?: string;
}

export type CatalogoPlanos = Partial<Record<Servico, Plano[]>>;

export interface AssinaturaDetectada {
  servico: Servico;
  /** Valor da cobrança mais recente. */
  valor: number;
  /** Nome do plano, ou null quando não dá para saber só pelo valor (perguntar à pessoa). */
  plano: string | null;
  ultimaCobranca: string;
  proximaCobranca: string;
  motivo: 'recorrente' | 'catalogo';
}

export type TipoRecomendacao = 'cancelar' | 'trocar' | 'atencao' | 'rodizio' | 'manter' | 'sem_dados';

export interface Recomendacao {
  tipo: TipoRecomendacao;
  /** Plano sugerido quando o tipo é "trocar". */
  planoSugerido: Plano | null;
  /** Quanto a pessoa economiza em 12 meses seguindo a recomendação. */
  economiaAnual: number;
  /** Custo por hora no mês atual, ou null sem horas. */
  custoPorHora: number | null;
}

const arred = (v: number) => Math.round(v * 100) / 100;
const valido = (v: number) => Number.isFinite(v) && v > 0;

/** Remove acentos, junta espaços e põe em maiúsculas. */
export function normalizarDescricao(descricao: string): string {
  return descricao
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Qual streaming é esta cobrança, ou null se não for de nenhum. */
export function identificarServico(descricao: string): Servico | null {
  const texto = normalizarDescricao(descricao ?? '');
  for (const servico of SERVICOS) {
    if (PADROES_COBRANCA[servico].some((p) => p.test(texto))) return servico;
  }
  return null;
}

function dataValida(data: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** Mesma data no mês seguinte; se o dia não existir (31 → fevereiro), usa o último dia do mês. */
export function proximaData(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number);
  const alvoMes = mes === 12 ? 1 : mes + 1;
  const alvoAno = mes === 12 ? ano + 1 : ano;
  const ultimoDia = new Date(Date.UTC(alvoAno, alvoMes, 0)).getUTCDate();
  const d = Math.min(dia, ultimoDia);
  return `${alvoAno}-${String(alvoMes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function mesSeguinte(mes: string): string {
  return proximaData(`${mes}-01`).slice(0, 7);
}

function precosParecidos(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(a, b) * VARIACAO_RECORRENCIA;
}

/**
 * Plano pelo valor cobrado. Tolerância de 1% (mínimo R$ 0,10).
 * Se nenhum ou mais de um plano bater, devolve null.
 */
export function inferirPlano(valor: number, planos: Plano[] = []): Plano | null {
  if (!valido(valor)) return null;
  const tolerancia = Math.max(0.1, valor * 0.01);
  const candidatos = planos.filter((p) => Math.abs(p.valor - valor) <= tolerancia);
  return candidatos.length === 1 ? candidatos[0] : null;
}

/**
 * Encontra as assinaturas de streaming nas transações.
 * Conta como assinatura quando o mesmo serviço aparece em 2 meses seguidos com valor
 * parecido, ou aparece 1 vez com valor igual a um plano do catálogo.
 */
export function detectarAssinaturas(transacoes: Transacao[], catalogo: CatalogoPlanos = {}): AssinaturaDetectada[] {
  const porServico = new Map<Servico, Transacao[]>();
  for (const t of transacoes) {
    if (!t || !valido(t.valor) || !dataValida(t.data)) continue;
    const servico = identificarServico(t.descricao);
    if (!servico) continue;
    const lista = porServico.get(servico) ?? [];
    lista.push(t);
    porServico.set(servico, lista);
  }

  const resultado: AssinaturaDetectada[] = [];
  for (const servico of SERVICOS) {
    const lista = (porServico.get(servico) ?? []).sort((a, b) => a.data.localeCompare(b.data));
    if (lista.length === 0) continue;

    // Uma cobrança por mês (a mais recente do mês).
    const porMes = new Map<string, Transacao>();
    for (const t of lista) porMes.set(t.data.slice(0, 7), t);
    const meses = [...porMes.keys()].sort();

    let recorrente = false;
    for (let i = 1; i < meses.length; i++) {
      const anterior = porMes.get(meses[i - 1])!;
      const atual = porMes.get(meses[i])!;
      if (mesSeguinte(meses[i - 1]) === meses[i] && precosParecidos(anterior.valor, atual.valor)) {
        recorrente = true;
        break;
      }
    }

    const ultima = lista[lista.length - 1];
    const planos = catalogo[servico] ?? [];
    const plano = inferirPlano(ultima.valor, planos);
    const noCatalogo = planos.some((p) => Math.abs(p.valor - ultima.valor) < 0.01);
    if (!recorrente && !noCatalogo) continue;

    resultado.push({
      servico,
      valor: arred(ultima.valor),
      plano: plano?.nome ?? null,
      ultimaCobranca: ultima.data,
      proximaCobranca: proximaData(ultima.data),
      motivo: recorrente ? 'recorrente' : 'catalogo',
    });
  }
  return resultado;
}

export interface HorasDoMes {
  medidas: number;
  estimadas: number;
  total: number;
}

/** Horas do mês: minutos medidos pela extensão + estimativa da resposta sobre o uso fora do computador. */
export function horasDoMes(minutosExtensao: number, respostaTv?: RespostaTv | null, tipo: TipoServico = 'video'): HorasDoMes {
  const minutos = Number.isFinite(minutosExtensao) && minutosExtensao > 0 ? minutosExtensao : 0;
  const medidas = arred(minutos / 60);
  const estimadas = respostaTv ? HORAS_ESTIMADAS[tipo][respostaTv] ?? 0 : 0;
  return { medidas, estimadas, total: arred(medidas + estimadas) };
}

/** Valor pago ÷ horas. Null quando não houve uso (custo por hora indefinido). */
export function custoPorHora(valor: number, horas: number): number | null {
  if (!valido(valor) || !valido(horas)) return null;
  return arred(valor / horas);
}

/** CO2e estimado, em gramas. */
export function co2Gramas(horas: number): number {
  return valido(horas) ? Math.round(horas * CO2_G_POR_HORA) : 0;
}

/** Uso concentrado em até 3 dias e nada nos últimos 14 dias do mês. */
export function usoConcentrado(minutosPorDia: number[]): boolean {
  const dias = minutosPorDia.map((m) => (Number.isFinite(m) && m > 0 ? m : 0));
  const usados = dias.flatMap((m, i) => (m > 0 ? [i] : []));
  if (usados.length === 0 || usados.length > 3) return false;
  const ultimoDiaComUso = usados[usados.length - 1];
  return dias.length - 1 - ultimoDiaComUso >= 14;
}

export interface EntradaRecomendacao {
  valorMensal: number;
  /**
   * Horas por mês, do mais antigo ao atual (o último é o mês do relatório).
   * null = mês sem dado (nada medido e sem resposta sobre a TV).
   */
  horasPorMes: Array<number | null>;
  /** Minutos por dia no mês atual (índice 0 = dia 1), para detectar o rodízio. */
  minutosPorDia?: number[];
  /** Planos do serviço, para sugerir um mais barato. */
  planos?: Plano[];
}

/**
 * Recomendação do mês. Quando duas regras valem, ganha a primeira desta ordem:
 * sem dados → cancelar → trocar → atenção → rodízio → manter.
 */
export function recomendar(entrada: EntradaRecomendacao): Recomendacao {
  const valor = valido(entrada.valorMensal) ? entrada.valorMensal : 0;
  const historico = entrada.horasPorMes ?? [];
  const atual = historico.length > 0 ? historico[historico.length - 1] : null;
  const anterior = historico.length > 1 ? historico[historico.length - 2] : null;
  const base = { planoSugerido: null, economiaAnual: 0 };

  if (atual === null || !Number.isFinite(atual)) {
    return { ...base, tipo: 'sem_dados', custoPorHora: null };
  }
  const horas = Math.max(0, atual);
  const custo = custoPorHora(valor, horas);

  if (horas === 0 && anterior !== null && Number.isFinite(anterior) && anterior <= 0) {
    return { ...base, tipo: 'cancelar', custoPorHora: null, economiaAnual: arred(valor * 12) };
  }

  const maisBarato = (entrada.planos ?? [])
    .filter((p) => !p.restrito && Number.isFinite(p.valor) && p.valor >= 0 && p.valor < valor)
    .sort((a, b) => a.valor - b.valor)[0];
  if (custo !== null && custo > LIMITE_CUSTO_HORA && maisBarato) {
    return {
      tipo: 'trocar',
      planoSugerido: maisBarato,
      economiaAnual: arred((valor - maisBarato.valor) * 12),
      custoPorHora: custo,
    };
  }

  if (horas < LIMITE_USO_BAIXO_H) return { ...base, tipo: 'atencao', custoPorHora: custo };
  if (entrada.minutosPorDia && usoConcentrado(entrada.minutosPorDia)) {
    return { ...base, tipo: 'rodizio', custoPorHora: custo };
  }
  return { ...base, tipo: 'manter', custoPorHora: custo };
}

/**
 * A recomendação se confirmou? Cancelar: a cobrança seguinte não veio.
 * Trocar: a cobrança seguinte ficou menor. Vale XP_ACAO_CONFIRMADA.
 */
export function acaoConfirmada(tipo: TipoRecomendacao, valorAntes: number, valorSeguinte: number | null): boolean {
  if (tipo === 'cancelar') return valorSeguinte === null || valorSeguinte <= 0;
  if (tipo === 'trocar') return valorSeguinte !== null && valorSeguinte > 0 && valorSeguinte < valorAntes;
  return false;
}

export interface ItemRelatorio {
  servico: Servico;
  valorPago: number;
  horas: number;
  recomendacao: Recomendacao;
}

export interface ResumoRelatorio {
  totalPago: number;
  horas: number;
  custoMedioHora: number | null;
  economiaAnual: number;
  co2g: number;
}

/** Totais do relatório do mês. */
export function resumirRelatorio(itens: ItemRelatorio[]): ResumoRelatorio {
  const totalPago = arred(itens.reduce((s, i) => s + (valido(i.valorPago) ? i.valorPago : 0), 0));
  const horas = arred(itens.reduce((s, i) => s + (valido(i.horas) ? i.horas : 0), 0));
  const economiaAnual = arred(itens.reduce((s, i) => s + (i.recomendacao?.economiaAnual ?? 0), 0));
  // CO2: só vídeo (a estimativa da Carbon Trust é para vídeo; áudio gasta bem menos).
  const horasVideo = itens.reduce((s, i) => s + (TIPO_SERVICO[i.servico] === 'video' && valido(i.horas) ? i.horas : 0), 0);
  return { totalPago, horas, custoMedioHora: custoPorHora(totalPago, horas), economiaAnual, co2g: co2Gramas(horasVideo) };
}

export interface UsoDoMes {
  /** Minutos medidos pela extensão no mês. */
  minutosExtensao: number;
  /** Resposta da pergunta sobre a TV, se a pessoa já respondeu. */
  respostaTv?: RespostaTv | null;
  /** Minutos por dia no mês (índice 0 = dia 1), para detectar o rodízio. */
  minutosPorDia?: number[];
  /** Horas do mês anterior; null quando aquele mês ficou sem dados. */
  horasMesAnterior?: number | null;
}

export interface AvaliacaoAssinatura {
  assinatura: AssinaturaDetectada;
  horas: HorasDoMes;
  /** Nada medido e sem resposta sobre a TV: o app deve fazer a pergunta de um toque. */
  precisaPerguntarTv: boolean;
  recomendacao: Recomendacao;
}

/** Junta a assinatura com o uso do mês e calcula a recomendação. */
export function avaliarAssinatura(assinatura: AssinaturaDetectada, uso: UsoDoMes, planos: Plano[] = []): AvaliacaoAssinatura {
  const horas = horasDoMes(uso.minutosExtensao, uso.respostaTv, TIPO_SERVICO[assinatura.servico]);
  const precisaPerguntarTv = horas.medidas === 0 && !uso.respostaTv;
  const recomendacao = recomendar({
    valorMensal: assinatura.valor,
    horasPorMes: [uso.horasMesAnterior ?? null, precisaPerguntarTv ? null : horas.total],
    minutosPorDia: uso.minutosPorDia,
    planos,
  });
  return { assinatura, horas, precisaPerguntarTv, recomendacao };
}

// ─── Open Finance (Pluggy) ───────────────────────────────────────────────────

/** Campos da transação da Pluggy que usamos (o resto é ignorado). */
export interface TransacaoPluggy {
  description?: string | null;
  descriptionRaw?: string | null;
  amount?: number | null;
  date?: string | null;
  type?: string | null;
  operationType?: string | null;
  merchant?: { name?: string | null; businessName?: string | null } | null;
}

/** Operações que não são cobrança (estorno, pagamento da fatura, cashback...). */
const OPERACOES_IGNORADAS = ['ESTORNO', 'CASHBACK', 'PAGAMENTO_FATURA', 'PAGAMENTO', 'TRANSFERENCIA_MESMA_INSTITUICAO'];

/**
 * Converte transações da Pluggy em cobranças (valor positivo, data AAAA-MM-DD).
 * - Conta corrente (BANK): só saídas (amount negativo ou type DEBIT).
 * - Cartão (CREDIT): o sinal varia entre bancos, então usamos o valor absoluto e
 *   descartamos estornos, pagamentos da fatura e cashback.
 * Só junta descrição e nome do estabelecimento; nada mais da transação é guardado.
 */
export function converterTransacoesPluggy(lista: TransacaoPluggy[], tipoConta: 'BANK' | 'CREDIT'): Transacao[] {
  const saida: Transacao[] = [];
  for (const t of lista ?? []) {
    if (!t || typeof t.amount !== 'number' || !Number.isFinite(t.amount) || t.amount === 0) continue;
    const operacao = (t.operationType ?? '').toUpperCase();
    if (OPERACOES_IGNORADAS.includes(operacao)) continue;
    const texto = [t.description, t.descriptionRaw, t.merchant?.name, t.merchant?.businessName].filter(Boolean).join(' ');
    if (/ESTORNO|REEMBOLSO/i.test(texto)) continue;
    if (tipoConta === 'BANK') {
      const ehSaida = t.amount < 0 || (t.type ?? '').toUpperCase() === 'DEBIT';
      if (!ehSaida) continue;
    }
    const data = typeof t.date === 'string' ? t.date.slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
    saida.push({ descricao: texto.slice(0, 200), valor: arred(Math.abs(t.amount)), data });
  }
  return saida;
}

/** Uma conexão de banco (Open Finance). */
export interface ConexaoBanco {
  itemId: string;
  banco: string | null;
  status: string;
  ultimaSync: string | null;
}

/** Até quantos bancos a pessoa pode conectar ao mesmo tempo. */
export const MAX_CONEXOES = 5;

/** Documento streaming/{uid}, gravado só pelo servidor. */
export interface DadosStreaming {
  conexoes?: ConexaoBanco[];
  /** Formato antigo (uma conexão só). Lido por compatibilidade; não é mais gravado. */
  conexao?: ConexaoBanco | null;
  assinaturas: AssinaturaDetectada[];
  atualizadoEm: string;
}

/** Lista de conexões do documento, aceitando também o formato antigo. */
export function conexoesDe(dados: Pick<DadosStreaming, 'conexoes' | 'conexao'> | null | undefined): ConexaoBanco[] {
  if (!dados) return [];
  if (Array.isArray(dados.conexoes)) return dados.conexoes.filter((c) => c && typeof c.itemId === 'string');
  return dados.conexao && typeof dados.conexao.itemId === 'string' ? [dados.conexao] : [];
}

/** Bancos que reconhecemos no nome das contas (para conexões via MeuPluggy). */
const BANCOS_CONHECIDOS: [RegExp, string][] = [
  [/MERCADO\s*PAGO/, 'Mercado Pago'],
  [/ITAU|ITAUCARD/, 'Itaú'],
  [/NUBANK|\bNU\s+(PAGAMENTOS|CONTA)/, 'Nubank'],
  [/BRADESCO/, 'Bradesco'],
  [/SANTANDER/, 'Santander'],
  [/BANCO\s*DO\s*BRASIL|\bOUROCARD\b/, 'Banco do Brasil'],
  [/CAIXA/, 'Caixa'],
  [/\bINTER\b/, 'Inter'],
  [/\bC6\b/, 'C6 Bank'],
  [/PICPAY/, 'PicPay'],
  [/PAGBANK|PAGSEGURO/, 'PagBank'],
  [/\bBTG\b/, 'BTG Pactual'],
  [/\bXP\b/, 'XP'],
  [/SICOOB/, 'Sicoob'],
  [/SICREDI/, 'Sicredi'],
  [/\bNEON\b/, 'Neon'],
  [/\bNEXT\b/, 'Next'],
  [/\bPAN\b/, 'Banco Pan'],
  [/\bWILL\b/, 'Will Bank'],
];

/**
 * Nome do banco para mostrar na tela. Conexões diretas usam o nome do conector.
 * Pelo MeuPluggy o conector é sempre "MeuPluggy": aí procuramos o banco no nome das
 * contas; se não acharmos, fica "MeuPluggy" (a pessoa pode renomear no app).
 */
export function nomeDaInstituicao(nomeConector: string | null | undefined, nomesDasContas: (string | null | undefined)[]): string | null {
  const conector = typeof nomeConector === 'string' ? nomeConector.trim() : '';
  if (conector && !/MEU\s*PLUGGY/i.test(conector)) return conector.slice(0, 80);
  for (const nome of nomesDasContas) {
    const texto = normalizarDescricao(nome ?? '');
    for (const [padrao, banco] of BANCOS_CONHECIDOS) if (padrao.test(texto)) return banco;
  }
  return conector ? conector.slice(0, 80) : null;
}

/** "AAAA-MM" de uma data (horário de Brasília não importa aqui: usamos a data local). */
export function mesDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Extensão do navegador ───────────────────────────────────────────────────

/** Documento streaming_uso/{uid}_{AAAA-MM}: minutos por dia ("01".."31") e serviço. */
export interface UsoMensal {
  dias?: Record<string, Partial<Record<Servico, number>>>;
}

export interface UsoDoServico {
  minutos: number;
  /** Minutos por dia (índice 0 = dia 1). */
  porDia: number[];
}

/** Soma os minutos do mês por serviço, a partir do documento gravado pela extensão. */
export function resumirUsoMensal(doc: UsoMensal | null | undefined, mes: string): Record<Servico, UsoDoServico> {
  const [ano, numero] = mes.split('-').map(Number);
  const dias = Number.isFinite(ano) && numero >= 1 && numero <= 12 ? new Date(ano, numero, 0).getDate() : 31;
  const saida = Object.fromEntries(SERVICOS.map((s) => [s, { minutos: 0, porDia: Array(dias).fill(0) }])) as Record<Servico, UsoDoServico>;
  for (const [dia, porServico] of Object.entries(doc?.dias ?? {})) {
    const i = Number(dia) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= dias || !porServico) continue;
    for (const s of SERVICOS) {
      const m = porServico[s];
      if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0) continue;
      const v = Math.min(1440, Math.round(m));
      saida[s].porDia[i] = v;
      saida[s].minutos += v;
    }
  }
  return saida;
}
