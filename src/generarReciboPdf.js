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
  doc.text('STEFANY PLAZA', pw / 2, y, { align: 'center', charSpace: 0.8 });
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

// Detecta si estamos en móvil. doc.save() en iOS Safari reemplaza la página
// con el PDF y al volver re-monta la app entera (perdiendo estado/scroll).
// En móvil mejor abrir en pestaña nueva con bloburl — al cerrar la pestaña
// el usuario vuelve a la app intacta.
function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function entregarPdf(doc, filename) {
  if (isMobile()) {
    // Abrir en pestaña nueva — el visor del navegador permite guardar/compartir
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      // Pop-up bloqueado → caer al download tradicional
      doc.save(filename);
    } else {
      // Liberar el blob después de un rato (no muy rápido, el visor lo necesita)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } else {
    doc.save(filename);
  }
}

// Agrega página 2 al PDF con las 2 fotos del submedidor (si están presentes).
// fotoAnterior/fotoActual son data URLs base64 (image/jpeg) generadas en
// PaymentModal con compresión a 1200px. Si alguna falta, no se agrega la página.
// Convierte una imagen a data URL para jsPDF. Si ya es base64 (data:) la deja;
// si es una URL de Storage, la baja y la convierte (evita problemas de CORS en addImage).
async function toDataUrl(src) {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function agregarPaginaFotos(doc, d) {
  if (!d.fotoMedidorAnterior && !d.fotoMedidorActual) return;
  doc.addPage();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const img = await loadHeaderImg();
  const imgH = pw * HEADER_RATIO;
  doc.addImage(img, 'PNG', 0, 0, pw, imgH, undefined, 'SLOW');

  let y = imgH + 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.text);
  doc.text('FOTOS DEL SUBMEDIDOR', pw / 2, y, { align: 'center', charSpace: 0.5 });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.light);
  doc.text(`Local ${d.local} · ${d.periodo}`, pw / 2, y, { align: 'center' });
  y += 8;

  // Cada foto ocupa ~ mitad disponible del ancho útil, max altura tal que entren las 2 + footer
  const usable = pw - 2 * MARGIN;
  const fotoW = usable;
  const labelH = 7;
  const footerSpace = 22; // espacio para footer + nota
  const availH = ph - y - footerSpace;
  const fotoH = Math.min((availH - 2 * labelH - 6) / 2, 95);

  const dibujarFoto = (dataUrl, label, lectura, top) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.teal);
    doc.text(label, MARGIN, top);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    if (lectura != null && lectura !== '') {
      doc.text('Lectura: ' + lectura + ' kWh', pw - MARGIN, top, { align: 'right' });
    }
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'JPEG', MARGIN, top + 2, fotoW, fotoH, undefined, 'SLOW');
      } catch (e) {
        doc.setTextColor(...C.light);
        doc.text('(foto no disponible)', pw / 2, top + fotoH / 2, { align: 'center' });
      }
    } else {
      doc.setFillColor(245, 245, 247);
      doc.rect(MARGIN, top + 2, fotoW, fotoH, 'F');
      doc.setTextColor(...C.light);
      doc.text('(sin foto)', pw / 2, top + fotoH / 2 + 2, { align: 'center' });
    }
  };

  const [anteriorData, actualData] = await Promise.all([
    toDataUrl(d.fotoMedidorAnterior),
    toDataUrl(d.fotoMedidorActual),
  ]);
  dibujarFoto(anteriorData, 'LECTURA ANTERIOR', d.lecturaAnterior, y);
  dibujarFoto(actualData, 'LECTURA ACTUAL', d.lecturaActual, y + fotoH + labelH + 4);

  drawFooter(doc);
}

// d = { reciboNum, inquilino, local, periodo, fechaEmision,
//       lecturaAnterior, lecturaActual, consumo,
//       kWhPlaza, facturaEnee, tarifa, montoEnergia,
//       cargosFijos, fijoLocal, nLocales, total,
//       fotoMedidorAnterior?, fotoMedidorActual? }  (todo ya formateado)
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
  const tieneFijos = d.fijoLocal && d.fijoLocal !== '0.00' && d.fijoLocal !== '0';
  const body = [];
  if (tieneFijos) {
    body.push(['Cargos por servicios (comerc. + reg. + alumbrado)', '', d.fijoLocal]);
  }
  body.push(['Tarifa efectiva por kWh', 'L/kWh', d.tarifa]);
  body.push(['Consumo del local', d.consumo + ' × ' + d.tarifa, d.montoEnergia]);
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
    ? 'Los cargos por servicios incluyen comercialización, regulación y alumbrado público. La energía se cobra a la tarifa efectiva del mes según el consumo del submedidor del local. Este recibo no genera ISV.'
    : 'El monto corresponde al consumo de energía registrado en el submedidor del local, a la tarifa efectiva del mes. Este recibo no genera ISV.';
  noteBox(doc, nota, y);

  drawFooter(doc);

  await agregarPaginaFotos(doc, d);

  entregarPdf(doc, `Recibo-Luz-Local-${safe(d.local)}-${safe(d.periodo)}.pdf`);
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
  entregarPdf(doc, `Recibo-Renta-Local-${safe(d.local)}-${safe(d.periodo)}.pdf`);
}
