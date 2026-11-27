'use client';

import { useState } from 'react';
import { NavLink } from '@/lib/nav.jsx';
import { useEnterState, useEntry } from '@/components/story/motion.js';
import { fmtDate } from '@/components/ui/SourceLine.jsx';
import { FACTS, LINKS, OPH_BASE, SERIES, SOURCES } from './data.js';
import { Ext } from './frame.jsx';
import { ukItem } from '@/lib/sourceItems.js';
import { idx1, pct1 } from './format.js';

// The UK vitals panel that opens part 1: one instrument panel (a single
// tinted band, one box) holding six metrics on shared baselines, each the
// latest published figure for one series: a small muted label, the big
// value, a sparkline of the series' recent past (its latest point
// emphasised; decorative, aria-hidden) and one muted line for the unit and
// period. Hovering or focusing a metric lights the same series in a part 1
// chart on screen, and swaps its unit line for the release dates. The
// panel's sources and its two definitions sit behind its one "Sources and
// notes" button (components/ui/SourceLine.jsx). It is the home of these six
// figures, and of GDP's year-on-year growth (the GDP sub-line): the step
// cards below do not repeat them. Each value is marked with its data-path.
// Motion only through the shared entry hooks (useEntry, useEnterState):
// the sparklines draw and the numbers settle once, the final value always
// shown; landed or reduced motion, drawn at once.

// "September 2026 (Wave 165, ...)" -> "Sep 2026"; "June to August 2026" ->
// "Jun–Aug 2026"; quarters and years as they are
const periodOf = (p) =>
  p
    .replace(/\s*\(.*$/, '')
    .replace(/^(\w+) to (\w+) (\d{4})$/, '$1–$2 $3')
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (m) => m.slice(0, 3));

export const VITALS = [
  {
    key: 'gdp',
    series: 'gdp_quarterly',
    last: 12,
    marks: ['gdp-annual', 'gdp-latest', 'q-now', 'q-past'],
    fact: 'gdp_quarterly_latest',
    icon: 'gdp',
    name: 'GDP',
    label: 'on the quarter',
    growth: true,
  },
  {
    key: 'productivity',
    series: 'productivity_oph',
    last: 12,
    marks: ['productivity'],
    fact: 'productivity_oph_latest',
    icon: 'productivity',
    name: 'Output per hour',
    label: `Index, ${OPH_BASE} = 100`,
    format: idx1,
  },
  {
    key: 'employment',
    series: 'employment_rate',
    last: 36,
    marks: ['employment'],
    fact: 'employment_rate_latest',
    icon: 'labour',
    name: 'Employment',
    // defined in the tile (Maria's review, M3): who the rate counts
    label: 'Share of people aged 16–64 in work',
  },
  {
    key: 'unemployment',
    series: 'unemployment_rate',
    last: 36,
    marks: [],
    fact: 'unemployment_rate_latest',
    icon: 'labour',
    name: 'Unemployment',
    label: 'Share of the economically active (16+, in work or looking) without work',
  },
  {
    key: 'pay',
    series: 'pay_growth',
    last: 36,
    marks: ['pay'],
    fact: 'pay_growth_latest',
    icon: 'pay',
    name: 'Regular pay',
    label: 'On a year earlier',
    define: 'Regular pay: average weekly earnings excluding bonuses, on the same three months a year earlier.',
    growth: true,
  },
  {
    key: 'share',
    series: 'labour_share',
    last: 10,
    marks: [],
    fact: 'labour_share_latest',
    icon: 'labourShare',
    name: 'Employees’ share',
    label: 'Of GDP paid to employees',
  },
];

// Each sub-line carries its own period, year included (review round 3,
// R3-09: the panel's "2026 data" chip sat over a 2025 tile, so it is gone).
// A quarter is printed whole ("2026 Q3"); "July to September 2026" ->
// "Jul–Sep 2026"; years as they are. GDP's tile reads "Q3 2026".
const shortPeriod = (p) => (/^\d{4} Q\d$/.test(p) ? p : periodOf(p));
const qFirst = (p) => p.replace(/^(\d{4}) (Q\d)$/, '$2 $1');
const FIRST = /first estimate/i.test(FACTS.gdp_quarterly_latest.note ?? '');

// GDP's year-on-year growth (its home), in the panel's notes.
function GdpYoy() {
  const y = FACTS.gdp_quarterly_yoy;
  return (
    <>
      GDP: <span data-path="facts.gdp_quarterly_yoy.value">{pct1(y.value)}</span> on a year earlier, {qFirst(y.period)}
      {FIRST ? ', first estimate' : ''}.
    </>
  );
}

// The series' last `n` points as a sparkline: a path in a 100 x 28 box
// (stretched to the cell; the stroke does not scale) and the latest point
// as an HTML dot, so it stays round. Decorative: aria-hidden, no axes.
function Spark({ v, drawn }) {
  const s = SERIES[v.series];
  const ys = (s?.y ?? []).slice(-v.last);
  if (ys.length < 2) return null;
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || 1;
  const X = (i) => (i / (ys.length - 1)) * 100;
  const Y = (y) => 3 + (1 - (y - lo) / span) * 22;
  const d = ys.map((y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)},${Y(y).toFixed(2)}`).join('');
  const end = ys[ys.length - 1];
  return (
    <span className="p1-spark" aria-hidden="true">
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" focusable="false" aria-hidden="true">
        <path d={d} pathLength={1} className={`p1-spark-line${drawn ? ' is-drawn' : ''}`} />
      </svg>
      <span className={`p1-spark-dot${drawn ? ' is-drawn' : ''}`} style={{ left: '100%', top: `${(Y(end) / 28) * 100}%` }} />
    </span>
  );
}

// light (or clear) a metric's series in the part 1 figures on screen
function lightSeries(marks, on) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-vital-hl]').forEach((f) => f.removeAttribute('data-vital-hl'));
  document.querySelectorAll('[data-vital-on]').forEach((m) => m.removeAttribute('data-vital-on'));
  if (!on || !marks.length) return;
  const V = window.innerHeight;
  for (const fig of document.querySelectorAll('.p1-figure')) {
    const r = fig.getBoundingClientRect();
    if (r.bottom < 0 || r.top > V || !r.height) continue;
    const hit = fig.querySelectorAll(marks.map((m) => `[data-mark="${m}"]`).join(', '));
    if (!hit.length) continue;
    fig.setAttribute('data-vital-hl', '');
    hit.forEach((m) => m.setAttribute('data-vital-on', ''));
  }
}

function Tile({ v, drawn, instant }) {
  const [hot, setHot] = useState(false);
  const f = FACTS[v.fact];
  const path = `facts.${v.fact}.value`;
  const text = (v.format ?? pct1)(f.value);
  const src = SOURCES[f.source] ?? {};
  const on = (x) => () => {
    setHot(x);
    lightSeries(v.marks, x);
  };
  return (
    <li
      id={`p1-vital-${v.key}`}
      className={`p1-vital${hot ? ' is-hot' : ''}${drawn ? ' is-drawn' : ''}${instant ? ' is-instant' : ''}`}
      data-vital={v.key}
      tabIndex={0}
      onMouseEnter={on(true)}
      onMouseLeave={on(false)}
      onFocus={on(true)}
      onBlur={on(false)}
    >
      {v.key === 'gdp' ? <span id="p1-quarters" className="p1-anchor" aria-hidden="true" /> : null}
      <p className="p1-vital-name">{v.name}</p>{' '}
      <p className="p1-vital-value">
        <span data-path={path}>{text}</span>
      </p>{' '}
      <Spark v={v} drawn={drawn} />
      <p className="p1-vital-sub">
        <span className="p1-vital-sub-rest">
          {v.key === 'gdp' ? (
            <>
              {qFirst(f.period)}, {v.label}
              {FIRST ? ' ' : null}
              {FIRST ? <span className="p1-vital-flag">first estimate</span> : null}
            </>
          ) : (
            `${v.label} · ${shortPeriod(f.period)}`
          )}
        </span>{' '}
        <span className="p1-vital-sub-hot">
          {src.released ? `Released ${fmtDate(src.released)}` : null}
          {/* no "· next …" date (review round 1, R1-07): a prerendered page
              goes stale against it; the source ledger keeps the dates */}
        </span>
      </p>
    </li>
  );
}

// The panel's notes. The employment and unemployment rates are defined in
// their tiles (the sub-line), so the notes say only what the tiles do not.
const NOTES = [
  <GdpYoy key="yoy" />,
  'Employment and unemployment: three-month averages, seasonally adjusted.',
  ...VITALS.filter((v) => v.define).map((v) => v.define),
  <Ext key="ilo" href={LINKS.ons_lm_guide?.url}>
    Unemployment, ILO definition: jobless, looking for work, able to start.
  </Ext>,
  'Employees’ share: pay and employers’ contributions over GDP, computed here; it leaves out self-employed income.',
  <NavLink key="ledger" tab="method" sub="code" anchor="source-ledger">
    Release dates and series codes: the source ledger
  </NavLink>,
];

// One link per series, to its ONS page.
const SRC = [
  { id: FACTS.gdp_quarterly_latest.source, name: 'GDP' },
  { id: FACTS.gdp_quarterly_yoy.source, name: 'GDP on a year earlier' },
  { id: FACTS.productivity_oph_latest.source, name: 'output per hour' },
  { id: FACTS.employment_rate_latest.source, name: 'employment' },
  { id: FACTS.unemployment_rate_latest.source, name: 'unemployment' },
  { id: FACTS.pay_growth_latest.source, name: 'regular pay' },
  { id: FACTS.labour_share_latest.source, name: 'compensation of employees' },
];

// Part 1's "About this model" (StoryTab PARTS): the vitals' notes, then
// one link per series. In the DOM with the fold closed, so GDP's
// year-on-year growth keeps its home (data-path) for the number check.
export function VitalsAbout() {
  return (
    <div className="p1-vitals-about" data-source-notes="">
      {NOTES.map((n, i) => (
        <p key={i}>{n}</p>
      ))}
      <p className="part-opener-sources" data-cite="">
        Sources:{' '}
        {SRC.map((x, i) => {
          const it = ukItem(x.id, x.name);
          return it ? (
            <span key={x.name}>
              {i ? ', ' : null}
              <Ext href={it.url}>{x.name}</Ext>
            </span>
          ) : null;
        })}
        .
      </p>
    </div>
  );
}

export default function Vitals() {
  const [ref, entry] = useEntry();
  // drawn once entered (at once when landed by a jump, or reduced motion)
  const drawn = useEnterState(false, true, entry.entered, 150) || (entry.entered && entry.instant);
  return (
    <section id="p1-vitals" ref={ref} className="p1-vitals" aria-labelledby="p1-vitals-title">
      {/* the panel's sources and notes are in part 1's "About this model"
          (VitalsAbout; part openings, approved 22 Nov) */}
      <h3 id="p1-vitals-title" className="p1-vitals-title">
        <span>Latest official figures</span>
      </h3>
      <ul className="p1-vitals-grid">
        {VITALS.map((v) => (
          <Tile key={v.key} v={v} drawn={drawn} instant={entry.instant} />
        ))}
      </ul>
    </section>
  );
}
