'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Keep a floating box inside the window: returns the x shift (px) that moves
// a box at [left, right] back inside [8, vw - 8].
export function clampShift(left, right, vw, margin = 8) {
  if (left < margin) return margin - left;
  if (right > vw - margin) return vw - margin - right;
  return 0;
}

// Close on a pointer press outside `ref` while `open` (tap outside hides).
export function useOutside(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close, ref]);
}

// A box positioned over its anchor, shifted to stay inside the window.
export function TipBox({ children, className = '', style }) {
  const ref = useRef(null);
  const [dx, setDx] = useState(0);
  // Measured after every render; setDx bails out when the shift is unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = document.documentElement.clientWidth;
    if (!vw) return;
    const r = el.getBoundingClientRect();
    // the shift from the box's unshifted place, so repeated renders agree
    const next = clampShift(r.left - dx, r.right - dx, vw);
    if (Math.abs(next - dx) > 0.5) setDx(next);
  });
  return (
    <span ref={ref} role="tooltip" className={`tip-box ${className}`} style={{ ...style, translate: `${dx}px` }}>
      {children}
    </span>
  );
}

// A focusable target that shows a tooltip on hover, keyboard focus or tap.
export function TipTarget({ tip, label, className = '', style, children, onActivate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, open, () => setOpen(false));
  return (
    <span
      ref={ref}
      tabIndex={0}
      role="button"
      aria-label={label}
      className={`tip-target ${className}`}
      style={style}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => {
        setOpen(true);
        onActivate?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
        if (onActivate && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      {children}
      {open ? <TipBox>{tip}</TipBox> : null}
    </span>
  );
}
