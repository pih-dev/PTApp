# The music engine, and three shelved suites

**2026-08-24. THE MUSIC THREAD IS SHELVED — Pierre's instruction. All three attempts were
rejected; the v2.31 synthetic five that ship in the app are still the best music anyone has made
here, and the app is untouched.** This is the record of what was built, what he said about each, and
what is worth keeping. Resume state: `HANDOFF-music.md`.

### The three attempts, and his verdict on each

**Round one — `scripts/suite2/`, seven acoustic chamber pieces.** From: *"I like the flute… sax if
used sparingly, and guitars… can you compose one with the piano? Try not to make them sound
synthesized."* A flute or a guitar led every one.

> "They're very bad. When I told you I like guitars and flute, you just did everything with those.
> **The only difference from the original ones should be real instruments instead of synthetic.**"

🔴 That last sentence was the specification all along and it was under-weighted. The reference was
never a genre — it was the work already approved, the v2.31 showcase suite. A named preference
constrains the *palette*; it does not specify the deliverable. (Standing lesson in memory:
`feedback_preference_is_not_a_spec`.)

**Round two — `scripts/suite3/`, seven orchestral showcase pieces.** The v2.31 pieces re-scored for
an orchestra, six of them composed by Fable 5 agents at max effort. Instrument variety was fixed —
the flute led exactly one piece and the guitar one.

> "None of them are enjoyable to listen to. There's no harmony. They're not catchy. I felt bleakness
> listening to them… The only one I could listen to is `engine`. It's okay. It's fine. It's not
> good. It's not great."

**Round three — `scripts/make-suite1-real.mjs`, the shipped five re-voiced.** From: *"the five that
are in the app are really good actually, compared to this. Preserve them as they are, but do a pass
on them so they wouldn't sound synthetic."* The notes were frozen in a shared score and only the
instruments changed — provably, see §3.

> "There's something not right about them. Certain bits of them are good, but there are things that
> are majorly wrong. They're not usable. So just shelf them, we'll get back to the music later."

### What that means for whoever picks this up

- **The engine is not the problem, and it is proven.** Round one's own brief — *"try not to make them
  sound synthesized"* — was met: he confirmed round two "sound more realistic than synthesized". The
  failures after that were **musical**, and in round three timbral-detail, not synthesis quality.
- **Do not start by writing new compositions.** Two rounds of new music were rejected and the pieces
  he rates highest are the ones that already ship.
- **Round three is the closest thing to a live lead**: same music he likes, and he could hear
  specific things wrong rather than disliking it wholesale. Nobody has yet found out *which* things —
  that is the first question to ask him, and it needs one concrete example, not a general re-do.
- **Nothing shipped changed.** `public/opening-*.m4a` are byte-identical to what they always were,
  and that is verified rather than assumed (§3).

---

## 1. Why the v2.31 suite sounded synthesized

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

## 5. Suite 3 — the orchestral showcase set (rejected: "not enjoyable… bleakness")

The v2.31 pieces re-scored for a real orchestra: same names, same job, same shapes. Voices added for
it, each modelling the thing that actually identifies the instrument rather than approximating its
spectrum:

- **brass** — 🔴 **brightness tracks dynamic.** The lowpass cutoff is driven by the envelope, so a
  softly blown horn is nearly a sine and the same horn fortissimo blazes. That, not the waveform, is
  what separates brass from a synth-brass preset. Plus a bell resonance, and breath that *bypasses*
  it. **`brassSection`** plays one line with several players, none of them together.
- **timpani** — near-harmonic membrane modes `1 : 1.504 : 1.742 : 2`; the kettle's air loading is
  the entire reason a timpano has a pitch and a snare does not. Its **roll** is many uneven strokes
  that speed up, not a tremolo — a perfectly regular roll reads as a modulated tone.
- **stringHit** — bowed marcato with rosin bite at the front of every stroke. An ostinato without
  that bite is the most synthetic thing in cinematic music.
- **tubular** — partials `2:3:4:5.4…`, so the pitch you hear is a **missing fundamental** the ear
  reconstructs. **glock** — bar modes `1 : 2.76 : 5.40`. **choir** — formant vowels with per-singer
  pitch drift. Plus **taiko**, **pizz**, **harp**, **gliss** and **riser**.

**Seating is a real orchestra, not a spread of azimuths chosen to fill speakers.** From the
audience: first violins left, violas centre, cellos right, basses centre-low, brass behind the
middle, percussion behind them, choir out in the hall. Almost nothing is `pair: true` — an orchestra
is a picture in front of you, not a ring around you.

**5.1 only** from this round, per Pierre: *"you don't have to do seven point one, just five point
one. And if I like them, you can generate the two channels for the app."* The mixer still renders
7.1 internally because 5.1 is a fold-down of it, and a rear imbalance is only visible before the
fold.

---

## 6. Suite 2 — the acoustic chamber set (rejected: "very bad")

Rejected as a set, kept because it is where the engine and both gates came from — every finding in
sections 1 to 4 above was made building it.

| | key / tempo | lead | in one line |
|---|---|---|---|
| **ivory** | C minor · 92 | piano | A four-bar hook stated four ways; strings arrive only at the last. |
| **ridge** | D dorian · 84 | flute | Wide and cinematic. A rising fourth, a long view, one cymbal swell. |
| **lantern** | A minor · 66 | flute | The quiet one. Breathy flute and fingerpicked nylon, a small room at night. |
| **harbour** | E minor · 100 | nylon guitar | Two guitars, a syncopated hook, brushes, walking bass. |
| **drive** | A mixolydian · 118 | steel guitar | A palm-muted riff, full kit, and a two-bar break that resets it. |
| **weave** | G major · 96 | flute **and** guitar | Call and response, until they finally play the hook together in sixths. |
| **boulevard** | G minor · 92 | guitar, **sax as guest** | Jazz box and walking bass; the tenor shows up twice and is silent for 15 of 22 bars. |

**On "catchy" — which applies to both suites.** Every piece is one four-bar hook stated at least three times, with the arrangement
changing underneath each time; a four-chord loop it never leaves for more than one section; and an
arch shape with a single high point on a strong beat. Restating a hook identically is a loop, not
an arrangement — so no piece does.

---

## 6b. Round three — the shipped five, re-voiced

`scripts/make-suite1-real.mjs`. Not a new composition: **the notes are frozen and only the
instruments move.** `lib/suite1-score.mjs` holds the eight v2.31 compositions with their bodies
unchanged, and BOTH renderers run it — `make-opening-suite.mjs` with the oscillators,
`make-suite1-real.mjs` with the modelled instruments. There is one copy of the music, so a note
cannot drift between them.

Substitutions: filtered white noise → a cymbal roll where the score builds and high string tremolo
where it shimmers (the most synthetic sound in the originals, and gone entirely) · saw stacks →
brass, short calls as section stabs and long ones as swelling braams · the square chip voice →
bowed marcato with a glockenspiel giving back the edge · plucks → harp with pizzicato doubling ·
bells → glockenspiel (their 1 : 2.76 : 5.4 partials were already the bar series) · kicks → a concert
bass drum plus a timpano tuned to the kick's own landing pitch, so the drum can never disagree with
harmony the score already set.

**Three guards, because "the music did not change" is a claim that has to be measurable:**

1. the synthetic renderer still produces **md5-identical** output to the five shipped `m4a` files —
   run it with `OUT_DIR=tmp/verify` so verification can never overwrite the assets it verifies;
2. `make-suite1-real.mjs` **throws** if any raw oscillator escapes the voice table into L/R;
3. `scripts/check-arrangement.mjs` compares the two renders' energy envelopes in 250 ms windows —
   all five correlate 0.72–0.86.

🔴 **The kick's tail is tuned by MEASUREMENT, not derivation.** Matching the score's decay *rate*
(the obvious move) correlates worse than the empirical value — 0.66 against 0.76 on `engine` —
because the two envelopes multiply different spectra, so a matched rate is not a matched audible
tail. Factors 6, 9, 14, 20, 27 and 34 were rendered and measured; 34 ships. Do not "correct" it.

Everything shipped is preserved with checksums in
`_archive/PTApp/branding/2026-08-24-suite1-preserved/`; the re-voiced files are in
`-suite1-real/`. Rejected as not usable — see the header.

---

## 7. Running it

```bash
node scripts/check-orchestra.mjs                        # 29 voices + 5 comparative claims
WAV_ONLY=1 node scripts/make-suite.mjs <name>           # ~60–150 s per piece, no encode
node scripts/check-mix.mjs                              # every rendered 7.1 file
node scripts/make-suite.mjs                             # a whole set, encode + verification
node scripts/make-suite-page.mjs                        # the audition page
```

All four take `--set=suite3` (default) or `--set=suite2`. Renders are deterministic — same seed,
same bytes, every run.

Output: `_archive/PTApp/branding/2026-08-24-suite3/`. Adding a piece is one new file in
`scripts/suite3/`; the runner picks it up. The composer's API is `scripts/suite3/README.md`, and
`anthem.mjs` is the worked example.

🔴 **One runner, one page generator, one gate — each taking `--set`.** Not a second copy per suite:
that is exactly the keep-these-in-step-by-hand trap this project already fixed once, and the
temptation to fork the script for a new set is how it comes back.
