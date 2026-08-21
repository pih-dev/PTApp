import React from 'react';

// Shared renderer for the v2.8 session count display.
// Renders "#12" (no override) or "#12 → 13" (override active).
//
// Why this exists:
//   Five different render sites (Dashboard expanded + compact, Schedule day view,
//   Schedule client chip, Sessions list) all need the same logic. Extracting
//   prevents the "pattern applied in one place" drift that hit the UTC bug —
//   see CLAUDE.md TRAPS for that incident.
//
// Props:
//   auto      — automatic ordinal/count (always shown)
//   effective — number the PT wants to communicate (shown only when different from auto)
//   override  — the raw override object, or null. Used to decide whether to render
//               the pair (even if auto happens to equal effective, e.g. absolute override
//               that happens to match auto, we still show just the solo — less noise).
//   prefix    — default "#" (session ordinal). Pass "" for pure count displays
//               where a # prefix would read wrong (e.g. the booking-flow client chip).
export default function SessionCountPair({ auto, effective, override, prefix = '#' }) {
  // 🔴 null = the session has no ordinal, because it is a cancel the PT forgave
  //    and forgiven cancels do not consume a paid session. Render NOTHING rather
  //    than a number: before P6 this path printed whatever the next session's
  //    number would be (37 such badges in the live data, e.g. "#11" on a session
  //    that counts for zero), which reads as a real position and is not one.
  if (auto == null) return null;
  if (!override || auto === effective) {
    return <span className="count-auto-solo">{prefix}{auto}</span>;
  }
  return (
    <span className="count-pair">
      <span className="count-auto">{prefix}{auto}</span>
      <span className="count-arrow">→</span>
      <span className="count-effective">{effective}</span>
    </span>
  );
}
