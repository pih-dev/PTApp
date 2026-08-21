# v2.16.1 — demo mode messages nobody

**Released:** 2026-08-21 · **Type:** patch · **`DATA_VERSION` unchanged (6), no migration.**

## What happened

A closed-test tester opened SpotSet on the `DEMO` dataset, tapped the WhatsApp button on the
invented clients, and **two or three of the numbers turned out to be real people's lines.**

The demo phones were invented by us, but they used **live Lebanese mobile prefixes** (70/71/76/03)
with plausible bodies — "invented" is not the same as "unassigned by the carrier". And the demo
dataset is shared by everybody: fourteen closed testers, Google's reviewer, Apple's reviewer when
that starts, and every marketing-screenshot run. The blast radius was every one of them, aimed at
strangers who never asked to be in it.

## What changed

**`openWhatsApp` now addresses nobody while `isDemo()` is true.** It opens `wa.me` with **no phone
number** — WhatsApp's documented *share this text* form. WhatsApp launches, the composed message is
fully visible, and the user picks the recipient themselves.

Three things this buys over the obvious alternative of pointing every demo client at one real
number (the trainer's, or the developer's):

1. **The feature demos better, not worse.** The tester actually reads the message the app composes
   — the booking template, the session number, the period end — which is the thing worth showing.
   A fixed real number shows the same message but sends it to somebody who did not ask for it.
2. **Nobody is contacted unless the tester deliberately chooses them.** No stray "hi" messages
   arriving at a trainer's phone mid-session from fourteen curious testers.
3. **No real person's number is hardcoded into a public repo.** `pih-dev/PTApp` is public and the
   app is one `index.html` — anything seeded into the demo data is published, permanently.

**The PT's real path is untouched.** With a sync token, or with an identity-only session and no
token at all, WhatsApp still opens straight to the client's own number exactly as before.

**The demo numbers were scrubbed anyway** — belt and braces. They are now an obvious dummy run
(`+961 70 000 0001`–`4`) rather than something that reads as a real line if it is ever displayed,
copied or dialled by a path that is added later.

## Where the code moved, and why it had to

`TOKEN_KEY`, `DEMO_TOKEN` and `isDemo()` **moved from `src/backend/githubDriver.js` to
`src/utils.js`.** Not for tidiness: `openWhatsApp` lives in `utils.js` and needs to know whether the
app is in demo mode, and `githubDriver` already imports `utils` — so importing the driver back into
`utils` would have closed an import cycle. `utils` is the leaf both sides can share.

The driver still owns every token *operation* and **re-exports both names**, so the facade
(`src/backend/index.js`), `src/sync.js` and every call site are byte-for-byte unchanged.

## Gates

- **`scripts/sanity/sanity-demo-whatsapp.mjs` is new** and is the behavioural half: it runs the real
  `openWhatsApp` under a fake DOM in all three states (demo, real token, no token) and asserts the
  URL each one produces. 🔴 It was **made to fail on purpose before being trusted** — the guard was
  removed, the gate went red naming the leaked number, the guard was restored, green again.
- **`sanity-backend-split.mjs` gained the structural half** — the token strings exist in exactly one
  place, the driver holds no second copy, the re-export still stands, and the old plausible demo
  numbers are gone. Its "moved, not rewritten" byte comparison was **narrowed to the trio that
  genuinely moved**, not loosened: what the normalisation removes, the new assertions put back.
- Full suite: 17 of 20 pass. The 3 failures are the spent live-diff gates that fail by design.
