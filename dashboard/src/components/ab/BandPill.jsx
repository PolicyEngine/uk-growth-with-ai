'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// A band pill (AB PillSelect variant="band"): icon, muted label, bold value,
// chevron; opens a white list. The chosen option is shown by weight and a
// tinted fill, never a tick. `inactive` keeps it in place, faded, closed.
export default function BandPill({ icon, label, value, options, onChange, inactive = false, inactiveNote }) {
  const [openState, setOpen] = useState(false);
  const open = openState && !inactive;
  const root = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="band-pill" ref={root}>
      <button
        type="button"
        className={`band-control${inactive ? ' is-inactive' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-disabled={inactive || undefined}
        title={inactive ? inactiveNote : undefined}
        onClick={() => !inactive && setOpen((o) => !o)}
      >
        <Icon name={icon} size={16} className="band-control-icon" />
        <span className="band-control-text">
          <span className="band-control-label">{label}</span>
          <span className="band-control-value">{current?.short ?? current?.label}</span>
        </span>
        <span className="pill-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <ul className="band-list" role="listbox" id={listId} aria-label={label}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`band-option${o.value === value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="band-option-label">{o.label}</span>
                {o.note ? <span className="band-option-note">{o.note}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
