// Plaza Stefany - Version con Supabase (conexion a BD en la nube)
// Generado automaticamente - no editar manualmente

import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Settings, Plus, Check, X, Zap, Building2,
  ChevronLeft, ChevronRight, Trash2, Edit3, ExternalLink,
  Receipt, Save, TrendingUp, Activity, Wallet, AlertCircle,
  Sparkles, Circle, ArrowRight, FileText, Info, Calculator,
  History, ChevronDown, ChevronUp, Printer, Download, Users, LogOut,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { DL_LOGO } from './dlLogo';
import { MembreteHeader, MembreteFooter, MEMBRETE_HEADER_HTML, MEMBRETE_FOOTER_HTML } from './dlMembrete';
import { monthKey } from './keys';
import {
  getPrecioForMonth, calcConsumoLocal, calcTotalKwhSubmedidores,
  calcCargosFijosTotal, calcLocalesConMedidor, calcPerLocalFijo,
  calcTarifaEfectiva, calcConsumoPrincipal,
} from './calculos';
import { LocalEditModal } from './modals/LocalEditModal';
import { FacturaModal } from './modals/FacturaModal';
import { PaymentModal } from './modals/PaymentModal';
import { Field } from './components/Field';
import { useLightbox } from './components/Lightbox';
// jsPDF + jspdf-autotable son ~600KB. Importarlas dinámicamente solo cuando
// el admin clickea "Generar recibo", reduce el bundle inicial significativamente.
const loadPdf = () => import('./generarReciboPdf');

const DEFAULT_CONFIG = {
  rentPerM2USD: 29,
  tasaCambio: 25,
  isv: 0.15,
  plazaNombre: 'Stefany Plaza',
  // Cargos fijos de la factura ENEE (residencial). Se dividen en partes iguales
  // entre TODOS los locales con submedidor — la parte de energía sí se prorratea
  // por consumo. Cambian trimestralmente, el admin los ajusta en Configuración.
  cargoComercializacion: 60,
  cargoRegulacion: 30,
  alumbradoPublico: 130,
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const fmt = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmt2 = (n) => new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

function getPagos(md) {
  if (!md || typeof md !== 'object') return {};
  if (md.pagos !== undefined || md.factura !== undefined) return md.pagos || {};
  return md;
}
function getFactura(md) { return (md && md.factura) || {}; }

async function loadCfg() {
  try {
    const r = await window.storage.get('config-and-locales');
    if (r) return typeof r === 'string' ? JSON.parse(r) : r;
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
    if (r) return typeof r === 'string' ? JSON.parse(r) : r;
  } catch (e) {}
  return {};
}
async function saveMonth(year, monthIdx, data) {
  try { await window.storage.set(monthKey(year, monthIdx), JSON.stringify(data)); return true; }
  catch (e) { return false; }
}

// Audit log: registra acciones del admin (toggles de pagos, cambios de lectura, etc.)
// Cap a 500 entries para no inflar storage.
async function appendAuditLog(entry) {
  try {
    const raw = await window.storage.get('audit-log');
    const log = raw ? JSON.parse(raw) : [];
    log.unshift({ ...entry, fecha: new Date().toISOString() });
    await window.storage.set('audit-log', JSON.stringify(log.slice(0, 500)));
  } catch (e) {}
}
async function loadAuditLog() {
  try {
    const raw = await window.storage.get('audit-log');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

// (las funciones de cálculo viven en src/calculos.js — import al top del archivo)

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ── LIQUID GLASS BASE ── */
.ps-app {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  min-height: 100vh;
  padding: 1.5rem 1.5rem 4rem;
  -webkit-font-smoothing: antialiased;
  color: #1C1C1E;
  position: relative;
  /* Vibrant mesh gradient background */
  background:
    radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(99, 102, 241, 0.35) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 5%,   rgba(236, 72, 153, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse 50% 60% at 70% 85%,  rgba(20, 184, 166, 0.20) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 5%  85%,  rgba(251, 146, 60, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 50% 50%,  rgba(168, 85, 247, 0.12) 0%, transparent 60%),
    #EEF0F8;
  background-attachment: fixed;
}
.ps-app * { box-sizing: border-box; }
.ps-mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }

/* ── GLASS CARD (light) ── */
.ps-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
}
.ps-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.9) 60%, transparent 100%);
}

/* ── GLASS CARD ELEVATED (light, mas opaco que ps-card para destacar) ── */
.ps-card-elevated {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(99, 102, 241, 0.10), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1);
  color: #1C1C1E;
}
.ps-card-elevated::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent);
}

/* ── HOVER CARDS ── */
.ps-card-hover {
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .22s ease, border-color .22s ease;
  cursor: pointer;
}
.ps-card-hover:hover {
  transform: translateY(-3px) scale(1.005);
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 16px 40px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
}

/* ── LABELS & EYEBROWS ── */
.ps-label { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(60,60,70,0.55); }
.ps-eyebrow { display: inline-flex; align-items: center; gap: .35rem; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #6366F1; }

/* ── TABS ── */
.ps-tab {
  padding: .55rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(60,60,70,0.6);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s ease;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
}
.ps-tab:hover {
  color: #1C1C1E;
  background: rgba(255,255,255,0.5);
  border-color: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
}
.ps-tab-active {
  color: white;
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  border-color: rgba(255,255,255,0.25);
  box-shadow: 0 4px 14px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.25);
}
.ps-tab-active:hover { background: linear-gradient(135deg, #4F52E0 0%, #7C3AED 100%); color: white; }

/* ── BUTTONS ── */
.ps-btn {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
  color: white;
  padding: .6rem 1.1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  transition: all .18s ease;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  font-family: 'Geist', sans-serif;
  box-shadow: 0 4px 14px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
  letter-spacing: -0.01em;
}
.ps-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
}
.ps-btn:active { transform: translateY(0); }
.ps-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

.ps-btn-ghost {
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.65);
  color: #1C1C1E;
  padding: .55rem .9rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all .18s ease;
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  font-family: 'Geist', sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.ps-btn-ghost:hover {
  background: rgba(255,255,255,0.7);
  border-color: rgba(99,102,241,0.35);
  box-shadow: 0 4px 12px rgba(99,102,241,0.12);
}

.ps-btn-icon {
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.65);
  color: rgba(60,60,70,0.6);
  padding: .5rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all .18s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.ps-btn-icon:hover { background: rgba(255,255,255,0.7); color: #1C1C1E; border-color: rgba(99,102,241,0.3); }

/* ── INPUTS ── */
.ps-input {
  width: 100%;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 10px;
  padding: .65rem .85rem;
  font-family: 'Geist', sans-serif;
  font-size: 0.9rem;
  color: #1C1C1E;
  transition: all .18s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
}
.ps-input:focus {
  outline: none;
  border-color: rgba(99,102,241,0.5);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.75);
}
.ps-input::placeholder { color: rgba(60,60,70,0.35); }

/* ── PILLS ── */
.ps-pill { display: inline-flex; align-items: center; gap: .35rem; padding: .22rem .55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.01em; font-family: 'JetBrains Mono', monospace; }
.ps-pill-paid { background: rgba(52,199,89,0.18); color: #1A7F35; border: 1px solid rgba(52,199,89,0.38); backdrop-filter: blur(8px); }
.ps-pill-pending { background: rgba(255,159,10,0.18); color: #B25800; border: 1px solid rgba(255,159,10,0.38); backdrop-filter: blur(8px); }
.ps-pill-na { background: rgba(110,110,120,0.15); color: #5A5A64; border: 1px solid rgba(110,110,120,0.28); }
.ps-pill-dot { width: 6px; height: 6px; border-radius: 50%; }
.ps-pill-paid .ps-pill-dot { background: #34C759; box-shadow: 0 0 6px #34C759; }
.ps-pill-pending .ps-pill-dot { background: #FF9F0A; box-shadow: 0 0 6px #FF9F0A; }
.ps-pill-na .ps-pill-dot { background: #8E8E96; }

/* ── SELECTS / DROPDOWNS estilizados (overlay sobre .ps-input cuando es <select>) ── */
select.ps-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='%236E6E78' d='M3.5 5l2.5 3 2.5-3z'/></svg>");
  background-repeat: no-repeat;
  background-position: right .6rem center;
  background-size: 10px;
  padding-right: 1.7rem;
  cursor: pointer;
}

/* ── MODAL ── */
.ps-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 20, 0.45);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  z-index: 50;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4vh 1rem;
  overflow-y: auto;
  animation: psFade .2s ease;
}
.ps-modal { width: 100%; max-width: 540px; animation: psSlide .3s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes psFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes psSlide { from { opacity: 0; transform: translateY(-16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.ps-fade-in { animation: psFadeIn .4s ease both; }
@keyframes psFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ── MISC ── */
.ps-bar-bg { position: relative; height: 4px; background: rgba(255,255,255,0.4); border-radius: 2px; overflow: hidden; }
.ps-bar-fill { position: absolute; top: 0; left: 0; bottom: 0; border-radius: 2px; transition: width .6s cubic-bezier(0.16, 1, 0.3, 1); }

.ps-checkbox { width: 18px; height: 18px; appearance: none; background: rgba(255,255,255,0.5); border: 1.5px solid rgba(120,120,130,0.4); border-radius: 6px; cursor: pointer; position: relative; transition: all .15s; backdrop-filter: blur(8px); }
.ps-checkbox:checked { background: linear-gradient(135deg, #6366F1, #8B5CF6); border-color: transparent; box-shadow: 0 2px 8px rgba(99,102,241,0.4); }
.ps-checkbox:checked::after { content: ''; position: absolute; left: 5px; top: 2px; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }

.ps-divider-soft { height: 1px; background: linear-gradient(90deg, transparent, rgba(99,102,241,0.15) 20%, rgba(99,102,241,0.15) 80%, transparent); }
.ps-glow-pulse { animation: psGlowPulse 2.5s ease-in-out infinite; }
@keyframes psGlowPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); } }

/* ── TABLE ── */
.ps-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'JetBrains Mono', monospace; font-size: .8rem; }
.ps-table th { text-align: left; padding: .65rem .8rem; background: rgba(255,255,255,0.4); backdrop-filter: blur(8px); color: rgba(60,60,70,0.6); font-weight: 600; font-size: .68rem; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.5); position: sticky; top: 0; }
.ps-table td { padding: .7rem .8rem; border-bottom: 1px solid rgba(255,255,255,0.35); color: #1C1C1E; }
.ps-table tr:last-child td { border-bottom: none; }
.ps-table tr.ps-table-row { transition: background .15s; }
.ps-table tr.ps-table-row:hover { background: rgba(255,255,255,0.4); }
.ps-table .num { text-align: right; }

/* ── GRID GRÁFICO ── */
.ps-chart-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1rem; }

/* ── LOCAL ROW ── */
.ps-local-row {
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.7);
  border-radius: 14px;
  padding: .9rem 1.1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.2fr) auto;
  gap: 1rem;
  align-items: center;
  cursor: pointer;
  transition: all .22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
}
.ps-local-row:hover {
  transform: translateY(-3px) scale(1.005);
  background: rgba(255,255,255,0.72);
  border-color: rgba(99,102,241,0.35);
  box-shadow: 0 12px 32px rgba(99,102,241,0.14), 0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1);
}

/* ─── MÓVIL ─── */
@media (max-width: 640px) {
  .ps-app { padding: .85rem .85rem 5rem; }
  .ps-tab { padding: .45rem .65rem; font-size: .8rem; }
  .ps-chart-grid { grid-template-columns: 1fr !important; }
  .ps-local-row {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
    gap: .6rem !important;
    padding: .85rem 1rem !important;
  }
  .ps-local-info  { grid-column: 1 !important; grid-row: 1 !important; }
  .ps-local-renta { grid-column: 1 !important; grid-row: 2 !important; display: flex !important; align-items: center !important; gap: 1rem !important; }
  .ps-local-luz   { grid-column: 1 !important; grid-row: 3 !important; display: flex !important; align-items: center !important; gap: 1rem !important; }
  .ps-local-arrow { display: none !important; }
  .ps-local-renta .ps-mono,
  .ps-local-luz .ps-mono { font-size: .85rem !important; }
  .ps-local-renta .ps-label,
  .ps-local-luz .ps-label { margin-bottom: 0 !important; min-width: 40px; }
}
`;

const APPLE_GLOBAL_CSS = `
  * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
  body {
    margin: 0;
    background:
      radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(99, 102, 241, 0.35) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 90% 5%,   rgba(236, 72, 153, 0.25) 0%, transparent 50%),
      radial-gradient(ellipse 50% 60% at 70% 85%,  rgba(20, 184, 166, 0.20) 0%, transparent 55%),
      radial-gradient(ellipse 70% 50% at 5%  85%,  rgba(251, 146, 60, 0.18) 0%, transparent 50%),
      radial-gradient(ellipse 60% 40% at 50% 50%,  rgba(168, 85, 247, 0.12) 0%, transparent 60%),
      #EEF0F8 !important;
    background-attachment: fixed !important;
    min-height: 100vh;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
`;

export default function App({ supabase, onLogout }) {
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
  const [reporteMensual, setReporteMensual] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Tasa BAC en background (no bloquea el primer render). El segundo useEffect
  // se encarga del primer load del config + meses (en paralelo) y marca loading=false.
  // Acá solo disparamos el fetch a /api/tasa-bac SI hace falta refrescar.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const cl = await loadCfg();
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
        if (cl.config?.tasaFechaActualizada !== hoy) {
          const res = await fetch('/api/tasa-bac');
          const data = await res.json();
          if (data?.ok && data.sell) {
            setConfig((prev) => ({ ...prev, tasaCambio: data.sell, tasaFechaActualizada: data.fecha, tasaFuente: 'BAC' }));
            setToast(`Tasa BAC: L ${Number(data.sell).toFixed(4)}/$`);
            setTimeout(() => setToast(null), 2800);
          }
        }
      } catch {}
    }, 1500); // esperar a que el primer load termine
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      if (cancelled) return;
      // Cargar config + 13 meses EN PARALELO. Antes era secuencial:
      // 13 roundtrips × 200-500ms cada uno = 3-6s. Ahora ~500ms total.
      const monthKeys = Array.from({ length: 12 }, (_, m) => [m, year, m])
      monthKeys.push(['_prevDec', year - 1, 11])
      const [cl, ...months] = await Promise.all([
        loadCfg(),
        ...monthKeys.map(([_, y, m]) => loadMonth(y, m)),
      ])
      if (cancelled) return;
      setConfig((prev) => ({ ...prev, ...cl.config }));
      setLocales(cl.locales || []);
      const result = {};
      monthKeys.forEach(([key], i) => { result[key] = months[i] })
      setYearData(result);
      setLoading(false);
    };
    reload();
    const onVisibility = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisibility);
    // Realtime subscribe es la fuente primaria de updates en vivo.
    // Si Realtime no conecta en 5s (Supabase free a veces falla), caemos
    // a polling cada 5 min como safety net. Polling cada 60s era redundante
    // y drenaba batería + queries.
    let unsub = () => {};
    let realtimeConnected = false;
    try {
      unsub = window.storage?.subscribe?.(() => reload()) || (() => {});
      // Marcar conectado después de 5s sin errores
      setTimeout(() => { realtimeConnected = true }, 5000);
    } catch {}
    // Fallback polling: solo si realtime no respondió. 5 min en vez de 60s.
    const interval = setInterval(() => {
      if (!realtimeConnected) reload();
    }, 300000);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisibility); clearInterval(interval); unsub(); };
  }, [year]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const calcRenta = (m2, y, m) => (m2 || 0) * getPrecioForMonth(config, y, m) * (config.tasaCambio || 25) * (1 + config.isv);

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
    () => calcTarifaEfectiva(factura, locales, pagos, prevPagos, config),
    [factura, locales, pagos, prevPagos, config]
  );
  const perLocalFijo = useMemo(
    () => calcPerLocalFijo(factura, config, locales),
    [factura, config, locales]
  );

  const updatePayment = async (localId, updates) => {
    const prevPago = pagos[localId] || {};

    // Si se está marcando renta como pagada, obtener la tasa BCH del momento exacto
    if (updates.rentaPagada === true && !prevPago.rentaPagada) {
      try {
        const res  = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        const tasa = data?.rates?.HNL
          ? Math.round(data.rates.HNL * 10000) / 10000
          : config.tasaCambio;
        updates.tasaCambioCongelado = tasa;
        // Guardar en historial de tasas
        try {
          const histKey = 'historial-tasas';
          const hRaw = await window.storage.get(histKey);
          const hist = hRaw ? JSON.parse(hRaw) : [];
          hist.unshift({ fecha: new Date().toISOString(), tasa, mes: `${MESES_LARGO[monthIdx]} ${year}`, localId });
          await window.storage.set(histKey, JSON.stringify(hist.slice(0, 100)));
        } catch {}
        showToast(`Tasa BCH del día: L ${tasa.toFixed(4)}/$`);
      } catch {
        updates.tasaCambioCongelado = config.tasaCambio; // fallback
      }
      updates.fechaRentaPagada = new Date().toISOString();
    }

    // Si se está volviendo a Pendiente, limpiar tasa congelada y fecha
    // para que la próxima vez que paguen use la tasa del día real.
    if (updates.rentaPagada === false && prevPago.rentaPagada) {
      updates.tasaCambioCongelado = null;
      updates.fechaRentaPagada = null;
    }

    // Concurrency: re-leer fresh antes de escribir. Si un inquilino subió un
    // comprobante mientras admin tenía el modal abierto, esto lo preserva.
    const fresh = await loadMonth(year, monthIdx);
    const freshPagos = fresh.pagos || {};
    const freshLocalPago = freshPagos[localId] || prevPago;
    const newPagos = { ...freshPagos, [localId]: { ...freshLocalPago, ...updates } };
    const next = { factura: fresh.factura || factura, pagos: newPagos };
    setYearData((y) => ({ ...y, [monthIdx]: next }));
    const ok = await saveMonth(year, monthIdx, next);

    // Audit log: registrar acción admin
    if (ok) {
      try {
        const local = locales.find(l => l.id === localId);
        const acciones = [];
        if (updates.rentaPagada === true && !prevPago.rentaPagada) acciones.push('Marcó renta PAGADA');
        if (updates.rentaPagada === false && prevPago.rentaPagada) acciones.push('Revirtió renta a PENDIENTE');
        if (updates.luzPagada === true && !prevPago.luzPagada) acciones.push('Marcó luz PAGADA');
        if (updates.luzPagada === false && prevPago.luzPagada) acciones.push('Revirtió luz a PENDIENTE');
        if (updates.lecturaActual != null && updates.lecturaActual !== prevPago.lecturaActual) {
          acciones.push(`Lectura submedidor: ${prevPago.lecturaActual ?? '—'} → ${updates.lecturaActual}`);
        }
        for (const accion of acciones) {
          await appendAuditLog({
            actor: 'admin',
            accion,
            local: local ? `Local ${local.numero} (${local.inquilino || 'sin asignar'})` : localId,
            mes: `${MESES_LARGO[monthIdx]} ${year}`,
          });
        }
      } catch {}
      showToast('Guardado');
    }
  };

  const updateFactura = async (updates) => {
    // Snapshot de los cargos fijos vigentes al momento de guardar la factura,
    // así un cambio futuro en Config no altera recibos históricos.
    const snapshot = (factura.cargoComercializacion != null) ? {} : {
      cargoComercializacion: config.cargoComercializacion ?? 0,
      cargoRegulacion: config.cargoRegulacion ?? 0,
      alumbradoPublico: config.alumbradoPublico ?? 0,
    };
    // Concurrency: re-leer pagos fresh, así no perdemos comprobantes que un
    // inquilino haya subido mientras el modal de Factura estaba abierto.
    const fresh = await loadMonth(year, monthIdx);
    const newFactura = { ...(fresh.factura || factura), ...snapshot, ...updates };
    const next = { factura: newFactura, pagos: fresh.pagos || pagos };
    setYearData((y) => ({ ...y, [monthIdx]: next }));
    const ok = await saveMonth(year, monthIdx, next);
    if (ok) showToast('Factura ENEE guardada');
    setEditingFactura(false);
  };

  const saveLocale = async (locale) => {
    let next;
    let logEntry = null;
    if (locale.id) {
      const prev = locales.find(l => l.id === locale.id) || {};
      const inquilinoChanged = (prev.inquilino || '') !== (locale.inquilino || '');
      const inquilinoAssigned = !!locale.inquilino;
      let updatedLocale = locale;
      if (inquilinoChanged && inquilinoAssigned) {
        updatedLocale = { ...locale, contratoDesde: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' }) };
        logEntry = {
          actor: 'admin',
          accion: prev.inquilino
            ? `Cambió inquilino: ${prev.inquilino} → ${locale.inquilino}`
            : `Asignó inquilino: ${locale.inquilino}`,
          local: `Local ${locale.numero}`,
          mes: '',
        };
      } else if (JSON.stringify(prev) !== JSON.stringify(locale)) {
        logEntry = {
          actor: 'admin',
          accion: 'Editó datos del local',
          local: `Local ${locale.numero}`,
          mes: '',
        };
      }
      next = locales.map((l) => (l.id === locale.id ? updatedLocale : l));
    } else {
      const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const contratoDesde = locale.inquilino ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' }) : null;
      next = [...locales, { ...locale, id, contratoDesde }];
      logEntry = {
        actor: 'admin',
        accion: `Creó nuevo local: Local ${locale.numero}${locale.inquilino ? ' (' + locale.inquilino + ')' : ''}`,
        local: `Local ${locale.numero}`,
        mes: '',
      };
    }
    setLocales(next);
    await saveCfg({ config, locales: next });
    if (logEntry) await appendAuditLog(logEntry);
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

  // Cierra contrato del inquilino actual:
  // - Borra el usuario del portal (corta su acceso)
  // - Libera el local (inquilino vacío, lecturaInicial reset)
  // - Limpia contratoDesde
  // PRESERVA todo el historial de pagos para que el admin pueda consultarlo siempre.
  // El próximo inquilino solo verá meses desde su nueva fecha de contrato.
  const cerrarContrato = async (localId) => {
    const local = locales.find(l => l.id === localId);
    if (!local) return;
    const inquilino = local.inquilino || '(sin asignar)';
    if (!confirm(
      `¿Cerrar contrato del Local ${local.numero} (${inquilino})?\n\n` +
      `Esto va a:\n` +
      `• Cortar el acceso al portal del inquilino actual\n` +
      `• Liberar el local para nuevo inquilino\n` +
      `• El historial de pagos de este local SE CONSERVA y vos lo seguís viendo en el panel admin\n\n` +
      `El próximo inquilino solo verá los pagos a partir de su fecha de inicio.`
    )) return;

    // Reset inquilino del local + limpiar contratoDesde
    const newLocales = locales.map(l =>
      l.id === localId ? { ...l, inquilino: '', lecturaInicial: null, contratoDesde: null } : l
    );
    setLocales(newLocales);

    // Borrar usuario del portal asociado a este local
    const newUsuarios = (config.usuarios || []).filter(u => u.localId !== localId);
    const newConfig = { ...config, usuarios: newUsuarios };
    setConfig(newConfig);

    await saveCfg({ config: newConfig, locales: newLocales });

    await appendAuditLog({
      actor: 'admin',
      accion: `Cerró contrato del inquilino: ${inquilino}`,
      local: `Local ${local.numero}`,
      mes: '',
    });

    setEditingLocal(null);
    showToast(`Contrato cerrado. Local ${local.numero} libre. Historial preservado.`);
  };

  const saveConfig = async (newConfig) => {
    const oldPrecio = config.rentPerM2USD;
    const newPrecio = newConfig.rentPerM2USD;
    const cambios = [];
    if (oldPrecio != null && newPrecio != null && oldPrecio !== newPrecio) {
      cambios.push(`Precio m²: $${oldPrecio} → $${newPrecio}`);
      const today = new Date();
      const desdeKey = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;
      let hist = newConfig.precioHistorial || config.precioHistorial || [];
      if (hist.length === 0) {
        hist = [{ precio: oldPrecio, desde: '0000-00' }];
      }
      hist = hist.filter(h => h.desde !== desdeKey);
      hist.push({ precio: newPrecio, desde: desdeKey });
      hist.sort((a, b) => a.desde.localeCompare(b.desde));
      newConfig = { ...newConfig, precioHistorial: hist };
    }
    if (config.tasaCambio !== newConfig.tasaCambio) {
      cambios.push(`Tasa: L ${config.tasaCambio} → L ${newConfig.tasaCambio}`);
    }
    if (config.isv !== newConfig.isv) {
      cambios.push(`ISV: ${(config.isv * 100).toFixed(0)}% → ${(newConfig.isv * 100).toFixed(0)}%`);
    }
    if (config.plazaNombre !== newConfig.plazaNombre) {
      cambios.push(`Nombre plaza: ${config.plazaNombre} → ${newConfig.plazaNombre}`);
    }
    setConfig(newConfig);
    await saveCfg({ config: newConfig, locales });
    for (const cambio of cambios) {
      await appendAuditLog({ actor: 'admin', accion: `Configuración: ${cambio}`, local: '', mes: '' });
    }
    showToast('Configuración guardada');
  };

  if (loading) {
    return (
      <div className="ps-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6366F1', fontFamily: 'JetBrains Mono, monospace', fontSize: '.85rem', letterSpacing: '0.15em' }}>
          ◯ CARGANDO DATOS
        </div>
      </div>
    );
  }

  return (
    <div className="ps-app">
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Header config={config} view={view} setView={setView} monthIdx={monthIdx} year={year} navigateMonth={navigateMonth} today={today} onLogout={onLogout} />

        {view === 'dashboard' && (
          <DashboardView
            locales={locales} yearData={yearData}
            monthIdx={monthIdx} year={year} config={config}
            calcRenta={calcRenta} factura={factura} prevFactura={prevFactura}
            pagos={pagos} prevPagos={prevPagos} tarifaEfectiva={tarifaEfectiva}
            onOpenPayment={setPaymentLocal} onEditFactura={() => setEditingFactura(true)}
            onGoConfig={() => setView('config')}
            onTogglePago={updatePayment}
            onReporte={() => setReporteMensual(true)}
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
          factura={factura} tarifaEfectiva={tarifaEfectiva} fijoLocal={perLocalFijo} config={config} calcRenta={calcRenta}
          onClose={() => setPaymentLocal(null)}
          onSave={async (updates) => { await updatePayment(paymentLocal.id, updates); setPaymentLocal(null); }}
          onGenerateRecibo={async () => {
            setToast('Generando recibo de luz…');
            try {
              const loc = paymentLocal;
              const dd = pagos[loc.id] || {};
              const pd = prevPagos[loc.id] || {};
              const lecturaAnterior = pd.lecturaActual ?? loc.lecturaInicial ?? 0;
              const lecturaActual = dd.lecturaActual ?? 0;
              const consumo = lecturaActual - lecturaAnterior;
              const tarifa = tarifaEfectiva || 0;
              const montoEnergia = consumo * tarifa;
              const cargosFijos = calcCargosFijosTotal(factura, config);
              const fijoLocal = calcPerLocalFijo(factura, config, locales);
              const nLocales = calcLocalesConMedidor(locales);
              const totalKwhPlaza = calcTotalKwhSubmedidores(locales, pagos, prevPagos);
              const total = montoEnergia + fijoLocal;
              const { generarReciboLuzPdf } = await loadPdf();
              await generarReciboLuzPdf({
                reciboNum: `PS-${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(loc.numero || '').padStart(3, '0')}`,
                inquilino: loc.inquilino || loc.nombre || 'N/A',
                local: String(loc.numero ?? ''),
                periodo: `${MESES_LARGO[monthIdx]} ${year}`,
                fechaEmision: new Date().toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' }),
                lecturaAnterior: fmt(lecturaAnterior),
                lecturaActual: fmt(lecturaActual),
                consumo: fmt(consumo),
                kWhPlaza: fmt(totalKwhPlaza),
                facturaEnee: fmt2(factura?.montoTotal || 0),
                tarifa: fmt2(tarifa),
                montoEnergia: fmt2(montoEnergia),
                cargosFijos: fmt2(cargosFijos),
                fijoLocal: fmt2(fijoLocal),
                nLocales: String(nLocales),
                total: fmt2(total),
                fotoMedidorAnterior: dd.fotoMedidorAnterior || null,
                fotoMedidorActual: dd.fotoMedidorActual || null,
              });
              setToast('Recibo de luz descargado — revisá tu carpeta Descargas');
              setTimeout(() => setToast(null), 4000);
            } catch (e) {
              console.error('[Recibo luz] error:', e);
              setToast('Error al generar recibo: ' + (e?.message || e));
              setTimeout(() => setToast(null), 12000);
            }
          }}
          onGenerateReciboRenta={async () => {
            setToast('Generando recibo de renta…');
            try {
              const loc = paymentLocal;
              const d = pagos[paymentLocal.id] || {};
              const tasaUsada = d.tasaCambioCongelado || config.tasaCambio || 25;
              const precioM2 = getPrecioForMonth(config, year, monthIdx);
              const base = (loc.m2 || 0) * precioM2 * tasaUsada;
              const isv = config.isv || 0.15;
              const isvMonto = base * isv;
              const total = base + isvMonto;
              const fechaEmision = d.fechaRentaPagada
                ? new Date(d.fechaRentaPagada).toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date().toLocaleDateString('es-HN', { day: '2-digit', month: 'long', year: 'numeric' });
              const { generarReciboRentaPdf } = await loadPdf();
              await generarReciboRentaPdf({
                reciboNum: `PS-${year}-${String(monthIdx + 1).padStart(2, '0')}-R${String(loc.numero || '').padStart(2, '0')}`,
                inquilino: loc.inquilino || loc.nombre || 'N/A',
                local: String(loc.numero ?? ''),
                periodo: `${MESES_LARGO[monthIdx]} ${year}`,
                fechaEmision,
                m2: loc.m2 ?? '',
                precioUSD: Number(precioM2).toFixed(2),
                tasa: tasaUsada,
                isvPct: (isv * 100).toFixed(0),
                rentaBase: fmt2(base),
                isvMonto: fmt2(isvMonto),
                rentaTotal: fmt2(total),
              });
              setToast('Recibo de renta descargado — revisá tu carpeta Descargas');
              setTimeout(() => setToast(null), 4000);
            } catch (e) {
              console.error('[Recibo renta] error:', e);
              setToast('Error al generar recibo: ' + (e?.message || e));
              setTimeout(() => setToast(null), 12000);
            }
          }}
        />
      )}

      {reporteMensual && (
        <ReporteMensualModal
          locales={locales} pagos={pagos} factura={factura}
          monthIdx={monthIdx} year={year} config={config}
          tarifaEfectiva={tarifaEfectiva} calcRenta={calcRenta}
          onClose={() => setReporteMensual(false)}
        />
      )}

      {editingLocal && (
        <LocalEditModal locale={editingLocal} onClose={() => setEditingLocal(null)} onSave={saveLocale} calcRenta={calcRenta} onCerrarContrato={cerrarContrato} />
      )}

      {editingFactura && (
        <FacturaModal factura={factura} prevFactura={prevFactura} monthIdx={monthIdx} year={year} config={config} locales={locales} pagos={pagos} prevPagos={prevPagos}
          onClose={() => setEditingFactura(false)} onSave={updateFactura}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#6366F1', color: '#6E6E78', padding: '.6rem 1.2rem', borderRadius: 999,
          fontSize: '.82rem', fontWeight: 600, zIndex: 100, animation: 'psSlide .2s ease',
          display: 'flex', alignItems: 'center', gap: '.45rem',
          boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
        }}>
          <Check size={14} strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}

function Header({ config, view, setView, monthIdx, year, navigateMonth, today, onLogout }) {
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
          <button
            className="ps-tab"
            onClick={() => { if (confirm('¿Cerrar sesión?')) onLogout(); }}
            style={{ color: '#FF5C5C', marginLeft: '.25rem' }}
          >
            <LogOut size={14} /> Salir
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
                  fontSize: '.62rem', padding: '.15rem .45rem', background: 'rgba(99,102,241,0.15)',
                  color: '#6366F1', borderRadius: 4, fontWeight: 600, letterSpacing: '.05em',
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
  onOpenPayment, onEditFactura, onGoConfig, onTogglePago, onReporte,
}) {
  const [detalle, setDetalle] = useState(null); // 'total' | 'renta' | 'luz' | 'pendientes'
  const consumoPrincipal = calcConsumoPrincipal(factura, prevFactura);
  const consumoSubmedidores = calcTotalKwhSubmedidores(locales, pagos, prevPagos);
  const areasComunes = consumoPrincipal != null && consumoSubmedidores > 0
    ? consumoPrincipal - consumoSubmedidores : null;

  const fijoLocalActual = useMemo(
    () => calcPerLocalFijo(factura, config, locales),
    [factura, config, locales]
  );

  const kpis = useMemo(() => {
    const totalRenta = locales.reduce((s, l) => s + calcRenta(l.m2), 0);
    let totalLuz = 0, cobradoRenta = 0, cobradoLuz = 0;
    let pendientesRenta = 0, pendientesLuz = 0;
    locales.forEach((l) => {
      const d = pagos[l.id] || {};
      const consumo = calcConsumoLocal(l, pagos, prevPagos);
      // luz = consumo × tarifa + parte del cargo fijo (Fenix consumo 0 sigue pagando fijo)
      const montoLuz = l.tipoLuz === 'medidor'
        ? ((consumo != null && tarifaEfectiva) ? consumo * tarifaEfectiva : 0) + fijoLocalActual
        : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
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
  }, [locales, pagos, prevPagos, tarifaEfectiva, fijoLocalActual, config]);

  const perLocal = useMemo(() => {
    return locales.map((l) => {
      const d = pagos[l.id] || {};
      const renta = calcRenta(l.m2);
      const consumo = calcConsumoLocal(l, pagos, prevPagos);
      const luz = l.tipoLuz === 'medidor'
        ? ((consumo != null && tarifaEfectiva) ? consumo * tarifaEfectiva : 0) + fijoLocalActual
        : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
      const cobrado = (d.rentaPagada ? renta : 0) + (d.luzPagada ? luz : 0);
      return { ...l, renta, luz, total: renta + luz, cobrado, consumo };
    });
  }, [locales, pagos, prevPagos, tarifaEfectiva, fijoLocalActual, config]);

  if (locales.length === 0) {
    return (
      <div className="ps-card ps-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '2rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, margin: '0 auto 1.25rem',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(132, 248, 65, 0.25)',
          display: 'grid', placeItems: 'center',
        }}>
          <Building2 size={24} color="#1D4ED8" />
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '.5rem' }}>Configurá tu plaza</div>
        <div style={{ color: '#8E8E96', marginBottom: '1.5rem', fontSize: '.92rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
          Agregá los locales con sus m², tipo de cobro de luz e inquilinos para empezar.
        </div>
        <button onClick={onReporte} className="ps-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
              <FileText size={14} /> Reporte mensual
            </button>
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

      <ComprobantesInbox
        locales={locales} pagos={pagos} monthIdx={monthIdx} year={year}
        onAprobar={(localId, tipo) => onTogglePago(localId, tipo === 'renta'
          ? { rentaPagada: true, fechaRenta: new Date().toISOString().slice(0,10) }
          : { luzPagada: true, fechaLuz: new Date().toISOString().slice(0,10) })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <KPI label="Cobrado este mes" value={kpis.totalCobrado} target={kpis.totalEsperado} accent="#1D4ED8" icon={<Wallet size={14} />} big onClick={() => setDetalle('total')} />
        <KPI label="Renta" value={kpis.cobradoRenta} target={kpis.totalRenta} accent="#6366F1" icon={<Receipt size={14} />} onClick={() => setDetalle('renta')} />
        <KPI label="Luz" value={kpis.cobradoLuz} target={kpis.totalLuz} accent="#0EA5E9" icon={<Zap size={14} />} onClick={() => setDetalle('luz')} />
        <KPIPending rentaPend={kpis.pendientesRenta} luzPend={kpis.pendientesLuz} onClick={() => setDetalle('pendientes')} />
      </div>

      {detalle && (
        <DetalleCobroModal
          tipo={detalle} perLocal={perLocal} pagos={pagos}
          mesLargo={MESES_LARGO[monthIdx]} year={year}
          onClose={() => setDetalle(null)}
          onOpenPayment={(l) => { setDetalle(null); onOpenPayment(l); }}
        />
      )}

      {/* ── ALERTAS DE ACTIVIDAD DE INQUILINOS ── */}
      <ActividadInquilinos pagos={pagos} locales={locales} monthIdx={monthIdx} year={year} />

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
              prevData={prevPagos[l.id] || {}} mesAnterior={MESES_LARGO[(monthIdx + 11) % 12]}
              onClick={() => onOpenPayment(l)} i={i}
              onToggleRenta={() => onTogglePago(l.id, { rentaPagada: !((pagos[l.id] || {}).rentaPagada), fechaRenta: new Date().toISOString().slice(0,10) })}
              onToggleLuz={() => onTogglePago(l.id, { luzPagada: !((pagos[l.id] || {}).luzPagada) })}
            />
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
  const [filtro, setFiltro] = useState('');

  // Build month-by-month data
  const monthsData = useMemo(() => {
    return MESES.map((m, idx) => {
      const md = yearData[idx] || {};
      const p = getPagos(md);
      const fact = getFactura(md);
      const prevMonth = idx === 0 ? (yearData['_prevDec'] || {}) : (yearData[idx - 1] || {});
      const prevP = getPagos(prevMonth);
      const prevFact = getFactura(prevMonth);
      const tarifa = calcTarifaEfectiva(fact, locales, p, prevP, config);
      const fijoLocal = calcPerLocalFijo(fact, config, locales);
      const consumoPrincipal = calcConsumoPrincipal(fact, prevFact);
      const consumoSubmedidores = calcTotalKwhSubmedidores(locales, p, prevP);
      const areasComunes = consumoPrincipal != null && consumoSubmedidores > 0
        ? consumoPrincipal - consumoSubmedidores : null;

      let totalRenta = 0, totalLuz = 0, cobradoRenta = 0, cobradoLuz = 0;
      const localData = {};
      locales.forEach((l) => {
        const d = p[l.id] || {};
        const renta = calcRenta(l.m2, year, idx);
        const consumo = calcConsumoLocal(l, p, prevP);
        const luz = (l.tipoLuz === 'medidor' && consumo != null && tarifa)
          ? consumo * tarifa + fijoLocal : (l.tipoLuz === 'fijo' ? (l.luzFija || 0) : 0);
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
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ps-input ps-mono"
            style={{ padding: '.5rem .85rem', fontSize: '.95rem', fontWeight: 500, cursor: 'pointer', minWidth: 110 }}
          >
            {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => (
              <option key={y} value={y}>Año {y}</option>
            ))}
          </select>
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

      {/* Búsqueda / filtro */}
      <input
        type="text"
        placeholder="🔍 Filtrar mes (ej: mayo, abril...)"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="ps-input"
        style={{ fontSize: '.85rem', maxWidth: 360 }}
      />

      {(() => {
        const filtered = filtro
          ? monthsData.filter(m => {
              const f = filtro.toLowerCase();
              return (m.mes || '').toLowerCase().includes(f)
                || (m.mesLargo || '').toLowerCase().includes(f);
            })
          : monthsData;
        return (
          <>
            {subView === 'plaza' && <HistorialPlaza monthsData={filtered} year={year} />}
            {subView === 'locales' && <HistorialLocales monthsData={filtered} locales={locales} year={year} />}
            {subView === 'enee' && <HistorialENEE monthsData={filtered} year={year} />}
          </>
        );
      })()}
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
          <div className="ps-mono" style={{ fontSize: '1.8rem', fontWeight: 600, color: '#6366F1', letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ fontSize: '.55em', color: '#6E6E78', marginRight: '.25rem' }}>L</span>
            {fmt(totals.cobrado)}
          </div>
          <div className="ps-mono" style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.2rem' }}>
            de L {fmt(totals.esperado)} esperado
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#6366F1' }}><Receipt size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Renta cobrada</div>
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            L {fmt(totals.renta)}
          </div>
        </div>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#6366F1' }}><Zap size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Luz cobrada</div>
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
                  <td className="num" style={{ color: '#6366F1' }}>L {fmt(m.cobradoLuz)}</td>
                  <td className="num" style={{ color: '#6366F1', fontWeight: 600 }}>L {fmt(m.total)}</td>
                  <td className="num" style={{ color: '#6E6E78' }}>L {fmt(m.esperado)}</td>
                  <td className="num" style={{ color: pct >= 100 ? '#6366F1' : pct > 50 ? '#8B5CF6' : '#6E6E78' }}>
                    {m.esperado > 0 ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              );
            })}
            <tr style={{ background: '#E8E8ED' }}>
              <td style={{ fontWeight: 700, fontSize: '.85rem' }}>TOTAL {year}</td>
              <td className="num" style={{ fontWeight: 700 }}>L {fmt(monthsData.reduce((s, m) => s + m.cobradoRenta, 0))}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>L {fmt(monthsData.reduce((s, m) => s + m.cobradoLuz, 0))}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>L {fmt(totals.cobrado)}</td>
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
                borderRadius: 4, color: '#6366F1', fontWeight: 600, minWidth: 32, textAlign: 'center',
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
                <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 600, color: '#6366F1' }}>
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
                            <td className="num" style={{ color: '#6366F1' }}>
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
                        <td className="num" style={{ color: '#6366F1', fontWeight: 700 }}>{totalConsumo} kWh</td>
                        <td className="num" style={{ fontWeight: 700 }}>L {fmt(totalRenta)}</td>
                        <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>L {fmt(totalLuz)}</td>
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
    let totalLuzEsperado = 0, totalLuzCobrado = 0;
    monthsData.forEach((m) => {
      if (m.factura.montoTotal) {
        monto += Number(m.factura.montoTotal);
        mesesConData++;
      }
      if (m.consumoPrincipal) kwhPrincipal += m.consumoPrincipal;
      if (m.consumoSubmedidores) kwhSubmedidores += m.consumoSubmedidores;
      if (m.areasComunes) areasComunes += m.areasComunes;
      totalLuzEsperado += m.totalLuz || 0;
      totalLuzCobrado += m.cobradoLuz || 0;
    });
    return { monto, kwhPrincipal, kwhSubmedidores, areasComunes, mesesConData, totalLuzEsperado, totalLuzCobrado };
  }, [monthsData]);

  // Tarifa efectiva chart
  const tarifaChart = monthsData.filter((m) => m.tarifa).map((m) => ({
    mes: m.mes, tarifa: Number(m.tarifa.toFixed(2)), kwh: m.consumoPrincipal || 0,
  }));

  const diferencia = yearTotals.monto - yearTotals.totalLuzCobrado;
  const pendiente = yearTotals.totalLuzEsperado - yearTotals.totalLuzCobrado;
  const cuadra = Math.abs(diferencia) < 1; // tolerancia 1 lempira por redondeo

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {/* CUADRATURA ANUAL — lo que pagó admin a ENEE vs lo que cobró a inquilinos */}
      {yearTotals.mesesConData > 0 && (
        <div className="ps-card-elevated" style={{ padding: '1.5rem' }}>
          <div className="ps-eyebrow" style={{ color: cuadra ? '#1A7F35' : '#B25800', marginBottom: '.5rem' }}>
            {cuadra ? '✅ CUADRATURA' : '⚠️ CUADRATURA'} · {year}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>
            ¿Lo que cobré a los inquilinos cubre lo que pagué a ENEE?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            <div>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Pagado a ENEE</div>
              <div className="ps-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1C1C1E' }}>L {fmt(yearTotals.monto)}</div>
              <div className="ps-mono" style={{ fontSize: '.68rem', color: '#6E6E78', marginTop: '.15rem' }}>{yearTotals.mesesConData} {yearTotals.mesesConData === 1 ? 'mes' : 'meses'} facturados</div>
            </div>
            <div>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Cobrado a inquilinos</div>
              <div className="ps-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A7F35' }}>L {fmt(yearTotals.totalLuzCobrado)}</div>
              <div className="ps-mono" style={{ fontSize: '.68rem', color: '#6E6E78', marginTop: '.15rem' }}>luz cobrada efectiva</div>
            </div>
            <div>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Diferencia</div>
              <div className="ps-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: cuadra ? '#1A7F35' : '#B25800' }}>
                L {fmt(diferencia)}
              </div>
              <div className="ps-mono" style={{ fontSize: '.68rem', color: '#6E6E78', marginTop: '.15rem' }}>
                {cuadra ? 'cuadra perfecto' : 'aún sin cobrar'}
              </div>
            </div>
            {pendiente > 0 && (
              <div>
                <div className="ps-label" style={{ marginBottom: '.3rem' }}>Pendiente de cobro</div>
                <div className="ps-mono" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#B25800' }}>L {fmt(pendiente)}</div>
                <div className="ps-mono" style={{ fontSize: '.68rem', color: '#6E6E78', marginTop: '.15rem' }}>luz pendiente</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENEE summary */}
      <div className="ps-card-elevated" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
        <div>
          <div className="ps-label" style={{ marginBottom: '.4rem', color: '#6366F1' }}>
            <Zap size={11} style={{ display: 'inline', marginRight: '.3rem', verticalAlign: '-2px' }} />Total ENEE {year}
          </div>
          <div className="ps-mono" style={{ fontSize: '1.6rem', fontWeight: 600, color: '#6366F1', letterSpacing: '-0.02em', lineHeight: 1 }}>
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
          <div className="ps-mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#8B5CF6' }}>
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
                <Line type="monotone" dataKey="tarifa" stroke="#1D4ED8" strokeWidth={2.5} dot={{ fill: '#6366F1', r: 4 }} activeDot={{ r: 6 }} />
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
              <th>Período ENEE</th>
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
                <td style={{ fontSize: '.72rem', color: '#6E6E78', whiteSpace: 'nowrap' }}>
                  {m.factura.periodoDesde && m.factura.periodoHasta
                    ? `${m.factura.periodoDesde.slice(8)}/${m.factura.periodoDesde.slice(5,7)} → ${m.factura.periodoHasta.slice(8)}/${m.factura.periodoHasta.slice(5,7)}`
                    : '—'}
                </td>
                <td className="num" style={{ color: '#8E8E96' }}>
                  {m.factura.lecturaPrincipal != null ? m.factura.lecturaPrincipal : '—'}
                </td>
                <td className="num">{m.consumoPrincipal != null ? `${fmt(m.consumoPrincipal)}` : '—'}</td>
                <td className="num" style={{ color: '#6366F1' }}>
                  {m.consumoSubmedidores > 0 ? fmt(m.consumoSubmedidores) : '—'}
                </td>
                <td className="num" style={{ color: m.areasComunes < 0 ? '#FF5C5C' : '#8B5CF6' }}>
                  {m.areasComunes != null ? `${m.areasComunes}` : '—'}
                </td>
                <td className="num" style={{ color: '#6366F1', fontWeight: 600 }}>
                  {m.factura.montoTotal ? `L ${fmt2(m.factura.montoTotal)}` : '—'}
                </td>
                <td className="num" style={{ color: '#6366F1', fontWeight: 600 }}>
                  {m.tarifa ? `L ${fmt2(m.tarifa)}` : '—'}
                </td>
              </tr>
            ))}
            <tr style={{ background: '#E8E8ED' }}>
              <td style={{ fontWeight: 700 }}>TOTAL {year}</td>
              <td></td>
              <td className="num"></td>
              <td className="num" style={{ fontWeight: 700 }}>{fmt(yearTotals.kwhPrincipal)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>{fmt(yearTotals.kwhSubmedidores)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#8B5CF6' }}>{fmt(yearTotals.areasComunes)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>L {fmt2(yearTotals.monto)}</td>
              <td className="num" style={{ fontWeight: 700, color: '#6366F1' }}>
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
const FacturaCard = memo(function FacturaCard({ factura, consumoPrincipal, consumoSubmedidores, areasComunes, tarifaEfectiva, onEdit }) {
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
            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(255, 184, 84, 0.3)',
            display: 'grid', placeItems: 'center',
          }}>
            <FileText size={18} color="#7C3AED" />
          </div>
          <div>
            <div className="ps-eyebrow" style={{ color: '#8B5CF6', marginBottom: '.2rem' }}>
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
            background: 'rgba(99,102,241, 0.1)', border: '1px solid rgba(99,102,241, 0.25)',
            display: 'grid', placeItems: 'center',
          }}>
            <Zap size={18} color="#5AC8FA" />
          </div>
          <div>
            <div className="ps-eyebrow" style={{ color: '#6366F1', marginBottom: '.15rem' }}>
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
});

function FacturaStat({ label, value, sub, accent, highlight }) {
  return (
    <div style={{
      padding: highlight ? '.5rem .75rem' : 0,
      background: highlight ? 'rgba(132, 248, 65, 0.06)' : 'transparent',
      border: highlight ? '1px solid rgba(99,102,241,0.2)' : 'none',
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

const KPI = memo(function KPI({ label, value, target, accent, icon, big, onClick }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={big ? 'ps-card-elevated' : 'ps-card'}
      style={{
        padding: '1.1rem 1.25rem',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={(e) => { if (clickable) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (clickable) e.currentTarget.style.transform = ''; }}
    >
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
        de L {fmt(target)} {clickable && <span style={{ marginLeft: '.4rem', color: '#8E8E96' }}>· ver detalle →</span>}
      </div>
      <div className="ps-bar-bg">
        <div className="ps-bar-fill" style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 8px ${accent}66` }} />
      </div>
    </div>
  );
});

const KPIPending = memo(function KPIPending({ rentaPend, luzPend, onClick }) {
  const total = rentaPend + luzPend;
  const clickable = !!onClick && total > 0;
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className="ps-card"
      style={{
        padding: '1.1rem 1.25rem',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform .12s',
      }}
      onMouseEnter={(e) => { if (clickable) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (clickable) e.currentTarget.style.transform = ''; }}
    >
      <div className="ps-label" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#8B5CF6', marginBottom: '.6rem' }}>
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
      {clickable && <div style={{ fontSize: '.7rem', color: '#8E8E96', marginTop: '.5rem' }}>ver detalle →</div>}
    </div>
  );
});

function DetalleCobroModal({ tipo, perLocal, pagos, mesLargo, year, onClose, onOpenPayment }) {
  const titulos = {
    total: { label: 'Total cobrado', icon: '💰', accent: '#1D4ED8' },
    renta: { label: 'Renta', icon: '🧾', accent: '#1D4ED8' },
    luz: { label: 'Luz', icon: '⚡', accent: '#0EA5E9' },
    pendientes: { label: 'Pendientes de pago', icon: '⏳', accent: '#FF9F0A' },
  };
  const t = titulos[tipo] || titulos.total;

  const rows = perLocal
    .filter(l => {
      if (!l.inquilino) return false;
      if (tipo === 'pendientes') {
        const d = pagos[l.id] || {};
        const debeRenta = !d.rentaPagada && l.renta > 0;
        const debeLuz = !d.luzPagada && l.luz > 0;
        return debeRenta || debeLuz;
      }
      return true;
    })
    .map(l => {
      const d = pagos[l.id] || {};
      return { ...l, rentaPagada: !!d.rentaPagada, luzPagada: !!d.luzPagada, fechaRenta: d.fechaRenta, fechaLuz: d.fechaLuz };
    });

  const sumCobrado = rows.reduce((s, r) => s + (tipo === 'renta' ? (r.rentaPagada ? r.renta : 0) : tipo === 'luz' ? (r.luzPagada ? r.luz : 0) : r.cobrado), 0);
  const sumTotal = rows.reduce((s, r) => s + (tipo === 'renta' ? r.renta : tipo === 'luz' ? r.luz : r.total), 0);

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal ps-card-elevated" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem', maxWidth: 580 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ color: t.accent, marginBottom: '.25rem' }}>{t.icon} {t.label.toUpperCase()} · {mesLargo} {year}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>{tipo === 'pendientes' ? 'A cobrar todavía' : 'Estado por local'}</div>
          </div>
          <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
        </div>

        <div className="ps-divider-soft" style={{ marginBottom: '1rem' }} />

        {rows.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: '#6E6E78', fontSize: '.9rem' }}>
            {tipo === 'pendientes' ? '✅ No hay pagos pendientes este mes.' : 'No hay locales con inquilino.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: '.5rem', marginBottom: '1rem' }}>
              {rows.map(r => {
                const monto = tipo === 'renta' ? r.renta : tipo === 'luz' ? r.luz : r.total;
                const pagado = tipo === 'renta' ? r.rentaPagada : tipo === 'luz' ? r.luzPagada : (r.rentaPagada && r.luzPagada);
                const fecha = tipo === 'renta' ? r.fechaRenta : tipo === 'luz' ? r.fechaLuz : null;
                return (
                  <div key={r.id}
                    onClick={() => onOpenPayment && onOpenPayment(r)}
                    style={{
                      padding: '.7rem .9rem',
                      background: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      borderRadius: 8, cursor: onOpenPayment ? 'pointer' : 'default',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.8rem',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.88rem', fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        L{r.numero} · {r.inquilino}
                      </div>
                      <div style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.15rem' }}>
                        {tipo === 'pendientes' ? (
                          <>
                            {!r.rentaPagada && r.renta > 0 && <span>Renta L {fmt(r.renta)}</span>}
                            {!r.rentaPagada && !r.luzPagada && r.renta > 0 && r.luz > 0 && ' · '}
                            {!r.luzPagada && r.luz > 0 && <span>Luz L {fmt(r.luz)}</span>}
                          </>
                        ) : pagado ? (
                          <span style={{ color: '#1A7F35' }}>✓ Pagado{fecha ? ` el ${fecha}` : ''}</span>
                        ) : (
                          <span style={{ color: '#B25800' }}>⏳ Pendiente</span>
                        )}
                      </div>
                    </div>
                    <div className="ps-mono" style={{ fontSize: '.92rem', fontWeight: 700, color: pagado ? '#1A7F35' : '#1C1C1E', whiteSpace: 'nowrap' }}>
                      L {fmt(monto)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: '.8rem 1rem', background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <div style={{ fontSize: '.78rem', color: '#6E6E78', fontWeight: 500 }}>
                {tipo === 'pendientes' ? 'Total pendiente' : 'Cobrado / Esperado'}
              </div>
              <div className="ps-mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1C1C1E' }}>
                {tipo === 'pendientes'
                  ? <>L {fmt(sumTotal - sumCobrado)}</>
                  : <>L {fmt(sumCobrado)} <span style={{ color: '#6E6E78', fontWeight: 500 }}>/ L {fmt(sumTotal)}</span></>}
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button onClick={onClose} className="ps-btn-ghost">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// ACTIVIDAD INQUILINOS — alertas cuando generan recibos
// =================================================================
function ActividadInquilinos({ pagos, locales, monthIdx, year }) {
  const [abierto, setAbierto] = useState(false)
  const tiempoRelativo = (iso) => {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (diff < 60)   return 'hace unos segundos'
    if (diff < 3600) return `hace ${Math.floor(diff/60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`
    return `hace ${Math.floor(diff/86400)} días`
  }

  const alertas = []
  locales.forEach(l => {
    const d = pagos[l.id] || {}
    const nombre = l.inquilino || `Local ${l.numero}`
    if (d.actividadRenta) alertas.push({
      id: l.id + 'r', tipo: 'renta', nombre,
      localNum: l.numero, ts: d.actividadRenta,
      comprobante: d.comprobanteRenta,
    })
    if (d.actividadLuz) alertas.push({
      id: l.id + 'l', tipo: 'luz', nombre,
      localNum: l.numero, ts: d.actividadLuz,
      comprobante: d.comprobanteLuz,
    })
  })

  // Ordenar más reciente primero
  alertas.sort((a, b) => new Date(b.ts) - new Date(a.ts))

  if (alertas.length === 0) return null

  return (
    <div className="ps-card" style={{ padding: abierto ? '1.25rem' : '.8rem 1.25rem', borderLeft: '3px solid #F59E0B' }}>
      <button onClick={() => setAbierto(a => !a)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.5rem', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left' }}>
        <AlertCircle size={15} style={{ color: '#F59E0B' }} />
        <div className="ps-eyebrow" style={{ color: '#F59E0B' }}>ACTIVIDAD DE INQUILINOS</div>
        <span style={{ background: '#F59E0B', color: 'white', borderRadius: 999, fontSize: '.65rem', fontWeight: 700, padding: '.1rem .5rem' }}>{alertas.length}</span>
        <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: '#6E6E78', transition: 'transform .2s', transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.85rem' }}>
          {alertas.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '.75rem',
              background: a.tipo === 'renta' ? 'rgba(99,102,241,0.07)' : 'rgba(14,165,233,0.07)',
              border: `1px solid ${a.tipo === 'renta' ? 'rgba(99,102,241,0.2)' : 'rgba(14,165,233,0.2)'}`,
              borderRadius: 10, padding: '.65rem .9rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{a.tipo === 'renta' ? '📄' : '⚡'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.88rem', fontWeight: 600 }}>
                  <span style={{ color: a.tipo === 'renta' ? '#6366F1' : '#0EA5E9' }}>Local {a.localNum}</span>
                  {' · '}{a.nombre}
                </div>
                <div style={{ fontSize: '.74rem', color: '#6E6E78', marginTop: '.1rem' }}>
                  Generó recibo de <b>{a.tipo}</b> — {tiempoRelativo(a.ts)}
                </div>
              </div>
              {a.comprobante
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <img src={a.comprobante} alt="comprobante"
                      style={{ width: 40, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(52,199,89,0.4)', cursor: 'pointer' }}
                      onClick={() => window.open(a.comprobante, '_blank')} />
                    <span style={{ fontSize: '.7rem', color: '#1A7F35', fontWeight: 600 }}>✅ Pagado</span>
                  </div>
                : <span style={{ fontSize: '.7rem', color: '#F59E0B', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '.15rem .45rem', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Sin comprobante</span>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const LocalRow = memo(function LocalRow({ l, data, tarifaEfectiva, prevData = {}, mesAnterior, onClick, i, onToggleRenta, onToggleLuz }) {
  const tipoLuz = l.tipoLuz || 'incluido';
  const luzAplica = tipoLuz !== 'incluido';
  const luzCalculable = tipoLuz === 'medidor' ? (l.consumo != null && tarifaEfectiva != null) : true;

  const btnBase = {
    border: 'none', borderRadius: 6, fontSize: '.72rem', fontWeight: 600,
    cursor: 'pointer', padding: '.28rem .6rem', display: 'inline-flex',
    alignItems: 'center', gap: '.25rem', transition: 'all .15s',
  };
  const btnPaid = { ...btnBase, background: '#D1FAE5', color: '#065F46' };
  const btnPending = { ...btnBase, background: '#FEE2E2', color: '#991B1B' };
  const btnNA = { ...btnBase, background: '#F3F4F6', color: '#9CA3AF', cursor: 'default' };

  return (
    <div className="ps-local-row" onClick={onClick} style={{ animationDelay: `${i * 60}ms` }}>
      <div className="ps-local-info" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.2rem' }}>
          <span className="ps-mono" style={{
            fontSize: '.7rem', padding: '.15rem .4rem', background: 'rgba(255,255,255,0.50)',
            borderRadius: 4, color: '#6366F1', fontWeight: 600,
          }}>{l.numero || '?'}</span>
          <span className="ps-mono" style={{ fontSize: '.7rem', color: '#6E6E78' }}>{l.m2} m²</span>
        </div>
        <div style={{ fontSize: '.95rem', fontWeight: 500 }}>
          {l.inquilino || <span style={{ color: '#5A5A64' }}>Sin asignar</span>}
        </div>
        {l.nombre && <div style={{ fontSize: '.75rem', color: '#6E6E78', marginTop: '.1rem' }}>{l.nombre}</div>}
      </div>

      <div className="ps-local-renta">
        <div className="ps-label" style={{ marginBottom: '.25rem' }}>RENTA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 600 }}>L {fmt(l.renta)}</div>
          <button style={data.rentaPagada ? btnPaid : btnPending}
            onClick={(e) => { e.stopPropagation(); onToggleRenta && onToggleRenta(); }}>
            {data.rentaPagada ? '✓ Pagada' : '○ Pendiente'}
          </button>
        </div>
      </div>

      <div className="ps-local-luz">
        <div className="ps-label" style={{ marginBottom: '.25rem' }}>LUZ</div>
        {luzAplica ? (
          luzCalculable ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
              <div className="ps-mono" style={{ fontSize: '.95rem', fontWeight: 600 }}>L {fmt(l.luz)}</div>
              {l.luz > 0
                ? <button style={data.luzPagada ? btnPaid : btnPending}
                    onClick={(e) => { e.stopPropagation(); onToggleLuz && onToggleLuz(); }}>
                    {data.luzPagada ? '✓ Pagada' : '○ Pendiente'}
                  </button>
                : <span style={btnNA}>—</span>}
              {l.consumo != null && (
                <span className="ps-mono" style={{ fontSize: '.7rem', color: '#6366F1' }}>{l.consumo} kWh</span>
              )}
            </div>
          ) : (
            <span className="ps-pill ps-pill-na"><span className="ps-pill-dot" />Falta datos</span>
          )
        ) : (
          <span className="ps-pill ps-pill-na"><span className="ps-pill-dot" />Incluida</span>
        )}
        {luzAplica && (
          <div style={{ marginTop: '.4rem', fontSize: '.7rem', color: '#6E6E78' }}>
            Luz {mesAnterior}:{' '}
            {prevData.luzPagada
              ? <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ pagada</span>
              : prevData.lecturaActual != null
                ? <span style={{ color: '#DC2626', fontWeight: 700 }}>○ pendiente</span>
                : <span style={{ color: '#9CA3AF' }}>sin registrar</span>}
          </div>
        )}
      </div>

      <div className="ps-local-arrow"><ArrowRight size={16} style={{ color: '#5A5A64' }} /></div>
    </div>
  );
});

// =================================================================
// FACTURA MODAL
// =================================================================

// Comprime imagen a base64 (max 1200px, calidad 0.7) para usar en recibos.
// 1200px da buena resolución para que se lea el medidor en el PDF.

function ConfigView({ config, locales, onSaveConfig, onAddLocal, onEditLocal, onDeleteLocal, calcRenta }) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const [fetchingTasa, setFetchingTasa] = useState(false);
  const [tasaMsg, setTasaMsg] = useState('');

  const fetchTasaBac = async () => {
    setFetchingTasa(true);
    setTasaMsg('');
    try {
      // dryRun=1: solo previsualiza la tasa en el input. El usuario decide si
      // hace Guardar. (El cron diario ya la persiste sin que toques nada.)
      const res = await fetch('/api/tasa-bac?dryRun=1');
      const data = await res.json();
      if (data?.ok && data.sell) {
        setDraft(d => ({ ...d, tasaCambio: data.sell }));
        setTasaMsg(`✓ Tasa BAC venta: L ${Number(data.sell).toFixed(4)}/$ — clic Guardar para fijarla`);
      } else {
        setTasaMsg(`No se pudo obtener la tasa de BAC${data?.error ? ': ' + data.error : ''}`);
      }
    } catch (e) {
      setTasaMsg('Error de conexión con /api/tasa-bac');
    }
    setFetchingTasa(false);
  };

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
          <Field label="Precio por m² (USD $)">
            <input type="number" step="0.01" className="ps-input ps-mono" value={draft.rentPerM2USD ?? draft.rentPerM2 ?? 29} onChange={(e) => setDraft({ ...draft, rentPerM2USD: Number(e.target.value) })} />
          </Field>
          <Field label="Tipo de cambio (HNL/$)">
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              <input type="number" step="0.01" className="ps-input ps-mono" style={{ flex: 1 }} value={draft.tasaCambio ?? 25} onChange={(e) => setDraft({ ...draft, tasaCambio: Number(e.target.value) })} />
              <button onClick={fetchTasaBac} disabled={fetchingTasa} title="Traer la tasa de venta publicada por BAC Honduras (banca en línea pública)" style={{ padding: '0 .65rem', height: '38px', background: fetchingTasa ? '#e5e5ea' : '#6366F1', color: '#fff', border: 'none', borderRadius: 8, fontSize: '.75rem', fontWeight: 600, cursor: fetchingTasa ? 'default' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                {fetchingTasa ? '...' : '🔄 BAC'}
              </button>
            </div>
            {tasaMsg && <div style={{ fontSize: '.72rem', marginTop: '.3rem', color: tasaMsg.startsWith('✓') ? '#34C759' : '#FF3B30' }}>{tasaMsg}</div>}
            {draft.tasaFechaActualizada && (
              <div style={{ fontSize: '.7rem', marginTop: '.25rem', color: '#8E8E96' }}>
                Última actualización auto ({draft.tasaFuente || 'BAC'}): {draft.tasaFechaActualizada}
              </div>
            )}
          </Field>
          <Field label="ISV (%)">
            <input type="number" step="0.01" className="ps-input ps-mono" value={(draft.isv * 100).toFixed(2)} onChange={(e) => setDraft({ ...draft, isv: Number(e.target.value) / 100 })} />
          </Field>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.1rem', marginBottom: '1rem' }}>
          <div className="ps-eyebrow" style={{ marginBottom: '.5rem' }}><Zap size={10} /> CARGOS FIJOS DE LA FACTURA ENEE</div>
          <div style={{ fontSize: '.78rem', color: '#6E6E78', marginBottom: '.9rem', lineHeight: 1.45 }}>
            Estos cargos se dividen en <b>partes iguales</b> entre los locales con submedidor. Solo la energía (kWh) se prorratea por consumo. ENEE los actualiza trimestralmente — revisalos cada vez que cambien.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.85rem' }}>
            <Field label="Cargo por comercialización (L)">
              <input type="number" step="0.01" className="ps-input ps-mono" value={draft.cargoComercializacion ?? 60} onChange={(e) => setDraft({ ...draft, cargoComercializacion: Number(e.target.value) })} />
            </Field>
            <Field label="Cargo por regulación (L)">
              <input type="number" step="0.01" className="ps-input ps-mono" value={draft.cargoRegulacion ?? 30} onChange={(e) => setDraft({ ...draft, cargoRegulacion: Number(e.target.value) })} />
            </Field>
            <Field label="Alumbrado público (L)">
              <input type="number" step="0.01" className="ps-input ps-mono" value={draft.alumbradoPublico ?? 130} onChange={(e) => setDraft({ ...draft, alumbradoPublico: Number(e.target.value) })} />
            </Field>
          </div>
        </div>

        <div style={{
          background: 'rgba(99,102,241, 0.06)', border: '1px solid rgba(99,102,241, 0.2)',
          padding: '.75rem .9rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '.78rem',
          color: '#8E8E96', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
        }}>
          <Info size={14} color="#5AC8FA" style={{ flexShrink: 0, marginTop: '.1rem' }} />
          <div>
            <strong style={{ color: '#1C1C1E' }}>La tarifa de energía no se configura aquí.</strong> Cada mes se calcula sola: <code>(factura ENEE − cargos fijos) ÷ kWh totales</code>. Así siempre cuadra exacto y se ajusta a los cambios trimestrales de ENEE.
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
                    borderRadius: 4, color: '#6366F1', fontWeight: 600, minWidth: 32, textAlign: 'center',
                  }}>{l.numero || '?'}</span>
                  <div>
                    <div style={{ fontSize: '.92rem', fontWeight: 500 }}>{l.inquilino || 'Sin asignar'}</div>
                    <div style={{ fontSize: '.75rem', color: '#6E6E78' }}>
                      {l.m2} m² · L {fmt(calcRenta(l.m2))}/mes · Luz: {tipoLabel}
                    </div>
                  </div>
                  <span className="ps-mono" style={{ fontSize: '.78rem', color: '#6366F1' }}>L {fmt(calcRenta(l.m2))}</span>
                  <button onClick={() => onEditLocal(l)} className="ps-btn-icon"><Edit3 size={13} /></button>
                  <button onClick={() => onDeleteLocal(l.id)} className="ps-btn-icon" style={{ color: '#FF5C5C' }}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── USUARIOS INQUILINOS ── */}
      <UsuariosSection config={config} locales={locales} onSaveConfig={onSaveConfig}
        onSendReminders={async (usuarios) => {
          const mes = MESES_LARGO[new Date().getMonth()];
          for (const u of usuarios) {
            try {
              await fetch('https://gmailmcp.googleapis.com/mcp/v1', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tool: 'create_draft',
                  input: {
                    to: u.email,
                    subject: `Stefany Plaza — Su recibo de ${mes} está disponible`,
                    body: `Estimado/a ${u.nombre},\n\nLe informamos que su recibo de renta correspondiente al mes de ${mes} ya está disponible en el portal de inquilinos de Stefany Plaza.\n\nPuede acceder en: https://plazastefany.com\nUsuario: ${u.usuario}\n\nSaludos,\nD&L Soluciones\nStefany Plaza\n+504 9462-8618`
                  }
                })
              });
            } catch(e) {}
          }
          alert(`Borradores de email creados para ${usuarios.length} inquilino(s). Revisá tu Gmail para enviarlos.`);
        }}
      />

      {/* ── AUDIT LOG ── */}
      <AuditLogSection />
    </div>
  );
}

function ComprobantesInbox({ locales, pagos, monthIdx, year, onAprobar }) {
  const lb = useLightbox();
  // Buscar comprobantes subidos pero pago aún no marcado como pagado
  const pendientes = useMemo(() => {
    const out = [];
    locales.forEach(l => {
      const p = pagos[l.id] || {};
      if (p.comprobanteRenta && !p.rentaPagada) {
        out.push({
          local: l, tipo: 'renta',
          comprobante: p.comprobanteRenta,
          fechaSubida: p.comprobanteRentaDate,
        });
      }
      if (p.comprobanteLuz && !p.luzPagada) {
        out.push({
          local: l, tipo: 'luz',
          comprobante: p.comprobanteLuz,
          fechaSubida: p.comprobanteLuzDate,
        });
      }
    });
    return out;
  }, [locales, pagos]);

  if (pendientes.length === 0) return null;

  const fechaFmt = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-HN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="ps-card-elevated" style={{ padding: '1.25rem 1.5rem', borderColor: 'rgba(52, 199, 89, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,199,89,0.12)', display: 'grid', placeItems: 'center', fontSize: '18px' }}>📥</div>
        <div>
          <div className="ps-eyebrow" style={{ color: '#1A7F35', marginBottom: '.15rem' }}>COMPROBANTES PENDIENTES</div>
          <div style={{ fontSize: '.95rem', fontWeight: 600 }}>{pendientes.length} esperando tu aprobación</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '.5rem' }}>
        {pendientes.map((item, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr auto auto', gap: '.75rem',
            alignItems: 'center', padding: '.6rem .8rem',
            background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: 10,
          }}>
            <img src={item.comprobante} alt="comprobante"
              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #e2e8f0' }}
              onClick={() => lb.open(item.comprobante)}
            />
            <div>
              <div style={{ fontSize: '.85rem', fontWeight: 600 }}>
                {item.local.inquilino || `Local ${item.local.numero}`}
                <span style={{ marginLeft: '.5rem', fontSize: '.7rem', fontWeight: 500, padding: '.1rem .4rem', borderRadius: 4,
                  background: item.tipo === 'renta' ? 'rgba(99,102,241,0.12)' : 'rgba(251,146,60,0.12)',
                  color: item.tipo === 'renta' ? '#6366F1' : '#FB923C',
                }}>
                  {item.tipo === 'renta' ? '🏠 Renta' : '⚡ Luz'}
                </span>
              </div>
              <div style={{ fontSize: '.7rem', color: '#6E6E78', marginTop: '.15rem' }}>
                Subido {fechaFmt(item.fechaSubida)} · Click en imagen para ver
              </div>
            </div>
            <button
              className="ps-btn-ghost"
              style={{ fontSize: '.75rem', padding: '.4rem .65rem' }}
              onClick={() => lb.open(item.comprobante)}
            >👁 Ver</button>
            <button
              className="ps-btn"
              style={{ fontSize: '.75rem', padding: '.4rem .75rem', background: '#34C759' }}
              onClick={() => onAprobar(item.local.id, item.tipo)}
            >✓ Aprobar</button>
          </div>
        ))}
      </div>
      {lb.element}
    </div>
  );
}

function AuditLogSection() {
  const [log, setLog] = useState([]);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await loadAuditLog();
      if (alive) { setLog(data); setLoading(false); }
    })();
    // Polling 30s (era 5s — 12× menos queries). Realtime sub cubre updates en vivo igual.
    const interval = setInterval(async () => {
      const data = await loadAuditLog();
      if (alive) setLog(data);
    }, 30000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  // Opciones de filtro derivadas de los datos reales (no se puede filtrar por algo que no existe)
  const mesesDisponibles = useMemo(() => {
    const set = new Set();
    log.forEach(e => { if (e.mes) set.add(e.mes); });
    return [...set].sort((a, b) => {
      // Ordenar por año desc, luego por mes (asume formato "Mes YYYY")
      const [, ya] = a.split(' '); const [, yb] = b.split(' ');
      if (ya !== yb) return Number(yb) - Number(ya);
      const orden = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return orden.indexOf(b.split(' ')[0]) - orden.indexOf(a.split(' ')[0]);
    });
  }, [log]);
  const localesDisponibles = useMemo(() => {
    const set = new Set();
    log.forEach(e => { if (e.local) set.add(e.local); });
    return [...set].sort();
  }, [log]);

  const filtered = log.filter(e => {
    if (filtroMes && e.mes !== filtroMes) return false;
    if (filtroLocal && e.local !== filtroLocal) return false;
    return true;
  });
  const visible = showAll ? filtered : filtered.slice(0, 20);
  const limpiarFiltros = () => { setFiltroMes(''); setFiltroLocal(''); };
  const hayFiltros = !!filtroMes || !!filtroLocal;

  const fechaFmt = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-HN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  };

  return (
    <div className="ps-card" style={{ padding: abierto ? '1.4rem 1.5rem' : '.9rem 1.5rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <button onClick={() => setAbierto(a => !a)}
          style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '.6rem', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', textAlign: 'left' }}>
          <div>
            <div className="ps-eyebrow" style={{ marginBottom: abierto ? '.25rem' : 0 }}>📋 ACTIVIDAD ADMIN {!abierto && log.length > 0 && <span style={{ color: '#6E6E78', marginLeft: '.4rem' }}>· {log.length} acciones</span>}</div>
            {abierto && <div style={{ fontSize: '1rem', fontWeight: 600 }}>Registro de acciones</div>}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: '#6E6E78', transition: 'transform .2s', transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {abierto && (
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}
              className="ps-input" style={{ fontSize: '.8rem', padding: '.4rem .55rem', minWidth: 140 }}>
              <option value="">Todos los meses</option>
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)}
              className="ps-input" style={{ fontSize: '.8rem', padding: '.4rem .55rem', minWidth: 140, maxWidth: 240 }}>
              <option value="">Todos los locales</option>
              {localesDisponibles.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="ps-btn-ghost" style={{ fontSize: '.75rem', padding: '.4rem .65rem' }}>
                Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {!abierto ? null : loading ? (
        <div style={{ color: '#6E6E78', fontSize: '.85rem', padding: '.5rem 0' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#6E6E78', fontSize: '.85rem', padding: '.5rem 0' }}>
          {hayFiltros ? 'No hay actividad con esos filtros.' : 'Aún no hay actividad registrada.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '.4rem' }}>
            {visible.map((e, i) => (
              <div key={i} style={{
                padding: '.6rem .8rem',
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 8, fontSize: '.82rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.6rem', marginBottom: '.2rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3 }}>{e.accion}</div>
                  <div style={{ color: '#6E6E78', fontSize: '.7rem', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                    {fechaFmt(e.fecha)}
                  </div>
                </div>
                {(e.local || e.mes) && (
                  <div style={{ fontSize: '.72rem', color: '#6E6E78' }}>
                    {e.local}{e.local && e.mes ? ' · ' : ''}{e.mes}
                  </div>
                )}
              </div>
            ))}
          </div>
          {filtered.length > 20 && (
            <button onClick={() => setShowAll(s => !s)} className="ps-btn-ghost"
              style={{ marginTop: '.75rem', fontSize: '.8rem' }}>
              {showAll ? `Ver menos` : `Ver todos (${filtered.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function UsuariosSection({ config, locales, onSaveConfig, onSendReminders }) {
  const usuarios = config.usuarios || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ localId: '', nombre: '', usuario: '', email: '' });
  const [editIdx, setEditIdx] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSave = () => {
    if (!form.localId || !form.usuario) { alert('Completá local y usuario.'); return; }
    const list = [...usuarios];
    const { password, ...clean } = form;
    if (editIdx !== null) list[editIdx] = clean;
    else list.push(clean);
    onSaveConfig({ ...config, usuarios: list });
    setShowForm(false); setEditIdx(null);
    setForm({ localId: '', nombre: '', usuario: '', email: '' });
  };

  const handleEdit = (u, i) => {
    const { password, ...clean } = u;
    setForm({ email: '', ...clean });
    setEditIdx(i);
    setShowForm(true);
  };

  const handleDelete = (i) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    const list = usuarios.filter((_, j) => j !== i);
    onSaveConfig({ ...config, usuarios: list });
  };

  const handleSendReminders = async () => {
    const conEmail = usuarios.filter(u => u.email);
    if (conEmail.length === 0) { alert('Ningún inquilino tiene email configurado.'); return; }
    setSending(true);
    await onSendReminders(conEmail);
    setSending(false);
  };

  return (
    <div className="ps-card" style={{ padding: '1.4rem 1.5rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <div className="ps-eyebrow" style={{ marginBottom: '.25rem' }}><Users size={10} /> ACCESO INQUILINOS</div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>Usuarios del portal</div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {usuarios.some(u=>u.email) && (
            <button onClick={handleSendReminders} disabled={sending} className="ps-btn-ghost" style={{ fontSize: '.8rem' }}>
              {sending ? '⏳ Enviando…' : '✉ Enviar recordatorios'}
            </button>
          )}
          <button onClick={() => { setShowForm(true); setEditIdx(null); setForm({ localId: '', nombre: '', usuario: '', password: '', email: '' }); }} className="ps-btn">
            <Plus size={14} strokeWidth={2.5} /> Agregar usuario
          </button>
        </div>
      </div>

      {usuarios.length === 0 && !showForm && (
        <div style={{ color: '#6E6E78', fontSize: '.85rem', padding: '.5rem 0' }}>
          No hay usuarios creados. Los inquilinos podrán acceder al portal con sus credenciales.
        </div>
      )}

      {usuarios.map((u, i) => {
        const loc = locales.find(l => l.id === u.localId);
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 10, padding: '.7rem 1rem', marginBottom: '.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{u.nombre || u.usuario}</div>
              <div style={{ fontSize: '.75rem', color: '#6E6E78' }}>
                Usuario: <b>{u.usuario}</b> · Local {loc?.numero || '?'} — {loc?.inquilino || 'Sin asignar'}
              </div>
            </div>
            <button onClick={() => handleEdit(u, i)} className="ps-btn-icon"><Edit3 size={13} /></button>
            <button onClick={() => handleDelete(i)} className="ps-btn-icon" style={{ color: '#FF5C5C' }}><Trash2 size={13} /></button>
          </div>
        );
      })}

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '1.2rem', marginTop: '.5rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '.85rem', fontSize: '.9rem' }}>{editIdx !== null ? 'Editar usuario' : 'Nuevo usuario'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.75rem' }}>
            <div>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Local</div>
              <select value={form.localId} onChange={e => setForm(p => ({ ...p, localId: e.target.value }))} className="ps-input" style={{ height: 40 }}>
                <option value="">Seleccionar local…</option>
                {locales.map(l => <option key={l.id} value={l.id}>Local {l.numero} — {l.inquilino || 'Sin asignar'}</option>)}
              </select>
            </div>
            <div>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Nombre visible</div>
              <input className="ps-input" placeholder="ej: Tatys" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Usuario (sin espacios)</div>
              <input className="ps-input" placeholder="ej: tatys" value={form.usuario} onChange={e => setForm(p => ({ ...p, usuario: e.target.value.toLowerCase().replace(/\s/g,'') }))} autoComplete="off" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div className="ps-label" style={{ marginBottom: '.3rem' }}>Email del inquilino (para recordatorios)</div>
              <input className="ps-input" placeholder="ej: contacto@empresa.com" type="email" value={form.email||''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="off" />
            </div>
          </div>
          <div style={{ fontSize: '.72rem', color: '#6E6E78', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', padding: '.6rem .8rem', borderRadius: 8, marginBottom: '.85rem' }}>
            🔑 <b>Contraseñas:</b> se gestionan desde Supabase Dashboard → Authentication → Users. Esto solo registra el mapeo usuario↔local para que la app muestre los datos correctos al loguearse.
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={handleSave} className="ps-btn"><Save size={13} /> Guardar</button>
            <button onClick={() => { setShowForm(false); setEditIdx(null); }} className="ps-btn-ghost">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// (Field movido a src/components/Field.jsx)

// =================================================================
// REPORTE MENSUAL — resumen de todos los locales del mes
// =================================================================
function ReporteMensualModal({ locales, pagos, factura, monthIdx, year, config, tarifaEfectiva, calcRenta, onClose }) {
  const fmt2 = (n) => Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const C = { coral:'#F37A72', teal:'#1E7A8A', tealDark:'#155F6E', rowHead:'#F5C9C2', border:'#ddd', text:'#333', light:'#555', lbl:'#f5f5f5' };

  const rows = locales.map(l => {
    const d = pagos[l.id] || {};
    const tasaMes = d.tasaCambioCongelado || config.tasaCambio || 25;
    const precioM2 = getPrecioForMonth(config, year, monthIdx);
    const base    = l.m2 * precioM2 * tasaMes;
    const renta   = base * (1 + (config.isv||0.15));
    const luzM    = d.luzMonto || 0;
    return { l, d, renta, luzM, tasaMes };
  });

  const totRenta    = rows.reduce((s,r)=>s+(r.d.rentaPagada?r.renta:0),0);
  const totLuz      = rows.reduce((s,r)=>s+(r.d.luzPagada?r.luzM:0),0);
  const totPend     = rows.reduce((s,r)=>s+(!r.d.rentaPagada?r.renta:0),0);
  const totalFact   = factura?.montoTotal||0;
  const totalEsp    = rows.reduce((s,r)=>s+r.renta,0);

  const DLBird = () => (
    <img src={DL_LOGO} alt="D&L Soluciones" width="78" height="58" style={{display:'block'}} />
  );

  const handlePrint = () => {
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Reporte ${MESES_LARGO[monthIdx]} ${year}</title>
    <style>@page{size:Letter;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#333;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>
    </head><body>${document.getElementById('reporte-print').innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),350);
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:800,animation:'psSlide .25s cubic-bezier(0.16,1,0.3,1)'}}>
        <div className="ps-card-elevated" style={{padding:'.85rem 1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'14px 14px 0 0',borderBottom:'none'}}>
          <div>
            <div className="ps-eyebrow" style={{color:'#6366F1'}}><FileText size={11}/> REPORTE MENSUAL</div>
            <div style={{fontSize:'.88rem',fontWeight:600,marginTop:'.15rem'}}>{MESES_LARGO[monthIdx]} {year} — Todos los locales</div>
          </div>
          <div style={{display:'flex',gap:'.5rem'}}>
            <button onClick={handlePrint} className="ps-btn"><Printer size={14}/> Imprimir / PDF</button>
            <button onClick={onClose} className="ps-btn-icon"><X size={16}/></button>
          </div>
        </div>
        <div style={{background:'#d8d8d4',borderRadius:'0 0 14px 14px',border:'1px solid #2E2E38',borderTop:'none',padding:'1.25rem',maxHeight:'80vh',overflowY:'auto'}}>
          <div id="reporte-print">
            <div style={{background:'white',maxWidth:750,margin:'0 auto',fontFamily:'Arial,Helvetica,sans-serif',color:C.text,boxShadow:'0 4px 24px rgba(0,0,0,0.12)'}}>
              {/* HEADER — membrete oficial D&L */}
              <MembreteHeader />
              <div style={{textAlign:'center',padding:'14px 36px 8px'}}>
                <div style={{fontSize:'18px',fontWeight:900,letterSpacing:'5px'}}>P L A Z A &nbsp; S T E F A N Y</div>
                <div style={{fontSize:'11px',letterSpacing:'3px',color:C.light,marginTop:'3px'}}>R E P O R T E &nbsp; M E N S U A L &nbsp; D E &nbsp; C O B R A N Z A</div>
                <div style={{fontSize:'13px',fontWeight:700,color:C.teal,marginTop:'6px'}}>{MESES_LARGO[monthIdx].toUpperCase()} {year}</div>
              </div>

              {/* KPIs */}
              <div style={{padding:'10px 36px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
                {[
                  ['Total cobrado renta',`L ${fmt2(totRenta)}`,C.teal],
                  ['Total cobrado luz',`L ${fmt2(totLuz)}`,C.coral],
                  ['Pendiente de cobro',`L ${fmt2(totPend)}`,'#E67E22'],
                ].map(([lbl,val,col])=>(
                  <div key={lbl} style={{background:C.lbl,border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 14px',textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:C.light,marginBottom:'4px'}}>{lbl}</div>
                    <div style={{fontSize:'16px',fontWeight:700,color:col}}>{val}</div>
                  </div>
                ))}
              </div>
              {totalFact>0 && (
                <div style={{padding:'0 36px 8px',textAlign:'center',fontSize:'11px',color:C.light}}>
                  Factura ENEE del mes: <b style={{color:C.text}}>L {fmt2(totalFact)}</b> · Tarifa efectiva: <b style={{color:C.text}}>L {(tarifaEfectiva||0).toFixed(4)}/kWh</b>
                </div>
              )}

              {/* TABLA LOCALES */}
              <div style={{padding:'8px 36px 20px'}}>
                <div style={{fontSize:'11px',fontWeight:700,color:C.teal,letterSpacing:'2px',borderBottom:`1.5px solid ${C.teal}`,paddingBottom:'4px',marginBottom:'8px'}}>D E T A L L E &nbsp; P O R &nbsp; L O C A L</div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:C.rowHead}}>
                    {['#','Inquilino','m²','Renta','Renta','Luz','Luz'].map((h,i)=>(
                      <th key={i} style={{border:`1px solid ${C.border}`,padding:'6px 8px',fontSize:'10px',fontWeight:700,color:C.coral,textAlign:i>2?'center':'left'}}>{h}</th>
                    ))}
                  </tr>
                  <tr style={{background:'#EEE'}}>
                    {['','','','(Monto)','Estado','(Monto)','Estado'].map((h,i)=>(
                      <th key={i} style={{border:`1px solid ${C.border}`,padding:'4px 8px',fontSize:'9px',color:C.light,textAlign:i>2?'center':'left'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rows.map(({l,d,renta,luzM,tasaMes},i)=>(
                      <tr key={l.id} style={{background:i%2===0?'white':C.lbl}}>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',fontWeight:700,color:C.teal}}>{l.numero}</td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px'}}>{l.inquilino||'Sin asignar'}</td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',textAlign:'center'}}>{l.m2}</td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',textAlign:'right'}}>L {fmt2(renta)}</td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',textAlign:'center'}}>
                          <span style={{background:d.rentaPagada?'rgba(52,199,89,.15)':'rgba(255,159,10,.15)',color:d.rentaPagada?'#1A7F35':'#B25800',padding:'2px 8px',borderRadius:12,fontSize:'10px',fontWeight:600}}>{d.rentaPagada?'✓ Pagada':'Pendiente'}</span>
                        </td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',textAlign:'right'}}>{luzM>0?`L ${fmt2(luzM)}`:'—'}</td>
                        <td style={{border:`1px solid ${C.border}`,padding:'7px 8px',fontSize:'11px',textAlign:'center'}}>
                          {l.tipoLuz==='incluido'?<span style={{color:C.light,fontSize:'10px'}}>Incluida</span>
                            :<span style={{background:d.luzPagada?'rgba(52,199,89,.15)':'rgba(255,159,10,.15)',color:d.luzPagada?'#1A7F35':'#B25800',padding:'2px 8px',borderRadius:12,fontSize:'10px',fontWeight:600}}>{d.luzPagada?'✓ Pagada':'Pendiente'}</span>}
                        </td>
                      </tr>
                    ))}
                    <tr style={{background:C.tealDark}}>
                      <td colSpan={3} style={{border:`1px solid ${C.tealDark}`,padding:'8px',color:'white',fontWeight:700,fontSize:'12px'}}>TOTAL</td>
                      <td style={{border:`1px solid ${C.tealDark}`,padding:'8px',color:'white',fontWeight:700,textAlign:'right'}}>L {fmt2(totalEsp)}</td>
                      <td style={{border:`1px solid ${C.tealDark}`,padding:'8px',color:'white',textAlign:'center',fontSize:'11px'}}>Cobrado: L {fmt2(totRenta)}</td>
                      <td style={{border:`1px solid ${C.tealDark}`,padding:'8px',color:'white',fontWeight:700,textAlign:'right'}}>{totalFact>0?`L ${fmt2(totalFact)}`:'—'}</td>
                      <td style={{border:`1px solid ${C.tealDark}`,padding:'8px',color:'white',textAlign:'center',fontSize:'11px'}}>Cobrado: L {fmt2(totLuz)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* FOOTER — membrete oficial D&L */}
              <MembreteFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const tdHead = { border: '1px solid #ccc', padding: '7px 10px', fontSize: '12px', fontWeight: 700, textAlign: 'center', color: '#333' };
const tdCell = { border: '1px solid #ccc', padding: '8px 10px', fontSize: '13px', color: '#333', verticalAlign: 'middle' };
