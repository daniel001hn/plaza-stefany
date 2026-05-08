// Membrete oficial D&L SOLUCIONES — SVG vectorial inline.
// Reemplaza el PNG borroso anterior. Escala perfecto al imprimir y exportar a PDF.
// Compartido entre PlazaStefany.jsx (admin) e InquilinoView.jsx (inquilino).
//
// Colores oficiales:
//   teal     #1E7A8A  (texto, barra izquierda, footer bar)
//   coral    #F37A72  (pájaro claro, barra derecha)
//   coralDk  #E66555  (pájaro sombras)
//   coralRed #C84040  (ojo)
//   gray     #666666  (S DE R.L. y texto footer)
//   bgFoot   #F8F8F8  (fondo footer)

// SVG del pájaro origami. ViewBox 220x160. Polígonos con 2 tonos coral.
const BIRD_SVG = `<svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <polygon points="30,110 65,55 105,80 80,125" fill="#F37A72"/>
  <polygon points="65,55 105,80 85,50" fill="#E66555"/>
  <polygon points="30,110 5,145 55,130 80,125" fill="#E66555"/>
  <polygon points="65,55 85,50 110,65 105,80" fill="#F37A72"/>
  <polygon points="105,80 130,60 150,75 130,95" fill="#F37A72"/>
  <polygon points="130,60 150,75 145,55" fill="#E66555"/>
  <polygon points="150,75 170,58 175,72 158,82" fill="#F37A72"/>
  <polygon points="170,58 190,62 185,72 175,72" fill="#E66555"/>
  <polygon points="185,62 210,68 190,74" fill="#F37A72"/>
  <circle cx="180" cy="65" r="3" fill="#C84040"/>
  <polygon points="55,130 40,155 70,148 80,125" fill="#F37A72"/>
  <polygon points="40,155 70,148 55,160" fill="#E66555"/>
</svg>`;

// HEADER completo: bird + texto D&L SOLUCIONES + barra decorativa.
// Renderiza como string HTML para usar en window.open() (PDF) o dangerouslySetInnerHTML.
export const MEMBRETE_HEADER_HTML = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#fff">
  <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:24px 40px 18px">
    <div style="width:140px;height:102px;flex-shrink:0">${BIRD_SVG}</div>
    <div style="text-align:left;line-height:1">
      <div style="font-size:54px;font-weight:900;color:#1E7A8A;letter-spacing:8px;font-family:Arial,Helvetica,sans-serif">D &amp; L</div>
      <div style="font-size:26px;font-weight:700;color:#1E7A8A;letter-spacing:6px;margin-top:6px;font-family:Arial,Helvetica,sans-serif">SOLUCIONES</div>
      <div style="font-size:10px;color:#666;letter-spacing:3px;margin-top:6px;font-family:Arial,Helvetica,sans-serif">S DE R.L.</div>
    </div>
  </div>
  <div style="display:flex;height:8px;width:100%">
    <div style="width:15%;background:#1E7A8A"></div>
    <div style="width:85%;background:#F37A72"></div>
  </div>
</div>
`;

// FOOTER completo: barra teal + datos de contacto sobre fondo gris claro.
export const MEMBRETE_FOOTER_HTML = `
<div style="font-family:Arial,Helvetica,sans-serif">
  <div style="height:5px;background:#1E7A8A;width:100%"></div>
  <div style="background:#F8F8F8;padding:12px 40px;text-align:center;font-size:10.5px;color:#666;letter-spacing:.3px">
    <span style="color:#F37A72">📞</span> 9462-8618
    &nbsp;&nbsp;<span style="color:#1E7A8A">|</span>&nbsp;&nbsp;
    <span style="color:#F37A72">✉</span> soluciones_dyl@yahoo.com
    &nbsp;&nbsp;<span style="color:#1E7A8A">|</span>&nbsp;&nbsp;
    <span style="color:#F37A72">📍</span> Res. Altos de Venecia 1
    &nbsp;&nbsp;<span style="color:#1E7A8A">|</span>&nbsp;&nbsp;
    RTN: 0801-9022-372253
  </div>
</div>
`;

// Versión React JSX del header — para los modales del admin.
export function MembreteHeader() {
  return <div dangerouslySetInnerHTML={{ __html: MEMBRETE_HEADER_HTML }} />;
}

export function MembreteFooter() {
  return <div dangerouslySetInnerHTML={{ __html: MEMBRETE_FOOTER_HTML }} />;
}
