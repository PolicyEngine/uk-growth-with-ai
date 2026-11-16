'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { FadeG } from '@/components/story/primitives.jsx';

// Shared pieces of part 2's line charts. The charts draw shapes only: the
// figures have their homes on other tabs, so the only numbers here are axis
// ticks, each marked data-axis so the number check can set them aside.
// The viewBox is narrow (400 wide) so tick text stays at least 11px when
// the graphic is phone width; story-part2.css caps the width on desktop.

export const W = 400;
export const H = 250;
const M = { l: 36, r: 14, t: 16, b: 28 };

export const SOURCE = 'Source: OG-UK, PolicyEngine. 2028-surprise solves.';

// About four round ticks over [lo, hi].
export function niceTicks(lo, hi, n = 4) {
  const span = hi - lo || 1;
  const raw = span / n;
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
  const step = steps.find((s) => s >= raw) ?? 50;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return { ticks: out, step };
}

const tickText = (v, step) => {
  const dp = step < 1 ? (step < 0.25 ? 1 : String(step).split('.')[1]?.length ?? 1) : 0;
  const t = Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(Math.min(dp, 2));
  return v < -1e-9 ? `−${t}` : t;
};

// Scales for x values (years or birth years) and a y range padded to
// include zero and round ticks.
// Right gutter, in viewBox units, for direct labels at the line ends.
export const GUTTER = 104;
export function scales(xs, values, r = M.r) {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  const pad = (hi - lo || 1) * 0.08;
  // below zero: the same pad, or room for the zero line's label when no
  // value is negative
  lo -= lo < 0 ? pad : (hi - lo || 1) * 0.1;
  hi += pad;
  const { ticks, step } = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const X = (x) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - r);
  const Y = (v) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  return { X, Y, ticks, step, x0, x1 };
}

// An SVG path through (xs[i], ys[i]), skipping gaps.
export function linePath(X, Y, xs, ys) {
  let d = '';
  let pen = false;
  ys.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

// Grid, zero line, ticks and vertical markers.
export function Axes({ sc, xTicks, markers = [] }) {
  const { X, Y, ticks, step, x0, x1 } = sc;
  return (
    <g className="p2-axes">
      {ticks.map((v) => (
        <g key={`y${v}`}>
          <line x1={X(x0)} x2={X(x1)} y1={Y(v)} y2={Y(v)} className={Math.abs(v) < 1e-9 ? 'p2-zero' : 'p2-grid'} />
          <text data-axis="" x={X(x0) - 6} y={Y(v)} dy="0.35em" textAnchor="end" className="p2-tick">
            {tickText(v, step)}
          </text>
        </g>
      ))}
      {xTicks.map((x) => (
        <text data-axis="" key={`x${x}`} x={X(x)} y={H - 8} textAnchor="middle" className="p2-tick">
          {x}
        </text>
      ))}
      {markers.map((m) => (
        <g key={`m${m.x}`}>
          <line x1={X(m.x)} x2={X(m.x)} y1={6} y2={H - M.b} className="p2-marker" />
          {m.label ? (
            <text data-axis="" x={X(m.x) + (m.anchor === 'end' ? -5 : 5)} y={14} textAnchor={m.anchor ?? 'start'} className="p2-marker-label">
              {m.label}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

// Direct labels at the right ends of lines, in the gutter (scales(..., GUTTER)).
// Positions are set over every item, drawn or not, so a label never moves
// when another line arrives; overlapping labels are pushed apart and kept
// inside the plot's height. items: [{ key, v (end value), lines: [text],
// color, on }].
const LH = 16;
// `delay` (ms) holds a label back until its line, drawn by DrawPath over
// 1200ms, has nearly reached the line end, so no name shows before its line.
export function EndLabels({ sc, items, delay = 0 }) {
  const top = M.t;
  const bot = H - M.b;
  const placed = items
    .filter((it) => Number.isFinite(it.v))
    .map((it) => ({ ...it, h: it.lines.length * LH, y: sc.Y(it.v) }))
    .sort((a, b) => a.y - b.y);
  // first line centred on the line end, then push apart downwards
  placed.forEach((p, i) => {
    p.t = p.y - LH / 2;
    if (i && p.t < placed[i - 1].t + placed[i - 1].h) p.t = placed[i - 1].t + placed[i - 1].h;
  });
  // keep inside the bottom, pushing up where needed
  for (let i = placed.length - 1; i >= 0; i--) {
    const limit = i === placed.length - 1 ? bot : placed[i + 1].t;
    if (placed[i].t + placed[i].h > limit) placed[i].t = limit - placed[i].h;
  }
  placed.forEach((p) => {
    p.t = Math.max(top - 6, p.t);
  });
  const x = sc.X(sc.x1) + 6;
  return (
    <g className="p2-end-labels">
      {placed.map((p) => (
        <FadeG key={p.key} on={p.on} delay={p.on ? delay : 0}>
          <text className="p2-end-label" x={x} y={p.t + LH * 0.75} style={{ fill: p.color }}>
            {p.lines.map((l, i) => (
              <tspan key={l} x={x} dy={i ? LH : 0}>
                {l}
              </tspan>
            ))}
          </text>
        </FadeG>
      ))}
    </g>
  );
}

// A plain icon (a concept) before a line of text: part 2 gives every text
// element one, titles, sources, links and disclosures included.
export function Tx({ icon, size = 14, children }) {
  return (
    <>
      <Icon name={iconFor(icon)} size={size} className="p2-tx-icon" />
      {children}
    </>
  );
}

// The frame around a graphic: title, unit, the drawing, a legend, the source.
export function Figure({ title, unit, legend, source = SOURCE, icon = 'path', children }) {
  return (
    <figure className="p2-figure">
      <p className="story-figure-title">
        <Tx icon={icon}>{title}</Tx>
      </p>
      {unit ? <p className="story-figure-unit">{unit}</p> : null}
      {children}
      {legend?.length ? (
        <ul className="p2-legend">
          {legend.map((l) => (
            <li key={l.key} className={l.on ? 'is-on' : undefined}>
              <span className={`p2-swatch${l.dashed ? ' is-dashed' : ''}${l.thin ? ' is-thin' : ''}`} style={{ '--sw': l.color }} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption className="story-source">
        <Tx icon="source" size={12}>
          {source}
        </Tx>
      </figcaption>
    </figure>
  );
}

// "Figures: <link>" at the foot of a step card.
export function More({ children, ...link }) {
  return (
    <p className="p2-more">
      <Icon name={iconFor('link')} size={14} />
      <NavLink {...link}>{children}</NavLink>
    </p>
  );
}
