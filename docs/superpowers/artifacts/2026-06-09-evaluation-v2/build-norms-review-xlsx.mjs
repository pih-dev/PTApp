// Generates the "as implemented" norms workbook the PT validates — one sheet per test,
// rows = age bands, columns = levels with their thresholds, adjustment notes inline.
// Re-run whenever CHARTS changes (then bump CHARTS_VERSION and re-send to the PT).
// Run from repo root: node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-norms-review-xlsx.mjs
import ExcelJS from 'exceljs';
const chartsUrl = new URL('../../../../src/normCharts.js', import.meta.url).href;
const { CHARTS, formatRunTime, CHARTS_VERSION } = await import(chartsUrl);

const NOTES = {
  pushup: 'Female chart: your 6 levels merged to 5 (Good + Above Average = "Good"). 40-49 "5-31" read as 25-31 (typo?). Please confirm.',
  pullup: 'Your chart has no age bands (18-45). Applied to ALL ages. OK? If not, send banded values.',
  invertedRow: 'As provided. Used when pull-up is unachievable (your rule).',
  squat: 'Your male chart had gaps (e.g. 18-25: nothing between 30 and 35) — values in a gap score the LOWER level. Two overlaps resolved (36-45, 46-55: Excellent starts just above Above-Average top). Please confirm.',
  run: 'As provided. 4 levels, verdict only — not in the muscle average.',
  sitReach: 'YOUR CHART IS MISSING — these are YMCA published norms (Morrow 2015), converted to cm past toes (negative = short of toes). Send yours and we swap them in.',
};
const LEVELS = ['Weak (1)', 'Below Avg (2)', 'Average (3)', 'Good (4)', 'Excellent (5)'];

const wb = new ExcelJS.Workbook();
const readme = wb.addWorksheet('Read Me');
readme.getCell('A1').value = `Norms as implemented in the app (charts version ${CHARTS_VERSION}) — generated ${new Date().toISOString().slice(0, 10)}`;
readme.getCell('A3').value = 'One sheet per test. "≥ N" = minimum value to earn that level. Check each sheet\'s note; reply with corrections and we update the app.';
readme.getColumn(1).width = 120;

for (const [testId, byGender] of Object.entries(CHARTS)) {
  const ws = wb.addWorksheet(testId);
  ws.getCell('A1').value = NOTES[testId];
  ws.getRow(1).font = { italic: true };
  let r = 3;
  for (const [gender, bands] of Object.entries(byGender)) {
    ws.getCell(r, 1).value = gender.toUpperCase();
    ws.getRow(r).font = { bold: true };
    r++;
    const header = testId === 'run'
      ? ['Age', 'Excellent (faster than)', 'Good (up to)', 'Average (up to)', 'Poor (slower)']
      : ['Age', ...LEVELS];
    header.forEach((h, i) => { ws.getCell(r, i + 1).value = h; });
    r++;
    for (const band of bands) {
      const ageLabel = band.maxAge === 999 ? `${band.minAge}+` : `${band.minAge}-${band.maxAge}`;
      if (testId === 'run') {
        ws.getCell(r, 1).value = ageLabel;
        ws.getCell(r, 2).value = formatRunTime(band.t[0]);
        ws.getCell(r, 3).value = formatRunTime(band.t[1]);
        ws.getCell(r, 4).value = formatRunTime(band.t[2]);
        ws.getCell(r, 5).value = '> ' + formatRunTime(band.t[2]);
      } else {
        // Column B: "< t[0]" = Weak (1) threshold (below this minimum earns level 1)
        // Column C: "≥ t[0]" = Below Avg (2) — band.t[0] is the min to reach level 2
        // Column D: "≥ t[1]" = Average (3), Column E: "≥ t[2]" = Good (4), Column F: "≥ t[3]" = Excellent (5)
        ws.getCell(r, 1).value = ageLabel;
        ws.getCell(r, 2).value = `< ${band.t[0]}`;
        band.t.forEach((min, i) => { ws.getCell(r, i + 3).value = `≥ ${min}`; });
      }
      r++;
    }
    r++;
  }
  ws.columns.forEach(col => { col.width = 20; });
}

// Plain relative path — run from repo root (the URL-pathname dance breaks on Windows drive letters)
await wb.xlsx.writeFile('docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx');
console.log('Written: docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Norms-As-Implemented.xlsx');
