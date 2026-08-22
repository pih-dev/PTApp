import React, { useMemo, useRef, useState, useCallback } from 'react';
import { figureFor } from '../figures/poses';
import { figureSvg } from '../figures/svg';
import { figureText } from '../figureText';
import { t } from '../i18n';

// ─── The form panel (B2) ─────────────────────────────────────────────────────
//
// Now covering ALL 340 movements. A figure is composed from the movement's
// PATTERN (44 archetypes), its own muscles from the bank, and its own equipment
// read off its name — see `figures/poses.js`.
//
// 🔴 THE PAIR IS THE FEATURE (brief §7.9). A single "correct" figure teaches
//    half as much as correct-beside-wrong, because a lifter cannot see their own
//    back and does not know which of the two they are doing. Always rendered
//    together, same size, in that order.
//
// 🔴 A REVIEW FLAG NOTHING RENDERS IS NOT A REVIEW PROCESS. Every text entry
//    ships unreviewed and the panel says so, in both languages, until Elie has
//    been through the patterns.
//
// The SVG is inserted as markup rather than rebuilt in JSX so that the app and
// the judging harness draw byte-identical figures — if they diverged we would be
// reviewing something we do not ship. Every byte is generated from our own pose
// data; nothing user-supplied reaches it.

export const hasFigure = (name) => !!figureFor(name);

function Fig({ pose, label, caption, wide, mix = 0 }) {
  // Memoised because `figureSvg` mints a fresh clipPath id per call: without
  // this the markup string differs on every render, so React tears down and
  // re-parses both SVGs whenever anything above them re-renders. `mix` is in
  // the key because it is exactly what should force a redraw.
  const html = useMemo(() => figureSvg(pose, { title: label, mix }), [pose, label, mix]);
  return (
    <figure className={`fig-cell${wide ? ' fig-wide' : ''}`}>
      <div className="fig-art" dangerouslySetInnerHTML={{ __html: html }} />
      <figcaption className={`fig-cap${caption === 'fault' ? ' fig-cap-fault' : ''}`}>{label}</figcaption>
    </figure>
  );
}

export default function Figure({ name, lang }) {
  const pair = useMemo(() => figureFor(name), [name]);
  // 🔴 THE DRAG TURNS BOTH HALVES TOGETHER, and that is the whole point. The
  //    pair exists so a lifter can compare correct against wrong; turning one
  //    and not the other would compare two different cameras and teach the
  //    wrong difference. One gesture, one angle, both figures.
  const [mix, setMix] = useState(0);
  const drag = useRef(null);

  // Pointer events, not touch events: one code path for finger, mouse and pen,
  // and `setPointerCapture` keeps the gesture alive when the finger leaves the
  // little SVG box — which it always does on a phone.
  const onDown = useCallback((e) => {
    drag.current = { x: e.clientX, base: 0 };
    setMix((m) => { drag.current.base = m; return m; });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older webviews */ }
  }, []);
  const onMove = useCallback((e) => {
    if (!drag.current) return;
    // 🔴 SCALED BY THE ELEMENT'S OWN WIDTH, not a magic pixel count: the same
    //    swipe has to travel the same amount of turn on a 360px phone and a
    //    tablet. Half the width is a full turn — enough that it cannot be
    //    triggered by the vertical scroll the sheet also needs.
    const w = e.currentTarget.getBoundingClientRect().width || 1;
    const dx = (e.clientX - drag.current.x) / (w * 0.5);
    setMix(Math.max(0, Math.min(1, drag.current.base + dx)));
  }, []);
  const onUp = useCallback(() => { drag.current = null; }, []);
  // 🔴 The axis is claimed in CSS with `touch-action: pan-y`, NOT with a
  //    preventDefault here. The sheet must still scroll vertically under the
  //    finger; telling the browser which axis we want is the only way to keep
  //    both, and a non-passive preventDefault is what broke elastic overscroll
  //    the last time (docs/traps.md).

  if (!pair) return null;
  const txt = figureText(name, lang, pair.archetype);

  return (
    <>
      <div className="subbar">{t(lang, 'formSection')}</div>
      <div
        className={`fig-pair${pair.rotatable ? ' fig-rotatable' : ''}`}
        onPointerDown={pair.rotatable ? onDown : undefined}
        onPointerMove={pair.rotatable ? onMove : undefined}
        onPointerUp={pair.rotatable ? onUp : undefined}
        onPointerCancel={pair.rotatable ? onUp : undefined}
      >
        <Fig pose={pair.correct} label={t(lang, 'figureCorrect')} caption="correct" mix={mix} />
        <Fig pose={pair.fault} label={t(lang, 'figureFault')} caption="fault" mix={mix} />
      </div>
      {pair.rotatable && (
        <div className="fig-drag">
          <span className="fig-drag-hint">{t(lang, 'figureDragHint')}</span>
          <span className="fig-drag-bar"><i style={{ left: `${mix * 100}%` }} /></span>
        </div>
      )}

      {/* 🔴 THE THIRD FIGURE, and it exists for ONE reason: some faults do not
          happen in the plane the pair is drawn in. Elbow flare on a bench press
          is abduction — from the side, good form and bad form are the same
          picture. So a pattern may declare a second camera, full width because a
          supine figure seen from above is wide and short. Approved by Pierre,
          2026-08-22. It is NOT a default — a movement that can be taught in one
          view gets one view. */}
      {pair.extra && (
        <>
          <Fig pose={pair.extra.pose} label={t(lang, pair.extra.labelKey)} caption={pair.extra.caption} wide />
          {txt && txt.extra && <p className="fig-extra-note">{txt.extra}</p>}
        </>
      )}

      {/* 🔴 THE KEY IS NOT OPTIONAL NOW THAT THERE ARE FOUR COLOURS. A figure
          carrying an accent line, a warn line, two muscle hues and an --anatomy
          marker is a chart, and an unlabelled chart is a guessing game. */}
      <div className="fig-key">
        <span className="fk"><i style={{ background: 'var(--accent)' }} />{t(lang, 'figKeyHeld')}</span>
        <span className="fk"><i style={{ background: 'var(--warn)' }} />{t(lang, 'figKeyLost')}</span>
        <span className="fk"><i style={{ background: 'var(--muscle)' }} />{t(lang, 'figKeyPrimary')}</span>
        <span className="fk"><i style={{ background: 'var(--muscle-2)' }} />{t(lang, 'figKeySecondary')}</span>
        <span className="fk"><i style={{ background: 'var(--anatomy)' }} />{t(lang, 'figKeyFault')}</span>
      </div>

      {/* The text is DATA (src/figureText.js), keyed by PATTERN — a movement can
          have a figure and no text, and the panel has to survive that. */}
      {txt && (
        <div className="fig-text">
          <p><span className="fig-lead">{t(lang, 'theFault')}</span> {txt.flaw}</p>
          <p><span className="fig-lead">{t(lang, 'theRisk')}</span> {txt.injury}</p>
          <p className="fig-cue"><span className="fig-lead">{t(lang, 'theCue')}</span> {txt.cue}</p>
          {!txt.reviewed && <p className="fig-unreviewed">{t(lang, 'figureUnreviewed')}</p>}
        </div>
      )}
    </>
  );
}
