// ─── voices-real.mjs — the v2.31 suite, played instead of generated ──────────
//
// Pierre, 2026-08-24: "The five that are in the app are really good actually…
// Preserve them as they are, but do a pass on them so they wouldn't sound
// synthetic. Some of the sounds within them seem synthetic."
//
// 🔴 THE MUSIC DOES NOT CHANGE. `lib/suite1-score.mjs` holds the compositions,
// note for note, and both renderers run it. This file is only the other half of
// the voice table: the same primitive signatures, implemented with the modelled
// instruments in `lib/orchestra.mjs` instead of oscillators. Every note starts
// at the same instant, lasts as long, and carries the same weight as it always
// did — it is just played by something with a body.
//
// THE SUBSTITUTIONS, and why each one:
//
//   kick        → taiko (concert bass drum) + a timpano tuned to the kick's own
//                 landing pitch, so it can never disagree with the harmony
//   tone/SAW    → brass. Short calls are section STABS, long ones are held
//                 braams that swell — which is what a saw stack was imitating
//   tone/SQ     → marcato strings with a glockenspiel doubling the top. The
//                 square voice was cascade's chip riff; bowed strings play that
//                 rhythm for real, and the glock gives back the edge
//   tone/soft   → the string section, plus a horn through the middle register
//                 where a pad needs a core to sit on
//   pluck       → harp, with pizzicato doubling the hook for definition
//   bell        → glockenspiel — the original was already reaching for a bar
//   disc        → a ride cymbal for the tick, a splash for the mid hit
//   riserTones  → a string section glissando: bows, not oscillators
//   noiseSwell  → a cymbal roll where it builds, high string tremolo where it
//                 shimmers. Filtered white noise is the single most synthetic
//                 sound in the original five and it is now gone entirely
//   pad         → sustained strings, with the ORIGINAL per-beat ducking curve
//                 applied on top, because that sidechain pump is the groove
//
// The score's stereo panning is honoured where it is musical (orbit's hook
// answers itself left and right) and otherwise replaced by an orchestral
// seating, which is a better use of five speakers than a synth's pan knob.

import * as O from './orchestra.mjs';

const { n, SR, TAU } = O;

/**
 * Read an arbitrary envelope function back into attack / hold / release, so a
 * modelled instrument can be asked for the same shape the oscillator was given.
 * The score hands us `adsr(...)` and several hand-written closures; probing is
 * the only way to honour all of them without rewriting the score.
 */
function envShape(envFn, dur) {
  const P = 96;
  const vals = [];
  let peak = 0;
  for (let k = 0; k <= P; k++) {
    const v = envFn((dur * k) / P);
    vals.push(v);
    if (v > peak) peak = v;
  }
  if (peak <= 0) return { atk: 0.01, hold: dur, rel: 0.1, peak: 0 };
  let a = 0;
  while (a < P && vals[a] < peak * 0.95) a++;
  let r = P;
  while (r > a && vals[r - 1] < peak * 0.95) r--;
  const atk = (dur * a) / P;
  const relStart = (dur * r) / P;
  return {
    atk: Math.max(0.006, atk),
    hold: Math.max(0, relStart - atk),
    rel: Math.max(0.06, dur - relStart),
    peak,
  };
}

/** Nearest note name for a frequency — used to tune a timpano to a kick. */
const clampHz = (f, lo, hi) => Math.max(lo, Math.min(hi, f));

/**
 * Build the real voice table plus the orchestra it plays on.
 * Returns { V, tracks } — hand V to a SCORE function.
 */
export function makeRealVoices(S) {
  // ── the seating ───────────────────────────────────────────────────────────
  // Front-stage parts stay inside |az| + spread <= 30 so nothing important
  // arrives from behind. Only the air and the metal wrap around.
  const perc = S.track('percussion', { az: -6, centre: 0.30, spread: 12, send: 0.34, gain: 1.0 });
  const lowB = S.track('low-brass', { az: 0, centre: 0.34, spread: 11, send: 0.34, gain: 1.0, lp: 3400 });
  const hiB = S.track('brass', { az: -12, centre: 0.30, spread: 9, send: 0.40, gain: 1.0 });
  const strH = S.track('violins', { az: -21, spread: 8, send: 0.52, gain: 1.0, hp: 170 });
  const strL = S.track('cellos', { az: 21, spread: 8, send: 0.44, gain: 1.0 });
  const dbs = S.track('basses', { az: -4, centre: 0.16, send: 0.24, gain: 1.0, body: O.BODY.upright, lp: 1600 });
  // The hook in `orbit` answers itself left and right; that choreography is
  // part of why Pierre liked it, so the plucked voices keep two seats and the
  // score's own pan sign chooses between them.
  const plkL = S.track('harp-L', { az: -19, spread: 8, send: 0.50, gain: 1.0, body: O.BODY.nylon, bodyDry: 0.75 });
  const plkR = S.track('harp-R', { az: 19, spread: 8, send: 0.50, gain: 1.0, body: O.BODY.nylon, bodyDry: 0.75 });
  const bell = S.track('bells', { az: 28, spread: 8, send: 0.62, gain: 1.0 });
  const metal = S.track('cymbals', { az: -44, pair: true, spread: 16, send: 0.56, gain: 1.0 });
  const air = S.track('air', { az: 112, pair: true, spread: 30, send: 0.80, gain: 1.0, hp: 240 });

  const rngOf = (r) => r || S.rng;

  // ── level trims ───────────────────────────────────────────────────────────
  // An oscillator at amp 0.3 and a horn section at amp 0.3 are not the same
  // loudness, so each substitution carries a factor that restores the ORIGINAL
  // balance between parts. These were set by matching the rendered energy
  // envelope of each piece against the synthetic render, section by section —
  // see scripts/check-arrangement.mjs, which measures exactly that.
  const G = {
    kickBody: 1.15, kickTuned: 0.34,
    stab: 1.55, braam: 1.30, pad: 2.30, padHorn: 0.55,
    chip: 1.45, chipBell: 0.30,
    harp: 1.30, pizz: 0.45,
    bell: 0.85, ride: 0.55, splash: 0.75,
    riser: 1.05, swellUp: 0.30, swellShimmer: 0.34,
  };

  const V = {
    // constants the score closes over
    SR: O.SR, N: S.N, DUR: S.dur, TAU: O.TAU,
    makeRng: O.makeRng,
    adsr: O.adsr,
    SAW: [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14],
    SQ: [1, 0, 0.33, 0, 0.2, 0, 0.14],
    cents: (root, c) => root * Math.pow(2, c / 1200),

    /**
     * THE HITS. A concert bass drum for the body, plus a timpano tuned to f1 —
     * the pitch the synthetic kick's sweep actually landed on — so the drum can
     * never sit outside the harmony the score already established.
     */
    kick(_L, _R, t0, f0, f1, decay, amp, rng) {
      const r = rngOf(rng);
      // 🔴 THE KICK'S TAIL WAS TUNED BY MEASUREMENT, NOT BY DERIVATION.
      // The obvious move is to match the score's decay RATE: its `decay` is d
      // in e^(-d·t), and taiko's envelope is e^(-t·(6/decay + 1.1)), so the
      // equivalent parameter is 6/(d − 1.1). That was tried, and it correlates
      // WORSE against the original than the value below (0.66 against 0.76 on
      // `engine`). The reason is that the two envelopes multiply different
      // spectra — a matched rate is not a matched audible tail, because the
      // synthetic kick's low harmonics stay loud long after the modelled drum's
      // have gone. Factors 6, 9, 14, 20, 27 and 34 were rendered and measured;
      // 34 wins, so 34 is what ships. Do not "correct" this to the derivation.
      O.taiko(perc.buf, t0, amp * G.kickBody, r, {
        f0: clampHz(f0, 60, 190), f1: clampHz(f1, 30, 60),
        decay: Math.max(1.2, 34 / decay), drop: Math.max(9, decay * 1.9), skin: 0.5,
      });
      if (amp > 0.3) {
        O.timpani(perc.buf, t0 + 0.004, clampHz(f1, 41, 118), amp * G.kickTuned, r,
          { decay: Math.max(0.9, 24 / decay), hit: 0.45 });
      }
    },

    /**
     * THE WORKHORSE. Which instrument depends on the harmonic table the score
     * asked for — that table WAS the timbre choice, so reading it is how the
     * substitution stays faithful instead of guessing.
     */
    tone(_L, _R, t0, dur, f, ampL, ampR, _dL, _dR, envFn, harm = [1, 0.35]) {
      const amp = (ampL + ampR) / 2;
      if (amp <= 0) return;
      const e = envShape(envFn, dur);
      if (e.peak <= 0) return;
      const a = amp * e.peak;
      const r = S.rng;
      const sq = harm.length >= 5 && harm[1] === 0;              // the chip voice
      const saw = harm.length >= 7 && harm[1] === 0.5;           // the saw stack

      if (sq) {
        // cascade's riff: bowed marcato where the square notes were, with a
        // glockenspiel on the top octave giving back the edge the bow loses.
        O.stringHit(strH.buf, t0, Math.max(0.06, e.atk + e.hold), f, a * G.chip, r,
          { voices: 5, bite: 0.62, bright: 0.72 });
        if (f > 300) O.glock(bell.buf, t0, f, a * G.chipBell, r, { decay: 0.7 });
        return;
      }

      if (saw) {
        const long = dur > 0.6;
        if (long) {
          // a held braam — trombones and tuba, swelling, which is what the saw
          // stack was imitating in the first place
          O.brassSection(lowB.buf, t0, e.atk + e.hold, f * (f < 70 ? 2 : 1), a * G.braam, r, {
            kind: f < 90 ? 'trombone' : 'horn', players: 3, bite: 1.15,
            swellTo: 1.15, atk: Math.min(0.30, e.atk), rel: e.rel * 0.8,
          });
          if (f < 90) {
            O.brassSection(lowB.buf, t0 + 0.02, e.atk + e.hold, f * 4, a * G.braam * 0.5, r,
              { kind: 'tuba', players: 2, bite: 1.0, atk: Math.min(0.34, e.atk + 0.04), rel: e.rel });
          }
          O.bass(dbs.buf, t0, f, a * 0.8, r, { decay: Math.min(3.4, dur), damp: 0.72 });
        } else {
          // a stab — short, hard, bright, the whole section together
          O.brassSection(hiB.buf, t0, Math.max(0.07, e.atk + e.hold), f * (f < 70 ? 2 : 1),
            a * G.stab, r, {
              kind: f < 90 ? 'trombone' : 'trumpet', players: 3, bite: 1.3,
              atk: 0.016, rel: Math.max(0.05, e.rel * 0.7), vib: 0,
            });
          O.bass(dbs.buf, t0, f, a * 0.7, r, { decay: 0.9, damp: 0.74, dur: Math.max(0.1, dur) });
        }
        return;
      }

      // the soft table: pads, the bloom chord, the held finale — the string
      // section, with a horn through the middle where a pad needs a core.
      const trk = f < 200 ? strL : strH;
      O.strings(trk.buf, t0, e.atk + e.hold, f, a * G.pad, r, {
        voices: 6, spread: 0.0055,
        atk: Math.max(0.08, e.atk), rel: Math.max(0.12, e.rel * 0.85),
        bright: f < 120 ? 0.26 : 0.40,
      });
      if (f >= 90 && f <= 420 && dur > 1.2) {
        O.brass(hiB.buf, t0, e.atk + e.hold, f, a * G.padHorn, r,
          { kind: 'horn', bite: 0.62, atk: Math.max(0.10, e.atk), rel: Math.max(0.12, e.rel * 0.8), vib: 0.003 });
      }
      if (f < 90) O.bass(dbs.buf, t0, f, a * 1.0, r, { decay: Math.min(4, dur), damp: 0.70 });
    },

    /** THE MOTIF. Harp for the line, pizzicato doubling it for definition. The
     *  score's pan sign picks which side of the stage answers. */
    pluck(_L, _R, t0, f, amp, pan = 0) {
      const r = S.rng;
      const trk = pan < 0 ? plkL : plkR;
      O.harp(trk.buf, t0, f, amp * G.harp, r, { decay: 1.05, damp: 0.34, pick: 0.22, bright: 0.52 });
      O.pizz(trk.buf, t0 + 0.003, f, amp * G.pizz, r, { decay: 0.42, damp: 0.5, bright: 0.5 });
    },

    /** A glockenspiel. The original bell was already reaching for a struck bar
     *  — its 1 : 2.76 : 5.4 partials ARE the bar series — so this is the same
     *  instrument, properly modelled. */
    bell(_L, _R, t0, f, amp, pan = 0) {
      O.glock(bell.buf, t0, f, amp * G.bell, S.rng, { decay: 1.9 });
      if (f < 700) O.tubular(bell.buf, t0 + 0.006, f, amp * 0.20, S.rng, { decay: 3.4 });
    },

    /** The ride tick and the mid hit. */
    disc(_L, _R, t0, amp, pan = 0, hi = true) {
      const r = S.rng;
      if (hi) O.cymbal(metal.buf, t0, amp * G.ride, r, { decay: 0.85, f: 640, modes: 6 });
      else O.cymbal(metal.buf, t0, amp * G.splash, r, { decay: 1.5, f: 430, modes: 8, crash: true });
    },

    /** Bows, not oscillators. */
    riserTones(_L, _R, t0, t1, fLo, fHi, amp) {
      O.riser(air.buf, t0, t1, fLo, fHi, amp * G.riser, S.rng, { voices: 7, trem: 1 });
    },

    /**
     * 🔴 THE ONE THAT MATTERED MOST. Filtered white noise is the most obviously
     * synthetic sound in the original five, and it is now gone: where the score
     * builds, a cymbal roll; where it shimmers under a section, high string
     * tremolo. Same placement, same duration, same curve.
     */
    noiseSwell(_L, _R, t0, t1, amp, rng, rise = true) {
      const r = rngOf(rng);
      const dur = t1 - t0;
      if (dur <= 0.05) return;
      if (rise) {
        // a roll: many strokes, getting faster and louder
        let t = t0, k = 0;
        while (t < t1 && k < 500) {
          const u = (t - t0) / dur;
          O.cymbal(metal.buf, t, amp * G.swellUp * (0.12 + 0.88 * Math.pow(u, 1.8)) * (0.7 + 0.3 * Math.abs(r())),
            r, { decay: 0.55 + 0.9 * u, f: 560, modes: 7 });
          t += 0.075 + 0.05 * Math.abs(r()) - 0.045 * u;
          k++;
        }
      } else {
        // the long shimmer: a high tremolo bed that breathes in and out
        for (const [mult, g] of [[1, 1], [1.5, 0.6], [2, 0.42]]) {
          O.riser(air.buf, t0, t1, 880 * mult, 1180 * mult, amp * G.swellShimmer * g, r,
            { voices: 4, trem: 1 });
        }
      }
    },

    /**
     * Orbit's pad. Strings, with the score's OWN per-beat ducking curve applied
     * on top — that sidechain pump is the groove, and dropping it would change
     * the music, which is the one thing this pass may not do.
     */
    pad(_L, _R, t0, t1, f, a, B) {
      const dur = t1 - t0;
      const r = S.rng;
      const trk = f < 200 ? strL : strH;
      const before = trk.buf.length;
      // render into a scratch buffer so the duck can be applied to this part
      // alone rather than to everything already on the track
      const tmp = new Float64Array(before);
      O.strings(tmp, t0, dur, f, a * G.pad, r, {
        voices: 5, spread: 0.006, atk: 1.5, rel: 0.22, bright: f < 150 ? 0.28 : 0.38,
      });
      // hard-windowed to t1: the pad must not outlive the score's own stop
      const s0 = Math.floor(t0 * SR), s1 = Math.min(before, Math.floor((t1 + 0.25) * SR));
      for (let i = s0; i < s1; i++) {
        const t = (i - s0) / SR;
        const duck = 1 - 0.35 * Math.exp(-((t % B) / 0.09));
        trk.buf[i] += tmp[i] * duck;
      }
    },

    /** Only `droplet` uses this. A struck bar with a chirp is a bell, near enough. */
    drop(_L, _R, t0, f0, amp, pan = 0) {
      O.glock(bell.buf, t0, f0, amp * 0.8, S.rng, { decay: 0.85 });
    },
    /** Only `maqam` uses this — a sung line, so: the flute. */
    voice(_L, _R, t0, dur, f, amp, pan = 0) {
      O.flute(hiB.buf, t0, dur, f, amp * 1.1, S.rng,
        { breath: 0.36, vibDelay: 0.25, vib: 0.012, chiff: 0.4 });
    },

    /**
     * THE APPROVED OPENING — the three seconds the figures land on. Its two
     * hits stay at 0.35 s and 0.85 s to the sample, because the app's visual is
     * cut to them; only what makes the sound has changed.
     */
    opening(L, R, rng) {
      const r = rngOf(rng);
      // the lift into the first hit: a cymbal roll and a timpani roll, where
      // there used to be a noise ramp
      O.timpani(perc.buf, 0.05, n('D2'), 0.085, r, { roll: 0.30 });
      O.cymbal(metal.buf, 0.10, 0.035, r, { decay: 0.9, f: 520, crash: true });
      V.kick(L, R, 0.35, 160, 52, 9.5, 0.5, r);
      V.kick(L, R, 0.85, 110, 36, 4.2, 0.72, r);
      // the bloom chord, released by ~3.0 to hand over to the piece
      const parts = [[55, 0.3, 0.3, 0, 0], [110, 0.22, 0.22, -0.4, 0.4],
        [164.8, 0.14, 0.1, -0.9, 0.9], [220, 0.1, 0.14, 1.1, -1.1], [329.6, 0.05, 0.05, -1.6, 1.6]];
      for (const [f, aL, aR, dL, dR] of parts) {
        V.tone(L, R, 0.85, 2.6, f, aL, aR, dL, dR, O.adsr(0.5, 0.8, 1.2), [1, 0.35]);
      }
    },

    /** The terminal hit and the held bloom. */
    finale(L, R, t0, rng) {
      const r = rngOf(rng);
      V.kick(L, R, t0, 100, 34, 3.4, 0.85, r);
      O.cymbal(metal.buf, t0, 0.22, r, { decay: 3.4, f: 450, crash: true });
      for (const [f, a, d] of [[55, 0.26, 0], [82.4, 0.14, 0.6], [110, 0.16, -0.6], [130.8, 0.09, 1.1]]) {
        V.tone(L, R, t0, S.dur - t0 - 0.1, f, a, a, d, -d,
          O.adsr(0.3, 0.9, S.dur - t0 - 1.4), [1, 0.3]);
      }
    },
  };

  return { V, tracks: { perc, lowB, hiB, strH, strL, dbs, plkL, plkR, bell, metal, air } };
}
