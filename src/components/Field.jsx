// Wrapper de label + input para forms. Usado en los modales de edit.
export function Field({ label, children }) {
  return (
    <div>
      <div className="ps-label" style={{ marginBottom: '.3rem' }}>{label}</div>
      {children}
    </div>
  );
}
