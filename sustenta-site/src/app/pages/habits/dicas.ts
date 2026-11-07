/**
 * Dicas do dia: 5 cartões por dia (2 fáceis, 2 médias, 1 difícil), iguais para
 * todos os usuários no mesmo dia. A pessoa responde "Já faço", "Vou fazer" ou
 * "Pular"; os pontos dependem do esforço da dica e só são pagos uma vez por dia.
 *
 * Tudo aqui é lógica pura (sem Firebase) para poder ser testada.
 * Os textos evitam números sem fonte: explicam o motivo, sem prometer economia exata.
 */
import type { Categoria } from './tipos';

export type EsforcoDica = 'Fácil' | 'Médio' | 'Difícil';

/** Pontos de XP por nível de esforço. */
export const PONTOS_ESFORCO: Record<EsforcoDica, number> = { Fácil: 10, Médio: 20, Difícil: 40 };

export interface Dica {
  id: string;
  texto: string;
  porque: string;
  categoria: Categoria;
  esforco: EsforcoDica;
}

export const DICAS: Dica[] = [
  // ── Fáceis (10 XP) ────────────────────────────────────────────────────────
  { id: 'd01', esforco: 'Fácil', categoria: 'Energia', texto: 'Apague a luz ao sair de um cômodo.', porque: 'Lâmpada acesa sem ninguém por perto só gera conta e emissão à toa.' },
  { id: 'd02', esforco: 'Fácil', categoria: 'Energia', texto: 'Tire da tomada carregadores e aparelhos que você não está usando.', porque: 'Muitos aparelhos continuam consumindo energia mesmo desligados ou em espera.' },
  { id: 'd03', esforco: 'Fácil', categoria: 'Água', texto: 'Feche a torneira ao escovar os dentes ou ensaboar a louça.', porque: 'A água que escorre enquanto você faz outra coisa é a que mais se desperdiça.' },
  { id: 'd04', esforco: 'Fácil', categoria: 'Resíduos', texto: 'Leve uma sacola reutilizável quando for às compras.', porque: 'Cada sacola descartável evitada é um resíduo a menos para o lixo e para o ambiente.' },
  { id: 'd05', esforco: 'Fácil', categoria: 'Energia', texto: 'Abra as cortinas e use a luz natural durante o dia.', porque: 'A luz do sol dispensa lâmpadas acesas durante boa parte do dia.' },
  { id: 'd06', esforco: 'Fácil', categoria: 'Resíduos', texto: 'Use garrafa ou copo reutilizável em vez de descartável.', porque: 'Copos e garrafas de uso único viram lixo em minutos.' },
  { id: 'd07', esforco: 'Fácil', categoria: 'Resíduos', texto: 'Separe o lixo reciclável do orgânico.', porque: 'Material limpo e separado tem muito mais chance de ser realmente reciclado.' },
  { id: 'd08', esforco: 'Fácil', categoria: 'Água', texto: 'Procure vazamentos: torneira pingando, descarga que escorre.', porque: 'Pequenos vazamentos funcionam o dia inteiro e passam despercebidos na conta.' },
  { id: 'd09', esforco: 'Fácil', categoria: 'Geral', texto: 'Anote a leitura do medidor de luz ou de água e registre no SUSTENTA.', porque: 'Só dá para reduzir o consumo de quem se acompanha: a quantidade em kWh ou m³ também deixa o cálculo de carbono mais preciso.' },
  { id: 'd10', esforco: 'Fácil', categoria: 'Alimentação', texto: 'Faça uma lista antes de ir ao mercado e compre só o necessário.', porque: 'Comprar além do que se consome é a principal origem do desperdício de comida em casa.' },
  // ── Médias (20 XP) ────────────────────────────────────────────────────────
  { id: 'd11', esforco: 'Médio', categoria: 'Água', texto: 'No banho, feche o registro enquanto se ensaboa.', porque: 'Chuveiro aberto durante o ensaboar gasta água e, se for elétrico ou a gás, energia também.' },
  { id: 'd12', esforco: 'Médio', categoria: 'Energia', texto: 'Lave roupa só quando a máquina estiver cheia.', porque: 'Rodar a máquina cheia aproveita melhor a água e a energia de cada lavagem.' },
  { id: 'd13', esforco: 'Médio', categoria: 'Transporte', texto: 'Faça ao menos um trajeto hoje a pé, de bicicleta ou de transporte público.', porque: 'Substituir um trajeto de carro individual reduz emissões e trânsito.' },
  { id: 'd14', esforco: 'Médio', categoria: 'Alimentação', texto: 'Transforme as sobras de ontem em uma nova refeição.', porque: 'Aproveitar a comida que já foi produzida evita desperdício de alimento, água e energia.' },
  { id: 'd15', esforco: 'Médio', categoria: 'Energia', texto: 'Se usar ar-condicionado, mantenha portas e janelas fechadas e uma temperatura moderada.', porque: 'Climatizar um ambiente aberto faz o aparelho trabalhar o tempo todo.' },
  { id: 'd16', esforco: 'Médio', categoria: 'Água', texto: 'Reaproveite a água do enxágue para lavar o quintal ou dar descarga.', porque: 'Nem toda tarefa precisa de água tratada e limpa.' },
  { id: 'd17', esforco: 'Médio', categoria: 'Resíduos', texto: 'Leve seu próprio pote ou marmita em vez de aceitar embalagem descartável.', porque: 'Embalagens de uso único estão entre os resíduos mais comuns do dia a dia.' },
  { id: 'd18', esforco: 'Médio', categoria: 'Resíduos', texto: 'Ao comprar, prefira o produto com menos embalagem.', porque: 'Menos embalagem é menos resíduo e menos material produzido.' },
  { id: 'd19', esforco: 'Médio', categoria: 'Energia', texto: 'Quando uma lâmpada queimar, troque por uma de LED.', porque: 'As lâmpadas de LED são mais eficientes: dão a mesma luz com menos energia.' },
  { id: 'd20', esforco: 'Médio', categoria: 'Geral', texto: 'Olhe a aba Histórico e veja qual categoria mais pesou no seu mês.', porque: 'Saber onde está o maior gasto mostra onde vale mais a pena economizar.' },
  // ── Difíceis (40 XP) ──────────────────────────────────────────────────────
  { id: 'd21', esforco: 'Difícil', categoria: 'Alimentação', texto: 'Faça pelo menos uma refeição sem carne hoje.', porque: 'A produção de carne, em especial a bovina, costuma emitir mais gases de efeito estufa do que a de vegetais.' },
  { id: 'd22', esforco: 'Difícil', categoria: 'Transporte', texto: 'Passe o dia sem usar carro individual: a pé, de bicicleta, ônibus ou carona.', porque: 'O carro com uma só pessoa é uma das formas mais emissoras de se locomover.' },
  { id: 'd23', esforco: 'Difícil', categoria: 'Resíduos', texto: 'Leve pilhas, baterias, eletrônicos ou óleo de cozinha usado a um ecoponto.', porque: 'Esses itens contaminam o solo e a água se forem para o lixo comum. O Mapa do SUSTENTA mostra o ecoponto mais próximo.' },
  { id: 'd24', esforco: 'Difícil', categoria: 'Geral', texto: 'Passe o dia sem comprar nada que não seja realmente necessário.', porque: 'Tudo o que se compra exigiu energia, água e matéria-prima para ser produzido.' },
  { id: 'd25', esforco: 'Difícil', categoria: 'Resíduos', texto: 'Conserte ou doe algo em vez de jogar fora.', porque: 'Estender a vida de um objeto evita produzir um novo e evita lixo.' },
  { id: 'd26', esforco: 'Difícil', categoria: 'Geral', texto: 'Revise sua conta de luz e de água e escolha um item para cortar este mês.', porque: 'Uma meta concreta funciona melhor do que a vontade vaga de economizar.' },
  { id: 'd27', esforco: 'Difícil', categoria: 'Geral', texto: 'Convide alguém da sua casa para adotar um hábito sustentável com você.', porque: 'Hábitos em grupo são mais fáceis de manter. Dá para acompanhar tudo no grupo familiar do SUSTENTA.' },
  { id: 'd28', esforco: 'Difícil', categoria: 'Resíduos', texto: 'Comece ou cuide de uma pequena horta, de uma muda ou de uma composteira.', porque: 'Plantas e compostagem aproveitam restos orgânicos e deixam o ambiente mais saudável.' },
  { id: 'd29', esforco: 'Difícil', categoria: 'Energia', texto: 'Passe uma noite com os aparelhos desnecessários realmente desligados da tomada.', porque: 'Desligar de vez evita o consumo em espera e ajuda a notar o que não faz falta.' },
  { id: 'd30', esforco: 'Difícil', categoria: 'Resíduos', texto: 'Evite comprar hoje um item de plástico de uso único.', porque: 'O plástico descartável dura séculos no ambiente e é usado por minutos.' },
];

export const DICAS_POR_DIA = 5;
const MIX_DO_DIA: [EsforcoDica, number][] = [['Fácil', 2], ['Médio', 2], ['Difícil', 1]];

// ── Sorteio determinístico: a mesma data gera sempre as mesmas dicas ─────────

function hashData(data: string): number {
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** As dicas do dia (AAAA-MM-DD): 2 fáceis, 2 médias e 1 difícil, sem repetir. */
export function dicasDoDia(data: string): Dica[] {
  const rand = mulberry32(hashData(data));
  const escolhidas: Dica[] = [];

  for (const [esforco, qtd] of MIX_DO_DIA) {
    const grupo = DICAS.filter((d) => d.esforco === esforco);
    // Fisher-Yates com o gerador da data
    for (let i = grupo.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [grupo[i], grupo[j]] = [grupo[j], grupo[i]];
    }
    escolhidas.push(...grupo.slice(0, qtd));
  }

  return escolhidas;
}

// ── Respostas e pontos ───────────────────────────────────────────────────────

export type RespostaDica = 'ja_faco' | 'vou_fazer' | 'fiz' | 'pulei';

/** Respostas guardadas no banco: só as do dia em andamento (a cada dia recomeça). */
export interface DicasDoDia {
  data: string;
  respostas: Record<string, RespostaDica>;
}

/** Respostas válidas hoje: se o registro é de outro dia, ninguém respondeu nada ainda. */
export function respostasDeHoje(registro: DicasDoDia | undefined, hoje: string): Record<string, RespostaDica> {
  return registro && registro.data === hoje && registro.respostas ? registro.respostas : {};
}

const RESPOSTAS_QUE_PAGAM: RespostaDica[] = ['ja_faco', 'fiz'];

export const pagouPontos = (r: RespostaDica | undefined) => !!r && RESPOSTAS_QUE_PAGAM.includes(r);

/**
 * Regra de transição de uma dica:
 * - "Já faço" e "Fiz" pagam os pontos do esforço, uma única vez, e depois não mudam mais;
 * - "Fiz" só vale depois de "Vou fazer";
 * - "Vou fazer" e "Pulei" não pagam e podem ser trocados à vontade.
 */
export function transicaoDica(
  anterior: RespostaDica | undefined,
  nova: RespostaDica,
  esforco: EsforcoDica
): { permitida: boolean; xp: number } {
  if (pagouPontos(anterior)) return { permitida: false, xp: 0 };
  if (nova === 'fiz' && anterior !== 'vou_fazer') return { permitida: false, xp: 0 };
  if (anterior === nova) return { permitida: false, xp: 0 };
  return { permitida: true, xp: pagouPontos(nova) ? PONTOS_ESFORCO[esforco] : 0 };
}

/** Resumo do dia para o cabeçalho da aba. */
export function resumoDoDia(dicas: Dica[], respostas: Record<string, RespostaDica>) {
  let respondidas = 0;
  let xpGanho = 0;
  let xpPossivel = 0;
  let pendentes = 0;
  for (const d of dicas) {
    const r = respostas[d.id];
    xpPossivel += PONTOS_ESFORCO[d.esforco];
    if (r && r !== 'vou_fazer') respondidas++;
    if (r === 'vou_fazer') pendentes++;
    if (pagouPontos(r)) xpGanho += PONTOS_ESFORCO[d.esforco];
  }
  return { respondidas, total: dicas.length, xpGanho, xpPossivel, pendentes };
}
