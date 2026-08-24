// ─── ridge — flute, wide and cinematic ───────────────────────────────────────
//
// Pierre: "I like the flute."
//
// D dorian, 84 bpm. Dorian rather than natural minor because of ONE note: the
// B natural in the IV chord (G major). That single major chord inside a minor
// key is what stops the piece sounding sad and makes it sound like open air —
// it is the whole reason this key was chosen.
//
// Progression: Dm – G – C – Am (i – IV – VII – v), all seven notes of D dorian.
//
// FORM (bars of 4/4 at 84 bpm = 2.857 s each)
//   0–1   intro   nylon arpeggio and bass alone, no melody yet
//   2–5   A       the flute states the hook, nothing under it but the guitar
//   6–9   A′      the string bed arrives; shaker; bass moves
//   10–13 B       new harmony (F–C–G–Am), the flute a register higher
//   14–17 A″      full, and the one cymbal swell in the whole piece
//   18    close   the last Dm, held, everything decaying into the hall
//
// The hook is a rising fourth (A→D) into a held note, an arch up to E5, then a
// stepwise walk home. Four bars, mostly steps, one leap — the shape you can
// still hum on the second hearing.

export const meta = {
  name: 'ridge',
  title: 'Ridge',
  dur: 56,
  tempo: 84,
  seed: 0x21D6E,
  blurb: 'Flute over guitar and strings in D dorian — a rising fourth, a long view, one cymbal swell.',
  // A big outdoor-ish hall: long tail, bright enough to carry distance.
  reverb: { rt60: 2.6, damp: 0.32, preDelay: 0.032, width: 1.25 },
  master: { drive: 1.18, lfeGain: 0.44 },
};

export function compose(S, O) {
  const { n, flute, nylon, bass, strings, shaker, cymbal, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;      // ±6 ms — nobody plays on the grid

  // ── the room ──────────────────────────────────────────────────────────────
  // The flute is the only lead, so it sits front and anchored. The guitar is
  // well left of it and the beds surround — nothing shares an azimuth with the
  // flute, because two voices in one place is one voice you cannot hear.
  const fl = S.track('flute', { az: 5, centre: 0.44, spread: 8, send: 0.34, gain: 1.0 });
  const gt = S.track('guitar', { az: -22, spread: 8, send: 0.30, gain: 0.72, body: BODY.nylon });
  const bs = S.track('bass', { az: -7, centre: 0.14, send: 0.12, gain: 0.85, body: BODY.upright, lp: 2000 });
  const stF = S.track('strings-front', { az: 46, pair: true, spread: 18, send: 0.56, gain: 0.46, hp: 130 });
  const stB = S.track('strings-room', { az: 132, pair: true, spread: 30, send: 0.74, gain: 0.30, hp: 190 });
  const sh = S.track('shaker', { az: 40, send: 0.40, gain: 0.40 });
  const cy = S.track('cymbal', { az: -58, pair: true, spread: 20, send: 0.66, gain: 0.34 });

  // ── harmony ───────────────────────────────────────────────────────────────
  const Dm = { arp: ['D3', 'A3', 'D4', 'F4'], pad: ['D3', 'F3', 'A3', 'D4'], root: 'D2' };
  const G = { arp: ['G2', 'D3', 'G3', 'B3'], pad: ['G2', 'B2', 'D3', 'G3'], root: 'G1' };
  const C = { arp: ['C3', 'G3', 'C4', 'E4'], pad: ['C3', 'E3', 'G3', 'C4'], root: 'C2' };
  const Am = { arp: ['A2', 'E3', 'A3', 'C4'], pad: ['A2', 'C3', 'E3', 'A3'], root: 'A1' };
  const F = { arp: ['F2', 'C3', 'F3', 'A3'], pad: ['F2', 'A2', 'C3', 'F3'], root: 'F1' };

  const A_PROG = [Dm, G, C, Am];
  const B_PROG = [F, C, G, Am];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** Slow fingerstyle arpeggio, six notes a bar — an unhurried right hand. */
  function arp(barIdx, ch, amp, pattern = [0, 1, 2, 3, 2, 1]) {
    const t0 = barIdx * BAR;
    pattern.forEach((deg, k) => {
      const t = t0 + B(k * (4 / pattern.length)) + J();
      // the thumb on the bass note leans; the fingers give way
      const lean = k === 0 ? 1.25 : k === 3 ? 1.05 : 0.78;
      nylon(gt.buf, t, n(ch.arp[deg]), amp * lean, rng, { decay: 2.4, damp: 0.56, pick: 0.30 });
    });
  }

  function low(barIdx, ch, amp, hits = [0, 2.5]) {
    for (const beat of hits) bass(bs.buf, barIdx * BAR + B(beat) + J(), n(ch.root), amp, rng, { decay: 2.8 });
  }

  function pad(barIdx, bars, ch, amp, { room = true } = {}) {
    const t0 = barIdx * BAR, d = bars * BAR;
    for (const name of ch.pad) {
      strings(stF.buf, t0, d, n(name), amp, rng, { voices: 5, atk: 1.3, rel: 1.8, bright: 0.32 });
      if (room) strings(stB.buf, t0 + 0.06, d, n(name), amp * 0.78, rng, { voices: 4, atk: 1.8, rel: 2.4, bright: 0.20 });
    }
  }

  function ticks(barIdx, amp) {
    for (let k = 0; k < 8; k++) {
      shaker(sh.buf, barIdx * BAR + B(k * 0.5) + rng() * 0.009,
        amp * (k % 2 ? 0.5 : 1) * (k === 0 ? 1.3 : 1), rng, { rise: 0.016, fall: 0.10, f: 5000 });
    }
  }

  /**
   * The flute line. Rows are [beat, note, lengthInBeats, weight].
   * Consecutive notes are SLURRED — each carries legatoFrom set to the pitch
   * before it and drops its chiff, so the phrase is one breath rather than a
   * row of separate attacks. Only the note that OPENS a phrase gets the full
   * chiff, which is exactly where a player's tongue actually is.
   */
  function play(barIdx, rows, amp, { oct = 0, breathy = 1 } = {}) {
    const t0 = barIdx * BAR;
    let prev = 0;
    rows.forEach(([beat, name, len, w = 1], i) => {
      const f = n(name) * (oct ? Math.pow(2, oct) : 1);
      const opening = i === 0;
      flute(fl.buf, t0 + B(beat) + J(), B(len) * 0.94, f, amp * w, rng, {
        legatoFrom: opening ? 0 : prev,
        chiff: opening ? 0.55 : 0.15,
        scoop: opening ? 0.035 : 0.008,
        breath: 0.34 * breathy,
        vibDelay: len >= 2 ? 0.35 : 0.6,     // only long notes get to bloom
        vib: len >= 2 ? 0.013 : 0.006,
        atk: opening ? 0.09 : 0.05,
      });
      prev = f;
    });
  }

  // ── THE HOOK ──────────────────────────────────────────────────────────────
  // A4 → D5 is the rising fourth; bar 3 tops out on E5; bar 4 walks down to E4.
  const HOOK = [
    [[0, 'A4', 1], [1, 'D5', 3]],
    [[0, 'B4', 1.5], [1.5, 'A4', 0.5, 0.85], [2, 'G4', 2, 0.95]],
    [[0, 'C5', 1], [1, 'E5', 1, 1.12], [2, 'D5', 2]],
    [[0, 'C5', 1], [1, 'A4', 1, 0.9], [2, 'E4', 2, 0.85]],
  ];
  // The bridge: the same walking-down instinct, started from higher up.
  const BRIDGE = [
    [[0, 'F5', 1.5], [1.5, 'E5', 0.5, 0.85], [2, 'C5', 2]],
    [[0, 'E5', 1], [1, 'G5', 1, 1.15], [2, 'E5', 2]],
    [[0, 'D5', 2], [2, 'B4', 2, 0.9]],
    [[0, 'C5', 2], [2, 'A4', 2, 0.85]],
  ];

  // ── 0–1 · intro — no melody, just the ground the piece stands on ──────────
  arp(0, Dm, 0.24, [0, 1, 2, 3]);
  arp(1, Dm, 0.28);
  low(0, Dm, 0.30, [0]);
  low(1, Dm, 0.34, [0, 2.5]);

  // ── 2–5 · A — the hook, bare ──────────────────────────────────────────────
  A_PROG.forEach((ch, i) => {
    arp(2 + i, ch, 0.30);
    low(2 + i, ch, 0.36);
    play(2 + i, HOOK[i], 0.40);
  });

  // ── 6–9 · A′ — the strings arrive, and the piece starts moving ────────────
  A_PROG.forEach((ch, i) => {
    arp(6 + i, ch, 0.34);
    low(6 + i, ch, 0.42, [0, 1.5, 2.5]);
    play(6 + i, HOOK[i], 0.50);
    ticks(6 + i, 0.24);
  });
  pad(6, 4, Dm, 0.17, { room: false });   // one held bed under the whole phrase

  // ── 10–13 · B — the bridge, a register up ─────────────────────────────────
  B_PROG.forEach((ch, i) => {
    arp(10 + i, ch, 0.32, [0, 2, 1, 3, 2, 1]);
    low(10 + i, ch, 0.44, [0, 2]);
    play(10 + i, BRIDGE[i], 0.52);
    ticks(10 + i, 0.28);
    pad(10 + i, 1, ch, 0.24);
  });

  // ── 14–17 · A″ — everything, and the only cymbal in the piece ─────────────
  cymbal(cy.buf, 14 * BAR - 0.25, 0.30, rng, { decay: 3.4, f: 460, crash: true });
  A_PROG.forEach((ch, i) => {
    arp(14 + i, ch, 0.38, [0, 1, 2, 3, 2, 3]);
    low(14 + i, ch, 0.52, [0, 1.5, 2.5, 3.5]);
    // the flute doubled an octave up on the peak bar only — the top of the arc
    play(14 + i, HOOK[i], 0.64);
    if (i === 2) play(14 + i, HOOK[i], 0.18, { oct: 1, breathy: 1.3 });
    ticks(14 + i, 0.32);
    pad(14 + i, 1, ch, 0.32);
  });

  // ── 18 · close ────────────────────────────────────────────────────────────
  const last = 18 * BAR;
  arp(18, Dm, 0.32, [0, 1, 2, 3]);
  bass(bs.buf, last, n('D2'), 0.55, rng, { decay: 4.2 });
  pad(18, 3, Dm, 0.30);
  // one long D, taken from the top of the hook and simply allowed to end
  flute(fl.buf, last + B(0.5), 4.6, n('D5'), 0.46, rng, {
    chiff: 0.28, scoop: 0.03, vibDelay: 0.5, vib: 0.014, breath: 0.36, rel: 1.5,
  });
  flute(fl.buf, last + B(0.5) + 0.02, 4.6, n('A4'), 0.14, rng, { chiff: 0.1, vibDelay: 0.6, breath: 0.3, rel: 1.5 });
  cymbal(cy.buf, last, 0.13, rng, { decay: 4.0, f: 520 });
}
