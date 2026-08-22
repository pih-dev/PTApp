// ─── The SpotSet opening sound (B3; v2.28.1, second cut) ─────────────────────
//
// Pierre heard the first cut on his phone: "like a wish… something passing by.
// Can it be more impactful? Like Netflix… or the Dolby THX with bass and
// spatial effect." So this cut is built on IMPACT, not wash: two percussive
// bass hits (the ta-DUM shape) with a sustained low chord blooming out of the
// second one, wide and held, decaying into the wordmark. ~2.9s.
//
// 🔴 TIMING IS COUPLED TO THE SPLASH (styles.css + Splash.jsx):
//    HIT1 0.35s = the correct figure lands · HIT2 0.85s = the fault figure
//    lands · the chord bloom carries the line draw (1.0–1.9s). Change one,
//    change all three.
//
// Phone-speaker honesty: a phone cannot reproduce 40Hz, so every bass note
// carries strong 2nd/3rd harmonics — the ear reconstructs the fundamental
// (missing-fundamental effect) and the hit still lands on small speakers.
import { writeFileSync } from 'node:fs';

const SR = 44100, DUR = 2.9, N = Math.round(SR * DUR);
const L = new Float64Array(N), R = new Float64Array(N);

// Deterministic noise so the asset is reproducible commit to commit.
let seed = 0x5075;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;

// A percussive bass hit: pitch-dropping sine with harmonics and a click skin.
// t0 start · f0→f1 pitch drop · decay rate · amp
function hit(t0, f0, f1, decay, amp) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * 18);
    ph += (2 * Math.PI * f) / SR;
    const e = Math.exp(-t * decay) * amp;
    // fundamental + the harmonics that survive a phone speaker
    const s = (Math.sin(ph) + 0.55 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) * e
      + Math.exp(-t * 70) * amp * 0.35 * Math.sin(2 * Math.PI * 900 * t)   // skin click
      + Math.exp(-t * 35) * amp * 0.25 * (rnd() * 0.5);                     // snap
    L[i] += s; R[i] += s;
  }
}

// The two hits: "ta" (tight) then "DUM" (deeper, bigger, longer).
hit(0.35, 160, 52, 9.5, 0.5);
hit(0.85, 110, 36, 4.2, 0.72);

// The chord that blooms out of the second hit and HOLDS — A1 root, fifth,
// octave, detuned across channels for width, swelling under the line draw
// and decaying into the wordmark.
const CH_T0 = 0.85;
const PARTS = [
  // [freq, ampL, ampR, detuneL, detuneR]
  [55.0, 0.30, 0.30, 0, 0],        // A1 root (mono — phones sum bass)
  [110.0, 0.22, 0.22, -0.4, 0.4],  // octave, slightly split
  [164.8, 0.14, 0.10, -0.9, 0.9],  // E3 fifth, wide
  [220.0, 0.10, 0.14, 1.1, -1.1],  // A3, counter-wide
  [329.6, 0.05, 0.05, -1.6, 1.6],  // E4 air
];
for (const [f, aL, aR, dL, dR] of PARTS) {
  let phL = 0, phR = 0;
  const start = Math.floor(CH_T0 * SR);
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    // swell in over 0.5s, hold, then release from 1.3s over ~0.7s
    const e = Math.min(1, t / 0.5) * (t < 1.3 ? 1 : Math.max(0, 1 - (t - 1.3) / 0.75));
    phL += (2 * Math.PI * (f + dL)) / SR;
    phR += (2 * Math.PI * (f + dR)) / SR;
    L[i] += (Math.sin(phL) + 0.35 * Math.sin(2 * phL)) * e * aL;
    R[i] += (Math.sin(phR) + 0.35 * Math.sin(2 * phR)) * e * aR;
  }
}

// A short riser into the first hit — anticipation, not the old "wish".
{
  let lp = 0;
  const end = Math.floor(0.35 * SR);
  for (let i = 0; i < end; i++) {
    const t = i / SR;
    const e = Math.pow(t / 0.35, 2.5) * 0.09;
    lp += 0.18 * (rnd() - lp);
    const s = lp * e * 3 + Math.sin(2 * Math.PI * (300 + 900 * t / 0.35) * t) * e * 0.25;
    L[i] += s * 0.8; R[i] += s * 1.2; // slight tilt = motion
  }
}

// Master: heavier tanh drive for weight, edge fades, normalise to -0.8 dBFS.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 0.25);
  L[i] = Math.tanh(L[i] * 1.6) * fade;
  R[i] = Math.tanh(R[i] * 1.6) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.912 / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(L[i] * g * 32767), i * 4);
  data.writeInt16LE(Math.round(R[i] * g * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28);
hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
writeFileSync('public/opening.wav', Buffer.concat([hdr, data]));
console.log(`public/opening.wav — ${((44 + data.length) / 1024).toFixed(0)} KB, ${DUR}s, hits at 0.35s / 0.85s`);
