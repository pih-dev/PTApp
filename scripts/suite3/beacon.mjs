// ─── beacon — the emotional one ──────────────────────────────────────────────
//
// The suite's slow burn: a SOLO TRUMPET over an orchestra that grows from
// almost nothing to everything. Warm, not blazing — but it is still showcase
// music, so it earns a real climax and a real ending, and the distance between
// its whisper and its full cry IS the piece (aim: 14+ dB, twice the gate).
//
// F major with the relative-minor turn. 80 bpm, the top of the brief's range,
// because at 72 the four-bar theme takes 13 s and only two full statements fit
// before the climax; at 80 a bar is exactly 3.0 s and the form lands whole.
//
// Progression F – C – Dm – Bb (I – V – vi – IV): the warmest loop in the key,
// and its vi bar is where the theme's one big leap lands — the emotional
// centre of the tune sits on the emotional centre of the harmony.
//
// FORM (bars of 4/4 at 80 bpm = 3.000 s each; 19 bars in 58 s)
//   0–1   dawn        strings bloom from silence, two harp notes, a pp
//                     timpani roll cresting exactly as the trumpet enters
//   2–5   A           the theme, SOLO TRUMPET, nearly bare
//   6–9   A′          the SOLO HORN answers with the theme; cellos get a
//                     countermelody, the harp starts running, choir sneaks in
//   10–13 B           brass tacet — violins take a falling bridge line, the
//                     choir blooms, quarter-note basses and a big roll build
//   14–16 A″          trumpet and horn together IN THIRDS, full orchestra
//   17    cadence     Bb → C, the V swelling, the last roll
//   18    the beacon  F major struck at 54.0 s, trumpet on top — then four
//                     seconds of hall. A decay, not a fade.
//
// SEATING is anthem's audience view with two changes: the solo trumpet sits
// nearly dead centre with a strong centre-speaker anchor (a soloist is
// dialogue, not a section), and the harp takes its real chair behind the
// first violins on the left.

export const meta = {
  name: 'beacon',
  title: 'Beacon',
  dur: 58,
  tempo: 80,
  seed: 0xBEAC0,
  blurb: 'The emotional one — a solo trumpet in F over strings, harp and choir that grow from a whisper to everything.',
  // The biggest hall in the suite: a lyrical piece can afford a long tail, and
  // the ending is DESIGNED to ring into it.
  reverb: { rt60: 3.4, damp: 0.28, preDelay: 0.034, width: 1.3 },
  master: { drive: 1.12, lfeGain: 0.5 },
};

export function compose(S, O) {
  const {
    n, brass, brassSection, strings, timpani, taiko, choir, glock,
    harp, gliss, cymbal, riser, bass, BODY,
  } = O;
  const rng = S.rng;
  const BAR = S.bar;                     // 3.000 s
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;         // no two notes on the grid

  // ── the orchestra, seated ─────────────────────────────────────────────────
  const tp = S.track('solo-trumpet', { az: 2, centre: 0.36, spread: 4, send: 0.50, gain: 1.0 });
  const hn = S.track('solo-horn', { az: -12, centre: 0.30, spread: 6, send: 0.50, gain: 1.0 });
  const lb = S.track('low-brass', { az: 0, centre: 0.32, spread: 11, send: 0.38, gain: 0.90, lp: 3200 });
  const v1 = S.track('violins', { az: -22, spread: 7, send: 0.54, gain: 0.90, hp: 180 });
  const va = S.track('violas', { az: 6, spread: 10, send: 0.52, gain: 0.75, hp: 130 });
  const vc = S.track('cellos', { az: 23, spread: 6, send: 0.46, gain: 0.95 });
  const db = S.track('basses', { az: -4, centre: 0.16, send: 0.26, gain: 0.90, body: BODY.upright, lp: 1500 });
  const hp = S.track('harp', { az: -16, spread: 7, send: 0.50, gain: 0.85 });
  const pc = S.track('percussion', { az: -6, centre: 0.30, spread: 12, send: 0.40, gain: 1.0 });
  const ch = S.track('choir', { az: 116, pair: true, spread: 28, send: 0.80, gain: 0.62, hp: 150 });
  const bl = S.track('bells', { az: 26, spread: 4, send: 0.62, gain: 0.62 });

  // ── harmony ───────────────────────────────────────────────────────────────
  // Per chord: bro = the low-brass/timpani root (octave 0/1, multiplied up like
  // anthem's), root = the double-bass note (voice-led, F1→C2→D2→Bb1 walks
  // instead of jumping octaves), hi/mid/low = violins/violas/cellos, cho = the
  // choir's close mid-register voicing, arp = the harp's rising eighths.
  const F = {
    bro: 'F1', root: 'F1',
    hi: ['C4', 'F4', 'A4', 'C5'], mid: ['F3', 'A3', 'C4'], low: ['F2', 'C3'],
    cho: ['F3', 'C4', 'F4', 'A4'],
    arp: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4', 'C5'],
  };
  const C = {
    bro: 'C1', root: 'C2',
    hi: ['C4', 'E4', 'G4', 'C5'], mid: ['E3', 'G3', 'C4'], low: ['C2', 'G2'],
    cho: ['G3', 'C4', 'E4', 'G4'],
    arp: ['G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5'],
  };
  const Dm = {
    bro: 'D1', root: 'D2',
    hi: ['D4', 'F4', 'A4', 'D5'], mid: ['D3', 'F3', 'A3'], low: ['D2', 'A2'],
    cho: ['F3', 'A3', 'D4', 'F4'],
    arp: ['D2', 'A2', 'D3', 'F3', 'A3', 'D4', 'F4', 'A4'],
  };
  const Bb = {
    bro: 'Bb0', root: 'Bb1',
    hi: ['D4', 'F4', 'Bb4', 'D5'], mid: ['D3', 'F3', 'Bb3'], low: ['F2', 'Bb2'],
    cho: ['F3', 'Bb3', 'D4', 'F4'],
    arp: ['F2', 'Bb2', 'D3', 'F3', 'Bb3', 'D4', 'F4', 'Bb4'],
  };
  const Gm = {
    bro: 'G1', root: 'G1',
    hi: ['D4', 'G4', 'Bb4', 'D5'], mid: ['D3', 'G3', 'Bb3'], low: ['G2', 'D3'],
    cho: ['G3', 'Bb3', 'D4', 'G4'],
    arp: ['G2', 'D3', 'G3', 'Bb3', 'D4', 'G4', 'Bb4', 'D5'],
  };

  const A_PROG = [F, C, Dm, Bb];         // the theme's loop
  const B_PROG = [Dm, Bb, Gm, C];        // the bridge: minor lean, V at the end

  // ── THE THEME ─────────────────────────────────────────────────────────────
  // Ten notes, four bars, all steps except ONE leap: G4 up a minor 7th to F5,
  // landing held on the downbeat of the Dm bar. Rows are [beat, note, beats,
  // weight, swellTo] — weight is the phrase shape (lean on the lift, give way
  // on the walk home), swellTo lets the big note bloom after it lands.
  const THEME = [
    /* F  */ [[0, 'F4', 1.5], [1.5, 'G4', 0.5, 0.85], [2, 'A4', 2, 1.06]],
    /* C  */ [[0, 'G4', 2, 0.98], [2, 'E4', 1, 0.85], [3, 'G4', 1, 0.92]],
    /* Dm */ [[0, 'F5', 3, 1.18, 1.12], [3, 'E5', 1, 0.88]],
    /* Bb */ [[0, 'D5', 2, 1.02], [2, 'C5', 1, 0.9], [3, 'A4', 1, 0.84]],
  ];
  // The horn's line for the climax: the theme a DIATONIC third below, written
  // out rather than transposed, because thirds in a key are not a fixed
  // interval and the leap must stay a seventh (E4 → D5), not become one thing
  // in one bar and another in the next.
  const THEME_LO = [
    [[0, 'D4', 1.5], [1.5, 'E4', 0.5, 0.85], [2, 'F4', 2, 1.06]],
    [[0, 'E4', 2, 0.98], [2, 'C4', 1, 0.85], [3, 'E4', 1, 0.92]],
    [[0, 'D5', 3, 1.18, 1.12], [3, 'C5', 1, 0.88]],
    [[0, 'Bb4', 2, 1.02], [2, 'A4', 1, 0.9], [3, 'F4', 1, 0.84]],
  ];
  // The bridge starts at the top of the register and FALLS — the opposite
  // shape to the theme, so the theme's return reads as a climb again — then
  // its last bar turns and walks up to E5, the leading tone, which is why the
  // climax entry feels inevitable rather than merely loud.
  const BRIDGE = [
    /* Dm */ [[0, 'A5', 2, 1.08], [2, 'G5', 1, 0.92], [3, 'F5', 1, 0.88]],
    /* Bb */ [[0, 'F5', 2, 1.0], [2, 'D5', 1, 0.88], [3, 'F5', 1, 0.92]],
    /* Gm */ [[0, 'G5', 1.5, 1.05], [1.5, 'D5', 0.5, 0.85], [2, 'Bb4', 2, 0.95]],
    /* C  */ [[0, 'C5', 1, 0.95], [1, 'D5', 1, 1.0], [2, 'E5', 2, 1.1]],
  ];
  // Bar 17, the cadence: the melody hangs on G4/E4 over the V chord and swells,
  // so the final F5 arrives as the theme's own leap (G4 → F5) one last time —
  // the gesture that defined the tune becomes the gesture that ends the piece.
  const CAD_HI = [[0, 'D5', 1.5, 1.06], [1.5, 'C5', 0.5, 0.9], [2, 'G4', 2, 1.0, 1.25]];
  const CAD_LO = [[0, 'Bb4', 1.5, 1.06], [1.5, 'A4', 0.5, 0.9], [2, 'E4', 2, 1.0, 1.25]];

  // ── parts ─────────────────────────────────────────────────────────────────
  /** A brass line, sung. vibDelay ~0.5 s so the vibrato arrives at the ENDS of
   *  long notes — a player states the pitch first and warms it after — and the
   *  near-full note lengths keep the line legato. */
  function sing(trk, kind, barIdx, rows, amp, o = {}) {
    const { bite = 0.72, section = 0 } = o;
    const t0 = barIdx * BAR;
    for (const [beat, name, len, w = 1, sw = 1] of rows) {
      const long = len >= 1.5;
      const a = amp * w * (0.97 + 0.06 * Math.abs(rng()));
      const args = [trk.buf, t0 + B(beat) + J(), B(len) * 0.98, n(name), a, rng];
      const op = {
        kind, bite, swellTo: sw,
        atk: o.atk ?? (long ? 0.08 : 0.055),
        vib: long ? 0.0065 : 0.002, vibDelay: 0.52, vibRate: 4.8 + 0.4 * Math.abs(rng()),
      };
      if (section) brassSection(...args, { ...op, players: section, spreadMs: 0.02 });
      else brass(...args, op);
    }
  }

  /** The string bed. Slow attacks so each bar BREATHES in — the "grows
   *  underneath" of the brief is mostly this amp rising section by section. */
  function bed(barIdx, bars, chd, amp, opts = {}) {
    const { hi = true, mid = true, low = true, atk = 1.3 } = opts;
    const t0 = barIdx * BAR, d = bars * BAR;
    const v = () => 0.94 + 0.12 * Math.abs(rng());
    if (hi) for (const name of chd.hi) {
      strings(v1.buf, t0 + Math.abs(rng()) * 0.05, d, n(name), amp * v(), rng,
        { voices: 6, spread: 0.0055, atk, rel: 1.8, bright: 0.38 });
    }
    if (mid) for (const name of chd.mid) {
      strings(va.buf, t0 + Math.abs(rng()) * 0.05, d, n(name), amp * 0.85 * v(), rng,
        { voices: 5, spread: 0.006, atk: atk * 1.15, rel: 2.0, bright: 0.28 });
    }
    if (low) for (const name of chd.low) {
      strings(vc.buf, t0 + Math.abs(rng()) * 0.04, d, n(name), amp * 0.95 * v(), rng,
        { voices: 4, spread: 0.005, atk: atk * 0.9, rel: 1.8, bright: 0.30 });
    }
  }

  /** The harp's rising eighths — this piece has no ostinato and no drum kit,
   *  so the harp IS the pulse. Quarters early on, eighths once it wakes. */
  function arps(barIdx, chd, amp, { eighths = true } = {}) {
    const t0 = barIdx * BAR;
    chd.arp.forEach((name, k) => {
      if (!eighths && k % 2) return;
      const lean = k === 0 ? 1.15 : k % 4 === 0 ? 1.0 : 0.8 + 0.12 * Math.abs(rng());
      harp(hp.buf, t0 + B(k * 0.5) + J(), n(name), amp * lean, rng, {});
    });
  }

  /** The choir — out in the hall, arriving at the halfway point per the form. */
  function chorus(barIdx, bars, chd, amp, vowel, atk = 0.8) {
    for (const name of chd.cho) {
      choir(ch.buf, barIdx * BAR + Math.abs(rng()) * 0.05, bars * BAR * 1.02, n(name),
        amp * (0.95 + 0.1 * Math.abs(rng())), rng, { vowel, atk, rel: 1.6 });
    }
  }

  /** Low brass holding the root — climax and ending only, so it means
   *  something when it arrives. Warm bites: this is a glow, not a braam. */
  function pedal(barIdx, bars, chd, amp, o = {}) {
    brassSection(lb.buf, barIdx * BAR + J(), bars * BAR, n(chd.bro) * 4, amp, rng,
      { kind: 'trombone', players: 3, bite: 0.95, atk: 0.18, swellTo: 1.18, ...o });
    brassSection(lb.buf, barIdx * BAR + 0.03, bars * BAR, n(chd.bro) * 2, amp * 0.8, rng,
      { kind: 'tuba', players: 2, bite: 0.85, atk: 0.22, ...o });
  }

  function bassOn(barIdx, chd, amp, beats = [0]) {
    for (const bt of beats) {
      bass(db.buf, barIdx * BAR + B(bt) + J(), n(chd.root),
        amp * (bt === 0 ? 1 : 0.8) * (0.95 + 0.1 * Math.abs(rng())), rng,
        { decay: 3.0, damp: 0.76 });
    }
  }

  function hits(barIdx, chd, amp, beats = [0], boom = false) {
    for (const bt of beats) {
      timpani(pc.buf, barIdx * BAR + B(bt) + J(), n(chd.bro) * 2,
        amp * (bt === 0 ? 1 : 0.85), rng, { decay: 2.4 });
      if (boom && bt === 0) taiko(pc.buf, barIdx * BAR + J(), amp * 0.7, rng, { decay: 3.6 });
    }
  }

  /** A timpani crescendo roll — the piece's swells all ride on these. */
  function roll(t0, f, amp, secs) { timpani(pc.buf, t0, f, amp, rng, { roll: secs }); }

  /** The beacon's flash: one glockenspiel star at the top of the texture, at
   *  phrase joins. A tiny identity mark, never a melody. */
  function flash(t0, name, amp) { glock(bl.buf, t0 + J(), n(name), amp, rng, {}); }

  // ── 0–1 · dawn (0–6 s) ────────────────────────────────────────────────────
  // Everything the piece will become, at the threshold of hearing: the F chord
  // blooming over ~2.4 s attacks, two harp notes like a light blinking on,
  // then the first roll cresting exactly at the trumpet's entry.
  bed(0, 2, F, 0.055, { mid: false, atk: 2.3 });
  harp(hp.buf, B(2) + J(), n('F3'), 0.10, rng, {});
  harp(hp.buf, B(3.25) + J(), n('C4'), 0.08, rng, {});
  flash(BAR + B(3.5), 'F6', 0.05);
  gliss(hp.buf, BAR + J(), ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'].map(n), 0.12, rng,
    { step: 0.42, accel: 0.95 });
  roll(BAR + B(2), n('F1') * 2, 0.10, B(1.9));

  // ── 2–5 · A — the solo trumpet, nearly bare (6–18 s) ──────────────────────
  // bite 0.7: warm, half-lidded, nothing like the climax's 1.2 — brightness is
  // the dynamic here, and this statement has to leave 14 dB of headroom above
  // itself for the piece to spend.
  A_PROG.forEach((chd, i) => {
    sing(tp, 'trumpet', 2 + i, THEME[i], 0.34 + i * 0.008, { bite: 0.70 });
    bed(2 + i, 1, chd, 0.065 + i * 0.008, { mid: i >= 1 });
    arps(2 + i, chd, 0.10, { eighths: false });
    bassOn(2 + i, chd, 0.20);
  });
  flash(5 * BAR + B(3.5), 'C6', 0.05);

  // ── 6–9 · A′ — the horn answers, the orchestra leans in (18–30 s) ─────────
  // Same tune, darker voice; underneath it EVERYTHING is different — cello
  // countermelody, running harp, walking bass — because an identical
  // restatement is a loop, not an arrangement.
  const COUNTER = [
    /* F  */ [[0, 'A2', 2], [2, 'C3', 2]],
    /* C  */ [[0, 'G2', 2], [2, 'E3', 2]],
    /* Dm */ [[0, 'F3', 2], [2, 'E3', 2]],   // E: a passing 9th, falling to Bb's D
    /* Bb */ [[0, 'D3', 2], [2, 'F3', 2]],
  ];
  A_PROG.forEach((chd, i) => {
    sing(hn, 'horn', 6 + i, THEME[i], 0.40, { bite: 0.78 });
    bed(6 + i, 1, chd, 0.115, { low: false });   // the counter owns the cello register
    for (const [beat, name, len] of COUNTER[i]) {
      strings(vc.buf, (6 + i) * BAR + B(beat) + J(), B(len) * 0.97, n(name), 0.13, rng,
        { voices: 4, spread: 0.005, atk: 0.28, rel: 0.8, bright: 0.34 });
    }
    arps(6 + i, chd, 0.095);
    bassOn(6 + i, chd, 0.24, [0, 2]);
  });
  // the halfway mark: the choir steals in under the horn's last phrase, and a
  // roll hands A′ over to the bridge
  chorus(9, 1.6, Bb, 0.10, 'oo', 1.4);
  flash(9 * BAR + B(3.5), 'F6', 0.05);
  roll(9 * BAR + B(2), n('D1') * 2, 0.16, B(1.9));

  // ── 10–13 · B — brass tacet; strings and choir carry it (30–42 s) ─────────
  // The trumpet and horn are simply GONE for twelve seconds. That absence is
  // the climax's fuel: what returns at bar 14 is what was taken away here.
  B_PROG.forEach((chd, i) => {
    const t0 = (10 + i) * BAR;
    for (const [beat, name, len, w = 1] of BRIDGE[i]) {
      strings(v1.buf, t0 + B(beat) + J(), B(len) * 0.96, n(name), (0.24 + i * 0.02) * w, rng,
        { voices: 7, spread: 0.005, atk: 0.18, rel: 0.7, bright: 0.5 });
      // violas double the line an octave down — warmth, and a bigger image,
      // without another melody competing
      strings(va.buf, t0 + B(beat) + J(), B(len) * 0.96, n(name) / 2, (0.15 + i * 0.015) * w, rng,
        { voices: 5, spread: 0.006, atk: 0.22, rel: 0.7, bright: 0.4 });
    }
    bed(10 + i, 1, chd, 0.13 + i * 0.02, { hi: false, atk: 1.0 });
    chorus(10 + i, 1.02, chd, 0.15 + i * 0.03, i >= 2 ? 'ah' : 'oo', 0.7);
    arps(10 + i, chd, 0.10 + i * 0.01);
    // the pulse quickens: half-note roots become walking quarters
    bassOn(10 + i, chd, 0.26, i < 2 ? [0, 2] : [0, 1, 2, 3]);
    // a small roll under each bar's swell, pitched at the NEXT root so every
    // crescendo lands somewhere
    if (i < 3) roll(t0 + B(2.5), n(B_PROG[i + 1].bro) * 2, 0.10 + i * 0.03, B(1.4));
  });
  // the lift: strings climb two octaves while the big roll crests into bar 14
  riser(v1.buf, 12.6 * BAR, 14 * BAR, n('F3'), n('F5'), 0.13, rng, { voices: 6, trem: 1 });
  roll(13 * BAR + B(1.5), n('C1') * 2, 0.32, B(2.4));

  // ── 14–16 · A″ — everything, and the two soloists in thirds (42–51 s) ─────
  cymbal(bl.buf, 14 * BAR - 0.02, 0.26, rng, { decay: 3.8, f: 450, crash: true });
  gliss(hp.buf, 14 * BAR + J(), ['F3', 'A3', 'C4', 'F4', 'A4', 'C5', 'F5'].map(n), 0.16, rng,
    { step: 0.05, accel: 0.9 });
  [F, C, Dm].forEach((chd, i) => {
    const bar = 14 + i;
    // bite 1.2 — the same instruments from bars 2–9 with the filter OPEN. The
    // small sections behind each soloist are the rest of the players standing.
    sing(tp, 'trumpet', bar, THEME[i], 0.50, { bite: 1.2, section: 2 });
    sing(hn, 'horn', bar, THEME_LO[i], 0.44, { bite: 1.1, section: 3 });
    bed(bar, 1, chd, 0.24, { atk: 0.9 });
    chorus(bar, 1.02, chd, 0.26, 'ah', 0.5);
    arps(bar, chd, 0.135);
    pedal(bar, 1, chd, 0.20);
    bassOn(bar, chd, 0.30, [0, 2]);
    hits(bar, chd, 0.38, [0, 2], true);
  });
  flash(14 * BAR, 'C6', 0.08);
  flash(16 * BAR, 'F6', 0.10);           // the glock lands with the big leap

  // ── 17 · the cadence — Bb, then C swelling into the end (51–54 s) ─────────
  sing(tp, 'trumpet', 17, CAD_HI, 0.50, { bite: 1.22, section: 2 });
  sing(hn, 'horn', 17, CAD_LO, 0.45, { bite: 1.12, section: 3 });
  bed(17, 0.5, Bb, 0.24, { atk: 0.5 });
  bed(17.5, 0.55, C, 0.25, { atk: 0.4 });
  chorus(17, 0.5, Bb, 0.26, 'ah', 0.4);
  chorus(17.5, 0.55, C, 0.28, 'ah', 0.35);
  pedal(17, 0.5, Bb, 0.20);
  pedal(17.5, 0.5, C, 0.22, { swellTo: 1.4 });   // the V leans hard on the door
  Bb.arp.slice(0, 4).forEach((name, k) =>
    harp(hp.buf, 17 * BAR + B(k * 0.5) + J(), n(name), 0.13, rng, {}));
  C.arp.slice(0, 4).forEach((name, k) =>
    harp(hp.buf, 17 * BAR + B(2 + k * 0.5) + J(), n(name), 0.14, rng, {}));
  bassOn(17, Bb, 0.30);
  bass(db.buf, 17 * BAR + B(2) + J(), n('C2'), 0.30, rng, { decay: 3.0, damp: 0.76 });
  hits(17, Bb, 0.36);
  roll(17 * BAR + B(2), n('C1') * 2, 0.32, B(1.9));
  riser(v1.buf, 17 * BAR + B(1), 18 * BAR, n('C4'), n('C6'), 0.10, rng, { voices: 5, trem: 1 });

  // ── 18 · the beacon lit — one chord, then the hall (54–58 s) ──────────────
  // The trumpet's final F5 is the theme's leap made cadence: G4 held through
  // the V, up a seventh onto the tonic. swellTo < 1 so every voice is placed
  // and then RELEASED into the reverb — the decay is played, not faded.
  const last = 18 * BAR;
  timpani(pc.buf, last + J(), n('F1') * 2, 0.72, rng, { decay: 3.5 });
  taiko(pc.buf, last + 0.01, 0.55, rng, { decay: 4.5 });
  bass(db.buf, last, n('F1'), 0.65, rng, { decay: 4.5 });
  cymbal(bl.buf, last, 0.24, rng, { decay: 5.0, f: 440, crash: true });
  brassSection(tp.buf, last + J(), 3.3, n('F5'), 0.46, rng,
    { kind: 'trumpet', players: 2, bite: 1.15, atk: 0.06, vib: 0.007, vibDelay: 0.7, swellTo: 0.85 });
  brassSection(hn.buf, last + 0.02, 3.2, n('A4'), 0.40, rng,
    { kind: 'horn', players: 2, bite: 1.05, atk: 0.07, swellTo: 0.85 });
  brassSection(hn.buf, last + 0.04, 3.2, n('F4'), 0.34, rng,
    { kind: 'horn', players: 2, bite: 1.0, atk: 0.08, swellTo: 0.85 });
  pedal(18, 1.05, F, 0.24, { swellTo: 0.8, atk: 0.08 });
  bed(18, 1.05, F, 0.26, { atk: 0.3 });
  chorus(18, 1.0, F, 0.30, 'ah', 0.3);
  gliss(hp.buf, last + 0.05, ['F3', 'C4', 'F4', 'A4', 'C5', 'F5', 'A5', 'C6', 'F6'].map(n),
    0.17, rng, { step: 0.045, accel: 0.88 });
  glock(bl.buf, last + 0.1, n('F6'), 0.12, rng, { decay: 2.6 });
}
