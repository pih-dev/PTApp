// ─── harbour — nylon guitar, warm and moving ─────────────────────────────────
//
// Pierre: "I like guitars."
//
// E minor, 100 bpm. The sunniest piece in the suite and the one meant to make
// a foot tap. Two nylon guitars, written as two separate players rather than
// one player doubled: a LEAD, front and centre-anchored, plucked near the
// bridge (pick: 0.2) so its notes have definition against the mix; and a
// COMPING player well off to the left, strumming with alternating down and up
// strokes. They are different tracks because they are different people.
//
// Progression: Em – C – G – D (i – VI – III – VII).
//
// FORM (bars of 4/4 at 100 bpm = 2.4 s each)
//   0–1   intro   strum alone
//   2–5   A       lead states the hook over the strum
//   6–9   A′      bass walks in, kick and brushed snare, shaker
//   10–13 B       C – D – Em – Em, the lead a register up
//   14–17 A″      everything, strings underneath
//   18–20 close   the hook's head one last time and a final ringing strum
//
// The hook is deliberately SYNCOPATED — its strongest arrivals are on the
// offbeats. That is where the foot-tap comes from; a hook written on the beat
// would be correct and inert.

export const meta = {
  name: 'harbour',
  title: 'Harbour',
  dur: 55,
  tempo: 100,
  seed: 0x8A2B0,
  blurb: 'Two nylon guitars in E minor — a syncopated hook, brushes, and a walking bass.',
  reverb: { rt60: 1.7, damp: 0.38, preDelay: 0.018, width: 1.0 },
  master: { drive: 1.22, lfeGain: 0.46 },
};

export function compose(S, O) {
  const { n, nylon, strum, bass, strings, shaker, kick, snare, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the room ──────────────────────────────────────────────────────────────
  const ld = S.track('guitar-lead', { az: 6, centre: 0.40, spread: 9, send: 0.26, gain: 0.95, body: BODY.nylon });
  const cp = S.track('guitar-comp', { az: -34, spread: 17, send: 0.30, gain: 0.62, body: BODY.nylon });
  const bs = S.track('bass', { az: -8, centre: 0.14, send: 0.11, gain: 0.88, body: BODY.upright, lp: 1900 });
  const dk = S.track('kit', { az: 14, centre: 0.20, spread: 10, send: 0.20, gain: 0.70 });
  const sh = S.track('shaker', { az: 44, pair: true, spread: 14, send: 0.34, gain: 0.34 });
  const st = S.track('strings', { az: 118, pair: true, spread: 28, send: 0.66, gain: 0.28, hp: 170 });

  const Em = { ch: ['E2', 'B2', 'E3', 'G3', 'B3'], pad: ['E3', 'G3', 'B3', 'E4'], root: 'E1', walk: ['E1', 'G1', 'A1', 'B1'] };
  const C = { ch: ['C2', 'G2', 'C3', 'E3', 'G3'], pad: ['C3', 'E3', 'G3', 'C4'], root: 'C2', walk: ['C2', 'E2', 'G2', 'B1'] };
  const G = { ch: ['G1', 'D2', 'G2', 'B2', 'D3'], pad: ['G2', 'B2', 'D3', 'G3'], root: 'G1', walk: ['G1', 'B1', 'D2', 'C2'] };
  const D = { ch: ['D2', 'A2', 'D3', 'F#3', 'A3'], pad: ['D3', 'F#3', 'A3', 'D4'], root: 'D2', walk: ['D2', 'F#2', 'A2', 'A1'] };

  const A_PROG = [Em, C, G, D];
  const B_PROG = [C, D, Em, Em];

  // ── parts ─────────────────────────────────────────────────────────────────
  /**
   * The comping hand. A real strumming pattern is D–D–U–U–D–U, and the UP
   * strokes hit the treble strings first, which `up: true` reverses the order
   * for. Varying `spread` note to note is what stops six strums in a row
   * sounding like one strum copied six times.
   */
  const PATTERN = [
    [0, false, 1.0], [1, false, 0.75], [1.5, true, 0.6],
    [2.5, true, 0.55], [3, false, 0.9], [3.5, true, 0.6],
  ];
  function comp(barIdx, ch, amp, mute = 0) {
    const t0 = barIdx * BAR;
    for (const [beat, up, w] of PATTERN) {
      const freqs = ch.ch.map(n);
      strum(cp.buf, t0 + B(beat) + J(), up ? freqs.slice(1) : freqs, amp * w, rng, {
        up, voice: nylon, spread: 0.012 + Math.abs(rng()) * 0.010,
        decay: 1.9, damp: 0.54, pick: 0.26, mute,
      });
    }
  }

  /** Walking-ish bass: root on 1, the chord's own steps through the bar. */
  function low(barIdx, ch, amp, beats = [0, 2]) {
    const t0 = barIdx * BAR;
    beats.forEach((beat, k) => {
      bass(bs.buf, t0 + B(beat) + J(), n(ch.walk[k % ch.walk.length]),
        amp * (beat === 0 ? 1.15 : 0.85), rng, { decay: 2.2 });
    });
  }

  function kit(barIdx, amp, { snareOn = true, busy = false } = {}) {
    const t0 = barIdx * BAR;
    kick(dk.buf, t0 + J(), amp * 0.85, rng, { f0: 120, f1: 44, decay: 9, click: 0.18 });
    if (busy) kick(dk.buf, t0 + B(2.5) + J(), amp * 0.55, rng, { f0: 110, f1: 44, decay: 10, click: 0.14 });
    if (snareOn) for (const beat of [1, 3]) {
      // brushes, not sticks: low rim tone, long noise decay
      snare(dk.buf, t0 + B(beat) + J(), amp * (beat === 3 ? 0.62 : 0.55), rng,
        { tone: 165, decay: 22, noiseDecay: 9, bright: 2600, rim: 0.12 });
    }
  }

  function ticks(barIdx, amp) {
    for (let k = 0; k < 8; k++) {
      shaker(sh.buf, barIdx * BAR + B(k * 0.5) + rng() * 0.008,
        amp * (k % 2 ? 0.48 : 1) * (k === 0 ? 1.25 : 1), rng, { rise: 0.011, fall: 0.065, f: 6000 });
    }
  }

  function pad(barIdx, bars, ch, amp) {
    const t0 = barIdx * BAR, d = bars * BAR;
    for (const name of ch.pad) {
      strings(st.buf, t0, d, n(name), amp, rng, { voices: 4, atk: 1.1, rel: 1.5, bright: 0.24 });
    }
  }

  /** The lead. Short notes are damped by `dur` — a fretting hand, not a ringing
   *  open string; letting every note ring would blur the syncopation away. */
  function lead(barIdx, rows, amp, { oct = 0 } = {}) {
    const t0 = barIdx * BAR;
    rows.forEach(([beat, name, len, w = 1]) => {
      const f = n(name) * (oct ? Math.pow(2, oct) : 1);
      nylon(ld.buf, t0 + B(beat) + J(), f, amp * w, rng, {
        decay: 2.8, damp: 0.44, pick: 0.20, bright: 0.44,
        dur: len >= 1.5 ? 0 : B(len) * 1.4,   // long notes ring, short ones stop
      });
    });
  }

  // ── THE HOOK — everything lands off the beat ──────────────────────────────
  const HOOK = [
    [[0, 'E4', 0.5], [0.5, 'G4', 0.5, 0.8], [1.5, 'B4', 1, 1.15], [2.5, 'A4', 0.5, 0.85], [3, 'G4', 1]],
    [[0, 'E4', 0.5, 0.9], [1, 'G4', 0.5, 0.8], [1.5, 'E4', 0.5, 0.75], [2.5, 'C5', 1.5, 1.15]],
    [[0, 'B4', 0.5], [0.5, 'D5', 1, 1.1], [2, 'B4', 0.5, 0.85], [2.5, 'G4', 0.5, 0.8], [3.5, 'A4', 0.5, 0.9]],
    [[0, 'D5', 1, 1.1], [1.5, 'C5', 0.5, 0.85], [2, 'B4', 1], [3.5, 'A4', 0.5, 0.9]],
  ];
  // The bridge climbs an arpeggio instead of dancing — a change of instinct,
  // not just a change of chord.
  const BRIDGE = [
    [[0, 'G4', 1], [1, 'C5', 1, 0.95], [2, 'E5', 1, 1.05], [3, 'G5', 1, 1.15]],
    [[0, 'F#5', 1.5], [1.5, 'E5', 0.5, 0.85], [2, 'D5', 2]],
    [[0, 'B4', 1], [1, 'E5', 1, 1.05], [2, 'D5', 0.5, 0.85], [2.5, 'B4', 1.5]],
    [[0, 'G4', 0.5, 0.85], [0.5, 'A4', 0.5, 0.9], [1, 'B4', 1], [2, 'E5', 2, 1.1]],
  ];
  const TAIL = [[0, 'E4', 0.5], [0.5, 'G4', 0.5, 0.85], [1.5, 'B4', 1, 1.1], [2.5, 'E5', 1.5, 1.15]];

  // ── 0–1 · intro — the strum alone ─────────────────────────────────────────
  comp(0, Em, 0.26);
  comp(1, Em, 0.30);
  low(1, Em, 0.30, [2]);

  // ── 2–5 · A ───────────────────────────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    comp(2 + i, ch, 0.30);
    lead(2 + i, HOOK[i], 0.42);
    if (i >= 2) low(2 + i, ch, 0.34, [0, 2]);
  });

  // ── 6–9 · A′ — the rhythm section arrives ─────────────────────────────────
  A_PROG.forEach((ch, i) => {
    comp(6 + i, ch, 0.33);
    lead(6 + i, HOOK[i], 0.50);
    low(6 + i, ch, 0.44, [0, 1, 2, 3]);
    kit(6 + i, 0.34);
    ticks(6 + i, 0.22);
  });

  // ── 10–13 · B — a register up, and the pattern changes ────────────────────
  B_PROG.forEach((ch, i) => {
    comp(10 + i, ch, 0.32, i === 3 ? 0.5 : 0);   // the last bridge bar palm-mutes
    lead(10 + i, BRIDGE[i], 0.52);
    low(10 + i, ch, 0.46, [0, 1.5, 2.5, 3.5]);
    kit(10 + i, 0.36, { busy: true });
    ticks(10 + i, 0.26);
    pad(10 + i, 1, ch, 0.18);
  });

  // ── 14–17 · A″ — everything ───────────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    comp(14 + i, ch, 0.38);
    lead(14 + i, HOOK[i], 0.62);
    // an octave shadow, quiet, only on the two brightest bars
    if (i === 1 || i === 2) lead(14 + i, HOOK[i], 0.15, { oct: 1 });
    low(14 + i, ch, 0.54, [0, 1, 2, 3]);
    kit(14 + i, 0.42, { busy: true });
    ticks(14 + i, 0.30);
    pad(14 + i, 1, ch, 0.28);
  });

  // ── 18–20 · close ─────────────────────────────────────────────────────────
  comp(18, Em, 0.36);
  lead(18, TAIL, 0.58);
  low(18, Em, 0.50, [0, 1, 2, 3]);
  kit(18, 0.40, { busy: true });
  ticks(18, 0.28);
  pad(18, 3, Em, 0.26);

  comp(19, D, 0.34);
  lead(19, [[0, 'D5', 1], [1, 'C5', 1, 0.9], [2, 'B4', 2, 0.95]], 0.54);
  low(19, D, 0.48, [0, 2]);
  kit(19, 0.38);

  // the final Em, strummed once and left to ring
  const last = 20 * BAR;
  strum(cp.buf, last, Em.ch.map(n), 0.52, rng, { voice: nylon, spread: 0.020, decay: 3.6, damp: 0.48, pick: 0.26 });
  strum(ld.buf, last + 0.015, ['E3', 'G3', 'B3', 'E4'].map(n), 0.40, rng, { voice: nylon, spread: 0.024, decay: 3.8, damp: 0.42, pick: 0.20 });
  bass(bs.buf, last, n('E1'), 0.60, rng, { decay: 3.8 });
  kick(dk.buf, last, 0.42, rng, { f0: 120, f1: 42, decay: 7, click: 0.2 });
}
