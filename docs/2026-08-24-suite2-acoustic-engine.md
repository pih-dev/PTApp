# Suite 2 — the acoustic engine and the seven pieces

**2026-08-24.** Pierre, after hearing the v2.31 showcase suite:

> "Can you compose a few more, like another five? I like the flute. I like the saxophone… not
> necessarily. Saxophone if used sparingly, and guitars. I like guitars. So you don't have to mix
> them all in one composition. Compose a couple with the flute, compose a couple with the guitar,
> compose probably one take where two are in there. Can you compose one with the piano? And try not
> to make them sound synthesized. Of course, the original request that still stands, which is high
> quality Dolby 5.1 or Atmos 7.1, and it has to be catchy… you can make them fifty seconds or a
> minute each."

Seven pieces, 52–58 s each, on a new instrument engine.

---

## 1. Why the first suite sounded synthesized

`make-opening-suite.mjs` is additive synthesis: sine, saw and square oscillators with amplitude
envelopes. That is not a matter of taste — it is the diagnosis. **A real instrument is four things
an oscillator has none of:**

| | what it is | what the v2.31 suite had |
|---|---|---|
| **noise** | breath, bow, pick, hammer, air | none |
| **inharmonicity** | partials that are *not* exact integer multiples | none |
| **a body** | wood and air resonating at fixed frequencies | none |
| **a room** | early reflections and a diffuse tail | none |

`scripts/lib/orchestra.mjs` models all four. It is the whole of the difference.

### The voices

- **flute** — jet chiff at the attack; breath noise band-limited around 3.6·f₀ whose level **tracks
  the amplitude envelope** (a quiet flute is proportionally *airier*, which is what makes it read as
  blown rather than just small); vibrato that begins ~280 ms *after* the note, because no player
  vibrates on an attack; a pitch scoop into the note; independent starting phase per partial.
- **guitar** — extended Karplus–Strong. A delay-line string with a **first-order allpass** for the
  fractional sample (without it every note is a few cents sharp), a one-pole loop filter for string
  and finger losses, and a **pick-position comb** on the excitation — which is why a bridge pluck is
  nasal and a soundhole pluck is round. The body is a separate parallel resonance bank applied once
  to the whole track, exactly as one guitar has one body.
- **piano** — partials at `fₙ = n·f₀·√(1+Bn²)`, with B rising steeply into the treble. Per-partial
  decay (highs die first), a double-decay envelope, **two strings detuned by ~1.2 cents so they
  beat**, a filtered hammer thump, and a damper on release. The inharmonicity alone is most of the
  difference between "piano" and "organ".
- **sax** — an asymmetric reed pulse through three fixed **formants**, plus a breath channel that
  **bypasses the formants** (air escapes around the reed and out the bell; filtering all the noise
  through narrow resonators made it tonal again — measured, then fixed).
- **the room** — an 8-line feedback delay network with a Householder matrix, damped and slowly
  modulated. Its **seven outputs are decorrelated by construction**, so the tail genuinely surrounds
  instead of being one stereo reverb copied to six speakers.

### And the playing, which is not the engine's job

Timbre alone does not fix it. Every piece jitters note starts by ±6 ms, varies amplitude note to
note (downbeats lean, offbeats give way), slurs flute phrases with `legatoFrom` so a phrase is one
breath rather than a row of attacks, and leaves real rests. `boulevard` swings every offbeat eighth
to 62 % of the beat. A dead-steady note is heard as a machine no matter how good the timbre is.

---

## 2. The two gates

A synthesis bug is silent: the file renders, the peak is fine, and it sounds wrong. So both are
measured, not eyeballed.

**`node scripts/check-orchestra.mjs [--wav]`** renders one note per voice and measures pitch
(autocorrelation), spectral centroid, **periodicity** and the −20 dB decay against what that
instrument physically does. A bare sine is included as the control: it measures **1.000** periodicity
— that number *is* "sounds synthesized" — while the modelled voices sit at 0.94–0.99. `--wav` writes
each voice alone to `tmp/orchestra-check/` for a human ear.

**`node scripts/check-mix.mjs`** reads a rendered 7.1 file back and asserts left/right balance per
pair, that the surrounds carry something, that the centre is anchored, that the piece actually
builds (≥4 dB), and that nothing clips or is dead. It caught the entire string bed of `ivory` sitting
on the right — SL at −38 dB against SR at −24 dB, a **14 dB hole on the listener's left** that
encoded and played perfectly. That finding produced the `pair: true` track option.

---

## 3. One arrangement, three deliverables

🔴 The v2.31 suite needed **two scripts kept in step by hand** (`make-opening-suite.mjs` and
`-51.mjs`, `CLAUDE.md` TRAPS → Tooling) because stereo and 5.1 were written twice. That is fixed
structurally, not by discipline: a piece is composed **once** into positioned mono tracks;
`mix()` renders 7.1, and 5.1 and stereo are **fold-downs** of it. There is no second arrangement
that can drift.

---

## 4. What Dolby we can actually ship

**Verified against this ffmpeg 9.0 build, not assumed.** `ffmpeg -h encoder=eac3` lists its supported
layouts and they **stop at 5.1** — so do `ac3` and `truehd`. Encoding 7.1 as E-AC-3 fails outright:
*"Channel layout '7.1' is not supported by the eac3 encoder"*. And **Dolby Atmos is further out of
reach again**: it needs JOC object metadata (or TrueHD+Atmos), which only the licensed Dolby encoder
produces. No ffmpeg build can make an Atmos file.

So the honest split, and the four files each piece ships as:

| file | codec | channels | what a soundbar shows |
|---|---|---|---|
| `SpotSet-<name>.m4a` | AAC 256k | 2 | — (phone, PC, the app) |
| `SpotSet-<name>-DolbyDigital-5.1.mp4` | AC-3 640k | 6 | **Dolby Digital** |
| `SpotSet-<name>-DolbyDigitalPlus-5.1.mp4` | E-AC-3 448k | 6 | **Dolby Digital Plus** |
| `SpotSet-<name>-7.1.mp4` | AAC 512k | 8 | 7.1 / 8-channel PCM, no Dolby lamp |

The 7.1 file really is eight discrete channels. It just cannot carry a Dolby badge. Each is
re-probed after encoding and its real channel count and duration asserted — `gradlew exits 0 on a
failed build` taught this project not to trust an exit code.

---

## 5. The seven pieces

| | key / tempo | lead | in one line |
|---|---|---|---|
| **ivory** | C minor · 92 | piano | A four-bar hook stated four ways; strings arrive only at the last. |
| **ridge** | D dorian · 84 | flute | Wide and cinematic. A rising fourth, a long view, one cymbal swell. |
| **lantern** | A minor · 66 | flute | The quiet one. Breathy flute and fingerpicked nylon, a small room at night. |
| **harbour** | E minor · 100 | nylon guitar | Two guitars, a syncopated hook, brushes, walking bass. |
| **drive** | A mixolydian · 118 | steel guitar | A palm-muted riff, full kit, and a two-bar break that resets it. |
| **weave** | G major · 96 | flute **and** guitar | Call and response, until they finally play the hook together in sixths. |
| **boulevard** | G minor · 92 | guitar, **sax as guest** | Jazz box and walking bass; the tenor shows up twice and is silent for 15 of 22 bars. |

**On the saxophone.** Pierre said *"sax if used sparingly, and guitars"*, so in `boulevard` the sax
is a guest, not the leader: it states the tune at bars 10–13 and takes it out at 18–20, and is silent
everywhere else — seven bars of twenty-two. An instrument that never stops has no entrances.

**On "catchy".** Every piece is one four-bar hook stated at least three times, with the arrangement
changing underneath each time; a four-chord loop it never leaves for more than one section; and an
arch shape with a single high point on a strong beat. Restating a hook identically is a loop, not
an arrangement — so no piece does.

---

## 6. Running it

```bash
node scripts/check-orchestra.mjs          # the voices still measure as instruments
WAV_ONLY=1 node scripts/make-suite2.mjs <name>   # ~60–150 s per piece, no encode
node scripts/check-mix.mjs                # every rendered 7.1 file
node scripts/make-suite2.mjs              # all seven, full encode + stream verification
```

Renders are deterministic — same seed, same bytes, every run.

Output: `_archive/PTApp/branding/2026-08-23-suite2/`. Adding a piece is one new file in
`scripts/suite2/`; the runner picks it up. The composer's API is `scripts/suite2/README.md`.
