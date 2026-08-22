# SpotSet v2.31 — the showcase suite: five pieces, and the wall

**Date:** 2026-08-22 · **Asked for by Pierre** ("maestro a full piece — punchy, catchy… 4 or 5
pieces… the animation fills across, 6 and 4 rows").

## The music

Five composed ~25-second pieces, each a real continuation of the approved opening — not a repeat:

- **anthem** — the cinematic journey: slow deep chords, sub pulses, bell pings, a rising finish.
- **engine** — the punchy one: a driving beat and a two-bar bass hook, a break, a drop.
- **arena** — the THX shape: two dozen voices sweep from everywhere into one huge held chord.
- **pulse** — a heartbeat that accelerates under three brass-dark swells.
- **orbit** — the catchy one: a four-note hook with echoes over a breathing pad.

Tap the mark and the app **shuffles** them — every loop plays the next piece. Say the word and it
ships with just your favourite instead.

## The wall

After the opening, the mark hands off to a **6 × 4 wall of the library**: the ten most distinct
rotating movements turn continuously, the other cells slowly crossfade through the rest of the 340.
Cells arrive one by one across the first half of the piece. Replay and Close as before; launch
stays the untouched 3-second opening.

## Under the hood, for the record

Frames are precomputed once behind the hero (never generated per animation frame), the whole
stagger is CSS delays off one remount, and the audio is AAC at 192k (ffmpeg installed on the PC
this session — winget Gyan.FFmpeg).
