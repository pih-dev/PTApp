// ─── lantern — flute, close and quiet ────────────────────────────────────────
//
// The quiet one. A minor, 66 bpm, and everything close: a small warm room at
// night rather than the hall ridge lives in.
//
// The point of this piece is DYNAMIC RANGE. It opens at a real pianissimo and
// only ever reaches mezzo-forte, which is why the flute is written with its
// breath turned UP and its amplitude turned DOWN — that combination is what a
// quiet flute actually sounds like. Playing the same notes softer just sounds
// small; playing them softer AND airier sounds close.
//
// Progression: Am – F – C – G (i – VI – III – VII).
//
// FORM (bars of 4/4 at 66 bpm = 3.636 s each)
//   0–1   guitar alone, fingerpicked
//   2–5   A       the flute enters bare, barely above the guitar
//   6–9   A′      bass fills in, one shaker pattern, still soft
//   10–12 B       the strings arrive and the flute lifts a register — the peak
//   13    A″      it all falls away: flute and guitar, quieter than the opening
//   →     the last note simply left ringing in the room
//
// The hook sighs: a leap up to E5, then a slow walk down. Every phrase ends
// lower and quieter than it began, which is the whole character.

export const meta = {
  name: 'lantern',
  title: 'Lantern',
  dur: 56,
  tempo: 66,
  seed: 0x1A27E,
  blurb: 'The quiet one — breathy flute and fingerpicked nylon in A minor, a small room at night.',
  // Small, dark, close. Short tail so nothing washes; this room has walls.
  reverb: { rt60: 1.6, damp: 0.46, preDelay: 0.014, width: 0.95 },
  master: { drive: 1.05, lfeGain: 0.34, loudness: -20 },
};

export function compose(S, O) {
  const { n, flute, nylon, bass, strings, shaker, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.007;

  // ── the room ──────────────────────────────────────────────────────────────
  // Everything sits close and slightly in front. Low sends — this piece must
  // sound like it is in the room with you, not down a corridor.
  const fl = S.track('flute', { az: 8, centre: 0.40, spread: 6, send: 0.26, gain: 1.0 });
  const gt = S.track('guitar', { az: -21, spread: 8, send: 0.22, gain: 0.80, body: BODY.nylon });
  const bs = S.track('bass', { az: -6, centre: 0.16, send: 0.10, gain: 0.78, body: BODY.upright, lp: 1700 });
  const stF = S.track('strings-front', { az: 42, pair: true, spread: 16, send: 0.48, gain: 0.34, hp: 150 });
  const stB = S.track('strings-room', { az: 126, pair: true, spread: 26, send: 0.62, gain: 0.22, hp: 200 });
  const sh = S.track('shaker', { az: 32, send: 0.30, gain: 0.30 });

  const Am = { pick: ['A2', 'E3', 'A3', 'C4', 'E4'], pad: ['A2', 'C3', 'E3', 'A3'], root: 'A1' };
  const F = { pick: ['F2', 'C3', 'F3', 'A3', 'C4'], pad: ['F2', 'A2', 'C3', 'F3'], root: 'F1' };
  const C = { pick: ['C3', 'G3', 'C4', 'E4', 'G4'], pad: ['C3', 'E3', 'G3', 'C4'], root: 'C2' };
  const G = { pick: ['G2', 'D3', 'G3', 'B3', 'D4'], pad: ['G2', 'B2', 'D3', 'G3'], root: 'G1' };

  const A_PROG = [Am, F, C, G];
  const B_PROG = [F, C, G, Am];

  /**
   * Fingerpicking, not strumming: thumb on the bass note, fingers on the top
   * three, in a slow travis-ish rotation. `pick: 0.34` puts the pluck near the
   * soundhole — round and soft, which is where a player's hand goes when the
   * music is this quiet.
   */
  function pickBar(barIdx, ch, amp, pattern = [0, 2, 3, 1, 4, 2, 3, 1]) {
    const t0 = barIdx * BAR;
    pattern.forEach((deg, k) => {
      const t = t0 + B(k * 0.5) + J();
      const lean = k === 0 ? 1.30 : k === 4 ? 1.08 : 0.70;
      nylon(gt.buf, t, n(ch.pick[deg]), amp * lean, rng, { decay: 2.2, damp: 0.60, pick: 0.34, bright: 0.28 });
    });
  }

  function low(barIdx, ch, amp, hits = [0]) {
    for (const beat of hits) bass(bs.buf, barIdx * BAR + B(beat) + J(), n(ch.root), amp, rng, { decay: 2.6 });
  }

  function pad(barIdx, bars, ch, amp) {
    const t0 = barIdx * BAR, d = bars * BAR;
    for (const name of ch.pad) {
      strings(stF.buf, t0, d, n(name), amp, rng, { voices: 5, atk: 1.8, rel: 2.2, bright: 0.26 });
      strings(stB.buf, t0 + 0.07, d, n(name), amp * 0.75, rng, { voices: 4, atk: 2.2, rel: 2.6, bright: 0.16 });
    }
  }

  /** Breathy and slurred. `breath: 0.52` against a low amp IS the quiet. */
  function play(barIdx, rows, amp, { oct = 0, breath = 0.52 } = {}) {
    const t0 = barIdx * BAR;
    let prev = 0;
    rows.forEach(([beat, name, len, w = 1], i) => {
      const f = n(name) * (oct ? Math.pow(2, oct) : 1);
      const opening = i === 0;
      flute(fl.buf, t0 + B(beat) + J(), B(len) * 0.95, f, amp * w, rng, {
        legatoFrom: opening ? 0 : prev,
        chiff: opening ? 0.35 : 0.10,   // even the opening tongue is soft here
        scoop: opening ? 0.030 : 0.006,
        breath,
        vibDelay: len >= 2 ? 0.45 : 0.8,
        vib: len >= 2 ? 0.010 : 0.004,
        vibRate: 4.9,                    // slower than ridge — this is not urgent
        atk: opening ? 0.11 : 0.07,
        rel: Math.min(0.5, len * 0.4),
      });
      prev = f;
    });
  }

  // ── THE HOOK — a sigh ─────────────────────────────────────────────────────
  // Up to E5 in bar 1, then four bars of walking down. It never climbs back.
  const HOOK = [
    [[0, 'A4', 1], [1, 'E5', 1.5, 1.1], [2.5, 'D5', 1.5, 0.9]],
    [[0, 'C5', 2], [2, 'A4', 2, 0.85]],
    [[0, 'E5', 1], [1, 'D5', 1, 0.92], [2, 'C5', 2, 0.85]],
    [[0, 'D5', 1.5], [1.5, 'B4', 0.5, 0.8], [2, 'G4', 2, 0.8]],
  ];
  // The bridge is the only place the line goes UP and stays there.
  const BRIDGE = [
    [[0, 'F5', 2], [2, 'E5', 2, 0.9]],
    [[0, 'G5', 1.5], [1.5, 'E5', 0.5, 0.85], [2, 'C5', 2]],
    [[0, 'D5', 1], [1, 'B4', 1, 0.9], [2, 'D5', 2, 0.95]],
  ];
  // The return: the head of the hook, and then it stops mid-thought.
  const TAIL = [[0, 'A4', 1], [1, 'E5', 2, 0.85], [3, 'C5', 1, 0.7]];

  // ── 0–1 · guitar alone ────────────────────────────────────────────────────
  pickBar(0, Am, 0.20, [0, 2, 3, 2, 4, 2, 3, 1]);
  pickBar(1, Am, 0.22);
  low(1, Am, 0.20);

  // ── 2–5 · A — the flute barely above the guitar ───────────────────────────
  A_PROG.forEach((ch, i) => {
    pickBar(2 + i, ch, 0.23);
    play(2 + i, HOOK[i], 0.26);
    if (i >= 2) low(2 + i, ch, 0.24);
  });

  // ── 6–9 · A′ — bass under everything, one shaker pattern, still soft ──────
  A_PROG.forEach((ch, i) => {
    pickBar(6 + i, ch, 0.28);
    play(6 + i, HOOK[i], 0.36, { breath: 0.46 });
    low(6 + i, ch, 0.32, [0, 2.5]);
    // the shaker exists in these four bars ONLY, so its arrival and its
    // disappearance are both events
    for (let k = 0; k < 8; k++) {
      shaker(sh.buf, (6 + i) * BAR + B(k * 0.5) + rng() * 0.010,
        0.20 * (k % 2 ? 0.45 : 1), rng, { rise: 0.020, fall: 0.13, f: 4400 });
    }
  });

  // ── 10–12 · B — the strings arrive and the flute lifts. The peak. ─────────
  B_PROG.slice(0, 3).forEach((ch, i) => {
    pickBar(10 + i, ch, 0.32, [0, 2, 4, 3, 2, 4, 3, 1]);
    play(10 + i, BRIDGE[i], 0.50, { breath: 0.38 });
    low(10 + i, ch, 0.38, [0, 2]);
    pad(10 + i, 1, ch, 0.26);
  });

  // ── 13 · A″ — everything falls away. Quieter than the opening. ────────────
  pickBar(13, Am, 0.19, [0, 2, 3, 1, 4, 2, 3, 1]);
  play(13, TAIL, 0.22, { breath: 0.58 });
  low(13, Am, 0.20);
  pad(13, 2, Am, 0.13);

  // ── the last note, simply left ────────────────────────────────────────────
  const last = 14 * BAR;
  nylon(gt.buf, last, n('A2'), 0.26, rng, { decay: 3.4, damp: 0.58, pick: 0.34 });
  nylon(gt.buf, last + 0.10, n('E3'), 0.18, rng, { decay: 3.2, damp: 0.60, pick: 0.34 });
  nylon(gt.buf, last + 0.19, n('A3'), 0.15, rng, { decay: 3.0, damp: 0.62, pick: 0.34 });
  nylon(gt.buf, last + 0.27, n('C4'), 0.13, rng, { decay: 3.0, damp: 0.62, pick: 0.34 });
  bass(bs.buf, last, n('A1'), 0.40, rng, { decay: 4.0 });
  flute(fl.buf, last + B(1), 3.4, n('A4'), 0.24, rng, {
    chiff: 0.22, scoop: 0.026, breath: 0.55, vibDelay: 0.6, vib: 0.010, vibRate: 4.7, rel: 1.4,
  });
}
