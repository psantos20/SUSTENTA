import { chamarFuncaoAutenticada } from '../../../services/api';
import type { Registro } from './tipos';
import { CARBON_FACTORS, MESES_FULL, MESES_SHORT } from './dados';


export function getMesLabel(m: string, short = false) {
  const [ano, mes] = m.split('-');
  return short ? `${MESES_SHORT[+mes - 1]}/${ano.slice(2)}` : `${MESES_FULL[+mes - 1]} ${ano}`;
}


export function calcularCarbono(registros: Registro[]) {
  const energiaKg = registros
    .filter((r) => r.categoria === 'energia')
    .reduce((s, r) => s + r.valor * CARBON_FACTORS.energia, 0);

  const aguaKg = registros
    .filter((r) => r.categoria === 'agua')
    .reduce((s, r) => s + r.valor * CARBON_FACTORS.agua, 0);

  const outroKg = registros
    .filter((r) => r.categoria === 'outro')
    .reduce((s, r) => s + r.valor * CARBON_FACTORS.outro, 0);

  const totalKg = energiaKg + aguaKg + outroKg;

  return {
    totalKg,
    energiaKg,
    aguaKg,
    outroKg,
    arvoresTotais: Math.ceil(totalKg / 21.7),
    kmCarro: Math.round(totalKg / 0.21),
    horasAviao: +(totalKg / 90).toFixed(1),
  };
}


export async function gerarDicaIA(e: number, a: number, o: number, kg: number): Promise<string> {
  // A chave da IA fica só no servidor (função dica-ia). O navegador envia
  // apenas os números, junto com o token de login do Firebase.
  const data = await chamarFuncaoAutenticada<{ dica?: string }>('dica-ia', {
    energia: e,
    agua: a,
    outros: o,
    co2Kg: kg,
  });

  return data.dica || 'Continue reduzindo seu consumo!';
}
