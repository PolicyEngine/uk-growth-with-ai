'use client';

import { Fragment, cloneElement, isValidElement } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { DivBar, HBar, StackBar } from '@/tabs/story/part3/shared.jsx';
import { MINUS } from '@/tabs/story/part3/format.js';

// Small chart pieces for Explore > Households: labelled bar rows in HTML
// (text stays legible at phone width) with aria-hidden SVG bars. A value
// whose home is the story is not reprinted: its cell links to the step.

// A cell that points to the story step printing this figure.
export function StoryRef({ step, wide = false }) {
  return (
    <NavLink tab="story" anchor={step.anchor} className={`hh-ref${wide ? ' is-wide' : ''}`} title={`Printed in story part 3, step ${step.n}`} aria-label={`See story part 3, step ${step.n}`}>
      <Icon name="link" size={12} strokeWidth={2} /> {wide ? `See story, step ${step.n}` : `Step ${step.n}`}
    </NavLink>
  );
}

// Adjacent cells that link to the same story step become one link spanning
// those columns ("See story, step N"), never "Step 6 Step 6".
export function mergeRefs(cells) {
  const out = [];
  for (const c of cells) {
    const step = isValidElement(c) && c.type === StoryRef ? c.props.step : null;
    const prev = out[out.length - 1];
    if (step && prev?.step === step) prev.span += 1;
    else out.push({ node: c, step, span: 1 });
  }
  return out.map((x) => (x.span > 1 ? { ...x, node: cloneElement(x.node, { wide: true }) } : x));
}

export const STEP = {
  central: { n: 1, anchor: 'p3-central-step' },
  rules: { n: 5, anchor: 'p3-rules-step' },
  margin: { n: 6, anchor: 'p3-margin-step' },
  moves: { n: 7, anchor: 'p3-moves-step' },
  deciles: { n: 4, anchor: 'p3-deciles-step' },
};

// Rows: [{ id, label, bar: { kind, value | parts, fill }, cells: [node] }].
// A plain bar longer than `hi` is drawn to the edge and marked off scale.
// `cols` names the value columns; the bar spans the space left of them.
export function BarRows({ id, cols, rows, lo = 0, hi, className = '' }) {
  const n = cols.length;
  return (
    <div className={`hh-rows cols-${n} ${className}`} id={id} style={{ '--hh-cols': n }}>
      <div className="hh-head" aria-hidden="true">
        <span />
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <ol>
        {rows.map((r) =>
          r.group ? (
            <li key={r.id} className="hh-group">
              {r.group}
            </li>
          ) : (
            <li key={r.id} className={`hh-row${r.muted ? ' is-muted' : ''}`} data-row={r.id}>
              <span className="hh-label">{r.label}</span>
              <span className={`hh-bar${r.bar && !r.bar.kind && r.bar.value > hi ? ' is-over' : ''}`}>
                {r.bar?.kind === 'div' ? (
                  <DivBar value={r.bar.value} lo={lo} hi={hi} fill={r.bar.fill} />
                ) : r.bar?.kind === 'stack' ? (
                  <StackBar parts={r.bar.parts} max={hi} />
                ) : r.bar ? (
                  <HBar value={Math.min(r.bar.value, hi)} max={hi} fill={r.bar.fill} />
                ) : null}
              </span>
              {mergeRefs(r.cells).map((c, i) => (
                <Fragment key={i}>
                  {' '}
                  <span className={`hh-val${i ? ' hh-val-2' : ''}${c.span > 1 ? ' is-span' : ''}`} style={c.span > 1 ? { gridColumn: `span ${c.span}` } : undefined}>
                    {c.node}
                  </span>
                </Fragment>
              ))}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

// Axis ticks above a diverging chart, as data-axis text (scale, not data).
export function Ticks({ lo, hi, step, unit = '%' }) {
  const ticks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return (
    <div className="hh-ticks" aria-hidden="true" data-axis="">
      {ticks.map((t) => (
        <span key={t} style={{ left: `${((t - lo) / (hi - lo)) * 100}%` }}>
          {t > 0 ? '+' : t < 0 ? MINUS : ''}
          {Math.abs(t)}
          {unit}
        </span>
      ))}
    </div>
  );
}
