# Multi-Day Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trainer-selectable 3–6 training days per week in program generation, with weak-point-suggested duplicated days and weekly set totals distributed per Elie's rules (spec D1–D10).

**Architecture:** Extend the ONE generation kernel (`generateProgram`) with `daysPerWeek`/`duplicatedSlots` args; pure suggestion helpers live in `programRules.js`; `ProgramSetup.jsx` adds two chip rows using the existing suggestion-with-override pattern; `ProgramViewer.jsx` labels repeat days. No schema migration — additive fields inside new program records only.

**Tech Stack:** React 18, plain JS modules, sanity scripts (`node scripts/sanity/*.mjs`), Vite single-file build.

**Spec:** `docs/superpowers/specs/2026-07-14-multi-day-split-design.md` — D-numbers below refer to it.

## Global Constraints

- `PROGRAM_RULES_VERSION` 2 → 3 exactly once (Task 1). Stored programs are frozen — never rewrite them.
- Deadlift never appears outside the rep-1 Pull anchor position (rules-v2 invariant, existing sanity sweep must stay green).
- Preview = save: both call `generateProgram` with identical args. Never compute program content in a component.
- 3-day output must equal today's content exactly; only new metadata fields differ (D10).
- All new user-facing strings in BOTH `en` and `ar` blocks of `src/i18n.js`. Slot names stay English in AR (Elie E3).
- Inline styles: `marginInlineStart`, `var(--t1..5)`/`var(--sep)` only — no `marginLeft`, no hardcoded rgba.
- After every commit: push to master (Pierre's standing rule). Deploy to gh-pages only in Task 6.
- Sanity runner: `node scripts/sanity/sanity-programs.mjs` — asserts print `✓`/`✗` lines; the script exits non-zero on the first `✗`.

---

### Task 1: Suggestion helpers + rules version 3

**Files:**
- Modify: `src/programRules.js` (version constant at top; helpers appended at end)
- Test: `scripts/sanity/sanity-programs.mjs` (part 2 "rules" section)

**Interfaces:**
- Produces: `suggestedDaysPerWeek(classKey: 'begA'|'begB'|'intA'|'intB'|'pro') → 3|4|5`
- Produces: `suggestedDuplicates(ranks: {weak,mid,strong}, daysPerWeek: 3..6) → slot[]` (length `daysPerWeek-3`, weak first)
- Produces: `PROGRAM_RULES_VERSION === 3`

- [ ] **Step 1: Add failing assertions** to `scripts/sanity/sanity-programs.mjs`. Change the existing line
`assert(PROGRAM_RULES_VERSION === 2, 'PROGRAM_RULES_VERSION is 2 (v2: Deadlift pull-anchor-only)');`
to
```js
assert(PROGRAM_RULES_VERSION === 3, 'PROGRAM_RULES_VERSION is 3 (v3: multi-day split)');
```
and add to the destructured import from `programRules.js`: `suggestedDaysPerWeek, suggestedDuplicates`. Then add at the END of the rules section (just before `console.log('rules OK');`):
```js
// multi-day suggestions (spec D6/D9)
assert(suggestedDaysPerWeek('begA') === 3 && suggestedDaysPerWeek('begB') === 3, 'beginners → 3 days');
assert(suggestedDaysPerWeek('intA') === 4, 'intA → 4 days');
assert(suggestedDaysPerWeek('intB') === 5 && suggestedDaysPerWeek('pro') === 5, 'intB/pro → 5 days');
const rk = { weak: 'legs', mid: 'pull', strong: 'push' };
assert(JSON.stringify(suggestedDuplicates(rk, 3)) === '[]', '3 days → no duplicates');
assert(JSON.stringify(suggestedDuplicates(rk, 4)) === '["legs"]', '4 days → weakest duplicated');
assert(JSON.stringify(suggestedDuplicates(rk, 5)) === '["legs","pull"]', '5 days → weak+mid');
assert(JSON.stringify(suggestedDuplicates(rk, 6)) === '["legs","pull","push"]', '6 days → all three');
```

- [ ] **Step 2: Run to verify failure.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: `✗ PROGRAM_RULES_VERSION is 3 (v3: multi-day split)`.

- [ ] **Step 3: Implement** in `src/programRules.js`. Change the version block to:
```js
// v2: Deadlift excluded from all accessory/circuit pools — Pull-day anchor only (Elie, 2026-07-14).
// v3: multi-day split — trainer-selectable 3-6 days/week, duplicated slots (Elie, 2026-07-14).
export const PROGRAM_RULES_VERSION = 3;
```
Append at end of file:
```js
// ─── Multi-day split suggestions (spec 2026-07-14 D6/D9) ───
// Both are PRE-SELECTIONS the trainer can override in the setup sheet — the
// chosen values (not the suggestions) are what gets frozen on the record.
// Day count by classification: 3-day PPL is wrong for intermediate-and-above
// (Elie); 6 is never suggested, manual pick only.
const SUGGESTED_DAYS = { begA: 3, begB: 3, intA: 4, intB: 5, pro: 5 };
export const suggestedDaysPerWeek = (classKey) => SUGGESTED_DAYS[classKey] ?? 3;

// Which slots duplicate: weakest group first ("squat low → duplicate legs"),
// then mid, then strong — the same ranking that drives quotas and day order.
export const suggestedDuplicates = (ranks, daysPerWeek) =>
  [ranks.weak, ranks.mid, ranks.strong].slice(0, Math.max(0, daysPerWeek - 3));
```

- [ ] **Step 4: Run to verify pass.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: `rules OK` printed, **but** the later kernel section now fails on `✗ 6 blocks, versions stamped` (it asserts `rulesVersion === 2`). Update that one line in the kernel section:
```js
assert(prog.blocks.length === 6 && prog.rulesVersion === 3 && prog.bankVersion === 1, '6 blocks, versions stamped');
```
Re-run. Expected: ALL sections pass (`bank OK`, `rules OK`, `kernel OK`, `reducer/merge OK`).

- [ ] **Step 5: Commit**
```bash
git add src/programRules.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): rules v3 - day-count + duplicate-slot suggestion helpers (spec D6/D9)"
git push origin master
```

---

### Task 2: Kernel multi-day structure (days, splits, anchor-once, circuits, record fields)

**Files:**
- Modify: `src/programKernel.js`
- Test: `scripts/sanity/sanity-programs.mjs` (kernel section, after the existing classification-override assertions)

**Interfaces:**
- Consumes: `dayOrder(strategy, ranks)`, `majorQuotas(...)`, `minorQuota(weeklySets)` from programRules (unchanged).
- Produces: `generateProgram({ ..., daysPerWeek = 3, duplicatedSlots = [] })`; record gains `daysPerWeek`, `duplicatedSlots`; each day entry gains `rep: 1|2`. Day list = base round (rep 1) then duplicated slots in base order (rep 2). Throws `Error('duplicatedSlots must be exactly daysPerWeek - 3 unique slots')` on inconsistency.
- Note for Task 3: `buildDay`/`fillBucket`/`candidates` gain an `exclude` (Set of names) param in THIS task, plumbed but always the shared empty set; Task 3 populates it.

- [ ] **Step 1: Add failing assertions** in the kernel section of `sanity-programs.mjs`, right after the classification-override block (`'explicitly passing the eval level still counts as auto'`):
```js
// ─── multi-day split (rules v3, spec 2026-07-14) ───
// D10 regression: default and explicit 3-day are identical, all rep 1
assert(JSON.stringify(generateProgram({ ...args, daysPerWeek: 3, duplicatedSlots: [] })) === JSON.stringify(prog),
  '3-day explicit === omitted (D10)');
assert(prog.daysPerWeek === 3 && JSON.stringify(prog.duplicatedSlots) === '[]', '3-day metadata stored');
assert(prog.blocks[0].days.every(d => d.rep === 1) && prog.blocks[0].days.length === 3, '3-day: 3 days, all rep 1');

// 5-day: duplicate pull+legs on the standard fixture
const p5 = generateProgram({ ...args, daysPerWeek: 5, duplicatedSlots: ['pull', 'legs'] });
assert(p5.daysPerWeek === 5 && JSON.stringify(p5.duplicatedSlots) === '["pull","legs"]', '5-day metadata stored');
const b0 = p5.blocks[0];
assert(b0.days.length === 5, '5-day block has 5 days');
assert(b0.days.slice(0, 3).every(d => d.rep === 1) && b0.days.slice(3).every(d => d.rep === 2),
  'base round first, repeats after (D7)');
const baseSlots = b0.days.slice(0, 3).map(d => d.slot);
assert(JSON.stringify(b0.days.slice(3).map(d => d.slot)) ===
  JSON.stringify(baseSlots.filter(s => ['pull', 'legs'].includes(s))),
  'rep-2 days follow base relative order (D7)');

// D4: majors split ceil/floor, weekly total preserved; non-duplicated slot untouched
const setsForDay = (day, bucket) => day.exercises.filter(e => e.bucket === bucket)
  .reduce((n, e) => n + e.sets, 0);
const pull1 = b0.days.find(d => d.slot === 'pull' && d.rep === 1);
const pull2 = b0.days.find(d => d.slot === 'pull' && d.rep === 2);
const weeklyBack = setsFor(prog.blocks[0].days.find(d => d.slot === 'pull'), 'Back'); // 3-day quota = weekly quota
assert(setsForDay(pull1, 'Back') + setsForDay(pull2, 'Back') === weeklyBack, 'Back weekly total preserved (D4)');
assert(setsForDay(pull1, 'Back') - setsForDay(pull2, 'Back') === weeklyBack % 2, 'odd set goes to rep-1 (D4)');
const push1 = b0.days.find(d => d.slot === 'push');
assert(setsForDay(push1, 'Chest') === setsFor(prog.blocks[0].days.find(d => d.slot === 'push'), 'Chest'),
  'non-duplicated slot keeps full weekly quota');

// D5: minors full quota on BOTH days
const minorSets1 = setsForDay(pull1, 'Biceps'), minorSets2 = setsForDay(pull2, 'Biceps');
assert(minorSets1 > 0 && minorSets1 === minorSets2, 'minors full quota on both days (D5)');

// D3: anchors once per block, rep-1 only — sweep every block
for (const b of p5.blocks) {
  for (const day of b.days) {
    const anchors = day.exercises.filter(e => e.setKg);
    if (day.rep === 2) assert(anchors.length === 0, `rep-2 day has no anchor (block ${b.index} ${day.slot})`);
  }
}
assert(p5.blocks[0].days.filter(d => d.exercises.some(e => e.name === 'Deadlift')).length === 1,
  'Deadlift exactly once a week (D3 + rules v2)');

// D8: endurance circuits follow the day count
const endur5 = p5.blocks.find(b => b.methodId === 'endurance');
assert(endur5 && endur5.daysAlt.length === 5, 'circuit weeks have 5 days (D8)');

// validation throw
let threw = false;
try { generateProgram({ ...args, daysPerWeek: 5, duplicatedSlots: ['pull'] }); } catch (e) { threw = true; }
assert(threw, 'kernel throws on inconsistent duplicatedSlots');
```

- [ ] **Step 2: Run to verify failure.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: `✗ 3-day metadata stored` (record lacks `daysPerWeek`).

- [ ] **Step 3: Implement** in `src/programKernel.js`.

3a. Shared empty set near the top (after `ANCHORS`):
```js
// Shared empty exclusion set — Task 3 (variant exclusion) populates real sets;
// a single frozen instance keeps generateProgram deterministic and allocation-free.
const NO_EXCLUDE = new Set();
```

3b. `candidates` gains the param (still unused filter until Task 3 wires real sets):
```js
function candidates(bucket, blockIndex, isBeginner, anchorName, exclude = NO_EXCLUDE) {
  // Deadlift is ONLY ever the Pull-day anchor (Elie's call, 2026-07-14): its bank
  // bucket is 'Legs' (primary Quads), so without this filter it leaked into the
  // Legs-day accessory pool and circuit stations — programming it twice a week.
  let pool = bankForBucket(bucket).filter(e =>
    e.name !== anchorName && e.name !== ANCHORS.pull.name && !exclude.has(e.name));
```
(rest of the function unchanged)

3c. `fillBucket` signature gains `exclude` and passes it through:
```js
function fillBucket({ bucket, target, method, blockIndex, isBeginner, anchor, anchorKg, exclude = NO_EXCLUDE }) {
```
and the pool line becomes:
```js
  const pool = candidates(bucket, blockIndex, isBeginner, anchor ? anchor.name : null, exclude);
```

3d. `buildDay` reworked — it now receives the day's own major target AND the weekly total (minors ride the WEEKLY major, D5), plus `rep`:
```js
// One PPL day. majorTarget = this day's share of the weekly major quota (full
// quota when the slot isn't duplicated); weeklyMajorSets = the untouched weekly
// number — minors always take minorQuota(weekly) PER DAY (spec D5: minors don't
// split, their volume grows with the extra day — Elie's explicit pick).
function buildDay({ slot, rep, majorTarget, weeklyMajorSets, method, blockIndex, isBeginner, raw, exclude }) {
  const group = MUSCLE_GROUPS[slot];
  // Anchor on the rep-1 day only (spec D3): the kg lift appears once a week.
  const anchor = rep === 1 ? ANCHORS[slot] : null;
  const exercises = fillBucket({
    bucket: group.major, target: majorTarget, method, blockIndex, isBeginner,
    anchor, anchorKg: anchor ? raw[anchor.rawKey] : 0, exclude,
  });
  for (const minor of group.minors)
    exercises.push(...fillBucket({ bucket: minor, target: minorQuota(weeklyMajorSets), method, blockIndex, isBeginner, anchor: null, exclude }));
  return { slot, rep, exercises };
}
```

3e. `generateProgram` — new args, validation, day-list construction, circuits, record fields:
```js
export function generateProgram({ id, client, evalRecord, fatPct, includeFatLoss, methods, startDate, createdAt,
  classification: classificationArg, daysPerWeek = 3, duplicatedSlots = [] }) {
  // Multi-day split (spec 2026-07-14): the UI enforces this pairing; the throw
  // guards non-UI callers — a silently wrong week would freeze into the record.
  if (!Array.isArray(duplicatedSlots) || duplicatedSlots.length !== daysPerWeek - 3
      || new Set(duplicatedSlots).size !== duplicatedSlots.length)
    throw new Error('duplicatedSlots must be exactly daysPerWeek - 3 unique slots');
```
(the existing classification lines stay). Inside the `blocks = methods.map(...)`, replace the `const days = order.map(...)` line with:
```js
    const dupSet = new Set(duplicatedSlots);
    // Base round first (rep 1, full or ceil-half major quota), then the duplicated
    // slots in the SAME relative order as rep-2 days (spec D7: whole body covered
    // before any muscle repeats — max rest). Odd split favors the anchor day (D4).
    const baseDays = order.map(slot => buildDay({
      slot, rep: 1,
      majorTarget: dupSet.has(slot) ? Math.ceil(majors[slot] / 2) : majors[slot],
      weeklyMajorSets: majors[slot],
      method, blockIndex: index, isBeginner, raw: evalRecord.raw, exclude: NO_EXCLUDE,
    }));
    const repDays = order.filter(s => dupSet.has(s)).map(slot => buildDay({
      slot, rep: 2,
      majorTarget: Math.floor(majors[slot] / 2),
      weeklyMajorSets: majors[slot],
      method, blockIndex: index, isBeginner, raw: evalRecord.raw, exclude: NO_EXCLUDE,
    }));
    const days = [...baseDays, ...repDays];
```
NOTE: `majors` and `order` are already computed in this scope today — reuse them; `buildDay`'s old call signature disappears entirely. The endurance line becomes:
```js
    if (methodId === 'endurance')                            // weeks 1&3 run daysAlt (circuits), 2&4 run days
      block.daysAlt = Array.from({ length: daysPerWeek }, (_, d) => buildCircuitDay(index, d, isBeginner));
```
And the returned record gains the two fields right after `includeFatLoss`:
```js
    daysPerWeek, duplicatedSlots,
```

- [ ] **Step 4: Run to verify pass.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: all sections pass, including the pre-existing Deadlift sweep and classification-override assertions. Also run `node scripts/sanity/sanity-reducer.mjs` (expected `PASS` — record shape is additive).

- [ ] **Step 5: Commit**
```bash
git add src/programKernel.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): kernel multi-day split - day list, quota split, anchor-once, circuits (spec D1,D3,D4,D5,D7,D8,D10)"
git push origin master
```

---

### Task 3: Variant exclusion between rep-1 and rep-2 days

**Files:**
- Modify: `src/programKernel.js` (generateProgram day construction + fillBucket exhaustion fallback)
- Test: `scripts/sanity/sanity-programs.mjs`

**Interfaces:**
- Consumes: Task 2's `exclude` plumbing (`buildDay`/`fillBucket`/`candidates` params).
- Produces: rep-2 days share zero exercise names with their slot's rep-1 day (same block), except when a bucket's pool is too small — then volume wins (D2 + pool-exhaustion rule).

- [ ] **Step 1: Add failing assertions** after the Task 2 block in the kernel section:
```js
// D2: a duplicated day uses different variants — zero name overlap per slot/block
for (const b of p5.blocks) {
  for (const slot of ['pull', 'legs']) {
    const d1 = b.days.find(d => d.slot === slot && d.rep === 1);
    const d2 = b.days.find(d => d.slot === slot && d.rep === 2);
    if (!d1 || !d2) continue;
    const names1 = new Set(d1.exercises.map(e => e.name));
    const overlap = d2.exercises.filter(e => names1.has(e.name));
    assert(overlap.length === 0, `no variant overlap (block ${b.index} ${slot}: ${overlap.map(e => e.name)})`);
  }
}
// Pool exhaustion never starves the quota: beginner 6-day (smallest filtered pools)
const p6beg = generateProgram({ ...args, evalRecord: begEval, daysPerWeek: 6, duplicatedSlots: ['push', 'pull', 'legs'] });
for (const b of p6beg.blocks) {
  for (const slot of ['push', 'pull', 'legs']) {
    const d1 = b.days.find(d => d.slot === slot && d.rep === 1);
    const d2 = b.days.find(d => d.slot === slot && d.rep === 2);
    const major = { push: 'Chest', pull: 'Back', legs: 'Legs' }[slot];
    assert(setsForDay(d1, major) >= setsForDay(d2, major) && setsForDay(d1, major) + setsForDay(d2, major) > 0,
      `6-day beginner ${slot} major quota filled (block ${b.index})`);
    for (const day of [d1, d2])
      for (const e of day.exercises) assert(e.sets > 0, 'no zero-set entries under exclusion');
  }
}
```

- [ ] **Step 2: Run to verify failure.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: `✗ no variant overlap (block 0 pull: ...)` — rep-2 currently repeats rep-1's picks (same deterministic pool).

- [ ] **Step 3: Implement.**

3a. In `generateProgram`, the rep-2 construction passes the rep-1 day's names (replace the `repDays` block from Task 2):
```js
    const repDays = order.filter(s => dupSet.has(s)).map(slot => buildDay({
      slot, rep: 2,
      majorTarget: Math.floor(majors[slot] / 2),
      weeklyMajorSets: majors[slot],
      method, blockIndex: index, isBeginner, raw: evalRecord.raw,
      // D2: the rep-2 day must use different variants — exclude EVERY name the
      // slot's rep-1 day already placed (majors AND minors; anchors are excluded
      // from pools anyway).
      exclude: new Set(baseDays.find(d => d.slot === slot).exercises.map(e => e.name)),
    }));
```

3b. In `fillBucket`, add the exhaustion fallback after the existing pool loop (before `return out;`):
```js
  // Pool-exhaustion rule (spec D2): exclusion is best-effort. If the excluded
  // pool couldn't fill the quota (small minor buckets — Rear Delts has 4
  // exercises; beginner filter shrinks pools further), refill from the
  // UNEXCLUDED pool: weekly volume is guaranteed, variety only when possible.
  if (remaining > 0 && exclude.size > 0) {
    const fallback = candidates(bucket, blockIndex, isBeginner, anchor ? anchor.name : null)
      .filter(e => !out.some(o => o.name === e.name));
    for (let i = 0; remaining > 0 && i < fallback.length; i++) {
      const sets = remaining >= per * 2 ? per : remaining;
      out.push(exerciseEntry(fallback[i], Math.min(sets, remaining), method, null));
      remaining -= Math.min(sets, remaining);
    }
  }
```

- [ ] **Step 4: Run to verify pass.** Run: `node scripts/sanity/sanity-programs.mjs`. Expected: all pass, including the D10 3-day identity (exclusion path never triggers at 3 days: `NO_EXCLUDE.size === 0`).

- [ ] **Step 5: Commit**
```bash
git add src/programKernel.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): variant exclusion on duplicated days with pool-exhaustion fallback (spec D2)"
git push origin master
```

---

### Task 4: ProgramSetup UI — day chips + extra-day chips + i18n

**Files:**
- Modify: `src/components/ProgramSetup.jsx`, `src/i18n.js`

**Interfaces:**
- Consumes: `suggestedDaysPerWeek`, `suggestedDuplicates`, `rankGroups` from `../programRules`; kernel args from Tasks 2–3.
- Produces: `generateProgram` called with `daysPerWeek` + `duplicatedSlots` from component state; Generate disabled while `dupSlots.length !== daysPerWeek - 3`.

- [ ] **Step 1: i18n keys.** In `src/i18n.js`, add after `levelSuggested` in the **en** block:
```js
    daysPerWeekLabel: 'Days per week',
    extraDaysLabel: 'Extra days',
```
and after `levelSuggested` in the **ar** block:
```js
    daysPerWeekLabel: 'أيام في الأسبوع',
    extraDaysLabel: 'أيام إضافية',
```

- [ ] **Step 2: Component state + handlers.** In `ProgramSetup.jsx`:

Imports — extend the programRules import and add `useMemo`:
```js
import React, { useState, useMemo } from 'react';
import { DEFAULT_SEQUENCE, METHODS, FAT_THRESHOLD, suggestedDaysPerWeek, suggestedDuplicates, rankGroups } from '../programRules';
```
After the `classification` state, add:
```js
  // Multi-day split (spec 2026-07-14). Suggestions follow the Level chip until
  // the trainer touches a row himself — then his pick sticks (fatTouched pattern).
  const ranks = useMemo(() => rankGroups(evalRecord.frozen.scores), [evalRecord]);
  const [daysPerWeek, setDaysPerWeek] = useState(() => suggestedDaysPerWeek(evalRecord.frozen.classification));
  const [daysTouched, setDaysTouched] = useState(false);
  const [dupSlots, setDupSlots] = useState(() =>
    suggestedDuplicates(ranks, suggestedDaysPerWeek(evalRecord.frozen.classification)));
  const [dupsTouched, setDupsTouched] = useState(false);
  const dupsValid = dupSlots.length === daysPerWeek - 3;

  const pickLevel = (id) => {
    haptic(); setClassification(id);
    if (!daysTouched) {
      const d = suggestedDaysPerWeek(id);
      setDaysPerWeek(d);
      if (!dupsTouched) setDupSlots(suggestedDuplicates(ranks, d));
    }
  };
  const pickDays = (n) => {
    haptic(); setDaysTouched(true); setDaysPerWeek(n);
    if (!dupsTouched) setDupSlots(suggestedDuplicates(ranks, n));
    else setDupSlots(dupSlots.slice(0, Math.max(0, n - 3)));   // shrink a stale manual pick
  };
  const toggleDup = (slot) => {
    haptic(); setDupsTouched(true);
    setDupSlots(dupSlots.includes(slot) ? dupSlots.filter(s => s !== slot) : [...dupSlots, slot]);
  };
```
The Level chips' `onClick` changes from the inline `() => { haptic(); setClassification(id); }` to `() => pickLevel(id)`.

- [ ] **Step 3: Pass to the kernel + gate Generate.** In `save()`, extend the `generateProgram` call:
```js
    const record = generateProgram({
      id: genId(), client, evalRecord, classification, daysPerWeek, duplicatedSlots: dupSlots,
      fatPct: Number.isFinite(fatNum) ? fatNum : null, includeFatLoss: fatOn,
      methods: effective, startDate, createdAt: new Date().toISOString(),
    });
```
Add a guard at the top of `save()` (belt for the disabled button):
```js
    if (!dupsValid) return;
```
Change the Modal `action` button to:
```js
      action={<button className="btn-primary" style={{ width: '100%', opacity: dupsValid ? 1 : 0.5 }}
        disabled={!dupsValid} onClick={save}>{t(lang, 'generateProgram')}</button>}
```

- [ ] **Step 4: Render the two chip rows** directly after the level-suggested hint `<div>`:
```jsx
      {/* days per week — suggested from the level (spec D9), trainer overrides */}
      <div className="field-label">{t(lang, 'daysPerWeekLabel')}</div>
      <div className="weekday-row">
        {[3, 4, 5, 6].map(n => (
          <button key={n} type="button"
            className={`weekday-chip${daysPerWeek === n ? ' selected' : ''}`}
            onClick={() => pickDays(n)}>{n}</button>
        ))}
      </div>

      {daysPerWeek > 3 && (
        <>
          {/* which slots duplicate — suggested from weak points (spec D6) */}
          <div className="field-label">{t(lang, 'extraDaysLabel')} ({daysPerWeek - 3})</div>
          <div className="weekday-row">
            {['push', 'pull', 'legs'].map(slot => (
              <button key={slot} type="button"
                className={`weekday-chip${dupSlots.includes(slot) ? ' selected' : ''}`}
                onClick={() => toggleDup(slot)}>
                {t(lang, 'slot' + slot.charAt(0).toUpperCase() + slot.slice(1))}
              </button>
            ))}
          </div>
        </>
      )}
```

- [ ] **Step 5: Build + verify + commit.**
```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
git add src/components/ProgramSetup.jsx src/i18n.js
git commit -m "feat(programs): setup-sheet day-count + extra-day chips with suggestions (spec D6/D9, UI)"
git push origin master
```

---

### Task 5: ProgramViewer — repeat-day headers

**Files:**
- Modify: `src/components/ProgramViewer.jsx:43-44`

**Interfaces:**
- Consumes: `day.rep` from Task 2 records. Old records have no `rep` → `undefined !== 2` → render unchanged (backward-compat by construction).

- [ ] **Step 1: Implement.** The day-header expression becomes:
```jsx
        {/* I1: localized day headers (push/pull/legs) — raw .toUpperCase() showed English in AR mode.
            Multi-day (2026-07-14): rep-2 days render "Push 2" — old records lack `rep`, so they
            fall through unchanged. Slot words stay English in AR (Elie E3). */}
        {day.slot === 'circuit' ? `${t(lang, 'roundsLabel')} ×4`
          : t(lang, 'slot' + day.slot.charAt(0).toUpperCase() + day.slot.slice(1)) + (day.rep === 2 ? ' 2' : '')}
```

- [ ] **Step 2: Build + verify + commit.**
```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
git add src/components/ProgramViewer.jsx
git commit -m "feat(programs): viewer labels duplicated days (Push 2) - old records unchanged"
git push origin master
```

---

### Task 6: Release v2.14.0 — version, docs, deploy, verify

**Files:**
- Modify: `src/App.jsx` (debug-panel version line), `src/components/General.jsx:13` (DOCS.instructions pointer), `docs/changelog-summary.md`, `docs/changelog-technical.md`
- Create: `docs/instructions-v2.14.md`

**Interfaces:** none — release mechanics.

- [ ] **Step 1: Full sanity + regression pass.**
```bash
node scripts/sanity/sanity-programs.mjs
node scripts/sanity/sanity-1rm.mjs
node scripts/sanity/sanity-reducer.mjs
node scripts/sanity/sanity-merge-migration.mjs
```
Expected: every script ends in its PASS/OK line. NO live-diff gate needed — no migration in this release.

- [ ] **Step 2: Version + docs pointer.** In `src/App.jsx` change `v2.13.3` → `v2.14.0` in the debug panel. In `src/components/General.jsx` change the instructions URL to `.../docs/instructions-v2.14.md`.

- [ ] **Step 3: Write `docs/instructions-v2.14.md`** — sections: What changed (multi-day split, plain-English summary of D1–D10 from the spec), setup-sheet walkthrough (Level → Days → Extra days → Generate), volume rules table (majors split / minors full / anchor once), suggestion defaults table (begA/B 3 · intA 4 · intB 5 · pro 5), backward compat (old programs render as before; no migration), pointer to the spec file. Update `docs/changelog-summary.md` (plain-English entry, same voice as the v2.13.1–.3 entry) and `docs/changelog-technical.md` (rules v3, kernel args, record fields, exclusion + fallback, D-references, commits).

- [ ] **Step 4: Build, verify, deploy, verify live.**
```bash
npm run build
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
git add -A docs src
git commit -m "release: v2.14.0 multi-day split program generation"
git push origin master
cp dist/index.html /tmp/ptapp-deploy.html && cp dist/sw.js /tmp/ptapp-deploy-sw.js && cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html && cp /tmp/ptapp-deploy-sw.js sw.js && cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json && git commit -m "Deploy v2.14.0: multi-day split program generation" && git push origin gh-pages
git checkout master
```
Then verify Pages actually deployed (Jun-11 trap — a push is not a deployment):
```bash
"/c/Program Files/GitHub CLI/gh.exe" api repos/pih-dev/PTApp/pages/builds/latest --jq '.status + " " + .commit'
curl -s https://pih-dev.github.io/PTApp/index.html -o /tmp/live-check.html && diff -q /tmp/live-check.html dist/index.html
```
Expected: `built <gh-pages sha>` and no diff output. If status stays `building`/errored: `gh api -X POST repos/pih-dev/PTApp/pages/builds` and re-verify.

- [ ] **Step 5: Announce.** Tell Elie/Pierre the version number (v2.14.0) and the phone-pass list: chip rows in AR/RTL, disabled-Generate affordance at 4+ days with wrong picks, viewer "Push 2" headers in both languages, both phones on v2.14.0 before generating a multi-day program (mergeData on stale clients strips nothing here — fields are inside program records — but the stale-client rule from v2.13 still applies as good practice).
