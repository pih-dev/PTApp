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
  // 🔴 ZOOM IS CONTINUOUS PINCH NOW — the double-tap toggle survives as the
  //    mouse/accessibility path. Pinch needs `touch-action: none`, and Pierre
  //    has ruled the objection away (brief §2): the figure block owns its
  //    gestures as its own non-scrolling surface; the sheet scrolls from the
  //    text below, not from on top of the art.
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
  const pointers = useRef(new Map());   // pointerId → {x, y}, the live fingers
  const drag = useRef(null);            // one-finger baseline
  const pinch = useRef(null);           // two-finger baseline
  const lastTap = useRef(0);

  // A pan past the edge blanks the box with no recovery cue (review finding):
  // at scale z the art can move at most (z-1)/2 of its box in each direction
  // before nothing is left visible — clamp there, not at a feel-good number.
  const clampPan = useCallback((p, z, el) => {
    const b = el ? el.getBoundingClientRect() : { width: 400, height: 380 };
    const lim = (s) => Math.max(0, (z - 1) * s * 0.5);
    return {
      x: Math.max(-lim(b.width), Math.min(lim(b.width), p.x)),
      y: Math.max(-lim(b.height), Math.min(lim(b.height), p.y)),
    };
  }, []);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z > 1.01 ? 1 : 2.2));
    setPan({ x: 0, y: 0 });
  }, []);

  // Pointer events, not touch events: one code path for finger, mouse and pen,
  // and `setPointerCapture` keeps the gesture alive when the finger leaves the
  // little SVG box — which it always does on a phone.
  const onDown = useCallback((e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older webviews */ }
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      // Second finger down: the drag becomes a pinch. Baseline is the current
      // finger distance against the current zoom, so the pinch continues from
      // where the figure IS — never a jump to 1× first.
      drag.current = null;
      pinch.current = { dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1, zoom };
      return;
    }
    // 🔴 DIRECT MANIPULATION, PIERRE'S RULING (brief §2): one finger TURNS,
    //    immediately, zoomed or not — a drag never changes meaning under the
    //    same finger. Vertical drag pans while zoomed (secondary); horizontal
    //    pan exists only for pairs that cannot turn.
    drag.current = { x: e.clientX, y: e.clientY, mix: 0, pan };
    setMix((m) => { drag.current.mix = m; return m; });
  }, [pan, zoom]);

  const onMove = useCallback((e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current) {
      const pts = [...pointers.current.values()];
      if (pts.length >= 2) {
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
        // Continuous, clamped: 1× is the floor (the pair layout IS the zoomed-out
        // view) and 3× is past any teaching need.
        const z = Math.max(1, Math.min(3, pinch.current.zoom * (d / pinch.current.dist)));
        setZoom(z);
        setPan((p) => (z <= 1.01 ? { x: 0, y: 0 } : clampPan(p, z, e.currentTarget)));
      }
      return;
    }
    if (!drag.current) return;
    const dxPx = e.clientX - drag.current.x;
    const dyPx = e.clientY - drag.current.y;
    if (zoom > 1.01 && !pair.rotatable) {
      // A pair with one camera has nothing to turn — dragging zoomed pans.
      setPan(clampPan({ x: drag.current.pan.x + dxPx, y: drag.current.pan.y + dyPx }, zoom, e.currentTarget));
      return;
    }
    if (zoom > 1.01) {
      // Zoomed AND rotatable: the drag still turns (below); vertical pans.
      setPan((p) => clampPan({ x: p.x, y: drag.current.pan.y + dyPx }, zoom, e.currentTarget));
    }
    // 🔴 SCALED BY THE ELEMENT'S OWN WIDTH, not a magic pixel count: the same
    //    swipe has to travel the same amount of turn on a 360px phone and a
    //    tablet. Half the width is a full turn.
    const w = e.currentTarget.getBoundingClientRect().width || 1;
    setMix(Math.max(0, Math.min(1, drag.current.mix + dxPx / (w * 0.5))));
  }, [zoom, pair, clampPan]);

  const onUp = useCallback((e) => {
    pointers.current.delete(e.pointerId);
    const remaining = [...pointers.current.entries()];
    if (pinch.current) {
      pinch.current = null;
      if (remaining.length === 1) {
        // One finger lifted out of a pinch: the survivor becomes a fresh drag,
        // baselined HERE so the figure does not leap to the old baseline.
        const [, p] = remaining[0];
        drag.current = { x: p.x, y: p.y, mix: 0, pan };
        setMix((m) => { drag.current.mix = m; return m; });
      }
      return;
    }
    // Both axes count as movement, and a CANCELLED pointer is never a tap —
    // review finding: two vertical flicks routed through pointercancel used to
    // read as a double-tap and zoom the pair unexpectedly.
    const moved = drag.current
      && (Math.abs(e.clientX - drag.current.x) > 6 || Math.abs(e.clientY - drag.current.y) > 6);
    drag.current = null;
    if (moved || e.type === 'pointercancel') return;
    // A tap is a pointer that went down and up without travelling. Two inside
    // 300ms is the zoom toggle — kept as the mouse and accessibility path now
    // that pinch is the primary zoom; measured here rather than relying on
    // `dblclick`, which no mobile browser fires reliably on a plain div.
    const now = Date.now();
    if (now - lastTap.current < 300) { toggleZoom(); lastTap.current = 0; } else { lastTap.current = now; }
  }, [toggleZoom, pan]);
  // 🔴 `touch-action: none` NOW, and that is a DECISION, not a regression: the
  //    old pan-y existed so the bottom sheet could scroll from on top of the
  //    art, and Pierre has ruled the sheet does not need that (brief §2). The
  //    figure block is its own non-scrolling surface; the sheet still scrolls
  //    from everything below it. No preventDefault anywhere — the axis claim
  //    stays in CSS, per docs/traps.md.

  if (!pair) return null;
  const txt = figureText(name, lang, pair.archetype);

  return (
    <>
      <div className="subbar">{t(lang, 'formSection')}</div>
      {/* EVERY pair zooms; only some turn. So the handlers are always attached
          and the drag decides what it means from `zoom`. */}
      <div
        className={`fig-pair fig-interactive${zoom > 1.01 ? ' fig-zoomed' : ''}${pair.rotatable ? ' fig-rotatable' : ''}`}
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
        {zoom > 1.01 && (
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
