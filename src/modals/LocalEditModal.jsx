import { useState } from 'react';
import { Circle, X, Activity, Wallet, Check, Save } from 'lucide-react';
import { Field } from '../components/Field';
import { ModalPortal } from '../components/ModalPortal';
import { fmt2 } from '../utils/format';

export function LocalEditModal({ locale, onClose, onSave, calcRenta, onCerrarContrato }) {
  const [f, setF] = useState({
    id: locale.id,
    numero: locale.numero || '',
    nombre: locale.nombre || '',
    inquilino: locale.inquilino || '',
    m2: locale.m2 || '',
    tipoLuz: locale.tipoLuz || 'medidor',
    lecturaInicial: locale.lecturaInicial ?? '',
    luzFija: locale.luzFija ?? '',
    contratoDesde: locale.contratoDesde || '',
    cobroDesde: locale.cobroDesde || '',
    cobroHasta: locale.cobroHasta || '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!f.m2 || Number(f.m2) <= 0) { alert('Indicá los metros cuadrados.'); return; }
    onSave({
      ...f, m2: Number(f.m2),
      lecturaInicial: f.lecturaInicial === '' ? null : Number(f.lecturaInicial),
      luzFija: f.luzFija === '' ? null : Number(f.luzFija),
      contratoDesde: f.contratoDesde || null,
      cobroDesde: f.cobroDesde || null,
      cobroHasta: f.cobroHasta || null,
    });
  };

  return (
    <ModalPortal onClose={onClose}>
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

        {f.inquilino && (
          <div style={{ marginBottom: '.85rem' }}>
            <Field label="Inicio del contrato (el inquilino verá solo desde este mes)">
              <input type="date" className="ps-input" value={f.contratoDesde} onChange={(e) => set('contratoDesde', e.target.value)} />
            </Field>
            <div style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.35rem' }}>
              Si lo dejás vacío, el inquilino ve los 12 meses del año actual (algunos vacíos). Poner una fecha esconde los meses anteriores en su vista.
            </div>
          </div>
        )}

        <div style={{ marginBottom: '.85rem' }}>
          <div className="ps-label" style={{ marginBottom: '.4rem' }}>Período de cobro</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.65rem' }}>
            <Field label="Cobrar desde (mes)">
              <input type="month" className="ps-input" value={f.cobroDesde} onChange={(e) => set('cobroDesde', e.target.value)} />
            </Field>
            <Field label="Cobrar hasta (mes)">
              <input type="month" className="ps-input" value={f.cobroHasta} onChange={(e) => set('cobroHasta', e.target.value)} />
            </Field>
          </div>
          <div style={{ fontSize: '.72rem', color: '#6E6E78', marginTop: '.35rem' }}>
            Meses en que se le cobra renta y luz a este inquilino. <b>Desde</b> vacío = usa el inicio del contrato. <b>Hasta</b> vacío = en curso (sin fin). Cuando un inquilino se va, poné su último mes en “Hasta” y se corta solo, conservando el historial.
          </div>
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
                  background: f.tipoLuz === opt.v ? 'rgba(99,102,241,0.1)' : '#E8E8ED',
                  border: '1px solid', borderColor: f.tipoLuz === opt.v ? '#6366F1' : '#2E2E38',
                  color: f.tipoLuz === opt.v ? '#6366F1' : '#B0B0BA',
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
            background: 'rgba(132, 248, 65, 0.06)', border: '1px solid rgba(99,102,241,0.2)',
            padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.85rem',
          }}>
            <span style={{ color: '#8E8E96' }}>Renta calculada (con ISV)</span>
            <span className="ps-mono" style={{ fontWeight: 600, color: '#6366F1', fontSize: '1.05rem' }}>
              L {fmt2(calcRenta(Number(f.m2)))}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'center' }}>
          {locale.id && locale.inquilino && onCerrarContrato ? (
            <button
              onClick={() => onCerrarContrato(locale.id)}
              className="ps-btn-ghost"
              style={{ color: '#FF3B30', borderColor: 'rgba(255,59,48,0.25)', fontSize: '.8rem' }}
              title="Cerrar contrato y dejar el local libre"
            >
              ⊘ Cerrar contrato
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
            <button onClick={handleSave} className="ps-btn"><Save size={14} strokeWidth={2.5} /> Guardar</button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
