// Sanity script: asserts computeSlidingWindow output against known cases.
// Run: node tmp/sanity-slidingwindow.mjs
// Delete after v2.9 ships.
import { computeSlidingWindow } from '../src/utils.js';

const cases = [
  // Month N — anchored day-of-month
  { anchor: '2026-03-02', unit: 'month', value: 1, ref: '2026-04-20',
    expected: { start: '2026-04-02', end: '2026-05-01' }, label: 'Month/1 anchor Mar 2, ref Apr 20' },
  { anchor: '2026-03-02', unit: 'month', value: 1, ref: '2026-03-02',
    expected: { start: '2026-03-02', end: '2026-04-01' }, label: 'Month/1 anchor Mar 2, ref Mar 2 (exact anchor)' },
  { anchor: '2026-01-31', unit: 'month', value: 1, ref: '2026-02-15',
    expected: { start: '2026-01-31', end: '2026-02-27' }, label: 'Month/1 anchor Jan 31, ref Feb 15 (still in Jan 31 window)' },
  { anchor: '2026-01-31', unit: 'month', value: 1, ref: '2026-03-01',
    expected: { start: '2026-02-28', end: '2026-03-30' }, label: 'Month/1 anchor Jan 31, ref Mar 1 (clamped Feb 28 window)' },
  { anchor: '2026-03-02', unit: 'month', value: 2, ref: '2026-04-15',
    expected: { start: '2026-03-02', end: '2026-05-01' }, label: 'Month/2 anchor Mar 2, ref Apr 15' },
  { anchor: '2026-03-02', unit: 'month', value: 2, ref: '2026-05-10',
    expected: { start: '2026-05-02', end: '2026-07-01' }, label: 'Month/2 anchor Mar 2, ref May 10' },

  // Week N
  { anchor: '2026-04-01', unit: 'week', value: 1, ref: '2026-04-10',
    expected: { start: '2026-04-08', end: '2026-04-14' }, label: 'Week/1 anchor Apr 1, ref Apr 10' },
  { anchor: '2026-04-01', unit: 'week', value: 2, ref: '2026-04-10',
    expected: { start: '2026-04-01', end: '2026-04-14' }, label: 'Week/2 anchor Apr 1, ref Apr 10' },

  // Day N
  { anchor: '2026-04-01', unit: 'day', value: 15, ref: '2026-04-20',
    expected: { start: '2026-04-16', end: '2026-04-30' }, label: 'Day/15 anchor Apr 1, ref Apr 20' },
];

let passed = 0, failed = 0;
for (const c of cases) {
  const got = computeSlidingWindow(c.anchor, c.unit, c.value, c.ref);
  const ok = got.start === c.expected.start && got.end === c.expected.end;
  if (ok) { passed++; console.log('✓', c.label); }
  else { failed++; console.error('✗', c.label, '\n  expected', c.expected, '\n  got', got); }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
