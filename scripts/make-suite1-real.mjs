// ─── make-suite1-real.mjs — the shipped five, played instead of generated ────
//
// Pierre, 2026-08-24: "The five that are in the app are really good actually…
// Preserve them as they are, but do a pass on them so they wouldn't sound
// synthetic."
//
// 🔴 THIS SCRIPT CANNOT CHANGE THE MUSIC. It runs `lib/suite1-score.mjs` — the
// same compositions `make-opening-suite.mjs` runs, in the same file — and only
// hands it a different voice table. Every note is at the same instant, for the
// same length, at the same weight. Verified two ways:
//
//   1. the synthetic renderer still produces BYTE-IDENTICAL output to what
//      shipped (see suite1-score.mjs's header for the command), so extracting
//      the score changed nothing;
//   2. `scripts/check-arrangement.mjs` compares this render's energy envelope
//      against the synthetic one bar by bar — if the arrangement had drifted,
//      the shape would not match.
//
// Output → _archive/PTApp/branding/2026-08-24-suite1-real/
//   SpotSet-<name>.m4a                       AAC stereo 256k  (phone, PC, app)
//   SpotSet-<name>-DolbyDigital-5.1.mp4      AC-3 640k
//   SpotSet-<name>-DolbyDigitalPlus-5.1.mp4  E-AC-3 448k
//
// Run: node scripts/make-suite1-real.mjs [name ...]      WAV_ONLY=1 to skip encode
import { mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as O from './lib/orchestra.mjs';
import { SCORE } from './lib/suite1-score.mjs';
import { makeRealVoices } from './lib/voices-real.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = 'C:/projects/_archive/PTApp/branding/2026-08-24-suite1-real';
const TMP = join(HERE, '..', 'tmp', 'suite1-real');
const ICON = join(HERE, '..', 'public', 'icon-512.png');
const FFPROBE = O.FFMPEG.replace(/ffmpeg\.exe$/, 'ffprobe.exe');

// 25.2 s and the five that ship — this is a pass on what exists, not a new set.
const DUR = 25.2;
const SHIPPED = ['anthem', 'engine', 'pulse', 'orbit', 'cascade'];
const SEEDS = { anthem: 0xA11, engine: 0xE61, pulse: 0xB4A, orbit: 0x0B7, cascade: 0xCA5 };

// Room per piece. The original five were dry electronic cues; a real orchestra
// needs air, but too much of it turns punch into wash — so the driving ones get
// a shorter tail than the cinematic ones.
const MASTER = {
  anthem: { drive: 1.22, lfeGain: 0.50, loudness: -17 },
  engine: { drive: 1.22, lfeGain: 0.52, loudness: -17 },
  pulse: { drive: 1.20, lfeGain: 0.52, loudness: -17 },
  orbit: { drive: 1.18, lfeGain: 0.48, loudness: -17.5 },
  cascade: { drive: 1.05, lfeGain: 0.50, loudness: -18.5 },
};

const ROOM = {
  anthem: { rt60: 2.1, damp: 0.34, preDelay: 0.024, width: 1.15 },
  engine: { rt60: 1.05, damp: 0.34, preDelay: 0.012, width: 0.95 },
  pulse: { rt60: 1.9, damp: 0.38, preDelay: 0.020, width: 1.1 },
  orbit: { rt60: 1.15, damp: 0.34, preDelay: 0.013, width: 1.0 },
  cascade: { rt60: 1.10, damp: 0.34, preDelay: 0.012, width: 0.95 },
};

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = only.length ? only.filter((x) => SHIPPED.includes(x)) : SHIPPED;

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const ff = (args) => execFileSync(O.FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'pipe' });
const probe = (path) => JSON.parse(execFileSync(FFPROBE,
  ['-v', 'error', '-select_streams', 'a:0', '-show_entries',
    'stream=codec_name,channels:format=duration', '-of', 'json', path], { encoding: 'utf8' }));

for (const name of names) {
  const t0 = Date.now();
  const S = O.createSession({ dur: DUR, tempo: 112, seed: SEEDS[name], reverb: ROOM[name] });
  const { V } = makeRealVoices(S);

  // L and R exist only because the score's signatures carry them. The real
  // voices write into positioned tracks and ignore them; anything a piece
  // writes here directly would be a raw oscillator that escaped the voice
  // table, so it is checked for below rather than silently discarded.
  const L = new Float64Array(S.N), R = new Float64Array(S.N);
  SCORE[name](L, R, V);

  let leaked = 0;
  for (let i = 0; i < S.N; i++) leaked = Math.max(leaked, Math.abs(L[i]), Math.abs(R[i]));
  if (leaked > 1e-6) {
    throw new Error(`${name}: ${leaked.toFixed(4)} of raw oscillator escaped the voice table — `
      + 'a piece is still writing to L/R directly, so part of it would stay synthetic');
  }

  const ch8 = O.mix(S, MASTER[name]);
  let peak = 0, energy = 0;
  for (const c of ch8) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; energy += c[i] * c[i]; }
  const rms = Math.sqrt(energy / (ch8.length * ch8[0].length));
  if (!Number.isFinite(peak) || peak < 0.05) throw new Error(`${name}: render is silent`);

  const w71 = join(TMP, `${name}-71.wav`);
  const w51 = join(TMP, `${name}-51.wav`);
  const w2 = join(TMP, `${name}-stereo.wav`);
  O.writeWav(w71, ch8);
  O.writeWav(w51, O.fold51(ch8));
  O.writeWav(w2, O.fold2(ch8));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  if (process.env.WAV_ONLY) {
    console.log(`${name}: wavs only (${secs}s, peak ${peak.toFixed(3)}, rms ${rms.toFixed(3)})`);
    continue;
  }

  const m4a = `${OUT}/SpotSet-${name}.m4a`;
  const dd = `${OUT}/SpotSet-${name}-DolbyDigital-5.1.mp4`;
  const ddp = `${OUT}/SpotSet-${name}-DolbyDigitalPlus-5.1.mp4`;
  ff(['-i', w2, '-c:a', 'aac', '-b:a', '256k', m4a]);
  const tv = (wav, aArgs, out) => ff([
    '-loop', '1', '-i', ICON, '-i', wav,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '10', '-t', String(DUR),
    ...aArgs, '-shortest', out,
  ]);
  tv(w51, ['-c:a', 'ac3', '-b:a', '640k', '-channel_layout:a', '5.1'], dd);
  tv(w51, ['-c:a', 'eac3', '-b:a', '448k', '-channel_layout:a', '5.1'], ddp);

  const bad = [];
  for (const [path, want] of [[m4a, 2], [dd, 6], [ddp, 6]]) {
    const p = probe(path);
    if (p.streams?.[0]?.channels !== want) bad.push(`${path}: ${p.streams?.[0]?.channels} ch, wanted ${want}`);
    if (Math.abs(Number(p.format?.duration || 0) - DUR) > 1.2) bad.push(`${path}: wrong duration`);
  }
  if (bad.length) throw new Error(`${name} encode verification FAILED:\n  ` + bad.join('\n  '));

  const sz = (p) => (statSync(p).size / 1048576).toFixed(1) + 'MB';
  console.log(`${name}  ${secs}s render  peak ${peak.toFixed(3)}  →  stereo ${sz(m4a)} · DD 5.1 ${sz(dd)} · DD+ 5.1 ${sz(ddp)}`);
}

console.log(`\n${names.length} piece(s) → ${OUT}`);
