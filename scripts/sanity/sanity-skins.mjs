#!/usr/bin/env node
// sanity-skins — the skin system holds together, and nothing escapes it.
//
// Two halves, because they are two different claims and the source has looked
// right before while the behaviour was wrong:
//   • STRUCTURAL — every skin defines every token; no component hardcodes a
//     colour that silently belongs to one skin; the accent never touches chrome.
//   • BEHAVIOURAL — the ptapp-theme → ptapp-skin migration, run for real under
//     a fake localStorage, including the iOS "Block All Cookies" throw.
//
// Design record: docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md §3, §8.

import { readFileSync, readdirSync } from 'node:fs';

const SRC = new URL('../../src/', import.meta.url);
const read = (f) => readFileSync(new URL(f, SRC), 'utf8');
// Comments are stripped before any assertion: this file's own prose names the
// retired selector, and a gate that trips on a comment teaches people to weaken
// the gate rather than fix the code.
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = stripCss(read('styles.css'));

let failures = 0;
const assert = (ok, label, detail) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok || detail === undefined ? '' : ` → ${detail}`}`);
  if (!ok) failures++;
};

// ── structural: the token contract ──────────────────────────────────────────
console.log('\n[tokens] every skin defines every token');

// 🔴 A MISSING TOKEN IS THE WHOLE REASON THIS GATE EXISTS. CSS custom properties
//    cascade, so a skin that omits one silently inherits the previous skin's
//    value. Nothing errors, nothing looks wrong in the skin you are working in,
//    and the bug appears only for the user who picked the OTHER one.
const TOKENS = ['--t1', '--t2', '--t3', '--t4', '--t5', '--sep', '--card-bg',
  // v2.18 (design pass stage 2) — the midnight & arc palette. Same rule, more
  // surface: the Dashboard paints ONLY from these, so a skin that omits one
  // renders another skin's colour on a screen its author never opened.
  '--ground', '--ground-lit', '--raised', '--chalk', '--chalk-dim', '--chalk-faint',
  '--accent', '--bar', '--ok', '--warn', '--anatomy',
  // v2.22.1 — the muscle code. Same rule as --anatomy: figure-internal, and a
  // skin that omits one washes the OTHER skin's hue over a body.
  '--muscle', '--muscle-2',
  // v2.24 — the equipment token (figure-internal, like --anatomy).
  '--equipment'];
const skinIds = [...css.matchAll(/\[data-skin="([a-z0-9-]+)"\]\s*\{/g)].map(m => m[1]);
const declaredSkins = [...new Set(skinIds)];
assert(declaredSkins.length >= 1, `styles.css declares skin blocks (${declaredSkins.join(', ') || 'none'})`);

// v2.18: the default (midnight) values live on :root, not on .app-container —
// <body> and the area outside the 480px container have to paint from the same
// skin, and they cannot see a custom property scoped to a descendant.
const rootStart = css.indexOf(':root {');
const baseBlock = css.slice(rootStart, css.indexOf('}', rootStart));
for (const tok of TOKENS) {
  assert(baseBlock.includes(`${tok}:`), `default (midnight) defines ${tok}`);
}
for (const id of declaredSkins) {
  const start = css.indexOf(`[data-skin="${id}"] {`);
  if (start < 0) continue;                       // per-element override, not the token block
  const block = css.slice(start, css.indexOf('}', start));
  for (const tok of TOKENS) {
    assert(block.includes(`${tok}:`), `skin "${id}" defines ${tok}`);
  }
}

// ── structural: nothing escapes the tokens ──────────────────────────────────
console.log('\n[escapes] no component paints a colour that belongs to one skin');

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(new URL(`${e.name}/`, dir), out);
    else if (/\.jsx$/.test(e.name)) out.push(new URL(e.name, dir));
  }
  return out;
};
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Colours already in the codebase before this rule existed, from the palette
// CLAUDE.md documents (accent, danger, success, amber, session types). They are
// theme-independent by design and are NOT part of this sweep — the sweep is for
// NEW white/black literals, which is what actually breaks a skin.
//
// 🔴 ONE FILE IS EXEMPT AND MUST STAY EXEMPT. ErrorBoundary.jsx renders when the
//    app has ALREADY crashed, so it deliberately imports nothing — not i18n, not
//    shared components, and not the CSS variables, because any of those could be
//    the thing that crashed. Its palette is hardcoded on purpose. Making the
//    crash screen skin-aware would make it depend on the system that failed.
//    The exemption is re-justified below by asserting it still imports nothing.
const ESCAPE_EXEMPT = new Set(['ErrorBoundary.jsx']);

for (const file of walk(SRC)) {
  const body = stripComments(readFileSync(file, 'utf8'));
  const name = file.pathname.split('/').slice(-1)[0];
  if (ESCAPE_EXEMPT.has(name)) continue;
  const whiteOrBlack = body.match(/rgba?\(\s*(255,\s*255,\s*255|0,\s*0,\s*0)\s*[,)]/g) || [];
  assert(whiteOrBlack.length === 0,
    `${name} has no rgba white/black literal`, whiteOrBlack.slice(0, 2).join(' '));
}

console.log('\n[rtl] logical properties only in the files this pass touched');
for (const name of ['App.jsx', 'components/General.jsx', 'components/Dashboard.jsx']) {
  const body = stripComments(read(name));
  const physical = body.match(/\b(marginLeft|marginRight|borderLeft|borderRight|paddingLeft|paddingRight)\b/g) || [];
  assert(physical.length === 0, `${name} uses logical properties`, physical.slice(0, 3).join(' '));
}

// ── structural: the skin list has one home ──────────────────────────────────
console.log('\n[single source] the skin list lives in exactly one place');
const skins = read('skins.js');
assert(/export const SKINS = \[/.test(skins), 'SKINS is declared in src/skins.js');
for (const file of walk(SRC)) {
  const name = file.pathname.split('/').slice(-1)[0];
  if (name === 'skins.js') continue;
  const body = stripComments(readFileSync(file, 'utf8'));
  assert(!/'(midnight|steel)'/.test(body),
    `${name} names no skin id directly (it imports SKINS)`);
}
// 🔴 The retired key must not survive anywhere but the migration itself: a
//    second reader of ptapp-theme would resurrect a preference we just retired.
for (const file of walk(SRC)) {
  const name = file.pathname.split('/').slice(-1)[0];
  if (name === 'skins.js') continue;
  assert(!stripComments(readFileSync(file, 'utf8')).includes('ptapp-theme'),
    `${name} does not read the retired ptapp-theme key`);
}
assert(!/\.theme-light\b/.test(css), 'the .theme-light selector is gone from styles.css');
// The escape-sweep exemption above is only defensible while the crash screen
// really does stand alone. If someone ever imports a helper into it, this fails
// and the exemption has to be re-argued rather than silently inherited.
{
  const eb = readFileSync(new URL('components/ErrorBoundary.jsx', SRC), 'utf8');
  const localImports = eb.match(/^import .*from '\.[^']*'/gm) || [];
  assert(localImports.length === 0,
    'ErrorBoundary imports nothing local — the reason its palette may be hardcoded',
    localImports.join(' '));
}

// ── behavioural: the migration ──────────────────────────────────────────────
console.log('\n[migration] ptapp-theme → ptapp-skin, run for real');

const makeStorage = (seed = {}, { throwOnAll = false } = {}) => {
  const m = new Map(Object.entries(seed));
  const guard = () => { if (throwOnAll) { const e = new Error('SecurityError'); e.name = 'SecurityError'; throw e; } };
  return {
    map: m,
    getItem: k => { guard(); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { guard(); m.set(k, String(v)); },
    removeItem: k => { guard(); m.delete(k); },
    key: i => { guard(); return [...m.keys()][i] ?? null; },
    get length() { guard(); return m.size; },
  };
};

const load = async (storage) => {
  globalThis.localStorage = storage;
  // Bust the module cache so each case starts from a cold module.
  const mod = await import(`../../src/skins.js?case=${Math.random()}`);
  return mod;
};

{
  const st = makeStorage({ 'ptapp-theme': 'light' });
  const { loadSkin } = await load(st);
  const got = loadSkin();
  assert(got === 'steel', 'a legacy light theme becomes the steel skin', got);
  assert(st.map.get('ptapp-skin') === 'steel', 'the new key is written', st.map.get('ptapp-skin'));
  assert(!st.map.has('ptapp-theme'), 'the retired key is removed');
}
{
  const st = makeStorage({ 'ptapp-theme': 'dark' });
  const { loadSkin, DEFAULT_SKIN } = await load(st);
  assert(loadSkin() === DEFAULT_SKIN, 'a legacy dark theme becomes the default skin');
  assert(!st.map.has('ptapp-theme'), 'the retired key is removed here too');
}
{
  // A user who already chose a skin must never be re-migrated over the top.
  const st = makeStorage({ 'ptapp-skin': 'steel', 'ptapp-theme': 'dark' });
  const { loadSkin } = await load(st);
  assert(loadSkin() === 'steel', '🔴 an explicit skin beats a stale legacy theme');
}
{
  const st = makeStorage({});
  const { loadSkin, DEFAULT_SKIN } = await load(st);
  assert(loadSkin() === DEFAULT_SKIN, 'a fresh install gets the default skin');
}
{
  const st = makeStorage({ 'ptapp-skin': 'chartreuse' });
  const { loadSkin, DEFAULT_SKIN, saveSkin } = await load(st);
  assert(loadSkin() === DEFAULT_SKIN, 'an unknown stored skin falls back to the default');
  assert(saveSkin('chartreuse') === DEFAULT_SKIN, 'saving an unknown skin stores the default');
}
{
  // 🔴 The iOS trap: localStorage THROWS with "Block All Cookies" on. A skin is
  //    a preference — unreadable storage must degrade to the default look, not
  //    take down the first paint of the whole app.
  const st = makeStorage({}, { throwOnAll: true });
  const { loadSkin, DEFAULT_SKIN, saveSkin } = await load(st);
  let threw = false;
  let got;
  try { got = loadSkin(); } catch (e) { threw = true; }
  assert(!threw && got === DEFAULT_SKIN, '🔴 storage that throws yields the default, never an exception');
  threw = false;
  try { saveSkin('steel'); } catch (e) { threw = true; }
  assert(!threw, '🔴 saving into storage that throws does not propagate');
}

console.log(failures
  ? `\n✗ ${failures} assertion(s) FAILED — DO NOT DEPLOY.`
  : '\n✓ skins: every token defined, nothing escapes them, migration correct.');
process.exit(failures ? 1 : 0);
