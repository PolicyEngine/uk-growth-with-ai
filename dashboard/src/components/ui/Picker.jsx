'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';

// A header picker: icon, muted label, bold value, chevron. It opens a list
// (a sheet from the foot of the screen on a phone). The list is a WAI-ARIA
// listbox: arrow keys, Home and End move, Enter or Space chooses, Escape
// closes and returns focus. The chosen option is shown by weight and a
// tinted fill, never a tick. `locked` shows the value with a padlock and
// does not open: the reason is given in view by the tab itself.
export default function Picker({ icon, label, value, options, onChange, locked = false, lockedNote }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);
  const enabled = options.map((o, i) => (o.disabled ? null : i)).filter((i) => i != null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    listRef.current?.focus();
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) button.current?.focus();
  };
  const choose = (i) => {
    if (options[i].disabled) return;
    onChange(options[i].value);
    close();
  };
  const move = (dir) => {
    const at = enabled.indexOf(active);
    setActive(enabled[(at + dir + enabled.length) % enabled.length]);
  };
  const onListKey = (e) => {
    if (e.key === 'ArrowDown') move(1);
    else if (e.key === 'ArrowUp') move(-1);
    else if (e.key === 'Home') setActive(enabled[0]);
    else if (e.key === 'End') setActive(enabled[enabled.length - 1]);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') {
      close(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div className="picker" ref={root}>
      <button
        ref={button}
        type="button"
        className={`picker-button${locked ? ' is-locked' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${current?.label}${locked && lockedNote ? `. ${lockedNote}` : ''}`}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (locked) return;
          if (open) close();
          else show();
        }}
        onKeyDown={(e) => {
          if (!locked && !open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            show();
          }
        }}
      >
        <Icon name={icon} size={16} className="picker-icon" />
        <span className="picker-label">{label}</span>
        <span className="picker-value">{current?.short ?? current?.label}</span>
        <Icon name={locked ? 'lock' : 'chevronDown'} size={14} strokeWidth={2} className="picker-chevron" />
      </button>
      {open ? (
        <>
          <div className="sheet-scrim" aria-hidden="true" onClick={() => close()} />
          <div className="picker-pop">
            <p className="picker-pop-title">
              <span>{label}</span>
              <button type="button" className="sheet-close" aria-label="Close" onClick={() => close()}>
                <Icon name="x" size={18} />
              </button>
            </p>
            <ul
              ref={listRef}
              className="picker-list"
              role="listbox"
              id={listId}
              aria-label={label}
              tabIndex={-1}
              aria-activedescendant={`${listId}-${active}`}
              onKeyDown={onListKey}
            >
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  className={`picker-option${o.value === value ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
                  onClick={() => choose(i)}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                >
                  {o.icon ? <Icon name={o.icon} size={16} /> : null}
                  <span className="picker-option-text">
                    <span className="picker-option-label">{o.label}</span>
                    {o.note ? <span className="picker-option-note">{o.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
