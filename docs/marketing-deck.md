# Client-marketing deck — and the screenshot harness that feeds it

**Built 2026-08-05, at Elie's request** (Elie in-session at Pierre's keyboard, standing authority
2026-07-18). Elie asked for a PowerPoint to show PTApp to his gym clients, emphasising scheduling,
finance, language, the exercise bank, evaluation and program generation.

**The deck itself lives outside this repo** — `C:\projects\_archive\PTApp\marketing-deck\` — because
the screenshots depict client records and this repo is **public**. Nothing from that folder may be
committed here. Its own `README.md` is the operating manual; this file exists so a future session
can find it at all, and so the reusable half (the harness) is recorded where the code is.

## What shipped

`ptapp-marketing-en.pptx` and `ptapp-marketing-ar.pptx` — 14 slides each, widescreen, dark, in the
app's own palette. Speaker notes on every slide say what Elie should say while it is on the wall.
Both decks are generated from **one** `build.js`; edits made in PowerPoint do not survive a rebuild.

Slide order: title · what you get · schedule · booking · session counting · package & renewal ·
EN/AR · evaluation · evaluation result · program generation · program detail · exercise bank ·
backup & offline · close.

## The screenshot harness — this is the reusable part

`shoot.mjs` drives the **real app** on the dev server in headless Chrome (puppeteer) at 400×820 @3×
and captures 25 PNGs. Re-run it after any release whose UI changes; that is far cheaper than asking
Elie to re-shoot on his iPhone, and it cannot miss a screen.

```bash
cd C:/projects/PTApp && npm run dev                    # must be on :3000
cd C:/projects/_archive/PTApp/marketing-deck
node shoot.mjs && node shoot-blocks.mjs && node build.js
```

Three decisions in it are worth keeping:

**1. The sync token is deliberately invalid.** The app gates its setup screen on a token being
present, so a capture run needs one — but a *real* token would push the demo blob straight over the
PT's live `data.json`. `App.jsx` only sets `syncReady` after a **successful** remote fetch, so
planting a junk token gets past the gate while guaranteeing every GitHub call 401s and no push can
ever fire. The resulting red sync dot is hidden with an injected `.sync-btn{display:none}`.
**Any future capture/demo tooling must use this trick, not a working token.**

**2. The demo data is an anonymised copy of a live snapshot, not a fixture.** Base:
`_archive/PTApp/data-snapshots/2026-07-18-elie-authority-baseline.json`, transformed by
`make-demo-data.js` — all 17 clients renamed, phones faked, notes blanked, to-do list and audit log
dropped, every date shifted +25 days so "today" has sessions and the week ahead is populated.
Synthetic fixtures model what we designed; live data holds what shipped, and the screens would have
looked subtly wrong (empty months, no renewals, implausible session counts).

**3. Where the demo needed a state the snapshot didn't contain, the state was produced by the app's
own kernel — not written into the blob.** No client was at their contract limit, so the renewal
pill never appeared. `probe.mjs` imports the real `getEffectiveClientCount` from `src/utils.js`
(Vite serves `src/` as ES modules, so the page can just `await import('/src/utils.js')`), reports
each client's effective count, and two `contractSize` values were set to match. `isRenewalDue` then
decides the rest. That probe trick is useful well beyond this deck.

## Gotchas hit while building it

- **Clicking by text beats coordinates** across theme and language switches — but Arabic nav labels
  are translated, so the nav row must be indexed (`.nav-btn[1]`), not matched on "Clients".
- **The bottom-sheet `Modal` does not close on Escape.** Click `.modal-close`.
- **React swallows a raw `input.value` write.** Set through the native
  `HTMLInputElement.prototype.value` setter, then dispatch a real `input` event.
- **The last action button on a client row is Delete, not Edit.** The first run captured a
  delete-confirm sheet labelled "contract edit" and it nearly reached the deck.
- **`charSpacing` breaks Arabic cursive joining** in pptxgenjs output — letters render disconnected.
  Latin runs only.
- **pptxgenjs bullets need `breakLine: true` per run**, or every bullet concatenates into one
  run-on paragraph.
- **Light theme was captured and dropped** — `shots/18`, `shots/19`. The dark UI photographs
  better and is the app's default.

## Reachability note

This doc is reachable via `docs/README.md` only. It has **no Topic Router row**: `CLAUDE.md` sits at
21,980 B against its 22,000 B gate, so there were no bytes to spend. If the router is ever slimmed,
`marketing, deck, presentation, ppt, screenshots for Elie` are the keywords that belong here.
