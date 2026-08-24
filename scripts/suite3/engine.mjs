// ─── engine — the driver ─────────────────────────────────────────────────────
//
// The v2.31 `engine` was the punchy one: a synth-bass riff in A minor over a
// four-on-the-floor kick at 112 bpm, with saw stabs and ride ticks. Same job,
// real players: the kick becomes taiko and timpani, the bass riff becomes
// cellos and basses hammering eighths, the saw stabs become trombones and
// trumpets with the bells up, the ride tick becomes an offbeat violin
// pizzicato — and the hook sits in the horns. It is a RIFF, not a song:
// short repeated cells, syncopated, one long note per phrase to breathe.
//
// A minor, 116 bpm. A-section loop Am–Am–F–G (i–i–VI–VII — the drive loop,
// and the F→G→Am walk home is built into the harmony itself). Bridge
// Dm–F–E–E (iv–VI–V): it CLIMBS onto the dominant so the riff's return lands
// as a resolution, not just a repeat.
//
// The one place the motion stops — bar 14 — is parked ON THE DOMINANT: the
// band cuts to a single E stab, the cellos idle alone like an engine at a
// red light, bar 15 winds it back up over a timpani roll, and bar 16 drops
// onto Am with everything. Tension → hole → release: the contrast that makes
// the whole piece land, so the hole is the only bar that is allowed to rest.
//
// FORM (bars of 4/4 at 116 bpm = 2.069 s; 26 bars ≈ 53.8 s + ring = 56 s)
//   0–1   ignition      timpani roll → two hits, the ostinato turns over
//   2–5   A             the riff on two horns over cellos — lean on purpose
//   6–9   A′            horn section, brass stabs answer, taiko joins
//   10–13 B             brass OUT; strings sing, low choir, then the run up
//   14    the hole      one cut-stab, then an idling cello alone
//   15    re-ignition   ostinato winds up, timpani roll, string riser
//   16–19 A″            everything, four-on-the-floor taiko
//   20–23 peak          trumpets take the riff an octave up, choir opens
//   24    the drive     six unison E stabs in eighths — then a gasp
//   25    the hit       full orchestra on the Am downbeat, and the hall
//
// LAYOUT copies anthem.mjs — a real orchestra seen from the audience — plus
// one extra desk: the offbeat pizzicato ticks sit just left of the violins,
// answering the cellos' eighths on the right. Nothing is `pair: true` except
// the choir; an orchestra is a picture in front of you.

export const meta = {
  name: 'engine',
  title: 'Engine',
  dur: 56,
  tempo: 116,
  seed: 0xE1901,
  blurb: 'The driver — a horn riff in A minor over hammering cellos, taiko, timpani and brass stabs.',
  // A tighter, drier room than anthem's: punch survives rt60 2.4 that a 2.9 s
  // hall would smear into wash at this note rate.
  reverb: { rt60: 2.4, damp: 0.34, preDelay: 0.024, width: 1.15 },
  master: { drive: 1.22, lfeGain: 0.55 },
};

export function compose(S, O) {
  const {
    n, brass, brassSection, strings, stringHit, timpani, taiko, choir,
    pizz, cymbal, riser, bass, tubular, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;   // no two attacks land together

  // ── the orchestra, seated (anthem's layout + the pizz desk) ───────────────
  const hn = S.track('horns', { az: -10, centre: 0.34, spread: 9, send: 0.40, gain: 1.0 });
  const tp = S.track('trumpets', { az: 14, centre: 0.26, spread: 7, send: 0.40, gain: 0.88 });
  const lb = S.track('low-brass', { az: 0, centre: 0.34, spread: 11, send: 0.34, gain: 0.94, lp: 3400 });
  const v1 = S.track('violins', { az: -22, spread: 7, send: 0.50, gain: 0.88, hp: 170 });
  const va = S.track('violas', { az: 6, spread: 10, send: 0.48, gain: 0.72, hp: 130 });
  const vc = S.track('cellos', { az: 23, spread: 6, send: 0.34, gain: 1.0 });
  const db = S.track('basses', { az: -4, centre: 0.16, send: 0.22, gain: 0.92, body: BODY.upright, lp: 1400 });
  const pz = S.track('pizz-ticks', { az: -18, spread: 5, send: 0.30, gain: 0.72, hp: 260 });
  const pc = S.track('percussion', { az: -6, centre: 0.30, spread: 12, send: 0.34, gain: 1.02 });
  const ch = S.track('choir', { az: 116, pair: true, spread: 28, send: 0.78, gain: 0.60, hp: 150 });
  const cy = S.track('cymbals', { az: 30, spread: 8, send: 0.58, gain: 0.58 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // ost      8 eighths per bar — the engine itself. Mostly hammered root with
  //          the riff's own colour notes between accents, never a walking line:
  //          a walking bass swings, a hammered one DRIVES.
  // lo/mid   the stab voicing — trombones take root+5th, trumpets the top.
  // hi       chord tones for high strings / full choir.  low — the low choir.
  // tick     the two offbeat pizz pitches.
  const Am = { root: 'A1', ost: ['A2', 'A2', 'E2', 'A2', 'A2', 'G2', 'A2', 'C3'], lo: ['A2', 'E3'], mid: ['C4', 'E4'], hi: ['A3', 'C4', 'E4', 'A4'], low: ['A2', 'E3', 'A3'], tick: ['A4', 'E5'] };
  const F = { root: 'F1', ost: ['F2', 'F2', 'C3', 'F2', 'F2', 'E2', 'F2', 'A2'], lo: ['F2', 'C3'], mid: ['A3', 'C4'], hi: ['A3', 'C4', 'F4', 'A4'], low: ['C3', 'F3', 'A3'], tick: ['C5', 'F5'] };
  const G = { root: 'G1', ost: ['G2', 'G2', 'D3', 'G2', 'G2', 'F2', 'G2', 'B2'], lo: ['G2', 'D3'], mid: ['B3', 'D4'], hi: ['B3', 'D4', 'G4', 'B4'], low: ['B2', 'D3', 'G3'], tick: ['B4', 'D5'] };
  const Dm = { root: 'D1', ost: ['D2', 'D2', 'A2', 'D2', 'D2', 'C3', 'D2', 'F2'], lo: ['D3', 'A2'], mid: ['F3', 'A3'], hi: ['A3', 'D4', 'F4', 'A4'], low: ['D3', 'F3', 'A3'], tick: ['A4', 'D5'] };
  const E = { root: 'E1', ost: ['E2', 'E2', 'B2', 'E2', 'E2', 'D3', 'E2', 'G#2'], lo: ['E2', 'B2'], mid: ['G#3', 'B3', 'E4'], hi: ['G#3', 'B3', 'E4', 'G#4'], low: ['B2', 'E3', 'G#3'], tick: ['B4', 'E5'] };

  const A_PROG = [Am, Am, F, G];
  const B_PROG = [Dm, F, E, E];

  // ── THE RIFF ──────────────────────────────────────────────────────────────
  // One rhythmic cell — attacks on 0, ½, 1½, 2½, 3 (the v2.31 bass riff's own
  // rhythm, kept as the piece's identity) — stated three times, then broken by
  // the peak bar. Phrase 1 hammers home and climbs the triad to a held E;
  // phrase 2 reaches the minor 6th and peaks on G4 ON THE DOWNBEAT, then
  // walks down to a hung B — the 2nd of A minor, which is what pulls the loop
  // back to its first note. Rows are [beat, note, lengthInBeats, weight].
  const THEME = [
    // bar 1 (Am) — the hammer cell: reach the 3rd, dip below, home
    [[0, 'A3', 0.5, 1.20], [0.5, 'A3', 1, 0.88], [1.5, 'C4', 1, 1.00], [2.5, 'G3', 0.5, 0.85], [3, 'A3', 1, 1.05]],
    // bar 2 (Am) — same hammer, climb the triad, breathe on the 5th
    [[0, 'A3', 0.5, 1.15], [0.5, 'A3', 0.5, 0.88], [1, 'C4', 0.5, 0.95], [1.5, 'E4', 2.5, 1.10]],
    // bar 3 (F) — the cell reaches the 6th: A3→F4 is the riff baring its teeth
    [[0, 'A3', 0.5, 1.20], [0.5, 'A3', 1, 0.88], [1.5, 'F4', 1, 1.12], [2.5, 'E4', 0.5, 0.88], [3, 'C4', 1, 1.00]],
    // bar 4 (G) — the peak on a STRONG beat, then the walk down to a hung B
    [[0, 'G4', 1, 1.25], [1, 'F4', 0.5, 0.90], [1.5, 'D4', 0.5, 0.88], [2, 'B3', 2, 1.00]],
  ];

  // The bridge does what the riff never does — long falling lines — so the
  // riff's return feels like the engine catching again. Bar 4 of it is a run
  // up A harmonic minor over E (F natural, D#): the Phrygian-dominant snarl
  // that announces the dominant before the hole.
  const BRIDGE = [
    // bar 1 (Dm) — rise through the triad, hang on A
    [[0, 'D4', 1.5, 1.00], [1.5, 'F4', 0.5, 0.90], [2, 'A4', 2, 1.05]],
    // bar 2 (F) — fall from the top
    [[0, 'C5', 1.5, 1.10], [1.5, 'A4', 0.5, 0.90], [2, 'F4', 2, 0.95]],
    // bar 3 (E) — E major arpeggio down: the G# shows first
    [[0, 'B4', 1.5, 1.05], [1.5, 'G#4', 0.5, 0.95], [2, 'E4', 2, 0.90]],
    // bar 4 (E) — the run up, crescendo written into the weights
    [[0, 'E4', 0.5, 0.90], [0.5, 'F4', 0.5, 0.92], [1, 'G#4', 0.5, 0.95], [1.5, 'A4', 0.5, 1.00],
      [2, 'B4', 0.5, 1.05], [2.5, 'C5', 0.5, 1.10], [3, 'D#5', 0.5, 1.15], [3.5, 'E5', 0.5, 1.22]],
  ];

  // ── parts ─────────────────────────────────────────────────────────────────
  // Accent scheme for the ostinato: eighth-indices 0, 3, 6 = beats 1, 2½, 4 —
  // the same syncopation as the riff's attacks, so band and engine lock
  // instead of merely coexisting. Everything between the accents gives way.
  const LEAN = [1.30, 0.76, 0.82, 1.12, 0.90, 0.76, 1.18, 0.80];

  /** The engine: cellos hammering eighths, basses answering on the quarters —
   *  the quarter pulse in the basses is this orchestra's four-on-the-floor. */
  function ost(barIdx, chd, amp) {
    const t0 = barIdx * BAR;
    chd.ost.forEach((name, k) => {
      stringHit(vc.buf, t0 + B(k * 0.5) + J(), B(0.40), n(name), amp * LEAN[k] * (1 + 0.05 * rng()), rng,
        { voices: 5, bite: 0.62, bright: 0.66 });
      if (k % 2 === 0) bass(db.buf, t0 + B(k * 0.5) + J(), n(name) / 2, amp * 0.95 * LEAN[k], rng,
        { decay: 1.4, damp: 0.74, dur: B(0.46) });
    });
  }

  /** The riff, on whatever brass carries it. Short notes clipped to 86% so the
   *  cell stays marcato; the long notes hold nearly full length to breathe. */
  function theme(barIdx, rows, amp, opts = {}) {
    const { track = hn, kind = 'horn', section = 3, bite = 1, oct = 0 } = opts;
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w = 1] of rows) {
      const f = n(name) * (oct ? 2 ** oct : 1);
      brassSection(track.buf, t0 + B(beat) + J(), B(len) * (len >= 2 ? 0.97 : 0.86), f,
        amp * w * (1 + 0.04 * rng()), rng,
        { kind, players: section, bite, atk: 0.03, vib: len >= 2 ? 0.006 : 0.001, vibDelay: 0.5 });
    }
  }

  /** A stab: trombones on root+5th, trumpets on top, one hard jab. This is the
   *  acoustic saw stab — bite does the aggression, never amp alone. */
  function stab(barIdx, beat, chd, amp, { hi = true, bite = 1.25 } = {}) {
    const t = barIdx * BAR + B(beat) + J();
    for (const nm of chd.lo)
      brassSection(lb.buf, t, B(0.36), n(nm), amp * (1 + 0.05 * rng()), rng,
        { kind: 'trombone', players: 2, bite, atk: 0.016, vib: 0 });
    if (hi) for (const nm of chd.mid)
      brassSection(tp.buf, t + 0.004, B(0.36), n(nm), amp * 0.78, rng,
        { kind: 'trumpet', players: 2, bite: bite * 0.95, atk: 0.014, vib: 0 });
  }

  /** Timpani on the strong beats, taiko as the floor. Short decays on purpose:
   *  at 116 bpm a 3.4 s boom is still ringing three hits later. */
  function drums(barIdx, chd, { timp = [], kick = [], aT = 0.34, aK = 0.38 } = {}) {
    const t0 = barIdx * BAR;
    for (const b of timp) timpani(pc.buf, t0 + B(b) + J(), n(chd.root) * 2,
      aT * (b === 0 ? 1.1 : 1) * (1 + 0.06 * rng()), rng, { decay: 1.8 });
    for (const b of kick) taiko(pc.buf, t0 + B(b) + J(),
      aK * (b === 0 ? 1.08 : 1) * (1 + 0.06 * rng()), rng, { decay: 2.6, f0: 98, f1: 46 });
  }

  /** The ride tick reborn: offbeat pizzicato, root and fifth alternating. */
  function ticks(barIdx, chd, amp) {
    [0.5, 1.5, 2.5, 3.5].forEach((bt, i) => {
      pizz(pz.buf, barIdx * BAR + B(bt) + J(), n(chd.tick[i % 2]),
        amp * (i % 2 ? 0.7 : 1) * (1 + 0.08 * rng()), rng,
        { decay: 0.35, damp: 0.5, bright: 0.6 });
    });
  }

  /** Sustained-string glue — deliberately thin. The engine aesthetic is
   *  percussive; a full pad would soften every hit it sits under. */
  function sus(barIdx, bars, chd, amp, { top = true } = {}) {
    const t0 = barIdx * BAR, d = bars * BAR;
    if (top) for (const nm of chd.hi.slice(2))
      strings(v1.buf, t0 + Math.abs(rng()) * 0.03, d, n(nm), amp, rng,
        { voices: 6, spread: 0.0055, atk: 0.5, rel: 0.9, bright: 0.45 });
    for (const nm of chd.hi.slice(0, 2))
      strings(va.buf, t0 + Math.abs(rng()) * 0.03, d, n(nm), amp * 0.85, rng,
        { voices: 5, spread: 0.006, atk: 0.6, rel: 1.0, bright: 0.32 });
  }

  /** The bridge, violins with violas an octave below. Eighths get a fast bow
   *  (atk 0.05) so the run speaks; the long notes get the singing attack. */
  function bridgeLine(barIdx, rows, amp) {
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w = 1] of rows) {
      const atk = len <= 0.5 ? 0.05 : 0.16;
      strings(v1.buf, t0 + B(beat) + J(), B(len) * 0.96, n(name), amp * w, rng,
        { voices: 7, spread: 0.005, atk, rel: 0.45, bright: 0.55 });
      strings(va.buf, t0 + B(beat) + J(), B(len) * 0.96, n(name) / 2, amp * 0.7 * w, rng,
        { voices: 5, spread: 0.006, atk: atk + 0.02, rel: 0.5, bright: 0.40 });
    }
  }

  // ── 0–1 · ignition ────────────────────────────────────────────────────────
  // The v2.31 opening was a noise riser into two kicks. Acoustically that is a
  // timpani roll that crescendos into two hits — the starter motor — with the
  // low brass swelling under the second while the ostinato turns over.
  timpani(pc.buf, 0.04, n('A2'), 0.32, rng, { roll: 1.0 });
  drums(0, Am, { timp: [2], kick: [2], aT: 0.62, aK: 0.52 });
  drums(1, Am, { timp: [0], kick: [0], aT: 0.82, aK: 0.74 });
  cymbal(cy.buf, BAR, 0.18, rng, { decay: 3.2, f: 470, crash: true });
  brassSection(lb.buf, BAR, BAR * 0.95, n('A2'), 0.30, rng,
    { kind: 'trombone', players: 3, bite: 1.05, swellTo: 1.35, atk: 0.09 });
  brassSection(lb.buf, BAR + 0.02, BAR * 0.95, n('A1'), 0.22, rng,
    { kind: 'tuba', players: 2, bite: 1.0, atk: 0.12 });
  ost(1, Am, 0.20);                                   // the engine catches here
  // a single horn pickup — G, the leading colour into the riff's first A
  brass(hn.buf, BAR + B(3.5) + J(), B(0.4), n('G3'), 0.30, rng, { bite: 0.95, atk: 0.03, vib: 0 });

  // ── 2–5 · A — the riff, two horns and the engine, nothing else ────────────
  // Lean on purpose: this statement is the reference every later one is
  // measured against, so it carries no taiko and no stabs to come back from.
  A_PROG.forEach((chd, i) => {
    theme(2 + i, THEME[i], 0.42, { section: 2, bite: 0.92 });
    ost(2 + i, chd, 0.23);
    drums(2 + i, chd, { timp: [0, 2], aT: 0.30 });
  });

  // ── 6–9 · A′ — the section takes it, the stabs answer, taiko in ───────────
  cymbal(cy.buf, 6 * BAR - 0.01, 0.20, rng, { decay: 3.0, f: 480, crash: true });
  A_PROG.forEach((chd, i) => {
    theme(6 + i, THEME[i], 0.44, { section: 3, bite: 1.05 });
    ost(6 + i, chd, 0.27);
    drums(6 + i, chd, { timp: [0, 2, 3.5], aT: 0.32, kick: [0, 2], aK: 0.38 });
    ticks(6 + i, chd, 0.06);
    sus(6 + i, 1, chd, 0.10, { top: false });
  });
  // Stabs live in the riff's held notes — the only space it leaves open:
  // bar 7 = the held E (phrase 1's breath), bar 9 = the hung B (phrase 2's).
  stab(7, 2.5, Am, 0.34); stab(7, 3, Am, 0.38);
  stab(9, 2.5, G, 0.34); stab(9, 3, G, 0.38); stab(9, 3.5, G, 0.42);

  // ── 10–13 · B — the brass steps out; the engine does not ──────────────────
  // Strings and low choir carry the bridge so the brass has somewhere to come
  // back from — but the ostinato keeps hammering underneath, because this
  // piece is not allowed to stop moving until bar 14 says so.
  B_PROG.forEach((chd, i) => {
    if (i < 3) bridgeLine(10 + i, BRIDGE[i], 0.30 + i * 0.02);
    ost(10 + i, chd, 0.24 + i * 0.02);
    for (const nm of chd.low) choir(ch.buf, (10 + i) * BAR, BAR * 1.05, n(nm),
      0.15 + i * 0.025, rng, { vowel: 'oo', atk: 0.55 });
    drums(10 + i, chd, { timp: [0], aT: 0.30, kick: i < 2 ? [0] : [0, 2], aK: 0.32 });
  });
  cymbal(cy.buf, 12 * BAR, 0.15, rng, { decay: 2.4, f: 500, crash: true });   // the G# lands
  bridgeLine(13, BRIDGE[3], 0.34);                                            // the run up
  timpani(pc.buf, 13 * BAR + B(2), n('E2'), 0.36, rng, { roll: B(2) });

  // ── 14 · the hole ─────────────────────────────────────────────────────────
  // The run crescendos into one cut-stab and then — the only rest in the
  // piece — an idling cello, alone, ON the dominant so the silence itself
  // leans forward. A choked cymbal (decay 0.9) marks the cut without wash.
  stab(14, 0, E, 0.50, { bite: 1.3 });
  drums(14, E, { timp: [0], aT: 0.55, kick: [0], aK: 0.50 });
  cymbal(cy.buf, 14 * BAR, 0.20, rng, { decay: 0.9, f: 520, crash: true });
  [2, 4, 6].forEach((k, j) => {   // quarters, three desks, dying away
    stringHit(vc.buf, 14 * BAR + B(k * 0.5) + J(), B(0.40), n('E2'), 0.085 - j * 0.012, rng,
      { voices: 3, bite: 0.4, bright: 0.5 });
  });

  // ── 15 · re-ignition ──────────────────────────────────────────────────────
  // The ostinato winds back up through the bar (amp ramps with k), the
  // timpani rolls, a string riser climbs two octaves, the taiko accelerates,
  // and the horns grab a breath on the last eighth — the drop is bar 16.
  E.ost.forEach((name, k) => {
    const a = 0.13 + k * 0.022;
    stringHit(vc.buf, 15 * BAR + B(k * 0.5) + J(), B(0.40), n(name), a * LEAN[k], rng,
      { voices: 5, bite: 0.62, bright: 0.66 });
    if (k % 2 === 0) bass(db.buf, 15 * BAR + B(k * 0.5) + J(), n(name) / 2, a * LEAN[k], rng,
      { decay: 1.3, damp: 0.74, dur: B(0.46) });
  });
  timpani(pc.buf, 15 * BAR + B(0.5), n('E2'), 0.42, rng, { roll: B(3.4) });
  riser(v1.buf, 15 * BAR, 16 * BAR, n('A3'), n('A5'), 0.15, rng, { voices: 6, trem: 1 });
  taiko(pc.buf, 15 * BAR + B(2) + J(), 0.30, rng, { decay: 2.2 });
  taiko(pc.buf, 15 * BAR + B(3) + J(), 0.36, rng, { decay: 2.2 });
  taiko(pc.buf, 15 * BAR + B(3.5) + J(), 0.42, rng, { decay: 2.2 });
  brassSection(hn.buf, 15 * BAR + B(3.5) + J(), B(0.42), n('E3'), 0.30, rng,
    { kind: 'horn', players: 3, bite: 1.1, atk: 0.02, vib: 0 });

  // ── 16–19 · A″ — everything, four on the floor ────────────────────────────
  cymbal(cy.buf, 16 * BAR - 0.02, 0.26, rng, { decay: 3.6, f: 460, crash: true });
  A_PROG.forEach((chd, i) => {
    theme(16 + i, THEME[i], 0.46, { section: 4, bite: 1.25 });
    ost(16 + i, chd, 0.32);
    drums(16 + i, chd, { timp: [0, 2, 3.5], aT: 0.36, kick: [0, 1, 2, 3], aK: 0.42 });
    ticks(16 + i, chd, 0.08);
    sus(16 + i, 1, chd, 0.14);
  });
  stab(17, 2.5, Am, 0.38); stab(17, 3, Am, 0.42);
  stab(19, 2.5, G, 0.38); stab(19, 3, G, 0.42); stab(19, 3.5, G, 0.46);

  // ── 20–23 · the peak — the riff in octaves, the choir opens ───────────────
  // Trumpets take the riff an octave up (the climax register the horns cannot
  // reach); the stabs drop their trumpet top so the two never fight, and the
  // trombones jab alone underneath.
  cymbal(cy.buf, 20 * BAR - 0.02, 0.28, rng, { decay: 3.8, f: 450, crash: true });
  A_PROG.forEach((chd, i) => {
    theme(20 + i, THEME[i], 0.46, { section: 4, bite: 1.30 });
    theme(20 + i, THEME[i], 0.24, { track: tp, kind: 'trumpet', section: 2, oct: 1, bite: 1.2 });
    ost(20 + i, chd, 0.35);
    drums(20 + i, chd, { timp: [0, 2, 3.5], aT: 0.38, kick: [0, 1, 2, 3], aK: 0.46 });
    ticks(20 + i, chd, 0.09);
    sus(20 + i, 1, chd, 0.19);
    for (const nm of chd.hi) choir(ch.buf, (20 + i) * BAR, BAR * 1.05, n(nm),
      0.20 + i * 0.012, rng, { vowel: 'ah', atk: 0.4 });
  });
  stab(21, 2.5, Am, 0.40, { hi: false }); stab(21, 3, Am, 0.44, { hi: false });
  stab(23, 2.5, G, 0.40, { hi: false }); stab(23, 3, G, 0.44, { hi: false });
  stab(23, 3.5, G, 0.48, { hi: false });

  // ── 24 · the drive — six unison stabs, then a gasp ────────────────────────
  // The whole band hammers the dominant in eighths, each hit louder and
  // brighter than the last (bite ramps WITH amp — brass gets brighter as it
  // gets louder, or it reads as a fader move). Beats 3–4 are empty on
  // purpose: the gasp before the hit is what makes the hit enormous.
  for (let k = 0; k < 6; k++) {
    const t = 24 * BAR + B(k * 0.5) + J();
    const a = 0.30 + k * 0.04;
    const bite = 1.15 + k * 0.04;
    for (const nm of E.lo) brassSection(lb.buf, t, B(0.36), n(nm), a, rng,
      { kind: 'trombone', players: 2, bite, atk: 0.015, vib: 0 });
    for (const nm of E.mid) brassSection(tp.buf, t + 0.004, B(0.36), n(nm), a * 0.7, rng,
      { kind: 'trumpet', players: 2, bite, atk: 0.013, vib: 0 });
    brassSection(hn.buf, t + 0.002, B(0.36), n('E3'), a * 0.9, rng,
      { kind: 'horn', players: 4, bite, atk: 0.015, vib: 0 });
    stringHit(vc.buf, t, B(0.40), n('E2'), a, rng, { voices: 5, bite: 0.7, bright: 0.7 });
    bass(db.buf, t, n('E1'), a * 0.9, rng, { decay: 1.2, damp: 0.74, dur: B(0.46) });
    taiko(pc.buf, t, 0.30 + k * 0.045, rng, { decay: 2.0 });
    if (k % 2 === 0) timpani(pc.buf, t, n('E2'), 0.40, rng, { decay: 1.6 });
  }

  // ── 25 · the hit, and the hall ────────────────────────────────────────────
  // V resolves to i on the downbeat with everything at once, then the room
  // takes over. The brass swells DOWN (swellTo 0.8) — it arrives fortissimo
  // and relaxes, which is a played release; holding flat would be a synth
  // sustain. A single low tubular bell tolls under the decay.
  const last = 25 * BAR;
  timpani(pc.buf, last, n('A2'), 0.95, rng, { decay: 2.6 });
  taiko(pc.buf, last + 0.005, 0.90, rng, { decay: 4.2 });
  cymbal(cy.buf, last, 0.28, rng, { decay: 4.5, f: 440, crash: true });
  brassSection(lb.buf, last, 3.6, n('A2'), 0.34, rng,
    { kind: 'trombone', players: 3, bite: 1.15, swellTo: 0.8, atk: 0.05 });
  brassSection(lb.buf, last + 0.02, 3.6, n('A1'), 0.24, rng,
    { kind: 'tuba', players: 2, bite: 1.0, atk: 0.07 });
  brassSection(hn.buf, last, 3.8, n('A3'), 0.34, rng, { kind: 'horn', players: 4, bite: 1.2, atk: 0.04 });
  brassSection(hn.buf, last + 0.01, 3.8, n('E4'), 0.20, rng, { kind: 'horn', players: 2, bite: 1.15, atk: 0.05 });
  brassSection(tp.buf, last + 0.01, 3.6, n('A4'), 0.17, rng, { kind: 'trumpet', players: 2, bite: 1.15, atk: 0.04 });
  for (const nm of Am.hi) strings(v1.buf, last + 0.01, 3.4, n(nm), 0.22, rng,
    { voices: 6, spread: 0.0055, atk: 0.06, rel: 1.4, bright: 0.5 });
  for (const nm of Am.hi) choir(ch.buf, last, 3.4, n(nm), 0.24, rng, { vowel: 'ah', atk: 0.22, rel: 1.6 });
  bass(db.buf, last, n('A1'), 0.70, rng, { decay: 4.0 });
  tubular(cy.buf, last + 0.01, n('A3'), 0.15, rng, { decay: 6 });
}
