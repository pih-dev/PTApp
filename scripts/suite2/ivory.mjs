// ─── ivory — the piano piece ─────────────────────────────────────────────────
//
// Pierre: "Can you compose one with the piano?"
//
// C minor, 92 bpm. The hook is the i–VI–III–VII loop (Cm–Ab–Eb–Bb), which is
// the most reliably singable minor progression there is, with an arch melody
// that climbs to C5 in its third bar and falls home in its fourth. The tune is
// stated four times and never identically: bare, doubled at the octave, lifted
// into a bridge, then full with the strings and the low octave underneath.
//
// FORM (bars of 4/4 at 92 bpm = 2.609 s each)
//   0–1   intro    left hand alone, pedal per bar
//   2–5   A        the hook, one voice
//   6–9   A′       + octave doubling, bass enters, brushes
//   10–13 B        bridge (iv–i–VI–VII), melody a fourth higher, strings swell
//   14–18 A″       full: hook in octaves, low bass, strings, a five-bar close
//   19–20 outro    the last chord ringing, one high answer
//
// THIS FILE IS THE TEMPLATE for the rest of the suite: a piece is a `meta`
// object plus a `compose(S, O)` that writes into positioned tracks. It never
// touches channels, reverb, folding or encoding — make-suite2.mjs owns those.

export const meta = {
  name: 'ivory',
  title: 'Ivory',
  dur: 57,
  tempo: 92,
  seed: 0x1F0E7,
  blurb: 'Solo piano in C minor — a four-bar hook stated four ways, strings arriving only at the last.',
  // A concert hall: long, dark, and mostly behind you.
  reverb: { rt60: 2.4, damp: 0.40, preDelay: 0.028, width: 1.15 },
  master: { drive: 1.15, lfeGain: 0.42 },
};

export function compose(S, O) {
  const { n, piano, bass, strings, shaker, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;              // 2.609 s
  const B = (x) => S.b(x);        // beats → seconds

  // ── the room ──────────────────────────────────────────────────────────────
  // A piano is WIDE and slightly left of the listener, the way it sits under
  // the player's hands; the strings live behind and around, never in front of
  // the piano, or they fight it for the same image.
  const pf = S.track('piano', { az: -7, centre: 0.42, spread: 18, send: 0.30, gain: 1.0, body: BODY.piano, bodyDry: 0.80 });
  const bs = S.track('bass', { az: -12, centre: 0.14, send: 0.13, gain: 0.80, body: BODY.upright, bodyDry: 0.70, lp: 2200 });
  // pair:true — a string bed has to arrive from BOTH sides or it is a hole,
  // not a room. Written once, mirrored by the spatialiser.
  const stF = S.track('strings-front', { az: 38, pair: true, spread: 16, send: 0.52, gain: 0.52, hp: 120 });
  const stB = S.track('strings-room', { az: 122, pair: true, spread: 26, send: 0.70, gain: 0.34, hp: 180 });
  const br = S.track('brushes', { az: 34, centre: 0, send: 0.38, gain: 0.44 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // Each entry: [root for the left hand, the chord tones the pad holds].
  const Cm = { lh: ['C2', 'G2', 'C3', 'Eb3'], pad: ['C3', 'Eb3', 'G3', 'C4'], bass: 'C1' };
  const Ab = { lh: ['Ab1', 'Eb2', 'Ab2', 'C3'], pad: ['Ab2', 'C3', 'Eb3', 'Ab3'], bass: 'Ab1' };
  const Eb = { lh: ['Eb2', 'Bb2', 'Eb3', 'G3'], pad: ['Eb3', 'G3', 'Bb3', 'Eb4'], bass: 'Eb1' };
  const Bb = { lh: ['Bb1', 'F2', 'Bb2', 'D3'], pad: ['Bb2', 'D3', 'F3', 'Bb3'], bass: 'Bb1' };
  const Fm = { lh: ['F1', 'C2', 'F2', 'Ab2'], pad: ['F2', 'Ab2', 'C3', 'F3'], bass: 'F1' };

  const A_PROG = [Cm, Ab, Eb, Bb];
  const B_PROG = [Fm, Cm, Ab, Bb];

  /**
   * The left hand: a broken chord in eighths, root–5th–octave–3rd–octave–5th…
   * The pedal lifts at the bar line, so every note is cut at the chord change
   * instead of ringing into the next harmony. That single detail is the
   * difference between "pedalled piano" and "mud".
   */
  function leftHand(barIdx, ch, amp, pattern = [0, 1, 2, 3, 2, 1, 2, 3]) {
    const t0 = barIdx * BAR;
    const barEnd = t0 + BAR;
    pattern.forEach((deg, k) => {
      const t = t0 + B(k * 0.5);
      // A human left hand is not a metronome and does not play every note at
      // the same weight: the downbeat leans, the offbeats give way.
      const lean = k === 0 ? 1.18 : k === 4 ? 1.06 : 0.86;
      const swing = k % 2 ? B(0.012) : 0;
      piano(pf.buf, t + swing + rng() * 0.004, barEnd - t, n(ch.lh[deg]), amp * lean, rng, { hard: 0.42 });
    });
  }

  /** The melody. Notes are [beat within the bar, name, length in beats, weight]. */
  function melody(barIdx, notes, amp, { octave = false, octAmp = 0.36 } = {}) {
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w = 1] of notes) {
      const t = t0 + B(beat) + rng() * 0.006;
      const f = n(name);
      // hard:0.62 — the right hand strikes brighter than the left, which is
      // true of the instrument and is most of what separates the two voices.
      piano(pf.buf, t, B(len) * 0.92, f, amp * w, rng, { hard: 0.62 });
      if (octave) piano(pf.buf, t + 0.004, B(len) * 0.92, f * 2, amp * w * octAmp, rng, { hard: 0.7 });
    }
  }

  function pad(barIdx, bars, ch, amp, { room = true } = {}) {
    const t0 = barIdx * BAR, dur = bars * BAR;
    for (const name of ch.pad) {
      strings(stF.buf, t0, dur, n(name), amp, rng, { voices: 5, atk: 1.1, rel: 1.6, bright: 0.34 });
      if (room) strings(stB.buf, t0 + 0.05, dur, n(name), amp * 0.8, rng, { voices: 4, atk: 1.5, rel: 2.2, bright: 0.22 });
    }
  }

  function walk(barIdx, ch, amp, hits = [0, 2.5]) {
    for (const beat of hits) bass(bs.buf, barIdx * BAR + S.b(beat) + rng() * 0.005, n(ch.bass), amp, rng, { decay: 2.4 });
  }

  function brushes(barIdx, amp) {
    for (let k = 0; k < 8; k++) {
      const t = barIdx * BAR + B(k * 0.5) + rng() * 0.008;
      shaker(br.buf, t, amp * (k % 2 ? 0.55 : 1) * (k === 0 ? 1.25 : 1), rng, { rise: 0.014, fall: 0.09, f: 5200 });
    }
  }

  // ── THE HOOK ──────────────────────────────────────────────────────────────
  // An arch: sits on G, lifts to C5 at the third bar, walks home. Four bars,
  // eight notes a bar at most — short enough to whistle after one hearing,
  // which is the whole of what "catchy" means.
  const HOOK = [
    [[0, 'G4', 1.5], [1.5, 'Ab4', 0.5, 0.8], [2, 'G4', 1], [3, 'Eb4', 1, 0.9]],
    [[0, 'F4', 2], [2, 'Eb4', 1, 0.85], [3, 'F4', 1, 0.8]],
    [[0, 'G4', 1.5], [1.5, 'Bb4', 0.5, 0.9], [2, 'C5', 2, 1.1]],
    [[0, 'Bb4', 1], [1, 'Ab4', 1, 0.9], [2, 'G4', 2, 0.95]],
  ];
  // The answer phrase: the same shape a fourth up, opening the bridge out.
  const BRIDGE = [
    [[0, 'Ab4', 1], [1, 'C5', 1, 0.9], [2, 'F5', 2, 1.1]],
    [[0, 'Eb5', 1.5], [1.5, 'D5', 0.5, 0.85], [2, 'C5', 2]],
    [[0, 'C5', 1], [1, 'Eb5', 1, 0.95], [2, 'F5', 1], [3, 'Eb5', 1, 0.9]],
    [[0, 'D5', 2], [2, 'Bb4', 2, 0.9]],
  ];
  // The close: the hook one last time, then a five-bar landing.
  const TAIL = [[0, 'G4', 1.5], [1.5, 'Ab4', 0.5, 0.8], [2, 'G4', 1.5], [3.5, 'F4', 0.5, 0.8]];

  // ── 0–1 · intro ───────────────────────────────────────────────────────────
  leftHand(0, Cm, 0.24, [0, 1, 2, 1, 2, 1, 2, 3]);
  leftHand(1, Cm, 0.27);
  // one high bell-note to say the tune is coming
  melody(1, [[3, 'G5', 1, 0.45]], 0.32);

  // ── 2–5 · A — the hook, bare ──────────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    leftHand(2 + i, ch, 0.29);
    melody(2 + i, HOOK[i], 0.44);
  });

  // ── 6–9 · A′ — octave doubling, bass, brushes ─────────────────────────────
  A_PROG.forEach((ch, i) => {
    leftHand(6 + i, ch, 0.36);
    melody(6 + i, HOOK[i], 0.55, { octave: true });
    walk(6 + i, ch, 0.42);
    brushes(6 + i, 0.30);
  });
  pad(8, 2, Eb, 0.20, { room: false });   // the strings creep in unannounced

  // ── 10–13 · B — the bridge ────────────────────────────────────────────────
  B_PROG.forEach((ch, i) => {
    leftHand(10 + i, ch, 0.36, [0, 1, 2, 3, 2, 3, 2, 1]);
    melody(10 + i, BRIDGE[i], 0.54, { octave: i >= 2, octAmp: 0.28 });
    walk(10 + i, ch, 0.44, [0, 1.5, 2.5]);
    brushes(10 + i, 0.26);
    pad(10 + i, 1, ch, 0.26);
  });

  // ── 14–17 · A″ — everything ───────────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    leftHand(14 + i, ch, 0.47);
    melody(14 + i, HOOK[i], 0.70, { octave: true, octAmp: 0.5 });
    // the low octave under the left hand — the weight the piece has been
    // holding back for fourteen bars
    piano(pf.buf, (14 + i) * BAR, BAR, n(ch.lh[0]) / 2, 0.34, rng, { hard: 0.3 });
    walk(14 + i, ch, 0.50, [0, 1.5, 2.5, 3.5]);
    brushes(14 + i, 0.34);
    pad(14 + i, 1, ch, 0.32);
  });

  // ── 18–20 · the landing ───────────────────────────────────────────────────
  // Bar 18 restates the head and then stops dead on the tonic; the last two
  // bars are just the chord decaying in the hall with one high answer over it.
  leftHand(18, Cm, 0.40, [0, 1, 2, 3, 2, 1, 0, 1]);
  melody(18, TAIL, 0.56, { octave: true, octAmp: 0.42 });
  walk(18, Cm, 0.48, [0, 2]);
  brushes(18, 0.30);
  pad(18, 3, Cm, 0.30);

  const last = 19 * BAR;
  for (const [k, name] of ['C2', 'G2', 'C3', 'Eb3', 'G3', 'C4'].entries()) {
    piano(pf.buf, last + k * 0.035, 6, n(name), 0.30 - k * 0.02, rng, { hard: 0.35, sustain: true });
  }
  bass(bs.buf, last, n('C1'), 0.55, rng, { decay: 4.5 });
  piano(pf.buf, last + S.b(2.5), 4, n('G5'), 0.24, rng, { hard: 0.6, sustain: true });
  piano(pf.buf, last + S.b(3.5), 4, n('C6'), 0.17, rng, { hard: 0.6, sustain: true });
}
