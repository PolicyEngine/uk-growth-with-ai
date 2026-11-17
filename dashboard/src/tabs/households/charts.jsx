'use client';

import { useEffect, useRef, useState } from 'react';
import { NavLink } from '@/lib/nav.jsx';
import { MINUS } from '@/tabs/story/part3/format.js';

// Chart pieces for Explore > Households. Text stays HTML (legible at phone
// width); marks are positioned spans or a measured SVG. A value whose home
// is story part 3 is not reprinted here: its row carries one link to the
// step ("See story, step N"), spanning the cells it would have filled.
// Every figure is in the DOM from the first render; entry beats change
// opacity and transforms only. Tooltips and popovers mount only while open.

// One link per row to the story scene that prints the row's other figures,
// named (round 2: the Story has no numbered steps).
export function StoryRef({ step }) {
  return (
    <NavLink tab="story" anchor={step.anchor} className="hh-ref" title={`Printed in the Story, part 3: ${step.name}`}>
      Story: {step.name}
    </NavLink>
  );
}

// Part 3's scenes and the step each link lands on.
export const STEP = {
  central: { name: 'the main case', anchor: 'p3-central-step' },
  rules: { name: 'who loses the job', anchor: 'p3-rules-step' },
  margin: { name: 'job loss vs wage cuts', anchor: 'p3-margin-step' },
  deciles: { name: 'where the loss falls', anchor: 'p3-deciles-step' },
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

// The cost × poverty plane: cost on x, the change in absolute poverty on y,
// both from zero. `points`: [{ id, x, y, icon, group, ring, name }];
// `arrows`: [[fromId, toId]] (callers draw them only within a group); `off`:
// a point beyond the x scale, drawn as an arrow at the right edge with its
// printed value. Names and values are in the list under the plane.
export function Plane({ points, arrows = [], xMax, yMax, xUnit, yUnit, on, off, label, height = 240, yTitle, xTitle }) {
  const [ref, W] = useWidth(560);
  const L = 48;
  // room for the axis titles: the y title above the plot, the x title
  // under the tick labels
  const B = xTitle ? 40 : 24;
  const T = yTitle ? 24 : 12;
  // room at the right for the off-scale arrow; its value sits above it,
  // ending where the arrow ends (clear of the Replay button in the corner)
  const R = off ? 40 : 18;
  const pw = W - L - R;
  const ph = height - T - B;
  const X = (v) => L + (v / xMax) * pw;
  const Y = (v) => T + ph - (v / yMax) * ph;
  const at = Object.fromEntries(points.map((p) => [p.id, p]));
  return (
    <div className="hh-plane" ref={ref}>
      <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
        <defs>
          <marker id={`hh-head-${label.length}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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
              markerEnd={`url(#hh-head-${label.length})`}
              style={{ transitionDelay: `${500 + i * 300}ms` }}
            />
          );
        })}
        {off ? (
          <path
            className={`hh-arrow is-off${on ? ' is-on' : ''}`}
            d={`M${L + pw - 36},${Y(off.y)} L${L + pw + 8},${Y(off.y)}`}
            pathLength={1}
            markerEnd={`url(#hh-head-${label.length})`}
          />
        ) : null}
      </svg>
      {/* tick labels as HTML (scale, not data: data-axis; SVG text would
          still reach innerText inside a hidden group) */}
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
      {/* plain dots, each with a direct label (round 2, C13); `lab` is the
          short label, `pos` where it sits (r, l, t, b, tl, br); a point
          with no `lab` is named by its group's label or the list below */}
      {points.map((p, i) => (
        <span
          key={p.id}
          className={`hh-pt is-${p.group ?? 'a'}${p.ring ? ' is-ring' : ''}${on ? ' is-on' : ''}`}
          style={{ left: X(p.x), top: Y(p.y), transitionDelay: `${i * 90}ms` }}
          title={p.name}
          aria-hidden="true"
        />
      ))}
      {points
        .filter((p) => p.lab)
        .map((p, i) => (
          <span key={`l-${p.id}`} className={`hh-pt-lab is-${p.pos ?? 'r'}${on ? ' is-on' : ''}`} style={{ left: X(p.x), top: Y(p.y), transitionDelay: `${300 + i * 90}ms` }} aria-hidden="true">
            {p.lab}
          </span>
        ))}
      {off ? (
        <span className={`hh-off-val${on ? ' is-on' : ''}`} style={{ right: W - (L + pw + 8), top: Y(off.y) - 4 }}>
          {off.text}
        </span>
      ) : null}
    </div>
  );
}

// The list under a plane: one row per point, its marker, the name, the
// values whose home is here, and one story link for the rest (a cell
// { span, node } spans that many value columns).
export function PointList({ rows, cols, wideFirst = false }) {
  return (
    <div className={`hh-list${wideFirst ? ' is-wide-c1' : ''}`} style={{ '--hh-cols': cols.length }}>
      <div className="hh-list-head" aria-hidden="true">
        <span />
        <span />
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <ul>
        {rows.map((r) =>
          r.group ? (
            <li key={r.id} className="hh-list-group">
              {r.group}
            </li>
          ) : (
            <li key={r.id} className={`hh-list-row is-${r.tone ?? 'a'}`} data-row={r.id}>
              <span className={`hh-pt-key is-${r.tone ?? 'a'}${r.ring ? ' is-ring' : ''}`} aria-hidden="true" />
              <span className="hh-list-label">{r.label}</span>
              {r.cells.map((c, i) =>
                c && c.span ? (
                  <span key={i} className="hh-list-span" style={{ gridColumn: `span ${c.span}` }}>
                    {' '}
                    {c.node}
                  </span>
                ) : (
                  <span key={i} className="hh-val">
                    {' '}
                    {c}
                  </span>
                ),
              )}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
