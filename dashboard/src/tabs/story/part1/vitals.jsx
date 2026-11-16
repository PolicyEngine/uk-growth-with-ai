'use client';

import { useSyncExternalStore } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { FACTS, SERIES, SOURCES, pageOf } from './data.js';
import { Ext } from './frame.jsx';
import { dateLong, dirOf, dirWord, idx1, pct1, span3 } from './format.js';

// The UK vitals panel that opens part 1: seven tiles, each the latest
// published figure for one series (value, period, sparkline, release date,
// next release where the publisher lists one, and a link to the source's
// page). It is the home of these seven figures: the step cards below do not
// repeat them. Each value is marked with its data-path, as in the cards.
// Sparklines are decorative (aria-hidden, no text), drawn from the series
// the charts below draw in full.

const short = (s) => ({ 'Office for National Statistics': 'ONS' })[s.publisher] ?? s.publisher;

// "September 2026 (Wave 165, ...)" -> "September 2026"
const periodOf = (p) => p.replace(/\s*\(.*$/, '');

export const VITALS = [
  { key: 'gdp', fact: 'gdp_quarterly_latest', series: 'gdp_quarterly', icon: 'gdp', name: 'GDP', label: 'real GDP growth on the previous quarter', growth: 'on the previous quarter' },
  { key: 'productivity', fact: 'productivity_oph_latest', series: 'productivity_oph', icon: 'productivity', name: 'Output per hour', label: 'output per hour worked, index 2023 = 100', format: idx1 },
  { key: 'employment', fact: 'employment_rate_latest', series: 'employment_rate', icon: 'labour', name: 'Employment', label: 'employment rate, aged 16 to 64' },
  { key: 'unemployment', fact: 'unemployment_rate_latest', series: 'unemployment_rate', icon: 'labour', name: 'Unemployment', label: 'unemployment rate, aged 16 and over' },
  { key: 'pay', fact: 'pay_growth_latest', series: 'pay_growth', icon: 'pay', name: 'Regular pay', label: 'regular pay growth on a year earlier, before inflation', growth: 'on a year earlier' },
  { key: 'share', fact: 'labour_share_latest', series: 'labour_share', icon: 'labourShare', name: 'Employee share', label: 'of GDP paid to employees, computed from two ONS series' },
  { key: 'ai', fact: 'business_ai_use', series: 'business_ai_use', icon: 'ai', name: 'Business AI use', label: 'of businesses use at least one AI technology' },
];

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

function Tile({ v, today }) {
  const f = FACTS[v.fact];
  const s = SERIES[v.series];
  const src = SOURCES[f.source];
  const path = `facts.${v.fact}.value`;
  const text = (v.format ?? pct1)(f.value);
  const first = /first estimate/i.test(f.note ?? '');
  const next = src.next_release;
  const span = s.first ? `${s.x[0].slice(0, 4)} to ${span3(s.last)}` : `${s.x[0]} to ${s.x[s.x.length - 1]}`;
  return (
    <li id={`p1-vital-${v.key}`} className="p1-vital" data-vital={v.key}>
      <span className="p1-vital-name">
        <Icon name={iconFor(v.icon)} size={15} className="p1-text-icon" />
        {v.name}
      </span>{' '}
      <span className="p1-vital-value">
        {v.growth ? (
          <span className="p1-vital-dir" aria-hidden="true">
            <Icon name={iconFor(dirOf(f.value))} size={16} />
          </span>
        ) : null}
        <Ext href={pageOf(f.source)} className="p1-val-link">
          <span className={v.growth ? 'p1-growth' : undefined} data-dir={v.growth ? dirOf(f.value) : undefined} data-path={path}>
            {text}
          </span>
        </Ext>
      </span>{' '}
      <span className="p1-vital-label">{v.label}</span>
      <span className="p1-vital-sub">
        Through {periodOf(f.period)}
        {v.growth ? `, ${dirWord(f.value)} ${v.growth}` : ''}
      </span>
      {first ? (
        <span className="p1-flag">
          <Icon name={iconFor('revision')} size={12} /> First estimate
        </span>
      ) : null}
      <Spark ys={s.y} />
      <span className="p1-vital-span" data-axis="">
        {span}
      </span>
      <span className="p1-vital-meta">
        Released {dateLong(src.released)}
        {next && today ? (next >= today ? `; next ${dateLong(next)}` : `; newer figures out ${dateLong(next)}, not yet shown here`) : ''}
      </span>
      <span className="p1-vital-src">
        <Ext href={pageOf(f.source)}>
          {short(src)}, {src.series.replace(/\s*\(.*$/, '')}
        </Ext>
        {src.url !== pageOf(f.source) ? (
          <>
            {' · '}
            <Ext href={src.url}>{src.data_label ?? 'data'}</Ext>
          </>
        ) : null}
      </span>
    </li>
  );
}

export default function Vitals() {
  const today = useToday();
  const asOf = VITALS.map((v) => SOURCES[FACTS[v.fact].source].released).sort().at(-1);
  return (
    <section id="p1-vitals" className="p1-vitals" aria-labelledby="p1-vitals-title">
      <header className="p1-vitals-head">
        <h3 id="p1-vitals-title">
          <Icon name={iconFor('record')} size={18} className="p1-text-icon" /> UK vitals: the latest published figures
        </h3>
        <p className="p1-vitals-asof">
          <Icon name={iconFor('period')} size={14} className="p1-text-icon" /> Data as of {dateLong(asOf)}, the latest release used
        </p>
      </header>
      <ul className="p1-vitals-grid">
        {VITALS.map((v) => (
          <Tile key={v.key} v={v} today={today} />
        ))}
      </ul>
    </section>
  );
}
