'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useEntry, useReducedMotion, useScrollyEntry } from './motion.js';

// A figure that counts up as it comes into view (again each time the reader
// scrolls back above it and down again). The exact,
// formatted value is always in the DOM (visually hidden, so screen readers,
// copying and the number checks read it once and exactly). The moving copy
// is drawn by CSS from data attributes (pseudo-element text is not in the
// DOM's text), is aria-hidden, and ends on the same string. A hidden copy of
// the final string holds the width, so nothing moves as digits change.
// The drawn copy shows the final value at all other times (before it is
// seen, off screen, on the server, in print), so a wrong figure is never
// left on screen; the run is short (450ms). Under reduced motion, for text
// with no number, or for a figure already on screen when the page loads,
// the final value shows and nothing runs.
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
  // reversible (round 1): the Scrolly figure's entry when inside one, else
  // its own; it counts each time it enters from below (scrolling back above
  // it resets it), never when landed by a jump or a link or when on screen
  // at load (the hero): then the final value shows at full opacity and a 0
  // is never painted
  const scrolly = useScrollyEntry();
  const [ref, own] = useEntry({ line: 0.9 });
  const entry = scrolly ?? own;
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const animate = mounted && NUM.test(text) && !reduce;
  const run = animate && entry.entered && !entry.instant;
  // the run in progress: { run: entry.run, frac }; any other time the
  // final value
  const [prog, setProg] = useState({ run: -1, frac: 1 });
  useEffect(() => {
    if (!run) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / DUR);
      setProg({ run: entry.run, frac: 1 - (1 - k) ** 3 });
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, entry.run]);
  const frac = !run ? 1 : prog.run === entry.run ? prog.frac : 0;
  const shown = frac >= 1 ? text : partial(text, frac);
  return (
    <span ref={ref} className={`count-up ${className}`}>
      <span className="visually-hidden">{text}</span>
      <span className="count-up-vis" aria-hidden="true" data-final={text} data-text={shown} />
    </span>
  );
}
