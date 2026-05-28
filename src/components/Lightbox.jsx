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
        background:'rgba(245, 240, 230, 0.96)', // beige claro
        zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'1.5rem', cursor:'pointer',
        // Importante para mobile: usar dvh para evitar problemas con la barra del browser
        height:'100dvh', maxHeight:'100dvh',
      }}>
      <button onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Cerrar"
        style={{
          position:'fixed', top:18, right:18, width:44, height:44, borderRadius:'50%',
          border:'1px solid rgba(0,0,0,0.12)',
          background:'rgba(255,255,255,0.85)', color:'#1C1C1E',
          cursor:'pointer', fontSize:'1.6rem', fontWeight:600, fontFamily:'inherit',
          display:'grid', placeItems:'center', backdropFilter:'blur(12px)',
          boxShadow:'0 4px 16px rgba(0,0,0,0.12)', zIndex:100000,
        }}>×</button>
      <img src={src} alt="comprobante"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:'100%', maxHeight:'92vh', objectFit:'contain', borderRadius:10,
          boxShadow:'0 12px 48px rgba(0,0,0,0.18)', cursor:'default',
          background:'#fff',
        }} />
    </div>
  )

  return createPortal(overlay, document.body)
}
