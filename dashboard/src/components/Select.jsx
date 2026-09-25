'use client';

import { useEffect, useRef, useState } from 'react';

// Custom single-select dropdown matching the static dashboard's look.
export default function Select({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div className="select" ref={wrapRef}>
      <button
        type="button"
        className="select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="select-label">{label}</span>
        <span className="select-value">{current?.label}</span>
        <span className="select-caret">▾</span>
      </button>
      <ul className="select-menu" role="listbox" hidden={!open}>
        {options.map((opt) => (
          <li
            key={opt.value}
            className="select-option"
            role="option"
            aria-selected={opt.value === value}
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.value);
              setOpen(false);
            }}
          >
            <span>{opt.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
