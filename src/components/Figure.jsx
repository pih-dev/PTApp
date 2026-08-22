import React, { useMemo, useRef, useState, useCallback } from 'react';
import { figureFor } from '../figures/poses';
import { figureSvg, CELL } from '../figures/svg';
import { zoomAnchor } from '../figures/render';
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

function Fig({ pose, label, caption, wide, mix = 0, zoom = 1, pan, origin }) {
  // Memoised because `figureSvg` mints a fresh clipPath id per call: without
  // this the markup string differs on every render, so React tears down and
  // re-parses both SVGs whenever anything above them re-renders. `mix` is in
  // the key because it is exactly what should force a redraw.
  const html = useMemo(() => figureSvg(pose, { title: label, mix }), [pose, label, mix]);
  // 🔴 ZOOM IS A CSS TRANSFORM ON THE ART, NOT A NEW viewBox. The figure is
  //    already vector, so scaling costs nothing and stays sharp — and it leaves
  //    the geometry untouched, which means the canon, the posture line and the
  //    fault marker cannot drift because somebody zoomed.
  // 🔴 ZOOM IS ANCHORED ON THE FAULT JOINT, not the cell centre (brief §1) —
  //    centre-zoom put the hips in the middle and threw a shoulder movement's
  //    teaching out of the top of the frame. `origin` arrives from the PAIR so
  //    both halves scale about the same point and stay comparable.
  const style = zoom === 1 ? undefined : {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: origin || 'center center',
  };
  return (
    <figure className={`fig-cell${wide ? ' fig-wide' : ''}`}>
      <div className="fig-view">
        <div className="fig-art" style={style} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
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
  // 🔴 ZOOM IS DOUBLE-TAP, NOT PINCH — and that is a touch-action decision, not
  //    a preference. Pinch needs `touch-action: none`, which would take the
  //    vertical scroll away from a bottom sheet that has to scroll. Double-tap
  //    needs nothing from the browser, works with a mouse for free, and leaves
  //    the sheet's own gestures alone. Real pinch arrives with the 3D rig, when
  //    the figure gets a surface of its own.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // The anchor comes from the FAULT pose (the correct one has no marker) and is
  // shared by both halves — the same rule that makes the drag turn them
  // together. Recomputed with `mix` because a rotatable pair can zoom mid-turn.
  const origin = useMemo(() => {
    const a = pair && zoomAnchor(pair.fault, mix);
    if (!a) return undefined;
    const px = (v, lo, span) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100)).toFixed(1)}%`;
    return `${px(a.x, CELL.x, CELL.w)} ${px(a.y, CELL.y, CELL.h)}`;
  }, [pair, mix]);
  const drag = useRef(null);
  const lastTap = useRef(0);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z === 1 ? 2.2 : 1));
    setPan({ x: 0, y: 0 });
  }, []);

  // Pointer events, not touch events: one code path for finger, mouse and pen,
  // and `setPointerCapture` keeps the gesture alive when the finger leaves the
  // little SVG box — which it always does on a phone.
  const onDown = useCallback((e) => {
    // 🔴 ONE GESTURE, TWO JOBS, DECIDED BY STATE — never by a modifier key that
    //    a phone does not have. Zoomed in, a horizontal drag PANS, because that
    //    is the only thing it can usefully mean when the figure is larger than
    //    its box. Zoomed out it TURNS. A drag doing both at once would do
    //    neither well.
    drag.current = { x: e.clientX, y: e.clientY, mix: 0, pan };
    setMix((m) => { drag.current.mix = m; return m; });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older webviews */ }
  }, [pan]);

  const onMove = useCallback((e) => {
    if (!drag.current) return;
    const dxPx = e.clientX - drag.current.x;
    if (zoom !== 1) {
      setPan({ x: drag.current.pan.x + dxPx, y: drag.current.pan.y + (e.clientY - drag.current.y) });
      return;
    }
    // 🔴 SCALED BY THE ELEMENT'S OWN WIDTH, not a magic pixel count: the same
    //    swipe has to travel the same amount of turn on a 360px phone and a
    //    tablet. Half the width is a full turn — enough that it cannot be
    //    triggered by the vertical scroll the sheet also needs.
    const w = e.currentTarget.getBoundingClientRect().width || 1;
    setMix(Math.max(0, Math.min(1, drag.current.mix + dxPx / (w * 0.5))));
  }, [zoom]);

  const onUp = useCallback((e) => {
    const moved = drag.current && Math.abs(e.clientX - drag.current.x) > 6;
    drag.current = null;
    // A tap is a pointer that went down and up without travelling. Two inside
    // 300ms is the zoom toggle — measured here rather than relying on
    // `dblclick`, which no mobile browser fires reliably on a plain div.
    if (moved) return;
    const now = Date.now();
    if (now - lastTap.current < 300) { toggleZoom(); lastTap.current = 0; } else { lastTap.current = now; }
  }, [toggleZoom]);
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
      {/* EVERY pair zooms; only some turn. So the handlers are always attached
          and the drag decides what it means from `zoom`. */}
      <div
        className={`fig-pair fig-interactive${zoom !== 1 ? ' fig-zoomed' : ''}${pair.rotatable ? ' fig-rotatable' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <Fig pose={pair.correct} label={t(lang, 'figureCorrect')} caption="correct" mix={mix} zoom={zoom} pan={pan} origin={origin} />
        <Fig pose={pair.fault} label={t(lang, 'figureFault')} caption="fault" mix={mix} zoom={zoom} pan={pan} origin={origin} />
      </div>
      <div className="fig-drag">
        <span className="fig-drag-hint">
          {t(lang, pair.rotatable ? 'figureDragHint' : 'figureZoomHint')}
        </span>
        {pair.rotatable && (
          <span className="fig-drag-bar"><i style={{ left: `${mix * 100}%` }} /></span>
        )}
        {zoom !== 1 && (
          <button type="button" className="fig-zoom-reset" onClick={toggleZoom}>
            {t(lang, 'figureZoomReset')}
          </button>
        )}
      </div>

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
