// ─── orbit — the light one ───────────────────────────────────────────────────
//
// The v2.31 `orbit` was the catchiest of the five synthetic pieces: a plucked
// four-note hook with a dotted echo, spinning over a ducked pad. This is that
// piece's energy on real players: pizzicato first violins spin an eighth-note
// figure that keeps coming back round, the harp echoes it a bar late, and a
// solo flute — the ONE lead flute in the suite — arrives over a texture it did
// not start. The brass is saved whole for the final lap.
//
// A minor / C major, 104 bpm. The loop is Am – C – G – D (i–III–VII–IV,
// A dorian): deliberately a loop with NO real cadence in it — D pulls back to
// Am without ever closing, so the harmony circles instead of travelling.
// That IS the orbit; the one departure (F → G, bars 14–15) is the slingshot
// that throws the piece into its last two sections.
//
// THE MOTIF IS TWO ORBITS AT ONCE. The eighth-note figure climbs each chord
// and falls away — the fast orbit. Its apex notes across the four bars spell
// A4 · G4 · B4 · A4 — a slow turn AROUND A: below it, above it, home — and the
// home note lands a beat EARLY (bar 4, beat 0), the orbit closing ahead of
// itself. The glockenspiel plays only these apexes, so the hook is audible as
// its own slow melody riding the spin; in section B the flute sings exactly
// that apex line as long notes, and in the last lap the horns do. Everything
// in the piece is a re-lighting of those four notes.
//
// FORM (bars of 4/4 at 104 bpm = 2.308 s)
//   0–1    spin-up      four slow plucks, then eight quick ones climbing two
//                       octaves — the orbit starting to turn — roll, launch
//   2–5    A1           the motif on pizzicato ALONE, cello pizz as ground
//   6–9    A2           harp echoes each bar's tail a bar late; glock apexes;
//                       viola off-beat chips make it bounce
//   10–13  B            arco bed arrives; the flute floats in on the SLOW
//                       orbit — A5, G5, B5, A5 — one note per bar
//   14–15  the sling    stripped back to plucks; F then G under the same
//                       gesture (the only guest chords), riser and roll
//   16–19  A3           the flute takes the FAST figure an octave up; cello
//                       quarters trot; harp doubles the spin; still no brass
//   20–22  the last lap horns sing the slow orbit with trombones underneath,
//                       everything else at full — motif bars 1–3, peaking on
//                       the B4 bar
//   23     the gag      hard stop on the downbeat — one breath — the hook
//                       spun as naked sixteenths — the landing hit, the hall
//
// SEATING is the anthem's orchestra with the string players doing double duty:
// FIRSTS pizz the figure while SECONDS bow the bed (real divisi — one section
// cannot do both), harp at its real seat beside the firsts, glock back right,
// woodwind centre. Nothing is pair:true except the shaker, which is the room's
// air, not a player.

export const meta = {
  name: 'orbit',
  title: 'Orbit',
  dur: 57,
  tempo: 104,
  seed: 0x0B17A,
  blurb: 'The light one — a pizzicato orbit with harp echoes, a late-arriving flute, and brass saved for the last lap.',
  reverb: { rt60: 2.4, damp: 0.32, preDelay: 0.024, width: 1.2 },
  master: { drive: 1.15, lfeGain: 0.42 },
};

export function compose(S, O) {
  const {
    n, pizz, harp, gliss, glock, flute, strings, stringHit, brassSection,
    timpani, taiko, cymbal, shaker, bass, riser, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the orchestra, seated ─────────────────────────────────────────────────
  const pz = S.track('violins-pizz', { az: -18, spread: 7, send: 0.42, gain: 1.15, hp: 165, body: BODY.archtop, bodyDry: 0.7 });
  const v2 = S.track('violins-2', { az: -14, spread: 6, send: 0.52, gain: 0.85, hp: 180 });
  const va = S.track('violas', { az: 7, spread: 9, send: 0.50, gain: 0.75, hp: 140 });
  const vap = S.track('violas-pizz', { az: 7, spread: 6, send: 0.38, gain: 0.90, body: BODY.archtop, bodyDry: 0.75 });
  const vc = S.track('cellos', { az: 22, spread: 6, send: 0.44, gain: 0.90 });
  const vcp = S.track('cellos-pizz', { az: 20, spread: 6, send: 0.34, gain: 1.05, lp: 3000, body: BODY.upright, bodyDry: 0.7 });
  const db = S.track('basses', { az: -4, centre: 0.16, send: 0.26, gain: 0.90, body: BODY.upright, lp: 1400 });
  const hp = S.track('harp', { az: -12, spread: 6, send: 0.55, gain: 0.95, body: BODY.piano, bodyDry: 0.8 });
  const bl = S.track('glock', { az: 26, spread: 4, send: 0.60, gain: 0.58 });
  const fl = S.track('flute', { az: -2, centre: 0.30, spread: 4, send: 0.50, gain: 0.95, hp: 220 });
  const hn = S.track('horns', { az: -8, centre: 0.32, spread: 8, send: 0.44, gain: 0.95 });
  const lb = S.track('low-brass', { az: 2, centre: 0.30, spread: 10, send: 0.36, gain: 0.85, lp: 3000 });
  const tm = S.track('timpani', { az: -6, centre: 0.30, spread: 12, send: 0.40, gain: 1.0 });
  const sh = S.track('shaker', { az: 98, pair: true, spread: 8, send: 0.45, gain: 0.70, hp: 900 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // vc  = the cello's two notes (root, and the counter-note it answers with)
  // hi/mid = the bowed bed · chip = the viola off-beat double-stop
  // roll = the harp's four-note downbeat arpeggio
  const Am = { vc: ['A2', 'E3'], db: 'A1', hi: ['A4', 'C5'], mid: ['E3', 'A3'], chip: ['C4', 'E4'], roll: ['A2', 'E3', 'A3', 'C4'] };
  const C = { vc: ['C3', 'G2'], db: 'C2', hi: ['G4', 'C5'], mid: ['E3', 'G3'], chip: ['E4', 'G4'], roll: ['C3', 'G3', 'C4', 'E4'] };
  const G = { vc: ['G2', 'D3'], db: 'G1', hi: ['G4', 'B4'], mid: ['D3', 'G3'], chip: ['B3', 'D4'], roll: ['G2', 'D3', 'G3', 'B3'] };
  const D = { vc: ['D3', 'A2'], db: 'D2', hi: ['F#4', 'A4'], mid: ['D3', 'A3'], chip: ['D4', 'F#4'], roll: ['D3', 'A3', 'D4', 'F#3'] };
  const F = { vc: ['F2', 'C3'], db: 'F1', hi: ['A4', 'C5'], mid: ['F3', 'A3'], chip: ['A3', 'C4'], roll: ['F2', 'C3', 'F3', 'A3'] };
  const LOOP = [Am, C, G, D];

  // ── THE MOTIF ─────────────────────────────────────────────────────────────
  // Three bars of the same rising gesture — up the chord in eighths, apex held
  // a full beat, two-note falloff — then a fourth bar that BREAKS the pattern:
  // it starts on the resolution (A4, beat 0, a beat early) and walks down to a
  // B3 pickup that leans straight back into bar 1. Strong beats are all chord
  // tones; the only non-triad notes (A over C, A over G) are weight-of-step
  // passing tones on weak eighths.
  const MOTIF = [
    // Am — up the Am7, over the top
    [[0, 'A3', 0.5, 1.00], [0.5, 'C4', 0.5, 0.82], [1, 'E4', 0.5, 0.90], [1.5, 'G4', 0.5, 0.84], [2, 'A4', 1, 1.12], [3, 'G4', 0.5, 0.90], [3.5, 'E4', 0.5, 0.80]],
    // C — the orbit dips: starts a step lower, peaks a step lower
    [[0, 'G3', 0.5, 1.00], [0.5, 'A3', 0.5, 0.80], [1, 'C4', 0.5, 0.90], [1.5, 'E4', 0.5, 0.84], [2, 'G4', 1, 1.08], [3, 'E4', 0.5, 0.88], [3.5, 'C4', 0.5, 0.80]],
    // G — the far side: the whole motif's high point, B4, then a stepwise fall
    [[0, 'G3', 0.5, 1.00], [0.5, 'B3', 0.5, 0.80], [1, 'D4', 0.5, 0.90], [1.5, 'G4', 0.5, 0.86], [2, 'B4', 1, 1.16], [3, 'A4', 0.5, 0.90], [3.5, 'G4', 0.5, 0.82]],
    // D — home arrives EARLY (beat 0) and the line walks down to the pickup
    [[0, 'A4', 1, 1.10], [1, 'F#4', 0.5, 0.88], [1.5, 'E4', 0.5, 0.82], [2, 'D4', 1.5, 1.00], [3.5, 'B3', 0.5, 0.84]],
  ];
  // The slow orbit: the apex of each bar. This IS the hook — glock always,
  // flute in B, horns in the last lap.
  const APEX = [[2, 'A4'], [2, 'G4'], [2, 'B4'], [0, 'A4']];
  // What the harp echoes one bar later: each bar's apex-and-falloff. An echo
  // of the tail (not the whole bar) stays consonant over the NEXT chord — a
  // full one-bar canon put G against B and F# on strong beats.
  const TAIL = MOTIF.map((rows) => rows.filter(([b]) => b >= 2));

  // The same gesture on the two guest chords of the sling (bar 14 = F; bar 15
  // reuses MOTIF[2] since its G bar is already the right chord).
  const F_FIG = [[0, 'F3', 0.5, 1.00], [0.5, 'A3', 0.5, 0.80], [1, 'C4', 0.5, 0.88], [1.5, 'F4', 0.5, 0.84], [2, 'A4', 1, 1.10], [3, 'G4', 0.5, 0.90], [3.5, 'F4', 0.5, 0.80]];
  const F_TAIL = F_FIG.filter(([b]) => b >= 2);

  // The flute's fast-orbit rows (A3 and the last lap): the motif an octave up,
  // but entering each bar at beat 1 — the low half of the figure stays pizz
  // territory, and the one-beat gap at each barline is where the player
  // BREATHES. Bar 3 holds the B5 peak an extra half-beat (falloff left to the
  // pizz) so there is a real breath before the bar-4 downbeat entry.
  const RUN = [
    [[1, 'E5', 0.5, 0.9], [1.5, 'G5', 0.5, 0.9], [2, 'A5', 1, 1.1], [3, 'G5', 0.5, 0.9], [3.5, 'E5', 0.5, 0.8]],
    [[1, 'C5', 0.5, 0.9], [1.5, 'E5', 0.5, 0.9], [2, 'G5', 1, 1.06], [3, 'E5', 0.5, 0.9], [3.5, 'C5', 0.5, 0.8]],
    [[1, 'D5', 0.5, 0.9], [1.5, 'G5', 0.5, 0.92], [2, 'B5', 1.5, 1.14]],
    [[0, 'A5', 1, 1.08], [1, 'F#5', 0.5, 0.9], [1.5, 'E5', 0.5, 0.84], [2, 'D5', 1.5, 1.0]],
  ];
  // The slow orbit as the flute's ENTRANCE (section B): one apex per bar, held
  // across the barline, a breath before each new note. [bar, beat, note, len, w]
  const HOOK = [
    [10, 2, 'A5', 3.0, 1.00],
    [11, 2, 'G5', 3.0, 0.95],
    [12, 2, 'B5', 1.75, 1.12],   // the peak — released early for the breath…
    [13, 0, 'A5', 3.5, 1.00],    // …because home lands ON the downbeat, early
  ];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** The spinning figure. Apex notes ring longer — they are landings, not
   *  passing plucks — and every amp wobbles a little; eight identical plucks
   *  in a row is a sequencer, not a section. */
  function figure(bar, rows, amp, { oct = 1, tr = pz } = {}) {
    const t0 = bar * BAR;
    for (const [beat, name, len, w = 1] of rows) {
      pizz(tr.buf, t0 + B(beat) + J(), n(name) * oct, amp * w * (1 + 0.05 * rng()), rng,
        { decay: len >= 1 ? 0.9 : 0.55, damp: 0.42, bright: 0.6 });
    }
  }
  /** The harp repeats a bar's tail one bar later — the acoustic version of the
   *  dotted delay that made the v2.31 orbit catchy. At pitch, quieter, from
   *  the other side of the stage. */
  function echo(bar, rows, amp) {
    const t0 = bar * BAR;
    for (const [beat, name, , w = 1] of rows)
      harp(hp.buf, t0 + B(beat) + 0.012 + J(), n(name), amp * w, rng, {});
  }
  /** The hook, one ping per bar, an octave above the figure's apex. */
  function apexPing(bar, [beat, name], amp) {
    glock(bl.buf, bar * BAR + B(beat) + J(), n(name) * 2, amp * (1 + 0.06 * rng()), rng, {});
  }
  /** Cello pizz ground: root on the downbeat, its counter-note on beat 2. */
  function ground(bar, chd, amp) {
    const t0 = bar * BAR;
    pizz(vcp.buf, t0 + J(), n(chd.vc[0]), amp, rng, { decay: 1.0, damp: 0.5, bright: 0.4 });
    pizz(vcp.buf, t0 + B(2) + J(), n(chd.vc[1]), amp * 0.85, rng, { decay: 0.9, damp: 0.5, bright: 0.4 });
  }
  /** Viola off-beat double-stops — the "chick" that keeps it on its toes. */
  function chips(bar, chd, amp) {
    const t0 = bar * BAR;
    for (const beat of [1, 3]) {
      chd.chip.forEach((name, k) =>
        pizz(vap.buf, t0 + B(beat) + k * 0.004 + J(), n(name), amp * (beat === 3 ? 0.9 : 1), rng,
          { decay: 0.45, damp: 0.5, bright: 0.55 }));
    }
  }
  function low(bar, chd, amp, beats = [0]) {
    for (const beat of beats)
      bass(db.buf, bar * BAR + B(beat) + J(), n(chd.db), amp * (beat ? 0.85 : 1), rng,
        { decay: 2.2, damp: 0.74 });
  }
  /** The bowed bed — SECOND violins high, violas mid. Kept lean (two notes
   *  each): a sustained voice carries ~10 dB more energy than a pluck at the
   *  same amp, and this piece belongs to the plucks. */
  function pad(bar, bars, chd, ampHi, ampMid = 0, bright = 0.35) {
    const t0 = bar * BAR + Math.abs(rng()) * 0.03;
    for (const name of chd.hi)
      strings(v2.buf, t0, bars * BAR, n(name), ampHi, rng,
        { voices: 5, spread: 0.0055, atk: 0.8, rel: 1.2, bright });
    if (ampMid) for (const name of chd.mid)
      strings(va.buf, t0 + 0.02, bars * BAR, n(name), ampMid, rng,
        { voices: 4, spread: 0.006, atk: 1.0, rel: 1.4, bright: bright * 0.8 });
  }
  /** Cello quarters, root–fifth–root–fifth: a trot, not the anthem's engine —
   *  bowed strokes so the bite carries the pulse, but only four to the bar. */
  function trot(bar, chd, amp) {
    const t0 = bar * BAR;
    for (const beat of [0, 1, 2, 3]) {
      const lean = beat === 0 ? 1.2 : beat === 2 ? 1.0 : 0.8;
      stringHit(vc.buf, t0 + B(beat) + J(), B(0.8), n(chd.vc[beat % 2]), amp * lean, rng,
        { voices: 4, bite: 0.5, bright: 0.5 });
    }
  }
  /** One flute. Long notes get real vibrato (delayed — players never vibrate
   *  on the attack); running eighths get almost none. */
  function fluteRow(bar, rows, amp) {
    const t0 = bar * BAR;
    for (const [beat, name, len, w = 1] of rows)
      flute(fl.buf, t0 + B(beat) + J(), B(len) * 0.92, n(name), amp * w, rng,
        { vib: len >= 1 ? 0.010 : 0.004, vibDelay: len >= 1 ? 0.35 : 0.8, breath: 0.30 });
  }
  function shakerBar(bar, amp) {
    const t0 = bar * BAR;
    for (let k = 0; k < 8; k++)
      shaker(sh.buf, t0 + B(k * 0.5) + J(), amp * (k % 2 ? 1 : 0.55) * (1 + 0.15 * rng()), rng, {});
  }

  // ── 0–1 · the spin-up ─────────────────────────────────────────────────────
  // The orbit starting to turn: the figure's first four notes as slow quarters,
  // then the same climb doubled in speed and carried two octaves up, harp
  // blurring behind it, a timpani roll gathering underneath. The v2.31 opening
  // was a swell and two hits; this is the same "here it comes" with players.
  bass(db.buf, J(), n('A1'), 0.30, rng, { decay: 3.2 });
  harp(hp.buf, 0.02 + J(), n('A2'), 0.26, rng, {});
  for (const name of ['A4', 'E5'])   // a pp halo so the plucks land in a space
    strings(v2.buf, 0.05 + Math.abs(rng()) * 0.03, BAR * 1.9, n(name), 0.07, rng,
      { voices: 5, spread: 0.005, atk: 1.6, rel: 1.2, bright: 0.3 });
  [['A3', 0.26], ['C4', 0.24], ['E4', 0.27], ['G4', 0.25]].forEach(([name, a], k) =>
    pizz(pz.buf, B(k) + J(), n(name), a, rng, { decay: 0.9, damp: 0.42, bright: 0.6 }));
  ['A3', 'C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'G5'].forEach((name, k) => {
    const t = BAR + B(k * 0.5) + J();
    pizz(pz.buf, t, n(name), 0.26 + 0.02 * k, rng, { decay: 0.6, damp: 0.42, bright: 0.6 });
    harp(hp.buf, t + 0.018, n(name), 0.16 + 0.012 * k, rng, {});
  });
  timpani(tm.buf, BAR + B(2) + J(), n('A2'), 0.26, rng, { roll: B(2) });

  // the launch — one hit and one small crash mark the section change
  timpani(tm.buf, 2 * BAR + J(), n('A2'), 0.36, rng, { decay: 2.2 });
  cymbal(bl.buf, 2 * BAR, 0.15, rng, { decay: 2.6, f: 500, crash: true });
  glock(bl.buf, 2 * BAR + J(), n('A5'), 0.12, rng, {});

  // ── 2–5 · A1 — the motif, pizzicato alone ─────────────────────────────────
  // Bare on purpose: the first hearing has to be the tune and nothing else.
  LOOP.forEach((chd, i) => {
    figure(2 + i, MOTIF[i], 0.34);
    ground(2 + i, chd, 0.30);
  });

  // ── 6–9 · A2 — the echo arrives ───────────────────────────────────────────
  // Same statement, but now every bar's tail comes back a bar later on the
  // harp, the glock rings the apexes, violas chip the off-beats and the basses
  // put a floor under it. (Bar 6 echoes bar 5 — the harp answers a phrase it
  // never played, which is what makes it an echo and not a doubling.)
  timpani(tm.buf, 6 * BAR + J(), n('A2'), 0.30, rng, { decay: 2.0 });
  LOOP.forEach((chd, i) => {
    const bar = 6 + i;
    figure(bar, MOTIF[i], 0.38);
    ground(bar, chd, 0.34);
    chips(bar, chd, 0.15);
    low(bar, chd, 0.34);
    echo(bar, TAIL[(i + 3) % 4], 0.19);
    apexPing(bar, APEX[i], 0.11);
  });

  // ── 10–13 · B — the bed, and the flute that did not start this ────────────
  // Arco warmth under the spin, and the flute floats in at beat 2 of bar 10 —
  // singing the SLOW orbit the glock has been hinting at. It gets the melody
  // precisely because it had no part in building the texture.
  timpani(tm.buf, 10 * BAR + J(), n('A2'), 0.34, rng, { decay: 2.2 });
  cymbal(bl.buf, 10 * BAR, 0.13, rng, { decay: 2.4, f: 520, crash: true });
  LOOP.forEach((chd, i) => {
    const bar = 10 + i;
    figure(bar, MOTIF[i], 0.40);
    pad(bar, 1, chd, 0.13, 0.12, 0.35);
    strings(vc.buf, bar * BAR + Math.abs(rng()) * 0.03, BAR * 1.02, n(chd.vc[0]), 0.18, rng,
      { voices: 4, spread: 0.006, atk: 0.5, rel: 0.9, bright: 0.3 });
    low(bar, chd, 0.36);
    echo(bar, TAIL[(i + 3) % 4], 0.19);
    apexPing(bar, APEX[i], 0.12);
    shakerBar(bar, 0.09);
    if (i % 2 === 0) gliss(hp.buf, bar * BAR + J(), chd.roll.map(n), 0.16, rng, { step: 0.03, accel: 1 });
  });
  HOOK.forEach(([bar, beat, name, len, w]) =>
    flute(fl.buf, bar * BAR + B(beat) + J(), B(len) * 0.95, n(name), 0.30 * w, rng,
      { vib: 0.012, vibDelay: 0.5, breath: 0.32 }));

  // ── 14–15 · the sling ─────────────────────────────────────────────────────
  // Strip back to where the piece started — plucks and echo — but the ground
  // shifts: F, then G, the epic bVI–bVII lift, the only bars off the loop.
  // The orbit is being pulled by something heavier before it snaps back round.
  figure(14, F_FIG, 0.34);
  figure(15, MOTIF[2], 0.34);
  ground(14, F, 0.30); ground(15, G, 0.30);
  low(14, F, 0.32); low(15, G, 0.32);
  gliss(hp.buf, 14 * BAR + J(), F.roll.map(n), 0.18, rng, { step: 0.03, accel: 1 });
  echo(15, F_TAIL, 0.19);
  apexPing(14, [2, 'A4'], 0.12);
  apexPing(15, [2, 'B4'], 0.13);
  riser(v2.buf, 14.5 * BAR, 16 * BAR, n('A3'), n('A5'), 0.13, rng, { voices: 6, trem: 1 });
  timpani(tm.buf, 15 * BAR + B(2) + J(), n('G2'), 0.30, rng, { roll: B(2) });

  // ── 16–19 · A3 — the flute takes the spin itself ──────────────────────────
  // Everything the piece has EXCEPT brass: the flute runs the figure an octave
  // up, the harp shadows the pizz a blink behind (two players, never together),
  // cellos trot quarters, and the bed brightens. Held back on purpose — the
  // brass has to have somewhere to come back from.
  timpani(tm.buf, 16 * BAR + J(), n('A2'), 0.42, rng, { decay: 2.4 });
  LOOP.forEach((chd, i) => {
    const bar = 16 + i;
    figure(bar, MOTIF[i], 0.44);
    for (const [beat, name, len, w = 1] of MOTIF[i])
      harp(hp.buf, bar * BAR + B(beat) + 0.012 + J(), n(name), 0.24 * w, rng, {});
    fluteRow(bar, RUN[i], 0.40);
    pad(bar, 1, chd, 0.18, 0, 0.42);
    chips(bar, chd, 0.20);
    trot(bar, chd, 0.22);
    low(bar, chd, 0.38, [0, 2]);
    apexPing(bar, APEX[i], 0.13);
    shakerBar(bar, 0.12);
  });

  // ── 20–22 · the last lap — brass underneath everything ────────────────────
  // Motif bars 1–3 only: the lap is cut short at its OWN high point (the B4
  // bar) and the gag takes the place of bar 4 — the walk home compressed into
  // one bar. Horns get the slow orbit the flute sang in B; their brightness is
  // played, not mixed: bite rises bar by bar, the last one blazing.
  timpani(tm.buf, 20 * BAR + J(), n('A2'), 0.50, rng, { decay: 2.6 });
  taiko(tm.buf, 20 * BAR + J(), 0.30, rng, { decay: 3.2 });
  cymbal(bl.buf, 20 * BAR, 0.24, rng, { decay: 3.4, f: 480, crash: true });
  const HORN = [['A4', 0.85, 0.30], ['G4', 1.0, 0.31], ['B4', 1.2, 0.33]];
  const LBASS = [['A2', 0.18], ['C3', 0.19], ['G2', 0.21]];
  [0, 1, 2].forEach((i) => {
    const bar = 20 + i, chd = LOOP[i];
    figure(bar, MOTIF[i], 0.48);
    for (const [beat, name, len, w = 1] of MOTIF[i])
      harp(hp.buf, bar * BAR + B(beat) + 0.012 + J(), n(name), 0.26 * w, rng, {});
    fluteRow(bar, i === 2 ? [[1, 'D5', 0.5, 0.9], [1.5, 'G5', 0.5, 0.92], [2, 'B5', 1.1, 1.14]] : RUN[i], 0.46);
    const [hName, hBite, hAmp] = HORN[i];
    brassSection(hn.buf, bar * BAR + J(), B(i === 2 ? 3.4 : 3.7), n(hName), hAmp, rng,
      { kind: 'horn', players: 3, bite: hBite, atk: 0.06, swellTo: 1.15, vibDelay: 0.6 });
    brassSection(lb.buf, bar * BAR + 0.015 + J(), B(3.6), n(LBASS[i][0]), LBASS[i][1], rng,
      { kind: 'trombone', players: 2, bite: 1.0, atk: 0.09, swellTo: 1.2 });
    pad(bar, 1, chd, 0.24, 0, 0.5);
    chips(bar, chd, 0.24);
    trot(bar, chd, 0.27);
    low(bar, chd, 0.42, [0, 2]);
    apexPing(bar, APEX[i], 0.15);
    shakerBar(bar, 0.15);
  });

  // ── 23 · the gag, and the landing ─────────────────────────────────────────
  // The v2.31 orbit ended on a stop-gap: one silent beat, the hook answers,
  // then the hit. Same joke, played: everything chops dead ON the downbeat, a
  // breath of hall, the hook spun as three naked sixteenths — the whole slow
  // orbit in a third of a second — an eighth of air, and the landing on A.
  const T = 23 * BAR;
  // the chop — short-decay plucks so the stop actually stops
  pizz(pz.buf, T + J(), n('A3'), 0.50, rng, { decay: 0.28, damp: 0.55, bright: 0.6 });
  pizz(pz.buf, T + 0.004 + J(), n('A4'), 0.44, rng, { decay: 0.28, damp: 0.55, bright: 0.6 });
  pizz(vcp.buf, T + J(), n('A2'), 0.45, rng, { decay: 0.30, damp: 0.55, bright: 0.4 });
  for (const [k, name] of ['C4', 'E4'].entries())
    pizz(vap.buf, T + k * 0.004 + J(), n(name), 0.38, rng, { decay: 0.26, damp: 0.55, bright: 0.5 });
  bass(db.buf, T + J(), n('A1'), 0.50, rng, { decay: 0.8, damp: 0.74, dur: B(0.4) });
  timpani(tm.buf, T + J(), n('A2'), 0.70, rng, { decay: 1.1 });
  glock(bl.buf, T + J(), n('A5'), 0.14, rng, { decay: 1.2 });
  // …the spin: A – G – B as sixteenths, naked
  [[0.75, 'A4'], [1, 'G4'], [1.25, 'B4']].forEach(([beat, name]) => {
    const t = T + B(beat) + J();
    pizz(pz.buf, t, n(name), 0.40, rng, { decay: 0.5, damp: 0.42, bright: 0.62 });
    glock(bl.buf, t + 0.004, n(name) * 2, 0.18, rng, {});
    harp(hp.buf, t + 0.010, n(name), 0.24, rng, {});
  });
  // …and home. A hit, an A-minor bloom that dims itself (swellTo < 1), and the
  // harp still climbing as the lights go out — the orbit does not stop, we
  // just stop watching it.
  const L = T + B(2);
  timpani(tm.buf, L + J(), n('A2'), 0.90, rng, { decay: 2.8 });
  taiko(tm.buf, L + J(), 0.50, rng, { decay: 3.6 });
  bass(db.buf, L + J(), n('A1'), 0.65, rng, { decay: 4.0 });
  cymbal(bl.buf, L, 0.26, rng, { decay: 4.2, f: 460, crash: true });
  brassSection(hn.buf, L, 2.1, n('A4'), 0.32, rng, { kind: 'horn', players: 4, bite: 1.15, atk: 0.05, swellTo: 0.8 });
  brassSection(lb.buf, L + 0.015, 2.1, n('A3'), 0.22, rng, { kind: 'trombone', players: 2, bite: 1.05, atk: 0.08, swellTo: 0.8 });
  brassSection(lb.buf, L + 0.03, 2.1, n('A2'), 0.16, rng, { kind: 'tuba', players: 1, bite: 0.95, atk: 0.10, swellTo: 0.8 });
  flute(fl.buf, L + 0.02, 1.9, n('A5'), 0.40, rng, { vib: 0.014, vibDelay: 0.3, breath: 0.30 });
  for (const name of ['A4', 'E5'])
    strings(v2.buf, L + Math.abs(rng()) * 0.02, 2.2, n(name), 0.24, rng, { voices: 5, spread: 0.005, atk: 0.05, rel: 1.6, bright: 0.45 });
  strings(vc.buf, L + 0.01, 2.2, n('A2'), 0.24, rng, { voices: 4, spread: 0.006, atk: 0.05, rel: 1.6, bright: 0.35 });
  glock(bl.buf, L + J(), n('A6'), 0.16, rng, { decay: 2.4 });
  gliss(hp.buf, L + 0.05, ['A2', 'E3', 'A3', 'C4', 'E4', 'A4', 'C5', 'E5', 'A5'].map(n), 0.20, rng, { step: 0.045, accel: 0.93 });
}
