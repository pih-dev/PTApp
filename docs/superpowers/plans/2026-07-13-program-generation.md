# Program Generation from 1RM Evaluation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Generate program" on a 1RM evaluation produces a frozen, stored, 6-month PPL block plan (spec: `docs/superpowers/specs/2026-07-13-program-generation-design.md`).

**Architecture:** Three pure-data/logic modules (`exerciseBank.js` generated once from the archived xlsx, `programRules.js` for tiers/methods/quotas, `programKernel.js` as the ONE generation kernel) feed two new components (`ProgramSetup.jsx`, `ProgramViewer.jsx`) wired into `EvalSection.jsx`. Schema v5→v6 adds `state.programs[]` following the `evaluations[]` pattern everywhere.

**Tech Stack:** React 18 + Vite (existing), Python/openpyxl for the one-time bank build, `scripts/sanity/*.mjs` assertion scripts (repo's test convention — no test framework).

## Global Constraints

- Version becomes **v2.13.0** (App.jsx debug panel + `DOCS.instructions` in General.jsx → `instructions-v2.13.md`).
- `DATA_VERSION` 5 → **6**, purely additive (`programs: []`). Never reshape existing records.
- Programs are **frozen at generation** — kernel changes must bump `PROGRAM_RULES_VERSION`; bank changes bump `EXERCISE_BANK_VERSION`. Stored programs are never recomputed.
- ONE kernel: UI preview and save path both call `generateProgram()`. Never reimplement quota/pick logic in a component (compute1RMFrozen precedent).
- Sets/reps are NOT editable in-app (Elie's call). Only swap-exercise (`EDIT_PROGRAM`, full-record) and regenerate (`ADD_PROGRAM`, history retained).
- No `t`/`d` as callback params (shadowing trap); `marginInlineStart` not `marginLeft`; CSS vars `--t1..--t5`/`--sep` in inline styles; all user-facing strings through `i18n.js` (exercise names exempt — English by design, spec §7).
- Every commit: run `node scripts/sanity/sanity-programs.mjs` (once it exists) + full build pipeline before deploy (CLAUDE.md "How to Build, Verify, and Deploy").
- Deviation from spec §8, agreed at plan review: blocks store `days` (+ `daysAlt` for endurance) rather than 4 duplicated weeks — weeks within a block are identical by construction; this keeps data.json growth ~15-20 KB per program instead of ~60 KB.

---

### Task 1: Exercise bank — build script + generated `src/exerciseBank.js`

**Files:**
- Create: `scripts/build_exercise_bank.py` (committed; one-time generator, provenance documented)
- Create: `src/exerciseBank.js` (generated output, committed)
- Source (read-only): `C:\projects\_archive\PTApp\program-source\2026-07-13-exercises-full-list.xlsx`

**Interfaces:**
- Produces: `EXERCISE_BANK_VERSION = 1`; `EXERCISES` = `Array<{ name, muscles: string[], primary: string, type: 'compound'|'isolation', slot: 'push'|'pull'|'legs'|null, minor: string|null, advanced: boolean }>`; `MUSCLE_GROUPS` = `{ push: {major:'Chest', minors:['Shoulders','Triceps']}, pull: {major:'Back', minors:['Rear Delts','Biceps','Forearms']}, legs: {major:'Legs', minors:['Calves','Abs']} }`; helper `bankForMuscle(groupKey)` → exercises whose primary maps into that group bucket.

- [ ] **Step 1: Write the build script**

```python
# scripts/build_exercise_bank.py — ONE-TIME generator for src/exerciseBank.js.
# Source of truth: the archived PT xlsx (2026-07-13). Re-run only if Elie ships
# a new bank; then bump EXERCISE_BANK_VERSION below and re-review the output.
# Run: python scripts/build_exercise_bank.py   (from repo root; needs openpyxl)
import openpyxl, re, json, io

SRC = r"C:\projects\_archive\PTApp\program-source\2026-07-13-exercises-full-list.xlsx"
OUT = "src/exerciseBank.js"
BANK_VERSION = 1

# Typos / variants observed in the xlsx -> canonical muscle names
CANON = {
    "hmastrings": "Hamstrings", "spinal erectors": "Spinal Erectors",
    "forearms flexors": "Forearms", "forearms extensors": "Forearms",
    "rear delt": "Rear Delts", "serratus anterior": "Serratus",
    "upper back": "Upper Back", "middle back": "Middle Back",
}
def canon(m):
    m = m.strip().strip('"').strip()
    return CANON.get(m.lower(), " ".join(w.capitalize() for w in m.split()))

# canonical muscle -> (slot, bucket). bucket is the QUOTA key: the major name
# ('Chest'/'Back'/'Legs') or the minor name from spec §6's table. None = prehab,
# excluded from auto-programming (Rotator Cuffs, Psoas, Serratus).
BUCKET = {
    "Chest": ("push", "Chest"),
    "Lats": ("pull", "Back"), "Middle Back": ("pull", "Back"), "Upper Back": ("pull", "Back"),
    "Back": ("pull", "Back"), "Traps": ("pull", "Back"), "Spinal Erectors": ("pull", "Back"),
    "Quads": ("legs", "Legs"), "Hamstrings": ("legs", "Legs"), "Glutes": ("legs", "Legs"),
    "Adductors": ("legs", "Legs"), "Abductors": ("legs", "Legs"),
    "Shoulders": ("push", "Shoulders"), "Triceps": ("push", "Triceps"),
    "Rear Delts": ("pull", "Rear Delts"), "Biceps": ("pull", "Biceps"), "Forearms": ("pull", "Forearms"),
    "Calves": ("legs", "Calves"), "Abs": ("legs", "Abs"), "Obliques": ("legs", "Abs"),
    "Rotator Cuffs": (None, None), "Psoas": (None, None), "Serratus": (None, None),
}

# Compound if name matches these movement patterns, unless explicitly isolated.
COMPOUND_PAT = re.compile(
    r"squat|deadlift|press|lunge|row(?!ing)|pull-up|pull up|chin-up|dip\b|thrust"
    r"|push-up|push up|step-up|rack pull|good morning|clean", re.I)
ISOLATION_OVERRIDE = {  # matches pattern but is single-joint in practice
    "Pallof Press", "Anti Rotation", "Landmine Rainbow", "Leg Press Wide Stance",
}
COMPOUND_OVERRIDE = {"Glute Ham Raise", "Back Extension", "Nordic Hamstring Curl"}

# High-skill barbell lifts filtered out for begA/begB when alternatives exist
# (anchors are exempt in the kernel, not here).
ADVANCED = re.compile(r"barbell|deficit|halting|power rack|push press|nordic|pistol|plyometric", re.I)

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb.worksheets[0]
seen, out = set(), []
for name_cell, muscles_cell in ws.iter_rows(min_row=2, values_only=True):
    if not name_cell or not muscles_cell: continue
    name = re.sub(r"\s+", " ", str(name_cell)).strip()
    if name.lower() in seen: continue          # dedupe (keep FIRST occurrence)
    seen.add(name.lower())
    # muscle cell is JSON-ish with broken quotes in places -> extract words
    muscles = [canon(m) for m in re.findall(r'[A-Za-z][A-Za-z ]*[A-Za-z]', str(muscles_cell))]
    muscles = list(dict.fromkeys(muscles))     # unique, order-preserving
    unknown = [m for m in muscles if m not in BUCKET]
    if unknown: raise SystemExit(f"UNKNOWN MUSCLE {unknown} in '{name}' — extend CANON/BUCKET")
    primary = muscles[0]
    slot, bucket = BUCKET[primary]
    is_comp = (name in COMPOUND_OVERRIDE) or (
        bool(COMPOUND_PAT.search(name)) and not any(o.lower() in name.lower() for o in ISOLATION_OVERRIDE))
    out.append({"name": name, "muscles": muscles, "primary": primary,
                "type": "compound" if is_comp else "isolation",
                "slot": slot, "bucket": bucket,
                "advanced": bool(ADVANCED.search(name))})

buf = io.StringIO()
buf.write("// GENERATED by scripts/build_exercise_bank.py — DO NOT EDIT BY HAND.\n")
buf.write("// Source: _archive/PTApp/program-source/2026-07-13-exercises-full-list.xlsx (Elie's bank).\n")
buf.write("// Regenerate + bump version only when Elie ships a new bank.\n")
buf.write(f"export const EXERCISE_BANK_VERSION = {BANK_VERSION};\n\n")
buf.write("export const MUSCLE_GROUPS = {\n")
buf.write("  push: { major: 'Chest', minors: ['Shoulders', 'Triceps'] },\n")
buf.write("  pull: { major: 'Back', minors: ['Rear Delts', 'Biceps', 'Forearms'] },\n")
buf.write("  legs: { major: 'Legs', minors: ['Calves', 'Abs'] },\n};\n\n")
buf.write("export const EXERCISES = " + json.dumps(out, indent=2) + ";\n\n")
buf.write("""// All exercises whose primary muscle rolls up into `bucket` (major or minor name).
export const bankForBucket = (bucket) => EXERCISES.filter(e => e.bucket === bucket);
""")
with open(OUT, "w", encoding="utf-8") as f: f.write(buf.getvalue())
print(f"wrote {OUT}: {len(out)} exercises")
```

- [ ] **Step 2: Run it and eyeball the output**

Run: `python scripts/build_exercise_bank.py`
Expected: `wrote src/exerciseBank.js: ~330 exercises` (345 rows minus dupes). If it exits with `UNKNOWN MUSCLE`, extend `CANON`/`BUCKET` for that spelling and re-run — that is the designed failure mode, not an error to suppress.
Then open `src/exerciseBank.js` and spot-check: "Back Squat" → compound/legs/Legs, "Hammer Curl" → isolation/pull/Biceps, "Lying Shoulder External Rotation with Dumbbell" → slot null.

- [ ] **Step 3: Write bank sanity assertions (first part of the new script)**

```js
// scripts/sanity/sanity-programs.mjs — program generation invariants.
// Run: node scripts/sanity/sanity-programs.mjs
const bankUrl = new URL('../../src/exerciseBank.js', import.meta.url).href;
const { EXERCISES, EXERCISE_BANK_VERSION, MUSCLE_GROUPS, bankForBucket } = await import(bankUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

// === bank integrity ===
assert(EXERCISE_BANK_VERSION === 1, 'EXERCISE_BANK_VERSION is 1');
const names = EXERCISES.map(e => e.name.toLowerCase());
assert(new Set(names).size === names.length, 'no duplicate exercise names');
assert(!names.some(n => n.includes('hmastring')), 'typos cleaned (Hmastrings)');
for (const anchor of ['Flat Barbell Press', 'Back Squat', 'Deadlift'])
  assert(EXERCISES.some(e => e.name === anchor), `anchor present: ${anchor}`);
// every scheduled bucket has enough exercises for the largest quota (pro major
// 24 sets / 4 per exercise = 6 exercises; minors need 12/4 = 3)
for (const [slot, g] of Object.entries(MUSCLE_GROUPS)) {
  assert(bankForBucket(g.major).length >= 6, `${slot} major '${g.major}' has ≥6 exercises`);
  for (const m of g.minors)
    assert(bankForBucket(m).length >= 3, `${slot} minor '${m}' has ≥3 exercises`);
}
assert(EXERCISES.every(e => e.slot === null || ['push','pull','legs'].includes(e.slot)), 'slots are push/pull/legs/null');
console.log('bank OK');
```

- [ ] **Step 4: Run it**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: all ✓, `bank OK`. If a bucket count fails, the bank really is thin there — flag to Pierre/Elie rather than lowering the threshold.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_exercise_bank.py src/exerciseBank.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): exercise bank generated from Elie's xlsx (345 rows cleaned, tagged, bucketed)"
git push origin master
```

---

### Task 2: `src/programRules.js` — tiers, methods, quotas, weak-point strategies

**Files:**
- Create: `src/programRules.js`
- Modify: `scripts/sanity/sanity-programs.mjs` (append part 2)

**Interfaces:**
- Produces: `PROGRAM_RULES_VERSION = 1`; `TIERS`; `METHODS` (keys: `progLoad, descPyramid, fiveOfFive, doOrDie, statoDynamic, endurance`); `DEFAULT_SEQUENCE`; `FAT_THRESHOLD = { male: 18, female: 25 }`; `rankGroups(scores)` → `{ weak, mid, strong }` (each `'push'|'pull'|'legs'`); `majorQuotas(classKey, strategy, ranks, isStrength)` → `{ push, pull, legs }` (sets/week); `minorQuota(majorSets)` → number; `dayOrder(strategy, ranks)` → `['legs','pull','push']`-style array.

- [ ] **Step 1: Append failing assertions to sanity-programs.mjs**

```js
// === part 2: rules ===
const rulesUrl = new URL('../../src/programRules.js', import.meta.url).href;
const { TIERS, METHODS, DEFAULT_SEQUENCE, FAT_THRESHOLD, PROGRAM_RULES_VERSION,
        rankGroups, majorQuotas, minorQuota, dayOrder } = await import(rulesUrl);

assert(PROGRAM_RULES_VERSION === 1, 'PROGRAM_RULES_VERSION is 1');
assert(JSON.stringify(TIERS.intA) === '[14,17]' && JSON.stringify(TIERS.pro) === '[21,24]', 'tier table matches spec §3');
assert(DEFAULT_SEQUENCE.join() === 'progLoad,descPyramid,fiveOfFive,doOrDie,statoDynamic,endurance', 'default block sequence = Client X');
assert(FAT_THRESHOLD.male === 18 && FAT_THRESHOLD.female === 25, 'fat-loss thresholds 18/25');
assert(METHODS.progLoad.setPcts.join() === '55,60,70,80' && METHODS.progLoad.repsPerSet[3] === '8-10',
  'progressive load: within-session 55→80, top set 8-10 (Elie correction)');
assert(METHODS.descPyramid.setPcts[0] === 85 && METHODS.descPyramid.repsPerSet.join() === '8,12,15,18',
  'descending pyramid: heavy first set');
assert(METHODS.fiveOfFive.objective === 'strength' && METHODS.fiveOfFive.setsPerExercise === 5, '5of5 strength 5 sets');
assert(METHODS.doOrDie.pctText === '30%' && METHODS.doOrDie.restSec === 40, 'do-or-die 30% short rest');
assert(METHODS.endurance.objective === 'fatLoss', 'endurance objective');

// tie-break: equal scores ⇒ legs weakest, then pull, then bench-side strongest (Elie-confirmed)
assert(JSON.stringify(rankGroups({ bench: 3, squat: 3, deadlift: 3 })) ===
  JSON.stringify({ weak: 'legs', mid: 'pull', strong: 'push' }), 'tie-break legs > pull > push');
assert(rankGroups({ bench: 5, squat: 2, deadlift: 4 }).weak === 'legs', 'low squat ⇒ weak legs');
assert(rankGroups({ bench: 1, squat: 5, deadlift: 5 }).weak === 'push', 'low bench ⇒ weak push');

// strategy 'top' (odd blocks): weak=hi, mid=midpoint, strong=lo — intA [14,17]
const r = { weak: 'legs', mid: 'pull', strong: 'push' };
assert(JSON.stringify(majorQuotas('intA', 'top', r, false)) === JSON.stringify({ push: 14, pull: 16, legs: 17 }),
  'top strategy intA → legs 17 / pull 16 / push 14');
// strategy 'steal' (even blocks): weak=hi+2, strong=lo−2
assert(JSON.stringify(majorQuotas('intA', 'steal', r, false)) === JSON.stringify({ push: 12, pull: 16, legs: 19 }),
  'steal strategy intA → legs 19 / push 12');
// strength blocks ×¾ (Elie-approved; 16-19 → 12-14 precedent)
assert(majorQuotas('intA', 'top', r, true).legs === 13, 'strength block: 17 × ¾ → 13');
// minors ride their day's major at half (couples day emphasis automatically)
assert(minorQuota(17) === 9 && minorQuota(14) === 7, 'minor = round(major/2)');
// day order: 'top' leads with weak day; 'steal' keeps standard order
assert(dayOrder('top', r).join() === 'legs,pull,push', 'top: weak day leads');
assert(dayOrder('steal', r).join() === 'push,pull,legs', 'steal: standard order');
console.log('rules OK');
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: FAIL — cannot resolve `../../src/programRules.js`.

- [ ] **Step 3: Implement `src/programRules.js`**

```js
// Program-generation rulebook (spec docs/superpowers/specs/2026-07-13-program-generation-design.md,
// every number Elie-approved 2026-07-13). Data + pure functions ONLY — no React, no state.
// Bump PROGRAM_RULES_VERSION on ANY change: stored programs are frozen and stamp
// the version they were generated with (CHARTS_VERSION precedent).
export const PROGRAM_RULES_VERSION = 1;

// Sets per MAJOR muscle per week, by eval classification (spec §3).
export const TIERS = { begA: [9, 11], begB: [11, 13], intA: [14, 17], intB: [18, 21], pro: [21, 24] };

// Fat-loss block auto-tick thresholds, % body fat (spec §5).
export const FAT_THRESHOLD = { male: 18, female: 25 };

// Method catalog (spec §4). setPcts = per-set %1RM for within-session pyramids;
// pctText is the display fallback for uniform-intensity methods.
export const METHODS = {
  progLoad: {                    // load climbs, reps preserved; trainer adjusts load if top-set reps fall out of 8-10
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: [55, 60, 70, 80], repsPerSet: ['10', '10', '10', '8-10'], restSec: 90,
  },
  descPyramid: {                 // heavy first set to instigate fatigue, then lighter/higher reps
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: [85, 70, 60, 50], repsPerSet: ['8', '12', '15', '18'], restSec: 90,
  },
  fiveOfFive: {
    objective: 'strength', setsPerExercise: 5,
    setPcts: null, pctText: '80-85%', repsText: '5', restSec: 150,
  },
  doOrDie: {                     // 20+ = to failure
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: null, pctText: '30%', repsText: '20+', restSec: 40,
  },
  statoDynamic: {                // mid-rep pauses (stato-dynamic contraction)
    objective: 'hypertrophy', setsPerExercise: 4,
    setPcts: null, pctText: '25-30%', repsText: '12', restSec: 60,
  },
  endurance: {                   // fat-loss block; weeks 1&3 circuits, 2&4 straight sets (kernel special-cases)
    objective: 'fatLoss', setsPerExercise: 3,
    setPcts: null, pctText: '30-40%', repsText: '20-25', restSec: 45,
    circuit: { rounds: 4, exercises: 7, repsText: '15-20', restBetweenExSec: 40, restBetweenRoundsSec: 120 },
  },
};

// Client X default block sequence (spec §5). Slot 6 swaps to fiveOfFive when
// the trainer excludes the fat-loss block (keeps hypertrophy/strength alternation).
export const DEFAULT_SEQUENCE = ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'endurance'];

const GROUP_OF_LIFT = { bench: 'push', squat: 'legs', deadlift: 'pull' };
// Tie-break priority when scores tie: legs weakest first, then pull, then push
// ("squat low hence more work on legs" — Elie-confirmed 2026-07-13).
const TIE_ORDER = ['legs', 'pull', 'push'];

// scores = evalRecord.frozen.scores ({bench,squat,deadlift}, all non-null — the
// UI gates generation on a fully-scored eval). → { weak, mid, strong } groups.
export function rankGroups(scores) {
  const ranked = Object.entries(GROUP_OF_LIFT)
    .map(([lift, group]) => ({ group, score: scores[lift] }))
    .sort((a, b) => a.score - b.score || TIE_ORDER.indexOf(a.group) - TIE_ORDER.indexOf(b.group));
  return { weak: ranked[0].group, mid: ranked[1].group, strong: ranked[2].group };
}

// Weekly sets for the three MAJORS. strategy 'top' = position within the tier
// range; 'steal' = weak takes max+2, strong pays min−2 (spec §3). Strength
// blocks scale everything ×¾ (Elie-approved).
export function majorQuotas(classKey, strategy, ranks, isStrength) {
  const [lo, hi] = TIERS[classKey];
  const mid = Math.round((lo + hi) / 2);
  const base = strategy === 'steal'
    ? { [ranks.weak]: hi + 2, [ranks.mid]: mid, [ranks.strong]: lo - 2 }
    : { [ranks.weak]: hi, [ranks.mid]: mid, [ranks.strong]: lo };
  const scale = isStrength ? 0.75 : 1;
  return {
    push: Math.round(base.push * scale),
    pull: Math.round(base.pull * scale),
    legs: Math.round(base.legs * scale),
  };
}

// Each minor rides its day's major at half volume — this makes weak-day minors
// automatically train at the top of their half-tier (spec §3 odd-block rule)
// without a second bookkeeping path.
export const minorQuota = (majorSets) => Math.round(majorSets / 2);

// 'top' blocks lead the week with the weak group's day; 'steal' blocks keep
// the standard Push/Pull/Legs order (emphasis lives in the quotas).
export function dayOrder(strategy, ranks) {
  return strategy === 'top' ? [ranks.weak, ranks.mid, ranks.strong] : ['push', 'pull', 'legs'];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: all ✓ through `rules OK`.

- [ ] **Step 5: Commit**

```bash
git add src/programRules.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): rulebook - tiers, method catalog, weak-point strategies (all Elie-approved numbers)"
git push origin master
```

---

### Task 3: `src/programKernel.js` — the ONE generation kernel

**Files:**
- Create: `src/programKernel.js`
- Modify: `scripts/sanity/sanity-programs.mjs` (append part 3)

**Interfaces:**
- Consumes: everything from Tasks 1-2; `genId`, `localDateStr` idioms from `utils.js` (kernel takes `id`/dates as ARGS to stay pure — caller supplies them).
- Produces: `generateProgram({ id, client, evalRecord, fatPct, includeFatLoss, methods, startDate, createdAt })` → full frozen program record (shape in Step 3 header comment). `ANCHORS` map. Pure and deterministic: same args ⇒ deep-equal output.

- [ ] **Step 1: Append failing assertions (part 3)**

```js
// === part 3: kernel ===
const kernelUrl = new URL('../../src/programKernel.js', import.meta.url).href;
const { generateProgram, ANCHORS } = await import(kernelUrl);

const client = { id: 'c1', gender: 'male', birthdate: '1995-01-10' };
const evalRec = {
  id: 'e1', clientId: 'c1', date: '2026-07-10', branch: '1rm',
  raw: { bodyweightKg: 80, benchKg: 100, squatKg: 110, deadliftKg: 170 },   // squat weakest (ratio 1.375→2), bench 1.25→3, dl 2.125→4
  frozen: { scores: { bench: 3, squat: 2, deadlift: 4 }, liftAvg: 3, classification: 'intA', chartsVersion: 2 },
};
const args = {
  id: 'p1', client, evalRecord: evalRec, fatPct: 22, includeFatLoss: true,
  methods: ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'endurance'],
  startDate: '2026-07-20', createdAt: '2026-07-13T10:00:00.000Z',
};
const prog = generateProgram(args);

assert(prog.blocks.length === 6 && prog.rulesVersion === 1 && prog.bankVersion === 1, '6 blocks, versions stamped');
assert(prog.classification === 'intA' && prog.ranks.weak === 'legs', 'class + weak point derived from eval');
assert(prog.blocks[0].strategy === 'top' && prog.blocks[1].strategy === 'steal' && prog.blocks[2].strategy === 'top',
  'strategies alternate by block parity');
assert(prog.blocks[0].startDate === '2026-07-20' && prog.blocks[1].startDate === '2026-08-17',
  'blocks are 28 days apart');
assert(prog.blocks[0].days[0].slot === 'legs', 'odd block: weak day (legs) leads');
assert(prog.blocks[1].days[0].slot === 'push', 'even block: standard order');

// anchors present in EVERY block, with kg from the eval 1RMs rounded to 2.5
for (const [i, b] of prog.blocks.entries()) {
  if (b.methodId === 'endurance') continue;   // endurance straight-set days still carry anchors — checked below
  const pushDay = b.days.find(x => x.slot === 'push');
  const bench = pushDay.exercises.find(e => e.name === 'Flat Barbell Press');
  assert(bench && bench.setKg, `block ${i}: bench anchor with kg`);
}
const b0bench = prog.blocks[0].days.find(x => x.slot === 'push').exercises.find(e => e.name === 'Flat Barbell Press');
assert(JSON.stringify(b0bench.setKg) === '[55,60,70,80]', 'progLoad bench kg = 55/60/70/80 (pcts × 100kg 1RM)');
const b0squat = prog.blocks[0].days.find(x => x.slot === 'legs').exercises.find(e => e.name === 'Back Squat');
assert(b0squat.setKg[0] === 60.5 - 0.5 || b0squat.setKg[0] === 60, 'squat kg rounded to 2.5 (110×0.55=60.5→60)');

// volume math: legs day of block 0 (top, intA) = Legs 17 + Calves 9 + Abs 9
const legsDay = prog.blocks[0].days.find(x => x.slot === 'legs');
const setsFor = (day, bucket) => day.exercises.filter(e => e.bucket === bucket).reduce((s, e) => s + e.sets, 0);
assert(setsFor(legsDay, 'Legs') === 17, 'legs major lands exactly on 17');
assert(setsFor(legsDay, 'Calves') === 9 && setsFor(legsDay, 'Abs') === 9, 'minors = round(17/2) = 9');

// compounds first, isolation after (within each bucket listing)
const legIdx = legsDay.exercises.filter(e => e.bucket === 'Legs');
const firstIso = legIdx.findIndex(e => e.type === 'isolation');
assert(firstIso === -1 || legIdx.slice(firstIso).every(e => e.type === 'isolation'), 'compounds before isolation');

// strength block volume ×¾
const b2legs = prog.blocks[2].days.find(x => x.slot === 'legs');
assert(setsFor(b2legs, 'Legs') === 13, 'strength block legs 17×¾ → 13');

// endurance block: days = straight sets, daysAlt = 3 full-body circuit days
const endur = prog.blocks[5];
assert(endur.methodId === 'endurance' && endur.daysAlt && endur.daysAlt.length === 3, 'endurance has circuit alt-days');
assert(endur.daysAlt[0].exercises.length === 7 && endur.daysAlt[0].exercises[0].sets === 4,
  'circuit day: 7 exercises × 4 rounds');

// rotation: block 3 (doOrDie, hypertrophy 4-set like block 0) picks different
// non-anchor chest exercises than block 0
const chestNames = (b) => b.days.find(x => x.slot === 'push').exercises
  .filter(e => e.bucket === 'Chest' && e.name !== 'Flat Barbell Press').map(e => e.name);
const c0 = chestNames(prog.blocks[0]), c3 = chestNames(prog.blocks[3]);
assert(c3.some(n => !c0.includes(n)), 'variant rotation across blocks');

// determinism: same args ⇒ identical output
assert(JSON.stringify(generateProgram(args)) === JSON.stringify(prog), 'byte-identical regeneration');

// beginner filter: begA eval avoids advanced barbell variants for non-anchors
const begEval = { ...evalRec, frozen: { ...evalRec.frozen, scores: { bench: 1, squat: 1, deadlift: 1 }, liftAvg: 1, classification: 'begA' } };
const begProg = generateProgram({ ...args, evalRecord: begEval });
const begChest = begProg.blocks[0].days.find(x => x.slot === 'push').exercises
  .filter(e => e.bucket === 'Chest' && e.name !== 'Flat Barbell Press');
assert(begChest.every(e => !e.advanced), 'begA: no advanced non-anchor chest exercises');

// fat-loss excluded ⇒ slot 6 becomes fiveOfFive
const noFat = generateProgram({ ...args, includeFatLoss: false,
  methods: ['progLoad', 'descPyramid', 'fiveOfFive', 'doOrDie', 'statoDynamic', 'fiveOfFive'] });
assert(noFat.blocks[5].methodId === 'fiveOfFive', 'slot 6 fallback');
console.log('kernel OK');
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: FAIL — cannot resolve `../../src/programKernel.js`.

- [ ] **Step 3: Implement `src/programKernel.js`**

```js
// THE program-generation kernel (spec §6). ONE entry point, pure + deterministic:
// the setup sheet's preview and the save path call the SAME function with the
// SAME args (compute1RMFrozen precedent — preview can never disagree with what
// gets stored). No Date.now()/Math.random(): caller supplies id + timestamps.
//
// Program record shape (frozen at generation, schema v6):
// { id, clientId, evalId, createdAt, startDate, fatPct, rulesVersion, bankVersion,
//   classification, ranks: {weak,mid,strong},
//   blocks: [{ index, methodId, objective, strategy, startDate,
//              days: [{ slot, exercises: [{ name, bucket, type, advanced, sets,
//                        repsText, pctText, setKg|null, restSec }] }],
//              daysAlt: circuit days (endurance blocks only) }] }
import { EXERCISES, EXERCISE_BANK_VERSION, MUSCLE_GROUPS, bankForBucket } from './exerciseBank';
import { PROGRAM_RULES_VERSION, METHODS, rankGroups, majorQuotas, minorQuota, dayOrder } from './programRules';

// The three lifts with known 1RMs — the only exercises that show kg (spec §6).
export const ANCHORS = {
  push: { name: 'Flat Barbell Press', rawKey: 'benchKg' },
  legs: { name: 'Back Squat', rawKey: 'squatKg' },
  pull: { name: 'Deadlift', rawKey: 'deadliftKg' },
};

const roundPlate = (kg) => Math.round(kg / 2.5) * 2.5;      // 2.5 kg plate rounding
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');                     // noon guard: no UTC date-shift (toISOString trap)
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Deterministic candidate list for a bucket: compounds first then isolations
// (stable bank order inside each), beginner filter applied, anchor excluded
// (it is placed explicitly), rotated by blockIndex so consecutive blocks pick
// different variants. Rotation offset only advances through blocks that USE
// this bucket, which every block does — blockIndex is a valid clock.
function candidates(bucket, blockIndex, isBeginner, anchorName) {
  let pool = bankForBucket(bucket).filter(e => e.name !== anchorName);
  if (isBeginner) {
    const safe = pool.filter(e => !e.advanced);
    if (safe.length >= 3) pool = safe;                       // only filter when alternatives exist (spec §6)
  }
  const comp = pool.filter(e => e.type === 'compound');
  const iso = pool.filter(e => e.type === 'isolation');
  const rot = (arr) => arr.length ? arr.map((_, i) => arr[(i + blockIndex * 2) % arr.length]) : arr;
  return [...rot(comp), ...rot(iso)];
}

// Materialize one bucket's exercises for a day: exact `target` total sets,
// `per` sets per exercise, anchor (if any) first with per-set kg.
function fillBucket({ bucket, target, method, blockIndex, isBeginner, anchor, anchorKg }) {
  const per = method.setsPerExercise;
  const out = [];
  let remaining = target;
  if (anchor && remaining >= per) {
    out.push(exerciseEntry(anchorStub(anchor, bucket), per, method,
      method.setPcts ? method.setPcts.map(p => roundPlate(anchorKg * p / 100)) : null));
    remaining -= per;
  }
  const pool = candidates(bucket, blockIndex, isBeginner, anchor ? anchor.name : null);
  for (let i = 0; remaining > 0 && i < pool.length; i++) {
    const sets = remaining >= per * 2 ? per : remaining;     // last exercise absorbs the remainder exactly
    out.push(exerciseEntry(pool[i], Math.min(sets, remaining), method, null));
    remaining -= Math.min(sets, remaining);
  }
  return out;
}
const anchorStub = (anchor, bucket) =>
  EXERCISES.find(e => e.name === anchor.name) || { name: anchor.name, bucket, type: 'compound', advanced: true };
const exerciseEntry = (ex, sets, method, setKg) => ({
  name: ex.name, bucket: ex.bucket, type: ex.type, advanced: !!ex.advanced,
  sets,
  repsText: method.repsPerSet ? method.repsPerSet.join('/') : method.repsText,
  pctText: method.setPcts ? method.setPcts.map(p => p + '%').join('/') : method.pctText,
  setKg, restSec: method.restSec,
});

// One standard PPL day for a block.
function buildDay({ slot, majors, method, blockIndex, isBeginner, raw }) {
  const group = MUSCLE_GROUPS[slot];
  const majorSets = majors[slot];
  const anchor = ANCHORS[slot];
  const exercises = fillBucket({
    bucket: group.major, target: majorSets, method, blockIndex, isBeginner,
    anchor, anchorKg: raw[anchor.rawKey],
  });
  for (const minor of group.minors)
    exercises.push(...fillBucket({ bucket: minor, target: minorQuota(majorSets), method, blockIndex, isBeginner, anchor: null }));
  return { slot, exercises };
}

// Endurance circuit day: 7 stations × 4 rounds, one per bucket spread across the
// whole body (spec §4) — deterministic pick = first unused candidate per bucket.
function buildCircuitDay(blockIndex, dayIdx, isBeginner) {
  const c = METHODS.endurance.circuit;
  const stations = ['Chest', 'Back', 'Legs', 'Shoulders', 'Legs', 'Abs', 'Biceps'];
  const exercises = stations.map((bucket, i) => {
    const pool = candidates(bucket, blockIndex + dayIdx + i, isBeginner, null);
    const ex = pool[0];
    return { name: ex.name, bucket: ex.bucket, type: ex.type, advanced: !!ex.advanced,
      sets: c.rounds, repsText: c.repsText, pctText: METHODS.endurance.pctText,
      setKg: null, restSec: c.restBetweenExSec };
  });
  return { slot: 'circuit', exercises };
}

export function generateProgram({ id, client, evalRecord, fatPct, includeFatLoss, methods, startDate, createdAt }) {
  const classification = evalRecord.frozen.classification;
  const ranks = rankGroups(evalRecord.frozen.scores);
  const isBeginner = classification === 'begA' || classification === 'begB';
  const blocks = methods.map((methodId, index) => {
    const method = METHODS[methodId];
    const strategy = index % 2 === 0 ? 'top' : 'steal';
    const majors = majorQuotas(classification, strategy, ranks, method.objective === 'strength');
    const blockStart = addDays(startDate, index * 28);       // six 4-week blocks (spec §5)
    const order = dayOrder(strategy, ranks);
    const days = order.map(slot => buildDay({ slot, majors, method, blockIndex: index, isBeginner, raw: evalRecord.raw }));
    const block = { index, methodId, objective: method.objective, strategy, startDate: blockStart, days };
    if (methodId === 'endurance')                            // weeks 1&3 run daysAlt (circuits), 2&4 run days
      block.daysAlt = [0, 1, 2].map(d => buildCircuitDay(index, d, isBeginner));
    return block;
  });
  return {
    id, clientId: client.id, evalId: evalRecord.id, createdAt, startDate,
    fatPct: fatPct ?? null, includeFatLoss: !!includeFatLoss,
    rulesVersion: PROGRAM_RULES_VERSION, bankVersion: EXERCISE_BANK_VERSION,
    classification, ranks, blocks,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: all ✓ through `kernel OK`. The two most likely honest failures: (a) exact-set assertion — check `fillBucket` remainder logic, never pad with a 1-set orphan when `pool` runs dry; (b) rotation assertion — the chest pool must be ≥4 non-anchor entries (it is: bank has ~14 chest exercises).

- [ ] **Step 5: Commit**

```bash
git add src/programKernel.js scripts/sanity/sanity-programs.mjs
git commit -m "feat(programs): generation kernel - deterministic 6-block PPL builder with anchors, rotation, beginner filter"
git push origin master
```

---

### Task 4: Schema v6, reducer actions, merge paths, live-diff gate

**Files:**
- Modify: `src/utils.js` (migration block ~line 794-812; reducer `ADD_EVALUATION` region ~line 1108-1150; `DELETE_CLIENT` ~line 1012; `REPLACE_ALL` ~line 1157; `mergeData` ~line 870; `mergeBackup` ~line 1287)
- Create: `scripts/sanity/sanity-live-v6-diff.mjs`
- Modify: `scripts/sanity/sanity-programs.mjs` (append part 4)

**Interfaces:**
- Consumes: nothing new — pure utils.js surgery following the `evaluations[]` pattern at each site.
- Produces: `DATA_VERSION = 6`; reducer cases `ADD_PROGRAM` (payload = full record), `EDIT_PROGRAM` (payload = full record, FULL-RECORD contract like EDIT_EVALUATION), `DELETE_PROGRAM` (payload = program id); `state.programs[]` handled in every merge path.

- [ ] **Step 1: Append failing reducer/merge assertions (part 4)**

```js
// === part 4: reducer + merge coexistence ===
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { reducer, migrateData, mergeData } = await import(utilsUrl);

const base = { clients: [{ id: 'c1', name: 'A' }], sessions: [], evaluations: [], programs: [],
  todos: [], auditLog: [], messageTemplates: {}, _dataVersion: 6 };
const rec = { ...prog, id: 'p9' };                            // reuse the kernel output from part 3

let s = reducer(base, { type: 'ADD_PROGRAM', payload: rec });
assert(s.programs.length === 1 && s.programs[0]._modified, 'ADD_PROGRAM appends + stamps _modified');
assert(s.auditLog.some(a => a.type === 'program_generated'), 'ADD_PROGRAM audit-logged');

const swapped = { ...rec, blocks: rec.blocks.slice() };       // full-record replace (swap-exercise path)
s = reducer(s, { type: 'EDIT_PROGRAM', payload: swapped });
assert(s.programs.length === 1, 'EDIT_PROGRAM replaces, never duplicates');

s = reducer(s, { type: 'DELETE_PROGRAM', payload: 'p9' });
assert(s.programs.length === 0 && s.auditLog.some(a => a.type === 'program_deleted'), 'DELETE_PROGRAM + audit');

s = reducer({ ...base, programs: [{ ...rec, id: 'px' }] }, { type: 'DELETE_CLIENT', payload: 'c1' });
assert(s.programs.length === 0, 'DELETE_CLIENT cascades to programs');

// migration: v5 blob (no programs) → v6 seeds []
const migrated = migrateData({ clients: [], sessions: [], evaluations: [], _dataVersion: 5 });
assert(Array.isArray(migrated.programs) && migrated._dataVersion === 6, 'v5→v6 seeds programs[]');

// merge: programs union-by-ID with newest-_modified-wins, evaluations pattern
const local = { ...base, programs: [{ id: 'pA', _modified: '2026-07-01T00:00:00Z' }] };
const remote = { ...base, programs: [{ id: 'pA', _modified: '2026-07-02T00:00:00Z' }, { id: 'pB', _modified: '2026-07-01T00:00:00Z' }] };
const merged = mergeData(local, remote);
assert(merged.programs.length === 2, 'merge unions programs by ID');
assert(merged.programs.find(p => p.id === 'pA')._modified === '2026-07-02T00:00:00Z', 'newer _modified wins');
console.log('reducer/merge OK');
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/sanity/sanity-programs.mjs`
Expected: FAIL at `ADD_PROGRAM appends` (unknown action returns state unchanged).

- [ ] **Step 3: Implement in `src/utils.js`** — five surgical edits, each copying the adjacent `evaluations` idiom:

3a. Migration (after the `if (v < 5)` block, before the `data.evaluations = ...` safety line):

```js
  // v5 → v6: program generation (v2.13). Adds top-level programs[] — frozen
  // 6-month training plans (sessions/evaluations pattern: per-record _modified,
  // union-by-ID merge). Purely additive: nothing existing is reshaped.
  if (v < 6) {
    data.programs = data.programs || [];
    v = 6;
  }
```
Also change `const DATA_VERSION = 5;` → `const DATA_VERSION = 6;` and add `data.programs = data.programs || [];` next to the existing `data.evaluations = data.evaluations || [];` safety line.

3b. Reducer cases (immediately after the `DELETE_EVALUATION` case):

```js
    case 'ADD_PROGRAM': {
      // Frozen at generation (spec §8): the payload is the complete kernel output.
      // History is retained — regeneration ADDS, the viewer shows the newest.
      const entry = audit('program_generated', { programId: action.payload.id, clientId: action.payload.clientId });
      return { ...state,
        programs: [...(state.programs || []), { ...action.payload, _modified: now() }],
        auditLog: [...(state.auditLog || []), entry] };
    }
    case 'EDIT_PROGRAM': {
      // FULL-RECORD contract (EDIT_EVALUATION precedent): swap-exercise re-dispatches
      // the whole record — partial patches forbidden, blocks stay internally consistent.
      const newProg = { ...action.payload, _modified: now() };
      return { ...state, programs: (state.programs || []).map(p => p.id === newProg.id ? newProg : p) };
    }
    case 'DELETE_PROGRAM': {
      const entry = audit('program_deleted', { programId: action.payload });
      return { ...state,
        programs: (state.programs || []).filter(p => p.id !== action.payload),
        auditLog: [...(state.auditLog || []), entry] };
    }
```
(Reuse the file's existing audit-entry construction — read how `evaluation_deleted` builds its entry at ~line 1135 and mirror it exactly; if there is no shared `audit()` helper, inline the same object literal shape.)

3c. `DELETE_CLIENT` (~line 1012) — alongside the evaluations filter:

```js
        programs: (state.programs || []).filter(p => p.clientId !== action.payload),
```

3d. `REPLACE_ALL` seed (~line 1157): add `programs: [],` to the defaults object.

3e. `mergeData` (~line 871) and `mergeBackup` (~line 1287) — copy the evaluations lines verbatim with `programs`:

```js
    // programs merge exactly like evaluations — per-record _modified, union by ID
    programs: mergeById(local.programs, remote.programs),
```
```js
  const livePracticeIds = new Set((live.programs || []).map(p => p.id));
  merged.programs = [...(live.programs || []), ...(backup.programs || []).filter(p => !livePracticeIds.has(p.id))];
```

- [ ] **Step 4: Run all sanity scripts**

Run: `node scripts/sanity/sanity-programs.mjs && node scripts/sanity/sanity-reducer.mjs && node scripts/sanity/sanity-merge-migration.mjs && node scripts/sanity/sanity-1rm.mjs && node scripts/sanity/sanity-evaluations.mjs`
Expected: ALL pass — the old scripts prove v6 didn't disturb v5 behavior.

- [ ] **Step 5: Create the live-diff gate** — copy `scripts/sanity/sanity-live-v5-diff.mjs`, adapt: input = newest snapshot in `C:\projects\_archive\PTApp\data-snapshots\`, assert the v6 migration output differs from input ONLY by `_dataVersion: 6` and `programs: []` (byte-diff after removing exactly those two keys). Keep the v5 script untouched (historical gate).

Run: `node scripts/sanity/sanity-live-v6-diff.mjs`
Expected: `live diff clean: only _dataVersion + programs[] added`.

- [ ] **Step 6: Commit**

```bash
git add src/utils.js scripts/sanity/sanity-programs.mjs scripts/sanity/sanity-live-v6-diff.mjs
git commit -m "feat(programs): schema v6 + ADD/EDIT/DELETE_PROGRAM + merge paths (evaluations[] pattern throughout)"
git push origin master
```

---

### Task 5: i18n strings (EN + AR)

**Files:**
- Modify: `src/i18n.js` (append to both `en` and `ar` objects — Edit tool only, never regenerate the file: subagent-file-safety memory)

**Interfaces:**
- Produces: keys consumed by Tasks 6-7: `programs, generateProgram, programSetupTitle, bodyFatPct, includeFatLossBlock, fatLossSuggested, blockLabel, startDateLabel, weakPointLabel, needs1rmEval, methodProgLoad, methodDescPyramid, methodFiveOfFive, methodDoOrDie, methodStatoDynamic, methodEndurance, objHypertrophy, objStrength, objFatLoss, swapExercise, regenerateProgram, regenerateNote, deleteProgram, deleteProgramMsg, setsLabel, repsLabel, restLabel, circuitWeeksNote, roundsLabel, noPrograms, viewProgram, kgHint (exists), weekOf`

- [ ] **Step 1: Add EN keys**

```js
    // ─── v2.13 program generation ───
    programs: 'Programs',
    generateProgram: 'Generate program',
    programSetupTitle: 'New 6-month program',
    bodyFatPct: 'Body fat %',
    includeFatLossBlock: 'Include fat-loss block',
    fatLossSuggested: 'Suggested at this body-fat level',
    blockLabel: 'Block',
    startDateLabel: 'Start date',
    weakPointLabel: 'Weak point',
    needs1rmEval: 'Needs a completed 1RM evaluation (all three lifts)',
    methodProgLoad: 'Progressive load',
    methodDescPyramid: 'Descending pyramid',
    methodFiveOfFive: '5 of 5',
    methodDoOrDie: 'Do or die',
    methodStatoDynamic: 'Stato-dynamic',
    methodEndurance: 'Endurance (fat loss)',
    objHypertrophy: 'Hypertrophy',
    objStrength: 'Strength',
    objFatLoss: 'Fat loss',
    swapExercise: 'Swap exercise',
    regenerateProgram: 'Regenerate',
    regenerateNote: 'Creates a new program; the old one stays in history.',
    deleteProgram: 'Delete program',
    deleteProgramMsg: 'The program will be removed. Past programs are kept in data history.',
    setsLabel: 'sets',
    repsLabel: 'reps',
    restLabel: 'rest',
    roundsLabel: 'rounds',
    circuitWeeksNote: 'Weeks 1 & 3: circuits · Weeks 2 & 4: straight sets',
    noPrograms: 'No program yet',
    viewProgram: 'View program',
    weekOf: 'Week of',
```

- [ ] **Step 2: Add AR keys** (same key order; Elie reads Arabic — flag any phrasing he wants changed at review)

```js
    // ─── v2.13 program generation ───
    programs: 'البرامج',
    generateProgram: 'إنشاء برنامج',
    programSetupTitle: 'برنامج جديد لستة أشهر',
    bodyFatPct: 'نسبة الدهون %',
    includeFatLossBlock: 'إضافة مرحلة حرق الدهون',
    fatLossSuggested: 'مقترحة عند هذه النسبة من الدهون',
    blockLabel: 'مرحلة',
    startDateLabel: 'تاريخ البدء',
    weakPointLabel: 'نقطة الضعف',
    needs1rmEval: 'يتطلب تقييم 1RM مكتمل (الرفعات الثلاث)',
    methodProgLoad: 'زيادة الحمل التدريجية',
    methodDescPyramid: 'الهرم التنازلي',
    methodFiveOfFive: '٥ × ٥',
    methodDoOrDie: 'حتى الإجهاد',
    methodStatoDynamic: 'ثابت-متحرك',
    methodEndurance: 'تحمّل (حرق دهون)',
    objHypertrophy: 'تضخيم',
    objStrength: 'قوة',
    objFatLoss: 'حرق دهون',
    swapExercise: 'تبديل التمرين',
    regenerateProgram: 'إعادة الإنشاء',
    regenerateNote: 'ينشئ برنامجاً جديداً؛ يبقى القديم في السجل.',
    deleteProgram: 'حذف البرنامج',
    deleteProgramMsg: 'سيُحذف البرنامج. تبقى البرامج السابقة محفوظة في البيانات.',
    setsLabel: 'مجموعات',
    repsLabel: 'تكرارات',
    restLabel: 'راحة',
    roundsLabel: 'جولات',
    circuitWeeksNote: 'الأسبوعان ١ و٣: دوائر تدريبية · الأسبوعان ٢ و٤: مجموعات عادية',
    noPrograms: 'لا يوجد برنامج بعد',
    viewProgram: 'عرض البرنامج',
    weekOf: 'أسبوع',
```

- [ ] **Step 3: Verify no key collisions**

Run: `node -e "import('./src/i18n.js').then(m => console.log('i18n loads OK'))"` — if the repo's i18n.js isn't directly importable in node, instead run the build: `npm run build` and confirm no duplicate-key warnings.
Expected: clean load/build.

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "feat(programs): i18n strings EN+AR for program generation UI"
git push origin master
```

---

### Task 6: `ProgramSetup.jsx` — the setup sheet

**Files:**
- Create: `src/components/ProgramSetup.jsx`
- Test: manual (`npm run dev`) — repo has no component tests; the kernel it calls is already sanity-covered.

**Interfaces:**
- Consumes: `generateProgram` (Task 3), `DEFAULT_SEQUENCE, METHODS, FAT_THRESHOLD` (Task 2), `genId, today, haptic` from utils, `Modal`, `t`.
- Produces: `<ProgramSetup client evalRecord dispatch lang onClose />` — dispatches ONE `ADD_PROGRAM` with the kernel's output.

- [ ] **Step 1: Implement**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { genId, today, haptic } from '../utils';
import { t } from '../i18n';
import { DEFAULT_SEQUENCE, METHODS, FAT_THRESHOLD } from '../programRules';
import { generateProgram } from '../programKernel';

const methodLabel = (lang, id) => t(lang, 'method' + id.charAt(0).toUpperCase() + id.slice(1));

// Next Monday from today — programs start on a fresh week (spec §7).
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Setup sheet (spec §7): derived class/weak point, BF% with threshold pre-tick,
// six method dropdowns, start date, ONE Generate tap. All math lives in the
// kernel — this component only collects args.
export default function ProgramSetup({ client, evalRecord, dispatch, lang, onClose }) {
  const [fatPct, setFatPct] = useState('');
  const [fatTouched, setFatTouched] = useState(false);       // trainer's manual tick beats the threshold
  const [includeFat, setIncludeFat] = useState(false);
  const [methods, setMethods] = useState(DEFAULT_SEQUENCE);
  const [startDate, setStartDate] = useState(nextMonday());

  const threshold = FAT_THRESHOLD[client.gender] ?? FAT_THRESHOLD.male;
  const fatNum = parseFloat(fatPct);
  const suggested = Number.isFinite(fatNum) && fatNum >= threshold;
  const fatOn = fatTouched ? includeFat : suggested;         // auto-tick until the trainer takes over

  const onFatPct = (e) => { setFatPct(e.target.value); if (!fatTouched) setIncludeFat(false); };
  const setMethodAt = (i) => (e) => setMethods(methods.map((m, j) => j === i ? e.target.value : m));

  const save = () => {
    haptic();
    // fat-loss OFF ⇒ any endurance slot falls back to fiveOfFive (spec §5)
    const effective = methods.map(m => (!fatOn && m === 'endurance') ? 'fiveOfFive' : m);
    const record = generateProgram({
      id: genId(), client, evalRecord,
      fatPct: Number.isFinite(fatNum) ? fatNum : null, includeFatLoss: fatOn,
      methods: effective, startDate, createdAt: new Date().toISOString(),
    });
    dispatch({ type: 'ADD_PROGRAM', payload: record });
    onClose();
  };

  const scores = evalRecord.frozen.scores;
  return (
    <Modal title={t(lang, 'programSetupTitle')} onClose={onClose}
      action={<button className="btn-primary" style={{ width: '100%' }} onClick={save}>{t(lang, 'generateProgram')}</button>}>
      {/* derived context — read-only */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--t3)', marginBottom: 10 }}>
        <span className={`badge badge-class-${evalRecord.frozen.classification}`}>
          {t(lang, 'class' + evalRecord.frozen.classification.charAt(0).toUpperCase() + evalRecord.frozen.classification.slice(1))}
        </span>
        <span>{t(lang, 'weakPointLabel')}: B{scores.bench} · S{scores.squat} · D{scores.deadlift}</span>
      </div>

      <div className="field-label">{t(lang, 'bodyFatPct')}</div>
      <input className="input" inputMode="decimal" value={fatPct} onChange={onFatPct} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', fontSize: 14 }}>
        <input type="checkbox" checked={fatOn}
          onChange={(e) => { setFatTouched(true); setIncludeFat(e.target.checked); }} />
        {t(lang, 'includeFatLossBlock')}
        {suggested && !fatTouched && <span style={{ fontSize: 11, color: 'var(--t4)' }}>{t(lang, 'fatLossSuggested')}</span>}
      </label>

      <div className="field-label">{t(lang, 'startDateLabel')}</div>
      <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      {methods.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--t4)', minWidth: 64 }}>{t(lang, 'blockLabel')} {i + 1}</span>
          <select className="input" style={{ flex: 1 }} value={m} onChange={setMethodAt(i)}>
            {Object.keys(METHODS).map(id => (
              <option key={id} value={id} disabled={id === 'endurance' && !fatOn}>
                {methodLabel(lang, id)} — {t(lang, 'obj' + METHODS[id].objective.charAt(0).toUpperCase() + METHODS[id].objective.slice(1))}
              </option>
            ))}
          </select>
        </div>
      ))}
    </Modal>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`, open a client with a 1RM eval (wire-up lands in Task 7 — for this task temporarily render `<ProgramSetup>` from EvalSection behind a dev flag, or defer the smoke test to Task 7's step 3 and only verify the build compiles).
Run: `npm run build` — Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProgramSetup.jsx
git commit -m "feat(programs): setup sheet - class/weak-point context, BF% threshold pre-tick, method dropdowns"
git push origin master
```

---

### Task 7: `ProgramViewer.jsx` + swap modal + EvalSection wire-up

**Files:**
- Create: `src/components/ProgramViewer.jsx`
- Modify: `src/components/EvalSection.jsx` (add Programs sub-block under the eval history)

**Interfaces:**
- Consumes: `bankForBucket` (Task 1), `EDIT_PROGRAM`/`DELETE_PROGRAM` (Task 4), i18n keys (Task 5), `ProgramSetup` (Task 6), `Modal`, `formatDate, haptic` from utils.
- Produces: `<ProgramViewer program dispatch lang onClose />`; EvalSection renders: latest program row + `viewProgram` button + `generateProgram` button (gated: latest eval `branch === '1rm'` with all three scores non-null).

- [ ] **Step 1: Implement ProgramViewer**

```jsx
import React, { useState } from 'react';
import Modal from './Modal';
import { formatDate, haptic } from '../utils';
import { t } from '../i18n';
import { bankForBucket } from '../exerciseBank';

const methodLabel = (lang, id) => t(lang, 'method' + id.charAt(0).toUpperCase() + id.slice(1));
const objLabel = (lang, o) => t(lang, 'obj' + o.charAt(0).toUpperCase() + o.slice(1));
const restText = (sec) => sec >= 120 ? `${Math.round(sec / 60)} min` : `${sec}s`;

// Drill-down viewer (spec §7): blocks → days → exercises. Swap is the ONLY edit;
// it re-dispatches the FULL record (EDIT_PROGRAM contract). No sets/reps editing
// by design — the trainer improvises by performance (Elie).
export default function ProgramViewer({ program, dispatch, lang, onClose }) {
  const [openBlock, setOpenBlock] = useState(0);
  const [swap, setSwap] = useState(null);   // { blockIdx, dayKey:'days'|'daysAlt', dayIdx, exIdx }

  const doSwap = (replacementName) => {
    const bank = { ...swap };
    const blocks = program.blocks.map((b, bi) => {
      if (bi !== bank.blockIdx) return b;
      const list = b[bank.dayKey].map((d, di) => {
        if (di !== bank.dayIdx) return d;
        const exercises = d.exercises.map((e, ei) => {
          if (ei !== bank.exIdx) return e;
          const repl = bankForBucket(e.bucket).find(x => x.name === replacementName);
          // keep sets/reps/pct/rest/kg — the slot's prescription is unchanged, only the movement swaps
          return { ...e, name: repl.name, type: repl.type, advanced: repl.advanced };
        });
        return { ...d, exercises };
      });
      return { ...b, [bank.dayKey]: list };
    });
    dispatch({ type: 'EDIT_PROGRAM', payload: { ...program, blocks } });
    setSwap(null);
  };

  const swapTarget = swap && program.blocks[swap.blockIdx][swap.dayKey][swap.dayIdx].exercises[swap.exIdx];
  const dayRows = (b, bi, dayKey) => (b[dayKey] || []).map((day, di) => (
    <div key={dayKey + di} style={{ marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
        {day.slot === 'circuit' ? `${t(lang, 'roundsLabel')} ×4` : day.slot.toUpperCase()}
      </div>
      {day.exercises.map((e, ei) => (
        <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 0', fontSize: 12, borderBottom: '1px solid var(--sep)' }}>
          <span style={{ color: 'var(--t2)' }}>
            {e.name}
            <span style={{ color: 'var(--t5)', marginInlineStart: 6 }}>
              {e.sets}×{e.repsText} · {e.pctText}{e.setKg ? ` · ${e.setKg.join('/')} kg` : ''} · {restText(e.restSec)}
            </span>
          </span>
          <button className="btn-ghost" style={{ fontSize: 11 }}
            onClick={() => { haptic(); setSwap({ blockIdx: bi, dayKey, dayIdx: di, exIdx: ei }); }}>
            {t(lang, 'swapExercise')}
          </button>
        </div>
      ))}
    </div>
  ));

  return (
    <Modal title={`${t(lang, 'programs')} · ${formatDate(program.startDate, lang)}`} onClose={onClose}>
      {program.blocks.map((b, bi) => (
        <div key={bi} style={{ padding: '8px 0', borderBottom: '1px solid var(--sep)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontSize: 14 }}
            onClick={() => setOpenBlock(openBlock === bi ? null : bi)}>
            <span style={{ fontWeight: 600 }}>{t(lang, 'blockLabel')} {bi + 1} · {methodLabel(lang, b.methodId)}</span>
            <span style={{ color: 'var(--t4)', fontSize: 12 }}>{objLabel(lang, b.objective)} · {formatDate(b.startDate, lang)}</span>
          </div>
          {openBlock === bi && (
            <div>
              {b.daysAlt && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>{t(lang, 'circuitWeeksNote')}</div>}
              {dayRows(b, bi, 'days')}
              {b.daysAlt && dayRows(b, bi, 'daysAlt')}
            </div>
          )}
        </div>
      ))}

      {swap && swapTarget && (
        <Modal title={t(lang, 'swapExercise')} onClose={() => setSwap(null)}>
          {bankForBucket(swapTarget.bucket)
            .filter(x => x.type === swapTarget.type && x.name !== swapTarget.name)
            .map(x => (
              <button key={x.name} className="btn-ghost" style={{ display: 'block', width: '100%', textAlign: 'start', padding: '10px 4px', fontSize: 13 }}
                onClick={() => doSwap(x.name)}>{x.name}</button>
            ))}
        </Modal>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Wire into EvalSection.jsx** — under the eval history list (before `{formTarget && ...}`), add:

```jsx
      {/* ─── v2.13: programs (spec §7). Gate: latest eval is 1RM with all lifts scored ─── */}
      <ProgramBlock client={client} state={state} dispatch={dispatch} lang={lang} evals={evals} />
```

and in the same file:

```jsx
function ProgramBlock({ client, state, dispatch, lang, evals }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const latest1rm = evals.find(ev => ev.branch === '1rm'
    && ev.frozen.scores.bench != null && ev.frozen.scores.squat != null && ev.frozen.scores.deadlift != null);
  const progs = (state.programs || [])
    .filter(p => p.clientId === client.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const latest = progs[0];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t(lang, 'programs')}</div>
        <button className="btn-sm" disabled={!latest1rm}
          onClick={() => { haptic(); setSetupOpen(true); }}>{t(lang, 'generateProgram')}</button>
      </div>
      {!latest1rm && <div style={{ fontSize: 12, color: 'var(--t4)' }}>{t(lang, 'needs1rmEval')}</div>}
      {latest ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0' }}>
          <span style={{ color: 'var(--t3)' }}>{formatDate(latest.startDate, lang)} · {latest.blocks.length} {t(lang, 'blockLabel')}</span>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setViewerOpen(true)}>{t(lang, 'viewProgram')}</button>
        </div>
      ) : latest1rm && <div style={{ fontSize: 13, color: 'var(--t4)', padding: '4px 0' }}>{t(lang, 'noPrograms')}</div>}
      {setupOpen && latest1rm && (
        <ProgramSetup client={client} evalRecord={latest1rm} dispatch={dispatch} lang={lang} onClose={() => setSetupOpen(false)} />
      )}
      {viewerOpen && latest && (
        <ProgramViewer program={latest} dispatch={dispatch} lang={lang} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
```
Add imports at the top of EvalSection.jsx: `import ProgramSetup from './ProgramSetup'; import ProgramViewer from './ProgramViewer';`

- [ ] **Step 3: Manual smoke test (both themes, EN + AR/RTL)**

Run: `npm run dev`. Checklist: client without 1RM eval → disabled button + `needs1rmEval` hint · client with 1RM eval → setup sheet shows class badge + scores · BF% 17 vs 19 on a male client toggles the pre-tick · Generate → program row appears · viewer drills to exercises, anchors show kg · swap replaces only the tapped slot, prescription unchanged · endurance block shows circuit note + both day sets · AR: RTL layout not broken (marginInlineStart only) · dark + light themes.

- [ ] **Step 4: Full sanity + build verification**

Run: `node scripts/sanity/sanity-programs.mjs && npm run build`
Then the bundle check from CLAUDE.md:
`node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgramViewer.jsx src/components/EvalSection.jsx
git commit -m "feat(programs): viewer with swap + EvalSection wire-up (generate gated on complete 1RM eval)"
git push origin master
```

---

### Task 8: Version bump, docs, deploy

**Files:**
- Modify: `src/App.jsx` (debug panel version → `v2.13.0`)
- Modify: `src/components/General.jsx` (`DOCS.instructions` → `instructions-v2.13.md`)
- Create: `docs/instructions-v2.13.md`; Modify: `docs/changelog-summary.md`, `docs/changelog-technical.md`, `CLAUDE.md` (new Current Version section, one-line pointer for v2.12.1), `docs/app-health.md` (Feature Overhead Register entry)

**Interfaces:** none — documentation and release mechanics.

- [ ] **Step 1: Bump version strings** (App.jsx debug panel `v2.12.1` → `v2.13.0`; General.jsx DOCS.instructions — the v2.9 two-release drift trap).
- [ ] **Step 2: Write `docs/instructions-v2.13.md`** — condense spec §§3-9 into the per-version feature notes format (see `docs/instructions-v2.12.md` for shape); include the "blocks store days, not weeks" deviation note.
- [ ] **Step 3: Update both changelogs + CLAUDE.md** — CLAUDE.md Current Version becomes v2.13.0 (program generation), v2.12.1 collapses to the Older Versions pointer list; document: ONE kernel rule for `generateProgram`, frozen-at-generation, `programs[]` in every merge path, EDIT_PROGRAM full-record contract, sanity-live-v6-diff as the new gate.
- [ ] **Step 4: Run EVERYTHING**

`node scripts/sanity/sanity-programs.mjs && node scripts/sanity/sanity-reducer.mjs && node scripts/sanity/sanity-counting.mjs && node scripts/sanity/sanity-merge-migration.mjs && node scripts/sanity/sanity-1rm.mjs && node scripts/sanity/sanity-evaluations.mjs && node scripts/sanity/sanity-live-v6-diff.mjs && npm run build` + bundle check.
Expected: all green.

- [ ] **Step 5: Measure data.json growth** (spec §10.4): `node -e` a quick script that runs `generateProgram` with the messy live snapshot's biggest client and prints `JSON.stringify(record).length`. Expected: 15-25 KB. If > 40 KB, stop and discuss slimming (e.g., drop `advanced`/`type` from stored exercises) before deploy.
- [ ] **Step 6: Commit source, deploy to gh-pages** per CLAUDE.md pipeline (including `gh api repos/pih-dev/PTApp/pages/builds/latest --jq .status` reaching `built` — the Jun-11 artifact-race trap), tell Pierre the version number for phone verification.

```bash
git add -A && git commit -m "release: v2.13.0 program generation from 1RM evaluation (PT feature #3)" && git push origin master
# then the gh-pages deploy block from CLAUDE.md "How to Build, Verify, and Deploy"
```

---

## Self-Review Notes

- **Spec coverage:** §3 volume/strategies → Task 2; §4 methods → Task 2; §5 blocks/fat-loss → Tasks 2, 3, 6; §6 bank/anchors/rotation/beginner → Tasks 1, 3; §7 UI → Tasks 6, 7; §8 schema/actions/merge → Task 4; §9 sanity → Tasks 1-4 (parts 1-4) + Task 8 full run; §10.4 growth check → Task 8 Step 5. §10.2 resolved as EDIT_PROGRAM full-record (Pierre approved "go ahead" defaults).
- **Known judgment calls encoded here (flag to Pierre at review):** minors ride their day's major at `round(major/2)` — implements both Elie statements (each-minor-half-tier AND weak-day-minors-top) with one rule; blocks store `days`/`daysAlt` instead of 4 duplicated weeks (Global Constraints notes the deviation); Pull day at intA lands ≈ 39 sets (16 + 8×3 minors) — faithful to Elie's approved model, worth an eyebrow at his first real program.
- **Type consistency check:** `bucket` naming is uniform bank→kernel→viewer; `setKg` array-or-null everywhere; `EDIT_PROGRAM` full-record in Task 4 asserts and Task 7 dispatch.
