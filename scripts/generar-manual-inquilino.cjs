// Manual del Inquilino — estilo "para abuelos":
// 1 página = 1 acción. Pantalla grande del teléfono con círculo rojo + flecha
// señalando exactamente dónde tocar. Texto mínimo y claro.

const { jsPDF } = require('jspdf')
const fs = require('fs')
const path = require('path')

const MARGIN = 14

const C = {
  text: [28, 28, 30],
  textSec: [110, 110, 120],
  white: [255, 255, 255],
  bgSoft: [248, 249, 251],
  border: [229, 229, 234],
  brand: [99, 102, 241],
  brandSoft: [238, 240, 255],
  // Color de las anotaciones (BRILLANTE para que se vea)
  highlight: [255, 59, 48],          // rojo iOS
  highlightSoft: [255, 230, 228],
  success: [52, 199, 89],
  successSoft: [232, 248, 235],
}

const SCREENS = path.join(__dirname, 'screenshots')
const readImg = (name) => 'data:image/png;base64,' + fs.readFileSync(path.join(SCREENS, name)).toString('base64')
const coords = JSON.parse(fs.readFileSync(path.join(SCREENS, 'coords.json'), 'utf8'))
const membrete = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'public', 'membrete-header.png')).toString('base64')

const sc = {
  login: readImg('1-login.png'),
  loginFilled: readImg('2-login-filled.png'),
  dashTop: readImg('3-dashboard-top.png'),
  botones: readImg('4-dashboard-botones.png'),
  historial: readImg('5-historial.png'),
}

const doc = new jsPDF({ unit: 'mm', format: 'letter' })
const pw = doc.internal.pageSize.getWidth()
const ph = doc.internal.pageSize.getHeight()

// ─── Helpers ───

function addFooter(doc, n, total) {
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, ph - 14, pw - MARGIN, ph - 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.textSec)
  doc.text('Plaza Stefany · D&L Soluciones', MARGIN, ph - 9)
  doc.text(`${n} / ${total}`, pw - MARGIN, ph - 9, { align: 'right' })
}

// Phone moderno estilo iPhone con bezels finos + pantalla con esquinas redondeadas
// que respetan el corner radius del marco. Sombra suave realista.
function bigPhone(doc, dataUrl, cx, top, height) {
  const ratio = 844 / 390
  const h = height
  const w = h / ratio
  const x = cx - w / 2
  const y = top

  const bezel = 0.8        // bezel ultra-fino
  const frameRadius = 9    // esquinas del marco
  const screenRadius = 7.5 // esquinas de la pantalla (ligeramente menor)

  // Sombra suave (3 capas con opacidad decreciente)
  if (doc.GState) {
    const shadows = [{ ox: 0, oy: 1, a: 0.06 }, { ox: 0, oy: 3, a: 0.05 }, { ox: 0, oy: 6, a: 0.04 }]
    shadows.forEach(s => {
      doc.setGState(new doc.GState({ opacity: s.a }))
      doc.setFillColor(0, 0, 0)
      doc.roundedRect(x - bezel + s.ox, y - bezel + s.oy, w + 2 * bezel, h + 2 * bezel, frameRadius, frameRadius, 'F')
    })
    doc.setGState(new doc.GState({ opacity: 1 }))
  }

  // Frame silver/aluminio (estilo iPhone color natural) — funciona con
  // screenshots claras y oscuras sin fundirse con el contenido.
  // Capa de borde exterior gris oscuro fino (depth)
  doc.setFillColor(190, 192, 198)
  doc.roundedRect(x - bezel, y - bezel, w + 2 * bezel, h + 2 * bezel, frameRadius, frameRadius, 'F')
  // Capa interior un tono más oscuro entre el silver exterior y la pantalla
  doc.setFillColor(155, 158, 165)
  doc.roundedRect(x - bezel * 0.6, y - bezel * 0.6, w + bezel * 1.2, h + bezel * 1.2, frameRadius - 0.5, frameRadius - 0.5, 'F')

  // Highlight superior (efecto reflejo de luz)
  if (doc.GState) {
    doc.setGState(new doc.GState({ opacity: 0.35 }))
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x - bezel, y - bezel, w + 2 * bezel, 1.2, frameRadius, frameRadius, 'F')
    doc.setGState(new doc.GState({ opacity: 1 }))
  }

  // Pantalla — addImage + clip rectángulo redondeado
  // jsPDF: usar saveGraphicsState + clip path
  doc.saveGraphicsState()
  doc.roundedRect(x, y, w, h, screenRadius, screenRadius, null)
  doc.clip()
  doc.discardPath()
  doc.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST')
  doc.restoreGraphicsState()

  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
}

// Convierte coords CSS del browser (viewport-relative 0..390 x 0..844) a coords PDF (mm)
// sobre el phone. boundingBox() ya devuelve coords del viewport visible, no del documento.
function cssToPdf(phone, cssX, cssY) {
  return {
    x: phone.x + (cssX / 390) * phone.w,
    y: phone.y + (cssY / 844) * phone.h,
  }
}

// Círculo rojo amplio alrededor de un elemento (más grande para que destaque)
function circleAround(doc, phone, box, pad = 7) {
  if (!box) return
  const p1 = cssToPdf(phone, box.x - pad, box.y - pad - 1)
  const p2 = cssToPdf(phone, box.x + box.width + pad, box.y + box.height + pad + 1)
  const cx = (p1.x + p2.x) / 2
  const cy = (p1.y + p2.y) / 2
  const rx = Math.max((p2.x - p1.x) / 2, 10)
  const ry = Math.max((p2.y - p1.y) / 2, 6.5)
  doc.setDrawColor(...C.highlight)
  doc.setLineWidth(0.6)
  doc.ellipse(cx, cy, rx, ry, 'S')
  return { cx, cy, rx, ry }
}

// Etiqueta colorida con texto, con flecha apuntando al círculo
function arrowLabel(doc, txt, labelX, labelY, target, opts = {}) {
  const color = opts.color || C.highlight
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(opts.size || 12)
  const tw = doc.getTextWidth(txt) + 8
  const th = (opts.size || 12) * 0.45 + 4
  // Pill
  doc.setFillColor(...color)
  doc.roundedRect(labelX, labelY - th + 1.5, tw, th, 2, 2, 'F')
  doc.setTextColor(...C.white)
  doc.text(txt, labelX + tw / 2, labelY + 0.5, { align: 'center' })

  // Flecha curva del centro de la pill al circle target
  if (target) {
    const fromX = opts.arrowFrom === 'left' ? labelX : labelX + tw
    const fromY = labelY - th / 2 + 1.5
    const toX = target.cx + (opts.arrowFrom === 'left' ? target.rx : -target.rx) * 0.95
    const toY = target.cy
    doc.setDrawColor(...color)
    doc.setLineWidth(0.55)
    // Línea principal
    doc.line(fromX, fromY, toX, toY)
    // Cabeza de flecha (2 líneas pequeñas)
    const angle = Math.atan2(toY - fromY, toX - fromX)
    const headLen = 2.8
    const headAngle = 0.42
    doc.line(toX, toY, toX - headLen * Math.cos(angle - headAngle), toY - headLen * Math.sin(angle - headAngle))
    doc.line(toX, toY, toX - headLen * Math.cos(angle + headAngle), toY - headLen * Math.sin(angle + headAngle))
  }
  return { tw, th }
}

function bigStepTitle(doc, num, title, y) {
  // Círculo grande con número
  doc.setFillColor(...C.highlight)
  doc.circle(MARGIN + 8, y - 1, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...C.white)
  doc.text(String(num), MARGIN + 8, y + 3, { align: 'center' })
  // Título grande al lado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...C.text)
  doc.text(title, MARGIN + 19, y + 3)
  return y + 12
}

// ═══════════════════════════════════════════════════════════
// PÁGINA 1 — PORTADA simple
// ═══════════════════════════════════════════════════════════

// Membrete
const memH = pw * (300 / 1800) * 0.85
doc.addImage(membrete, 'PNG', pw / 2 - (pw * 0.8) / 2, 18, pw * 0.8, memH, undefined, 'SLOW')

let y = memH + 38
doc.setFont('helvetica', 'bold')
doc.setFontSize(42)
doc.setTextColor(...C.text)
doc.text('Guía rápida', pw / 2, y, { align: 'center' })
y += 14
doc.setFontSize(20)
doc.setTextColor(...C.textSec)
doc.text('para inquilinos de Plaza Stefany', pw / 2, y, { align: 'center' })

// Caja grande clara con la dirección
const boxY = y + 25
doc.setFillColor(...C.brandSoft)
doc.roundedRect(MARGIN + 5, boxY, pw - 2 * MARGIN - 10, 50, 4, 4, 'F')
doc.setDrawColor(...C.brand)
doc.setLineWidth(0.4)
doc.roundedRect(MARGIN + 5, boxY, pw - 2 * MARGIN - 10, 50, 4, 4, 'S')

doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(...C.brand)
doc.text('Para entrar a la app:', pw / 2, boxY + 14, { align: 'center' })

doc.setFont('helvetica', 'bold')
doc.setFontSize(22)
doc.setTextColor(...C.text)
doc.text('plaza-stefany.vercel.app', pw / 2, boxY + 30, { align: 'center' })

doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.setTextColor(...C.textSec)
doc.text('Tu usuario y contraseña te los mandó William por WhatsApp', pw / 2, boxY + 42, { align: 'center' })

// Footer simple en portada
const fy = ph - 60
doc.setFont('helvetica', 'bold')
doc.setFontSize(14)
doc.setTextColor(...C.text)
doc.text('¿Necesitás ayuda?', pw / 2, fy, { align: 'center' })

doc.setFont('helvetica', 'normal')
doc.setFontSize(13)
doc.setTextColor(...C.brand)
doc.text('Mandale WhatsApp a William', pw / 2, fy + 8, { align: 'center' })

doc.setFont('helvetica', 'bold')
doc.setFontSize(18)
doc.setTextColor(...C.text)
doc.text('+504 9462-8618', pw / 2, fy + 18, { align: 'center' })

// ═══════════════════════════════════════════════════════════
// PÁGINA 2 — PASO 1: Cómo entrar
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = bigStepTitle(doc, 1, 'Abrí la app y entrá', 22)

doc.setFont('helvetica', 'normal')
doc.setFontSize(12)
doc.setTextColor(...C.text)
doc.text('En tu celular o computadora, abrí el navegador (Safari, Chrome) y entrá a:', MARGIN, y + 2)
y += 9
doc.setFont('helvetica', 'bold')
doc.setFontSize(14)
doc.setTextColor(...C.brand)
doc.text('plaza-stefany.vercel.app', MARGIN, y + 2)
y += 12

// Phone con login filled + 3 anotaciones
const phone1 = bigPhone(doc, sc.loginFilled, pw / 2, y, 145)

const c1User = circleAround(doc, phone1, coords.login.user, 0, 3)
const c1Pass = circleAround(doc, phone1, coords.login.pass, 0, 3)
const c1Btn  = circleAround(doc, phone1, coords.login.btn, 0, 3)

// Labels a los costados con flechas
arrowLabel(doc, '1. Tu usuario', phone1.x - 50, phone1.y + 60, c1User, { arrowFrom: 'right' })
arrowLabel(doc, '2. Tu contraseña', phone1.x - 56, phone1.y + 80, c1Pass, { arrowFrom: 'right' })
arrowLabel(doc, '3. Apretá Continuar', phone1.x + phone1.w + 4, phone1.y + 102, c1Btn, { arrowFrom: 'left' })

addFooter(doc, 2, 6)

// ═══════════════════════════════════════════════════════════
// PÁGINA 3 — PASO 2: Lo que ves al entrar
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = bigStepTitle(doc, 2, 'Lo primero que vas a ver', 22)

doc.setFont('helvetica', 'normal')
doc.setFontSize(12)
doc.setTextColor(...C.text)
doc.text('Apenas entrás, te aparece tu información. Lo más importante:', MARGIN, y + 2)
y += 10

const phone2 = bigPhone(doc, sc.dashTop, pw / 2, y, 145)

const c2Name = circleAround(doc, phone2, coords.dashboard.name, 0, 3)
const c2Rent = circleAround(doc, phone2, coords.dashboard.rent, 0, 4)
const c2Exit = circleAround(doc, phone2, coords.dashboard.exit, 0, 3)

arrowLabel(doc, 'Tu nombre y local', phone2.x - 58, phone2.y + 18, c2Name, { arrowFrom: 'right' })
arrowLabel(doc, 'Tu renta del mes', phone2.x - 56, phone2.y + 55, c2Rent, { arrowFrom: 'right' })
arrowLabel(doc, 'Salir / Cerrar sesión', phone2.x + phone2.w + 4, phone2.y + 10, c2Exit, { arrowFrom: 'left' })

addFooter(doc, 3, 6)

// ═══════════════════════════════════════════════════════════
// PÁGINA 4 — PASO 3: Descargar recibo
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = bigStepTitle(doc, 3, 'Descargar tu recibo', 22)

doc.setFont('helvetica', 'normal')
doc.setFontSize(12)
doc.setTextColor(...C.text)
doc.text('Para bajar tu recibo de renta o luz, tocá los botones de colores:', MARGIN, y + 2)
y += 10

const phone3 = bigPhone(doc, sc.botones, pw / 2, y, 145)

const c3Recibo = circleAround(doc, phone3, coords.botones.recibo, 3)
const c3Luz    = circleAround(doc, phone3, coords.botones.luz, 3)

arrowLabel(doc, 'Recibo de Renta', phone3.x - 55, phone3.y + 60, c3Recibo, { arrowFrom: 'right' })
arrowLabel(doc, 'Recibo de Luz', phone3.x + phone3.w + 4, phone3.y + 85, c3Luz, { arrowFrom: 'left' })

// Nota chiquita al pie
const noteY = phone3.y + phone3.h + 8
doc.setFillColor(...C.successSoft)
doc.roundedRect(MARGIN, noteY, pw - 2 * MARGIN, 18, 2, 2, 'F')
doc.setDrawColor(...C.success)
doc.setLineWidth(0.4)
doc.line(MARGIN, noteY, MARGIN, noteY + 18)
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.success)
doc.text('Se baja como PDF a tu celular. Lo podés guardar o mandarlo por WhatsApp.', MARGIN + 4, noteY + 11)

addFooter(doc, 4, 6)

// ═══════════════════════════════════════════════════════════
// PÁGINA 5 — PASO 4: Subir comprobante
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = bigStepTitle(doc, 4, 'Subir tu comprobante de pago', 22)

doc.setFont('helvetica', 'normal')
doc.setFontSize(12)
doc.setTextColor(...C.text)
const p4Lines = [
  'Después de hacer la transferencia bancaria:',
  '  • Sacale foto al voucher (o screenshot de tu banco)',
  '  • En la app, tocá el botón "Subir comprobante" del mes',
]
p4Lines.forEach((l, i) => doc.text(l, MARGIN, y + 2 + i * 6))
y += 22

const phone4 = bigPhone(doc, sc.botones, pw / 2, y, 130)

const c4Subir = circleAround(doc, phone4, coords.botones.subir, 3)

arrowLabel(doc, 'Tocá "Subir comprobante"', phone4.x + phone4.w + 4, phone4.y + 60, c4Subir, { arrowFrom: 'left', size: 13 })

const note4Y = phone4.y + phone4.h + 8
doc.setFillColor(...C.brandSoft)
doc.roundedRect(MARGIN, note4Y, pw - 2 * MARGIN, 22, 2, 2, 'F')
doc.setDrawColor(...C.brand)
doc.setLineWidth(0.4)
doc.line(MARGIN, note4Y, MARGIN, note4Y + 22)
doc.setFont('helvetica', 'bold')
doc.setFontSize(11)
doc.setTextColor(...C.brand)
doc.text('¿Qué pasa después?', MARGIN + 4, note4Y + 8)
doc.setFont('helvetica', 'normal')
doc.setFontSize(10)
doc.setTextColor(...C.text)
doc.text('William ve tu comprobante al toque. Confirma tu pago y la app lo marca como "Pagada".', MARGIN + 4, note4Y + 16)

addFooter(doc, 5, 6)

// ═══════════════════════════════════════════════════════════
// PÁGINA 6 — Ayuda + instalación
// ═══════════════════════════════════════════════════════════
doc.addPage()
y = bigStepTitle(doc, 5, '¿Necesitás ayuda?', 22)

// CTA WhatsApp gigante
const waY = y + 8
doc.setFillColor(...C.successSoft)
doc.roundedRect(MARGIN, waY, pw - 2 * MARGIN, 50, 4, 4, 'F')
doc.setDrawColor(...C.success)
doc.setLineWidth(0.5)
doc.roundedRect(MARGIN, waY, pw - 2 * MARGIN, 50, 4, 4, 'S')

doc.setFont('helvetica', 'bold')
doc.setFontSize(14)
doc.setTextColor(...C.success)
doc.text('Mandale WhatsApp a William', pw / 2, waY + 16, { align: 'center' })
doc.setFont('helvetica', 'bold')
doc.setFontSize(26)
doc.setTextColor(...C.text)
doc.text('+504 9462-8618', pw / 2, waY + 32, { align: 'center' })
doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.setTextColor(...C.textSec)
doc.text('Cualquier duda, problema o si olvidaste la contraseña', pw / 2, waY + 43, { align: 'center' })

y = waY + 65

// Sección "Si la app no carga"
doc.setFont('helvetica', 'bold')
doc.setFontSize(16)
doc.setTextColor(...C.text)
doc.text('Trucos si algo no anda', MARGIN, y)
y += 10

const tips = [
  ['La pantalla está vacía o se ve rara', 'Cerrá el navegador completamente y volvé a abrirlo.'],
  ['No encuentro el botón de "Subir comprobante"', 'Bajá un poco la pantalla con el dedo. Está debajo de cada mes.'],
  ['No me deja descargar el recibo de luz', 'Es porque William todavía no cargó la factura ENEE del mes. Probá al día siguiente.'],
]
tips.forEach(([title, body]) => {
  doc.setFillColor(...C.bgSoft)
  doc.roundedRect(MARGIN, y, pw - 2 * MARGIN, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.text)
  doc.text(title, MARGIN + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C.textSec)
  doc.text(body, MARGIN + 4, y + 14)
  y += 22
})

addFooter(doc, 6, 6)

// ═══════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════
const out = path.join(__dirname, '..', 'Manual-Inquilino-Plaza-Stefany.pdf')
fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
const size = fs.statSync(out).size
console.log(`✅ Manual generado: ${out}`)
console.log(`   ${(size / 1024).toFixed(0)} KB · 6 páginas`)
