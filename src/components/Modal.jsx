import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons';

// Dead zone: below this many pixels of movement, don't translate the modal.
// Why: iOS reports tiny finger jitter (1-3px) during a normal tap. Without
// this, tapping a textarea/button inside a modal would start the drag
// transform and iOS would interpret the touch as a gesture — preventing
// focus on the tapped element (keyboard never comes up). 10px feels natural
// and still lets the swipe gesture start almost immediately.
const DRAG_DEAD_ZONE = 10;

export default function Modal({ onClose, title, children, action }) {
  const contentRef = useRef(null);
  const bodyRef = useRef(null);

  // Keyboard resize handler — shrink modal when iOS keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fullHeight = vv.height;
    const onResize = () => {
      if (!contentRef.current) return;
      if (vv.height < fullHeight * 0.85) {
        contentRef.current.style.maxHeight = vv.height * 0.9 + 'px';
      } else {
        contentRef.current.style.maxHeight = '';
      }
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // Swipe-down-to-dismiss gesture.
  //
  // Attached via native addEventListener (not React's onTouchStart/Move/End
  // props) with `{ passive: true }`. Why: React's synthetic event delegation
  // attaches a single listener at the React root for all touch events. On
  // iOS Safari, having onTouchMove anywhere in the React tree can cause the
  // browser to delay or cancel synthetic click events, which breaks focus on
  // form elements — even inputs/textareas OUTSIDE this modal (e.g. session
  // notes on the Dashboard). Using native listeners scoped to contentRef
  // keeps the touch handling completely out of React's event system.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let startY = 0;
    let currentY = 0;
    let dragging = false;

    const onTouchStart = (e) => {
      // Nested-modal guard (v2.13 swap picker): touches inside a NESTED modal
      // bubble up to THIS (outer) modal's listeners too — without this check,
      // swiping the inner sheet (ProgramViewer's swap picker) would dismiss
      // BOTH sheets. Scope the gesture to touches whose nearest .modal-content
      // is our own element. Deliberately NOT stopPropagation — that would
      // blind React's root-delegated synthetic events.
      if (e.target.closest('.modal-content') !== el) {
        dragging = false;
        return;
      }
      // Don't start drag if the user is tapping a focusable element —
      // otherwise iOS might treat the tap as the start of a gesture and
      // never fire focus on the input/button/textarea.
      if (e.target.closest('input, textarea, select, button, a, [contenteditable]')) {
        dragging = false;
        return;
      }
      // The figure block owns its gestures (v2.46, review U2): tilt/pan/pinch on
      // a spin pair is a vertical drag at scrollTop 0 — exactly this dismiss
      // gesture. Touch events bubble here regardless of the figure's pointer
      // capture and touch-action, so without this the movement sheet dismissed
      // itself mid-gesture under the PT's finger.
      if (e.target.closest('.fig-interactive')) {
        dragging = false;
        return;
      }
      // Only start drag if content is scrolled to the top — so normal
      // scrolling inside the modal still works.
      const body = bodyRef.current;
      if (body && body.scrollTop > 0) {
        dragging = false;
        return;
      }
      startY = e.touches[0].clientY;
      currentY = 0;
      dragging = true;
    };

    const onTouchMove = (e) => {
      if (!dragging) return;
      const dy = e.touches[0].clientY - startY;
      // Dead zone + downward-only: below DRAG_DEAD_ZONE, don't translate at
      // all. This lets tiny tap jitter pass through without looking like a
      // drag to iOS.
      if (dy < DRAG_DEAD_ZONE) {
        currentY = 0;
        el.style.transform = '';
        return;
      }
      currentY = dy;
      // Subtract dead zone so the drag starts from 0 visually, not 10px
      el.style.transform = `translateY(${(dy - DRAG_DEAD_ZONE) * 0.7}px)`;
      el.style.transition = 'none';
    };

    const onTouchEnd = () => {
      if (!dragging) return;
      dragging = false;
      const dy = currentY;
      if (dy > 80) {
        // Dismiss — slide fully off screen then close
        el.style.transition = 'transform 0.2s ease-out';
        el.style.transform = 'translateY(100%)';
        setTimeout(onClose, 200);
      } else {
        // Snap back using the same spring curve as the open animation
        el.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = '';
      }
    };

    // passive: true — we never preventDefault, so marking passive lets iOS
    // optimize scrolling and prevents the synthetic-click interference bug.
    const opts = { passive: true };
    el.addEventListener('touchstart', onTouchStart, opts);
    el.addEventListener('touchmove', onTouchMove, opts);
    el.addEventListener('touchend', onTouchEnd, opts);
    el.addEventListener('touchcancel', onTouchEnd, opts);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onClose]);

  // 🔴 EVERY MODAL IS PORTALLED TO <body>, NEVER RENDERED WHERE IT IS DECLARED.
  //
  // v2.33, found by the mobile review of the library-tab change. Two separate
  // ways a modal breaks when it renders inside `.content`, and BOTH already
  // applied to the booking and client sheets before this release — the library
  // tab only made them reachable in a third place:
  //
  //  1. `initElasticScroll` (utils.js) writes an inline `transform` on
  //     `.content` for the overscroll bounce, and it settles on
  //     `translateY(0)` — still a transform. **A transformed ancestor becomes
  //     the containing block for `position: fixed` descendants**, so after the
  //     PT's first bounce an open sheet stops being viewport-fixed: it
  //     re-anchors to `.content` and gets clipped by its overflow. Mid-gesture
  //     it is worse — `.fig-interactive` is `touch-action: none`, so a figure
  //     rotation drag still bubbles `touchmove` to `.content` and the sheet
  //     jumps while the finger is on the figure.
  //  2. `.content` is `position: relative; z-index: 1` — a stacking context —
  //     so a `z-index: 200` overlay opened inside it still paints UNDER the
  //     `z-index: 100` nav. The bottom bar stayed undimmed and tappable over
  //     the sheet, and a tab tap unmounted the screen, dismissing the sheet
  //     with no close gesture.
  //
  // Portalling to <body> escapes both by construction, and it is the fix for
  // the whole app rather than for the one screen that exposed it.
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-bg" onClick={onClose} />
      <div className="modal-content" ref={contentRef}>
        {/* Drag handle — visual cue that modal can be swiped down */}
        <div className="modal-handle" />
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
        {action && <div className="modal-footer">{action}</div>}
      </div>
    </div>,
    document.body
  );
}
