'use client';

import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';

// Shared pieces of part 2's line charts. The charts draw shapes only: the
// figures have their homes on other tabs, so the only numbers here are axis
// ticks, each marked data-axis so the number check can set them aside.
// The viewBox is narrow (400 wide) so tick text stays at least 11px when
// the graphic is phone width; story-part2.css caps the width on desktop.

export const W = 400;
export const H = 250;
const M = { l: 36, r: 14, t: 16, b: 28 };

export const SOURCE = 'OG-UK, PolicyEngine. 2028-surprise solves.';

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
export function scales(xs, values) {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  const pad = (hi - lo || 1) * 0.08;
  lo -= lo < 0 ? pad : 0;
  hi += pad;
  const { ticks, step } = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const X = (x) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r);
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

// The frame around a graphic: title, unit, the drawing, a legend, the source.
export function Figure({ title, unit, legend, source = SOURCE, children }) {
  return (
    <figure className="p2-figure">
      <p className="story-figure-title">{title}</p>
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
      <figcaption className="story-source">{source}</figcaption>
    </figure>
  );
}

// "Figures: <link>" at the foot of a step card.
export function More({ children, ...link }) {
  return (
    <p className="p2-more">
      <Icon name="arrowRight" size={14} />
      <NavLink {...link}>{children}</NavLink>
    </p>
  );
}
