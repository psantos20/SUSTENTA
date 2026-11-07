import { chamarFuncaoAutenticada } from '../../../services/api';
import type { Registro } from './tipos';
import { CARBON_FACTORS, FATOR_ENERGIA_KG_POR_KWH, MESES_FULL, MESES_SHORT } from './dados';


export function getMesLabel(m: string, short = false) {
  const [ano, mes] = m.split('-');
  return short ? `${MESES_SHORT[+mes - 1]}/${ano.slice(2)}` : `${MESES_FULL[+mes - 1]} ${ano}`;
}


/**
 * kg de CO2 de um registro. Energia com quantidade (kWh) usa o fator oficial
 * (preciso). Todo o resto é estimado a partir do valor em R$.
 */
export function carbonoDoRegistro(r: Registro): { kg: number; preciso: boolean } {
  if (r.categoria === 'energia' && typeof r.quantidade === 'number' && r.quantidade > 0) {
    return { kg: r.quantidade * FATOR_ENERGIA_KG_POR_KWH, preciso: true };
  }
  return { kg: r.valor * CARBON_FACTORS[r.categoria], preciso: false };
}

export function calcularCarbono(registros: Registro[]) {
  const somar = (categoria: Registro['categoria']) =>
    registros.filter((r) => r.categoria === categoria).reduce((s, r) => s + carbonoDoRegistro(r).kg, 0);

  const energiaKg = somar('energia');
  const aguaKg = somar('agua');
  const outroKg = somar('outro');
  const totalKg = energiaKg + aguaKg + outroKg;

  // Quanto do total vem de estimativas (sem quantidade informada / sem fator oficial).
  const estimadoKg = registros.reduce((s, r) => {
    const c = carbonoDoRegistro(r);
    return c.preciso ? s : s + c.kg;
  }, 0);
  const registrosEstimados = registros.filter((r) => !carbonoDoRegistro(r).preciso).length;

  return {
    totalKg,
    energiaKg,
    aguaKg,
    outroKg,
    estimadoKg,
    registrosEstimados,
    totalRegistros: registros.length,
    arvoresTotais: Math.ceil(totalKg / 21.7),
    kmCarro: Math.round(totalKg / 0.21),
    horasAviao: +(totalKg / 90).toFixed(1),
  };
}


/** Variação (±) em relação à média dos outros meses para ainda contar como "na média". */
export const FAIXA_NA_MEDIA = 0.1;

/**
 * Classifica o mês comparando com a MÉDIA DOS OUTROS MESES do próprio usuário
 * (meses sem registro, com 0 kg, não entram). Não usa limites fixos: o app só
 * conta energia, água e outros gastos, então não há um número oficial "certo"
 * para comparar. Sem outros meses com dados, não há como classificar (null).
 */
export function classificarNivel(totalKg: number, outrosMesesKg: number[]) {
  const base = outrosMesesKg.filter((k) => Number.isFinite(k) && k > 0);
  if (base.length === 0 || !Number.isFinite(totalKg) || totalKg < 0) return null;

  const mediaKg = base.reduce((s, k) => s + k, 0) / base.length;
  const variacao = Math.round(((totalKg - mediaKg) / mediaKg) * 1e6) / 1e6;
  const chave: 'abaixo' | 'media' | 'acima' =
    variacao < -FAIXA_NA_MEDIA ? 'abaixo' : variacao > FAIXA_NA_MEDIA ? 'acima' : 'media';

  return { chave, variacaoPercentual: Math.round(variacao * 100), mediaKg, meses: base.length };
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
