#!/usr/bin/env node
// gen-skin-variants — derive the light/dark flanks of every skin family.
//
// v2.42, Pierre's structure: every family ships light · optimal · dark, where
// the OPTIMAL is the hand-designed skin ("an optimal for a specific theme might
// be neither light nor dark") and the flanks are derived from it. Hand-tuning
// 14 more palettes would drift the moment an optimal changes; this generator
// re-derives them from the current optimals and AUTO-ADJUSTS every value until
// the same pairings sanity-contrast.mjs gates on all pass. Output is written
// into styles.css between the GENERATED SKIN VARIANTS markers — static CSS in
// the bundle, no runtime cost.
//
// Derivation:
//   • same-polarity flank (dark family → its "dark", light family → its
//     "light"): the ground ramp moves further in its own direction, everything
//     else inherits and is then contrast-corrected.
//   • cross-polarity flank (dark family → "light", light family → "dark"):
//     a hue-preserving inversion — the ground takes the family hue at the
//     opposite lightness, text re-inks, and every accent/status/figure token
//     is re-seated on the new ground by the corrector.

import { readFileSync, writeFileSync } from 'node:fs';

const CSS_PATH = new URL('../src/styles.css', import.meta.url);
let css = readFileSync(CSS_PATH, 'utf8');
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

// ── colour utils ─────────────────────────────────────────────────────────────
const hexToRgb = (s) => {
  const h = s.slice(1);
  const f = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};
const rgbToHex = (r) => '#' + r.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hslToRgb = ([h, s, l]) => {
  if (s === 0) return [l, l, l].map(v => v * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => v * 255);
};
const withL = (hexStr, l, sMul = 1) => {
  const [h, s] = rgbToHsl(hexToRgb(hexStr));
  return rgbToHex(hslToRgb([h, Math.min(1, s * sMul), Math.max(0, Math.min(1, l))]));
};
const getL = (hexStr) => rgbToHsl(hexToRgb(hexStr))[2];
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const parseAny = (s) => {
  s = s.trim();
  if (s.startsWith('#')) return hexToRgb(s).concat(1);
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return null;
};
const over = (c, base) => c[3] >= 1 ? c.slice(0, 3) : [0, 1, 2].map(i => c[i] * c[3] + base[i] * (1 - c[3]));

// ── parse the optimal blocks ─────────────────────────────────────────────────
const parseBlock = (start) => {
  const block = noComments.slice(start, noComments.indexOf('}', start));
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
const rootTokens = parseBlock(noComments.indexOf(':root {'));
const optimals = { midnight: rootTokens };
for (const m of noComments.matchAll(/\[data-skin="([a-z0-9-]+)"\]\s*\{/g)) {
  const id = m[1];
  if (id.endsWith('-light') || id.endsWith('-dark')) continue;
  const own = parseBlock(m.index);
  if (own['--ground']) optimals[id] = { ...rootTokens, ...own };
}

const COLOR_TOKENS = ['--ground', '--ground-lit', '--raised', '--chalk', '--chalk-dim',
  '--chalk-faint', '--bar', '--on-bar', '--accent', '--ok', '--warn', '--anatomy',
  '--muscle', '--muscle-2', '--equipment'];
const RAMP = ['--t1', '--t2', '--t3', '--t4', '--t5', '--sep', '--card-bg'];

// ── derive one flank ─────────────────────────────────────────────────────────
const derive = (t, flank) => {
  const isDark = lum(parseAny(t['--ground']).slice(0, 3)) < 0.35;
  const cross = (isDark && flank === 'light') || (!isDark && flank === 'dark');
  const out = {};
  const groundHex = t['--ground'];

  if (!cross) {
    // deeper dark / brighter light: move the ground ramp further out
    for (const k of ['--ground', '--ground-lit', '--raised']) {
      const v = t[k];
      if (!v.startsWith('#')) { out[k] = v; continue; }   // rgba raised stays
      const L = getL(v);
      out[k] = withL(v, isDark ? L * 0.5 : L + (1 - L) * 0.55);
    }
    for (const k of COLOR_TOKENS) if (!(k in out)) out[k] = t[k];
    for (const k of RAMP) out[k] = t[k];
  } else {
    // hue-preserving inversion
    const toLight = isDark;
    out['--ground'] = withL(groundHex, toLight ? 0.85 : 0.09, toLight ? 0.35 : 0.8);
    out['--ground-lit'] = withL(groundHex, toLight ? 0.92 : 0.15, toLight ? 0.3 : 0.8);
    out['--raised'] = toLight ? 'rgba(255,255,255,0.6)' : withL(groundHex, 0.19, 0.8);
    out['--chalk'] = withL(t['--chalk'], toLight ? 0.11 : 0.9, 0.6);
    out['--chalk-dim'] = withL(t['--chalk'], toLight ? 0.3 : 0.7, 0.6);
    out['--chalk-faint'] = withL(t['--chalk'], toLight ? 0.62 : 0.42, 0.5);
    out['--bar'] = withL(t['--bar'], toLight ? 0.33 : 0.45, 0.8);
    out['--on-bar'] = '#FFFFFF'; // corrector settles it against the final bar
    for (const k of ['--accent', '--ok', '--warn', '--anatomy', '--muscle', '--muscle-2', '--equipment']) {
      const L = getL(t[k]);
      out[k] = withL(t[k], toLight ? Math.min(L, 0.3) : Math.max(L, 0.55));
    }
    // rebuild the inline ramp from the new chalk, alphas copied from the source
    const ink = hexToRgb(out['--chalk']).map(Math.round);
    for (const k of RAMP) {
      const src = parseAny(t[k]);
      out[k] = `rgba(${ink[0]},${ink[1]},${ink[2]},${src[3]})`;
    }
    if (toLight) out['--card-bg'] = 'rgba(255,255,255,0.5)';
  }
  return out;
};

// ── the corrector: same pairings as sanity-contrast, nudged until they pass ──
const PAIRS = [
  ['--chalk', '--ground', 4.5], ['--chalk', '--ground-lit', 4.5], ['--chalk', '--raised', 4.5],
  ['--chalk-dim', '--ground', 4.5], ['--chalk-dim', '--ground-lit', 4.5], ['--chalk-dim', '--raised', 4.5],
  ['--ok', '--ground', 4.5], ['--warn', '--ground', 4.5],
  ['--ok', '--ground-lit', 4.5], ['--warn', '--ground-lit', 4.5],
  ['--accent', '--ground', 3],
  ['--bar', '--ground', 1.4], ['--chalk-faint', '--ground', 1.8],
];
const correct = (t) => {
  const ground = parseAny(t['--ground']).slice(0, 3);
  const bg = (tok) => over(parseAny(t[tok]), ground);
  for (const [fg, bgTok, min] of PAIRS) {
    for (let i = 0; i < 60 && ratio(over(parseAny(t[fg]), bg(bgTok)), bg(bgTok)) < min; i++) {
      const L = getL(rgbToHex(over(parseAny(t[fg]), bg(bgTok)).map(Math.round)));
      const bgIsLight = lum(bg(bgTok)) > 0.35;
      t[fg] = withL(t[fg].startsWith('#') ? t[fg] : rgbToHex(parseAny(t[fg]).slice(0, 3)), L + (bgIsLight ? -0.015 : 0.015));
    }
  }
  // on-bar last, against the settled bar
  const barRgb = over(parseAny(t['--bar']), ground);
  t['--on-bar'] = ratio([255, 255, 255], barRgb) >= ratio([20, 22, 28], barRgb) ? '#FFFFFF' : '#14161C';
  for (let i = 0; i < 60 && ratio(over(parseAny(t['--on-bar']), barRgb), barRgb) < 4.5; i++) {
    const bgIsLight = lum(barRgb) > 0.35;
    t['--on-bar'] = withL(t['--on-bar'], getL(t['--on-bar']) + (bgIsLight ? -0.015 : 0.015));
  }
  // If the text has hit its ceiling/floor and the pair still fails, the BAR is
  // the mid-tone at fault — move it away from the text until the pair clears.
  for (let i = 0; i < 60; i++) {
    const b = over(parseAny(t['--bar']), ground);
    if (ratio(over(parseAny(t['--on-bar']), b), b) >= 4.5) break;
    const textIsLight = lum(over(parseAny(t['--on-bar']), b)) > lum(b);
    t['--bar'] = withL(t['--bar'], getL(t['--bar']) + (textIsLight ? -0.015 : 0.015));
  }
  return t;
};

// ── emit ─────────────────────────────────────────────────────────────────────
const ORDER = [...RAMP, ...COLOR_TOKENS];
let outCss = '';
for (const [id, t] of Object.entries(optimals)) {
  for (const flank of ['light', 'dark']) {
    const v = correct(derive(t, flank));
    outCss += `[data-skin="${id}-${flank}"] {\n  color: var(--chalk);\n`;
    for (const k of ORDER) outCss += `  ${k}: ${v[k]};\n`;
    outCss += '}\n';
  }
}

const START = '/* ─── GENERATED SKIN VARIANTS';
const END = '/* ─── END GENERATED SKIN VARIANTS ─── */';
const s = css.indexOf(START), e = css.indexOf(END);
if (s < 0 || e < 0) { console.error('markers not found'); process.exit(1); }
const headEnd = css.indexOf('*/', s) + 2;
css = css.slice(0, headEnd) + '\n' + outCss + css.slice(e);
writeFileSync(CSS_PATH, css);
console.log(`wrote ${Object.keys(optimals).length * 2} variant blocks (${Object.keys(optimals).join(', ')})`);
