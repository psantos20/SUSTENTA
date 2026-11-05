/**
 * Rotas do app: liga cada tela a um endereço (URL). Funções puras, sem
 * dependências, para o botão "voltar", o F5 e os links diretos funcionarem.
 */

export const ROTAS_APP = {
  dashboard: '/painel',
  consumption: '/consumo',
  analysis: '/analise',
  habits: '/habitos',
  history: '/historico',
  map: '/mapa',
  reports: '/relatorios',
  profile: '/perfil',
  education: '/educacao',
} as const;

export type Page = keyof typeof ROTAS_APP;

export const ROTAS_PUBLICAS = {
  login: '/',
  sobre: '/sobre',
  privacidade: '/privacidade',
  termos: '/termos',
} as const;

export type PagePublica = keyof typeof ROTAS_PUBLICAS;

export const TITULOS_APP: Record<Page, string> = {
  dashboard: 'Painel',
  consumption: 'Consumo',
  analysis: 'Análise',
  habits: 'Hábitos',
  history: 'Histórico',
  map: 'Mapa',
  reports: 'Relatórios',
  profile: 'Perfil',
  education: 'Educação',
};

/** Tira barra final e põe em minúsculas: "/Painel/" vira "/painel". */
function normalizar(caminho: string): string {
  const limpo = caminho.split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '');
  return limpo === '' ? '/' : limpo;
}

export function caminhoDaPagina(page: Page): string {
  return ROTAS_APP[page];
}

export function caminhoPublico(page: PagePublica): string {
  return ROTAS_PUBLICAS[page];
}

/** Tela do app que corresponde ao caminho, ou null se não for uma rota do app. */
export function paginaDoCaminho(caminho: string): Page | null {
  const alvo = normalizar(caminho);
  for (const [page, rota] of Object.entries(ROTAS_APP)) {
    if (rota === alvo) return page as Page;
  }
  return null;
}

/** Tela pública do caminho; qualquer caminho desconhecido cai no login. */
export function publicaDoCaminho(caminho: string): PagePublica {
  const alvo = normalizar(caminho);
  for (const [page, rota] of Object.entries(ROTAS_PUBLICAS)) {
    if (rota === alvo) return page as PagePublica;
  }
  return 'login';
}
