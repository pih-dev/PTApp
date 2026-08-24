// ─── The Showcase Suite: five 25-second pieces (v2.31) ───────────────────────
//
// Pierre: "are you going to maestro a full piece? Create full pieces, punchy,
// catchy… 4 or 5 pieces, I can listen on PC and choose one, or we can have
// them shuffle." So: five COMPOSITIONS, not loops. Every one opens with the
// exact approved 3-second opening (the two hits the figures land on), then
// goes its own way; every one resolves into a final hit and a loop-clean tail
// at ~25.2s. All deterministic — same bytes every run.
//
// Pieces: anthem (cinematic journey) · engine (punchy driver) · arena
// (THX-style converging voices) · pulse (heartbeat + braams) · orbit
// (catchy pluck motif). Output: tmp/suite/opening-<name>.wav, and m4a into
// public/ when ffmpeg is available (it is, since v2.31 — winget Gyan.FFmpeg).
import { writeFileSync, mkdirSync } from 'node:fs';
import { SCORE } from './lib/suite1-score.mjs';
import { execFileSync } from 'node:child_process';

const SR = 44100, DUR = 25.2, N = Math.round(SR * DUR);
const TAU = 2 * Math.PI;

// ── toolkit ──────────────────────────────────────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
}
const clampT = (i) => Math.max(0, Math.min(N - 1, i));

// A percussive bass hit (the opening's own kick, reusable everywhere).
function kick(L, R, t0, f0, f1, decay, amp, rng) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * 18);
    ph += (TAU * f) / SR;
    const e = Math.exp(-t * decay) * amp;
    if (e < 0.0004) break;
    const s = (Math.sin(ph) + 0.55 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) * e
      + Math.exp(-t * 70) * amp * 0.35 * Math.sin(TAU * 900 * t)
      + (rng ? Math.exp(-t * 35) * amp * 0.25 * (rng() * 0.5) : 0);
    L[i] += s; R[i] += s;
  }
}

// A tone with harmonics, envelope and per-channel detune. envFn(t)∈[0,1].
function tone(L, R, t0, dur, f, ampL, ampR, dL, dR, envFn, harm = [1, 0.35]) {
  const start = Math.floor(t0 * SR), end = clampT(Math.floor((t0 + dur) * SR));
  let phL = 0, phR = 0;
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const e = envFn(t);
    phL += (TAU * (f + dL)) / SR; phR += (TAU * (f + dR)) / SR;
    let sL = 0, sR = 0;
    for (let k = 0; k < harm.length; k++) {
      sL += harm[k] * Math.sin((k + 1) * phL);
      sR += harm[k] * Math.sin((k + 1) * phR);
    }
    L[i] += sL * e * ampL; R[i] += sR * e * ampR;
  }
}
const adsr = (a, h, r) => (t) => t < a ? t / a : t < a + h ? 1 : Math.max(0, 1 - (t - a - h) / r);

// Saw-ish stack (braams, stabs): harmonics 1..7 at 1/k.
const SAW = [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14];

// A pluck: bright attack decaying fast, slight inharmonic shimmer on top.
function pluck(L, R, t0, f, amp, pan) {
  const start = Math.floor(t0 * SR);
  let ph = 0, ph2 = 0;
  const aL = amp * (1 - pan) * 0.5 + amp * 0.5, aR = amp * (1 + pan) * 0.5 + amp * 0.5;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const e = Math.exp(-t * 6.5);
    if (e < 0.0005) break;
    ph += (TAU * f) / SR; ph2 += (TAU * f * 2.01) / SR;
    const s = (Math.sin(ph) + 0.4 * Math.sin(ph2) * Math.exp(-t * 14)) * e;
    L[i] += s * aL * 0.5; R[i] += s * aR * 0.5;
  }
}

// A bell ping (inharmonic partials).
function bell(L, R, t0, f, amp, pan) {
  const start = Math.floor(t0 * SR);
  const parts = [[1, 1], [2.76, 0.5], [5.4, 0.22]];
  for (const [m, a] of parts) {
    let ph = 0;
    for (let i = start; i < N; i++) {
      const t = (i - start) / SR;
      const e = Math.exp(-t * (3 + m)) * amp * a;
      if (e < 0.0004) break;
      ph += (TAU * f * m) / SR;
      const s = Math.sin(ph) * e;
      L[i] += s * (1 - pan * 0.5); R[i] += s * (1 + pan * 0.5);
    }
  }
}

// A metallic "disc" tick — Pierre's fix for the sandpaper hats: pitched
// inharmonic partials, not noise. hi=true is the ride tick, false the mid hit.
function disc(L, R, t0, amp, pan, hi = true) {
  const start = Math.floor(t0 * SR);
  const parts = hi ? [[6200, 1], [6870, 0.7], [9300, 0.4]] : [[2800, 1], [3730, 0.7], [520, 0.5]];
  const dec = hi ? 30 : 16;
  for (const [f, a] of parts) {
    let ph = 0;
    for (let i = start; i < N; i++) {
      const t = (i - start) / SR;
      const e = Math.exp(-t * dec) * amp * a;
      if (e < 0.0004) break;
      ph += (TAU * f) / SR;
      const sgn = Math.sin(ph) * e;
      L[i] += sgn * (1 - pan * 0.5); R[i] += sgn * (1 + pan * 0.5);
    }
  }
}

// A water drop: the fast upward chirp then the ring — the real plink shape.
function drop(L, R, t0, f0, amp, pan) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = start; i < N; i++) {
    const t = (i - start) / SR;
    const f = f0 * (1 + 0.9 * Math.min(1, t / 0.02));   // chirp up over 20ms
    ph += (TAU * f) / SR;
    const e = Math.exp(-t * 9) * amp;
    if (e < 0.0004) break;
    const sgn = (Math.sin(ph) + 0.25 * Math.sin(2.01 * ph)) * e;
    L[i] += sgn * (1 - pan * 0.5); R[i] += sgn * (1 + pan * 0.5);
  }
}

// A singing melodic voice: vibrato + soft attack — for the maqam line.
function voice(L, R, t0, dur, f, amp, pan, vib = 5.5) {
  const start = Math.floor(t0 * SR), end = clampT(Math.floor((t0 + dur) * SR));
  let ph = 0;
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const e = adsr(0.05, Math.max(0.01, dur - 0.25), 0.2)(t);
    ph += (TAU * f * (1 + 0.007 * Math.sin(TAU * vib * t) * Math.min(1, t / 0.25))) / SR;
    const sgn = (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * e * amp;
    L[i] += sgn * (1 - pan * 0.5); R[i] += sgn * (1 + pan * 0.5);
  }
}

// Cents off a root — the quarter-tone kernel (350 = the neutral third).
const cents = (root, c) => root * Math.pow(2, c / 1200);

// A clean tonal riser (Pierre's fix for the sandpaper "wish"): staggered
// octave glissandi, no noise.
function riserTones(L, R, t0, t1, fLo, fHi, amp) {
  for (let v = 0; v < 4; v++) {
    const vt0 = t0 + v * 0.35, dur = t1 - vt0;
    if (dur <= 0.2) continue;
    const start = Math.floor(vt0 * SR), end = clampT(Math.floor(t1 * SR));
    let ph = 0;
    for (let i = start; i < end; i++) {
      const t = (i - start) / SR, u = t / dur;
      const f = fLo * Math.pow(fHi / fLo, u) * (1 + v * 0.002);
      ph += (TAU * f) / SR;
      const e = Math.pow(u, 1.6) * amp * (1 - v * 0.18);
      const sgn = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * e;
      L[i] += sgn * (v % 2 ? 1.15 : 0.85); R[i] += sgn * (v % 2 ? 0.85 : 1.15);
    }
  }
}

// Square-ish chip voice for cascade: odd harmonics.
const SQ = [1, 0, 0.33, 0, 0.2, 0, 0.14];

// Filtered-noise swell between t0..t1 (shimmer / riser).
function noiseSwell(L, R, t0, t1, amp, rng, rise = true) {
  const start = Math.floor(t0 * SR), end = clampT(Math.floor(t1 * SR));
  let lpL = 0, lpR = 0;
  for (let i = start; i < end; i++) {
    const u = (i - start) / (end - start);
    const e = (rise ? Math.pow(u, 2.2) : Math.sin(Math.PI * u)) * amp;
    lpL += (0.06 + 0.3 * u) * (rng() - lpL);
    lpR += (0.06 + 0.3 * u) * (rng() - lpR);
    L[i] += lpL * e * 2.6; R[i] += lpR * e * 2.6;
  }
}

// Orbit's ducked pad. Lifted out of the piece body so the ONE raw oscillator
// written inline in a score has a voice-table entry like everything else —
// otherwise it would survive a voice swap and stay synthetic. Maths unchanged.
function pad(L, R, t0, t1, f, a, B) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = start; i < Math.floor(t1 * SR); i++) {
    const t = (i - start) / SR;
    ph += (TAU * f) / SR;
    const duck = 1 - 0.35 * Math.exp(-((t % B) / 0.09));
    const e = Math.min(1, t / 1.5) * duck * a;
    const s = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * e;
    L[i] += s * 0.9; R[i] += s * 1.1;
  }
}

// The synthetic voice table — the oscillators this suite shipped with.
const V = {
  makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
  riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU,
};

// ── the approved opening, verbatim shape (0–3s) ─────────────────────────────
function opening(L, R, rng) {
  // riser into the first hit
  {
    let lp = 0;
    const end = Math.floor(0.35 * SR);
    for (let i = 0; i < end; i++) {
      const t = i / SR;
      const e = Math.pow(t / 0.35, 2.5) * 0.09;
      lp += 0.18 * (rng() - lp);
      const s = lp * e * 3 + Math.sin(TAU * (300 + 900 * t / 0.35) * t) * e * 0.25;
      L[i] += s * 0.8; R[i] += s * 1.2;
    }
  }
  kick(L, R, 0.35, 160, 52, 9.5, 0.5, rng);
  kick(L, R, 0.85, 110, 36, 4.2, 0.72, rng);
  // the bloom chord, released by ~3.0 to hand over to the piece
  const parts = [[55, 0.3, 0.3, 0, 0], [110, 0.22, 0.22, -0.4, 0.4],
    [164.8, 0.14, 0.1, -0.9, 0.9], [220, 0.1, 0.14, 1.1, -1.1], [329.6, 0.05, 0.05, -1.6, 1.6]];
  for (const [f, aL, aR, dL, dR] of parts) {
    tone(L, R, 0.85, 2.6, f, aL, aR, dL, dR, adsr(0.5, 0.8, 1.2), [1, 0.35]);
  }
}

// ── shared coda: the terminal hit + held bloom ──────────────────────────────
function finale(L, R, t0, rng) {
  kick(L, R, t0, 100, 34, 3.4, 0.85, rng);
  for (const [f, a, d] of [[55, 0.26, 0], [82.4, 0.14, 0.6], [110, 0.16, -0.6], [130.8, 0.09, 1.1]]) {
    tone(L, R, t0, DUR - t0 - 0.1, f, a, a, d, -d, adsr(0.3, 0.9, DUR - t0 - 1.4), [1, 0.3]);
  }
}

// ── the five pieces ─────────────────────────────────────────────────────────
const PIECES = SCORE;

// ── master + write ──────────────────────────────────────────────────────────
const FF = process.env.LOCALAPPDATA
  + '/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe';

// OUT_DIR exists so a verification run can prove byte-identity WITHOUT writing
// over the shipped assets. Default stays public/ so normal use is unchanged.
const OUT_DIR = process.env.OUT_DIR || 'public';
mkdirSync('tmp/suite', { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, compose] of Object.entries(PIECES)) {
  const L = new Float64Array(N), R = new Float64Array(N);
  compose(L, R, V);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 0.3);
    L[i] = Math.tanh(L[i] * 1.5) * fade;
    R[i] = Math.tanh(R[i] * 1.5) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = 0.9 / peak;
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
  const wav = `tmp/suite/opening-${name}.wav`;
  writeFileSync(wav, Buffer.concat([hdr, data]));
  if (process.env.WAV_ONLY) { console.log(`${name}: wav (audition mode)`); continue; }
  try {
    execFileSync(FF, ['-y', '-i', wav, '-c:a', 'aac', '-b:a', '192k', `${OUT_DIR}/opening-${name}.m4a`], { stdio: 'pipe' });
    console.log(`${name}: wav + ${OUT_DIR}/opening-${name}.m4a`);
  } catch (e) {
    console.log(`${name}: wav only (ffmpeg failed: ${String(e).slice(0, 80)})`);
  }
}
