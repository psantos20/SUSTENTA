/** Utilitários de classe da aba Assinaturas. */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../contexts/ThemeContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Classes que mudam com o tema (useTheme, como pede o padrão de design do projeto). */
export function useTons() {
  const { darkMode } = useTheme();
  const t = (claro: string, escuro: string) => (darkMode ? escuro : claro);
  return {
    cartao: t('bg-white border-slate-200', 'bg-slate-800 border-slate-700'),
    alto: t('bg-slate-100', 'bg-slate-700/60'),
    texto: t('text-slate-900', 'text-slate-100'),
    suave: t('text-slate-500', 'text-slate-400'),
    marcaSuave: t('bg-emerald-100 text-emerald-700', 'bg-emerald-900 text-emerald-400'),
    info: t('bg-sky-100 text-sky-800', 'bg-sky-900/40 text-sky-300'),
    aviso: t('bg-amber-100 text-amber-800', 'bg-amber-900/40 text-amber-300'),
    neutro: t('bg-slate-100 text-slate-600', 'bg-slate-700 text-slate-300'),
    botaoSecundario: t(
      'border-emerald-600 text-emerald-700 hover:bg-emerald-50',
      'border-emerald-400 text-emerald-400 hover:bg-emerald-900/40',
    ),
    botaoPrimario: t('bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'),
  };
}
