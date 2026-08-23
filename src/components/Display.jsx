import React from 'react';
import Modal from './Modal';
import { FAMILIES, VARIANTS, skinId, splitSkin } from '../skins';
import { haptic } from '../utils';
import { t } from '../i18n';

// ─── Display (v2.37) ─────────────────────────────────────────────────────────
//
// Pierre asked for three things at the top of the screen rather than buried in
// General: the theme, a CAPS on/off, and a font-size +/-. They are one control,
// not three, because they answer one question — "make this readable to ME" —
// and because a header has room for one more button, not three.
//
// 🔴 WHY CASE AND SIZE ARE USER SETTINGS AND NOT A DESIGN DECISION. There is no
//    static type choice that fits every pair of eyes, and this app's own
//    developer cannot read the default comfortably. Shipping the dials is the
//    honest answer; guessing harder is not. His words, on the caps toggle:
//    "I can click and everything becomes capital letter. I can see the check."
//
// Both write a CSS custom property on <html> and a key in localStorage. Nothing
// else in the app reads them — styles.css does, through var(--tt) and var(--ts).

const CASE_KEY = 'ptapp-case';
const SCALE_KEY = 'ptapp-scale';

// The ladder is deliberate and short. A free slider invites a value that breaks
// a layout nobody will re-test at 1.37; five stops can each be looked at once.
export const SCALES = [0.9, 1, 1.1, 1.2, 1.3];
export const DEFAULT_SCALE = 1;

// 🔴 EVERY localStorage ACCESS IS GUARDED — getItem/setItem throw SecurityError
//    on iOS with "Block All Cookies" and inside a WKWebView with site data
//    blocked. A display preference must degrade to the default, never crash the
//    first paint. Same trap as skins.js; same shape of guard on purpose.
export const loadDisplay = () => {
  let caps = true, scale = DEFAULT_SCALE;
  try {
    const c = localStorage.getItem(CASE_KEY);
    if (c === 'none' || c === 'uppercase') caps = c === 'uppercase';
    const sc = parseFloat(localStorage.getItem(SCALE_KEY));
    if (SCALES.includes(sc)) scale = sc;
  } catch { /* unreadable storage: the defaults are already correct */ }
  return { caps, scale };
};

export const saveDisplay = ({ caps, scale }) => {
  try {
    localStorage.setItem(CASE_KEY, caps ? 'uppercase' : 'none');
    localStorage.setItem(SCALE_KEY, String(scale));
  } catch { /* preference is lost on reload; the app is not */ }
};

// Applied to <html>, not the container: Modal portals to <body> (v2.33), so a
// property scoped to the app container would never reach an open sheet.
export const applyDisplay = ({ caps, scale }) => {
  const el = document.documentElement;
  el.style.setProperty('--tt', caps ? 'uppercase' : 'none');
  el.style.setProperty('--ts', String(scale));
};

export default function Display({ lang, skin, setSkin, caps, setCaps, scale, setScale, onClose }) {
  const i = SCALES.indexOf(scale);
  const step = (d) => {
    const next = SCALES[Math.max(0, Math.min(SCALES.length - 1, i + d))];
    if (next !== scale) { haptic(); setScale(next); }
  };

  return (
    <Modal title={t(lang, 'display')} onClose={onClose}>
      <div className="subbar">{t(lang, 'theme')}</div>
      {/* v2.42: 21 skins = 7 families × 3 variants, but the picker stays two
          small controls — a 21-card grid would be unusable on a phone. Picking
          a family keeps your variant; the variant row keeps your family. */}
      <div className="skin-grid">
        {FAMILIES.map(f => {
          const { family, variant } = splitSkin(skin);
          return (
            <button key={f.id}
              className={`skin-card${family === f.id ? ' selected' : ''}`}
              data-swatch={f.id}
              onClick={() => { haptic(); setSkin(skinId(f.id, variant)); }}>
              {/* The swatch is the only place a colour that belongs to ANOTHER
                  skin may be painted — a picker has to show what it is not
                  currently wearing. The values live in styles.css, never here. */}
              <span className="skin-swatch" />
              <span className="skin-name">{t(lang, f.labelKey)}</span>
            </button>
          );
        })}
      </div>
      {/* Fill means "press me": the active variant is the filled one. */}
      <div className="flex-row" style={{ marginTop: 10 }}>
        {VARIANTS.map(v => {
          const { family, variant } = splitSkin(skin);
          return (
            <button key={v.id} style={{ flex: 1 }}
              className={variant === v.id ? 'btn-primary' : 'btn-ghost'}
              onClick={() => { haptic(); setSkin(skinId(family, v.id)); }}>
              {t(lang, v.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="subbar" style={{ marginTop: 22 }}>{t(lang, 'textSize')}</div>
      <div className="size-row">
        <button className="btn-secondary size-step" onClick={() => step(-1)} disabled={i <= 0}
          aria-label={t(lang, 'smaller')}>−</button>
        <div className="size-meter">
          {SCALES.map((sc, n) => <span key={sc} className={n <= i ? 'on' : ''} />)}
        </div>
        <button className="btn-secondary size-step" onClick={() => step(1)} disabled={i >= SCALES.length - 1}
          aria-label={t(lang, 'larger')}>+</button>
      </div>

      <div className="subbar" style={{ marginTop: 22 }}>{t(lang, 'labelCase')}</div>
      {/* Two states of one control differ by FILL and TEXT COLOUR, never border
          width — outline means off, fill means press me (CONVENTIONS). */}
      <div className="flex-row">
        <button className={caps ? 'btn-primary' : 'btn-ghost'} style={{ flex: 1 }}
          onClick={() => { haptic(); setCaps(true); }}>{t(lang, 'caseUpper')}</button>
        <button className={!caps ? 'btn-primary' : 'btn-ghost'} style={{ flex: 1 }}
          onClick={() => { haptic(); setCaps(false); }}>{t(lang, 'caseNormal')}</button>
      </div>
    </Modal>
  );
}
