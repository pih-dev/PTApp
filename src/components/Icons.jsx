import React from 'react';
import { SPOTSET_MARK_SVG, SPOTSET_MARK_RATIO, SPOTSET_BG_SVG } from '../spotsetMark';

// Reusable SVG icons — eliminates duplication across components.
// All icons accept `size` prop and inherit color from parent via currentColor.

export const WhatsAppIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export const EditIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

export const ClockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export const PhoneIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export const ChevronIcon = ({ size = 14, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// The SpotSet mark (B3; v2.26 = Pierre's round-2 pick): the facing pair from
// the figure library — correct mirrored left, fault right, the "> <" read —
// in the figures' own colour code. Frozen (src/spotsetMark.js — regeneration
// is deliberate, via scripts/logo-candidates.mjs --freeze). The markup is a
// build-time constant, so the injection here is static string, not user data.
// `size` is the WIDTH; height follows the frozen aspect.
export const SpotSetMark = ({ size = 24 }) => (
  <span style={{ width: size, height: Math.round(size * SPOTSET_MARK_RATIO), display: 'inline-flex' }} aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: SPOTSET_MARK_SVG }} />
);

// The backdrop (v2.26, Pierre's ask): the mark's MONO counterpart, huge and
// faint behind every screen. Positioning and opacity live in `.app-bg` —
// decoration only, pointer-events none, quiet enough that rows stay legible
// (§7.6: a picture is a ground, never a surface — honoured by opacity).
export const SpotSetBackdrop = () => (
  <div className="app-bg" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: SPOTSET_BG_SVG }} />
);

// A drawn check in a ring — the success sheet's mark. It replaces the ✅ emoji
// (v2.25): the interface draws its marks, and colour comes from the parent via
// currentColor so the same icon reads --ok on success and --warn on a cancel.
export const OkIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="8 12.5 10.8 15.2 16 9.5"/>
  </svg>
);

// A loaded bar, drawn — the empty state's mark and the first appearance of the
// design language's anchor as a picture. It replaces the 🏋️ emoji: an emoji
// strip is one of the six traits the differentiation brief identified as the
// generated look, and this app is about load on a bar.
// Deliberately NOT the logo — the mark still has to be designed (spec §10).
export const BarMark = ({ size = 56 }) => (
  <svg width={size} height={size * 0.42} viewBox="0 0 120 50" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    {/* the shaft */}
    <line x1="6" y1="25" x2="114" y2="25" />
    {/* collars */}
    <line x1="34" y1="16" x2="34" y2="34" />
    <line x1="86" y1="16" x2="86" y2="34" />
    {/* plates, outer pair lighter than the inner pair — a loaded bar reads
        symmetrical, and the eye checks that before it reads anything else */}
    <rect x="18" y="10" width="7" height="30" rx="2" />
    <rect x="26" y="14" width="6" height="22" rx="2" />
    <rect x="88" y="14" width="6" height="22" rx="2" />
    <rect x="96" y="10" width="7" height="30" rx="2" />
  </svg>
);
