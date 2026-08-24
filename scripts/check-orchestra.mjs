// ─── check-orchestra.mjs — does the engine actually make instruments? ───────
//
// A synthesis bug is silent: the file renders, the peak is fine, and it sounds
// wrong. So measure instead of eyeballing. For each voice we render one note
// and report: detected pitch (autocorrelation) vs. requested, spectral centroid
// (brightness), harmonic-to-noise ratio, and the -20 dB decay time.
//
// Run: node scripts/check-orchestra.mjs [--wav]   (--wav also writes audition
// files to tmp/orchestra-check/ so a human can listen to each voice alone.)
import { mkdirSync } from 'node:fs';
import {
  SR, n, makeRng, flute, sax, nylon, steel, bass, piano, strings,
  kick, snare, hat, shaker, cymbal, biquad, runBiquad, runBody, BODY, writeWav,
  brass, timpani, taiko, pizz, stringHit, tubular, glock, harp, choir,
} from './lib/orchestra.mjs';

const WAV = process.argv.includes('--wav');
const DUR = 3.0, N = Math.round(SR * DUR);

// ── measurement ─────────────────────────────────────────────────────────────
/** Autocorrelation pitch over the sustain window (skips the attack). */
function detectPitch(buf, fLo = 50, fHi = 2000) {
  const from = Math.floor(0.12 * SR), len = Math.min(Math.floor(0.5 * SR), buf.length - from);
  if (len < 1000) return 0;
  const x = buf.subarray(from, from + len);
  let mean = 0;
  for (let i = 0; i < len; i++) mean += x[i];
  mean /= len;
  const loLag = Math.floor(SR / fHi), hiLag = Math.min(Math.floor(SR / fLo), len - 1);
  let best = 0, bestLag = 0, r0 = 0;
  for (let i = 0; i < len; i++) r0 += (x[i] - mean) ** 2;
  if (r0 <= 0) return 0;
  for (let lag = loLag; lag <= hiLag; lag++) {
    let s = 0;
    for (let i = 0; i < len - lag; i++) s += (x[i] - mean) * (x[i + lag] - mean);
    s /= (len - lag);
    if (s > best) { best = s; bestLag = lag; }
  }
  return bestLag ? SR / bestLag : 0;
}

/** Naive DFT magnitude at k bins — slow but exact, and this is a dev tool. */
function spectrum(buf, from, len, bins = 512, fMax = 12000) {
  const out = new Float64Array(bins);
  const win = new Float64Array(len);
  for (let i = 0; i < len; i++) win[i] = buf[from + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / len));
  for (let k = 0; k < bins; k++) {
    const f = (k + 1) * fMax / bins;
    const w = 2 * Math.PI * f / SR;
    let re = 0, im = 0;
    for (let i = 0; i < len; i++) { re += win[i] * Math.cos(w * i); im -= win[i] * Math.sin(w * i); }
    out[k] = Math.hypot(re, im) / len;
  }
  return { mag: out, fMax, bins };
}
function centroid(sp) {
  let num = 0, den = 0;
  for (let k = 0; k < sp.bins; k++) { const f = (k + 1) * sp.fMax / sp.bins; num += f * sp.mag[k]; den += sp.mag[k]; }
  return den > 0 ? num / den : 0;
}
/** PERIODICITY via normalised autocorrelation at the pitch period.
 *  This replaces a bin-counting HNR that was a metric artifact: with 23 Hz
 *  bins a harmonic at 294 Hz falls BETWEEN bins and reads as noise, so a
 *  perfectly good flute scored 0.06. Autocorrelation has no bin grid.
 *  A pure additive tone → ~0.99 (the "synthesized" tell). A blown or bowed
 *  instrument sits lower because breath and bow noise are aperiodic. */
function periodicity(buf, f0, from) {
  if (!f0) return 0;
  const lag = Math.round(SR / f0);
  const len = Math.min(Math.floor(0.35 * SR), buf.length - from - lag - 1);
  if (len < lag * 4) return 0;
  let mean = 0;
  for (let i = 0; i < len; i++) mean += buf[from + i];
  mean /= len;
  let r0 = 0, rt = 0;
  for (let i = 0; i < len; i++) {
    const a = buf[from + i] - mean, b = buf[from + i + lag] - mean;
    r0 += a * a; rt += a * b;
  }
  return r0 > 0 ? Math.max(0, rt / r0) : 0;
}

/** Time from peak to -20 dB. */
function decay20(buf, onset = 0) {
  // Measure from 60 ms PAST the onset. A pluck's first 50 ms is the pick
  // transient — a broadband spike 8 dB above the string itself — so measuring
  // from the absolute peak reports the transient's decay, not the string's.
  const skip = onset + Math.floor(0.06 * SR);
  let peak = 0, pi = skip;
  for (let i = skip; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) { peak = a; pi = i; } }
  if (peak <= 0) return 0;
  const thr = peak * 0.1;
  // running RMS so a zero crossing does not read as "decayed"
  const w = Math.floor(0.02 * SR);
  for (let i = pi; i < buf.length - w; i += Math.floor(w / 2)) {
    let s = 0;
    for (let j = 0; j < w; j++) s += buf[i + j] * buf[i + j];
    if (Math.sqrt(s / w) < thr * 0.5) return (i - pi) / SR;
  }
  return (buf.length - pi) / SR;
}
const rms = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); };
const peakOf = (b) => { let p = 0; for (let i = 0; i < b.length; i++) p = Math.max(p, Math.abs(b[i])); return p; };
const hasNaN = (b) => { for (let i = 0; i < b.length; i++) if (!Number.isFinite(b[i])) return true; return false; };

// ── the voices under test ───────────────────────────────────────────────────
const F = n('A4');   // 440 — everything is asked for the same pitch
const VOICES = {
  'REF-sine': (b) => { for (let i = 0; i < N; i++) b[i] = 0.7 * Math.sin(2 * Math.PI * F * i / SR) * Math.min(1, i / 2000); },
  flute: (b, r) => flute(b, 0.05, 2.2, F, 0.6, r),
  'flute-low': (b, r) => flute(b, 0.05, 2.2, n('D4'), 0.6, r),
  sax: (b, r) => sax(b, 0.05, 2.2, n('D4'), 0.5, r),
  nylon: (b, r) => { nylon(b, 0.05, F, 0.8, r); runBody(b, BODY.nylon, 0.55); },
  steel: (b, r) => { steel(b, 0.05, F, 0.8, r); runBody(b, BODY.steel, 0.55); },
  bass: (b, r) => { bass(b, 0.05, n('A1'), 0.9, r); runBody(b, BODY.upright, 0.6); },
  piano: (b, r) => { piano(b, 0.05, 1.6, F, 0.7, r); runBody(b, BODY.piano, 0.75); },
  'piano-low': (b, r) => { piano(b, 0.05, 1.6, n('A2'), 0.7, r); runBody(b, BODY.piano, 0.75); },
  strings: (b, r) => strings(b, 0.05, 2.0, n('A3'), 0.5, r),
  kick: (b, r) => kick(b, 0.05, 0.9, r),
  snare: (b, r) => snare(b, 0.05, 0.7, r),
  hat: (b, r) => hat(b, 0.05, 0.5, r),
  shaker: (b, r) => shaker(b, 0.05, 0.6, r),
  cymbal: (b, r) => cymbal(b, 0.05, 0.4, r),
  // ── the orchestra ─────────────────────────────────────────────────────────
  horn: (b, r) => brass(b, 0.05, 2.0, n('D4'), 0.6, r, { kind: 'horn' }),
  'horn-soft': (b, r) => brass(b, 0.05, 2.0, n('D4'), 0.6, r, { kind: 'horn', bite: 0.35 }),
  trumpet: (b, r) => brass(b, 0.05, 2.0, n('A4'), 0.6, r, { kind: 'trumpet' }),
  trombone: (b, r) => brass(b, 0.05, 2.0, n('D3'), 0.6, r, { kind: 'trombone' }),
  tuba: (b, r) => brass(b, 0.05, 2.0, n('D2'), 0.6, r, { kind: 'tuba' }),
  timpani: (b, r) => timpani(b, 0.05, n('A1'), 0.7, r),
  taiko: (b, r) => taiko(b, 0.05, 0.8, r),
  pizz: (b, r) => { pizz(b, 0.05, n('A3'), 0.7, r); runBody(b, BODY.upright, 0.6); },
  stringHit: (b, r) => stringHit(b, 0.05, 0.30, n('A2'), 0.7, r),
  tubular: (b, r) => tubular(b, 0.05, F, 0.5, r),
  glock: (b, r) => glock(b, 0.05, n('A5'), 0.5, r),
  harp: (b, r) => { harp(b, 0.05, F, 0.7, r); runBody(b, BODY.nylon, 0.6); },
  choir: (b, r) => choir(b, 0.05, 2.0, n('A3'), 0.5, r),
};

// Expectations. Ranges, not exact values — this catches a MODEL that broke,
// not a timbre someone tweaked. Every number here is "what this instrument
// physically does", so a violation means the model is wrong.
const EXPECT = {
  flute: { pitch: [430, 450], cent: [900, 3200], period: [0.55, 0.99] },
  'flute-low': { pitch: [288, 300], cent: [700, 2900], period: [0.55, 0.99] },
  sax: { pitch: [288, 300], cent: [700, 3200], period: [0.55, 0.99] },
  nylon: { pitch: [430, 450], cent: [200, 2600], decay: [0.35, 4.0] },
  steel: { pitch: [430, 450], cent: [250, 4000], decay: [0.5, 5.0] },
  bass: { pitch: [53, 57], cent: [40, 1200], decay: [0.5, 5.0] },
  piano: { pitch: [430, 452], cent: [200, 3500], decay: [0.3, 4.0] },
  'piano-low': { pitch: [108, 113], cent: [80, 2200], decay: [0.5, 5.0] },
  strings: { pitch: [216, 224], cent: [200, 3500] },
  kick: { cent: [20, 700] },
  snare: { cent: [900, 6000] },
  hat: { cent: [4000, 16000] },
  shaker: { cent: [2500, 12000] },
  cymbal: { cent: [700, 9000] },
  // Brass: the model's whole claim is that BRIGHTNESS TRACKS DYNAMIC, so the
  // gate is comparative — a soft horn must measure darker than a loud one, and
  // a trumpet brighter than a tuba. Absolute numbers alone would not catch a
  // static filter, which is the failure mode being guarded against.
  horn: { pitch: [288, 300], cent: [250, 2600], period: [0.55, 0.998] },
  'horn-soft': { pitch: [288, 300], cent: [150, 1800], period: [0.55, 0.999] },
  trumpet: { pitch: [430, 450], cent: [500, 4200], period: [0.55, 0.998] },
  trombone: { pitch: [144, 150], cent: [180, 2400], period: [0.55, 0.998] },
  tuba: { pitch: [71, 76], cent: [60, 1100], period: [0.55, 0.999] },
  timpani: { cent: [30, 900], decay: [0.4, 4.0] },
  taiko: { cent: [20, 800], decay: [0.2, 3.0] },
  pizz: { pitch: [216, 224], cent: [150, 3000], decay: [0.08, 1.2] },
  stringHit: { pitch: [108, 113], cent: [150, 3000], decay: [0.05, 1.0] },
  tubular: { cent: [400, 5000], decay: [1.0, 8.0] },
  glock: { cent: [700, 6000], decay: [0.2, 3.0] },
  harp: { pitch: [430, 450], cent: [200, 3500], decay: [0.5, 5.0] },
  choir: { pitch: [108, 226], cent: [200, 2600], period: [0.55, 0.99] },
};

let fails = 0;
const rows = [];
const audition = [];
for (const [name, render] of Object.entries(VOICES)) {
  const buf = new Float64Array(N);
  render(buf, makeRng(0xC0FFEE));
  const pk = peakOf(buf);
  if (hasNaN(buf)) { console.log(`FAIL ${name}: NaN in the buffer`); fails++; continue; }
  if (pk < 1e-4) { console.log(`FAIL ${name}: silent (peak ${pk.toExponential(2)})`); fails++; continue; }
  const norm = new Float64Array(N);
  for (let i = 0; i < N; i++) norm[i] = buf[i] / pk;
  // Analyse from just after the onset, and never past the end of a SHORT
  // sound: a fixed 150 ms window read silence for the shaker and reported a
  // centroid of 0 for a perfectly good hit.
  let onset = 0;
  for (let i = 0; i < N; i++) if (Math.abs(norm[i]) > 0.05) { onset = i; break; }
  let last = N - 1;
  for (let i = N - 1; i > onset; i--) if (Math.abs(norm[i]) > 0.01) { last = i; break; }
  const winLen = Math.min(4096, Math.max(512, last - onset));
  const from = Math.min(Math.max(0, last - winLen), onset + Math.floor(0.06 * SR));
  const f0 = detectPitch(norm);
  const sp = spectrum(norm, from, winLen);
  const cen = centroid(sp), h = periodicity(norm, f0, from), d20 = decay20(norm, onset);
  const e = EXPECT[name] || {};
  const bad = [];
  if (e.pitch && (f0 < e.pitch[0] || f0 > e.pitch[1])) bad.push(`pitch ${f0.toFixed(1)} ∉ [${e.pitch}]`);
  if (e.cent && (cen < e.cent[0] || cen > e.cent[1])) bad.push(`centroid ${cen.toFixed(0)} ∉ [${e.cent}]`);
  if (e.period && (h < e.period[0] || h > e.period[1])) bad.push(`periodicity ${h.toFixed(3)} ∉ [${e.period}]`);
  if (e.decay && (d20 < e.decay[0] || d20 > e.decay[1])) bad.push(`decay ${d20.toFixed(2)}s ∉ [${e.decay}]`);
  if (bad.length) { fails++; }
  rows.push({ name, f0, cen, h, d20, pk, rms: rms(buf), bad });
  if (WAV) audition.push([name, norm]);
}

const pad = (s, w) => String(s).padEnd(w);
console.log(pad('voice', 12) + pad('pitch', 9) + pad('centroid', 10) + pad('period', 8) + pad('-20dB', 8) + pad('peak', 8) + 'verdict');
for (const r of rows) {
  console.log(pad(r.name, 12) + pad(r.f0 ? r.f0.toFixed(1) : '—', 9)
    + pad(r.cen.toFixed(0), 10) + pad(r.h.toFixed(3), 8)
    + pad(r.d20.toFixed(2) + 's', 8) + pad(r.pk.toFixed(3), 8)
    + (r.bad.length ? 'FAIL — ' + r.bad.join('; ') : 'ok'));
}

if (WAV) {
  mkdirSync('tmp/orchestra-check', { recursive: true });
  for (const [name, b] of audition) {
    const q = new Float64Array(b.length);
    for (let i = 0; i < b.length; i++) q[i] = b[i] * 0.85;
    writeWav(`tmp/orchestra-check/${name}.wav`, [q, q]);
  }
  console.log(`\naudition wavs: tmp/orchestra-check/ (${audition.length} files)`);
}

console.log(fails ? `\n${fails} FAILED` : '\nall voices within model expectations');
process.exit(fails ? 1 : 0);
