// scripts/generate-recibo-template.cjs
// Genera membrete-referencia/recibo-luz-template.docx a partir de DL.soluciones.membretado.docx,
// agregando los placeholders del recibo de luz en el body.
// Preserva header gráfico, footer gráfico, logo, colores y elementos visuales del membrete.
//
// Uso: node scripts/generate-recibo-template.cjs
// Requiere: npm install pizzip

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'membrete-referencia', 'DL.soluciones.membretado.docx');
const DST = path.join(ROOT, 'membrete-referencia', 'recibo-luz-template.docx');

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
// 2b) Quitar 2 de los 4 párrafos vacíos de cola para ganar espacio
// ──────────────────────────────────────────────────────────────────
['5DC1F7BB', '0B737546'].forEach(pid => {
  const re = new RegExp(`<w:p\\b[^>]*w14:paraId="${pid}"[^>]*/>`);
  if (!re.test(xml)) console.warn(`Aviso: no encontré paraId ${pid} para quitar.`);
  xml = xml.replace(re, '');
});

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

// Párrafo top-level: spacing siempre explícito (no hereda 8pt-after de Word)
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

// Celda: párrafo interno con spacing 0/0 y line cómodo
function TC({ width, shading, runs, align = 'left', mergeStart, mergeContinue }) {
  const tcPr = [];
  if (width) tcPr.push(`<w:tcW w:w="${width}" w:type="dxa"/>`);
  if (shading) tcPr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`);
  if (mergeStart) tcPr.push('<w:hMerge w:val="restart"/>');
  if (mergeContinue) tcPr.push('<w:hMerge/>');
  tcPr.push('<w:tcBorders>' +
    ['top', 'left', 'bottom', 'right'].map(e => `<w:${e} w:val="single" w:sz="4" w:color="CCCCCC"/>`).join('') +
    '</w:tcBorders>');
  tcPr.push('<w:vAlign w:val="center"/>');
  const pPrInner = `<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${align !== 'left' ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>`;
  return `<w:tc><w:tcPr>${tcPr.join('')}</w:tcPr><w:p>${pPrInner}${runs.map(R).join('')}</w:p></w:tc>`;
}

const TR = (cells) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr>`;

function TBL(rows, gridCols) {
  const totalW = gridCols.reduce((a, b) => a + b, 0);
  const tblPr =
    `<w:tblPr>` +
    `<w:tblW w:w="${totalW}" w:type="dxa"/>` +
    `<w:jc w:val="center"/>` +
    `<w:tblBorders>` +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(e => `<w:${e} w:val="single" w:sz="4" w:color="CCCCCC"/>`).join('') +
    `</w:tblBorders>` +
    // tblCellMar: padding interno de celda — cómodo para que respire
    `<w:tblCellMar>` +
      `<w:top w:w="60" w:type="dxa"/>` +
      `<w:left w:w="90" w:type="dxa"/>` +
      `<w:bottom w:w="60" w:type="dxa"/>` +
      `<w:right w:w="90" w:type="dxa"/>` +
    `</w:tblCellMar>` +
    `</w:tblPr>`;
  const tblGrid = `<w:tblGrid>${gridCols.map(c => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>`;
  return `<w:tbl>${tblPr}${tblGrid}${rows.join('')}</w:tbl>`;
}

// ──────────────────────────────────────────────────────────────────
// 4) Construir bloques (balanceados: legibles y en una sola página)
// ──────────────────────────────────────────────────────────────────

// BLOQUE 2 — Título y subtítulo
const titleXml = P({
  align: 'center',
  spaceAfter: 40,
  runs: [{ text: 'PLAZA STEFANY', bold: true, size: 17, color: '333333', spacing: '60' }],
});
const subtitleXml = P({
  align: 'center',
  spaceAfter: 160,
  runs: [{ text: 'RECIBO DE ENERGÍA ELÉCTRICA', size: 9, color: '555555', spacing: '30' }],
});

// BLOQUE 3 — Tabla de identificación (5×2)
const ID_GRID = [3000, 5500];
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

// BLOQUE 4 — Lecturas
const lectHead = P({
  spaceBefore: 180,
  spaceAfter: 40,
  bottomBorder: { sz: 12, color: '1E7A8A' },
  runs: [{ text: 'LECTURAS DEL SUBMEDIDOR', bold: true, size: 11, color: '1E7A8A', spacing: '40' }],
});
const LECT_GRID = [2833, 2833, 2834];
const lectTable = TBL(
  [
    TR([
      TC({ width: LECT_GRID[0], shading: 'F5C9C2', align: 'center', runs: [{ text: 'LECTURA ANTERIOR (kWh)', bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: LECT_GRID[1], shading: 'F5C9C2', align: 'center', runs: [{ text: 'LECTURA ACTUAL (kWh)', bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: LECT_GRID[2], shading: 'F5C9C2', align: 'center', runs: [{ text: 'CONSUMO (kWh)', bold: true, size: 9, color: 'F37A72' }] }),
    ]),
    TR([
      TC({ width: LECT_GRID[0], align: 'center', runs: [{ text: '{lecturaAnterior}', size: 11, color: '333333' }] }),
      TC({ width: LECT_GRID[1], align: 'center', runs: [{ text: '{lecturaActual}', size: 11, color: '333333' }] }),
      TC({ width: LECT_GRID[2], align: 'center', runs: [{ text: '{consumo}', bold: true, size: 11, color: '333333' }] }),
    ]),
  ],
  LECT_GRID
);

// BLOQUE 5 — Cálculo
const calcHead = P({
  spaceBefore: 180,
  spaceAfter: 40,
  bottomBorder: { sz: 12, color: '1E7A8A' },
  runs: [{ text: 'CÁLCULO DEL MONTO', bold: true, size: 11, color: '1E7A8A', spacing: '40' }],
});
const CALC_GRID = [4675, 1700, 2125];
const calcTable = TBL(
  [
    TR([
      TC({ width: CALC_GRID[0], shading: 'F5C9C2', align: 'left', runs: [{ text: 'DETALLE', bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: CALC_GRID[1], shading: 'F5C9C2', align: 'center', runs: [{ text: 'VALOR', bold: true, size: 9, color: 'F37A72' }] }),
      TC({ width: CALC_GRID[2], shading: 'F5C9C2', align: 'center', runs: [{ text: 'MONTO (L)', bold: true, size: 9, color: 'F37A72' }] }),
    ]),
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Factura ENEE estimada (plaza)', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: '{kWhPlaza} kWh', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right', runs: [{ text: '{facturaEnee}', size: 10, color: '333333' }] }),
    ]),
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Tarifa efectiva de energía', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: 'L/kWh', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right', runs: [{ text: '{tarifa}', size: 10, color: '333333' }] }),
    ]),
    TR([
      TC({ width: CALC_GRID[0], runs: [{ text: 'Energía consumida', size: 10, color: '333333' }] }),
      TC({ width: CALC_GRID[1], align: 'center', runs: [{ text: '{consumo} × {tarifa}', size: 10, color: '555555' }] }),
      TC({ width: CALC_GRID[2], align: 'right', runs: [{ text: '{montoEnergia}', size: 10, color: '333333' }] }),
    ]),
    TR([
      TC({ width: CALC_GRID[0], shading: '155F6E', mergeStart: true, runs: [{ text: 'TOTAL A PAGAR', bold: true, size: 12, color: 'FFFFFF' }] }),
      TC({ width: CALC_GRID[1], shading: '155F6E', mergeContinue: true, runs: [] }),
      TC({ width: CALC_GRID[2], shading: '155F6E', align: 'right', runs: [{ text: 'L  {total}', bold: true, size: 13, color: 'FFFFFF' }] }),
    ]),
  ],
  CALC_GRID
);

// BLOQUE 6 — Nota
const noteXml = P({
  spaceBefore: 180,
  shading: 'FFFBEA',
  leftBorder: { sz: 24, color: 'D4A800' },
  indent: 180,
  runs: [
    { text: 'Método de cálculo: ', bold: true, size: 9, color: '333333' },
    { text: 'El monto se obtiene prorrateando la factura ENEE de la plaza según el consumo real registrado en el submedidor de cada local. Este recibo no genera ISV.', size: 9, color: '555555' },
  ],
});

// ──────────────────────────────────────────────────────────────────
// 5) Ensamblar (sin spacers — gaps via space-before/after)
// ──────────────────────────────────────────────────────────────────
const newContent =
  titleXml + subtitleXml +
  idTable +
  lectHead + lectTable +
  calcHead + calcTable +
  noteXml;

xml = xml.replace(/<w:sectPr/, newContent + '<w:sectPr');

zip.file('word/document.xml', xml);
fs.writeFileSync(DST, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));

// ──────────────────────────────────────────────────────────────────
// 6) Verificación de placeholders íntegros
// ──────────────────────────────────────────────────────────────────
const PLACEHOLDERS = [
  '{reciboNum}', '{inquilino}', '{local}', '{periodo}', '{fechaEmision}',
  '{lecturaAnterior}', '{lecturaActual}', '{consumo}',
  '{kWhPlaza}', '{facturaEnee}', '{tarifa}', '{montoEnergia}', '{total}',
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
