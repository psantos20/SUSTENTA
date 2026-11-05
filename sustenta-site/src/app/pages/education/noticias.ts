import { urlExternaSegura } from '../../../services/validacao';
import type { Noticia } from './tipos';
import { NOTICIAS_CATEGORIAS, PALAVRAS_SUSTENTABILIDADE } from './dados';


export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


export function isArtigoSustentavel(titulo: string, descricao: string): boolean {
  const texto = normalizarTexto(`${titulo} ${descricao}`);

  return PALAVRAS_SUSTENTABILIDADE.some((p) =>
    texto.includes(normalizarTexto(p))
  );
}


// O cache das notícias fica na CDN (a função /news responde com
// Cache-Control). Clientes não escrevem mais em um cache global no Firestore,
// o que permitiria a qualquer usuário "envenenar" as notícias de todos.

export async function buscarNoticias(categoria: typeof NOTICIAS_CATEGORIAS[0]): Promise<Noticia[]> {
  const url = new URL('/.netlify/functions/news', window.location.origin);

  url.searchParams.set('categoria', categoria.id);

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`Erro ao buscar notícias: ${res.status}`);
  }

  const data = await res.json();

  if (data.status !== 'ok') {
    throw new Error(data.message ?? 'Erro ao buscar notícias.');
  }

  const noticias: Noticia[] = (data.articles ?? [])
    .filter((a: any) => {
      if (!a.title || a.title === '[Removed]' || !a.description) return false;
      return isArtigoSustentavel(a.title, a.description ?? '');
    })
    .slice(0, 8)
    .map((a: any, i: number) => ({
      id: `${categoria.id}-${i}`,
      titulo: a.title,
      descricao: a.description ?? '',
      fonte: a.source?.name ?? 'Desconhecido',
      autor: a.author ?? null,
      urlOriginal: urlExternaSegura(a.url) ?? '',
      urlImagem: urlExternaSegura(a.urlToImage) ?? null,
      publicadoEm: a.publishedAt,
      categoria: categoria.label,
      cachadoEm: Date.now(),
    }))
    .filter((n: Noticia) => n.urlOriginal);

  return noticias;
}


export function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
