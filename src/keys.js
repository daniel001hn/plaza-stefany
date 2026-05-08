// Claves de storage compartidas entre admin (PlazaStefany.jsx) e inquilino (InquilinoView.jsx).
// IMPORTANTE: ambos archivos DEBEN usar este helper para evitar desincronización.
// Formato: pagos:YYYY-MM donde MM es el mes natural (1-12), no el monthIdx (0-11).

export const monthKey = (year, monthIdx) =>
  `pagos:${year}-${String(monthIdx + 1).padStart(2, '0')}`;
