'use client';

import { Children, useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { Axis, Grid, ModelBadge, linear as chartLinear } from '@/components/story/chart/index.js';
import { SOURCES } from './data.js';
import { dateLong, tick } from './format.js';

// Shared pieces of part 1's charts. The charts print no values: every
// figure is in the step cards, once. The only numbers in a graphic are axis
// ticks, each marked data-axis so the number check sets them aside.
//
// Charts are drawn at their measured pixel width (useWidth), so the type
// scale is exact: ticks 12px, labels 12px semibold, notes 11px (scene plan
// section 4). Horizontal gridlines only, dotted; no axis lines or tick
// marks; three or four y ticks.

// The widest a part 1 drawing gets on desktop, and the width used before
// it is measured (server render, tests).
export const MAX_W = 760;
export const FALLBACK_W = 520;

// The measured box of a plot: its width (capped at MAX_W) and its height.
// On desktop (story-part1.css) the plot box has a CSS height that follows
// the viewport, so the chart is drawn to fill the sticky figure; at 900px
// and below it has none, so its height is the drawing's own (`fallbackH`)
// and the figure stays short enough to stick. Without ResizeObserver
// (server, jsdom) both stay at their fallbacks, so every state renders.
export function useBox(fallbackH, fallbackW = FALLBACK_W) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: fallbackW, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || r.width <= 0) return;
      const desktop = window.matchMedia?.('(min-width: 901px)').matches;
      const w = Math.min(Math.round(r.width), MAX_W);
      const h = desktop ? Math.round(r.height) : 0;
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box.w, box.h > 120 ? box.h : fallbackH];
}

// An id that is safe inside url(#...) (useId's may hold colons or guillemets).
export function useSvgId(prefix) {
  const id = useId();
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

// Up to `max` round ticks (a step of 1, 2, 2.5 or 5 times a power of ten)
// and a domain that holds the data and those ticks.
export function niceTicks(values, { max = 5, withZero = false, pad = 0.04 } = {}) {
  const vs = withZero ? [...values, 0] : values;
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  const span = hi - lo || 1;
  lo -= span * pad;
  hi += span * pad;
  if (withZero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  const mag = 10 ** Math.floor(Math.log10(span));
  let ticks = [];
  for (const m of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10]) {
    const step = m * mag;
    if (Math.abs(step * 10 - Math.round(step * 10)) > 1e-9) continue; // ticks print to one decimal
    const t = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) t.push(Math.round(v * 1000) / 1000);
    if (t.length <= max && t.length >= 3) {
      ticks = t;
      break;
    }
    if (t.length === 2 && !ticks.length) ticks = t; // two only if nothing gives three to max
  }
  return { lo, hi, ticks };
}

// A linear map from [d0, d1] to [r0, r1] (the shared chart scale, with
// invert and domain, so Grid and Crosshair can read it).
export const linear = (d0, d1, r0, r1) => chartLinear([d0, d1], [r0, r1]);

// An SVG path through (X(xs[i]), Y(ys[i])), straight segments.
export const linePath = (X, Y, xs, ys) => ys.map((v, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join('');

// Horizontal gridlines (dotted) and y tick labels, from the shared chart
// primitives (Grid: a solid zero line when zero is in the domain; Axis:
// data-axis tick text, no axis line). `x0`, `x1`: the plot's edges.
export function YGrid({ ticks, Y, x0, x1, className = '' }) {
  return (
    <g className={`p1-ygrid ${className}`}>
      <Grid scale={Y} ticks={ticks} x0={x0} x1={x1} />
      <Axis side="left" scale={Y} ticks={ticks} at={x0} offset={6} format={tick} />
    </g>
  );
}

// X tick labels: [{ key, x, label, anchor }], under the plot at `y`.
export function XTicks({ ticks, y, className = '' }) {
  return (
    <g className={className}>
      {ticks.map((t) => (
        <text data-axis="" key={t.key ?? t.x} x={t.x} y={y} textAnchor={t.anchor ?? 'middle'} className="p1-tick">
          {t.label}
        </text>
      ))}
    </g>
  );
}

// Year ticks over a span of decimal years: at most five, the first and last
// always (the first whole year, and the series' last year).
export function yearTicks(t0, t1, max = 5) {
  const y0 = Math.ceil(t0 - 0.2);
  const y1 = Math.floor(t1);
  const run = (e) => {
    const out = [];
    for (let y = y0; y <= y1 - e / 2; y += e) out.push(y);
    out.push(y1);
    return out;
  };
  const every = [1, 2, 4, 5, 10].find((e) => run(e).length <= max) ?? 10;
  return run(every);
}

// A line of text that keeps the height of its longest form: the ghost sits
// in the same grid cell, visibility: hidden (out of innerText) and
// data-axis (not a figure).
function Stack({ value, reserve }) {
  if (!reserve) return <span>{value}</span>;
  return (
    <span className="p1-title-stack">
      <span>{value}</span>
      <span className="p1-title-ghost" aria-hidden="true" data-axis="">
        {reserve}
      </span>
    </span>
  );
}

// A figure's title and unit line, each led by a plain concept icon.
export function FigTitle({ icon, title, reserve }) {
  return (
    <p className="story-figure-title p1-title-row">
      <Icon name={iconFor(icon)} size={16} className="p1-text-icon" />
      <Stack value={title} reserve={reserve} />
    </p>
  );
}
export const FigUnit = ({ children, reserve }) => (
  <p className="story-figure-unit p1-title-row">
    <Icon name={iconFor('measure')} size={14} className="p1-text-icon" />
    <Stack value={children} reserve={reserve} />
  </p>
);

const SHORT = {
  'Office for National Statistics': 'ONS',
  'Office for Budget Responsibility': 'OBR',
  'Department for Science, Innovation and Technology and AI Security Institute': 'DSIT',
};
const short = (s) => SHORT[s.publisher] ?? s.publisher;

// The foot of a figure: one line, "Source:" and the linked dataset names by
// publisher; then a "Sources" disclosure with each dataset's series and
// release date, which opens over the figure without changing its height.
// items: [{ id, name, detail }]; `note`: a line for the disclosure only.
export function SourceLine({ items, note }) {
  return (
    <div className="p1-foot">
      <p className="story-source">
        <Icon name={iconFor('source')} size={13} className="p1-source-icon" />
        Source:{' '}
        {items.map((it, i) => {
          const s = SOURCES[it.id];
          const pub = i === 0 || short(SOURCES[items[i - 1].id]) !== short(s) ? `${short(s)}, ` : '';
          return (
            <span key={it.id}>
              {i ? '; ' : ''}
              {pub}
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {it.name}
              </a>
            </span>
          );
        })}
      </p>
      <details className="p1-sources">
        <summary>
          <Icon name={iconFor('survey')} size={13} className="p1-source-icon" />
          Sources
        </summary>
        <ul className="p1-sources-list" data-cite="">
          {items.map((it) => {
            const s = SOURCES[it.id];
            return (
              <li key={it.id} className="story-source">
                <Icon name={iconFor('source')} size={13} className="p1-source-icon" />
                {s.publisher}, {it.name}, {it.detail ?? s.series}, released {dateLong(s.released)}.
              </li>
            );
          })}
          {note ? (
            <li className="story-source">
              <Icon name={iconFor('source')} size={13} className="p1-source-icon" />
              {note}
            </li>
          ) : null}
        </ul>
      </details>
    </div>
  );
}

// The frame round a graphic: title, unit line, drawing, foot. `titleReserve`
// and `unitReserve` hold the height of the longest title and unit line any
// state shows, so a state change never moves the drawing.
export function Figure({ icon = 'path', title, titleReserve, unit, unitReserve, source, children, innerRef, className = '' }) {
  return (
    <figure className={`p1-figure ${className}`} ref={innerRef}>
      <ModelBadge model="official" className="p1-badge" />
      <FigTitle icon={icon} title={title} reserve={titleReserve} />
      {unit ? <FigUnit reserve={unitReserve}>{unit}</FigUnit> : null}
      {children}
      <figcaption>{source}</figcaption>
    </figure>
  );
}

// Several figures in one sticky graphic, one shown at a time: the layers
// share a grid cell (the box keeps the tallest one's height), and a change
// fades the old layer out before the new one fades in, so no two sets of
// labels overlap mid-transition. A hidden layer is inert and, once faded,
// visibility: hidden (story-part1.css). `active`: the layer index shown.
export function Swap({ active, children }) {
  return (
    <div className="p1-swap">
      {Children.toArray(children).map((c, i) => (
        <div key={i} className={`p1-swap-layer${i === active ? ' is-on' : ''}`} aria-hidden={i === active ? undefined : true} inert={i === active ? undefined : true}>
          {c}
        </div>
      ))}
    </div>
  );
}
