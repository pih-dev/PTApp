// Generates the "as implemented" 1RM standards workbook the PT validates — one sheet
// per lift, thresholds are 1RM-to-BODYWEIGHT ratios. Same precedent as the v2.11
// PT-Norms-As-Implemented.xlsx (build-norms-review-xlsx.mjs).
// Re-run whenever the three 1rm tables in normCharts.js change (then bump
// CHARTS_VERSION and re-send to the PT).
// Run from repo root: node docs/superpowers/artifacts/2026-07-06-1rm-battery/build-1rm-standards-xlsx.mjs
import ExcelJS from 'exceljs';
const chartsUrl = new URL('../../../../src/normCharts.js', import.meta.url).href;
const { CHARTS, CHARTS_VERSION } = await import(chartsUrl);

const LIFTS = {
  bench1rm: 'Bench Press',
  squat1rm: 'Squat',
  deadlift1rm: 'Deadlift',
};
const LEVELS = ['Weak (1)', 'Below Avg (2)', 'Average (3)', 'Good (4)', 'Excellent (5)'];

const wb = new ExcelJS.Workbook();
const readme = wb.addWorksheet('Read Me');
const readmeLines = [
  `1RM standards as implemented in the app (charts version ${CHARTS_VERSION}) — generated ${new Date().toISOString().slice(0, 10)}`,
  '',
  'HOW TO READ: every number is a RATIO = 1RM (kg) divided by bodyweight (kg).',
  'Example: 80 kg client benching 100 kg → ratio 1.25. "≥ N" = minimum ratio to earn that level.',
  '',
  'IMPORTANT — THESE ARE PLACEHOLDERS. They are simplified from published adult strength',
  'standards (ExRx.net / Kraemer & Fleck-style tables). Please send YOUR numbers and we swap them in',
  '(same as we did for sit & reach in the old battery).',
  '',
  'QUESTION 1 — AGE: right now ONE flat band applies to all ages. Should older clients get',
  'easier thresholds? If yes, send age-banded values (e.g. 18-35 / 36-50 / 51+).',
  '',
  'QUESTION 2 — the classification from the three lift scores is unchanged from your rule:',
  'average of bench+squat+deadlift scores → 1-1.9 Beginner A · 2-2.9 Beginner B · 3-3.9 Intermediate A',
  '· exactly 4 Intermediate B · above 4 Pro. Confirm this still applies to the 1RM battery.',
  '',
  'Reply with corrections and we update the app — old saved evaluations keep their frozen scores,',
  'only new evaluations use the corrected tables.',
];
readmeLines.forEach((line, i) => { readme.getCell(i + 1, 1).value = line; });
readme.getRow(1).font = { bold: true };
readme.getColumn(1).width = 110;

for (const [testId, title] of Object.entries(LIFTS)) {
  const ws = wb.addWorksheet(title);
  ws.getCell('A1').value = `${title} — 1RM ÷ bodyweight ratio, one flat age band (see Read Me).`;
  ws.getRow(1).font = { italic: true };
  let r = 3;
  for (const [gender, bands] of Object.entries(CHARTS[testId])) {
    ws.getCell(r, 1).value = gender.toUpperCase();
    ws.getRow(r).font = { bold: true };
    r++;
    ['Age', ...LEVELS].forEach((h, i) => { ws.getCell(r, i + 1).value = h; });
    r++;
    for (const band of bands) {
      const ageLabel = band.maxAge === 999 ? (band.minAge === 0 ? 'ALL AGES' : `${band.minAge}+`) : `${band.minAge}-${band.maxAge}`;
      ws.getCell(r, 1).value = ageLabel;
      ws.getCell(r, 2).value = `< ${band.t[0]}`;
      band.t.forEach((min, i) => { ws.getCell(r, i + 3).value = `≥ ${min}`; });
      r++;
    }
    r++;
  }
  ws.columns.forEach(col => { col.width = 18; });
}

// Plain relative path — run from repo root (URL-pathname breaks on Windows drive letters)
await wb.xlsx.writeFile('docs/superpowers/artifacts/2026-07-06-1rm-battery/PT-1RM-Standards-As-Implemented.xlsx');
console.log('Written: docs/superpowers/artifacts/2026-07-06-1rm-battery/PT-1RM-Standards-As-Implemented.xlsx');
