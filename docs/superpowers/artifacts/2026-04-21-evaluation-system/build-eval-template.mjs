// Builds the PT-facing evaluation template workbook.
// Run from repo root:   node docs/superpowers/artifacts/2026-04-21-evaluation-system/build-eval-template.mjs
//
// Output: docs/superpowers/artifacts/2026-04-21-evaluation-system/PT-Evaluation-Template.xlsx
//
// The PT will receive this workbook, fill in his per-branch eval exercises and
// his layering opinions, and return it. The filled copy will then unblock Q7/Q8
// in the brainstorm spec (2026-04-21-evaluation-system-brainstorm.md).
//
// Requires exceljs (installed via `npm install --no-save exceljs` — not in package.json).

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'PT-Evaluation-Template.xlsx');

// ─── Style helpers — keep PTApp's accent colors so PT recognizes the family ───
const COLOR = {
  blueDark:   'FF1E3A8A',  // header bg
  blueAccent: 'FF2563EB',  // section bands
  purple:     'FFA855F7',  // Pro branch
  amber:      'FFF59E0B',  // placeholders / "fill me in"
  greyBg:     'FFF1F5F9',  // subtle row banding
  greyBorder: 'FFCBD5E1',
  white:      'FFFFFFFF',
  text:       'FF0F172A',
};

const headerFill = (color) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });
const thin = { style: 'thin', color: { argb: COLOR.greyBorder } };
const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

function styleHeader(cell, bg = COLOR.blueDark) {
  cell.font = { bold: true, color: { argb: COLOR.white }, size: 12 };
  cell.fill = headerFill(bg);
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = allBorders;
}

function styleSectionTitle(cell, bg = COLOR.blueAccent) {
  cell.font = { bold: true, color: { argb: COLOR.white }, size: 14 };
  cell.fill = headerFill(bg);
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function styleBody(cell) {
  cell.font = { color: { argb: COLOR.text }, size: 11 };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = allBorders;
}

function styleFillIn(cell) {
  cell.fill = headerFill('FFFEF3C7');  // soft amber wash — visual cue "PT fills here"
  cell.font = { color: { argb: COLOR.text }, size: 11, italic: true };
  cell.alignment = { vertical: 'top', wrapText: true };
  cell.border = { top: thin, bottom: thin, left: thin, right: { style: 'thin', color: { argb: COLOR.amber } } };
}

// ─── Build workbook ───
const wb = new ExcelJS.Workbook();
wb.creator = 'PTApp brainstorm — Pierre + Claude';
wb.created = new Date('2026-05-11');
wb.title = 'PT Evaluation System — Input Template';

// ═══════════════════════════════════════════════════════════════════════════
// Sheet 1 — Read Me
// ═══════════════════════════════════════════════════════════════════════════
const s1 = wb.addWorksheet('Read Me', { views: [{ state: 'frozen', ySplit: 1 }] });
s1.columns = [{ width: 4 }, { width: 110 }];

s1.mergeCells('A1:B1');
const t1 = s1.getCell('A1');
t1.value = 'PTApp Evaluation System — Your Input Needed';
styleHeader(t1, COLOR.blueDark);
s1.getRow(1).height = 28;

const intro = [
  '',
  'Hi! Pierre and I are building an evaluation system into PTApp. The system lets you grade a',
  'client on a short battery of exercises, then auto-classifies them into a level (Beginner A/B,',
  'Intermediate A/B, Pro, or Elite) for a year-long program. We have the structure decided — but',
  'we need YOUR domain knowledge to fill in the actual content.',
  '',
  'WHAT YOU NEED TO DO',
  '',
  '  1. Read the "WBS Reference" tab — it shows the classification tree we agreed on.',
  '  2. Fill the "Beginner Battery" tab — the exercises you would use to grade a client you',
  '     suspect is in the Beginner branch (Beginner A → Intermediate B). Bodyweight, observable.',
  '  3. Fill the "Pro Battery" tab — the exercises you would use to grade a client you suspect',
  '     is in the Pro branch (Pro / Elite). Likely harder variants or loaded moves.',
  '  4. Answer the "Layering Questions" tab — your opinion on how the eval flow should split.',
  '  5. (Optional) "Cell Norms (scratch)" — if you have rough grades-vs-level intuition by age',
  '     and gender, jot it. Totally optional, structure-only is fine.',
  '',
  'HOW TO WORK',
  '',
  '  • Cells with the soft AMBER background are the ones for you to fill.',
  '  • Anywhere you want to add notes, just type — there are no wrong answers.',
  '  • If you need more rows than provided, just keep typing in the next blank row.',
  '  • Save and send the file back to Pierre when done.',
  '',
  'GRADING SCALE (already locked)',
  '',
  '  1 = Weak     2 = Below Average     3 = Average     4 = Good     5 = Excellent',
  '',
  'AGE BANDS (already locked)',
  '',
  '  18-24    25-29    30-39    40-49    50-59    60+',
  '',
];

intro.forEach((line, i) => {
  const r = s1.getRow(i + 2);
  r.getCell(2).value = line;
  r.getCell(2).font = { color: { argb: COLOR.text }, size: 11 };
  r.getCell(2).alignment = { vertical: 'top', wrapText: true };
  r.height = line === '' ? 8 : 18;
});

// Highlight the section labels
['WHAT YOU NEED TO DO', 'HOW TO WORK', 'GRADING SCALE (already locked)', 'AGE BANDS (already locked)']
  .forEach(label => {
    intro.forEach((line, i) => {
      if (line === label) {
        const c = s1.getRow(i + 2).getCell(2);
        c.font = { bold: true, color: { argb: COLOR.blueAccent }, size: 12 };
      }
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// Sheet 2 — WBS Reference
// ═══════════════════════════════════════════════════════════════════════════
const s2 = wb.addWorksheet('WBS Reference');
s2.columns = [{ width: 4 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 30 }];

s2.mergeCells('A1:E1');
styleHeader(s2.getCell('A1'), COLOR.blueDark);
s2.getCell('A1').value = 'Classification Tree (already agreed)';
s2.getRow(1).height = 26;

s2.getCell('B3').value = 'Top';
s2.getCell('C3').value = 'Branch';
s2.getCell('D3').value = 'Leaf Level';
s2.getCell('E3').value = 'Per-leaf criteria (TBD)';
['B3','C3','D3','E3'].forEach(addr => styleHeader(s2.getCell(addr), COLOR.blueAccent));

const rows = [
  ['Evaluation', 'Beginner', 'Beginner A', '6 age bands × 2 genders = 12 cells'],
  ['',           'Beginner', 'Beginner B', '6 age bands × 2 genders = 12 cells'],
  ['',           'Beginner', 'Intermediate A', '6 age bands × 2 genders = 12 cells'],
  ['',           'Beginner', 'Intermediate B', '6 age bands × 2 genders = 12 cells'],
  ['',           'Pro',      'Pro',        '6 age bands × 2 genders = 12 cells'],
  ['',           'Pro',      'Elite',      '6 age bands × 2 genders = 12 cells'],
];
rows.forEach((r, i) => {
  const row = s2.getRow(4 + i);
  row.getCell(2).value = r[0];
  row.getCell(3).value = r[1];
  row.getCell(4).value = r[2];
  row.getCell(5).value = r[3];
  ['B','C','D','E'].forEach(col => styleBody(row.getCell(col)));
  // Color the branch cell
  if (r[1] === 'Beginner') row.getCell(3).font = { bold: true, color: { argb: COLOR.blueAccent }, size: 11 };
  if (r[1] === 'Pro')      row.getCell(3).font = { bold: true, color: { argb: COLOR.purple }, size: 11 };
});

s2.mergeCells('B11:E11');
const totalCell = s2.getCell('B11');
totalCell.value = 'Total program cells: 6 levels × 6 age bands × 2 genders = 72 cells (each gets its own program later)';
totalCell.font = { italic: true, color: { argb: COLOR.text }, size: 11 };
totalCell.alignment = { vertical: 'middle', horizontal: 'left' };

s2.mergeCells('B13:E13');
styleSectionTitle(s2.getCell('B13'), COLOR.amber);
s2.getCell('B13').value = 'Why two batteries (Beginner vs Pro)?';
s2.getRow(13).height = 22;

s2.mergeCells('B14:E18');
const why = s2.getCell('B14');
why.value = "Per Pierre: 'evaluation of a potential elite differs' from a beginner. Grading a Pro on bodyweight push-ups tells you nothing — they'd ace it. So we plan to use a different set of exercises depending on which branch you suspect the client belongs to. Your job in the next two tabs: fill in those two lists.";
why.font = { color: { argb: COLOR.text }, size: 11 };
why.alignment = { vertical: 'top', wrapText: true };

// ═══════════════════════════════════════════════════════════════════════════
// Sheet 3 — Beginner Battery
// ═══════════════════════════════════════════════════════════════════════════
function buildBatterySheet(name, branchLabel, branchColor, helperText, seedExamples) {
  const s = wb.addWorksheet(name);
  s.columns = [
    { width: 4 },                  // A: spacer
    { width: 8 },                  // B: row number
    { width: 32 },                 // C: exercise name
    { width: 18 },                 // D: how to perform / position
    { width: 18 },                 // E: what you observe
    { width: 26 },                 // F: notes (rest, variations, etc.)
  ];

  s.mergeCells('A1:F1');
  styleHeader(s.getCell('A1'), branchColor);
  s.getCell('A1').value = `${branchLabel} Battery — please fill below`;
  s.getRow(1).height = 28;

  s.mergeCells('B3:F3');
  const help = s.getCell('B3');
  help.value = helperText;
  help.font = { color: { argb: COLOR.text }, size: 11, italic: true };
  help.alignment = { vertical: 'top', wrapText: true };
  s.getRow(3).height = 56;

  // Header row
  const headerRow = 5;
  ['#', 'Exercise', 'How to perform / position', 'What you observe', 'Notes (variations, rest, why this exercise…)']
    .forEach((label, i) => {
      const c = s.getRow(headerRow).getCell(2 + i);
      c.value = label;
      styleHeader(c, COLOR.blueAccent);
    });
  s.getRow(headerRow).height = 22;

  // Seed example row (so PT sees the format) + 14 blank fill-in rows
  const totalRows = 15;
  for (let i = 0; i < totalRows; i++) {
    const r = s.getRow(headerRow + 1 + i);
    r.getCell(2).value = i + 1;
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };
    r.getCell(2).font = { color: { argb: COLOR.text }, size: 11 };
    r.getCell(2).border = allBorders;

    if (i < seedExamples.length) {
      const seed = seedExamples[i];
      r.getCell(3).value = seed[0];
      r.getCell(4).value = seed[1];
      r.getCell(5).value = seed[2];
      r.getCell(6).value = seed[3];
      [3, 4, 5, 6].forEach(col => {
        const cell = r.getCell(col);
        styleBody(cell);
        cell.font = { color: { argb: '88475569' }, size: 11, italic: true };  // greyed = "example, replace if needed"
      });
      // Mark the example row
      const tag = r.getCell(2);
      tag.value = `${i + 1} (ex.)`;
      tag.font = { color: { argb: '88475569' }, size: 9, italic: true };
    } else {
      [3, 4, 5, 6].forEach(col => styleFillIn(r.getCell(col)));
    }
    r.height = 36;
  }

  // Footer note
  const footRow = headerRow + 1 + totalRows + 1;
  s.mergeCells(`B${footRow}:F${footRow}`);
  const f = s.getCell(`B${footRow}`);
  f.value = 'Need more rows? Just keep typing below — Excel will handle it.';
  f.font = { color: { argb: COLOR.text }, size: 10, italic: true };
}

buildBatterySheet(
  'Beginner Battery',
  'Beginner-branch',
  COLOR.blueAccent,
  'These are the exercises you would use to evaluate a client you THINK is somewhere in the Beginner branch (Beg A, Beg B, Int A, Int B). Typically bodyweight, observable, finite — the kind where a real beginner shows clear failure points. Pierre seeded the first row as an example; replace or extend.',
  [
    ['Push-ups (standard)', 'Floor, hands shoulder-width', 'Form quality + max reps until failure', 'Knee modification allowed for true beginners — note if used'],
  ]
);

buildBatterySheet(
  'Pro Battery',
  'Pro-branch',
  COLOR.purple,
  'These are the exercises you would use to evaluate a client you THINK is in the Pro branch (Pro / Elite). Likely loaded variants or harder movement patterns — anything where a real Pro can actually fail / show a ceiling. Pierre and I have NO seeds for this — your domain.',
  []
);

// ═══════════════════════════════════════════════════════════════════════════
// Sheet 5 — Layering Questions
// ═══════════════════════════════════════════════════════════════════════════
const s5 = wb.addWorksheet('Layering Questions');
s5.columns = [{ width: 4 }, { width: 60 }, { width: 60 }];

s5.mergeCells('A1:C1');
styleHeader(s5.getCell('A1'), COLOR.blueDark);
s5.getCell('A1').value = 'Layering Questions — your opinion';
s5.getRow(1).height = 28;

const layeringQuestions = [
  {
    title: 'Q1. Pre-classification routing',
    body: "Before the actual eval starts, should the app first do a QUICK READ to decide whether the client is in the Beginner branch or Pro branch — and THEN run the matching battery? Or should we always run one battery and let the grades decide later?",
    options: [
      'A. Yes — quick pre-read first, then run the matching battery (Beginner OR Pro).',
      'B. No — run a single battery for everyone, classify from grades.',
      'C. Other (explain in your answer).',
    ],
  },
  {
    title: 'Q2. Intermediate split inside Beginner',
    body: "Within the Beginner branch, do you want a useful checkpoint between 'Beginner-proper' (A/B) and 'Intermediate' (A/B)? E.g., a single tie-breaker move that decides 'this one is beyond beginner, push to intermediate'?",
    options: [
      'A. Yes — would help me grade more honestly.',
      'B. No — the battery grades are enough on their own.',
      'C. Other (explain in your answer).',
    ],
  },
  {
    title: 'Q3. Re-evaluation cadence',
    body: 'How often would you re-evaluate a client? (Will inform whether re-evals overwrite the previous result or append to a history.)',
    options: [
      'A. Quarterly (every 3 months)',
      'B. After each completed program cycle',
      'C. On demand only (when I feel they have changed level)',
      'D. Other',
    ],
  },
  {
    title: 'Q4. Anything we are missing?',
    body: 'Free-form — anything about the eval system, the classification tree, the level definitions, the program-generation downstream that you think we should know NOW before we build it.',
    options: [],
  },
];

let row = 3;
layeringQuestions.forEach((q, idx) => {
  s5.mergeCells(`B${row}:C${row}`);
  const t = s5.getCell(`B${row}`);
  t.value = q.title;
  styleSectionTitle(t, idx % 2 === 0 ? COLOR.blueAccent : COLOR.purple);
  s5.getRow(row).height = 22;
  row++;

  s5.mergeCells(`B${row}:C${row}`);
  const b = s5.getCell(`B${row}`);
  b.value = q.body;
  b.font = { color: { argb: COLOR.text }, size: 11 };
  b.alignment = { vertical: 'top', wrapText: true };
  s5.getRow(row).height = 50;
  row++;

  if (q.options.length) {
    s5.mergeCells(`B${row}:C${row}`);
    const o = s5.getCell(`B${row}`);
    o.value = q.options.join('\n');
    o.font = { color: { argb: COLOR.text }, size: 10 };
    o.alignment = { vertical: 'top', wrapText: true };
    s5.getRow(row).height = 18 * q.options.length + 6;
    row++;
  }

  // Answer cell
  const ansLabel = s5.getCell(`B${row}`);
  ansLabel.value = 'Your answer:';
  ansLabel.font = { bold: true, color: { argb: COLOR.text }, size: 11 };
  ansLabel.alignment = { vertical: 'top' };

  const ans = s5.getCell(`C${row}`);
  ans.value = '';
  styleFillIn(ans);
  s5.getRow(row).height = 70;
  row += 2;  // blank gap before next question
});

// ═══════════════════════════════════════════════════════════════════════════
// Sheet 6 — Cell Norms (scratch, optional)
// ═══════════════════════════════════════════════════════════════════════════
const s6 = wb.addWorksheet('Cell Norms (optional)');
const ageBands = ['18-24', '25-29', '30-39', '40-49', '50-59', '60+'];
const levels = ['Beginner A', 'Beginner B', 'Intermediate A', 'Intermediate B', 'Pro', 'Elite'];

s6.columns = [
  { width: 4 },
  { width: 18 },
  { width: 10 },
  ...ageBands.map(() => ({ width: 16 })),
];

s6.mergeCells(`A1:${String.fromCharCode(67 + ageBands.length)}1`);
styleHeader(s6.getCell('A1'), COLOR.blueDark);
s6.getCell('A1').value = 'Cell Norms — OPTIONAL scratch pad';
s6.getRow(1).height = 26;

s6.mergeCells(`B3:${String.fromCharCode(67 + ageBands.length)}3`);
const note = s6.getCell('B3');
note.value = 'OPTIONAL. If you have rough intuition about expected eval grades for a given (level, gender, age band), jot it here. Format whatever you like — a target push-up count, an average grade, a note like "rare". Skip cells you do not have a feel for. The structure (6 levels × 2 genders × 6 age bands = 72 cells) is finalized; only the contents are blank.';
note.font = { italic: true, color: { argb: COLOR.text }, size: 10 };
note.alignment = { vertical: 'top', wrapText: true };
s6.getRow(3).height = 60;

let r = 5;
['Female', 'Male'].forEach(gender => {
  // Gender header band
  s6.mergeCells(`B${r}:${String.fromCharCode(67 + ageBands.length)}${r}`);
  styleSectionTitle(s6.getCell(`B${r}`), gender === 'Female' ? COLOR.blueAccent : COLOR.purple);
  s6.getCell(`B${r}`).value = `${gender}`;
  s6.getRow(r).height = 22;
  r++;

  // Column headers (age bands)
  s6.getCell(`B${r}`).value = 'Level';
  s6.getCell(`C${r}`).value = '';
  ageBands.forEach((band, i) => {
    const c = s6.getCell(String.fromCharCode(68 + i) + r);
    c.value = band;
    styleHeader(c, COLOR.blueAccent);
  });
  styleHeader(s6.getCell(`B${r}`), COLOR.blueAccent);
  s6.getRow(r).height = 22;
  r++;

  // Level rows
  levels.forEach(level => {
    const lvlCell = s6.getCell(`B${r}`);
    lvlCell.value = level;
    lvlCell.font = { bold: true, color: { argb: COLOR.text }, size: 11 };
    lvlCell.alignment = { vertical: 'middle' };
    lvlCell.border = allBorders;
    ageBands.forEach((_, i) => {
      const c = s6.getCell(String.fromCharCode(68 + i) + r);
      styleFillIn(c);
    });
    s6.getRow(r).height = 28;
    r++;
  });
  r += 1; // gap between gender blocks
});

// ─── Write file ───
await wb.xlsx.writeFile(OUT);
console.log('Wrote', OUT);
