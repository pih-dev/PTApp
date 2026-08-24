# suite2 — how to write a piece

A piece is one file, `scripts/suite2/<name>.mjs`, exporting `meta` and `compose(S, O)`.
It never touches channels, reverb, folding or encoding — `make-suite2.mjs` owns all of that.
Read `ivory.mjs` first; it is the worked example.

```bash
WAV_ONLY=1 node scripts/make-suite2.mjs <name>   # render (~60 s), no encode
node scripts/check-mix.mjs tmp/suite2/<name>-71.wav
node scripts/make-suite2.mjs <name>              # full encode + stream verification
```

## The shape of a file

```js
export const meta = {
  name: 'ridge',            // matches the filename
  title: 'Ridge',
  dur: 56,                  // seconds; 50–60
  tempo: 84,                // bpm
  seed: 0x2A17,             // any int — renders are deterministic
  blurb: 'one sentence, what a listener hears',
  reverb: { rt60: 2.2, damp: 0.36, preDelay: 0.024, width: 1.1 },
  master: { drive: 1.2, lfeGain: 0.45 },
};

export function compose(S, O) { /* write notes into tracks */ }
```

`S` is the session: `S.rng` (seeded, deterministic — use it for every random value),
`S.bar` (seconds per 4/4 bar), `S.b(beats)` and `S.m(bars)` → seconds, `S.track(name, opts)`.
`O` is everything exported from `lib/orchestra.mjs`.

## Tracks — where a sound sits in the room

```js
const gtr = S.track('guitar', { az: -22, centre: 0.2, spread: 14, send: 0.30, gain: 1, body: O.BODY.nylon });
```

| option | meaning |
|---|---|
| `az` | azimuth in degrees. `0` dead ahead, `-90` hard left, `±150` behind you. |
| `centre` | `0..1` — anchor this much of it in the centre speaker. Leads: `0.3–0.5`. |
| `spread` | `>0` places a delayed twin at `az ± spread`. Widens without smearing. |
| `pair` | mirror everything to `-az` too. **Any pad, bed or ambience needs this** — without it one side of the room is a hole. |
| `send` | reverb send. Dry lead `0.2`, pad `0.5–0.7`, distant echo `0.8`. |
| `body` | `O.BODY.nylon / steel / archtop / upright / piano` — applied once to the whole track, like a real instrument's body. Set it on the track, never per note. |
| `hp` / `lp` | corrective filtering in Hz. |
| `gain` | track fader. |

🔴 **THE FRONT SPEAKERS ARE AT ±30°, AND `spread` MOVES A TWIN OUTWARD FROM `az`.** So anything
meant to be on the front stage needs **`|az| + spread ≤ 30`**. A track at `az: -34, spread: 17` puts
a twin at −51°, which is 52 % of the way from FL to SL — over half its amplitude arrives from behind
the listener's left shoulder. That is a real bug, not a taste question: it measured as an 8.7 dB
front-pair imbalance on `weave` (the guitar bleeding rear-left while the flute sat squarely in FR).
Going past ±30 is fine when you *mean* it — stabs, ambience, a wash — but never for a lead or a
rhythm part that should sound like it is in front of you.

**Other placement rules that matter.** Lead front and near centre. Bass near centre, `az` within ±15
(low frequency has no image anyway, and a hard-panned bass unbalances the room). Rhythm parts to
the sides. Anything atmospheric goes behind with `pair: true` and a high `send`. Never put two
important voices at the same azimuth — they fight for one image.

## Instruments

All write **additively** into `track.buf`. Signature is always `(buf, t0, …, amp, rng, opts)`.
`amp: 1` peaks at ~1.0 for every voice, so levels mean the same thing across instruments.

🔴 **But PEAK is not LOUDNESS.** A sustained voice (flute, sax, strings) carries energy for the whole
length of a note; a plucked or struck one (guitar, piano, drums) is a spike that decays. Write them
at the same `amp` and the sustained one measures ~10 dB hotter — which is exactly what threw
`weave`'s front pair 7 dB out of balance before its track gains were set. **When two voices are
meant to be equal partners, set `gain` until their TRACKS measure the same, not until their numbers
look the same.** Print per-track RMS to check; do not eyeball the amps.

```js
O.flute(buf, t0, dur, f, amp, rng, { vib, vibDelay, breath, chiff, scoop, legatoFrom, atk, rel, human })
O.sax  (buf, t0, dur, f, amp, rng, { kind: 'tenor'|'alto', vib, vibDelay, breath, sub, human })
O.piano(buf, t0, dur, f, amp, rng, { sustain, hammer, hard })
O.nylon(buf, t0, f, amp, rng, { decay, damp, pick, bright, mute, dur, detune })
O.steel(buf, t0, f, amp, rng, { …same… })
O.bass (buf, t0, f, amp, rng, { …same… })
O.pluck(buf, t0, f, amp, rng, { …same… })       // the raw string, for custom voicings
O.strum(buf, t0, [f…], amp, rng, { spread: 0.018, up: false, voice: O.nylon, …pluckOpts })
O.strings(buf, t0, dur, f, amp, rng, { voices, spread, atk, rel, bright })
O.kick / O.snare / O.hat / O.shaker / O.cymbal (buf, t0, amp, rng, opts)
```

Notes on the plucked voices: they **ring out** by default. Pass `dur` to damp them at a length
(a fretting hand lifting). `decay` is the RT60 in seconds, `damp` is colour (higher = darker),
`pick` is pick position (`0.1` bridge/nasal, `0.35` soundhole/round), `mute` `0..1` palm-mutes.

Pitches: `O.n('A3')` → 220. `O.st(f, semitones)` transposes. `O.chord('C3', [0,3,7])` →
frequencies. `O.degree('D4','dorian', 4)` → a scale degree. Never write raw Hz.

## What makes it not sound synthesized

The engine models breath, inharmonicity, bodies and a room. **You** have to supply the playing:

1. **Never quantise.** Add `S.rng() * 0.006` to every note's start. Real players are ±5 ms.
2. **Never play flat.** Vary `amp` note to note — lean on downbeats, give way on offbeats.
   A phrase that ends at the same volume it started sounds typed.
3. **Vary the repeat.** A hook stated three times identically is a loop. Change the octave, the
   register, the accompaniment, who is playing it.
4. **Leave space.** Rests are what make the next entry land. A wall of continuous notes is the
   most synthetic thing you can write.
5. **Legato on the flute**: pass `legatoFrom: previousFreq` so it slurs instead of re-attacking,
   and drop `chiff` to ~0.15 on slurred notes.
6. **Build.** `check-mix.mjs` requires ≥4 dB between the quietest and loudest part; aim for 8–12.

## And what makes it catchy

A four-bar melodic hook you could hum after one hearing, stated at least three times with the
arrangement changing underneath. Steps and small leaps, one big leap to a high note that lands
on a strong beat, then a walk home. Form: intro → A → A′ → B (something new) → A″ (biggest) →
short close. Harmony: pick a four-chord loop and stay on it; a piece this short cannot afford
to modulate more than once.

## Gates a piece must pass

`node scripts/check-mix.mjs tmp/suite2/<name>-71.wav` must print `ok`:
left/right balance within 6 dB per pair · surrounds within 26 dB of the front · centre within
30 dB · dynamic range ≥ 4 dB · nothing clipping · no dead channel.
Then `node scripts/make-suite2.mjs <name>` must complete — it re-reads every encoded file and
asserts its real channel count and duration.
