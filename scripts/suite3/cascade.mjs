// ─── cascade — the fast one ──────────────────────────────────────────────────
//
// Pierre, 2026-08-24: "The only difference from the original ones should be
// real instruments instead of synthetic."
//
// The v2.31 `cascade` was the chiptune one: a minor-key square-wave riff
// tumbling down the scale at 140 bpm, a walking bass, and a +2 semitone lift
// before the end. This is that ENERGY on an orchestra: rapid descending
// sixteenth-note runs that hand off violins → violas → cellos, so the fall
// pours DOWN through the sections the way the old riff fell down the scale.
// Underneath, a driving low-string ostinato and light timpani; on top,
// glockenspiel and harp ring the crest of every wave. The brass stays out
// until the last third, then sings LONG notes against all that motion — the
// stillness-over-speed contrast is the payoff — and the old +2 lift arrives
// with the trumpets, because it is a cheap trick and it works every time.
//
// E minor, 138 bpm. Loop Em – Bm – C – D (i – v – VI – VII): the same
// harmonic walk the original's bass made (A A E E F F G G, transposed), and
// its VI–VII tail climbs back into the tonic, so the loop never stops moving.
//
// THE ONE STRUCTURAL IDEA: the theme and the cascade are the same object.
// Each bar's three theme notes are the ENTRY POINTS of the three falling
// runs — violins take note 1 up an octave, violas take note 2 at pitch,
// cellos take note 3 an octave down — while glockenspiel and harp strike the
// same three notes in a single register. So the hummable tune is always
// ringing on top, and every note of it visibly spills down the orchestra.
//
// FORM (bars of 4/4 at 138 bpm = 1.739 s; 31 bars + tail = 55 s)
//   0–1    the opening   riser, two hits, and a harp cascade falling — the
//                        signature gesture before the machine starts
//   2–5    A1            theme as cascades, violins + violas only, light drive
//   6–9    A2            cellos join the handoff; the eighth-note engine full
//   10–13  B             the floor drops out: theme BARE on harp and cello
//                        pizzicato under a high violin pedal; engine rebuilds
//   14–18  A3            the full machine, brightest yet (18 re-runs the C bar)
//   19     the rush      all three sections fall two octaves in unison while a
//                        riser and a timpani roll climb — an X into the brass
//   20–23  A4            horns sing the theme AUGMENTED over the running
//                        strings; trombones hold the roots
//   24–27  A5 (+2)       the chiptune lift: everything up two semitones,
//                        trumpets take the top line, the bite opens
//   28–29  the crest     the high-point bar, the walk home, and the last
//                        two-octave rush crashing into
//   30     the hit       F#m sforzando — a hard stop, and the hall rings
//
// SEATING is anthem.mjs's orchestra with two additions where the real players
// sit: the harp at the left edge beside the first violins, and the ostinato on
// its own celli/bassi desks right of centre. Nothing is pair:true — the
// orchestra is a picture in front of you; the surrounds get the hall.

export const meta = {
  name: 'cascade',
  title: 'Cascade',
  dur: 55,
  tempo: 138,
  seed: 0xCA5CA,
  blurb: 'The fast one — falling string runs handed violins to violas to cellos over a driving ostinato, long brass against the motion, and the old +2 lift.',
  // Shorter hall than anthem's: sixteenths at 138 bpm smear in a 2.9 s room.
  reverb: { rt60: 2.2, damp: 0.36, preDelay: 0.024, width: 1.35 },
  master: { drive: 1.18, lfeGain: 0.5 },
};

export function compose(S, O) {
  const {
    n, st, strings, stringHit, timpani, taiko, cymbal, pizz, harp, gliss,
    glock, riser, brassSection, bass, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;   // never quantise — every start breathes

  // ── the orchestra, seated (anthem's layout + harp desk + ostinato desks) ──
  const v1 = S.track('violins', { az: -22, spread: 7, send: 0.46, gain: 0.95, hp: 170 });
  const va = S.track('violas', { az: 6, spread: 10, send: 0.46, gain: 0.78, hp: 130 });
  const vc = S.track('cellos', { az: 23, spread: 6, send: 0.42, gain: 0.88 });
  const os = S.track('ostinato', { az: 16, centre: 0.12, spread: 6, send: 0.30, gain: 0.92 });
  const db = S.track('basses', { az: -4, centre: 0.16, send: 0.24, gain: 0.90, body: BODY.upright, lp: 1500 });
  const pc = S.track('percussion', { az: -6, centre: 0.30, spread: 12, send: 0.38, gain: 1.0 });
  const hn = S.track('horns', { az: -10, centre: 0.34, spread: 9, send: 0.42, gain: 1.0 });
  const tp = S.track('trumpets', { az: 14, centre: 0.26, spread: 7, send: 0.44, gain: 0.85 });
  const lb = S.track('low-brass', { az: 0, centre: 0.34, spread: 11, send: 0.36, gain: 0.90, lp: 3200 });
  const gk = S.track('glock', { az: 26, spread: 4, send: 0.60, gain: 0.60 });
  const hr = S.track('harp', { az: -26, spread: 4, send: 0.55, gain: 0.72 });

  // ── pitch machinery ───────────────────────────────────────────────────────
  // Every run walks ONE scale — E aeolian — whatever the chord of the bar.
  // Chord-adjusting each run was tried on paper and rejected: at sixteenth
  // speed a run is a gesture, not harmony, and one scale is what lets a
  // listener hum along. The +2 lift is applied as st(f, 2) at render time, so
  // the note DATA never forks into a transposed copy that could drift.
  const LADDER = [
    'E2', 'F#2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F#3', 'G3', 'A3', 'B3',
    'C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5',
    'A5', 'B5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6',
  ];
  const LIX = Object.fromEntries(LADDER.map((x, i) => [x, i]));
  /** Shift a note NAME by k octaves ('E5',1 → 'E6'). */
  const oc = (name, k) => name.replace(/-?\d+$/, (d) => String(Number(d) + k));

  // The loop, one chord per bar. bassN is the classic i–v–VI–VII bass walk
  // (E1 B1 C2 D2 — VI and VII sit ABOVE the dominant, which is what pushes
  // the loop's tail back up into the tonic).
  const LOOP = [
    { ost: 'E2', fifth: 'B2', bassN: 'E1', timp: 'E2', trbn: 'E3', tuba: 'E2' },  // Em  i
    { ost: 'B1', fifth: 'F#2', bassN: 'B1', timp: 'B2', trbn: 'B2', tuba: 'B1' }, // Bm  v
    { ost: 'C2', fifth: 'G2', bassN: 'C2', timp: 'C2', trbn: 'C3', tuba: 'C2' },  // C   VI
    { ost: 'D2', fifth: 'A2', bassN: 'D2', timp: 'D2', trbn: 'D3', tuba: 'D2' },  // D   VII
  ];

  // ── THE THEME ─────────────────────────────────────────────────────────────
  // Three falling waves whose crests CLIMB (E → F# → G), then a stepwise walk
  // home. High point G5 lands on the strong beat of bar 3; every strong-beat
  // note is a chord tone; bar 4's tightened rhythm (0/1/2 instead of 0/2/3)
  // crowds the waves together to drive the loop around again.
  const THEME = [
    [[0, 'E5', 2, 1.05], [2, 'D5', 1, 0.90], [3, 'B4', 1, 0.85]],   // Em
    [[0, 'F#5', 2, 1.08], [2, 'D5', 1, 0.90], [3, 'B4', 1, 0.85]],  // Bm
    [[0, 'G5', 2, 1.15], [2, 'E5', 1, 0.95], [3, 'C5', 1, 0.90]],   // C — the top
    [[0, 'F#5', 1, 1.00], [1, 'E5', 1, 0.95], [2, 'D5', 2, 0.90]],  // D — walk home
  ];
  // What the horns sing: the theme AUGMENTED — its crests as whole notes, the
  // walk home in real time. Long notes against sixteenth motion is the whole
  // point of the brass entry; giving the horns the ornamented line would just
  // add one more running voice.
  const SKEL = [
    [[0, 'E5', 3.9, 1.0]],
    [[0, 'F#5', 3.9, 1.04]],
    [[0, 'G5', 1.9, 1.10], [2, 'E5', 1.9, 0.95]],
    [[0, 'F#5', 0.95, 1.0], [1, 'E5', 0.95, 0.95], [2, 'D5', 1.9, 0.92]],
  ];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** One falling run: `count` sixteenths stepping down E aeolian from `top`.
   *  First note leans (it IS a theme note), then the run diminuendos as it
   *  falls — a real section lets a falling gesture die away, and the fade is
   *  what keeps eighteen bars of runs from becoming a wall. */
  function runDown(tr, tSec, top, count, amp, { lift = 0, bright = 0.6, bite = 0.5 } = {}) {
    const i0 = LIX[top];
    for (let k = 0; k < count; k++) {
      const w = (k === 0 ? 1.22 : 1) * Math.pow(0.94, k) * (1 + 0.06 * rng());
      stringHit(tr.buf, tSec + B(k * 0.25) + J(), B(0.24), st(n(LADDER[i0 - k]), lift),
        amp * w, rng, { voices: 4, bite, bright });
    }
  }

  // Stage seating for the handoff: violins take the bar's first theme note an
  // octave up, violas the second at pitch, cellos the third an octave down.
  // Runs shorten as they descend — the waves shrink as they near the ground.
  const STAGE = [
    { tr: () => v1, oct: +1, len: 6, mul: 1.00, bright: 0.68, bite: 0.50 },
    { tr: () => va, oct: 0, len: 5, mul: 0.85, bright: 0.56, bite: 0.45 },
    { tr: () => vc, oct: -1, len: 4, mul: 0.90, bright: 0.50, bite: 0.55 },
  ];
  /** One bar of the cascade machine. glk/hrp are the theme ringing on top in
   *  ONE register (glock 8va, harp at pitch) — without this the entries sit
   *  three octaves apart and the tune reads as texture, not melody. */
  function cascadeBar(bi, pos, amp, { stages = 3, lift = 0, glk = 0.11, hrp = 0.16 } = {}) {
    const t0 = bi * BAR;
    THEME[pos].forEach(([beat, name, , w = 1], si) => {
      if (si < stages) {
        const sp = STAGE[si];
        runDown(sp.tr(), t0 + B(beat), oc(name, sp.oct), sp.len, amp * sp.mul * w,
          { lift, bright: sp.bright, bite: sp.bite });
      }
      if (glk) glock(gk.buf, t0 + B(beat) + J(), st(n(oc(name, 1)), lift), glk * w, rng, {});
      if (hrp) harp(hr.buf, t0 + B(beat) + J(), st(n(name), lift), hrp * w, rng, {});
    });
  }

  /** The engine: rocking-octave eighths on the celli/bassi desks (the fifth as
   *  a turn on beat 3+), pizzicato-bass roots, timpani where asked. stringHit
   *  because an ostinato is BOWED strokes — the bite is the rhythm. */
  function engineBar(bi, pos, {
    ost = 0, half = false, bassBeats = [0, 2], bassAmp = 0.30,
    timp = [], timpAmp = 0.2, lift = 0,
  } = {}) {
    const t0 = bi * BAR, L = LOOP[pos];
    if (ost) {
      const P = [0, 1, 0, 1, 0, 1, 2, 1];                       // root/octave rock, fifth turn
      const LEAN = [1.25, 0.78, 0.95, 0.80, 1.12, 0.78, 1.00, 0.85];
      P.forEach((sel, k) => {
        if (half && k % 2) return;                              // quarters while it warms up
        const nm = sel === 0 ? L.ost : sel === 1 ? oc(L.ost, 1) : L.fifth;
        stringHit(os.buf, t0 + B(k * 0.5) + J(), B(0.40), st(n(nm), lift),
          ost * LEAN[k] * (1 + 0.05 * rng()), rng, { voices: 4, bite: 0.6, bright: 0.58 });
      });
    }
    for (const b of bassBeats) {
      bass(db.buf, t0 + B(b) + J(), st(n(L.bassN), lift), bassAmp * (b === 0 ? 1 : 0.85), rng,
        { decay: 1.8, damp: 0.7, dur: B(0.9) });
    }
    for (const b of timp) {
      timpani(pc.buf, t0 + B(b) + J(), st(n(L.timp), lift),
        timpAmp * (b === 0 ? 1 : 0.85) * (1 + 0.04 * rng()), rng, { decay: 2.0 });
    }
  }

  /** The brass, bar by bar: horns on the augmented theme, trombones + tuba
   *  holding the root underneath. In the lifted sections the horns drop an
   *  octave (hornOct: -1) and the trumpets take the top — a concert A5 is
   *  trumpet country, not horn country, and the handover is exactly how the
   *  brightness opens at the climax. */
  function brassBar(bi, pos, amp, {
    lift = 0, hornOct = 0, bite = 1.05, trumpets = 0, boneAmp = 0.20, swell = 1,
  } = {}) {
    const t0 = bi * BAR, L = LOOP[pos];
    for (const [beat, name, len, w = 1] of SKEL[pos]) {
      brassSection(hn.buf, t0 + B(beat) + J(), B(len) * 0.97, st(n(oc(name, hornOct)), lift),
        amp * w, rng, { kind: 'horn', players: 4, bite, atk: 0.05, vib: len >= 2 ? 0.005 : 0.002, vibDelay: 0.5 });
      if (trumpets) {
        brassSection(tp.buf, t0 + B(beat) + 0.012 + J(), B(len) * 0.95, st(n(name), lift),
          trumpets * w, rng, { kind: 'trumpet', players: 3, bite: bite + 0.05, atk: 0.04 });
      }
    }
    brassSection(lb.buf, t0 + J(), BAR * 0.98, st(n(L.trbn), lift), boneAmp, rng,
      { kind: 'trombone', players: 3, bite: 0.85, atk: 0.09, swellTo: swell });
    brassSection(lb.buf, t0 + 0.02, BAR * 0.98, st(n(L.tuba), lift), boneAmp * 0.72, rng,
      { kind: 'tuba', players: 2, bite: 0.8, atk: 0.12, swellTo: swell });
  }

  /** The unison rush: all three sections fall in parallel octaves, sixteenths,
   *  CRESCENDOING as they drop (the ordinary runs decay — this one gathers,
   *  because it is aimed at a downbeat). The piece's identity move, saved for
   *  the two moments that need a battering ram. */
  function rush(bi, beat0, top, count, ampTo, { lift = 0 } = {}) {
    const t0 = bi * BAR + B(beat0);
    for (const [tr, ok] of [[v1, 0], [va, -1], [vc, -2]]) {
      const i0 = LIX[oc(top, ok)];
      for (let k = 0; k < count; k++) {
        const u = k / (count - 1);
        const w = (0.45 + 0.55 * u) * (1 + 0.05 * rng());
        stringHit(tr.buf, t0 + B(k * 0.25) + J(), B(0.24), st(n(LADDER[i0 - k]), lift),
          ampTo * w, rng, { voices: 4, bite: 0.5 + 0.3 * u, bright: 0.6 });
      }
    }
  }

  // ── 0–1 · the opening ─────────────────────────────────────────────────────
  // The v2.31 suite opened on a swell and two hits. Same gesture — a short
  // string riser into two timpani/taiko strokes — but between them the harp
  // pours a run DOWN, because in this piece even the curtain-raiser falls.
  riser(v1.buf, 0.02, B(2), n('A3'), n('E5'), 0.13, rng, { voices: 5, trem: 0 });
  timpani(pc.buf, B(2) + J(), n('E2'), 0.58, rng, { decay: 2.0 });
  taiko(pc.buf, B(2) + 0.004, 0.50, rng, { decay: 3.2 });
  gliss(hr.buf, B(2) + 0.05, ['E6', 'D6', 'B5', 'A5', 'G5', 'E5', 'D5', 'B4', 'G4', 'E4'].map(n),
    0.22, rng, { step: 0.042, accel: 1.03, voice: harp });
  timpani(pc.buf, BAR + J(), n('E2'), 0.85, rng, { decay: 2.6 });
  taiko(pc.buf, BAR + 0.005, 0.72, rng, { decay: 3.8 });
  cymbal(gk.buf, BAR, 0.22, rng, { decay: 3.2, f: 500, crash: true });
  bass(db.buf, BAR, n('E1'), 0.55, rng, { decay: 3.0 });
  glock(gk.buf, BAR + J(), n('E6'), 0.12, rng, {});          // the first crest, pre-echoed
  engineBar(1, 0, { ost: 0.18, bassBeats: [2], bassAmp: 0.26, timp: [] });
  runDown(v1, BAR + B(3), 'E6', 4, 0.20, { bright: 0.66, bite: 0.5 });  // the machine wakes

  // ── 2–5 · A1 — violins and violas only ────────────────────────────────────
  // Two stages, quarter-note engine, timpani on downbeats only: the theme has
  // to be learnable here, so the third wave and half the drive are held back.
  [2, 3, 4, 5].forEach((bar, i) => {
    cascadeBar(bar, i, 0.26, { stages: 2, glk: 0.10, hrp: 0.13 });
    engineBar(bar, i, { ost: 0.17, half: true, bassBeats: [0, 2], bassAmp: 0.26, timp: [0], timpAmp: 0.13 });
  });

  // ── 6–9 · A2 — the cellos join and the engine runs in eighths ─────────────
  [6, 7, 8, 9].forEach((bar, i) => {
    cascadeBar(bar, i, 0.30, { glk: 0.11, hrp: 0.16 });
    engineBar(bar, i, { ost: 0.24, bassBeats: [0, 2], bassAmp: 0.30, timp: [0, 2], timpAmp: 0.18 });
  });

  // ── 10–13 · B — the floor drops out ───────────────────────────────────────
  // The bare statement the README asks for: the theme alone on harp and cello
  // pizzicato — still plucked, so the piece stays kinetic even at its softest —
  // under a barely-moving high violin pedal. The engine is silent two bars,
  // then rebuilds in quarters, then eighths: the quiet the climax is measured
  // against, and the reason the glockenspiel's return at 14 sparkles.
  [10, 11, 12, 13].forEach((bar, i) => {
    THEME[i].forEach(([beat, name, , w = 1]) => {
      harp(hr.buf, bar * BAR + B(beat) + J(), n(name), 0.28 * w, rng, {});
      pizz(vc.buf, bar * BAR + B(beat) + J(), n(oc(name, -1)), 0.26 * w, rng,
        { decay: 0.7, damp: 0.5, bright: 0.5 });
      if (i === 3) glock(gk.buf, bar * BAR + B(beat) + J(), n(oc(name, 1)), 0.07 * w, rng, {});
    });
    bass(db.buf, bar * BAR + J(), n(LOOP[i].bassN), 0.30, rng, { decay: 2.2, damp: 0.72 });
    if (i === 2) engineBar(bar, i, { ost: 0.15, half: true, bassBeats: [], timp: [] });
    if (i === 3) engineBar(bar, i, { ost: 0.20, bassBeats: [], timp: [] });
  });
  strings(v1.buf, 10 * BAR + Math.abs(rng()) * 0.03, 3.85 * BAR, n('E6'), 0.075, rng,
    { voices: 5, spread: 0.0055, atk: 1.6, rel: 1.2, bright: 0.35 });
  strings(v1.buf, 10 * BAR + Math.abs(rng()) * 0.03, 3.85 * BAR, n('B5'), 0.09, rng,
    { voices: 5, spread: 0.0055, atk: 1.6, rel: 1.2, bright: 0.35 });
  riser(v1.buf, 13.35 * BAR, 14 * BAR, n('A3'), n('A5'), 0.11, rng, { voices: 5, trem: 1 });
  timpani(pc.buf, 13.5 * BAR, n('D2'), 0.26, rng, { roll: 0.48 * BAR });

  // ── 14–18 · A3 — the full machine ─────────────────────────────────────────
  cymbal(gk.buf, 14 * BAR - 0.02, 0.20, rng, { decay: 3.0, f: 480, crash: true });
  taiko(pc.buf, 14 * BAR + J(), 0.35, rng, { decay: 3.2 });
  [14, 15, 16, 17].forEach((bar, i) => {
    cascadeBar(bar, i, 0.33, { glk: 0.12, hrp: 0.17 });
    engineBar(bar, i, { ost: 0.28, bassBeats: [0, 2, 3.5], bassAmp: 0.31, timp: [0, 2], timpAmp: 0.24 });
  });
  // Bar 18 re-runs the C bar: the loop's second half becomes the launch pad,
  // VI–VII pushing up into the brass entry instead of resolving home.
  cascadeBar(18, 2, 0.35, { glk: 0.12, hrp: 0.18 });
  engineBar(18, 2, { ost: 0.30, bassBeats: [0, 2, 3.5], bassAmp: 0.32, timp: [0, 2, 3], timpAmp: 0.28 });

  // ── 19 · the rush — an X drawn into the downbeat ──────────────────────────
  // Strings fall two octaves in unison while the riser and the roll CLIMB.
  // Contrary motion into a bang lands harder than either gesture alone, and a
  // falling launch is this piece keeping its own signature at the door of its
  // biggest moment.
  engineBar(19, 3, { ost: 0.32, bassBeats: [0, 2], timp: [0], timpAmp: 0.30 });
  rush(19, 0, 'A6', 16, 0.30);
  riser(v1.buf, 18.5 * BAR, 20 * BAR, n('E4'), n('E6'), 0.16, rng, { voices: 6, trem: 1 });
  timpani(pc.buf, 19.1 * BAR, n('D2'), 0.34, rng, { roll: 0.85 * BAR });
  gliss(hr.buf, 19 * BAR + B(2.5), ['D4', 'E4', 'F#4', 'A4', 'D5', 'E5', 'F#5', 'A5', 'D6'].map(n),
    0.18, rng, { step: 0.05, accel: 0.88, voice: harp });

  // ── 20–23 · A4 — long brass against the running strings ──────────────────
  cymbal(gk.buf, 20 * BAR - 0.02, 0.28, rng, { decay: 3.6, f: 460, crash: true });
  taiko(pc.buf, 20 * BAR + J(), 0.55, rng, { decay: 3.6 });
  [20, 21, 22, 23].forEach((bar, i) => {
    cascadeBar(bar, i, 0.34, { glk: 0.12, hrp: 0.18 });
    engineBar(bar, i, { ost: 0.30, bassBeats: [0, 2, 3.5], bassAmp: 0.32, timp: [0, 2, 3.5], timpAmp: 0.30 });
    brassBar(bar, i, 0.40, { bite: 1.05, boneAmp: 0.20 });
  });

  // ── 24–27 · A5 — the +2 lift, exactly as the original did it ─────────────
  // E minor becomes F# minor mid-flight. Everything goes up together — runs,
  // engine, timpani, sparkle — via the lift parameter, so there is no second
  // transposed copy of the data to drift out of step.
  cymbal(gk.buf, 24 * BAR - 0.02, 0.30, rng, { decay: 3.8, f: 460, crash: true });
  taiko(pc.buf, 24 * BAR + J(), 0.60, rng, { decay: 3.6 });
  [24, 25, 26, 27].forEach((bar, i) => {
    cascadeBar(bar, i, 0.36, { lift: 2, glk: 0.13, hrp: 0.20 });
    engineBar(bar, i, { lift: 2, ost: 0.33, bassBeats: [0, 2, 3.5], bassAmp: 0.34, timp: [0, 2, 3.5], timpAmp: 0.34 });
    brassBar(bar, i, 0.44, { lift: 2, hornOct: -1, bite: 1.25, trumpets: 0.22, boneAmp: 0.26, swell: i === 3 ? 1.25 : 1 });
  });

  // ── 28–29 · the crest and the walk home ───────────────────────────────────
  // The lifted C bar is the piece's highest sounding peak (the glock crest is
  // now a concert A6); then the walk-home bar plays out under the last rush.
  cascadeBar(28, 2, 0.38, { lift: 2, glk: 0.13, hrp: 0.20 });
  engineBar(28, 2, { lift: 2, ost: 0.35, bassBeats: [0, 2, 3.5], bassAmp: 0.34, timp: [0, 2, 3], timpAmp: 0.36 });
  brassBar(28, 2, 0.46, { lift: 2, hornOct: -1, bite: 1.3, trumpets: 0.24, boneAmp: 0.27 });
  engineBar(29, 3, { lift: 2, ost: 0.35, bassBeats: [0, 2], bassAmp: 0.34, timp: [0, 2], timpAmp: 0.36 });
  brassBar(29, 3, 0.46, { lift: 2, hornOct: -1, bite: 1.3, trumpets: 0.24, boneAmp: 0.28, swell: 1.3 });
  cascadeBar(29, 3, 0, { stages: 0, lift: 2, glk: 0.13, hrp: 0.20 });   // theme bells only
  rush(29, 2, 'A6', 8, 0.40, { lift: 2 });
  timpani(pc.buf, 29 * BAR + B(2), st(n('E2'), 2), 0.36, rng, { roll: B(2) * 0.95 });

  // ── 30 · the hit ──────────────────────────────────────────────────────────
  // A hard stop on the downbeat: F#m sforzando, strings bite one chord and
  // quit, one glock crest and a four-note harp fall inside the ring-out — the
  // cascade's signature, one last time, inside the final chord. No fade: what
  // follows the hit is the hall, not the fader.
  const last = 30 * BAR;
  timpani(pc.buf, last, n('F#2'), 0.95, rng, { decay: 2.8 });
  taiko(pc.buf, last + 0.004, 0.90, rng, { decay: 4.0 });
  cymbal(gk.buf, last, 0.32, rng, { decay: 4.5, f: 440, crash: true });
  brassSection(hn.buf, last, 2.3, n('F#4'), 0.44, rng, { kind: 'horn', players: 4, bite: 1.25, atk: 0.03 });
  brassSection(hn.buf, last + 0.012, 2.3, n('C#5'), 0.26, rng, { kind: 'horn', players: 2, bite: 1.2, atk: 0.03 });
  brassSection(tp.buf, last + 0.016, 2.2, n('A5'), 0.17, rng, { kind: 'trumpet', players: 2, bite: 1.15, atk: 0.03 });
  brassSection(lb.buf, last, 2.45, n('F#3'), 0.34, rng, { kind: 'trombone', players: 3, bite: 1.1, atk: 0.04, swellTo: 0.85 });
  brassSection(lb.buf, last + 0.02, 2.45, n('F#2'), 0.25, rng, { kind: 'tuba', players: 2, bite: 1.0, atk: 0.05, swellTo: 0.85 });
  bass(db.buf, last, n('F#1'), 0.70, rng, { decay: 4.0 });
  stringHit(v1.buf, last + J(), B(1.1), n('F#5'), 0.40, rng, { voices: 6, bite: 0.7, bright: 0.7 });
  stringHit(va.buf, last + J(), B(1.1), n('A4'), 0.32, rng, { voices: 5, bite: 0.65, bright: 0.6 });
  stringHit(vc.buf, last + J(), B(1.1), n('F#3'), 0.36, rng, { voices: 5, bite: 0.65, bright: 0.55 });
  glock(gk.buf, last + 0.01, n('F#6'), 0.14, rng, { decay: 2.6 });
  gliss(hr.buf, last + 0.03, ['F#6', 'C#6', 'A5', 'F#5'].map(n), 0.20, rng, { step: 0.032, accel: 1.0, voice: harp });
}
