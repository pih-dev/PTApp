import React, { useEffect, useRef, useCallback } from 'react';
import { CloseIcon } from './Icons';

export default function Modal({ onClose, title, children, action }) {
  const contentRef = useRef(null);
  const bodyRef = useRef(null);
  // Swipe-to-dismiss state tracked via refs (no re-renders during gesture)
  const dragState = useRef({ startY: 0, currentY: 0, dragging: false });

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

  // Swipe-down-to-dismiss: only initiates when modal body is scrolled to top,
  // so normal content scrolling still works. Threshold: 80px or fast flick.
  const onTouchStart = useCallback((e) => {
    const body = bodyRef.current;
    // Only start drag if content is at the top (not mid-scroll)
    if (body && body.scrollTop > 0) return;
    dragState.current = { startY: e.touches[0].clientY, currentY: 0, dragging: true };
  }, []);

  const onTouchMove = useCallback((e) => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    const dy = e.touches[0].clientY - ds.startY;
    // Only allow downward drag (positive dy)
    if (dy < 0) {
      ds.currentY = 0;
      if (contentRef.current) contentRef.current.style.transform = '';
      return;
    }
    ds.currentY = dy;
    // Translate modal down as user drags — slight resistance (0.7x) for feel
    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(${dy * 0.7}px)`;
      contentRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const ds = dragState.current;
    if (!ds.dragging) return;
    ds.dragging = false;
    const dy = ds.currentY;
    if (contentRef.current) {
      if (dy > 80) {
        // Dismiss — slide fully off screen then close
        contentRef.current.style.transition = 'transform 0.2s ease-out';
        contentRef.current.style.transform = 'translateY(100%)';
        setTimeout(onClose, 200);
      } else {
        // Snap back
        contentRef.current.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
        contentRef.current.style.transform = '';
      }
    }
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div className="modal-bg" onClick={onClose} />
      <div className="modal-content" ref={contentRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
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
    </div>
  );
}
