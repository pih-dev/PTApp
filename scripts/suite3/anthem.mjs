// ─── anthem — the heroic one ─────────────────────────────────────────────────
//
// Pierre, 2026-08-24: "The only difference from the original ones should be
// real instruments instead of synthetic."
//
// So this is the v2.31 `anthem` re-scored for an orchestra. Same job — punchy,
// cinematic, catchy, a showcase — played by horns, trumpets, low brass, three
// string sections, timpani, taiko, choir and glockenspiel instead of sine and
// saw oscillators.
//
// D minor, 88 bpm. Progression Dm – B♭ – F – C (i – VI – III – VII), which is
// the heroic minor loop; the theme arches up to F5 in its third bar and walks
// home in its fourth.
//
// FORM (bars of 4/4 at 88 bpm = 2.727 s each)
//   0–1   the opening   timpani roll, two hits, the chord blooms open
//   2–5   A             the theme on a SOLO horn, strings underneath
//   6–9   A′            horn section and trumpets, the ostinato starts
//   10–13 B             new harmony, choir, the brass drops away and rebuilds
//   14–17 A″            everything: full brass, choir, timpani, taiko
//   18–19 the descent   the theme once more, thinning
//   20    the last hit and the hall
//
// LAYOUT is a real orchestra seen from the audience, not a spread of azimuths
// chosen to fill speakers: first violins left, violas centre, cellos right,
// brass behind the middle, percussion behind them, choir in the hall. That is
// why nothing here is `pair: true` except the choir and the room — an orchestra
// is a picture in front of you, not a ring around you.

export const meta = {
  name: 'anthem',
  title: 'Anthem',
  dur: 58,
  tempo: 88,
  seed: 0xA17E1,
  blurb: 'The heroic one — a horn theme over strings, timpani and choir.',
  lead: 'Horns',
  key: 'D minor',
  why: 'A horn only sounds like a horn when its brightness moves with how hard it is blown, so the theme is played at bite 0.8 alone, 1.0 by the section and 1.25 at the climax — the same notes, opened further each time. Changing only the volume would give you one patch turned up.',
  form: 'Timpani roll and two hits · the theme on a solo horn · the section takes it and the cellos start driving · the brass steps out and the choir carries a bridge · everything, full brass and choir · the theme thinning · one last hit into the hall.',
  reverb: { rt60: 2.9, damp: 0.30, preDelay: 0.030, width: 1.25 },
  master: { drive: 1.20, lfeGain: 0.52 },
};

export function compose(S, O) {
  const {
    n, brass, brassSection, strings, stringHit, timpani, taiko, choir,
    glock, harp, gliss, cymbal, riser, bass, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the orchestra, seated ─────────────────────────────────────────────────
  const hn = S.track('horns', { az: -10, centre: 0.34, spread: 9, send: 0.42, gain: 1.0 });
  const tp = S.track('trumpets', { az: 14, centre: 0.26, spread: 7, send: 0.44, gain: 0.86 });
  const lb = S.track('low-brass', { az: 0, centre: 0.34, spread: 11, send: 0.36, gain: 0.92, lp: 3200 });
  const v1 = S.track('violins', { az: -22, spread: 7, send: 0.52, gain: 0.90, hp: 180 });
  const va = S.track('violas', { az: 6, spread: 10, send: 0.50, gain: 0.72, hp: 130 });
  const vc = S.track('cellos', { az: 23, spread: 6, send: 0.44, gain: 0.95 });
  const db = S.track('basses', { az: -4, centre: 0.16, send: 0.26, gain: 0.90, body: BODY.upright, lp: 1500 });
  const pc = S.track('percussion', { az: -6, centre: 0.30, spread: 12, send: 0.38, gain: 1.0 });
  const ch = S.track('choir', { az: 116, pair: true, spread: 28, send: 0.78, gain: 0.60, hp: 150 });
  const bl = S.track('bells', { az: 30, spread: 8, send: 0.62, gain: 0.60 });

  // ── harmony ───────────────────────────────────────────────────────────────
  const Dm = { root: 'D1', tri: ['D3', 'F3', 'A3'], hi: ['D4', 'F4', 'A4', 'D5'], ost: ['D2', 'D2', 'A2', 'D2', 'F2', 'D2', 'A2', 'C3'] };
  const Bb = { root: 'Bb0', tri: ['Bb2', 'D3', 'F3'], hi: ['D4', 'F4', 'Bb4', 'D5'], ost: ['Bb1', 'Bb1', 'F2', 'Bb1', 'D2', 'Bb1', 'F2', 'A2'] };
  const F = { root: 'F1', tri: ['F2', 'A2', 'C3'], hi: ['C4', 'F4', 'A4', 'C5'], ost: ['F1', 'F1', 'C2', 'F1', 'A1', 'F1', 'C2', 'E2'] };
  const C = { root: 'C1', tri: ['C3', 'E3', 'G3'], hi: ['C4', 'E4', 'G4', 'C5'], ost: ['C2', 'C2', 'G2', 'C2', 'E2', 'C2', 'G2', 'Bb2'] };
  const Gm = { root: 'G1', tri: ['G2', 'Bb2', 'D3'], hi: ['D4', 'G4', 'Bb4', 'D5'], ost: ['G1', 'G1', 'D2', 'G1', 'Bb1', 'G1', 'D2', 'F2'] };
  const A = { root: 'A0', tri: ['A2', 'C#3', 'E3'], hi: ['C#4', 'E4', 'A4', 'C#5'], ost: ['A1', 'A1', 'E2', 'A1', 'C#2', 'A1', 'E2', 'G2'] };

  const A_PROG = [Dm, Bb, F, C];
  const B_PROG = [Gm, Dm, Bb, A];

  // ── THE THEME ─────────────────────────────────────────────────────────────
  // An arch: A→D is the lift, bar 3 tops out on F5, bar 4 walks home to C5.
  // Four bars, nine notes, all but two of them steps — it has to be hummable
  // after one hearing or the piece has no reason to exist.
  const THEME = [
    [[0, 'A4', 1.5], [1.5, 'D5', 2.5, 1.1]],
    [[0, 'F5', 1.5, 1.12], [1.5, 'D5', 0.5, 0.85], [2, 'Bb4', 2]],
    [[0, 'C5', 1], [1, 'F5', 2, 1.15], [3, 'E5', 1, 0.9]],
    [[0, 'E5', 1], [1, 'D5', 1, 0.95], [2, 'C5', 2, 0.9]],
  ];
  // The bridge does the opposite: it starts high and falls, so the theme's
  // return sounds like a climb again.
  const BRIDGE = [
    [[0, 'G5', 2, 1.1], [2, 'F5', 2, 0.9]],
    [[0, 'D5', 1.5], [1.5, 'F5', 0.5, 0.9], [2, 'A4', 2]],
    [[0, 'Bb4', 1], [1, 'D5', 1], [2, 'F5', 2, 1.05]],
    [[0, 'E5', 1.5, 1.1], [1.5, 'C#5', 0.5, 0.85], [2, 'A4', 2]],
  ];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** The theme, on whatever brass is carrying it. */
  function theme(barIdx, rows, amp, opts = {}) {
    const { track = hn, kind = 'horn', section = 0, bite = 1, oct = 0 } = opts;
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w = 1] of rows) {
      const f = n(name) * (oct ? Math.pow(2, oct) : 1);
      const args = [track.buf, t0 + B(beat) + J(), B(len) * 0.95, f, amp * w, rng];
      const o = { kind, bite, vibDelay: len >= 2 ? 0.45 : 0.9, vib: len >= 2 ? 0.005 : 0.002, atk: 0.05 };
      if (section) brassSection(...args, { ...o, players: section });
      else brass(...args, o);
    }
  }

  /** The engine underneath: cellos and basses in a driving eighth-note figure.
   *  stringHit rather than a sustained pad, because an ostinato is BOWED
   *  strokes — the bite at the front of each note is the rhythm. */
  function ostinato(barIdx, chd, amp, { half = false } = {}) {
    const t0 = barIdx * BAR;
    chd.ost.forEach((name, k) => {
      if (half && k % 2) return;
      const lean = k === 0 ? 1.25 : k === 4 ? 1.05 : 0.80;
      stringHit(vc.buf, t0 + B(k * 0.5) + J(), B(0.42), n(name), amp * lean, rng,
        { voices: 5, bite: 0.55, bright: 0.62 });
      if (k % 2 === 0) bass(db.buf, t0 + B(k * 0.5) + J(), n(name) / 2, amp * 0.9 * lean, rng,
        { decay: 1.6, damp: 0.72, dur: B(0.45) });
    });
  }

  /** Sustained high strings — the bed the theme sits on. */
  function pad(barIdx, bars, chd, amp, { hi = true, mid = true } = {}) {
    const t0 = barIdx * BAR, d = bars * BAR;
    if (hi) for (const name of chd.hi) {
      strings(v1.buf, t0 + Math.abs(rng()) * 0.03, d, n(name), amp, rng,
        { voices: 6, spread: 0.0055, atk: 0.9, rel: 1.5, bright: 0.42 });
    }
    if (mid) for (const name of chd.tri) {
      strings(va.buf, t0 + Math.abs(rng()) * 0.03, d, n(name), amp * 0.8, rng,
        { voices: 5, spread: 0.006, atk: 1.2, rel: 1.7, bright: 0.30 });
    }
  }

  /** Low brass holding the root — the acoustic answer to a synth braam. */
  function braam(barIdx, bars, chd, amp, opts = {}) {
    const t0 = barIdx * BAR, d = bars * BAR;
    brassSection(lb.buf, t0, d, n(chd.root) * 4, amp, rng,
      { kind: 'trombone', players: 3, bite: 1.1, swellTo: 1.25, atk: 0.10, ...opts });
    brassSection(lb.buf, t0 + 0.02, d, n(chd.root) * 2, amp * 0.75, rng,
      { kind: 'tuba', players: 2, bite: 1.0, atk: 0.14, ...opts });
  }

  function hits(barIdx, chd, amp, beats = [0]) {
    for (const beat of beats) {
      timpani(pc.buf, barIdx * BAR + B(beat) + J(), n(chd.root) * 2, amp, rng, { decay: 2.2 });
      taiko(pc.buf, barIdx * BAR + B(beat) + J(), amp * 0.85, rng, { decay: 3.4 });
    }
  }

  // ── 0–1 · the opening ─────────────────────────────────────────────────────
  // The v2.31 suite opened on a noise swell and two synth kicks. Same gesture,
  // real players: a timpani roll that speeds up, then two hits, then the chord
  // opening out from the bottom.
  timpani(pc.buf, 0.05, n('D2'), 0.30, rng, { roll: 1.55 });
  cymbal(bl.buf, 0.9, 0.16, rng, { decay: 3.0, f: 480, crash: true });
  hits(0, Dm, 0.72, [3]);
  hits(1, Dm, 0.88, [0]);
  braam(1, 2, Dm, 0.34, { swellTo: 1.15 });
  pad(1, 2, Dm, 0.20);
  gliss(bl.buf, B(0.3), ['D4', 'F4', 'A4', 'D5', 'F5', 'A5', 'D6'].map(n), 0.16, rng, { step: 0.055, accel: 0.9, voice: harp });
  for (const name of Dm.hi) choir(ch.buf, B(1.2), BAR * 1.4, n(name), 0.16, rng, { vowel: 'oo', atk: 1.0 });

  // ── 2–5 · A — one horn, alone with the strings ────────────────────────────
  A_PROG.forEach((chd, i) => {
    theme(2 + i, THEME[i], 0.44, { bite: 0.8 });
    pad(2 + i, 1, chd, 0.17, { mid: i >= 1 });
    if (i >= 2) ostinato(2 + i, chd, 0.16, { half: true });
    if (i >= 1) bass(db.buf, (2 + i) * BAR, n(chd.root), 0.34, rng, { decay: 2.6 });
  });

  // ── 6–9 · A′ — the section takes it, and the engine starts ────────────────
  A_PROG.forEach((chd, i) => {
    theme(6 + i, THEME[i], 0.42, { section: 3, bite: 1.0 });
    theme(6 + i, THEME[i], 0.16, { track: tp, kind: 'trumpet', section: 2, oct: 0, bite: 0.9 });
    pad(6 + i, 1, chd, 0.22);
    ostinato(6 + i, chd, 0.26);
    braam(6 + i, 1, chd, 0.16);
    hits(6 + i, chd, 0.34, [0, 2]);
  });
  glock(bl.buf, 8 * BAR, n('D6'), 0.14, rng, {});

  // ── 10–13 · B — the brass steps out; choir and strings carry it ───────────
  B_PROG.forEach((chd, i) => {
    // The bridge is written for STRINGS and CHOIR so the brass has somewhere to
    // come back from. Everything loud all the way through has no climax.
    const rows = BRIDGE[i];
    const t0 = (10 + i) * BAR;
    for (const [beat, name, len, w = 1] of rows) {
      strings(v1.buf, t0 + B(beat) + J(), B(len) * 0.95, n(name), 0.30 * w, rng,
        { voices: 7, spread: 0.005, atk: 0.20, rel: 0.5, bright: 0.52 });
      glock(bl.buf, t0 + B(beat) + J(), n(name) * 2, 0.07 * w, rng, {});
    }
    for (const name of chd.hi) choir(ch.buf, t0, BAR * 1.05, n(name), 0.20 + i * 0.03, rng,
      { vowel: i >= 2 ? 'ah' : 'oo', atk: 0.7 });
    pad(10 + i, 1, chd, 0.14, { hi: false });
    ostinato(10 + i, chd, 0.20 + i * 0.03, { half: i < 2 });
    hits(10 + i, chd, 0.26 + i * 0.05, i < 2 ? [0] : [0, 2]);
    if (i === 3) braam(13, 1, chd, 0.22, { swellTo: 1.5 });
  });
  // the lift back into the theme
  riser(v1.buf, 12.6 * BAR, 14 * BAR, n('A3'), n('A5'), 0.16, rng, { voices: 6, trem: 1 });
  timpani(pc.buf, 13.2 * BAR, n('A1'), 0.34, rng, { roll: BAR * 0.75 });

  // ── 14–17 · A″ — everything ───────────────────────────────────────────────
  cymbal(bl.buf, 14 * BAR - 0.02, 0.30, rng, { decay: 3.6, f: 460, crash: true });
  A_PROG.forEach((chd, i) => {
    theme(14 + i, THEME[i], 0.46, { section: 4, bite: 1.25 });
    theme(14 + i, THEME[i], 0.26, { track: tp, kind: 'trumpet', section: 3, bite: 1.2 });
    pad(14 + i, 1, chd, 0.26);
    ostinato(14 + i, chd, 0.34);
    braam(14 + i, 1, chd, 0.24);
    hits(14 + i, chd, 0.50, [0, 1.5, 2.5, 3.5]);
    for (const name of chd.hi) choir(ch.buf, (14 + i) * BAR, BAR * 1.05, n(name), 0.24, rng,
      { vowel: 'ah', atk: 0.45 });
    glock(bl.buf, (14 + i) * BAR, n(chd.hi[3]) * 2, 0.10, rng, {});
  });

  // ── 18–19 · the descent ───────────────────────────────────────────────────
  // The theme once more, thinning as it goes — the piece has said everything
  // it has to say and is now getting out of the way.
  theme(18, THEME[0], 0.42, { section: 3, bite: 1.0 });
  theme(19, THEME[3], 0.38, { section: 2, bite: 0.85 });
  pad(18, 2, Dm, 0.22);
  ostinato(18, Dm, 0.26, { half: true });
  hits(18, Dm, 0.42, [0, 2]);
  hits(19, C, 0.36, [0]);
  braam(18, 2, Dm, 0.18);
  for (const name of Dm.hi) choir(ch.buf, 18 * BAR, BAR * 2, n(name), 0.20, rng, { vowel: 'ah', atk: 0.6 });

  // ── 20 · the last hit, and the hall ───────────────────────────────────────
  const last = 20 * BAR;
  hits(20, Dm, 0.95, [0]);
  braam(20, 2, Dm, 0.34, { swellTo: 0.8, atk: 0.06 });
  brassSection(hn.buf, last, 4.2, n('D5'), 0.34, rng, { kind: 'horn', players: 4, bite: 1.15, atk: 0.05 });
  brassSection(tp.buf, last + 0.01, 4.2, n('A5'), 0.16, rng, { kind: 'trumpet', players: 2, bite: 1.1, atk: 0.04 });
  pad(20, 2, Dm, 0.30);
  for (const name of Dm.hi) choir(ch.buf, last, 4.0, n(name), 0.26, rng, { vowel: 'ah', atk: 0.25, rel: 1.8 });
  cymbal(bl.buf, last, 0.26, rng, { decay: 4.5, f: 440, crash: true });
  glock(bl.buf, last, n('D6'), 0.13, rng, { decay: 2.4 });
  bass(db.buf, last, n('D1'), 0.70, rng, { decay: 4.0 });
}
