// ─── drive — steel-string guitar, the energetic one ──────────────────────────
//
// A mixolydian, 118 bpm. Mixolydian rather than major because of the flat 7:
// the G natural against an A root is the entire flavour of a driving guitar
// riff, and it is the reason this does not sound like a folk tune.
//
// This piece is built on a RIFF, not a melody. A riff is carried by rhythm
// more than by pitch, so most of its notes are palm-muted (mute: 0.6, damped
// short) and only the accents are allowed to ring. That contrast between dead
// notes and ringing notes IS the groove — a riff played with every note
// sustaining is just a chord.
//
// FORM (bars of 4/4 at 118 bpm = 2.034 s each)
//   0      kick and bass alone — one bar of setup
//   1–4    the riff enters, guitar and bass locked
//   5–8    full band, stabs on the side
//   9–12   the answer figure, higher up the neck
//   13–14  THE BREAK — everything stops but the guitar, two bars
//   15–18  everything back, and it lands harder for having been away
//   19–22  biggest: riff and answer at once
//   23–24  a hard ending on a downbeat, not a fade
//
// Kept dry on purpose: rt60 1.3 and low sends. Reverb is the enemy of tight.

export const meta = {
  name: 'drive',
  title: 'Drive',
  dur: 52,
  tempo: 118,
  seed: 0xD214E,
  blurb: 'A steel-string riff in A mixolydian — palm-muted, full kit, and a two-bar break that resets it.',
  reverb: { rt60: 1.35, damp: 0.30, preDelay: 0.011, width: 1.0 },
  master: { drive: 1.30, lfeGain: 0.55 },
};

export function compose(S, O) {
  const { n, steel, bass, kick, snare, hat, cymbal, BODY } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.005;      // tighter than the acoustic pieces

  // ── the room ──────────────────────────────────────────────────────────────
  const gt = S.track('guitar-riff', { az: -18, centre: 0.24, spread: 11, send: 0.14, gain: 1.0, body: BODY.steel });
  const sb = S.track('guitar-stabs', { az: 42, pair: true, spread: 16, send: 0.20, gain: 0.46, body: BODY.steel });
  const bs = S.track('bass', { az: 0, centre: 0.22, send: 0.09, gain: 1.0, body: BODY.upright, lp: 2600 });
  const dk = S.track('kit', { az: 8, centre: 0.26, spread: 12, send: 0.16, gain: 0.82 });
  const hh = S.track('hats', { az: -46, pair: true, spread: 12, send: 0.30, gain: 0.36 });
  const cy = S.track('crash', { az: -70, pair: true, spread: 26, send: 0.52, gain: 0.40 });

  // ── the riff ──────────────────────────────────────────────────────────────
  // Rows: [beat, note, accent]. accent true = struck hard and left to ring;
  // false = palm-muted, dead, there for the rhythm and nothing else.
  const RIFF = [
    [[0, 'A2', true], [0.5, 'A2', false], [1, 'A2', false], [1.5, 'C#3', true],
     [2, 'D3', true], [2.5, 'A2', false], [3, 'A2', false], [3.5, 'G2', true]],
    [[0, 'A2', true], [0.5, 'A2', false], [1, 'A2', false], [1.5, 'G2', true],
     [2, 'D3', true], [2.5, 'E3', true], [3, 'A2', true], [3.5, 'A2', false]],
  ];
  // The answer: same rhythmic instinct, moved up and opened out.
  const ANSWER = [
    [[0, 'D3', true], [0.5, 'D3', false], [1, 'E3', true], [1.5, 'F#3', true],
     [2, 'E3', true], [2.5, 'E3', false], [3, 'D3', true], [3.5, 'D3', false]],
    [[0, 'G3', true], [1, 'E3', true], [1.5, 'D3', true], [2, 'A3', true], [3, 'A2', true]],
  ];

  function riff(barIdx, rows, amp, track = gt) {
    const t0 = barIdx * BAR;
    for (const [beat, name, accent] of rows) {
      const t = t0 + B(beat) + J();
      if (accent) {
        steel(track.buf, t, n(name), amp * (beat === 0 ? 1.15 : 1), rng,
          { decay: 3.0, damp: 0.28, pick: 0.14, bright: 0.78 });
      } else {
        // the dead note: short, dark, and quiet. It is felt, not heard.
        steel(track.buf, t, n(name), amp * 0.46, rng,
          { mute: 0.62, damp: 0.60, pick: 0.10, bright: 0.5, dur: B(0.22) });
      }
    }
  }

  /** Power-chord stabs — root and fifth only, no third, off to the sides. */
  const STAB = { A: ['A2', 'E3'], D: ['D3', 'A3'], G: ['G2', 'D3'] };
  function stab(barIdx, beat, which, amp) {
    STAB[which].forEach((name, k) => {
      steel(sb.buf, barIdx * BAR + B(beat) + k * 0.006 + J(), n(name), amp * (k ? 0.8 : 1), rng,
        { decay: 1.5, damp: 0.42, pick: 0.18, bright: 0.7, dur: B(0.7) });
    });
  }

  /** The bass is locked to the riff's accents — same notes, same moments. */
  function low(barIdx, rows, amp) {
    const t0 = barIdx * BAR;
    for (const [beat, name, accent] of rows) {
      if (!accent) continue;
      bass(bs.buf, t0 + B(beat) + J(), n(name) / 2, amp * (beat === 0 ? 1.15 : 0.9), rng,
        { decay: 1.4, damp: 0.70, dur: B(0.45) });
    }
  }

  function kit(barIdx, amp, { hats = true, open = -1 } = {}) {
    const t0 = barIdx * BAR;
    for (const beat of [0, 2.5]) kick(dk.buf, t0 + B(beat) + J(), amp * (beat ? 0.8 : 1), rng,
      { f0: 145, f1: 45, decay: 10, click: 0.34 });
    for (const beat of [1, 3]) snare(dk.buf, t0 + B(beat) + J(), amp * 0.78, rng,
      { tone: 195, decay: 17, noiseDecay: 15, bright: 3600, rim: 0.34 });
    if (hats) for (let k = 0; k < 8; k++) {
      hat(hh.buf, t0 + B(k * 0.5) + rng() * 0.006, amp * (k % 2 ? 0.34 : 0.62), rng,
        { open: k === open, f: 8400 });
    }
  }

  // ── 0 · one bar of setup ──────────────────────────────────────────────────
  kick(dk.buf, 0, 0.55, rng, { f0: 150, f1: 45, decay: 9, click: 0.3 });
  kick(dk.buf, B(2), 0.50, rng, { f0: 145, f1: 45, decay: 10, click: 0.28 });
  bass(bs.buf, 0, n('A1'), 0.55, rng, { decay: 1.6, damp: 0.68, dur: B(1.6) });
  bass(bs.buf, B(2), n('A1'), 0.48, rng, { decay: 1.6, damp: 0.68, dur: B(1.6) });
  for (let k = 4; k < 8; k++) hat(hh.buf, B(k * 0.5), 0.22 * (k % 2 ? 0.5 : 1), rng, {});

  // ── 1–4 · the riff enters, guitar and bass only ───────────────────────────
  for (let b = 1; b <= 4; b++) {
    const rows = RIFF[(b - 1) % 2];
    riff(b, rows, 0.44);
    low(b, rows, 0.48);
    kit(b, 0.30, { hats: b >= 3 });
  }

  // ── 5–8 · full band ───────────────────────────────────────────────────────
  for (let b = 5; b <= 8; b++) {
    const rows = RIFF[(b - 1) % 2];
    riff(b, rows, 0.52);
    low(b, rows, 0.56);
    kit(b, 0.44, { open: 7 });
    stab(b, 0, 'A', 0.26);
    stab(b, 2, b % 2 ? 'D' : 'G', 0.22);
  }

  // ── 9–12 · the answer, higher up the neck ─────────────────────────────────
  for (let b = 9; b <= 12; b++) {
    const rows = ANSWER[(b - 9) % 2];
    riff(b, rows, 0.52);
    low(b, RIFF[(b - 1) % 2], 0.52);   // the bass holds the original riff under it
    kit(b, 0.46, { open: 7 });
    stab(b, 1.5, b % 2 ? 'G' : 'D', 0.26);
  }

  // ── 13–14 · THE BREAK ─────────────────────────────────────────────────────
  // Everything stops. Two bars of guitar alone. This is the cheapest and most
  // reliable trick in the piece: the return is louder because the ear has just
  // been given nothing to hold on to.
  riff(13, RIFF[0], 0.40);
  riff(14, [[0, 'A2', true], [1.5, 'G2', true], [2, 'D3', true], [3, 'E3', true], [3.5, 'F#3', true]], 0.46);

  // ── 15–18 · back, and it lands ────────────────────────────────────────────
  cymbal(cy.buf, 15 * BAR, 0.38, rng, { decay: 2.4, f: 480, crash: true });
  for (let b = 15; b <= 18; b++) {
    const rows = RIFF[(b - 15) % 2];
    riff(b, rows, 0.56);
    low(b, rows, 0.60);
    kit(b, 0.50, { open: 7 });
    stab(b, 0, 'A', 0.30);
    stab(b, 2.5, b % 2 ? 'D' : 'G', 0.26);
  }

  // ── 19–22 · biggest — riff and answer at the same time ────────────────────
  for (let b = 19; b <= 22; b++) {
    const rRows = RIFF[(b - 19) % 2], aRows = ANSWER[(b - 19) % 2];
    riff(b, rRows, 0.58);
    riff(b, aRows, 0.30, sb);          // the answer moves out to the sides
    low(b, rRows, 0.64);
    kit(b, 0.54, { open: 7 });
    if (b === 19 || b === 21) cymbal(cy.buf, b * BAR, 0.24, rng, { decay: 1.9, f: 520, crash: true });
  }

  // ── 23–24 · the hard ending ───────────────────────────────────────────────
  // Three accents and then silence on a downbeat. No fade — a piece that has
  // been this insistent has not earned a graceful exit.
  riff(23, [[0, 'A2', true], [0.5, 'A2', false], [1, 'G2', true], [2, 'D3', true], [3, 'E3', true], [3.5, 'F#3', true]], 0.60);
  low(23, [[0, 'A2', true], [1, 'G2', true], [2, 'D3', true], [3, 'E3', true]], 0.62);
  kit(23, 0.54, { open: 7 });

  const end = 24 * BAR;
  for (const [k, name] of ['A1', 'A2', 'E3', 'A3', 'C#4'].entries()) {
    steel(gt.buf, end + k * 0.008, n(name), 0.52 - k * 0.06, rng, { decay: 3.4, damp: 0.30, pick: 0.14, bright: 0.8 });
  }
  bass(bs.buf, end, n('A1'), 0.75, rng, { decay: 2.6, damp: 0.66 });
  kick(dk.buf, end, 0.70, rng, { f0: 155, f1: 42, decay: 7, click: 0.35 });
  snare(dk.buf, end, 0.45, rng, { tone: 195, decay: 14, noiseDecay: 11, bright: 3600, rim: 0.35 });
  cymbal(cy.buf, end, 0.42, rng, { decay: 3.0, f: 470, crash: true });
}
