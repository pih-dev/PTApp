import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SPOTSET_MARK_SVG } from '../spotsetMark';
import { t } from '../i18n';

// ─── The opening (v2.27; showcase mode v2.30.1) ──────────────────────────────
// Two modes, one sequence:
//   'launch'   — once per app open: plays, auto-dismisses at ~3s, tap skips,
//                reduced-motion never sees it (App's matchMedia guard + a CSS
//                belt scoped to .splash-launch).
//   'showcase' — Pierre's ask: tapping the header MARK replays the show and it
//                LOOPS until he closes it. Replay restarts mid-cycle; tapping
//                anywhere else closes; there is no auto-dismiss.
//
// 🔴 SOUND POLICY DIFFERS BY MODE, and it is the autoplay rule, not taste:
//    launch = native only (browsers refuse audio before a user gesture);
//    showcase = everywhere, because the tap that opened it IS the gesture —
//    which is what finally lets the PWA play the sound too. The wav joined the
//    gh-pages deploy list for exactly this (v2.30.1); if it is missing or
//    offline, play() rejects and the show simply runs silent.
//
// 🔴 TIMING IS COUPLED: hits at 0.35s/0.85s (make-opening-sound.mjs) = the two
//    figures landing (.pm-* delays in styles.css); a cycle is ~2.95s + a hold,
//    LOOP_MS restarts both. Change one, change all.
const LOOP_MS = 3900;

export default function Splash({ onDone, lang = 'en', mode = 'launch' }) {
  const [leaving, setLeaving] = useState(false);
  const [cycle, setCycle] = useState(0);
  const audioRef = useRef(null);
  const showcase = mode === 'showcase';

  const playSound = useCallback(() => {
    try {
      const native = !!(window.Capacitor && window.Capacitor.isNativePlatform
        && window.Capacitor.isNativePlatform());
      if (!showcase && !native) return;
      if (!audioRef.current) {
        audioRef.current = new Audio('opening.wav');
        audioRef.current.volume = 0.9;
      }
      audioRef.current.currentTime = 0;
      // A failed play (policy, missing asset, offline) never breaks the show.
      audioRef.current.play().catch(() => {});
    } catch { /* audio is a garnish */ }
  }, [showcase]);

  // One run per cycle: sound now, and either the loop (showcase) or the
  // auto-dismiss pair (launch). `cycle` in the deps is what makes Replay and
  // the loop re-fire the whole sequence.
  useEffect(() => {
    playSound();
    if (showcase) {
      const loop = setTimeout(() => setCycle((c) => c + 1), LOOP_MS);
      return () => clearTimeout(loop);
    }
    const t1 = setTimeout(() => setLeaving(true), 2550);
    const t2 = setTimeout(onDone, 2950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone, playSound, showcase, cycle]);

  // The show never outlives its overlay.
  useEffect(() => () => { if (audioRef.current) audioRef.current.pause(); }, []);

  return (
    <div className={`splash splash-${mode}${leaving ? ' splash-leave' : ''}`} role="presentation"
      onClick={onDone}>
      {/* key={cycle} remounts the animated tree, restarting every CSS animation. */}
      <div key={cycle} className="splash-inner">
        <div className="splash-mark" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: SPOTSET_MARK_SVG }} />
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
