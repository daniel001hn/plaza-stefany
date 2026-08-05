// Funciones de cálculo compartidas entre admin (PlazaStefany) e inquilino (InquilinoView).
// Antes estaban duplicadas en ambos archivos — un bug en una no se propagaba a la otra.
// Cualquier cambio acá aplica a las dos vistas automáticamente.

// ──────────────────────────────────────────────────────────────
// Precio por m² histórico (para meses pasados)
// ──────────────────────────────────────────────────────────────
export function getPrecioForMonth(config, year, monthIdx) {
  if (year != null && monthIdx != null) {
    const targetKey = `${year}-${String(monthIdx).padStart(2, '0')}`;
    const hist = (config.precioHistorial || []).filter(h => h.desde <= targetKey);
    if (hist.length > 0) {
      hist.sort((a, b) => b.desde.localeCompare(a.desde));
      return hist[0].precio;
    }
  }
  return config.rentPerM2USD || 29;
}

// ──────────────────────────────────────────────────────────────
// Consumo eléctrico de un local en un mes
// ──────────────────────────────────────────────────────────────
// Returns null si no hay lectura o si no tiene medidor.
// Maneja el caso de medidor reemplazado (resetea desde lecturaInicialReseteo).
export function calcConsumoLocal(locale, pagos, prevPagos) {
  if (!locale || (locale.tipoLuz || 'incluido') !== 'medidor') return null;
  const pago = pagos[locale.id] || {};
  const lecturaActual = pago.lecturaActual;
  if (lecturaActual == null) return null;
  if (pago.medidorReemplazado && pago.lecturaInicialReseteo != null) {
    return lecturaActual - pago.lecturaInicialReseteo;
  }
  const lecturaAnterior = prevPagos[locale.id]?.lecturaActual ?? locale.lecturaInicial;
  if (lecturaAnterior == null) return null;
  return lecturaActual - lecturaAnterior;
}

// ──────────────────────────────────────────────────────────────
// Suma de consumos de todos los submedidores
// ──────────────────────────────────────────────────────────────
export function calcTotalKwhSubmedidores(locales, pagos, prevPagos) {
  let total = 0;
  (locales || []).forEach((l) => {
    const c = calcConsumoLocal(l, pagos, prevPagos);
    if (c != null && c > 0) total += c;
  });
  return total;
}

// ──────────────────────────────────────────────────────────────
// Cargos fijos de ENEE: comerc + reg + alumbrado público
// ──────────────────────────────────────────────────────────────
// Se lee primero del snapshot en la factura (al guardar se congelan los valores
// de config para que un cambio futuro no altere recibos históricos).
export function calcCargosFijosTotal(factura, config) {
  const f = factura || {};
  const c = config || {};
  const cc = (f.cargoComercializacion ?? c.cargoComercializacion ?? 0);
  const cr = (f.cargoRegulacion ?? c.cargoRegulacion ?? 0);
  const ap = (f.alumbradoPublico ?? c.alumbradoPublico ?? 0);
  return Number(cc) + Number(cr) + Number(ap);
}

// ──────────────────────────────────────────────────────────────
// Número de locales con submedidor (excluye los de luz incluida/fija)
// ──────────────────────────────────────────────────────────────
export function calcLocalesConMedidor(locales) {
  return (locales || []).filter(l => (l.tipoLuz || 'incluido') === 'medidor').length;
}

// ──────────────────────────────────────────────────────────────
// Parte de cargos fijos que paga cada local (división en partes iguales)
// ──────────────────────────────────────────────────────────────
export function calcPerLocalFijo(factura, config, locales) {
  const n = calcLocalesConMedidor(locales);
  if (n <= 0) return 0;
  return calcCargosFijosTotal(factura, config) / n;
}

// ──────────────────────────────────────────────────────────────
// Tarifa efectiva = (montoFactura - cargosFijos) / totalKwhSubmedidores
// ──────────────────────────────────────────────────────────────
// Es la tarifa que solo aplica a la parte de energía. Los cargos fijos van
// aparte, en partes iguales por local con medidor.
// Returns null si faltan datos.
export function calcTarifaEfectiva(factura, locales, pagos, prevPagos, config) {
  const monto = Number(factura.montoTotal) || 0;
  if (monto <= 0) return null;
  const cargosFijos = calcCargosFijosTotal(factura, config);
  const energia = monto - cargosFijos;
  const totalKwh = calcTotalKwhSubmedidores(locales, pagos, prevPagos);
  if (totalKwh <= 0) return null;
  return energia / totalKwh;
}

// ──────────────────────────────────────────────────────────────
// Consumo total ENEE medido por la compañía (lectura principal de medidor)
// ──────────────────────────────────────────────────────────────
export function calcConsumoPrincipal(factura, prevFactura) {
  // Nuevo: el admin registra directo los kWh consumidos del período (11→11).
  if (factura?.consumoEdificio != null && factura.consumoEdificio !== '') {
    const c = Number(factura.consumoEdificio);
    return isNaN(c) ? null : c;
  }
  // Legacy: meses viejos guardados con lectura anterior → actual.
  const actual = Number(factura?.lecturaPrincipal);
  const anterior = Number(prevFactura?.lecturaPrincipal);
  if (!actual || isNaN(actual) || !anterior || isNaN(anterior)) return null;
  return actual - anterior;
}

// ──────────────────────────────────────────────────────────────
// Renta mensual de un local (m² × precio USD × tasa de cambio × ISV)
// ──────────────────────────────────────────────────────────────
export function calcRenta(m2, config, year, monthIdx) {
  const precio = getPrecioForMonth(config, year, monthIdx);
  const tasa = config.tasaCambio || 25;
  const isv = config.isv ?? 0.15;
  return (m2 || 0) * precio * tasa * (1 + isv);
}

// ──────────────────────────────────────────────────────────────
// Rango de cobro por inquilino
// ──────────────────────────────────────────────────────────────
// Clave "YYYY-MM" para un año + índice de mes (0 = enero).
export function mesKey(year, monthIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
}

// ¿Se le cobra renta/luz a este local en (year, monthIdx)?
// Rango [cobroDesde, cobroHasta] inclusive, ambos "YYYY-MM".
// Fallbacks retrocompatibles: si falta cobroDesde, usa el mes de contratoDesde;
// si falta cobroHasta, se cobra indefinidamente (en curso).
export function enRangoCobro(locale, year, monthIdx) {
  if (!locale) return false;
  const ym = mesKey(year, monthIdx);
  const desde = locale.cobroDesde || (locale.contratoDesde ? locale.contratoDesde.slice(0, 7) : null);
  const hasta = locale.cobroHasta || null;
  if (desde && ym < desde) return false;
  if (hasta && ym > hasta) return false;
  return true;
}
