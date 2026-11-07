/**
 * Regras de validação compartilhadas no front-end.
 * Os mesmos limites são reforçados no servidor em firestore.rules —
 * a validação aqui é para dar uma boa mensagem ao usuário; a do servidor é a
 * que garante a segurança. Ao mudar um limite, mude nos dois lugares.
 */

export const LIMITES = {
  valorMax: 1_000_000,
  quantidadeMax: 1_000_000,
  descricao: 300,
  subcategoria: 60,
  nome: 80,
  telefone: 20,
  cidade: 80,
  nomeGrupo: 60,
  tituloHabito: 80,
  pontosHabitoMin: 5,
  pontosHabitoMax: 100,
  senhaMin: 8,
} as const;

export const CATEGORIAS_REGISTRO = ['energia', 'agua', 'transporte', 'outro'] as const;
export type CategoriaRegistro = (typeof CATEGORIAS_REGISTRO)[number];

// Anos aceitos: 2000–2099 (mesma faixa do regex em firestore.rules).
const MES_REGEX = /^20\d{2}-(0[1-9]|1[0-2])$/;

export function limparTexto(texto: string | null | undefined, max: number): string {
  // Remove caracteres de controle e limita o tamanho.
  // Corta por caractere (code point), não por unidade UTF-16, para nunca deixar
  // meio emoji (surrogate solto) no texto salvo.
  // eslint-disable-next-line no-control-regex
  const limpo = (texto ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  return Array.from(limpo).slice(0, max).join('');
}

/** Retorna uma mensagem de erro ou null se estiver tudo certo. */
export function validarValor(valor: number): string | null {
  if (!Number.isFinite(valor) || valor <= 0) return 'Informe um valor válido.';
  if (valor > LIMITES.valorMax) return 'Valor muito alto. Confira o número digitado.';
  // Moeda tem no máximo 2 casas decimais (menor valor aceito: R$ 0,01).
  if (Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-6) {
    return 'Use no máximo 2 casas decimais (ex.: 12,50).';
  }
  return null;
}

/**
 * Quantidade consumida (kWh de energia, m³ de água, litros de combustível ou
 * m³ de GNV). É opcional: vazio/nulo é
 * válido. Quando informada precisa ser > 0, até 1.000.000 e com no máximo 2
 * casas decimais.
 */
export function validarQuantidade(quantidade: number | null | undefined): string | null {
  if (quantidade === null || quantidade === undefined) return null;
  if (!Number.isFinite(quantidade) || quantidade <= 0) return 'Informe uma quantidade válida ou deixe em branco.';
  if (quantidade > LIMITES.quantidadeMax) return 'Quantidade muito alta. Confira o número digitado.';
  if (Math.abs(quantidade * 100 - Math.round(quantidade * 100)) > 1e-6) {
    return 'Use no máximo 2 casas decimais na quantidade.';
  }
  return null;
}

export function validarMes(mes: string): string | null {
  return MES_REGEX.test(mes) ? null : 'Mês inválido.';
}

export function validarSenha(senha: string): string | null {
  if (senha.length < LIMITES.senhaMin) return `A senha precisa ter ao menos ${LIMITES.senhaMin} caracteres.`;
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  return null;
}

/**
 * Só aceita links http(s). Bloqueia "javascript:", "data:" etc. em links
 * vindos de fontes externas (notícias, APIs).
 */
export function urlExternaSegura(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function limitarPontosHabito(pontos: number): number {
  if (!Number.isFinite(pontos)) return 20;
  return Math.min(LIMITES.pontosHabitoMax, Math.max(LIMITES.pontosHabitoMin, Math.round(pontos)));
}
