# v2.14.3 — Arabic phrasing pass: the transliteration rule (2026-07-17)

UI/copy only. No schema change, `DATA_VERSION` stays 6, `EXERCISE_BANK_VERSION` untouched.
Follows directly from v2.14.2 (`docs/instructions-v2.14.2.md`), which pre-authorised this
phrasing-correction loop.

**Trigger:** Elie's standing rule, relayed by WhatsApp voice note (he was **not** at the keyboard for
this one — v2.14.1 and v2.14.2 were driven by him in-session).

> Written 2026-08-03 during the CLAUDE.md slim-down — v2.14.3 shipped with changelog entries but no
> instructions file of its own. This closes that gap.

---

## The rule (this is the durable part)

> **When a literal Arabic translation wouldn't be understood in the gym, use the English term
> written in Arabic letters.**

Elie's example: **Block** is **بلوك**, not مرحلة. Coaches and clients in Lebanese gyms say the
English word; the dictionary-correct Arabic reads as unfamiliar jargon.

**This rule governs every future Arabic entry** — new exercise names, new program labels, new UI
copy. It is recorded in the header comment of `src/exerciseNamesAr.js` so the next person editing
that map sees it before adding a line.

---

## What changed

- **`i18n.js`** — AR `blockLabel`: `'مرحلة'` → `'بلوك'` (Elie's explicit example).
- **`src/exerciseNamesAr.js`** — 8 entries re-phrased:

| English | Was → Now |
|---|---|
| Cable Crossover Fly | → كروس أوفر بالكيبل |
| Tornado Ball Twist | → التواء كرة تورنادو |
| Stir the Pot Plank | → بلانك ستير ذا بوت |
| 4× Offset | → أوفست |
| Deficit Deadlift | → ديدلفت ديفيسيت |
| Battling Ropes Rainbow | → قوس الحبال (باتل روبس) |

(Nine labels in total counting `blockLabel`; the table lists the exercise-map entries.)

---

## Why this was safe to ship as a point release

`EXERCISE_NAMES_AR` is keyed by the **exact English `name` frozen in program records**, and lookup
happens **at display time**, never at generation time. Re-phrasing a value therefore changes what old
and new programs alike display, with no migration and no stored-data change. A missing key falls back
to English — never blank.

---

## Provenance / governance

Requested by voice note rather than in-session, and applied under the same trust basis as v2.14.1–.2.
**On 2026-07-18 Pierre confirmed these approvals and granted Elie standing authority** — see the
Governance section of `CLAUDE.md`. Revert paths: `docs/instructions-v2.14.2.md`,
`docs/elie-next-visit.md`.

---

## Source

- `docs/changelog-summary.md` → "v2.14.3 — Arabic phrasing tune-up"
- `docs/changelog-technical.md` → "v2.14.3 — Arabic phrasing pass: transliteration rule"
- Deploy commit: `1e337a9` — *Deploy v2.14.3: Arabic phrasing pass (transliteration rule)*
