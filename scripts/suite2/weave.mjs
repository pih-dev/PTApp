// ─── weave — flute and guitar, the duet ──────────────────────────────────────
//
// Pierre: "compose probably one take… where two are in there."
//
// G major, 96 bpm. This is the only piece where the flute and the guitar share
// the front of the room, so they are placed far enough apart to be told apart:
// guitar at −22°, flute at +21°, both lightly centre-anchored so neither
// wanders. The listener should be able to point at each one.
//
// The whole piece is call and response, and its one rule is that THE TWO
// VOICES NEVER SOUND THE SAME NOTES AT THE SAME TIME until the last section.
// That restraint is the piece: four minutes of two instruments taking turns
// makes eight bars of them together into an event.
//
// Progression: G – Em – C – D (I – vi – IV – V).
//
// FORM (bars of 4/4 at 96 bpm = 2.5 s each)
//   0–1   intro   guitar arpeggio alone
//   2–5   A       GUITAR states the hook; flute silent
//   6–9   A-ans   FLUTE answers it a third higher; guitar drops to chords
//   10–13 A′      they swap — flute takes the hook, guitar fills the rests
//   14–17 B       trading two-bar phrases, faster, with a lydian C♯ lift
//   18–21 A″      TOGETHER at last, flute a sixth above the guitar. The payoff.
//
// The hook ends on A — the 2nd, not the tonic — so it is a QUESTION. An answer
// only sounds like an answer if the thing before it did not resolve.

export const meta = {
  name: 'weave',
  title: 'Weave',
  dur: 57,
  tempo: 96,
  seed: 0x3EA7E,
  blurb: 'Nylon guitar and flute trading a hook in G major, and finally playing it together in sixths.',
  reverb: { rt60: 1.9, damp: 0.36, preDelay: 0.020, width: 1.05 },
  master: { drive: 1.18, lfeGain: 0.42 },
};

export function compose(S, O) {
  const { n, flute, nylon, bass, strings, shaker, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the room — the two leads deliberately far apart ───────────────────────
  //
  // 🔴 THE GAINS ARE NOT COSMETIC. Written at the same nominal amp, the flute
  // measured 10 dB hotter than the guitar and threw the front pair 7 dB out of
  // balance. A sustained note carries energy for its whole length; a plucked
  // one is a spike that decays. `amp: 1` is normalised so every voice PEAKS at
  // about 1.0, which is what makes levels comparable across instruments — but
  // peak is not loudness, and in a duet the two voices have to be equal. So the
  // guitar is lifted and the flute pulled back until both tracks measure the
  // same RMS. In `ridge` the guitar is accompaniment and is meant to sit under
  // the flute; here they are partners.
  const gt = S.track('guitar', { az: -22, centre: 0.22, spread: 8, send: 0.28, gain: 2.30, body: BODY.nylon });
  const fl = S.track('flute', { az: 21, centre: 0.26, spread: 7, send: 0.32, gain: 0.62 });
  const bs = S.track('bass', { az: -4, centre: 0.16, send: 0.11, gain: 0.84, body: BODY.upright, lp: 1900 });
  const sh = S.track('shaker', { az: 40, pair: true, spread: 10, send: 0.34, gain: 0.55 });
  const st = S.track('strings', { az: 124, pair: true, spread: 30, send: 0.70, gain: 0.30, hp: 160 });

  const G = { arp: ['G2', 'D3', 'G3', 'B3'], ch: ['G2', 'B2', 'D3', 'G3'], pad: ['G3', 'B3', 'D4', 'G4'], root: 'G1' };
  const Em = { arp: ['E2', 'B2', 'E3', 'G3'], ch: ['E2', 'G2', 'B2', 'E3'], pad: ['E3', 'G3', 'B3', 'E4'], root: 'E1' };
  const C = { arp: ['C3', 'G3', 'C4', 'E4'], ch: ['C3', 'E3', 'G3', 'C4'], pad: ['C3', 'E3', 'G3', 'C4'], root: 'C2' };
  const D = { arp: ['D3', 'A3', 'D4', 'F#4'], ch: ['D3', 'F#3', 'A3', 'D4'], pad: ['D3', 'F#3', 'A3', 'D4'], root: 'D2' };

  const PROG = [G, Em, C, D];

  // ── the two lines ─────────────────────────────────────────────────────────
  // THE HOOK: low, middle, high-and-held, three times over; the fourth bar
  // walks down and stops on A without resolving.
  const HOOK = [
    [[0, 'D4', 1], [1, 'G4', 1], [2, 'B4', 2, 1.1]],
    [[0, 'B4', 1], [1, 'A4', 1, 0.9], [2, 'G4', 2]],
    [[0, 'E4', 1], [1, 'G4', 1], [2, 'C5', 2, 1.12]],
    [[0, 'B4', 1], [1, 'A4', 2, 0.95], [3, 'A4', 1, 0.8]],
  ];
  // THE ANSWER: the same shape a third higher, bent to land on chord tones.
  const ANSWER = [
    [[0, 'B4', 1], [1, 'D5', 1], [2, 'G5', 2, 1.1]],
    [[0, 'D5', 1], [1, 'C5', 1, 0.9], [2, 'B4', 2]],
    [[0, 'G4', 1], [1, 'B4', 1], [2, 'E5', 2, 1.12]],
    [[0, 'D5', 1], [1, 'C5', 2, 0.95], [3, 'C5', 1, 0.8]],
  ];
  // THE HOOK IN SIXTHS — what the flute plays over the guitar's hook in A″.
  // A sixth above, diatonically: D→B, G→E, B→G, A→F♯, E→C, C→A.
  const SIXTHS = [
    [[0, 'B4', 1], [1, 'E5', 1], [2, 'G5', 2, 1.1]],
    [[0, 'G5', 1], [1, 'F#5', 1, 0.9], [2, 'E5', 2]],
    [[0, 'C5', 1], [1, 'E5', 1], [2, 'A5', 2, 1.12]],
    [[0, 'G5', 1], [1, 'F#5', 2, 0.95], [3, 'F#5', 1, 0.8]],
  ];
  // The bridge trades in two-bar halves. The C♯ in its third bar is the whole
  // reason for the bridge: a raised 4th over a G chord is the lydian lift, and
  // it arrives on a weak beat and resolves straight up to D so it colours the
  // phrase rather than fighting it.
  const TRADE_GT = [
    [[0, 'G4', 0.5], [0.5, 'A4', 0.5], [1, 'B4', 1], [2, 'D5', 1, 1.05], [3, 'B4', 1]],
    [[0, 'A4', 1], [1, 'G4', 1], [2, 'E4', 2, 0.9]],
  ];
  const TRADE_FL = [
    [[0, 'D5', 0.5], [0.5, 'E5', 0.5], [1, 'F#5', 1], [2, 'G5', 2, 1.15]],
    [[0, 'E5', 1], [1, 'C#5', 1, 0.9], [2, 'D5', 2, 1.05]],
  ];

  // ── parts ─────────────────────────────────────────────────────────────────
  function arp(barIdx, ch, amp, pattern = [0, 1, 2, 3, 2, 1, 2, 3]) {
    const t0 = barIdx * BAR;
    pattern.forEach((deg, k) => {
      const lean = k === 0 ? 1.28 : k === 4 ? 1.06 : 0.74;
      nylon(gt.buf, t0 + B(k * 0.5) + J(), n(ch.arp[deg]), amp * lean, rng,
        { decay: 2.3, damp: 0.54, pick: 0.28 });
    });
  }

  /** Chords under the OTHER voice's phrase — quiet, sparse, staying out of it. */
  function chords(barIdx, ch, amp, beats = [0, 2]) {
    for (const beat of beats) {
      ch.ch.forEach((name, k) => {
        nylon(gt.buf, barIdx * BAR + B(beat) + k * 0.014 + J(), n(name), amp * (1 - k * 0.12), rng,
          { decay: 2.0, damp: 0.58, pick: 0.30 });
      });
    }
  }

  function gtLine(barIdx, rows, amp) {
    const t0 = barIdx * BAR;
    rows.forEach(([beat, name, len, w = 1]) => {
      nylon(gt.buf, t0 + B(beat) + J(), n(name), amp * w, rng,
        { decay: 2.9, damp: 0.44, pick: 0.21, bright: 0.45, dur: len >= 2 ? 0 : B(len) * 1.5 });
    });
  }

  function flLine(barIdx, rows, amp, breath = 0.34) {
    const t0 = barIdx * BAR;
    let prev = 0;
    rows.forEach(([beat, name, len, w = 1], i) => {
      const f = n(name);
      const opening = i === 0;
      flute(fl.buf, t0 + B(beat) + J(), B(len) * 0.94, f, amp * w, rng, {
        legatoFrom: opening ? 0 : prev,
        chiff: opening ? 0.5 : 0.14,
        scoop: opening ? 0.032 : 0.007,
        breath,
        vibDelay: len >= 2 ? 0.34 : 0.62,
        vib: len >= 2 ? 0.012 : 0.005,
        atk: opening ? 0.08 : 0.05,
      });
      prev = f;
    });
  }

  function low(barIdx, ch, amp, beats = [0, 2]) {
    for (const beat of beats) bass(bs.buf, barIdx * BAR + B(beat) + J(), n(ch.root), amp, rng, { decay: 2.4 });
  }

  function ticks(barIdx, amp) {
    for (let k = 0; k < 8; k++) {
      shaker(sh.buf, barIdx * BAR + B(k * 0.5) + rng() * 0.008,
        amp * (k % 2 ? 0.5 : 1) * (k === 0 ? 1.25 : 1), rng, { rise: 0.012, fall: 0.075, f: 5600 });
    }
  }

  // ── 0–1 · intro — guitar alone ────────────────────────────────────────────
  arp(0, G, 0.26, [0, 1, 2, 3]);
  arp(1, G, 0.30);
  low(1, G, 0.32, [0, 2]);

  // ── 2–5 · A — the guitar asks. The flute is not in the room yet. ─────────
  PROG.forEach((ch, i) => {
    gtLine(2 + i, HOOK[i], 0.46);
    chords(2 + i, ch, 0.16, [0]);
    low(2 + i, ch, 0.34, i >= 2 ? [0, 2] : [0]);
  });

  // ── 6–9 · the flute answers; the guitar steps back to chords ──────────────
  PROG.forEach((ch, i) => {
    flLine(6 + i, ANSWER[i], 0.44);
    chords(6 + i, ch, 0.22, [0, 2]);
    low(6 + i, ch, 0.38, [0, 2]);
    if (i >= 1) ticks(6 + i, 0.18);
  });

  // ── 10–13 · they swap — flute has the hook, guitar fills the RESTS ────────
  // The guitar's fills are written into the gaps in the hook (beats 3–4 of the
  // odd bars), never on top of it. Two voices at once here would spend the
  // payoff eight bars early.
  PROG.forEach((ch, i) => {
    flLine(10 + i, HOOK[i], 0.52, 0.30);
    chords(10 + i, ch, 0.20, [0]);
    if (i % 2 === 1) gtLine(10 + i, [[3, 'D4', 0.5, 0.7], [3.5, 'G4', 0.5, 0.6]], 0.30);
    low(10 + i, ch, 0.42, [0, 1.5, 2.5]);
    ticks(10 + i, 0.22);
  });

  // ── 14–17 · B — trading two-bar phrases, and the lydian lift ──────────────
  const B_PROG = [C, D, G, Em];
  B_PROG.forEach((ch, i) => {
    const half = i < 2 ? 0 : 1;
    if (i % 2 === 0) gtLine(14 + i, TRADE_GT[half], 0.48);
    else flLine(14 + i, TRADE_FL[half], 0.50, 0.30);
    chords(14 + i, ch, 0.20, [0, 2]);
    low(14 + i, ch, 0.44, [0, 1.5, 2.5, 3.5]);
    ticks(14 + i, 0.26);
  });

  // ── 18–21 · A″ — together, the flute a sixth above. The point of it all. ──
  PROG.forEach((ch, i) => {
    gtLine(18 + i, HOOK[i], 0.56);
    flLine(18 + i, SIXTHS[i], 0.58, 0.28);
    chords(18 + i, ch, 0.24, [0, 2]);
    low(18 + i, ch, 0.54, [0, 1, 2, 3]);
    ticks(18 + i, 0.30);
    for (const name of ch.pad) strings(st.buf, (18 + i) * BAR, BAR * 1.1, n(name), 0.26, rng,
      { voices: 4, atk: 0.8, rel: 1.4, bright: 0.26 });
  });

  // ── the close — one G, both of them, and out ──────────────────────────────
  const last = 22 * BAR;
  ['G2', 'D3', 'G3', 'B3', 'D4'].forEach((name, k) => {
    nylon(gt.buf, last + k * 0.018, n(name), 0.44 - k * 0.05, rng, { decay: 3.6, damp: 0.46, pick: 0.24 });
  });
  bass(bs.buf, last, n('G1'), 0.58, rng, { decay: 3.8 });
  flute(fl.buf, last + B(0.25), 3.2, n('G5'), 0.40, rng,
    { chiff: 0.30, scoop: 0.03, breath: 0.32, vibDelay: 0.45, vib: 0.013, rel: 1.3 });
  flute(fl.buf, last + B(0.25) + 0.02, 3.2, n('B4'), 0.13, rng,
    { chiff: 0.10, breath: 0.30, vibDelay: 0.5, rel: 1.3 });
  for (const name of G.pad) strings(st.buf, last, 3.6, n(name), 0.24, rng, { voices: 4, atk: 0.6, rel: 2.0, bright: 0.22 });
}
