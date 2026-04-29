export const estados: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
  BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
  GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

export async function buscarCidadesPorEstado(uf: string): Promise<string[]> {
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    const data = await res.json();
    return data.map((c: any) => c.nome);
  } catch {
    return [];
  }
}

export const tarifas: Record<string, { energia: number; agua: number }> = {
  SP: { energia: 0.83, agua: 5.20 },
  RJ: { energia: 0.91, agua: 6.10 },
  MG: { energia: 0.77, agua: 4.80 },
  RS: { energia: 0.72, agua: 4.50 },
  PR: { energia: 0.68, agua: 4.20 },
  SC: { energia: 0.71, agua: 4.30 },
  BA: { energia: 0.89, agua: 5.50 },
  GO: { energia: 0.81, agua: 5.00 },
  PE: { energia: 0.88, agua: 5.40 },
  CE: { energia: 0.86, agua: 5.30 },
  DF: { energia: 0.79, agua: 6.50 },
  AM: { energia: 0.95, agua: 4.00 },
  PA: { energia: 0.92, agua: 3.80 },
  MT: { energia: 0.82, agua: 4.70 },
  MS: { energia: 0.80, agua: 4.60 },
  ES: { energia: 0.78, agua: 5.10 },
  AL: { energia: 0.90, agua: 5.20 },
  RN: { energia: 0.87, agua: 5.00 },
  PI: { energia: 0.85, agua: 4.90 },
  PB: { energia: 0.88, agua: 5.10 },
  SE: { energia: 0.89, agua: 5.20 },
  MA: { energia: 0.84, agua: 4.60 },
  RO: { energia: 0.76, agua: 3.90 },
  TO: { energia: 0.83, agua: 4.20 },
  AC: { energia: 0.94, agua: 3.70 },
  AP: { energia: 0.96, agua: 3.60 },
  RR: { energia: 0.93, agua: 3.50 },
};