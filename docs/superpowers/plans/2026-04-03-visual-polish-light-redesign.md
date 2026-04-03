# Visual Polish + Light Theme Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate PTApp's visual quality — especially the light theme — with CSS polish, haptic feedback, a better logo, and a small functional fix.

**Architecture:** Almost entirely CSS changes in `styles.css`, plus a `haptic()` helper in `utils.js`, minor JSX touches for session notes `.has-content` class, a new dumbbell SVG in `App.jsx`, and a one-line auto-complete delay in `App.jsx`. No structural, layout, or data changes.

**Tech Stack:** Pure CSS, React inline class management, Web Vibration API.

---

### Task 1: CSS Micro-polish — Transitions, Button Press, Card Press, Modal Spring

**Files:**
- Modify: `src/styles.css`

This task adds smooth transitions and tactile press feedback across both themes. CSS-only, no JS.

- [ ] **Step 1: Add transitions to cards, focus tags, badges, nav, filters, week days**

In `src/styles.css`, make these edits:

Change `.card` transition (line ~153):
```css
/* Old */
transition: background 0.2s;
/* New */
transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
```

Add `transition` to `.focus-tag` (after line ~443, before `.focus-tag.active`):
```css
/* Add to existing .focus-tag rule */
transition: all 0.15s ease;
```

Add `transition` to `.badge` (after line ~232):
```css
/* Add to existing .badge rule */
transition: background 0.2s, color 0.2s;
```

Add `transition` to `.filter-btn` (after line ~491):
```css
/* Add to existing .filter-btn rule */
transition: all 0.15s ease;
```

Add `transition` to `.week-day` (after line ~323):
```css
/* Add to existing .week-day rule */
transition: all 0.15s ease;
```

- [ ] **Step 2: Add nav active indicator dot**

In `src/styles.css`, after the `.nav-btn.active` rule (line ~143), add:
```css
.nav-btn.active::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: #2563EB;
  margin-top: 2px;
  transition: opacity 0.2s;
}
```

- [ ] **Step 3: Enhance button press feel**

In `src/styles.css`, after the existing `button:active { transform: scale(0.97); }` (line ~18), add:
```css
.btn-primary:active, .btn-sm:active, .btn-whatsapp:active, .btn-whatsapp-lg:active {
  box-shadow: 0 1px 4px rgba(37,99,235,0.15);
  filter: brightness(0.92);
}
.btn-secondary:active, .btn-ghost:active {
  background: rgba(255,255,255,0.12);
}
```

- [ ] **Step 4: Add card press-down effect**

In `src/styles.css`, replace the existing `.card.card-tap:active` rule (line ~161-163):
```css
/* Old */
.card.card-tap:active {
  background: rgba(255,255,255,0.08);
}
/* New — card pushes down on tap */
.card.card-tap:active {
  transform: translateY(1px);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
```

- [ ] **Step 5: Modal spring animation**

In `src/styles.css`, change the `.modal-content` animation (line ~259):
```css
/* Old */
animation: slideUp 0.3s ease;
/* New — spring overshoot, feels alive */
animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
```

- [ ] **Step 6: Stat cards gradient tint**

In `src/styles.css`, add to the `.stat-card` rule (line ~295):
```css
/* Add to existing .stat-card rule */
background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02));
border: 1px solid rgba(255,255,255,0.08);
```

- [ ] **Step 7: Commit**

```bash
git add src/styles.css
git commit -m "Micro-polish: transitions, nav dot, button/card press, modal spring, stat gradient"
git push origin master
```

---

### Task 2: Light Theme Redesign

**Files:**
- Modify: `src/styles.css`

All changes are within the `.theme-light` section (lines ~546-629).

- [ ] **Step 1: Background — cooler, darker canvas for better card contrast**

Change `.theme-light` background (line ~549):
```css
/* Old */
background: linear-gradient(145deg, #E8E6E1 0%, #E0DDD7 50%, #D8D4CD 100%);
/* New */
background: linear-gradient(145deg, #E2E0DB 0%, #D5D2CC 50%, #CDCAC4 100%);
```

- [ ] **Step 2: Cards — near-opaque white with real shadows**

Change `.theme-light .card` (line ~565):
```css
/* Old */
.theme-light .card { background: rgba(255,255,255,0.4); border-color: rgba(30,27,75,0.07); box-shadow: 0 2px 8px rgba(30,27,75,0.06); }
/* New */
.theme-light .card { background: rgba(255,255,255,0.72); border-color: rgba(30,27,75,0.07); box-shadow: 0 2px 12px rgba(30,27,75,0.1); }
```

- [ ] **Step 3: Card-now glow — stronger in light theme**

Change `.theme-light .card.card-now` (line ~566):
```css
/* Old */
.theme-light .card.card-now { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.4); box-shadow: 0 2px 12px rgba(37,99,235,0.15); }
/* New */
.theme-light .card.card-now { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.4); box-shadow: 0 2px 16px rgba(37,99,235,0.2); }
```

- [ ] **Step 4: Card press state for light theme**

Change `.theme-light .card.card-tap:active` (line ~567):
```css
/* Old */
.theme-light .card.card-tap:active { background: rgba(30,27,75,0.06); }
/* New */
.theme-light .card.card-tap:active { transform: translateY(1px); box-shadow: 0 1px 4px rgba(30,27,75,0.06); }
```

- [ ] **Step 5: Nav — white glass with blur**

Change `.theme-light .nav` (line ~561):
```css
/* Old */
.theme-light .nav { background: rgba(232,230,225,0.97); border-top-color: rgba(30,27,75,0.08); box-shadow: 0 -2px 8px rgba(0,0,0,0.05); }
/* New */
.theme-light .nav { background: rgba(255,255,255,0.82); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top-color: rgba(30,27,75,0.08); box-shadow: 0 -2px 12px rgba(30,27,75,0.08); }
```

- [ ] **Step 6: Modal — white, distinct from page**

Change `.theme-light .modal-content` (line ~616):
```css
/* Old */
.theme-light .modal-content { background: linear-gradient(180deg, #E8E6E1, #DEDBD5); }
/* New */
.theme-light .modal-content { background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,247,245,0.97)); }
```

- [ ] **Step 7: Inputs — clean white**

Change `.theme-light .input, .theme-light .select` (line ~576):
```css
/* Old */
.theme-light .input, .theme-light .select { border-color: rgba(30,27,75,0.1); background: rgba(255,255,255,0.4); color: #1E1B4B; }
.theme-light .select { background: rgba(255,255,255,0.5); }
/* New */
.theme-light .input, .theme-light .select { border-color: rgba(30,27,75,0.1); background: rgba(255,255,255,0.7); color: #1E1B4B; }
.theme-light .select { background: rgba(255,255,255,0.75); }
```

- [ ] **Step 8: Focus notes/tags inputs — cleaner white**

Change `.theme-light .focus-notes` (line ~608):
```css
/* Old */
.theme-light .focus-notes { border-color: rgba(30,27,75,0.08); background: rgba(255,255,255,0.35); color: rgba(30,27,75,0.6); }
/* New */
.theme-light .focus-notes { border-color: rgba(30,27,75,0.08); background: rgba(255,255,255,0.6); color: rgba(30,27,75,0.6); }
```

- [ ] **Step 9: Setup card — cleaner white**

Change `.theme-light .setup-card` (line ~621):
```css
/* Old */
.theme-light .setup-card { background: rgba(255,255,255,0.35); border-color: rgba(30,27,75,0.06); }
/* New */
.theme-light .setup-card { background: rgba(255,255,255,0.7); border-color: rgba(30,27,75,0.06); }
```

- [ ] **Step 10: Light theme button press overrides**

After `.theme-light .lang-toggle .lang-active` (line ~627), add:
```css
.theme-light .btn-secondary:active, .theme-light .btn-ghost:active { background: rgba(30,27,75,0.08); }
```

- [ ] **Step 11: Light theme stat card gradient**

After the stat-label light theme rule (line ~585), add:
```css
.theme-light .stat-card { background: linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.01)); border: 1px solid rgba(30,27,75,0.06); color: #1E1B4B; }
```

- [ ] **Step 12: Commit**

```bash
git add src/styles.css
git commit -m "Light theme redesign: white glass cards/nav/modals, cooler background, real shadows"
git push origin master
```

---

### Task 3: Session Notes Blue Hue

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/Dashboard.jsx:164-171`
- Modify: `src/components/Schedule.jsx:197-204`
- Modify: `src/components/Sessions.jsx:22-29`

- [ ] **Step 1: Add CSS for focus-notes blue hue states**

In `src/styles.css`, after the existing `.focus-notes::placeholder` rule (line ~464), add:
```css
/* Blue hue when focused (recording mode) */
.focus-notes:focus {
  background: rgba(37,99,235,0.08);
  border-color: rgba(37,99,235,0.25);
}
/* Blue hue persists when textarea has content (even when blurred) */
.focus-notes.has-content {
  background: rgba(37,99,235,0.06);
  border-color: rgba(37,99,235,0.15);
}
```

No light theme override needed — these blue tints work on both backgrounds.

- [ ] **Step 2: Add has-content class to Dashboard.jsx textarea**

In `src/components/Dashboard.jsx`, change the textarea at line ~164:
```jsx
{/* Old */}
<textarea className="focus-notes" rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>

{/* New */}
<textarea className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    e.target.classList.toggle('has-content', e.target.value.trim() !== '');
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>
```

- [ ] **Step 3: Add has-content class to Schedule.jsx textarea**

In `src/components/Schedule.jsx`, change the textarea at line ~197:
```jsx
{/* Old */}
<textarea className="focus-notes" rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>

{/* New */}
<textarea className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    e.target.classList.toggle('has-content', e.target.value.trim() !== '');
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>
```

- [ ] **Step 4: Add has-content class to Sessions.jsx EditableFocus textarea**

In `src/components/Sessions.jsx`, change the textarea at line ~22:
```jsx
{/* Old */}
<textarea className="focus-notes" rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>

{/* New */}
<textarea className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`} rows="1" placeholder={t(lang, 'notesPlaceholder')}
  defaultValue={session.sessionNotes || ''}
  onBlur={e => {
    e.target.classList.toggle('has-content', e.target.value.trim() !== '');
    if (e.target.value !== (session.sessionNotes || '')) {
      dispatch({ type: 'UPDATE_SESSION', payload: { id: session.id, sessionNotes: e.target.value } });
    }
  }}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/components/Dashboard.jsx src/components/Schedule.jsx src/components/Sessions.jsx
git commit -m "Session notes blue hue: active when focused, persists when has content"
git push origin master
```

---

### Task 4: Haptic Feedback

**Files:**
- Modify: `src/utils.js:1` (add export)
- Modify: `src/App.jsx:8` (import)
- Modify: `src/components/Dashboard.jsx:3` (import + calls)
- Modify: `src/components/Schedule.jsx` (import + calls)
- Modify: `src/components/Sessions.jsx:3` (import + calls)
- Modify: `src/components/Clients.jsx` (import + calls)
- Modify: `src/components/General.jsx:3` (import + calls)

- [ ] **Step 1: Add haptic helper to utils.js**

At the top of `src/utils.js` (after line 1, after `genId`), add:
```js
/** Trigger haptic feedback — silent no-op on devices that don't support it (iOS) */
export const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch(e) {} };
```

- [ ] **Step 2: Add haptic to App.jsx nav tab switches**

In `src/App.jsx`, add `haptic` to the import from `./utils` (line 8):
```js
import { reducer, loadData, saveData, today, timeToMinutes, haptic } from './utils';
```

In the nav button onClick (line ~159), add haptic call:
```jsx
{/* Old */}
<button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} onClick={() => setTab(tb.id)}>

{/* New */}
<button key={tb.id} className={`nav-btn${tab === tb.id ? ' active' : ''}`} onClick={() => { haptic(); setTab(tb.id); }}>
```

- [ ] **Step 3: Add haptic to Dashboard.jsx buttons**

In `src/components/Dashboard.jsx`, add `haptic` to the import from `../utils` (line 3):
```js
import { today, formatDate, formatDateLong, SESSION_TYPES, TIMES, DURATIONS, FOCUS_TAGS, sendReminderWhatsApp, getSessionOrdinal, timeToMinutes, localDateStr, getStatus, haptic } from '../utils';
```

Add `haptic()` at the start of these onClick handlers:
- Complete button (line ~137): `onClick={() => { haptic(); updateStatus(session.id, 'completed'); }}`
- Cancel button (line ~152): `onClick={() => { haptic(); cancelSession(session); }}`
- Focus tag buttons (line ~161): `onClick={() => { haptic(); toggleFocus(tag); }}`

- [ ] **Step 4: Add haptic to Schedule.jsx buttons**

In `src/components/Schedule.jsx`, add `haptic` to the import from `../utils`.

Add `haptic()` at the start of these onClick handlers:
- Focus tag buttons (line ~194): `onClick={() => { haptic(); toggleFocus(tag); }}`
- Complete/Cancel/Edit buttons on session cards (same pattern as Dashboard)

- [ ] **Step 5: Add haptic to Sessions.jsx focus tags**

In `src/components/Sessions.jsx`, add `haptic` to the import from `../utils` (line 3):
```js
import { formatDate, SESSION_TYPES, getSessionOrdinal, FOCUS_TAGS, DURATIONS, TIMES, getStatus, haptic } from '../utils';
```

In `EditableFocus` component, add haptic to focus tag onClick (line ~18):
```jsx
{/* Old */}
onClick={() => toggleFocus(tag)}
{/* New */}
onClick={() => { haptic(); toggleFocus(tag); }}
```

Add haptic to filter tab clicks (in the filter-row map).

- [ ] **Step 6: Add haptic to Clients.jsx**

In `src/components/Clients.jsx`, add `haptic` to the import from `../utils`.

Add `haptic()` to the delete button and edit button onClick handlers.

- [ ] **Step 7: Add haptic to General.jsx todo checkboxes**

In `src/components/General.jsx`, add `haptic` to the import from `../utils` (line 3):
```js
import { exportBackup, mergeBackup, genId, DEFAULT_TEMPLATES, haptic } from '../utils';
```

Add `haptic()` to the todo checkbox toggle onClick handler.

- [ ] **Step 8: Commit**

```bash
git add src/utils.js src/App.jsx src/components/Dashboard.jsx src/components/Schedule.jsx src/components/Sessions.jsx src/components/Clients.jsx src/components/General.jsx
git commit -m "Haptic feedback: vibrate on taps (Android), silent no-op on iOS"
git push origin master
```

---

### Task 5: Dumbbell Logo Redesign

**Files:**
- Modify: `src/App.jsx:110-115`

- [ ] **Step 1: Replace the logo SVG**

In `src/App.jsx`, replace the SVG inside `.logo-icon` (lines 110-115):
```jsx
{/* Old — tall rectangles that look like a water jug */}
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <path d="M6.5 6.5h11M6.5 17.5h11"/>
  <rect x="2" y="5" width="4.5" height="14" rx="1.5"/>
  <rect x="17.5" y="5" width="4.5" height="14" rx="1.5"/>
  <line x1="4.25" y1="12" x2="19.75" y2="12"/>
</svg>

{/* New — proper horizontal dumbbell with stacked plates */}
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <line x1="6" y1="12" x2="18" y2="12"/>
  <rect x="3.5" y="7.5" width="3" height="9" rx="1.2"/>
  <rect x="17.5" y="7.5" width="3" height="9" rx="1.2"/>
  <rect x="1" y="9" width="2.5" height="6" rx="1"/>
  <rect x="20.5" y="9" width="2.5" height="6" rx="1"/>
</svg>
```

- [ ] **Step 2: Visually verify**

Run `npm run dev`, open in browser, check that:
- The icon is recognizable as a dumbbell at 42x42px (the logo-icon container size)
- It looks clean in both dark and light themes
- The stroke weight is visible but not heavy

If proportions need tweaking, adjust `rx`, `width`, `height`, or plate positions.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "Logo: redesign dumbbell SVG — proper horizontal plates instead of water jug"
git push origin master
```

---

### Task 6: Auto-complete Delay — 1 Hour After Session End

**Files:**
- Modify: `src/App.jsx:62`

- [ ] **Step 1: Add 60-minute buffer to auto-complete check**

In `src/App.jsx`, change line 62:
```js
// Old — completes the moment session ends
(s.date < todayStr || (s.date === todayStr && nowMin >= timeToMinutes(s.time) + (s.duration || 45)))

// New — completes 1 hour after session ends (gives PT time to cancel no-shows)
(s.date < todayStr || (s.date === todayStr && nowMin >= timeToMinutes(s.time) + (s.duration || 45) + 60))
```

Note: sessions from previous days (`s.date < todayStr`) still auto-complete immediately — the 1-hour buffer only applies to today's sessions.

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "Auto-complete delay: 1 hour after session end instead of immediately"
git push origin master
```

---

### Task 7: Version Bump, Build, Verify, Deploy

**Files:**
- Modify: `src/App.jsx:142` (version label)

- [ ] **Step 1: Bump version to v2.4**

In `src/App.jsx`, change the version label (line ~142):
```jsx
{/* Old */}
<span className="app-version" style={{ margin: 0 }}>v2.3</span>
{/* New */}
<span className="app-version" style={{ margin: 0 }}>v2.4</span>
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Verify the bundle isn't corrupted**

```bash
node -e "const fs=require('fs'),h=fs.readFileSync('dist/index.html','utf8'),s=h.indexOf('<script>')+8,e=h.lastIndexOf('</script>');fs.writeFileSync('test-bundle.js',h.substring(s,e))" && node --check test-bundle.js && rm test-bundle.js
```

Expected: no output (success). If it prints a SyntaxError, the bundle is corrupted — do NOT deploy.

- [ ] **Step 4: Commit source + push master**

```bash
git add src/App.jsx
git commit -m "Bump version to v2.4"
git push origin master
```

- [ ] **Step 5: Deploy to gh-pages**

```bash
cp dist/index.html /tmp/ptapp-deploy.html
cp dist/sw.js /tmp/ptapp-deploy-sw.js
git checkout gh-pages
cp /tmp/ptapp-deploy.html index.html
cp /tmp/ptapp-deploy-sw.js sw.js
git add index.html sw.js
git commit -m "Deploy v2.4: visual polish, light theme redesign, haptic feedback, dumbbell logo"
git push origin gh-pages
git checkout master
```

- [ ] **Step 6: Report deployed version**

Tell Pierre: "v2.4 is live. Check on your phone — toggle to light theme to see the redesign."
