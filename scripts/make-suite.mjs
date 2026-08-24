// ─── make-suite.mjs — render a suite ─────────────────────────────────────────
//
// Compositions of ~50–60 s each, played on the modelled instruments in
// scripts/lib/orchestra.mjs.
//
//   --set=suite3   (default)  the SHOWCASE suite — the v2.31 pieces re-scored
//                             for a real orchestra. Pierre, 2026-08-24: "the
//                             only difference from the original ones should be
//                             real instruments instead of synthetic."
//   --set=suite2              the acoustic chamber set. Superseded — Pierre
//                             on it: "they're very bad… when I told you I like
//                             guitars and flute, you just did everything with
//                             those." Kept because it is where the engine and
//                             both gates came from.
//
// 🔴 ONE ARRANGEMENT, THREE FILES. A piece is composed once into positioned
//    mono tracks. This script renders 7.1, then FOLDS DOWN to 5.1 and stereo.
//    The v2.31 suite kept a stereo script and a 5.1 script in step by hand
//    (CLAUDE.md TRAPS → Tooling); there is nothing here to keep in step.
//
// Output (per piece), into _archive/PTApp/branding/2026-08-23-suite2/:
//   SpotSet-<name>.m4a                       AAC stereo 256k — phone, PC, app
//   SpotSet-<name>-DolbyDigital-5.1.mp4      AC-3 640k    — every soundbar
//   SpotSet-<name>-DolbyDigitalPlus-5.1.mp4  E-AC-3 448k  — better, DD+ badge
//
// 5.1 ONLY from 2026-08-24 — Pierre: "you don't have to do seven point one,
// just five point one. And if I like them, you can generate the two channels
// for the app." The mixer still renders 7.1 internally and check-mix still
// reads all eight channels, because 5.1 is a FOLD-DOWN of 7.1 here and a rear
// imbalance is only visible before the fold.
//
// ⚠️ WHAT DOLBY WE CAN ACTUALLY SHIP. Verified against this ffmpeg 9.0 build,
//    not assumed: `ffmpeg -h encoder=eac3` lists its supported layouts and
//    they STOP AT 5.1 — so do ac3 and truehd. Encoding 7.1 as E-AC-3 fails
//    outright ("Channel layout '7.1' is not supported"). And Dolby ATMOS is
//    further out of reach again: it needs JOC object metadata, which only the
//    licensed Dolby encoder produces. So the honest split is
//      • Dolby-branded  → 5.1, in both AC-3 and E-AC-3
//      • true 7.1       → eight discrete channels, AAC, no Dolby badge
//    The 7.1 file really is 7.1; it will just show as "AAC 7.1" or arrive at
//    the soundbar as 8-channel PCM rather than lighting a Dolby lamp.
//
// Run:  node scripts/make-suite2.mjs [name ...]     (no args = all seven)
//       WAV_ONLY=1  skip encoding, just write tmp wavs for a fast audition
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as O from './lib/orchestra.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const setArg = process.argv.find((a) => a.startsWith('--set='));
const SET = setArg ? setArg.slice(6) : 'suite3';
const OUT_DIRS = { suite2: '2026-08-23-suite2', suite3: '2026-08-24-suite3' };
const OUT = `C:/projects/_archive/PTApp/branding/${OUT_DIRS[SET] || SET}`;
const TMP = join(HERE, '..', 'tmp', SET);
const ICON = join(HERE, '..', 'public', 'icon-512.png');
const FFPROBE = O.FFMPEG.replace(/ffmpeg\.exe$/, 'ffprobe.exe');

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const pieceDir = join(HERE, SET);
const files = readdirSync(pieceDir).filter((f) => f.endsWith('.mjs')).sort();

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const ff = (args) => execFileSync(O.FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'pipe' });
const probe = (path, stream) => JSON.parse(execFileSync(FFPROBE,
  ['-v', 'error', '-select_streams', stream, '-show_entries',
    'stream=codec_name,channels,channel_layout:format=duration,bit_rate',
    '-of', 'json', path], { encoding: 'utf8' }));

const results = [];
for (const file of files) {
  const mod = await import(new URL(`./${SET}/${file}`, import.meta.url).href);
  const { meta, compose } = mod;
  if (!meta || !compose) { console.log(`skip ${file}: no meta/compose export`); continue; }
  if (only.length && !only.includes(meta.name)) continue;

  const t0 = Date.now();
  const S = O.createSession({ dur: meta.dur, tempo: meta.tempo, seed: meta.seed, reverb: meta.reverb });
  compose(S, O);
  const ch8 = O.mix(S, meta.master);

  // Guard: a silent or clipped render is a composition bug, and both are
  // invisible in a file listing. Fail loudly here rather than at the soundbar.
  let peak = 0, energy = 0;
  for (const c of ch8) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; energy += c[i] * c[i]; }
  const rms = Math.sqrt(energy / (ch8.length * ch8[0].length));
  if (!Number.isFinite(peak) || peak < 0.05) throw new Error(`${meta.name}: render is silent (peak ${peak})`);
  if (rms < 0.008) throw new Error(`${meta.name}: render is nearly silent (rms ${rms.toFixed(5)})`);

  const w71 = join(TMP, `${meta.name}-71.wav`);   // kept: check-mix reads it
  const w51 = join(TMP, `${meta.name}-51.wav`);
  const w2 = join(TMP, `${meta.name}-stereo.wav`);
  O.writeWav(w71, ch8);
  O.writeWav(w51, O.fold51(ch8));
  O.writeWav(w2, O.fold2(ch8));
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  if (process.env.WAV_ONLY) {
    console.log(`${meta.name}: wavs only (${secs}s render, peak ${peak.toFixed(3)}, rms ${rms.toFixed(3)})`);
    results.push({ name: meta.name, wavOnly: true });
    continue;
  }

  const m4a = `${OUT}/SpotSet-${meta.name}.m4a`;
  const dd = `${OUT}/SpotSet-${meta.name}-DolbyDigital-5.1.mp4`;
  const ddp = `${OUT}/SpotSet-${meta.name}-DolbyDigitalPlus-5.1.mp4`;

  ff(['-i', w2, '-c:a', 'aac', '-b:a', '256k', m4a]);
  // The TV files carry the mark as a still so a media player has a video
  // stream to hold on to — an audio-only mp4 is refused by some TVs outright.
  const tv = (wav, aArgs, out) => ff([
    '-loop', '1', '-i', ICON, '-i', wav,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '10', '-t', String(meta.dur),
    ...aArgs, '-shortest', out,
  ]);
  tv(w51, ['-c:a', 'ac3', '-b:a', '640k', '-channel_layout:a', '5.1'], dd);
  tv(w51, ['-c:a', 'eac3', '-b:a', '448k', '-channel_layout:a', '5.1'], ddp);

  // Verify what actually landed in the container. `gradlew exits 0 on a failed
  // build` taught this project not to trust an exit code (CLAUDE.md TRAPS):
  // read the stream back and assert the channel count.
  const checks = [[m4a, 2], [dd, 6], [ddp, 6]];
  const bad = [];
  for (const [path, want] of checks) {
    const p = probe(path, 'a:0');
    const st = p.streams?.[0] || {};
    const dur = Number(p.format?.duration || 0);
    if (st.channels !== want) bad.push(`${path}: ${st.channels} ch, wanted ${want}`);
    if (Math.abs(dur - meta.dur) > 1.5) bad.push(`${path}: ${dur.toFixed(1)}s, wanted ${meta.dur}s`);
  }
  if (bad.length) throw new Error(`${meta.name} encode verification FAILED:\n  ` + bad.join('\n  '));

  const sz = (p) => (statSync(p).size / 1048576).toFixed(1) + 'MB';
  console.log(`${meta.name}  ${meta.dur}s ${meta.tempo}bpm  render ${secs}s  peak ${peak.toFixed(3)}`
    + `  →  stereo ${sz(m4a)} · DD 5.1 ${sz(dd)} · DD+ 5.1 ${sz(ddp)}`);
  results.push({ name: meta.name, title: meta.title, blurb: meta.blurb, m4a, dd, ddp });
}

console.log(`\n${results.length} piece(s) → ${OUT}`);
