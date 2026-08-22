import React from 'react';

// A bar: collar, label, shaft, count. The section head of the design language —
// it replaced `.section-title` on the Dashboard in v2.18, and v2.25 promotes it
// to every tab (Schedule, Clients, Sessions), which is why it moved out of
// Dashboard.jsx into its own file. `children` lets a head carry a control
// (the expand toggle, the Book / Add buttons) without a second layout idiom.
export default function Bar({ label, count, children }) {
  return (
    <div className="bar">
      <span className="bar-collar" />
      <span className="bar-label">{label}</span>
      <span className="bar-shaft" />
      {count !== undefined && <span className="bar-count">{count}</span>}
      {children}
    </div>
  );
}
