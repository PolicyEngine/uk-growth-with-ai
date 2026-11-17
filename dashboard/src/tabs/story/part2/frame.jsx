'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { FadeG } from '@/components/story/primitives.jsx';
import { ModelBadge } from '@/components/story/chart/index.js';
import { ModelSource } from './sources.jsx';

// Shared pieces of part 2's line charts. The charts draw shapes only: the
// figures have their homes on other tabs, so the only numbers here are axis
// ticks, each marked data-axis so the number check can set them aside.
// The viewBox is narrow (400 wide) so tick text stays at least 11px when
// the graphic is phone width; story-part2.css caps the width on desktop.

export const W = 400;
export const H = 250;
const M = { l: 36, r: 14, t: 16, b: 28 };

// The "Sources and notes" button of every model figure (sources.jsx).
export const SOURCE = <ModelSource />;

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

export const tickText = (v, step) => {
  const dp = step < 1 ? (step < 0.25 ? 1 : String(step).split('.')[1]?.length ?? 1) : 0;
  const t = Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(Math.min(dp, 2));
  return v < -1e-9 ? `−${t}` : t;
};

// Scales for x values (years or birth years) and a y range padded to
// include zero and round ticks.
// Right gutter, in viewBox units, for direct labels at the line ends.
export const GUTTER = 104;
export function scales(xs, values, r = M.r, b = M.b) {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  const pad = (hi - lo || 1) * 0.08;
  // below zero: the same pad, or room for the zero line's label when no
  // value is negative
  lo -= lo < 0 ? pad : (hi - lo || 1) * 0.1;
  hi += pad;
  const { ticks, step } = niceTicks(lo, hi, 3);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const X = (x) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - r);
  const Y = (v) => H - b - ((v - lo) / (hi - lo)) * (H - M.t - b);
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

// A monotone-x curve through the points (Fritsch-Carlson: no overshoot),
// for the welfare-by-birth-year curve only (plan section 4), skipping gaps.
export function monotonePath(X, Y, xs, ys) {
  const runs = [];
  let cur = [];
  ys.forEach((v, i) => {
    if (Number.isFinite(v)) cur.push([X(xs[i]), Y(v)]);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  });
  if (cur.length) runs.push(cur);
  return runs
    .map((p) => {
      const n = p.length;
      if (n < 3) return p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
      const d = p.slice(1).map(([x, y], i) => (y - p[i][1]) / (x - p[i][0] || 1));
      const m = p.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
      for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) {
          m[i] = 0;
          m[i + 1] = 0;
          continue;
        }
        const a = m[i] / d[i];
        const b = m[i + 1] / d[i];
        const h = a * a + b * b;
        if (h > 9) {
          const t = 3 / Math.sqrt(h);
          m[i] = t * a * d[i];
          m[i + 1] = t * b * d[i];
        }
      }
      let out = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
      for (let i = 0; i < n - 1; i++) {
        const dx = (p[i + 1][0] - p[i][0]) / 3;
        out += `C${(p[i][0] + dx).toFixed(1)},${(p[i][1] + m[i] * dx).toFixed(1)} ${(p[i + 1][0] - dx).toFixed(1)},${(p[i + 1][1] - m[i + 1] * dx).toFixed(1)} ${p[i + 1][0].toFixed(1)},${p[i + 1][1].toFixed(1)}`;
      }
      return out;
    })
    .join('');
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
// Places direct labels in a column: each item's first line centred on its
// value (Y(v)), overlapping labels pushed apart downwards, then kept inside
// [top, bot]. Returns the items (finite values only) with `t`, the top of
// each label. items: [{ key, v, lines: [text], ... }].
export function placeLabels(items, Y, top, bot, lh = LH) {
  const placed = items
    .filter((it) => Number.isFinite(it.v))
    // `pad`: extra room above a label (its text drawn that much lower)
    .map((it) => ({ ...it, h: it.lines.length * lh + (it.pad ?? 0), y: Y(it.v) }))
    .sort((a, b) => a.y - b.y);
  placed.forEach((p, i) => {
    p.t = p.y - lh / 2 - (p.pad ?? 0);
    if (i && p.t < placed[i - 1].t + placed[i - 1].h) p.t = placed[i - 1].t + placed[i - 1].h;
  });
  for (let i = placed.length - 1; i >= 0; i--) {
    const limit = i === placed.length - 1 ? bot : placed[i + 1].t;
    if (placed[i].t + placed[i].h > limit) placed[i].t = limit - placed[i].h;
  }
  placed.forEach((p) => {
    p.t = Math.max(top - 6, p.t);
  });
  return placed;
}

export function EndLabels({ sc, items, delay = 0 }) {
  const placed = placeLabels(items, sc.Y, M.t, H - M.b);
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
export function Figure({ title, unit, legend, source = SOURCE, icon = 'path', head = null, className = '', model = 'oguk', xTitle = 'Year', children }) {
  return (
    <figure className={`p2-figure ${className}`}>
      <ModelBadge model={model} />
      <p className="story-figure-title p2-title-row">
        <span>
          <Tx icon={icon}>{title}</Tx>
        </span>
        {source}
      </p>
      {unit ? (
        <p className="story-figure-unit">{unit}</p>
      ) : null}
      {head}
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
      {xTitle ? (
        <span className="p2-axis-x" data-axis-title="x">
          {xTitle}
        </span>
      ) : null}
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
