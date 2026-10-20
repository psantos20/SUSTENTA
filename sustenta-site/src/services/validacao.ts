/**
 * Regras de validação compartilhadas no front-end.
 * Os mesmos limites são reforçados no servidor em firestore.rules —
 * a validação aqui é para dar uma boa mensagem ao usuário; a do servidor é a
 * que garante a segurança. Ao mudar um limite, mude nos dois lugares.
 */

export const LIMITES = {
  valorMax: 1_000_000,
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

export const CATEGORIAS_REGISTRO = ['energia', 'agua', 'outro'] as const;
export type CategoriaRegistro = (typeof CATEGORIAS_REGISTRO)[number];

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function limparTexto(texto: string | null | undefined, max: number): string {
  // Remove caracteres de controle e limita o tamanho.
  // eslint-disable-next-line no-control-regex
  return (texto ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

/** Retorna uma mensagem de erro ou null se estiver tudo certo. */
export function validarValor(valor: number): string | null {
  if (!Number.isFinite(valor) || valor <= 0) return 'Informe um valor válido.';
  if (valor > LIMITES.valorMax) return 'Valor muito alto. Confira o número digitado.';
  return null;
}

export function validarMes(mes: string): string | null {
  return MES_REGEX.test(mes) ? null : 'Mês inválido.';
}

export function validarSenha(senha: string): string | null {
  if (senha.length < LIMITES.senhaMin) return `A senha precisa ter ao menos ${LIMITES.senhaMin} caracteres.`;
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
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
