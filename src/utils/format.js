// Formateadores compartidos. Antes estaban definidos múltiples veces a lo
// largo de PlazaStefany.jsx. Centralizados acá para consistencia.

export const fmt = (n) =>
  new Intl.NumberFormat('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const fmt2 = (n) =>
  new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const fechaCorta = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
