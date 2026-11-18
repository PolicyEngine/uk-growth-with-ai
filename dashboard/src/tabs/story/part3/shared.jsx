'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { GrowRect } from '@/components/story/primitives.jsx';
import { useEnterState, useInView, useReducedMotion } from '@/components/story/motion.js';
import { Replay } from '@/components/story/chart/index.js';
import { iconFor } from '@/lib/concepts.js';
import D from '@/data/aiStudy2425.json';
import { COMMIT, REPO_URL, REFS, fileUrl } from './sources.jsx';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem, fileItem } from '@/lib/sourceItems.js';
import { Fig as FigChip } from '@/components/story/highlight.jsx';

// Shared pieces of part 3 and of Explore > Households: the data, lookups,
// the source line, the chips and the bar rows. Figure text is HTML; bars are
// small aria-hidden SVGs, so text stays legible at phone width and never
// repeats inside an aria-label.

export { D };
// From the data once refreshed (source.pr_url, source.paper_url: main at the
// merged commit); the earlier data carry neither.
export const PR_URL = D.source.pr_url ?? 'https://github.com/PolicyEngine/uk-ai-study/pull/18';
export const PAPER_URL = D.source.paper_url ?? 'https://github.com/PolicyEngine/uk-ai-study/blob/data/microcosm-2024-25/paper/main.pdf';
// The model year, read from the data: a top-level `model_year` (as the
// refreshed data carry it, e.g. "2027-28" or "FY 2027-28"), else the year in
// the baseline's note ("Baseline (no shock), FY 2026-27"). Printed with an en
// dash: "FY 2026–27".
export function fmtModelYear(raw) {
  const m = /(\d{4})\s*[-–/]\s*(\d{2,4})/.exec(String(raw ?? ''));
  return m ? `FY ${m[1]}–${m[2].slice(-2)}` : '';
}
export const MODEL_YEAR = D.model_year_label ?? fmtModelYear(D.model_year ?? D.baseline?.absolute_bhc_pct?.note);
// The study's status, read from the data: a `status` field once the data
// follow the merged study ("merged"), else the `provisional` flag. Story
// text that says "provisional" or "draft" is shown only while this is true.
export const PROVISIONAL = D.status != null ? /provisional|draft|open|review/i.test(String(D.status)) : D.provisional === true;
// The baselines' owner: the field the data builder adds, else the model.
export const BASELINE_LABEL = D.baseline?.baseline_source ?? 'PolicyEngine-UK baseline';
// The status note's caveat (the build manifest attests the results tree
// "without a full clean-room rerun"), said once in the part's call-out.
export const NO_CLEAN_RERUN = /without a full clean-room rerun/i.test(D.status_note ?? '');
// Runs outside the study's attested rebuild: the manifest's list once the
// data carry it (empty after the merge), else every flagged run while the
// study is provisional.
export const OUTSIDE_REBUILD = Array.isArray(D.method?.outside_rebuild) ? D.method.outside_rebuild.length > 0 : PROVISIONAL;
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

// The one "Sources and notes" button of every part 3 figure, after its
// title (components/ui/SourceLine.jsx). Behind it: the model, the year and
// the basis (`children`, e.g. "50 draws"), the figure's notes in labelled
// groups (`groups`: [{ title: 'Draws', notes: [...] }], worded as they
// were), then the sources: the study's results at the data's commit, each
// result file (`files`: paths from aiStudy2425.json's `file` fields) and
// the papers the figure cites (`refs`: ids in sources.jsx REFS).
export function Source({ children, files = [], groups = [], refs = [], items: extra = [] }) {
  const fs = [...new Set(files.filter(Boolean))];
  const basis = (
    <>
      PolicyEngine-UK microsimulation{PROVISIONAL ? ', provisional' : ''}, {MODEL_YEAR}
      {children ? <>, {children}</> : null}
    </>
  );
  const items = [
    fileItem('Household study results', `${REPO_URL}/tree/${COMMIT}/results`, 'PolicyEngine', `at ${COMMIT}`),
    ...fs.map((f) => fileItem(f, fileUrl(f), 'PolicyEngine')),
    ...refs.map((id) => REFS[id] && docItem(REFS[id].label, REFS[id].url, undefined, REFS[id].title)),
    ...extra,
  ];
  return <SourceLine items={items} groups={[{ title: 'Model', notes: [basis] }, ...groups]} />;
}

// `y` and `x` are the axis titles, printed in the unit line and marked
// data-axis-title (the value axis is "y", also on horizontal bars). A title
// with a figure-like token ("£1", "1%") passes `axis` so the number check
// skips it.
export function AxisTitle({ axis, children, scale = false, className = '' }) {
  return (
    <span className={`p3-axis-title ${className}`.trim()} data-axis-title={axis} {...(scale ? { 'data-axis': '' } : {})}>
      {children}
    </span>
  );
}

// `kicker`: a muted line above the title, on its left edge (as a model
// badge), e.g. which run the figure shows.
export function FigureHead({ title, unit, y, x, icon = 'path', replay, actions, source, kicker }) {
  return (
    <>
      {kicker ? <p className="story-figure-kicker">{kicker}</p> : null}
      <p className="story-figure-title p3-iconed">
        <Ico c={icon} size={16} />
        <span>{title}</span>
        {source}
        {replay || actions ? (
          <span className="p3-head-actions">
            {actions}
            {replay ? <Replay onClick={replay} /> : null}
          </span>
        ) : null}
      </p>
      {unit || y || x ? (
        <p className="story-figure-unit">
          <span>
            {y ? <AxisTitle axis="y">{y}</AxisTitle> : null}
            {y && x ? '; ' : null}
            {x ? <AxisTitle axis="x">{x}</AxisTitle> : null}
            {(y || x) && unit ? '. ' : null}
            {unit}
          </span>
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
// Shown only while some runs are outside the rebuild (method.outside_rebuild;
// claim audit P3-22).
export function OutsideRebuildFlag({ className = '' }) {
  if (!OUTSIDE_REBUILD) return null;
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

// Entry beats (addendum B0): a one-card scene plays its beats once, when its
// figure comes into view (Scrolly's ctx.entered, through F's useEnterState),
// and the figure head's Replay button runs them again. Every label and value
// is in the DOM from the first render; beats change opacity and transforms
// only. `on` is false until entered (plus the hold), true after; under
// reduced motion it is true at once. A replay snaps the figure back for one
// beat (`reset`, no transitions), then plays it again; `run` counts replays
// (a key for anything that must restart, such as the Sankey's pour).
export function useBeat(entered = true) {
  const reduce = useReducedMotion();
  const armed = useEnterState(false, true, entered);
  const [run, setRun] = useState(0);
  const [reset, setReset] = useState(false);
  // Replays tied to scroll position, both ways (Vahid, round 1): `attach` (a
  // callback ref) goes on the figure; once it has played, the figure leaving the screen (up or
  // down) snaps it back to its start, unseen, and coming back plays it
  // again. The first play still waits for Scrolly's `entered` (after the
  // topic opener). Every width, phones included.
  const [el, attach] = useState(null);
  const [away, setAway] = useState(false);
  const awayRef = useRef(false);
  useEffect(() => {
    if (!el || reduce || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((x) => x.isIntersecting);
        if (!vis && !awayRef.current) {
          awayRef.current = true;
          setAway(true);
        } else if (vis && awayRef.current) {
          awayRef.current = false;
          setAway(false);
          setRun((r) => r + 1);
        }
      },
      { threshold: 0, rootMargin: '-10% 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, reduce]);
  useEffect(() => {
    if (!reset) return undefined;
    const t = setTimeout(() => setReset(false), 60);
    return () => clearTimeout(t);
  }, [reset, run]);
  // `settled`: the entry beats have played (about 2.8s after `on`), so the
  // step's highlight may dim the other marks; until then every mark plays
  // at full strength (CSS: .p3-scene:not(.is-settled)).
  const on = reduce || (armed && !reset && !away);
  const [settledRun, setSettledRun] = useState(-1);
  useEffect(() => {
    if (!on || reduce) return undefined;
    const t = setTimeout(() => setSettledRun(run), 2800);
    return () => clearTimeout(t);
  }, [on, reduce, run]);
  return {
    attach,
    on,
    settled: reduce || (on && settledRun === run),
    reduce,
    // away: snapped back with no transitions, ready to play again
    reset: reset || (away && !reduce),
    run,
    replay: () => {
      setReset(true);
      setRun((r) => r + 1);
    },
  };
}

// The same for a figure outside Scrolly (Explore > Households): entered when
// the box first comes into view. Returns [ref, beat].
export function useSeenBeat() {
  const [ref, seen] = useInView({ rootMargin: '0px 0px -12% 0px' });
  return [ref, useBeat(seen)];
}

export { Replay };

// A scene's class list: entry state, and the no-transition reset.
export const entryClass = (e, base = '') => `${base}${e.on ? ' is-on' : ''}${e.settled ? ' is-settled' : ''}${e.reset ? ' p3-reset' : ''}`.trim();

// ---------------------------------------------------------------------------
// One step, one sentence, one highlight (Vahid, 16 Nov: "someone cannot
// trace the text between the plots"). Each scene has at most three steps;
// each step is one sentence of about 15 words and declares `highlight`, the
// ids of the marks it is about. The figure's marks carry data-mark="<id>";
// Scrolly (S2's highlight.jsx) dims the rest while the step is active.
// Words in the text are S2's <Key id> (series colour and marker, from each
// scene's MarkProvider registry), numbers <Fig path mark>, markers <Num n>.
export { Fig, Key, MarkProvider, Num } from '@/components/story/highlight.jsx';

// A numbered marker on an HTML chart (the text's <Num n> twin): inside the
// marked row, so it dims and lights with it. Scale, not data (data-axis).
export function NumMarker({ n, className = '' }) {
  return (
    <span className={`hl-num p3-nm ${className}`.trim()} data-axis="" aria-hidden="true">
      {n}
    </span>
  );
}

// A quoted input as a number chip: not a result (data-input), so the number
// check skips it.
export function InputFig({ path, mark, children }) {
  return (
    <span data-input="">
      <FigChip path={path} mark={mark}>
        {children}
      </FigChip>
    </span>
  );
}
// A mark's props: data-mark (S2's highlight dims the marks a step does not name).
export const markProps = (id, className = '') => ({
  'data-mark': id,
  className,
});

// A step's one sentence as the card's line (Scrolly draws step.icon as the
// card's one icon), then the step's body, if any. The sentence is not also
// passed as step.title: a hidden copy would print its figures twice.
export const asLines = (steps) =>
  steps.map(({ title, body, ...s }) => ({
    ...s,
    body: (
      <>
        <p className="p3-step-line">{title}</p>
        {body ?? null}
      </>
    ),
  }));
