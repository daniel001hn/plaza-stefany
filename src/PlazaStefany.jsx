// Plaza Stefany - Version con Supabase (conexion a BD en la nube)
// Generado automaticamente - no editar manualmente

import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings, Plus, Check, X, Zap, Building2,
  ChevronLeft, ChevronRight, Trash2, Edit3, ExternalLink,
  Receipt, Save, TrendingUp, Activity, Wallet, AlertCircle,
  Sparkles, Circle, ArrowRight, FileText, Info, Calculator,
  History, ChevronDown, ChevronUp, Printer, Download,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const DEFAULT_CONFIG = {
  rentPerM2: 29,
  isv: 0.15,
  plazaNombre: 'Plaza Stefany',
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const fmt = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmt2 = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const monthKey = (year, monthIdx) => `pagos:${year}-${String(monthIdx + 1).padStart(2, '0')}`;

function getPagos(md) {
  if (!md || typeof md !== 'object') return {};
  if (md.pagos !== undefined || md.factura !== undefined) return md.pagos || {};
  return md;
}
function getFactura(md) { return (md && md.factura) || {}; }

async function loadCfg() {
  try {
    const r = await window.storage.get('config-and-locales');
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return { config: DEFAULT_CONFIG, locales: [] };
}
async function saveCfg(d) {
  try { await window.storage.set('config-and-locales', JSON.stringify(d)); return true; }
  catch (e) { return false; }
}
async function loadMonth(year, monthIdx) {
  try {
    const r = await window.storage.get(monthKey(year, monthIdx));
    if (r && r.value) return JSON.parse(r.value);
  } catch (e) {}
  return {};
}
async function saveMonth(year, monthIdx, data) {
  try { await window.storage.set(monthKey(year, monthIdx), JSON.stringify(data)); return true; }
  catch (e) { return false; }
}

function calcConsumoLocal(locale, pagos, prevPagos) {
  if ((locale.tipoLuz || 'incluido') !== 'medidor') return null;
  const lecturaActual = pagos[locale.id]?.lecturaActual;
  if (lecturaActual == null) return null;
  const lecturaAnterior = prevPagos[locale.id]?.lecturaActual ?? locale.lecturaInicial;
  if (lecturaAnterior == null) return null;
  return lecturaActual - lecturaAnterior;
}

function calcTotalKwhSubmedidores(locales, pagos, prevPagos) {
  let total = 0;
  locales.forEach((l) => {
    const c = calcConsumoLocal(l, pagos, prevPagos);
    if (c != null && c > 0) total += c;
  });
  return total;
}

function calcTarifaEfectiva(factura, locales, pagos, prevPagos) {
  const monto = Number(factura.montoTotal) || 0;
  if (monto <= 0) return null;
  const totalKwh = calcTotalKwhSubmedidores(locales, pagos, prevPagos);
  if (totalKwh <= 0) return null;
  return monto / totalKwh;
}

function calcConsumoPrincipal(factura, prevFactura) {
  const actual = Number(factura.lecturaPrincipal);
  const anterior = Number(prevFactura.lecturaPrincipal);
  if (!actual || isNaN(actual) || !anterior || isNaN(anterior)) return null;
  return actual - anterior;
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.ps-app {
  font-family: 'Geist', system-ui, sans-serif;
  background: #F2F2F7;
  background-image:
    radial-gradient(circle at 0% 0%, rgba(132, 248, 65, 0.06) 0%, transparent 35%),
    radial-gradient(circle at 100% 100%, rgba(255, 184, 84, 0.04) 0%, transparent 40%),
    radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 24px 24px;
  color: #1C1C1E;
  min-height: 100vh;
  padding: 1.5rem 1.5rem 4rem;
  -webkit-font-smoothing: antialiased;
}
.ps-app * { box-sizing: border-box; }
.ps-mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.ps-card { background: linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.72) 100%); border: 1px solid rgba(255,255,255,0.75); border-radius: 14px; position: relative; overflow: hidden; }
.ps-card-elevated { background: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.72) 100%); border: 1px solid #2E2E38; border-radius: 14px; position: relative; overflow: hidden; }
.ps-card::before, .ps-card-elevated::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.10), transparent); }
.ps-card-hover { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; cursor: pointer; }
.ps-card-hover:hover { transform: translateY(-2px); border-color: #1D4ED833; box-shadow: 0 12px 32px -16px rgba(29,78,216,0.15), 0 0 0 1px #1D4ED822; }
.ps-label { font-size: 0.68rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: #6E6E78; }
.ps-eyebrow { display: inline-flex; align-items: center; gap: .35rem; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #1D4ED8; }
.ps-tab { padding: .55rem 1rem; font-size: 0.85rem; font-weight: 500; color: #8E8E96; background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: .4rem; }
.ps-tab:hover { color: #1C1C1E; background: rgba(255,255,255,0.72); }
.ps-tab-active { color: #F2F2F7; background: #1D4ED8; }
.ps-tab-active:hover { background: #2563EB; color: #F2F2F7; }
.ps-btn { background: #1D4ED8; color: #F2F2F7; padding: .6rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: .4rem; font-family: 'Geist', sans-serif; }
.ps-btn:hover { background: #2563EB; transform: translateY(-1px); }
.ps-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.ps-btn-ghost { background: rgba(255,255,255,0.65); border: 1px solid #2E2E38; color: #1C1C1E; padding: .55rem .9rem; border-radius: 8px; font-weight: 500; font-size: 0.82rem; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: .4rem; font-family: 'Geist', sans-serif; }
.ps-btn-ghost:hover { background: rgba(255,255,255,0.50); border-color: #44444E; }
.ps-btn-icon { background: rgba(255,255,255,0.65); border: 1px solid #2E2E38; color: #B0B0BA; padding: .5rem; border-radius: 8px; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
.ps-btn-icon:hover { background: rgba(255,255,255,0.50); color: #1C1C1E; border-color: #44444E; }
.ps-input { width: 100%; background: #E8E8ED; border: 1px solid #2E2E38; border-radius: 8px; padding: .65rem .85rem; font-family: 'Geist', sans-serif; font-size: 0.9rem; color: #1C1C1E; transition: all .15s; }
.ps-input:focus { outline: none; border-color: #1D4ED8; box-shadow: 0 0 0 3px rgba(132, 248, 65, 0.12); }
.ps-input::placeholder { color: #5A5A64; }
.ps-pill { display: inline-flex; align-items: center; gap: .35rem; padding: .22rem .55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.01em; font-family: 'JetBrains Mono', monospace; }
.ps-pill-paid { background: rgba(29,78,216,0.1); color: #1D4ED8; border: 1px solid rgba(132, 248, 65, 0.25); }
.ps-pill-pending { background: rgba(124,58,237,0.1); color: #7C3AED; border: 1px solid rgba(255, 184, 84, 0.25); }
.ps-pill-na { background: rgba(0,0,0,0.03); color: #6E6E78; border: 1px solid rgba(0,0,0,0.10); }
.ps-pill-dot { width: 6px; height: 6px; border-radius: 50%; }
.ps-pill-paid .ps-pill-dot { background: #1D4ED8; box-shadow: 0 0 8px #1D4ED8; }
.ps-pill-pending .ps-pill-dot { background: #7C3AED; box-shadow: 0 0 8px #7C3AED; }
.ps-pill-na .ps-pill-dot { background: #6E6E78; }
.ps-modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, .65); backdrop-filter: blur(8px); z-index: 50; display: flex; align-items: flex-start; justify-content: center; padding: 4vh 1rem; overflow-y: auto; animation: psFade .2s ease; }
.ps-modal { width: 100%; max-width: 540px; animation: psSlide .25s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes psFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes psSlide { from { opacity: 0; transform: translateY(-12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.ps-fade-in { animation: psFadeIn .4s ease both; }
@keyframes psFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.ps-bar-bg { position: relative; height: 4px; background: rgba(255,255,255,0.75); border-radius: 2px; overflow: hidden; }
.ps-bar-fill { position: absolute; top: 0; left: 0; bottom: 0; border-radius: 2px; transition: width .6s cubic-bezier(0.16, 1, 0.3, 1); }
.ps-checkbox { width: 18px; height: 18px; appearance: none; background: #E8E8ED; border: 1.5px solid #44444E; border-radius: 5px; cursor: pointer; position: relative; transition: all .15s; }
.ps-checkbox:checked { background: #1D4ED8; border-color: #1D4ED8; }
.ps-checkbox:checked::after { content: ''; position: absolute; left: 5px; top: 2px; width: 4px; height: 8px; border: solid #F2F2F7; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.ps-divider-soft { height: 1px; background: linear-gradient(90deg, transparent, #2E2E38 20%, #2E2E38 80%, transparent); }
.ps-glow-pulse { animation: psGlowPulse 2.5s ease-in-out infinite; }
@keyframes psGlowPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 184, 84, 0.3); } 50% { box-shadow: 0 0 0 6px rgba(255, 184, 84, 0); } }

.ps-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'JetBrains Mono', monospace; font-size: .8rem; }
.ps-table th { text-align: left; padding: .65rem .8rem; background: #E8E8ED; color: #6E6E78; font-weight: 500; font-size: .68rem; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #2E2E38; position: sticky; top: 0; }
.ps-table td { padding: .7rem .8rem; border-bottom: 1px solid rgba(255,255,255,0.75); color: #1C1C1E; }
.ps-table tr:last-child td { border-bottom: none; }
.ps-table tr.ps-table-row { transition: background .15s; }
.ps-table tr.ps-table-row:hover { background: rgba(255,255,255,0.72); }
.ps-table .num { text-align: right; }
`;


const APPLE_GLOBAL_CSS = `
  * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
  body { 
    background: linear-gradient(135deg, #EEF2FF 0%, #F3E8FF 25%, #ECFDF5 55%, #FFF1F2 85%, #EEF2FF 100%) !important;
    background-attachment: fixed !important;
    min-height: 100vh;
  }
  h1, h2, h3 { color: #1C1C1E !important; }
  [style*='color: rgb(255, 255, 255)'],
  [style*='color: rgba(255, 255, 255'] {
    color: #1C1C1E !important;
  }
  div[style*='background: rgb(10,'],
  div[style*='background: rgb(15,'],
  div[style*='background: rgb(18,'],
  div[style*='background: rgb(26,'],
  div[style*='background: rgb(34,'],
  div[style*='background: rgb(28,'],
  div[style*='background: rgb(22,'],
  div[style*='background: rgb(46,'],
  div[style*='background: rgb(38,'] {
    background: rgba(255,255,255,0.78) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 99px; }
`;

export default function App({ supabase }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [locales, setLocales] = useState([]);
  const [view, setView] = useState('dashboard');
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [yearData, setYearData] = useState({});
  const [loading, setLoading] = useState(true);
  const [paymentLocal, setPaymentLocal] = useState(null);
  const [editingLocal, setEditingLocal] = useState(null);
  const [editingFactura, setEditingFactura] = useState(false);
  const [reciboLuz, setReciboLuz] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    (async () => {
      const cl = await loadCfg();
      setConfig({ ...DEFAULT_CONFIG, ...cl.config });
      setLocales(cl.locales || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const result = {};
      for (let m = 0; m < 12; m++) result[m] = await loadMonth(year, m);
      result['_prevDec'] = await loadMonth(year - 1, 11);
      setYearData(result);
    })();
  }, [year]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const calcRenta = (m2) => (m2 || 0) * config.rentPerM2 * (1 + config.isv);

  const navigateMonth = (delta) => {
    let m = monthIdx + delta, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonthIdx(m); setYear(y);
  };

  const monthData = yearData[monthIdx] || {};
  const prevMonthData = monthIdx === 0 ? (yearData['_prevDec'] || {}) : (yearData[monthIdx - 1] || {});
  const pagos = getPagos(monthData);
  const factura = getFactura(monthData);
  const prevPagos = getPagos(prevMonthData);
  const prevFactura = getFactura(prevMonthData);

  const tarifaEfectiva = useMemo(
    () => calcTarifaEfectiva(factura, locales, pagos, prevPagos),
    [factura, locales, pagos, prevPagos]
  );

  const updatePayment = async (localId, updates) => {
    const newPagos = { ...pagos, [localId]: { ...(pagos[localId] || {}), ...updates } };
    const next = { factura, pagos: newPagos };
    setYearData((y) => ({ ...y, [monthIdx]: next }));
    const ok = await saveMonth(year, monthIdx, next);
    if (ok) showToast('Guardado');
  };

  const updateFactura = async (updates) => {
    const newFactura = { ...factura, ...updates };
    const next = { factura: newFactura, pagos };
    setYearData((y) => ({ ...y, [monthIdx]: next }));
    const ok = await saveMonth(year, monthIdx, next);
    if (ok) showToast('Factura ENEE guardada');
    setEditingFactura(false);
  };

  const saveLocale = async (locale) => {
    let next;
    if (locale.id) next = locales.map((l) => (l.id === locale.id ? locale : l));
    else { const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; next = [...locales, { ...locale, id }]; }
    setLocales(next);
    await saveCfg({ config, locales: next });
    setEditingLocal(null);
    showToast(locale.id ? 'Local actualizado' : 'Local agregado');
  };

  const deleteLocale = async (id) => {
    if (!confirm('¿Borrar este local?')) return;
    const next = locales.filter((l) => l.id !== id);
    setLocales(next);
    await saveCfg({ config, locales: next });
    showToast('Local eliminado');
  };

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    await saveCfg({ config: newConfig, locales });
    showToast('Configuración guardada');
  };

  if (loading) {
    return (
      <div className="ps-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#1D4ED8', fontFamily: 'JetBrains Mono, monospace', fontSize: '.85rem', letterSpacing: '0.15em' }}>
          ◯ CARGANDO DATOS
        </div>
      </div>
    );
  }

  return (
    <div className="ps-app">
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Header config={config} view={view} setView={setView} monthIdx={monthIdx} year={year} navigateMonth={navigateMonth} today={today} />

        {view === 'dashboard' && (
          <DashboardView
            locales={locales} yearData={yearData}
            monthIdx={monthIdx} year={year} config={config}
            calcRenta={calcRenta} factura={factura} prevFactura={prevFactura}
            pagos={pagos} prevPagos={prevPagos} tarifaEfectiva={tarifaEfectiva}
            onOpenPayment={setPaymentLocal} onEditFactura={() => setEditingFactura(true)}
            onGoConfig={() => setView('config')}
          />
        )}

        {view === 'historial' && (
          <HistorialView
            locales={locales} yearData={yearData}
            year={year} setYear={setYear} config={config} calcRenta={calcRenta}
          />
        )}

        {view === 'config' && (
          <ConfigView config={config} locales={locales}
            onSaveConfig={saveConfig} onAddLocal={() => setEditingLocal({})}
            onEditLocal={setEditingLocal} onDeleteLocal={deleteLocale} calcRenta={calcRenta}
          />
        )}
      </div>

      {paymentLocal && (
        <PaymentModal local={paymentLocal} monthIdx={monthIdx} year={year}
          data={pagos[paymentLocal.id] || {}} prevData={prevPagos[paymentLocal.id] || {}}
          factura={factura} tarifaEfectiva={tarifaEfectiva} config={config} calcRenta={calcRenta}
          onClose={() => setPaymentLocal(null)}
          onSave={async (updates) => { await updatePayment(paymentLocal.id, updates); setPaymentLocal(null); }}
          onGenerateRecibo={() => setReciboLuz({
            local: paymentLocal,
            data: pagos[paymentLocal.id] || {},
            prevData: prevPagos[paymentLocal.id] || {},
            factura, tarifaEfectiva, monthIdx, year,
          })}
        />
      )}

      {reciboLuz && (
        <ReciboLuzModal
          local={reciboLuz.local} data={reciboLuz.data} prevData={reciboLuz.prevData}
          factura={reciboLuz.factura} tarifaEfectiva={reciboLuz.tarifaEfectiva}
          monthIdx={reciboLuz.monthIdx} year={reciboLuz.year} config={config}
          onClose={() => setReciboLuz(null)}
        />
      )}

      {editingLocal && (
        <LocalEditModal locale={editingLocal} onClose={() => setEditingLocal(null)} onSave={saveLocale} calcRenta={calcRenta} />
      )}

      {editingFactura && (
        <FacturaModal factura={factura} prevFactura={prevFactura} monthIdx={monthIdx} year={year}
          onClose={() => setEditingFactura(false)} onSave={updateFactura}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1D4ED8', color: '#6E6E78', padding: '.6rem 1.2rem', borderRadius: 999,
          fontSize: '.82rem', fontWeight: 600, zIndex: 100, animation: 'psSlide .2s ease',
          display: 'flex', alignItems: 'center', gap: '.45rem',
          boxShadow: '0 8px 32px rgba(29,78,216,0.25)',
        }}>
          <Check size={14} strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}

function Header({ config, view, setView, monthIdx, year, navigateMonth, today }) {
  const isCurrentMonth = monthIdx === today.getMonth() && year === today.getFullYear();
  return (
    <header style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #1D4ED8 0%, #5BC926 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 0 24px rgba(132, 248, 65, 0.35)',
          }}>
            <Building2 size={18} color="#F2F2F7" strokeWidth={2.5} />
          </div>
          <div>
            <div className="ps-eyebrow"><Sparkles size={10} /> CONTROL · v3</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '.1rem' }}>
              {config.plazaNombre}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={`ps-tab ${view === 'dashboard' ? 'ps-tab-active' : ''}`} onClick={() => setView('dashboard')}>
            <Activity size={14} /> Dashboard
          </button>
          <button className={`ps-tab ${view === 'historial' ? 'ps-tab-active' : ''}`} onClick={() => setView('historial')}>
            <History size={14} /> Historial
          </button>
          <button className={`ps-tab ${view === 'config' ? 'ps-tab-active' : ''}`} onClick={() => setView('config')}>
            <Settings size={14} /> Configuración
          </button>
        </div>
      </div>

      {view === 'dashboard' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <button className="ps-btn-icon" onClick={() => navigateMonth(-1)}><ChevronLeft size={16} /></button>
            <div className="ps-card" style={{ padding: '.5rem 1rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <span className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 500 }}>
                {MESES_LARGO[monthIdx]} <span style={{ color: '#6E6E78' }}>{year}</span>
              </span>
              {isCurrentMonth && (
                <span style={{
                  fontSize: '.62rem', padding: '.15rem .45rem', background: 'rgba(29,78,216,0.15)',
                  color: '#1D4ED8', borderRadius: 4, fontWeight: 600, letterSpacing: '.05em',
                }}>AHORA</span>
              )}
            </div>
            <button className="ps-btn-icon" onClick={() => navigateMonth(1)}><ChevronRight size={16} /></button>
          </div>
          <div style={{ fontSize: '.72rem', color: '#5A5A64', fontFamily: 'JetBrains Mono, monospace' }}>
            Última actualización · {today.toLocaleDateString('es-HN')}
          </div>
        </div>
      )}
    </header>
  );
}

// =================================================================
// DASHBOARD
// =================================================================
function DashboardView({
  locales, yearData, monthIdx, year, config, calcRenta,
  factura, prevFactura, pagos, prevPagos, tarifaEfectiva,
  onOpenPayment, onEditFactura, onGoConfig,
}) {
  const consumoPrincipal = calcConsumoPrincipal(factura, prevFactura);
  const consumoSubmedidores = calcTotalKwhSubmedidores(locales, pagos, prevPagos);
  const areasComunes = consumoPrincipal != null && consumoSubmedidores > 0
    ? consumoPrincipal - consumoSubmedidores : null;

  const kpis = useMemo(() => {
    const totalRenta = locales.reduce((s, l) => s + calcRenta(l.m2), 0);
    let totalLuz = 0, cobradoRenta = 0, cobradoLuz = 0;
    let pendientesRenta = 0, pendientesLuz = 0;
    locales.forEach((l) => {
      const d = pagos[l.id] || {};
      const consumo = calcConsumoLocal(l, pagos, prevPagos);
      const montoLuz = (l.tipoLuz === 'medidor' && consumo != null && tarifaEfectiva)
        ? consumo * tarifaEfectiva : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
      totalLuz += montoLuz;
      if (d.rentaPagada) cobradoRenta += calcRenta(l.m2); else pendientesRenta++;
      if (l.tipoLuz !== 'incluido' && montoLuz > 0) {
        if (d.luzPagada) cobradoLuz += montoLuz; else pendientesLuz++;
      }
    });
    return {
      totalRenta, totalLuz, cobradoRenta, cobradoLuz,
      pendientesRenta, pendientesLuz,
      totalCobrado: cobradoRenta + cobradoLuz,
      totalEsperado: totalRenta + totalLuz,
    };
  }, [locales, pagos, prevPagos, tarifaEfectiva, config]);

  const yearChart = useMemo(() => {
    return MESES.map((m, idx) => {
      const md = yearData[idx] || {};
      const p = getPagos(md);
      let renta = 0, luz = 0;
      const prevMonth = idx === 0 ? (yearData['_prevDec'] || {}) : (yearData[idx - 1] || {});
      const prevP = getPagos(prevMonth);
      const fact = getFactura(md);
      const tarifa = calcTarifaEfectiva(fact, locales, p, prevP);
      locales.forEach((l) => {
        const d = p[l.id] || {};
        if (d.rentaPagada) renta += calcRenta(l.m2);
        if (d.luzPagada) {
          const consumo = calcConsumoLocal(l, p, prevP);
          if (l.tipoLuz === 'medidor' && consumo != null && tarifa) luz += consumo * tarifa;
          else if (l.tipoLuz === 'fijo') luz += (l.luzFija || 0);
        }
      });
      return {
        mes: m, renta: Math.round(renta), luz: Math.round(luz),
        total: Math.round(renta + luz), active: idx === monthIdx,
      };
    });
  }, [yearData, locales, config, monthIdx]);

  const yearTotal = yearChart.reduce((s, x) => s + x.total, 0);

  const perLocal = useMemo(() => {
    return locales.map((l) => {
      const d = pagos[l.id] || {};
      const renta = calcRenta(l.m2);
      const consumo = calcConsumoLocal(l, pagos, prevPagos);
      const luz = (l.tipoLuz === 'medidor' && consumo != null && tarifaEfectiva)
        ? consumo * tarifaEfectiva : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
      const cobrado = (d.rentaPagada ? renta : 0) + (d.luzPagada ? luz : 0);
      return { ...l, renta, luz, total: renta + luz, cobrado, consumo };
    });
  }, [locales, pagos, prevPagos, tarifaEfectiva, config]);

  if (locales.length === 0) {
    return (
      <div className="ps-card ps-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 1.25rem',
          background: 'rgba(29,78,216,0.1)', border: '1px solid rgba(132, 248, 65, 0.25)',
          display: 'grid', placeItems: 'center',
        }}>
          <Building2 size={24} color="#1D4ED8" />
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '.5rem' }}>Configurá tu plaza</div>
        <div style={{ color: '#8E8E96', marginBottom: '1.5rem', fontSize: '.92rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
          Agregá los locales con sus m², tipo de cobro de luz e inquilinos para empezar.
        </div>
        <button onClick={onGoConfig} className="ps-btn"><Plus size={14} strokeWidth={2.5} /> Configurar locales</button>
      </div>
    );
  }

  return (
    <div className="ps-fade-in" style={{ display: 'grid', gap: '1rem' }}>
      <FacturaCard
        factura={factura} consumoPrincipal={consumoPrincipal}
        consumoSubmedidores={consumoSubmedidores} areasComunes={areasComunes}
        tarifaEfectiva={tarifaEfectiva} onEdit={onEditFactura}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <KPI label="Cobrado este mes" value={kpis.totalCobrado} target={kpis.totalEsperado} accent="#1D4ED8" icon={<Wallet size={14} />} big />
        <KPI label="Renta" value={kpis.cobradoRenta} target={kpis.totalRenta} accent="#1D4ED8" icon={<Receipt size={14} />} />
        <KPI label="Luz" value={kpis.cobradoLuz} target={kpis.totalLuz} accent="#5AC8FA" icon={<Zap size={14} />} />
        <KPIPending rentaPend={kpis.pendientesRenta} luzPend={kpis.pendientesLuz} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1rem' }}>
        <YearlyChart data={yearChart} year={year} total={yearTotal} />
        <LocalBreakdown perLocal={perLocal} />
      </div>

      <div className="ps-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Circle size={8} fill="#1D4ED8" stroke="none" /> LOCALES · {MESES_LARGO[monthIdx]}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Estado del mes</div>
          </div>
          <div className="ps-mono" style={{ fontSize: '.78rem', color: '#6E6E78' }}>
            {locales.length} {locales.length === 1 ? 'local' : 'locales'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '.5rem' }}>
          {perLocal.map((l, i) => (
            <LocalRow key={l.id} l={l} data={pagos[l.id] || {}} tarifaEfectiva={tarifaEfectiva}
              onClick={() => onOpenPayment(l)} i={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// HISTORIAL VIEW
// =================================================================
function HistorialView({ locales, yearData, year, setYear, config, calcRenta }) {
  const [subView, setSubView] = useState('plaza');

  // Build month-by-month data
  const monthsData = useMemo(() => {
    return MESES.map((m, idx) => {
      const md = yearData[idx] || {};
      const p = getPagos(md);
      const fact = getFactura(md);
      const prevMonth = idx === 0 ? (yearData['_prevDec'] || {}) : (yearData[idx - 1] || {});
      const prevP = getPagos(prevMonth);
      const prevFact = getFactura(prevMonth);
      const tarifa = calcTarifaEfectiva(fact, locales, p, prevP);
      const consumoPrincipal = calcConsumoPrincipal(fact, prevFact);
      const consumoSubmedidores = calcTotalKwhSubmedidores(locales, p, prevP);
      const areasComunes = consumoPrincipal != null && consumoSubmedidores > 0
        ? consumoPrincipal - consumoSubmedidores : null;

      let totalRenta = 0, totalLuz = 0, cobradoRenta = 0, cobradoLuz = 0;
      const localData = {};
      locales.forEach((l) => {
        const d = p[l.id] || {};
        const renta = calcRenta(l.m2);
        const consumo = calcConsumoLocal(l, p, prevP);
        const luz = (l.tipoLuz === 'medidor' && consumo != null && tarifa)
          ? consumo * tarifa : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
        totalRenta += renta;
        totalLuz += luz;
        if (d.rentaPagada) cobradoRenta += renta;
        if (d.luzPagada) cobradoLuz += luz;
        localData[l.id] = {
          lecturaActual: d.lecturaActual,
          consumo, renta, luz,
          rentaPagada: !!d.rentaPagada,
          luzPagada: !!d.luzPagada,
          fechaRenta: d.fechaRenta,
          fechaLuz: d.fechaLuz,
        };
      });

      return {
        idx, mes: m, mesLargo: MESES_LARGO[idx],
        factura: fact, consumoPrincipal, consumoSubmedidores, areasComunes, tarifa,
        totalRenta, totalLuz, cobradoRenta, cobradoLuz,
        total: cobradoRenta + cobradoLuz, esperado: totalRenta + totalLuz,
        localData,
        hasData: Object.keys(p).length > 0 || Object.keys(fact).length > 0,
      };
    });
  }, [yearData, locales, config]);

  return (
    <div className="ps-fade-in" style={{ display: 'grid', gap: '1rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <button className="ps-btn-icon" onClick={() => setYear(year - 1)}><ChevronLeft size={16} /></button>
          <div className="ps-card" style={{ padding: '.5rem 1rem' }}>
            <span className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 500 }}>Año {year}</span>
          </div>
          <button className="ps-btn-icon" onClick={() => setYear(year + 1)}><ChevronRight size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: '.35rem' }}>
          <button className={`ps-tab ${subView === 'plaza' ? 'ps-tab-active' : ''}`} onClick={() => setSubView('plaza')}>
            <Building2 size={13} /> Plaza
          </button>
          <button className={`ps-tab ${subView === 'locales' ? 'ps-tab-active' : ''}`} onClick={() => setSubView('locales')}>
            <Activity size={13} /> Locales
          </button>
          <button className={`ps-tab ${subView === 'enee' ? 'ps-tab-active' : ''}`} onClick={() => setSubView('enee')}>
            <Zap size={13} /> ENEE
          </button>
        </div>
      </div>

      {subView === 'plaza' && <HistorialPlaza monthsData={monthsData} year={year} />}
      {subView === 'locales' && <HistorialLocales monthsData={monthsData} locales={locales} year={year} />}
      {subView === 'enee' && <HistorialENEE monthsData={monthsData} year={year} />}
    </div>
  );
}

function HistorialPlaza({ monthsData, year }) {
  const totals = useMemo(() => {
    let renta = 0, luz = 0, cobrado = 0, esperado = 0;
    monthsData.forEach((m) => {
      renta += m.cobradoRenta; luz += m.cobradoLuz;
      cobrado += m.total; esperado += m.esperado;
    });
    return { renta, luz, cobrado, esperado };
  }, [monthsData]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* Year totals */}
      <div className="ps-card-elevated" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>Total cobrado {year}</div>
          <div className="ps-mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: '#1D4ED8', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontSize: '.55em', color: '#6E6E78', marginRight: '.25rem' }}>L</span>
            {fmt(totals.cobrado)}
          </div>
          <div className="ps-mono" style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.2rem' }}>
            de L {fmt(totals.esperado)} esperado
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#1D4ED8' }}><Receipt size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Renta cobrada</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            L {fmt(totals.renta)}
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#5AC8FA' }}><Zap size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Luz cobrada</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            L {fmt(totals.luz)}
          </div>
        </div>
      </div>

      {/* Yearly chart */}
      <div className="ps-card" style={{ padding: '1.25rem' }}>
        <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><TrendingUp size={10} /> EVOLUCIÓN MENSUAL</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Cobranza por mes</div>
        <div style={{ height: 240, marginLeft: '-12px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthsData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.75)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#2E2E38' }} tickLine={false} />
              <YAxis tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                cursor={{ fill: 'rgba(132, 248, 65, 0.05)' }}
                contentStyle={{ background: '#E8E8ED', border: '1px solid #2E2E38', borderRadius: 8, fontSize: '.78rem', fontFamily: 'JetBrains Mono, monospace' }}
                labelStyle={{ color: '#1C1C1E', fontWeight: 600 }}
                formatter={(value, name) => [`L ${fmt(value)}`, name === 'cobradoRenta' ? 'Renta' : 'Luz']}
              />
              <Bar dataKey="cobradoRenta" stackId="a" fill="#1D4ED8" />
              <Bar dataKey="cobradoLuz" stackId="a" fill="#5AC8FA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly table */}
      <div className="ps-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><History size={10} /> MES POR MES</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Resumen anual</div>

        <table className="ps-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="num">Renta</th>
              <th className="num">Luz</th>
              <th className="num">Total cobrado</th>
              <th className="num">Esperado</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {monthsData.map((m) => {
              const pct = m.esperado > 0 ? (m.total / m.esperado) * 100 : 0;
              return (
                <tr key={m.idx} className="ps-table-row" style={{ opacity: m.hasData ? 1 : 0.4 }}>
                  <td style={{ fontWeight: 600 }}>{m.mesLargo}</td>
                  <td className="num">L {fmt(m.cobradoRenta)}</td>
                  <td className="num" style={{ color: '#5AC8FA' }}>L {fmt(m.cobradoLuz)}</td>
                  <td className="num" style={{ color: '#1D4ED8', fontWeight: 600 }}>L {fmt(m.total)}</td>
                  <td className="num" style={{ color: '#6E6E78' }}>L {fmt(m.esperado)}</td>
                  <td className="num" style={{ color: pct >= 100 ? '#1D4ED8' : pct > 50 ? '#7C3AED' : '#6E6E78' }}>
                    {m.esperado > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: '#E8E8ED' }}>
              <td style={{ fontWeight: 700, fontSize: '.85rem' }}>TOTAL {year}</td>
              <td className="num" style={{ fontWeight: 700 }}>L {fmt(monthsData.reduce((s, m) => s + m.cobradoRenta, 0))}</td>
              <td className="num" style={{ fontWeight: 700, color: '#5AC8FA' }}>L {fmt(monthsData.reduce((s, m) => s + m.cobradoLuz, 0))}</td>
              <td className="num" style={{ fontWeight: 700, color: '#1D4ED8' }}>L {fmt(totals.cobrado)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6E6E78' }}>L {fmt(totals.esperado)}</td>
              <td className="num" style={{ fontWeight: 700 }}>
                {totals.esperado > 0 ? `${((totals.cobrado / totals.esperado) * 100).toFixed(0)}%` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistorialLocales({ monthsData, locales, year }) {
  const [expandedLocal, setExpandedLocal] = useState(null);

  if (locales.length === 0) {
    return (
      <div className="ps-card" style={{ padding: '3rem', textAlign: 'center', color: '#6E6E78' }}>
        No hay locales configurados aún.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      {locales.map((l) => {
        const isExpanded = expandedLocal === l.id;
        let totalRenta = 0, totalLuz = 0, totalConsumo = 0;
        let mesesPagosRenta = 0, mesesPagosLuz = 0, mesesConData = 0;

        monthsData.forEach((m) => {
          const ld = m.localData[l.id];
          if (!ld) return;
          if (ld.rentaPagada) { totalRenta += ld.renta; mesesPagosRenta++; }
          if (ld.luzPagada) { totalLuz += ld.luz; mesesPagosLuz++; }
          if (ld.consumo != null) { totalConsumo += ld.consumo; mesesConData++; }
        });

        return (
          <div key={l.id} className="ps-card" style={{ overflow: 'hidden' }}>
            <div
              onClick={() => setExpandedLocal(isExpanded ? null : l.id)}
              style={{
                padding: '1rem 1.25rem', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: 'auto minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto',
                gap: '1rem', alignItems: 'center',
              }}
            >
              <span className="ps-mono" style={{
                fontSize: '.7rem', padding: '.25rem .55rem', background: 'rgba(255,255,255,0.50)',
                borderRadius: 4, color: '#1D4ED8', fontWeight: 600, minWidth: 32, textAlign: 'center',
              }}>{l.numero || '?'}</span>
              <div>
                <div style={{ fontSize: '.95rem', fontWeight: 500 }}>
                  {l.inquilino || <span style={{ color: '#5A5A64' }}>Sin asignar</span>}
                </div>
                <div style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.1rem' }}>
                  {l.m2} m² · {l.nombre || '—'}
                </div>
              </div>
              <div>
                <div className="ps-label" style={{ marginBottom: '.2rem' }}>Total cobrado</div>
                <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 600, color: '#1D4ED8' }}>
                  L {fmt(totalRenta + totalLuz)}
                </div>
              </div>
              <div>
                <div className="ps-label" style={{ marginBottom: '.2rem' }}>Pagos del año</div>
                <div className="ps-mono" style={{ fontSize: '.85rem' }}>
                  {mesesPagosRenta}<span style={{ color: '#6E6E78' }}>/12 R</span>
                  <span style={{ color: '#6E6E78', margin: '0 .35rem' }}>·</span>
                  {mesesPagosLuz}<span style={{ color: '#6E6E78' }}>/12 L</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} color="#6E6E78" /> : <ChevronDown size={16} color="#6E6E78" />}
            </div>

            {isExpanded && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.75)', padding: '1rem 1.25rem', background: '#E8E8ED' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th className="num">Lectura</th>
                        <th className="num">Consumo</th>
                        <th className="num">Renta</th>
                        <th className="num">Luz</th>
                        <th>Estado R</th>
                        <th>Estado L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthsData.map((m) => {
                        const ld = m.localData[l.id] || {};
                        return (
                          <tr key={m.idx} className="ps-table-row" style={{ opacity: m.hasData ? 1 : 0.35 }}>
                            <td style={{ fontWeight: 600 }}>{m.mes}</td>
                            <td className="num" style={{ color: '#8E8E96' }}>
                              {ld.lecturaActual != null ? ld.lecturaActual : '—'}
                            </td>
                            <td className="num" style={{ color: '#5AC8FA' }}>
                              {ld.consumo != null ? `${ld.consumo} kWh` : '—'}
                            </td>
                            <td className="num">{ld.renta ? `L ${fmt(ld.renta)}` : '—'}</td>
                            <td className="num">{ld.luz ? `L ${fmt(ld.luz)}` : '—'}</td>
                            <td>
                              {ld.renta > 0 ? (
                                ld.rentaPagada
                                  ? <span className="ps-pill ps-pill-paid"><span className="ps-pill-dot" />OK</span>
                                  : <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />—</span>
                              ) : <span style={{ color: '#5A5A64' }}>—</span>}
                            </td>
                            <td>
                              {ld.luz > 0 ? (
                                ld.luzPagada
                                  ? <span className="ps-pill ps-pill-paid"><span className="ps-pill-dot" />OK</span>
                                  : <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />—</span>
                              ) : <span style={{ color: '#5A5A64' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'rgba(255,255,255,0.72)' }}>
                        <td style={{ fontWeight: 700 }}>TOTAL</td>
                        <td className="num"></td>
                        <td className="num" style={{ color: '#5AC8FA', fontWeight: 700 }}>{totalConsumo} kWh</td>
                        <td className="num" style={{ fontWeight: 700 }}>L {fmt(totalRenta)}</td>
                        <td className="num" style={{ fontWeight: 700, color: '#5AC8FA' }}>L {fmt(totalLuz)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistorialENEE({ monthsData, year }) {
  const yearTotals = useMemo(() => {
    let monto = 0, kwhPrincipal = 0, kwhSubmedidores = 0, areasComunes = 0;
    let mesesConData = 0;
    monthsData.forEach((m) => {
      if (m.factura.montoTotal) {
        monto += Number(m.factura.montoTotal);
        mesesConData++;
      }
      if (m.consumoPrincipal) kwhPrincipal += m.consumoPrincipal;
      if (m.consumoSubmedidores) kwhSubmedidores += m.consumoSubmedidores;
      if (m.areasComunes) areasComunes += m.areasComunes;
    });
    return { monto, kwhPrincipal, kwhSubmedidores, areasComunes, mesesConData };
  }, [monthsData]);

  // Tarifa efectiva chart
  const tarifaChart = monthsData.filter((m) => m.tarifa).map((m) => ({
    mes: m.mes, tarifa: Number(m.tarifa.toFixed(2)), kwh: m.consumoPrincipal || 0,
  }));

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* ENEE summary */}
      <div className="ps-card-elevated" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#5AC8FA' }}>
            <Zap size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Total ENEE {year}
          </div>
          <div className="ps-mono" style={{ fontSize: '1.6rem', fontWeight: 600, color: '#5AC8FA', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontSize: '.55em', color: '#6E6E78', marginRight: '.25rem' }}>L</span>
            {fmt(yearTotals.monto)}
          </div>
          <div className="ps-mono" style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.2rem' }}>
            {yearTotals.mesesConData} {yearTotals.mesesConData === 1 ? 'mes' : 'meses'} con datos
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>kWh principal</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600 }}>
            {fmt(yearTotals.kwhPrincipal)}
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>kWh submedidores</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600 }}>
            {fmt(yearTotals.kwhSubmedidores)}
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>kWh áreas comunes</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#7C3AED' }}>
            {fmt(yearTotals.areasComunes)}
          </div>
        </div>
      </div>

      {/* Tarifa chart */}
      {tarifaChart.length > 0 && (
        <div className="ps-card" style={{ padding: '1.25rem' }}>
          <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Calculator size={10} /> TARIFA EFECTIVA</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>L/kWh por mes</div>
          <div style={{ height: 200, marginLeft: '-12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tarifaChart} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.75)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#2E2E38' }} tickLine={false} />
                <YAxis tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#E8E8ED', border: '1px solid #2E2E38', borderRadius: 8, fontSize: '.78rem', fontFamily: 'JetBrains Mono, monospace' }}
                  labelStyle={{ color: '#1C1C1E', fontWeight: 600 }}
                  formatter={(v) => [`L ${fmt2(v)}/kWh`, 'Tarifa']}
                />
                <Line type="monotone" dataKey="tarifa" stroke="#1D4ED8" strokeWidth={2.5} dot={{ fill: '#1D4ED8', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ENEE detail table */}
      <div className="ps-card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
        <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><FileText size={10} /> FACTURAS ENEE</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Detalle mensual</div>

        <table className="ps-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="num">Lectura</th>
              <th className="num">kWh principal</th>
              <th className="num">kWh submed.</th>
              <th className="num">Áreas com.</th>
              <th className="num">Monto</th>
              <th className="num">Tarifa ef.</th>
            </tr>
          </thead>
          <tbody>
            {monthsData.map((m) => (
              <tr key={m.idx} className="ps-table-row" style={{ opacity: m.factura.montoTotal ? 1 : 0.35 }}>
                <td style={{ fontWeight: 600 }}>{m.mes}</td>
                <td className="num" style={{ color: '#8E8E96' }}>
                  {m.factura.lecturaPrincipal != null ? m.factura.lecturaPrincipal : '—'}
                </td>
                <td className="num">{m.consumoPrincipal != null ? `${fmt(m.consumoPrincipal)}` : '—'}</td>
                <td className="num" style={{ color: '#5AC8FA' }}>
                  {m.consumoSubmedidores > 0 ? fmt(m.consumoSubmedidores) : '—'}
                </td>
                <td className="num" style={{ color: m.areasComunes < 0 ? '#FF5C5C' : '#7C3AED' }}>
                  {m.areasComunes != null ? `${m.areasComunes}` : '—'}
                </td>
                <td className="num" style={{ color: '#5AC8FA', fontWeight: 600 }}>
                  {m.factura.montoTotal ? `L ${fmt2(m.factura.montoTotal)}` : '—'}
                </td>
                <td className="num" style={{ color: '#1D4ED8', fontWeight: 600 }}>
                  {m.tarifa ? `L ${fmt2(m.tarifa)}` : '—'}
                </td>
              </tr>
            ))}
            <tr style={{ background: '#E8E8ED' }}>
              <td style={{ fontWeight: 700 }}>TOTAL {year}</td>
              <td className="num"></td>
              <td className="num" style={{ fontWeight: 700 }}>{fmt(yearTotals.kwhPrincipal)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#5AC8FA' }}>{fmt(yearTotals.kwhSubmedidores)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#7C3AED' }}>{fmt(yearTotals.areasComunes)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#5AC8FA' }}>L {fmt2(yearTotals.monto)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#1D4ED8' }}>
                {yearTotals.kwhPrincipal > 0 ? `L ${fmt2(yearTotals.monto / yearTotals.kwhPrincipal)} prom.` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =================================================================
// FACTURA CARD
// =================================================================
function FacturaCard({ factura, consumoPrincipal, consumoSubmedidores, areasComunes, tarifaEfectiva, onEdit }) {
  const tieneFactura = factura.montoTotal > 0;

  if (!tieneFactura) {
    return (
      <div className="ps-card-elevated" style={{
        padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', flexWrap: 'wrap', borderColor: 'rgba(255, 184, 84, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="ps-glow-pulse" style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(255, 184, 84, 0.3)',
            display: 'grid', placeItems: 'center',
          }}>
            <FileText size={18} color="#7C3AED" />
          </div>
          <div>
            <div className="ps-eyebrow" style={{ color: '#7C3AED', marginBottom: '.2rem' }}>
              <AlertCircle size={11} /> FACTURA ENEE PENDIENTE
            </div>
            <div style={{ fontSize: '.95rem', fontWeight: 500, color: '#1C1C1E' }}>
              Registrá la factura ENEE del mes
            </div>
            <div style={{ fontSize: '.78rem', color: '#8E8E96', marginTop: '.2rem' }}>
              Sin la factura no se puede calcular cuánto cobrar de luz a cada local.
            </div>
          </div>
        </div>
        <button onClick={onEdit} className="ps-btn"><Plus size={14} strokeWidth={2.5} /> Registrar factura</button>
      </div>
    );
  }

  return (
    <div className="ps-card-elevated" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(90, 200, 250, 0.1)', border: '1px solid rgba(90, 200, 250, 0.25)',
            display: 'grid', placeItems: 'center',
          }}>
            <Zap size={18} color="#5AC8FA" />
          </div>
          <div>
            <div className="ps-eyebrow" style={{ color: '#5AC8FA', marginBottom: '.15rem' }}>
              <FileText size={10} /> FACTURA ENEE
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>Energía del mes</div>
          </div>
        </div>
        <button onClick={onEdit} className="ps-btn-icon"><Edit3 size={13} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem', paddingTop: '.5rem' }}>
        <FacturaStat label="Total ENEE" value={`L ${fmt2(factura.montoTotal)}`} accent="#5AC8FA" />
        <FacturaStat label="Consumo principal"
          value={consumoPrincipal != null ? `${fmt(consumoPrincipal)} kWh` : '—'}
          sub={`Lectura: ${factura.lecturaPrincipal || '—'}`} />
        <FacturaStat label="Submedidores"
          value={consumoSubmedidores > 0 ? `${fmt(consumoSubmedidores)} kWh` : '—'}
          sub={consumoSubmedidores > 0 ? 'Suma de los 5 locales' : 'Falta lecturas'} />
        <FacturaStat label="Áreas comunes"
          value={areasComunes != null ? `${areasComunes} kWh` : '—'}
          sub="Repartido entre locales"
          accent={areasComunes != null && areasComunes < 0 ? '#FF5C5C' : undefined} />
        <FacturaStat label="Tarifa efectiva"
          value={tarifaEfectiva ? `L ${fmt2(tarifaEfectiva)}` : '—'}
          sub="por kWh este mes" accent="#1D4ED8" highlight />
      </div>
    </div>
  );
}

function FacturaStat({ label, value, sub, accent, highlight }) {
  return (
    <div style={{
      padding: highlight ? '.5rem .75rem' : 0,
      background: highlight ? 'rgba(132, 248, 65, 0.06)' : 'transparent',
      border: highlight ? '1px solid rgba(29,78,216,0.2)' : 'none',
      borderRadius: highlight ? 8 : 0,
    }}>
      <div className="ps-label" style={{ marginBottom: '.3rem' }}>{label}</div>
      <div className="ps-mono" style={{
        fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.1,
        color: accent || '#1C1C1E', letterSpacing: '-0.02em',
      }}>{value}</div>
      {sub && <div style={{ fontSize: '.7rem', color: '#6E6E78', marginTop: '.2rem' }}>{sub}</div>}
    </div>
  );
}

function KPI({ label, value, target, accent, icon, big }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  return (
    <div className={big ? 'ps-card-elevated' : 'ps-card'} style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.6rem' }}>
        <div className="ps-label" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: accent }}>
          {icon} {label}
        </div>
        <div style={{ fontSize: '.7rem', color: '#6E6E78', fontFamily: 'JetBrains Mono, monospace' }}>
          {pct.toFixed(0)}%
        </div>
      </div>
      <div className="ps-mono" style={{
        fontSize: big ? '2.2rem' : '1.7rem', fontWeight: 600, lineHeight: 1,
        marginBottom: '.35rem', letterSpacing: '-0.02em',
      }}>
        <span style={{ color: '#6E6E78', fontSize: '.6em', marginRight: '.3rem' }}>L</span>
        {fmt(value)}
      </div>
      <div className="ps-mono" style={{ fontSize: '.72rem', color: '#6E6E78', marginBottom: '.7rem' }}>
        de L {fmt(target)}
      </div>
      <div className="ps-bar-bg">
        <div className="ps-bar-fill" style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 8px ${accent}66` }} />
      </div>
    </div>
  );
}

function KPIPending({ rentaPend, luzPend }) {
  const total = rentaPend + luzPend;
  return (
    <div className="ps-card" style={{ padding: '1.1rem 1.25rem' }}>
      <div className="ps-label" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#7C3AED', marginBottom: '.6rem' }}>
        <AlertCircle size={14} /> Pendientes
      </div>
      <div className="ps-mono" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1, marginBottom: '.7rem', letterSpacing: '-0.02em' }}>
        {total}
      </div>
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        {rentaPend > 0 && <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />{rentaPend} renta</span>}
        {luzPend > 0 && <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />{luzPend} luz</span>}
        {total === 0 && <span className="ps-pill ps-pill-paid"><span className="ps-pill-dot" />Todo al día</span>}
      </div>
    </div>
  );
}

function YearlyChart({ data, year, total }) {
  return (
    <div className="ps-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><TrendingUp size={10} /> COBRANZA {year}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Evolución mensual</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="ps-label">Total año</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1D4ED8', letterSpacing: '-0.02em' }}>
            L {fmt(total)}
          </div>
        </div>
      </div>

      <div style={{ height: 220, marginLeft: '-12px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.75)" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: '#2E2E38' }} tickLine={false} />
            <YAxis tick={{ fill: '#6E6E78', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip
              cursor={{ fill: 'rgba(132, 248, 65, 0.05)' }}
              contentStyle={{ background: '#E8E8ED', border: '1px solid #2E2E38', borderRadius: 8, fontSize: '.78rem', fontFamily: 'JetBrains Mono, monospace' }}
              labelStyle={{ color: '#1C1C1E', fontWeight: 600 }}
              formatter={(value, name) => [`L ${fmt(value)}`, name === 'renta' ? 'Renta' : 'Luz']}
            />
            <Bar dataKey="renta" stackId="a" fill="#1D4ED8">
              {data.map((entry, idx) => <Cell key={idx} fill={entry.active ? '#1D4ED8' : 'rgba(132, 248, 65, 0.55)'} />)}
            </Bar>
            <Bar dataKey="luz" stackId="a" fill="#5AC8FA" radius={[6, 6, 0, 0]}>
              {data.map((entry, idx) => <Cell key={idx} fill={entry.active ? '#5AC8FA' : 'rgba(90, 200, 250, 0.55)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.5rem', fontSize: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#8E8E96' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1D4ED8' }} /> Renta
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#8E8E96' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#5AC8FA' }} /> Luz
        </div>
      </div>
    </div>
  );
}

function LocalBreakdown({ perLocal }) {
  const max = Math.max(...perLocal.map((l) => l.total), 1);
  return (
    <div className="ps-card" style={{ padding: '1.25rem' }}>
      <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Activity size={10} /> POR LOCAL</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Cobranza del mes</div>

      <div style={{ display: 'grid', gap: '.85rem' }}>
        {perLocal.map((l) => {
          const pctTotal = (l.total / max) * 100;
          const pctCobrado = l.total > 0 ? (l.cobrado / l.total) * 100 : 0;
          return (
            <div key={l.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem', fontSize: '.78rem' }}>
                <span style={{ fontWeight: 500 }}>
                  {l.numero} <span style={{ color: '#6E6E78' }}>· {l.inquilino || 'Sin asignar'}</span>
                </span>
                <span className="ps-mono" style={{ color: l.cobrado >= l.total && l.total > 0 ? '#1D4ED8' : '#1C1C1E' }}>
                  L {fmt(l.cobrado)}<span style={{ color: '#6E6E78' }}> / {fmt(l.total)}</span>
                </span>
              </div>
              <div style={{
                position: 'relative', height: 8, background: 'rgba(255,255,255,0.75)', borderRadius: 4, overflow: 'hidden',
                width: `${pctTotal}%`, minWidth: 4,
              }}>
                <div style={{
                  position: 'absolute', inset: 0, width: `${pctCobrado}%`,
                  background: pctCobrado >= 100 ? '#1D4ED8' : 'linear-gradient(90deg, #1D4ED8, #7C3AED)',
                  transition: 'width .6s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: pctCobrado >= 100 ? '0 0 8px rgba(132, 248, 65, 0.5)' : 'none',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocalRow({ l, data, tarifaEfectiva, onClick, i }) {
  const tipoLuz = l.tipoLuz || 'incluido';
  const luzAplica = tipoLuz !== 'incluido';
  const luzCalculable = tipoLuz === 'medidor' ? (l.consumo != null && tarifaEfectiva != null) : true;

  return (
    <div className="ps-card-hover" onClick={onClick} style={{
      background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 10,
      padding: '.9rem 1.1rem',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) auto',
      gap: '1rem', alignItems: 'center', animationDelay: `${i * 60}ms`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.2rem' }}>
          <span className="ps-mono" style={{
            fontSize: '.7rem', padding: '.15rem .4rem', background: 'rgba(255,255,255,0.50)',
            borderRadius: 4, color: '#1D4ED8', fontWeight: 600,
          }}>{l.numero || '?'}</span>
          <span className="ps-mono" style={{ fontSize: '.7rem', color: '#6E6E78' }}>{l.m2} m²</span>
        </div>
        <div style={{ fontSize: '.95rem', fontWeight: 500 }}>
          {l.inquilino || <span style={{ color: '#5A5A64' }}>Sin asignar</span>}
        </div>
        {l.nombre && <div style={{ fontSize: '.75rem', color: '#6E6E78', marginTop: '.1rem' }}>{l.nombre}</div>}
      </div>

      <div>
        <div className="ps-label" style={{ marginBottom: '.25rem' }}>RENTA</div>
        <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 500 }}>L {fmt(l.renta)}</div>
        <div style={{ marginTop: '.3rem' }}>
          {data.rentaPagada
            ? <span className="ps-pill ps-pill-paid"><span className="ps-pill-dot" />Pagada</span>
            : <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />Pendiente</span>}
        </div>
      </div>

      <div>
        <div className="ps-label" style={{ marginBottom: '.25rem' }}>LUZ</div>
        {luzAplica ? (
          luzCalculable ? (
            <>
              <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 500 }}>L {fmt(l.luz)}</div>
              <div style={{ marginTop: '.3rem', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                {l.luz > 0
                  ? (data.luzPagada
                      ? <span className="ps-pill ps-pill-paid"><span className="ps-pill-dot" />Pagada</span>
                      : <span className="ps-pill ps-pill-pending"><span className="ps-pill-dot" />Pendiente</span>)
                  : <span className="ps-pill ps-pill-na"><span className="ps-pill-dot" />—</span>}
                {l.consumo != null && (
                  <span className="ps-mono" style={{ fontSize: '.7rem', color: '#5AC8FA' }}>{l.consumo} kWh</span>
                )}
              </div>
            </>
          ) : (
            <span className="ps-pill ps-pill-na" style={{ marginTop: '.25rem' }}>
              <span className="ps-pill-dot" />Falta datos
            </span>
          )
        ) : (
          <span className="ps-pill ps-pill-na" style={{ marginTop: '.25rem' }}><span className="ps-pill-dot" />Incluida</span>
        )}
      </div>

      <ArrowRight size={16} style={{ color: '#5A5A64' }} />
    </div>
  );
}

// =================================================================
// FACTURA MODAL
// =================================================================
function FacturaModal({ factura, prevFactura, monthIdx, year, onClose, onSave }) {
  const [form, setForm] = useState({
    montoTotal: factura.montoTotal ?? '',
    lecturaPrincipal: factura.lecturaPrincipal ?? '',
    fechaEmision: factura.fechaEmision || '',
    fechaPago: factura.fechaPago || '',
    pagada: !!factura.pagada,
    notas: factura.notas || '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const lecturaAnt = prevFactura.lecturaPrincipal;
  const consumo = (form.lecturaPrincipal !== '' && lecturaAnt != null && !isNaN(Number(lecturaAnt)))
    ? Number(form.lecturaPrincipal) - Number(lecturaAnt) : null;

  const handleSave = () => {
    onSave({
      montoTotal: Number(form.montoTotal) || 0,
      lecturaPrincipal: form.lecturaPrincipal === '' ? null : Number(form.lecturaPrincipal),
      fechaEmision: form.fechaEmision,
      fechaPago: form.fechaPago,
      pagada: form.pagada,
      notas: form.notas,
    });
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal ps-card-elevated" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ color: '#5AC8FA', marginBottom: '.25rem' }}>
              <Zap size={11} /> FACTURA ENEE · {MESES_LARGO[monthIdx]} {year}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>Energía del mes</div>
          </div>
          <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
        </div>

        <div className="ps-divider-soft" style={{ marginBottom: '1.25rem' }} />

        <div style={{
          background: 'rgba(90, 200, 250, 0.06)', border: '1px solid rgba(90, 200, 250, 0.2)',
          padding: '.7rem .9rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '.78rem',
          color: '#8E8E96', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
        }}>
          <Info size={14} color="#5AC8FA" style={{ flexShrink: 0, marginTop: '.1rem' }} />
          <div>
            Metés el <strong style={{ color: '#1C1C1E' }}>monto total</strong> que ENEE te cobró y la <strong style={{ color: '#1C1C1E' }}>lectura del medidor principal</strong>. Con eso la app calcula sola la tarifa efectiva del mes y reparte entre los locales.
          </div>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.3rem' }}>Monto total a pagar (L)</div>
          <input type="number" step="0.01" className="ps-input ps-mono" value={form.montoTotal}
            onChange={(e) => set('montoTotal', e.target.value)} placeholder="11602.05" />
        </div>

        <div style={{
          background: '#E8E8ED', border: '1px solid rgba(255,255,255,0.50)', padding: '.65rem .85rem',
          borderRadius: 8, marginBottom: '.85rem', fontSize: '.78rem', color: '#8E8E96',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.4rem',
        }}>
          <span>Lectura anterior del medidor principal:</span>
          <span className="ps-mono" style={{ color: '#1C1C1E', fontWeight: 600 }}>
            {lecturaAnt != null ? lecturaAnt : '— sin registro previo'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.85rem' }}>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Lectura actual</div>
            <input type="number" className="ps-input ps-mono" value={form.lecturaPrincipal}
              onChange={(e) => set('lecturaPrincipal', e.target.value)} placeholder="13057" />
          </div>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Consumo</div>
            <div className="ps-input ps-mono" style={{ background: 'rgba(255,255,255,0.75)', color: consumo < 0 ? '#FF5C5C' : '#5AC8FA', fontWeight: 600 }}>
              {consumo != null ? `${consumo} kWh` : '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.85rem' }}>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha de emisión</div>
            <input type="date" className="ps-input" value={form.fechaEmision}
              onChange={(e) => set('fechaEmision', e.target.value)} />
          </div>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha límite de pago</div>
            <input type="date" className="ps-input" value={form.fechaPago}
              onChange={(e) => set('fechaPago', e.target.value)} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', padding: '.4rem 0', marginBottom: '.85rem' }}>
          <input type="checkbox" className="ps-checkbox" checked={form.pagada} onChange={(e) => set('pagada', e.target.checked)} />
          <span style={{ fontSize: '.92rem', fontWeight: 500 }}>Ya pagué la factura ENEE</span>
        </label>

        <div style={{ marginBottom: '1.25rem' }}>
          <div className="ps-label" style={{ marginBottom: '.3rem' }}>Notas</div>
          <textarea className="ps-input" rows={2} value={form.notas}
            onChange={(e) => set('notas', e.target.value)} placeholder="Observaciones..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem' }}>
          <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
          <button onClick={handleSave} className="ps-btn"><Save size={14} strokeWidth={2.5} /> Guardar</button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ local, monthIdx, year, data, prevData, factura, tarifaEfectiva, config, calcRenta, onClose, onSave, onGenerateRecibo }) {
  const [form, setForm] = useState({
    rentaPagada: !!data.rentaPagada,
    fechaRenta: data.fechaRenta || '',
    numFactura: data.numFactura || '',
    linkFactura: data.linkFactura || '',
    luzPagada: !!data.luzPagada,
    fechaLuz: data.fechaLuz || '',
    lecturaActual: data.lecturaActual ?? '',
    notas: data.notas || '',
  });
  const tipoLuz = local.tipoLuz || 'incluido';
  const renta = calcRenta(local.m2);
  const lecturaAnterior = prevData.lecturaActual ?? local.lecturaInicial ?? null;

  const consumo = tipoLuz === 'medidor' && form.lecturaActual !== '' && lecturaAnterior != null
    ? Number(form.lecturaActual) - Number(lecturaAnterior) : null;

  const montoLuzCalc = tipoLuz === 'medidor' && consumo != null && tarifaEfectiva
    ? consumo * tarifaEfectiva : (tipoLuz === 'fijo' ? (local.luzFija || 0) : 0);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const handleSave = () => {
    const out = {
      rentaPagada: form.rentaPagada, fechaRenta: form.fechaRenta,
      numFactura: form.numFactura, linkFactura: form.linkFactura, notas: form.notas,
    };
    if (tipoLuz !== 'incluido') {
      out.luzPagada = form.luzPagada;
      out.fechaLuz = form.fechaLuz;
      if (tipoLuz === 'medidor') out.lecturaActual = form.lecturaActual === '' ? null : Number(form.lecturaActual);
      out.montoLuz = montoLuzCalc;
    }
    onSave(out);
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal ps-card-elevated" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: '.3rem' }}>
              <Circle size={6} fill="#1D4ED8" stroke="none" /> {MESES_LARGO[monthIdx]} {year} · LOCAL {local.numero}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.1 }}>
              {local.inquilino || 'Sin inquilino'}
            </div>
          </div>
          <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
        </div>

        <div className="ps-divider-soft" style={{ marginBottom: '1.25rem' }} />

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
            <div className="ps-eyebrow" style={{ color: '#1D4ED8' }}><Receipt size={11} /> RENTA</div>
            <div className="ps-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>L {fmt2(renta)}</div>
          </div>
          <div style={{ background: '#E8E8ED', border: '1px solid rgba(255,255,255,0.50)', padding: '.65rem .85rem', borderRadius: 8, fontSize: '.78rem', color: '#8E8E96', marginBottom: '.85rem' }}>
            {local.m2} m² × L {config.rentPerM2} + ISV {(config.isv * 100).toFixed(0)}%
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', padding: '.4rem 0' }}>
            <input type="checkbox" className="ps-checkbox" checked={form.rentaPagada} onChange={(e) => set('rentaPagada', e.target.checked)} />
            <span style={{ fontSize: '.92rem', fontWeight: 500 }}>Renta pagada</span>
          </label>

          {form.rentaPagada && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginTop: '.6rem' }}>
              <div>
                <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha</div>
                <input type="date" className="ps-input" value={form.fechaRenta || todayStr()} onChange={(e) => set('fechaRenta', e.target.value)} />
              </div>
              <div>
                <div className="ps-label" style={{ marginBottom: '.3rem' }}>N° Factura</div>
                <input className="ps-input" placeholder="000-000-..." value={form.numFactura} onChange={(e) => set('numFactura', e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ marginTop: '.75rem' }}>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Enlace de factura</div>
            <input type="url" className="ps-input" placeholder="https://drive.google.com/..." value={form.linkFactura} onChange={(e) => set('linkFactura', e.target.value)} />
            {form.linkFactura && (
              <a href={form.linkFactura} target="_blank" rel="noreferrer" style={{
                fontSize: '.75rem', color: '#1D4ED8', textDecoration: 'none', marginTop: '.4rem',
                display: 'inline-flex', alignItems: 'center', gap: '.3rem',
              }}>
                <ExternalLink size={11} /> Abrir factura
              </a>
            )}
          </div>
        </div>

        {tipoLuz !== 'incluido' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="ps-divider-soft" style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
              <div className="ps-eyebrow" style={{ color: '#5AC8FA' }}><Zap size={11} /> ENERGÍA ELÉCTRICA</div>
              <div className="ps-mono" style={{ fontSize: '1rem', fontWeight: 600, color: tarifaEfectiva || tipoLuz === 'fijo' ? '#5AC8FA' : '#6E6E78' }}>
                L {fmt2(montoLuzCalc)}
              </div>
            </div>

            {tipoLuz === 'medidor' && (
              <>
                {!tarifaEfectiva && (
                  <div style={{
                    background: 'rgba(255, 184, 84, 0.06)', border: '1px solid rgba(255, 184, 84, 0.25)',
                    padding: '.65rem .85rem', borderRadius: 8, marginBottom: '.85rem', fontSize: '.78rem',
                    color: '#7C3AED', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '.1rem' }} />
                    <div>Aún no hay factura ENEE registrada del mes. Metela primero para calcular el monto.</div>
                  </div>
                )}

                {tarifaEfectiva && (
                  <div style={{
                    background: 'rgba(90, 200, 250, 0.06)', border: '1px solid rgba(90, 200, 250, 0.2)',
                    padding: '.65rem .85rem', borderRadius: 8, marginBottom: '.85rem',
                    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', fontSize: '.78rem',
                  }}>
                    <div style={{ color: '#8E8E96', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <Calculator size={12} /> Tarifa efectiva del mes:
                    </div>
                    <div className="ps-mono" style={{ color: '#5AC8FA', fontWeight: 600 }}>L {fmt2(tarifaEfectiva)}/kWh</div>
                  </div>
                )}

                <div style={{
                  background: '#E8E8ED', border: '1px solid rgba(255,255,255,0.50)', padding: '.5rem .8rem',
                  borderRadius: 8, marginBottom: '.85rem', fontSize: '.75rem', color: '#8E8E96',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Lectura anterior:</span>
                  <span className="ps-mono" style={{ color: '#1C1C1E', fontWeight: 600 }}>{lecturaAnterior ?? '—'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.85rem' }}>
                  <div>
                    <div className="ps-label" style={{ marginBottom: '.3rem' }}>Lectura actual</div>
                    <input type="number" className="ps-input ps-mono" value={form.lecturaActual} onChange={(e) => set('lecturaActual', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <div className="ps-label" style={{ marginBottom: '.3rem' }}>Consumo</div>
                    <div className="ps-input ps-mono" style={{ background: 'rgba(255,255,255,0.75)', color: consumo < 0 ? '#FF5C5C' : '#5AC8FA', fontWeight: 600 }}>
                      {consumo != null ? `${consumo} kWh` : '—'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tipoLuz === 'fijo' && (
              <div style={{
                background: '#E8E8ED', border: '1px solid rgba(255,255,255,0.50)', padding: '.65rem .85rem',
                borderRadius: 8, marginBottom: '.85rem', fontSize: '.78rem', color: '#8E8E96',
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span>Monto fijo configurado:</span>
                <span className="ps-mono" style={{ color: '#1C1C1E', fontWeight: 600 }}>L {fmt2(local.luzFija || 0)}</span>
              </div>
            )}

            {montoLuzCalc > 0 && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', padding: '.4rem 0' }}>
                  <input type="checkbox" className="ps-checkbox" checked={form.luzPagada} onChange={(e) => set('luzPagada', e.target.checked)} />
                  <span style={{ fontSize: '.92rem', fontWeight: 500 }}>Luz pagada</span>
                </label>
                {form.luzPagada && (
                  <div style={{ marginTop: '.5rem', maxWidth: 220 }}>
                    <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha</div>
                    <input type="date" className="ps-input" value={form.fechaLuz || todayStr()} onChange={(e) => set('fechaLuz', e.target.value)} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="ps-divider-soft" style={{ marginBottom: '1rem' }} />
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="ps-label" style={{ marginBottom: '.3rem' }}>Notas</div>
          <textarea className="ps-input" rows={2} value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Abonos parciales, observaciones..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
          <div>
            {tipoLuz !== 'incluido' && montoLuzCalc > 0 && (
              <button onClick={onGenerateRecibo} className="ps-btn-ghost" style={{ background: 'rgba(90, 200, 250, 0.08)', borderColor: 'rgba(90, 200, 250, 0.3)', color: '#5AC8FA' }}>
                <Printer size={14} /> Generar recibo de luz
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
            <button onClick={handleSave} className="ps-btn"><Save size={14} strokeWidth={2.5} /> Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigView({ config, locales, onSaveConfig, onAddLocal, onEditLocal, onDeleteLocal, calcRenta }) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <div className="ps-fade-in" style={{ display: 'grid', gap: '1rem' }}>
      <div className="ps-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Settings size={10} /> PARÁMETROS GENERALES</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Renta y plaza</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.85rem', marginBottom: '1.25rem' }}>
          <Field label="Nombre de la plaza">
            <input className="ps-input" value={draft.plazaNombre} onChange={(e) => setDraft({ ...draft, plazaNombre: e.target.value })} />
          </Field>
          <Field label="Renta por m² (L)">
            <input type="number" step="0.01" className="ps-input ps-mono" value={draft.rentPerM2} onChange={(e) => setDraft({ ...draft, rentPerM2: Number(e.target.value) })} />
          </Field>
          <Field label="ISV (%)">
            <input type="number" step="0.01" className="ps-input ps-mono" value={(draft.isv * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, isv: Number(e.target.value) / 100 })} />
          </Field>
        </div>

        <div style={{
          background: 'rgba(90, 200, 250, 0.06)', border: '1px solid rgba(90, 200, 250, 0.2)',
          padding: '.75rem .9rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '.78rem',
          color: '#8E8E96', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
        }}>
          <Info size={14} color="#5AC8FA" style={{ flexShrink: 0, marginTop: '.1rem' }} />
          <div>
            <strong style={{ color: '#1C1C1E' }}>La tarifa de luz no se configura aquí.</strong> Cada mes se calcula sola dividiendo el monto total de la factura ENEE entre los kWh consumidos por los submedidores. Así siempre cuadra exacto y se ajusta automático a los cambios trimestrales de ENEE.
          </div>
        </div>

        <button onClick={() => onSaveConfig(draft)} className="ps-btn" disabled={!dirty}><Save size={14} strokeWidth={2.5} /> Guardar parámetros</button>
      </div>

      <div className="ps-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Building2 size={10} /> LOCALES</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{locales.length} {locales.length === 1 ? 'local' : 'locales'} configurados</div>
          </div>
          <button onClick={onAddLocal} className="ps-btn"><Plus size={14} strokeWidth={2.5} /> Agregar</button>
        </div>

        {locales.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6E6E78', fontSize: '.9rem' }}>
            Aún no has agregado locales.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {locales.map((l) => {
              const tipoLabel = { medidor: 'Submedidor', fijo: 'Monto fijo', incluido: 'Incluida' }[l.tipoLuz || 'incluido'];
              return (
                <div key={l.id} style={{
                  background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.50)', borderRadius: 10,
                  padding: '.85rem 1rem', display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 2fr) auto auto auto',
                  gap: '1rem', alignItems: 'center',
                }}>
                  <span className="ps-mono" style={{
                    fontSize: '.7rem', padding: '.2rem .5rem', background: 'rgba(255,255,255,0.50)',
                    borderRadius: 4, color: '#1D4ED8', fontWeight: 600, minWidth: 32, textAlign: 'center',
                  }}>{l.numero || '?'}</span>
                  <div>
                    <div style={{ fontSize: '.92rem', fontWeight: 500 }}>{l.inquilino || 'Sin asignar'}</div>
                    <div style={{ fontSize: '.75rem', color: '#6E6E78' }}>
                      {l.m2} m² · L {fmt(calcRenta(l.m2))}/mes · Luz: {tipoLabel}
                    </div>
                  </div>
                  <span className="ps-mono" style={{ fontSize: '.78rem', color: '#1D4ED8' }}>L {fmt(calcRenta(l.m2))}</span>
                  <button onClick={() => onEditLocal(l)} className="ps-btn-icon"><Edit3 size={13} /></button>
                  <button onClick={() => onDeleteLocal(l.id)} className="ps-btn-icon" style={{ color: '#FF5C5C' }}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="ps-label" style={{ marginBottom: '.3rem' }}>{label}</div>
      {children}
    </div>
  );
}

function LocalEditModal({ locale, onClose, onSave, calcRenta }) {
  const [f, setF] = useState({
    id: locale.id,
    numero: locale.numero || '',
    nombre: locale.nombre || '',
    inquilino: locale.inquilino || '',
    m2: locale.m2 || '',
    tipoLuz: locale.tipoLuz || 'medidor',
    lecturaInicial: locale.lecturaInicial ?? '',
    luzFija: locale.luzFija ?? '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.m2 || Number(f.m2) <= 0) { alert('Indicá los metros cuadrados.'); return; }
    onSave({
      ...f, m2: Number(f.m2),
      lecturaInicial: f.lecturaInicial === '' ? null : Number(f.lecturaInicial),
      luzFija: f.luzFija === '' ? null : Number(f.luzFija),
    });
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal ps-card-elevated" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}>
              <Circle size={6} fill="#1D4ED8" stroke="none" /> {locale.id ? 'EDITAR' : 'NUEVO'} LOCAL
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>
              {locale.inquilino || (locale.id ? 'Editar' : 'Configurar local')}
            </div>
          </div>
          <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
        </div>

        <div className="ps-divider-soft" style={{ marginBottom: '1.25rem' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem', marginBottom: '.85rem' }}>
          <Field label="N° de local">
            <input className="ps-input" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="1, A1..." />
          </Field>
          <Field label="m²">
            <input type="number" step="0.01" className="ps-input ps-mono" value={f.m2} onChange={(e) => set('m2', e.target.value)} />
          </Field>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <Field label="Inquilino">
            <input className="ps-input" value={f.inquilino} onChange={(e) => set('inquilino', e.target.value)} placeholder="Nombre del inquilino" />
          </Field>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <Field label="Negocio (opcional)">
            <input className="ps-input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="DSD, Salón María, etc." />
          </Field>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>Tipo de cobro de luz</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.4rem' }}>
            {[
              { v: 'medidor', label: 'Submedidor', icon: <Activity size={13} /> },
              { v: 'fijo', label: 'Monto fijo', icon: <Wallet size={13} /> },
              { v: 'incluido', label: 'Incluida', icon: <Check size={13} /> },
            ].map((opt) => (
              <button
                key={opt.v} type="button" onClick={() => set('tipoLuz', opt.v)}
                style={{
                  padding: '.6rem .5rem', borderRadius: 8, cursor: 'pointer',
                  fontSize: '.8rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem',
                  background: f.tipoLuz === opt.v ? 'rgba(29,78,216,0.1)' : '#E8E8ED',
                  border: '1px solid', borderColor: f.tipoLuz === opt.v ? '#1D4ED8' : '#2E2E38',
                  color: f.tipoLuz === opt.v ? '#1D4ED8' : '#B0B0BA',
                  transition: 'all .15s', fontFamily: 'Geist, sans-serif',
                }}
              >{opt.icon} {opt.label}</button>
            ))}
          </div>
        </div>

        {f.tipoLuz === 'medidor' && (
          <div style={{ marginBottom: '.85rem' }}>
            <Field label="Lectura inicial del submedidor (kWh)">
              <input type="number" className="ps-input ps-mono" value={f.lecturaInicial} onChange={(e) => set('lecturaInicial', e.target.value)} placeholder="Ej: 4250" />
            </Field>
            <div style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.35rem' }}>
              Solo se usa la primera vez. Las lecturas mensuales se guardan automáticamente después.
            </div>
          </div>
        )}

        {f.tipoLuz === 'fijo' && (
          <div style={{ marginBottom: '.85rem' }}>
            <Field label="Monto fijo mensual de luz (L)">
              <input type="number" step="0.01" className="ps-input ps-mono" value={f.luzFija} onChange={(e) => set('luzFija', e.target.value)} placeholder="Ej: 500" />
            </Field>
          </div>
        )}

        {f.m2 > 0 && (
          <div style={{
            background: 'rgba(132, 248, 65, 0.06)', border: '1px solid rgba(29,78,216,0.2)',
            padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.85rem',
          }}>
            <span style={{ color: '#8E8E96' }}>Renta calculada (con ISV)</span>
            <span className="ps-mono" style={{ fontWeight: 600, color: '#1D4ED8', fontSize: '1.05rem' }}>
              L {fmt2(calcRenta(Number(f.m2)))}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem' }}>
          <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
          <button onClick={handleSave} className="ps-btn"><Save size={14} strokeWidth={2.5} /> Guardar</button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// RECIBO LUZ MODAL — printable receipt for tenant
// =================================================================

// =================================================================
// RECIBO LUZ MODAL — based on D&L Soluciones template
// =================================================================
function ReciboLuzModal({ local, data, prevData, factura, tarifaEfectiva, monthIdx, year, config, onClose }) {
  const lecturaAnterior = prevData.lecturaActual ?? local.lecturaInicial ?? 0;
  const lecturaActual = data.lecturaActual ?? 0;
  const consumo = lecturaActual - lecturaAnterior;
  const monto = consumo * (tarifaEfectiva || 0);
  const reciboNum = `${year}${String(monthIdx + 1).padStart(2, '0')}-${(local.numero || '').toString().padStart(3, '0')}`;
  const fechaEmision = new Date().toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  const handlePrint = () => {
    const printContents = document.getElementById('recibo-print-area').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>Recibo Luz - Local ${local.numero} - ${MESES_LARGO[monthIdx]} ${year}</title>
      <style>
        @page { size: Letter; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', 'Liberation Serif', serif; color: rgba(255,255,255,0.75); -webkit-font-smoothing: antialiased; background: white; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head><body>${printContents}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  // SVG logo recreating the D&L bird mark
  const Logo = () => (
    <svg viewBox="0 0 100 100" width="64" height="64" style={{ flexShrink: 0 }}>
      <g fill="#D87264" stroke="none">
        <path d="M 20,75 L 50,30 L 80,75 L 65,75 L 50,50 L 35,75 Z" opacity="0.9" />
        <path d="M 30,55 L 50,15 L 70,55 L 58,55 L 50,35 L 42,55 Z" opacity="1" />
        <circle cx="50" cy="22" r="3" fill="rgba(255,255,255,0.75)" />
      </g>
    </svg>
  );

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, animation: 'psSlide .25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Toolbar (dark theme) */}
        <div className="ps-card-elevated" style={{ padding: '.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '14px 14px 0 0', borderBottom: 'none' }}>
          <div>
            <div className="ps-eyebrow" style={{ color: '#5AC8FA' }}><Printer size={11} /> RECIBO DE LUZ</div>
            <div style={{ fontSize: '.88rem', fontWeight: 600, marginTop: '.15rem' }}>Vista previa — Local {local.numero}</div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={handlePrint} className="ps-btn"><Printer size={14} strokeWidth={2.5} /> Imprimir / PDF</button>
            <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
          </div>
        </div>

        {/* Recibo - white background, scrollable */}
        <div style={{
          background: '#e8e8e3', borderRadius: '0 0 14px 14px',
          border: '1px solid #2E2E38', borderTop: 'none',
          padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto',
        }}>
          <div id="recibo-print-area">
            <div style={{
              background: 'white', maxWidth: 720, margin: '0 auto',
              fontFamily: "'Times New Roman', serif", color: 'rgba(255,255,255,0.75)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              minHeight: 900, position: 'relative',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* HEADER with logo */}
              <div style={{ padding: '2rem 2.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
                <Logo />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3F8B92', letterSpacing: '0.02em', lineHeight: 1 }}>
                    D & L
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3F8B92', letterSpacing: '0.06em', lineHeight: 1, marginTop: '.15rem' }}>
                    SOLUCIONES
                  </div>
                </div>
              </div>

              {/* Decorative bar */}
              <div style={{ height: 12, background: 'linear-gradient(to right, #D87264 0%, #D87264 35%, #3F8B92 35%, #3F8B92 100%)' }} />

              {/* Body */}
              <div style={{ padding: '1.75rem 2.5rem', flex: 1 }}>
                {/* Plaza name */}
                <div style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '0.02em' }}>
                  PLAZA STEFANY
                </div>

                {/* Meta info rows */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid transparent' }}>
                  <span style={{ fontSize: '.88rem', letterSpacing: '0.02em' }}>RECIBO N°</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700 }}>{reciboNum}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}>
                  <span style={{ fontSize: '.88rem', letterSpacing: '0.02em' }}>INQUILINO</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700 }}>{(local.inquilino || 'N/A').toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}>
                  <span style={{ fontSize: '.88rem', letterSpacing: '0.02em' }}>LOCAL</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700 }}>N° {local.numero}{local.nombre ? ` — ${local.nombre.toUpperCase()}` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}>
                  <span style={{ fontSize: '.88rem', letterSpacing: '0.02em' }}>PERIODO</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700 }}>{MESES_LARGO[monthIdx].toUpperCase()} {year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '.88rem', letterSpacing: '0.02em' }}>FECHA</span>
                  <span style={{ fontSize: '.88rem', fontWeight: 700 }}>{fechaEmision}</span>
                </div>

                {/* Lecturas table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '.5rem' }}>
                  <thead>
                    <tr style={{ background: '#F5C9C2' }}>
                      <th style={tdHead}>CONCEPTO</th>
                      <th style={tdHead}>LECTURA ANTERIOR</th>
                      <th style={tdHead}>LECTURA ACTUAL</th>
                      <th style={tdHead}>CONSUMO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdCell}><b>SUBMEDIDOR LOCAL {local.numero}</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>{fmt(lecturaAnterior)} kWh</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>{fmt(lecturaActual)} kWh</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>{fmt(consumo)} kWh</b></td>
                    </tr>
                  </tbody>
                </table>

                {/* Cálculo table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ background: '#F5C9C2' }}>
                      <th style={{ ...tdHead, width: '60%' }}>DETALLE DEL CÁLCULO</th>
                      <th style={tdHead}>VALOR</th>
                      <th style={tdHead}>MONTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdCell}><b>Factura ENEE total del mes</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>—</b></td>
                      <td style={{ ...tdCell, textAlign: 'right' }}><b>L {fmt2(factura.montoTotal || 0)}</b></td>
                    </tr>
                    <tr>
                      <td style={tdCell}><b>Tarifa efectiva del mes (prorrateo)</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>L {fmt2(tarifaEfectiva || 0)}/kWh</b></td>
                      <td style={{ ...tdCell, textAlign: 'right' }}><b>—</b></td>
                    </tr>
                    <tr>
                      <td style={tdCell}><b>Consumo del local</b></td>
                      <td style={{ ...tdCell, textAlign: 'center' }}><b>{fmt(consumo)} kWh</b></td>
                      <td style={{ ...tdCell, textAlign: 'right' }}><b>—</b></td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ ...tdCell, textAlign: 'right', fontStyle: 'italic' }}>
                        <b><i>{fmt(consumo)} kWh × L {fmt2(tarifaEfectiva || 0)} =</i></b>
                      </td>
                      <td style={{ ...tdCell, textAlign: 'right', background: '#3C3C43' }}>
                        <b>L {fmt2(monto)}</b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ ...tdCell, textAlign: 'right', background: '#3F8B92', color: '#1C1C1E', fontSize: '.95rem' }}>
                        <b>TOTAL A PAGAR</b>
                      </td>
                      <td style={{ ...tdCell, textAlign: 'right', background: '#3F8B92', color: '#1C1C1E', fontSize: '1.05rem' }}>
                        <b>L {fmt2(monto)}</b>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Nota */}
                <div style={{ marginTop: '1.5rem', fontSize: '.82rem', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: '.3rem' }}>NOTA:</div>
                  <div style={{ fontWeight: 700 }}>EL MONTO SE CALCULA PRORRATEANDO LA FACTURA TOTAL DE ENEE ENTRE LOS KWH CONSUMIDOS POR CADA SUBMEDIDOR DEL MES.</div>
                  <div style={{ marginTop: '.3rem' }}>ESTE RECIBO NO GENERA ISV — EL IMPUESTO YA FUE PAGADO EN LA FACTURA ORIGINAL DE ENEE.</div>
                  <div style={{ marginTop: '.3rem' }}>FECHA LÍMITE DE PAGO: {factura.fechaPago ? new Date(factura.fechaPago + 'T12:00:00').toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : '___________________'}</div>
                </div>

                {/* Firma */}
                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.75)', width: 280, margin: '0 auto', paddingTop: '.4rem' }}>
                    <div style={{ fontSize: '.92rem', fontWeight: 700, letterSpacing: '0.02em' }}>WILLIAM RAMOS</div>
                    <div style={{ fontSize: '.85rem' }}>DIRECTOR COMERCIAL</div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{
                  background: '#2C2C2E', padding: '.85rem 2.5rem',
                  display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                  flexWrap: 'wrap', gap: '.65rem', fontSize: '.78rem', borderTop: '1px solid #E5E5DD',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ color: '#D87264' }}>📞</span> +504 9462-8618
                  </span>
                  <span style={{ color: '#3F8B92' }}>|</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ color: '#D87264' }}>✉</span> soluciones_dyl@yahoo.com
                  </span>
                  <span style={{ color: '#3F8B92' }}>|</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ color: '#D87264' }}>📍</span> Plaza Stefany, Col. América, frente a Torre Xcala
                  </span>
                  <span style={{ color: '#3F8B92' }}>|</span>
                  <span>RTN: 0801-9014-639584</span>
                </div>
                <div style={{ height: 14, background: '#3F8B92' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const tdHead = {
  border: '1px solid rgba(255,255,255,0.75)', padding: '.5rem .65rem',
  fontSize: '.78rem', fontWeight: 700, letterSpacing: '0.02em',
  textAlign: 'center', verticalAlign: 'middle',
};
const tdCell = {
  border: '1px solid rgba(255,255,255,0.75)', padding: '.55rem .7rem',
  fontSize: '.85rem', verticalAlign: 'middle',
};