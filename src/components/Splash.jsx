import React, { useEffect, useState } from 'react';
import { SPOTSET_MARK_SVG } from '../spotsetMark';

// ─── The opening (v2.27) ─────────────────────────────────────────────────────
// The mark performs once per launch: the two figures step in, the posture
// lines draw themselves, the fault ring lands, the name appears — then the
// overlay lifts. Pierre asked for an opening with impact; this is its visual
// half, built to the motion law: transform/opacity only, nothing blocks input
// (any tap skips), total ≤1.4s, and prefers-reduced-motion never sees it
// (App skips mounting it — plus a CSS belt in styles.css).
//
// 🔴 THE SOUND IS NATIVE-ONLY (v2.28). Browsers refuse autoplay before a user
//    gesture, and an opening sound that needs a tap first is not an opening
//    sound — so playback is gated on Capacitor reporting a native platform,
//    where MainActivity lifts the WebView's gesture requirement. The asset
//    (public/opening.wav, synthesised by scripts/make-opening-sound.mjs) rides
//    into the APK via webDir but is never copied to gh-pages, so the web build
//    could not fetch it even without the gate. v2.28.1: two bass hits at
//    0.35s/0.85s — each figure LANDS on its hit — and the chord bloom carries
//    the line draw (styles.css .pm-* delays are coupled to these numbers).
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        const audio = new Audio('opening.wav');
        audio.volume = 0.9;
        // A failed play (policy, missing asset) must never break the launch.
        audio.play().catch(() => {});
      }
    } catch { /* audio is a garnish — the splash never waits on it */ }
    // v2.28.1: stretched to ~3s on Pierre's phone review ("too short to
    // notice") so the two-hit sound has room. Shorten here + the .pm-* delays
    // + the wav TOGETHER when he wants it tightened.
    const t1 = setTimeout(() => setLeaving(true), 2550);
    const t2 = setTimeout(onDone, 2950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className={`splash${leaving ? ' splash-leave' : ''}`} role="presentation"
      onClick={onDone}>
      {/* Static frozen markup — same constant the header renders. */}
      <div className="splash-mark" aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SPOTSET_MARK_SVG }} />
      <div className="splash-word">SpotSet</div>
    </div>
  );
}
