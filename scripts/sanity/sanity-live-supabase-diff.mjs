// Sanity: the two stores agree. THE PHASE-2 SOAK GATE.
//
// Design record: docs/2026-08-21-multi-user-accounts-decision.md §5 step 2s, §6.
//
// 🔴 WHAT THIS IS FOR, AND WHY IT IS A STOP-THE-LINE RULE:
//    Phase 2 dual-writes every change to Postgres while GitHub stays
//    authoritative, and runs that way for SEVEN DAYS before anything cuts over.
//    This script is what makes those seven days mean something. Run it daily.
//    **Any unexplained divergence HALTS the plan until it is understood — it is
//    never worked around, never re-run until it passes, never explained by
//    "probably a timing thing".** A divergence here is exactly the class of bug
//    that eats records in Phase 3, where GitHub is no longer the safety net.
//
// 🔴 AND WHY IT COMPARES NORMALISED FORMS:
//    `data jsonb` does not preserve key order or whitespace, so raw byte
//    equality against GitHub is guaranteed to fail for reasons that mean
//    nothing. Both sides go through the ONE shared normaliser in
//    scripts/lib/normalize.mjs — read the comment there for the trap that
//    function exists to prevent, which cost a false green on the first run.
//
// Run: node scripts/sanity/sanity-live-supabase-diff.mjs
//
// Exit codes — three, deliberately:
//   0  the two stores agree.
//   1  they DIVERGE, or a read failed -> STOP. Do not deploy, do not cut over.
//   2  the comparison did not happen: no instance configured, or GitHub moved
//      under the read. NOT a pass — the suite loop treats it as a failure,
//      which is correct: a soak day that did not run is a soak day that did not
//      happen. But it is also NOT a divergence, and the difference is
//      load-bearing (see the read-skew note below).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { normalize, assertRealSize, counts, collectionsOf, gitBlobSha } from '../lib/normalize.mjs';

const KEYFILE = 'C:/projects/_archive/PTApp/supabase-spotset.env';
const REPO = 'makdissi-dev/ptapp-data';

function loadKeyFile() {
  try {
    const out = {};
    for (const line of readFileSync(KEYFILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch { return {}; }
}
const file = loadKeyFile();
const URL_ = process.env.SUPABASE_URL || file.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !SERVICE) {
  console.error(`
[live] SKIPPED — no instance configured. DO NOT CUT OVER.

  Create ${KEYFILE} with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
  That path is outside the repo on purpose; pih-dev/PTApp is public.

🔴 This is NOT a pass. Nothing was compared.
`);
  process.exit(2);
}

const api = (p) => fetch(`${URL_}${p}`, {
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
});

// ── GitHub side ─────────────────────────────────────────────────────────────
const gh = (a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let github, ghBytes, ghSha;
try {
  const meta = JSON.parse(gh(['api', `repos/${REPO}/contents/data.json`, '--jq', '{size:.size,sha:.sha}']));
  const raw = gh(['api', `repos/${REPO}/contents/data.json`, '-H', 'Accept: application/vnd.github.raw']);
  ghBytes = Buffer.byteLength(raw, 'utf8');
  if (ghBytes !== meta.size) {
    console.error(`✗ Truncated GitHub read: ${ghBytes} vs ${meta.size}. STOP.`);
    process.exit(1);
  }
  ghSha = meta.sha;
  const bodySha = await gitBlobSha(raw);
  if (bodySha !== ghSha) {
    console.error(`[skew] data.json moved between the metadata and body reads — re-run. Not a divergence.`);
    process.exit(2);
  }
  github = JSON.parse(raw);
} catch (e) {
  console.error(`✗ Could not read GitHub: ${e.message}. STOP.`);
  process.exit(1);
}

// ── Postgres side ───────────────────────────────────────────────────────────
const res = await api('/rest/v1/tenants?select=id,coach_id,data,data_version,version,updated_at');
if (!res.ok) { console.error(`✗ Could not read tenants: ${res.status} ${await res.text()}. STOP.`); process.exitCode = 1; }
const rows = await res.json();

// Every exit from here on sets `process.exitCode` and throws rather than
// calling process.exit(): exit() after a fetch trips a libuv assertion on
// Windows and the shell sees 127 instead of 1. A gate whose failure code is
// unreliable is a gate the suite loop can misreport.
const stop = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; throw new Error('STOP'); };
process.on('uncaughtException', (e) => { if (e.message !== 'STOP') console.error(e); process.exitCode = 1; });

if (rows.length === 0) stop('No tenants row exists. Run scripts/mirror-to-supabase.mjs first. STOP.');
// One tenant during Phase 1/2 — the mirror holds exactly the PT's blob. More
// than one means a second coach was provisioned, and this gate no longer knows
// which one GitHub corresponds to. That is a real question, not a warning.
if (rows.length > 1) stop(`${rows.length} tenants exist; this gate compares GitHub against ONE. ` +
  `Name the mirror target explicitly before continuing. STOP.`);
const t = rows[0];

// 🔴 READ SKEW IS NOT DIVERGENCE, AND CONFLATING THEM POISONS THE SOAK.
//    GitHub was read a moment before Postgres. The PT pushing in that window
//    produces a real content difference — and escalating it to "STOP THE LINE,
//    do not re-run until it passes" would fire on a benign race, on Lebanese
//    internet, with a live phone, repeatedly. Two failures follow: the rule
//    forbids the one action that settles it, and an operator who learns the
//    gate cries wolf starts explaining REAL divergences as "probably timing" —
//    which is exactly what the header forbids. So: re-read the sha after the
//    Postgres read, and if GitHub moved, exit 2 (did not run), never 1.
const shaAfter = JSON.parse(gh(['api', `repos/${REPO}/contents/data.json`, '--jq', '{sha:.sha}'])).sha;
if (shaAfter !== ghSha) {
  console.error(`[skew] data.json changed while this ran (${ghSha.slice(0, 8)} → ${shaAfter.slice(0, 8)}).
  A device pushed mid-comparison. NOT a divergence — re-run. This soak day does not count until it does.`);
  process.exit(2);
}

// ── Compare ─────────────────────────────────────────────────────────────────
let failures = 0;
const check = (cond, msg) => { if (cond) { console.log('  ✓', msg); } else { console.error('  ✗', msg); failures++; } };

console.log(`GitHub: ${ghBytes} bytes · Postgres: tenant ${t.id.slice(0, 8)} version ${t.version}, updated ${t.updated_at}`);

check(t.data_version === github._dataVersion,
  `_dataVersion matches (${github._dataVersion})`);

// Derived from both blobs, never a hardcoded list — the `mergeData` key-list
// trap in CLAUDE.md wearing a different hat. A collection added in a later
// version would otherwise be invisible to both the count check and the
// per-record diagnostic below, on the day it shipped.
const COLLECTIONS = collectionsOf(github, t.data);
const [a, b] = [counts(github, COLLECTIONS), counts(t.data, COLLECTIONS)];
for (const k of COLLECTIONS) {
  check(a[k] === b[k], `${k}: ${a[k]} = ${b[k]}`);
}

const ga = normalize(github);
const pa = normalize(t.data);
try {
  assertRealSize(ga, ghBytes, 'GitHub blob');
  assertRealSize(pa, ghBytes, 'Postgres blob');
} catch (e) {
  console.error(`  ✗ ${e.message}`);
  failures++;
}
check(ga === pa, `normalised blobs identical (${ga.length} chars)`);

// When they differ, say WHERE. "two 173 KB strings are not equal" is not
// actionable at 7am on day 5 of a soak.
if (ga !== pa) {
  const ids = (o, k) => new Set((o?.[k] || []).map(r => r.id));
  for (const k of COLLECTIONS) {
    const [A, B] = [ids(github, k), ids(t.data, k)];
    const onlyGh = [...A].filter(x => !B.has(x));
    const onlyPg = [...B].filter(x => !A.has(x));
    if (onlyGh.length) console.error(`    ${k}: only in GitHub  → ${onlyGh.slice(0, 5).join(', ')}${onlyGh.length > 5 ? ` (+${onlyGh.length - 5})` : ''}`);
    if (onlyPg.length) console.error(`    ${k}: only in Postgres → ${onlyPg.slice(0, 5).join(', ')}${onlyPg.length > 5 ? ` (+${onlyPg.length - 5})` : ''}`);
  }
  const differing = COLLECTIONS.flatMap(k =>
    (github?.[k] || []).filter(r => {
      const m = (t.data?.[k] || []).find(x => x.id === r.id);
      return m && normalize(r) !== normalize(m);
    }).map(r => `${k}:${r.id}`));
  if (differing.length) console.error(`    same id, different content → ${differing.slice(0, 8).join(', ')}${differing.length > 8 ? ` (+${differing.length - 8})` : ''}`);
}

console.log('');
if (failures) {
  console.error(`✗ ${failures} check(s) FAILED — the two stores DIVERGE.

🔴 STOP THE LINE. Do not re-run until it passes; understand it first. A
   divergence during the soak is the same bug that would eat records after
   cutover, when GitHub is no longer the safety net.`);
  // 🔴 `process.exitCode`, NOT `process.exit(1)`. Calling exit() here while the
  //    fetch keep-alive socket is still closing trips a libuv assertion on
  //    Windows and the shell sees 127 instead of 1 — a gate whose failure code
  //    is unreliable is a gate the suite loop can misreport. Setting the code
  //    and letting the event loop drain gives a clean 1.
  process.exitCode = 1;
} else {
  console.log('✓ GitHub and Postgres agree. One clean soak day.');
}
