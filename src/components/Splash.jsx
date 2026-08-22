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
// 🔴 SOUND HOOK — deliberately absent on web. The THX/Atmos-style spatial
//    opening sound Pierre wants plays from here at the NATIVE stage
//    (Capacitor): browsers refuse autoplay audio before a user gesture, and an
//    opening sound that needs a tap first is not an opening sound. When the
//    native shell lands, trigger it at mount, in sync with the line draw.
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1080);
    const t2 = setTimeout(onDone, 1400);
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
