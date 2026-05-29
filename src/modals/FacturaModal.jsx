import { useState } from 'react';
import { X, Zap, Info, Save } from 'lucide-react';
import { calcTotalKwhSubmedidores } from '../calculos';
import { MESES_LARGO } from '../utils/format';
import { ModalPortal } from '../components/ModalPortal';

export function FacturaModal({ factura, prevFactura, monthIdx, year, config, locales, pagos, prevPagos, onClose, onSave }) {
  // Default período ENEE: día 11 del mes anterior → día 11 del mes actual
  const pad = (n) => String(n).padStart(2, '0');
  const defPeriodoDesde = `${monthIdx === 0 ? year - 1 : year}-${pad(monthIdx === 0 ? 12 : monthIdx)}-11`;
  const defPeriodoHasta = `${year}-${pad(monthIdx + 1)}-11`;
  const [form, setForm] = useState({
    montoTotal: factura.montoTotal ?? '',
    consumoEdificio: factura.consumoEdificio ?? '',
    fechaEmision: factura.fechaEmision || '',
    fechaPago: factura.fechaPago || '',
    pagada: !!factura.pagada,
    notas: factura.notas || '',
    cargoComercializacion: factura.cargoComercializacion ?? config?.cargoComercializacion ?? 60,
    cargoRegulacion: factura.cargoRegulacion ?? config?.cargoRegulacion ?? 30,
    alumbradoPublico: factura.alumbradoPublico ?? config?.alumbradoPublico ?? 130,
    periodoDesde: factura.periodoDesde || defPeriodoDesde,
    periodoHasta: factura.periodoHasta || defPeriodoHasta,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const consumo = form.consumoEdificio !== '' && !isNaN(Number(form.consumoEdificio))
    ? Number(form.consumoEdificio) : null;
  const cargosFijosTotal = (Number(form.cargoComercializacion) || 0) + (Number(form.cargoRegulacion) || 0) + (Number(form.alumbradoPublico) || 0);
  const sumSubmedidores = calcTotalKwhSubmedidores(locales || [], pagos || {}, prevPagos || {});
  const diff = (consumo != null) ? consumo - sumSubmedidores : null;
  const cargosCompletos = form.cargoComercializacion !== '' && form.cargoRegulacion !== '' && form.alumbradoPublico !== '';
  const facturaCompleta = cargosCompletos && form.montoTotal !== '' && Number(form.montoTotal) > 0;

  const handleSave = () => {
    if (!cargosCompletos) return;
    onSave({
      montoTotal: form.montoTotal === '' ? 0 : Number(form.montoTotal),
      consumoEdificio: form.consumoEdificio === '' ? null : Number(form.consumoEdificio),
      lecturaPrincipal: null,
      fechaEmision: form.fechaEmision,
      fechaPago: form.fechaPago,
      pagada: form.pagada,
      notas: form.notas,
      cargoComercializacion: Number(form.cargoComercializacion) || 0,
      cargoRegulacion: Number(form.cargoRegulacion) || 0,
      alumbradoPublico: Number(form.alumbradoPublico) || 0,
      periodoDesde: form.periodoDesde || null,
      periodoHasta: form.periodoHasta || null,
    });
  };

  return (
    <ModalPortal onClose={onClose}>
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal ps-card-elevated" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="ps-eyebrow" style={{ color: '#6366F1', marginBottom: '.25rem' }}>
              <Zap size={11} /> FACTURA ENEE · {MESES_LARGO[monthIdx]} {year}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>Energía del mes</div>
          </div>
          <button onClick={onClose} className="ps-btn-icon"><X size={16} /></button>
        </div>

        <div className="ps-divider-soft" style={{ marginBottom: '1.25rem' }} />

        <div style={{
          background: 'rgba(99,102,241, 0.06)', border: '1px solid rgba(99,102,241, 0.2)',
          padding: '.7rem .9rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '.78rem',
          color: '#8E8E96', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
        }}>
          <Info size={14} color="#5AC8FA" style={{ flexShrink: 0, marginTop: '.1rem' }} />
          <div>
            Metés el <strong style={{ color: '#1C1C1E' }}>monto total</strong> que ENEE te cobró y la <strong style={{ color: '#1C1C1E' }}>lectura del medidor principal</strong>. Con eso la app calcula sola la tarifa efectiva del mes y reparte entre los locales.
          </div>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.3rem' }}>Período real de ENEE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <div>
              <div style={{ fontSize: '.68rem', color: '#8E8E96', marginBottom: '.2rem' }}>Desde</div>
              <input type="date" className="ps-input" value={form.periodoDesde} onChange={(e) => set('periodoDesde', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: '.68rem', color: '#8E8E96', marginBottom: '.2rem' }}>Hasta</div>
              <input type="date" className="ps-input" value={form.periodoHasta} onChange={(e) => set('periodoHasta', e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: '.7rem', color: '#6E6E78', marginTop: '.3rem' }}>
            Solo informativo (qué período te factura ENEE). No afecta el cálculo de los inquilinos.
          </div>
        </div>

        <div style={{ marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.3rem' }}>Monto total a pagar (L)</div>
          <input type="number" step="0.01" className="ps-input ps-mono" value={form.montoTotal}
            onChange={(e) => set('montoTotal', e.target.value)} placeholder="11602.05" />
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '.9rem', marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>
            Consumo del edificio en el período (kWh, del 11 al 11)
          </div>
          <input type="number" className="ps-input ps-mono" value={form.consumoEdificio}
            onChange={(e) => set('consumoEdificio', e.target.value)} placeholder="kWh consumidos (ej. 2450)" />
          <div style={{ fontSize: '.7rem', color: '#6E6E78', marginTop: '.3rem' }}>
            Los kWh totales que te facturó ENEE en el período. Solo para auditoría — se compara con la suma de los submedidores de los locales para ver el consumo de áreas comunes.
          </div>
          {consumo != null && sumSubmedidores > 0 && (
            <div style={{
              marginTop: '.5rem', padding: '.55rem .8rem', borderRadius: 8, fontSize: '.74rem',
              background: Math.abs(diff) < 50 ? 'rgba(52,199,89,0.10)' : 'rgba(255,193,7,0.10)',
              border: '1px solid ' + (Math.abs(diff) < 50 ? 'rgba(52,199,89,0.35)' : 'rgba(255,193,7,0.35)'),
              color: Math.abs(diff) < 50 ? '#1A7F35' : '#8B5A00',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consumo edificio (medidor principal):</span><b className="ps-mono">{consumo} kWh</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Suma de submedidores de locales:</span><b className="ps-mono">{sumSubmedidores} kWh</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid currentColor', paddingTop: '.25rem', marginTop: '.25rem', opacity: .85 }}>
                <span>Áreas comunes / no medido:</span><b className="ps-mono">{diff} kWh</b>
              </div>
              {Math.abs(diff) >= 50 && (
                <div style={{ marginTop: '.3rem', fontSize: '.7rem' }}>⚠️ Diferencia alta. Revisá lecturas de submedidores o si hay consumo no medido (pasillos, bomba, etc.)</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginBottom: '.85rem' }}>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha de emisión</div>
            <input type="date" className="ps-input" value={form.fechaEmision} onChange={(e) => set('fechaEmision', e.target.value)} />
          </div>
          <div>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha límite de pago</div>
            <input type="date" className="ps-input" value={form.fechaPago} onChange={(e) => set('fechaPago', e.target.value)} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '.9rem', marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cargos fijos de esta factura (se dividen en partes iguales entre los locales)</span>
            <span style={{ color: '#6366F1', fontWeight: 700 }}>Total: L {cargosFijosTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.5rem' }}>
            <div>
              <div style={{ fontSize: '.68rem', color: '#8E8E96', marginBottom: '.2rem' }}>Comercialización</div>
              <input type="number" step="0.01" className="ps-input ps-mono" value={form.cargoComercializacion}
                onChange={(e) => set('cargoComercializacion', e.target.value)} placeholder="60" />
            </div>
            <div>
              <div style={{ fontSize: '.68rem', color: '#8E8E96', marginBottom: '.2rem' }}>Regulación</div>
              <input type="number" step="0.01" className="ps-input ps-mono" value={form.cargoRegulacion}
                onChange={(e) => set('cargoRegulacion', e.target.value)} placeholder="30" />
            </div>
            <div>
              <div style={{ fontSize: '.68rem', color: '#8E8E96', marginBottom: '.2rem' }}>Alumbrado público</div>
              <input type="number" step="0.01" className="ps-input ps-mono" value={form.alumbradoPublico}
                onChange={(e) => set('alumbradoPublico', e.target.value)} placeholder="130" />
            </div>
          </div>
          <div style={{ fontSize: '.7rem', color: '#8E8E96', marginTop: '.35rem' }}>
            Confirmá estos valores con tu factura ENEE del mes — se quedan congelados acá y los recibos los usan tal cual.
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

        {!cargosCompletos && (
          <div style={{ background: 'rgba(255,193,7,0.10)', border: '1px solid rgba(255,193,7,0.35)', padding: '.55rem .8rem', borderRadius: 8, marginBottom: '.7rem', fontSize: '.75rem', color: '#8B5A00' }}>
            ⚠️ Necesitás los 3 cargos fijos para guardar.
          </div>
        )}
        {cargosCompletos && !facturaCompleta && (
          <div style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.30)', padding: '.55rem .8rem', borderRadius: 8, marginBottom: '.7rem', fontSize: '.75rem', color: '#004B99' }}>
            <b>📝 Factura parcial.</b> Vas a guardar solo los cargos fijos. Los recibos <b>no se emiten</b> hasta que metas el monto total ENEE (el día 1 del próximo mes cuando llegue la factura).
          </div>
        )}
        {facturaCompleta && (
          <div style={{ background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.35)', padding: '.55rem .8rem', borderRadius: 8, marginBottom: '.7rem', fontSize: '.75rem', color: '#1A7F35' }}>
            ✅ Factura completa. Al guardar, los recibos quedan disponibles.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem' }}>
          <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
          <button onClick={handleSave} className="ps-btn" disabled={!cargosCompletos}><Save size={14} strokeWidth={2.5} /> Guardar</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
