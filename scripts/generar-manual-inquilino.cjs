// Genera el Manual del Inquilino en PDF con screenshots reales + diseño aesthetic.
// Uso: node scripts/generar-manual-inquilino.cjs
// Pre-req: node scripts/capturar-screenshots.cjs (genera los PNG)
// Output: Manual-Inquilino-Plaza-Stefany.pdf

const { jsPDF } = require('jspdf')
const fs = require('fs')
const path = require('path')

const MARGIN = 14  // mm
const HEADER_RATIO = 300 / 1800

// Paleta Apple-HIG style
const C = {
  text: [28, 28, 30],         // near-black
  textSec: [110, 110, 120],   // gray-2
  textTer: [142, 142, 150],   // gray-3
  white: [255, 255, 255],
  bgSoft: [248, 249, 251],
  bgCard: [255, 255, 255],
  border: [229, 229, 234],
  // Brand
  brand: [99, 102, 241],      // indigo-500
  brandDark: [79, 70, 229],   // indigo-600
  brandSoft: [238, 240, 255],
  // Semantic
  success: [52, 199, 89],
  successSoft: [232, 248, 235],
  warn: [255, 159, 10],
  warnSoft: [255, 248, 230],
  danger: [255, 59, 48],
  // Gradient cover
  g1: [99, 102, 241],
  g2: [129, 140, 248],
  g3: [196, 181, 253],
}

const SCREENS = path.join(__dirname, 'screenshots')
const readImg = (name) => 'data:image/png;base64,' + fs.readFileSync(path.join(SCREENS, name)).toString('base64')

const sc = {
  login: readImg('1-login.png'),
  loginFilled: readImg('2-login-filled.png'),
  dashTop: readImg('3-dashboard-top.png'),
  dashFull: readImg('4-dashboard-full.png'),
  historial: readImg('5-historial.png'),
}
const membrete = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'public', 'membrete-header.png')).toString('base64')

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────

function addMembrete(doc, opts = {}) {
  const pw = doc.internal.pageSize.getWidth()
  const imgH = pw * HEADER_RATIO
  doc.addImage(membrete, 'PNG', 0, 0, pw, imgH, undefined, 'SLOW')
  return imgH
}

function addFooter(doc, pageNum, totalPages) {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  // Línea sutil
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, ph - 14, pw - MARGIN, ph - 14)
  // Footer text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.textTer)
  doc.text('D&L Soluciones · Manual del Inquilino · Plaza Stefany', MARGIN, ph - 9)
  doc.text(`Página ${pageNum} de ${totalPages}`, pw - MARGIN, ph - 9, { align: 'right' })
}

// Dibuja un "phone frame" alrededor de un screenshot. Centra y escala manteniendo aspect ratio.
function phoneFrame(doc, dataUrl, cx, top, maxW, maxH) {
  // Screenshots son 390x844 ratio (iPhone 13). Mantener proporción.
  const ratio = 844 / 390
  let w = maxW
  let h = w * ratio
  if (h > maxH) { h = maxH; w = h / ratio }
  const x = cx - w / 2
  const y = top

  // Sombra (rectángulos cada vez más oscuros desplazados)
  const shadowOffsets = [{ x: 0.8, y: 1.2, a: 0.05 }, { x: 1.4, y: 2, a: 0.04 }, { x: 2.2, y: 3.2, a: 0.03 }]
  shadowOffsets.forEach(s => {
    doc.setFillColor(0, 0, 0)
    // jsPDF no soporta alpha directo en rect — usar GState
    if (doc.GState) {
      const gs = new doc.GState({ opacity: s.a })
      doc.setGState(gs)
    }
    doc.roundedRect(x + s.x, y + s.y, w, h, 4, 4, 'F')
  })
  // Reset opacity
  if (doc.GState) doc.setGState(new doc.GState({ opacity: 1 }))

  // Frame negro (bordes del teléfono)
  doc.setFillColor(20, 20, 24)
  doc.roundedRect(x - 1.5, y - 1.5, w + 3, h + 3, 5, 5, 'F')

  // Pantalla (screenshot)
  doc.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST')

  return { x, y, w, h, bottom: y + h }
}

// Tag/pill pequeño con número o icono
function chip(doc, x, y, txt, color = C.brand, textColor = C.white) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const tw = doc.getTextWidth(txt) + 6
  doc.setFillColor(...color)
  doc.roundedRect(x, y - 4, tw, 6, 1.5, 1.5, 'F')
  doc.setTextColor(...textColor)
  doc.text(txt, x + tw / 2, y + 0.3, { align: 'center' })
  return x + tw
}

// Texto multilinea con wrap. Devuelve nuevo y.
function paragraph(doc, txt, x, y, w, opts = {}) {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.size || 10)
  doc.setTextColor(...(opts.color || C.text))
  const lines = doc.splitTextToSize(txt, w)
  lines.forEach((line, i) => doc.text(line, x, y + i * (opts.lh || 4.6)))
  return y + lines.length * (opts.lh || 4.6) + (opts.gap || 0)
}

// "Step" — número grande + título + descripción
function stepBlock(doc, num, title, body, x, y, w) {
  // Círculo numerado
  doc.setFillColor(...C.brand)
  doc.circle(x + 4, y + 1.5, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.white)
  doc.text(String(num), x + 4, y + 3, { align: 'center' })

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.text)
  doc.text(title, x + 12, y + 2.5)

  // Body
  let bodyY = y + 8
  bodyY = paragraph(doc, body, x + 12, bodyY, w - 12, { size: 9.5, color: C.textSec, lh: 4.4 })
  return bodyY + 3
}

// Callout box con icono + título + body
function callout(doc, icon, title, body, x, y, w, opts = {}) {
  const bg = opts.bg || C.brandSoft
  const accent = opts.accent || C.brand
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const bodyLines = doc.splitTextToSize(body, w - 18)
  const h = 6 + 4.5 + bodyLines.length * 4 + 4
  // Fondo
  doc.setFillColor(...bg)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  // Barra izquierda
  doc.setFillColor(...accent)
  doc.roundedRect(x, y, 2, h, 1, 1, 'F')
  // Icono + título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...accent)
  doc.text(`${icon} ${title}`, x + 6, y + 6)
  // Body
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.text)
  bodyLines.forEach((l, i) => doc.text(l, x + 6, y + 12 + i * 4))
  return y + h + 3
}

// Page section title
function pageTitle(doc, eyebrow, title, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.brand)
  doc.text(eyebrow.toUpperCase(), MARGIN, y, { charSpace: 1.2 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...C.text)
  doc.text(title, MARGIN, y + 9)
  // Línea decorativa
  doc.setDrawColor(...C.brand)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 13, MARGIN + 18, y + 13)
  return y + 22
}

// ────────────────────────────────────────────────────────────
// PAGES
// ────────────────────────────────────────────────────────────

const doc = new jsPDF({ unit: 'mm', format: 'letter' })
const pw = doc.internal.pageSize.getWidth()
const ph = doc.internal.pageSize.getHeight()
const TOTAL_PAGES = 6

// ═══════════════════════════════════════════════════════════
// PÁGINA 1 — COVER
// ═══════════════════════════════════════════════════════════

// Gradient simulado: 30 rectangles de color interpolado
for (let i = 0; i < 30; i++) {
  const t = i / 29
  const r = Math.round(C.g1[0] * (1 - t) + C.g3[0] * t)
  const g = Math.round(C.g1[1] * (1 - t) + C.g3[1] * t)
  const b = Math.round(C.g1[2] * (1 - t) + C.g3[2] * t)
  doc.setFillColor(r, g, b)
  doc.rect(0, (ph / 30) * i, pw, ph / 30 + 0.5, 'F')
}

// Sobre-overlay sutil para profundidad
if (doc.GState) {
  doc.setGState(new doc.GState({ opacity: 0.15 }))
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pw, ph / 3, 'F')
  doc.setGState(new doc.GState({ opacity: 1 }))
}

// Logo membrete arriba (pequeño, sobre el gradient)
const memH = pw * HEADER_RATIO * 0.7
doc.addImage(membrete, 'PNG', pw / 2 - (pw * 0.7) / 2, 12, pw * 0.7, memH, undefined, 'SLOW')

// Big title
let y = memH + 30
doc.setFont('helvetica', 'bold')
doc.setFontSize(36)
doc.setTextColor(...C.white)
doc.text('Manual del Inquilino', pw / 2, y, { align: 'center' })

y += 11
doc.setFont('helvetica', 'normal')
doc.setFontSize(18)
doc.setTextColor(255, 255, 255)
if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.85 }))
doc.text('Plaza Stefany', pw / 2, y, { align: 'center' })
if (doc.GState) doc.setGState(new doc.GState({ opacity: 1 }))

// Phone preview de login en el centro
phoneFrame(doc, sc.login, pw / 2, y + 12, 65, 110)

// CTA card abajo
const ctaY = ph - 55
doc.setFillColor(255, 255, 255)
if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.95 }))
doc.roundedRect(MARGIN + 8, ctaY, pw - 2 * MARGIN - 16, 38, 4, 4, 'F')
if (doc.GState) doc.setGState(new doc.GState({ opacity: 1 }))

doc.setFont('helvetica', 'bold')
doc.setFontSize(9)
doc.setTextColor(...C.brand)
doc.text('TU ACCESO A LA APP', pw / 2, ctaY + 8, { align: 'center', charSpace: 1.5 })

doc.setFont('helvetica', 'bold')
doc.setFontSize(16)
doc.setTextColor(...C.text)
doc.text('plaza-stefany.vercel.app', pw / 2, ctaY + 18, { align: 'center' })

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...C.textSec)
doc.text('Tu usuario y contraseña los recibiste por WhatsApp', pw / 2, ctaY + 26, { align: 'center' })
doc.text('Si los perdiste: William +504 9462-8618', pw / 2, ctaY + 31, { align: 'center' })

// ═══════════════════════════════════════════════════════════
// PÁGINA 2 — CÓMO ENTRAR
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = pageTitle(doc, 'Paso 1', 'Cómo entrar a la app', 20)

// Layout 2 columnas: phone a la izquierda, instructions a la derecha
const phLeft = phoneFrame(doc, sc.loginFilled, MARGIN + 32, y, 60, 110)
const txtX = phLeft.x + phLeft.w + 14
const txtW = pw - txtX - MARGIN

let ty = y + 6
ty = paragraph(doc, 'Desde el navegador de tu celular o computadora:', txtX, ty, txtW, { size: 10.5, gap: 4 })

ty = stepBlock(doc, 1, 'Abrí la app', 'En el navegador escribí:\nplaza-stefany.vercel.app', txtX, ty, txtW)
ty = stepBlock(doc, 2, 'Escribí tu usuario', 'Ejemplo: tatys, centrodsd, fenixstorehn (lo que te dieron).', txtX, ty, txtW)
ty = stepBlock(doc, 3, 'Escribí tu contraseña', 'La que recibiste por WhatsApp.', txtX, ty, txtW)
ty = stepBlock(doc, 4, 'Continuar', 'Click en el botón "Continuar" y entrás.', txtX, ty, txtW)

ty = callout(doc, '⚠', 'Mantené tu contraseña segura', 'No la compartas con nadie. Si la perdiste, escribile a William al WhatsApp +504 9462-8618 y te genera una nueva en el momento.', txtX, ty + 2, txtW, { bg: C.warnSoft, accent: C.warn })

addFooter(doc, 2, TOTAL_PAGES)

// ═══════════════════════════════════════════════════════════
// PÁGINA 3 — TU DASHBOARD (lo que ves)
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = pageTitle(doc, 'Paso 2', 'Lo que ves al entrar', 20)

const phDash = phoneFrame(doc, sc.dashTop, MARGIN + 32, y, 60, 110)
const dtxtX = phDash.x + phDash.w + 14
const dtxtW = pw - dtxtX - MARGIN

ty = y + 6
ty = paragraph(doc, 'Apenas entrás, ves toda tu información del mes:', dtxtX, ty, dtxtW, { size: 10.5, gap: 5 })

// Lista visual con bullets de color
const items = [
  { color: C.brand, label: 'Tu nombre y local', body: 'Arriba a la izquierda: "Tatys Tienda" · Local 1 · 84 m²' },
  { color: C.success, label: 'Renta del mes', body: 'El monto exacto con su cálculo: m² × $/m² × tipo de cambio + ISV' },
  { color: C.warn, label: 'Historial de meses', body: 'Cada mes con estado: Pagada, Pendiente, No disponible (luz)' },
  { color: C.brand, label: 'Botones de acción', body: 'Descargar recibos · Subir comprobantes · Ver detalles' },
]

items.forEach(it => {
  doc.setFillColor(...it.color)
  doc.circle(dtxtX + 1.5, ty - 1, 1.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.text)
  doc.text(it.label, dtxtX + 6, ty)
  ty = paragraph(doc, it.body, dtxtX + 6, ty + 3, dtxtW - 6, { size: 9, color: C.textSec, lh: 4, gap: 4 })
})

ty = callout(doc, '🔒', 'Solo vos ves tus datos', 'Aunque la app maneja todos los locales de la plaza, vos únicamente ves los tuyos. Los demás inquilinos no pueden ver tu información, ni vos la de ellos.', dtxtX, ty + 2, dtxtW)

addFooter(doc, 3, TOTAL_PAGES)

// ═══════════════════════════════════════════════════════════
// PÁGINA 4 — CÓMO PAGAR Y SUBIR COMPROBANTE
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = pageTitle(doc, 'Paso 3', 'Cómo pagar y subir comprobante', 20)

// Phone con historial mostrando los botones
const phPay = phoneFrame(doc, sc.historial, MARGIN + 32, y, 60, 110)
const ptxtX = phPay.x + phPay.w + 14
const ptxtW = pw - ptxtX - MARGIN

ty = y + 6
ty = paragraph(doc, 'El proceso completo, de principio a fin:', ptxtX, ty, ptxtW, { size: 10.5, gap: 4 })

ty = stepBlock(doc, 1, 'Hacer la transferencia', 'Transferí el monto a la cuenta que coordinás con William. La app no procesa pagos — solo los registra.', ptxtX, ty, ptxtW)
ty = stepBlock(doc, 2, 'Sacar foto al comprobante', 'Tomá foto del voucher o screenshot de la app del banco. Asegurate que se lea el monto y la fecha.', ptxtX, ty, ptxtW)
ty = stepBlock(doc, 3, 'Subir en la app', 'En el mes correspondiente, click en "📎 Subir comprobante" (renta o luz). Elegí la foto. Listo.', ptxtX, ty, ptxtW)

ty = callout(doc, '✓', 'Qué pasa cuando subís un comprobante', 'Se guarda con fecha y hora exacta. William lo ve al toque, confirma tu pago, y la app marca ese mes como "✅ Pagada".', ptxtX, ty + 2, ptxtW, { bg: C.successSoft, accent: C.success })

addFooter(doc, 4, TOTAL_PAGES)

// ═══════════════════════════════════════════════════════════
// PÁGINA 5 — DESCARGAR RECIBOS
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = pageTitle(doc, 'Paso 4', 'Descargar tus recibos', 20)

ty = paragraph(doc, 'En cada mes del historial vas a ver botones para bajar tus recibos oficiales en PDF.', MARGIN, y + 2, pw - 2 * MARGIN, { size: 11, gap: 8 })

// 2 mini-cards: recibo renta y recibo luz
const cardW = (pw - 2 * MARGIN - 6) / 2
const cardH = 50
const c1X = MARGIN
const c2X = MARGIN + cardW + 6
const cY = ty

// Card 1: Renta
doc.setFillColor(...C.brandSoft)
doc.roundedRect(c1X, cY, cardW, cardH, 3, 3, 'F')
doc.setDrawColor(...C.brand)
doc.setLineWidth(0.3)
doc.roundedRect(c1X, cY, cardW, cardH, 3, 3, 'S')
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.brand)
doc.text('📄 Recibo de Renta', c1X + 5, cY + 8)
doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...C.text)
const r1Lines = doc.splitTextToSize('PDF oficial con tu renta del mes: m², precio por metro, tipo de cambio, ISV, total. Listo para tu contabilidad.', cardW - 10)
r1Lines.forEach((l, i) => doc.text(l, c1X + 5, cY + 16 + i * 4))

// Card 2: Luz
doc.setFillColor(...C.warnSoft)
doc.roundedRect(c2X, cY, cardW, cardH, 3, 3, 'F')
doc.setDrawColor(...C.warn)
doc.setLineWidth(0.3)
doc.roundedRect(c2X, cY, cardW, cardH, 3, 3, 'S')
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.warn)
doc.text('⚡ Recibo de Luz', c2X + 5, cY + 8)
doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...C.text)
const r2Lines = doc.splitTextToSize('PDF con lecturas del submedidor (anterior y actual), consumo en kWh, tarifa, cargos fijos y monto.', cardW - 10)
r2Lines.forEach((l, i) => doc.text(l, c2X + 5, cY + 16 + i * 4))

ty = cY + cardH + 10

ty = callout(doc, '💡', '¿Cuándo está disponible?', 'El recibo de renta está siempre disponible. El de luz aparece cuando William carga la factura ENEE del mes (suele ser entre el 11 y el 15).', MARGIN, ty, pw - 2 * MARGIN, { bg: C.brandSoft, accent: C.brand })

ty = callout(doc, '⚠', 'Bloqueo por tasa desactualizada', 'Si la tasa de cambio del día no se actualizó (cosa rara), la app bloquea descargas para no darte un monto incorrecto. En ese caso, te ofrece pedirle el recibo a William por WhatsApp con un mensaje pre-armado.', MARGIN, ty, pw - 2 * MARGIN, { bg: C.warnSoft, accent: C.warn })

addFooter(doc, 5, TOTAL_PAGES)

// ═══════════════════════════════════════════════════════════
// PÁGINA 6 — INSTALAR + AYUDA
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = pageTitle(doc, 'Bonus', 'Instalá la app y ayuda', 20)

ty = paragraph(doc, 'Para acceder rápido sin abrir el navegador cada vez, podés agregarla a la pantalla de inicio de tu celular. Queda igual que una app del App Store / Play Store.', MARGIN, y + 2, pw - 2 * MARGIN, { size: 10, gap: 7 })

// 2 columnas: iPhone | Android
const iCol = (pw - 2 * MARGIN - 4) / 2
// iPhone
doc.setFillColor(...C.bgSoft)
doc.roundedRect(MARGIN, ty, iCol, 52, 3, 3, 'F')
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.text)
doc.text('iPhone (Safari)', MARGIN + 5, ty + 7)
doc.setFont('helvetica', 'normal')
doc.setFontSize(8.5)
doc.setTextColor(...C.textSec)
const iLines = [
  '1. Abrí plaza-stefany.vercel.app',
  '   en Safari (no Chrome)',
  '2. Tocá el botón Compartir',
  '   (cuadrito con flecha ↑)',
  '3. "Agregar a pantalla de inicio"',
  '4. Confirmá. Listo ✓',
]
iLines.forEach((l, i) => doc.text(l, MARGIN + 5, ty + 14 + i * 4.5))

// Android
const aX = MARGIN + iCol + 4
doc.setFillColor(...C.bgSoft)
doc.roundedRect(aX, ty, iCol, 52, 3, 3, 'F')
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.text)
doc.text('Android (Chrome)', aX + 5, ty + 7)
doc.setFont('helvetica', 'normal')
doc.setFontSize(8.5)
doc.setTextColor(...C.textSec)
const aLines = [
  '1. Abrí plaza-stefany.vercel.app',
  '   en Chrome',
  '2. Tocá los 3 puntos (⋮) arriba',
  '   a la derecha',
  '3. "Instalar app" / "Agregar a',
  '    pantalla de inicio"',
]
aLines.forEach((l, i) => doc.text(l, aX + 5, ty + 14 + i * 4.5))

ty += 60

// Ayuda
doc.setFont('helvetica', 'bold')
doc.setFontSize(14)
doc.setTextColor(...C.text)
doc.text('¿Necesitás ayuda?', MARGIN, ty)
ty += 7

ty = callout(doc, '🔄', 'La app no carga o se ve rara', 'Cerrá el navegador completamente y volvé a abrir. En computadora: Ctrl+Shift+R.', MARGIN, ty, pw - 2 * MARGIN, { bg: C.bgSoft, accent: C.textSec })
ty = callout(doc, '🔑', 'Olvidaste tu contraseña', 'WhatsApp a William: +504 9462-8618. Te genera una nueva en el momento.', MARGIN, ty, pw - 2 * MARGIN, { bg: C.bgSoft, accent: C.textSec })
ty = callout(doc, '📞', 'Cualquier otra duda', 'William · +504 9462-8618 (WhatsApp) · soluciones_dyl@yahoo.com', MARGIN, ty, pw - 2 * MARGIN, { bg: C.successSoft, accent: C.success })

addFooter(doc, 6, TOTAL_PAGES)

// ═══════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════
const out = path.join(__dirname, '..', 'Manual-Inquilino-Plaza-Stefany.pdf')
const buf = Buffer.from(doc.output('arraybuffer'))
fs.writeFileSync(out, buf)
console.log(`✅ Manual generado: ${out}`)
console.log(`   ${(buf.length / 1024).toFixed(0)} KB · ${TOTAL_PAGES} páginas`)
