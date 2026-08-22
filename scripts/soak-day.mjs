// The Phase-1 soak day: MIRROR, then VERIFY. Run this daily, not the gate alone.
//
// 🔴 WHY THIS FILE EXISTS, AND IT IS A DESIGN CORRECTION, NOT A CONVENIENCE.
//    Found 2026-08-22: `sanity-live-supabase-diff.mjs` had failed on every one
//    of its 34 runs across two days — 0 clean days out of the 7 the plan
//    requires. Nothing was broken and no record was ever lost. The cause is
//    that the gate was being asked a question Phase 1 cannot answer:
//
//      · `mirror-to-supabase.mjs` is a MANUAL one-way script run from Pierre's
//        laptop. The app does NOT dual-write — that is Phase 2, not yet built.
//      · GitHub is live and moves whenever Elie or Pierre touches the app.
//      · So Postgres is stale the moment anyone uses their phone, and the gate
//        correctly reports a difference that means only "the mirror has not run
//        since the last edit".
//
//    The last failure, diffed field by field, was exactly that: ONE session
//    (`sessions:5tghmqu`), two fields — `_modified`, and a `focus: []` that
//    review finding P3 writes into live records. Every collection count matched
//    on both sides: 21 clients, 514 sessions, 2 evaluations, 1 program.
//
// 🔴 WHAT A SOAK IS ACTUALLY FOR, which is the part worth keeping straight:
//    a soak proves that TWO INDEPENDENT WRITERS agree. In Phase 1 there is only
//    one writer, so the only honest daily claim is "the copy is faithful" — and
//    the mirror's own byte-identical read-back is what proves that. This script
//    makes both halves one operation, so they cannot drift apart in time and be
//    reported as a divergence.
//
// 🔴 THE GATE ITSELF IS UNCHANGED AND STAYS EXACTLY AS STRICT. The day
//    dual-write lands, `sanity-live-supabase-diff.mjs` run ALONE becomes the
//    real soak, and it is still what must be green before any cutover. Nothing
//    here weakens it; this only stops Phase 1 reporting staleness as divergence.
//
// Run:  node scripts/soak-day.mjs [--email <coach@example.com>]
//
// Exit 0 = mirrored and verified.
//      1 = the mirror failed, or the two stores really do disagree AFTER a
//          fresh mirror — which in Phase 1 means the mirror itself ate
//          something. STOP.
//      2 = the comparison did not happen (no instance configured, or GitHub
//          moved under the read). NOT a pass.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const KEYFILE = 'C:/projects/_archive/PTApp/supabase-spotset.env';
const args = process.argv.slice(2);

function keys() {
  try {
    const out = {};
    for (const line of readFileSync(KEYFILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch { return {}; }
}

// 🔴 THE COACH IS LOOKED UP FROM THE DATABASE, NOT REMEMBERED IN A FILE.
//    The mirror needs an email and the daily job should not depend on anyone
//    recalling which one. Postgres already knows — there is exactly one tenant
//    in Phase 1 — and asking it means this can never quietly mirror the WRONG
//    coach once a second is provisioned. More than one and it refuses rather
//    than guessing, which is the same rule the gate itself applies.
async function coachEmail() {
  const k = keys();
  const url = process.env.SUPABASE_URL || k.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || k.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { err: 'no instance configured — create ' + KEYFILE };
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const t = await fetch(`${url}/rest/v1/tenants?select=coach_id`, { headers: h });
  if (!t.ok) return { err: `could not read tenants: ${t.status}` };
  const rows = await t.json();
  if (rows.length === 0) return { err: 'no tenant yet — run scripts/mirror-to-supabase.mjs --email <coach> once' };
  if (rows.length > 1) return { err: `${rows.length} tenants exist; name the one to mirror with --email` };
  // The email lives in `auth.users`, which PostgREST does not expose — by
  // design, and correctly. `app_users` carries role, path and name only. So the
  // lookup goes through the GoTrue admin endpoint with the service key, which
  // is the same key this script already needs and never leaves the laptop.
  const u = await fetch(`${url}/auth/v1/admin/users/${rows[0].coach_id}`, { headers: h });
  if (!u.ok) return { err: `could not read the coach from auth: ${u.status}` };
  const user = await u.json();
  return user && user.email
    ? { email: user.email }
    : { err: 'the tenant coach has no email in auth.users' };
}

const emailIdx = args.indexOf('--email');
let email = emailIdx >= 0 ? args[emailIdx + 1] : null;
if (!email) {
  const r = await coachEmail();
  if (r.err) {
    console.error(`\n✗ Cannot start the soak day: ${r.err}\n`);
    process.exit(2);
  }
  email = r.email;
  console.log(`Coach resolved from the database: ${email}`);
}

const run = (label, file, extra = []) => {
  console.log(`\n\u2500\u2500 ${label} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  // 🔴 SOAK_DRIVER is what makes this run COUNT. The gate logs it, and
  //    soak-status only counts runs it drove — see the note in soak-status.mjs.
  const r = spawnSync(process.execPath, [file, ...extra], {
    stdio: 'inherit',
    env: { ...process.env, SOAK_DRIVER: 'soak-day' },
  });
  return r.status === null ? 1 : r.status;
};

// 1. Bring the mirror up to date. Its own final step reads the blob back out of
//    Postgres and asserts it is byte-identical — that assertion IS the Phase-1
//    claim, and if it fails nothing downstream is worth running.
if (run('mirror', 'scripts/mirror-to-supabase.mjs', ['--email', email]) !== 0) {
  console.error('\n✗ The mirror did not complete. STOP — do not record a soak day.');
  process.exit(1);
}

// 2. Verify with the unchanged gate. After a fresh mirror a difference here is
//    a REAL one: either the mirror dropped something, or a device pushed during
//    the run — which the gate detects as read skew and reports as exit 2, never
//    as a divergence.
const verified = run('verify', 'scripts/sanity/sanity-live-supabase-diff.mjs');

// No log line of our own: the gate already appends one, and a second entry with
// a different shape would quietly break `soak-status.mjs`, which parses that
// file. One writer per log.
const verdict = verified === 0 ? 'clean' : verified === 2 ? 'did-not-run' : 'DIVERGED';
console.log(`\n── soak day: ${verdict} ──`);

if (verified === 2) {
  console.log('A device pushed while this ran. Re-run — this day does not count until it is clean.');
}
if (verified === 1) {
  console.error(`
🔴 STOP THE LINE. This ran the mirror FIRST, so staleness is ruled out: the two
   stores disagree about content the mirror had just written. Understand it
   before re-running. Do not cut over.`);
}
process.exit(verified);
