import React from 'react';
import { Zap, Droplets, Trash2, Star, Target, Leaf } from 'lucide-react';
import type { Categoria, Desafio, Habito } from './tipos';


export const hoje = () => new Date().toISOString().split('T')[0];


export const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];


export function ultimos7Dias(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}


export function diaDaSemana(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DIAS_SEMANA[d.getDay()];
}


export const HABITOS_PREDEFINIDOS: Habito[] = [
  { id: 'h1', titulo: 'Banho de até 5 minutos', categoria: 'Água', pontos: 15, personalizado: false },
  { id: 'h2', titulo: 'Fechar torneira ao escovar dentes', categoria: 'Água', pontos: 10, personalizado: false },
  { id: 'h3', titulo: 'Apagar luzes ao sair do cômodo', categoria: 'Energia', pontos: 10, personalizado: false },
  { id: 'h4', titulo: 'Desligar eletrônicos em standby', categoria: 'Energia', pontos: 15, personalizado: false },
  { id: 'h5', titulo: 'Usar sacolas reutilizáveis', categoria: 'Resíduos', pontos: 5, personalizado: false },
  { id: 'h6', titulo: 'Separar lixo reciclável', categoria: 'Resíduos', pontos: 20, personalizado: false },
  { id: 'h7', titulo: 'Usar transporte público', categoria: 'Transporte', pontos: 25, personalizado: false },
  { id: 'h8', titulo: 'Evitar desperdício de comida', categoria: 'Alimentação', pontos: 20, personalizado: false },
];


export const DESAFIOS_PREDEFINIDOS: Desafio[] = [
  {
    id: 'd1',
    titulo: 'Semana Zero Plástico',
    descricao: 'Não utilize sacolas ou garrafas plásticas por 7 dias.',
    recompensa: 500,
    dificuldade: 'Difícil',
    duracaoDias: 7,
    categoria: 'Resíduos',
    meta: 'Complete 7 dias sem plástico',
  },
  {
    id: 'd2',
    titulo: 'Mestre da Água',
    descricao: 'Reduza seu consumo de água em 15% comparado ao mês passado.',
    recompensa: 300,
    dificuldade: 'Médio',
    duracaoDias: 30,
    categoria: 'Água',
    meta: 'Registre conta de água abaixo da meta',
  },
  {
    id: 'd3',
    titulo: 'Luz de Velas',
    descricao: 'Desligue todos os eletrônicos por 1h todas as noites durante 5 dias.',
    recompensa: 200,
    dificuldade: 'Fácil',
    duracaoDias: 5,
    categoria: 'Energia',
    meta: 'Complete 5 dias sem eletrônicos à noite',
  },
  {
    id: 'd4',
    titulo: 'Semana Verde',
    descricao: 'Complete todos os hábitos diários por 7 dias consecutivos.',
    recompensa: 700,
    dificuldade: 'Difícil',
    duracaoDias: 7,
    categoria: 'Geral',
    meta: 'Streak de 7 dias completos',
  },
  {
    id: 'd5',
    titulo: 'Compostagem Doméstica',
    descricao: 'Inicie uma compostagem em casa e registre por 14 dias.',
    recompensa: 400,
    dificuldade: 'Médio',
    duracaoDias: 14,
    categoria: 'Resíduos',
    meta: 'Registre compostagem por 14 dias',
  },
];


export const COR_CATEGORIA: Record<Categoria, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  Água: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800/40',
    icon: Droplets,
  },
  Energia: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800/40',
    icon: Zap,
  },
  Resíduos: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-800/40',
    icon: Trash2,
  },
  Alimentação: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-100 dark:border-orange-800/40',
    icon: Leaf,
  },
  Transporte: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-800/40',
    icon: Target,
  },
  Geral: {
    bg: 'bg-slate-50 dark:bg-slate-700/30',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-100 dark:border-slate-700',
    icon: Star,
  },
};


export const COR_DIFICULDADE = {
  Fácil: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40',
  Médio: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
  Difícil: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/40',
};
