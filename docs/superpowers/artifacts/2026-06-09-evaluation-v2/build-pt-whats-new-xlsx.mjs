// Builds the PT-facing "What's New + Questions" workbook (2026-06-11) — the ONE file
// Pierre sends the PT after v2.11.0 shipped. Plain language, quick to read:
//   1. What's New        — what the app does now
//   2. Choices We Made   — decisions Pierre answered on the PT's behalf (each can be changed)
//   3. Questions         — what we still need (amber answer cells, same style as his templates)
//   4+ one sheet per test — the norm charts AS IMPLEMENTED, for him to confirm
// Run from repo root: node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-pt-whats-new-xlsx.mjs
import ExcelJS from 'exceljs';
const chartsUrl = new URL('../../../../src/normCharts.js', import.meta.url).href;
const { CHARTS, formatRunTime, CHARTS_VERSION } = await import(chartsUrl);

const AMBER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const HEADER_FONT = { bold: true, size: 12 };

const wb = new ExcelJS.Workbook();

// ───────────────────────── Sheet 1: What's New ─────────────────────────
const wn = wb.addWorksheet("What's New");
wn.getColumn(1).width = 110;
const wnLines = [
  ['YOUR EVALUATION SYSTEM IS NOW IN THE APP (version 2.11) 🎉', true],
  [''],
  ['How to use it:', true],
  ['1. Open the Clients tab → tap a client to expand → tap Evaluate.'],
  ['   (The client needs gender + birthdate filled in — the charts need them.)'],
  ['2. Type the raw results: push-ups, pull-ups OR inverted row, squats (each in 30 seconds),'],
  ['   1-mile run (minutes:seconds, optional), sit & reach (cm past the toes, optional — negative if before the toes).'],
  ['3. While you type, the app shows the level of each test instantly (Weak → Excellent), from YOUR charts.'],
  ['4. It averages the 3 muscle tests and classifies the client with YOUR rule:'],
  ['   1–1.9 Beginner A · 2–2.9 Beginner B · 3–3.9 Intermediate A · 4 Intermediate B · 4.1–5 Pro.'],
  ['5. Save. The evaluation is kept in the client\'s history forever — re-evaluate every 8 weeks like you said;'],
  ['   nothing gets overwritten. You can also edit or delete an evaluation from its row.'],
  [''],
  ['Extras:', true],
  ['• The latest classification shows as a small badge on the client\'s card.'],
  ['• All the norm charts are inside the app: General → Norm Charts. Same numbers the app scores with.'],
  ['• The 1-mile run shows a verdict but is NOT counted in the muscle average (your rule).'],
  [''],
  ['What is NOT in yet:', true],
  ['• The Pro / Elite 1RM battery (bench / squat / deadlift). It shows as "coming soon" in the app.'],
  ['  We need your answers in the "Questions" sheet to build it — that is the next version.'],
];
wnLines.forEach(([text, bold], i) => {
  const cell = wn.getCell(i + 1, 1);
  cell.value = text || '';
  if (bold) cell.font = HEADER_FONT;
  cell.alignment = { wrapText: true, vertical: 'top' };
});

// ───────────────────────── Sheet 2: Choices We Made ─────────────────────────
const ch = wb.addWorksheet('Choices We Made');
ch.getColumn(1).width = 26; ch.getColumn(2).width = 80; ch.getColumn(3).width = 40;
ch.getCell('A1').value = 'Pierre answered some small questions on your behalf so the app could ship. Every choice below can still be changed — just say so.';
ch.getCell('A1').font = { italic: true };
ch.mergeCells('A1:C1');
const chHeader = ['Topic', 'What we did', 'Anything to change?'];
chHeader.forEach((h, i) => { const c = ch.getCell(3, i + 1); c.value = h; c.font = HEADER_FONT; });
const choices = [
  ['Your 30s charts', 'Used YOUR charts exactly as you sent them. The small fixes we had to make are written on each chart sheet in this file.', 'Check each chart sheet → confirm or correct.'],
  ['Holes in some charts', 'Example: men\'s squat 18–25 had nothing between 30 and 35 squats. When a result falls in a hole, the app gives the LOWER level — never a free upgrade.', 'OK?'],
  ['Women\'s push-up chart', 'It had 6 levels; the app uses 5 — we merged "Good" and "Above Average" into one "Good". Also: the 40–49 row said "5–31" which looked like a typo — we read it as 25–31.', 'OK?'],
  ['Pull-up ages', 'Your pull-up chart says ages 18–45 with no age groups. We apply the same numbers to ALL ages.', 'OK, or send numbers per age group.'],
  ['Sit & reach', 'No chart from you yet, so for now the app uses the published YMCA standard (it says so in the app). We measure in cm past the toes; negative = before the toes.', 'Send your chart and we swap it in.'],
  ['Who picks the battery', 'YOU choose Standard or Pro/Elite for each client — the app never decides for you (your answer).', '—'],
  ['Saved results stay', 'Scores are locked at the moment you save. If a chart is corrected later, old evaluations do NOT change (history stays honest). Editing an evaluation re-scores it.', '—'],
  ['Re-evaluation', 'Every ~8 weeks (your answer). Each evaluation is a new entry in the history — nothing is overwritten.', '—'],
];
choices.forEach((row, r) => {
  row.forEach((v, c) => {
    const cell = ch.getCell(r + 4, c + 1);
    cell.value = v;
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
});

// ───────────────────────── Sheet 3: Questions ─────────────────────────
const q = wb.addWorksheet('Questions');
q.getColumn(1).width = 100;
q.getColumn(2).width = 60;
let qr = 1;
const qTitle = q.getCell(qr, 1);
qTitle.value = 'WE NEED THESE ANSWERS TO BUILD THE PRO / ELITE (1RM) PART — write in the yellow boxes';
qTitle.font = HEADER_FONT; qr += 2;

const questions = [
  ['Q1. ELITE vs PRO — when is a high-level athlete "Elite" instead of "Pro"?',
   'For example: reaches the 1RM minimums (bench 1.0 / squat 1.4 / deadlift 1.7 × bodyweight for men) = Pro, and goes clearly above them = Elite? Or is it your own judgment? Tell us the rule.'],
  ['Q2. What should the app SAY about a 1RM result?',
   'A) Simply pass / fail against the minimum ratios.  B) Levels like the other tests (Weak → Excellent) — then send the cut-offs per lift.  C) Just record the numbers, no verdict.'],
  ['Q3. Bodyweight on test day',
   'For 1RM the app must know the athlete\'s bodyweight. OK that you type the bodyweight when you start a Pro/Elite evaluation?'],
  ['Q4. Sit & reach chart',
   'Send your own chart (by age and gender if you have it) and confirm how you measure: we assume cm past the toes, negative = before the toes.'],
  ['Q5. Confirm the charts',
   'Open each chart sheet in this file (pushup, pullup, invertedRow, squat, run, sitReach) and reply "charts OK" — or tell us any number to fix.'],
];
for (const [title, body] of questions) {
  q.getCell(qr, 1).value = title;
  q.getCell(qr, 1).font = { bold: true };
  q.getCell(qr, 1).alignment = { wrapText: true, vertical: 'top' };
  qr++;
  q.getCell(qr, 1).value = body;
  q.getCell(qr, 1).alignment = { wrapText: true, vertical: 'top' };
  const ans = q.getCell(qr, 2);
  ans.value = 'Your answer:';
  ans.fill = AMBER;
  ans.alignment = { wrapText: true, vertical: 'top' };
  qr += 2;
}

// ───────────────── Sheets 4+: norm charts as implemented ─────────────────
// Mirrors build-norms-review-xlsx.mjs — one sheet per test, note in A1.
const NOTES = {
  pushup: 'Female chart: your 6 levels merged to 5 (Good + Above Average = "Good"). 40-49 "5-31" read as 25-31 (typo?). Please confirm.',
  pullup: 'Your chart has no age bands (18-45). Applied to ALL ages. OK? If not, send banded values.',
  invertedRow: 'As provided. Used when pull-up is unachievable (your rule).',
  squat: 'Your male chart had gaps (e.g. 18-25: nothing between 30 and 35) — values in a gap score the LOWER level. Two overlaps resolved (36-45, 46-55: Excellent starts just above Above-Average top). Please confirm.',
  run: 'As provided. 4 levels, verdict only — not in the muscle average.',
  sitReach: 'YOUR CHART IS MISSING — these are YMCA published norms (Morrow 2015), converted to cm past toes (negative = short of toes). Send yours and we swap them in.',
};
const LEVELS = ['Weak (1)', 'Below Avg (2)', 'Average (3)', 'Good (4)', 'Excellent (5)'];
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
      ws.getCell(r, 1).value = ageLabel;
      if (testId === 'run') {
        ws.getCell(r, 2).value = formatRunTime(band.t[0]);
        ws.getCell(r, 3).value = formatRunTime(band.t[1]);
        ws.getCell(r, 4).value = formatRunTime(band.t[2]);
        ws.getCell(r, 5).value = '> ' + formatRunTime(band.t[2]);
      } else {
        ws.getCell(r, 2).value = `< ${band.t[0]}`;
        band.t.forEach((min, i) => { ws.getCell(r, i + 3).value = `≥ ${min}`; });
      }
      r++;
    }
    r++;
  }
  ws.columns.forEach(col => { col.width = 20; });
}

await wb.xlsx.writeFile('docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Eval-WhatsNew-and-Questions.xlsx');
console.log(`Written (charts version ${CHARTS_VERSION}): docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Eval-WhatsNew-and-Questions.xlsx`);
