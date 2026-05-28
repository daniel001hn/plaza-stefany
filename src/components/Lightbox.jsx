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
        // Mismo mesh gradient que el resto de la app (admin + inquilino)
        background: `
          radial-gradient(ellipse 80% 60% at 10% 0%,   rgba(99, 102, 241, 0.35) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 90% 5%,   rgba(236, 72, 153, 0.25) 0%, transparent 50%),
          radial-gradient(ellipse 50% 60% at 70% 85%,  rgba(20, 184, 166, 0.20) 0%, transparent 55%),
          radial-gradient(ellipse 70% 50% at 5%  85%,  rgba(251, 146, 60, 0.18) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 50% 50%,  rgba(168, 85, 247, 0.12) 0%, transparent 60%),
          #EEF0F8
        `,
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        zIndex:99999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'1.5rem', cursor:'pointer',
        height:'100dvh', maxHeight:'100dvh',
      }}>
      <button onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Cerrar"
        style={{
          position:'fixed', top:18, right:18, width:44, height:44, borderRadius:'50%',
          border:'1px solid rgba(255,255,255,0.65)',
          background:'rgba(255,255,255,0.55)', color:'#1C1C1E',
          cursor:'pointer', fontSize:'1.6rem', fontWeight:600, fontFamily:'inherit',
          display:'grid', placeItems:'center',
          backdropFilter:'blur(24px) saturate(180%)', WebkitBackdropFilter:'blur(24px) saturate(180%)',
          boxShadow:'0 4px 16px rgba(0,0,0,0.10)', zIndex:100000,
        }}>×</button>
      <img src={src} alt="comprobante"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:'100%', maxHeight:'92dvh', objectFit:'contain', borderRadius:14,
          boxShadow:'0 16px 56px rgba(0,0,0,0.22)', cursor:'default',
          background:'#fff',
        }} />
    </div>
  )

  return createPortal(overlay, document.body)
}
