// ─── pulse — the heartbeat ───────────────────────────────────────────────────
//
// The v2.31 `pulse` was a lub-dub kick pair every 1.9 s, three saw braams, a
// drone and a riser — tension into one final swell. This is that piece with
// the synthesis taken out: TAIKO is the heart, TROMBONES AND TUBA are the
// braam, and the acceleration is written into the note list — the gap between
// heartbeats shrinks geometrically until the hits are nearly continuous, and
// then the whole orchestra lands on one D minor chord. meta.tempo stays 76;
// a heart does not follow a click, so this piece is laid out in SECONDS and
// only the horn figure counts in beats.
//
// D minor. Almost no harmony for 24 seconds — a heartbeat piece is about
// weight, not motion — then the roots start to walk: D … Bb, Gm, A, and a
// tightening Bb–A right before the landing, so the harmonic rhythm
// accelerates exactly like the heart does. Every brass chord is ROOT + FIFTH
// only; the first minor third the piece ever states is the final chord, which
// is why that chord reads as an arrival and not just as louder.
//
// THE FIGURE (the only melody, and deliberately so): four notes, two steps up
// and a leap — a summons, not a tune. It returns four times, higher each
// time, and its four ENTRY pitches are D3, F3, A3, D4: the piece spells one
// slow D minor arpeggio across its whole length. The last statement is the
// one the trumpets answer in stretto, one octave up, straight into the boom.
//
// FORM (58 s; at 76 bpm a 4/4 bar is 3.16 s — bar numbers are approximate,
// the heart, not the barline, is the grid)
//   0.0–4.6   (bars 0–1)   timpani roll out of silence, ONE oversized
//                          heartbeat, a low braam blooming under it
//   4.6–24.0  (bars 1–7)   the resting heart: pairs 2.9 s apart, braams on D,
//                          choir 'oo' far behind, figure on D3 then F3
//   24.0–29.5 (bars 7–9)   the ground moves: Bb, the tonic D starts TOLLING
//                          on a tubular bell, the gaps begin to close
//   29.5–36.5 (bars 9–11)  THE HOLLOW — all brass out, Gm under choir and
//                          cellos, the heart quickening alone; the piece
//                          holds its breath so the arrival has a doorway
//   36.5–52.8 (bars 11–16) the arrival: dominant pedal on A, figure on A3,
//                          tremolo strings climbing, timpani then bows
//                          joining the heartbeat, Bb–A tightening, figure on
//                          D4 with trumpets in stretto, the heart racing to
//                          a stop 0.4 s before the downbeat —
//   52.8–58   (bars 16–18) — and the LANDING: the full orchestra on the one
//                          D minor chord the piece has been withholding,
//                          left to ring.
//
// LAYOUT: the anthem seating (audience view, nothing paired but the choir),
// with one change of emphasis — the taiko sits dead centre with a wide
// spread, because the heartbeat is the protagonist and a heartbeat is felt
// in the chest, not seen on a stage.

export const meta = {
  name: 'pulse',
  title: 'Pulse',
  dur: 58,
  tempo: 76,
  seed: 0xB4A55,
  blurb: 'The dark one — a taiko heartbeat accelerating under low-brass swells until the whole orchestra arrives on one chord.',
  // A longer, darker hall than anthem: the piece is sparse, so the room is a
  // player — but damped harder, or the racing taiko at the end washes out.
  reverb: { rt60: 2.8, damp: 0.40, preDelay: 0.034, width: 1.25 },
  master: { drive: 1.22, lfeGain: 0.55 },
};

export function compose(S, O) {
  const {
    n, brass, brassSection, strings, stringHit, timpani, taiko, choir,
    tubular, cymbal, riser, bass, BODY,
  } = O;
  const rng = S.rng;
  const B = (x) => S.b(x);
  const J = () => rng() * 0.006;

  // ── the orchestra, seated ─────────────────────────────────────────────────
  const hn = S.track('horns', { az: -10, centre: 0.32, spread: 9, send: 0.44, gain: 0.95 });
  const tp = S.track('trumpets', { az: 13, centre: 0.24, spread: 7, send: 0.46, gain: 0.80 });
  const lb = S.track('low-brass', { az: 2, centre: 0.30, spread: 12, send: 0.38, gain: 1.0, lp: 3400 });
  const v1 = S.track('violins', { az: -21, spread: 7, send: 0.50, gain: 0.90, hp: 170 });
  const vc = S.track('cellos', { az: 22, spread: 6, send: 0.44, gain: 0.92 });
  const db = S.track('basses', { az: -5, centre: 0.15, send: 0.24, gain: 0.90, body: BODY.upright, lp: 1400 });
  const pc = S.track('timpani', { az: -12, spread: 8, send: 0.38, gain: 0.95 });
  // The heart: centre-anchored and wide. Its lows also feed the LFE via bass
  // management, which is where the chest-thump physically lives on a 5.1 rig.
  const tk = S.track('taiko', { az: 0, centre: 0.35, spread: 14, send: 0.30, gain: 1.0 });
  const ch = S.track('choir', { az: 116, pair: true, spread: 26, send: 0.80, gain: 0.64, hp: 150 });
  const bl = S.track('bells', { az: 24, spread: 6, send: 0.60, gain: 0.55 });

  const LAND = 52.8;                 // the downbeat everything drives toward

  // ── the parts ─────────────────────────────────────────────────────────────
  /** A braam: trombones on the root's 2nd octave, tuba an octave below, and —
   *  as the piece closes in — trombones on the fifth as well. bite > 1 and a
   *  swell across the note, so each one GROWS while it sounds: that growth,
   *  not level, is what made the synth braams menacing, and brass does it for
   *  real. No thirds anywhere — the chord quality is withheld until the end. */
  function braam(t0, dur, root, amp, opts = {}) {
    const { fifth = false, bite = 1.15, swellTo = 1.4 } = opts;
    const fr = n(root);
    brassSection(lb.buf, t0 + J(), dur, fr * 4, amp, rng,
      { kind: 'trombone', players: 3, bite, swellTo, atk: 0.12 });
    brassSection(lb.buf, t0 + 0.03 + J(), dur, fr * 2, amp * 0.8, rng,
      { kind: 'tuba', players: 2, bite: bite - 0.1, swellTo: swellTo * 0.92, atk: 0.16 });
    if (fifth) brassSection(lb.buf, t0 + 0.05 + J(), dur, fr * 6, amp * 0.5, rng,
      { kind: 'trombone', players: 2, bite, swellTo, atk: 0.14 });
  }

  // THE FIGURE — [beat, lengthInBeats, weight]: two steps up, a short third
  // step that snaps into the leap, and the leap held. It always lands on the
  // FIFTH of whatever is underneath, so every statement hangs unresolved —
  // four summonses, no answer, until the final chord answers all of them.
  const FIG = [[0, 1, 1.0], [1, 1, 0.92], [2, 0.5, 0.88], [2.5, 1.6, 1.12]];
  // The trumpets' stretto version: same shape at double speed, because by then
  // the whole piece is compressing. The held A5 stops short of the landing
  // with everything else — see the last statement below.
  const FIG_TIGHT = [[0, 0.5, 1.0], [0.5, 0.5, 0.95], [1, 0.5, 0.90], [1.5, 0.6, 1.15]];

  function figure(t0, names, amp, opts = {}) {
    const { track = hn, kind = 'horn', players = 0, bite = 1, oct = 0, rows = FIG } = opts;
    rows.forEach(([beat, len, w], k) => {
      const f = n(names[k]) * Math.pow(2, oct);
      const args = [track.buf, t0 + B(beat) + J(), B(len) * 0.95, f, amp * w, rng];
      const o = { kind, bite, vib: len >= 1.5 ? 0.006 : 0.002, vibDelay: 0.5, atk: 0.05 };
      if (players) brassSection(...args, { ...o, players });
      else brass(...args, o);
    });
  }

  // ── 0.0–4.6 · out of silence ──────────────────────────────────────────────
  // The v2.31 opening was a noise riser into two hits. Here: a timpani roll
  // that crescendos out of nothing into ONE oversized heartbeat — the first
  // beat of a heart that will not stop again until it stops everything.
  timpani(pc.buf, 0.06, n('D2'), 0.30, rng, { roll: 1.3 });
  taiko(tk.buf, 1.5 + J(), 0.95, rng, { f0: 88, f1: 42, decay: 4.2, skin: 0.6 });
  timpani(pc.buf, 1.5 + J(), n('D2'), 0.50, rng, { decay: 2.6 });
  taiko(tk.buf, 1.82 + J(), 0.50, rng, { f0: 96, f1: 46, decay: 2.6, skin: 0.5 });
  cymbal(bl.buf, 1.5, 0.11, rng, { decay: 3.2, f: 360 });   // dark shimmer, no crash
  bass(db.buf, 1.5 + J(), n('D1'), 0.50, rng, { decay: 4.0 });

  // ── the heartbeat — the entire piece hangs off this schedule ──────────────
  // Pairs ("lub-dub") 2.9 s apart for 22 seconds; from t=26 every gap is 90.5%
  // of the last, floored at 0.34 s. Geometric, not linear, because that is how
  // panic actually feels: the first shortenings are barely noticeable and the
  // last ones are all there is. When the gap can no longer hold a "dub"
  // (< 0.62 s) the pairs collapse into single accelerating strokes — a racing
  // heart loses its two-part signature — and the drum tightens as it speeds:
  // shorter decay, more skin, so the end is pounding, not booming.
  // The heart stops 0.4 s before LAND. That silence is the piece's whole point.
  const HEART0 = 4.6;
  let t = HEART0, gap = 2.9;
  while (t < LAND - 0.35) {
    const u = Math.min(1, (t - HEART0) / (LAND - HEART0));
    const amp = (0.48 + 0.34 * u) * (1 + 0.05 * rng());
    const decay = 3.4 - 2.0 * u;
    const skin = 0.55 + 0.15 * u;
    taiko(tk.buf, t + J(), amp, rng, { f0: 88, f1: 42, decay, skin, drop: 12 });
    if (gap >= 0.62) {
      const dub = Math.min(0.32, gap * 0.36);   // the second beat rides closer as the heart races
      taiko(tk.buf, t + dub + J(), amp * 0.55, rng,
        { f0: 96, f1: 46, decay: decay * 0.7, skin: skin * 0.9, drop: 14 });
    }
    // The orchestra is gradually POSSESSED by the pulse: first the timpani
    // starts doubling it, then the low bows dig in on every stroke. Both stay
    // on D whatever the harmony does — like the toll, the tonic is the thing
    // that will not move; against the A pedal that D is a suspension the
    // final chord finally resolves.
    if (gap < 1.8) timpani(pc.buf, t + J(), n('D2'), 0.16 + 0.26 * u, rng, { decay: 1.6 });
    if (gap < 1.1) {
      stringHit(vc.buf, t + J(), 0.22, n('D2'), 0.18 + 0.16 * u, rng, { voices: 4, bite: 0.65, bright: 0.5 });
      stringHit(v1.buf, t + J(), 0.22, n('D3'), 0.12 + 0.10 * u, rng, { voices: 4, bite: 0.6, bright: 0.55 });
    }
    if (t > 26) gap = Math.max(0.34, gap * 0.905);
    t += gap * (1 + 0.02 * rng());   // a heart is not a sequencer
  }

  // ── the braams — [t, dur, root, amp, opts] ────────────────────────────────
  // Levels and bite climb swell by swell; 29.5–36.5 has NO BRASS AT ALL (the
  // hollow), so the A-pedal braam at 36.5 is a return, not more of the same.
  const SWELLS = [
    [1.7, 3.2, 'D1', 0.16, { swellTo: 1.30, bite: 1.05 }],   // blooming under the opening hit
    [5.0, 5.0, 'D1', 0.19, { swellTo: 1.35, bite: 1.10 }],
    [12.0, 5.0, 'D1', 0.21, { swellTo: 1.40, bite: 1.10 }],
    [19.0, 4.5, 'D1', 0.23, { swellTo: 1.40, bite: 1.15 }],
    [24.0, 5.5, 'Bb0', 0.25, { swellTo: 1.40, bite: 1.15 }],  // the first move of the ground
    [36.5, 6.0, 'A0', 0.27, { swellTo: 1.45, bite: 1.20, fifth: true }],  // the dominant arrives
    [45.0, 3.6, 'Bb0', 0.30, { swellTo: 1.45, bite: 1.25, fifth: true }], // harmonic rhythm tightens…
    // …and the last one aims at LAND but RELEASES 0.6 s short of it: the first
    // render held it through the downbeat and the landing measured no louder
    // than the approach. The arrival needs a hole to arrive out of.
    [48.8, 3.4, 'A0', 0.30, { swellTo: 1.50, bite: 1.30, fifth: true }],
  ];
  for (const [t0, dur, root, amp, o] of SWELLS) braam(t0, dur, root, amp, o);

  // ── the choir — 'oo', far behind the listener ─────────────────────────────
  // Bare fifths and octaves at first (no quality, like the brass), the chord
  // tones creeping in as the roots start to walk. It never sings 'ah' until
  // the landing — the vowel opening IS the arrival.
  const VOICES = [
    [2.5, 5.0, ['D3'], 0.08],                       // a whisper behind the first beat
    [8.0, 8.5, ['D3', 'A3'], 0.13],
    [16.0, 8.5, ['D3', 'A3', 'D4'], 0.15],
    [24.0, 6.0, ['Bb3', 'D4', 'F4'], 0.16],
    [29.5, 7.5, ['G3', 'Bb3', 'D4'], 0.17],         // the hollow is the choir's bar to carry
    [36.5, 8.8, ['A3', 'E4', 'A4'], 0.19],
    [45.0, 4.2, ['Bb3', 'D4', 'F4'], 0.21],
    [48.8, 4.2, ['A3', 'E4', 'A4'], 0.23],
  ];
  for (const [t0, dur, names, amp] of VOICES) {
    for (const name of names) {
      choir(ch.buf, t0 + Math.abs(rng()) * 0.05, dur, n(name), amp * (0.92 + 0.16 * Math.abs(rng())), rng,
        { vowel: 'oo', voices: 6, atk: 1.2, rel: 1.6 });
    }
  }

  // ── the floor — cello pedal and bass, walking with the roots ──────────────
  const PEDAL = [
    [4.0, 10.5, 'D2', 0.09], [8.0, 16.5, 'D3', 0.06], [13.5, 11.0, 'D2', 0.10],
    [24.0, 6.0, 'Bb2', 0.11],
    [29.5, 7.5, 'G2', 0.11], [32.0, 4.5, 'Bb2', 0.07],
    [36.5, 9.0, 'A2', 0.12], [40.5, 5.0, 'E3', 0.08],
    [45.0, 4.2, 'Bb2', 0.13],
    [48.8, 4.4, 'A2', 0.14],
  ];
  for (const [t0, dur, name, amp] of PEDAL) {
    strings(vc.buf, t0 + Math.abs(rng()) * 0.04, dur, n(name), amp, rng,
      { voices: 5, spread: 0.006, atk: 1.6, rel: 1.8, bright: 0.25 });
  }
  const FLOOR = [
    [4.0, 'D1', 0.30], [9.5, 'D1', 0.28], [14.5, 'D1', 0.30], [19.5, 'D1', 0.30],
    [24.0, 'Bb1', 0.32], [29.5, 'G1', 0.32], [33.0, 'G1', 0.28],
    [36.5, 'A1', 0.34], [40.5, 'A1', 0.32],
    [45.0, 'Bb1', 0.35], [48.8, 'A1', 0.36],
  ];
  for (const [t0, name, amp] of FLOOR) bass(db.buf, t0 + J(), n(name), amp, rng, { decay: 3.0 });

  // ── the toll — a tubular D4 at every harmonic juncture ────────────────────
  // The bell never changes pitch while the ground moves under it: over Bb it
  // is the third, over A the suspended fourth. A clock striking the same hour
  // louder and louder is the cheapest inevitability there is, and it works.
  for (const [t0, amp] of [[24.0, 0.10], [36.5, 0.13], [45.0, 0.15], [48.8, 0.17]]) {
    tubular(bl.buf, t0 + J(), n('D4'), amp, rng, { decay: 5.5 });
  }

  // ── THE FIGURE's four statements — D3, F3, A3, D4: one slow arpeggio ──────
  figure(13.0, ['D3', 'E3', 'F3', 'A3'], 0.30, { bite: 0.78 });               // a solo horn, low
  figure(20.0, ['F3', 'G3', 'A3', 'C4'], 0.33, { players: 2, bite: 0.90 });
  // Over the A pedal the figure's Bb is a flat ninth — the darkest colour in
  // the piece, saved for the moment the arrival machine starts.
  figure(38.5, ['A3', 'Bb3', 'C4', 'E4'], 0.40, { players: 3, bite: 1.05 });
  figure(38.5, ['A3', 'Bb3', 'C4', 'E4'], 0.20,
    { track: lb, kind: 'trombone', players: 2, bite: 1.0, oct: -1 });
  // The last statement: horns an octave above the first — and the trumpets
  // answer in stretto before it even finishes, because by now nothing can
  // wait. Both held notes are cut SHORT of the landing (like the last braam):
  // every voice lets go, the heart stops, and for half a second only the
  // timpani roll and the tremolo climb are left rushing at the downbeat.
  figure(49.6, ['D4', 'E4', 'F4', 'A4'], 0.46,
    { players: 4, bite: 1.25, rows: [[0, 1, 1.0], [1, 1, 0.92], [2, 0.5, 0.88], [2.5, 1.0, 1.12]] });
  figure(50.8, ['D5', 'E5', 'F5', 'A5'], 0.26,
    { track: tp, kind: 'trumpet', players: 3, bite: 1.25, rows: FIG_TIGHT });

  // ── the climb — tremolo strings through the second half ───────────────────
  // Two stages, both trem risers: a quiet one across the hollow, then a bigger
  // one from the same floor to a fifth higher, ending at the landing. Restarting
  // the climb makes the second stage feel like the first one breaking loose.
  riser(v1.buf, 28.0, 40.2, n('A3'), n('A4'), 0.10, rng, { voices: 5, trem: 1 });
  riser(v1.buf, 40.2, LAND - 0.05, n('A3'), n('A5'), 0.19, rng, { voices: 7, trem: 1 });
  // The last pre-landing gesture: a timpani roll that crescendos through the
  // heart's final silence, so the 0.4 s hole is not empty — it is inhaling.
  timpani(pc.buf, 50.6, n('D2'), 0.42, rng, { roll: LAND - 50.6 });

  // ── 52.8 · THE LANDING ────────────────────────────────────────────────────
  // Everything the piece withheld, at once: the first full minor triad, the
  // choir's first open vowel, the trumpets' top octave — one chord, then the
  // hall. A hard arrival and a real decay; never a fade.
  taiko(tk.buf, LAND, 1.0, rng, { f0: 84, f1: 40, decay: 4.6, skin: 0.6 });
  taiko(tk.buf, LAND + 0.05, 0.65, rng, { f0: 70, f1: 36, decay: 5.2, skin: 0.4 });
  timpani(pc.buf, LAND + J(), n('D2'), 0.95, rng, { decay: 2.8 });
  cymbal(bl.buf, LAND, 0.32, rng, { decay: 4.5, f: 430, crash: true });
  tubular(bl.buf, LAND + 0.02, n('D4'), 0.26, rng, { decay: 6.5 });
  braam(LAND, 4.4, 'D1', 0.38, { swellTo: 0.85, bite: 1.25, fifth: true });
  brassSection(hn.buf, LAND + J(), 4.2, n('D4'), 0.34, rng, { kind: 'horn', players: 3, bite: 1.2, atk: 0.05 });
  brassSection(hn.buf, LAND + 0.02 + J(), 4.2, n('F4'), 0.27, rng, { kind: 'horn', players: 2, bite: 1.15, atk: 0.06 });
  brassSection(hn.buf, LAND + 0.04 + J(), 4.2, n('A4'), 0.22, rng, { kind: 'horn', players: 2, bite: 1.15, atk: 0.06 });
  brassSection(tp.buf, LAND + J(), 4.0, n('D5'), 0.24, rng, { kind: 'trumpet', players: 2, bite: 1.15, atk: 0.05 });
  brassSection(tp.buf, LAND + 0.03 + J(), 4.0, n('A5'), 0.16, rng, { kind: 'trumpet', players: 2, bite: 1.10, atk: 0.05 });
  for (const [name, a] of [['D5', 0.26], ['F5', 0.24], ['A5', 0.22]]) {
    strings(v1.buf, LAND + Math.abs(rng()) * 0.03, 4.3, n(name), a, rng,
      { voices: 6, spread: 0.0055, atk: 0.4, rel: 1.6, bright: 0.45 });
  }
  strings(vc.buf, LAND + 0.02, 4.4, n('D3'), 0.22, rng, { voices: 5, atk: 0.5, rel: 1.8, bright: 0.30 });
  strings(vc.buf, LAND + 0.04, 4.4, n('D2'), 0.18, rng, { voices: 4, atk: 0.5, rel: 1.8, bright: 0.25 });
  for (const [name, a] of [['D4', 0.30], ['F4', 0.27], ['A4', 0.25], ['D5', 0.20]]) {
    choir(ch.buf, LAND + 0.03, 4.6, n(name), a, rng, { vowel: 'ah', atk: 0.3, rel: 1.8 });
  }
  bass(db.buf, LAND + J(), n('D1'), 0.72, rng, { decay: 4.2 });
}
