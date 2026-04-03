# PTApp v2.4 — Visual Polish + Light Theme Redesign

**Date:** 2026-04-03
**Scope:** CSS-focused visual upgrade + minor JS touches. No layout or structural changes.
**Goal:** Elevate the app from "works well" to "feels premium" — especially the light theme — while preserving performance and simplicity.

---

## 1. Light Theme Redesign

### Problem
The light theme lacks layer separation. Background, cards, nav, and modals are all similar warm beige tones — everything blends together. The dark theme works because light cards pop against a dark canvas. The light theme needs the same contrast: distinct visual layers.

### Changes

**Background — cooler, slightly darker canvas:**
```css
/* Current */
background: linear-gradient(145deg, #E8E6E1 0%, #E0DDD7 50%, #D8D4CD 100%);

/* New — cooler undertone, slightly darker for better card contrast */
background: linear-gradient(145deg, #E2E0DB 0%, #D5D2CC 50%, #CDCAC4 100%);
```

**Cards — near-opaque white with real shadows:**
```css
/* Current */
background: rgba(255,255,255,0.4); box-shadow: 0 2px 8px rgba(30,27,75,0.06);

/* New — cards clearly float above the background */
background: rgba(255,255,255,0.72); box-shadow: 0 2px 12px rgba(30,27,75,0.1);
```

**Nav bar — white glass with blur (matching dark theme's glass treatment):**
```css
/* Current */
background: rgba(232,230,225,0.97); box-shadow: 0 -2px 8px rgba(0,0,0,0.05);

/* New — frosted white glass, stronger shadow */
background: rgba(255,255,255,0.82);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
box-shadow: 0 -2px 12px rgba(30,27,75,0.08);
```

**Modals — white, distinct from page:**
```css
/* Current */
background: linear-gradient(180deg, #E8E6E1, #DEDBD5);

/* New — clean white, clearly an overlay */
background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,247,245,0.97));
```

**Inputs/textareas:**
```css
/* Current */
background: rgba(255,255,255,0.4);

/* New — clean white */
background: rgba(255,255,255,0.7);
```

**Select inputs:**
```css
/* Current */
background: rgba(255,255,255,0.5);

/* New */
background: rgba(255,255,255,0.75);
```

**Card-now (active session glow) — stronger in light theme:**
```css
/* Current */
box-shadow: 0 2px 12px rgba(37,99,235,0.15);

/* New — more visible glow */
box-shadow: 0 2px 16px rgba(37,99,235,0.2);
```

**Setup card:**
```css
/* Current */
background: rgba(255,255,255,0.35);

/* New */
background: rgba(255,255,255,0.7);
```

Everything else stays: indigo text tints, blue accent, CSS vars (--t1 through --t5, --sep).

---

## 2. Micro-polish — Both Themes

### 2a. Transition Smoothing

Add transitions to elements that currently snap between states:

| Element | Current transition | New |
|---------|-------------------|-----|
| `.card` | `background 0.2s` | `background 0.2s, box-shadow 0.2s, transform 0.2s` |
| `.focus-tag` | none | `all 0.15s ease` |
| `.badge` | none | `background 0.2s, color 0.2s` |
| `.nav-btn` | `color 0.2s` | `color 0.2s, transform 0.2s` |
| `.filter-btn` | none | `all 0.15s ease` |
| `.week-day` | none | `all 0.15s ease` |

### 2b. Active Nav Indicator

Add a small pill under the active nav tab icon:

```css
.nav-btn.active::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: #2563EB;
  margin-top: 2px;
}
```

Appears below the label, fades in via the existing `color 0.2s` transition inherited by `::after`. Inactive tabs have no dot.

### 2c. Button Press Feel

Enhance the global `button:active { transform: scale(0.97) }`:

```css
/* Primary/CTA buttons — push into surface */
.btn-primary:active, .btn-sm:active, .btn-whatsapp:active, .btn-whatsapp-lg:active {
  transform: scale(0.97);
  box-shadow: 0 1px 4px rgba(37,99,235,0.15);
  filter: brightness(0.92);
}

/* Ghost/secondary buttons */
.btn-secondary:active, .btn-ghost:active {
  transform: scale(0.97);
  background: rgba(255,255,255,0.12);
}
```

Light theme overrides for secondary/ghost use `rgba(30,27,75,0.08)` instead.

### 2d. Card Press State

Cards that are tappable (`.card-tap`) get a "push down" effect:

```css
.card.card-tap:active {
  transform: translateY(1px);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
```

This replaces the current `background` change on active. The shadow reduction + tiny translateY creates a physical "press" feel.

### 2e. Modal Spring Animation

Replace the linear slideUp with a spring-like bounce:

```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Change animation timing on .modal-content */
animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
```

The `cubic-bezier(0.34, 1.56, 0.64, 1)` creates a slight overshoot — the modal slides up past its final position and settles back. Subtle but feels alive.

### 2f. Stat Cards Gradient Tint

Give stat cards a subtle blue-tinted glass feel instead of flat:

```css
.stat-card {
  background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02));
  border: 1px solid rgba(255,255,255,0.08);
}
```

Light theme override uses `rgba(37,99,235,0.04)` to `rgba(37,99,235,0.01)`.

---

## 3. Session Notes Blue Hue

### Behavior
- **On focus:** textarea gets blue tint background + blue border (signals "you're recording")
- **Has content + blurred:** blue hue persists (signals "this session has notes recorded")
- **Empty + blurred:** returns to default neutral style

### CSS
```css
.focus-notes:focus {
  background: rgba(37,99,235,0.08);
  border-color: rgba(37,99,235,0.25);
}
.focus-notes.has-content {
  background: rgba(37,99,235,0.06);
  border-color: rgba(37,99,235,0.15);
}
```

Light theme uses the same blue values — they work on both backgrounds.

### JS
Add `has-content` class management on the textarea's `onBlur`:
```js
// In the onBlur handler that already saves the notes:
e.target.classList.toggle('has-content', e.target.value.trim() !== '');
```

Also set it on render if the session already has notes:
```jsx
className={`focus-notes${session.sessionNotes ? ' has-content' : ''}`}
```

This applies in Dashboard.jsx (expanded view), Schedule.jsx, and Sessions.jsx (completed sessions).

---

## 4. Haptic Feedback

### Helper
Add to `utils.js`:
```js
/** Trigger haptic feedback — silent no-op on devices that don't support it (iOS) */
export const haptic = (ms = 10) => { try { navigator.vibrate?.(ms); } catch(e) {} };
```

### Where to fire
| Interaction | Duration |
|------------|----------|
| Nav tab switch | 10ms |
| Focus tag toggle | 10ms |
| Button taps (Complete, Cancel, Book, etc.) | 10ms |
| Todo checkbox toggle | 10ms |
| Filter tab switch | 10ms |

Import `haptic` in each component and call it in the existing `onClick` handlers. No new event listeners needed.

---

## 5. Dumbbell Logo Redesign

Replace the current SVG (two tall rectangles + bar that looks like a water jug) with a proper horizontal dumbbell:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <!-- bar -->
  <line x1="6" y1="12" x2="18" y2="12"/>
  <!-- inner plates (larger) -->
  <rect x="3.5" y="7.5" width="3" height="9" rx="1.2"/>
  <rect x="17.5" y="7.5" width="3" height="9" rx="1.2"/>
  <!-- outer plates (smaller) -->
  <rect x="1" y="9" width="2.5" height="6" rx="1"/>
  <rect x="20.5" y="9" width="2.5" height="6" rx="1"/>
</svg>
```

Design: horizontal bar through the center, two weight plates per side (inner taller, outer shorter) — the classic dumbbell silhouette. Recognizable at 24px, clean strokes, no fills needed.

The exact proportions may need minor tweaks after seeing it rendered. The SVG lives in one place: `App.jsx` line ~110.

---

## 6. Auto-complete Delay — 1 Hour After Session End

### Current behavior (App.jsx ~line 62)
```js
nowMin >= timeToMinutes(s.time) + (s.duration || 45)
```
Session auto-completes the moment its end time passes.

### New behavior
```js
nowMin >= timeToMinutes(s.time) + (s.duration || 45) + 60
```
Session auto-completes 1 hour after its end time. Gives the PT time to cancel a no-show before the system marks it completed.

One-line change. No schema or data impact.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/styles.css` | Light theme redesign, transitions, nav indicator, button press, card press, modal spring, stat gradient, notes blue hue |
| `src/App.jsx` | Dumbbell SVG, auto-complete +60 |
| `src/utils.js` | `haptic()` helper |
| `src/components/Dashboard.jsx` | haptic calls, notes `.has-content` class |
| `src/components/Schedule.jsx` | haptic calls, notes `.has-content` class |
| `src/components/Sessions.jsx` | haptic calls, notes `.has-content` class |
| `src/components/Clients.jsx` | haptic calls |
| `src/components/General.jsx` | haptic calls on todo checkboxes |

## What's NOT Changing
- Dark theme background/palette (micro-polish only)
- Layout, HTML structure, component hierarchy
- Font (DM Sans)
- Color palette (blue accent, session type colors, danger red)
- RTL/i18n logic
- Sync, data schema, reducer
- Any feature behavior (except auto-complete delay)
