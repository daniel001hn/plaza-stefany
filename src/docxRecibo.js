// Fase 1: descarga de recibo como .docx (template + PizZip).
// El módulo expone funciones por tipo de recibo (`descargarReciboRenta`, etc.)
// que reciben un objeto plano de datos ya formateados y disparan la descarga.
//
// Fase 2 (planeada): este mismo módulo cambiará a generación directa de PDF
// (jsPDF u otro) — la firma de las funciones se mantendrá igual, así
// `InquilinoView.jsx` no necesita cambios cuando migremos.

import PizZip from 'pizzip'

const TEMPLATE_URL_RENTA = '/templates/recibo-renta-template.docx'

const PLACEHOLDERS_RENTA = [
  'reciboNum', 'inquilino', 'local', 'periodo', 'fechaEmision',
  'm2', 'precioUSD', 'tasa', 'isvPct',
  'rentaBase', 'isvMonto', 'rentaTotal',
]

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const escapeXml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

async function loadTemplate(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No pude cargar template ${url}: ${r.status} ${r.statusText}`)
  return r.arrayBuffer()
}

function fillTemplate(buffer, placeholders, data) {
  const zip = new PizZip(buffer)
  let xml = zip.file('word/document.xml').asText()
  for (const key of placeholders) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`Falta valor para placeholder {${key}}`)
    }
    xml = xml.split(`{${key}}`).join(escapeXml(data[key]))
  }
  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'blob', mimeType: DOCX_MIME })
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const safeFilename = (s) => String(s).replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, '_')

export async function descargarReciboRenta(data) {
  const buffer = await loadTemplate(TEMPLATE_URL_RENTA)
  const blob = fillTemplate(buffer, PLACEHOLDERS_RENTA, data)
  const filename = `Recibo-Renta-${safeFilename(data.periodo)}-Local-${safeFilename(data.local)}.docx`
  triggerDownload(blob, filename)
}
