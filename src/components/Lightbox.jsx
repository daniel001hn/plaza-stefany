import { useState } from 'react';

// Hook + componente para mostrar una imagen en grande sin depender de window.open
// (que falla en móvil con data URLs grandes). Click en el thumbnail abre lightbox,
// click fuera o en X cierra.
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
  return (
    <div onClick={onClose}
      style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',
        cursor:'pointer',
      }}>
      <button onClick={(e) => { e.stopPropagation(); onClose() }}
        style={{
          position:'absolute',top:14,right:14,width:40,height:40,borderRadius:'50%',
          border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',
          cursor:'pointer',fontSize:'1.4rem',fontWeight:700,fontFamily:'inherit',
          display:'grid',placeItems:'center',backdropFilter:'blur(10px)',
        }}>×</button>
      <img src={src} alt="comprobante"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:8,
          boxShadow:'0 8px 40px rgba(0,0,0,0.5)',cursor:'default',
        }} />
    </div>
  )
}
