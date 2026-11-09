/**
 * Desenha a imagem da retrospectiva direto em um <canvas> (1080x1350, 4:5, boa para
 * stories e status do WhatsApp) e oferece baixar/compartilhar o PNG.
 *
 * Por que canvas e não "fotografar" a tela com html2canvas: o html2canvas desenhava
 * os textos grandes deslocados para baixo e se atrapalha com as cores modernas do
 * Tailwind. Desenhando à mão, a imagem sai idêntica em qualquer navegador e tema,
 * e a prévia mostrada ao usuário é exatamente o arquivo que ele vai compartilhar.
 */
import type { Retrospectiva } from './retrospectiva';

export const LARGURA_IMAGEM = 1080;
export const ALTURA_IMAGEM = 1350;

const MARGEM = 72;
const LARGURA_UTIL = LARGURA_IMAGEM - MARGEM * 2;
const FAMILIA = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const COR = {
  texto: '#ecfdf5',
  suave: '#a7f3d0',
  destaque: '#6ee7b7',
  barra: '#34d399',
  fundoBloco: 'rgba(2,44,34,0.55)',
  bordaBloco: 'rgba(110,231,183,0.25)',
  escuro: '#022c22',
  verdeEscuro: '#064e3b',
};

/** Quebra o texto em linhas que cabem na largura (medir = largura em px de um trecho). Palavra maior que a largura fica sozinha. */
export function quebrarLinhas(texto: string, largura: number, medir: (t: string) => number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (atual && medir(tentativa) > largura) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sinal = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '');

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const raio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + w, y, x + w, y + h, raio);
  ctx.arcTo(x + w, y + h, x, y + h, raio);
  ctx.arcTo(x, y + h, x, y, raio);
  ctx.arcTo(x, y, x + w, y, raio);
  ctx.closePath();
}

function fonte(ctx: CanvasRenderingContext2D, peso: number, tamanho: number) {
  ctx.font = `${peso} ${tamanho}px ${FAMILIA}`;
}

/** Diminui a fonte até o texto caber na largura (mínimo de 24px). */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, tamanho: number, largura: number): number {
  let t = tamanho;
  fonte(ctx, peso, t);
  while (t > 24 && ctx.measureText(texto).width > largura) {
    t -= 2;
    fonte(ctx, peso, t);
  }
  return t;
}

function espacamento(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing ainda não existe em todos os navegadores: sem ele o texto só fica mais junto.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, cor: string, align: CanvasTextAlign = 'left') {
  ctx.fillStyle = cor;
  ctx.textAlign = align;
  ctx.fillText(t, x, y);
}

export function desenharRetrospectiva(canvas: HTMLCanvasElement, retro: Retrospectiva, mostrarValores: boolean): void {
  canvas.width = LARGURA_IMAGEM;
  canvas.height = ALTURA_IMAGEM;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.textBaseline = 'alphabetic';
  espacamento(ctx, 0);

  // Fundo
  const fundo = ctx.createLinearGradient(0, 0, LARGURA_IMAGEM * 0.45, ALTURA_IMAGEM);
  fundo.addColorStop(0, COR.verdeEscuro);
  fundo.addColorStop(0.45, '#065f46');
  fundo.addColorStop(1, COR.escuro);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, LARGURA_IMAGEM, ALTURA_IMAGEM);
  ctx.fillStyle = 'rgba(52,211,153,0.18)';
  ctx.beginPath();
  ctx.arc(LARGURA_IMAGEM - 20, 80, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16,185,129,0.14)';
  ctx.beginPath();
  ctx.arc(100, ALTURA_IMAGEM + 60, 280, 0, Math.PI * 2);
  ctx.fill();

  // Cabeçalho
  fonte(ctx, 800, 30);
  espacamento(ctx, 3);
  texto(ctx, `RETROSPECTIVA${retro.nomeCurto ? ` DE ${retro.nomeCurto.toUpperCase()}` : ''}`, MARGEM, 125, COR.destaque);
  espacamento(ctx, 0);
  ajustar(ctx, retro.mesLabel, 900, 92, LARGURA_UTIL);
  texto(ctx, retro.mesLabel, MARGEM, 240, COR.texto);

  // Número principal
  const variacao = retro.variacaoPercentual;
  const principal = mostrarValores
    ? { rotulo: 'Gasto no mês', valor: brl(retro.total) }
    : variacao !== null
      ? { rotulo: 'Gastos em relação ao mês anterior', valor: `${sinal(variacao)}${Math.abs(variacao)}%` }
      : { rotulo: 'Score Sustenta', valor: `${retro.scoreMes}/100` };
  fonte(ctx, 700, 30);
  texto(ctx, principal.rotulo, MARGEM, 335, COR.suave);
  ajustar(ctx, principal.valor, 900, 150, LARGURA_UTIL);
  texto(ctx, principal.valor, MARGEM, 480, COR.texto);

  if (mostrarValores && variacao !== null) {
    const legenda = variacao === 0 ? 'Igual ao mês anterior' : `${sinal(variacao)}${Math.abs(variacao)}% vs mês anterior`;
    fonte(ctx, 800, 30);
    const largura = ctx.measureText(legenda).width + 52;
    ctx.fillStyle = variacao <= 0 ? '#34d399' : '#fbbf24';
    retangulo(ctx, MARGEM, 512, largura, 62, 31);
    ctx.fill();
    texto(ctx, legenda, MARGEM + 26, 554, COR.escuro);
  }

  // Três blocos: CO₂, score, nível
  const blocoLargura = (LARGURA_UTIL - 48) / 3;
  const blocoY = 640;
  const blocoAltura = 190;
  const blocos: { rotulo: string; valor: string; detalhe?: string }[] = [
    { rotulo: 'CO₂ ESTIMADO', valor: retro.kgCO2 > 0 ? `${retro.kgCO2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—' },
    { rotulo: 'SCORE', valor: `${retro.scoreMes}`, detalhe: retro.deltaScore ? `${sinal(retro.deltaScore)}${Math.abs(retro.deltaScore)} pts` : undefined },
    { rotulo: 'NÍVEL', valor: retro.nivel },
  ];
  blocos.forEach((b, i) => {
    const x = MARGEM + i * (blocoLargura + 24);
    ctx.fillStyle = COR.fundoBloco;
    retangulo(ctx, x, blocoY, blocoLargura, blocoAltura, 32);
    ctx.fill();
    ctx.strokeStyle = COR.bordaBloco;
    ctx.lineWidth = 2;
    ctx.stroke();
    fonte(ctx, 700, 24);
    espacamento(ctx, 1);
    texto(ctx, b.rotulo, x + 26, blocoY + 52, COR.suave);
    espacamento(ctx, 0);
    ajustar(ctx, b.valor, 900, 52, blocoLargura - 52);
    texto(ctx, b.valor, x + 26, blocoY + 122, COR.texto);
    if (b.detalhe) {
      fonte(ctx, 700, 24);
      texto(ctx, b.detalhe, x + 26, blocoY + 164, COR.destaque);
    }
  });

  // O que mais pesou
  if (retro.maisPesou) {
    const m = retro.maisPesou;
    fonte(ctx, 700, 30);
    texto(ctx, 'O que mais pesou', MARGEM, 925, COR.suave);
    const direita = `${m.rotulo} · ${m.percentual}%${mostrarValores ? ` · ${brl(m.valor)}` : ''}`;
    texto(ctx, direita, LARGURA_IMAGEM - MARGEM, 925, COR.texto, 'right');
    ctx.fillStyle = 'rgba(2,44,34,0.7)';
    retangulo(ctx, MARGEM, 950, LARGURA_UTIL, 22, 11);
    ctx.fill();
    ctx.fillStyle = COR.barra;
    retangulo(ctx, MARGEM, 950, Math.max(22, (LARGURA_UTIL * m.percentual) / 100), 22, 11);
    ctx.fill();
  }

  // Frase de destaque
  const positivo = retro.destaque.tom === 'positivo';
  const frase = `${positivo ? '🏆 ' : ''}${retro.destaque.texto}`;
  fonte(ctx, 800, 38);
  const linhas = quebrarLinhas(frase, LARGURA_UTIL - 80, (t) => ctx.measureText(t).width);
  const alturaLinha = 50;
  const caixaAltura = linhas.length * alturaLinha + 60;
  const caixaY = 1020;
  ctx.fillStyle = positivo ? COR.texto : 'rgba(236,253,245,0.14)';
  retangulo(ctx, MARGEM, caixaY, LARGURA_UTIL, caixaAltura, 36);
  ctx.fill();
  linhas.forEach((l, i) => texto(ctx, l, MARGEM + 40, caixaY + 30 + 38 + i * alturaLinha, positivo ? COR.verdeEscuro : COR.texto));

  // Rodapé
  fonte(ctx, 800, 28);
  texto(ctx, '🍃 Sustenta', MARGEM, 1270, COR.destaque);
  fonte(ctx, 600, 28);
  texto(ctx, 'Consumo consciente', LARGURA_IMAGEM - MARGEM, 1270, COR.suave, 'right');
}

/** Desenha e devolve o PNG. Espera as fontes da página carregarem para a imagem não sair com a fonte errada. */
export async function gerarImagemPNG(retro: Retrospectiva, mostrarValores: boolean): Promise<Blob> {
  try {
    await document.fonts?.ready;
  } catch {
    /* segue com a fonte que houver */
  }
  const canvas = document.createElement('canvas');
  desenharRetrospectiva(canvas, retro, mostrarValores);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png');
  });
}

export function nomeDoArquivo(mes: string): string {
  return `sustenta-retrospectiva-${mes}.png`;
}

export function baixarImagem(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** O navegador consegue compartilhar arquivos (celulares e alguns desktops)? */
export function podeCompartilharArquivo(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** Abre a folha de compartilhamento com a imagem. Devolve false se a pessoa cancelou. */
export async function compartilharImagem(blob: Blob, nome: string, texto: string): Promise<boolean> {
  const arquivo = new File([blob], nome, { type: 'image/png' });
  try {
    await navigator.share({ files: [arquivo], text: texto });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false;
    throw e;
  }
}
