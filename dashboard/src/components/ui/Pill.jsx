'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ab/Icon.jsx';

// The one chooser on the site (item-11-pill-fable.md): a pill that shows
// the current choices in words ("UK central · some foreign capital ·
// automation + productivity"), one chevron, and opens one panel with a
// labelled section per choice. The sticky header's settings chip, the
// page's pill in the model row, the Story band's pill and every card's
// options are this component.
//
//   <Pill title="OG-UK settings" name="…" sections={[{ id, label, glyph,
//     kind: 'one' | 'any', value, options: [{ value, label, desc, swatch,
//     disabled, why }], onChange, locked, seg, def }]} />
//
// `seg` is the section's words in the pill (null: not shown) and `def`
// whether it is at its default. The text fits its box by dropping whole
// segments (defaults from the end first, then the others from the end;
// the first segment never), with " · N more"; never an ellipsis, a wrap or
// a cut word. The full text is in the title and the accessible name.
//
// The panel is a dialog: a popover placed from the pill (fixed, so no
// card's overflow clips it; placed again on scroll and resize), a sheet
// from the foot of the screen at 600px and below. A one-choice section is
// a radio group (arrow keys move and choose, Home and End jump; a disabled
// option takes focus so its reason is read, and is not chosen); a
// tick-any section is a group of checkboxes (arrows move, Space toggles).
// Escape, the close button, the scrim or a click outside closes; Escape
// and the close button return focus to the pill. A one-section radio panel
// closes on a click, Enter or Space on an option, never on an arrow key.

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), a[href], [tabindex="0"]';
const SEP = ' · ';

// the order segments are dropped in: defaults from the end, then the others
// from the end; never the first
export function dropOrder(segs) {
  const idx = segs.map((s, i) => i).slice(1).reverse();
  return [...idx.filter((i) => segs[i].def), ...idx.filter((i) => !segs[i].def)];
}

// the pill's segments from its sections; a one-section card pill starts
// with a capital, a multi-section pill capitalises only names (the caller's
// words carry the names' capitals)
export function pillSegments(sections) {
  const segs = sections.filter((s) => s.seg).map((s) => ({ key: s.id, text: s.seg, def: !!s.def }));
  return segs;
}

function Section({ s, onlyOne, close, first, focusRef }) {
  const id = useId();
  const refs = useRef([]);
  const opts = s.options ?? [];
  const chosen = s.kind === 'any' ? null : opts.findIndex((o) => o.value === s.value);
  const [focusAt, setFocusAt] = useState(Math.max(0, chosen ?? 0));
  const focusIdx = (i) => {
    setFocusAt(i);
    refs.current[i]?.focus();
  };
  const choose = (i, via) => {
    const o = opts[i];
    if (o.disabled) return;
    if (s.kind === 'any') {
      const on = s.value.includes(o.value);
      s.onChange(on ? s.value.filter((v) => v !== o.value) : [...s.value, o.value]);
      return;
    }
    s.onChange(o.value);
    if (onlyOne && via !== 'arrow') close(true);
  };
  const onKey = (e) => {
    const n = opts.length;
    const at = refs.current.indexOf(document.activeElement);
    if (at < 0) return;
    const next = { ArrowDown: (at + 1) % n, ArrowRight: (at + 1) % n, ArrowUp: (at - 1 + n) % n, ArrowLeft: (at - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      focusIdx(next);
      if (s.kind !== 'any') choose(next, 'arrow');
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      choose(at, 'key');
    }
  };
  if (s.locked) {
    return (
      <div className="sp-group">
        <p className="sp-group-name" id={id}>
          {s.glyph ? <Icon name={s.glyph} size={16} /> : null}
          <span>{s.label}</span>
        </p>
        <p className="sp-locked">
          <Icon name="lock" size={14} />
          <span>{s.locked}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="sp-group">
      <p className="sp-group-name" id={id}>
        {s.glyph ? <Icon name={s.glyph} size={16} /> : null}
        <span>{s.label}</span>
      </p>
      <div className="sp-options" role={s.kind === 'any' ? 'group' : 'radiogroup'} aria-labelledby={id} onKeyDown={onKey}>
        {opts.map((o, i) => {
          const on = s.kind === 'any' ? s.value.includes(o.value) : o.value === s.value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
                if (first && i === focusAt && focusRef) focusRef.current = el;
              }}
              type="button"
              role={s.kind === 'any' ? 'checkbox' : 'radio'}
              aria-checked={on}
              aria-disabled={o.disabled || undefined}
              tabIndex={i === focusAt ? 0 : -1}
              className={`sp-option${on ? ' is-on' : ''}${o.disabled ? ' is-disabled' : ''}${o.swatch ? ' has-swatch' : ''}`}
              onFocus={() => setFocusAt(i)}
              onClick={() => choose(i, 'click')}
            >
              {o.swatch ? <span className="sp-swatch" aria-hidden="true" style={{ '--sw': o.swatch.color }} data-dashed={o.swatch.dashed ? '' : undefined} data-on={on ? '' : undefined} /> : null}
              <span className="sp-option-text">
                <span className="sp-option-label">{o.label}</span>
                <span className="sp-option-note">{o.disabled ? o.why : o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Pill({ title, name, sections, className = '', align = 'left', onOpenChange }) {
  const segs = pillSegments(sections);
  const full = segs.map((x) => x.text).join(SEP);
  const [open, setOpenState] = useState(false);
  const [shown, setShown] = useState(segs.length);
  const [more, setMore] = useState(0);
  const btn = useRef(null);
  const text = useRef(null);
  const pop = useRef(null);
  const firstFocus = useRef(null);
  const popId = useId();
  // the panel moves to the body once first opened (fixed, over every
  // card's overflow); until then it waits, hidden, in place
  const [moved, setMoved] = useState(false);
  const setOpen = useCallback(
    (v) => {
      setOpenState(v);
      onOpenChange?.(v);
    },
    [onOpenChange],
  );

  // fit: every segment, then drop whole segments in dropOrder, with
  // " · N more" counted in the fit
  const order = dropOrder(segs).join(',');
  useLayoutEffect(() => {
    const el = text.current;
    if (!el) return undefined;
    const fit = () => {
      const parts = [...el.querySelectorAll('.settings-chip-seg:not(.settings-chip-more)')];
      const moreEl = el.querySelector('.settings-chip-more');
      const drop = order ? order.split(',').map(Number) : [];
      parts.forEach((p) => p.removeAttribute('hidden'));
      moreEl.setAttribute('hidden', '');
      let k = 0;
      while (k < drop.length && el.scrollWidth > el.clientWidth + 1) {
        parts[drop[k]].setAttribute('hidden', '');
        k += 1;
        moreEl.textContent = ` ${k} more`;
        moreEl.removeAttribute('hidden');
      }
      setShown(parts.length - k);
      setMore(k);
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => requestAnimationFrame(fit));
    ro?.observe(btn.current?.parentElement ?? el);
    ro?.observe(btn.current);
    return () => ro?.disconnect();
  }, [full, order]);

  const close = useCallback(
    (focus = true) => {
      setOpen(false);
      if (focus) btn.current?.focus({ preventScroll: true });
    },
    [setOpen],
  );

  // place the popover from the pill (desktop), on the panel's own style;
  // a sheet on a phone (CSS)
  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    const p = pop.current;
    if (!b || !p) return;
    const reset = () => ['left', 'width', 'top', 'bottom', 'maxHeight'].forEach((k) => (p.style[k] = ''));
    if (window.matchMedia?.('(max-width: 600px)').matches) {
      reset();
      return;
    }
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const w = Math.min(sections.length === 1 ? 320 : 400, vw - 32);
    const stack = document.querySelector('.sticky-stack')?.getBoundingClientRect().bottom ?? 0;
    const below = vh - b.bottom - 16;
    const above = b.top - stack - 16;
    const up = below < 320 && above > below;
    let left = align === 'right' ? b.right - w : b.left;
    left = Math.max(16, Math.min(left, vw - 16 - w));
    p.style.left = `${left}px`;
    p.style.width = `${w}px`;
    p.style.top = up ? 'auto' : `${b.bottom + 8}px`;
    p.style.bottom = up ? `${vh - b.top + 8}px` : 'auto';
    p.style.maxHeight = `${Math.min(560, (up ? above : below) - 8)}px`;
  }, [align, sections.length]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const p = pop.current;
    (firstFocus.current ?? p?.querySelector('[role="radio"][tabindex="0"], [role="checkbox"][tabindex="0"]') ?? p?.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
    const onDoc = (e) => {
      if (!p?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
    // focus once, on opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onPopKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...pop.current.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x.getClientRects().length);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!segs.length) return null;
  const dialogName = name ? `${title}: ${name}` : title;
  const onlyOne = sections.length === 1 && sections[0].kind !== 'any';
  const panel = (
    <>
      <div className="sheet-scrim settings-scrim" aria-hidden="true" hidden={!open} onClick={() => close()} />
      <div
        ref={pop}
        id={popId}
        className={`settings-pop${sections.length === 1 ? ' is-one' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={dialogName}
        hidden={!open}
        onKeyDown={onPopKey}
      >
        <p className="settings-pop-title">
          <span>{title}</span>
          <button type="button" className="sheet-close" aria-label={`Close: ${title}`} onClick={() => close()}>
            <Icon name="x" size={18} />
          </button>
        </p>
        {open
          ? sections.map((s, i) => <Section key={s.id} s={s} onlyOne={onlyOne} close={close} first={i === 0} focusRef={i === 0 ? firstFocus : null} />)
          : null}
      </div>
    </>
  );
  return (
    <div className={`settings-chip-wrap${open ? ' is-open' : ''} ${className}`.trim()}>
      <button
        ref={btn}
        type="button"
        className="settings-chip"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`${title}: ${sections.map((s) => s.full ?? s.seg).filter(Boolean).join(SEP)}. Change`}
        title={sections.map((s) => s.full ?? s.seg).filter(Boolean).join(SEP)}
        data-shown={shown}
        data-more={more}
        onClick={() => {
          if (open) close();
          else {
            setMoved(true);
            setOpen(true);
          }
        }}
      >
        <Icon name="sliders" size={16} className="settings-chip-icon" />
        <span className="settings-chip-text" ref={text} aria-hidden="true">
          {/* a space before each later segment (the dot is CSS), so the
              pill's text never runs two segments together (R1-21) */}
          {segs.map((x, i) => (
            <span key={x.key} className="settings-chip-seg">
              {i ? ' ' : null}
              {x.text}
            </span>
          ))}
          <span className="settings-chip-seg settings-chip-more" hidden>
            {more ? ` ${more} more` : ''}
          </span>
        </span>
        <Icon name="chevronDown" size={14} strokeWidth={2} className="settings-chip-chevron" />
      </button>
      {moved ? createPortal(panel, document.body) : panel}
    </div>
  );
}
