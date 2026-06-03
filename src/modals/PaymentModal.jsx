import { useState } from 'react';
import { Circle, X, Receipt, ExternalLink, Zap, AlertCircle, Calculator, Save, Printer } from 'lucide-react';
import { fmt2, MESES_LARGO } from '../utils/format';
import { useLightbox } from '../components/Lightbox';
import { ModalPortal } from '../components/ModalPortal';

// Comprime imagen a base64 (max 1200px, calidad 0.7) para usar en recibos.
function comprimirFotoMedidor(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const max = 1200
      let w = img.width, h = img.height
      if (w > max || h > max) {
        if (w > h) { h = Math.round(h * max / w); w = max }
        else { w = Math.round(w * max / h); h = max }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = reject
    img.src = url
  })
}

export function PaymentModal({ local, monthIdx, year, data, prevData, factura, tarifaEfectiva, fijoLocal = 0, config, calcRenta, onClose, onSave, onGenerateRecibo, onGenerateReciboRenta }) {
  const lb = useLightbox();
  const [form, setForm] = useState({
    rentaPagada: !!data.rentaPagada,
    montoRentaPagado: data.montoRentaPagado ?? '',
    fechaRenta: data.fechaRenta || '',
    numFactura: data.numFactura || '',
    linkFactura: data.linkFactura || '',
    luzPagada: !!data.luzPagada,
    fechaLuz: data.fechaLuz || '',
    lecturaActual: data.lecturaActual ?? '',
    medidorReemplazado: !!data.medidorReemplazado,
    lecturaInicialReseteo: data.lecturaInicialReseteo ?? '',
    notas: data.notas || '',
    fotoMedidorAnterior: data.fotoMedidorAnterior || prevData?.fotoMedidorActual || '',
    fotoMedidorActual: data.fotoMedidorActual || '',
  });
  const [fotoLoading, setFotoLoading] = useState({ anterior: false, actual: false });

  const handleFotoChange = async (tipo, file) => {
    if (!file) return
    setFotoLoading(s => ({ ...s, [tipo]: true }))
    try {
      const b64 = await comprimirFotoMedidor(file)
      setForm(f => ({ ...f, [`fotoMedidor${tipo === 'anterior' ? 'Anterior' : 'Actual'}`]: b64 }))
    } catch (e) {
      alert('No se pudo procesar la foto. Probá con otra.')
    } finally {
      setFotoLoading(s => ({ ...s, [tipo]: false }))
    }
  };
  const tipoLuz = local.tipoLuz || 'incluido';
  const renta = calcRenta(local.m2);
  const lecturaAnterior = prevData.lecturaActual ?? local.lecturaInicial ?? null;

  const consumo = tipoLuz === 'medidor' && form.lecturaActual !== ''
    ? (form.medidorReemplazado && form.lecturaInicialReseteo !== ''
        ? Number(form.lecturaActual) - Number(form.lecturaInicialReseteo)
        : (lecturaAnterior != null ? Number(form.lecturaActual) - Number(lecturaAnterior) : null))
    : null;

  const montoEnergiaCalc = tipoLuz === 'medidor' && consumo != null && tarifaEfectiva
    ? consumo * tarifaEfectiva : 0;
  const montoLuzCalc = tipoLuz === 'medidor'
    ? montoEnergiaCalc + fijoLocal
    : (tipoLuz === 'fijo' ? (local.luzFija || 0) : 0);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });

  const handleSave = () => {
    const out = {
      rentaPagada: form.rentaPagada, fechaRenta: form.fechaRenta,
      montoRentaPagado: form.rentaPagada && form.montoRentaPagado !== '' ? Number(form.montoRentaPagado) : null,
      numFactura: form.numFactura, linkFactura: form.linkFactura, notas: form.notas,
    };
    if (tipoLuz !== 'incluido') {
      out.luzPagada = form.luzPagada;
      out.fechaLuz = form.fechaLuz;
      if (tipoLuz === 'medidor') {
        out.lecturaActual = form.lecturaActual === '' ? null : Number(form.lecturaActual);
        out.medidorReemplazado = !!form.medidorReemplazado;
        out.lecturaInicialReseteo = form.medidorReemplazado && form.lecturaInicialReseteo !== ''
          ? Number(form.lecturaInicialReseteo) : null;
        out.fotoMedidorAnterior = form.fotoMedidorAnterior || null;
        out.fotoMedidorActual = form.fotoMedidorActual || null;
      }
      out.montoLuz = montoLuzCalc;
    }
    onSave(out);
  };

  return (
    <ModalPortal onClose={onClose}>
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
            <div className="ps-eyebrow" style={{ color: '#6366F1' }}><Receipt size={11} /> RENTA</div>
            <div className="ps-mono" style={{ fontSize: '1rem', fontWeight: 600 }}>L {fmt2(renta)}</div>
          </div>
          <div style={{ background: '#E8E8ED', border: '1px solid rgba(255,255,255,0.50)', padding: '.65rem .85rem', borderRadius: 8, fontSize: '.78rem', color: '#8E8E96', marginBottom: '.85rem' }}>
            {local.m2} m² × ${config.rentPerM2USD ?? 29} × {config.tasaCambio ?? 25} + ISV {(config.isv * 100).toFixed(0)}%
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer', padding: '.4rem 0' }}>
            <input type="checkbox" className="ps-checkbox" checked={form.rentaPagada} onChange={(e) => set('rentaPagada', e.target.checked)} />
            <span style={{ fontSize: '.92rem', fontWeight: 500 }}>Renta pagada</span>
          </label>

          {form.rentaPagada && (
            <div style={{ marginTop: '.6rem' }}>
              <div style={{ marginBottom: '.6rem' }}>
                <div className="ps-label" style={{ marginBottom: '.3rem' }}>Monto pagado (L)</div>
                <input type="number" inputMode="decimal" className="ps-input ps-mono" placeholder={fmt2(renta)}
                  value={form.montoRentaPagado} onChange={(e) => set('montoRentaPagado', e.target.value)} />
                <div style={{ fontSize: '.7rem', color: '#8E8E96', marginTop: '.3rem' }}>
                  Dejalo vacío si pagaron el calculado (L {fmt2(renta)}). Anotá el monto real solo si difiere.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                <div>
                  <div className="ps-label" style={{ marginBottom: '.3rem' }}>Fecha</div>
                  <input type="date" className="ps-input" value={form.fechaRenta || todayStr()} onChange={(e) => set('fechaRenta', e.target.value)} />
                </div>
                <div>
                  <div className="ps-label" style={{ marginBottom: '.3rem' }}>N° Factura</div>
                  <input className="ps-input" placeholder="000-000-..." value={form.numFactura} onChange={(e) => set('numFactura', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '.75rem' }}>
            <div className="ps-label" style={{ marginBottom: '.3rem' }}>Enlace de factura</div>
            <input type="url" className="ps-input" placeholder="https://drive.google.com/..." value={form.linkFactura} onChange={(e) => set('linkFactura', e.target.value)} />
            {form.linkFactura && (
              <a href={form.linkFactura} target="_blank" rel="noreferrer" style={{
                fontSize: '.75rem', color: '#6366F1', textDecoration: 'none', marginTop: '.4rem',
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
              <div className="ps-eyebrow" style={{ color: '#6366F1' }}><Zap size={11} /> ENERGÍA ELÉCTRICA</div>
              <div className="ps-mono" style={{ fontSize: '1rem', fontWeight: 600, color: tarifaEfectiva || tipoLuz === 'fijo' ? '#6366F1' : '#6E6E78' }}>
                L {fmt2(montoLuzCalc)}
              </div>
            </div>

            {tipoLuz === 'medidor' && (
              <>
                {!tarifaEfectiva && (
                  <div style={{
                    background: 'rgba(255, 184, 84, 0.06)', border: '1px solid rgba(255, 184, 84, 0.25)',
                    padding: '.65rem .85rem', borderRadius: 8, marginBottom: '.85rem', fontSize: '.78rem',
                    color: '#8B5CF6', display: 'flex', alignItems: 'flex-start', gap: '.5rem',
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '.1rem' }} />
                    <div>Aún no hay factura ENEE registrada del mes. Metela primero para calcular el monto.</div>
                  </div>
                )}

                {tarifaEfectiva && (
                  <div style={{
                    background: 'rgba(99,102,241, 0.06)', border: '1px solid rgba(99,102,241, 0.2)',
                    padding: '.65rem .85rem', borderRadius: 8, marginBottom: '.85rem',
                    display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', fontSize: '.78rem',
                  }}>
                    <div style={{ color: '#8E8E96', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                      <Calculator size={12} /> Tarifa efectiva del mes:
                    </div>
                    <div className="ps-mono" style={{ color: '#6366F1', fontWeight: 600 }}>L {fmt2(tarifaEfectiva)}/kWh</div>
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
                    <div className="ps-input ps-mono" style={{ background: 'rgba(255,255,255,0.75)', color: consumo < 0 ? '#FF5C5C' : '#6366F1', fontWeight: 600 }}>
                      {consumo != null ? `${consumo} kWh` : '—'}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '.85rem', padding: '.6rem .85rem', background: 'rgba(251, 146, 60, 0.06)', border: '1px solid rgba(251, 146, 60, 0.25)', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.8rem' }}>
                    <input type="checkbox" className="ps-checkbox" checked={form.medidorReemplazado} onChange={(e) => set('medidorReemplazado', e.target.checked)} />
                    <span>🔧 Submedidor reemplazado este mes</span>
                  </label>
                  {form.medidorReemplazado && (
                    <div style={{ marginTop: '.5rem' }}>
                      <div className="ps-label" style={{ marginBottom: '.3rem', fontSize: '.7rem' }}>Lectura inicial del nuevo medidor</div>
                      <input type="number" className="ps-input ps-mono" value={form.lecturaInicialReseteo} onChange={(e) => set('lecturaInicialReseteo', e.target.value)} placeholder="0" style={{ fontSize: '.85rem' }} />
                      <div style={{ fontSize: '.7rem', color: '#8E8E96', marginTop: '.3rem' }}>
                        El consumo de este mes se calcula desde esta lectura, no desde el mes anterior.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '.85rem', padding: '.7rem .85rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
                  <div className="ps-label" style={{ marginBottom: '.5rem', fontSize: '.72rem', color: '#6366F1' }}>
                    📸 FOTOS DEL CONTADOR (opcional — van como página 2 del recibo)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                    {['anterior', 'actual'].map((tipo) => {
                      const key = tipo === 'anterior' ? 'fotoMedidorAnterior' : 'fotoMedidorActual';
                      const url = form[key];
                      const labelTxt = tipo === 'anterior' ? `Anterior (${lecturaAnterior ?? '—'})` : `Actual (${form.lecturaActual || '—'})`;
                      return (
                        <div key={tipo}>
                          <div style={{ fontSize: '.7rem', color: '#5A5A64', marginBottom: '.3rem', fontWeight: 500 }}>{labelTxt}</div>
                          {url ? (
                            <div style={{ position: 'relative' }}>
                              <img src={url} alt={`medidor ${tipo}`}
                                onClick={() => lb.open(url)}
                                style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer' }} />
                              <button onClick={(e) => { e.preventDefault(); set(key, '') }}
                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: '.7rem', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
                            </div>
                          ) : (
                            <label style={{ display: 'block', cursor: 'pointer' }}>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => handleFotoChange(tipo, e.target.files?.[0])} />
                              <div style={{ height: 90, display: 'grid', placeItems: 'center', border: '1px dashed rgba(99,102,241,0.4)', borderRadius: 6, background: 'rgba(255,255,255,0.5)', color: '#6366F1', fontSize: '.78rem', textAlign: 'center', padding: '.5rem' }}>
                                {fotoLoading[tipo] ? '⏳ Procesando...' : '📷 Tomar / Subir'}
                              </div>
                            </label>
                          )}
                        </div>
                      );
                    })}
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

        {(data.comprobanteRenta || data.comprobanteLuz) && (
          <div style={{ marginBottom: '1.25rem', background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)', borderRadius: 12, padding: '1rem' }}>
            <div className="ps-label" style={{ marginBottom: '.65rem', color: '#1A7F35' }}>✅ Comprobantes del inquilino</div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {data.comprobanteRenta && (
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
                  <img src={data.comprobanteRenta} alt="comp renta"
                    style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(52,199,89,0.4)', cursor: 'pointer' }}
                    onClick={() => lb.open(data.comprobanteRenta)} />
                  <div style={{ fontSize: '.74rem', color: '#5A5A64' }}>
                    <div style={{ fontWeight: 600, color: '#1A7F35' }}>📄 Renta</div>
                    {data.comprobanteRentaDate && <div style={{ color: '#6E6E78', marginTop: '.15rem' }}>{new Date(data.comprobanteRentaDate).toLocaleDateString('es-HN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>}
                  </div>
                </div>
              )}
              {data.comprobanteLuz && (
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
                  <img src={data.comprobanteLuz} alt="comp luz"
                    style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(14,165,233,0.4)', cursor: 'pointer' }}
                    onClick={() => lb.open(data.comprobanteLuz)} />
                  <div style={{ fontSize: '.74rem', color: '#5A5A64' }}>
                    <div style={{ fontWeight: 600, color: '#0EA5E9' }}>⚡ Luz</div>
                    {data.comprobanteLuzDate && <div style={{ color: '#6E6E78', marginTop: '.15rem' }}>{new Date(data.comprobanteLuzDate).toLocaleDateString('es-HN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={onGenerateReciboRenta} className="ps-btn-ghost" style={{ background: 'rgba(99,102,241, 0.08)', borderColor: 'rgba(99,102,241, 0.3)', color: '#6366F1' }}>
              <Printer size={14} /> Recibo de renta
            </button>
            {tipoLuz !== 'incluido' && montoLuzCalc > 0 && (
              <button onClick={onGenerateRecibo} className="ps-btn-ghost" style={{ background: 'rgba(14,165,233, 0.08)', borderColor: 'rgba(14,165,233, 0.3)', color: '#0EA5E9' }}>
                <Printer size={14} /> Recibo de luz
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={onClose} className="ps-btn-ghost">Cancelar</button>
            <button onClick={handleSave} className="ps-btn"><Save size={14} strokeWidth={2.5} /> Guardar</button>
          </div>
        </div>
      </div>
      {lb.element}
    </div>
    </ModalPortal>
  );
}
