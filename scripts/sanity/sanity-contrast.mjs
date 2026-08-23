#!/usr/bin/env node
// sanity-contrast — every skin's token PAIRINGS clear WCAG, not just the one on
// the screenshot.
//
// Born 2026-08-23 (v2.41). Pierre's ruling after the steel --on-bar fix: "when
// I share a screen and observe something, you don't change only the screen I
// shared — you change everywhere that thing applies, within that theme and
// within the other themes." A skin's values are individually fine and fail only
// in PAIRS, and a pair that fails does so silently for the users of exactly one
// skin (the same shape as the missing-token bug sanity-skins exists for).
//
// Targets: TEXT pairings are hard WCAG 4.5 — a skin whose users cannot read a
// badge is broken, full stop. DECORATIVE pairings (--bar as a shaft/fill edge,
// --chalk-faint) get lower bars ON PURPOSE: lume and enamel run deliberately
// quiet shafts (soot-on-soot is v2.34's design, and Pierre picked it), so
// enforcing 3:1 there would re-litigate a ruled design through a gate. The
// decorative bars assert "perceivable", not "prominent". --accent stays at 3 —
// load marks are information. Measured against BOTH ends of the ground
// gradient where the pair can sit on either.

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// ── parse the token blocks ───────────────────────────────────────────────────
const parseBlock = (start) => {
  const block = css.slice(start, css.indexOf('}', start));
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
const rootTokens = parseBlock(css.indexOf(':root {'));
const skins = { midnight: rootTokens };   // :root IS midnight, per the CSS comment
for (const m of css.matchAll(/\[data-skin="([a-z0-9-]+)"\]\s*\{/g)) {
  const own = parseBlock(m.index);
  if (Object.keys(own).some(k => k === '--ground')) skins[m[1]] = { ...rootTokens, ...own };
}

// ── colour math ──────────────────────────────────────────────────────────────
const hex = (s) => {
  const h = s.slice(1);
  const f = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16)).concat(1);
};
const parse = (s) => {
  s = s.trim();
  if (s.startsWith('#')) return hex(s);
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return null; // gradients, color-mix — not a flat colour, caller skips
};
// Composite an alpha colour over an opaque base (steel/pebble --raised are rgba).
const over = (c, base) => c[3] >= 1 ? c
  : [0, 1, 2].map(i => c[i] * c[3] + base[i] * (1 - c[3])).concat(1);
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ── the pairings ─────────────────────────────────────────────────────────────
// [foreground, background, minimum, why]. Backgrounds listed per pair because
// not every token can sit on every surface.
const PAIRS = [
  ['--chalk', '--ground', 4.5, 'primary text on the floor'],
  ['--chalk', '--ground-lit', 4.5, 'primary text on the lit end (week strip)'],
  ['--chalk', '--raised', 4.5, 'primary text in wells / pressed rows'],
  ['--chalk-dim', '--ground', 4.5, 'every small label on the floor'],
  ['--chalk-dim', '--ground-lit', 4.5, 'small labels on the lit end'],
  ['--chalk-dim', '--raised', 4.5, 'small labels in wells (time slots, chips)'],
  ['--on-bar', '--bar', 4.5, 'text on bar-filled controls (the steel bug)'],
  ['--ok', '--ground', 4.5, 'status text/badges'],
  ['--warn', '--ground', 4.5, 'status text/badges (CANCELLED)'],
  ['--ok', '--ground-lit', 4.5, 'status on the lit end'],
  ['--warn', '--ground-lit', 4.5, 'status on the lit end'],
  ['--accent', '--ground', 3, 'load/urgency marks'],
  ['--bar', '--ground', 1.4, 'shafts/fills perceivable (quiet by design in lume/enamel)'],
  ['--chalk-faint', '--ground', 1.8, 'decoration perceivable (hollow plates, collar)'],
];

let failures = 0;
const assert = (ok, label, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` → ${detail}`}`);
  if (!ok) failures++;
};

for (const [id, t] of Object.entries(skins)) {
  console.log(`\n[${id}]`);
  const ground = parse(t['--ground']);
  for (const [fgTok, bgTok, min, why] of PAIRS) {
    const fgRaw = parse(t[fgTok] ?? ''); const bgRaw = parse(t[bgTok] ?? '');
    if (!fgRaw || !bgRaw) { assert(false, `${fgTok} or ${bgTok} unparsable`, `${t[fgTok]} / ${t[bgTok]}`); continue; }
    const bg = over(bgRaw, ground);
    const r = ratio(over(fgRaw, bg), bg);
    assert(r >= min, `${fgTok} on ${bgTok} ≥ ${min} (${why})`, `${r.toFixed(2)}:1`);
  }
}

console.log(failures
  ? `\n✗ ${failures} pairing(s) FAILED — a skin ships text its users cannot read. DO NOT DEPLOY.`
  : '\n✓ contrast: every pairing clears its bar in every skin.');
process.exit(failures ? 1 : 0);
