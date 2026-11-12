'use client';

import { useEffect, useId } from 'react';

export default function DiagramModal({ title, svgHtml, onClose }) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="diagram-modal-overlay" onClick={onClose}>
      <div
        className="diagram-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="diagram-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="diagram-modal-title" id={titleId}>
          {title}
        </div>
        <div className="diagram-modal-diagram" dangerouslySetInnerHTML={{ __html: svgHtml }} />
      </div>
    </div>
  );
}
