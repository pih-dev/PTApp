# Three audiences, one settings sheet — the dev surface vs the product

**Date:** 2026-08-22 · **Status:** BRAINSTORM, nothing decided. Pierre thinking out loud.
**Trigger:** *"The three dots at the top right, which opens the general — this is a patchwork. The
entire thing is a patchwork… most of it is not for usability, it's for debugging and testing."*

🔴 This file exists so the thought is not lost. **No code changes follow from it until Pierre rules.**

---

## 1. The actual finding

The General sheet is not one thing. It is **three different audiences' surfaces stacked in one
menu**, and they were stacked there because it was the only place that existed.

| In General today | Who it is actually for |
|---|---|
| Movement library | **The user.** Product content — and per the nav review it should not be here at all. |
| Norm charts | **The user.** Reference used during an evaluation; belongs next to evaluations. |
| WhatsApp templates | **The user.** Genuine per-coach configuration. |
| Cloud backup / restore | **The owner.** Business-continuity plumbing, not a daily control. |
| Update sync token | **The developer.** Disappears entirely once auth is Supabase-primary. |
| App instructions (the `DOCS.instructions` doc) | **The tester.** Release notes wearing a menu item. |
| What changed | **The tester.** |
| To-do list | **The tester.** Pierre's own words: *"maybe keep them for the users while testing."* |
| Reset defaults | **The developer.** |
| Sign out | **The user.** |
| Debug panel (long-press the version badge) | **The developer.** Already correctly hidden. |

**The pattern:** every time we needed to see or drive something during development, it went into
General, because General was the drawer that was open. That is the patchwork. It is not a design.

## 2. The three audiences, named

1. **The product** — what a stranger downloads from the store. A PT, their clients, their sessions.
   Nothing about SpotSet's own construction may be visible here.
2. **The tester surface** — Elie, the 12 Play testers, Pierre on his phone. Wants: what changed, how
   do I use it, here is a thing that is broken. **This is real and should survive**, because the
   testers are real people who need it — but it is a *build-time* surface, not a menu item.
3. **The dev surface** — token fields, reset, debug counters, sync internals. Should not exist in a
   store build at all.

## 3. Why this is a build question, not a menu question

The instinct to "separate what I do from the app" is right, but the separation does not belong in a
settings sheet — a menu item that is hidden by role is still shipped code, still in a PUBLIC repo,
still one `index.html`. **The honest split is at build time**, so the store bundle physically does
not contain the dev surface. That also removes a whole class of the security worry already recorded
in `HANDOFF-multi-user-build.md` §0 (no credential that can write Elie's tenant may ship in a public
bundle).

Rough shape, not a decision: a single build flag → `product` / `tester` / `dev`, with the tester
build being what goes to the closed track and the product build being what goes to production.
**Open question: can the closed-testing track and production take different bundles, or does the same
AAB get promoted?** That answer decides whether "tester" is a third build or just a runtime flag.

## 4. The hierarchy, and what is already baked

Pierre's statement of it:

- **Elie is at the top.** He has PTs under him, and he has his own clients too — he is both an owner
  and a coach, and the design must not force him to choose.
- **Another coach at Elie's level is possible but unlikely near-term.** Do not build for it; do not
  make it impossible.
- **Each PT has their own clients.**

**This is already partly built, verified this session, not recalled:** migration `0002` gives one
blob per coach in `tenants.data`, with `owner_path` establishing the parent chain, restamped in the
same transaction as a `coach_id` change so a moved coach takes their clients with them. Writes are
own-tenant-only. 🔴 But **nothing reads or writes `tenants` yet** — the app is still GitHub-primary.
So the hierarchy exists in Postgres and not in the product.

## 5. The human roles, which are not the same as the app roles

Pierre named a second axis, and it matters because it explains why the tester surface must be good
rather than merely present:

- **Pierre:** primary developer, drives the build through Claude. **And** contributes into Elie's
  specialty — observations and suggestions on the training side.
- **Elie:** personal trainer and sports specialist. **And** a developer of the product in the sense
  that he drives changes (his standing authority, granted 2026-07-18).

Both cross into the other's domain. So "feedback from a tester" is not a support queue — it is two
people co-designing, and the surface that carries it is a first-class part of how this gets built.
That is an argument for keeping a real in-app notes/to-do channel in the **tester** build, not for
deleting it.

## 6. What is NOT decided here

- Whether the to-do list survives, and for whom.
- Whether tester is a build or a flag.
- Where backup/restore lives once Supabase is primary.
- Anything about the nav itself — that is
  `2026-08-22-fresh-eyes-navigation-review.md`, and it has its own two open calls.

## 7. The one thing that IS clear

**General is a drawer, not a screen.** Every item in it should be re-asked: *which of the three
audiences is this for?* Items that answer "the developer" leave the product build. Items that answer
"the user" move to where they are used (norm charts to evaluations, the library to the bar). What is
left is small, and that small thing is the real settings screen.
