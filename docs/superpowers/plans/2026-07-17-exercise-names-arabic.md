# Arabic Exercise Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arabic mode shows every program exercise as its Arabic name with the English original in small faded text; English mode and all stored data are byte-identical.

**Architecture:** One handwritten map `src/exerciseNamesAr.js` keyed by the exact English bank `name` (the same string frozen in program records), a `exNameAr(name)` lookup, and a display-time `exLabel` helper inside `ProgramViewer.jsx` used by both the exercise rows and the swap list. Coverage is enforced by a sanity script, not by convention.

**Tech Stack:** React 18, plain JS, node `.mjs` sanity scripts.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-exercise-names-arabic-design.md`
- UI-only: no `DATA_VERSION` change, no `EXERCISE_BANK_VERSION` change, no bank regeneration, nothing persisted
- Day headers / slot words stay English (Elie decision E3, reconfirmed 2026-07-17)
- Fallback rule: missing map entry → English name renders exactly as today, never blank
- Version bump: v2.14.1 → **v2.14.2** in App.jsx debug panel
- Provenance: designed + approved in-session 2026-07-17 (same governance as v2.14.1); commit messages carry "(Elie request, in-session approval)"
- Full pipeline: build → bundle `node --check` → master → gh-pages → Pages `built` → live-vs-dist diff

**Documented deviation from "No Placeholders":** the 340-entry Arabic map is
content, not logic. Inlining it twice (plan + file) doubles the writing for
zero review value; this plan ships the map's exact format, translation
guidelines, and sample entries, and the sanity script is the machine-checked
guarantee that all 340 entries exist and are Arabic. Executor writes the
entries directly into `src/exerciseNamesAr.js`.

### Translation guidelines (for the map author)

- Standard Lebanese-gym Arabic terminology; keep loanwords that are the
  actual gym vocabulary (بنش برس is correct; do not invent أكاديمية phrasing
  like ضغط المقعد المستوي unless it's genuinely the common term — prefer the
  term a Beirut coach would say out loud).
- Equipment words: دمبل (dumbbell), بار / باربل (barbell), كيبل (cable),
  سميث (Smith), آلة (machine), حبل (rope).
- Positions: مائل علوي (incline), مائل سفلي (decline), جالس (seated),
  واقف (standing), مستلقي (lying), منحني (bent-over), بذراع واحدة (single-arm).
- Keep names short — the row also shows the English + prescription numbers.

---

### Task 1: Arabic name map + coverage sanity

**Files:**
- Create: `src/exerciseNamesAr.js`
- Test: `scripts/sanity/sanity-exercise-names-ar.mjs` (new)

**Interfaces:**
- Consumes: `EXERCISES` from `src/exerciseBank.js` (340 records, each with a unique `name` string)
- Produces: `export const EXERCISE_NAMES_AR = { [englishName]: arabicName }` (exactly the 340 bank names as keys) and `export const exNameAr = (name) => EXERCISE_NAMES_AR[name] || null;`

- [ ] **Step 1: Write the failing sanity script**

Create `scripts/sanity/sanity-exercise-names-ar.mjs`:

```js
// Sanity: Arabic exercise-name map coverage (v2.14.2).
// The map is display-only content keyed by the EXACT English bank name — the
// same string frozen into program records. Three guarantees:
//   1. every bank movement has a non-empty Arabic entry (no silent English rows),
//   2. every map key matches a bank name (renamed-catalog-key trap class),
//   3. every value contains Arabic script (catches paste errors).
// Run: node scripts/sanity/sanity-exercise-names-ar.mjs
const bankUrl = new URL('../../src/exerciseBank.js', import.meta.url).href;
const mapUrl = new URL('../../src/exerciseNamesAr.js', import.meta.url).href;
const { EXERCISES } = await import(bankUrl);
const { EXERCISE_NAMES_AR, exNameAr } = await import(mapUrl);

let failed = false;
const fail = (msg) => { console.error('✗', msg); failed = true; };

const bankNames = new Set(EXERCISES.map(e => e.name));
const mapKeys = Object.keys(EXERCISE_NAMES_AR);
const arabicRe = /[؀-ۿ]/;

for (const name of bankNames) {
  const ar = EXERCISE_NAMES_AR[name];
  if (!ar || !ar.trim()) fail(`missing/empty Arabic for bank name: "${name}"`);
  else if (!arabicRe.test(ar)) fail(`no Arabic script in value for "${name}": "${ar}"`);
}
for (const key of mapKeys) {
  if (!bankNames.has(key)) fail(`stray map key (not in bank): "${key}"`);
}
if (mapKeys.length !== bankNames.size)
  fail(`map has ${mapKeys.length} keys, bank has ${bankNames.size} names`);

// helper contract
if (exNameAr('__nope__') !== null) fail('exNameAr(unknown) must return null');
if (bankNames.size && exNameAr(EXERCISES[0].name) !== EXERCISE_NAMES_AR[EXERCISES[0].name])
  fail('exNameAr(known) must return the map value');

if (failed) process.exit(1);
console.log(`✓ all ${bankNames.size} bank movements have Arabic names`);
console.log('✓ no stray keys, all values contain Arabic script, helper contract holds');
console.log('\nAll exercise-name-AR checks passed.');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/sanity/sanity-exercise-names-ar.mjs`
Expected: FAIL — cannot resolve `src/exerciseNamesAr.js` (not created yet).

- [ ] **Step 3: Create `src/exerciseNamesAr.js` with ALL 340 entries**

File shape (executor writes every entry per the translation guidelines above;
first entries shown as format anchors):

```js
// Arabic display names for the exercise bank (v2.14.2) — HANDWRITTEN, not generated.
// Keyed by the EXACT English `name` in exerciseBank.js — the same string frozen
// into program records, so old programs get Arabic automatically at display time.
// Drafted by Claude 2026-07-17 (standard Lebanese-gym terminology, loanwords
// kept where they ARE the gym vocabulary); Elie corrects phrasing in follow-up
// one-line edits — the viewer shows the English original in small text exactly
// so he can spot entries to fix.
// Coverage enforced by scripts/sanity/sanity-exercise-names-ar.mjs (all 340,
// no stray keys, Arabic script in every value). A NEW bank version may ship
// before its translations: unknown names fall back to English in the viewer.
export const EXERCISE_NAMES_AR = {
  'Hammer Curl': 'هامر كيرل',
  'Shoulder External Rotation with Cable': 'تدوير خارجي للكتف بالكيبل',
  'Seated Dumbbell Curl': 'مرجحة بايسبس بالدمبل جالسًا',
  // … one entry per bank movement, all 340 …
};

export const exNameAr = (name) => EXERCISE_NAMES_AR[name] || null;
```

To enumerate the names while writing: `node -e "import('./src/exerciseBank.js').then(m=>m.EXERCISES.forEach(e=>console.log(e.name)))"`

- [ ] **Step 4: Run the sanity script — all pass**

Run: `node scripts/sanity/sanity-exercise-names-ar.mjs`
Expected: `✓ all 340 bank movements have Arabic names` + helper checks + "All exercise-name-AR checks passed."

- [ ] **Step 5: Commit**

```bash
git add src/exerciseNamesAr.js scripts/sanity/sanity-exercise-names-ar.mjs
git commit -m "feat(programs): Arabic name map for all 340 bank movements + coverage sanity (Elie request, in-session approval)"
git push origin master
```

---

### Task 2: ProgramViewer display wiring

**Files:**
- Modify: `src/components/ProgramViewer.jsx` (import; new `exLabel` helper after `restText`; exercise-row name at ~line 52; swap-modal button text at ~line 99)

**Interfaces:**
- Consumes: `exNameAr(name)` from Task 1

- [ ] **Step 1: Import**

Add to `ProgramViewer.jsx` imports:

```js
import { exNameAr } from '../exerciseNamesAr';
```

- [ ] **Step 2: Add the display helper**

After the `restText` const (line 9):

```jsx
// v2.14.2 (Elie): Arabic mode shows the movement in Arabic with the English
// original in small faded text — Lebanese gyms know many moves by their
// English names, and the pairing lets Elie spot translations to correct.
// Missing map entry → English exactly as before, never blank. The English
// snippet needs the same ltr+isolate bidi treatment as the prescription
// numbers (I3) so Latin text doesn't reorder inside the RTL row.
const exLabel = (lang, name) => {
  const ar = lang === 'ar' ? exNameAr(name) : null;
  if (!ar) return name;
  return (
    <>
      {ar}
      <span style={{ fontSize: 10, color: 'var(--t5)', direction: 'ltr', unicodeBidi: 'isolate', marginInlineStart: 6 }}>
        {name}
      </span>
    </>
  );
};
```

- [ ] **Step 3: Use it in the exercise row**

In the row `<span style={{ color: 'var(--t2)' }}>`, replace the bare `{e.name}` with:

```jsx
            {exLabel(lang, e.name)}
```

- [ ] **Step 4: Use it in the swap modal**

Replace the swap button text `>{x.name}</button>` with `>{exLabel(lang, x.name)}</button>` (the `key` and `doSwap(x.name)` stay on the English name — it's the storage key).

- [ ] **Step 5: Full sanity regression**

Run: `for f in scripts/sanity/sanity-reducer.mjs scripts/sanity/sanity-counting.mjs scripts/sanity/sanity-slidingwindow.mjs scripts/sanity/sanity-migration.mjs scripts/sanity/sanity-recurring.mjs scripts/sanity/sanity-historical-ordinals.mjs scripts/sanity/sanity-evaluations.mjs scripts/sanity/sanity-1rm.mjs scripts/sanity/sanity-programs.mjs scripts/sanity/sanity-suggest-time.mjs scripts/sanity/sanity-exercise-names-ar.mjs; do node "$f" > /dev/null || exit 1; done; echo ALL_PASS`
Expected: `ALL_PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/ProgramViewer.jsx
git commit -m "feat(programs): viewer + swap list show Arabic movement names in AR mode (Elie request, in-session approval)"
git push origin master
```

---

### Task 3: Version bump, docs, build, deploy

**Files:**
- Modify: `src/App.jsx` (`v2.14.1` → `v2.14.2`)
- Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md` (v2.14.2 entries above v2.14.1)
- Create: `docs/instructions-v2.14.2.md`

- [ ] **Step 1: Bump version** — edit the debug-panel string to `v2.14.2`.

- [ ] **Step 2: Docs** — `docs/instructions-v2.14.2.md`: what displays where, the fallback rule, Elie's phrasing-review workflow (in-app, one-line map edits), provenance note. Matching entries in both changelogs (newest-first, above v2.14.1).

- [ ] **Step 3: Build + verify bundle**

```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```
Expected: build OK, `node --check` silent.

- [ ] **Step 4: Commit + push master**

```bash
git add src/App.jsx docs/instructions-v2.14.2.md docs/changelog-summary.md docs/changelog-technical.md
git commit -m "release: v2.14.2 Arabic exercise names in program viewer"
git push origin master
```

- [ ] **Step 5: Deploy gh-pages + verify**

```bash
cp dist/index.html /tmp/ptapp-deploy.html && cp dist/sw.js /tmp/ptapp-deploy-sw.js && cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html && cp /tmp/ptapp-deploy-sw.js sw.js && cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy v2.14.2: Arabic exercise names" && git push origin gh-pages
git checkout master
```
Then poll `gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status` until `built` (background until-loop; if stuck, POST a fresh build — Jun 11 trap), and diff live HTML against `dist/index.html` (must be identical).

- [ ] **Step 6: Tell Elie** — version number + how to review: switch to Arabic, open any program, each row shows Arabic + small English; send corrections as "English name → better Arabic" and they land as one-line edits.
