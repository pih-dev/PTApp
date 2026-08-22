// ─── The SpotSet opening sound (B3, v2.28) ───────────────────────────────────
//
// Pierre's brief: "an opening sound like the THX / Dolby Atmos trailers —
// spatial and impactful with bass. High fidelity." Real Dolby Atmos is a
// licensed object-audio FORMAT a phone speaker cannot reproduce anyway; what
// carries that feel in stereo is (1) a sub swell you feel before you hear,
// (2) a wide, decorrelated shimmer that reads as space, (3) one clean impact.
// This script synthesises exactly those three, sample-accurate, no deps, and
// writes public/opening.wav — bundled into the NATIVE app via webDir, never
// fetched by the web build (the gh-pages deploy list does not carry it).
//
// 🔴 TIMING IS COUPLED TO THE SPLASH: the impact lands at 450ms, the moment
//    the posture lines start to draw (styles.css .pm-line delay). Change one,
//    change both.
import { writeFileSync } from 'node:fs';

const SR = 44100, DUR = 1.35, N = Math.round(SR * DUR);
const L = new Float64Array(N), R = new Float64Array(N);

// Deterministic noise so the asset is reproducible commit to commit.
let seed = 0x5075;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1;

const env = (t, a, p, d) => t < a ? t / a : t < p ? 1 : Math.max(0, 1 - (t - p) / d);

// 1) The sub swell: 42→58Hz glide, felt from ~80ms, peaking with the lines.
let phase = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const f = 42 + 16 * Math.min(1, t / 0.6);
  phase += (2 * Math.PI * f) / SR;
  const e = env(t, 0.28, 0.55, 0.62) * 0.5;
  const s = (Math.sin(phase) + 0.22 * Math.sin(2 * phase)) * e;
  L[i] += s; R[i] += s; // sub stays mono — phones sum bass anyway
}

// 2) The width: two detuned partials, hard-panned, slow beat = "space".
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const e = env(t, 0.4, 0.7, 0.5) * 0.1;
  L[i] += Math.sin(2 * Math.PI * 219.5 * t) * e;
  R[i] += Math.sin(2 * Math.PI * 221.2 * t) * e;
  L[i] += Math.sin(2 * Math.PI * 330.1 * t + 1.3) * e * 0.6;
  R[i] += Math.sin(2 * Math.PI * 328.6 * t + 0.4) * e * 0.6;
}

// 3) The shimmer: decorrelated filtered noise, rising, airy not hissy.
let lpL = 0, lpR = 0, hpL = 0, hpR = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const e = env(t, 0.5, 0.75, 0.45) * 0.075 * Math.min(1, t / 0.3);
  const nL = rnd(), nR = rnd();
  lpL += 0.12 * (nL - lpL); lpR += 0.12 * (nR - lpR);           // soften the top
  hpL = 0.985 * (hpL + lpL - (i ? lpL : 0)); hpR = 0.985 * (hpR + lpR - (i ? lpR : 0)); // strip rumble
  L[i] += (lpL - hpL * 0.2) * e * 3.2;
  R[i] += (lpR - hpR * 0.2) * e * 3.2;
}

// 4) The impact at 450ms: a 110Hz thump with a fast skin and faster click.
const HIT = 0.45;
for (let i = Math.floor(HIT * SR); i < N; i++) {
  const t = i / SR - HIT;
  const e = Math.exp(-t * 11) * 0.42;
  const s = Math.sin(2 * Math.PI * (110 - 55 * Math.min(1, t * 3)) * t) * e
    + Math.exp(-t * 90) * 0.15 * Math.sin(2 * Math.PI * 1400 * t);
  L[i] += s; R[i] += s;
}

// Master: gentle tanh glue, edge fades, normalise to -1 dBFS.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.03) * Math.min(1, (DUR - t) / 0.16);
  L[i] = Math.tanh(L[i] * 1.15) * fade;
  R[i] = Math.tanh(R[i] * 1.15) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.891 / peak; // -1 dBFS

// 16-bit stereo WAV.
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
console.log(`public/opening.wav — ${((44 + data.length) / 1024).toFixed(0)} KB, ${DUR}s, impact at ${HIT}s`);
