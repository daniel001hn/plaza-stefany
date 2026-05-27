// Genera el Manual del Inquilino en PDF, con membrete D&L.
// Uso: node scripts/generar-manual-inquilino.cjs
// Output: Manual-Inquilino-Plaza-Stefany.pdf (en raíz del proyecto)

const { jsPDF } = require('jspdf')
const fs = require('fs')
const path = require('path')

const MARGIN = 16  // mm
const HEADER_RATIO = 300 / 1800

const C = {
  text: [51, 51, 51],
  light: [85, 85, 85],
  muted: [120, 120, 128],
  teal: [30, 122, 138],
  tealDark: [21, 95, 110],
  coral: [243, 122, 114],
  bgLight: [248, 249, 251],
  bgAccent: [240, 247, 249],
  accent: [99, 102, 241],
}

function readMembrete() {
  const file = path.join(__dirname, '..', 'public', 'membrete-header.png')
  const buf = fs.readFileSync(file)
  return 'data:image/png;base64,' + buf.toString('base64')
}

function addHeader(doc, membrete) {
  const pw = doc.internal.pageSize.getWidth()
  const imgH = pw * HEADER_RATIO
  doc.addImage(membrete, 'PNG', 0, 0, pw, imgH, undefined, 'SLOW')
  return imgH
}

function addFooter(doc, pageNum, totalPages) {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const fh = 13
  doc.setFillColor(...C.tealDark)
  doc.rect(0, ph - fh, pw, fh, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('+504 9462-8618    |    soluciones_dyl@yahoo.com    |    Res. Altos de Venecia 1', pw / 2, ph - fh / 2 - 0.5, { align: 'center' })
  doc.setFontSize(7)
  doc.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - fh / 2 + 3, { align: 'center' })
}

function sectionTitle(doc, num, txt, y) {
  const pw = doc.internal.pageSize.getWidth()
  // Bloque numerado
  doc.setFillColor(...C.accent)
  doc.roundedRect(MARGIN, y - 4.5, 8, 7, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(String(num), MARGIN + 4, y + 0.5, { align: 'center' })
  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.text)
  doc.text(txt, MARGIN + 11, y + 0.5)
  doc.setDrawColor(...C.accent)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y + 4.5, pw - MARGIN, y + 4.5)
  return y + 11
}

function paragraph(doc, txt, y, opts = {}) {
  const pw = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.size || 10)
  doc.setTextColor(...(opts.color || C.text))
  const maxWidth = pw - 2 * MARGIN - (opts.indent || 0)
  const lines = doc.splitTextToSize(txt, maxWidth)
  lines.forEach((line, i) => {
    doc.text(line, MARGIN + (opts.indent || 0), y + i * (opts.lineHeight || 4.6))
  })
  return y + lines.length * (opts.lineHeight || 4.6) + (opts.gap || 0)
}

function bullet(doc, txt, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.accent)
  doc.text('•', MARGIN + 3, y)
  return paragraph(doc, txt, y, { indent: 8 })
}

function box(doc, lines, y, color = C.bgAccent, borderColor = C.accent) {
  const pw = doc.internal.pageSize.getWidth()
  const boxW = pw - 2 * MARGIN
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const allLines = []
  lines.forEach(line => {
    const wrapped = doc.splitTextToSize(line.text || line, boxW - 12)
    wrapped.forEach((l, i) => allLines.push({ text: l, bold: line.bold && i === 0 }))
  })
  const boxH = allLines.length * 4.5 + 8
  doc.setFillColor(...color)
  doc.roundedRect(MARGIN, y, boxW, boxH, 2, 2, 'F')
  doc.setDrawColor(...borderColor)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN, y, boxW, boxH, 2, 2, 'S')
  doc.setTextColor(...C.text)
  allLines.forEach((l, i) => {
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal')
    doc.text(l.text, MARGIN + 6, y + 5.5 + i * 4.5)
  })
  return y + boxH + 4
}

// ────────────────────────────────────────────────────────────
// Build the doc
// ────────────────────────────────────────────────────────────

const doc = new jsPDF({ unit: 'mm', format: 'letter' })
const membrete = readMembrete()
const pw = doc.internal.pageSize.getWidth()
const ph = doc.internal.pageSize.getHeight()

// ───── PORTADA ─────
let y = addHeader(doc, membrete)
y += 25

doc.setFont('helvetica', 'bold')
doc.setFontSize(28)
doc.setTextColor(...C.tealDark)
doc.text('Manual del Inquilino', pw / 2, y, { align: 'center' })
y += 12
doc.setFontSize(18)
doc.setTextColor(...C.text)
doc.text('Plaza Stefany', pw / 2, y, { align: 'center' })
y += 8
doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.setTextColor(...C.light)
doc.text('Portal de acceso para inquilinos', pw / 2, y, { align: 'center' })
y += 20

// Caja "Para qué sirve esta app"
doc.setFillColor(...C.bgAccent)
doc.setDrawColor(...C.accent)
doc.setLineWidth(0.4)
doc.roundedRect(MARGIN + 10, y, pw - 2 * MARGIN - 20, 60, 3, 3, 'FD')
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.accent)
doc.text('¿PARA QUÉ SIRVE ESTA APP?', MARGIN + 16, y + 8)
doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(...C.text)
const intro = 'Esta es tu portal personal de Plaza Stefany. Acá podés ver cuánto debés cada mes, descargar tus recibos de renta y luz, y subir el comprobante cuando hacés tu pago. Todo desde tu celular o computadora.'
const introLines = doc.splitTextToSize(intro, pw - 2 * MARGIN - 32)
introLines.forEach((l, i) => doc.text(l, MARGIN + 16, y + 18 + i * 5))

y = ph - 50
doc.setFont('helvetica', 'bold')
doc.setFontSize(10)
doc.setTextColor(...C.tealDark)
doc.text('Tu acceso:', pw / 2, y, { align: 'center' })
y += 6
doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.setTextColor(...C.text)
doc.text('plaza-stefany.vercel.app', pw / 2, y, { align: 'center' })
y += 6
doc.setFontSize(9)
doc.setTextColor(...C.muted)
doc.text('Tu usuario y contraseña los recibiste por WhatsApp de William', pw / 2, y, { align: 'center' })

addFooter(doc, 1, 4)

// ───── PÁGINA 2: ENTRAR Y NAVEGAR ─────
doc.addPage()
y = addHeader(doc, membrete)
y += 12

y = sectionTitle(doc, 1, 'Cómo entrar a la app', y)

y = paragraph(doc, 'Desde el navegador de tu celular o computadora:', y, { gap: 3 })
y = bullet(doc, 'Abrí esta dirección: plaza-stefany.vercel.app', y)
y = bullet(doc, 'En "Usuario" escribí el que te dio William (ejemplo: tatys)', y)
y = bullet(doc, 'En "Contraseña" escribí la que recibiste', y)
y = bullet(doc, 'Clickeá "Continuar"', y)
y += 4

y = box(doc, [
  { text: '⚠ IMPORTANTE — Mantené tu contraseña segura', bold: true },
  'No la compartas con nadie. Si necesitás cambiarla o la perdiste, escribile a William al WhatsApp +504 9462-8618.',
], y, [255, 248, 230], [212, 168, 0])

y += 5

y = sectionTitle(doc, 2, 'Lo que vas a ver al entrar', y)

y = paragraph(doc, 'Cuando entrás, te aparece tu información:', y, { gap: 3 })
y = bullet(doc, 'Tu nombre y número de local (arriba a la izquierda)', y)
y = bullet(doc, 'La renta mensual que te corresponde, con el cálculo detallado', y)
y = bullet(doc, 'El monto de luz del mes (si ya está la factura ENEE cargada)', y)
y = bullet(doc, 'Tu historial completo de meses anteriores con estado de cada pago', y)
y = bullet(doc, 'Botones para descargar recibos y subir comprobantes', y)
y += 4

y = box(doc, [
  { text: '🔒 Solo vos ves tus datos', bold: true },
  'Aunque la app maneja todos los locales, vos únicamente ves los tuyos. Los otros inquilinos no pueden ver lo tuyo, ni vos lo de ellos.',
], y, C.bgAccent, C.accent)

addFooter(doc, 2, 4)

// ───── PÁGINA 3: PAGAR Y SUBIR COMPROBANTE ─────
doc.addPage()
y = addHeader(doc, membrete)
y += 12

y = sectionTitle(doc, 3, 'Cómo pagar y subir el comprobante', y)

y = paragraph(doc, 'El proceso es:', y, { gap: 4 })

doc.setFont('helvetica', 'bold')
doc.setFontSize(10.5)
doc.setTextColor(...C.tealDark)
doc.text('Paso 1 — Hacer la transferencia', MARGIN, y); y += 5
y = paragraph(doc, 'Transferí el monto correspondiente a la cuenta que coordinás con William. La app NO procesa pagos; solo registra que ya los hiciste.', y, { indent: 4, gap: 3 })

doc.setFont('helvetica', 'bold')
doc.setFontSize(10.5)
doc.setTextColor(...C.tealDark)
doc.text('Paso 2 — Sacar foto al comprobante', MARGIN, y); y += 5
y = paragraph(doc, 'Tomá foto del comprobante (el voucher de la transferencia, o screenshot de la app del banco). Asegurate que se lea claro el monto y la fecha.', y, { indent: 4, gap: 3 })

doc.setFont('helvetica', 'bold')
doc.setFontSize(10.5)
doc.setTextColor(...C.tealDark)
doc.text('Paso 3 — Subir el comprobante en la app', MARGIN, y); y += 5
y = paragraph(doc, 'En la app, buscá el mes que estás pagando. Vas a ver botones: "Subir comprobante de Renta" y "Subir comprobante de Luz". Clickealos y elegí la foto. Listo.', y, { indent: 4, gap: 4 })

y = box(doc, [
  { text: '✓ Lo que pasa cuando subís un comprobante', bold: true },
  '• Se guarda con fecha y hora exacta de cuándo lo subiste',
  '• William lo ve al toque y confirma tu pago',
  '• La app marca ese pago como "✅ Pagado" automáticamente cuando William lo apruebe',
], y, [232, 248, 235], [52, 199, 89])

y += 4

y = sectionTitle(doc, 4, 'Cómo descargar tus recibos', y)

y = paragraph(doc, 'Para cada mes vas a ver 2 botones de descarga:', y, { gap: 3 })
y = bullet(doc, '"Descargar recibo de Renta" → te baja el PDF de tu renta del mes', y)
y = bullet(doc, '"Descargar recibo de Luz" → te baja el PDF de tu consumo eléctrico', y)
y += 3
y = paragraph(doc, 'Los recibos tienen el formato oficial de D & L Soluciones con todos los datos para tu contabilidad: monto, ISV, fecha, número de recibo, y las lecturas del medidor (en el caso de luz).', y, { gap: 4 })

addFooter(doc, 3, 4)

// ───── PÁGINA 4: INSTALAR + AYUDA ─────
doc.addPage()
y = addHeader(doc, membrete)
y += 12

y = sectionTitle(doc, 5, 'Instalá la app en tu pantalla de inicio', y)

y = paragraph(doc, 'Para acceder rápido sin abrir el navegador cada vez, podés agregar la app a la pantalla de inicio de tu celular. Queda como cualquier otra app.', y, { gap: 4 })

doc.setFont('helvetica', 'bold')
doc.setFontSize(10.5)
doc.setTextColor(...C.tealDark)
doc.text('En iPhone (Safari):', MARGIN, y); y += 5
y = bullet(doc, 'Abrí plaza-stefany.vercel.app en Safari (NO en Chrome ni otro navegador)', y)
y = bullet(doc, 'Clickeá el botón "Compartir" abajo (cuadrito con flecha hacia arriba)', y)
y = bullet(doc, 'Deslizá las opciones hasta encontrar "Agregar a pantalla de inicio"', y)
y = bullet(doc, 'Confirmá. Te aparece un ícono nuevo en tu pantalla', y)
y += 3

doc.setFont('helvetica', 'bold')
doc.setFontSize(10.5)
doc.setTextColor(...C.tealDark)
doc.text('En Android (Chrome):', MARGIN, y); y += 5
y = bullet(doc, 'Abrí plaza-stefany.vercel.app en Chrome', y)
y = bullet(doc, 'Tocá los 3 puntitos arriba a la derecha (⋮)', y)
y = bullet(doc, 'Buscá "Instalar app" o "Agregar a pantalla de inicio"', y)
y = bullet(doc, 'Confirmá. El ícono queda como una app normal', y)
y += 5

y = sectionTitle(doc, 6, 'Si algo falla', y)

y = box(doc, [
  { text: '🔄 La app no carga o se ve rara', bold: true },
  'Cerrá el navegador completamente y volvé a abrir. Si seguís con problema, probá apretar Ctrl+Shift+R (computadora) o cerrá la pestaña y entrá de nuevo (celular).',
], y, C.bgLight, C.muted)

y = box(doc, [
  { text: '🔑 Olvidaste tu contraseña', bold: true },
  'Escribile a William por WhatsApp al +504 9462-8618. Te genera una nueva en el momento.',
], y, C.bgLight, C.muted)

y = box(doc, [
  { text: '📄 Necesito el recibo y no me lo descarga', bold: true },
  'Si pasaron varias horas sin actualización de tasa de cambio del día, el sistema bloquea descargas para no darte un monto incorrecto. Mandale mensaje a William para que te lo genere manualmente.',
], y, C.bgLight, C.muted)

y = box(doc, [
  { text: '💬 Cualquier otra duda', bold: true },
  'William: +504 9462-8618 (WhatsApp) — soluciones_dyl@yahoo.com',
], y, [232, 248, 235], [52, 199, 89])

addFooter(doc, 4, 4)

// ───── SAVE ─────
const out = path.join(__dirname, '..', 'Manual-Inquilino-Plaza-Stefany.pdf')
const buf = Buffer.from(doc.output('arraybuffer'))
fs.writeFileSync(out, buf)
console.log(`✅ Manual generado: ${out}`)
console.log(`   ${(buf.length / 1024).toFixed(0)} KB · 4 páginas`)
