'use client';

import { useId, useState } from 'react';

// The one expander (AB Disclosure.jsx): a full-width button with a chevron,
// closed by default, a muted one-line preview while closed.
export default function Disclosure({ title, preview, inCard = false, children }) {
  const [open, setOpen] = useState(false);
  const cid = useId();
  return (
    <div className={`disclosure${inCard ? ' disclosure-in-card' : ' disclosure-card'}`}>
      <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={cid} onClick={() => setOpen((o) => !o)}>
        <span className="disclosure-title">
          <span>{title}</span>
          {!open && preview ? <span className="disclosure-preview">{preview}</span> : null}
        </span>
        <svg className="disclosure-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={cid} className="disclosure-content" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
