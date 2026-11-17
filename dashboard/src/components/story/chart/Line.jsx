'use client';

import { useId } from 'react';

// A series line: straight segments by default; curve="monotone" (monotone-x,
// no overshoot) only for the welfare curve and dense monthly series. Gaps
// (non-finite values) break the line. Draws itself in along its own path
// when `on` (700ms; dashed lines fade in instead), then an end dot (r 3.5,
// 2px surface halo) appears. `gradient` adds the zero-anchored area (the
// colour at 18% at the line, 0% at zero) and is ignored unless zero is in
// the y domain: never on a truncated axis.
//
// weight: 'main' 2.5px, 'other' 2px, 'context' 1.5px.
//
//   <Line x={x} y={y} xs={years} ys={values} color="var(--series-2)" on={seen} gradient />

const W = { main: 2.5, other: 2, context: 1.5 };
const f1 = (v) => (Math.round(v * 10) / 10).toString();

// Runs of consecutive finite points, as [[px, py], ...] in pixels.
function runs(x, y, xs, ys) {
  const out = [];
  let cur = null;
  ys.forEach((v, i) => {
    if (!Number.isFinite(v) || !Number.isFinite(xs[i])) {
      cur = null;
      return;
    }
    if (!cur) out.push((cur = []));
    cur.push([x(xs[i]), y(v)]);
  });
  return out;
}

const sign = (v) => (v < 0 ? -1 : 1);

// Monotone-x tangents (Fritsch-Carlson, as d3's curveMonotoneX).
function tangents(pts) {
  const n = pts.length;
  const t = new Array(n).fill(0);
  const s = [];
  for (let i = 0; i < n - 1; i++) s.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1));
  for (let i = 1; i < n - 1; i++) {
    const h0 = pts[i][0] - pts[i - 1][0];
    const h1 = pts[i + 1][0] - pts[i][0];
    const p = (s[i - 1] * h1 + s[i] * h0) / (h0 + h1 || 1);
    t[i] = (sign(s[i - 1]) + sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0;
  }
  if (n > 1) {
    t[0] = (3 * s[0] - t[1]) / 2;
    t[n - 1] = (3 * s[n - 2] - t[n - 2]) / 2;
  }
  return t;
}

function runPath(pts, curve) {
  if (!pts.length) return '';
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  if (curve !== 'monotone' || pts.length < 3) {
    for (let i = 1; i < pts.length; i++) d += `L${f1(pts[i][0])},${f1(pts[i][1])}`;
    return d;
  }
  const t = tangents(pts);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = (x1 - x0) / 3;
    d += `C${f1(x0 + dx)},${f1(y0 + dx * t[i])} ${f1(x1 - dx)},${f1(y1 - dx * t[i + 1])} ${f1(x1)},${f1(y1)}`;
  }
  return d;
}

// The SVG path of a series through scales x and y.
export function linePath(x, y, xs, ys, curve = 'linear') {
  return runs(x, y, xs, ys)
    .map((r) => runPath(r, curve))
    .join('');
}

export default function Line({
  x,
  y,
  xs,
  ys,
  color = 'var(--pe-gray-800)',
  weight = 'main',
  width,
  curve = 'linear',
  dashed = false,
  on = true,
  delay = 0,
  end = true,
  gradient = false,
  className = '',
}) {
  const id = useId().replace(/:/g, '');
  const parts = runs(x, y, xs, ys);
  const d = parts.map((r) => runPath(r, curve)).join('');
  const last = parts.length ? parts[parts.length - 1][parts[parts.length - 1].length - 1] : null;
  const [d0, d1] = y.domain ?? [0, 0];
  const zeroIn = Math.min(d0, d1) <= 0 && Math.max(d0, d1) >= 0;
  const area = gradient && zeroIn && parts.length === 1 && parts[0].length > 1;
  let areaD = '';
  let far = 0;
  if (area) {
    const y0 = y(0);
    const pts = parts[0];
    areaD = `${runPath(pts, curve)}L${f1(pts[pts.length - 1][0])},${f1(y0)}L${f1(pts[0][0])},${f1(y0)}Z`;
    far = pts.reduce((m, p) => (Math.abs(p[1] - y0) > Math.abs(m - y0) ? p[1] : m), y0);
  }
  const sw = width ?? W[weight] ?? 2;
  const style = { stroke: color, strokeWidth: sw, '--ch-delay': `${delay}ms` };
  return (
    <g className={`ch-series ${className}`.trim()}>
      {area ? (
        <>
          <defs>
            <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={far} y2={y(0)}>
              <stop offset="0" stopColor={color} stopOpacity="0.18" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className={`ch-area${on ? ' is-on' : ''}`} d={areaD} fill={`url(#g${id})`} style={{ '--ch-delay': `${delay + 500}ms` }} />
        </>
      ) : null}
      <path
        className={`ch-line${dashed ? ' is-dashed' : ''}${on ? ' is-on' : ''}`}
        d={d}
        pathLength={dashed ? undefined : 1}
        style={dashed ? { ...style, strokeDasharray: '6 4' } : style}
      />
      {end && last ? (
        <circle className={`ch-end${on ? ' is-on' : ''}`} cx={last[0]} cy={last[1]} r={3.5} style={{ fill: color, '--ch-delay': `${delay + 650}ms` }} />
      ) : null}
    </g>
  );
}
