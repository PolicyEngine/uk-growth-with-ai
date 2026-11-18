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
        {/* phones: the label names the choice, so the value shows its short
            form when it has one ("Foreign capital: Some"), and both fit */}
        <span className="picker-value">
          {current?.short && current.short !== current.label ? (
            <>
              <span className="picker-value-full">{current.short}</span>
              <span className="picker-value-compact">{current.label}</span>
            </>
          ) : (
            current?.short ?? current?.label
          )}
        </span>
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

// A page picker in the settings bar (arm, fiscal rule): a WAI-ARIA radio
// group. Each option has a plain icon, a label, a sub-label of six words or
// fewer (desktop only) and a tooltip; the chosen one has a filled brand tint,
// bold text and a sliding indicator; an option with no solve for the current
// view is disabled, its tooltip saying why. Arrow keys move and choose
// (roving tabindex), Home and End jump. On a phone the options are compact
// chips in a row that scrolls sideways.
//   options: [{ value, label, sub, icon, note (tooltip), disabled, why }]
export function SegPicker({ icon, label, value, options, onChange }) {
  const row = useRef(null);
  const refs = useRef({});
  const [ind, setInd] = useState(null);
  useEffect(() => {
    const place = () => {
      const el = refs.current[value];
      setInd(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    place();
    // re-measure once the web font is in (labels change width)
    document.fonts?.ready.then(place);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    if (row.current) ro?.observe(row.current);
    Object.values(refs.current).forEach((el) => el && ro?.observe(el));
    return () => ro?.disconnect();
  }, [value, options]);
  const enabled = options.filter((o) => !o.disabled);
  const onKey = (e) => {
    const i = enabled.findIndex((o) => o.value === value);
    const last = enabled.length - 1;
    const next = { ArrowRight: i >= last ? 0 : i + 1, ArrowDown: i >= last ? 0 : i + 1, ArrowLeft: i <= 0 ? last : i - 1, ArrowUp: i <= 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const o = enabled[next];
    onChange(o.value);
    refs.current[o.value]?.focus();
  };
  const groupId = useId();
  const chosenEnabled = options.some((o) => o.value === value && !o.disabled);
  return (
    <div className="seg-picker">
      <span className="seg-picker-label" id={groupId}>
        <Icon name={icon} size={14} /> <span className="seg-picker-name">{label}</span>
      </span>
      <div className="seg-picker-row" role="radiogroup" aria-labelledby={groupId} ref={row} onKeyDown={onKey}>
        {ind ? <span className="seg-picker-ind" aria-hidden="true" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} /> : null}
        {options.map((o) => {
          const on = o.value === value;
          const tab = on || (!chosenEnabled && o === enabled[0]) ? 0 : -1;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[o.value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={o.disabled || undefined}
              aria-describedby={o.disabled ? `${groupId}-${o.value}` : undefined}
              tabIndex={o.disabled ? -1 : tab}
              title={o.disabled ? o.why : o.note ?? o.sub}
              className={`seg-option${on ? ' is-on' : ''}${o.disabled ? ' is-disabled' : ''}`}
              onClick={() => !o.disabled && onChange(o.value)}
            >
              {o.icon ? <Icon name={o.icon} size={14} /> : null}
              <span className="seg-option-text">
                <span className="seg-option-label">{o.short ?? o.label}</span>
                {o.sub ? <span className="seg-option-sub">{o.disabled ? 'Not solved' : o.sub}</span> : null}
              </span>
              {o.disabled ? (
                <span className="visually-hidden" id={`${groupId}-${o.value}`}>
                  {o.why}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
