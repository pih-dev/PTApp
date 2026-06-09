// Builds the PT-facing EVALUATION TESTS template workbook (v2 design — Jun 2026).
// Run from repo root:
//   node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-eval-tests-template.mjs
//
// Output: docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Eval-Tests-Template.xlsx
//
// CONTEXT — this is the SECOND, redesigned evaluation template. The Apr-2026 design
// (observe-and-grade 1-5 → 6-level WBS tree) was superseded on 2026-06-09. The new
// design is:
//   • 5 fixed tests: 3 muscle-group + lung capacity + stretchability
//   • PT measures each himself (NO in-app timer/counter) and types a RAW VALUE
//   • App looks the value up in a published age-band × gender NORM CHART
//   • Output per test: Below Average / Average / Good
// What we need from the PT: confirm the exact tests + units + protocol, and supply
// the published norm numbers per (age band × gender) cell — he is the domain expert
// and owns the charts. The filled copy is later DIFFED against the archived empty
// baseline to extract exactly what he authored.
//
// Requires exceljs (installed via `npm install --no-save exceljs` — not in package.json).

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'PT-Eval-Tests-Template.xlsx');

// ─── PTApp color family so the PT recognizes the workbook ───
const COLOR = {
  blueDark:   'FF1E3A8A',
  blueAccent: 'FF2563EB',
  green:      'FF10B981',  // "Good" band
  amber:      'FFF59E0B',  // "Average" band / fill-me cues
  red:        'FFEF4444',  // "Below average" band
  amberWash:  'FFFEF3C7',  // soft fill-in background
  greyText:   'FF64748B',
  greyBorder: 'FFCBD5E1',
  white:      'FFFFFFFF',
  text:       'FF0F172A',
};

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: COLOR.greyBorder } };
const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

function styleHeader(cell, bg = COLOR.blueDark) {
  cell.font = { bold: true, color: { argb: COLOR.white }, size: 12 };
  cell.fill = fill(bg);
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = allBorders;
}
function styleSectionTitle(cell, bg = COLOR.blueAccent) {
  cell.font = { bold: true, color: { argb: COLOR.white }, size: 13 };
  cell.fill = fill(bg);
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}
function styleBody(cell) {
  cell.font = { color: { argb: COLOR.text }, size: 11 };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = allBorders;
}
function styleExample(cell) {
  // greyed italic — "this is an example, edit it"
  cell.font = { color: { argb: COLOR.greyText }, size: 11, italic: true };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = allBorders;
}
function styleFillIn(cell) {
  cell.fill = fill(COLOR.amberWash);
  cell.font = { color: { argb: COLOR.text }, size: 11 };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = { top: thin, bottom: thin, left: thin,
                  right: { style: 'thin', color: { argb: COLOR.amber } } };
}

const wb = new ExcelJS.Workbook();
wb.creator = 'PTApp brainstorm — Pierre + Claude';
wb.created = new Date('2026-06-09');
wb.title = 'PTApp Evaluation Tests — PT Input Template (v2)';

const AGE_BANDS = ['18-24', '25-29', '30-39', '40-49', '50-59', '60+'];
const GENDERS = ['Female', 'Male'];

// ═══════════════════════════════════════════════════════════════════
// Sheet 1 — Read Me
// ═══════════════════════════════════════════════════════════════════
const s1 = wb.addWorksheet('Read Me', { views: [{ state: 'frozen', ySplit: 1 }] });
s1.columns = [{ width: 4 }, { width: 112 }];
s1.mergeCells('A1:B1');
styleHeader(s1.getCell('A1'), COLOR.blueDark);
s1.getCell('A1').value = 'PTApp — Evaluation Tests: Your Input Needed';
s1.getRow(1).height = 28;

const intro = [
  '',
  'Hi! Pierre and I are building the new EVALUATION feature into PTApp — the heart of phase two.',
  'When you evaluate a client, the app will run 5 fitness tests, and for each test it will tell you',
  'whether the result is BELOW AVERAGE, AVERAGE, or GOOD for that person’s age and gender.',
  '',
  'HOW THE TEST WILL WORK IN THE APP',
  '',
  '  • You run the test yourself, your own way (your own stopwatch, your own eye). The app does',
  '    NOT pop up a timer or count reps for you — we keep it simple, just like you asked.',
  '  • You type in the RESULT (a number): e.g. "22" push-ups, "45" seconds, "18" cm.',
  '  • The app compares that number to a published norm chart for the client’s age + gender,',
  '    and shows: Below Average / Average / Good.',
  '  • That chart will also be viewable from anywhere in the app as a reference.',
  '',
  'WHAT WE NEED FROM YOU (you are the expert — these are your charts)',
  '',
  '  1. "Tests" tab — confirm the 5 tests. We seeded our best guess (greyed italic). Fix the',
  '     names, what is measured, the unit, and the exact protocol (how you run each test).',
  '  2. The 5 "Norms" tabs (one per test) — fill the published numbers. For every age band and',
  '     gender, give the cut-offs: the value where AVERAGE starts, and the value where GOOD starts.',
  '     If you have the source chart (ACSM, Cooper, YMCA, sit-and-reach tables…), note it.',
  '',
  'HOW TO READ A NORM ROW (example: push-ups, Male, 25-29)',
  '',
  '     Average starts at = 22     Good starts at = 35',
  '     → under 22 = Below Average    22 to 34 = Average    35 and up = Good',
  '',
  'HOW TO WORK',
  '',
  '  • AMBER cells are for you to fill. Greyed italic cells are our examples — overwrite them.',
  '  • If a test should be measured differently than we guessed, just change it on the Tests tab.',
  '  • If you don’t have a number for some age band, leave it blank — we’ll use a placeholder.',
  '  • Save and send the file back to Pierre when done.',
  '',
  'ALREADY LOCKED (no need to change)',
  '',
  '  • Output per test: Below Average / Average / Good',
  '  • Age bands: 18-24   25-29   30-39   40-49   50-59   60+',
  '  • Split by gender: Female and Male',
  '',
];
intro.forEach((line, i) => {
  const c = s1.getRow(i + 2).getCell(2);
  c.value = line;
  c.font = { color: { argb: COLOR.text }, size: 11 };
  c.alignment = { vertical: 'top', wrapText: true };
  s1.getRow(i + 2).height = line === '' ? 8 : 18;
});
['HOW THE TEST WILL WORK IN THE APP', 'WHAT WE NEED FROM YOU (you are the expert — these are your charts)',
 'HOW TO READ A NORM ROW (example: push-ups, Male, 25-29)', 'HOW TO WORK', 'ALREADY LOCKED (no need to change)']
  .forEach(label => intro.forEach((line, i) => {
    if (line === label) s1.getRow(i + 2).getCell(2).font = { bold: true, color: { argb: COLOR.blueAccent }, size: 12 };
  }));

// ═══════════════════════════════════════════════════════════════════
// Sheet 2 — Tests
// ═══════════════════════════════════════════════════════════════════
const s2 = wb.addWorksheet('Tests');
s2.columns = [
  { width: 4 },   // A spacer
  { width: 5 },   // B #
  { width: 16 },  // C category
  { width: 24 },  // D test name
  { width: 26 },  // E what is measured
  { width: 12 },  // F unit
  { width: 40 },  // G protocol
  { width: 12 },  // H higher better?
];
s2.mergeCells('A1:H1');
styleHeader(s2.getCell('A1'), COLOR.blueDark);
s2.getCell('A1').value = 'The 5 Evaluation Tests — confirm / edit (greyed = our example)';
s2.getRow(1).height = 26;

s2.mergeCells('B3:H3');
const t2note = s2.getCell('B3');
t2note.value = 'These are our best guesses based on your voice note (3 muscle-group tests + lung capacity + stretchability). '
  + 'Overwrite anything that is wrong. The "Unit" and "Higher is better?" columns matter — the app uses them to read your norm charts correctly.';
t2note.font = { italic: true, color: { argb: COLOR.text }, size: 11 };
t2note.alignment = { vertical: 'top', wrapText: true };
s2.getRow(3).height = 46;

const tHead = 5;
['#', 'Category', 'Test name', 'What is measured', 'Unit', 'Protocol — how you run it', 'Higher = better?']
  .forEach((label, i) => styleHeader(s2.getRow(tHead).getCell(2 + i), COLOR.blueAccent));
s2.getRow(tHead).height = 22;

// Seeded examples (greyed). PT confirms/edits. Lung capacity intentionally light — his call.
const seedTests = [
  ['Muscle group', 'Push-up test', 'Max push-ups in 30 seconds', 'reps', 'Standard floor push-up, full range (chest near floor, arms lock out). Count clean reps in 30s.', 'Yes'],
  ['Muscle group', 'Pull-up test', 'Max pull-ups in 30 seconds', 'reps', 'Overhand grip, full dead hang to chin clearly over the bar. Count clean reps in 30s.', 'Yes'],
  ['Muscle group', 'Bodyweight squat test', 'Max squats in 30 seconds', 'reps', 'Hips to at least parallel (below knee), stand fully. Count clean reps in 30s.', 'Yes'],
  ['Lung capacity', '(you define)', '(e.g. breath-hold seconds, or peak flow L/min)', '(unit)', '(How do you want to measure lung capacity? Breath-hold time? Balloon? Peak-flow meter? Your call.)', 'Yes'],
  ['Stretchability', 'Sit-and-reach', 'Reach past toes', 'cm', 'Sit, legs straight, reach forward along a ruler/box; record furthest reach. Can be negative if short of toes.', 'Yes'],
];
seedTests.forEach((row, i) => {
  const r = s2.getRow(tHead + 1 + i);
  r.getCell(2).value = `${i + 1} (ex.)`;
  r.getCell(2).font = { color: { argb: COLOR.greyText }, size: 9, italic: true };
  r.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };
  r.getCell(2).border = allBorders;
  row.forEach((v, j) => {
    const c = r.getCell(3 + j);
    c.value = v;
    styleExample(c);
  });
  r.height = 48;
});
// One spare blank amber row in case he wants to split/add a test
const spare = s2.getRow(tHead + 1 + seedTests.length);
spare.getCell(2).value = 6;
spare.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };
spare.getCell(2).border = allBorders;
for (let j = 0; j < 6; j++) styleFillIn(spare.getCell(3 + j));
spare.height = 40;

s2.mergeCells(`B${tHead + 3 + seedTests.length}:H${tHead + 3 + seedTests.length}`);
const t2foot = s2.getCell(`B${tHead + 3 + seedTests.length}`);
t2foot.value = 'Keep it to 5 tests if you can — that is the design. The spare row is only if you must split one.';
t2foot.font = { italic: true, color: { argb: COLOR.greyText }, size: 10 };

// ═══════════════════════════════════════════════════════════════════
// Sheets 3-7 — one Norms sheet per test
// ═══════════════════════════════════════════════════════════════════
function buildNormsSheet(sheetName, testNo, testLabel, unitHint) {
  const s = wb.addWorksheet(sheetName);
  s.columns = [
    { width: 4 },   // A spacer
    { width: 14 },  // B age band
    { width: 12 },  // C gender
    { width: 20 },  // D average starts at
    { width: 20 },  // E good starts at
    { width: 26 },  // F source / reference
    { width: 26 },  // G notes
  ];
  s.mergeCells('A1:G1');
  styleHeader(s.getCell('A1'), COLOR.blueDark);
  s.getCell('A1').value = `Norms — Test ${testNo}: ${testLabel}   (unit: ${unitHint})`;
  s.getRow(1).height = 26;

  s.mergeCells('B3:G3');
  const note = s.getCell('B3');
  note.value = 'Fill the published cut-offs for THIS test. "Average starts at" = the value at which a result stops being '
    + 'Below Average and becomes Average. "Good starts at" = the value at which it becomes Good. (Assumes higher = better; '
    + 'tell us on the Tests tab if this test is the opposite.) Leave blank where you have no data — we will placeholder it. '
    + 'If you renamed/redefined this test on the Tests tab, just fill the matching numbers here for Test ' + testNo + '.';
  note.font = { italic: true, color: { argb: COLOR.text }, size: 11 };
  note.alignment = { vertical: 'top', wrapText: true };
  s.getRow(3).height = 64;

  // colored legend strip
  s.getCell('B5').value = 'Below Average';
  styleSectionTitle(s.getCell('B5'), COLOR.red);
  s.getCell('C5').value = '< Average';
  styleSectionTitle(s.getCell('C5'), COLOR.red);
  s.getCell('D5').value = 'Average';
  styleSectionTitle(s.getCell('D5'), COLOR.amber);
  s.getCell('E5').value = 'Good';
  styleSectionTitle(s.getCell('E5'), COLOR.green);
  s.mergeCells('F5:G5');
  s.getCell('F5').value = '← the three bands the app will show';
  s.getCell('F5').font = { italic: true, color: { argb: COLOR.greyText }, size: 10 };
  s.getRow(5).height = 20;

  const head = 7;
  ['Age band', 'Gender', 'Average starts at (≥)', 'Good starts at (≥)', 'Published source', 'Notes']
    .forEach((label, i) => styleHeader(s.getRow(head).getCell(2 + i), COLOR.blueAccent));
  s.getRow(head).height = 22;

  let row = head + 1;
  GENDERS.forEach(gender => {
    AGE_BANDS.forEach((band, bi) => {
      const r = s.getRow(row);
      r.getCell(2).value = band;
      r.getCell(3).value = gender;
      styleBody(r.getCell(2));
      styleBody(r.getCell(3));
      r.getCell(3).font = { bold: true,
        color: { argb: gender === 'Female' ? COLOR.blueAccent : COLOR.text }, size: 11 };
      [4, 5, 6, 7].forEach(col => styleFillIn(r.getCell(col)));
      r.height = 24;
      row++;
    });
    // thin gap row between genders
    s.getRow(row).height = 6;
    row++;
  });
}

buildNormsSheet('Norms - Push-up',  1, 'Push-up test',          'reps');
buildNormsSheet('Norms - Pull-up',  2, 'Pull-up test',          'reps');
buildNormsSheet('Norms - Squat',    3, 'Bodyweight squat test', 'reps');
buildNormsSheet('Norms - Lung',     4, 'Lung capacity',         'you define');
buildNormsSheet('Norms - Stretch',  5, 'Stretchability',        'cm');

await wb.xlsx.writeFile(OUT);
console.log('Wrote', OUT);
