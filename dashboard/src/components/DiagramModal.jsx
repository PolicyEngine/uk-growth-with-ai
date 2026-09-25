'use client';

import { useEffect } from 'react';

export default function DiagramModal({ title, svgHtml, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="diagram-modal-overlay" onClick={onClose}>
      <div className="diagram-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="diagram-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="diagram-modal-title">{title}</div>
        <div className="diagram-modal-diagram" dangerouslySetInnerHTML={{ __html: svgHtml }} />
      </div>
    </div>
  );
}
