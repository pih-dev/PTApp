# Upcoming Sessions on Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard's "Today's Sessions" list with an "Upcoming Sessions" list that shows all future non-cancelled sessions sorted closest-first, in both expanded and compact views, so the PT sees tomorrow's schedule before midnight crosses.

**Architecture:** Single filter (`upcoming`) derived from `state.sessions` is reused by both views. Expanded view keeps all existing per-card interactions (complete, remind, edit, focus tags, notes, cancel, in-progress amber glow) and gains a date line so cards are distinguishable across days. Compact view drops its 5-session cap. Stat card "Today" is unchanged.

**Tech Stack:** React 18 hooks, Vite, pure CSS. No test framework — verification is manual (dev server + build bundle check), which matches project convention documented in `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md`

---

## File Structure

**Modified files:**
- `src/i18n.js` — add one new key `today` in `en` and `ar`
- `src/components/Dashboard.jsx` — filter refactor + section title + expanded view date line + compact view cap removal
- `src/App.jsx` — version string bump v2.6 → v2.7 in debug panel

**No new files. No CSS changes. No data migration. No sync impact.**

---

### Task 1: Add `today` i18n key

**Files:**
- Modify: `src/i18n.js:22-23` (en block) and `src/i18n.js:175-176` (ar block)

**Rationale:** The expanded-view date line renders "Today" for today's sessions and the formatted date (e.g., "Apr 20") for others. `today` is a new key — `statToday` ("Today" in the stat card) already exists but is semantically a stat label, not a date substitute. Keep them separate so translators can differ them if needed.

- [ ] **Step 1: Add key to English block**

In `src/i18n.js`, find the Dashboard section in the `en:` block (line 17). After the `upcomingSessions` line (line 23), the new key goes next to dashboard-level strings. Add it after line 23:

```js
    upcomingSessions: 'Upcoming Sessions',
    today: 'Today',
    compact: 'Compact',
```

- [ ] **Step 2: Add key to Arabic block**

In `src/i18n.js`, find the Dashboard section in the `ar:` block (line 170). After `upcomingSessions` (line 176), add:

```js
    upcomingSessions: 'الجلسات القادمة',
    today: 'اليوم',
    compact: 'مختصر',
```

Note: `'اليوم'` is the same string as `statToday` on line 173 (both mean "Today" in Arabic). That's correct — English has one word "Today" for both contexts too.

- [ ] **Step 3: Verify keys are parseable**

Run: `cd C:/projects/PTApp && node -e "const t = require('./src/i18n.js'); console.log('i18n loads cleanly')"`

Expected: The command may fail because i18n.js is ESM and uses `export`. Skip this step if it fails — a successful `npm run build` in Task 5 validates the file.

---

### Task 2: Refactor Dashboard.jsx — unified filter + section title + view iterations + date line

**Files:**
- Modify: `src/components/Dashboard.jsx:15-27` (filter definitions)
- Modify: `src/components/Dashboard.jsx:78-84` (section title)
- Modify: `src/components/Dashboard.jsx:87-176` (expanded view iteration + date line)
- Modify: `src/components/Dashboard.jsx:178-215` (compact view iteration)

**Rationale:** One implementation pass because the four changes are coupled — introducing `upcoming` then leaving `todaySessions`/`upcomingSessions.slice(0,5)` still used in render would produce an inconsistent interim state.

- [ ] **Step 1: Replace the filter block**

In `src/components/Dashboard.jsx`, locate lines 15-27 (the two filter arrays `todaySessions` and `upcomingSessions` plus the `nowMinutes`/`isNowSession` helpers). Replace with:

```jsx
  // todaySessions still feeds the "Today" stat card (middle of stat row).
  // It is NOT used as the section list anymore — `upcoming` is.
  const todaySessions = state.sessions
    .filter(s => s.date === today() && s.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  // Highlight all sessions currently in progress (started but not yet ended)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isNowSession = (s) => {
    const start = timeToMinutes(s.time);
    return nowMinutes >= start && nowMinutes < start + (s.duration || 45);
  };
  // Upcoming Sessions: everything from today onward that isn't cancelled.
  // Keep today's completed visible (day-progress is useful) but hide past-day
  // completed so the list doesn't grow with stale "done" cards. Also hides any
  // past-dated session regardless of status — a defensive stale guard.
  const todayStr = today();
  const upcoming = state.sessions
    .filter(s => {
      if (s.status === 'cancelled') return false;
      if (s.date < todayStr) return false;
      if (s.status === 'completed' && s.date < todayStr) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
```

Note: the second `if (s.date < todayStr)` on its own already covers the completed-past-day case (all past-dated sessions are hidden), so the third check is defensive/explicit and harmless. Keep it for readability — it documents intent.

- [ ] **Step 2: Replace the section title**

In `src/components/Dashboard.jsx`, locate lines 78-84 (the `section-header` with the toggle button). Replace the `<span>` inside with:

```jsx
      <div className="section-title section-header">
        <span>📅 {t(lang, 'upcomingSessions')} ({upcoming.length})</span>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}
          onClick={() => setExpanded(e => !e)}>
          {expanded ? t(lang, 'compact') : t(lang, 'expanded')}
        </button>
      </div>
```

The count is now shown in both views. The conditional `todaySessions`/`upcomingSessions` label is gone.

- [ ] **Step 3: Update expanded view — iterate `upcoming`, swap empty state, add date line**

In `src/components/Dashboard.jsx`, locate the expanded branch (lines 87-177). Replace the outer `todaySessions.length === 0 ? (...) : (todaySessions.map(...))` with `upcoming.length === 0 ? (...) : (upcoming.map(...))`. Change the empty-state strings.

Also add a date line under the `meta` div inside each card. The full replacement for the expanded branch (lines 86-177) is:

```jsx
      {/* Expanded view: upcoming sessions with full inline functionality */}
      {expanded ? (
        upcoming.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏋️</div>
            <div>{t(lang, 'noUpcoming')}</div>
            <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
              {t(lang, 'bookSession')}
            </button>
          </div>
        ) : (
          upcoming.map((session, idx) => {
            const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
            const status = getStatus(session.status, lang, t);
            const client = state.clients.find(c => c.id === session.clientId);
            const period = getClientPeriod(client, session.date);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
            const tags = FOCUS_TAGS[session.type] || FOCUS_TAGS.Custom;
            const focus = session.focus || [];
            const isNext = isNowSession(session);
            const toggleFocus = (tag) => {
              const updated = focus.includes(tag) ? focus.filter(f => f !== tag) : [...focus, tag];
              dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, focus: updated } });
            };
            return (
              <div key={session.id}
                className={`card${isNext ? ' card-now' : ''}`} style={{ borderInlineStart: `3px solid ${isNext ? '#F59E0B' : st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <ClockIcon />
                      {session.time} · {session.duration}{t(lang, 'min')} ·{' '}
                      {/* Inline type selector — keep focus tags so switching back preserves selections */}
                      <select className="inline-type-select" value={session.type} onChange={e => {
                        dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, type: e.target.value } });
                      }}>
                        {SESSION_TYPES.map(stype => <option key={stype.label} value={stype.label}>{stype.emoji} {stype.label}</option>)}
                      </select>
                    </div>
                    {/* Date line — lets the PT distinguish today/tomorrow/later cards at a glance */}
                    <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>
                      {session.date === todayStr ? t(lang, 'today') : formatDate(session.date, lang)}
                    </div>
                  </div>
                  <span className={`badge badge-${session.status}`}>{status.label}</span>
                </div>
                <div className="flex-row">
                  {(session.status === 'scheduled' || session.status === 'confirmed') && (
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => { haptic(); updateStatus(session.id, 'completed'); }}>{t(lang, 'complete')}</button>
                  )}
                  {client && (
                    <button className="btn-whatsapp" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => sendReminderWhatsApp(client, session, state.messageTemplates, lang, state.sessions)}>
                      <WhatsAppIcon size={14} />
                      {t(lang, 'remind')}
                    </button>
                  )}
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => { setActiveSession(session); }}>
                    <EditIcon size={14} />
                    {t(lang, 'edit')}
                  </button>
                  {session.status !== 'cancelled' && (
                    <button className="btn-danger-sm" onClick={() => { haptic(); cancelSession(session); }}>
                      <TrashIcon />
                    </button>
                  )}
                </div>
                {/* Focus tags — tappable, auto-save */}
                <div className="focus-row" style={{ marginTop: 8 }}>
                  {tags.map(tag => (
                    <button key={tag} className={`focus-tag${focus.includes(tag) ? ' active' : ''}`}
                      onClick={() => { haptic(); toggleFocus(tag); }}>{tag}</button>
                  ))}
                </div>
                {/* NOTE: Do NOT add `readOnly` here. On iOS Safari, tapping a readonly
                    textarea decides "no keyboard" before onFocus can run — even if onFocus
                    sets readOnly=false. The collapsed/expanded behavior is handled entirely
                    by the .editing CSS class, not by readOnly. */}
                <textarea key={session.sessionNotes || ''} className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
                  defaultValue={session.sessionNotes || ''}
                  onFocus={e => { e.target.classList.add('editing'); }}
                  onBlur={e => {
                    e.target.classList.remove('editing');
                    e.target.classList.toggle('has-content', e.target.value.trim() !== '');
                    if (e.target.value !== (session.sessionNotes || '')) {
                      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
                    }
                  }}
                />
              </div>
            );
          })
        )
```

- [ ] **Step 4: Update compact view — iterate `upcoming`**

In `src/components/Dashboard.jsx`, locate the compact branch (lines 178-216). Change `upcomingSessions.length === 0` to `upcoming.length === 0` and `upcomingSessions.map(...)` to `upcoming.map(...)`. The compact card already renders `formatDate(session.date, lang)` so no date-line change is needed there.

Full replacement of the compact branch:

```jsx
      ) : (
        /* Compact view: all upcoming, tap for action sheet */
        upcoming.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏋️</div>
            <div>{t(lang, 'noUpcoming')}</div>
            <button onClick={() => setTab('schedule')} className="btn-primary mt-16" style={{ width: 'auto', display: 'inline-flex' }}>
              {t(lang, 'bookFirst')}
            </button>
          </div>
        ) : (
          upcoming.map(session => {
            const st = SESSION_TYPES.find(stype => stype.label === session.type) || SESSION_TYPES[5];
            const status = getStatus(session.status, lang, t);
            const client = state.clients.find(c => c.id === session.clientId);
            const period = getClientPeriod(client, session.date);
            const monthCount = getSessionOrdinal(state.sessions, session.id, session.clientId, period.start, period.end);
            return (
              <div key={session.id} className="card card-tap" style={{ borderInlineStart: `3px solid ${st.color}`, cursor: 'pointer' }}
                onClick={() => setActiveSession(session)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="client-name">{getClientName(session.clientId)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t4)' }}>#{monthCount}</span></div>
                    <div className="meta">
                      <ClockIcon />
                      {session.time} · {session.duration}{t(lang, 'min')} · {st.emoji} {session.type}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t5)', marginTop: 4 }}>{formatDate(session.date, lang)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${session.status}`}>{status.label}</span>
                    <ChevronIcon size={16} style={{ color: 'var(--t4)' }} />
                  </div>
                </div>
              </div>
            );
          })
        )
      )}
```

---

### Task 3: Bump version to v2.7 in debug panel

**Files:**
- Modify: `src/App.jsx:232`

**Rationale:** Pierre's global preference is to bump the version on every deploy so he and the PT can verify a fresh build on-device.

- [ ] **Step 1: Update the version string**

In `src/App.jsx`, change line 232 from:

```jsx
          <div><strong>Version:</strong> v2.6</div>
```

to:

```jsx
          <div><strong>Version:</strong> v2.7</div>
```

---

### Task 4: Manual verification on dev server

**Files:** None. Runtime checks only.

**Rationale:** PTApp has no automated test framework. Manual verification on the dev server + mobile-device sanity check is the project's shipping convention, per `CLAUDE.md`. Run through the scenarios from the spec's Testing section.

- [ ] **Step 1: Start dev server**

Run: `cd C:/projects/PTApp && npm run dev`

Expected: Vite starts on `http://localhost:5173/PTApp/` (or similar). Open in browser.

- [ ] **Step 2: Verify — today has sessions**

- Open the app in the browser with an account that has today's sessions.
- Confirm section title reads **"📅 Upcoming Sessions (N)"** where N matches the visible card count.
- Confirm today's cards appear first, ordered by time ascending.
- Confirm each card shows "Today" below the time/type meta line.

- [ ] **Step 3: Verify — tomorrow's sessions are visible before midnight**

- With the current date (Apr 19) still active, ensure any Apr 20 sessions in the data appear after today's.
- Confirm the Apr 20 cards show the formatted date (e.g., "Apr 20") below the meta line, not "Today".

- [ ] **Step 4: Verify — completed today's sessions remain visible**

- Mark one today's session complete (or find one that's already completed).
- Confirm it stays in the list with a "Completed" badge.

- [ ] **Step 5: Verify — cancelled sessions are hidden**

- Cancel a session (either today or tomorrow).
- Confirm it disappears from the Upcoming list in both views.

- [ ] **Step 6: Verify — compact view**

- Tap the "Compact" toggle.
- Confirm the same list appears (same count as expanded), with no 5-session cap. Cards are tappable, open the action sheet.

- [ ] **Step 7: Verify — empty state**

- If no clients/sessions exist, or if all are cancelled/past-completed, confirm the empty state renders with "No upcoming sessions" and the book CTA.

- [ ] **Step 8: Verify — Arabic RTL**

- Toggle language to Arabic from the General panel.
- Confirm the section title reads "📅 الجلسات القادمة (N)".
- Confirm the date line shows "اليوم" for today's cards and Arabic-formatted date for others.
- Confirm the date line renders right-aligned (RTL) and doesn't break card layout.

- [ ] **Step 9: Verify — light + dark theme**

- Toggle theme from General panel.
- Confirm the date line text color (`var(--t5)`) renders legibly in both themes.

- [ ] **Step 10: Verify — in-progress amber glow**

- If possible, wait for (or temporarily edit) a session to start now and last 45 minutes.
- Confirm the `card-now` amber border and glow still appear.

- [ ] **Step 11: Stop dev server**

Ctrl+C in the terminal running `npm run dev`.

---

### Task 5: Build and verify bundle

**Files:** Build output.

**Rationale:** The `fixForFileProtocol` plugin in `vite.config.js` has a known corruption trap (documented in CLAUDE.md). Every build must be validated by extracting the inlined JS and running `node --check` on it before the bundle is pushed to gh-pages.

- [ ] **Step 1: Build**

Run: `cd C:/projects/PTApp && npm run build`

Expected: Build succeeds. `dist/index.html`, `dist/sw.js`, `dist/manifest.json` are created/updated.

- [ ] **Step 2: Extract and syntax-check the inlined bundle**

Run:
```bash
cd C:/projects/PTApp && node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: No output (success). If `node --check` prints a syntax error, the bundle is corrupted — do NOT proceed. Investigate `vite.config.js` (most likely the `fixForFileProtocol` replacement was changed from a function to a string).

---

### Task 6: Commit to master, deploy to gh-pages, push both

**Files:** `src/i18n.js`, `src/components/Dashboard.jsx`, `src/App.jsx` (code commit); `index.html`, `sw.js`, `manifest.json` (gh-pages deploy commit).

**Rationale:** Pierre's deploy convention (from CLAUDE.md and memory): every commit goes to master AND to gh-pages. The live site serves from gh-pages — pushing to master alone does not deploy.

- [ ] **Step 1: Stage and commit the source**

Run:
```bash
cd C:/projects/PTApp && git add src/i18n.js src/components/Dashboard.jsx src/App.jsx && git commit -m "$(cat <<'EOF'
v2.7: Dashboard shows Upcoming Sessions (all future, closest first)

The "Today's Sessions" list went blind at night — a session booked for
tomorrow morning wasn't visible until midnight crossed. Replaced with
"Upcoming Sessions" showing all future non-cancelled sessions in both
expanded and compact views, sorted date+time ascending.

Today's completed stay visible so the PT still sees day progress.
Past-dated sessions are hidden defensively. Compact view's 5-session
cap is removed. Stat card "Today" is unchanged.

Adds i18n key "today" in en + ar for the new date line on expanded cards.

Spec: docs/superpowers/specs/2026-04-19-upcoming-sessions-dashboard-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Expected: One commit created on master.

- [ ] **Step 2: Push to master**

Run: `cd C:/projects/PTApp && git push origin master`

Expected: Push succeeds.

- [ ] **Step 3: Copy built files to temp, switch to gh-pages**

Run:
```bash
cd C:/projects/PTApp && cp dist/index.html /tmp/ptapp-deploy.html && cp dist/sw.js /tmp/ptapp-deploy-sw.js && cp dist/manifest.json /tmp/ptapp-deploy-manifest.json && git checkout gh-pages
```

Expected: Three files copied. Branch switched to gh-pages cleanly (working tree clean — if not, the source commit above didn't capture everything; go back to Step 1).

- [ ] **Step 4: Replace live files and commit**

Run:
```bash
cd C:/projects/PTApp && cp /tmp/ptapp-deploy.html index.html && cp /tmp/ptapp-deploy-sw.js sw.js && cp /tmp/ptapp-deploy-manifest.json manifest.json && git add index.html sw.js manifest.json && git commit -m "Deploy v2.7: Upcoming Sessions on Dashboard"
```

Expected: One commit on gh-pages.

- [ ] **Step 5: Push gh-pages and return to master**

Run: `cd C:/projects/PTApp && git push origin gh-pages && git checkout master`

Expected: gh-pages push succeeds. Branch back on master.

- [ ] **Step 6: Tell Pierre the version is live**

Output to Pierre: "v2.7 deployed. Debug panel will show 'Version: v2.7'. PT should pull-to-refresh or close/reopen the PWA to load the new build."

---

## Self-Review

**Spec coverage check:**
- ✅ Unified `upcoming` filter with the three-rule logic (cancel/past-completed/past-date) → Task 2, Step 1
- ✅ Section title changes to "Upcoming Sessions (count)" always shown → Task 2, Step 2
- ✅ Expanded view iterates `upcoming`, gets date line → Task 2, Step 3
- ✅ Compact view iterates `upcoming`, cap removed → Task 2, Step 4
- ✅ `today` i18n key added in en + ar → Task 1, Steps 1-2
- ✅ `todaySessions` calc kept for stat card → Task 2, Step 1 (preserved in the replacement block)
- ✅ `isNowSession`/`weekSessions` preserved → Task 2, Step 1 (preserved)
- ✅ Version bump to v2.7 → Task 3
- ✅ Manual test plan mirrors spec's Testing section → Task 4, Steps 2-10
- ✅ Build + bundle check → Task 5
- ✅ Two-branch deploy pattern → Task 6

**Placeholder scan:** No TBDs, TODOs, or vague instructions. All code blocks contain full snippets. All commands are exact.

**Type consistency:** `upcoming`, `todayStr`, `upcomingSessions` (removed), `todaySessions` (retained) are used consistently. `formatDate`/`t`/`getStatus` signatures match existing imports on Dashboard.jsx:5-6 — no new imports needed.

**Scope check:** Single focused feature, three source files, one i18n key. Commits cleanly as one feature commit + one deploy commit, matching project convention.

**Ambiguity fix:** Task 2 Step 1 includes two `if (s.date < todayStr)` style guards (one explicit, one redundant with the completed check). Called out in the comment so the implementing engineer understands the redundancy is intentional/defensive, not a bug.
