// Generador de recibo de luz como .docx.
// Llena public/recibo-luz-template.docx (membrete oficial D&L) con los datos
// del consumo y dispara la descarga directa. Reemplaza el flujo HTML→print
// del antiguo ReciboLuzModal.

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmt = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmt2 = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

// Recibe el mismo payload que antes alimentaba a ReciboLuzModal.
export async function generarReciboLuzDocx({ local, data, prevData, factura, tarifaEfectiva, monthIdx, year }) {
  // Cálculo idéntico al de ReciboLuzModal
  const lecturaAnterior = prevData?.lecturaActual ?? local.lecturaInicial ?? 0;
  const lecturaActual = data?.lecturaActual ?? 0;
  const consumo = lecturaActual - lecturaAnterior;
  const tarifa = tarifaEfectiva || 0;
  const montoEnergia = consumo * tarifa;
  const totalPagar = montoEnergia;
  const reciboNum = `PS-${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(local.numero || '').padStart(3, '0')}`;
  const fechaEmision = new Date().toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' });
  const kWhPlaza = tarifa > 0 ? Math.round((factura?.montoTotal || 0) / tarifa) : 0;

  const response = await fetch('/recibo-luz-template.docx');
  if (!response.ok) throw new Error(`No pude cargar la plantilla del recibo (HTTP ${response.status})`);
  const buffer = await response.arrayBuffer();

  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    reciboNum,
    inquilino: local.inquilino || local.nombre || 'N/A',
    local: `Local ${local.numero}`,
    periodo: `${MESES_LARGO[monthIdx]} ${year}`,
    fechaEmision,
    lecturaAnterior: fmt(lecturaAnterior),
    lecturaActual: fmt(lecturaActual),
    consumo: fmt(consumo),
    kWhPlaza: fmt(kWhPlaza),
    facturaEnee: fmt2(factura?.montoTotal || 0),
    tarifa: fmt2(tarifa),
    montoEnergia: fmt2(montoEnergia),
    total: fmt2(totalPagar),
  });

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  saveAs(blob, `Recibo-Luz-Local-${local.numero}-${MESES_LARGO[monthIdx]}-${year}.docx`);
}
