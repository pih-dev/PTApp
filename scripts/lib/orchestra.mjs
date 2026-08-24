// ─── orchestra.mjs — the acoustic engine (suite 2, 2026-08-23) ───────────────
//
// Pierre, after hearing the v2.31 suite: "try not to make them sound
// synthesized… I like the flute… I like guitars… can you compose one with the
// piano… high quality Dolby 5.1 or Atmos 7.1, and it has to be catchy."
//
// WHY THIS FILE EXISTS. The first suite (make-opening-suite*.mjs) is additive
// sine/saw/square. That is *why* it sounds synthesized: a real instrument is
// noise + inharmonicity + a body + a room, and a sine has none of the four.
// This engine models all four:
//
//   • flute  — jet chiff, breath noise band-limited and AMPLITUDE-CORRELATED,
//              delayed vibrato (real players do not vibrate on the attack),
//              pitch scoop into the note.
//   • guitar — extended Karplus-Strong: fractional-delay string, loop damping,
//              PICK-POSITION comb, and a 3-resonance body filter on the track.
//   • piano  — inharmonic partials (fn = n·f0·√(1+Bn²)), per-partial decay,
//              double-decay envelope, TWO strings detuned so they beat, hammer
//              thump, damper release.
//   • sax    — reed pulse through fixed FORMANTS, breath, attack pitch dip.
//
// 🔴 ONE ARRANGEMENT, THREE DELIVERABLES. The v2.31 suite needed two scripts
//    kept in step BY HAND (CLAUDE.md trap) because stereo and 5.1 were written
//    twice. Here a piece is written ONCE into positioned mono tracks; the
//    spatialiser renders 7.1, and 5.1 and stereo are FOLD-DOWNS of it. There is
//    no second arrangement to drift.
//
// Everything is deterministic — seeded RNG, same bytes every run.

import { writeFileSync } from 'node:fs';

export const SR = 44100;
export const TAU = Math.PI * 2;

// ── numbers, notes, time ────────────────────────────────────────────────────
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    // xorshift32 — better spectral flatness than the LCG the v2.31 suite used;
    // a poor noise source is audible as a hiss "tone" under quiet passages.
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s / 0x80000000) - 1;
  };
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/** n('A3') → 220. The only way pieces should name pitches. */
export function n(name) {
  const m = /^([A-G][b#]?)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  return mtof(12 * (Number(m[2]) + 1) + PC[m[1]]);
}
/** Transpose a frequency by semitones — for lifts, octaves, harmony lines. */
export const st = (f, semis) => f * Math.pow(2, semis / 12);
/** A chord as frequencies from a root note name + semitone offsets. */
export const chord = (root, offsets) => offsets.map((o) => st(n(root), o));

// Common scale degree tables (semitones from the tonic).
export const SCALE = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  pentMinor: [0, 3, 5, 7, 10],
  pentMajor: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};
/** Degree → frequency. deg 0 = tonic; negatives and >7 wrap octaves. */
export function degree(tonicName, scaleName, deg) {
  const s = SCALE[scaleName];
  const oct = Math.floor(deg / s.length);
  const idx = ((deg % s.length) + s.length) % s.length;
  return st(n(tonicName), s[idx] + 12 * oct);
}

// ── envelopes ───────────────────────────────────────────────────────────────
/** Attack / hold / release, all in seconds. Returns env(t) ∈ [0,1]. */
export const adsr = (a, h, r) => (t) =>
  t < a ? (a <= 0 ? 1 : t / a) : t < a + h ? 1 : Math.max(0, 1 - (t - a - h) / r);
/** A smoother, more musical curve — cosine attack, exponential-ish release. */
export const swell = (a, h, r) => (t) => {
  if (t < a) return a <= 0 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * (t / a));
  if (t < a + h) return 1;
  const u = (t - a - h) / r;
  return u >= 1 ? 0 : (1 - u) * (1 - u);
};

// ── filters ─────────────────────────────────────────────────────────────────
/** RBJ biquad coefficients. type: 'lp' | 'hp' | 'bp' | 'peak' | 'ls' | 'hs'. */
export function biquad(type, f0, Q, gainDb = 0, sr = SR) {
  const w = TAU * f0 / sr, cw = Math.cos(w), sw = Math.sin(w);
  const alpha = sw / (2 * Q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case 'ls': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
      a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break;
    }
    case 'hs': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
      a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break;
    }
    default: throw new Error(`biquad: ${type}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Run a biquad over a buffer in place (direct form I, stable enough here). */
export function runBiquad(buf, c, mix = 1) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = mix === 1 ? y : buf[i] * (1 - mix) + y * mix;
  }
}
/** Parallel resonance bank — an instrument BODY. specs: [f, Q, gain]. */
export function runBody(buf, specs, dryMix = 0.55) {
  const out = new Float64Array(buf.length);
  for (const [f, Q, g] of specs) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const c = biquad('bp', f, Q);
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      out[i] += y * g;
    }
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * dryMix + out[i];
}

// Body signatures. Measured-ish resonances, not guesses pulled from nowhere:
// the Helmholtz air mode, the top-plate mode and a mid cluster are what make a
// plucked string read as "a guitar in a room" instead of "a filtered buzz".
export const BODY = {
  nylon: [[97, 6, 0.55], [205, 7, 0.40], [400, 5, 0.22], [960, 3, 0.10]],
  steel: [[103, 7, 0.50], [216, 8, 0.45], [435, 6, 0.26], [1180, 3.5, 0.14]],
  archtop: [[118, 5, 0.42], [240, 6, 0.36], [520, 5, 0.22]],
  upright: [[62, 6, 0.60], [128, 6, 0.34], [270, 5, 0.16]],
  piano: [[88, 4, 0.28], [176, 4, 0.20], [352, 3.5, 0.14], [1400, 2, 0.07]],
};

// ── instruments ─────────────────────────────────────────────────────────────
// Every instrument writes ADDITIVELY into a mono Float64Array. Placement,
// reverb and body live on the Track, not in the note — same as a real session.
//
// TRIM normalises every voice so amp:1 peaks at roughly 1.0 REGARDLESS of how
// many oscillators or filters the model happens to use. Without it a composer
// writing amp:0.4 gets a whisper from the sax and a wall from the piano, and
// starts "fixing" the balance with numbers that mean nothing. Measured with
// scripts/check-orchestra.mjs — re-measure if a model changes.
const TRIM = {
  flute: 0.78, sax: 1.45, pluck: 1.85, bass: 1.60, piano: 0.68, strings: 3.20,
  kick: 0.79, snare: 0.71, hat: 0.67, shaker: 0.58, cymbal: 0.65,
};

/**
 * FLUTE. Additive core (fast harmonic rolloff, flute is nearly a sine up top)
 * + a breath-noise band whose level TRACKS the amplitude envelope + an attack
 * chiff + delayed vibrato + a pitch scoop into the note.
 * opts: { vib, vibDelay, breath, chiff, scoop, air, bend }
 */
export function flute(buf, t0, dur, f, amp, rng, opts = {}) {
  const {
    vib = 0.011, vibDelay = 0.28, vibRate = 5.4, breath = 0.34,
    chiff = 0.55, scoop = 0.035, air = 1, bend = 0, legatoFrom = 0,
    human = 1,
    atk = Math.min(0.075, dur * 0.22), rel = Math.min(0.30, dur * 0.45),
  } = opts;
  const N = buf.length;
  const start = Math.max(0, Math.floor(t0 * SR));
  const end = Math.min(N, Math.floor((t0 + dur + rel) * SR));
  if (end <= start) return;

  // Harmonic weights: a flute's 2nd partial is well below the fundamental and
  // it dies off fast; high notes are purer still, which is why the rolloff is
  // frequency-dependent rather than a fixed table.
  const bright = Math.max(0.25, Math.min(1, 900 / f));
  const H = [1, 0.16 * bright, 0.075 * bright, 0.030 * bright, 0.014 * bright, 0.006 * bright];

  // Breath noise: two-pole bandpass around 2.4 kHz, re-tuned per note so the
  // air sits above the fundamental and not on top of it.
  const bpc = biquad('bp', Math.max(1300, Math.min(4600, f * 3.6)), 1.0);
  let bx1 = 0, bx2 = 0, by1 = 0, by2 = 0;
  // Chiff: brighter, very short, at the attack only.
  const cc = biquad('bp', Math.max(2200, Math.min(7000, f * 7)), 0.9);
  let cx1 = 0, cx2 = 0, cy1 = 0, cy2 = 0;

  const env = swell(atk, Math.max(0, dur - atk), rel);
  // Partials start at INDEPENDENT phases. Locking them all to zero produces an
  // identical waveform shape on every note — the single most synthetic-sounding
  // thing an additive voice can do.
  const ph = new Float64Array(H.length);
  for (let k = 0; k < H.length; k++) ph[k] = rng() * Math.PI;
  // Human layer: a slow, irrational-ratio drift in BOTH pitch and level. No
  // player holds a note dead steady, and a dead-steady note is heard as a
  // machine no matter how good the timbre is.
  const d1 = rng() * TAU, d2 = rng() * TAU, d3 = rng() * TAU;
  const a1 = rng() * TAU, a2 = rng() * TAU;
  const total = (end - start) / SR;
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const e = env(t);
    if (e <= 0 && t > dur) break;

    // pitch: scoop up into the note, optional glide from a previous pitch
    // (legatoFrom), then vibrato that only begins after vibDelay.
    let fr = f;
    if (legatoFrom) fr = legatoFrom + (f - legatoFrom) * Math.min(1, t / 0.06);
    if (scoop) fr *= 1 - scoop * Math.exp(-t * 46);
    if (bend) fr *= 1 + bend * Math.min(1, t / total);
    const vd = t > vibDelay ? Math.min(1, (t - vibDelay) / 0.35) : 0;
    fr *= 1 + vib * vd * Math.sin(TAU * vibRate * t);
    const drift = (Math.sin(TAU * 0.37 * t + d1) + 0.7 * Math.sin(TAU * 0.83 * t + d2)
      + 0.5 * Math.sin(TAU * 1.61 * t + d3)) / 2.2;
    fr *= 1 + 0.0016 * human * drift;
    const flutter = 1 + 0.045 * human
      * ((Math.sin(TAU * 0.61 * t + a1) + 0.6 * Math.sin(TAU * 1.37 * t + a2)) / 1.6);

    let s = 0;
    for (let k = 0; k < H.length; k++) {
      ph[k] += (TAU * fr * (k + 1)) / SR;
      // higher partials swell in slightly after the fundamental — the note
      // "opens" instead of arriving fully formed, which is the tell.
      const kg = k === 0 ? 1 : Math.min(1, t / (0.05 + k * 0.02));
      s += H[k] * Math.sin(ph[k]) * kg;
    }

    const nz = rng();
    const yb = bpc.b0 * nz + bpc.b1 * bx1 + bpc.b2 * bx2 - bpc.a1 * by1 - bpc.a2 * by2;
    bx2 = bx1; bx1 = nz; by2 = by1; by1 = yb;
    // Breath tracks amplitude: quiet notes are proportionally AIRIER, which is
    // true of the instrument and is most of what sells it as blown.
    s += yb * breath * air * (0.45 + 0.55 * e) * 1.6;

    if (chiff && t < 0.14) {
      const yc = cc.b0 * nz + cc.b1 * cx1 + cc.b2 * cx2 - cc.a1 * cy1 - cc.a2 * cy2;
      cx2 = cx1; cx1 = nz; cy2 = cy1; cy1 = yc;
      s += yc * chiff * Math.exp(-t * 42) * 0.8;
    }
    buf[i] += s * e * flutter * amp * TRIM.flute;
  }
}

/**
 * SAXOPHONE. A reed pulse (rich, asymmetric) shaped by three fixed FORMANTS,
 * which is what makes a sax a sax rather than a bright saw. Used sparingly per
 * Pierre — one voice, front and centre, never a section.
 * opts: { formants, growl, vib, vibDelay, breath, sub }
 */
export function sax(buf, t0, dur, f, amp, rng, opts = {}) {
  const {
    kind = 'tenor', vib = 0.009, vibDelay = 0.35, vibRate = 5.0,
    breath = 0.26, bendIn = 0.022, sub = 0.18, human = 1,
    atk = 0.028, rel = Math.min(0.34, dur * 0.5),
  } = opts;
  // Alto sits higher and thinner; tenor is the warm one Pierre will recognise.
  const F = kind === 'alto' ? [[720, 2.4, 1.0], [1420, 2.6, 0.62], [2600, 3.0, 0.30]]
    : [[560, 2.2, 1.0], [1180, 2.6, 0.58], [2450, 3.0, 0.26]];
  const N = buf.length;
  const start = Math.max(0, Math.floor(t0 * SR));
  const end = Math.min(N, Math.floor((t0 + dur + rel) * SR));
  if (end <= start) return;

  const env = swell(atk, Math.max(0, dur - atk), rel);
  const raw = new Float64Array(end - start);
  const d1 = rng() * TAU, d2 = rng() * TAU, a1 = rng() * TAU;
  let ph = rng() * Math.PI;
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const e = env(t);
    if (e <= 0 && t > dur) break;
    let fr = f * (1 - bendIn * Math.exp(-t * 34)); // the reed settles UP into pitch
    const vd = t > vibDelay ? Math.min(1, (t - vibDelay) / 0.4) : 0;
    fr *= 1 + vib * vd * Math.sin(TAU * vibRate * t);
    // reed instability — a real embouchure wanders a few cents constantly
    fr *= 1 + 0.0022 * human * ((Math.sin(TAU * 0.43 * t + d1) + 0.6 * Math.sin(TAU * 1.29 * t + d2)) / 1.6);
    ph += (TAU * fr) / SR;
    if (ph > TAU) ph -= TAU;
    const u = ph / TAU;
    // Asymmetric pulse: the reed spends longer closed than open, and that
    // asymmetry (not a waveform name) is where the odd/even mix comes from.
    const duty = 0.34 + 0.06 * e;
    let s = u < duty ? 1 - 2 * (u / duty) : -1 + 2 * ((u - duty) / (1 - duty));
    s = Math.tanh(s * (1.6 + 1.4 * e)) * 0.6;
    s += rng() * breath * (0.3 + 0.7 * e) * 0.5;
    const flutter = 1 + 0.05 * human * Math.sin(TAU * 0.71 * t + a1);
    raw[i - start] = s * e * flutter;
  }
  // formant bank
  const outF = new Float64Array(raw.length);
  for (const [ff, Q, g] of F) {
    const c = biquad('bp', ff, Q);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < raw.length; i++) {
      const x = raw[i];
      const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      outF[i] += y * g;
    }
  }
  const ac = biquad('bp', 2100, 0.6);
  let ax1 = 0, ax2 = 0, ay1 = 0, ay2 = 0;
  const envA = swell(atk, Math.max(0, dur - atk), rel);
  for (let i = 0; i < raw.length; i++) {
    const nz = rng();
    const y = ac.b0 * nz + ac.b1 * ax1 + ac.b2 * ax2 - ac.a1 * ay1 - ac.a2 * ay2;
    ax2 = ax1; ax1 = nz; ay2 = ay1; ay1 = y;
    const e = envA(i / SR);
    buf[start + i] += (outF[i] * 1.5 + raw[i] * sub + y * breath * 0.55 * (0.4 + 0.6 * e) * e) * amp * TRIM.sax;
  }
}

/**
 * GUITAR / plucked string — extended Karplus-Strong.
 * Fractional-delay string + one-pole loop damping + pick-position comb. The
 * body is NOT here: it belongs to the track (one body per instrument, like the
 * real thing), so set body: BODY.nylon on the track.
 * opts: { decay, damp, pick, bright, mute, harmonic }
 */
export function pluck(buf, t0, f, amp, rng, opts = {}) {
  const {
    decay = 3.4,      // seconds to ~-60dB
    damp = 0.42,      // loop lowpass amount (higher = darker = nylon)
    pick = 0.22,      // pick position along the string (0..0.5)
    bright = 0.55,    // excitation brightness
    mute = 0,         // palm mute → shortens decay hard
    dur = 0,          // 0 = ring out; >0 = damped at dur (a fretted release)
    detune = 0,
  } = opts;
  const N = buf.length;
  const start = Math.max(0, Math.floor(t0 * SR));
  if (start >= N) return;
  const A = amp * (opts.trim ?? TRIM.pluck);
  const fr = f * (1 + detune);
  const Lf = SR / fr;
  const L = Math.max(2, Math.floor(Lf));
  const frac = Lf - L;                      // fractional part → allpass
  const line = new Float64Array(L + 2);

  // Excitation: a noise burst, lowpassed to taste, then combed by pick position.
  // The comb is why a bridge pluck is nasal and a soundhole pluck is round.
  const pickDelay = Math.max(1, Math.round(L * pick));
  const exc = new Float64Array(L + 2);
  let lp = 0;
  for (let i = 0; i < L; i++) {
    const nz = rng();
    lp += bright * (nz - lp);
    exc[i] = lp;
  }
  for (let i = L - 1; i >= pickDelay; i--) exc[i] -= exc[i - pickDelay] * 0.85;
  let peak = 0;
  for (let i = 0; i < L; i++) peak = Math.max(peak, Math.abs(exc[i]));
  if (peak > 0) for (let i = 0; i < L; i++) line[i] = exc[i] / peak;

  // Loop gain from the requested decay, corrected for the loop filter's own
  // loss so a short string and a long string decay in the same MUSICAL time.
  const effDecay = mute ? Math.min(decay, 0.16 + 0.5 * (1 - mute)) : decay;
  // Loop gain for the requested RT60 — COMPENSATED for the loop filter's own
  // loss at the fundamental. Without this the damping term doubles as a decay
  // term, so a dark string (high damp) also dies twice as fast as asked, and
  // "nylon" and "steel" end up differing in length rather than in colour.
  const a = 1 - damp, w = TAU * fr / SR;
  const hMag = a / Math.sqrt(1 - 2 * (1 - a) * Math.cos(w) + (1 - a) * (1 - a));
  const g = Math.min(0.99995, Math.pow(10, -3 / (effDecay * fr)) / Math.max(0.05, hMag));
  // First-order allpass for the fractional sample: H(z) = (c + z⁻¹)/(1 + c z⁻¹)
  // with c = (1-d)/(1+d). Without it the string is quantised to an integer
  // period and every note is a few cents sharp — audibly out of tune up top.
  const c = (1 - frac) / (1 + frac);
  let apX = 0, apY = 0, lpState = 0, idx = 0, envPk = 1;
  const hardStop = dur ? start + Math.floor((dur + 0.12) * SR) : N;
  const stopFrom = dur ? start + Math.floor(dur * SR) : N;
  for (let i = start; i < Math.min(N, hardStop); i++) {
    const y = line[idx];
    buf[i] += y * A;
    // one-pole lowpass in the feedback path = string + finger losses
    lpState += (1 - damp) * (y - lpState);
    let v = lpState * g;
    const apOut = c * v + apX - c * apY;
    apX = v; apY = apOut;
    v = apOut;
    if (i >= stopFrom) v *= 0.984;   // the fretting hand lifts: a fast damp
    line[idx] = v;
    idx = idx + 1 >= L ? 0 : idx + 1;
    // Peak-follower cutoff. Testing |v| directly would exit on a zero
    // crossing and truncate a still-ringing string mid-cycle.
    const a = Math.abs(v);
    envPk = a > envPk ? a : envPk * 0.99995;
    if (envPk < 2e-6) break;
  }
}

/** Nylon-string voicing (soft pick, dark loop) — the default "guitar". */
export const nylon = (buf, t0, f, amp, rng, o = {}) =>
  pluck(buf, t0, f, amp, rng, { decay: 2.6, damp: 0.55, pick: 0.28, bright: 0.35, ...o });
/** Steel-string voicing (harder pick, brighter loop). */
export const steel = (buf, t0, f, amp, rng, o = {}) =>
  pluck(buf, t0, f, amp, rng, { decay: 4.2, damp: 0.30, pick: 0.16, bright: 0.7, ...o });
/** Upright/electric bass — long, dark, fundamental-heavy. */
export const bass = (buf, t0, f, amp, rng, o = {}) =>
  pluck(buf, t0, f, amp, rng, { decay: 3.0, damp: 0.74, pick: 0.12, bright: 0.20, ...o });

/** A strum: one pluck per string, spread by a human-scale delay, with the
 *  down/up direction reversing the order and the accent. */
export function strum(buf, t0, freqs, amp, rng, opts = {}) {
  const { spread = 0.018, up = false, voice = nylon, ...rest } = opts;
  const order = up ? [...freqs].reverse() : freqs;
  order.forEach((f, i) => {
    const jitter = spread * 0.18 * rng();
    const a = amp * (up ? 0.8 + 0.05 * i : 1 - 0.045 * i);
    voice(buf, t0 + i * spread + jitter, f, a, rng, rest);
  });
}

/**
 * PIANO. Inharmonic partials, per-partial decay, double decay, two detuned
 * strings that BEAT, a hammer thump, and a damper on release.
 * opts: { sustain, hammer, B, strings }
 */
export function piano(buf, t0, dur, f, amp, rng, opts = {}) {
  const { sustain = false, hammer = 0.8, hard = 0.5 } = opts;
  const N = buf.length;
  const start = Math.max(0, Math.floor(t0 * SR));
  if (start >= N) return;
  // Inharmonicity rises steeply in the treble and is tiny in the bass — this
  // single coefficient is most of the difference between "piano" and "organ".
  const B = 0.00008 * Math.pow(f / 110, 1.35) + 0.00002;
  const nPart = Math.max(6, Math.min(18, Math.floor(9000 / f)));
  // Longer strings ring longer; the whole note also gets a hard stop when the
  // damper falls (unless the sustain pedal is down).
  const baseDecay = 1.6 + 620 / f;
  const relStart = sustain ? 1e9 : t0 + dur;
  const relLen = 0.16;

  for (let str = 0; str < 2; str++) {
    // ~1.2 cents apart: slow enough to hear as warmth, not as out of tune.
    const dt = str === 0 ? -0.0007 : 0.0007;
    for (let k = 1; k <= nPart; k++) {
      const fk = k * f * Math.sqrt(1 + B * k * k) * (1 + dt);
      if (fk > 18000) break;
      // partial amplitude: hammer hardness tilts the spectrum
      const ak = Math.pow(k, -(1.35 - hard * 0.45)) * (k % 7 === 0 ? 0.55 : 1);
      if (ak < 0.0009) break;
      const dk = baseDecay / (1 + (k - 1) * 0.42);   // highs die first
      const dFast = dk * 0.22;                        // the double decay
      let ph = rng() * 0.4;
      const step = TAU * fk / SR;
      for (let i = start; i < N; i++) {
        const t = (i - start) / SR;
        let e = 0.62 * Math.exp(-t / dk) + 0.38 * Math.exp(-t / dFast);
        if (i / SR > relStart) e *= Math.max(0, 1 - (i / SR - relStart) / relLen);
        e *= ak;
        if (e < 0.00025) break;
        ph += step;
        buf[i] += Math.sin(ph) * e * amp * TRIM.piano * 0.5;
      }
    }
  }
  // Hammer/key noise: a short filtered thump. Without it the attack is a pop.
  if (hammer) {
    const hc = biquad('bp', Math.max(700, Math.min(4200, f * 5)), 0.8);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const hn = Math.floor(0.05 * SR);
    for (let i = 0; i < hn && start + i < N; i++) {
      const t = i / SR;
      const nz = rng();
      const y = hc.b0 * nz + hc.b1 * x1 + hc.b2 * x2 - hc.a1 * y1 - hc.a2 * y2;
      x2 = x1; x1 = nz; y2 = y1; y1 = y;
      buf[start + i] += y * Math.exp(-t * 120) * amp * TRIM.piano * 0.35;
    }
  }
}

/** A bowed/sustained pad — string section stand-in. Many detuned voices with
 *  independent slow drift, which is why it does not phase like a chorus. */
export function strings(buf, t0, dur, f, amp, rng, opts = {}) {
  const { voices = 7, spread = 0.006, atk = 0.55, rel = 1.1, bright = 0.5 } = opts;
  const N = buf.length;
  const start = Math.max(0, Math.floor(t0 * SR));
  const end = Math.min(N, Math.floor((t0 + dur + rel) * SR));
  const env = swell(atk, Math.max(0, dur - atk), rel);
  const H = [1, 0.5, 0.34, 0.2, 0.13, 0.08, 0.05].map((h, i) => h * Math.pow(bright + 0.5, i * 0.4));
  for (let v = 0; v < voices; v++) {
    const det = 1 + spread * (v - (voices - 1) / 2) / Math.max(1, (voices - 1) / 2) * (0.6 + 0.4 * Math.abs(rng()));
    const drRate = 0.13 + 0.09 * v, drPh = rng() * TAU, drAmt = 0.0014;
    const gain = (1 / voices) * (v === 0 ? 1.4 : 1);
    const ph = new Float64Array(H.length);
    for (let i = start; i < end; i++) {
      const t = (i - start) / SR;
      const e = env(t);
      if (e <= 0 && t > dur) break;
      const fr = f * det * (1 + drAmt * Math.sin(TAU * drRate * t + drPh));
      let s = 0;
      for (let k = 0; k < H.length; k++) {
        ph[k] += (TAU * fr * (k + 1)) / SR;
        s += H[k] * Math.sin(ph[k]);
      }
      buf[i] += s * e * amp * TRIM.strings * gain * 0.35;
    }
  }
}

// ── percussion ──────────────────────────────────────────────────────────────
export function kick(buf, t0, amp, rng, opts = {}) {
  const { f0 = 150, f1 = 46, drop = 22, decay = 7.5, click = 0.3, body = 1 } = opts;
  const N = buf.length, start = Math.max(0, Math.floor(t0 * SR));
  let ph = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * drop);
    ph += TAU * f / SR;
    const e = Math.exp(-t * decay) * amp;
    if (e < 0.0003) break;
    buf[i] += ((Math.sin(ph) + 0.28 * Math.sin(2 * ph)) * e * body
      + Math.exp(-t * 190) * amp * click * (rng() * 0.6 + Math.sin(TAU * 1600 * t) * 0.4)) * TRIM.kick;
  }
}
export function snare(buf, t0, amp, rng, opts = {}) {
  const { tone = 190, decay = 16, noiseDecay = 13, bright = 3400, rim = 0.3 } = opts;
  const N = buf.length, start = Math.max(0, Math.floor(t0 * SR));
  const c = biquad('bp', bright, 0.7);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, p1 = 0, p2 = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const en = Math.exp(-t * noiseDecay), et = Math.exp(-t * decay);
    if (en < 0.0004 && et < 0.0004) break;
    const nz = rng();
    const y = c.b0 * nz + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = nz; y2 = y1; y1 = y;
    p1 += TAU * tone / SR; p2 += TAU * tone * 1.58 / SR;   // two drum modes
    buf[i] += (y * 1.7 * en + (Math.sin(p1) * 0.6 + Math.sin(p2) * 0.4) * et * rim) * amp * TRIM.snare;
  }
}
export function hat(buf, t0, amp, rng, opts = {}) {
  const { open = false, f = 8200, decay = open ? 9 : 46 } = opts;
  const N = buf.length, start = Math.max(0, Math.floor(t0 * SR));
  const c = biquad('hp', f, 0.6);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const e = Math.exp(-t * decay) * amp;
    if (e < 0.0004) break;
    const nz = rng();
    const y = c.b0 * nz + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = nz; y2 = y1; y1 = y;
    buf[i] += y * e * 1.5 * TRIM.hat;
  }
}
/** Shaker/brush — a soft noise swell, not a click. Reads as a human hand. */
export function shaker(buf, t0, amp, rng, opts = {}) {
  const { rise = 0.012, fall = 0.075, f = 6200 } = opts;
  const N = buf.length, start = Math.max(0, Math.floor(t0 * SR));
  const c = biquad('bp', f, 0.5);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const len = Math.floor((rise + fall) * SR);
  for (let i = 0; i < len && start + i < N; i++) {
    const t = i / SR;
    const e = t < rise ? t / rise : Math.max(0, 1 - (t - rise) / fall);
    const nz = rng();
    const y = c.b0 * nz + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = nz; y2 = y1; y1 = y;
    buf[start + i] += y * e * e * amp * 1.6 * TRIM.shaker;
  }
}
/** Ride/crash cymbal — inharmonic mode cluster, long shimmer. */
export function cymbal(buf, t0, amp, rng, opts = {}) {
  const { decay = 2.6, f = 520, modes = 9, crash = false } = opts;
  const N = buf.length, start = Math.max(0, Math.floor(t0 * SR));
  const ratios = [1, 1.41, 1.93, 2.61, 3.17, 4.09, 5.43, 6.71, 8.37];
  for (let m = 0; m < modes; m++) {
    const fm = f * ratios[m % ratios.length] * (1 + 0.02 * rng());
    let ph = rng() * TAU;
    const dm = decay / (1 + m * 0.25);
    for (let i = start; i < N; i++) {
      const t = (i - start) / SR;
      const e = Math.exp(-t / dm) * amp * (0.5 / (1 + m * 0.5));
      if (e < 0.0003) break;
      ph += TAU * fm / SR;
      buf[i] += Math.sin(ph) * e * TRIM.cymbal;
    }
  }
  if (crash) {
    const c = biquad('hp', 4000, 0.6);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = start; i < N; i++) {
      const t = (i - start) / SR;
      const e = Math.exp(-t * 2.2) * amp * 0.5;
      if (e < 0.0003) break;
      const nz = rng();
      const y = c.b0 * nz + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1; x1 = nz; y2 = y1; y1 = y;
      buf[i] += y * e * TRIM.cymbal;
    }
  }
}

// ── the room: an 8-line FDN reverb ──────────────────────────────────────────
// Dry synthesis in a dead room is the second reason the first suite sounded
// synthetic. Every channel gets a DIFFERENT linear combination of the delay
// lines, so the tail is genuinely decorrelated around the room instead of one
// stereo reverb copied to six speakers.
const FDN_LEN = [1123, 1291, 1523, 1787, 2003, 2311, 2683, 3079];
// Injection signs — each line is fed the same send bus, so without this they
// start life perfectly correlated and only the differing lengths pull them
// apart.
const FDN_IN = [1, -1, 1, -1, 1, -1, 1, -1];
// Output taps: 7 channels x 8 lines.
//
// 🔴 THESE ARE STRUCTURALLY MIRRORED, NOT ARBITRARY. The lines are paired by
// length — (0,1) (2,3) (4,5) (6,7) — and every LEFT channel uses the same sign
// pattern over the even member of three pairs that its RIGHT partner uses over
// the odd member. That is what makes the tail balanced.
//
// The first version used hand-picked sign patterns and measured an 8.3 dB gap
// between BL and BR on `boulevard`, whose sources all sit left of centre. The
// lines are NOT independent — they share an input and the Householder couples
// them — so two different ±1 combinations of them have genuinely different
// magnitudes. Pairing the rows structurally removes the question.
const FDN_MIX = [
  [1, 0, -1, 0, 1, 0, 0, 0],   // FL  — lines 0,2,4
  [0, 1, 0, -1, 0, 1, 0, 0],   // FR  — lines 1,3,5   (mirror of FL)
  [0.87, 0.87, 0, 0, 0, 0, 0.87, 0.87], // C — 0,1,6,7, both sides, scaled to match
  [0, 0, 1, 0, 1, 0, -1, 0],   // SL  — lines 2,4,6
  [0, 0, 0, 1, 0, 1, 0, -1],   // SR  — lines 3,5,7   (mirror of SL)
  [1, 0, 0, 0, -1, 0, 1, 0],   // BL  — lines 4,6,0
  [0, 1, 0, 0, 0, -1, 0, 1],   // BR  — lines 5,7,1   (mirror of BL)
];
/** Render a mono send bus into 7 decorrelated channel tails. */
export function reverb(send, opts = {}) {
  const { rt60 = 1.9, damp = 0.34, preDelay = 0.021, width = 1 } = opts;
  const N = send.length;
  const out = FDN_MIX.map(() => new Float64Array(N));
  const lines = FDN_LEN.map((L) => new Float64Array(L + 4));
  const idx = new Array(8).fill(0);
  const lpS = new Float64Array(8);
  const g = FDN_LEN.map((L) => Math.pow(10, -3 * L / (SR * rt60)));
  const pd = Math.floor(preDelay * SR);
  const v = new Float64Array(8);
  // slow modulation of the read point, one rate per line, kills metallic ring
  const modRate = [0.11, 0.13, 0.17, 0.19, 0.23, 0.29, 0.31, 0.37];
  for (let i = 0; i < N; i++) {
    const x = i >= pd ? send[i - pd] : 0;
    let sum = 0;
    for (let k = 0; k < 8; k++) {
      const L = FDN_LEN[k];
      const mod = 1.6 * Math.sin(TAU * modRate[k] * i / SR);
      let rp = idx[k] + mod;
      while (rp < 0) rp += L;
      while (rp >= L) rp -= L;
      const i0 = Math.floor(rp), fr = rp - i0, i1 = (i0 + 1) % L;
      v[k] = lines[k][i0] * (1 - fr) + lines[k][i1] * fr;
      sum += v[k];
    }
    const h = sum * 0.25;   // Householder: out = v - (2/8)·Σv
    for (let k = 0; k < 8; k++) {
      let w = v[k] - h;
      lpS[k] += (1 - damp) * (w - lpS[k]);
      w = lpS[k] * g[k] + x * 0.30 * FDN_IN[k];
      lines[k][idx[k]] = w;
      idx[k] = idx[k] + 1 >= FDN_LEN[k] ? 0 : idx[k] + 1;
    }
    for (let c = 0; c < 7; c++) {
      const M = FDN_MIX[c];
      let s = 0;
      for (let k = 0; k < 8; k++) s += M[k] * v[k];
      out[c][i] = s * 0.13 * (c >= 3 ? width : 1);
    }
  }
  return out;   // [FL, FR, C, SL, SR, BL, BR]
}

// ── the session: tracks, placement, mixdown ─────────────────────────────────
// 7.1 speaker azimuths in degrees, 0 = dead ahead, positive = to the right.
const SPK = [
  { key: 'FL', az: -30 }, { key: 'FR', az: 30 }, { key: 'C', az: 0 },
  { key: 'SL', az: -90 }, { key: 'SR', az: 90 },
  { key: 'BL', az: -150 }, { key: 'BR', az: 150 },
];
const CH = { FL: 0, FR: 1, C: 2, SL: 3, SR: 4, BL: 5, BR: 6 };

/** Constant-power gains for one source azimuth across the 7 speakers.
 *  Pairwise VBAP: the two speakers that bracket the angle share the energy. */
function panGains(az, centreBias = 0) {
  const g = new Float64Array(7);
  // Wrap the source into [-150, 210) so one ordered ring covers the full circle
  // INCLUDING the gap directly behind the listener (150° → 210° = -150°).
  let a = ((az + 150) % 360 + 360) % 360 - 150;
  const ring = [
    [CH.BL, -150], [CH.SL, -90], [CH.FL, -30],
    [CH.FR, 30], [CH.SR, 90], [CH.BR, 150], [CH.BL, 210],
  ];
  for (let k = 0; k < ring.length - 1; k++) {
    const [li, la] = ring[k], [hi, ha] = ring[k + 1];
    if (a >= la && a <= ha) {
      const u = (a - la) / (ha - la);
      g[li] += Math.cos(u * Math.PI / 2);
      g[hi] += Math.sin(u * Math.PI / 2);
      break;
    }
  }
  if (centreBias > 0) {
    // Anchor a lead partly in the centre speaker — dialogue-style, so it stays
    // put when the listener is off-axis. The rest is scaled to hold power.
    const s = Math.sqrt(Math.max(0, 1 - centreBias * centreBias));
    for (let i = 0; i < 7; i++) g[i] *= s;
    g[CH.C] += centreBias;
  }
  let p = 0;
  for (let i = 0; i < 7; i++) p += g[i] * g[i];
  if (p > 0) { const k = 1 / Math.sqrt(p); for (let i = 0; i < 7; i++) g[i] *= k; }
  return g;
}

export function createSession({ dur, tempo = 100, seed = 1, reverb: rv = {} }) {
  const N = Math.round(SR * dur);
  const beat = 60 / tempo;
  const S = {
    N, dur, SR, tempo, beat, bar: beat * 4,
    rng: makeRng(seed),
    tracks: [],
    rv: { rt60: 1.9, damp: 0.34, preDelay: 0.021, width: 1, ...rv },
    /** Beats → seconds. b(4) is one 4/4 bar. */
    b: (n) => n * beat,
    /** Bars → seconds. */
    m: (n) => n * beat * 4,
    /**
     * A mono track with a place in the room.
     *  az        — degrees, 0 ahead, -90 hard left, ±150 behind.
     *  centre    — 0..1, anchor this much of it in the centre speaker.
     *  send      — reverb send level.
     *  body      — a BODY.* resonance bank applied once to the whole track.
     *  spread    — >0 places a delayed, quieter twin at az±spread (Haas width).
     *  pair      — also place the material at the MIRROR azimuth (-az). Use for
     *              anything meant to surround the listener; without it an
     *              off-centre track leaves a hole on the opposite side.
     *  hp / lp   — corrective filtering, in Hz.
     */
    track(name, opts = {}) {
      const t = {
        name, buf: new Float64Array(N), az: 0, centre: 0, send: 0.18,
        gain: 1, body: null, bodyDry: 0.55, spread: 0, pair: false,
        hp: 0, lp: 0, ...opts,
      };
      S.tracks.push(t);
      return t;
    },
  };
  return S;
}

/** Render every track into 7 channels + LFE. Returns [FL,FR,C,LFE,SL,SR,BL,BR]. */
export function mix(S, opts = {}) {
  const { drive = 1.25, peakTarget = 0.94, lfeGain = 0.5, lfeCut = 85, loudness = -17 } = opts;
  const N = S.N;
  const ch = Array.from({ length: 7 }, () => new Float64Array(N));
  const send = new Float64Array(N);

  for (const t of S.tracks) {
    const buf = t.buf;
    if (t.body) runBody(buf, t.body, t.bodyDry);
    if (t.hp) runBiquad(buf, biquad('hp', t.hp, 0.707));
    if (t.lp) runBiquad(buf, biquad('lp', t.lp, 0.707));

    // A track resolves to one or more PLACEMENTS: {az, delaySamples, gain}.
    //  spread — a delayed twin either side of az. The precedence effect keeps
    //           the image where the FIRST arrival is, so the source widens
    //           without smearing.
    //  pair   — the same material also at the MIRROR azimuth. A pad written to
    //           a single off-centre track lands entirely in one surround: the
    //           first ivory render measured SL at -38 dB against SR at -24 dB,
    //           which is a 14 dB hole on the listener's left. Anything meant to
    //           envelop must be placed symmetrically, and this is how.
    let places = [{ az: t.az, d: 0, g: 1 }];
    if (t.spread) {
      places = [
        { az: t.az - t.spread, d: 0, g: 1 },
        { az: t.az + t.spread, d: Math.floor(0.009 * SR), g: 0.72 },
      ];
    }
    if (t.pair) {
      places = places.flatMap((pl, i) => [
        pl,
        { az: -pl.az, d: pl.d + Math.floor((0.011 + i * 0.004) * SR), g: pl.g * 0.88 },
      ]);
    }
    // Hold total power constant however many placements a track resolves to,
    // so `pair` and `spread` change the IMAGE and never the level.
    let pw = 0;
    for (const pl of places) pw += pl.g * pl.g;
    const norm = t.gain / Math.sqrt(pw);

    for (const pl of places) {
      const g = panGains(pl.az, t.centre);
      const a = pl.g * norm;
      for (let i = pl.d; i < N; i++) {
        const x = buf[i - pl.d] * a;
        if (x === 0) continue;
        for (let c = 0; c < 7; c++) ch[c][i] += g[c] * x;
        send[i] += x * t.send;
      }
    }
  }

  const tail = reverb(send, S.rv);
  for (let c = 0; c < 7; c++) for (let i = 0; i < N; i++) ch[c][i] += tail[c][i];

  // LFE by bass management: an 85 Hz lowpass of the full mix, not a synth part.
  const lfe = new Float64Array(N);
  const lc1 = biquad('lp', lfeCut, 0.707), lc2 = biquad('lp', lfeCut, 0.707);
  for (let i = 0; i < N; i++) lfe[i] = ch[0][i] + ch[1][i] + ch[2][i] + ch[3][i] + ch[4][i] + ch[5][i] + ch[6][i];
  runBiquad(lfe, lc1); runBiquad(lfe, lc2);
  for (let i = 0; i < N; i++) lfe[i] *= lfeGain;

  // Master: gentle saturation, top-and-tail fade, then LOUDNESS MATCHING.
  const all = [ch[0], ch[1], ch[2], lfe, ch[3], ch[4], ch[5], ch[6]];
  for (const c of all) {
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const fade = Math.min(1, t / 0.03) * Math.min(1, (S.dur - t) / 0.45);
      c[i] = Math.tanh(c[i] * drive) * fade;
    }
  }

  // 🔴 MATCH ON RMS, NOT ON PEAK. Peak-normalising every piece to the same
  // ceiling makes a transient-heavy arrangement quiet: `harbour` (strums and
  // drum hits) measured 8 dB below `ridge` (sustained flute) with both peaking
  // at 0.92, because its crest factor is far higher. Played one after another
  // that is the listener reaching for the volume knob between tracks.
  // So: scale to a target RMS, soft-limit whatever that pushes over, and only
  // then peak-normalise. `master.loudness` shifts one piece deliberately —
  // `lantern` is meant to sit below the rest.
  let sum = 0;
  for (const c of all) for (let i = 0; i < N; i++) sum += c[i] * c[i];
  const cur = Math.sqrt(sum / (all.length * N));
  const want = Math.pow(10, loudness / 20);
  const lift = cur > 1e-6 ? want / cur : 1;

  // A soft knee above 0.70: below it nothing is touched, above it the curve
  // bends so a peak can never reach 1.0 however hard it is driven.
  const KNEE = 0.70;
  const limit = (x) => {
    const a = Math.abs(x);
    if (a <= KNEE) return x;
    const over = (a - KNEE) / (1 - KNEE);
    return Math.sign(x) * (KNEE + (1 - KNEE) * Math.tanh(over));
  };
  let peak = 0;
  for (const c of all) {
    for (let i = 0; i < N; i++) {
      c[i] = limit(c[i] * lift);
      const a = Math.abs(c[i]);
      if (a > peak) peak = a;
    }
  }
  // Shared gain so the channel BALANCE survives — per-channel normalising
  // would move the image.
  const g = peak > 0 ? Math.min(peakTarget / peak, 1 / Math.max(peak, 1e-9)) : 1;
  for (const c of all) for (let i = 0; i < N; i++) c[i] *= g;
  return all;   // FL FR C LFE SL SR BL BR  (WAV 7.1 channel order)
}

/** 7.1 → 5.1: the back pair folds into the sides (ITU-style, -3 dB). */
export function fold51(ch8) {
  const [FL, FR, C, LFE, SL, SR, BL, BR] = ch8;
  const N = FL.length;
  const sl = new Float64Array(N), sr = new Float64Array(N);
  for (let i = 0; i < N; i++) { sl[i] = SL[i] + BL[i] * 0.707; sr[i] = SR[i] + BR[i] * 0.707; }
  return normalise([FL, FR, C, LFE, sl, sr]);
}
/** 7.1 → stereo, ITU-R BS.775 downmix. This is the file for phones and PCs. */
export function fold2(ch8) {
  const [FL, FR, C, LFE, SL, SR, BL, BR] = ch8;
  const N = FL.length;
  const L = new Float64Array(N), R = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = FL[i] + 0.707 * C[i] + 0.707 * (SL[i] + BL[i] * 0.707) + 0.35 * LFE[i];
    R[i] = FR[i] + 0.707 * C[i] + 0.707 * (SR[i] + BR[i] * 0.707) + 0.35 * LFE[i];
  }
  return normalise([L, R]);
}
function normalise(chs, target = 0.94) {
  let peak = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  if (peak > target) { const g = target / peak; for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g; }
  return chs;
}

// ── WAV writing (24-bit; AC-3/E-AC-3 encode from this, so keep the headroom) ─
export function writeWav(path, chs, sr = SR) {
  const nc = chs.length, N = chs[0].length, bps = 3;
  const block = nc * bps;
  const data = Buffer.alloc(N * block);
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < nc; c++) {
      let v = Math.max(-1, Math.min(1, chs[c][i]));
      v = Math.round(v * 8388607);
      const o = i * block + c * bps;
      data[o] = v & 0xff; data[o + 1] = (v >> 8) & 0xff; data[o + 2] = (v >> 16) & 0xff;
    }
  }
  // WAVE_FORMAT_EXTENSIBLE — required for >2 channels to carry a channel MASK,
  // without which players guess the speaker order and the centre lands wrong.
  const MASKS = { 1: 0x4, 2: 0x3, 6: 0x3F, 8: 0x63F };
  const mask = MASKS[nc] ?? 0;
  const fmtLen = 40;
  const hdr = Buffer.alloc(12 + 8 + fmtLen + 8);
  let p = 0;
  hdr.write('RIFF', p); p += 4;
  hdr.writeUInt32LE(4 + 8 + fmtLen + 8 + data.length, p); p += 4;
  hdr.write('WAVE', p); p += 4;
  hdr.write('fmt ', p); p += 4;
  hdr.writeUInt32LE(fmtLen, p); p += 4;
  hdr.writeUInt16LE(0xFFFE, p); p += 2;             // extensible
  hdr.writeUInt16LE(nc, p); p += 2;
  hdr.writeUInt32LE(sr, p); p += 4;
  hdr.writeUInt32LE(sr * block, p); p += 4;
  hdr.writeUInt16LE(block, p); p += 2;
  hdr.writeUInt16LE(bps * 8, p); p += 2;
  hdr.writeUInt16LE(22, p); p += 2;                 // cbSize
  hdr.writeUInt16LE(bps * 8, p); p += 2;            // valid bits
  hdr.writeUInt32LE(mask, p); p += 4;               // channel mask
  // KSDATAFORMAT_SUBTYPE_PCM
  Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,
    0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71]).copy(hdr, p); p += 16;
  hdr.write('data', p); p += 4;
  hdr.writeUInt32LE(data.length, p); p += 4;
  writeFileSync(path, Buffer.concat([hdr, data]));
  return path;
}

export const FFMPEG = process.env.LOCALAPPDATA
  + '/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe';
