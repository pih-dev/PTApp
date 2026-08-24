# suite3 — the showcase suite, on real instruments

**The brief, in Pierre's words (2026-08-24):**

> "The only difference from the original ones should be **real instruments instead of synthetic**."

The reference is the **v2.31 showcase suite** — `scripts/make-opening-suite.mjs`. Those five pieces
(anthem, engine, orbit, pulse, cascade) were built from sine, saw and square oscillators and they
were **punchy, cinematic and catchy**: app-opening music, trailer music. Pierre liked the *music*.
He did not like that it sounded synthesized.

He also rejected a previous attempt (`scripts/suite2/`) in one line:

> "They're very bad… when I told you I like guitars and flute, you just did everything with those."

**So do not write chamber music.** These are showcase pieces for an orchestra. A flute or a guitar
may lead **one** piece; it must not lead all of them. Read `anthem.mjs` — it is the worked example
and it sets the register the whole suite plays at.

```bash
WAV_ONLY=1 node scripts/make-suite.mjs <name>          # render (~60–90 s), no encode
node scripts/check-mix.mjs tmp/suite3/<name>-71.wav    # must print ok
node scripts/make-suite.mjs <name>                     # full encode + verification
```

Output is **5.1 only** now (plus a stereo file for auditioning). The mixer still renders 7.1
internally — 5.1 is a fold-down of it, and a rear imbalance is only visible before the fold.

## The shape of a file

```js
export const meta = {
  name: 'engine', title: 'Engine',
  dur: 56,            // seconds; 50–60
  tempo: 112,         // bpm
  seed: 0xE1901,      // any int — renders are deterministic
  blurb: 'one sentence, what a listener hears',
  reverb: { rt60: 2.6, damp: 0.32, preDelay: 0.028, width: 1.2 },
  master: { drive: 1.2, lfeGain: 0.5, loudness: -17 },   // loudness in dBFS
};
export function compose(S, O) { /* write notes into tracks */ }
```

`S.rng` (seeded — use it for **every** random value), `S.bar` (seconds per 4/4 bar),
`S.b(beats)` / `S.m(bars)` → seconds, `S.track(name, opts)`. `O` is everything from
`lib/orchestra.mjs`.

## The orchestra

```js
O.brass       (buf, t0, dur, f, amp, rng, { kind:'horn'|'trombone'|'trumpet'|'tuba',
                                            bite, vib, vibDelay, air, atk, rel, swellTo })
O.brassSection(buf, t0, dur, f, amp, rng, { players:3, spreadMs, detune, ...brassOpts })
O.stringHit   (buf, t0, dur, f, amp, rng, { voices, bite, bright, spread })  // marcato/ostinato
O.strings     (buf, t0, dur, f, amp, rng, { voices, spread, atk, rel, bright })  // sustained
O.timpani     (buf, t0, f, amp, rng, { decay, hit, roll })   // roll = seconds, crescendos
O.taiko       (buf, t0, amp, rng, { f0, f1, decay, skin, drop })
O.choir       (buf, t0, dur, f, amp, rng, { vowel:'ah'|'oo'|'eh', voices, atk, rel })
O.pizz        (buf, t0, f, amp, rng, { decay, damp, bright })
O.harp        (buf, t0, f, amp, rng, opts)      O.gliss(buf, t0, [f…], amp, rng, { step, accel, voice })
O.tubular     (buf, t0, f, amp, rng, { decay }) // f = the pitch you want to HEAR
O.glock       (buf, t0, f, amp, rng, { decay })
O.riser       (buf, t0, t1, fLo, fHi, amp, rng, { voices, trem })
O.cymbal      (buf, t0, amp, rng, { decay, f, crash, modes })
```

And still available, for the piece that wants one: `O.flute`, `O.sax`, `O.nylon`, `O.steel`,
`O.piano`, `O.bass`, `O.strum`, `O.kick`, `O.snare`, `O.hat`, `O.shaker`.

Pitches: `O.n('A3')` → 220, `O.st(f, semitones)`, `O.chord('C3',[0,3,7])`,
`O.degree('D4','dorian',4)`. **Never write raw Hz.**

`amp: 1` peaks at ~1.0 for every voice. 🔴 **But peak is not loudness** — a sustained voice carries
energy for a whole note, a struck one is a spike that decays, so written at the same `amp` a horn
measures ~10 dB hotter than a pizzicato. When two voices should be equal partners, set the track
`gain` until their **tracks** measure the same, not until the numbers look the same.

## Tracks — seating an orchestra

| option | meaning |
|---|---|
| `az` | azimuth, degrees. `0` ahead, `-90` hard left, `±150` behind. |
| `centre` | `0..1` — anchor this much in the centre speaker. Leads: `0.25–0.4`. |
| `spread` | delayed twin at `az ± spread`. Widens without smearing. |
| `pair` | mirror to `-az` as well. **Only for things that should surround you.** |
| `send` | reverb send. Dry `0.2`, section `0.4–0.55`, hall/choir `0.7+`. |
| `body` | `O.BODY.nylon / steel / archtop / upright / piano` — once per track, never per note. |
| `hp` / `lp` | corrective filtering, Hz. |
| `gain` | track fader. |

🔴 **THE FRONT SPEAKERS ARE AT ±30°, AND `spread` MOVES A TWIN OUTWARD.** Anything on the front
stage needs **`|az| + spread ≤ 30`**. Past that it starts arriving from behind the listener — which
is right for a choir and wrong for first violins.

🔴 **Seat a real orchestra, don't spread azimuths to fill speakers.** From the audience: first
violins left, violas centre, cellos right, basses centre-low, brass behind the middle, percussion
behind them, choir out in the hall. An orchestra is a **picture in front of you**, not a ring around
you — so almost nothing is `pair: true` except the choir and the room. `anthem.mjs` does exactly
this; copy its layout unless your piece has a reason not to.

## What makes it not sound synthesized

The engine models breath, inharmonicity, bodies and a room. **You supply the playing:**

1. **Never quantise.** `+ S.rng() * 0.006` on every note start.
2. **Never play flat.** Vary `amp` note to note — lean on downbeats, give way on offbeats.
3. **A section is not one loud player.** Use `brassSection` / `stringHit`'s `voices`, never one
   voice turned up. The spread of attacks and tunings is most of what "orchestra" means.
4. **Brass brightness IS dynamic.** `bite` opens the filter; a soft horn is nearly a sine and a loud
   one blazes. Use `bite: 0.7–0.85` when it is under something and `1.1–1.3` at the climax — do not
   just change `amp`.
5. **Leave space.** Take the brass out for a section so it has somewhere to come back from.
   Everything loud all the way through has no climax.
6. **Build.** `check-mix` requires ≥4 dB of range; aim for 8–12.

## And what makes it a SHOWCASE piece

- **An opening gesture in the first two bars.** The v2.31 suite opened on a swell and two hits; do
  the acoustic equivalent — a timpani roll that speeds up, two big hits, a chord blooming open.
- **A four-bar theme you could hum after one hearing.** State it at least three times, changing what
  is underneath every time — bare, then the section, then everything.
- **A four-chord loop, stayed on.** A piece this short cannot modulate more than once.
- **A real climax, then a real ending.** A final hit and a decay, or a hard stop. Never a fade.
- **Punch.** These sit under a logo. Timpani, taiko and low brass are what make a piece land.

## Gates

`node scripts/check-mix.mjs tmp/suite3/<name>-71.wav` must print `ok` — L/R balance within 6 dB per
pair, surrounds within 26 dB of the front, centre within 30 dB, dynamic range ≥ 4 dB, no clipping,
no dead channel. Then `node scripts/make-suite.mjs <name>` must complete; it re-reads every encoded
file and asserts its real channel count and duration.
