// ─── forge — the hybrid ──────────────────────────────────────────────────────
//
// Pierre, 2026-08-24: "The only difference from the original ones should be
// real instruments instead of synthetic." And, on the rejected chamber set:
// "when I told you I like guitars and flute, you just did everything with
// those." So this is the ONE piece where the guitar he asked for appears — and
// it earns its seat by fronting an orchestra, not a campfire: a steel-string
// RIFF with a rock kit, low strings and brass stabs behind it, until the
// horns and trombones take the riff away from the guitar entirely.
//
// A minor (pentatonic riff) over an A-mixolydian chord loop, 126 bpm.
// Loop: Am – C – G – D (i – bIII – bVII – IV). The riff is pure A minor
// pentatonic — the D chord's F# is the one mixolydian glint, which is exactly
// the blues-mixture that makes rock in A sound like rock in A.
//
// THE RIFF IS THE THEME. Accents with palm-muted chugs in the gaps ("DAA…
// da-DAA chug-chug dum"), topping out on G3 on the DOWNBEAT of its third bar
// and walking home through the A–C–D turnaround that every guitarist in the
// world plays to say "one more time".
//
// FORM (bars of 4/4 at 126 bpm = 1.905 s each; dur 54 s = 28 bars + tail)
//   0     the strike    two anvil hits (taiko+timpani+crash) over a low braam
//   1     the tease     the guitar alone states bar 1 of the riff, then revs
//   2–5   A1            the riff, nearly alone — kick pulse, ticking hat, bass
//   6–9   A2            the kit slams in; cellos double the riff; timpani
//   10–13 A3            brass stabs on the accents; taiko; open hats
//   14–17 B             breakdown — brass OUT, violins sing a counter-line
//   18–21 HANDOVER      horns + trombones TAKE the riff; guitar drops to chords
//   22–25 CLIMAX        trumpets an octave up, sawing violins, double kick
//   26    the stop      one hit, silence, then the A–C–D run in full unison
//   27    the last hit  everything at once on the downbeat, ringing out
//
// The handover at bar 18 lands at 34.3 s of 54 — the two-thirds point the
// brief asks for, and the whole idea of the piece: the machine the guitar
// built keeps running when the orchestra picks it up.
//
// Kept DRY on purpose (rt60 1.6, low sends): reverb is the enemy of chug. The
// surrounds are fed by a "room mic" track instead — quiet copies of the hits,
// crashes and guitar accents seated behind the listener — so the room feels
// real without washing out the punch.
//
// Seed note: the assigned seed 0xF07GE is not a valid hex literal ('G'), so
// this uses 0xF079E — any 32-bit int works, renders stay deterministic.

export const meta = {
  name: 'forge',
  title: 'Forge',
  dur: 54,
  tempo: 126,
  seed: 0xF079E,
  blurb: 'The hybrid — a steel-string riff with a rock kit and brass stabs, until the horns take the riff for themselves.',
  reverb: { rt60: 1.6, damp: 0.35, preDelay: 0.016, width: 1.35 },
  master: { drive: 1.22, lfeGain: 0.55 },
};

export function compose(S, O) {
  const {
    n, st, steel, strum, brass, brassSection, strings, stringHit,
    timpani, taiko, kick, snare, hat, cymbal, riser, bass, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the band, seated ──────────────────────────────────────────────────────
  // Doubled guitars hard-ish left and right is THE rock-record layout — two
  // performances of the same riff, a few cents apart, is where the width comes
  // from, not from panning one take wide. The orchestra sits where anthem
  // seats it: horns left of centre, trombones centre, trumpets right, violins
  // far left, cellos right, percussion behind. Nothing is pair:true except the
  // room track, because a band is a picture in front of you.
  const gL = S.track('guitar-L', { az: -16, spread: 6, send: 0.16, gain: 1.05, body: BODY.steel });
  const gR = S.track('guitar-R', { az: 16, spread: 6, send: 0.16, gain: 1.05, body: BODY.steel });
  const kk = S.track('kick', { az: 0, centre: 0.50, send: 0.05, gain: 1.0, lp: 5200 });
  const sn = S.track('snare', { az: -3, centre: 0.35, spread: 5, send: 0.22, gain: 1.0 });
  const hh = S.track('hats', { az: 16, spread: 4, send: 0.10, gain: 0.9, hp: 500 });
  const cr = S.track('crash', { az: -24, spread: 5, send: 0.30, gain: 0.9 });
  const vc = S.track('cellos', { az: 23, spread: 6, send: 0.30, gain: 0.95 });
  const v1 = S.track('violins', { az: -22, spread: 7, send: 0.35, gain: 0.9, hp: 200 });
  const db = S.track('bass', { az: -4, centre: 0.16, send: 0.10, gain: 1.0, body: BODY.upright, lp: 1400 });
  const hn = S.track('horns', { az: -10, centre: 0.34, spread: 9, send: 0.30, gain: 1.0 });
  const tb = S.track('trombones', { az: 0, centre: 0.34, spread: 11, send: 0.26, gain: 0.95, lp: 3400 });
  const tp = S.track('trumpets', { az: 14, centre: 0.26, spread: 7, send: 0.30, gain: 0.85 });
  const pc = S.track('perc', { az: -6, centre: 0.30, spread: 12, send: 0.26, gain: 1.0 });
  // The room mics: behind the listener, mirrored, high send. They carry quiet
  // copies of whatever a real room would echo — hits, crashes, the ringing
  // guitar accents — so the surrounds live even though the mix stays dry.
  const amb = S.track('room', { az: 114, pair: true, spread: 20, send: 0.85, gain: 0.5, hp: 280 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // chug  = the guitar's palm-mute pitch (its lowest playable chord root).
  // gtr   = the open-chord voicing for the strummed sections.
  // timp  = where the timpani sits for that chord (D drops an octave — a high
  //         D3 drum sounds like a tom, a low D2 sounds like a threat).
  const Am = { root: 'A1', timp: 'A2', chug: 'A2', gtr: ['A2', 'E3', 'A3', 'C4', 'E4'], tri: ['A3', 'C4', 'E4'], hi: ['A4', 'C5', 'E5'] };
  const Cx = { root: 'C2', timp: 'C3', chug: 'C3', gtr: ['C3', 'G3', 'C4', 'E4', 'G4'], tri: ['G3', 'C4', 'E4'], hi: ['G4', 'C5', 'E5'] };
  const Gx = { root: 'G1', timp: 'G2', chug: 'G2', gtr: ['G2', 'D3', 'G3', 'B3', 'D4'], tri: ['G3', 'B3', 'D4'], hi: ['G4', 'B4', 'D5'] };
  const Dx = { root: 'D2', timp: 'D2', chug: 'D3', gtr: ['D3', 'A3', 'D4', 'F#4'], tri: ['A3', 'D4', 'F#4'], hi: ['A4', 'D5', 'F#5'] };
  const LOOP = [Am, Cx, Gx, Dx];

  // ── THE RIFF ──────────────────────────────────────────────────────────────
  // rows: [beat, note, lengthInBeats, weight, kind]
  //   'A' = big accent — full power chord (root+5th+octave), rings
  //   'a' = pickup accent — dyad (root+5th), short ring
  //   'M' = palm-muted chug on the chord's low root — the engine
  // Every strong-beat accent is a chord tone of the bar it lives in. The push
  // onto the and-of-two (beat 1.5) is the hook's syncopation; the two chugs
  // after it are what make the next downbeat land like a hammer.
  const RIFF = [
    // bar 1 · Am — the call, low and square
    [[0.0, 'A2', 1.4, 1.25, 'A'], [1.5, 'C3', 0.9, 1.05, 'A'],
     [2.5, null, 0, 0.70, 'M'], [3.0, null, 0, 0.80, 'M'], [3.5, 'D3', 0.45, 0.95, 'a']],
    // bar 2 · C — the same shape a third up: the lift
    [[0.0, 'E3', 1.4, 1.20, 'A'], [1.5, 'G3', 0.9, 1.10, 'A'],
     [2.5, null, 0, 0.70, 'M'], [3.0, null, 0, 0.80, 'M'], [3.5, 'E3', 0.45, 0.95, 'a']],
    // bar 3 · G — G3 on the DOWNBEAT is the top of the theme
    [[0.0, 'G3', 1.4, 1.30, 'A'], [1.5, 'D3', 0.9, 1.00, 'A'],
     [2.5, null, 0, 0.70, 'M'], [3.0, null, 0, 0.80, 'M'], [3.5, 'B2', 0.45, 0.90, 'a']],
    // bar 4 · D — the walk home: the A–C–D turnaround run
    [[0.0, 'D3', 0.9, 1.15, 'A'], [1.0, null, 0, 0.70, 'M'], [1.5, null, 0, 0.75, 'M'],
     [2.0, 'A2', 0.45, 0.90, 'a'], [2.5, 'C3', 0.45, 1.00, 'a'], [3.0, 'D3', 0.9, 1.10, 'A']],
  ];

  // The breakdown counter-line — long singing notes against the riff's
  // punches, so the riff's return reads as an attack again. Peaks on B4→D5
  // over the G bar; the F#4 over D is the mixolydian moment sung out loud.
  const BLINE = [
    [[0, 'E4', 2.0, 1.0], [2, 'A4', 1.5, 1.1], [3.5, 'G4', 0.5, 0.9]],
    [[0, 'G4', 3.0, 1.05], [3, 'E4', 1.0, 0.9]],
    [[0, 'B4', 2.0, 1.15], [2, 'D5', 2.0, 1.2]],
    [[0, 'A4', 1.5, 1.05], [1.5, 'F#4', 1.0, 0.95], [2.5, 'E4', 1.5, 0.9]],
  ];

  const GTRS = [[gL, -0.0012], [gR, 0.0012]];   // two takes, ~4 cents apart

  // ── parts ─────────────────────────────────────────────────────────────────
  /** The riff on both guitars. Accents ring as power chords; mutes are dead
   *  root+5th chunks (mute≈0.6 + a hard dur is the palm). */
  function riffGtr(barIdx, chd, rows, amp) {
    const t0 = barIdx * BAR;
    for (const [track, det] of GTRS) {
      for (const [beat, name, len, w, kind] of rows) {
        const t = t0 + B(beat) + J();
        if (kind === 'M') {
          steel(track.buf, t, n(chd.chug), amp * 0.62 * w, rng,
            { mute: 0.62, dur: 0.11, bright: 0.5, pick: 0.11, detune: det });
          steel(track.buf, t + 0.004, st(n(chd.chug), 7), amp * 0.40 * w, rng,
            { mute: 0.68, dur: 0.10, bright: 0.45, pick: 0.11, detune: det });
        } else {
          const ivs = kind === 'A' ? [0, 7, 12] : [0, 7];
          ivs.forEach((iv, i) => steel(track.buf, t + i * 0.006 + Math.abs(rng()) * 0.003,
            st(n(name), iv), amp * w * (1 - 0.14 * i), rng,
            { dur: B(len), pick: 0.14, bright: 0.74, detune: det }));
        }
      }
    }
    // what the room hears of it: only the ringing accents, late and soft
    for (const [beat, name, len, w, kind] of rows) if (kind === 'A') {
      steel(amb.buf, t0 + B(beat) + 0.016, n(name), amp * 0.28 * w, rng, { dur: B(len), bright: 0.6 });
    }
  }

  /** Straight-eighth palm mutes — the breakdown's idle engine. */
  function chugs(barIdx, chd, amp) {
    const t0 = barIdx * BAR;
    for (const [track, det] of GTRS) {
      for (let e = 0; e < 8; e++) {
        const lean = e === 0 ? 1.2 : e === 4 ? 1.05 : 0.85;
        steel(track.buf, t0 + B(e * 0.5) + J(), n(chd.chug), amp * lean, rng,
          { mute: 0.6, dur: 0.12, bright: 0.5, pick: 0.11, detune: det });
      }
    }
  }

  /** Big open-chord strums — what the guitar does once the brass has the riff.
   *  Same rhythm as the riff's accents, so the handover keeps the groove. */
  function chordsGtr(barIdx, chd, amp, { dense = false } = {}) {
    const t0 = barIdx * BAR;
    const pat = [[0, 1.4, 1.15, false], [1.5, 0.9, 0.95, false], [2.5, 0.45, 0.8, true], [3.0, 0.9, 0.95, false]];
    if (dense) pat.push([3.5, 0.45, 0.8, true]);
    for (const [track, det] of GTRS) {
      for (const [bt, len, w, up] of pat) {
        strum(track.buf, t0 + B(bt) + J(), chd.gtr.map(n), amp * w, rng,
          { spread: 0.013, up, voice: steel, dur: B(len), bright: 0.68, detune: det });
      }
    }
  }

  /** Cellos double the riff note for note — guitar and low strings in unison
   *  is the hybrid's thesis stated as orchestration. */
  function riffCellos(barIdx, chd, rows, amp) {
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w, kind] of rows) {
      const t = t0 + B(beat) + J();
      if (kind === 'M') stringHit(vc.buf, t, B(0.4), n(chd.chug), amp * 0.75 * w, rng,
        { voices: 4, bite: 0.6, bright: 0.5 });
      else stringHit(vc.buf, t, B(Math.max(0.45, len * 0.9)), n(name), amp * w, rng,
        { voices: 5, bite: 0.62, bright: 0.6 });
    }
  }

  /** Bass locks to the riff's rhythm. Roots under the chords; under the
   *  pickup notes it follows the line an octave down, like a player would. */
  function riffBass(barIdx, chd, rows, amp) {
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w, kind] of rows) {
      const f = kind === 'a' ? n(name) / 2 : n(chd.root);
      const dur = kind === 'M' ? 0.16 : B(Math.max(0.4, len));
      bass(db.buf, t0 + B(beat) + J(), f, amp * (kind === 'M' ? 0.8 : 1) * w, rng,
        { decay: 1.8, damp: 0.7, dur });
    }
  }

  /** Brass stabs ON the accents — short, biting, gone. The dynamic (bite),
   *  not the volume, is what makes them punch. */
  function stabs(barIdx, chd, amp, { bite = 1.0, beats = [0, 1.5] } = {}) {
    const t0 = barIdx * BAR;
    const r2 = n(chd.root) * 2;
    for (const bt of beats) {
      const t = t0 + B(bt) + J();
      brassSection(tb.buf, t, B(0.42), r2, amp, rng,
        { kind: 'trombone', players: 3, bite, atk: 0.018, rel: 0.10 });
      brassSection(tb.buf, t + 0.004, B(0.42), st(r2, 7), amp * 0.7, rng,
        { kind: 'trombone', players: 2, bite: bite * 0.95, atk: 0.02, rel: 0.10 });
      brassSection(hn.buf, t + 0.006, B(0.45), n(chd.tri[1]), amp * 0.8, rng,
        { kind: 'horn', players: 2, bite: bite * 0.9, atk: 0.02, rel: 0.12 });
      brassSection(hn.buf, t + 0.008, B(0.45), n(chd.tri[2]), amp * 0.7, rng,
        { kind: 'horn', players: 2, bite: bite * 0.9, atk: 0.02, rel: 0.12 });
    }
  }

  /** THE HANDOVER: horns an octave above the guitar's line, trombones at the
   *  guitar's own pitch, and the palm-mute chugs become trombone staccati —
   *  the orchestra playing the guitar part, not accompanying it. */
  function riffBrass(barIdx, chd, rows, amp, { trumpets = 0, bite = 1.1 } = {}) {
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w, kind] of rows) {
      const t = t0 + B(beat) + J();
      if (kind === 'M') {
        brassSection(tb.buf, t, B(0.24), n(chd.chug), amp * 0.55 * w, rng,
          { kind: 'trombone', players: 3, bite: bite * 0.85, atk: 0.015, rel: 0.08 });
      } else {
        const f0 = n(name);
        const d = B(Math.max(0.4, len)) * 0.94;
        brassSection(hn.buf, t, d, f0 * 2, amp * w, rng,
          { kind: 'horn', players: 4, bite, atk: 0.03, rel: 0.14, vib: len >= 1 ? 0.004 : 0.002, vibDelay: 0.4 });
        brassSection(tb.buf, t + 0.005, d, f0, amp * 0.8 * w, rng,
          { kind: 'trombone', players: 3, bite: bite * 0.95, atk: 0.03, rel: 0.14 });
        if (trumpets) brassSection(tp.buf, t + 0.008, d, f0 * 4, trumpets * w, rng,
          { kind: 'trumpet', players: 3, bite: bite * 1.1, atk: 0.025, rel: 0.12 });
      }
    }
  }

  /** The kit. Kick on 1 and the and-of-3 push, snare backbeat, eighth hats;
   *  `dbl` doubles the kick for the heavy sections. */
  function kitBar(barIdx, { level = 1, snares = true, openHats = false, dbl = false, hatLevel = 1 } = {}) {
    const t0 = barIdx * BAR;
    const kicks = dbl ? [[0, 1], [0.5, 0.8], [2.5, 0.95], [3.5, 0.75]] : [[0, 1], [2.5, 0.9]];
    for (const [bt, w] of kicks) kick(kk.buf, t0 + B(bt) + J(), 0.55 * level * w, rng,
      { f0: 145, f1: 47, decay: 8.5, click: 0.35 });
    if (snares) for (const bt of [1, 3]) {
      const t = t0 + B(bt) + J();
      snare(sn.buf, t, 0.44 * level * (bt === 3 ? 1.04 : 1), rng, { bright: 3500 });
      snare(amb.buf, t + 0.018, 0.10 * level, rng, { bright: 2800 });   // room slap
    }
    for (let e = 0; e < 8; e++) {
      const off = e % 2 === 1;
      // open ONLY the pushes (and-of-2, and-of-4) — opening every offbeat
      // washes the groove out.
      const open = openHats && (e === 3 || e === 7);
      hat(hh.buf, t0 + B(e * 0.5) + J(), (off ? 0.10 : 0.14) * level * hatLevel, rng, { open });
    }
  }

  /** Snare crescendo into a downbeat — the drummer announcing a section. */
  function drag(barIdx, fromBeat, peak) {
    const t0 = barIdx * BAR;
    const steps = [];
    for (let bt = fromBeat; bt < 3.9; bt += 0.25) steps.push(bt);
    steps.forEach((bt, i) => snare(sn.buf, t0 + B(bt) + J(),
      0.12 + (peak - 0.12) * (i / Math.max(1, steps.length - 1)), rng, { noiseDecay: 18 }));
  }

  /** Timpani + taiko on a downbeat — the orchestral weight under the kick. */
  function boom(barIdx, chd, amp, beats = [0], { deep = true } = {}) {
    for (const bt of beats) {
      const t = barIdx * BAR + B(bt) + J();
      timpani(pc.buf, t, n(chd.timp), amp, rng, { decay: 2.0 });
      if (deep) taiko(pc.buf, t + 0.004, amp * 0.8, rng, { decay: 3.2 });
      timpani(amb.buf, t + 0.02, n(chd.timp), amp * 0.22, rng, { decay: 1.4 });
    }
  }

  /** Crash at a section change, echoed into the room mics. */
  function crash(t, amp, { f = 470, decay = 3.2 } = {}) {
    cymbal(cr.buf, t + Math.abs(J()), amp, rng, { decay, f, crash: true });
    cymbal(amb.buf, t + 0.012 + Math.abs(rng()) * 0.01, amp * 0.5, rng, { decay: decay * 0.8, f, crash: true });
  }

  // ── bar 0 · the strike ────────────────────────────────────────────────────
  // The v2.31 pieces opened on two hits. Here the two hits are the forge
  // itself: taiko + timpani + crash, twice, over a dark trombone-and-tuba
  // swell on the low A — a braam with players in it.
  for (const [bt, w] of [[0, 0.85], [2, 1.0]]) {
    const t = B(bt) + 0.02;
    crash(t, 0.26 * w, { decay: 3.4, f: 450 });
    kick(kk.buf, t, 0.62 * w, rng, { f0: 150, f1: 44, decay: 6 });
    taiko(pc.buf, t + 0.004, 0.85 * w, rng, { decay: 3.6 });
    timpani(pc.buf, t + J(), n('A2'), 0.62 * w, rng, { decay: 2.4 });
    timpani(amb.buf, t + 0.02, n('A2'), 0.16 * w, rng, { decay: 1.4 });
  }
  brassSection(tb.buf, 0.05, B(3.8), n('A2'), 0.26, rng,
    { kind: 'trombone', players: 3, bite: 0.75, swellTo: 1.35, atk: 0.12 });
  brassSection(tb.buf, 0.07, B(3.8), n('A1'), 0.20, rng,
    { kind: 'tuba', players: 2, bite: 0.7, swellTo: 1.3, atk: 0.16 });

  // ── bar 1 · the tease ─────────────────────────────────────────────────────
  // The guitar alone, in your face: bar 1 of the riff, then a rev of muted
  // sixteenths that climbs straight into the band. Starting the star solo is
  // what makes everything that piles on afterwards feel earned.
  const TEASE = [
    [0.0, 'A2', 1.4, 1.2, 'A'], [1.5, 'C3', 0.9, 1.0, 'A'],
    [2.5, null, 0, 0.55, 'M'], [2.75, null, 0, 0.60, 'M'], [3.0, null, 0, 0.70, 'M'],
    [3.25, null, 0, 0.80, 'M'], [3.5, null, 0, 0.90, 'M'], [3.75, null, 0, 1.00, 'M'],
  ];
  riffGtr(1, Am, TEASE, 0.50);

  // ── bars 2–5 · A1 — the riff, nearly alone ───────────────────────────────
  crash(2 * BAR, 0.14, { decay: 2.2, f: 520 });
  LOOP.forEach((chd, i) => {
    riffGtr(2 + i, chd, RIFF[i], 0.50);
    riffBass(2 + i, chd, RIFF[i], 0.30);
    kitBar(2 + i, { level: 0.65, snares: false, hatLevel: 0.7 });
  });

  // ── bars 6–9 · A2 — the band slams in ────────────────────────────────────
  crash(6 * BAR, 0.24);
  LOOP.forEach((chd, i) => {
    riffGtr(6 + i, chd, RIFF[i], 0.55);
    riffCellos(6 + i, chd, RIFF[i], 0.26);
    riffBass(6 + i, chd, RIFF[i], 0.42);
    kitBar(6 + i, { level: 0.95 });
    boom(6 + i, chd, 0.28, [0], { deep: false });   // timpani first; taiko is saved
  });

  // ── bars 10–13 · A3 — brass joins the fight ──────────────────────────────
  crash(10 * BAR, 0.26);
  LOOP.forEach((chd, i) => {
    riffGtr(10 + i, chd, RIFF[i], 0.58);
    riffCellos(10 + i, chd, RIFF[i], 0.32);
    riffBass(10 + i, chd, RIFF[i], 0.46);
    kitBar(10 + i, { level: 1.0, openHats: true });
    stabs(10 + i, chd, 0.30, { bite: 1.0 });
    boom(10 + i, chd, 0.36);
  });

  // ── bars 14–17 · B — the breakdown ───────────────────────────────────────
  // Everything the piece has been shouting stops: brass out, kit to a
  // heartbeat, the guitar idling on muted eighths while the violins sing the
  // counter-line. This is the section the handover comes back FROM.
  crash(14 * BAR, 0.15, { decay: 2.0, f: 540 });
  LOOP.forEach((chd, i) => {
    const t0 = (14 + i) * BAR;
    chugs(14 + i, chd, 0.32);
    for (const [beat, name, len, w] of BLINE[i]) {
      strings(v1.buf, t0 + B(beat) + J(), B(len) * 0.96, n(name), 0.30 * w, rng,
        { voices: 7, spread: 0.0055, atk: 0.16, rel: 0.5, bright: 0.5 });
    }
    strings(vc.buf, t0 + Math.abs(rng()) * 0.02, BAR * 1.02, n(chd.root) * 2, 0.13, rng,
      { voices: 4, atk: 0.5, rel: 0.8, bright: 0.3 });
    for (const bt of [0, 2]) bass(db.buf, t0 + B(bt) + J(), n(chd.root), 0.30, rng,
      { decay: 2.4, damp: 0.72, dur: B(1.9) });
    kitBar(14 + i, { level: 0.5, snares: false, hatLevel: 0.55 });
  });
  // the rebuild: drummer's drag, timpani roll, strings climbing — all three
  // arrive at bar 18 together
  drag(17, 2, 0.52);
  timpani(pc.buf, 17.5 * BAR, n('A2'), 0.32, rng, { roll: BAR * 0.5 });
  riser(v1.buf, 17.0 * BAR, 18 * BAR, n('A3'), n('A5'), 0.13, rng, { voices: 5, trem: 1 });

  // ── bars 18–21 · THE HANDOVER ────────────────────────────────────────────
  // The whole point of the piece: horns and trombones play the guitar figure
  // — accents, pickups, even the chugs as staccati — while the guitar that
  // owned it for forty seconds falls back to big strummed chords.
  crash(18 * BAR, 0.28, { decay: 3.6 });
  LOOP.forEach((chd, i) => {
    riffBrass(18 + i, chd, RIFF[i], 0.50, { bite: 1.1 });
    chordsGtr(18 + i, chd, 0.42);
    riffCellos(18 + i, chd, RIFF[i], 0.30);
    riffBass(18 + i, chd, RIFF[i], 0.48);
    kitBar(18 + i, { level: 1.05, dbl: true });
    boom(18 + i, chd, 0.42, [0, 2]);
  });

  // ── bars 22–25 · the climax ──────────────────────────────────────────────
  // Same machine, everything opened up: trumpets scream the riff an octave
  // above the horns (bite 1.25 — brightness IS the fortissimo), violins saw
  // eighths, the tuba leans on the roots, taiko on 1 and 3.
  crash(22 * BAR, 0.30, { decay: 3.6 });
  LOOP.forEach((chd, i) => {
    const t0 = (22 + i) * BAR;
    riffBrass(22 + i, chd, RIFF[i], 0.55, { bite: 1.25, trumpets: 0.30 });
    chordsGtr(22 + i, chd, 0.48, { dense: true });
    riffCellos(22 + i, chd, RIFF[i], 0.34);
    riffBass(22 + i, chd, RIFF[i], 0.50);
    kitBar(22 + i, { level: 1.1, dbl: true, openHats: true });
    boom(22 + i, chd, 0.46, [0, 2]);
    brassSection(tb.buf, t0 + 0.01, BAR * 0.96, n(chd.root), 0.22, rng,
      { kind: 'tuba', players: 2, bite: 1.0, swellTo: 1.25, atk: 0.1 });
    for (let e = 0; e < 8; e++) {
      stringHit(v1.buf, t0 + B(e * 0.5) + J(), B(0.4), n(e % 2 ? chd.hi[2] : chd.hi[0]),
        0.20 * (e % 4 === 0 ? 1.15 : 0.85), rng, { voices: 5, bite: 0.6, bright: 0.7 });
    }
  });

  // ── bar 26 · the stop and the run ────────────────────────────────────────
  // One hit, then SILENCE — the oldest trick in rock and it never misses —
  // then the whole band, guitar and orchestra as one instrument, hammers the
  // A–C–D turnaround into the final downbeat.
  const T26 = (bt) => 26 * BAR + B(bt);
  crash(T26(0), 0.22, { decay: 1.6, f: 500 });
  kick(kk.buf, T26(0), 0.62, rng, {});
  timpani(pc.buf, T26(0) + J(), n('A2'), 0.5, rng, { decay: 1.1 });
  taiko(pc.buf, T26(0) + 0.004, 0.6, rng, { decay: 1.6 });
  for (const [track, det] of GTRS) strum(track.buf, T26(0) + J(), Am.gtr.map(n), 0.52, rng,
    { spread: 0.010, voice: steel, dur: 0.30, bright: 0.7, detune: det });
  brassSection(tb.buf, T26(0), B(0.5), n('A2'), 0.45, rng,
    { kind: 'trombone', players: 3, bite: 1.2, atk: 0.015, rel: 0.09 });
  brassSection(hn.buf, T26(0) + 0.005, B(0.5), n('A3'), 0.40, rng,
    { kind: 'horn', players: 3, bite: 1.2, atk: 0.02, rel: 0.09 });
  // …the silence is beats 0.5–2, written by writing nothing…
  const RUN = [[2.0, 'A2', 0.45, 0.95], [2.5, 'C3', 0.45, 1.05], [3.0, 'D3', 0.8, 1.15]];
  for (const [bt, name, len, w] of RUN) {
    const t = T26(bt) + J();
    const f0 = n(name);
    for (const [track, det] of GTRS) [0, 7, 12].forEach((iv, i) =>
      steel(track.buf, t + i * 0.005, st(f0, iv), 0.55 * w * (1 - 0.14 * i), rng,
        { dur: B(len), pick: 0.14, bright: 0.75, detune: det }));
    brassSection(hn.buf, t, B(len) * 0.95, f0 * 2, 0.50 * w, rng,
      { kind: 'horn', players: 4, bite: 1.25, atk: 0.02, rel: 0.10 });
    brassSection(tb.buf, t + 0.005, B(len) * 0.95, f0, 0.42 * w, rng,
      { kind: 'trombone', players: 3, bite: 1.2, atk: 0.02, rel: 0.10 });
    stringHit(vc.buf, t, B(0.4), f0, 0.36 * w, rng, { voices: 5, bite: 0.65, bright: 0.65 });
    bass(db.buf, t, f0 / 2, 0.5 * w, rng, { decay: 1.6, damp: 0.7, dur: B(len) });
    kick(kk.buf, t, 0.5 * w, rng, {});
    timpani(pc.buf, t, n('A2'), 0.34 * w, rng, { decay: 1.0 });
  }
  for (const [bt, a] of [[3.25, 0.2], [3.5, 0.3], [3.75, 0.44]])
    snare(sn.buf, T26(bt) + J(), a, rng, { noiseDecay: 18 });

  // ── bar 27 · the last hit ────────────────────────────────────────────────
  // Everything at once on the downbeat — full Am from both guitars ringing
  // open, the whole brass on the chord, strings, timpani, taiko, crash — and
  // then only the room. A hard stop earned, not a fade.
  const tF = 27 * BAR;
  crash(tF, 0.34, { decay: 4.5, f: 440 });
  kick(kk.buf, tF, 0.8, rng, { f0: 130, f1: 40, decay: 5 });
  taiko(pc.buf, tF + 0.004, 0.95, rng, { decay: 4.2 });
  timpani(pc.buf, tF + Math.abs(J()), n('A2'), 0.9, rng, { decay: 3.2 });
  timpani(amb.buf, tF + 0.02, n('A2'), 0.24, rng, { decay: 2.0 });
  for (const [track, det] of GTRS) strum(track.buf, tF + Math.abs(J()), Am.gtr.map(n), 0.58, rng,
    { spread: 0.016, voice: steel, bright: 0.72, detune: det });   // dur 0 → rings out
  steel(amb.buf, tF + 0.02, n('A2'), 0.20, rng, { bright: 0.6 });
  brassSection(hn.buf, tF, 2.2, n('A4'), 0.48, rng, { kind: 'horn', players: 4, bite: 1.2, atk: 0.04 });
  brassSection(hn.buf, tF + 0.01, 2.2, n('E4'), 0.34, rng, { kind: 'horn', players: 2, bite: 1.1, atk: 0.05 });
  brassSection(tb.buf, tF + 0.005, 2.2, n('A2'), 0.44, rng, { kind: 'trombone', players: 3, bite: 1.15, atk: 0.05 });
  brassSection(tb.buf, tF + 0.012, 2.2, n('A1'), 0.30, rng, { kind: 'tuba', players: 2, bite: 1.0, atk: 0.07 });
  brassSection(tp.buf, tF + 0.008, 2.1, n('E5'), 0.22, rng, { kind: 'trumpet', players: 2, bite: 1.15, atk: 0.04 });
  for (const [name, a] of [['A4', 0.20], ['C5', 0.18], ['E5', 0.18]])
    strings(v1.buf, tF + Math.abs(rng()) * 0.02, 2.1, n(name), a, rng,
      { voices: 6, atk: 0.10, rel: 0.5, bright: 0.5 });
  for (const [name, a] of [['A2', 0.20], ['E3', 0.16]])
    strings(vc.buf, tF + Math.abs(rng()) * 0.02, 2.1, n(name), a, rng,
      { voices: 4, atk: 0.12, rel: 0.5, bright: 0.35 });
  bass(db.buf, tF, n('A1'), 0.72, rng, { decay: 4.0 });
}
