'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useInView, useReducedMotion } from './motion.js';

// A figure that counts up once, the moment it is first fully in view. The exact,
// formatted value is always in the DOM (visually hidden, so screen readers,
// copying and the number checks read it once and exactly). The moving copy
// is drawn by CSS from data attributes (pseudo-element text is not in the
// DOM's text), is aria-hidden, and ends on the same string. A hidden copy of
// the final string holds the width, so nothing moves as digits change.
// The drawn copy shows the final value at all other times (before it is
// seen, off screen, on the server, in print), so a wrong figure is never
// left on screen; the run is short (450ms). Under reduced motion, or for
// text with no number, the final value shows.
//
//   <CountUp value="+2.34pp" />

const NUM = /(\d[\d,]*)(\.\d+)?/;
const DUR = 450;
const noop = () => () => {};

// The string `text` with its first number replaced by `frac` of its value,
// keeping the number's decimals, thousands commas, sign and units.
export function partial(text, frac) {
  const m = NUM.exec(text);
  if (!m) return text;
  const decimals = m[2] ? m[2].length - 1 : 0;
  const target = Number(`${m[1].replace(/,/g, '')}${m[2] ?? ''}`);
  const v = target * frac;
  let s = v.toFixed(decimals);
  if (m[1].includes(',')) {
    const [i, d] = s.split('.');
    s = Number(i).toLocaleString('en-GB') + (d ? `.${d}` : '');
  }
  return text.slice(0, m.index) + s + text.slice(m.index + m[0].length);
}

export default function CountUp({ value, className = '' }) {
  const text = String(value);
  const reduce = useReducedMotion();
  // fully in view (threshold 1): the run starts where it can be watched
  const [ref, seen] = useInView({ threshold: 1, rootMargin: '0px' });
  // On the server, without JS and until seen, the final value shows; once
  // seen the copy runs from zero to the value, once.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const animate = mounted && NUM.test(text) && !reduce;
  const [frac, setFrac] = useState(0);
  useEffect(() => {
    if (!animate || !seen) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / DUR);
      setFrac(1 - (1 - k) ** 3);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, seen]);
  const shown = !animate || !seen || frac >= 1 ? text : partial(text, frac);
  return (
    <span ref={ref} className={`count-up ${className}`}>
      <span className="visually-hidden">{text}</span>
      <span className="count-up-vis" aria-hidden="true" data-final={text} data-text={shown} />
    </span>
  );
}
