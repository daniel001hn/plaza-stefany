import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Hook + componente para mostrar una imagen en grande sin depender de window.open
// (que falla en móvil con data URLs grandes). Click en el thumbnail abre lightbox.
// React Portal: se monta directo en document.body para evitar que algún parent
// con `transform` o `overflow:hidden` lo descentre o lo esconda.
//
// Uso:
//   const lb = useLightbox()
//   <img onClick={() => lb.open(url)} ... />
//   {lb.element}
export function useLightbox() {
  const [src, setSrc] = useState(null)
  return {
    open: (url) => setSrc(url),
    close: () => setSrc(null),
    element: src ? <Lightbox src={src} onClose={() => setSrc(null)} /> : null,
  }
}

export function Lightbox({ src, onClose }) {
  // Bloquear scroll del body mientras el lightbox está abierto.
  // Así no se mueve atrás y el viewport queda fijo en la imagen.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Cerrar con Escape (desktop)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const overlay = (
    <div onClick={onClose}
      style={{
        position:'fixed', top:0, left:0, right:0, bottom:0,
        background:'#FFFFFF', // blanco sólido como cards de la app
        zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'1.5rem', cursor:'pointer',
        height:'100dvh', maxHeight:'100dvh',
      }}>
      <button onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Cerrar"
        style={{
          position:'fixed', top:18, right:18, width:44, height:44, borderRadius:'50%',
          border:'1px solid rgba(0,0,0,0.10)',
          background:'rgba(245,245,250,0.95)', color:'#1C1C1E',
          cursor:'pointer', fontSize:'1.6rem', fontWeight:600, fontFamily:'inherit',
          display:'grid', placeItems:'center',
          boxShadow:'0 2px 12px rgba(0,0,0,0.08)', zIndex:100000,
        }}>×</button>
      <img src={src} alt="comprobante"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:'100%', maxHeight:'92dvh', objectFit:'contain', borderRadius:10,
          boxShadow:'0 4px 24px rgba(0,0,0,0.08)', cursor:'default',
        }} />
    </div>
  )

  return createPortal(overlay, document.body)
}
