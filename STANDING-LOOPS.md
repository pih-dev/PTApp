# Standing loop — arm this on `continue`

**Written 2026-09-02 08:1x Beirut, on Pierre's instruction (given to CCHealth, handed here):**
*"PTApp, whenever it's on, should work on the figures — refine — and check the code, check if the
app is fine, check the status of the Play Store, the database on Supabase, the Apple response,
whether it came back, or we should take an action because it said two days and now it's been ten
days or two weeks."*

🔴 Cron jobs are SESSION-ONLY. `continue` RUNS this check first, then arms it (`CronCreate`,
recurring). Every tick commits what it found. Nothing on disk keeps it running.

## Loop — PTApp health + one figures refinement. Every 2 h. Cron `13 */2 * * *`

**Prompt to schedule, verbatim:**

> PTAPP LOOP — every 2 h. Two jobs: CHECK, then REFINE ONE FIGURE.
>
> **CHECK, on a cheap model (dispatch an Agent with model haiku or sonnet), report in ≤3 lines:**
> 1. **App:** `gh api repos/pih-dev/PTApp/pages` status `built`; `node scripts/soak-day.mjs` if the
>    soak handoff says it is due.
> 2. **Supabase:** is the project ACTIVE or PAUSED (dashboard or `supabase projects list`; a paused
>    project withdraws its DNS — a resolve failure IS "paused", not "Beirut internet"). Paused ⇒ wake
>    it and say so; `HANDOFF-multi-user-build.md` has the keep-alive history.
> 3. **Play:** vc26 (2.46.1) review / rollout state in the Play Console (probe, never quote the
>    handoff); `HANDOFF-spotset-publishing.md` holds the record.
> 4. **Apple:** App Store Connect review state. 🔴 If the review has been "in review"/silent for
>    more than 7 days (it said 2 days; it is now ~10–14), TAKE THE ACTION: read the Resolution
>    Center, contact App Review from the console, and tell Pierre in one line what was sent.
>
> **THEN REFINE ONE FIGURE:** open `HANDOFF-figures.md` §0, take the first OPEN item, do it, run the
> figure gates, commit and push with **explicit paths only** (never `git add -A`; never
> `git checkout gh-pages` in the main tree — see CLAUDE.md KNOWN ISSUES). One figure per tick.
> Deploy only when a batch is verified; the PWA is the deliverable, the APK is not rebuilt per tick.
>
> Report in ≤3 lines: the four checks, the figure, the commit. Nothing changed ⇒ "no change".

## Stopping it
`CronDelete` with the job id, or close the session — it does not survive it; `continue` re-arms.
