// Generación de recibos en PDF (luz y renta), client-side, con jsPDF.
// El membrete oficial D&L va como imagen de header (public/membrete-header.png);
// el footer se dibuja con los datos correctos (teléfono 9462-8618).
// Ambas funciones reciben un objeto plano con los valores ya formateados.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MARGIN = 16;            // mm
const HEADER_RATIO = 300 / 1800; // alto/ancho del PNG del header

const C = {
  text: [51, 51, 51],
  light: [85, 85, 85],
  teal: [30, 122, 138],
  tealDark: [21, 95, 110],
  coral: [243, 122, 114],
  rowHead: [245, 201, 194],
  labelBg: [240, 240, 240],
  noteBg: [255, 251, 234],
  noteBar: [212, 168, 0],
  borde: [204, 204, 204],
};

// Cache de la imagen del membrete (se carga una sola vez).
let _headerImg = null;
function loadHeaderImg() {
  if (_headerImg) return Promise.resolve(_headerImg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { _headerImg = img; resolve(img); };
    img.onerror = () => reject(new Error('No pude cargar el membrete (/membrete-header.png)'));
    img.src = '/membrete-header.png';
  });
}

function sectionHead(doc, txt, y) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.teal);
  doc.text(txt, MARGIN, y);
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1.6, pw - MARGIN, y + 1.6);
}

function drawFooter(doc) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const fh = 13;
  doc.setFillColor(...C.tealDark);
  doc.rect(0, ph - fh, pw, fh, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    '+504 9462-8618    |    soluciones_dyl@yahoo.com    |    Res. Altos de Venecia 1    |    RTN: 0801-9022-372253',
    pw / 2, ph - fh / 2 + 1, { align: 'center' }
  );
}

function noteBox(doc, text, y) {
  const pw = doc.internal.pageSize.getWidth();
  const boxW = pw - 2 * MARGIN;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(text, boxW - 10);
  const boxH = lines.length * 4 + 6;
  doc.setFillColor(...C.noteBg);
  doc.rect(MARGIN, y, boxW, boxH, 'F');
  doc.setFillColor(...C.noteBar);
  doc.rect(MARGIN, y, 1.6, boxH, 'F');
  doc.setTextColor(...C.light);
  doc.text(lines, MARGIN + 6, y + 5.5);
  return y + boxH;
}

async function nuevoDoc(subtitulo) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pw = doc.internal.pageSize.getWidth();
  const img = await loadHeaderImg();
  const imgH = pw * HEADER_RATIO;
  // compression 'SLOW' = deflate máximo; el membrete es line-art sobre blanco
  // así que comprime muchísimo y el PDF queda liviano para compartir.
  doc.addImage(img, 'PNG', 0, 0, pw, imgH, undefined, 'SLOW');
  let y = imgH + 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.text);
  doc.text('PLAZA STEFANY', pw / 2, y, { align: 'center', charSpace: 0.8 });
  y += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.light);
  doc.text(subtitulo, pw / 2, y, { align: 'center', charSpace: 0.5 });
  return { doc, y: y + 8 };
}

function tablaIdentificacion(doc, d, y) {
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    body: [
      ['Recibo N°', d.reciboNum],
      ['Inquilino', d.inquilino],
      ['Local', d.local],
      ['Período', d.periodo],
      ['Fecha de emisión', d.fechaEmision],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: C.borde, lineWidth: 0.1, textColor: C.text },
    columnStyles: {
      0: { fillColor: C.labelBg, textColor: C.light, cellWidth: 48, fontSize: 8.5 },
      1: { textColor: C.text },
    },
  });
  return doc.lastAutoTable.finalY + 9;
}

const tablaCalc = {
  theme: 'grid',
  styles: { fontSize: 9, cellPadding: 2.5, lineColor: C.borde, lineWidth: 0.1, textColor: C.text },
  headStyles: { fillColor: C.rowHead, textColor: C.coral, fontStyle: 'bold', fontSize: 7.5 },
  footStyles: { fillColor: C.tealDark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
  columnStyles: { 1: { halign: 'center', textColor: C.light }, 2: { halign: 'right' } },
};

const safe = (s) => String(s).replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, '-');

// d = { reciboNum, inquilino, local, periodo, fechaEmision,
//       lecturaAnterior, lecturaActual, consumo,
//       kWhPlaza, facturaEnee, tarifa, montoEnergia,
//       cargosFijos, fijoLocal, nLocales, total }  (todo ya formateado)
export async function generarReciboLuzPdf(d) {
  const { doc, y: y0 } = await nuevoDoc('RECIBO DE ENERGÍA ELÉCTRICA');
  let y = tablaIdentificacion(doc, d, y0);

  sectionHead(doc, 'LECTURAS DEL SUBMEDIDOR', y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['LECTURA ANTERIOR (kWh)', 'LECTURA ACTUAL (kWh)', 'CONSUMO (kWh)']],
    body: [[d.lecturaAnterior, d.lecturaActual, d.consumo]],
    theme: 'grid',
    styles: { fontSize: 9, halign: 'center', cellPadding: 2.6, lineColor: C.borde, lineWidth: 0.1, textColor: C.text },
    headStyles: { fillColor: C.rowHead, textColor: C.coral, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
  });
  y = doc.lastAutoTable.finalY + 9;

  sectionHead(doc, 'CÁLCULO DEL MONTO', y);
  y += 4;
  const tieneFijos = d.cargosFijos && d.cargosFijos !== '0.00' && d.cargosFijos !== '0';
  const body = [['Factura ENEE total (plaza)', d.kWhPlaza + ' kWh', d.facturaEnee]];
  if (tieneFijos) {
    body.push(['Cargos fijos del mes (comerc. + reg. + alumbrado)', 'div. entre ' + d.nLocales, d.cargosFijos]);
  }
  body.push(['Tarifa efectiva de energía', 'L/kWh', d.tarifa]);
  body.push(['Su consumo de energía', d.consumo + ' × ' + d.tarifa, d.montoEnergia]);
  if (tieneFijos) {
    body.push(['Su parte de cargos fijos', d.cargosFijos + ' ÷ ' + d.nLocales, d.fijoLocal]);
  }
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['DETALLE', 'VALOR', 'MONTO (L)']],
    body,
    foot: [[{ content: 'TOTAL A PAGAR', colSpan: 2 }, 'L  ' + d.total]],
    ...tablaCalc,
  });
  y = doc.lastAutoTable.finalY + 9;

  const nota = tieneFijos
    ? 'Método de cálculo: la energía se prorratea según el consumo del submedidor (factura ENEE neta de cargos fijos ÷ kWh totales de la plaza). Los cargos fijos (comercialización, regulación y alumbrado público) se dividen en partes iguales entre todos los locales con submedidor. Este recibo no genera ISV.'
    : 'Método de cálculo: El monto se obtiene prorrateando la factura ENEE de la plaza según el consumo real registrado en el submedidor de cada local. Este recibo no genera ISV.';
  noteBox(doc, nota, y);

  drawFooter(doc);
  doc.save(`Recibo-Luz-Local-${safe(d.local)}-${safe(d.periodo)}.pdf`);
}

// d = { reciboNum, inquilino, local, periodo, fechaEmision,
//       m2, precioUSD, tasa, isvPct, rentaBase, isvMonto, rentaTotal }  (todo ya formateado)
export async function generarReciboRentaPdf(d) {
  const { doc, y: y0 } = await nuevoDoc('RECIBO DE RENTA');
  let y = tablaIdentificacion(doc, d, y0);

  sectionHead(doc, 'DETALLE DE RENTA', y);
  y += 4;
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['DETALLE', 'VALOR', 'MONTO (L)']],
    body: [
      ['Área arrendada', d.m2 + ' m²', '—'],
      ['Precio por m²', '$ ' + d.precioUSD + ' / m²', '—'],
      ['Tipo de cambio BCH (venta)', 'L ' + d.tasa + ' / US$', '—'],
      ['Base (' + d.m2 + ' × $' + d.precioUSD + ' × ' + d.tasa + ')', '', d.rentaBase],
      ['ISV (' + d.isvPct + '%)', 'L ' + d.rentaBase + ' × ' + d.isvPct + '%', d.isvMonto],
    ],
    foot: [[{ content: 'TOTAL A PAGAR', colSpan: 2 }, 'L  ' + d.rentaTotal]],
    ...tablaCalc,
  });
  y = doc.lastAutoTable.finalY + 9;

  noteBox(doc, 'Método de cálculo: Renta mensual calculada sobre ' + d.m2 + ' m² al precio pactado de US$' + d.precioUSD + '/m², convertido al tipo de cambio BCH (venta) vigente de L ' + d.tasa + '/US$. ISV (' + d.isvPct + '%) incluido en el total.', y);

  drawFooter(doc);
  doc.save(`Recibo-Renta-Local-${safe(d.local)}-${safe(d.periodo)}.pdf`);
}
