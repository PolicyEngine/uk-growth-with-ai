'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from '@/lib/scrollLoop.js';
import { lerpString, morphTiming } from '@/lib/tween.js';

// An SVG shape whose geometry moves to new values in JS, so it morphs in
// every browser (WebKit cannot transition the CSS `d` property, nor x, y,
// width and height). `morph` holds the moving attributes ({ d } for a path,
// { x, y, width, height } for a rect); everything else passes through.
//
//   <Tween as="path" className="p2-mo-line" morph={{ d }} />
//
// Timing is the CSS's (lib/tween.js): the element's transition lists the
// custom property --morph with the duration, easing and delay. Reduced
// motion, the landing snap (Scrolly .is-snap) or any `transition: none`
// leave no --morph entry, and the new geometry is set at once. The tween runs
// on the page's one rAF (lib/scrollLoop.js) and writes attributes only.

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const strs = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? null : String(v)]));

export default function Tween({ as: Tag = 'path', morph, ...rest }) {
  const ref = useRef(null);
  // the first geometry is rendered by React (server and first paint); after
  // that React never writes these attributes, the tween does
  const [first] = useState(() => strs(morph));
  const shown = useRef(first);
  const target = useRef(first);
  const stop = useRef(null);
  const next = strs(morph);
  const key = JSON.stringify(next);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const changed = Object.keys(next).filter((k) => next[k] !== target.current[k]);
    if (!changed.length) return;
    target.current = { ...target.current, ...next };
    stop.current?.();
    stop.current = null;
    const set = (k, v) => {
      if (v == null) el.removeAttribute(k);
      else el.setAttribute(k, v);
      shown.current = { ...shown.current, [k]: v };
    };
    const t = reduced() ? null : morphTiming(getComputedStyle(el));
    const lerps = [];
    for (const k of changed) {
      const f = t && shown.current[k] != null && next[k] != null ? lerpString(shown.current[k], next[k]) : null;
      if (f) lerps.push([k, f]);
      else set(k, next[k]);
    }
    if (!lerps.length) return;
    const t0 = performance.now() + t.delay;
    stop.current = animate((now) => {
      const p = Math.min(1, (now - t0) / t.duration);
      if (p < 0) return true;
      const e = t.ease(p);
      for (const [k, f] of lerps) set(k, p >= 1 ? next[k] : f(e));
      return p < 1;
    });
  }, [key]);
  useEffect(() => () => stop.current?.(), []);
  return <Tag ref={ref} {...rest} {...first} />;
}
