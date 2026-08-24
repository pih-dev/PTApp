// ─── suite1-score.mjs — the v2.31 pieces, as a SCORE ─────────────────────────
//
// Pierre, 2026-08-24, on the orchestral suite: "None of them are enjoyable to
// listen to… I felt bleakness. The five that are in the app are really good
// actually, compared to this. Preserve them as they are, but do a pass on them
// so they wouldn't sound synthetic."
//
// 🔴 SO THE NOTES ARE FROZEN AND ONLY THE INSTRUMENTS MOVE. This file holds the
// eight v2.31 compositions with their bodies UNCHANGED, character for
// character. Each takes a voice table `V` and destructures its instruments from
// it, so one score can be rendered twice:
//
//   scripts/make-opening-suite.mjs  → the original oscillators. Its output is
//                                     byte-identical to what shipped, and that
//                                     is VERIFIED, not assumed.
//   scripts/make-suite1-real.mjs    → modelled instruments, same score.
//
// There is exactly ONE copy of the music. Changing a note changes both renders,
// and no amount of work on the second can drift the first.
//
// 🔴 VERIFYING THE FREEZE:  node scripts/make-opening-suite.mjs
//    then compare md5 of public/opening-*.m4a against
//    _archive/PTApp/branding/2026-08-24-suite1-preserved/. They must match. If
//    they do not, this extraction changed the music and must be reverted.

export const SCORE = {
  // 1 · ANTHEM — the cinematic journey: slow root motion, sub pulses, bells.
  anthem(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xA11);
    opening(L, R, rng);
    const roots = [[3.0, 55], [7.0, 43.65], [11.0, 65.41], [15.0, 49.0]];
    for (const [t0, f] of roots) {
      for (const [m, a] of [[1, 0.24], [1.5, 0.1], [2, 0.14], [3, 0.05]]) {
        tone(L, R, t0, 4.6, f * m, a, a, -0.5 * m, 0.5 * m, adsr(0.8, 2.6, 1.2), [1, 0.3]);
      }
    }
    for (let t = 3.35; t < 17; t += 2) kick(L, R, t, 70, 48, 7, 0.22, null);
    const pings = [[4.3, 880], [6.9, 659.3], [9.5, 1046.5], [12.1, 880], [14.7, 659.3]];
    pings.forEach(([t, f], i) => bell(L, R, t, f, 0.07, i % 2 ? 0.8 : -0.8));
    noiseSwell(L, R, 3.5, 16.5, 0.05, rng, false);
    noiseSwell(L, R, 17.5, 21.6, 0.11, rng, true);
    for (let k = 0, t = 17.6; t < 21.5; k++, t += Math.max(0.25, 1.4 - k * 0.18)) {
      kick(L, R, t, 80, 50, 9, 0.2 + k * 0.03, null);
    }
    finale(L, R, 21.8, rng);
  },

  // 2 · ENGINE — punchy four-on-the-floor with a two-bar bass hook.
  engine(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xE61);
    opening(L, R, rng);
    const B = 60 / 112; // beat
    const bar = 4 * B, T0 = 3.0;
    const riff = [[0, 55], [0.5, 55], [1.5, 65.4], [2.5, 49], [3, 55],
      [4, 55], [4.5, 55], [5.5, 41.2], [6.5, 49], [7, 110]]; // 2 bars, eighths
    for (let t = T0; t < 21.6; t += B) {
      const beat = Math.round((t - T0) / B);
      if (!(t > 16.4 && t < 19.6)) kick(L, R, t, 130, 45, 8, 0.5, null); // half-time break
      if (beat % 2 === 1) disc(L, R, t + B * 0.5, 0.06, beat % 4 === 1 ? 0.6 : -0.6, true); // ride tick
      if (beat % 4 === 2 && t > T0 + 2 * bar) disc(L, R, t, 0.2, 0, false); // mid disc hit
    }
    for (let rep = 0; rep < 3; rep++) {
      for (const [e8, f] of riff) {
        const t = T0 + rep * 2 * bar + e8 * B;
        if (t < 16.4) tone(L, R, t, 0.24, f, 0.3, 0.3, 0, 0, adsr(0.01, 0.1, 0.13), SAW);
      }
    }
    // break: bass sustains + riser, then the drop
    tone(L, R, 16.4, 3.2, 55, 0.24, 0.24, -0.6, 0.6, adsr(0.3, 2.2, 0.7), SAW);
    noiseSwell(L, R, 16.6, 19.6, 0.12, rng, true);
    for (let t = 19.7; t < 22.4; t += B / 2) kick(L, R, t, 130, 45, 9, 0.34, null);
    finale(L, R, 22.6, rng);
  },

  // 3 · ARENA — the THX shape: two dozen voices converge onto one huge chord.
  arena(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xA7E);
    opening(L, R, rng);
    const targets = [55, 110, 164.8, 220, 330, 440, 660, 880];
    for (let v = 0; v < 24; v++) {
      const fStart = 180 + Math.abs(rng()) * 720;
      const fEnd = targets[v % targets.length] * (1 + rng() * 0.004);
      const arrive = 8 + Math.abs(rng()) * 6; // seconds after start
      const start = Math.floor(2.6 * SR), pan = rng() * 0.9;
      let ph = 0;
      for (let i = start; i < N; i++) {
        const t = (i - start) / SR;
        const u = Math.min(1, t / arrive);
        const f = fStart + (fEnd - fStart) * (1 - Math.pow(1 - u, 3));
        ph += (TAU * f) / SR;
        const swell = Math.min(1, t / 6) * (t / DUR < 0.9 ? 1 : 0);
        const push = 1 + Math.max(0, (t - 17.9)) * 0.25; // 20.5s crescendo
        const rel = i / SR > 24.4 ? Math.max(0, 1 - (i / SR - 24.4) / 0.7) : 1;
        const e = 0.02 * swell * Math.min(push, 1.6) * rel;
        const s = (Math.sin(ph) + 0.33 * Math.sin(2 * ph) + 0.18 * Math.sin(3 * ph)) * e;
        L[i] += s * (1 - pan * 0.5); R[i] += s * (1 + pan * 0.5);
      }
    }
    kick(L, R, 22.5, 120, 30, 3.2, 0.9, rng);
  },

  // 4 · PULSE — the heartbeat and three braams, tension into the last swell.
  pulse(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xB4A);
    opening(L, R, rng);
    let t = 3.2, gap = 1.9;
    while (t < 21.8) {
      kick(L, R, t, 80, 40, 7, 0.42, null);
      kick(L, R, t + 0.28, 70, 38, 8, 0.26, null);
      if (t > 17.8) gap = Math.max(0.7, gap - 0.28); // the accelerating heart
      t += gap;
    }
    for (const bt of [5.0, 10.2, 15.4]) {
      for (const f of [55, 82.4]) {
        tone(L, R, bt, 3.6, f, 0.17, 0.17, -1.1, 1.1, (tt) =>
          (tt < 0.6 ? tt / 0.6 : tt < 2.4 ? 1 : Math.max(0, 1 - (tt - 2.4) / 1.2))
          * (1 + Math.min(0.06, tt * 0.1)), SAW);
      }
    }
    tone(L, R, 3.4, 18, 55, 0.08, 0.08, -0.3, 0.3, adsr(2, 14, 2), [1, 0.3]);
    riserTones(L, R, 18.0, 22.2, 110, 880, 0.09);
    for (const f of [55, 82.4, 110]) {
      tone(L, R, 22.3, 2.6, f, 0.2, 0.2, -1.3, 1.3, adsr(0.4, 1.2, 1.0), SAW);
    }
    kick(L, R, 22.3, 100, 34, 3.4, 0.8, rng);
  },

  // 5 · ORBIT — the catchy one: a four-note hook over a ducking pad.
  orbit(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0x0B7);
    opening(L, R, rng);
    const B = 60 / 96, T0 = 3.0;
    const arp = [220, 261.6, 329.6, 392];        // A3 C4 E4 G4
    const hook = [440, 392, 329.6, 261.6];        // A4 G4 E4 C4 — the motif
    for (let s16 = 0; ; s16++) {
      const t = T0 + s16 * B / 4;
      if (t >= 21.4) break;
      const inBridge = t > 15 && t < 18;
      pluck(L, R, t, arp[s16 % 4] * (inBridge ? 2 : 1), 0.1, (s16 % 4 - 1.5) * 0.5);
    }
    for (let rep = 0; rep < 5; rep++) {
      const t0 = T0 + rep * 4 * B;
      if (t0 > 19) break;
      hook.forEach((f, k) => {
        const t = t0 + k * B / 2;
        pluck(L, R, t, f, 0.22, k % 2 ? 0.6 : -0.6);
        pluck(L, R, t + 0.375, f, 0.11, k % 2 ? -0.6 : 0.6);   // echo
        pluck(L, R, t + 0.75, f, 0.055, k % 2 ? 0.6 : -0.6);
      });
    }
    // the pad, ducked on every beat — the sidechain feel is the groove
    for (const [f, a] of [[110, 0.12], [164.8, 0.08], [196, 0.07], [261.6, 0.05]]) {
      pad(L, R, T0, 21.6, f, a, B);
    }
    for (let t = T0; t < 21.4; t += B) kick(L, R, t, 100, 48, 9, 0.26, null);
    const walk = [[15, 49], [16, 43.65], [17, 41.2], [18, 82.4]];
    for (const [t, f] of walk) tone(L, R, t, 1.0, f, 0.2, 0.2, 0, 0, adsr(0.05, 0.6, 0.3), SAW);
    // the stop-gap: one silent beat, the hook answers, then the hit
    hook.forEach((f, k) => pluck(L, R, 22.35 + k * 0.14, f, 0.16, k % 2 ? 0.7 : -0.7));
    finale(L, R, 23.1, rng);
  },

  // 6 · DROPLET — Pierre's ask: water drops. Plinks over a deep still pool.
  droplet(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xD09);
    opening(L, R, rng);
    // the pool: a deep, slow pad that barely moves
    tone(L, R, 3.0, 19.5, 55, 0.2, 0.2, -0.3, 0.3, adsr(1.5, 15.5, 2.4), [1, 0.3]);
    tone(L, R, 3.0, 19.5, 164.8, 0.06, 0.06, -0.8, 0.8, adsr(2, 15, 2.4), [1, 0.25]);
    // drops on a loose grid, density growing toward the build
    let t = 3.6;
    const scale = [660, 880, 990, 1320, 1480];
    while (t < 21.2) {
      const f = scale[Math.floor(Math.abs(rng()) * scale.length)] * (1 + rng() * 0.03);
      drop(L, R, t, f, 0.16 + Math.abs(rng()) * 0.08, rng());
      if (Math.abs(rng()) > 0.72) drop(L, R, t + 0.09, f * 0.75, 0.07, -rng()); // splash-back
      const dens = t < 12 ? 0.9 : t < 18 ? 0.55 : 0.3; // it starts to rain
      t += dens + Math.abs(rng()) * dens * 0.7;
    }
    // the deep bloop — the big drop into the pool, three times
    for (const bt of [7.4, 13.8, 19.4]) {
      let ph = 0;
      const start = Math.floor(bt * SR);
      for (let i = start; i < N; i++) {
        const tt = (i - start) / SR;
        const f = 180 - 95 * Math.min(1, tt / 0.12);
        ph += (TAU * f) / SR;
        const e = Math.exp(-tt * 6) * 0.4;
        if (e < 0.0005) break;
        const sgn = Math.sin(ph) * e;
        L[i] += sgn; R[i] += sgn;
      }
    }
    for (let k = 3.35; k < 21; k += 2) kick(L, R, k, 60, 44, 6.5, 0.16, null);
    finale(L, R, 21.9, rng);
    // three last drops answer the final chord, fading
    drop(L, R, 23.4, 990, 0.12, -0.7); drop(L, R, 23.9, 880, 0.09, 0.7); drop(L, R, 24.4, 660, 0.06, 0);
  },

  // 7 · MAQAM — his ask: "the use of quarters" — a Rast-on-A line (the 350
  // and 1050 cent degrees are the quarter-tones), electronic dress, not an
  // Arabic-music pastiche: the same pads and kicks as the rest of the suite.
  maqam(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0x3A9);
    opening(L, R, rng);
    const A3 = 220;
    const deg = (c) => cents(A3, c); // Rast: 0 200 350 500 700 900 1050 1200
    // drone: root + fifth, the floor the quarter-tones sing over
    tone(L, R, 3.0, 19.8, 55, 0.2, 0.2, 0, 0, adsr(1, 16.5, 2.2), [1, 0.3]);
    tone(L, R, 3.0, 19.8, 110, 0.1, 0.1, -0.4, 0.4, adsr(1.5, 16, 2.2), [1, 0.3]);
    // dum-tak: kick is the dum, disc is the tak (masmoudi-lite, 100bpm)
    const B = 0.6;
    for (let bar = 0; bar * 4 * B + 3.4 < 21.2; bar++) {
      const t0 = 3.4 + bar * 4 * B;
      kick(L, R, t0, 90, 50, 8, 0.3, null);
      kick(L, R, t0 + B, 90, 50, 8, 0.22, null);
      disc(L, R, t0 + 1.5 * B, 0.1, 0.5, true);
      disc(L, R, t0 + 2 * B, 0.12, -0.5, true);
      kick(L, R, t0 + 2.5 * B, 90, 50, 8, 0.26, null);
      disc(L, R, t0 + 3.5 * B, 0.1, 0.5, true);
    }
    // the line, two phrases + answer; ornaments are 60ms grace notes
    const phrase = [
      [4.2, 0, 0.55], [4.8, 200, 0.4], [5.3, 350, 0.9], [6.4, 500, 0.55],
      [7.2, 700, 0.9], [8.3, 500, 0.4], [8.8, 350, 0.55], [9.5, 200, 0.7],
      [10.6, 0, 0.9],
      [12.0, 700, 0.55], [12.6, 900, 0.4], [13.1, 1050, 0.9], [14.2, 1200, 0.7],
      [15.2, 1050, 0.4], [15.7, 900, 0.55], [16.4, 700, 0.9],
      [17.8, 500, 0.4], [18.3, 350, 0.9], [19.4, 200, 0.4], [19.9, 0, 1.2],
    ];
    for (const [t, c, d] of phrase) {
      voice(L, R, t, d, deg(c), 0.2, c > 600 ? 0.35 : -0.35);
      if (d > 0.8) voice(L, R, t - 0.06, 0.07, deg(c + 100), 0.08, 0); // grace
    }
    // octave shadow of the long notes, wide
    for (const [t, c, d] of phrase) if (d > 0.8) voice(L, R, t, d, deg(c) * 2, 0.05, c > 600 ? -0.8 : 0.8);
    riserTones(L, R, 19.8, 22.0, 110, 660, 0.07);
    finale(L, R, 22.2, rng);
  },

  // 8 · CASCADE — the falling-blocks ENERGY, none of the melody: original
  // minor-key chip riff, square-ish voices, a +2 semitone lift near the end.
  cascade(L, R, V) {
    const { makeRng, opening, finale, kick, tone, pluck, bell, disc, drop, voice,
      riserTones, noiseSwell, pad, adsr, cents, SAW, SQ, SR, N, DUR, TAU } = V;
    const rng = makeRng(0xCA5);
    opening(L, R, rng);
    const B = 60 / 140, T0 = 3.0;
    const semi = (n) => 220 * Math.pow(2, n / 12); // A3 root
    // the riff (two bars, eighths), then its answer — original line
    const riffA = [0, 3, 7, 5, 3, 2, 0, 2];       // A C E D C B A B
    const riffB = [0, 3, 7, 10, 8, 7, 5, 7];      // A C E G F E D E
    const lift = 21.6; // everything after this is +2 semitones
    for (let bar = 0; ; bar++) {
      const t0 = T0 + bar * 8 * (B / 2);
      if (t0 >= 21.2) break;
      const riff = bar % 2 ? riffB : riffA;
      riff.forEach((n, k) => {
        const t = t0 + k * (B / 2);
        if (t >= 21.2) return;
        const up = t >= 18.2 ? 2 : 0; // the lift arrives with the last run
        tone(L, R, t, 0.16, semi(n + up), 0.16, 0.16, 0, 0, adsr(0.01, 0.07, 0.08), SQ);
        // the high echo arpeggio, 16ths, one octave up
        tone(L, R, t + B / 4, 0.09, semi(n + up) * 2, 0.05, 0.05, k % 2 ? 1 : -1, k % 2 ? -1 : 1, adsr(0.005, 0.04, 0.045), SQ);
      });
    }
    // bass: square roots on eighths, walking A A E E F F G G
    const bassWalk = [0, 0, -5, -5, -4, -4, -2, -2];
    for (let bar = 0; ; bar++) {
      const t0 = T0 + bar * 8 * (B / 2);
      if (t0 >= 21.2) break;
      bassWalk.forEach((n, k) => {
        const t = t0 + k * (B / 2);
        if (t >= 21.2) return;
        const up = t >= 18.2 ? 2 : 0;
        tone(L, R, t, 0.2, 55 * Math.pow(2, (n + up) / 12), 0.22, 0.22, 0, 0, adsr(0.005, 0.12, 0.08), SQ);
      });
    }
    for (let t = T0; t < 21.2; t += B) {
      kick(L, R, t, 120, 48, 9, 0.34, null);
      disc(L, R, t + B / 2, 0.05, (Math.round(t / B) % 2) ? 0.6 : -0.6, true);
    }
    // the stop: one silent half-beat, then the drop-in finale
    riserTones(L, R, 20.2, 21.9, 220, 1760, 0.06);
    finale(L, R, 22.1, rng);
  },
};
