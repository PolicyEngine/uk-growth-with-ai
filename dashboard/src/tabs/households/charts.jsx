'use client';

import { useEffect, useRef, useState } from 'react';
import { MINUS } from '@/tabs/story/part3/format.js';

// Chart pieces for Explore > Households (item-24-fable.md). Text stays
// HTML (legible at phone width); marks are positioned spans or a measured
// SVG. Every value list is a real <table>: a label and its number are
// separate cells, so copied text and screen readers never run them
// together (section 3, "Labels and values"). Every figure is in the DOM
// from the first render; entry beats change opacity and transforms only.

// Part 3's scenes, for each card's one story link (Card `story`).
export const STEP = {
  central: { name: 'the main case', anchor: 'p3-central-step' },
  rules: { name: 'who loses the job', anchor: 'p3-rules-step' },
  margin: { name: 'job loss against wage cuts', anchor: 'p3-margin-step' },
  deciles: { name: 'where the loss falls', anchor: 'p3-deciles-step' },
  pound: { name: 'where a lost pound goes', anchor: 'p3-pound' },
};

// The measured width of a box (ResizeObserver), with a fallback for the
// server and tests.
export function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Below this width (px) a plane numbers its points instead of naming them
// (the direct labels collide at 390); the table under it shows the same
// numbers. The table's container query uses the same width.
export const NARROW = 460;

// "Nice" ticks from zero: three to five.
export function ticks(max, n = 4) {
  const raw = max / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => max / s <= n) ?? mag * 10;
  const out = [];
  for (let t = 0; t <= max + 1e-9; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}
export const signedTick = (t) => `${t > 0 ? '+' : t < 0 ? MINUS : ''}${Math.abs(t)}`;

// The cost × poverty plane: cost on x, the rise in absolute poverty on y,
// both from zero. `points`: [{ id, n, x, y, group, ring, name, lab, pos }]
// (`n` the number a narrow plane draws, and the table's marker shows);
// `arrows`: [[fromId, toId]] (callers draw them only within a group). Axis
// titles name the quantity only; the ticks carry £bn and pp.
export function Plane({ points, arrows = [], xMax, yMax, xUnit, yUnit, on, label, height = 240, yTitle, xTitle }) {
  const [ref, W] = useWidth(560);
  const narrow = W < NARROW;
  const L = 48;
  const B = xTitle ? 40 : 24;
  const T = yTitle ? 24 : 12;
  const R = 18;
  const pw = W - L - R;
  const ph = height - T - B;
  const X = (v) => L + (v / xMax) * pw;
  const Y = (v) => T + ph - (v / yMax) * ph;
  const at = Object.fromEntries(points.map((p) => [p.id, p]));
  const head = `hh-head-${label.length}`;
  return (
    <div className={`hh-plane${narrow ? ' is-narrow' : ''}`} ref={ref}>
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
        <defs>
          <marker id={head} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="hh-arrow-head" />
          </marker>
        </defs>
        <g className="hh-axis">
          {ticks(yMax).map((t) => (
            <line key={`y${t}`} x1={L} x2={L + pw} y1={Y(t)} y2={Y(t)} className={t === 0 ? 'hh-zero' : 'hh-grid'} />
          ))}
          <line x1={L} x2={L} y1={T} y2={T + ph} className="hh-zero" />
        </g>
        {yTitle ? (
          <text x={4} y={12} className="hh-axis-title" data-axis-title="y" data-axis="">
            {yTitle}
          </text>
        ) : null}
        {xTitle ? (
          <text x={L + pw / 2} y={height - 4} className="hh-axis-title" textAnchor="middle" data-axis-title="x" data-axis="">
            {xTitle}
          </text>
        ) : null}
        {arrows.map(([a, b], i) => {
          const p = at[a];
          const q = at[b];
          // stop short of the target dot
          const dx = X(q.x) - X(p.x);
          const dy = Y(q.y) - Y(p.y);
          const d = Math.hypot(dx, dy) || 1;
          const k = Math.max(0, (d - 9) / d);
          return (
            <path
              key={`${a}-${b}`}
              className={`hh-arrow is-${p.group ?? 'a'}${on ? ' is-on' : ''}`}
              d={`M${X(p.x)},${Y(p.y)} L${X(p.x) + dx * k},${Y(p.y) + dy * k}`}
              pathLength={1}
              markerEnd={`url(#${head})`}
              style={{ transitionDelay: `${500 + i * 300}ms` }}
            />
          );
        })}
      </svg>
      {/* tick labels as HTML (scale, not data: data-axis) */}
      <div className="hh-ticks-ov" data-axis="" aria-hidden="true">
        {ticks(yMax).map((t) => (
          <span key={`y${t}`} className="is-y" style={{ left: L - 6, top: Y(t) }}>
            {signedTick(t)}
            {yUnit}
          </span>
        ))}
        {ticks(xMax).map((t) => (
          <span key={`x${t}`} className="is-x" style={{ left: X(t), top: T + ph + 10 }}>
            {xUnit(t)}
          </span>
        ))}
      </div>
      {points.map((p, i) => (
        <span
          key={p.id}
          className={`hh-pt is-${p.group ?? 'a'}${p.ring ? ' is-ring' : ''}${on ? ' is-on' : ''}`}
          style={{ left: X(p.x), top: Y(p.y), transitionDelay: `${i * 90}ms` }}
          title={p.name}
          aria-hidden="true"
        />
      ))}
      {/* a wide plane: a direct label per point (`lab`, placed at `pos`: r,
          l, t, b, tl, br); a narrow one: each point's number */}
      {points
        .filter((p) => (narrow ? p.n != null : p.lab))
        .map((p, i) => (
          <span
            key={`l-${p.id}`}
            className={`hh-pt-lab ${narrow ? `is-num is-${p.npos ?? 'r'}` : `is-${p.pos ?? 'r'}`}${on ? ' is-on' : ''}`}
            style={{ left: X(p.x), top: Y(p.y), transitionDelay: `${300 + i * 90}ms` }}
            aria-hidden="true"
          >
            {narrow ? p.n : p.lab}
          </span>
        ))}
    </div>
  );
}

// A bar from `from` to `to` on a 0..`max` scale, or stacked `parts`
// ([[value, className], ...]) from zero. Drawn, never printed: the values
// are in their own cells.
export function Bar({ value, max, parts, fill = 'is-neutral', thin = false, delay = 0 }) {
  const segs = parts ?? [[value, fill]];
  // each segment starts where the ones before it end
  const lefts = segs.map((_, i) => segs.slice(0, i).reduce((a, [v]) => a + Math.max(0, v), 0));
  return (
    <span className={`hh-bar${thin ? ' is-thin' : ''}`} aria-hidden="true">
      {segs.map(([v, cls], i) => (
        <span key={i} className={`hh-bar-seg ${cls}`} style={{ left: `${(lefts[i] / max) * 100}%`, width: `${(Math.max(0, v) / max) * 100}%`, transitionDelay: `${delay + i * 160}ms` }} />
      ))}
    </span>
  );
}

// A value table (section 3): label | bar (optional) | value cells, each
// value in its own cell under a column head, right-aligned. Rows:
//   { group: node }                       a group head (16px, 600)
//   { id, label, cells: [node], bar?, marker?: { tone, ring, n }, main?, sub?, muted? }
// The main case: ring marker, label weight 600 (`main`). A sub-row is
// indented and muted (`sub`). On a narrow card the label takes its own
// line and the values sit under the column heads (`stack`, the default),
// or label, bar and values stay on one line (`inline`), or the bar and
// values share the second line (`barline`).
export function ValueTable({ cols, rows, bar = false, caption, rowHead = 'Row', layout = 'stack', className = '', foot }) {
  const width = 1 + (bar ? 1 : 0) + cols.length;
  return (
    <div className={`hh-tblwrap is-${layout} ${className}`.trim()} style={{ '--hh-n': cols.length }}>
      <table className={`hh-tbl${bar ? ' has-bar' : ''}`}>
        {caption ? <caption className="visually-hidden">{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col" className="hh-tbl-label">
              <span className="visually-hidden">{rowHead}</span>
            </th>
            {bar ? <td className="hh-tbl-bar" aria-hidden="true" /> : null}
            {cols.map((c) => (
              <th key={c} scope="col" className="hh-tbl-num">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            r.group ? (
              <tr key={r.id} className="hh-tbl-group">
                <th scope="colgroup" colSpan={width}>
                  {r.group}{' '}
                </th>
              </tr>
            ) : (
              <tr key={r.id} data-row={r.id} className={[r.main ? 'is-main' : '', r.sub ? 'is-sub' : '', r.muted ? 'is-muted' : ''].filter(Boolean).join(' ') || undefined}>
                <th scope="row" className="hh-tbl-label">
                  {r.marker ? (
                    <span className={`hh-pt-key is-${r.marker.tone ?? 'a'}${r.marker.ring ? ' is-ring' : ''}`} aria-hidden="true">
                      {r.marker.n != null ? <span className="hh-pt-n">{r.marker.n}</span> : null}
                    </span>
                  ) : null}
                  <span className="hh-tbl-name">{r.label}</span>{' '}
                </th>
                {bar ? <td className="hh-tbl-bar">{r.bar}</td> : null}
                {r.cells.map((c, i) => (
                  <td key={i} className="hh-tbl-num">
                    {' '}
                    {c}{' '}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
        {foot ? (
          <tfoot aria-hidden="true">
            <tr>
              <td className="hh-tbl-label" />
              {bar ? <td className="hh-tbl-bar">{foot}</td> : null}
              {cols.map((c) => (
                <td key={c} className="hh-tbl-num" />
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
