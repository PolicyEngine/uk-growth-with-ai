'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Custom single-select dropdown matching the static dashboard's look.
// Implements the ARIA listbox keyboard contract: the trigger opens on
// Enter/Space/Arrow, the open list is focused and moved with the arrow keys,
// Enter or Space commits, Escape cancels and returns focus to the trigger.
export default function Select({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const baseId = useId();
  const optionId = (i) => `${baseId}-opt-${i}`;

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[index] || options[0];

  // Close on an outside click. Keyboard handling is on the elements
  // themselves, so Escape works whichever of the two holds focus.
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Move real focus onto the list when it opens, so the arrow keys arrive.
  useEffect(() => {
    if (open && listRef.current) listRef.current.focus();
  }, [open]);

  function openList(startAt = index) {
    setCursor(startAt);
    setOpen(true);
  }

  function close({ refocus = true } = {}) {
    setOpen(false);
    if (refocus && buttonRef.current) buttonRef.current.focus();
  }

  function commit(i) {
    const opt = options[i];
    if (opt) onChange(opt.value);
    close();
  }

  function onButtonKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openList(options.length - 1);
    }
  }

  function onListKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setCursor(0);
        break;
      case 'End':
        e.preventDefault();
        setCursor(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(cursor);
        break;
      case 'Escape':
      case 'Tab':
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  }

  return (
    <div className="select" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        onKeyDown={onButtonKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          if (open) close({ refocus: false });
          else openList();
        }}
      >
        <span className="select-label">{label}</span>
        <span className="select-value">{current?.label}</span>
        <span className="select-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      <ul
        ref={listRef}
        id={`${baseId}-list`}
        className="select-menu"
        role="listbox"
        aria-label={label}
        tabIndex={-1}
        aria-activedescendant={open ? optionId(cursor) : undefined}
        hidden={!open}
        onKeyDown={onListKeyDown}
      >
        {options.map((opt, i) => (
          <li
            key={opt.value}
            id={optionId(i)}
            className={`select-option${open && i === cursor ? ' cursor' : ''}`}
            role="option"
            aria-selected={opt.value === value}
            onMouseEnter={() => setCursor(i)}
            onClick={(e) => {
              e.stopPropagation();
              commit(i);
            }}
          >
            <span>{opt.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
