# Upcoming Sessions — Roll off completed 2h past end — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Dashboard, hide a session from "Upcoming Sessions" once it is `completed` AND its end time is 2+ hours in the past — so Pierre's evening view isn't cluttered by the day's already-finished sessions.

**Architecture:** One filter predicate change in `src/components/Dashboard.jsx`. Expanded and Compact views both iterate the same `upcoming` array, so a single change covers both. No schema change, no i18n change, no CSS change, no sync impact.

**Tech Stack:** React 18 hooks, Vite, pure CSS. No test framework — verification is manual (dev-server sanity + build bundle check + live deploy), matching project convention documented in `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-04-21-upcoming-rolloff-completed-design.md`

**Ship as:** v2.9.1 (patch on v2.9).

---

## File Structure

**Modified files:**
- `src/components/Dashboard.jsx` — extend the `upcoming` filter predicate
- `src/App.jsx` — version bump v2.9 → v2.9.1 in debug panel (line 232)
- `CLAUDE.md` — add a short "Current Version: v2.9.1" note above v2.9
- `docs/changelog-summary.md` — one-line entry
- `docs/changelog-technical.md` — technical entry

**No new files. No i18n. No CSS. No data migration. No sync change.**

---

### Task 1: Extend the `upcoming` filter in Dashboard.jsx

**Files:**
- Modify: `src/components/Dashboard.jsx:29-40`

**Rationale:** The current predicate is two lines (`cancelled` + `date < todayStr`). Adding the completed-rolloff branch keeps the filter readable and localized. `Date.now()` is captured once above the filter to avoid calling it per iteration and to keep the predicate pure with respect to that snapshot.

- [ ] **Step 1: Replace the filter block**

In `src/components/Dashboard.jsx`, locate lines 29-40 (the comment block through the `upcoming` definition). Replace with:

```jsx
  // Upcoming Sessions: future + today's sessions that aren't cancelled.
  // Extra rule (v2.9.1, 2026-04-21): once a session is `completed` AND its
  // end time is 2+ hours in the past, hide it. Pierre reported scrolling past
  // today's finished sessions in the evening to reach tomorrow's — 2h gives
  // a short "still visible right after it ended" window, then the list clears
  // out. No-shows left as `scheduled` stay visible (the PT still needs to act
  // on them). The `date < todayStr` guard stays as a stale-scheduled safeguard.
  const todayStr = today();
  const nowMs = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const upcoming = state.sessions
    .filter(s => {
      if (s.status === 'cancelled') return false;
      if (s.date < todayStr) return false;
      if (s.status === 'completed') {
        const endMs = new Date(`${s.date}T${s.time}`).getTime() + (s.duration || 45) * 60000;
        if (nowMs - endMs >= TWO_HOURS_MS) return false;
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

**Why local Date construction:** `new Date(\`${s.date}T${s.time}\`)` parses as local time (not UTC) because the string has no `Z` suffix. This avoids the documented `toISOString()` UTC trap in CLAUDE.md. `s.date` is `YYYY-MM-DD` and `s.time` is `HH:MM` — already validated by the rest of the app.

**Why `|| 45` on duration:** Matches the existing `isNowSession` convention a few lines above (`s.duration || 45`). Old records from before DURATIONS existed may lack the field.

- [ ] **Step 2: Manual sanity in dev server**

Run the dev server and verify the three states by eyeballing the Dashboard:

```bash
npm run dev
```

With the PT's actual data (or a fresh booking), check:
1. A `scheduled` session for tomorrow → still in Upcoming.
2. A `completed` session that ended less than 2h ago → still in Upcoming.
3. A `completed` session that ended 2h+ ago → **absent** from Upcoming, still present in Sessions tab.
4. Any session `<` today's date → absent (pre-existing behavior, should be unchanged).

If you don't have natural data for case 3, temporarily edit a recent completed session's `date`/`time` in the localStorage JSON via DevTools to simulate it, then undo the edit. Do NOT commit fake data.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "feat(v2.9.1): roll off completed sessions from Upcoming 2h past end"
```

---

### Task 2: Version bump to v2.9.1

**Files:**
- Modify: `src/App.jsx:232`

- [ ] **Step 1: Update version string**

In `src/App.jsx`, find line 232:

```jsx
          <div><strong>Version:</strong> v2.9</div>
```

Replace with:

```jsx
          <div><strong>Version:</strong> v2.9.1</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "chore(v2.9.1): bump version string"
```

---

### Task 3: Update CLAUDE.md and changelogs

**Files:**
- Modify: `CLAUDE.md` — add a v2.9.1 section above the v2.9 section
- Modify: `docs/changelog-summary.md` — prepend a v2.9.1 entry
- Modify: `docs/changelog-technical.md` — prepend a v2.9.1 entry

- [ ] **Step 1: Add v2.9.1 section to CLAUDE.md**

In `CLAUDE.md`, locate `## Current Version: v2.9`. Change its heading to `## Previous Version: v2.9` (demote). Then ABOVE it, insert:

```markdown
## Current Version: v2.9.1
- Dashboard "Upcoming Sessions": a session is hidden once it is `completed` AND its end time is 2+ hours in the past (Dashboard.jsx filter). Keeps today's just-finished sessions visible briefly, then clears the list for an evening glance at tomorrow. No-shows (still `scheduled`) remain visible. No schema/i18n/CSS changes.
- Debug panel shows v2.9.1
```

Then find the existing `## Previous Version: v2.8` heading and change it to `## Older Version: v2.8`. This keeps the convention of one Current + one Previous + Older for everything else. Only re-label headings — do NOT edit any of the content.

- [ ] **Step 2: Prepend entry to docs/changelog-summary.md**

Open `docs/changelog-summary.md`. At the top of the file (above the existing v2.9 block), add:

```markdown
## v2.9.1 (2026-04-21)
- Dashboard: completed sessions roll off the Upcoming list 2 hours after their end time — evening glance at tomorrow no longer scrolls past today's finished sessions. No-shows (still scheduled past end time) stay visible until manually completed or cancelled.
```

If the file's format differs slightly from this template (e.g. uses a different header style), match the existing style.

- [ ] **Step 3: Prepend entry to docs/changelog-technical.md**

Open `docs/changelog-technical.md`. At the top (above the existing v2.9 block), add:

```markdown
## v2.9.1 (2026-04-21)
- `src/components/Dashboard.jsx`: extended the `upcoming` filter to exclude sessions where `status === 'completed'` AND `now - (date+time+duration) >= 2h`. `Date.now()` captured once above the filter. End time computed via local-time `new Date(\`${s.date}T${s.time}\`)` (avoids UTC trap). Duration falls back to 45 when missing (matches `isNowSession` convention).
- Applies to both Expanded and Compact Dashboard views (they share the `upcoming` array).
- No changes to Schedule tab, Sessions log, or stat cards.
- Triggered by Pierre's 2026-04-21 report: evening scroll past completed sessions felt wrong.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/changelog-summary.md docs/changelog-technical.md
git commit -m "docs(v2.9.1): changelogs + CLAUDE.md version bump"
```

---

### Task 4: Build, verify bundle, deploy to gh-pages

**Files:**
- Build output: `dist/index.html`, `dist/sw.js`, `dist/manifest.json`
- Deploy target: `gh-pages` branch

**Rationale:** CLAUDE.md mandates the full build → verify → deploy pipeline after every user-facing change. Do NOT skip the bundle verification step — the `fixForFileProtocol` plugin has silently produced blank-page bundles in the past.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: clean build, no warnings about corrupted replacements. `dist/index.html`, `dist/sw.js`, `dist/manifest.json` produced.

- [ ] **Step 2: Verify bundle isn't corrupted**

```bash
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: exit code 0, no parse errors. If this fails, STOP and investigate — do not deploy a corrupted bundle.

- [ ] **Step 3: Push source to master**

```bash
git push origin master
```

- [ ] **Step 4: Deploy built files to gh-pages**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
cp dist/manifest.json /tmp/ptapp-deploy-manifest.json
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
cp /tmp/ptapp-deploy-manifest.json manifest.json
git add index.html sw.js manifest.json
git commit -m "Deploy v2.9.1: roll off completed sessions 2h past end"
git push origin gh-pages
git checkout master
```

- [ ] **Step 5: Tell Pierre the version number**

Report in chat: "Deployed v2.9.1 to gh-pages. Reload the PWA (force refresh if needed) — completed sessions will disappear from the Upcoming list 2h after their end time."

---

## Verification checklist (after deploy)

- [ ] PWA reloads, debug panel shows v2.9.1.
- [ ] Upcoming list shows future + today's scheduled sessions.
- [ ] Today's recently-completed session is still visible for ~2h after its end time.
- [ ] Today's session completed 2+ hours ago is no longer in Upcoming (but is still in Sessions tab).
- [ ] No-show (scheduled, past end, not manually cancelled/completed) is still visible.
- [ ] Schedule tab day view unchanged — completed session still shown there.
- [ ] Sessions log unchanged — full history present.
- [ ] "Today" and "This Week" stat cards unchanged.
- [ ] Dark theme, light theme, RTL all render fine (no visual change expected, quick sanity pass).

---

## Rollback

If something breaks in production: on `gh-pages`, `git revert HEAD && git push origin gh-pages`. Previous build is restored on next PWA reload. Source on master is also revertible with a symmetric revert.
