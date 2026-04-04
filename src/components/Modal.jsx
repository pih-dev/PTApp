import React, { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

export default function Modal({ onClose, title, children, action }) {
  const contentRef = useRef(null);

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

  return (
    <div className="modal-overlay">
      <div className="modal-bg" onClick={onClose} />
      <div className="modal-content" ref={contentRef}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {action && <div className="modal-footer">{action}</div>}
      </div>
    </div>
  );
}
