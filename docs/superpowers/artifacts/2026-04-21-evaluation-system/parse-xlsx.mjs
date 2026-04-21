// Quick-and-dirty xlsx reader using regex on the unzipped XML.
// For the evaluation-system brainstorm (docs/superpowers/specs/2026-04-21-evaluation-system-brainstorm.md).
//
// How to re-run in a fresh session:
//   1. The source xlsx is archived at:
//        C:/projects/_archive/PTApp/evaluation-system/2026-04-21-EXERCISES-full-list.xlsx
//   2. Unzip it to a scratch folder, e.g.:
//        cd /tmp && rm -rf xlsx-peek && mkdir xlsx-peek && cd xlsx-peek && \
//        unzip -q "C:/projects/_archive/PTApp/evaluation-system/2026-04-21-EXERCISES-full-list.xlsx"
//   3. Point BASE below at the unzipped xl/ folder, then run: node parse-xlsx.mjs
//
// Output: one line per row, cell values as JSON strings. 345 rows x 2 cols.
import fs from 'node:fs';

const BASE = 'C:/Users/pierr/AppData/Local/Temp/xlsx-peek/xl';
const ssXml = fs.readFileSync(`${BASE}/sharedStrings.xml`, 'utf8');
const sheetXml = fs.readFileSync(`${BASE}/worksheets/sheet1.xml`, 'utf8');

// Parse shared strings — each <si> can be <t>text</t> or multiple <t> runs
const strings = [];
const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
let m;
while ((m = siRegex.exec(ssXml)) !== null) {
  const inner = m[1];
  const parts = [];
  const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let tm;
  while ((tm = tRegex.exec(inner)) !== null) {
    parts.push(tm[1]);
  }
  strings.push(parts.join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}

// Parse rows — each <row> contains <c> cells. c has r=cellref, t=type (s for sharedString), v=value
const rows = {};
const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
while ((m = rowRegex.exec(sheetXml)) !== null) {
  const attrs = m[1];
  const rNumMatch = attrs.match(/\br="(\d+)"/);
  const rowNum = rNumMatch ? parseInt(rNumMatch[1], 10) : 0;
  const rowContent = m[2];
  const cells = {};
  const cRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  let cm;
  while ((cm = cRegex.exec(rowContent)) !== null) {
    const cAttrs = cm[1];
    const refMatch = cAttrs.match(/\br="([A-Z]+)(\d+)"/);
    const typeMatch = cAttrs.match(/\bt="([^"]+)"/);
    const col = refMatch ? refMatch[1] : '?';
    const vMatch = cm[2].match(/<v>([\s\S]*?)<\/v>/);
    const isMatch = cm[2].match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
    let value = '';
    if (vMatch) {
      const raw = vMatch[1];
      if (typeMatch && typeMatch[1] === 's') {
        value = strings[parseInt(raw, 10)] || '';
      } else {
        value = raw;
      }
    } else if (isMatch) {
      value = isMatch[1];
    }
    cells[col] = value;
  }
  rows[rowNum] = cells;
}

// Find max row and max col
const rowNums = Object.keys(rows).map(Number).sort((a, b) => a - b);
const maxRow = rowNums[rowNums.length - 1];

function colToIdx(col) {
  let idx = 0;
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx;
}
function idxToCol(idx) {
  let s = '';
  while (idx > 0) {
    const r = (idx - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

let maxColIdx = 0;
for (const rn of rowNums) {
  for (const col of Object.keys(rows[rn])) {
    const idx = colToIdx(col);
    if (idx > maxColIdx) maxColIdx = idx;
  }
}

// Print as tab-separated (easier to read than CSV for wide values)
console.log(`SHEET: ${maxRow} rows x ${maxColIdx} cols`);
console.log('---');
for (let r = 1; r <= maxRow; r++) {
  const row = rows[r] || {};
  const line = [];
  for (let c = 1; c <= maxColIdx; c++) {
    const col = idxToCol(c);
    const v = row[col] || '';
    line.push(v);
  }
  console.log(`R${r}: ${line.map(v => JSON.stringify(v)).join(' | ')}`);
}
