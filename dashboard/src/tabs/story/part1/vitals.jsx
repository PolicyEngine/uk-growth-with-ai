'use client';

import { useSyncExternalStore } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { BICS_WAVE, FACTS, LINKS, SERIES, SOURCES, pageOf } from './data.js';
import { Ext } from './frame.jsx';
import { dateLong, dirWord, idx1, pct1 } from './format.js';

// The UK vitals panel that opens part 1: seven tiles, each the latest
// published figure for one series, as three things: the name (with the
// tile's one icon), the value with a sparkline, and one sub-line (what the
// value measures and its period). Release dates and source links are in
// one fold under the grid, "Sources and release dates". It is the home of
// these seven figures, and of GDP's year-on-year growth (the GDP sub-line):
// the step cards below do not repeat them. Each value is marked with its
// data-path. Sparklines are decorative (aria-hidden, no text), drawn from
// the series the charts below draw.

const short = (s) => ({ 'Office for National Statistics': 'ONS' })[s.publisher] ?? s.publisher;

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
    fact: 'gdp_quarterly_latest',
    series: 'gdp_quarterly',
    icon: 'gdp',
    name: 'GDP',
    label: 'on a quarter earlier',
    growth: true,
  },
  {
    key: 'productivity',
    fact: 'productivity_oph_latest',
    series: 'productivity_oph',
    icon: 'productivity',
    name: 'Output per hour',
    label: 'index, 2023 = 100',
    format: idx1,
  },
  {
    key: 'employment',
    fact: 'employment_rate_latest',
    series: 'employment_rate',
    icon: 'labour',
    name: 'Employment',
    label: 'rate, aged 16 to 64',
  },
  {
    key: 'unemployment',
    fact: 'unemployment_rate_latest',
    series: 'unemployment_rate',
    icon: 'labour',
    name: 'Unemployment',
    label: 'rate, aged 16 and over',
  },
  {
    key: 'pay',
    fact: 'pay_growth_latest',
    series: 'pay_growth',
    icon: 'pay',
    name: 'Regular pay',
    label: 'on a year earlier',
    growth: true,
  },
  {
    key: 'share',
    fact: 'labour_share_latest',
    series: 'labour_share',
    icon: 'labourShare',
    name: 'Employee share',
    label: 'of GDP (computed)',
  },
  {
    key: 'ai',
    fact: 'business_ai_use',
    series: 'business_ai_use',
    icon: 'ai',
    name: 'Business AI use',
    label: 'of businesses use AI',
    cite: `BICS Wave ${BICS_WAVE}`,
  },
];

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-11-17" -> "17 Nov 2026"
const dateShort = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
};

// A line through the series' values, in a 100 x 28 box.
function Spark({ ys }) {
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const X = (i) => (i / (ys.length - 1)) * 100;
  const Y = (v) => 25 - ((v - lo) / (hi - lo || 1)) * 22;
  const d = ys.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  return (
    <svg className="p1-vital-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={d} vectorEffect="non-scaling-stroke" />
      <circle cx={X(ys.length - 1)} cy={Y(ys[ys.length - 1])} r={2.5} />
    </svg>
  );
}

// Today's date, known only after mount (the server's build date would go
// stale), so a next-release date already past is not shown as to come.
const noSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);
const useToday = () => useSyncExternalStore(noSubscribe, todayIso, () => null);

// The GDP tile's sub-line also holds the year-on-year growth (its home)
// and says the quarter is a first estimate.
function GdpExtra() {
  const y = FACTS.gdp_quarterly_yoy;
  const first = /first estimate/i.test(FACTS.gdp_quarterly_latest.note ?? '');
  return (
    <>
      {first ? ', first estimate' : null}; <span data-path="facts.gdp_quarterly_yoy.value">{pct1(y.value)}</span> on a year earlier
    </>
  );
}

function Tile({ v }) {
  const f = FACTS[v.fact];
  const s = SERIES[v.series];
  const path = `facts.${v.fact}.value`;
  const text = (v.format ?? pct1)(f.value);
  return (
    <li id={`p1-vital-${v.key}`} className="p1-vital" data-vital={v.key}>
      {v.key === 'gdp' ? <span id="p1-quarters" className="p1-anchor" aria-hidden="true" /> : null}
      <p className="p1-vital-name">
        <Icon name={iconFor(v.icon)} size={15} className="p1-text-icon" />
        {v.name}
      </p>{' '}
      <p className="p1-vital-value">
        <span data-path={path}>{text}</span>
        <Spark ys={s.y} />
      </p>{' '}
      <p className="p1-vital-sub">
        {v.growth ? `${dirWord(f.value)} ${v.label}` : v.label}, {periodOf(f.period)}
        {v.key === 'gdp' ? <GdpExtra /> : null}
      </p>
    </li>
  );
}

// The fold's line for one tile: the dataset, linked to its readable page
// (and its data download where that differs), the release date, and the
// next release where the publisher lists one after today.
function SourceItem({ v, today }) {
  const f = FACTS[v.fact];
  const src = SOURCES[f.source];
  const next = src.next_release;
  return (
    <li data-cite="">
      {v.name}: <Ext href={pageOf(f.source)}>{short(src)}, {v.cite ?? src.series.replace(/\s*\(.*$/, '')}</Ext>
      {src.url !== pageOf(f.source) ? (
        <>
          {' '}
          (<Ext href={src.url}>{src.data_label ?? 'data'}</Ext>)
        </>
      ) : null}
      , released {dateShort(src.released)}
      {next && today ? (next >= today ? `; next ${dateShort(next)}` : `; newer figures out ${dateShort(next)}, not shown`) : null}.
    </li>
  );
}

// Definitions and caveats for the two series only the panel shows
// (unemployment and the employee share), moved from the step cards.
const NOTES = [
  <Ext key="ilo" href={LINKS.ons_lm_guide?.url}>
    Unemployment, ILO definition: jobless, looking for work, able to start
  </Ext>,
  'Unemployment rate: per cent of economically active people aged 16 and over, from the Labour Force Survey',
  'Employee share: compensation of employees (wages, salaries and employers’ contributions) over GDP, two ONS series',
  `The share is annual, at current prices; ${SERIES.labour_share.x.at(-1)} is the latest full year`,
  'It leaves out the self-employed’s income, so it is lower than measures of labour’s share that count it',
];

export default function Vitals() {
  const today = useToday();
  const asOf = VITALS.map((v) => SOURCES[FACTS[v.fact].source].released)
    .sort()
    .at(-1);
  return (
    <section id="p1-vitals" className="p1-vitals" aria-labelledby="p1-vitals-title">
      <h3 id="p1-vitals-title" className="p1-vitals-title">
        <Icon name={iconFor('record')} size={18} className="p1-text-icon" /> UK vitals: the latest published figures
      </h3>
      <ul className="p1-vitals-grid">
        {VITALS.map((v) => (
          <Tile key={v.key} v={v} />
        ))}
      </ul>
      <details className="p1-sources p1-vitals-sources">
        <summary>Sources and release dates</summary>
        <ul className="p1-sources-list">
          <li>Data as of {dateLong(asOf)}, the latest release used.</li>
          {VITALS.map((v) => (
            <SourceItem key={v.key} v={v} today={today} />
          ))}
          {NOTES.map((n, i) => (
            <li key={`n${i}`}>{n}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
