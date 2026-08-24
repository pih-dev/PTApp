// ─── boulevard — guitar, with the saxophone as a guest ───────────────────────
//
// Pierre on the sax: "Saxophone if used sparingly, and guitars."
//
// So the sax is not the leader here — it is the guest. It plays in exactly two
// places, states the tune, and is silent for the other fifteen bars. Counted
// honestly that is seven bars of twenty-two, and the restraint is the reason
// its entry at bar 10 lands at all. An instrument that never stops has no
// entrances.
//
// G minor, 92 bpm, on seventh chords: Gm7 – Cm7 – E♭maj7 – D7. The guitar is an
// archtop — a jazz box, so BODY.archtop and a mellow loop damping rather than
// the bright steel of `drive`.
//
// SWING is applied to every offbeat eighth: they land at 62% of the beat, not
// 50%. That one displacement, applied consistently to the comping, the brushes
// and the ride, is the difference between "played" and "programmed" — and it
// matters far more here than any timbre choice.
//
// FORM (bars of 4/4 at 92 bpm = 2.609 s each)
//   0–1   intro   guitar comping and the bass walking
//   2–5   A       GUITAR states the hook
//   6–9   A′      guitar varies it; the ride comes in
//   10–13 SAX     the guest arrives and takes the tune. Guitar comps only.
//   14–17 B       new changes; guitar again; NO SAX — it has to leave to return
//   18–20 SAX″    the sax takes it out, guitar in thirds underneath. Biggest.
//   21    close   one last chord, brushed
//
// The hook is a lazy blue line: the ♭3 (B♭) in its first bar, the ♭5 (A♭) as a
// passing note over the D7 in its last.

export const meta = {
  name: 'boulevard',
  title: 'Boulevard',
  dur: 58,
  tempo: 92,
  seed: 0xB0FED,
  blurb: 'A jazz-box guitar and a walking bass in G minor, with a tenor sax that shows up twice.',
  reverb: { rt60: 1.75, damp: 0.42, preDelay: 0.019, width: 1.0 },
  master: { drive: 1.16, lfeGain: 0.44 },
};

export function compose(S, O) {
  const { n, sax, steel, strum, bass, shaker, snare, cymbal, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.007;

  /**
   * SWING. An offbeat eighth is played late, at 62% of the beat rather than
   * 50%. Everything rhythmic in this piece goes through here — if the comping
   * swings and the brushes do not, the result is worse than no swing at all.
   */
  const sw = (beat) => {
    const whole = Math.floor(beat), frac = beat - whole;
    return Math.abs(frac - 0.5) < 1e-9 ? whole + 0.62 : beat;
  };
  const T = (barIdx, beat) => barIdx * BAR + B(sw(beat)) + J();

  // ── the room ──────────────────────────────────────────────────────────────
  // The comping sits off to the left, the sax front and anchored — the classic
  // small-club placement, and it keeps the guest out of the guitar's image.
  const cp = S.track('guitar-comp', { az: -38, spread: 15, send: 0.30, gain: 0.66, body: BODY.archtop });
  const ld = S.track('guitar-lead', { az: -12, centre: 0.24, spread: 8, send: 0.26, gain: 0.88, body: BODY.archtop });
  const sx = S.track('sax', { az: 10, centre: 0.46, spread: 6, send: 0.30, gain: 1.0 });
  const bs = S.track('bass', { az: -3, centre: 0.18, send: 0.10, gain: 0.92, body: BODY.upright, lp: 1700 });
  const br = S.track('brushes', { az: 40, pair: true, spread: 16, send: 0.32, gain: 0.40 });
  const rd = S.track('ride', { az: 56, send: 0.44, gain: 0.30 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // Rootless-ish voicings — the bass has the root, so the guitar plays the
  // 3rd, 7th and the colour. Doubling the root in both is what makes an
  // amateur jazz arrangement sound thick and dead.
  const Gm7 = { ch: ['Bb3', 'D4', 'F4'], walk: ['G1', 'Bb1', 'D2', 'Db2'] };
  const Cm7 = { ch: ['Eb3', 'G3', 'Bb3'], walk: ['C2', 'Eb2', 'F2', 'E2'] };
  const Ebma = { ch: ['G3', 'Bb3', 'D4'], walk: ['Eb2', 'G2', 'Bb2', 'C#2'] };
  const D7 = { ch: ['F#3', 'A3', 'C4'], walk: ['D2', 'F#2', 'A2', 'Ab2'] };
  const F7 = { ch: ['A3', 'C4', 'Eb4'], walk: ['F1', 'A1', 'C2', 'B1'] };
  const Bbma = { ch: ['D3', 'F3', 'A3'], walk: ['Bb1', 'D2', 'F2', 'E2'] };

  const A_PROG = [Gm7, Cm7, Ebma, D7];
  const B_PROG = [Cm7, F7, Bbma, Ebma];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** Comping: chords on the offbeats, which is where a jazz guitarist puts
   *  them — on the beat it would fight the bass for the pulse. */
  function comp(barIdx, ch, amp, beats = [1.5, 2.5, 3.5]) {
    for (const beat of beats) {
      strum(cp.buf, T(barIdx, beat), ch.ch.map(n), amp * (beat === 1.5 ? 1.1 : 0.85), rng, {
        voice: steel, spread: 0.009 + Math.abs(rng()) * 0.006,
        decay: 1.4, damp: 0.46, pick: 0.24, bright: 0.42, dur: B(0.9),
      });
    }
  }

  /** The walking bass — four quarter notes, and the fourth is a chromatic
   *  approach note a semitone from the NEXT chord's root. That approach note is
   *  the entire engine of the style; without it a walk is just an arpeggio. */
  function walk(barIdx, ch, amp) {
    ch.walk.forEach((name, k) => {
      bass(bs.buf, barIdx * BAR + B(k) + J(), n(name),
        amp * (k === 0 ? 1.15 : k === 3 ? 0.85 : 0.95), rng, { decay: 1.9, damp: 0.72 });
    });
  }

  function brushes(barIdx, amp, { ride = false } = {}) {
    for (let k = 0; k < 8; k++) {
      const beat = k * 0.5;
      shaker(br.buf, T(barIdx, beat), amp * (k % 2 ? 0.42 : 0.9) * (k === 0 ? 1.2 : 1), rng,
        { rise: 0.020, fall: 0.13, f: 4200 });
      if (ride) cymbal(rd.buf, T(barIdx, beat), amp * (k % 2 ? 0.10 : 0.18), rng, { decay: 1.6, f: 620, modes: 6 });
    }
    // the brush stroke on 2 and 4 — soft, no crack
    for (const beat of [1, 3]) snare(br.buf, barIdx * BAR + B(beat) + J(), amp * 0.42, rng,
      { tone: 150, decay: 24, noiseDecay: 7, bright: 2200, rim: 0.08 });
  }

  function gtLine(barIdx, rows, amp, { third = false } = {}) {
    rows.forEach(([beat, name, len, w = 1]) => {
      steel(ld.buf, T(barIdx, beat), n(name), amp * w, rng,
        { decay: 2.4, damp: 0.48, pick: 0.22, bright: 0.44, dur: len >= 2 ? 0 : B(len) * 1.4 });
      // under the sax in the last section the guitar shadows a third below
      if (third) steel(ld.buf, T(barIdx, beat) + 0.012, n(name) / Math.pow(2, 4 / 12), amp * w * 0.5, rng,
        { decay: 2.2, damp: 0.52, pick: 0.22, bright: 0.4, dur: B(len) * 1.2 });
    });
  }

  function sxLine(barIdx, rows, amp) {
    rows.forEach(([beat, name, len, w = 1]) => {
      sax(sx.buf, T(barIdx, beat), B(len) * 0.90, n(name), amp * w, rng, {
        kind: 'tenor',
        vibDelay: len >= 2 ? 0.40 : 0.9,   // the vibrato arrives at the END of a note
        vib: len >= 2 ? 0.010 : 0.003,
        breath: 0.28, bendIn: len >= 1 ? 0.026 : 0.012,
        atk: 0.030, rel: Math.min(0.34, B(len) * 0.5),
      });
    });
  }

  // ── THE HOOK ──────────────────────────────────────────────────────────────
  // ♭3 (B♭) on the end of bar 1, ♭5 (A♭) as a passing note over the D7 — the
  // two blue notes, both placed where they lean rather than where they clash.
  const HOOK = [
    [[0, 'D4', 1], [1, 'F4', 0.5, 0.85], [1.5, 'G4', 1.5], [3, 'Bb4', 1, 1.05]],
    [[0, 'C5', 1.5, 1.05], [1.5, 'Bb4', 0.5, 0.85], [2, 'G4', 2]],
    [[0, 'Bb4', 1], [1, 'D5', 1], [2, 'Eb5', 2, 1.12]],
    [[0, 'A4', 1], [1, 'Ab4', 0.5, 0.8], [1.5, 'F#4', 1.5], [3, 'D4', 1, 0.9]],
  ];
  // The second time round the guitar plays it looser and higher.
  const HOOK_B = [
    [[0, 'G4', 0.5], [0.5, 'Bb4', 0.5, 0.9], [1, 'D5', 1], [2.5, 'C5', 1.5]],
    [[0, 'Bb4', 1], [1, 'C5', 0.5, 0.85], [1.5, 'Eb5', 1.5, 1.08], [3, 'D5', 1]],
    [[0, 'Bb4', 1.5], [1.5, 'G4', 0.5, 0.85], [2, 'D5', 2]],
    [[0, 'F#4', 1], [1, 'A4', 1], [2, 'C5', 1, 0.95], [3, 'Ab4', 1, 0.85]],
  ];
  // The bridge — the guitar's own four bars over the new changes.
  const BRIDGE = [
    [[0, 'Eb4', 1], [1, 'G4', 1], [2, 'Bb4', 2, 1.05]],
    [[0, 'A4', 1], [1, 'C5', 0.5, 0.9], [1.5, 'Eb5', 1.5, 1.1], [3, 'C5', 1]],
    [[0, 'D5', 1.5], [1.5, 'C5', 0.5, 0.85], [2, 'A4', 2]],
    [[0, 'G4', 1], [1, 'Bb4', 1], [2, 'D5', 2, 1.05]],
  ];

  // ── 0–1 · intro — comping and the walk, no tune ───────────────────────────
  comp(0, Gm7, 0.24, [1.5, 3.5]);
  comp(1, Gm7, 0.28);
  walk(0, Gm7, 0.42);
  walk(1, Gm7, 0.46);
  brushes(1, 0.22);

  // ── 2–5 · A — the guitar states it ────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    gtLine(2 + i, HOOK[i], 0.44);
    comp(2 + i, ch, 0.24);
    walk(2 + i, ch, 0.48);
    brushes(2 + i, 0.24);
  });

  // ── 6–9 · A′ — looser, higher, and the ride joins ─────────────────────────
  A_PROG.forEach((ch, i) => {
    gtLine(6 + i, HOOK_B[i], 0.48);
    comp(6 + i, ch, 0.27);
    walk(6 + i, ch, 0.52);
    brushes(6 + i, 0.28, { ride: true });
  });

  // ── 10–13 · THE GUEST. Guitar drops to comping and stays there. ──────────
  A_PROG.forEach((ch, i) => {
    sxLine(10 + i, HOOK[i], 0.50);
    comp(10 + i, ch, 0.26);
    walk(10 + i, ch, 0.52);
    brushes(10 + i, 0.28, { ride: true });
  });

  // ── 14–17 · B — new changes, guitar again, and NO SAX ────────────────────
  B_PROG.forEach((ch, i) => {
    gtLine(14 + i, BRIDGE[i], 0.50);
    comp(14 + i, ch, 0.28, [1.5, 2.5, 3.5]);
    walk(14 + i, ch, 0.54);
    brushes(14 + i, 0.30, { ride: true });
  });

  // ── 18–20 · the sax takes it out, guitar in thirds under it ──────────────
  A_PROG.slice(0, 3).forEach((ch, i) => {
    sxLine(18 + i, HOOK[i], 0.62);
    gtLine(18 + i, HOOK[i], 0.20, { third: true });
    comp(18 + i, ch, 0.30);
    walk(18 + i, ch, 0.60);
    brushes(18 + i, 0.34, { ride: true });
  });

  // ── 21 · close ────────────────────────────────────────────────────────────
  // Land on the D7 and then let the Gm ring — the resolution the whole piece
  // has been walking towards.
  gtLine(21, [[0, 'A4', 1], [1, 'Ab4', 0.5, 0.8], [1.5, 'F#4', 1.5], [3, 'D4', 1, 0.85]], 0.48);
  comp(21, D7, 0.28);
  walk(21, D7, 0.58);
  brushes(21, 0.32, { ride: true });
  sxLine(21, [[3, 'G4', 1.2, 0.9]], 0.46);

  const last = 22 * BAR;
  ['Bb3', 'D4', 'F4', 'G4'].forEach((name, k) => {
    steel(cp.buf, last + k * 0.016, n(name), 0.40 - k * 0.05, rng, { decay: 3.2, damp: 0.46, pick: 0.24, bright: 0.4 });
  });
  bass(bs.buf, last, n('G1'), 0.62, rng, { decay: 3.6, damp: 0.70 });
  sax(sx.buf, last, 3.0, n('G4'), 0.42, rng,
    { kind: 'tenor', vibDelay: 0.45, vib: 0.012, breath: 0.30, bendIn: 0.024, rel: 1.2 });
  cymbal(rd.buf, last, 0.16, rng, { decay: 3.2, f: 600, modes: 7 });
}
