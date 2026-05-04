import { useState, useEffect } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const fmt = (n) => Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function loadCfg() {
  try {
    const r = await window.storage.get('config-and-locales')
    if (r) return typeof r === 'string' ? JSON.parse(r) : r
  } catch(e) {}
  return { config: {}, locales: [] }
}

async function loadMonth(year, monthIdx) {
  try {
    const key = `pagos:${year}-${String(monthIdx).padStart(2,'0')}`
    const r = await window.storage.get(key)
    if (r) return typeof r === 'string' ? JSON.parse(r) : r
  } catch(e) {}
  return {}
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Geist', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    background:
      radial-gradient(ellipse 80% 60% at 10% 0%, rgba(99,102,241,0.35) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 90% 5%, rgba(236,72,153,0.25) 0%, transparent 50%),
      radial-gradient(ellipse 50% 60% at 70% 85%, rgba(20,184,166,0.20) 0%, transparent 55%),
      #EEF0F8;
    background-attachment: fixed;
    min-height: 100vh;
  }
  .glass { background: rgba(255,255,255,0.55); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); border: 1px solid rgba(255,255,255,0.65); border-radius: 18px; box-shadow: 0 2px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8); }
  .pill-paid { display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(52,199,89,0.15);color:#1A7F35;border:1px solid rgba(52,199,89,0.3); }
  .pill-pend { display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(255,159,10,0.15);color:#B25800;border:1px solid rgba(255,159,10,0.3); }
  .pill-na   { display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:rgba(120,120,130,0.1);color:#666;border:1px solid rgba(120,120,130,0.2); }
  .dot-paid { width:6px;height:6px;border-radius:50%;background:#34C759;box-shadow:0 0 6px #34C759; }
  .dot-pend { width:6px;height:6px;border-radius:50%;background:#FF9F0A;box-shadow:0 0 6px #FF9F0A; }
  .dot-na   { width:6px;height:6px;border-radius:50%;background:#999; }
  .btn-main { background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;border-radius:10px;padding:.6rem 1.1rem;font-weight:600;font-size:.85rem;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(99,102,241,0.35); }
  .btn-ghost { background:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.7);border-radius:10px;padding:.5rem .9rem;font-size:.82rem;font-weight:500;cursor:pointer;font-family:inherit;color:#333;backdrop-filter:blur(8px); }
  .month-card { background:rgba(255,255,255,0.5);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.7);border-radius:14px;padding:1rem 1.2rem;margin-bottom:.6rem;transition:all .2s; }
  .month-card:hover { transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,0.1); }
`

export default function InquilinoView({ session, onLogout }) {
  const [local, setLocal] = useState(null)
  const [config, setConfig] = useState({})
  const [meses, setMeses] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()

  useEffect(() => {
    async function load() {
      const { config: cfg, locales } = await loadCfg()
      setConfig(cfg)
      const loc = locales.find(l => l.id === session.localId)
      setLocal(loc)

      // Cargar últimos 12 meses
      const months = []
      for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth()
        const data = await loadMonth(y, m)
        const pagoLocal = (data.pagos || {})[session.localId] || {}
        months.push({ year: y, monthIdx: m, data: pagoLocal, factura: data.factura || {} })
      }
      setMeses(months)
      setLoading(false)
    }
    load()
  }, [])

  const calcRenta = (loc) => {
    if (!loc) return 0
    const usd = (loc.m2 || 0) * (config.rentPerM2USD || 29)
    return usd * (config.tasaCambio || 25) * (1 + (config.isv || 0.15))
  }

  const handleDownloadRecibo = (mes) => {
    // Abrir modal de impresión del recibo
    // Por ahora muestra un alert con los datos — en siguiente iteración generamos PDF
    alert(`Recibo ${MESES[mes.monthIdx]} ${mes.year}\nRenta: L ${fmt(calcRenta(local))}\nLuz: L ${fmt(mes.data.luzMonto || 0)}\n\nFuncionalidad de PDF próximamente.`)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{css}</style>
      <div style={{color:'#6366F1',fontSize:'1rem',fontFamily:'Geist, sans-serif'}}>Cargando…</div>
    </div>
  )

  const renta = calcRenta(local)

  return (
    <div style={{minHeight:'100vh',padding:'1.5rem 1rem 4rem',fontFamily:'Geist, -apple-system, sans-serif',color:'#1C1C1E'}}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'.7rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.2rem'}}>🏢 Plaza Stefany</div>
            <div style={{fontSize:'1.1rem',fontWeight:700}}>{session.nombre || local?.inquilino || 'Inquilino'}</div>
            <div style={{fontSize:'.8rem',color:'#666',marginTop:'.1rem'}}>Local {local?.numero} · {local?.m2} m²</div>
          </div>
          <button className="btn-ghost" onClick={onLogout} style={{fontSize:'.78rem'}}>Salir</button>
        </div>

        {/* ── RESUMEN RENTA ── */}
        <div className="glass" style={{padding:'1.2rem 1.5rem',marginBottom:'1rem'}}>
          <div style={{fontSize:'.68rem',fontWeight:600,color:'#6366F1',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.6rem'}}>Renta mensual</div>
          <div style={{fontSize:'2rem',fontWeight:700,color:'#1C1C1E',fontVariantNumeric:'tabular-nums'}}>L {fmt(renta)}</div>
          <div style={{fontSize:'.78rem',color:'#888',marginTop:'.2rem'}}>
            {local?.m2} m² × ${config.rentPerM2USD || 29} × {config.tasaCambio || 25} + ISV {((config.isv || 0.15) * 100).toFixed(0)}%
          </div>
        </div>

        {/* ── HISTORIAL ── */}
        <div style={{fontSize:'.7rem',fontWeight:600,color:'rgba(60,60,70,.6)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'.6rem',paddingLeft:'.2rem'}}>Historial de pagos</div>

        {meses.map((mes) => {
          const rentaPagada = !!mes.data.rentaPagada
          const luzPagada = !!mes.data.luzPagada
          const luzMonto = mes.data.luzMonto || 0
          const tipoLuz = local?.tipoLuz || 'incluido'
          const luzAplica = tipoLuz !== 'incluido'
          const esActual = mes.year === today.getFullYear() && mes.monthIdx === today.getMonth()

          return (
            <div key={`${mes.year}-${mes.monthIdx}`} className="month-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.5rem'}}>
                    <span style={{fontWeight:600,fontSize:'.95rem'}}>{MESES[mes.monthIdx]} {mes.year}</span>
                    {esActual && <span style={{fontSize:'.65rem',fontWeight:600,background:'rgba(99,102,241,.12)',color:'#6366F1',padding:'.1rem .4rem',borderRadius:6,letterSpacing:'.05em'}}>ACTUAL</span>}
                  </div>
                  <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                    {/* Renta */}
                    <div>
                      <span style={{fontSize:'.68rem',color:'#888',marginRight:'.3rem'}}>Renta</span>
                      {rentaPagada
                        ? <span className="pill-paid"><span className="dot-paid"/>Pagada</span>
                        : <span className="pill-pend"><span className="dot-pend"/>Pendiente</span>}
                    </div>
                    {/* Luz */}
                    {luzAplica && (
                      <div>
                        <span style={{fontSize:'.68rem',color:'#888',marginRight:'.3rem'}}>Luz</span>
                        {luzPagada
                          ? <span className="pill-paid"><span className="dot-paid"/>Pagada</span>
                          : luzMonto > 0
                            ? <span className="pill-pend"><span className="dot-pend"/>Pendiente</span>
                            : <span className="pill-na"><span className="dot-na"/>Sin datos</span>}
                      </div>
                    )}
                    {!luzAplica && (
                      <div>
                        <span style={{fontSize:'.68rem',color:'#888',marginRight:'.3rem'}}>Luz</span>
                        <span className="pill-na"><span className="dot-na"/>Incluida</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Montos */}
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'.7rem',color:'#888'}}>Renta</div>
                  <div style={{fontWeight:600,fontSize:'.9rem',fontVariantNumeric:'tabular-nums'}}>L {fmt(renta)}</div>
                  {luzAplica && luzMonto > 0 && <>
                    <div style={{fontSize:'.7rem',color:'#888',marginTop:'.3rem'}}>Luz</div>
                    <div style={{fontWeight:600,fontSize:'.9rem',color:'#6366F1',fontVariantNumeric:'tabular-nums'}}>L {fmt(luzMonto)}</div>
                  </>}
                </div>
              </div>

              {/* Download button — solo si hay datos */}
              {(rentaPagada || luzPagada || luzMonto > 0) && (
                <div style={{marginTop:'.75rem',borderTop:'1px solid rgba(255,255,255,0.5)',paddingTop:'.75rem',display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                  <button className="btn-ghost" style={{fontSize:'.75rem',padding:'.4rem .75rem'}} onClick={() => handleDownloadRecibo(mes)}>
                    📄 Ver recibo renta
                  </button>
                  {luzAplica && luzMonto > 0 && (
                    <button className="btn-ghost" style={{fontSize:'.75rem',padding:'.4rem .75rem'}} onClick={() => handleDownloadRecibo(mes)}>
                      ⚡ Ver recibo luz
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div style={{textAlign:'center',marginTop:'1.5rem',fontSize:'.75rem',color:'rgba(60,60,70,.4)'}}>
          Plaza Stefany · D&L Soluciones
        </div>
      </div>
    </div>
  )
}
