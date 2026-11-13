'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// The one expander: a full-width button with a chevron, closed by default,
// a muted one-line preview of what is inside while closed. A "reveal" event
// from an anchor inside it (a link to a folded section) opens it.
export default function Disclosure({ title, preview, inCard = false, defaultOpen = false, id, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const cid = useId();
  const root = useRef(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const onReveal = () => setOpen(true);
    el.addEventListener('reveal', onReveal);
    return () => el.removeEventListener('reveal', onReveal);
  }, []);
  return (
    <div ref={root} id={id} className={`disclosure${inCard ? ' disclosure-in-card' : ' disclosure-card'}`}>
      <button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={cid} onClick={() => setOpen((o) => !o)}>
        <span className="disclosure-title">
          <span>{title}</span>
          {!open && preview ? <span className="disclosure-preview">{preview}</span> : null}
        </span>
        <Icon name="chevronDown" size={18} strokeWidth={2} className="disclosure-chevron" />
      </button>
      <div id={cid} className="disclosure-content" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
