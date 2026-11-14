'use client';

import { useRef, useState } from 'react';
import { TipBox, useOutside } from '@/components/ab/Tip.jsx';

// Small pieces shared by the Scenarios, Method, Other studies and Code tabs.

export const ext = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text}
  </a>
);

// A focusable SVG or HTML target with a tooltip on hover, keyboard focus or
// tap. `as` lets it be an SVG <g>.
export function useHover() {
  const [hi, setHi] = useState(null);
  const ref = useRef(null);
  useOutside(ref, hi != null, () => setHi(null));
  const bind = (key, label) => ({
    tabIndex: 0,
    role: 'button',
    'aria-label': label,
    onMouseEnter: () => setHi(key),
    onMouseLeave: () => setHi(null),
    onFocus: () => setHi(key),
    onBlur: () => setHi(null),
    onClick: () => setHi(key),
    onKeyDown: (e) => {
      if (e.key === 'Escape') setHi(null);
    },
  });
  return { hi, setHi, ref, bind };
}

// A tooltip box placed over an HTML anchor at (x%, y%) of its container.
export function FloatTip({ x, y, children, below = false }) {
  return (
    <span className={`mx-tip-anchor${below ? ' below' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
      <TipBox className="mx-tip">{children}</TipBox>
    </span>
  );
}
