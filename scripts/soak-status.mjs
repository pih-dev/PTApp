// "How many consecutive clean soak days do we actually have?"
//
// 🔴 WHY THIS EXISTS AT ALL:
//    Phase 3 is gated on SEVEN CONSECUTIVE CLEAN DAYS of
//    sanity-live-supabase-diff.mjs. That is a claim about history — and a
//    terminal session is not history. Pierre clears context several times a
//    day, so a result that lived only in a transcript is a result nobody can
//    audit on day 6, and "I think it's been about a week" is exactly the kind
//    of sentence this project's gates exist to make impossible.
//
//    So the gate appends every run to C:/projects/_archive/PTApp/soak-log.jsonl
//    (outside the repo — pih-dev/PTApp is public and the counts are the PT's
//    business data), and this reads it back. The log is the evidence; the chat
//    is not.
//
// Run: node scripts/soak-status.mjs
//
// Exit 0 always — this reports, it does not gate. The gate is the other script.

import { readFileSync, existsSync } from 'node:fs';

const LOG = 'C:/projects/_archive/PTApp/soak-log.jsonl';
const NEEDED = 7;

if (!existsSync(LOG)) {
  console.log(`No soak log yet at ${LOG}.\nRun: node scripts/sanity/sanity-live-supabase-diff.mjs`);
  process.exit(0);
}

const runs = readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map(l => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

if (!runs.length) { console.log('Soak log is empty.'); process.exit(0); }

// 🔴 ONLY DRIVEN RUNS COUNT TOWARD THE STREAK (added 2026-08-22).
//    In Phase 1 the app does not dual-write, so a bare `sanity-live-supabase-diff`
//    compares GitHub against a mirror that may be hours stale. Those runs fail
//    for a reason that is NOT a divergence, and counting them meant the streak
//    could never leave 0 — it sat at 0/7 across 34 runs and two days while
//    nothing at all was wrong. A run counts only if it was driven by
//    `scripts/soak-day.mjs`, which mirrors and then verifies as one operation.
//    Entries written before that distinction existed have no `driver` field and
//    are treated as ad-hoc, which is what they were.
//
// One verdict per calendar day: a day counts as clean only if EVERY DRIVEN run
// that day was clean. Re-running until it passes is explicitly forbidden by the
// gate's own header, so a day with one driven failure is a broken day even if a
// later driven run that day was green.
const isDriven = (r) => r.driver === 'soak-day' || r.driver === 'phase2';
const byDay = new Map();
for (const r of runs) {
  const prev = byDay.get(r.date) || { date: r.date, ok: null, runs: 0, adhoc: 0, last: null };
  const driven = isDriven(r);
  byDay.set(r.date, {
    date: r.date,
    ok: driven ? (prev.ok === null ? true : prev.ok) && r.ok : prev.ok,
    runs: prev.runs + (driven ? 1 : 0),
    adhoc: prev.adhoc + (driven ? 0 : 1),
    last: driven ? r : prev.last,
  });
}
// A day with no driven run at all is a day the soak did not happen.
for (const [k, v] of byDay) if (v.ok === null) byDay.set(k, { ...v, ok: false });
const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

// Consecutive means consecutive CALENDAR days, not consecutive log entries — a
// gap is a day the check did not run, and a day that did not run cannot count
// toward a soak that is measuring elapsed exposure to real traffic.
const dayNum = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86400000);
let streak = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (!days[i].ok) break;
  if (i < days.length - 1 && dayNum(days[i + 1].date) - dayNum(days[i].date) !== 1) break;
  streak++;
}

const now = new Date();
const p = (x) => String(x).padStart(2, '0');
const today = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
const coveredToday = byDay.has(today);

const lastAny = (date) => [...runs].reverse().find(r => r.date === date);
const fmt = (r) => (r
  ? `${r.counts.clients}c/${r.counts.sessions}s  v${r.tenantVersion}  ${r.ghSha}`
  : '—');

console.log(`Soak log: ${runs.length} run(s) across ${days.length} day(s) — ${LOG}\n`);
for (const d of days.slice(-10)) {
  console.log(`  ${d.ok ? '✓' : '✗'} ${d.date}  ${String(d.runs).padStart(2)} soak-day run(s)` +
    `${d.adhoc ? ` (+${d.adhoc} ad-hoc)` : '              '}  ` +
    // `last` is the last DRIVEN run, which is what the verdict is about. A day
    // with only ad-hoc runs has none, so fall back to the last run of any kind
    // for the display — the counts are still the useful thing to see, and a
    // crash here would take out the whole status report over a cosmetic line.
    `${fmt(d.last || lastAny(d.date))}`);
}
console.log('');
console.log(`Consecutive clean days: ${streak} / ${NEEDED}`);
console.log(coveredToday ? '  today: checked' : '  🔴 today: NOT checked yet — run the gate');

if (streak >= NEEDED && coveredToday) {
  console.log(`\n✓ The Phase-3 soak gate is satisfied. The OTHER gates still apply:
  a byte-verified _archive snapshot, a tenant_snapshots row with reason='pre-migration',
  and BOTH phones confirmed on the new build before anything cuts over.`);
} else {
  console.log(`\n${NEEDED - streak} more clean day(s) before Phase 3 may be considered.`);
}
