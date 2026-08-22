// ─── The Showcase Suite in 5.1 — Dolby Digital for Pierre's soundbar ─────────
//
// Pierre: "can it be Dolby Digital so that I can have surround on my TV?"
// Inside the app it cannot — Chrome/WebView do not decode AC-3 (licensing),
// so the APP keeps AAC stereo. THIS script makes the TV files: the same five
// compositions re-mixed as REAL 5.1 — musically routed, not duplicated:
//   front L/R  — the hits, the bass, the hooks (the punch stays in front)
//   centre     — leads and pad cores (anchored)
//   surrounds  — shimmer, risers, bells, echoes, detuned width (the room)
//   LFE        — bass-managed at the master (80Hz lowpass of the full mix)
// Encoded AC-3 5.1 @ 640k inside an .mp4 with the mark as its still frame, so
// any TV/USB/media player takes it and the soundbar lights up DOLBY DIGITAL.
//
// 🔴 KEPT IN STEP WITH scripts/make-opening-suite.mjs BY HAND. The stereo
//    script is the shipped app asset and stays byte-frozen; this one is the
//    same five arrangements with bus routing. Change a piece there, change it
//    here.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 44100, DUR = 25.2, N = Math.round(SR * DUR);
const TAU = 2 * Math.PI;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
}
const clampT = (i) => Math.max(0, Math.min(N - 1, i));

// ── channel buses ────────────────────────────────────────────────────────────
// A bus is a stereo pair the helpers write into. C is mono carried as a pair
// summed at interleave. makeBuses() per piece.
function makeBuses() {
  return {
    F: [new Float64Array(N), new Float64Array(N)],  // front L/R
    S: [new Float64Array(N), new Float64Array(N)],  // surround L/R
    C: [new Float64Array(N), new Float64Array(N)],  // centre (pair summed /2)
  };
}

// ── the same toolkit, bus-first ─────────────────────────────────────────────
function kick([L, R], t0, f0, f1, decay, amp, rng) {
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
function tone([L, R], t0, dur, f, ampL, ampR, dL, dR, envFn, harm = [1, 0.35]) {
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
const SAW = [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14];
function pluck([L, R], t0, f, amp, pan) {
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
function bell([L, R], t0, f, amp, pan) {
  const start = Math.floor(t0 * SR);
  for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.22]]) {
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
function disc([L, R], t0, amp, pan, hi = true) {
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
function riserTones([L, R], t0, t1, fLo, fHi, amp) {
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
const SQ = [1, 0, 0.33, 0, 0.2, 0, 0.14];
function noiseSwell([L, R], t0, t1, amp, rng, rise = true) {
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

// The opening, routed: hits front, riser behind, chord split front/centre/room.
function opening(B, rng) {
  {
    let lp = 0;
    const end = Math.floor(0.35 * SR);
    const [SL, SRr] = B.S;
    for (let i = 0; i < end; i++) {
      const t = i / SR;
      const e = Math.pow(t / 0.35, 2.5) * 0.09;
      lp += 0.18 * (rng() - lp);
      const s = lp * e * 3 + Math.sin(TAU * (300 + 900 * t / 0.35) * t) * e * 0.25;
      SL[i] += s * 0.8; SRr[i] += s * 1.2;
    }
  }
  kick(B.F, 0.35, 160, 52, 9.5, 0.5, rng);
  kick(B.F, 0.85, 110, 36, 4.2, 0.72, rng);
  tone(B.F, 0.85, 2.6, 55, 0.3, 0.3, 0, 0, adsr(0.5, 0.8, 1.2));
  tone(B.F, 0.85, 2.6, 110, 0.22, 0.22, -0.4, 0.4, adsr(0.5, 0.8, 1.2));
  tone(B.C, 0.85, 2.6, 164.8, 0.07, 0.07, -0.9, 0.9, adsr(0.5, 0.8, 1.2)); // centre pair sums
  tone(B.S, 0.85, 2.6, 220, 0.1, 0.14, 1.1, -1.1, adsr(0.5, 0.8, 1.2));
  tone(B.S, 0.85, 2.6, 329.6, 0.05, 0.05, -1.6, 1.6, adsr(0.5, 0.8, 1.2));
}
function finale(B, t0, rng) {
  kick(B.F, t0, 100, 34, 3.4, 0.85, rng);
  tone(B.F, t0, DUR - t0 - 0.1, 55, 0.26, 0.26, 0, 0, adsr(0.3, 0.9, DUR - t0 - 1.4), [1, 0.3]);
  tone(B.S, t0, DUR - t0 - 0.1, 82.4, 0.14, 0.14, 0.6, -0.6, adsr(0.3, 0.9, DUR - t0 - 1.4), [1, 0.3]);
  tone(B.F, t0, DUR - t0 - 0.1, 110, 0.16, 0.16, -0.6, 0.6, adsr(0.3, 0.9, DUR - t0 - 1.4), [1, 0.3]);
  tone(B.S, t0, DUR - t0 - 0.1, 130.8, 0.09, 0.09, 1.1, -1.1, adsr(0.3, 0.9, DUR - t0 - 1.4), [1, 0.3]);
}

const PIECES = {
  anthem(B) {
    const rng = makeRng(0xA11);
    opening(B, rng);
    for (const [t0, f] of [[3.0, 55], [7.0, 43.65], [11.0, 65.41], [15.0, 49.0]]) {
      tone(B.F, t0, 4.6, f, 0.24, 0.24, -0.5, 0.5, adsr(0.8, 2.6, 1.2), [1, 0.3]);
      tone(B.S, t0, 4.6, f * 1.5, 0.1, 0.1, -0.75, 0.75, adsr(0.8, 2.6, 1.2), [1, 0.3]);
      tone(B.F, t0, 4.6, f * 2, 0.14, 0.14, -1, 1, adsr(0.8, 2.6, 1.2), [1, 0.3]);
      tone(B.C, t0, 4.6, f * 3, 0.025, 0.025, -1.5, 1.5, adsr(0.8, 2.6, 1.2), [1, 0.3]);
    }
    for (let t = 3.35; t < 17; t += 2) kick(B.F, t, 70, 48, 7, 0.22, null);
    [[4.3, 880], [6.9, 659.3], [9.5, 1046.5], [12.1, 880], [14.7, 659.3]]
      .forEach(([t, f], i) => bell(B.S, t, f, 0.07, i % 2 ? 0.8 : -0.8));
    noiseSwell(B.S, 3.5, 16.5, 0.05, rng, false);
    noiseSwell(B.S, 17.5, 21.6, 0.11, rng, true);
    for (let k = 0, t = 17.6; t < 21.5; k++, t += Math.max(0.25, 1.4 - k * 0.18)) {
      kick(B.F, t, 80, 50, 9, 0.2 + k * 0.03, null);
    }
    finale(B, 21.8, rng);
  },
  engine(B) {
    const rng = makeRng(0xE61);
    opening(B, rng);
    const Bt = 60 / 112, bar = 4 * Bt, T0 = 3.0;
    const riff = [[0, 55], [0.5, 55], [1.5, 65.4], [2.5, 49], [3, 55],
      [4, 55], [4.5, 55], [5.5, 41.2], [6.5, 49], [7, 110]];
    for (let t = T0; t < 21.6; t += Bt) {
      const beat = Math.round((t - T0) / Bt);
      if (!(t > 16.4 && t < 19.6)) kick(B.F, t, 130, 45, 8, 0.5, null);
      if (beat % 2 === 1) disc(B.S, t + Bt * 0.5, 0.06, beat % 4 === 1 ? 0.6 : -0.6, true);
      if (beat % 4 === 2 && t > T0 + 2 * bar) disc(B.F, t, 0.2, 0, false);
    }
    for (let rep = 0; rep < 3; rep++) {
      for (const [e8, f] of riff) {
        const t = T0 + rep * 2 * bar + e8 * Bt;
        if (t < 16.4) tone(B.F, t, 0.24, f, 0.3, 0.3, 0, 0, adsr(0.01, 0.1, 0.13), SAW);
      }
    }
    tone(B.F, 16.4, 3.2, 55, 0.24, 0.24, -0.6, 0.6, adsr(0.3, 2.2, 0.7), SAW);
    noiseSwell(B.S, 16.6, 19.6, 0.12, rng, true);
    for (let t = 19.7; t < 22.4; t += Bt / 2) kick(B.F, t, 130, 45, 9, 0.34, null);
    finale(B, 22.6, rng);
  },
  arena(B) {
    // THE 5.1 piece: voices converge from ALL AROUND — a third of them live
    // behind you and glide home into the front chord.
    const rng = makeRng(0xA7E);
    opening(B, rng);
    const targets = [55, 110, 164.8, 220, 330, 440, 660, 880];
    for (let v = 0; v < 24; v++) {
      const fStart = 180 + Math.abs(rng()) * 720;
      const fEnd = targets[v % targets.length] * (1 + rng() * 0.004);
      const arrive = 8 + Math.abs(rng()) * 6;
      const start = Math.floor(2.6 * SR), pan = rng() * 0.9;
      const [L, R] = [B.S, B.F, B.C][v % 3][0] ? [B.S, B.F, B.C][v % 3] : B.F;
      let ph = 0;
      for (let i = start; i < N; i++) {
        const t = (i - start) / SR;
        const u = Math.min(1, t / arrive);
        const f = fStart + (fEnd - fStart) * (1 - Math.pow(1 - u, 3));
        ph += (TAU * f) / SR;
        const swell = Math.min(1, t / 6) * (t / DUR < 0.9 ? 1 : 0);
        const push = 1 + Math.max(0, (t - 17.9)) * 0.25;
        const rel = i / SR > 24.4 ? Math.max(0, 1 - (i / SR - 24.4) / 0.7) : 1;
        const e = 0.02 * swell * Math.min(push, 1.6) * rel * (v % 3 === 2 ? 0.5 : 1);
        const s = (Math.sin(ph) + 0.33 * Math.sin(2 * ph) + 0.18 * Math.sin(3 * ph)) * e;
        L[i] += s * (1 - pan * 0.5); R[i] += s * (1 + pan * 0.5);
      }
    }
    kick(B.F, 22.5, 120, 30, 3.2, 0.9, rng);
  },
  pulse(B) {
    const rng = makeRng(0xB4A);
    opening(B, rng);
    let t = 3.2, gap = 1.9;
    while (t < 21.8) {
      kick(B.F, t, 80, 40, 7, 0.42, null);
      kick(B.S, t + 0.28, 70, 38, 8, 0.26, null);   // the echo beat behind you
      if (t > 17.8) gap = Math.max(0.7, gap - 0.28);
      t += gap;
    }
    for (const bt of [5.0, 10.2, 15.4]) {
      tone(B.F, bt, 3.6, 55, 0.17, 0.17, -1.1, 1.1, (tt) =>
        (tt < 0.6 ? tt / 0.6 : tt < 2.4 ? 1 : Math.max(0, 1 - (tt - 2.4) / 1.2)) * (1 + Math.min(0.06, tt * 0.1)), SAW);
      tone(B.S, bt, 3.6, 82.4, 0.17, 0.17, -1.1, 1.1, (tt) =>
        (tt < 0.6 ? tt / 0.6 : tt < 2.4 ? 1 : Math.max(0, 1 - (tt - 2.4) / 1.2)) * (1 + Math.min(0.06, tt * 0.1)), SAW);
    }
    tone(B.C, 3.4, 18, 55, 0.04, 0.04, -0.3, 0.3, adsr(2, 14, 2), [1, 0.3]);
    riserTones(B.S, 18.0, 22.2, 110, 880, 0.09);
    for (const [bus, f] of [[B.F, 55], [B.S, 82.4], [B.F, 110]]) {
      tone(bus, 22.3, 2.6, f, 0.2, 0.2, -1.3, 1.3, adsr(0.4, 1.2, 1.0), SAW);
    }
    kick(B.F, 22.3, 100, 34, 3.4, 0.8, rng);
  },
  orbit(B) {
    const rng = makeRng(0x0B7);
    opening(B, rng);
    const Bt = 60 / 96, T0 = 3.0;
    const arp = [220, 261.6, 329.6, 392], hook = [440, 392, 329.6, 261.6];
    for (let s16 = 0; ; s16++) {
      const t = T0 + s16 * Bt / 4;
      if (t >= 21.4) break;
      const inBridge = t > 15 && t < 18;
      pluck(B.S, t, arp[s16 % 4] * (inBridge ? 2 : 1), 0.1, (s16 % 4 - 1.5) * 0.5);
    }
    for (let rep = 0; rep < 5; rep++) {
      const t0 = T0 + rep * 4 * Bt;
      if (t0 > 19) break;
      hook.forEach((f, k) => {
        const t = t0 + k * Bt / 2;
        pluck(B.F, t, f, 0.22, k % 2 ? 0.6 : -0.6);
        pluck(B.S, t + 0.375, f, 0.11, k % 2 ? -0.6 : 0.6);
        pluck(B.S, t + 0.75, f, 0.055, k % 2 ? 0.6 : -0.6);
      });
    }
    for (const [f, a, bus] of [[110, 0.12, B.F], [164.8, 0.04, B.C], [196, 0.07, B.S], [261.6, 0.05, B.S]]) {
      const start = Math.floor(T0 * SR);
      const [L, R] = bus;
      let ph = 0;
      for (let i = start; i < Math.floor(21.6 * SR); i++) {
        const t = (i - start) / SR;
        ph += (TAU * f) / SR;
        const duck = 1 - 0.35 * Math.exp(-((t % Bt) / 0.09));
        const e = Math.min(1, t / 1.5) * duck * a;
        const s = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * e;
        L[i] += s * 0.9; R[i] += s * 1.1;
      }
    }
    for (let t = T0; t < 21.4; t += Bt) kick(B.F, t, 100, 48, 9, 0.26, null);
    for (const [t, f] of [[15, 49], [16, 43.65], [17, 41.2], [18, 82.4]]) {
      tone(B.F, t, 1.0, f, 0.2, 0.2, 0, 0, adsr(0.05, 0.6, 0.3), SAW);
    }
    hook.forEach((f, k) => pluck(B.F, 22.35 + k * 0.14, f, 0.16, k % 2 ? 0.7 : -0.7));
    finale(B, 23.1, rng);
  },
  cascade(B) {
    const rng = makeRng(0xCA5);
    opening(B, rng);
    const Bt = 60 / 140, T0 = 3.0;
    const semi = (n) => 220 * Math.pow(2, n / 12);
    const riffA = [0, 3, 7, 5, 3, 2, 0, 2], riffB = [0, 3, 7, 10, 8, 7, 5, 7];
    for (let bar = 0; ; bar++) {
      const t0 = T0 + bar * 8 * (Bt / 2);
      if (t0 >= 21.2) break;
      (bar % 2 ? riffB : riffA).forEach((n, k) => {
        const t = t0 + k * (Bt / 2);
        if (t >= 21.2) return;
        const up = t >= 18.2 ? 2 : 0;
        tone(B.F, t, 0.16, semi(n + up), 0.16, 0.16, 0, 0, adsr(0.01, 0.07, 0.08), SQ);
        tone(B.S, t + Bt / 4, 0.09, semi(n + up) * 2, 0.05, 0.05, k % 2 ? 1 : -1, k % 2 ? -1 : 1, adsr(0.005, 0.04, 0.045), SQ);
      });
    }
    const bassWalk = [0, 0, -5, -5, -4, -4, -2, -2];
    for (let bar = 0; ; bar++) {
      const t0 = T0 + bar * 8 * (Bt / 2);
      if (t0 >= 21.2) break;
      bassWalk.forEach((n, k) => {
        const t = t0 + k * (Bt / 2);
        if (t >= 21.2) return;
        const up = t >= 18.2 ? 2 : 0;
        tone(B.F, t, 0.2, 55 * Math.pow(2, (n + up) / 12), 0.22, 0.22, 0, 0, adsr(0.005, 0.12, 0.08), SQ);
      });
    }
    for (let t = T0; t < 21.2; t += Bt) {
      kick(B.F, t, 120, 48, 9, 0.34, null);
      disc(B.S, t + Bt / 2, 0.05, (Math.round(t / Bt) % 2) ? 0.6 : -0.6, true);
    }
    riserTones(B.S, 20.2, 21.9, 220, 1760, 0.06);
    finale(B, 22.1, rng);
  },
};

// v2.32: only Pierre's final five render by default (arena stays in the code
// as the private THX homage — run with ALL_51=1 to include it).
const RENDER = process.env.ALL_51 ? Object.keys(PIECES)
  : ['anthem', 'engine', 'pulse', 'orbit', 'cascade'];
for (const k of Object.keys(PIECES)) if (!RENDER.includes(k)) delete PIECES[k];

// ── master: 6-channel interleave (WAV order FL FR C LFE SL SR) ──────────────
const FF = process.env.LOCALAPPDATA
  + '/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe';
const OUT = 'C:/projects/_archive/PTApp/branding/2026-08-22-suite-5.1';
mkdirSync(OUT, { recursive: true });
mkdirSync('tmp/suite51', { recursive: true });

for (const [name, compose] of Object.entries(PIECES)) {
  const B = makeBuses();
  compose(B);
  const [FL, FR] = B.F, [SL, SRr] = B.S, [CL, CR] = B.C;
  const C = new Float64Array(N), LFE = new Float64Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    C[i] = (CL[i] + CR[i]) * 0.5;
    // bass management: the LFE is an 80Hz one-pole lowpass of the whole mix
    const mix = FL[i] + FR[i] + C[i] + SL[i] + SRr[i];
    lp += (TAU * 80 / SR) * (mix - lp);
    LFE[i] = lp * 0.55;
  }
  // per-channel soft master + shared normalisation
  const chans = [FL, FR, C, LFE, SL, SRr];
  let peak = 0;
  for (const ch of chans) for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 0.3);
    ch[i] = Math.tanh(ch[i] * 1.5) * fade;
    peak = Math.max(peak, Math.abs(ch[i]));
  }
  const g = 0.9 / peak;
  const data = Buffer.alloc(N * 12);
  for (let i = 0; i < N; i++) for (let c = 0; c < 6; c++) {
    data.writeInt16LE(Math.round(chans[c][i] * g * 32767), i * 12 + c * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(6, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 12, 28);
  hdr.writeUInt16LE(12, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  const wav = `tmp/suite51/opening-${name}-51.wav`;
  writeFileSync(wav, Buffer.concat([hdr, data]));
  // the TV file: the mark as a still, AC-3 5.1 @ 640k
  const icon = 'C:/projects/_archive/PTApp/branding/2026-08-22-pair-mark/icon-512.png';
  const mp4 = `${OUT}/SpotSet-${name}-DolbyDigital-5.1.mp4`;
  execFileSync(FF, ['-y', '-loop', '1', '-i', icon, '-i', wav,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '10', '-t', String(DUR),
    '-c:a', 'ac3', '-b:a', '640k',
    '-channel_layout:a', '5.1', '-shortest', mp4], { stdio: 'pipe' });
  console.log(`${name}: ${mp4}`);
}
console.log('done');
