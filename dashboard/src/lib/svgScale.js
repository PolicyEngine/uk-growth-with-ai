'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// The scale an svg is drawn at: its rendered width over its viewBox width.
// SVG text inside a scaled viewBox renders at font-size x scale, so a chart
// whose viewBox is wider (or narrower) than its box divides its font sizes
// by this to land on the chart type scale (app/chart-type.css).
//
// Returns [ref, s]: a ref callback for the svg, and s = { k, tick, label,
// head } with k the scale and tick/label/head the scale's sizes in the
// svg's user units (the --chart-fs-* tokens, read from the page, over k).
// Until measured, s is built from `fallback` (k) and the desktop tokens, so
// the server render and the first client render match. For CSS, set
// style={{ '--svg-k': s.k }} and use calc(var(--chart-fs-tick) / var(--svg-k)).
const DESKTOP = { tick: 14, label: 15, head: 16 };
const make = (k, px) => ({ k, tick: px.tick / k, label: px.label / k, head: px.head / k });

// Measures `el` and calls `set` with a new s when its scale or the tokens
// change; returns the observer (or null).
function watch(el, vbWidth, set) {
  if (!el || typeof ResizeObserver === 'undefined') return null;
  const read = () => {
    const w = el.getBoundingClientRect().width;
    if (!(w > 0)) return;
    const cs = getComputedStyle(el);
    const tok = (n, d) => parseFloat(cs.getPropertyValue(`--chart-fs-${n}`)) || d;
    const px = { tick: tok('tick', 14), label: tok('label', 15), head: tok('head', 16) };
    const k = Math.round((w / vbWidth) * 1000) / 1000;
    set((cur) => (Math.abs(cur.k - k) > 0.004 || Math.abs(cur.tick * cur.k - px.tick) > 0.01 ? make(k, px) : cur));
  };
  const ro = new ResizeObserver(read);
  ro.observe(el);
  read();
  return ro;
}

export function useSvgScale(vbWidth, fallback = 1) {
  const [s, setS] = useState(() => make(fallback, DESKTOP));
  const ro = useRef(null);
  const ref = useCallback(
    (el) => {
      ro.current?.disconnect();
      ro.current = watch(el, vbWidth, setS);
    },
    [vbWidth],
  );
  useEffect(() => () => ro.current?.disconnect(), []);
  return [ref, s];
}

// The same for an svg that already has an object ref (useDrawIn's).
export function useSvgScaleOf(objRef, vbWidth, fallback = 1) {
  const [s, setS] = useState(() => make(fallback, DESKTOP));
  useEffect(() => {
    const ro = watch(objRef.current, vbWidth, setS);
    return () => ro?.disconnect();
  }, [objRef, vbWidth]);
  return s;
}
