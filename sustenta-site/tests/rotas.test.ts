import { describe, it, expect } from 'vitest';
import {
  ROTAS_APP, caminhoDaPagina, caminhoPublico, paginaDoCaminho, publicaDoCaminho,
} from '../src/services/rotas';

describe('Rotas do app', () => {
  it('cada tela tem um caminho único e volta para a mesma tela', () => {
    const caminhos = Object.values(ROTAS_APP);
    expect(new Set(caminhos).size).toBe(caminhos.length);
    for (const page of Object.keys(ROTAS_APP) as (keyof typeof ROTAS_APP)[]) {
      expect(paginaDoCaminho(caminhoDaPagina(page))).toBe(page);
    }
  });

  it('ignora barra final, maiúsculas, query e hash', () => {
    expect(paginaDoCaminho('/Painel/')).toBe('dashboard');
    expect(paginaDoCaminho('/mapa?x=1')).toBe('map');
    expect(paginaDoCaminho('/perfil#familia')).toBe('profile');
  });

  it('caminho desconhecido não é tela do app', () => {
    expect(paginaDoCaminho('/')).toBeNull();
    expect(paginaDoCaminho('/nao-existe')).toBeNull();
  });

  it('páginas públicas: reconhece e cai no login quando desconhecido', () => {
    expect(publicaDoCaminho('/sobre')).toBe('sobre');
    expect(publicaDoCaminho('/termos/')).toBe('termos');
    expect(publicaDoCaminho('/privacidade')).toBe('privacidade');
    expect(publicaDoCaminho('/painel')).toBe('login');
    expect(publicaDoCaminho('/qualquer-coisa')).toBe('login');
    expect(caminhoPublico('login')).toBe('/');
  });
});
