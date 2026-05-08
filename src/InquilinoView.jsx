import { useState, useEffect } from 'react'
import { monthKey } from './keys'

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
  <img src="${DL_LOGO}" alt="D&L Soluciones" style="width:100%;display:block" />
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
    <div class="fd">
      <span style="color:#F37A72">📞</span><span>+504 9462-8518</span><span style="color:#F37A72">|</span>
      <span style="color:#F37A72">✉</span><span>soluciones_dyl@yahoo.com</span><span style="color:#F37A72">|</span>
      <span style="color:#F37A72">📍</span><span>Res. Altos de Venecia 1</span><span style="color:#F37A72">|</span>
      <span>RTN: 0801-9022-372253</span>
    </div>
    <div class="ft"></div>
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
.pill-g{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(52,199,89,.15);color:#1A7F35;border:1px solid rgba(52,199,89,.3)}
.pill-o{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(255,159,10,.15);color:#B25800;border:1px solid rgba(255,159,10,.3)}
.pill-x{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(120,120,130,.1);color:#666;border:1px solid rgba(120,120,130,.2)}
.dg{width:6px;height:6px;border-radius:50%;background:#34C759;box-shadow:0 0 6px #34C759}
.do{width:6px;height:6px;border-radius:50%;background:#FF9F0A;box-shadow:0 0 6px #FF9F0A}
.dx{width:6px;height:6px;border-radius:50%;background:#999}
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
  const [config, setConfig]   = useState({})
  const [meses, setMeses]     = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { config: cfg, locales } = await loadCfg()
      if (cancelled) return
      setConfig(cfg)
      const loc = locales.find(l => l.id === session.localId)
      setLocal(loc)
      // Si el local tiene contratoDesde, no mostrar meses anteriores a esa fecha.
      // Esto evita que un inquilino nuevo vea pagos del inquilino anterior.
      const desdeStr = loc?.contratoDesde // 'YYYY-MM-DD'
      const desde = desdeStr ? new Date(desdeStr + 'T00:00:00') : null
      const months = []
      const now = new Date()
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear(); const m = d.getMonth()
        const finDeMes = new Date(y, m + 1, 0)
        if (desde && desde > finDeMes) continue
        const data = await loadMonth(y, m)
        const pago = (data.pagos || {})[session.localId] || {}
        months.push({ year: y, monthIdx: m, data: pago, factura: data.factura || {} })
      }
      if (cancelled) return
      setMeses(months); setLoading(false)
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

  const subirComprobante = async (mes, tipo, file) => {
    if (!file) return
    try {
      const b64 = await comprimirImagen(file)
      const key = monthKey(mes.year, mes.monthIdx)
      const r = await window.storage.get(key)
      const data = r ? JSON.parse(r) : { pagos: {}, factura: {} }
      data.pagos = data.pagos || {}
      data.pagos[session.localId] = {
        ...(data.pagos[session.localId] || {}),
        [`comprobante${tipo}`]: b64,
        [`comprobante${tipo}Date`]: new Date().toISOString(),
      }
      await window.storage.set(key, JSON.stringify(data))
      setMeses(prev => prev.map(m =>
        m.year === mes.year && m.monthIdx === mes.monthIdx
          ? { ...m, data: { ...m.data, [`comprobante${tipo}`]: b64 } }
          : m
      ))
    } catch(e) { alert('Error al subir la imagen. Intentá de nuevo.') }
  }

  const registrarActividad = async (mes, tipo) => {
    try {
      const key = monthKey(mes.year, mes.monthIdx)
      const r = await window.storage.get(key)
      const data = r ? JSON.parse(r) : { pagos: {}, factura: {} }
      data.pagos = data.pagos || {}
      data.pagos[session.localId] = {
        ...(data.pagos[session.localId] || {}),
        [`actividad${tipo}`]: new Date().toISOString(),
        [`actividadNombre`]: session.nombre || local?.inquilino || 'Inquilino',
      }
      await window.storage.set(key, JSON.stringify(data))
    } catch(e) {}
  }

  const generarRenta = (mes) => {
    registrarActividad(mes, 'Renta')
    // Usar tasa congelada del día que el admin marcó como pagado, si existe
    const tasaUsada = mes.data.tasaCambioCongelado || config.tasaCambio || 25
    const precioM2  = getPrecioMes(mes.year, mes.monthIdx)
    const base  = (local.m2 || 0) * precioM2 * tasaUsada
    const renta = base * (1 + (config.isv || 0.15))
    abrirPDF(buildPDF({
      tipo: 'renta', inquilino: session.nombre || local?.inquilino || 'Inquilino',
      localNum: local?.numero, periodo: `${MESES[mes.monthIdx]} ${mes.year}`,
      fechaEmision: fechaHoy(),
      reciboNum: `PS-${mes.year}-${String(mes.monthIdx+1).padStart(2,'0')}-${String(local?.numero).padStart(3,'0')}`,
      m2: local?.m2, precioUSD: precioM2, tasa: tasaUsada,
      isv: config.isv || 0.15, rentaBase: base, isvMonto: base*(config.isv||0.15), rentaTotal: renta,
    }))
  }

  const generarLuz = (mes) => {
    registrarActividad(mes, 'Luz')
    const { data, factura } = mes
    const lecturaAnt = data.lecturaAnterior ?? (data.lecturaInicial ?? 0)
    const lecturaAct = data.lecturaActual ?? 0
    const consumo    = lecturaAct - lecturaAnt
    const tarifaEf   = data.tarifaEfectiva || factura?.tarifaEfectiva || 0
    const montoLuz   = consumo * tarifaEf
    abrirPDF(buildPDF({
      tipo: 'luz', inquilino: session.nombre || local?.inquilino || 'Inquilino',
      localNum: local?.numero, periodo: `${MESES[mes.monthIdx]} ${mes.year}`,
      fechaEmision: fechaHoy(),
      reciboNum: `PS-${mes.year}-${String(mes.monthIdx+1).padStart(2,'0')}-L${String(local?.numero).padStart(2,'0')}`,
      lecturaAnt, lecturaAct, consumo, tarifaEfectiva: tarifaEf, montoLuz,
      kWhPlaza: factura?.kWhTotal || 0, montoPlaza: factura?.montoTotal || 0,
    }))
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{CSS}</style><div style={{color:'#6366F1',fontSize:'1rem',fontFamily:'Geist,sans-serif'}}>Cargando…</div></div>

  const renta = calcRenta(local)

  return (
    <div style={{minHeight:'100vh',padding:'1.5rem 1rem 4rem',fontFamily:'Geist,-apple-system,sans-serif',color:'#1C1C1E'}}>
      <style>{CSS}</style>
      <div style={{maxWidth:600,margin:'0 auto'}}>

        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'.67rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.2rem'}}>🏢 Plaza Stefany</div>
            <div style={{fontSize:'1.05rem',fontWeight:700,lineHeight:1.2}}>{session.nombre || local?.inquilino}</div>
            <div style={{fontSize:'.78rem',color:'#666',marginTop:'.22rem'}}>Local {local?.numero} · {local?.m2} m²</div>
          </div>
          <button className="btn-g" onClick={onLogout} style={{fontSize:'.78rem'}}>Salir</button>
        </div>

        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem'}}>
          <div style={{fontSize:'.65rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.5rem'}}>Renta mensual</div>
          <div style={{fontSize:'2rem',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>L {fmt(renta)}</div>
          <div style={{fontSize:'.75rem',color:'#888',marginTop:'.2rem'}}>{local?.m2} m² × ${config.rentPerM2USD||29} × L {config.tasaCambio||25} + ISV {((config.isv||0.15)*100).toFixed(0)}%</div>
        </div>

        <div style={{fontSize:'.67rem',fontWeight:600,color:'rgba(60,60,70,.55)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.6rem',paddingLeft:'.2rem'}}>Historial de pagos</div>

        {meses.map((mes) => {
          const { data, factura } = mes
          const rentaPagada = !!data.rentaPagada
          const luzPagada   = !!data.luzPagada
          const tipoLuz     = local?.tipoLuz || 'incluido'
          const luzAplica   = tipoLuz !== 'incluido'
          const esActual    = mes.year === today.getFullYear() && mes.monthIdx === today.getMonth()
          const lecturaAnt  = data.lecturaAnterior ?? (data.lecturaInicial ?? null)
          const lecturaAct  = data.lecturaActual ?? null
          const tarifaEf    = data.tarifaEfectiva || factura?.tarifaEfectiva || 0
          const consumo     = lecturaAnt !== null && lecturaAct !== null ? lecturaAct - lecturaAnt : null
          const montoLuz    = consumo !== null && tarifaEf > 0 ? consumo * tarifaEf : (data.luzMonto || 0)
          const tieneLuz    = luzAplica && montoLuz > 0 && tarifaEf > 0
          const luzNueva    = tieneLuz && !luzPagada && esActual
          // El recibo de renta solo está disponible si ya fue registrado por el admin
          const reciboRentaDisponible = rentaPagada || !esActual
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
                  <div style={{fontSize:'.67rem',color:'#888'}}>Renta</div>
                  <div style={{fontWeight:600,fontSize:'.88rem',fontVariantNumeric:'tabular-nums'}}>L {fmt(rentaMes)}</div>
                  {luzAplica && <><div style={{fontSize:'.67rem',color:'#888',marginTop:'.2rem'}}>Luz</div><div style={{fontWeight:600,fontSize:'.88rem',color: tieneLuz ? '#0EA5E9' : '#bbb',fontVariantNumeric:'tabular-nums'}}>{tieneLuz ? `L ${fmt(montoLuz)}` : '—'}</div></>}
                </div>
              </div>

              <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'.65rem',alignItems:'center'}}>
                <span style={{fontSize:'.67rem',color:'#888'}}>Renta</span>
                {rentaPagada ? <span className="pill-g"><span className="dg"/>Pagada</span> : <span className="pill-o"><span className="do"/>Pendiente</span>}
                {luzAplica && <><span style={{fontSize:'.67rem',color:'#888',marginLeft:'.2rem'}}>Luz</span>
                  {!tieneLuz ? <span className="pill-x"><span className="dx"/>No disponible</span>
                    : luzPagada ? <span className="pill-g"><span className="dg"/>Pagada</span>
                    : <span className="pill-o"><span className="do"/>Pendiente</span>}</>}
                {!luzAplica && <><span style={{fontSize:'.67rem',color:'#888',marginLeft:'.2rem'}}>Luz</span><span className="pill-x"><span className="dx"/>Incluida</span></>}
              </div>

              <div style={{borderTop:'1px solid rgba(255,255,255,.5)',paddingTop:'.75rem',display:'flex',flexDirection:'column',gap:'.55rem'}}>

                {/* ── RENTA ── */}
                <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                  {reciboRentaDisponible
                    ? <button className="btn-r" onClick={() => generarRenta(mes)}>📄 Recibo de renta</button>
                    : <button className="btn-r" disabled style={{opacity:.4,cursor:'default'}}>📄 Recibo pendiente</button>}
                  {reciboRentaDisponible && (
                    <label style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.42rem .75rem',borderRadius:8,cursor:'pointer',fontSize:'.74rem',fontWeight:600,
                      background: mes.data.comprobanteRenta ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.5)',
                      border: mes.data.comprobanteRenta ? '1px solid rgba(52,199,89,0.35)' : '1px solid rgba(255,255,255,0.7)',
                      color: mes.data.comprobanteRenta ? '#1A7F35' : '#666',
                      backdropFilter:'blur(8px)',
                    }}>
                      <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                        onChange={e => subirComprobante(mes,'Renta',e.target.files[0])} />
                      {mes.data.comprobanteRenta ? '✅ Comprobante renta' : '📎 Subir comprobante'}
                    </label>
                  )}
                  {mes.data.comprobanteRenta && (
                    <img src={mes.data.comprobanteRenta} alt="comp renta"
                      style={{width:36,height:28,objectFit:'cover',borderRadius:5,border:'1px solid rgba(52,199,89,0.4)',cursor:'pointer'}}
                      onClick={() => window.open(mes.data.comprobanteRenta,'_blank')} />
                  )}
                </div>

                {/* ── LUZ ── */}
                {luzAplica && (
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
                    {tieneLuz
                      ? <button className="btn-l" onClick={() => generarLuz(mes)}>⚡ Recibo de luz — L {fmt(montoLuz)}</button>
                      : <button className="btn-l" disabled style={{opacity:.4,cursor:'default'}}>⚡ Luz no disponible</button>}
                    {tieneLuz && (
                      <label style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.42rem .75rem',borderRadius:8,cursor:'pointer',fontSize:'.74rem',fontWeight:600,
                        background: mes.data.comprobanteLuz ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.5)',
                        border: mes.data.comprobanteLuz ? '1px solid rgba(52,199,89,0.35)' : '1px solid rgba(255,255,255,0.7)',
                        color: mes.data.comprobanteLuz ? '#1A7F35' : '#666',
                        backdropFilter:'blur(8px)',
                      }}>
                        <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                          onChange={e => subirComprobante(mes,'Luz',e.target.files[0])} />
                        {mes.data.comprobanteLuz ? '✅ Comprobante luz' : '📎 Subir comprobante'}
                      </label>
                    )}
                    {mes.data.comprobanteLuz && (
                      <img src={mes.data.comprobanteLuz} alt="comp luz"
                        style={{width:36,height:28,objectFit:'cover',borderRadius:5,border:'1px solid rgba(52,199,89,0.4)',cursor:'pointer'}}
                        onClick={() => window.open(mes.data.comprobanteLuz,'_blank')} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div style={{textAlign:'center',marginTop:'1.5rem',fontSize:'.72rem',color:'rgba(60,60,70,.35)'}}>Plaza Stefany · D&amp;L Soluciones</div>
      </div>
    </div>
  )
}
