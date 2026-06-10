# PTApp v2.11 — Client Evaluations

## What's new

v2.11 adds a fitness evaluation system to the Clients tab. You measure five tests by hand and type the raw numbers — the app scores each test on a 1–5 scale against published norms and calculates an overall fitness classification for the client. Scores are saved permanently so you can track progress over time.

---

## How to evaluate a client

1. Open the **Clients** tab and expand the client's card.
2. Tap **Evaluate** (the button appears below the client's sessions).
   - The button only appears if the client has a **gender** and **birthdate** set. If it's missing, edit the client profile first.
3. Type the measured numbers into the form:
   - **Push-ups** — reps completed in 30 seconds
   - **Pull-ups / Inverted row** — toggle the switch to choose which one the client did, then enter reps in 30 seconds
   - **Bodyweight squats** — reps completed in 30 seconds
   - **1-mile run** — time in mm:ss format (e.g. `8:45`). Optional — leave blank to skip.
   - **Sit & reach** — centimetres past the toes (positive = past toes, negative = short of toes). Optional — leave blank to skip.
4. As you type, coloured chips appear next to each field showing the verdict in real time (**Weak / Below Average / Average / Good / Excellent**).
5. Tap **Save Evaluation**. The results are frozen into the record.

---

## What the scores mean

Each of the three muscle tests (push-ups, pull-ups/inverted row, squats) gets a score from 1 to 5:

| Score | Verdict |
|-------|---------|
| 1 | Weak |
| 2 | Below Average |
| 3 | Average |
| 4 | Good |
| 5 | Excellent |

The app averages the three muscle-test scores to produce a **fitness classification**:

| Average | Classification |
|---------|----------------|
| 1.0 – 1.9 | Beginner A |
| 2.0 – 2.9 | Beginner B |
| 3.0 – 3.9 | Intermediate A |
| 4.0 | Intermediate B |
| 4.1 – 5.0 | Pro |

The **1-mile run** gets its own verdict (four levels) but does **not** affect the muscle average or the classification — it's recorded separately for cardio tracking.

The **sit & reach** is also scored and recorded but does not affect the classification.

---

## Re-evaluating a client

Re-evaluate every **8 weeks** or whenever the client hits a milestone. Each evaluation is saved as a separate record — history is never overwritten.

- All past evaluations appear as rows under the Evaluate button, newest first.
- To **edit** a past record, tap the pencil icon on its row. Saving re-freezes the scores.
- To **delete** a record, tap the trash icon. You will be asked to confirm — deletion is logged in the audit trail.

The **latest classification** (e.g. "Intermediate A") appears as a badge on the collapsed client card so you can see it at a glance without expanding.

---

## Norm Charts

To see the exact numbers the app uses for scoring, go to **General (⋮ menu) → Norm Charts**.

The charts shown there are the exact same data the app scores with — they can never disagree. The sit & reach chart currently uses YMCA published norms. Once you send your own sit & reach chart, it will be replaced and the version number will update.

---

## Coming next

v2.12 will add a **Pro/Elite 1RM battery** — barbell strength tests (bench press, squat, deadlift) scored against bodyweight ratios. The button for it is already visible in the evaluation form but disabled until v2.12 ships.
