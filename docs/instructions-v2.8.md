# PTApp Instructions — v2.8

v2.8 is a **single-feature release** focused on the session count. Nothing else changed — sync, clients, scheduling, WhatsApp, themes, and language all work exactly the same as v2.7.

For the full feature walkthrough, see [`instructions-v2.5.md`](instructions-v2.5.md). For v2.6 (sync reliability) and v2.7 (upcoming sessions), see their respective docs.

---

## What Changed in v2.8

**You can now manually override the session count for a client within the current billing period.**

Before v2.8, the session count was computed automatically from the scheduled/completed sessions in each period. If you disagreed with the count — a session was entered twice, a paper record said otherwise, the client insisted it was different — your only options were to book a retroactive session (polluting history with a fake entry) or cancel-without-count an existing one (polluting history with a fake cancellation).

v2.8 introduces a clean, non-destructive override.

**How to use it:**

1. Open a client in the Clients tab. Tap Edit.
2. Scroll to the **Manual count override** section at the bottom of the edit modal.
3. In the small input field, type:
   - A whole number like `10` to **set the count directly** (overrides everything).
   - `+1` or `-1` (or any `+N` / `-N`) to **adjust the automatic count**.
   - Leave it empty to use the automatic count.
4. Tap Save.

The preview line next to the field updates as you type: `Auto 12 → 13`.

**You can also edit the override from the booking popup.** Right after booking a session, the confirmation popup shows `Auto N → M` with a pencil (`✎`) button next to it. Tap the pencil to change the override on the spot, then tap Send WhatsApp — the message will use the new value.

**Long-press the override field** (hold for half a second) to bring up a help popup explaining the syntax, with a one-tap **Clear override** button.

**Where the override shows up:**
- On every session card in the Home tab (`#12 → 13` next to the client name).
- On every session card in the Schedule tab.
- On every row in the Sessions tab.
- On the client's chip during the booking flow (a bit compact: `(12→13)`).
- In every WhatsApp message whose template uses the `{number}` placeholder — booking confirmations AND reminders. The message body itself has a single number (the effective one); the `12 → 13` style is only inside the app.

**What does NOT change:**
- The client list card still shows the **lifetime** session count (not per-period). The override is period-scoped, so it doesn't affect that number.
- The `Auto` count itself is unchanged — sessions are still counted the same way, the override just layers on top.
- The Today stat, weekly stat, focus tags, cancel flow, and sync architecture are all untouched.

**What you should know about the automatic clear:**

The override is **tied to the billing period it was set in**. When a new period starts (next calendar month for default clients, or the next 4-week / 2-week / 1-week boundary for custom periods), the override stops applying — the UI goes back to showing just the auto count, and WhatsApp messages go back to the auto value.

This is intentional: most overrides exist to correct a one-time discrepancy for *this* period. Carrying a `+1` across months would silently inflate the next month's count.

If you want the override to persist into the new period, just open the client and re-enter it — takes a second.

**Visibility improvement (small but noticeable):**

The session count on the client list card was hard to read in both themes — dim against the background. v2.8 bumps its visibility so you don't need to squint. The pattern applies everywhere `Auto N` appears in the app.

---

## Tips

- **Negative deltas are clamped at zero.** If the auto count is 1 and your delta is `-5`, the display and the WhatsApp message show `0`, not a negative number.
- **`+0` and `-0`** are treated as no-op and clear the override.
- **Non-numeric input** (letters, decimals) is rejected — the field stays at the previous valid value or clears.
- **Data is preserved.** Old overrides from expired periods sit inert in storage — they're just not applied. Clearing the field on any save sweeps the stale data out if you want.

---

## Previous Versions

- v2.7 — Upcoming Sessions on Dashboard (shows tomorrow's sessions tonight)
- v2.6 — Bulletproof sync (Hala Mouzanar data-loss fix)
- v2.5 — Visual polish, light theme redesign, i18n, todos
