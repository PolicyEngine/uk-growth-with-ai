'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { FACTS, LINKS } from './data.js';
import { Ext, SourceLine } from './frame.jsx';
import { dirWord, idx1, pct1 } from './format.js';

// The UK vitals panel that opens part 1: six tiles, each the latest
// published figure for one series: the name (with the tile's one icon), the
// value, and one sub-line (its unit and period). Round 2 (review E5, C4):
// no sparklines, release dates, series codes or data downloads (those are
// in Method's source ledger, linked once from the fold); one source line
// under the grid links each series' ONS page, and its fold keeps the two
// definitions only the panel needs. It is the home of these six
// figures, and of GDP's year-on-year growth (the GDP sub-line): the step
// cards below do not repeat them. Business AI use moved to the AI scene's
// closing line (T3). Each value is marked with its data-path.

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
    icon: 'gdp',
    name: 'GDP',
    label: 'on a quarter earlier',
    growth: true,
  },
  {
    key: 'productivity',
    fact: 'productivity_oph_latest',
    icon: 'productivity',
    name: 'Output per hour',
    label: 'index, 2023 = 100',
    format: idx1,
  },
  {
    key: 'employment',
    fact: 'employment_rate_latest',
    icon: 'labour',
    name: 'Employment',
    label: 'rate, aged 16 to 64',
  },
  {
    key: 'unemployment',
    fact: 'unemployment_rate_latest',
    icon: 'labour',
    name: 'Unemployment',
    label: 'rate, aged 16 and over',
  },
  {
    key: 'pay',
    fact: 'pay_growth_latest',
    icon: 'pay',
    name: 'Regular pay',
    label: 'on a year earlier',
    growth: true,
  },
  {
    key: 'share',
    fact: 'labour_share_latest',
    icon: 'labourShare',
    name: 'Employee share',
    label: 'of GDP (computed)',
  },
];

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
      </p>{' '}
      <p className="p1-vital-sub">
        {v.growth ? `${dirWord(f.value)} ${v.label}` : v.label}, {periodOf(f.period)}
        {v.key === 'gdp' ? <GdpExtra /> : null}
      </p>
    </li>
  );
}

// The two definitions only the panel needs (unemployment and the
// employee share), moved from the step cards.
const NOTES = [
  <Ext key="ilo" href={LINKS.ons_lm_guide?.url}>
    Unemployment, ILO definition: jobless, looking for work, able to start.
  </Ext>,
  'Employee share: pay and employers’ contributions over GDP; it leaves out self-employed income.',
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

export default function Vitals() {
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
      <SourceLine items={SRC} notes={NOTES} />
    </section>
  );
}
