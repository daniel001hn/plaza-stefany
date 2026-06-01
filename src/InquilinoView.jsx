import { useState, useEffect } from 'react'
import { monthKey } from './keys'
import { MEMBRETE_HEADER_HTML, MEMBRETE_FOOTER_HTML } from './dlMembrete'
import { supabase } from './supabaseClient'
import { useLightbox } from './components/Lightbox'
// Calculos compartidos con admin (src/calculos.js) — antes estaban duplicados aquí.
import {
  calcConsumoLocal, calcTotalKwhSubmedidores, calcCargosFijosTotal,
  calcLocalesConMedidor, calcPerLocalFijo, calcTarifaEfectiva,
} from './calculos'
// jsPDF lazy-loaded para reducir bundle inicial
const loadPdf = () => import('./generarReciboPdf')

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt  = (n) => Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n) => Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

async function loadCfg() {
  try { const r = await window.storage.get('config-and-locales'); if (r) return typeof r === 'string' ? JSON.parse(r) : r } catch(e) {}
  return { config: {}, locales: [] }
}
async function loadMonth(year, monthIdx) {
  try { const r = await window.storage.get(monthKey(year, monthIdx)); if (r) return typeof r === 'string' ? JSON.parse(r) : r } catch(e) {}
  return {}
}

import { DL_LOGO } from './dlLogo'

const DL_BIRD = `<img src="${DL_LOGO}" alt="D&L Soluciones" width="100" height="74" style="display:block" />`

function buildPDF({ tipo, inquilino, localNum, periodo, fechaEmision, reciboNum,
  m2, precioUSD, tasa, isv, rentaBase, isvMonto, rentaTotal,
  lecturaAnt, lecturaAct, consumo, tarifaEfectiva, montoLuz, kWhPlaza, montoPlaza }) {

  const esRenta = tipo === 'renta'
  const titulo  = esRenta ? 'RECIBO DE RENTA' : 'RECIBO DE ENERGÍA ELÉCTRICA'
  const seccion = esRenta ? 'DETALLE DE RENTA' : 'CÁLCULO DEL MONTO'
  const total   = esRenta ? rentaTotal : montoLuz

  const lecturas = !esRenta ? `
    <h3 class="sh">L E C T U R A S &nbsp; D E L &nbsp; S U B M E D I D O R</h3>
    <table class="tbl"><thead><tr class="thr">
      <th style="color:#F37A72">LECTURA ANTERIOR (kWh)</th>
      <th style="color:#F37A72">LECTURA ACTUAL (kWh)</th>
      <th style="color:#F37A72">CONSUMO (kWh)</th>
    </tr></thead><tbody><tr>
      <td class="cen">${fmt0(lecturaAnt)}</td>
      <td class="cen">${fmt0(lecturaAct)}</td>
      <td class="cen" style="font-weight:700">${fmt0(consumo)}</td>
    </tr></tbody></table>` : ''

  const filas = esRenta ? `
    <tr><td class="det">Área arrendada</td><td class="val">${m2} m²</td><td class="mon">—</td></tr>
    <tr class="alt"><td class="det">Precio por m²</td><td class="val">$ ${Number(precioUSD).toFixed(2)} / m²</td><td class="mon">—</td></tr>
    <tr><td class="det">Tipo de cambio BCH (venta)</td><td class="val">L ${tasa} / US$</td><td class="mon">—</td></tr>
    <tr class="alt"><td class="det">Base (${m2} × $${precioUSD} × ${tasa})</td><td class="val"></td><td class="mon">${fmt(rentaBase)}</td></tr>
    <tr><td class="det">ISV (${((isv||0.15)*100).toFixed(0)}%)</td><td class="val">L ${fmt(rentaBase)} × ${((isv||0.15)*100).toFixed(0)}%</td><td class="mon">${fmt(isvMonto)}</td></tr>
  ` : `
    <tr><td class="det">Factura ENEE estimada (plaza)</td><td class="val">${fmt0(kWhPlaza)} kWh</td><td class="mon">${fmt(montoPlaza)}</td></tr>
    <tr class="alt"><td class="det">Tarifa efectiva de energía</td><td class="val">L/kWh</td><td class="mon">${Number(tarifaEfectiva).toFixed(4)}</td></tr>
    <tr><td class="det">Energía consumida</td><td class="val">${fmt0(consumo)} × ${Number(tarifaEfectiva).toFixed(4)}</td><td class="mon">${fmt(montoLuz)}</td></tr>
  `

  const nota = esRenta
    ? `Renta mensual calculada sobre ${m2} m² al precio pactado de US$${precioUSD}/m², convertido al tipo de cambio BCH (venta) vigente de L ${tasa}/US$. ISV (${((isv||0.15)*100).toFixed(0)}%) incluido en el total.`
    : `El monto se obtiene prorrateando la factura ENEE de la plaza según el consumo real registrado en el submedidor de cada local. Este recibo no genera ISV.`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo} — ${periodo}</title>
<style>
@page{size:Letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#333;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:816px;min-height:1056px;margin:0 auto;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;justify-content:center;gap:22px;padding:26px 50px 14px}
.dlt h1{font-size:38px;font-weight:900;color:#1E7A8A;letter-spacing:6px;line-height:1;margin:0}
.dlt h2{font-size:20px;font-weight:700;color:#1E7A8A;letter-spacing:5px;line-height:1.2;margin:0}
.dlt p{font-size:9px;color:#888;margin:3px 0 0;letter-spacing:1px}
.bar{height:8px;display:flex}
.bt{background:#1E7A8A;width:15%}.bc{background:#F37A72;flex:1}
.tit{text-align:center;padding:18px 50px 10px}
.tit h2{font-size:19px;font-weight:900;letter-spacing:6px;color:#333}
.tit p{font-size:10px;letter-spacing:3px;color:#666;margin-top:3px}
.inf{padding:8px 50px 14px}
.inf table{width:100%;border-collapse:collapse;border:1px solid #ccc}
.inf td{padding:7px 10px;font-size:10px;border-bottom:1px solid #eee}
.lbl{background:#F2F2F2;color:#666;width:36%}
.body{padding:0 50px 20px;flex:1}
.sh{font-size:11px;font-weight:700;color:#1E7A8A;letter-spacing:2px;border-bottom:1.5px solid #3B8A8F;padding-bottom:3px;margin:14px 0 7px}
.tbl{width:100%;border-collapse:collapse}
.tbl th{padding:7px 10px;font-size:9px;font-weight:700;text-align:center;border:1px solid #ccc}
.tbl td{padding:7px 10px;font-size:11px;border:1px solid #ccc}
.thr{background:#F5C9C2}
.alt{background:#F9F9F9}
.det{width:55%}.val{text-align:center;color:#555;font-size:10.5px}.mon{text-align:right}.cen{text-align:center}
.tot td{background:#155F6E;color:white;font-weight:700;font-size:13px;padding:9px 10px;border:1px solid #155F6E}
.nota{border-left:4px solid #D4A800;background:#FFFBEA;padding:10px 14px;font-size:10px;line-height:1.6;margin-top:14px}
.foot{margin-top:auto}
.fd{background:#E8E8E5;padding:12px 50px;display:flex;justify-content:space-around;align-items:center;flex-wrap:wrap;gap:8px;font-size:9px;color:#444}
.ft{height:8px;background:#F37A72}
</style></head><body>
<div class="page">
  ${MEMBRETE_HEADER_HTML}
  <div class="tit"><h2>P L A Z A &nbsp; S T E F A N Y</h2><p>${titulo}</p></div>
  <div class="inf"><table>
    <tr><td class="lbl">Recibo N°</td><td>${reciboNum}</td></tr>
    <tr><td class="lbl">Inquilino</td><td>${inquilino}</td></tr>
    <tr><td class="lbl">Local</td><td>Local ${localNum}</td></tr>
    <tr><td class="lbl">Período</td><td>${periodo}</td></tr>
    <tr><td class="lbl">Fecha de emisión</td><td>${fechaEmision}</td></tr>
  </table></div>
  <div class="body">
    ${lecturas}
    <h3 class="sh">${seccion}</h3>
    <table class="tbl">
      <thead><tr class="thr">
        <th class="det" style="color:#F37A72;text-align:left">DETALLE</th>
        <th style="color:#F37A72">VALOR</th>
        <th style="color:#F37A72">MONTO (L)</th>
      </tr></thead>
      <tbody>${filas}
        <tr class="tot"><td colspan="2">TOTAL A PAGAR</td><td class="mon">L &nbsp;${fmt(total)}</td></tr>
      </tbody>
    </table>
    <div class="nota"><b>Nota:</b> ${nota}</div>
  </div>
  <div class="foot">
    ${MEMBRETE_FOOTER_HTML}
  </div>
</div></body></html>`
}

function abrirPDF(html) {
  const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400)
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
body{margin:0;font-family:'Geist',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;
  background:radial-gradient(ellipse 80% 60% at 10% 0%,rgba(99,102,241,.35) 0%,transparent 55%),
  radial-gradient(ellipse 60% 50% at 90% 5%,rgba(236,72,153,.25) 0%,transparent 50%),
  radial-gradient(ellipse 50% 60% at 70% 85%,rgba(20,184,166,.2) 0%,transparent 55%),#EEF0F8;
  background-attachment:fixed;min-height:100vh}
.glass{background:rgba(255,255,255,.55);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);border:1px solid rgba(255,255,255,.65);border-radius:18px;box-shadow:0 2px 20px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.8)}
.pill-g{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(52,199,89,.18);color:#1A7F35;border:1px solid rgba(52,199,89,.38)}
.pill-o{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(255,159,10,.18);color:#B25800;border:1px solid rgba(255,159,10,.38)}
.pill-x{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(110,110,120,.15);color:#5A5A64;border:1px solid rgba(110,110,120,.28)}
.dg{width:6px;height:6px;border-radius:50%;background:#34C759;box-shadow:0 0 6px #34C759}
.do{width:6px;height:6px;border-radius:50%;background:#FF9F0A;box-shadow:0 0 6px #FF9F0A}
.dx{width:6px;height:6px;border-radius:50%;background:#8E8E96}
.iv-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background:rgba(255,255,255,.7) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='%236E6E78' d='M3.5 5l2.5 3 2.5-3z'/></svg>") no-repeat right .55rem center/10px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.85);box-shadow:0 1px 6px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.6);border-radius:9px;padding:.42rem 1.4rem .42rem .65rem;font-size:.74rem;font-weight:500;font-family:inherit;color:#1C1C1E;cursor:pointer;outline:none;transition:all .15s}
.iv-select:hover{background-color:rgba(255,255,255,.85);border-color:rgba(99,102,241,.35)}
.iv-select:focus{border-color:#6366F1;box-shadow:0 0 0 3px rgba(99,102,241,.18)}
.iv-chip{background:rgba(255,255,255,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);border-radius:9px;padding:.42rem .7rem;font-size:.72rem;font-weight:500;font-family:inherit;color:#6E6E78;cursor:pointer;transition:all .15s}
.iv-chip:hover{background:rgba(255,255,255,.8);color:#1C1C1E}
.btn-r{background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;border-radius:10px;padding:.55rem 1rem;font-weight:600;font-size:.8rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:.35rem;box-shadow:0 4px 14px rgba(99,102,241,.35);transition:all .15s}
.btn-r:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,.45)}
.btn-l{background:linear-gradient(135deg,#0EA5E9,#6366F1);color:white;border:none;border-radius:10px;padding:.55rem 1rem;font-weight:600;font-size:.8rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:.35rem;box-shadow:0 4px 14px rgba(14,165,233,.35);transition:all .15s}
.btn-l:hover{transform:translateY(-1px)}
.btn-g{background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:10px;padding:.5rem .9rem;font-size:.82rem;font-weight:500;cursor:pointer;font-family:inherit;color:#333;backdrop-filter:blur(8px)}
.card{background:rgba(255,255,255,.5);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.7);border-radius:14px;padding:1rem 1.2rem;margin-bottom:.6rem;transition:all .2s}
.card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.1)}
.badge-luz{display:inline-flex;align-items:center;gap:.3rem;padding:.22rem .6rem;border-radius:8px;font-size:.68rem;font-weight:600;background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(99,102,241,.12));color:#0EA5E9;border:1px solid rgba(14,165,233,.25);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
`

export default function InquilinoView({ session, onLogout }) {
  const [local, setLocal]     = useState(null)
  const [locales, setLocales] = useState([])
  const [config, setConfig]   = useState({})
  const [meses, setMeses]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const today = new Date()

  // Recibos en la web: el cron de Vercel actualiza la tasa de cambio cada día,
  // así que normalmente están siempre disponibles. SOLO bloqueamos cuando la
  // tasa no se actualizó hoy (cron falló, o problema con la fuente). En ese
  // caso, el inquilino usa la app nativa (que fetchea la tasa en vivo desde el
  // celular, sin depender del cron) o solicita el recibo por WhatsApp.
  const esAppNativa = typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || !!window.cordova)
  const hoyISO = today.toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' })
  // La tasa casi no se mueve día a día. Aceptamos la última de los últimos 7 días
  // en vez de exigir HOY exacto — antes bloqueaba cada madrugada (el cron corre 7am)
  // y todo el día si el cron fallaba una vez. Solo bloquea si está MUY vieja (cron muerto).
  const diasTasa = (() => {
    const f = config?.tasaFechaActualizada
    if (!f) return Infinity
    const d = new Date(f + 'T00:00:00')
    if (isNaN(d)) return Infinity
    return Math.round((new Date(hoyISO + 'T00:00:00') - d) / 86400000)
  })()
  const tasaReciente = diasTasa <= 7
  const dentroVentanaWeb = esAppNativa || tasaReciente
  const TEL_ADMIN_WSP = '50494628618'
  const wspText = (asunto) => encodeURIComponent(
    `Hola William, soy ${session?.nombre || local?.inquilino || 'inquilino'} del local ${local?.numero || ''}. Necesito mi ${asunto} de ${MESES[today.getMonth()]} ${today.getFullYear()}.`
  )
  const wspUrl = (asunto = 'recibo') => `https://wa.me/${TEL_ADMIN_WSP}?text=${wspText(asunto)}`

  useEffect(() => {
    let cancelled = false
    async function load() {
     try {
      const { config: cfg, locales } = await loadCfg()
      if (cancelled) return
      setConfig(cfg)
      setLocales(locales || [])
      const loc = (locales || []).find(l => l.id === session.localId)
      if (loc) setLocal(loc)   // no pisar un local bueno con undefined si el fetch vino vacío
      // Si el local tiene contratoDesde, no mostrar meses anteriores a esa fecha.
      const desdeStr = loc?.contratoDesde
      const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : null
      const now = new Date()
      // Construir lista de meses a cargar (saltando los previos al contrato)
      const monthsToLoad = []
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear(); const m = d.getMonth()
        const finDeMes = new Date(y, m + 1, 0)
        if (desde && desde > finDeMes) continue
        monthsToLoad.push({ y, m })
      }
      // Cargar TODOS los meses en paralelo (antes era secuencial — ~3s vs ~500ms).
      const datas = await Promise.all(monthsToLoad.map(({ y, m }) => loadMonth(y, m)))
      if (cancelled) return
      const months = monthsToLoad.map(({ y, m }, i) => {
        const data = datas[i]
        const pago = (data.pagos || {})[session.localId] || {}
        return { year: y, monthIdx: m, data: pago, factura: data.factura || {}, pagosAll: data.pagos || {} }
      })
      setMeses(months); setLoading(false)
     } catch (e) {
      console.error('InquilinoView load error:', e)
      if (!cancelled) setLoading(false)   // salir del "Cargando…"; el guard de !local muestra reintentar
     }
    }
    load()
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibility)
    const interval = setInterval(load, 30000)
    let unsub = () => {}
    try { unsub = window.storage?.subscribe?.(() => load()) || (() => {}) } catch {}
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisibility); clearInterval(interval); unsub() }
  }, [session.localId])

  const calcRenta = (loc) => {
    if (!loc) return 0
    const base = (loc.m2 || 0) * (config.rentPerM2USD || 29) * (config.tasaCambio || 25)
    return base * (1 + (config.isv || 0.15))
  }

  // Devuelve el precio por m² aplicable a un mes/año determinado (lee historial si existe).
  const getPrecioMes = (year, monthIdx) => {
    if (year != null && monthIdx != null) {
      const targetKey = `${year}-${String(monthIdx).padStart(2, '0')}`
      const hist = (config.precioHistorial || []).filter(h => h.desde <= targetKey)
      if (hist.length > 0) {
        hist.sort((a, b) => b.desde.localeCompare(a.desde))
        return hist[0].precio
      }
    }
    return config.rentPerM2USD || 29
  }

  const fechaHoy = () => new Date().toLocaleDateString('es-HN', { day:'2-digit', month:'long', year:'numeric' })

  // Comprimir imagen a base64 (max 800px, calidad 0.7)
  const comprimirImagen = (file) => new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const max = 900
      let w = img.width, h = img.height
      if (w > max || h > max) {
        if (w > h) { h = Math.round(h * max / w); w = max }
        else       { w = Math.round(w * max / h); h = max }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = reject
    img.src = url
  })

  // Inquilinos NO pueden escribir kv_store directamente (RLS bloquea).
  // El comprobante se sube vía /api/inquilino-comprobante que valida JWT
  // + verifica que el localId del inquilino matchea, y luego escribe con
  // service_role server-side.
  const subirComprobante = async (mes, tipo, file) => {
    if (!file) return
    try {
      const b64 = await comprimirImagen(file)
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('no auth session')
      const res = await fetch('/api/inquilino-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'upload', year: mes.year, monthIdx: mes.monthIdx, tipo, comprobanteB64: b64 }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.error || 'upload failed')
      setMeses(prev => prev.map(m =>
        m.year === mes.year && m.monthIdx === mes.monthIdx
          ? { ...m, data: { ...m.data, [`comprobante${tipo}`]: b64, [`comprobante${tipo}Date`]: new Date().toISOString() } }
          : m
      ))
    } catch(e) {
      console.error('subirComprobante:', e)
      alert('Error al subir la imagen: ' + (e?.message || 'reintentá'))
    }
  }

  // Borra el comprobante (por si el inquilino subió la imagen incorrecta).
  const borrarComprobante = async (mes, tipo) => {
    if (!confirm(`¿Borrar el comprobante de ${tipo.toLowerCase()}? Después podés subir otro.`)) return
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) throw new Error('no auth session')
      const res = await fetch('/api/inquilino-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', year: mes.year, monthIdx: mes.monthIdx, tipo }),
      })
      const result = await res.json()
      if (!res.ok || !result.ok) throw new Error(result?.error || 'delete failed')
      setMeses(prev => prev.map(m => {
        if (m.year !== mes.year || m.monthIdx !== mes.monthIdx) return m
        const newData = { ...m.data }
        delete newData[`comprobante${tipo}`]
        delete newData[`comprobante${tipo}Date`]
        return { ...m, data: newData }
      }))
    } catch(e) {
      console.error('borrarComprobante:', e)
      alert('No se pudo borrar: ' + (e?.message || 'reintentá'))
    }
  }

  // Registra que el inquilino generó un recibo (Renta o Luz). Va por el endpoint
  // server-side (RLS bloquea writes directos de inquilinos a kv_store).
  // Silent failure aceptable: si falla, no rompe la app, solo el admin no ve el log.
  const registrarActividad = async (mes, tipo) => {
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) return
      await fetch('/api/inquilino-comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'activity', year: mes.year, monthIdx: mes.monthIdx, tipo }),
      })
    } catch(e) { console.warn('registrarActividad fail:', e?.message) }
  }

  const generarRenta = (mes) => {
    if (!dentroVentanaWeb) {
      if (confirm('Recibo no disponible en la web — la tasa de cambio del día todavía no se actualizó.\n\nDescargá la app móvil o solicitalo por WhatsApp al admin.\n\n¿Abrir WhatsApp ahora?')) {
        window.open(wspUrl('recibo de renta'), '_blank')
      }
      return
    }
    registrarActividad(mes, 'Renta')
    // Usar tasa congelada del día que el admin marcó como pagado, si existe
    const tasaUsada = mes.data.tasaCambioCongelado || config.tasaCambio || 25
    const precioM2  = getPrecioMes(mes.year, mes.monthIdx)
    const base  = (local.m2 || 0) * precioM2 * tasaUsada
    const isv      = config.isv || 0.15
    const isvMonto = base * isv
    const renta    = base * (1 + isv)
    loadPdf().then(({ generarReciboRentaPdf }) => generarReciboRentaPdf({
      reciboNum: `PS-${mes.year}-${String(mes.monthIdx+1).padStart(2,'0')}-${String(local?.numero).padStart(3,'0')}`,
      inquilino: session.nombre || local?.inquilino || 'Inquilino',
      local: String(local?.numero ?? ''),
      periodo: `${MESES[mes.monthIdx]} ${mes.year}`,
      fechaEmision: fechaHoy(),
      m2: local?.m2 ?? '',
      precioUSD: Number(precioM2).toFixed(2),
      tasa: tasaUsada,
      isvPct: (isv * 100).toFixed(0),
      rentaBase: fmt(base),
      isvMonto: fmt(isvMonto),
      rentaTotal: fmt(renta),
    })).catch(e => {
      console.error('Error generando recibo de renta:', e)
      alert('No se pudo generar el recibo. Reintentá o avisá al admin.')
    })
  }

  // calc = { lecturaAnt, lecturaAct, consumo, tarifaEf, montoEnergia, montoLuz, kWhPlaza, fijoLocal, cargosFijos, nLocalesMed }
  const generarLuz = (mes, calc) => {
    if (!dentroVentanaWeb) {
      if (confirm('Recibo no disponible en la web — la tasa de cambio del día todavía no se actualizó.\n\nDescargá la app móvil o solicitalo por WhatsApp al admin.\n\n¿Abrir WhatsApp ahora?')) {
        window.open(wspUrl('recibo de luz'), '_blank')
      }
      return
    }
    registrarActividad(mes, 'Luz')
    loadPdf().then(({ generarReciboLuzPdf }) => generarReciboLuzPdf({
      reciboNum: `PS-${mes.year}-${String(mes.monthIdx+1).padStart(2,'0')}-L${String(local?.numero).padStart(2,'0')}`,
      inquilino: session.nombre || local?.inquilino || 'Inquilino',
      local: String(local?.numero ?? ''),
      periodo: `${MESES[mes.monthIdx]} ${mes.year}`,
      fechaEmision: fechaHoy(),
      lecturaAnterior: fmt0(calc.lecturaAnt || 0),
      lecturaActual: fmt0(calc.lecturaAct || 0),
      consumo: fmt0(calc.consumo || 0),
      kWhPlaza: fmt0(calc.kWhPlaza || 0),
      facturaEnee: fmt(mes.factura?.montoTotal || 0),
      tarifa: fmt(calc.tarifaEf || 0),
      montoEnergia: fmt(calc.montoEnergia || 0),
      cargosFijos: fmt(calc.cargosFijos || 0),
      fijoLocal: fmt(calc.fijoLocal || 0),
      nLocales: String(calc.nLocalesMed || 0),
      total: fmt(calc.montoLuz || 0),
      fotoMedidorAnterior: mes.data?.fotoMedidorAnterior || null,
      fotoMedidorActual: mes.data?.fotoMedidorActual || null,
    })).catch(e => {
      console.error('Error generando recibo de luz:', e)
      alert('No se pudo generar el recibo de luz. Reintentá o avisá al admin.')
    })
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{CSS}</style><div style={{color:'#6366F1',fontSize:'1rem',fontFamily:'Geist,sans-serif'}}>Cargando…</div></div>

  if (!local) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem',padding:'2rem',textAlign:'center',fontFamily:'Geist,-apple-system,sans-serif'}}>
      <style>{CSS}</style>
      <div style={{fontSize:'2.5rem'}}>📶</div>
      <div style={{fontSize:'1.05rem',fontWeight:600,color:'#1C1C1E'}}>No pudimos cargar tu local</div>
      <div style={{fontSize:'.85rem',color:'#6E6E78',maxWidth:320}}>Puede ser tu conexión. Recargá la página; si sigue, avisanos por WhatsApp.</div>
      <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',justifyContent:'center'}}>
        <button className="btn-p" onClick={() => window.location.reload()} style={{padding:'.6rem 1.2rem',borderRadius:10,border:'none',background:'#6366F1',color:'#fff',fontWeight:600,cursor:'pointer'}}>Recargar</button>
        <a className="btn-g" href={wspUrl('recibo')} target="_blank" rel="noreferrer" style={{padding:'.6rem 1.2rem',borderRadius:10,textDecoration:'none'}}>WhatsApp</a>
        <button className="btn-g" onClick={onLogout} style={{padding:'.6rem 1.2rem',borderRadius:10,cursor:'pointer'}}>Salir</button>
      </div>
    </div>
  )

  const renta = calcRenta(local)

  return (
    <div style={{minHeight:'100vh',padding:'1.5rem 1rem 4rem',fontFamily:'Geist,-apple-system,sans-serif',color:'#1C1C1E'}}>
      <style>{CSS}</style>
      <div style={{maxWidth:600,margin:'0 auto'}}>

        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'.67rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.2rem'}}>🏢 Stefany Plaza</div>
            <div style={{fontSize:'1.05rem',fontWeight:700,lineHeight:1.2}}>{session.nombre || local?.inquilino}</div>
            <div style={{fontSize:'.78rem',color:'#6E6E78',marginTop:'.22rem'}}>Local {local?.numero} · {local?.m2} m²</div>
          </div>
          <button className="btn-g" onClick={onLogout} style={{fontSize:'.78rem'}}>Salir</button>
        </div>

        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem'}}>
          <div style={{fontSize:'.65rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.5rem'}}>Renta mensual</div>
          <div style={{fontSize:'2rem',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>L {fmt(renta)}</div>
          <div style={{fontSize:'.75rem',color:'#6E6E78',marginTop:'.2rem'}}>{local?.m2} m² × ${config.rentPerM2USD||29} × L {config.tasaCambio||25} + ISV {((config.isv||0.15)*100).toFixed(0)}%</div>
        </div>

        {!dentroVentanaWeb && (
          <div className="glass" style={{padding:'1rem 1.2rem',marginBottom:'1rem',background:'rgba(255,193,7,0.10)',border:'1px solid rgba(255,193,7,0.40)'}}>
            <div style={{fontSize:'.68rem',fontWeight:700,color:'#B86E00',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'.35rem'}}>⚠️ Recibo no disponible en la web</div>
            <div style={{fontSize:'.8rem',color:'#5C4400',lineHeight:1.45,marginBottom:'.7rem'}}>
              La tasa de cambio del día todavía no fue actualizada. Descargá la <b>app móvil</b> (siempre disponible) o solicitá tu recibo por WhatsApp al admin.
            </div>
            <a href={wspUrl('recibo')} target="_blank" rel="noopener noreferrer" className="btn-r" style={{textDecoration:'none',display:'inline-block'}}>📱 Solicitar por WhatsApp</a>
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.6rem',paddingLeft:'.2rem',gap:'.4rem',flexWrap:'wrap'}}>
          <div style={{fontSize:'.67rem',fontWeight:600,color:'rgba(60,60,70,.6)',letterSpacing:'.1em',textTransform:'uppercase'}}>Historial de pagos</div>
          <div style={{display:'flex',gap:'.4rem',alignItems:'center'}}>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="iv-select">
              <option value="">Todos los años</option>
              {[...new Set(meses.map(m => m.year))].sort((a,b)=>b-a).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="iv-select">
              <option value="">Todos los meses</option>
              {MESES.map((nombre, i) => <option key={i} value={i}>{nombre}</option>)}
            </select>
            {(filtroAno || filtroMes !== '') && (
              <button onClick={() => { setFiltroAno(''); setFiltroMes('') }} className="iv-chip">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {(() => {
          const mesesFiltrados = meses.filter(m => {
            if (filtroAno && String(m.year) !== filtroAno) return false
            if (filtroMes !== '' && m.monthIdx !== Number(filtroMes)) return false
            return true
          })
          if (mesesFiltrados.length === 0) {
            return <div className="glass" style={{padding:'1.5rem 1.2rem',marginBottom:'1rem',textAlign:'center',color:'#6E6E78',fontSize:'.85rem'}}>No hay meses con esos filtros.</div>
          }
          return null
        })()}

        {meses.filter(m => {
          if (filtroAno && String(m.year) !== filtroAno) return false
          if (filtroMes !== '' && m.monthIdx !== Number(filtroMes)) return false
          return true
        }).map((mes) => {
          // Para el lookup de luzMes (mes anterior), usar el indice del array ORIGINAL no del filtrado
          const idx = meses.findIndex(m => m.year === mes.year && m.monthIdx === mes.monthIdx)
          const { data } = mes
          const rentaPagada = !!data.rentaPagada
          const tipoLuz     = local?.tipoLuz || 'incluido'
          const luzAplica   = tipoLuz !== 'incluido'
          const esActual    = mes.year === today.getFullYear() && mes.monthIdx === today.getMonth()
          // Reagrupado: la tarjeta del mes N muestra renta de N + luz de N-1
          // (la luz se factura el mes siguiente al consumo). meses[idx+1] = mes anterior.
          const luzMes      = meses[idx + 1] || null
          const luzData     = luzMes?.data || {}
          const luzPagada   = !!luzData.luzPagada
          const luzPagosAll = luzMes?.pagosAll || {}
          const luzPrevPagosAll = meses[idx + 2]?.pagosAll || {}
          const tarifaEf    = luzMes ? (calcTarifaEfectiva(luzMes.factura, locales, luzPagosAll, luzPrevPagosAll, config) || 0) : 0
          const fijoLocal   = luzMes ? calcPerLocalFijo(luzMes.factura, config, locales) : 0
          const cargosFijos = luzMes ? calcCargosFijosTotal(luzMes.factura, config) : 0
          const nLocalesMed = calcLocalesConMedidor(locales)
          const consumo     = luzMes ? calcConsumoLocal(local, luzPagosAll, luzPrevPagosAll) : null
          const lecturaAct  = luzData.lecturaActual ?? null
          const lecturaAnt  = luzPrevPagosAll[session.localId]?.lecturaActual ?? local?.lecturaInicial ?? null
          const kWhPlaza    = luzMes ? calcTotalKwhSubmedidores(locales, luzPagosAll, luzPrevPagosAll) : 0
          const montoEnergia = (consumo != null && consumo > 0 && tarifaEf > 0) ? consumo * tarifaEf : 0
          const montoLuz    = montoEnergia + (luzMes ? fijoLocal : 0)
          // Hay recibo si: hay factura del mes, el local tiene medidor, Y la lectura del
          // submedidor ya fue cargada (consumo != null). consumo=0 SÍ vale (paga fijo);
          // null = todavía no cargaron la lectura → no se puede emitir el recibo.
          const tieneLuz    = luzAplica && !!luzMes && !!luzMes.factura?.montoTotal && (local?.tipoLuz === 'medidor') && consumo != null
          const luzNueva    = tieneLuz && !luzPagada
          const luzLabel    = luzMes ? `${MESES[luzMes.monthIdx]} ${luzMes.year}` : null
          // La renta es determinística (m² × tarifa × ISV): el recibo siempre se puede
          // emitir, esté pagada o no, sea el mes actual o pasado. El inquilino lo usa
          // justamente para saber cuánto pagar.
          const reciboRentaDisponible = true
          // Monto de renta con tasa congelada (o actual si no hay congelada aún)
          const tasaMes  = data.tasaCambioCongelado || config.tasaCambio || 25
          const precioM2Mes = getPrecioMes(mes.year, mes.monthIdx)
          const baseMes  = (local?.m2 || 0) * precioM2Mes * tasaMes
          const rentaMes = baseMes * (1 + (config.isv || 0.15))

          return (
            <div key={`${mes.year}-${mes.monthIdx}`} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.55rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'.45rem',flexWrap:'wrap'}}>
                  <span style={{fontWeight:600,fontSize:'.95rem'}}>{MESES[mes.monthIdx]} {mes.year}</span>
                  {esActual && <span style={{fontSize:'.62rem',fontWeight:600,background:'rgba(99,102,241,.12)',color:'#6366F1',padding:'.1rem .45rem',borderRadius:6}}>ACTUAL</span>}
                  {luzNueva && <span className="badge-luz">⚡ Factura luz disponible</span>}
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:'1rem'}}>
                  <div style={{fontSize:'.67rem',color:'#6E6E78'}}>Renta · {MESES[mes.monthIdx]}</div>
                  <div style={{fontWeight:600,fontSize:'.88rem',fontVariantNumeric:'tabular-nums'}}>L {fmt(rentaMes)}</div>
                  {luzAplica && <><div style={{fontSize:'.67rem',color:'#6E6E78',marginTop:'.2rem'}}>Luz · {luzLabel || '—'}</div><div style={{fontWeight:600,fontSize:'.88rem',color: tieneLuz ? '#0EA5E9' : '#bbb',fontVariantNumeric:'tabular-nums'}}>{tieneLuz ? `L ${fmt(montoLuz)}` : '—'}</div></>}
                </div>
              </div>

              <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'.65rem',alignItems:'center'}}>
                <span style={{fontSize:'.67rem',color:'#6E6E78'}}>Renta {MESES[mes.monthIdx]}</span>
                {rentaPagada ? <span className="pill-g"><span className="dg"/>Pagada</span> : <span className="pill-o"><span className="do"/>Pendiente</span>}
                {luzAplica && <><span style={{fontSize:'.67rem',color:'#6E6E78',marginLeft:'.2rem'}}>Luz {luzLabel || ''}</span>
                  {!tieneLuz ? <span className="pill-x"><span className="dx"/>No disponible</span>
                    : luzPagada ? <span className="pill-g"><span className="dg"/>Pagada</span>
                    : <span className="pill-o"><span className="do"/>Pendiente</span>}</>}
                {!luzAplica && <><span style={{fontSize:'.67rem',color:'#6E6E78',marginLeft:'.2rem'}}>Luz</span><span className="pill-x"><span className="dx"/>Incluida</span></>}
              </div>

              <div style={{borderTop:'1px solid rgba(255,255,255,.5)',paddingTop:'.75rem',display:'flex',flexDirection:'column',gap:'.55rem'}}>

                {/* ── RENTA ── */}
                <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                  {reciboRentaDisponible
                    ? <button className="btn-r" onClick={() => generarRenta(mes)}>📄 Recibo de renta</button>
                    : <button className="btn-r" disabled style={{opacity:.4,cursor:'default'}}>📄 Recibo pendiente</button>}
                  {reciboRentaDisponible && (
                    <ComprobanteSlot
                      imgUrl={mes.data.comprobanteRenta}
                      tipo="Renta"
                      onSubir={(file) => subirComprobante(mes, 'Renta', file)}
                      onBorrar={() => borrarComprobante(mes, 'Renta')}
                    />
                  )}
                </div>

                {/* ── LUZ (mes anterior) ── */}
                {luzAplica && luzMes && (
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                    {tieneLuz
                      ? <button className="btn-l" onClick={() => generarLuz(luzMes, { lecturaAnt, lecturaAct, consumo, tarifaEf, montoEnergia, montoLuz, kWhPlaza, fijoLocal, cargosFijos, nLocalesMed })}>⚡ Recibo de luz {luzLabel} — L {fmt(montoLuz)}</button>
                      : <button className="btn-l" disabled style={{opacity:.4,cursor:'default'}}>⚡ Luz no disponible</button>}
                    {tieneLuz && (
                      <ComprobanteSlot
                        imgUrl={luzData.comprobanteLuz}
                        tipo="Luz"
                        onSubir={(file) => subirComprobante(luzMes, 'Luz', file)}
                        onBorrar={() => borrarComprobante(luzMes, 'Luz')}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div style={{textAlign:'center',marginTop:'1.5rem',fontSize:'.72rem',color:'rgba(60,60,70,.35)'}}>Stefany Plaza · D&amp;L Soluciones</div>
      </div>
    </div>
  )
}

// Slot del comprobante:
//   - Sin imagen: botón "📎 Subir comprobante"
//   - Con imagen: nombre + thumbnail clickeable (abre lightbox in-app) + X para borrar
function ComprobanteSlot({ imgUrl, tipo, onSubir, onBorrar }) {
  const lb = useLightbox()
  if (!imgUrl) {
    return (
      <label style={{
        display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.42rem .75rem',borderRadius:8,
        cursor:'pointer',fontSize:'.74rem',fontWeight:600,
        background:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.7)',
        color:'#6E6E78',backdropFilter:'blur(8px)',
      }}>
        <input type="file" accept="image/*" style={{display:'none'}}
          onChange={e => onSubir(e.target.files[0])} />
        📎 Subir comprobante
      </label>
    )
  }
  return (
    <>
      <div style={{
        display:'inline-flex',alignItems:'center',gap:'.5rem',padding:'.3rem .55rem',borderRadius:8,
        background:'rgba(52,199,89,0.10)',border:'1px solid rgba(52,199,89,0.35)',
      }}>
        <span style={{fontSize:'.75rem',fontWeight:600,color:'#1A7F35'}}>Comprobante {tipo.toLowerCase()}</span>
        <img src={imgUrl} alt={`comp ${tipo}`}
          style={{width:36,height:36,objectFit:'cover',borderRadius:5,border:'1px solid rgba(52,199,89,0.4)',cursor:'pointer'}}
          onClick={() => lb.open(imgUrl)}
          title="Click para verla" />
        <button onClick={onBorrar} title="Borrar"
          style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(255,59,48,0.85)',color:'#fff',
            cursor:'pointer',fontWeight:700,fontSize:'.8rem',fontFamily:'inherit',display:'grid',placeItems:'center',padding:0}}>
          ×
        </button>
      </div>
      {lb.element}
    </>
  )
}
