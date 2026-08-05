/**
 * Verify the built bundle actually parses before it goes anywhere near gh-pages.
 *
 * WHY THIS EXISTS: `vite.config.js` rewrites the bundle for file:// support, and a
 * *string* replacement there silently corrupts React's minified code (`$&` in the
 * replacement string is a backreference — see the `fixForFileProtocol` trap in
 * docs/traps.md). The corruption is invisible in the diff and produces a blank
 * white page on the PT's phone. Parsing the extracted script catches it in 200 ms.
 *
 * Deliberately NOT in scripts/sanity/ — that whole folder is run as a suite with
 * `for f in scripts/sanity/*.mjs`, and this one needs `dist/` to exist first.
 *
 * Usage: npm run build && node scripts/verify-bundle.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const html = fs.readFileSync('dist/index.html', 'utf8');
const start = html.indexOf('<script>') + 8;
const end = html.lastIndexOf('</script>');

if (start < 8 || end < start) {
  console.error('FAIL — no inline <script> block found in dist/index.html');
  process.exit(1);
}

// node --check needs a real file; keep it out of the repo so a crashed run
// never leaves a stray artifact that could get committed.
const tmp = path.join(os.tmpdir(), `ptapp-bundle-check-${process.pid}.js`);
fs.writeFileSync(tmp, html.substring(start, end));
try {
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
  console.log(`OK — bundle parses (${(html.length / 1024).toFixed(0)} KB of index.html)`);
} catch (err) {
  console.error('FAIL — bundle does not parse. DO NOT DEPLOY.\n');
  console.error(err.stderr?.toString() || err.message);
  process.exit(1);
} finally {
  fs.rmSync(tmp, { force: true });
}
