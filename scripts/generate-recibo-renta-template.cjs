// scripts/generate-recibo-renta-template.cjs
// Genera membrete-referencia/recibo-renta-template.docx a partir de DL.soluciones.membretado.docx,
// agregando los placeholders del recibo de renta en el body.
// Preserva header gráfico, footer gráfico, logo, colores y elementos visuales del membrete.
//
// Uso: node scripts/generate-recibo-renta-template.cjs
// Requiere: npm install pizzip

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'membrete-referencia', 'DL.soluciones.membretado.docx');
const DST = path.join(ROOT, 'membrete-referencia', 'recibo-renta-template.docx');
const PUBLIC_DST = path.join(ROOT, 'public', 'templates', 'recibo-renta-template.docx');

// ──────────────────────────────────────────────────────────────────
// 1) Copiar source → dest
// ──────────────────────────────────────────────────────────────────
fs.copyFileSync(SRC, DST);

const zip = new PizZip(fs.readFileSync(DST));
let xml = zip.file('word/document.xml').asText();

// ──────────────────────────────────────────────────────────────────
// 2) Eliminar el párrafo literal "D & L SOLUCIONES S DE R.L."
// ──────────────────────────────────────────────────────────────────
const dlParaRe = /<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?D &amp; L SOLUCIONES[\s\S]*?<\/w:p>/;
if (!dlParaRe.test(xml)) throw new Error('No encontré el párrafo "D & L SOLUCIONES" para remover.');
xml = xml.replace(dlParaRe, '');

// ──────────────────────────────────────────────────────────────────
// 2b) Quitar TODOS los párrafos vacíos self-closing (eliminan gap del top)
// ──────────────────────────────────────────────────────────────────
const emptyParaRe = /<w:p\b[^>]*\/>/g;
const removedCount = (xml.match(emptyParaRe) || []).length;
xml = xml.replace(emptyParaRe, '');
console.log(`Removidos ${removedCount} párrafos vacíos self-closing.`);

// ──────────────────────────────────────────────────────────────────
// 2c) Cropear el EMF de fondo: mantener solo el HEADER (top ~13.5%),
//     descartar el footer gráfico (que tenía el teléfono viejo 8518).
//     El footer real va a venir como <w:ftr> con texto editable.
// ──────────────────────────────────────────────────────────────────
const CROP_KEEP_PCT = 13.5;            // % del top a mantener
const ORIG_CY = 9872303;               // EMU original
const NEW_CY = Math.round(ORIG_CY * CROP_KEEP_PCT / 100);  // ~1332761
const CROP_BOTTOM = Math.round((100 - CROP_KEEP_PCT) * 1000); // 86500
const SRC_RECT = `<a:srcRect t="0" b="${CROP_BOTTOM}" l="0" r="0"/>`;

// Reemplazar cy en wp:extent y a:ext (las dos ocurrencias)
const cyBefore = (xml.match(new RegExp(`cy="${ORIG_CY}"`, 'g')) || []).length;
if (cyBefore !== 2) throw new Error(`Esperaba 2 ocurrencias de cy="${ORIG_CY}", encontré ${cyBefore}.`);
xml = xml.replace(new RegExp(`cy="${ORIG_CY}"`, 'g'), `cy="${NEW_CY}"`);

// Insertar srcRect dentro de <pic:blipFill> entre </a:blip> y <a:stretch>
if (!xml.includes('<a:srcRect')) {
  xml = xml.replace(/(<\/a:blip>)(<a:stretch>)/, `$1${SRC_RECT}$2`);
}
console.log(`Imagen cropeada: cy ${ORIG_CY} → ${NEW_CY} EMU, srcRect bottom ${CROP_BOTTOM/1000}%.`);

// ──────────────────────────────────────────────────────────────────
// 3) Helpers WordprocessingML
// ──────────────────────────────────────────────────────────────────
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function R({ text, bold, size, color, font = 'Arial', spacing }) {
  const rPr = [];
  rPr.push(`<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`);
  if (bold) rPr.push('<w:b/>');
  if (size) rPr.push(`<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>`);
  if (color) rPr.push(`<w:color w:val="${color}"/>`);
  if (spacing) rPr.push(`<w:spacing w:val="${spacing}"/>`);
  return `<w:r><w:rPr>${rPr.join('')}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function P({ align, runs, shading, leftBorder, bottomBorder, indent, spaceBefore = 0, spaceAfter = 0 }) {
  const pPr = [];
  pPr.push(`<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="240" w:lineRule="auto"/>`);
  if (align) pPr.push(`<w:jc w:val="${align}"/>`);
  if (shading) pPr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`);
  if (indent) pPr.push(`<w:ind w:left="${indent}"/>`);
  const borders = [];
  if (leftBorder) borders.push(`<w:left w:val="single" w:sz="${leftBorder.sz}" w:space="6" w:color="${leftBorder.color}"/>`);
  if (bottomBorder) borders.push(`<w:bottom w:val="single" w:sz="${bottomBorder.sz}" w:space="2" w:color="${bottomBorder.color}"/>`);
  if (borders.length) pPr.push(`<w:pBdr>${borders.join('')}</w:pBdr>`);
  return `<w:p><w:pPr>${pPr.join('')}</w:pPr>${runs.map(R).join('')}</w:p>`;
}

function TC({ width, shading, runs, align = 'left', mergeStart, mergeContinue, borders = 'default' }) {
  const tcPr = [];
  if (width) tcPr.push(`<w:tcW w:w="${width}" w:type="dxa"/>`);
  if (shading) tcPr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`);
  if (mergeStart) tcPr.push('<w:hMerge w:val="restart"/>');
  if (mergeContinue) tcPr.push('<w:hMerge/>');
  if (borders === 'default') {
    tcPr.push('<w:tcBorders>' +
      ['top', 'left', 'bottom', 'right'].map(e => `<w:${e} w:val="single" w:sz="4" w:color="CCCCCC"/>`).join('') +
      '</w:tcBorders>');
  } else if (borders === 'none') {
    tcPr.push('<w:tcBorders>' +
      ['top', 'left', 'bottom', 'right'].map(e => `<w:${e} w:val="nil"/>`).join('') +
      '</w:tcBorders>');
  }
  tcPr.push('<w:vAlign w:val="center"/>');
  const pPrInner = `<w:pPr><w:spacing w:before="0" w:after="0" w:line="220" w:lineRule="auto"/>${align !== 'left' ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>`;
  return `<w:tc><w:tcPr>${tcPr.join('')}</w:tcPr><w:p>${pPrInner}${runs.map(R).join('')}</w:p></w:tc>`;
}

const TR = (cells) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr>`;

function TBL(rows, gridCols, { bordered = true, cellPadV = 140 } = {}) {
  const totalW = gridCols.reduce((a, b) => a + b, 0);
  const bordersXml = bordered
    ? ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(e => `<w:${e} w:val="single" w:sz="4" w:color="CCCCCC"/>`).join('')
    : ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(e => `<w:${e} w:val="nil"/>`).join('');
  const tblPr =
    `<w:tblPr>` +
    `<w:tblW w:w="${totalW}" w:type="dxa"/>` +
    `<w:jc w:val="center"/>` +
    `<w:tblBorders>${bordersXml}</w:tblBorders>` +
    `<w:tblCellMar>` +
      `<w:top w:w="${cellPadV}" w:type="dxa"/>` +
      `<w:left w:w="80" w:type="dxa"/>` +
      `<w:bottom w:w="${cellPadV}" w:type="dxa"/>` +
      `<w:right w:w="80" w:type="dxa"/>` +
    `</w:tblCellMar>` +
    `</w:tblPr>`;
  const tblGrid = `<w:tblGrid>${gridCols.map(c => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`;
  return `<w:tbl>${tblPr}${tblGrid}${rows.join('')}</w:tbl>`;
}

// ──────────────────────────────────────────────────────────────────
// 4) Construir bloques
// ──────────────────────────────────────────────────────────────────

const titleXml = P({
  align: 'center',
  spaceBefore: 110,
  spaceAfter: 40,
  runs: [{ text: 'PLAZA STEFANY', bold: true, size: 20, color: '333333', spacing: '60' }],
});
const subtitleXml = P({
  align: 'center',
  spaceAfter: 220,
  runs: [{ text: 'RECIBO DE RENTA', size: 11, color: '555555', spacing: '30' }],
});

// Tabla de identificación (ratio ~27/73 escalado a 8800)
const ID_GRID = [2400, 6400];
const idTable = TBL(
  [
    ['Recibo N°', '{reciboNum}'],
    ['Inquilino', '{inquilino}'],
    ['Local', '{local}'],
    ['Período', '{periodo}'],
    ['Fecha de emisión', '{fechaEmision}'],
  ].map(([label, value]) => TR([
    TC({ width: ID_GRID[0], shading: 'F0F0F0', runs: [{ text: label, size: 10, color: '555555' }] }),
    TC({ width: ID_GRID[1], runs: [{ text: value, size: 11, color: '333333' }] }),
  ])),
  ID_GRID
);

// Sección DETALLE DE RENTA
const calcHead = P({
  spaceBefore: 240,
  spaceAfter: 70,
  bottomBorder: { sz: 12, color: '1E7A8A' },
  runs: [{ text: 'DETALLE DE RENTA', bold: true, size: 11, color: '1E7A8A', spacing: '40' }],
});

// Tabla de cálculo (escalada [4675,1700,2125]*1.0353 → ~8800)
const CALC_GRID = [4840, 1760, 2200];
const calcTable = TBL(
  [
    // Header
    TR([
      TC({ width: CALC_GRID[0], shading: 'F5C9C2', align: 'left',   runs: [{ text: 'DETALLE',   bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: CALC_GRID[1], shading: 'F5C9C2', align: 'center', runs: [{ text: 'VALOR',     bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: CALC_GRID[2], shading: 'F5C9C2', align: 'center', runs: [{ text: 'MONTO (L)', bold: true, size: 9, color: 'F37A72' }] }),
    ]),
    // Área arrendada
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Área arrendada', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: '{m2} m²', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right',  runs: [{ text: '—', size: 10, color: '999999' }] }),
    ]),
    // Precio por m²
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Precio por m²', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: '$ {precioUSD} / m²', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right',  runs: [{ text: '—', size: 10, color: '999999' }] }),
    ]),
    // Tipo de cambio
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Tipo de cambio BCH (venta)', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: 'L {tasa} / US$', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right',  runs: [{ text: '—', size: 10, color: '999999' }] }),
    ]),
    // Base de cálculo
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Base ({m2} × ${precioUSD} × {tasa})', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: '', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right',  runs: [{ text: '{rentaBase}', size: 10, color: '333333' }] }),
    ]),
    // ISV
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'ISV ({isvPct}%)', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: 'L {rentaBase} × {isvPct}%', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right',  runs: [{ text: '{isvMonto}', size: 10, color: '333333' }] }),
    ]),
    // TOTAL
    TR([
      TC({ width: CALC_GRID[0], shading: '155F6E', mergeStart: true,    runs: [{ text: 'TOTAL A PAGAR', bold: true, size: 13, color: 'FFFFFF' }] }),
      TC({ width: CALC_GRID[1], shading: '155F6E', mergeContinue: true, runs: [] }),
      TC({ width: CALC_GRID[2], shading: '155F6E', align: 'right',      runs: [{ text: 'L  {rentaTotal}', bold: true, size: 13, color: 'FFFFFF' }] }),
    ]),
  ],
  CALC_GRID
);

// Nota
const noteXml = P({
  spaceBefore: 220,
  shading: 'FFFBEA',
  leftBorder: { sz: 24, color: 'D4A800' },
  indent: 180,
  runs: [
    { text: 'Método de cálculo: ', bold: true, size: 10, color: '333333' },
    { text: 'Renta mensual calculada sobre {m2} m² al precio pactado de US${precioUSD}/m², convertido al tipo de cambio BCH (venta) vigente de L {tasa}/US$. ISV ({isvPct}%) incluido en el total.', size: 10, color: '555555' },
  ],
});

// ──────────────────────────────────────────────────────────────────
// 5) Ensamblar
// ──────────────────────────────────────────────────────────────────
const newContent =
  titleXml + subtitleXml +
  idTable +
  calcHead + calcTable +
  noteXml;

xml = xml.replace(/<w:sectPr/, newContent + '<w:sectPr');

// ──────────────────────────────────────────────────────────────────
// 5b) Footer real (<w:ftr>) con datos editables — reemplaza el footer
//     gráfico que cropeamos. Datos correctos según [[reference-membrete-dyl]].
// ──────────────────────────────────────────────────────────────────
const FOOTER_REL_ID = 'rId100';
const FOOTER_FILL = '155F6E'; // azul DyL oscuro — mismo del TOTAL A PAGAR (sólido, sin gradiente)
const FOOTER_TEXT_COLOR = 'FFFFFF'; // blanco

// Tabla de 1 celda, 12240 dxa de ancho (página completa) con tblInd -1701 (pulla
// al borde izquierdo de página). Sin bordes — el color hace el contraste.
const footerCellBordersNil = ['top','left','bottom','right'].map(e => `<w:${e} w:val="nil"/>`).join('');
const footerTblBordersNil = ['top','left','bottom','right','insideH','insideV'].map(e => `<w:${e} w:val="nil"/>`).join('');

const footerTable =
  `<w:tbl>` +
    `<w:tblPr>` +
      `<w:tblW w:w="12240" w:type="dxa"/>` +
      `<w:tblInd w:w="-1701" w:type="dxa"/>` +
      `<w:tblBorders>${footerTblBordersNil}</w:tblBorders>` +
      `<w:tblCellMar>` +
        `<w:top w:w="100" w:type="dxa"/>` +
        `<w:left w:w="200" w:type="dxa"/>` +
        `<w:bottom w:w="100" w:type="dxa"/>` +
        `<w:right w:w="200" w:type="dxa"/>` +
      `</w:tblCellMar>` +
    `</w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="12240"/></w:tblGrid>` +
    `<w:tr><w:trPr><w:cantSplit/></w:trPr>` +
      `<w:tc>` +
        `<w:tcPr>` +
          `<w:tcW w:w="12240" w:type="dxa"/>` +
          `<w:shd w:val="clear" w:color="auto" w:fill="${FOOTER_FILL}"/>` +
          `<w:tcBorders>${footerCellBordersNil}</w:tcBorders>` +
          `<w:vAlign w:val="center"/>` +
        `</w:tcPr>` +
        `<w:p>` +
          `<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>` +
          R({ text: '☎ +504 9462-8618   |   ✉ soluciones_dyl@yahoo.com   |   ⌂ Res. Altos de Venecia 1   |   RTN: 0801-9022-372253', bold: true, size: 9, color: FOOTER_TEXT_COLOR }) +
        `</w:p>` +
      `</w:tc>` +
    `</w:tr>` +
  `</w:tbl>`;

const FOOTER_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
       `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    footerTable +
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>` + // cierre obligatorio (footers no pueden terminar en tabla)
  `</w:ftr>`;

zip.file('word/footer1.xml', FOOTER_XML);

// Referencia en sectPr
xml = xml.replace(
  /<w:sectPr([^>]*)>/,
  `<w:sectPr$1><w:footerReference w:type="default" r:id="${FOOTER_REL_ID}"/>`
);
// Asegurar namespace r: si falta en la raíz
if (!xml.includes('xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')) {
  // El namespace ya debería estar en el root de document.xml; si no, agregarlo
  xml = xml.replace(
    /<w:document\s+/,
    `<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" `
  );
}

// [Content_Types].xml — agregar Override para footer1.xml
let ctXml = zip.file('[Content_Types].xml').asText();
if (!ctXml.includes('footer1.xml')) {
  ctXml = ctXml.replace(
    /<\/Types>/,
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`
  );
  zip.file('[Content_Types].xml', ctXml);
}

// word/_rels/document.xml.rels — agregar relación al footer
let relsXml = zip.file('word/_rels/document.xml.rels').asText();
if (!relsXml.includes('footer1.xml')) {
  relsXml = relsXml.replace(
    /<\/Relationships>/,
    `<Relationship Id="${FOOTER_REL_ID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`
  );
  zip.file('word/_rels/document.xml.rels', relsXml);
}

zip.file('word/document.xml', xml);
const docxBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(DST, docxBuffer);
// Copia para Vite — public/templates/ se sirve en root del dev/prod
fs.mkdirSync(path.dirname(PUBLIC_DST), { recursive: true });
fs.writeFileSync(PUBLIC_DST, docxBuffer);
console.log('Copia para Vite:', PUBLIC_DST);

// ──────────────────────────────────────────────────────────────────
// 6) Verificación de placeholders íntegros
// ──────────────────────────────────────────────────────────────────
const PLACEHOLDERS = [
  '{reciboNum}', '{inquilino}', '{local}', '{periodo}', '{fechaEmision}',
  '{m2}', '{precioUSD}', '{tasa}', '{isvPct}',
  '{rentaBase}', '{isvMonto}', '{rentaTotal}',
];

const verifyXml = new PizZip(fs.readFileSync(DST)).file('word/document.xml').asText();
const flatText = verifyXml.replace(/<[^>]+>/g, '');

console.log('\n=== VERIFICACIÓN DE PLACEHOLDERS ===');
const issues = [];
for (const ph of PLACEHOLDERS) {
  const intactRe = new RegExp(`<w:t[^>]*>[^<]*${escapeRe(ph)}[^<]*</w:t>`, 'g');
  const intactMatches = (verifyXml.match(intactRe) || []).length;
  const flatOccurrences = (flatText.match(new RegExp(escapeRe(ph), 'g')) || []).length;
  let status;
  if (intactMatches > 0 && intactMatches === flatOccurrences) {
    status = `OK (${intactMatches} ocurrencia${intactMatches > 1 ? 's' : ''} íntegra${intactMatches > 1 ? 's' : ''})`;
  } else if (flatOccurrences === 0) {
    status = 'NO ENCONTRADO';
    issues.push(ph);
  } else {
    status = `FRAGMENTADO (${flatOccurrences - intactMatches} de ${flatOccurrences} ocurrencias rotas)`;
    issues.push(ph);
  }
  console.log(`  ${ph.padEnd(20)} → ${status}`);
}

const stats = fs.statSync(DST);
console.log('\nArchivo generado:', DST);
console.log('Tamaño:', stats.size, 'bytes');
if (issues.length === 0) console.log('Resultado: TODOS LOS PLACEHOLDERS OK ✓');
else { console.log('ISSUES:', issues); process.exit(1); }
