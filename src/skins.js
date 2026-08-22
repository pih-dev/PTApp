// ─── Skins (v2.17, design pass stage 1) ───
//
// WHY THIS EXISTS. SpotSet used to have a dark theme and a light theme: two
// looks, kept in sync by hand, one of them inherited from the OS convention
// rather than chosen. Pierre's call (2026-08-21) replaced that with a **curated
// set of named skins the user picks from** — each designed on purpose, any of
// them a good answer, shipped to the closed testers now because fourteen close
// long-term clients are the cheapest feedback this product will ever get.
// Design record: docs/superpowers/specs/2026-08-21-visual-language-dashboard-design.md §3.
//
// 🔴 THE RULE THAT KEEPS THIS A SKIN SYSTEM AND NOT FOUR DESIGNS: every skin
//    carries identical layout, geometry and type. ONLY hue changes. If a skin
//    needs a layout tweak to work, it is not a skin — it is a second design,
//    and it does not ship. The CSS enforces this by construction: a skin is a
//    block of custom-property VALUES in styles.css and nothing else. It never
//    gets its own rules.
//
// 🔴 STAGE 1 IS DELIBERATELY INVISIBLE. This ships the mechanism with today's
//    two looks intact (`midnight` = the current dark, `steel` = the current
//    light). The new palette and the rebuilt Dashboard are stage 2. Shipping
//    the switch and the repaint together would mean that if anything looks
//    wrong, we could not tell which half did it.

// The shipped list, in picker order. Adding a skin = one entry here + one token
// block in styles.css. There is no third place to update, on purpose.
// v2.34: Lume and Enamel are the NEEDLE direction (see the block in styles.css).
// Order is the picker's order, and it is deliberate: the two dark skins first,
// because the gym is the dark case. Midnight and Steel stay — nothing is taken
// away from anyone who already picked one, and reverting is choosing again.
// v2.37: six, in three pairs — soot, blue, and the vibrant one. Dark first in
// each pair, because the gym is the dark case.
export const SKINS = [
  { id: 'lume', labelKey: 'skinLume' },
  { id: 'midnight', labelKey: 'skinMidnight' },
  { id: 'rally', labelKey: 'skinRally' },
  { id: 'enamel', labelKey: 'skinEnamel' },
  { id: 'steel', labelKey: 'skinSteel' },
  { id: 'chalkline', labelKey: 'skinChalkline' },
];

// v2.34: new installs open on Lume. 🔴 An existing phone keeps whatever it saved
// — loadSkin() returns the stored value — so Pierre and Elie must pick it once
// in General. That is deliberate: a skin is a preference, and silently
// repainting someone's app is not a design decision, it is a surprise.
export const DEFAULT_SKIN = 'lume';
const SKIN_KEY = 'ptapp-skin';
const LEGACY_THEME_KEY = 'ptapp-theme';

export const isSkin = (id) => SKINS.some(s => s.id === id);

// Map the retired theme preference onto a skin. Kept as a named function
// because it is the only piece of this file with a wrong answer available:
// 'light' is the ONLY legacy value that must not land on the default.
export const skinForLegacyTheme = (theme) => (theme === 'light' ? 'steel' : DEFAULT_SKIN);

// Resolve the skin to render, migrating the legacy preference exactly once.
//
// 🔴 EVERY localStorage ACCESS IS GUARDED. `getItem`/`setItem`/`removeItem` all
//    throw SecurityError on iOS Safari with "Block All Cookies" and inside a
//    WKWebView with site data blocked — the same trap that turned the DEMO
//    button into a dead tap (docs/traps.md, v2.16.0). A skin is a preference:
//    unreadable storage must degrade to the default look, never to a crash on
//    the first paint of the app.
export const loadSkin = () => {
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (isSkin(saved)) return saved;

    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy !== null) {
      const migrated = skinForLegacyTheme(legacy);
      // Write the new key BEFORE dropping the old one: a crash between the two
      // lines then loses nothing, because the migration is idempotent and the
      // legacy key would simply be read again next launch.
      localStorage.setItem(SKIN_KEY, migrated);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return migrated;
    }
  } catch (e) {
    console.error('Could not read the skin preference:', e);
  }
  return DEFAULT_SKIN;
};

export const saveSkin = (id) => {
  const next = isSkin(id) ? id : DEFAULT_SKIN;
  try {
    localStorage.setItem(SKIN_KEY, next);
  } catch (e) {
    // A skin that cannot persist still applies for this session. Surfacing a
    // storage error here would interrupt the user over a cosmetic preference.
    console.error('Could not save the skin preference:', e);
  }
  return next;
};
