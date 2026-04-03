# PTApp Design System

A living document capturing the visual design decisions, philosophy, and evolution of PTApp's look and feel.

---

## Design Philosophy

### Core Principle: Apple-Inspired Holistic Quality

The goal isn't to copy Apple's aesthetics — it's to achieve the same *feeling*: premium yet effortless. Apple's superiority comes from:

1. **Performance IS design.** A beautiful app that lags feels cheap. A fast, responsive app feels premium even before you polish the visuals. PTApp is snippy and reactive — this is a feature, not an accident.

2. **Never forget the core purpose.** Apple made phones beautiful but never forgot that voice calls matter (mic, speaker, don't drop). For PTApp: the PT managing sessions fast on his phone is the equivalent of making phone calls. Every visual enhancement must pass the test: "does this make session management faster or slower?"

3. **Simplicity is the ultimate sophistication.** The PT adopted the app because it's simple. Visual upgrades add delight, not friction. No extra taps, no unnecessary animations that delay interaction.

4. **Quality over speed.** We have no timeline pressure. This means every decision can be the right one, not the fastest one. Take time to evaluate changes visually before committing.

### Visual Priorities (Ranked)

These emerged from brainstorming on 2026-04-03. All six resonate; order reflects emphasis:

1. **Glass & Blur** — Frosted glass backgrounds, blur behind panels, translucent overlays (iOS Control Center feel)
2. **Smooth Motion** — Elements slide, fade, scale with natural easing. Nothing jerky.
3. **Layered Depth** — Cards float above backgrounds. Multiple visual layers. Soft, realistic shadows.
4. **Rich Color & Gradients** — Vibrant gradients, color accents that pop, deep rich blacks in dark mode.
5. **Micro-interactions** — Tiny details: button feedback, smooth toggles, tactile responses.
6. **Bold Typography** — Clean hierarchy, but **premium density** not desktop whitespace. This is a phone app — space is precious.

---

## Color System

### Accent Color
- **Primary blue:** `#2563EB` (both themes)
- **Light blue:** `#60A5FA` (highlights, gradients)
- Used for: buttons, active states, links, focus rings, nav highlights, logo

### Semantic Colors
| Purpose | Color | Usage |
|---------|-------|-------|
| Error/Danger | `#EF4444` | Delete buttons (solid red, white icon), cancel badge, error text |
| Success | `#10B981` | Confirmed badge, todo checkmarks, confirm buttons |
| Warning | `#F59E0B` | (Reserved, used for HIIT session type) |

### Session Type Colors
| Type | Color | Hex |
|------|-------|-----|
| Strength | Indigo | `#6366F1` |
| Cardio | Blue | `#3B82F6` |
| Flexibility | Purple | `#8B5CF6` |
| HIIT | Amber | `#F59E0B` |
| Recovery | Green | `#10B981` |
| Custom | Grey | `#6B7280` |

### Theme-Aware CSS Variables
```css
/* Dark theme (default) */
--t1: rgba(255,255,255,0.9);   /* primary: headings, bold text */
--t2: rgba(255,255,255,0.7);   /* secondary: titles, labels */
--t3: rgba(255,255,255,0.6);   /* tertiary: meta, descriptions */
--t4: rgba(255,255,255,0.5);   /* muted: hints, counts, icons */
--t5: rgba(255,255,255,0.4);   /* dim: subtle info */
--sep: rgba(255,255,255,0.06); /* separators / borders */

/* Light theme */
--t1: rgba(30,27,75,0.9);     /* indigo-950 base */
--t2: rgba(30,27,75,0.65);
--t3: rgba(30,27,75,0.55);
--t4: rgba(30,27,75,0.4);
--t5: rgba(30,27,75,0.3);
--sep: rgba(30,27,75,0.06);
```

**Rule:** Never hardcode `rgba(255,255,255,...)` or `rgba(0,0,0,...)` in inline styles. Use `var(--t1)` through `var(--t5)` and `var(--sep)`.

---

## Dark Theme (Primary)

The dark theme is the default and the one the PT most likely uses in the gym.

### Background
```css
background: linear-gradient(145deg, #0F0F0F 0%, #1A1A2E 50%, #16213E 100%);
```
Deep blue-grey gradient. Not flat black — has subtle depth and direction.

### Cards
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
box-shadow: 0 2px 8px rgba(0,0,0,0.15);
```
Barely-there translucent white. The subtle border + shadow creates just enough separation from the background.

### Header & Nav Bar
```css
/* Header and nav both use subtle blue-tinted glass */
background: rgba(37,99,235,0.06);
backdrop-filter: blur(20px);
```
Blue-tinted glass — subtle enough to feel dark but visually distinct from the body gradient. Both header and nav match. Previously, the header was transparent (body gradient showed through) and the nav was near-black (`rgba(15,15,15,0.97)`) — they looked identical. The blue tint differentiates both from the background while connecting to the accent color system.

### Active Session Glow
```css
background: rgba(37,99,235,0.15);
border: 1px solid rgba(37,99,235,0.5);
box-shadow: 0 0 20px rgba(37,99,235,0.3), inset 0 0 30px rgba(37,99,235,0.05);
```
Blue glow — unmistakable "this is happening now" signal.

---

## Light Theme (v2.4 Redesign)

The light theme was redesigned in v2.4 to have its own identity rather than being a flat inversion of the dark theme.

### Problem It Solved
The v2.3 light theme had no layer separation. Background, cards, nav, and modals were all similar warm beige tones — everything blended together. The dark theme worked because light cards popped against a dark canvas. The light theme needed the same contrast.

### Background
```css
background: linear-gradient(145deg, #C7D2E4 0%, #B8C5DA 50%, #ADBDD4 100%);
```
Blue-toned gradient. Earlier iterations used warm beige (`#E8E6E1`) then cooler grey (`#E2E0DB`), but both clashed with the blue card system. The blue-toned canvas provides coherent contrast — cards (soft blue) float above it, while header/nav strips (stronger blue) frame the content.

### Cards
```css
background: rgba(219,234,254,0.55);
border-color: rgba(37,99,235,0.08);
box-shadow: 0 2px 12px rgba(30,27,75,0.08);
```
Soft blue tint (Tailwind blue-100 at 55% opacity). Initially used near-opaque white (`rgba(255,255,255,0.72)`) but Pierre found it hurt the eyes — white cards on a grey background are too contrasty in bright environments. The blue tint is softer while still clearly floating above the background, and ties into the blue accent color system.

### Header & Nav Bar
```css
/* Both header and nav use the same stronger blue glass */
background: rgba(171,205,252,0.7);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```
Blue frosted glass — stronger blue than the cards, clearly distinct from the background. Header and nav match each other, framing the content area. Earlier iterations used white glass (`rgba(255,255,255,0.82)`) but the white strips clashed with the blue cards and grabbed too much attention.

### Modals
```css
background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,247,245,0.97));
```
White gradient — clearly an overlay on top of the page, not part of it.

### Text
All text uses indigo-tinted values (`rgba(30,27,75,...)`) instead of pure black. This gives the light theme visual warmth and identity without being muddy. The effect is most visible on headings; body text reads as warm grey.

---

## Micro-interactions (v2.4)

### Transitions
| Element | Transition | Purpose |
|---------|-----------|---------|
| Cards | `background 0.2s, box-shadow 0.2s, transform 0.2s` | Smooth state changes + press effect |
| Focus tags | `all 0.15s ease` | Smooth toggle between active/inactive |
| Badges | `background 0.2s, color 0.2s` | Status changes don't snap |
| Filter buttons | `all 0.15s ease` | Tab switching feels fluid |
| Week day pills | `all 0.15s ease` | Day selection slides |
| Nav buttons | `color 0.2s` | Tab color fades in |

### Button Press Feel
- **All buttons:** `transform: scale(0.97)` on `:active`
- **Primary/WhatsApp:** Additional `filter: brightness(0.92)` + shadow reduction — button darkens and "pushes into" the surface
- **Secondary/Ghost:** Background lightens on press
- **Cards (tappable):** `translateY(1px)` + shadow reduction — card physically pushes down

### Modal Spring
```css
animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
```
The cubic-bezier creates a slight overshoot — modal slides past its final position and settles back. Subtle but makes the UI feel alive rather than mechanical.

### Nav Active Indicator
Small 4px blue dot appears below the active tab label. Adds to the "you are here" signal beyond just the color change.

### Haptic Feedback
`navigator.vibrate(10)` fires on: nav tab switches, focus tag toggles, complete/cancel buttons, filter tabs, delete buttons, todo checkboxes.
- Works on Android (Pierre's phone)
- Silent no-op on iOS (PT's iPhone) — the API doesn't exist on iOS Safari
- Wrapped in `haptic()` helper in `utils.js` with try/catch

### Session Notes Blue Hue
- **On focus:** Blue tint background + blue border (signals "you're recording")
- **Has content + blurred:** Blue hue persists (signals "this session has notes")
- **Empty + blurred:** Returns to default neutral
- Uses `.has-content` CSS class toggled via `classList.toggle()` on blur
- **Scroll-locked by default:** `readOnly` + `overflow: hidden` + `max-height: 32px` — single line, page scrolls over it
- **Expand on tap:** `.editing` class sets `max-height: 120px` + `overflow-y: auto` — grows downward with `transition: max-height 0.25s ease`, becomes scrollable for editing
- **Collapse on blur:** removes `.editing`, animates back to single line

### Elastic Overscroll
Rubber-band bounce when scrolling past the top or bottom of any page.
- Touch handlers on `.content` div detect overscroll (scrollTop at 0 or at max)
- Pull curve: `sqrt(distance) × 4`, capped at 120px — stronger initial response, diminishing at extremes
- Bounce-back with overshoot: `0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` — same spring curve as modal, content overshoots past zero and settles
- Works on all tabs, both themes
- `initElasticScroll()` in utils.js, wired via `useRef`/`useEffect` in App.jsx

---

## Status Badges

All solid fills with white text. CSS classes, not inline styles.

| Status | Class | Color |
|--------|-------|-------|
| Scheduled | `.badge-scheduled` | `#2563EB` (blue) |
| Completed | `.badge-completed` | `#2563EB` (blue) |
| Confirmed | `.badge-confirmed` | `#10B981` (green) |
| Cancelled | `.badge-cancelled` | `#EF4444` (red) |

**Why solid fills:** The v2.3 pastel backgrounds (colored text on tinted bg) washed out in the warm light theme. Solid fills are visible everywhere.

---

## Typography

- **Font:** DM Sans (Google Fonts), fallback to system fonts
- **Weights:** 500 (regular), 600 (semi-bold labels), 700 (buttons, nav), 800 (headings, stats), 900 (stat numbers)
- **Sizes:** 11px (labels, meta) → 28px (stat numbers). Mobile-first — no size exceeds 28px.

---

## Logo

### v2.4 Dumbbell
Horizontal dumbbell SVG: center bar, two plate pairs per side (inner taller, outer shorter).

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <line x1="6" y1="12" x2="18" y2="12"/>
  <rect x="3.5" y="7.5" width="3" height="9" rx="1.2"/>
  <rect x="17.5" y="7.5" width="3" height="9" rx="1.2"/>
  <rect x="1" y="9" width="2.5" height="6" rx="1"/>
  <rect x="20.5" y="9" width="2.5" height="6" rx="1"/>
</svg>
```

Sits inside a 42x42px blue gradient rounded square (`.logo-icon`).

### Previous versions
- **v1.0–v2.3:** Vertical dumbbell (tall rectangles + bar). Looked like a water jug at small sizes — replaced in v2.4.

---

## Stat Cards

Subtle blue gradient tint instead of flat background:
```css
background: linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02));
border: 1px solid rgba(255,255,255,0.08);
```
Light theme uses lower opacity: `rgba(37,99,235,0.04)` → `rgba(37,99,235,0.01)`.

---

## Design Evolution

### v1.0–v1.8: Foundation
- Dark theme only, red accent (`#E8453C`)
- Basic cards, minimal shadows
- Functional but generic

### v2.0–v2.2: Features + i18n
- Arabic/RTL support, light theme (basic inversion), WhatsApp templates
- Red accent in dark, blue in light (inconsistent)

### v2.3: Color Unification
- Blue accent everywhere (both themes)
- Warm stone light theme background
- Solid status badges (replaced washed-out pastels)
- Indigo-tinted light theme text
- Card shadows for depth

### v2.4: Visual Polish + Light Theme Redesign
- **Light theme redesign:** Blue-toned background, blue-tinted cards, blue glass header/nav, white modals
- **Light theme background:** `#C7D2E4 → #B8C5DA → #ADBDD4` blue-toned gradient (was beige, then grey)
- **Light theme cards:** `rgba(219,234,254,0.55)` — soft blue, easier on eyes than white
- **Light theme header/nav:** `rgba(171,205,252,0.7)` blue frosted glass (was white, clashed)
- **Light theme inputs:** Blue-tinted `rgba(237,244,254,0.6)` to match cards
- **Dark theme bars:** Header and nav both use `rgba(37,99,235,0.06)` blue-tinted glass (were transparent/near-black, looked identical)
- **Micro-polish:** Transitions on all interactive elements, spring modal, nav dot
- **Button feel:** Brightness darken + shadow reduction on press, card push-down
- **Session notes:** Blue hue on focus/has-content, **blue text** when has content
- **Haptic feedback:** Vibration on Android for key interactions
- **Logo:** Horizontal dumbbell (was vertical/water-jug)
- **Auto-complete:** 1hr buffer after session end
- **Stat cards:** Colored backgrounds — indigo (Clients), blue (Today), green (This Week), boosted opacity

### v2.4 Refinement Notes
Deployed and iterated on Android throughout the session. Each round refined based on Pierre's feedback:

**Round 1** — Initial deploy:
- "Looks almost the same but the experience is definitely enhanced"
- Light theme white cards hurt the eyes → changed to soft blue tint
- Session notes hue was too subtle → doubled the opacity + added blue text
- Stat cards were invisible → tripled gradient opacity + changed This Week to green

**Round 2** — Header/nav strips:
- Light theme white header/nav clashed with blue cards ("ottoman strip grabbing attention")
- → Changed to blue frosted glass (`rgba(191,219,254,0.65)`)
- Dark theme header and nav looked identical
- → Added blue tint to header (`rgba(37,99,235,0.06)`)

**Round 3** — Background and coherence:
- Light theme beige background was "the only weak link" — clashed with all-blue elements
- → Replaced beige with blue-toned gradient (`#C7D2E4 → #ADBDD4`)
- Strengthened header/nav to `rgba(171,205,252,0.7)` so they don't blend into new background
- Boosted stat card opacity (hex `50/30` vs `30/18`) for the same reason
- Dark theme nav matched to header's blue glass for cohesion
- **Pierre's verdict:** "amazing stuff, perfect"

**Key insight:** The web stack (CSS-only, GitHub Pages) has a ceiling for premium feel. The enhanced *experience* (transitions, press feedback, spring modals, haptic) matters more than pixel-level visual changes. Save ambitious visual work for the native app stage.

### Future (Stage 2: Native App)
The web app has reached its visual ceiling for "Apple-like" premium feel. These require native capabilities:
- **iOS haptics:** Capacitor Haptics plugin (Taptic Engine — way beyond `navigator.vibrate`)
- **Native blur:** More performant than `backdrop-filter`, richer glass effects
- **Gesture-driven modals:** Native bottom sheets with swipe-to-dismiss, rubber-band physics
- **Custom page transitions:** Spring physics, shared element transitions between screens
- **Bundled fonts:** No Google Fonts network dependency
- **Platform-specific:** Material ripples on Android, vibrancy on iOS
- **Full design system:** With native capabilities unlocked, a proper design refresh makes sense

---

## Screenshots

Screenshots capture visual evolution across versions. All taken on Pierre's Samsung S25 Ultra (Android).

**Storage:** `docs/screenshots/` directory — see `CATALOG.md` for full index with descriptions.

**Captured versions:**
- **v1.x** (Apr 1): First day — red accent, 4 stat cards, Confirm button, old red logo
- **v2.2** (Apr 3): Red accent in dark, warm beige light theme, outline badges
- **v2.3 → v2.4** collages: Pierre's side-by-side before/after comparisons
- **v2.4 iterations** (Apr 3): Blue glass header on beige → blue background final

**Key observations from the evolution:**
- Dark theme: visually subtle across versions, but transitions/press feedback create a noticeably better *feel*
- Light theme: the biggest visual journey — warm beige → cooler grey → blue-toned. Each step made it more cohesive with the blue accent system
- The v1.x → v2.4 difference is dramatic: red accent + outline badges + no depth → blue accent + solid badges + layered glass + transitions
- PT's WhatsApp reaction to v1.x ("This is awesome, its gonna make us money") confirms the core UX was right from day one — visual polish built on a solid foundation
