import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Wrapper que renderiza children DIRECTO en document.body via React Portal.
// Esto resuelve el bug en mobile donde los modales aparecen en una posición
// rara (top de la página, requiriendo scroll para verlos) cuando algún parent
// tiene `overflow:hidden` o `transform` (común en cards/glass containers).
//
// También bloquea scroll del body y cierra con Escape (UX standard).
//
// Uso:
//   <ModalPortal onClose={onClose}>
//     <div className="ps-modal-backdrop" onClick={onClose}>...</div>
//   </ModalPortal>
export function ModalPortal({ children, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(children, document.body);
}
