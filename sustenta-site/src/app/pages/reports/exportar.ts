import type { ReportData } from './tipos';
import { unidadeDeQuantidade } from '../../../services/transporte';


export function exportarCSV(data: ReportData) {
  const header = 'Descrição,Categoria,Subcategoria,Quantidade,Valor (R$),Mês\n';

  const rows = data.registros.map((r) => {
    const unidade = unidadeDeQuantidade(r.categoria, r.subcategoria);
    const quantidade = r.quantidade != null && unidade ? `${r.quantidade} ${unidade}` : '';
    return `"${r.descricao || ''}","${r.categoria}","${r.subcategoria || ''}","${quantidade}","${r.valor.toFixed(2)}","${data.mesLabel}"`;
  }).join('\n');

  const rodape = `\n"TOTAL","","","","${data.totalGeral.toFixed(2)}",""\n`;
  const csv = '\uFEFF' + header + rows + rodape;

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `Sustenta_${data.mes}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}


export async function gerarPDF(_elementId: string, mes: string, data?: ReportData) {
  const { default: jsPDF } = await import('jspdf');

  if (!data) {
    throw new Error('Dados do relatório não encontrados.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const margem = 14;
  const largura = pageW - margem * 2;

  let y = 18;

  function desenharFundo() {
    pdf.setFillColor(2, 6, 23);
    pdf.rect(0, 0, pageW, pageH, 'F');
  }

  function novaPaginaSePreciso(altura = 12) {
    if (y + altura > pageH - 14) {
      pdf.addPage();
      desenharFundo();
      y = 18;
    }
  }

  function texto(txt: string, x: number, yy: number, size = 10, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.text(txt, x, yy);
  }

  function moeda(v: number) {
    return `R$ ${v.toFixed(2)}`;
  }

  function desenharCard(
    x: number,
    yy: number,
    w: number,
    h: number,
    titulo: string,
    valor: string,
    cor: [number, number, number]
  ) {
    pdf.setFillColor(cor[0], cor[1], cor[2]);
    pdf.roundedRect(x, yy, w, h, 3, 3, 'F');

    pdf.setTextColor(220, 252, 231);
    texto(titulo, x + 4, yy + 7, 8, false);

    pdf.setTextColor(255, 255, 255);
    texto(valor, x + 4, yy + 17, 12, true);
  }

  function tituloSecao(titulo: string) {
    novaPaginaSePreciso(14);
    pdf.setTextColor(255, 255, 255);
    texto(titulo, margem, y, 13, true);
    y += 8;
  }

  desenharFundo();

  pdf.setTextColor(255, 255, 255);
  texto('Sustenta', margem, y, 20, true);

  pdf.setTextColor(148, 163, 184);
  texto('Relatório de Consumo', margem, y + 7, 10);

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(data.mesLabel, pageW - margem, y, { align: 'right' });

  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(data.usuario?.nome || 'Usuário', pageW - margem, y + 7, { align: 'right' });
  pdf.text(`${data.usuario?.cidade || 'Cidade'}, ${data.usuario?.estado || 'UF'}`, pageW - margem, y + 13, { align: 'right' });

  y += 24;

  pdf.setDrawColor(51, 65, 85);
  pdf.line(margem, y, pageW - margem, y);

  y += 10;

  const cardW = (largura - 9) / 4;

  desenharCard(margem, y, cardW, 24, 'Total Gasto', moeda(data.totalGeral), [109, 40, 217]);
  desenharCard(margem + cardW + 3, y, cardW, 24, 'Score', `${data.scoreMes}/100`, [22, 163, 74]);
  desenharCard(margem + (cardW + 3) * 2, y, cardW, 24, 'Nível', data.nivel, [13, 148, 136]);
  desenharCard(margem + (cardW + 3) * 3, y, cardW, 24, 'Registros', String(data.registros.length), [37, 99, 235]);

  y += 36;

  novaPaginaSePreciso(51);

  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(margem, y, largura, 47, 3, 3, 'F');

  pdf.setTextColor(148, 163, 184);
  texto('Resumo do mês', margem + 5, y + 8, 10, true);

  pdf.setTextColor(255, 255, 255);
  texto(`Energia: ${moeda(data.totalEnergia)}`, margem + 5, y + 18, 10);
  texto(`Água: ${moeda(data.totalAgua)}`, margem + 5, y + 27, 10);
  texto(`Transporte: ${moeda(data.totalTransporte)}`, margem + 5, y + 36, 10);
  texto(`Outros: ${moeda(data.totalOutro)}`, margem + 85, y + 18, 10);

  const tendencia = data.scoreMes - data.scoreAnterior;
  const tendenciaTxt =
    tendencia > 0
      ? `+${tendencia} pontos vs. mês anterior`
      : `${tendencia} pontos vs. mês anterior`;

  texto(`Tendência: ${tendenciaTxt}`, margem + 85, y + 27, 10);

  y += 59;

  if (data.historico.length > 0) {
    tituloSecao('Evolução dos Gastos');

    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(margem, y, largura, 9, 2, 2, 'F');

    pdf.setTextColor(148, 163, 184);
    texto('Mês', margem + 3, y + 6, 8, true);
    texto('Total', margem + 55, y + 6, 8, true);
    texto('Energia', margem + 95, y + 6, 8, true);
    texto('Água', margem + 135, y + 6, 8, true);
    texto('Score', margem + 168, y + 6, 8, true);

    y += 11;

    data.historico.forEach((h) => {
      novaPaginaSePreciso(8);

      pdf.setTextColor(226, 232, 240);
      texto(h.label, margem + 3, y, 8);
      texto(moeda(h.total), margem + 55, y, 8);

      pdf.setTextColor(250, 204, 21);
      texto(moeda(h.energia), margem + 95, y, 8);

      pdf.setTextColor(96, 165, 250);
      texto(moeda(h.agua), margem + 135, y, 8);

      pdf.setTextColor(52, 211, 153);
      texto(String(h.score), margem + 168, y, 8);

      y += 7;
    });

    y += 8;
  }

  if (data.maioresGastos.length > 0) {
    tituloSecao('Top Gastos do Mês');

    data.maioresGastos.forEach((r, i) => {
      novaPaginaSePreciso(9);

      pdf.setTextColor(226, 232, 240);
      texto(`${i + 1}. ${r.descricao || r.subcategoria || r.categoria}`, margem, y, 9);

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(moeda(r.valor), pageW - margem, y, { align: 'right' });

      y += 8;
    });

    y += 6;
  }

  if (data.alertas.length > 0) {
    tituloSecao('Alertas');

    data.alertas.forEach((alerta) => {
      novaPaginaSePreciso(12);
      const linhas = pdf.splitTextToSize(`• ${alerta}`, largura);

      pdf.setTextColor(252, 165, 165);
      pdf.setFontSize(9);
      pdf.text(linhas, margem, y);

      y += linhas.length * 5 + 2;
    });

    y += 4;
  }

  if (data.dicas.length > 0) {
    tituloSecao('Dicas');

    data.dicas.forEach((dica) => {
      novaPaginaSePreciso(12);
      const linhas = pdf.splitTextToSize(`• ${dica}`, largura);

      pdf.setTextColor(167, 243, 208);
      pdf.setFontSize(9);
      pdf.text(linhas, margem, y);

      y += linhas.length * 5 + 2;
    });

    y += 4;
  }

  if (data.registros.length > 0) {
    tituloSecao('Todos os Registros');

    data.registros.forEach((r) => {
      novaPaginaSePreciso(12);

      const desc = r.descricao || r.subcategoria || r.categoria;
      const linhas = pdf.splitTextToSize(desc, 110);

      pdf.setTextColor(226, 232, 240);
      pdf.setFontSize(8);
      pdf.text(linhas, margem, y);

      pdf.setTextColor(148, 163, 184);
      pdf.text(r.subcategoria || r.categoria, margem + 115, y);

      pdf.setTextColor(255, 255, 255);
      pdf.text(moeda(r.valor), pageW - margem, y, { align: 'right' });

      y += Math.max(8, linhas.length * 5);
    });

    y += 4;

    novaPaginaSePreciso(10);
    pdf.setDrawColor(51, 65, 85);
    pdf.line(margem, y, pageW - margem, y);

    y += 7;

    pdf.setTextColor(255, 255, 255);
    texto('Total', margem, y, 10, true);
    pdf.text(moeda(data.totalGeral), pageW - margem, y, { align: 'right' });
  }

  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(8);
  pdf.text(`Gerado pelo Sustenta em ${new Date().toLocaleDateString('pt-BR')}`, margem, pageH - 8);
  pdf.text('sustenta.app', pageW - margem, pageH - 8, { align: 'right' });

  pdf.save(`Sustenta_Relatorio_${mes}.pdf`);
}
