// Generates the "as implemented" exercise-bank workbook for Elie's sign-off (v2.13
// release obligation) — the bank exactly as the program generator uses it, plus the
// open domain questions from the v2.13 review (M1, M5, E1-E3).
// Re-run whenever src/exerciseBank.js is regenerated (then bump EXERCISE_BANK_VERSION
// and re-send to Elie).
// Run from repo root: node docs/superpowers/artifacts/2026-07-13-program-generation/build-exercise-bank-xlsx.mjs
import ExcelJS from 'exceljs';
const bankUrl = new URL('../../../../src/exerciseBank.js', import.meta.url).href;
const { EXERCISES, EXERCISE_BANK_VERSION } = await import(bankUrl);

// Same pattern as scripts/build_exercise_bank.py REAR_DELT_PAT — used only to FLAG
// which rows were reclassified Shoulders→Rear Delts so Elie can confirm each one.
const REAR_DELT_PAT = /rear delt|bent-over lateral raise|bent over lateral raise|w raise/i;

const SLOT_LABEL = { push: 'Push day', pull: 'Pull day', legs: 'Legs day' };
const SLOT_ORDER = { push: 0, pull: 1, legs: 2 };

const wb = new ExcelJS.Workbook();

// ── Read Me ──
const readme = wb.addWorksheet('Read Me');
const readmeLines = [
  `Exercise bank as implemented in the app (bank version ${EXERCISE_BANK_VERSION}) — generated ${new Date().toISOString().slice(0, 10)}`,
  '',
  `Source: your exercises list (2026-07-13). ${EXERCISES.length} exercises total after de-duplication.`,
  'This is EXACTLY what the program generator picks from. Please review and sign off.',
  '',
  'COLUMNS on the "Exercise Bank" sheet:',
  '  Day — which training day the exercise can be programmed on (Push / Pull / Legs).',
  '  Counts toward — the muscle-group quota it fills (Chest, Back, Legs, or a minor like Biceps).',
  '  Type — compound (multi-joint) or isolation (single-joint), detected from the movement name.',
  '  Advanced — high-skill barbell/deficit/plyometric lifts hidden from Beginner A/B programs',
  '             (except the three 1RM anchor lifts, which always stay).',
  '  Note — anything we changed or need you to confirm (e.g. rear-delt reclassification).',
  '',
  'The "Excluded (prehab)" sheet lists exercises the generator never programs automatically',
  '(rotator cuff / psoas / serratus work) — confirm these should stay manual-only.',
  '',
  'The "Questions" sheet has the open decisions from the release review — please answer each.',
  '',
  'Reply with corrections; we regenerate the bank and bump its version. Programs already',
  'generated keep their frozen exercises — only NEW programs use the corrected bank.',
];
readmeLines.forEach((line, i) => { readme.getCell(i + 1, 1).value = line; });
readme.getRow(1).font = { bold: true };
readme.getColumn(1).width = 110;

// ── Exercise Bank (programmable) ──
const bank = wb.addWorksheet('Exercise Bank');
bank.addRow(['Exercise', 'Day', 'Counts toward', 'Type', 'Primary muscle', 'All muscles', 'Advanced', 'Note']);
bank.getRow(1).font = { bold: true };
const programmable = EXERCISES.filter(e => e.slot)
  .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.bucket.localeCompare(b.bucket) || a.name.localeCompare(b.name));
for (const e of programmable) {
  const note = (e.primary === 'Rear Delts' && REAR_DELT_PAT.test(e.name))
    ? 'Reclassified from generic "Shoulders" to Rear Delts by name — confirm'
    : '';
  bank.addRow([e.name, SLOT_LABEL[e.slot], e.bucket, e.type, e.primary, e.muscles.join(', '), e.advanced ? 'YES' : '', note]);
}
bank.columns = [{ width: 42 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 16 }, { width: 40 }, { width: 10 }, { width: 55 }];
bank.views = [{ state: 'frozen', ySplit: 1 }];

// ── Excluded (prehab) ──
const excl = wb.addWorksheet('Excluded (prehab)');
excl.getCell('A1').value = 'Never auto-programmed — prehab/stability work stays coach-prescribed. Confirm.';
excl.getRow(1).font = { italic: true };
excl.addRow([]);
excl.addRow(['Exercise', 'Primary muscle', 'All muscles']);
excl.getRow(3).font = { bold: true };
for (const e of EXERCISES.filter(e => !e.slot).sort((a, b) => a.primary.localeCompare(b.primary) || a.name.localeCompare(b.name))) {
  excl.addRow([e.name, e.primary, e.muscles.join(', ')]);
}
excl.columns = [{ width: 42 }, { width: 16 }, { width: 40 }];

// ── Questions ──
const q = wb.addWorksheet('Questions');
q.addRow(['#', 'Question', 'Your answer']);
q.getRow(1).font = { bold: true };
const QUESTIONS = [
  ['Q1 (bank)', 'Your xlsx had "Upright Row" twice — once under Shoulders, once under Chest. We kept the SHOULDERS version (it counts toward the Shoulders quota on Push day). Correct? Or should it be somewhere else (some coaches treat upright rows as traps/rear-delt work)?'],
  ['Q2 (bank)', 'Rear-delt movements arrived labeled as generic "Shoulders". We moved the name-matched ones (rear delt raises, bent-over lateral raises, W raises) to a separate REAR DELTS group on PULL day — see the flagged rows on the Exercise Bank sheet. Confirm each, and tell us if any other exercise belongs there.'],
  ['Q3 (programming)', 'In a default program, Deadlift can appear TWICE a week: as the 1RM anchor on Pull day AND again as an accessory on Legs day. Intended, or should the generator never program Deadlift twice in the same week?'],
  ['Q4 (Arabic)', 'The "Do or die" method is currently shown in Arabic as "حتى الإجهاد". If it means training to failure, the gym-standard term is "حتى الفشل". Which do you want?'],
  ['Q5 (Arabic)', 'Day headers in the Arabic app currently show دفع / سحب / أرجل. Lebanese gyms often keep the English terms (Push / Pull / Legs) even in Arabic. Keep the Arabic words, or switch to English terms?'],
  ['Q6 (Arabic)', 'Small Arabic polish choices: (a) percent sign ٪ vs % after numbers; (b) "تدريب دائري" for circuit training — OK?; (c) plural agreement on counts like "11+ تكرارات". Any preferences, or leave to us?'],
];
QUESTIONS.forEach(([id, text]) => {
  const row = q.addRow([id, text, '']);
  row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
});
q.columns = [{ width: 16 }, { width: 90 }, { width: 40 }];

// Plain relative path — run from repo root (URL-pathname breaks on Windows drive letters)
await wb.xlsx.writeFile('docs/superpowers/artifacts/2026-07-13-program-generation/PT-Exercise-Bank-As-Implemented.xlsx');
console.log(`Written: PT-Exercise-Bank-As-Implemented.xlsx — ${programmable.length} programmable + ${EXERCISES.length - programmable.length} prehab exercises`);
