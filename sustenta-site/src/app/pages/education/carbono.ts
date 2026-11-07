import { chamarFuncaoAutenticada } from '../../../services/api';
import type { Registro } from './tipos';
import { CARBON_FACTORS, FATOR_COMBUSTIVEL, FATOR_ENERGIA_KG_POR_KWH, MESES_FULL, MESES_SHORT } from './dados';
import { ehCombustivel } from '../../../services/transporte';


export function getMesLabel(m: string, short = false) {
  const [ano, mes] = m.split('-');
  return short ? `${MESES_SHORT[+mes - 1]}/${ano.slice(2)}` : `${MESES_FULL[+mes - 1]} ${ano}`;
}


/**
 * kg de CO2 de um registro.
 *  - preciso: energia com kWh, ou combustível com litros (GNV: m³), usam fator oficial.
 *  - estimado: energia/água/outros sem quantidade (ou água sempre) usam um fator por R$.
 *  - não calculado: transporte que não é combustível com quantidade (ônibus,
 *    app, avião...) ou combustível sem litros — não há fator confiável por R$,
 *    então fica de fora do total (kg = 0, calculado = false).
 */
export function carbonoDoRegistro(r: Registro): { kg: number; preciso: boolean; calculado: boolean } {
  const temQuantidade = typeof r.quantidade === 'number' && r.quantidade > 0;

  if (r.categoria === 'transporte') {
    if (temQuantidade && ehCombustivel(r.subcategoria)) {
      return { kg: r.quantidade! * FATOR_COMBUSTIVEL[r.subcategoria].kg, preciso: true, calculado: true };
    }
    return { kg: 0, preciso: false, calculado: false };
  }
  if (r.categoria === 'energia' && temQuantidade) {
    return { kg: r.quantidade! * FATOR_ENERGIA_KG_POR_KWH, preciso: true, calculado: true };
  }
  return { kg: r.valor * CARBON_FACTORS[r.categoria], preciso: false, calculado: true };
}

export function calcularCarbono(registros: Registro[]) {
  const somar = (categoria: Registro['categoria']) =>
    registros.filter((r) => r.categoria === categoria).reduce((s, r) => s + carbonoDoRegistro(r).kg, 0);

  const energiaKg = somar('energia');
  const aguaKg = somar('agua');
  const transporteKg = somar('transporte');
  const outroKg = somar('outro');
  const totalKg = energiaKg + aguaKg + transporteKg + outroKg;

  // Quanto do total vem de estimativas (sem quantidade informada / sem fator oficial).
  const calculos = registros.map((r) => carbonoDoRegistro(r));
  const estimadoKg = calculos.reduce((s, c) => (c.calculado && !c.preciso ? s + c.kg : s), 0);
  const registrosEstimados = calculos.filter((c) => c.calculado && !c.preciso).length;
  // Transporte que ficou de fora do cálculo por não ter fator confiável.
  const registrosNaoCalculados = calculos.filter((c) => !c.calculado).length;

  return {
    totalKg,
    energiaKg,
    aguaKg,
    transporteKg,
    outroKg,
    estimadoKg,
    registrosEstimados,
    registrosNaoCalculados,
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
