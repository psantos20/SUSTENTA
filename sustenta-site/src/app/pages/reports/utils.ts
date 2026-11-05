
export const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];


export const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];


export const NIVEIS = [
  'Iniciante', 'Consciente', 'Engajado', 'Ativo', 'Dedicado',
  'Guardião', 'Protetor', 'Mestre', 'Guardião Verde', 'Eco Herói',
];


export function getMesLabel(mesStr: string, short = false): string {
  const [ano, mes] = mesStr.split('-');
  const arr = short ? MESES : MESES_FULL;
  return `${arr[parseInt(mes) - 1]}${short ? `/${ano.slice(2)}` : ` ${ano}`}`;
}


export function calcularScore(energia: number, agua: number, outro: number): number {
  let score = 100;

  if (energia > 400) score -= 30;
  else if (energia > 200) score -= 15;

  if (agua > 200) score -= 20;
  else if (agua > 100) score -= 10;

  if (outro > 500) score -= 10;

  return Math.max(0, Math.min(100, score));
}


export function getNivel(xp: number): string {
  return NIVEIS[Math.min(Math.floor(xp / 1000), NIVEIS.length - 1)];
}


export function gerarMesesDisponiveis(): { value: string; label: string }[] {
  const now = new Date();

  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    return {
      value,
      label: getMesLabel(value),
    };
  });
}
