import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SPOTSET_MARK_SVG } from '../spotsetMark';
import { buildShowcaseCells, pingpong } from '../showcaseFigures';
import { t } from '../i18n';

// ─── The opening (v2.27) and the showcase suite (v2.31) ──────────────────────
//   'launch'   — once per app open, UNCHANGED since Pierre approved it: the
//                3s piece, auto-dismiss, tap skips, reduced-motion never sees
//                it, sound native-only (autoplay policy).
//   'showcase' — the logo-tap title sequence, his spec: the hero opening, then
//                the mark hands off to a 6×4 WALL of the library — rotatable
//                movements turning, the rest crossfading — carried by one of
//                FIVE composed ~25s pieces (shuffled; each cycle plays the
//                next). Loops until Close; Replay restarts; backdrop closes.
//
// 🔴 TIMING COUPLING: the 0–3s hits (make-opening-sound / the suite's shared
//    opening) = the two figures landing (.pm-* delays). The wall's stagger is
//    pure CSS animation-delay keyed off the cycle remount; LOOP_MS matches the
//    suite length. Change one, change all.
const LOOP_MS = { launch: 0, showcase: 25400 };
const PIECES = ['anthem', 'engine', 'arena', 'pulse', 'orbit'];

export default function Splash({ onDone, lang = 'en', mode = 'launch' }) {
  const [leaving, setLeaving] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [cells, setCells] = useState(null);
  const [tick, setTick] = useState(0);
  const audioRef = useRef(null);
  const srcRef = useRef(null);
  // Shuffle once per showcase open; cycles walk the order. Math.random is fine
  // here — the show may differ per open, only the ASSETS are deterministic.
  const orderRef = useRef([...PIECES].sort(() => Math.random() - 0.5));
  const showcase = mode === 'showcase';

  const playSound = useCallback((cycleN) => {
    try {
      const native = !!(window.Capacitor && window.Capacitor.isNativePlatform
        && window.Capacitor.isNativePlatform());
      if (!showcase && !native) return;
      const src = showcase
        ? `opening-${orderRef.current[cycleN % orderRef.current.length]}.m4a`
        : 'opening.wav';
      if (!audioRef.current || srcRef.current !== src) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(src);
        audioRef.current.volume = 0.9;
        srcRef.current = src;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch { /* audio is a garnish */ }
  }, [showcase]);

  // One run per cycle: sound now, loop (showcase) or auto-dismiss (launch).
  useEffect(() => {
    playSound(cycle);
    if (showcase) {
      const loop = setTimeout(() => setCycle((c) => c + 1), LOOP_MS.showcase);
      return () => clearTimeout(loop);
    }
    const t1 = setTimeout(() => setLeaving(true), 2550);
    const t2 = setTimeout(onDone, 2950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone, playSound, showcase, cycle]);

  // The wall's art builds AFTER first paint, behind the hero phase — ~180
  // small svg builds would otherwise stutter the very tap that opened this.
  useEffect(() => {
    if (!showcase) return;
    const id = setTimeout(() => { try { setCells(buildShowcaseCells()); } catch { setCells([]); } }, 120);
    return () => clearTimeout(id);
  }, [showcase]);

  // One 100ms ticker drives every turning cell (~10fps — smooth at cell size,
  // nowhere near the frame budget) and the slow static crossfades.
  useEffect(() => {
    if (!showcase || !cells) return;
    const id = setInterval(() => setTick((v) => v + 1), 100);
    return () => clearInterval(id);
  }, [showcase, cells]);

  useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);

  return (
    <div className={`splash splash-${mode}${leaving ? ' splash-leave' : ''}`} role="presentation"
      onClick={onDone}>
      {/* key={cycle} remounts the animated tree — every CSS delay restarts. */}
      <div key={cycle} className="splash-stage">
        <div className="splash-inner">
          <div className="splash-mark" aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: SPOTSET_MARK_SVG }} />
        </div>
        {showcase && cells && (
          <div className="splash-grid" aria-hidden="true">
            {cells.map((cell, i) => {
              const html = cell.kind === 'rot'
                ? cell.frames[pingpong(tick + i * 3)]
                // a slow, per-cell staggered walk through its pool
                : cell.pool[Math.floor((tick / 35) + i * 0.7) % cell.pool.length];
              return (
                <div key={i} className="splash-cell" style={{ animationDelay: `${3.1 + i * 0.45}s` }}
                  dangerouslySetInnerHTML={{ __html: html }} />
              );
            })}
          </div>
        )}
        <div className="splash-word">SpotSet</div>
      </div>
      {showcase && (
        <div className="splash-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setCycle((c) => c + 1)}>{t(lang, 'replay')}</button>
          <button type="button" onClick={onDone}>{t(lang, 'close')}</button>
        </div>
      )}
    </div>
  );
}
