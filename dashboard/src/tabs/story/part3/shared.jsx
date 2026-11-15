'use client';

import { GrowRect } from '@/components/story/primitives.jsx';
import D from '@/data/aiStudy2425.json';

// Shared pieces of part 3: the data, lookups, the source line and the bar
// rows. Figure text is HTML; bars are small aria-hidden SVGs, so text stays
// legible at phone width and never repeats inside an aria-label.

export { D };
export const PR_URL = 'https://github.com/PolicyEngine/uk-ai-study/pull/18';

export const byId = (rows, id) => rows.find((r) => r.id === id);
export const ladder = (id) => byId(D.ladder, id);
export const rule = (id) => byId(D.rules, id);
export const perPound = (id) => byId(D.per_pound, id);

export function Source({ children }) {
  return (
    <p className="story-source">
      Source: PolicyEngine-UK microsimulation, provisional; {D.source.dataset}
      {children ? <>; {children}</> : null}.{' '}
      <a href={PR_URL} target="_blank" rel="noreferrer">
        uk-ai-study PR #{D.source.pr}
      </a>
    </p>
  );
}

export function FigureHead({ title, unit }) {
  return (
    <>
      <p className="story-figure-title">{title}</p>
      {unit ? <p className="story-figure-unit">{unit}</p> : null}
    </>
  );
}

// A horizontal bar from zero, `value` out of `max`.
export function HBar({ value, max, on, fill = 'p3-fill-neutral', delay = 0 }) {
  return (
    <svg className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <rect className="p3-bar-track" x={0} y={1} width={100} height={8} />
      <GrowRect x={0} y={1} width={(Math.max(0, value) / max) * 100} height={8} on={on} horizontal className={fill} delay={delay} />
    </svg>
  );
}

// A diverging bar about zero on [lo, hi]. A negative bar is drawn in a
// mirrored group so it grows out of the zero line like a positive one.
export function DivBar({ value, lo, hi, on, fill }) {
  const span = hi - lo;
  const zx = (-lo / span) * 100;
  const w = (Math.abs(value) / span) * 100;
  return (
    <svg className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      {value >= 0 ? (
        <GrowRect x={zx} y={1} width={w} height={8} on={on} horizontal className={fill} />
      ) : (
        <g transform={`translate(${zx} 0) scale(-1 1)`}>
          <GrowRect x={0} y={1} width={w} height={8} on={on} horizontal className={fill} />
        </g>
      )}
      <line x1={zx} x2={zx} y1={0} y2={10} className="p3-zero" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
