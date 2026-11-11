/**
 * Catálogo de planos dos streamings, usado para reconhecer o plano pelo valor
 * cobrado e para sugerir um plano mais barato.
 *
 * ATENÇÃO: preços ilustrativos. Antes de usar com pessoas de verdade, confira os
 * valores atuais no site de cada serviço e atualize aqui (os preços mudam).
 * Usado pelo app (aba Assinaturas) e pelas funções do Netlify (detecção).
 */
import type { CatalogoPlanos } from './streaming';

export const CATALOGO_PLANOS: CatalogoPlanos = {
  netflix: [
    { nome: 'Padrão com anúncios', valor: 20.9, temAnuncios: true },
    { nome: 'Padrão', valor: 44.9, temAnuncios: false },
    { nome: 'Premium', valor: 59.9, temAnuncios: false },
  ],
  disney: [
    { nome: 'Padrão com anúncios', valor: 27.99, temAnuncios: true },
    { nome: 'Padrão', valor: 46.9, temAnuncios: false },
    { nome: 'Premium', valor: 66.9, temAnuncios: false },
  ],
  max: [
    { nome: 'Básico com anúncios', valor: 29.9, temAnuncios: true },
    { nome: 'Standard', valor: 39.9, temAnuncios: false },
    { nome: 'Platinum', valor: 55.9, temAnuncios: false },
  ],
  prime: [{ nome: 'Amazon Prime', valor: 19.9, temAnuncios: true }],
  youtube: [
    { nome: 'Gratuito com anúncios', valor: 0, temAnuncios: true },
    { nome: 'Individual', valor: 24.9, temAnuncios: false },
    { nome: 'Família', valor: 41.9, temAnuncios: false },
    { nome: 'Universitário', valor: 13.9, temAnuncios: false, restrito: 'estudantes' },
  ],
  spotify: [
    { nome: 'Gratuito com anúncios', valor: 0, temAnuncios: true },
    { nome: 'Individual', valor: 21.9, temAnuncios: false },
    { nome: 'Duo', valor: 27.9, temAnuncios: false },
    { nome: 'Família', valor: 34.9, temAnuncios: false },
    { nome: 'Universitário', valor: 11.9, temAnuncios: false, restrito: 'estudantes' },
  ],
  deezer: [
    { nome: 'Gratuito com anúncios', valor: 0, temAnuncios: true },
    { nome: 'Premium', valor: 22.9, temAnuncios: false },
    { nome: 'Família', valor: 34.9, temAnuncios: false },
    { nome: 'Universitário', valor: 11.9, temAnuncios: false, restrito: 'estudantes' },
  ],
};
