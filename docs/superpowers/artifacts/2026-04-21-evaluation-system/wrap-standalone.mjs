// Wraps brainstorm content fragments into standalone dark-themed HTML files
// ready for Chrome headless screenshotting.
// Used 2026-04-21 to generate PT-shareable images of the WBS tree and the
// Q4 leaf-structure comparison. Re-run from this folder with:
//   node wrap-standalone.mjs
// then screenshot the images/src/*-standalone.html files with Chrome headless:
//   "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless \
//     --disable-gpu --hide-scrollbars --screenshot="<abs-path-to>.png" \
//     --window-size=1400,820 "file:///<abs-path-to>-standalone.html"
import fs from 'node:fs';

const WRAP = (title, body) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0e0e0e;
    color: #f5f5f7;
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    padding: 32px 28px;
    min-height: 100vh;
  }
  h2 {
    color: #f5f5f7;
    font-size: 22px;
    margin-bottom: 4px;
    font-weight: 600;
  }
  .subtitle {
    color: #9ca3af;
    font-size: 13px;
    margin-bottom: 18px;
  }
  h3 { color: #f5f5f7; font-weight: 600; }
  h4 { color: #f5f5f7; font-weight: 600; }
  p { color: #e5e7eb; }
  .label {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #9ca3af;
  }
  /* Footer watermark so PT knows provenance */
  .footer-note {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid #222;
    text-align: center;
    color: #555;
    font-size: 10px;
    font-family: ui-monospace, 'Cascadia Code', monospace;
  }
</style>
</head>
<body>
${body}
<div class="footer-note">PTApp evaluation brainstorm · 2026-04-21 · docs/superpowers/specs/2026-04-21-evaluation-system-brainstorm.md</div>
</body>
</html>
`;

const specs = [
  {
    src: 'C:/projects/PTApp/docs/superpowers/artifacts/2026-04-21-evaluation-system/wbs-tree.html',
    dest: 'C:/projects/PTApp/docs/superpowers/artifacts/2026-04-21-evaluation-system/images/src/wbs-tree-standalone.html',
    title: 'PTApp — Classification WBS Tree',
  },
  {
    src: 'C:/projects/PTApp/docs/superpowers/artifacts/2026-04-21-evaluation-system/q4-leaf-structure.html',
    dest: 'C:/projects/PTApp/docs/superpowers/artifacts/2026-04-21-evaluation-system/images/src/q4-leaf-structure-standalone.html',
    title: 'PTApp — Q4 Leaf Structure (A vs B)',
  },
];

for (const s of specs) {
  const body = fs.readFileSync(s.src, 'utf8');
  fs.writeFileSync(s.dest, WRAP(s.title, body));
  console.log(`Wrote ${s.dest}`);
}
