// ─── check-mix.mjs — is the rendered piece actually a good surround mix? ─────
//
// A composition bug is silent in a file listing. This reads a rendered 7.1 wav
// back and asserts the things a listener would notice within five seconds:
//
//   • LEFT/RIGHT BALANCE — the first ivory render put the whole string bed on
//     the right (SL at -38 dB against SR at -24 dB). It encoded fine, played
//     fine, and had a 14 dB hole on the listener's left.
//   • THE SURROUNDS CARRY SOMETHING — a "5.1 mix" whose rears are 30 dB down
//     is a stereo mix in a six-channel container.
//   • THE PIECE GOES SOMEWHERE — peak-to-quiet range across the timeline. A
//     flat energy curve is the difference between an arrangement and a loop.
//   • NO CHANNEL CLIPS and none is dead.
//
// Run: node scripts/check-mix.mjs [tmp/suite2/*-71.wav]   (default: all of them)
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const NAMES = ['FL', 'FR', 'C', 'LFE', 'SL', 'SR', 'BL', 'BR'];
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -120);

function readWav(path) {
  const b = readFileSync(path);
  let p = 12, nc = 0, sr = 44100, bits = 24;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { nc = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') {
      const bps = bits / 8, blk = nc * bps, N = Math.floor(sz / blk);
      const chs = Array.from({ length: nc }, () => new Float32Array(N));
      const base = p + 8;
      for (let i = 0; i < N; i++) {
        for (let c = 0; c < nc; c++) {
          const o = base + i * blk + c * bps;
          let v;
          if (bps === 3) { v = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); if (v & 0x800000) v -= 0x1000000; v /= 8388607; }
          else { v = b.readInt16LE(o) / 32767; }
          chs[c][i] = v;
        }
      }
      return { chs, sr, N };
    }
    p += 8 + sz + (sz % 2);
  }
  throw new Error(`${path}: no data chunk`);
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const setArg = process.argv.find((a) => a.startsWith('--set='));
const dir = join('tmp', setArg ? setArg.slice(6) : 'suite3');
const files = args.length ? args
  : readdirSync(dir).filter((f) => f.endsWith('-71.wav')).map((f) => join(dir, f));

let fails = 0;
for (const file of files) {
  const { chs, sr, N } = readWav(file);
  const name = basename(file).replace('-71.wav', '');
  const rms = chs.map((c) => { let s = 0; for (let i = 0; i < N; i++) s += c[i] * c[i]; return Math.sqrt(s / N); });
  const pk = chs.map((c) => { let p = 0; for (let i = 0; i < N; i++) p = Math.max(p, Math.abs(c[i])); return p; });

  const bad = [];
  // 1. left/right symmetry, pair by pair
  for (const [l, r, label] of [[0, 1, 'FL/FR'], [4, 5, 'SL/SR'], [6, 7, 'BL/BR']]) {
    const d = Math.abs(dB(rms[l]) - dB(rms[r]));
    if (d > 6) bad.push(`${label} imbalance ${d.toFixed(1)} dB`);
  }
  // 2. the surrounds are actually used
  const front = Math.max(rms[0], rms[1]);
  const surr = Math.max(rms[4], rms[5], rms[6], rms[7]);
  const surrDb = dB(surr) - dB(front);
  if (surrDb < -26) bad.push(`surrounds ${surrDb.toFixed(1)} dB below front — this is a stereo mix in 8 channels`);
  // 3. the centre is doing something (a lead should be anchored there)
  if (dB(rms[2]) - dB(front) < -30) bad.push(`centre ${(dB(rms[2]) - dB(front)).toFixed(1)} dB below front — nothing anchored`);
  // 4. dynamics: loudest 2 s vs. quietest 2 s of the body (ignoring the fades)
  const w = Math.floor(sr * 2), env = [];
  for (let i = Math.floor(sr * 1.5); i + w < N - sr * 2; i += Math.floor(w / 2)) {
    let s = 0;
    for (let j = 0; j < w; j++) { const a = chs[0][i + j] + chs[1][i + j]; s += a * a; }
    env.push(dB(Math.sqrt(s / w)));
  }
  const range = env.length ? Math.max(...env) - Math.min(...env) : 0;
  if (range < 4) bad.push(`dynamic range ${range.toFixed(1)} dB — the piece does not build`);
  // 5. clipping and dead channels
  chs.forEach((c, i) => {
    if (pk[i] > 0.999) bad.push(`${NAMES[i]} clips`);
    if (i !== 3 && dB(rms[i]) < -55) bad.push(`${NAMES[i]} is effectively dead (${dB(rms[i]).toFixed(0)} dB)`);
  });

  console.log(`\n${name}  ${(N / sr).toFixed(1)}s   range ${range.toFixed(1)} dB   surr ${surrDb.toFixed(1)} dB`);
  console.log('  ' + NAMES.map((nm, i) => `${nm} ${dB(rms[i]).toFixed(1)}`).join('  '));
  if (bad.length) { fails++; bad.forEach((x) => console.log(`  FAIL  ${x}`)); }
  else console.log('  ok');
}
console.log(fails ? `\n${fails} mix(es) FAILED` : `\n${files.length} mix(es) ok`);
process.exit(fails ? 1 : 0);
