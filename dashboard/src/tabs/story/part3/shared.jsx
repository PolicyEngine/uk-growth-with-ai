'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import Icon from '@/components/ab/Icon.jsx';
import { GrowRect } from '@/components/story/primitives.jsx';
import { useInView, useReducedMotion } from '@/components/story/motion.js';
import { partial } from '@/components/story/CountUp.jsx';
import { iconFor } from '@/lib/concepts.js';
import D from '@/data/aiStudy2425.json';

// Shared pieces of part 3 and of Explore > Households: the data, lookups,
// the source line, the chips and the bar rows. Figure text is HTML; bars are
// small aria-hidden SVGs, so text stays legible at phone width and never
// repeats inside an aria-label.

export { D };
export const PR_URL = 'https://github.com/PolicyEngine/uk-ai-study/pull/18';
export const PAPER_URL = 'https://github.com/PolicyEngine/uk-ai-study/blob/data/microcosm-2024-25/paper/main.pdf';
export const MODEL_YEAR = 'FY 2026–27';
// The OBR scenario the smaller run is sized to, read from the ladder note
// ("sized to the OBR March 2026 scenario").
export const OBR_SCENARIO = `the OBR’s ${/OBR (\w+ \d{4}) scenario/.exec(D.ladder.find((r) => r.id === 'obr')?.note ?? '')?.[1] ?? ''} displacement scenario`.replace('  ', ' ');

// A plain inline icon by concept, leading a line of the story's text
// (figure titles, keys, source lines, row labels). Story only.
export function Ico({ c, size = 14 }) {
  return <Icon name={iconFor(c)} size={size} className="p3-ico" />;
}

export const byId = (rows, id) => rows.find((r) => r.id === id);
export const ladder = (id) => byId(D.ladder, id);
export const rule = (id) => byId(D.rules, id);
export const perPound = (id) => byId(D.per_pound, id);

export function Source({ children }) {
  return (
    <p className="story-source p3-iconed">
      <Ico c="source" size={12} />
      Source: PolicyEngine-UK microsimulation, provisional; {D.source.dataset}, {MODEL_YEAR}
      {children ? <>; {children}</> : null}.{' '}
      <a href={PR_URL} target="_blank" rel="noreferrer">
        uk-ai-study PR #{D.source.pr}
      </a>
    </p>
  );
}

export function FigureHead({ title, unit, icon = 'path', replay }) {
  return (
    <>
      <p className="story-figure-title p3-iconed">
        <Ico c={icon} size={16} />
        <span>{title}</span>
        {replay ? <Replay {...replay} /> : null}
      </p>
      {unit ? (
        <p className="story-figure-unit p3-iconed">
          <Ico c="measure" size={12} />
          <span>{unit}</span>
        </p>
      ) : null}
    </>
  );
}

// The wage-cut, take-up and OBR-sized results sit outside the study's
// rebuild and attestation (Fable's review of #18, H1): a second, specific chip.
export function OutsideRebuild() {
  return <span className="p3-chip">Provisional: outside the study’s attested rebuild</span>;
}

// The story's variant (part 3 states "provisional" once, in its opening
// call-out): a small inline flag with a plain icon, placed in the figure
// whose runs it covers. Explore keeps OutsideRebuild above.
export function OutsideRebuildFlag({ className = '' }) {
  return (
    <p className={`p3-flag ${className}`.trim()}>
      <Icon name={iconFor('provisional')} size={14} /> Outside the study’s attested rebuild
    </p>
  );
}

// A horizontal bar from zero, `value` out of `max`.
export function HBar({ value, max, on = true, fill = 'p3-fill-neutral', delay = 0 }) {
  return (
    <svg className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <rect className="p3-bar-track" x={0} y={1} width={100} height={8} />
      <GrowRect x={0} y={1} width={(Math.max(0, value) / max) * 100} height={8} on={on} horizontal className={fill} delay={delay} />
    </svg>
  );
}

// Two segments end to end from zero: [a, b] out of `max`.
export function StackBar({ parts, max, on = true }) {
  const ws = parts.map(([v]) => (Math.max(0, v) / max) * 100);
  const xs = ws.map((_, i) => ws.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      <rect className="p3-bar-track" x={0} y={1} width={100} height={8} />
      {parts.map(([, fill], i) => (
        <GrowRect key={i} x={xs[i]} y={1} width={ws[i]} height={8} on={on} horizontal className={fill} delay={i * 150} />
      ))}
    </svg>
  );
}

// A diverging bar about zero on [lo, hi]. A negative bar is drawn in a
// mirrored group so it grows out of the zero line like a positive one.
export function DivBar({ value, lo, hi, on = true, fill }) {
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

// A step card's caveats, folded: the story keeps cards short and puts the
// longer reasoning here. Prose only: a figure never goes in a closed
// disclosure (the number check reads rendered text).
export function About({ children }) {
  return (
    <details className="p3-about">
      <summary>
        <Ico c="caveat" size={12} /> About these figures
      </summary>
      {children}
    </details>
  );
}

// Entry beats (addendum B0): a one-card scene plays its beats once, when its
// figure comes into view, and a Replay button runs them again. Every label
// and value is in the DOM from the first render; beats change opacity and
// transforms only. `on` is false until the figure is seen (plus a short
// hold), true after; under reduced motion it is true at once and nothing
// moves. While a replay resets the figure, `reset` is true (the figure
// snaps back without a transition, then plays again). Without
// IntersectionObserver (tests, old browsers) the figure counts as seen.
// Returns [ref, entry]; the shape matches Scrolly's ctx.entered, so a later
// swap to it is local.
export function useEntry(hold = 300) {
  const [ref, seen] = useInView({ rootMargin: '0px 0px -12% 0px' });
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [played, setPlayed] = useState(-1);
  useEffect(() => {
    if (!seen || reduce) return undefined;
    const t = setTimeout(() => setPlayed(run), run ? 60 : hold);
    return () => clearTimeout(t);
  }, [seen, reduce, run, hold]);
  const on = reduce || played === run;
  return [ref, { on, reduce, reset: run > 0 && !on, replay: { reduce, onClick: () => setRun((r) => r + 1) } }];
}

// The figure-head Replay button (24px target); not rendered under reduced
// motion, where there is nothing to replay. Lucide's RotateCcw drawn as a
// plain icon, like Icon.jsx (no concept: until F's shared Replay lands).
export function Replay({ reduce, onClick }) {
  if (reduce) return null;
  return (
    <button type="button" className="p3-replay" onClick={onClick} aria-label="Replay the animation" title="Replay">
      <span className="plain-icon" aria-hidden="true">
        <RotateCcw size={14} strokeWidth={1.8} />
      </span>
    </button>
  );
}

// A scene's class list: entry state, and the no-transition reset.
export const entryClass = (e, base = '') => `${base}${e.on ? ' is-on' : ''}${e.reset ? ' p3-reset' : ''}`.trim();

// A scene sub-header over a group of blocks (part 3 reads as three scenes:
// the cost, who it falls on, what moves it). The rail reads [data-scene].
export function SceneHead({ title, icon }) {
  return (
    <header className="scene-head p3-scene-head" data-scene={title}>
      <Ico c={icon} size={16} />
      <span>{title}</span>
    </header>
  );
}

// A stat that counts up once its scene is `on`, `delay` ms after the beat
// starts. The exact value is always in the DOM (visually hidden, read once by
// screen readers and the number checks); the drawn copy is aria-hidden and
// ends on the same string. Until its turn the drawn copy holds the final
// string at opacity 0 (no zero is ever held on screen; print shows it).
export function Count({ value, on, delay = 0, reduce }) {
  const text = String(value);
  // -1: waiting for its turn (drawn copy hidden); 0..1 counting; 1 done
  const [frac, setFrac] = useState(1);
  useEffect(() => {
    if (!on || reduce) return undefined;
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (t) => {
      const k = (t - t0) / 600;
      setFrac(k < 0 ? -1 : Math.min(1, 1 - (1 - Math.min(1, k)) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, reduce, delay]);
  const shown = !on || reduce || frac >= 1 || frac < 0 ? text : partial(text, frac);
  const visible = reduce || (on && frac >= 0);
  return (
    <span className={`count-up p3-count${visible ? ' is-on' : ''}`}>
      <span className="visually-hidden">{text}</span>
      <span className="count-up-vis" aria-hidden="true" data-final={text} data-text={shown} />
    </span>
  );
}
