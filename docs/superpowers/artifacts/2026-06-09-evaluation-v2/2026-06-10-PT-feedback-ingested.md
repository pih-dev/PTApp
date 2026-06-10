# PT Feedback Ingested — 2026-06-10

Three files arrived from the PT (archived under `_archive/PTApp/evaluation-system/2026-06-10-*`):

1. `app.PT-Evaluation-Template.xlsx` — the **OLD May-11 (WBS-era) template**, not the Jun-9 5-test one. Diff vs the May-11 empty baseline: only 4 cells changed, all in **Layering Questions**. Batteries and Cell Norms sheets untouched — the PT delivered tests + norms via the two docx files instead.
2. `Protocol for 1 rm.docx` — branch structure + 1RM estimation protocol for Pro/Elite.
3. `allcharts for FA.docx` — the PT's own 30-second normative charts (solves the published-norms gap himself).

## The PT's answers (Layering Questions sheet)

| Q | Question | PT's answer |
|---|----------|-------------|
| Q1 | Pre-classification routing | **Trainer selects the path manually** ("give the option for the trainer to select which path to go") |
| Q2 | Intermediate split | **Score each muscle test 1–5** (1 Weak, 2 Below Avg, 3 Average, 4 Good, 5 Excellent). **Average of the 3 muscle tests** (push-ups; pull-ups OR inverted row; bodyweight squat) classifies: 1–1.9 Beginner A · 2–2.9 Beginner B · 3–3.9 Intermediate A · 4 Intermediate B · 4.1–5 Pro |
| Q3 | Re-eval cadence | **Every 8 weeks** (→ results must append to history, not overwrite) |
| Q4 | Anything missing | **Volume prescriptions per level** (feeds feature #3): Beg A 10–12 sets/muscle/week · Beg B same sets, higher reps+load · Int A 13–15 · Int B 16–18 (+compound/supersets) · Pro 19–24 |

## Branch structure (1RM docx)

- **Two branches**: Mass population (Beginner A/B, Intermediate A/B) and High-level athlete (Pro, Elite). Trainer picks the branch (Q1).
- **Mass population battery**: 30-second tests — push-ups, pull-ups (or inverted row if pull-up unachievable), bodyweight squat — plus **1-mile run** (lung capacity) and **sit-and-reach** (flexibility).
- **Pro/Elite battery**: **1RM** for bench press, squat, deadlift. If the athlete has known 1RMs → lock those numbers. Else run the estimation protocol. 1-mile + sit-and-reach are **common to both branches**.
- **1RM starting estimates** (× bodyweight): Male — bench 1.0, squat 1.4, deadlift 1.7. Female — bench 0.8, squat 1.0, deadlift 1.4.
- **Estimation protocol**: 5 min general + 5 min specific warm-up; 4 sets at 50% (3–5 reps), 70% (3–5), 90% (2–3), 100% (to failure). If a lift succeeds once and fails the second → that's the 1RM. 4th-set reps map to %1RM: 6 reps=85%, 5=88%, 3–4=90%, 2–3=95%, 1=100%. More than 6 reps → estimate was low; repeat another day (≥24h recovery) at +20%.

## Norm charts provided (allcharts docx)

All 30-second protocols, split by sex. **Age bands are heterogeneous per chart** — the data model must store per-test, per-sex band definitions:

| Test | Sex | Age bands | Levels |
|------|-----|-----------|--------|
| Pull-up | M, F | none (18–45 single band) | 5 (Poor → Elite/Excellent) |
| Inverted row | M, F | 18–35 / 36–50 / 51+ | 5 |
| Push-up | M | 17–29 / 30–49 / 50+ | 5 |
| Push-up (knees) | F | 17–19 / 20–29 / 30–39 / 40–49 / 50–59 / 60–65 | **6** (adds "Above Av" between Good and Average) |
| BW Squat | M | 18–25 / 26–35 / 36–45 / 46–55 / 56–65 / 65+ | 5 |
| BW Squat | F | 20–29 / 30–39 / 40–49 / 50+ | 5 (labels "Not great"/"Bad" = Below Avg/Poor) |
| 1-mile run | M, F | 18–29 / 30–39 / 40–49 / 50+ | **4** (Below Avg/Poor merged) |
| Sit-and-reach | — | **MISSING — no chart provided** | — |

## How this supersedes the Jun-9 reconciled design

- **3-level Below/Avg/Good output is OUT** → 5-level Weak…Excellent scoring is IN (the PT's own scale, Q2).
- **WBS classification is PARTLY BACK**: not the 6-level observe-and-grade tree, but a computed **Beg A/Beg B/Int A/Int B/Pro** classification from the muscle-test average, plus a separate Pro/Elite branch.
- **Lung capacity tool question resolved**: it's the **1-mile run** (not peak flow / breath-hold).
- **The 3 "weak tests" (squat, pull-up, lung) are resolved**: the PT supplied his own 30-second charts, eliminating the published-norms protocol mismatch (30s vs to-failure) and the age-band mismatch.
- **"Raw value input" stands**: PT measures with his own stopwatch/eye, types reps / time / cm.

## Open issues to reconcile (with Pierre, possibly PT)

1. **Sit-and-reach chart missing** — flexibility is in the battery but has no norms. Ask PT, or fall back to the YMCA published norms from the Jun-9 research (the one test with solid published data).
2. **Chart irregularities** (typos/gaps in the docx, need cleanup decisions):
   - Male squat 18–25: Below Avg 25–30, Average 35–38 → **31–34 uncovered**; similar gaps in every male squat band (also "Above Average 39–43" vs "Excellent >43" style boundary overlaps elsewhere: 36–45 Above Avg 30–34 but Excellent >33).
   - Female push-up 40–49: Good "5–31" (typo, likely 25–31) overlapping Above Av 18–24.
   - Female push-up has 6 levels vs 5 everywhere else → mapping to the 1–5 score needs a rule.
   - 1-mile run has 4 levels → fine if run is excluded from the muscle average (it is), but its verdict display differs.
3. **Elite vs Pro boundary undefined** — Q2's scale tops out at "4.1–5 = pro"; nothing says when a high-level athlete is "Elite" vs "Pro" (1RM ≥ benchmark multiples? trainer judgment?).
4. **Intermediate B = exactly 4.0** — averages of three 1–5 integers are thirds, so 4.0 is reachable, but the band is a single point; confirm intent.
5. **Pull-up chart has no age bands (18–45)** — what about clients outside 18–45? Inverted row covers 51+; maybe pull-up chart is intentionally flat.
6. **1RM scoring** — the protocol yields a number (kg), and benchmarks are minimums (×BW). No 5-level chart for 1RM. Is Pro/Elite output just pass/fail vs benchmark, or a ratio display?
