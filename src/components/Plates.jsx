import React from 'react';

// Above this many sessions a disc row stops being countable at a glance, so the
// package is drawn as a loaded shaft instead. Same meaning, still never a bare
// number — 24- and 36-session contracts exist and a 36-disc row is noise.
export const PLATE_MAX = 16;

// The package, read as load on a bar: filled = used · hollow = remaining ·
// all-accent = spent and due to renew. Shared by the Dashboard renewal rows and
// every SessionCard (v2.25 — it lived inside Dashboard.jsx while only one
// screen drew it).
// used = sessions consumed in the current period · size = the contract
// due = the package is spent or expired, and the whole row goes to the accent.
export default function Plates({ used, size, due }) {
  const u = Math.max(0, Math.min(used, size)); // an override can push the count past the contract
  if (size > PLATE_MAX) {
    return (
      <div className={`plate-shaft${due ? ' is-due' : ''}`}>
        <div className="plate-shaft-fill" style={{ width: `${Math.round((u / size) * 100)}%` }} />
      </div>
    );
  }
  return (
    <div className="plates">
      {Array.from({ length: size }, (_, i) => (
        <span key={i} className={`plate${due ? ' is-due' : i < u ? ' is-used' : ''}`} />
      ))}
    </div>
  );
}
