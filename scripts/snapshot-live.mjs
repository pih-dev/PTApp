// Archive the live data.json, and PROVE the archive is complete.
//
// 🔴 WHY THIS IS A SCRIPT AND NOT A `gh api > file`:
//    Pierre's standing rule (CLAUDE.md, Governance) is a live-data snapshot
//    before any deploy, schema change, migration or data-touching operation —
//    and it says "verify its byte count against the API's reported size".
//    A truncated download is silent: the file exists, it is valid-looking JSON
//    right up to the cut, and it is worthless as a rollback. The assertion is
//    the whole point of the script; the copy is the easy half.
//
// Run:  node scripts/snapshot-live.mjs <description>
//    →  C:/projects/_archive/PTApp/data-snapshots/YYYY-MM-DD-<description>.json
//
// Exit 0 = archived and byte-verified. Exit 1 = DO NOT PROCEED.
//
// Auth: the GitHub CLI's own token (`gh auth token`), which already has repo
// access to makdissi-dev/ptapp-data. Nothing is read from, or written to, this
// repo — pih-dev/PTApp is public.

import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { gitBlobSha } from './lib/normalize.mjs';

const ARCHIVE = 'C:/projects/_archive/PTApp/data-snapshots';
const REPO = 'makdissi-dev/ptapp-data';
const FILE = 'data.json';

const desc = (process.argv[2] || 'snapshot').replace(/[^a-zA-Z0-9-]/g, '-');
// Local date, never toISOString() — a snapshot taken at 00:30 Beirut would
// otherwise be stamped with yesterday, and sort as a day old among its peers.
const n = new Date();
const p = (x) => String(x).padStart(2, '0');
const stamp = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
const out = `${ARCHIVE}/${stamp}-${desc}.json`;

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// The API's own idea of how big the file is. This is the number the copy must match.
const meta = JSON.parse(gh(['api', `repos/${REPO}/contents/${FILE}`, '--jq', '{size:.size, sha:.sha}']));
console.log(`API reports ${meta.size} bytes, sha ${meta.sha.slice(0, 8)}`);

// Raw download rather than the base64 in the metadata response: `gh api` with
// the raw accept header streams the file itself, so what is measured below is
// what a restore would actually replay.
const body = gh(['api', `repos/${REPO}/contents/${FILE}`, '-H', 'Accept: application/vnd.github.raw']);
const bytes = Buffer.byteLength(body, 'utf8');

// 🔴 CONTENT, NOT LENGTH. The metadata and the body are two separate API calls,
//    and the PT's phone can push between them — yielding a different revision
//    that is exactly as long (a status flip, one changed digit). Length-only
//    verification would archive revision B under revision A's logged sha, and a
//    rollback would then replay bytes nobody can identify. Comparing the git
//    blob sha1 also tells the two failures apart: "it moved under me, re-run"
//    is not "it was truncated, stop".
if (bytes !== meta.size) {
  console.error(`\n✗ TRUNCATED — downloaded ${bytes} bytes, API says ${meta.size}. DO NOT PROCEED.`);
  process.exit(1);
}
const sha = await gitBlobSha(body);
if (sha !== meta.sha) {
  console.error(`\n✗ data.json CHANGED between the two reads (${meta.sha.slice(0, 8)} → ${sha.slice(0, 8)}).
  Nothing is broken — a device pushed mid-read. Re-run this script.`);
  process.exit(1);
}
console.log(`✓ content sha ${sha.slice(0, 8)} matches the API's`);

// Parse before writing: a byte-perfect copy of a corrupt blob is still useless
// as a rollback, and this is the only moment it is cheap to find out.
let parsed;
try {
  parsed = JSON.parse(body);
} catch (e) {
  console.error(`\n✗ Downloaded ${bytes} bytes but they are not valid JSON: ${e.message}. DO NOT PROCEED.`);
  process.exit(1);
}

if (!existsSync(ARCHIVE)) mkdirSync(ARCHIVE, { recursive: true });
if (existsSync(out)) {
  console.error(`\n✗ ${out} already exists. Refusing to overwrite a snapshot — pick another description.`);
  process.exit(1);
}
writeFileSync(out, body, 'utf8');

const onDisk = statSync(out).size;
if (onDisk !== meta.size) {
  console.error(`\n✗ Wrote ${onDisk} bytes, expected ${meta.size}. DO NOT PROCEED.`);
  process.exit(1);
}

console.log(`✓ ${out}`);
console.log(`✓ ${onDisk} bytes on disk == ${meta.size} reported by the API`);
console.log(`  _dataVersion ${parsed._dataVersion} · ${parsed.clients?.length ?? 0} clients · ${parsed.sessions?.length ?? 0} sessions · ${parsed.programs?.length ?? 0} programs`);
