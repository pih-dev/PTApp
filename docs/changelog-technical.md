# PTApp Changelog

Version history with context, decisions, and the reasoning behind each change.

---

## v2.4 — Visual Polish, Light Theme Redesign, Haptic Feedback (2026-04-03/07)

**Client list session count excludes cancelled (Apr 7):**

*Problem:* The Clients tab card showed `state.sessions.filter(s => s.clientId === clientId).length` — total count including cancelled. The expanded month view showed e.g. "5 sessions, 4 completed, 1 cancelled" — so the same card displayed "5" in the header AND "4 + 1 cancelled" in the breakdown, which is confusing math.

*Fix in `Clients.jsx:39`:* Added `&& s.status !== 'cancelled'` to the filter. The header now matches the PT's mental model (cancelled = "didn't happen") and is internally consistent with the expanded breakdown.

*Why not surface cancelled separately on the card header?* The expanded view already does that. The card header is a glance-value — it should show the number that matters operationally. Cancelled sessions are still in the data and visible when expanded.

*No data changes, no migration.* Pure display fix.

---

**iOS keyboard not appearing on session notes — two-layer fix (Apr 7):**

*Problem:* PT (iPhone) couldn't get the keyboard to appear when tapping session notes anywhere in the app. Pierre tested on Android — worked fine. Worked on iPhone after the fix below — but the bug had two independent layers and required two separate fixes deployed across two iterations.

*Layer 1 — React synthetic touch event interference (caused by Modal swipe gesture):*
- The new `Modal.jsx` swipe-to-dismiss handlers used React's `onTouchStart/Move/End` props, which attach via React's synthetic event delegation at the document root.
- On iOS, when a textarea is inside a modal that has root-level touch listeners, the touch sequence sometimes triggers a synthetic click that fights with the focus event. Focus fires, the textarea is technically focused, but the keyboard never appears.
- *Fix:* Switched `Modal.jsx` to native `addEventListener` with `{ passive: true }` inside a `useEffect`. Bound directly to the modal content element, not via React. Added a tap-target dead zone — `onTouchStart` checks `e.target.closest('input, textarea, select, button, a, [contenteditable]')` and bails out without setting `dragging = true` if the touch began on a form element. Also added a 10px finger-jitter dead zone before any drag movement is registered.

*Layer 2 — readOnly + onFocus pattern (pre-existing bug, unknown duration):*
- All four files with session-notes textareas (`Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx`) used the same copy-pasted pattern: `<textarea readOnly onFocus={e => e.target.readOnly = false} onBlur={e => e.target.readOnly = true}>`. The intent was to prevent accidental edits while the PT scrolls past the textarea — only enable editing on tap.
- On iOS Safari, when you tap a `readOnly` field, iOS decides "no keyboard" BEFORE the focus event fires. By the time `onFocus` runs and removes the readOnly attribute, iOS has already committed to not showing the keyboard. Focus completes, the field becomes editable in the DOM, but the keyboard stays hidden. There is no recovery — the field is now broken until the user navigates away and back.
- Android has no such restriction, which is why this pattern lived in the codebase undetected.
- *Fix:* Removed `readOnly` from all four textareas entirely. Removed the readOnly manipulation from `onFocus`/`onBlur`. The collapse/expand visual behavior is handled entirely by the `.editing` CSS class toggle, which still works perfectly without readOnly. Added a comment in each file referencing the iOS bug to prevent regression.
- *Files changed:* `Dashboard.jsx`, `Schedule.jsx`, `Sessions.jsx`, `Clients.jsx` — same surgical change in each.

*Lesson saved to memory:* `feedback_ios_readonly_bug.md`. Added to CLAUDE.md TRAPS section. The PT's primary daily workflow is recording session notes — anything that breaks notes on iPhone is a P0 bug.

*Why both fixes were necessary:* Layer 1 alone wouldn't have fixed it (readOnly would still block the keyboard even with native listeners). Layer 2 alone wouldn't have fixed it (the synthetic event interference would still race with focus even on a non-readOnly field, in some sequences). Both layers had to be removed.

---

**iPhone reachability — toggles relocated + swipe-to-dismiss modals (Apr 7):**

*Problem:* On tall iPhones, the Ar/En and Lit/Drk stacked toggles in the header top-right were unreachable one-handed. Same for the × button on the General modal when the sheet filled the screen. Android screens are shorter so Pierre hadn't hit it in testing.

*Fix A — Toggles moved from header to General panel:*
- `App.jsx`: removed the vertical toggle stack (old lines 127-144), header now shows just logo + version/⋮ button. `setShowGeneral` button gets `marginInlineStart: 'auto'` directly instead of inheriting from the toggle container.
- `General.jsx`: added `setLang`, `theme`, `setTheme` props. New toggle strip rendered as the first child of the modal body (above notification banner and backup section). Same `.lang-toggle` CSS, just relocated.
- `App.jsx`: passes `setLang`/`theme`/`setTheme` through to `<General>`.

*Fix B — Swipe-down-to-dismiss + drag handle on all modals:*
- `Modal.jsx`: added `bodyRef` on the scrollable `.modal-body` and a `dragState` ref (no useState — avoids re-renders during the gesture).
- `onTouchStart`: only initiates drag if `bodyRef.current.scrollTop === 0`. This is the key to not conflicting with normal content scrolling — if the user is mid-scroll, we never hijack the gesture.
- `onTouchMove`: translates `.modal-content` downward with `transform: translateY(Nx * 0.7)` (0.7x resistance for feel). Downward-only — negative dy is clamped to 0. `transition: none` during drag so it tracks the finger 1:1.
- `onTouchEnd`: if `currentY > 80`, slide fully off with a 200ms ease-out then call `onClose()`. Otherwise spring back with the same `cubic-bezier(0.34, 1.56, 0.64, 1)` curve the modal uses to slide up (visual consistency with the open animation).
- Handlers bound via `useCallback` to keep them stable across re-renders.
- Drag handle: new `<div className="modal-handle" />` rendered above `.modal-header`. Pure visual — the gesture works on the whole modal content, not just the handle.

*CSS additions in `styles.css`:*
- `.modal-handle`: 36x4px pill, `rgba(255,255,255,0.25)`, `border-radius: 2px`, `margin: 10px auto 0`. Sits above the header inside the modal content.
- `.modal-header` top padding reduced `24px → 16px` to compensate for the handle's 10px margin (visual balance).
- `.theme-light .modal-handle`: `rgba(30,27,75,0.2)` (indigo-tinted for light theme consistency).

*Why scrollTop gate matters:* Without it, swiping down on a scrolled modal body would fight the native scroll — you'd either dismiss the modal when trying to scroll back up, or scrolling would feel sluggish because the transform was fighting the scroll position. Checking `scrollTop === 0` at touch-start is the standard iOS bottom-sheet pattern.

*Affects every modal:* General, booking/edit session, edit client, delete confirm, cancel prompt, token setup, doc viewer (nested modal inside General). All get the handle and swipe behavior automatically since it lives in the shared `Modal` component.

**Per-client billing periods (Apr 4):**

*New fields on client: `periodStart` (date), `periodLength` (enum):*
- `PERIOD_OPTIONS` in utils.js: `1month`, `4weeks`, `2weeks`, `1week`
- `getClientPeriod(client, dateStr)` returns `{start, end}` for the period containing `dateStr`
- `periodLength` is the master switch — when empty/falsy, function returns calendar month regardless of `periodStart`
- If `periodLength` set but `periodStart` empty, anchors to today (fallback for PT forgetting to set start date)
- `1month` periods: anchored to day-of-month from `periodStart`, with day clamping (e.g. 31st → 28th in Feb)
- Fixed-day periods: `4weeks`=28d, `2weeks`=14d, `1week`=7d — repeating windows from anchor
- `getSessionOrdinal` signature changed: `(sessions, id, clientId, month)` → `(sessions, id, clientId, periodStart, periodEnd)` — now filters by date range instead of month prefix
- New `getPeriodSessionCount(sessions, clientId, periodStart, periodEnd)` — replaces month-based counting in Schedule booking chips
- `getMonthlySessionCount` kept for backward compatibility (Clients.jsx month view)
- Clients.jsx: form includes `periodStart` (date input) + `periodLength` (select dropdown)
- Clients.jsx: changing dropdown to "Default" auto-clears `periodStart` for clean data
- WhatsApp `fillTemplate`: `{number}` placeholder → session ordinal in billing period, `{periodEnd}` → formatted period end date
- Default templates updated: includes `#️⃣ Session #{number} (until {periodEnd})`
- i18n: added `periodStart`, `periodLength`, `periodDefault`, `periodOptional` keys (en + ar)
- All consumers updated: Dashboard, Schedule, Sessions, Clients all use `getClientPeriod` for ordinals
- Bug fix: `getClientPeriod` originally gated on `!client.periodStart` — meant PT couldn't reset to default by dropdown alone (date input hard to clear on mobile). Fixed to gate on `!client.periodLength`.
- Bug fix: redundant ternary `diffDays >= 0 ? Math.floor(x) : Math.floor(x)` simplified to `Math.floor(x)`

*Client session history now editable (Apr 4):*
- Clients.jsx expanded view: added `EditableFocus` component (imported from Sessions.jsx pattern)
- Focus tags and session notes visible and editable in client month history
- Imports added: `FOCUS_TAGS` from utils.js

**Active session glow: blue to amber (Apr 4):**

*card-now hue changed from blue to amber/yellow:*
- Dark: `background: rgba(37,99,235,0.15)` -> `rgba(245,158,11,0.12)`, border `rgba(37,99,235,0.5)` -> `rgba(245,158,11,0.45)`, `box-shadow` blue -> amber
- Light: `background: rgba(37,99,235,0.25)` -> `rgba(245,158,11,0.18)`, border/shadow same amber treatment
- Dashboard.jsx: `borderInlineStart` active color `#2563EB` -> `#F59E0B`
- **Why:** Pierre requested yellow for active sessions. Amber (#F59E0B) distinguishes "happening now" from the blue accent system used everywhere else -- blue means "selected/active UI element," amber means "this session is in progress right now."

**Light theme contrast + glossy nav (Apr 4):**

*Nav/header glass - glossier, more transparent:*
- `.theme-light .header` / `.nav`: `rgba(30,64,175,0.25)` -> `rgba(30,64,175,0.15)` (more transparent)
- `backdrop-filter: blur(20px)` -> `blur(28px) saturate(1.4)` (stronger frosted glass effect)
- Border alpha reduced `0.15` -> `0.12` to match lighter glass

*Stat cards - more solid accent fills:*
- `.stat-clients`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-today`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- `.stat-week`: gradient `0.15/0.08` -> `0.3/0.18`, border `0.2` -> `0.35`
- Base `.stat-card` also boosted `0.5/0.3` -> `0.6/0.4`
- `.stat-label` color `0.55` -> `0.65`

*Muted text - stronger contrast across the board:*
- CSS vars: `--t4` `0.4` -> `0.5`, `--t5` `0.3` -> `0.42`, `--sep` `0.06` -> `0.08`
- `.logo-sub` `0.55` -> `0.65`
- `.app-version` `0.35` -> `0.45`
- `.nav-btn` `0.6` -> `0.7`
- `.meta` `0.5` -> `0.6`
- `.client-phone` `0.45` -> `0.55`
- `.client-notes` `0.4` -> `0.5`
- `.session-count` `0.4` -> `0.5`
- `.empty` `0.4` -> `0.5`
- `.success-detail` `0.5` -> `0.6`
- `.setup-sub` `0.45` -> `0.55`
- `.field-label` `0.55` -> `0.65`
- `.focus-notes::placeholder` `0.25` -> `0.35`
- `.modal-close` `0.4` -> `0.5`
- `.week-nav-label` `0.65` -> `0.7`

*Toggle buttons (Ar/En, Lit/Drk) - more visible:*
- Background: `rgba(255,255,255,0.15)` -> `rgba(255,255,255,0.25)` + added `border: 1px solid rgba(30,27,75,0.08)`
- Inactive text: `rgba(30,27,75,0.35)` -> `rgba(30,27,75,0.55)`
- Active: `color: #2563EB` -> `color: #1D4ED8` (deeper), `background: rgba(37,99,235,0.15)` -> `0.2`

**Code review cleanup (Apr 4):**

*Shared components extracted:*
- New `Icons.jsx`: 7 shared SVG icons (WhatsApp, Edit, Trash, Clock, Phone, Chevron, Close) — eliminates 20+ inline SVG duplications across Dashboard, Schedule, Clients, Modal
- New `CancelPrompt.jsx`: shared cancel session modal (count/forgive) — removes identical copy-paste from Dashboard.jsx and Schedule.jsx
- Modal.jsx: inline close SVG → `<CloseIcon />` import

*Native dialogs replaced with themed UI:*
- Clients.jsx: `confirm('Delete this client...')` → in-app modal with `deletePrompt` state, translated strings, styled danger button
- General.jsx: all 5 `alert()` calls → `notification` state with auto-dismiss banner (4s timeout), success (green) / error (red) styling
- `restoredInfo` i18n key now includes `{clients}` and `{sessions}` placeholders for dynamic restore counts

*i18n gaps closed:*
- TokenSetup.jsx: fully i18n'd (was entirely English) — added `tokenSubtitle`, `tokenPlaceholder`, `tokenConnect`, `tokenConnecting`, `tokenInvalid`, `tokenFailed` keys
- "at" date-time connector: hardcoded English "at" → `t(lang, 'at')` in Dashboard and Schedule action sheet modals
- App.jsx: passes `lang` prop to TokenSetup

*Variable shadowing fixed (documented trap):*
- utils.js: 5 instances of `.map(t =>` / `.filter(t =>` / `.find(t =>` renamed to `todo` / `stype`
- Sessions.jsx: 3 instances of `SESSION_TYPES.find(st =>` and `.map(st =>` renamed to `stype`
- All components now use `stype` for session types, `todo` for todo items, `tm` for times, `tb` for tabs

*RTL and theme fixes:*
- Clients.jsx chevron icon: `marginLeft: 6` → `marginInlineStart: 6` (fixes RTL)
- Dashboard.jsx stat cards: removed inline `style={{ background, border }}`, added CSS classes (`stat-clients`, `stat-today`, `stat-week`) so light theme overrides work
- styles.css: added `.stat-clients`, `.stat-today`, `.stat-week` with per-card accent colors + `.theme-light` overrides

*Docs:*
- instructions-v2.4.md: fixed "v2.3 button" → "v2.4 button"
- CLAUDE.md: marked 5 fixed issues, added Icons.jsx + CancelPrompt.jsx to project structure, updated variable shadowing trap description

**Post-deploy refinement (Apr 3, 3 rounds + Apr 4, 3 rounds):**

*Round 1 — visual feedback fixes:*
- Light theme cards: `rgba(255,255,255,0.72)` white → `rgba(219,234,254,0.55)` soft blue (white hurt eyes)
- Light theme card border: `rgba(30,27,75,0.07)` → `rgba(37,99,235,0.08)` blue tint
- Light theme inputs: `rgba(255,255,255,0.7)` → `rgba(237,244,254,0.6)` blue-tinted
- Notes focus hue: `0.08` → `0.15` background, `0.25` → `0.35` border, added `color: #60A5FA`
- Notes has-content hue: `0.06` → `0.12` background, `0.15` → `0.25` border, added `color: #60A5FA`
- Light theme notes: added explicit `.focus-notes:focus` and `.focus-notes.has-content` overrides with `color: #2563EB`
- Stat cards: gradient opacity ~3x (hex `15/08` → `30/18`), borders `25` → `35`
- "This Week" stat: changed from purple `#8B5CF6` to green `#10B981` for color variety

*Round 2 — header/nav strips:*
- Light theme header: added `background: rgba(191,219,254,0.65)` + `backdrop-filter: blur(20px)` (was transparent/white, clashed with blue cards)
- Light theme nav: `rgba(255,255,255,0.82)` white glass → `rgba(191,219,254,0.65)` blue glass (matched header)
- Dark theme header: added `background: rgba(37,99,235,0.06)` + `backdrop-filter: blur(20px)` (was transparent, indistinguishable from nav)

*Round 3 — blue background and coherence:*
- Light theme background: `#E2E0DB → #CDCAC4` beige gradient → `#C7D2E4 → #ADBDD4` blue-toned gradient
- Light theme header/nav: strengthened from `rgba(191,219,254,0.65)` → `rgba(171,205,252,0.7)` (differentiate from new blue bg)
- Light theme header/nav border: `rgba(37,99,235,0.1)` → `rgba(37,99,235,0.12)`
- Dark theme nav: `rgba(15,15,15,0.97)` near-black → `rgba(37,99,235,0.06)` blue glass (matched header)
- Stat cards: opacity boosted again (hex `30/18` → `50/30`, borders `35` → `55`) to stand out on blue canvas

*Round 4 — deep blue canvas (Apr 4):*
- Light theme background: `#C7D2E4 → #ADBDD4` → `#8B9FC0 → #6F87AC` deep steel blue
- Light theme header/nav: `rgba(171,205,252,0.7)` → `rgba(30,64,175,0.3)` darker blue, more transparent glass
- Light theme cards: `rgba(219,234,254,0.55)` → `rgba(96,165,250,0.3)` #60A5FA-based blue
- All light theme elements adjusted for darker canvas (inputs, tags, filters use white+blue glass)
- Modal: white → blue-tinted `rgba(220,232,250,0.97)`

*Round 5 — contrast fix (Apr 4):*
- Light theme background: `#8B9FC0 → #6F87AC` → `#94A8C8 → #788DB4` (slightly lighter to break monotone)
- Light theme cards: `rgba(96,165,250,0.3)` → `rgba(210,228,255,0.55)` opaque white-blue (breaks monotone)
- Light theme stat cards: matched card treatment
- Light theme nav buttons: boosted from `0.45` → `0.6` opacity
- Light theme nav active: `#2563EB` → `#1D4ED8` (deeper for light canvas)
- Dark theme nav inactive: `0.55` → `0.75` opacity (much more readable)
- Dark theme nav active: `#2563EB` → `#60A5FA` (brighter on dark)

*Round 6 — dark nav active strength (Apr 4):*
- Dark theme nav active: `#60A5FA` → `#3B82F6` (blue-500, not pale, not invisible — just right)
- Active dot matches `#3B82F6`

**What changed:**

*Light theme redesign — layer separation:*
- Background: `#E8E6E1 → #D8D4CD` warm beige changed to `#E2E0DB → #CDCAC4` cooler grey
- Cards: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.72)` near-opaque white
- Card shadows: `rgba(30,27,75,0.06)` → `rgba(30,27,75,0.1)` real depth
- Nav: `rgba(232,230,225,0.97)` opaque beige → `rgba(255,255,255,0.82)` white glass with `backdrop-filter: blur(20px)`
- Nav shadow: `0 -2px 8px rgba(0,0,0,0.05)` → `0 -2px 12px rgba(30,27,75,0.08)`
- Modals: `#E8E6E1 → #DEDBD5` beige → `rgba(255,255,255,0.95) → rgba(248,247,245,0.97)` white
- Inputs: `rgba(255,255,255,0.4)` → `rgba(255,255,255,0.7)` clean white
- Focus notes: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.6)`
- Setup card: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.7)`
- Card-now glow shadow: `0.15` → `0.2` opacity
- Card press: `background` change → `translateY(1px)` + shadow reduction
- Button press: added `rgba(30,27,75,0.08)` override for secondary/ghost
- Stat cards: added `linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.01))`

*Micro-polish — transitions (both themes):*
- `.card`: `transition: background 0.2s` → `background 0.2s, box-shadow 0.2s, transform 0.2s`
- `.focus-tag`: added `transition: all 0.15s ease`
- `.badge`: added `transition: background 0.2s, color 0.2s`
- `.filter-btn`: added `transition: all 0.15s ease`
- `.week-day`: added `transition: all 0.15s ease`

*Micro-polish — button/card press (both themes):*
- `.btn-primary:active` etc: added `box-shadow: 0 1px 4px`, `filter: brightness(0.92)`
- `.btn-secondary:active`, `.btn-ghost:active`: added `background: rgba(255,255,255,0.12)`
- `.card.card-tap:active`: `background` change → `translateY(1px)` + `box-shadow: 0 1px 4px`

*Nav active indicator:*
- `.nav-btn.active::after`: 4px blue dot below active tab label

*Modal spring:*
- `animation: slideUp 0.3s ease` → `slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`

*Stat cards:*
- Added `background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))` + border

*Session notes blue hue:*
- New CSS: `.focus-notes:focus` blue tint, `.focus-notes.has-content` blue persists
- Dashboard.jsx, Schedule.jsx, Sessions.jsx: `className` includes conditional `has-content`
- `onBlur` handler toggles `.has-content` class via `classList.toggle()`

*Elastic overscroll:*
- `initElasticScroll()` in utils.js: passive touch event handlers on `.content` div
- Pull curve: `sqrt(absDistance) * 4`, capped at 120px — stronger initial response than linear
- Bounce-back: `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` — same spring as modal, visible overshoot
- Wired in App.jsx via `useEffect` + `useRef` on the content container
- **Reverted:** non-passive `touchmove` + `preventDefault()` + `overscroll-behavior: none` broke the effect on Android Chrome. Passive listeners with browser native overscroll intact are the working approach.
- Notes textareas also have `key={session.sessionNotes}` to fix the `defaultValue` stale DOM trap on external sync updates

*Session notes expand/collapse:*
- All `.focus-notes` textareas: `readOnly` + `max-height: 32px` + `overflow: hidden` by default
- `onFocus`: removes `readOnly`, adds `.editing` class → `min-height: 80px` + `max-height: 120px` + `overflow-y: auto`
- `onBlur`: restores `readOnly`, removes `.editing` → collapses back to single line
- Transition: `max-height 0.25s ease` for smooth expand/collapse
- Applied in Dashboard.jsx, Schedule.jsx, Sessions.jsx

*Haptic feedback:*
- New `haptic()` helper in utils.js: `navigator.vibrate?.(ms)` with try/catch
- Wired into: App.jsx (nav tabs), Dashboard.jsx (complete, cancel, focus tags), Schedule.jsx (complete, cancel, focus tags), Sessions.jsx (focus tags, filter tabs), Clients.jsx (delete), General.jsx (todo checkbox)

*Dumbbell logo:*
- App.jsx SVG: replaced tall vertical rectangles with horizontal bar + stacked plates
- `strokeWidth` 2.5 → 2 for cleaner look

*Auto-complete delay:*
- App.jsx line ~62: `timeToMinutes(s.time) + (s.duration || 45)` → `+ 60` added
- Today's sessions get 1hr buffer; previous days still complete immediately

*Version:*
- v2.3 → v2.4 in header label

**Why — Light theme redesign:**
Pierre found the light theme "inferior to the dark." Diagnosis: everything blended — cards, nav, modals, and background were all warm beige at similar opacity. The fix creates clear visual layers: cooler background provides contrast canvas, near-opaque white cards float with real shadows, nav gets iOS-style white glass with blur, modals are white overlays distinct from the page. The dark theme works because light on dark is inherently contrasty; the light theme now achieves contrast through white-on-grey layering + shadows.

**Why — Micro-polish:**
Pierre's goal: "maximum sophistication... Apple achieved superiority in UX." The individual changes are small (transitions, press effects, a dot, a spring curve) but they compound. When every interaction responds fluidly instead of snapping, the app feels crafted rather than assembled. Performance cost is near zero — all CSS transitions, no JS animation loops.

**Why — Session notes blue hue:**
Pierre's idea. Focus tags already go blue when active — notes should match. The persistent blue hue on non-empty notes provides an information signal: scanning session cards, you can instantly see which ones have notes recorded without reading the content.

**Why — Haptic feedback:**
Pierre's idea. `navigator.vibrate()` works on Android only (iOS Safari doesn't support it). The PT uses iPhone so he won't feel it, but Pierre tests on Android and can demo it. Zero cost on unsupported devices — the helper is a one-liner with optional chaining.

**Why — Dumbbell logo:**
Pierre: "I thought it was a gallon of water." The old SVG's proportions (tall narrow rectangles) didn't read as a dumbbell at 24px. The new design uses the classic horizontal silhouette that's recognizable at any size.

**Why — Auto-complete delay:**
Pierre's idea. The PT sometimes needs to cancel a no-show, but if the session auto-completes the moment it ends, the PT has to undo the completion. A 1-hour buffer gives time to mark the cancellation naturally. Previous days still auto-complete immediately on app load (no stale scheduled sessions from yesterday).

**Files changed:** `src/styles.css`, `src/App.jsx`, `src/utils.js`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.3.2 — Visual Polish: Solid Badges, Indigo Light Theme, Depth (2026-04-03)

**What changed:**

*Status badges — CSS classes replace inline styles:*
- New CSS classes: `.badge-scheduled` (blue), `.badge-completed` (blue), `.badge-confirmed` (green), `.badge-cancelled` (red) — all solid fill, white text
- All 6 badge instances across Dashboard.jsx, Sessions.jsx, Clients.jsx, Schedule.jsx changed from `style={{ color: status.color, background: status.bg }}` to `className={`badge badge-${session.status}`}`
- `getStatus()` still used for translated label text, but its color/bg fields are no longer used in rendering

*Filter tabs:*
- `.filter-btn.active` changed from blue outline + tinted bg to solid `#2563EB` bg + white text (both themes)

*Delete buttons:*
- `.btn-danger-sm` changed from faint red tint (`rgba(239,68,68,0.1)` bg, red border, red icon) to solid `#EF4444` bg + white icon
- Dashboard.jsx and Schedule.jsx trash icons changed from `btn-icon` to `btn-danger-sm` (matches Clients.jsx)

*Light theme — indigo text:*
- Base text color: `#1A1A2E` → `#1E1B4B` (Tailwind indigo-950)
- All `rgba(0,0,0,...)` in `.theme-light` rules → `rgba(30,27,75,...)` for indigo tint (except `.modal-bg` which stays black for overlay effect)
- CSS vars: `--t1` through `--t5` and `--sep` all use indigo base
- Logo gradient: `#1A1A2E, #444` → `#1E1B4B, #3730A3` (indigo gradient)

*Card depth:*
- Base `.card` gets `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` (dark theme)
- `.theme-light .card` gets `box-shadow: 0 2px 8px rgba(30,27,75,0.06)` (light theme)
- `.theme-light .card.card-now` shadow updated to `0 2px 12px rgba(37,99,235,0.15)`
- `.theme-light .nav` gets `box-shadow: 0 -2px 8px rgba(0,0,0,0.05)` for top shadow
- Light theme card bg: `rgba(255,255,255,0.35)` → `rgba(255,255,255,0.4)` (slightly more opaque)
- Light theme card border: `rgba(0,0,0,0.06)` → `rgba(30,27,75,0.07)` (slightly stronger)

**Why — Solid badges:**
The old "colored text on pastel background" badges (e.g., grey `#6B7280` on `#F3F4F6` for Completed) washed out completely in the warm stone light theme. The pastel backgrounds were nearly invisible against the warm grey app background. Solid fills with white text provide consistent contrast in both themes. CSS classes rather than inline styles allow theme-specific overrides without passing theme to utility functions.

**Why — Indigo text:**
Pierre found the light theme "bland" compared to the dark theme which has good contrast and character. Pure black text on warm stone is flat. The indigo tint (`#1E1B4B` / `rgba(30,27,75,...)`) adds a subtle blue-purple warmth that complements the warm stone background and creates visual identity. The effect is most noticeable on headings and bold text; body text at lower opacity reads as a warm grey.

**Why — Card shadows:**
The dark theme naturally has depth because lighter cards float on a dark background. The light theme lacked this — cards blended into the background. Adding `box-shadow` creates the layered "3D" effect Pierre wanted. Dark theme gets a stronger shadow (higher opacity) since it's on a dark bg; light theme gets a softer one using the indigo base for color consistency.

**Files changed:** `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/Schedule.jsx`

---

## v2.3.1 — Bug Fix Round + Code Review (2026-04-03)

**What changed:**

*Timezone / date handling:*
- New `localDateStr(d)` and `localMonthStr(d)` helpers in utils.js — format Date objects using local time
- `today()` and `currentMonth()` now use these helpers
- Clients.jsx: `viewMonth` init, `shiftMonth()`, and `toggleExpand()` all switched from `toISOString().slice()` to `localMonthStr()`
- Schedule.jsx: `weekDates` generation and week navigation switched from `toISOString().split('T')[0]` to `localDateStr()`
- Schedule.jsx: `createdAt` on new sessions switched from `toISOString()` to `localDateStr()`
- Dashboard.jsx: "This Week" stat switched from fractional day math `(d - now) / 86400000` to date string comparison `s.date >= todayStr && s.date <= localDateStr(weekEnd)`

*Sync reliability:*
- `pushRemoteData()` in sync.js now accepts `_retries` param, capped at 3 (was infinite recursion on 409)
- App.jsx: `pushRemoteData` replaced with `debouncedSync()` (1 second debounce via `setTimeout`)

*Auto-complete batching:*
- New `BATCH_COMPLETE` reducer case in utils.js — takes array of IDs, marks all completed in one pass
- App.jsx: auto-complete effect collects lapsed IDs then dispatches one `BATCH_COMPLETE` instead of N `UPDATE_SESSION`s

*i18n:*
- New `getStatus(status, lang, tFn)` helper in utils.js — returns `{color, bg, label}` with translated label
- All components (Dashboard, Schedule, Sessions, Clients) switched from `STATUS_MAP[status]` to `getStatus(status, lang, t)`
- Status badge labels ("Scheduled", "Completed", etc.) now show in Arabic when language is set to Arabic

*Variable shadowing cleanup (all components):*
- `.find(t =>` → `.find(st =>` for SESSION_TYPES lookups
- `.map(t =>` → `.map(st =>` for SESSION_TYPES dropdowns, `.map(tm =>` for TIMES
- `.filter(t =>` → `.filter(f =>` for focus tag filtering
- `tabs.map(t =>` → `tabs.map(tb =>` in App.jsx nav

*RTL:*
- App.jsx: toggle container inline style `marginLeft: 'auto'` → `marginInlineStart: 'auto'`

*Other:*
- Schedule.jsx: removed unused `useRef`, `useEffect` imports
- General.jsx: new todos initialize with explicit `done: false`
- General.jsx: WhatsApp template textareas get `key` prop tied to state value, forcing remount on reset
- `STATUS_MAP` export retained for backward compat but components use `getStatus()`

**Why — Timezone:**
`toISOString()` converts to UTC. Midnight in Beirut (UTC+3) = 21:00 previous day UTC. When the result is sliced to `YYYY-MM`, the month is wrong. The `today()` function was already fixed in a prior session but the same pattern existed in 8 other locations — Clients month nav, Schedule week nav, Dashboard week stat, and session createdAt. The fix was applied in one place without auditing the rest of the codebase. This incident established the review discipline: when fixing a pattern bug, audit every file.

**Why — Debounced sync:**
Every `dispatch()` triggers a state change, which triggers `pushRemoteData`. Tapping 3 focus tags + typing notes = 4+ API calls in seconds. The 1s debounce coalesces these into a single push. localStorage save remains immediate (no data loss risk if the tab closes).

**Why — Batch auto-complete:**
N lapsed sessions = N dispatches = N state changes = N debounced syncs = N re-renders. With `BATCH_COMPLETE`, it's 1 dispatch = 1 re-render = 1 sync push.

---

## v2.3 — Blue Accent, Warm Light Theme, Todo Checkboxes (2026-04-03)

**What changed:**
- All `#E8453C` (red) and `#FF6B6B` (light red) accent references in CSS replaced with `#2563EB` / `#60A5FA` (blue)
- All `rgba(232,69,60,...)` replaced with `rgba(37,99,235,...)`
- `.setup-error` kept as `#EF4444` (error red, not accent)
- Strength session type color changed from `#E8453C` to `#6366F1` (indigo) in `SESSION_TYPES`
- Light theme background: `#E8E6E1` → `#D8D4CD` warm stone gradient (was harsh `#F8F9FA` white)
- Light theme cards: `rgba(255,255,255,0.35)` subtle frosted (was `rgba(0,0,0,0.03)` transparent)
- Light theme nav: warm `rgba(232,230,225,0.97)` matching background
- Light theme modal: warm `#E8E6E1` → `#DEDBD5` gradient
- Light theme inputs/textareas: `rgba(255,255,255,0.4)` warm frosted
- Removed `.theme-light .logo-icon` override — base logo is now blue, same both themes
- Header: lang/theme toggles wrapped in `flex-direction: column` container
- Toggle spans: `width: 36px; text-align: center` for fixed-width alignment
- Dashboard stat card "Clients" changed from `#E8453C` to `#6366F1` (indigo)
- Dashboard `isNowSession` border changed from `#E8453C` to `#2563EB`
- Cancel button color changed from `#E8453C` to `#EF4444` (standard danger red)
- New `TOGGLE_TODO` reducer case: flips `done` boolean on todo items
- General.jsx: added checkbox SVG button before each todo item with done/undone toggle
- Done items render with `text-decoration: line-through; opacity: 0.5`

**Why — Blue accent:**
The PT and Pierre both found the red accent too aggressive. Blue is calmer and works better in both dark and light themes. The light theme was already blue (v2.2 shipped with blue light theme), so aligning the dark theme creates visual consistency. Session type colors (indigo, blue, purple, amber, green, grey) remain distinct for differentiation.

**Why — Warm light theme:**
The v2.2 light theme used near-white backgrounds (#F8F9FA) which was painful in bright environments. The warm stone palette (#E8E6E1 area) reduces glare while maintaining readability. Subtle frosted cards (`rgba(255,255,255,0.35)`) blend with the background rather than creating jarring white rectangles.

**Why — Todo checkboxes:**
The PT was manually typing "Done" at the end of todo items because there was no way to mark them complete. The `done` boolean field is backward-compatible — existing todos without it default to `false` via the `!t.done` toggle.

---

## v2.2 — Arabic, Light Theme, Editable WhatsApp Messages (2026-04-03)

**What changed:**
- New `src/i18n.js` — ~100 translation keys in English and Arabic, `t(lang, key)` lookup function, `dateLocale(lang)` helper
- All components accept `lang` prop and use `t()` for all user-facing strings
- `dir="rtl"` applied to app container when Arabic selected
- `formatDate` and `formatDateLong` accept optional `lang` param for locale-aware dates (ar-LB / en-US)
- `DEFAULT_TEMPLATES` restructured to `{ en: { booking, reminder }, ar: { booking, reminder } }`
- `sendBookingWhatsApp` / `sendReminderWhatsApp` accept `lang` param to pick correct default template
- New `SET_TEMPLATES` reducer case + `messageTemplates` field in state (synced, backed up, merged)
- General.jsx: new "WhatsApp Messages" section with editable textareas for booking/reminder templates
- `borderLeft` replaced with `borderInlineStart` across all session card inline styles for RTL
- RTL CSS overrides: logo stays LTR (brand name), inputs/notes right-aligned, lang toggle margin flipped
- Light theme: `.theme-light` class on app-container, ~70 CSS overrides swapping dark→white bg and red→blue (#2563EB) accent
- Lit/Drk toggle in header, persisted to localStorage (`ptapp-theme`)

**Why — Full i18n:**
The PT's clients speak Arabic. WhatsApp messages in English feel out of place. Pierre requested Arabic notifications as a future item — the Ar/En toggle was already in place, so wiring translations was the natural next step. The `t()` function falls back to English if a key is missing, so adding Arabic can't break the English UI.

**Why — Editable templates:**
The WhatsApp messages were hardcoded by the developer. The PT should own his client communication — tone, emoji, wording. Storing templates in state means they sync between devices (PT's iPhone and Pierre's Android see the same messages).

**Why — Light theme:**
Some users prefer light themes, especially outdoors in bright light. The blue accent distinguishes it visually from the dark theme's red. Both preferences persist independently via localStorage.

**Files changed:** `src/i18n.js` (new), `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.1 — Streamlined Workflow, Readability, Language Toggle (2026-04-03)

**What changed:**
- Removed "✓ Confirm" button from Schedule.jsx, Dashboard.jsx (expanded + action sheet)
- Removed "Confirmed" stat card from Dashboard overview (now 3 cards: Clients, Today, This Week)
- Removed `confirmed` from Sessions.jsx filter row
- Auto-complete: new `useEffect` in App.jsx marks scheduled/confirmed sessions as completed when their end time (start + duration) has passed
- Sessions.jsx: completed sessions now show `EditableFocus` component (tappable tags + notes textarea) instead of read-only display
- All text opacity bumped across CSS and inline JSX — values like 0.25→0.4, 0.3→0.5, 0.35→0.5, 0.4→0.55, 0.5→0.65
- Ar/En language toggle in App.jsx header — `lang` state persisted to localStorage (`ptapp-lang`)
- New `EDIT_TODO` reducer case in utils.js
- Todo items in General.jsx now editable inline (tap to switch to input, blur/Enter to save)

**Why — Remove confirmation:**
The PT never uses the Confirm step. Sessions go scheduled→completed in practice. Hiding it removes a button that adds friction without value. The `confirmed` status still exists in STATUS_MAP for backward compatibility with existing data.

**Why — Auto-complete:**
The PT doesn't bother tapping "Complete" after each session — he's busy training. Sessions from yesterday or earlier today were stuck on "Scheduled" indefinitely. Auto-completing when the session's end time passes makes the workflow organic. If a session needs cancelling, that option remains available.

**Why — Readability bump:**
The dark theme's secondary text was too faint (0.25–0.35 opacity) to read in bright environments like a gym. Systematic bump of all text opacity values while maintaining visual hierarchy.

**Files changed:** `src/App.jsx`, `src/utils.js`, `src/styles.css`, `src/components/Dashboard.jsx`, `src/components/Schedule.jsx`, `src/components/Sessions.jsx`, `src/components/Clients.jsx`, `src/components/General.jsx`

---

## v2.0 — Nicknames, General Panel, Backup & Docs (2026-04-02)

**What changed:**
- New `nickname` field on clients — auto-populated with first name, used in WhatsApp messages (`friendly(client)` helper)
- `capitalizeName()` utility capitalizes each word in a name
- Data schema v2: migration capitalizes existing names and populates nicknames
- New `General.jsx` component — modal panel with backup/restore and documentation links
- ⋮ button added to app header (next to version label) to open General panel
- Backup section removed from Clients.jsx — moved to General panel
- Documentation links point to versioned instructions and changelog on GitHub

**Why — Nicknames:**
WhatsApp messages used the client's full name ("Hi Ahmad Khalil!") which felt impersonal. The PT knows clients by first name. Auto-populating the nickname with the first name means zero extra work for the PT, but he can customize it if a client goes by something else.

**Why — General panel:**
The backup section in Clients felt out of place — it's not client-specific, it's app-wide. Moving it behind a ⋮ menu keeps Clients focused on client management. The panel also houses documentation links so the PT can find instructions without Pierre.

**Why — Name capitalization:**
The PT typed names inconsistently (some lowercase, some mixed). Auto-capitalizing on blur and migrating existing names ensures everything looks clean.

**Files changed:** `src/components/General.jsx` (new), `src/App.jsx`, `src/components/Clients.jsx`, `src/utils.js`

---

## v1.9.2 — Restore Cancelled Sessions (2026-04-02)

**What changed:**
- Cancelled sessions on Schedule tab now show "↩ Restore" button (sets status back to `scheduled`)
- Cancelled sessions on Sessions tab show both "↩ Restore" and "✅ Complete" buttons
- Sessions tab default filter changed from `active` to `scheduled`
- Sessions component now accepts `dispatch` prop (was read-only before)

**Why:**
The PT accidentally cancelled Pierre's session that was already completed with notes and focus tags. The data was preserved (cancellation doesn't delete anything) but there was no UI to undo it. Status changes were one-way: you could cancel but never un-cancel.

**Design decision:**
- Restore sets status to `scheduled` (not back to whatever it was before) — simplest approach, and the PT can then Confirm/Complete as normal
- "Complete" button offered directly on cancelled cards in Sessions tab — saves a step for the common case of "I cancelled this but it actually happened"
- Dashboard expanded view still filters out cancelled sessions (correct — they're not active today)
- Notes, focus tags, and all session data are fully preserved through cancel→restore

**Why default to Scheduled:**
Pierre requested it — the Sessions tab should show what's coming up, not everything. Cancelled sessions cluttering the default view was annoying.

---

## v1.9.1 — Offline Support, Session Highlight, Client History (2026-04-02)

**What changed:**
- Service worker (`public/sw.js`) caches the app for offline use. Network-first for HTML, caches fonts too.
- Google Fonts `<link>` made non-blocking with `media="print" onload="this.media='all'"` — app renders instantly without internet.
- Current session highlight upgraded from invisible 1px box-shadow to visible red tint + border + glow. Now highlights ALL concurrent sessions, not just the first (`findIndex` → `isNowSession` function).
- `#N` on session cards changed from total monthly count to sequential ordinal (1st, 2nd, 3rd session that month). New `getSessionOrdinal()` in utils.js.
- Focus tags no longer cleared on session type change — hidden when viewing different type, restored when switching back.
- Sessions tab defaults to "Active" filter (everything except cancelled). New "Active" button added.
- Client cards on Clients tab are expandable — tap to see monthly session history with month navigator, summary counts, and session list.
- `.gitattributes` added to normalize line endings to LF (silences CRLF warnings on Windows).

**Why — Offline:**
Internet connectivity in Beirut is unreliable. The PT needs the app to work when his connection drops. Service worker with network-first strategy means: online = fresh version, offline = cached version. Google Fonts degrade gracefully to system fonts.

**Why — Highlight:**
Pierre couldn't see the old highlight (1px at 30% opacity). Cranked it to `rgba(232,69,60,0.15)` background, `0.5` border, `20px` glow. Also fixed: `findIndex` only highlighted the first session at a given time, but group sessions mean multiple sessions run simultaneously.

**Why — Sequential #N:**
Showing "#3" on all three of a client's sessions was confusing. Now they show #1, #2, #3 in chronological order within the month. The booking chip still shows total count (context for "how many sessions so far").

**Why — Focus tag persistence:**
If the PT switches Strength → Cardio to try a tag, then switches back, the Strength tags were wiped. Data loss. Now tags are preserved — different type's tags are just hidden (the `focus` array isn't cleared on type change).

**Why — Client history:**
The PT wanted to see a client's sessions at a glance without switching to the Sessions tab and filtering. Tap the card, see the month, browse history.

**Files changed:** `public/sw.js` (new), `src/main.jsx`, `index.html`, `src/components/Dashboard.jsx`, `src/components/Clients.jsx`, `src/components/Sessions.jsx`, `src/components/Schedule.jsx`, `src/utils.js`, `src/styles.css`, `.gitattributes` (new)

---

## v1.9 — Inline Session Type Selector (2026-04-02)

**What changed:**
- Session type on cards (Schedule + Dashboard expanded view) is now a tappable `<select>` dropdown instead of static text
- Changing the type dispatches `UPDATE_SESSION` with the new type and `focus: []` (clears tags)
- Session notes (`sessionNotes`) are left untouched on type change
- New `.inline-type-select` CSS class makes the dropdown blend with the meta text line

**Why:**
The PT's next session was booked as "Strength" but he might switch to something else during the workout. Before this, changing the type required opening the Edit modal — unnecessary friction for a single-field change. Pierre proposed: tap the type, pick a new one, tags reset, notes stay. Flummox agreed ("one field, three behaviors").

**Implementation:**
- Replaced `{st.emoji} {session.type}` in the meta line with an inline `<select>` in both Schedule.jsx and Dashboard.jsx (expanded view)
- The `onChange` handler dispatches `UPDATE_SESSION` with `{ type: newValue, focus: [] }` — same auto-save pattern as focus tags
- Compact view and Sessions tab remain read-only (display contexts, not working contexts)
- No schema change — `type` is an existing field, `focus` is already an optional array

**No edge cases:** The `st` variable (session type lookup for color/emoji) re-derives from `session.type` on every render, so the card border color and emoji in the dropdown update instantly.

---

## v1.8 — Dashboard Expanded View (2026-04-02)

**What changed:**
- Home tab now defaults to "Expanded" view showing today's sessions with full inline controls: action buttons, focus tags, session notes
- Toggle button switches between Expanded (today's sessions, full cards) and Compact (upcoming 5, tap for action sheet)
- Current/next session gets a subtle red highlight border
- Auto-scroll was added then removed (see below)

**Why:**
Flummox raised a valid point: focus tags were only available on the Schedule tab. If the PT is mid-session on the Home tab and wants to tag what muscle group he's working, he'd have to navigate to Schedule — a dead end in his flow. Pierre agreed and proposed a toggle: expanded (full functionality) as default, compact (overview) as the alternative.

**The auto-scroll saga (Flummox vs. pragmatism):**
Initially added auto-scroll to center the current/next session on screen. Flummox hammered on it:
1. "What if sessions change? Scroll won't re-trigger" — True, but the dependency was `[expanded]` only
2. "New session drops in, highlight jumps, you're scrolled to the old one" — Technically correct
3. "Stale lock! Ticking bomb!" — Dramatic but the scenario requires sessions appearing while the PT stares at Home, which can't happen (single user, local storage)

Pierre's resolution: "Maybe just the highlight is enough?" — Correct. With 5-8 sessions per day, a glowing border is easy to spot. Auto-scroll removed. Less code, zero edge cases.

**Lesson:** Don't build solutions for problems that can't occur. The highlight alone does the job.

---

## v1.7 — Session Focus Tags & Notes (2026-04-02)

**What changed:**
- Tappable focus tags on each session card in Schedule (and now Dashboard expanded)
- Tags vary by session type:
  - Strength: Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body
  - Cardio: Running, Cycling, Rowing, Swimming, Jump Rope, Stairs
  - Flexibility: Stretching, Yoga, Mobility, Foam Rolling
  - HIIT: Upper Body, Lower Body, Full Body, Core, Tabata, Circuit
  - Recovery: Foam Rolling, Stretching, Ice Bath, Light Cardio, Massage
- Free text session notes field (saves on blur)
- Tags and notes show read-only in Sessions tab history

**Why:**
The PT needed to record what was done during sessions. "Strength" alone doesn't tell you if it was chest day or leg day. Pierre asked for subcategories — tappable for speed, varying by session type.

**Design decisions:**
- Tags auto-save on tap — no modal, no save button. One tap = saved. This aligns with the UX principle established in this session: the PT adopted the app because it's frictionless. Any extra step risks losing him.
- Notes field designed for future expansion — the PT can write "Bench press 3x10 80kg" and later we can parse it for detailed weight/rep tracking.
- Flummox worried about accidental taps without confirmation. Pierre's response: a mistap costs one tap to undo. A confirmation dialog costs every user every time. Simplicity wins.

---

## v1.6 — Time Grid, Monthly Count, Cancel Count/Forgive, Client Fields (2026-04-01)

**What changed:**
- Default session duration changed from 60 to 45 minutes
- Time picker replaced with a visual 4-column grid (was a `<select>` dropdown)
  - Occupied slots show red with client name
  - Still allows booking on occupied slots (group sessions, overlaps are the PT's call)
- Monthly session count (#N) shown on session cards and booking chips
- Cancel flow changed from delete to "Count or Forgive" prompt
- Gender and birthdate fields added to client profiles (optional)

**Why — Time grid:**
Pierre wanted conflict awareness when booking. Flummox flagged that iOS Safari ignores `<option>` styling — you can't color individual dropdown options on iPhone. Solution: replace the `<select>` with a tappable button grid. Same data, full styling control.

**Why — Monthly count:**
The PT gets paid a lump sum per month for a set number of sessions (typically 10). The counter tracks how many sessions each client has used. Shows on every session card so the PT always knows the tally.

**Why — Cancel count/forgive:**
Before v1.6, cancelling deleted the session entirely. Problem: if a client no-shows, the PT still needs that session to count against their monthly quota. Now cancelling keeps the record and asks:
- "Count" — no-show or late cancel, counts toward monthly total
- "Forgive" — legitimate cancel with proper notice, doesn't count

**Why — Default 45min:**
Pierre's PT does 45-minute sessions by default, not 60.

**Status workflow decision:**
Pierre raised a key question: what if the PT never taps Confirm or Complete? Sessions just sit at "Scheduled" forever. Decision: everything counts regardless of status. The only thing that reduces the count is a forgiven cancellation. Confirm/Complete are optional — may be simplified or removed later.

---

## v1.5 — Multi-Client Session Booking (2026-04-01)

**What changed:**
- Booking form now supports selecting multiple clients
- Client dropdown uses "add to list" pattern: pick a client, chip appears, dropdown resets
- Each chip has an X to remove; already-selected clients hidden from dropdown
- Book button shows count: "Book Session (3 clients)"
- Creates N independent sessions (one per client) — identical to booking separately
- WhatsApp confirmation cycles through clients one by one: (1/3), (2/3), (3/3)
- Edit mode stays single-client (each session is independent)

**Why:**
The PT sometimes trains multiple clients at the same time slot. Before this, he had to create each session individually with the same date/time/type — repetitive and slow. This is purely a workflow shortcut; the end result is identical to manual booking.

**Design decision — approach:**
Three approaches were considered:
1. **Multi-select in form (chosen)** — Single change point, zero schema changes
2. **"Book for another client" button after booking** — More taps, doesn't feel like one action
3. **Duplicate session action** — Useful but doesn't solve the original ask

**Design decision — UI:**
Pierre rejected the initial proposal of checkboxes/chips with a search filter. His feedback: "the current way works well, click button, add client. In multi, click the button again add another client." Keeping the existing dropdown and just adding chips was simpler and consistent with what the PT already knows.

**Data model:**
No schema change. Each session still has a single `clientId`. The multi-select is purely a UI convenience that dispatches `ADD_SESSION` N times.

---

## Pre-v1.5 — Foundation

The app existed before this changelog. Key facts:
- Single-page React app, Vite build, pure CSS dark theme
- GitHub Pages deployment (single HTML file via vite-plugin-singlefile)
- localStorage for data, WhatsApp via wa.me links
- Bottom tab navigation: Home, Clients, Schedule, Sessions
- The PT adopted the app immediately and booked all his clients through it from day one

---

## Principles Established

These emerged from the development process and guide future decisions:

1. **UX simplicity is the priority.** The PT adopted the app because it's simple and inviting. Every feature must pass the "does this add friction?" test. Auto-save, single-tap actions, minimal steps.

2. **Don't build for scenarios that can't happen.** Single user, local storage, single device. Don't add complexity for multi-user edge cases that don't exist yet.

3. **Ship and observe.** When unsure about a feature's placement or behavior, ship the simplest version and watch how the PT actually uses it. Real usage beats assumptions.

4. **Flummox is useful.** The octopus catches real issues (iOS dropdown styling, scroll edge cases) mixed with overthinking. Filter accordingly.

5. **Everything counts.** Sessions count toward the monthly total regardless of status. Only forgiven cancellations reduce the count. The PT won't consistently tap Confirm/Complete — don't depend on it.
