# Evaluation & Classification System — Brainstorm WIP

**Phase:** Brainstorming (step 3 of 9 — clarifying questions)
**Started:** 2026-04-21
**Last checkpoint:** 2026-04-21 (after Q3 answered + Pierre requested persistence)
**Next action:** Ask **Q4 — eval battery completeness** (see "Current open question" below). Do NOT implement anything yet.

---

## How to resume this brainstorm in a fresh session

If the conversation was compacted, cleared, or a new session is picking this up:

1. **Read this file top to bottom.** It is the single source of truth for project state.
2. **Re-open the visuals.** The live brainstorm server at `http://localhost:52120` likely died. Either:
   - Open the committed copies directly in a browser:
     `docs/superpowers/artifacts/2026-04-21-evaluation-system/wbs-tree.html`
     `docs/superpowers/artifacts/2026-04-21-evaluation-system/structure-overview.html`
   - Or re-launch the brainstorming server per
     `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/visual-companion.md`,
     then copy the two HTML files into its new `screen_dir`.
3. **Read the memory pointer:** `memory/project_evaluation_system_brainstorm.md`
4. **Do NOT start implementation.** Continue brainstorming from the "Current open question" section below.
5. **Previously paused work to be aware of:** SessionCard refactor brainstorm at
   `docs/superpowers/specs/2026-04-21-session-card-refactor-brainstorm.md`. Lower priority now —
   this evaluation initiative takes precedence per Pierre's 2026-04-21 pivot.

---

## Project overview

Build a client evaluation + classification subsystem inside PTApp. The PT evaluates a client via a
short battery of bodyweight fitness tests; the app classifies the client into one of six levels
based on evaluation grades + age + gender; that classification later drives a year-long training
program (generator + UI deferred to a later initiative).

---

## Scope

### Build now (this initiative, decomposed into three sub-specs)

1. **Exercise Library** (foundation) — import and structure the 344-exercise catalog from
   `EXERCISES full list.xlsx`. Adds metadata (difficulty, equipment, category) the source doesn't
   carry.
2. **Evaluation System** (input) — observation-based battery of ~5–6 bodyweight fitness tests
   (push-ups, squats, sit-ups, jumping jacks, step-ups, …). PT grades 1–5 per exercise. No timer,
   no rep counter in-app.
3. **Classification** (logic) — age + gender + eval grades → one of six leaf levels in the WBS tree.

Each of these three gets its own spec → plan → implementation cycle.

### Deferred to later initiative

4. **Program Generator** — takes level + age/gender → daily/weekly/monthly plan for a year,
   ~3× per week, mixing exercises from the library appropriately.
5. **Program UI / Workflow** — how PT and clients see and use the generated program day-to-day.

---

## Key confirmed decisions

### D1: Opt-in per client (not mandatory for existing clients)
Selected 2026-04-21 (Q1, option B). Existing clients keep working as-is. PT decides per-client when
to evaluate. No forced migration; no "needs evaluation" badge on old clients.

### D2: Observation-based evaluation flow
No timer or rep counter in the app. PT clicks "Evaluate", app lists the 5–6 battery exercises, PT
observes client performance, PT grades each exercise directly on a 1–5 scale
(Weak / Below Average / Average / Good / Excellent). Simple data model; trusts trainer's eye over
normative data. (Pierre corrected course on Q2 — explicitly said "it's not important to manage
these at this stage from the app", ruling out the count-based options.)

### D3: Two-branch classification tree
Selected 2026-04-21 (Q3, option A). Intermediate sits under Beginner, not as its own top branch.

- **Beginner branch** owns: Beginner A, Beginner B, Intermediate A, Intermediate B (4 leaves)
- **Pro branch** owns: Pro, Elite (2 leaves)
- Total: **6 leaf levels**

### D4: Placeholders allowed for norms
Age bands, gender rules, eval-score thresholds are intentionally left as "TBD" in the tree.
Research literature varies (e.g., Pierre's example: "Beginner A might be 20–25 or 20–29"); the
final values will be populated later. Structure first, data later.

---

## WBS classification tree (confirmed structure)

```
                         Evaluation
                        (entry point)
                             │
              ┌──────────────┴──────────────┐
              │                             │
          Beginner                         Pro
              │                             │
     ┌────┬───┴────┬────┐              ┌────┴────┐
     │    │        │    │              │         │
   Beg A  Beg B  Int A  Int B         Pro      Elite
     │    │        │    │              │         │
    (each leaf carries placeholder criteria:
     age band TBD · gender M/F · eval thresholds TBD
     → program (deferred))
```

Visual version: `docs/superpowers/artifacts/2026-04-21-evaluation-system/wbs-tree.html`.

---

## Evaluation flow (confirmed)

1. PT taps **Evaluate** on a client record.
2. App lists the 5–6 exercises in the placeholder battery.
3. PT asks client to perform each exercise; observes.
4. PT grades each: **Weak / Below Average / Average / Good / Excellent** (1–5).
5. App applies classification logic: grades + age + gender → one leaf in the WBS tree.
6. App stores the classification on the client record and surfaces it in the UI.

Re-evaluation: TBD (Q5+ territory — how often, whether re-evals overwrite or append).

---

## Evaluation battery (placeholder list)

Pierre's Input #1 listed these with a trailing "...":

- Push-ups
- Squats (bodyweight)
- Sit-ups
- Jumping Jacks *(not in the exercise library xlsx)*
- Step-ups *(not in the exercise library xlsx)*
- … possibly more (Q4 will clarify completeness)

These are bodyweight endurance/fitness tests, not strength moves. They sit **separate from** the
344-exercise Library (which is strength-focused); the Library feeds the deferred program
generator.

---

## Data sources

### Exercise library source file
- **Original (volatile):** `C:\Users\pierr\Downloads\Telegram Desktop\EXERCISES full list.xlsx`
- **Archived (preserved):** `C:\projects\_archive\PTApp\evaluation-system\2026-04-21-EXERCISES-full-list.xlsx`
- **Size:** 344 exercises (rows 2–345), 2 columns: `exercise_name`, `exercise_muscles` (JSON array)
- **Sheet:** single sheet named "Sheet 1"

### What the xlsx does NOT carry (must be derived / added during import)
- No **difficulty** tag (Beginner/Intermediate/Advanced)
- No **equipment** tag (inferable from name: Dumbbell / Barbell / Cable / Machine / TRX / Kettlebell / Bodyweight / Stability Ball / Resistance Band)
- No **category** (strength / cardio / flexibility / plyometric / core)
- No **description**, **videos**, or **sets/reps guidance**
- **No cardio or flexibility exercises** — the catalog is resistance-training only
- **Eval-battery exercises (jumping jacks, step-ups) are NOT present** — battery is separate data

### Data quality issues to handle during import
- Typos: `"Hmastrings"` (rows 70, 141), stray trailing/leading spaces in exercise names and muscle strings
- Malformed JSON in rows 270–284: `"Glutes,"Spinal Erectors"` (missing closing quote)
- Duplicate exercise names (e.g., `"Upright Row"` at rows 37 and 48, with different muscle tags)
- Inconsistent casing/spacing in muscle tags (e.g., `" Triceps"`, `" Lats"`, `"Spinal erectors"` vs `"Spinal Erectors"`)

### Parser script
`docs/superpowers/artifacts/2026-04-21-evaluation-system/parse-xlsx.mjs` — reads the unzipped xlsx
XML and prints tab-delimited rows. Header comments explain how to re-run from the archived .xlsx.

---

## Verbatim user inputs (chronological, preserved exactly)

### Input #1 — initiation (2026-04-21, `/clear` fresh start)

> Evaluation: Begginer or Pro. Then Begginer: Begginer A, Bigginer B, Intermedate A, Intermediate B then becomes Pro. Pro: Pro and Elite. Based on the Evaluation of a client, they are classified according to that structure I mentioned, now there is a criterea for the eval but not ready( abattery of test done in each 30 seconds, moves like pushups, squats, situps, jumping jacks, step-up... and for each it could be 1 of 5(Weak, Below average, average, good, excellent), so populate it yourself for now. It is going to yield classifications for all based on 2 factors, age and gender, example, Beginner A might be: 20 to 25 or 20 to 29, these standards haven't been decided because there are different studies, Male, results of eval, will yield a daily, weekly, monthly program for a year, average 3 times per week, the appropriate mix of excersises from the file in telegram download called excersises full list excel.

### Input #2 — scope + visualization request (2026-04-21)

> let's do everything and worry about program generator and program ui later, if possible, let's visualize it, maybe an interactibe web locally. the structure

### Input #3 — visual companion accepted (2026-04-21)

> yes

### Input #4 — existing client handling (2026-04-21, answer to Q1)

> B

### Input #5 — re-scoping correction + eval flow clarification (2026-04-21)

> That's good. The web server is up, but I didn't mean to track the progression of each subcategory exercise evaluation. Now we're working I don't know which are we working on evaluation system or classification. You said there is a data flow, so we're working on exercise library. I'm assume. So the exercise exercise library, I uploaded the Excel sheet. You seen it. Are we working on the categories? For example, evaluation at top of the tree, AWBS, work breakdown structure. That's what I meant by let me visualize the structure because I wrote down the stuff. I should in the structure a tree. At the top of the tree, evaluation. Below it, there are two sections, beginning beginner, pro. Under beginner, whatever I mentioned in my in my prompt. And under pro, whatever I mentioned. And under each one based on whatever the results and the age and gender and whatnot. So that's number one. Number two, you asked me the first question, so we're veering of course off off road, I mean. The reason why I mentioned thirty seconds, it's the evaluation. Let me walk you through it. For example, if you want to evaluate me, one of his clients. He clicks evaluate. It's starts. Based on the WBS, there are five or six exercises. It's not literally thirty seconds. This is the flow. He will ask me to do squats for example. He will kick squats on on app. It doesn't have to pull up a timer. He would just observe me and report back whether I managed to do one or two or I did the entire thing with great ease, he will mark them grade them. So it's not important to manage these at this stage from the app. Let's do the structure, the WBS visualize it, and as you mentioned earlier, the placeholder where things are not provided to you. But later on, when are ready and we need to provide them, we will provide them.

### Input #6 — WBS tree shape + persistence request (2026-04-21)

> A, but before you proceed, document everything, the input should be stored safely verbatim, and the Q&A as well. This we avoid data loss to compactions and clears. Also we'll have a structured project to run from the start if we didn't get a good result. Things that should persist: never run out of context or run into compaction.

---

## Q&A log (chronological)

### Q1 — Existing client handling
**Claude asked:** When this ships, should every existing client be prompted to take the eval
before anything changes for them, or should existing clients continue as-is (no eval, no
classification, no program) and only new clients (or clients who opt in) go through the new flow?
Options:
- A. Mandatory for everyone — old clients get a "needs evaluation" badge until done
- B. Opt-in per client — PT decides who to evaluate, rest continue unchanged
- C. New clients only — existing clients are grandfathered permanently

**Pierre answered:** `B`

### Q2 — Evaluation workflow (OFF-COURSE, CORRECTED)
**Claude asked:** How does the PT run the evaluation with a client?
- A. App-driven, count-based (timer + rep count → auto-mapped rating via norms)
- B. App-driven, trainer-judgment (timer + direct rating, no count)
- C. Hybrid (rep count + suggested rating + trainer override)
- *Claude's recommendation: C*

**Pierre's response:** Did not pick A/B/C directly. Re-scoped — wanted WBS tree first, not eval
mechanics. In the clarification he confirmed:
- No timer needed ("it doesn't have to pull up a timer")
- No rep count tracked ("he would just observe me")
- PT grades directly after observation
- Essentially **Option B** (trainer-judgment), but even simpler: not even a timer in the app

**Lesson for brainstorm:** Structure before mechanics. Input #1 led with the hierarchical
classification and said "populate it yourself for now" for norms — I should have visualized the
tree before asking workflow questions.

### Q3 — WBS tree shape
**Claude asked:** Does the tree match what you wrote down? Are the 6 leaf levels right, or did
you picture Intermediate as its own branch?
- A. 2 branches (Beginner owns 4 sub-levels, Pro owns 2) — what the visual shows
- B. 3 branches (Beginner, Intermediate, Pro separately)

**Pierre answered:** `A`

---

## Current open question (next after persistence)

### Q4 — Eval battery completeness
Pierre listed 5 exercises with "...":
> "pushups, squats, situps, jumping jacks, step-up..."

Options to present:
- **A.** The 5 listed are the full battery — freeze it here.
- **B.** Add more exercises — ask Pierre to name them (e.g., plank hold, burpees, lunges, wall-sit,
  pull-ups, bodyweight rows).
- **C.** Leave at "5 placeholders + final list TBD" and revisit when real standards are picked.
- **D.** Differentiate the battery per branch (Beginner's 5 ≠ Pro's 5, since an Elite client
  needs harder tests to distinguish from Pro).

Pending Claude's proposal + Pierre's answer.

---

## Visual artifacts (committed copies)

Live session: `http://localhost:52120` (session folder
`.superpowers/brainstorm/19684-1776764199/`). `.superpowers/` is gitignored so the live files
won't survive. Committed copies:

- `docs/superpowers/artifacts/2026-04-21-evaluation-system/structure-overview.html`
  — five-subsystem map (#1–3 blue build-now, #4–5 grey deferred)
- `docs/superpowers/artifacts/2026-04-21-evaluation-system/wbs-tree.html`
  — classification tree + evaluation flow side panel (the primary visual)

Both use PTApp's color system (blue `#2563EB` accent, purple `#A855F7` for Pro branch,
amber `#F59E0B` for placeholders).

---

## Traps already detected during this brainstorm

### T1: Structure before mechanics
See Q2 above. When the user leads with a hierarchical/structural description and asks to
visualize "the structure", build the tree first; do not ask about workflow mechanics, UI choice,
or data flow until the skeleton is agreed. Re-read the opening message — "populate it yourself
for now" is a signal that the user wants structure, not detail.

### T2: Subsystem boundary confusion
Pierre almost lost track of which subsystem we were on ("Now we're working I don't know which
are we working on"). Going forward: **start each question by naming the subsystem it belongs to**
(e.g., "For the Classification subsystem — …") to keep the context visible.

---

## Checklist progress (brainstorming skill)

- [x] 1. Explore project context
- [x] 2. Offer visual companion (accepted)
- [~] 3. Ask clarifying questions (IN PROGRESS — Q1, Q3 answered; Q2 superseded; Q4+ pending)
- [ ] 4. Propose 2–3 approaches
- [ ] 5. Present design sections
- [ ] 6. Write design doc (this file will become the spec)
- [ ] 7. Spec self-review
- [ ] 8. User reviews written spec
- [ ] 9. Transition to writing-plans skill

---

*This document is the persistence boundary. All decisions and inputs above this line survive
compaction / clear. Everything below the "Current open question" is work still to do.*
