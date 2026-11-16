'use client';

import { Children } from 'react';
import { SOURCES } from './data.js';
import { dateLong, tick } from './format.js';

// Shared pieces of part 1's charts. The charts print no values: every
// figure is in the step cards, once. The only numbers in a graphic are axis
// ticks, each marked data-axis so the number check sets them aside. The
// viewBox is 400 wide so tick text (14 units) stays at least 11px when
// the graphic is phone width; story-part1.css caps the width on desktop.

export const W = 400;
const M = { l: 38, r: 20, t: 14, b: 28 };

const SHORT = {
  'Office for National Statistics': 'ONS',
  'Office for Budget Responsibility': 'OBR',
  'Department for Science, Innovation and Technology and AI Security Institute': 'DSIT and AI Security Institute',
};

// Linear scales over fixed domains, so nothing rescales between steps.
export function scales({ x0, x1, lo, hi, h, pad = 0 }) {
  const X = (x) => M.l + pad + ((x - x0) / (x1 - x0 || 1)) * (W - M.l - M.r - 2 * pad);
  const Y = (v) => h - M.b - ((v - lo) / (hi - lo)) * (h - M.t - M.b);
  return { X, Y, x0, x1, lo, hi, h, left: M.l, right: W - M.r, bottom: h - M.b };
}

// An SVG path through (xs[i], ys[i]).
export const linePath = (sc, xs, ys) => ys.map((v, i) => `${i ? 'L' : 'M'}${sc.X(xs[i]).toFixed(1)},${sc.Y(v).toFixed(1)}`).join('');

// Gridlines and ticks. xTicks: [{ x, label, anchor }].
export function Axes({ sc, yTicks, xTicks, zero = false }) {
  return (
    <g className="p1-axes">
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={sc.left} x2={sc.right} y1={sc.Y(v)} y2={sc.Y(v)} className={zero && v === 0 ? 'p1-zero' : 'p1-grid'} />
          <text data-axis="" x={sc.left - 6} y={sc.Y(v)} dy="0.35em" textAnchor="end" className="p1-tick">
            {tick(v)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text data-axis="" key={`x${t.x}`} x={sc.X(t.x)} y={sc.h - 8} textAnchor={t.anchor ?? 'middle'} className="p1-tick">
          {t.label ?? t.x}
        </text>
      ))}
    </g>
  );
}

// "Source: ONS, <dataset>, <series>, released <date>; ..." with links from
// the data file's sources. items: [{ id, name, detail }].
export function SourceLine({ items, note }) {
  return (
    <p className="story-source">
      Source:{' '}
      {items.map((it, i) => {
        const s = SOURCES[it.id];
        return (
          <span key={it.id}>
            {i ? '; ' : ''}
            {SHORT[s.publisher] ?? s.publisher},{' '}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {it.name}
            </a>
            , {it.detail ?? s.series}, released {dateLong(s.released)}
          </span>
        );
      })}
      .{note ? ` ${note}` : ''}
    </p>
  );
}

// Legend: [{ key, label, color, dashed, block }].
export function Legend({ items }) {
  return (
    <ul className="p1-legend">
      {items.map((l) => (
        <li key={l.key}>
          <span className={`p1-swatch${l.dashed ? ' is-dashed' : ''}${l.block ? ' is-block' : ''}`} style={{ '--sw': l.color }} aria-hidden="true" />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

// The frame round a graphic: title, unit line, drawing, legend, source.
// `titleReserve`: the longest title any state shows; it holds the title's
// height (hidden, in the same grid cell), so a longer title in a later state
// does not move the drawing below it. `footReserve` ({ legend, source }):
// the fullest legend and source line any state shows, held the same way, so
// the card's height does not change between states (it is vertically
// centred, so a taller foot would move its title). The ghost is
// visibility: hidden (out of innerText) and data-axis (not a figure).
export function Figure({ title, titleReserve, unit, legend, source, footReserve, children, innerRef }) {
  return (
    <figure className="p1-figure" ref={innerRef}>
      {titleReserve ? (
        <p className="story-figure-title p1-title-stack">
          <span>{title}</span>
          <span className="p1-title-ghost" aria-hidden="true">
            {titleReserve}
          </span>
        </p>
      ) : (
        <p className="story-figure-title">{title}</p>
      )}
      {unit ? <p className="story-figure-unit">{unit}</p> : null}
      {children}
      {footReserve ? (
        <div className="p1-foot-stack">
          <div>
            {legend?.length ? <Legend items={legend} /> : null}
            <figcaption>{source}</figcaption>
          </div>
          <div className="p1-title-ghost" aria-hidden="true" data-axis="" inert="">
            {footReserve.legend?.length ? <Legend items={footReserve.legend} /> : null}
            <div>{footReserve.source}</div>
          </div>
        </div>
      ) : (
        <>
          {legend?.length ? <Legend items={legend} /> : null}
          <figcaption>{source}</figcaption>
        </>
      )}
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
