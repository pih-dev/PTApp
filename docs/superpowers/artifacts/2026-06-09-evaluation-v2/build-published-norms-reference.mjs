// Builds the PT-facing PUBLISHED-NORMS REFERENCE workbook (read-only reference).
// Run: node docs/superpowers/artifacts/2026-06-09-evaluation-v2/build-published-norms-reference.mjs
// Output: docs/superpowers/artifacts/2026-06-09-evaluation-v2/PT-Eval-PUBLISHED-NORMS-Reference.xlsx
//
// Companion to PT-Eval-Tests-Template.xlsx. This file is NOT filled in by the PT — it shows the
// REAL published norms (verbatim, cited) plus the decisions he must make, so he can then fill the
// input template with his final choices. Data + citations from norms-research-findings.md.
// Requires exceljs (npm install --no-save exceljs).

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, 'PT-Eval-PUBLISHED-NORMS-Reference.xlsx');

const C = {
  blueDark: 'FF1E3A8A', blueAccent: 'FF2563EB',
  greenBg: 'FFD1FAE5', amberBg: 'FFFEF3C7', redBg: 'FFFEE2E2',
  green: 'FF10B981', amber: 'FFF59E0B', red: 'FFEF4444',
  greyText: 'FF64748B', greyBorder: 'FFCBD5E1', white: 'FFFFFFFF', text: 'FF0F172A',
};
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thin = { style: 'thin', color: { argb: C.greyBorder } };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
const H = (cell, bg = C.blueDark, size = 12) => {
  cell.font = { bold: true, color: { argb: C.white }, size };
  cell.fill = fill(bg); cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = borders;
};
const body = (cell, opt = {}) => {
  cell.font = { color: { argb: opt.color || C.text }, size: opt.size || 11, bold: !!opt.bold, italic: !!opt.italic };
  cell.alignment = { vertical: opt.v || 'top', horizontal: opt.h || 'left', wrapText: true };
  cell.border = borders;
  if (opt.bg) cell.fill = fill(opt.bg);
};

const wb = new ExcelJS.Workbook();
wb.creator = 'PTApp brainstorm — Pierre + Claude';
wb.created = new Date('2026-06-09');
wb.title = 'PTApp Evaluation — Published Norms Reference';

// ───────────────────────────── Sheet: Summary ─────────────────────────────
const sm = wb.addWorksheet('START HERE', { views: [{ state: 'frozen', ySplit: 1 }] });
sm.columns = [{ width: 4 }, { width: 22 }, { width: 44 }, { width: 50 }];
sm.mergeCells('A1:D1'); H(sm.getCell('A1'), C.blueDark, 14);
sm.getCell('A1').value = 'Published Norms — Reference & Decisions (read me first)';
sm.getRow(1).height = 28;

const blurb = [
  '',
  'This file shows the REAL, published fitness norms for your 5 evaluation tests — with sources.',
  'It is NOT the file you fill in. It is here to help you decide. After reading it, fill your final',
  'choices into the other file (PT-Eval-Tests-Template.xlsx).',
  '',
  'Honest summary: only 2 of the 5 tests have solid published norms by age + gender. The other 3',
  'need a decision from you. The table below says what each test needs.',
  '',
];
blurb.forEach((line, i) => {
  sm.mergeCells(`B${i + 2}:D${i + 2}`);
  const c = sm.getCell(`B${i + 2}`);
  c.value = line; c.font = { color: { argb: C.text }, size: 11 };
  c.alignment = { vertical: 'top', wrapText: true };
  sm.getRow(i + 2).height = line === '' ? 8 : 18;
});

let r = blurb.length + 2;
['Test', 'Status', 'What you need to decide'].forEach((h, i) => H(sm.getRow(r).getCell(2 + i), C.blueAccent));
sm.getRow(r).height = 22;
const rows = [
  ['1. Push-up', '✅ Solid norms (CSEP/ACSM)', 'These norms are MAX REPS TO FAILURE (men full, women on knees) — NOT 30 seconds. Either adopt the to-failure protocol so the norms apply, or keep 30s and give us your own numbers.', C.greenBg],
  ['2. Sit-and-reach', '✅ Solid norms (YMCA)', 'Norms are in INCHES with a specific zero-point (ruler 15" mark at the feet). Confirm you will use the YMCA box/protocol, or tell us your protocol + numbers.', C.greenBg],
  ['3. Bodyweight squat', '⚠️ Norms only for 60+', 'No published norm exists for a bodyweight squat under age 60. The only normed option is the 30-sec CHAIR-STAND (60+). Decide: use chair-stand for 60+ only, switch the whole test, or supply your own gym numbers.', C.amberBg],
  ['4. Pull-up', '❌ No civilian norm', 'No reliable age×gender norm exists; women’s norms are basically absent. Decide: drop pull-up from the charted set and track it as personal progress, or supply your own target numbers.', C.redBg],
  ['5. Lung capacity', '❌ Pick a tool first', 'You haven’t said how you’ll measure it. A cheap peak-flow meter (PEF) has real published norms (by height+age+sex). Breath-hold and balloon have none. Tell us the tool, then we can chart it.', C.redBg],
];
rows.forEach((row) => {
  r++;
  body(sm.getRow(r).getCell(2), { bold: true });
  sm.getRow(r).getCell(2).value = row[0];
  body(sm.getRow(r).getCell(3), { bg: row[3] });
  sm.getRow(r).getCell(3).value = row[1];
  body(sm.getRow(r).getCell(4));
  sm.getRow(r).getCell(4).value = row[2];
  sm.getRow(r).height = 64;
});

// generic categorized table renderer
function tableSheet(name, title, subtitle, protocol, source, headers, dataRows, legendNote, suggested) {
  const s = wb.addWorksheet(name);
  s.columns = [{ width: 4 }, { width: 20 }, ...headers.slice(1).map(() => ({ width: 12 }))];
  const lastCol = String.fromCharCode(66 + headers.length); // B + n
  s.mergeCells(`A1:${lastCol}1`); H(s.getCell('A1'), C.blueDark, 13);
  s.getCell('A1').value = title;
  s.getRow(1).height = 26;

  let row = 3;
  const note = (text, height, opt = {}) => {
    s.mergeCells(`B${row}:${lastCol}${row}`);
    const c = s.getCell(`B${row}`);
    c.value = text;
    c.font = { color: { argb: opt.color || C.text }, size: opt.size || 11, bold: !!opt.bold, italic: opt.italic !== false };
    c.alignment = { vertical: 'top', wrapText: true };
    s.getRow(row).height = height;
    row++;
  };
  note(subtitle, 18, { italic: false, bold: true, color: C.blueAccent });
  note('PROTOCOL: ' + protocol, 46);
  note('SOURCE: ' + source, 32, { color: C.greyText, size: 10 });
  row++;

  // header
  headers.forEach((h, i) => H(s.getRow(row).getCell(2 + i), C.blueAccent, 10));
  s.getRow(row).height = 30;
  row++;

  // data
  dataRows.forEach((dr) => {
    const rowObj = s.getRow(row);
    dr.forEach((val, i) => {
      const cell = rowObj.getCell(2 + i);
      cell.value = val;
      const bg = (i === 0) ? null
        : /Excellent|Very good|Good\b/i.test(dr[0]) ? C.greenBg
        : /Average|Above|Fair/i.test(dr[0]) ? C.amberBg
        : /Poor|Needs|Below/i.test(dr[0]) ? C.redBg : null;
      body(cell, { bg, bold: i === 0, h: i === 0 ? 'left' : 'center' });
    });
    rowObj.height = 18;
    row++;
  });
  row++;
  if (legendNote) note(legendNote, 50, { color: C.greyText, size: 10 });
  if (suggested) {
    s.mergeCells(`B${row}:${lastCol}${row}`);
    H(s.getCell(`B${row}`), C.amber, 11);
    s.getCell(`B${row}`).value = 'SUGGESTED 3-band cut for the app (our proposal — you can move the lines)';
    s.getRow(row).height = 20; row++;
    note(suggested, 64, { italic: false });
  }
  return s;
}

// ───────────────────────── Push-up sheet ─────────────────────────
tableSheet(
  'Push-up Norms',
  'Push-up — published norms (reps)',
  'Upper-body muscular endurance. The one set of real ACSM/CSEP numbers (two common web tables are fakes — see Sources tab).',
  'MAX REPS TO FAILURE — not timed. Men = standard (on toes). Women = modified (on knees). The men/women columns assume those two DIFFERENT positions. Down = chest to fist/block; up = full lockout.',
  'CSEP-PATH Resource Manual 2nd ed. (2019) — same table ACSM reproduces.',
  ['Category', '20-29 M', '20-29 W', '30-39 M', '30-39 W', '40-49 M', '40-49 W', '50-59 M', '50-59 W', '60-69 M', '60-69 W'],
  [
    ['Excellent',        '≥36','≥30','≥30','≥27','≥25','≥24','≥21','≥21','≥18','≥17'],
    ['Very good',        '29-35','21-29','22-29','20-26','17-24','15-23','13-20','11-20','11-17','12-16'],
    ['Good',             '22-28','15-20','17-21','13-19','13-16','11-14','10-12','7-10','8-10','5-11'],
    ['Fair',             '17-21','10-14','12-16','8-12','10-12','5-10','7-9','2-6','5-7','2-4'],
    ['Needs improvement','≤16','≤9','≤11','≤7','≤9','≤4','≤6','≤1','≤4','≤1'],
  ],
  'AGE BANDS: source uses 20-29 (no 18-24/25-29 split). For ages 18-19 a separate 15-19 band exists '
  + '(M: Excellent ≥39, Good 23-28, Fair 18-22; W: Excellent ≥33, Good 18-24, Fair 12-17). '
  + 'Suggest: treat 18-19 with the 15-19 band, otherwise use 20-29 for your 18-24 and 25-29 bands.',
  'We collapse the 5 categories into your 3 like this: Below Average = Fair + Needs improvement · '
  + 'Average = Good · Good = Very good + Excellent. So "Average starts at" = the Good-row low number, '
  + '"Good starts at" = the Very-good-row low number. e.g. Men 20-29: Average ≥22, Good ≥29. '
  + 'Women 20-29: Average ≥15, Good ≥21. (Reminder: only valid if you test to failure, not 30s.)'
);

// ───────────────────────── Sit-and-reach sheet ─────────────────────────
tableSheet(
  'Sit-and-Reach Norms',
  'Sit-and-reach — published norms (INCHES)',
  'Flexibility (hamstrings / lower back). Values are inches on a ruler whose 15" mark is at the feet.',
  'Sit, feet 12" apart, heels on baseline, legs straight, reach forward, hold 2s, best of 3. ZERO-POINT: ruler 15" mark aligned at the feet — so ~15 = fingertips at the feet line; >15 = reaching past the toes. To convert to "cm past toes": (reading − 15) × 2.54.',
  'YMCA Trunk Flexion norms — Morrow et al., Measurement and Evaluation in Human Performance (2015) p.222.',
  ['Category', '18-25 M', '18-25 W', '26-35 M', '26-35 W', '36-45 M', '36-45 W', '46-55 M', '46-55 W', '56-65 M', '56-65 W', '66+ M', '66+ W'],
  [
    ['Excellent',     '22-28','24-29','21-28','23-28','21-28','22-28','19-26','21-27','17-24','20-26','17-24','20-26'],
    ['Good',          '20-21','22','19','21-22','18-19','20-21','16-18','19-20','15-16','18-19','14-16','18-19'],
    ['Above average', '18-19','20-21','17','20','16-17','18-19','14-15','17-18','13','16-17','12-13','17'],
    ['Average',       '16-17','19','15-16','18-19','15','17','12-13','16','11','15','10-11','15-16'],
    ['Below average', '14-15','17-18','13-14','16-17','13','15-16','10-11','14','9','13-14','8-9','13-14'],
    ['Poor',          '12-13','16','11-12','14-15','9-11','13-14','8-9','12-13','6-8','10-12','6-7','10-12'],
    ['Very poor',     '2-11','7-14','2-9','5-13','1-7','4-12','1-6','3-10','1-5','2-9','0-4','1-9'],
  ],
  'AGE BANDS: YMCA uses 18-25 / 26-35 / 36-45 / 46-55 / 56-65 / 66+. Closest match to your wish for '
  + 'an 18-24 / 25-29 split, but the break is at 25/26. Map your 18-24 → 18-25; 25-29 → split (25 uses '
  + '18-25, 26-29 uses 26-35); 30-39 ≈ 26-35 & 36-45.',
  'We collapse the 7 categories into your 3: Below Average = Very poor + Poor + Below average · '
  + 'Average = Average + Above average · Good = Good + Excellent. So "Average starts at" = the '
  + 'Average-row low number, "Good starts at" = the Good-row low number. e.g. Men 18-25: Average ≥16", '
  + 'Good ≥20". Women 18-25: Average ≥19", Good ≥22".'
);

// ───────────────────────── Squat / chair-stand sheet ─────────────────────────
const sq = wb.addWorksheet('Squat (60+ only)');
sq.columns = [{ width: 4 }, { width: 16 }, { width: 22 }, { width: 22 }, { width: 40 }];
sq.mergeCells('A1:E1'); H(sq.getCell('A1'), C.blueDark, 13);
sq.getCell('A1').value = 'Bodyweight squat / lower-body endurance';
sq.getRow(1).height = 26;
let sr = 3;
const sqNote = (txt, h, opt = {}) => {
  sq.mergeCells(`B${sr}:E${sr}`); const c = sq.getCell(`B${sr}`);
  c.value = txt; c.font = { color: { argb: opt.color || C.text }, size: opt.size || 11, bold: !!opt.bold, italic: opt.italic !== false };
  c.alignment = { vertical: 'top', wrapText: true }; sq.getRow(sr).height = h; sr++;
};
sqNote('IMPORTANT: there is NO published norm for a bodyweight squat under age 60.', 18, { bold: true, italic: false, color: C.red });
sqNote('The only properly-normed lower-body option is the 30-second CHAIR-STAND test (stands from a '
  + 'chair, arms crossed, in 30s) — and it happens to be the only true 30-second test in your set. '
  + 'But it is validated for 60+ only.', 46);
sqNote('PROTOCOL: sit mid-chair, arms crossed on chest, feet flat. Count full stand→sit cycles in 30 seconds.', 30);
sqNote('SOURCE: Rikli & Jones, Senior Fitness Test (2002), n≈7,000 adults 60-94.', 22, { color: C.greyText, size: 10 });
sr++;
['Age', 'Men — Average range', 'Women — Average range'].forEach((h, i) => H(sq.getRow(sr).getCell(2 + i), C.blueAccent, 10));
sq.getRow(sr).height = 22; sr++;
[
  ['60-64', '14-19', '12-17'], ['65-69', '12-18', '11-16'], ['70-74', '12-17', '10-15'],
  ['75-79', '11-17', '10-15'], ['80-84', '10-15', '9-14'], ['85-89', '8-14', '8-13'], ['90-94', '7-12', '4-11'],
].forEach((row) => {
  row.forEach((v, i) => { const c = sq.getRow(sr).getCell(2 + i); c.value = v; body(c, { bg: i === 0 ? null : C.amberBg, bold: i === 0, h: i === 0 ? 'left' : 'center' }); });
  sq.getRow(sr).height = 18; sr++;
});
sr++;
sqNote('How to read: e.g. a 60-64 man — Below Average < 14 stands, Average 14-19, Above Average > 19. '
  + '(3 bands, not Below/Avg/Good — but maps cleanly: Below Average / Average / Above Average → your Below / Average / Good.)', 44, { color: C.greyText, size: 10 });
sqNote('DECISION: For under-60 clients, no validated squat norm exists. Options: (a) use chair-stand '
  + 'for 60+ only and track under-60 as personal progress; (b) give us your own gym target numbers per '
  + 'age/gender; (c) drop squat from the charted set.', 50, { bold: true, italic: false });

// ───────────────────────── Pull-up sheet ─────────────────────────
const pu = wb.addWorksheet('Pull-up');
pu.columns = [{ width: 4 }, { width: 100 }];
pu.mergeCells('A1:B1'); H(pu.getCell('A1'), C.blueDark, 13);
pu.getCell('A1').value = 'Pull-up — no reliable civilian norm';
pu.getRow(1).height = 26;
let pr = 2;
const puLine = (txt, h, opt = {}) => {
  const c = pu.getRow(pr).getCell(2);
  c.value = txt; c.font = { color: { argb: opt.color || C.text }, size: opt.size || 11, bold: !!opt.bold };
  c.alignment = { vertical: 'top', wrapText: true }; pu.getRow(pr).height = h; pr++;
};
puLine('Honest finding: there is NO well-sampled, age×gender published civilian norm table for pull-ups. '
  + 'Women’s norms are essentially absent (many tables list 0). The popular web "pull-up norms" table states '
  + 'outright it is "based on personal experience" — not science (see Sources tab).', 56);
puLine('', 8);
puLine('Only defensible published values are MILITARY (young, selected populations — not general norms):', 20, { bold: true });
puLine('  • USMC PFT (men), strict dead-hang, full ROM: max score = 23 reps; min to pass ~3-6 (age-dependent).', 28);
puLine('  • Women’s PFT allows pull-ups OR flexed-arm hang. US Army uses push-ups, so no pull-up norm.', 28);
puLine('', 8);
puLine('PROTOCOL if used: dead hang → chin clears bar → lower to full extension = 1 rep. Max to failure, no kipping.', 28);
puLine('', 8);
puLine('DECISION: suggest dropping pull-up from the charted set and tracking it as personal progress — or '
  + 'give us your own target numbers. For women, use the modified push-up for upper-body endurance.', 44, { bold: true });

// ───────────────────────── Lung capacity sheet ─────────────────────────
const lu = wb.addWorksheet('Lung Capacity');
lu.columns = [{ width: 4 }, { width: 22 }, { width: 30 }, { width: 22 }, { width: 30 }];
lu.mergeCells('A1:E1'); H(lu.getCell('A1'), C.blueDark, 13);
lu.getCell('A1').value = 'Lung capacity — pick a measurement tool first';
lu.getRow(1).height = 26;
lu.mergeCells('B3:E3');
lu.getCell('B3').value = 'You haven’t decided HOW to measure lung capacity. The choice decides whether real norms exist. '
  + 'Recommendation: a cheap peak-flow meter (PEF) is the only practical field tool WITH published reference values.';
lu.getCell('B3').font = { color: { argb: C.text }, size: 11 };
lu.getCell('B3').alignment = { vertical: 'top', wrapText: true };
lu.getRow(3).height = 40;
let lr = 5;
['Option', 'What it measures', 'Equipment', 'Published age/sex norms?'].forEach((h, i) => H(lu.getRow(lr).getCell(2 + i), C.blueAccent, 10));
lu.getRow(lr).height = 26; lr++;
[
  ['(a) Breath-hold time', 'CO₂ tolerance, NOT lung volume', 'Stopwatch (free)', 'NO usable norm. Studies show no real age/sex effect.', C.redBg],
  ['(b) Peak flow (PEF)', 'Max expiratory flow (L/min)', 'Peak-flow meter (~$20)', 'YES — Nunn & Gregg (1989), by height+age+sex. BEST field option.', C.greenBg],
  ['(c) Forced vital capacity', 'Actual lung volume (litres)', 'Spirometer (~$30-150)', 'YES — gold standard (GLI-2012 / NHANES), but needs device + technique.', C.greenBg],
  ['(d) Balloon method', 'Crude vital-capacity proxy', 'Balloon + ruler', 'NO published norm. Novelty only.', C.redBg],
  ['(e) VO₂max field test', 'Aerobic fitness, NOT lungs', 'Track / step + watch', 'YES for VO₂max (ACSM/Cooper) — but measures heart+aerobic, not lung capacity.', C.amberBg],
].forEach((row) => {
  for (let i = 0; i < 4; i++) { const c = lu.getRow(lr).getCell(2 + i); c.value = row[i]; body(c, { bg: i === 3 ? row[4] : null, bold: i === 0 }); }
  lu.getRow(lr).height = 40; lr++;
});

// ───────────────────────── Sources sheet ─────────────────────────
const so = wb.addWorksheet('Sources');
so.columns = [{ width: 4 }, { width: 100 }];
so.mergeCells('A1:B1'); H(so.getCell('A1'), C.blueDark, 13);
so.getCell('A1').value = 'Sources & honesty ledger';
so.getRow(1).height = 26;
let or2 = 3;
const soLine = (txt, h, opt = {}) => {
  const c = so.getRow(or2).getCell(2);
  c.value = txt; c.font = { color: { argb: opt.color || C.text }, size: opt.size || 10, bold: !!opt.bold };
  c.alignment = { vertical: 'top', wrapText: true }; so.getRow(or2).height = h; or2++;
};
soLine('USED (authoritative, read directly):', 18, { bold: true, color: C.green });
soLine('• Push-up — CSEP-PATH Resource Manual 2nd ed. (2019), via ACE Push-Up Assessment Protocol PDF. Same table ACSM reproduces.', 28);
soLine('   contentcdn.eacefitness.com/assets/certification/ace-answers/forms/pt/36_Push-up_Assessment_Protocol.pdf', 16, { color: C.greyText });
soLine('• Sit-and-reach — YMCA Trunk Flexion, in Morrow/Mood/Disch/Kang, Measurement & Evaluation in Human Performance (2015), p.222.', 28);
soLine('   ln.edu.hk/f/upload/55873/Measuring%20Flexibility.pdf', 16, { color: C.greyText });
soLine('• Chair stand (60+) — Rikli & Jones, Senior Fitness Test (2002).  topendsports.com/testing/tests/chair-stand.htm', 28);
soLine('• Pull-up anchors — USMC PFT/CFT standards.  fitness.marines.mil', 16);
soLine('• Peak flow — Nunn & Gregg (1989), BMJ.  en.wikipedia.org/wiki/Peak_expiratory_flow', 16);
soLine('• VO₂max (if used) — ACSM Guidelines / Cooper Institute FRIEND registry (cite ACSM directly).', 18);
soLine('', 10);
soLine('REJECTED (circulating online, NOT science — do not use):', 18, { bold: true, color: C.red });
soLine('• Topend Sports push-up table — claims "ACSM 11th ed" but numbers are ~2× inflated. Fabricated.', 18);
soLine('• Topend Sports pull-up table — states "based on personal experience". Not age-banded.', 18);
soLine('• Topend Sports sit-and-reach table — "personal experience", different zero-point. Not interchangeable with YMCA.', 18);
soLine('', 10);
soLine('All USED numbers were read from the named source, not paraphrased from search results.', 18, { italic: true, color: C.greyText });

await wb.xlsx.writeFile(OUT);
console.log('Wrote', OUT);
