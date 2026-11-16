'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import LineChart from '@/components/LineChart.jsx';
import Card, { InfoCard, SectionHeading, StatTile } from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { gap, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
import { side } from '@/tabs/ai/lines.js';
import { Dir, Lead } from '@/tabs/explore/direction.jsx';
import ControlBar, { ControlGroup, Segmented, SeriesChips, RuleGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, WG_GROUPS, NavLink } from '@/lib/nav.jsx';
import { ruleLabel } from '@/lib/labels.js';
import { GROUP_RAMP, ALL_GROUPS_COLOUR } from '@/lib/chartTheme.js';
import D from '@/data/cohorts2028.json';
import WhoHeatmap from '@/tabs/cohorts/WhoHeatmap.jsx';

// Who gains: consumption-equivalent welfare change by birth year and
// lifetime-earnings group, UK central only, from cohorts2028.json (written
// by paper/cohort_welfare.py --json). With Closure = Both, the tiles and the
// chart show each closure (two rows, two panels on one y-axis); the Why
// cards stay at the central closure. The headline is the share of adults
// who lose, as a range over the measure, and their ages; then the average
// and where it comes from; then the chart; then why. The ranking by
// earnings group is a detail under Why, with its caveat.

export const ARMS = [
  { id: 'tfp', label: 'Automation + productivity', short: 'Automation + productivity' },
  { id: 'zfixed', label: 'Automation, technology unchanged', short: 'Technology unchanged' },
  { id: 'stress', label: 'OBR-style stress test: no output gain', short: 'Stress test' },
];
export const GROUP_LABELS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
const LAST_ALIVE = D.shock_year - 20; // youngest adult in the shock year

const minus = (s) => s.replace('-', '−');
export const pct = (x, dp = 2) => (x == null ? 'n/a' : minus(`${x > 0 ? '+' : ''}${x.toFixed(dp)}%`));
const plain = (x, dp = 0) => `${x.toFixed(dp)}%`;
// A share of adults: whole per cent, or "under 1%" (never "0%" for a few)
const share = (x) => (x <= 0 ? 'none' : x < 1 ? 'under 1%' : `${Math.round(x)}%`);
const shareRange = ([lo, hi]) => (Math.round(lo) === Math.round(hi) ? share(lo) : `${Math.round(lo)}–${Math.round(hi)}%`);
// The tile's range over the measures, worded as its rows are: a true zero is
// "none" (so the range reads "up to"), a few is "under 1%".
export const tileRange = (lo, hi) => {
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  if (hi < 1 || Math.round(lo) === Math.round(hi)) return cap(share(hi));
  if (lo <= 0) return `Up to ${Math.round(hi)}%`;
  return `${lo < 1 ? 'Under 1%' : `${Math.round(lo)}%`} to ${Math.round(hi)}%`;
};
const tone = (x) => (Math.abs(x) < 0.005 ? null : x > 0 ? 'gain' : 'loss');

// Age in the shock year of the adult cohort with the largest change, in words.
export function peakWords(c) {
  const xs = D.closures[Object.keys(D.closures)[0]].birth_year;
  let best = -1;
  c.cev_all.forEach((v, i) => {
    if (xs[i] <= LAST_ALIVE && (best < 0 || v > c.cev_all[best])) best = i;
  });
  const age = D.shock_year - xs[best];
  return age >= 60 && age <= 70 ? 'around retirement age' : `around age ${age}`;
}

// Change for the youngest adult cohort in the shock year.
const youngest = (c) => {
  const xs = D.closures[Object.keys(D.closures)[0]].birth_year;
  return c.cev_all[xs.lastIndexOf(LAST_ALIVE)];
};

export function cell(closure, rule, arm) {
  return D.closures[closure].rules[rule][arm];
}

function Num({ x }) {
  return <b className={`num ${tone(x) === 'gain' ? 'is-gain' : tone(x) === 'loss' ? 'is-loss' : ''}`}>{pct(x)}</b>;
}

// The main arm solved with debt-neutral transfers kept on to the horizon,
// measured against a no-shock path solved under the same rule (the paper's
// "solved to the horizon" row, UK central, central closure). Read from the
// `dnfull` block of cohorts2028.json, which paper/cohort_welfare.py --json
// writes once that block is committed: {ready, closure, rule, arm, range:
// {joint_losing_pct, no_bequest_losing_pct, ...: [low, high] over the two
// extensions past the last solved year]}}. Until the block is in the data,
// or while it is not ready, this returns null and nothing renders.
export function dnfullFor(cl, rule, arm) {
  const x = D.dnfull;
  return x?.ready && x.closure === cl && x.rule === rule && x.arm === arm ? x : null;
}

// The measures the tiles compare, defined once in a legend of chips: as
// modelled, bequests not valued, transfers bearing the later fiscal cost
// (solved to the horizon where the data has it, else a first-order
// estimate; debt-neutral transfers only) and both. Rows then use the code.
export function measuresOf(c, rule, cl, arm) {
  const full = dnfullFor(cl, rule, arm);
  const ch = rule === 'dn' && !full ? c.charged : null;
  const t = full ? full.range : ch;
  return [
    { id: 'M', concept: 'model', label: 'As modelled', def: 'The model’s own welfare measure: consumption, leisure and bequests', losing: [c.alive_losing_pct], avg: [c.alive_avg] },
    { id: 'B', concept: 'bequests', label: 'Bequests not valued', def: 'The same, with no value placed on leaving bequests', losing: [c.no_bequest_losing_pct], avg: [c.no_bequest_alive_avg] },
    t
      ? {
          id: 'T',
          concept: 'benefits',
          label: 'Transfers bear the later fiscal cost',
          tag: full ? 'solved to the horizon' : 'first order',
          def: full
            ? 'Transfers, not government consumption, hold debt/GDP on the path to the horizon: a model run'
            : 'The fiscal cost after 2035 charged to households: a first-order estimate, not a model run',
          losing: t.joint_losing_pct,
          avg: t.joint_avg,
          full: !!full,
        }
      : null,
    t ? { id: 'BT', concept: 'range', label: 'Both', def: 'Bequests not valued and transfers bearing the later fiscal cost', losing: t.no_bequest_losing_pct, avg: t.no_bequest_avg, full: !!full } : null,
  ].filter(Boolean);
}

const shareOf = (xs) => (xs.length > 1 ? shareRange(xs) : share(xs[0]));
const avgOf = (xs) => (xs.length > 1 ? (xs[0].toFixed(2) === xs[1].toFixed(2) ? pct(xs[0]) : `${pct(xs[0])} to ${pct(xs[1])}`) : pct(xs[0]));

function MeasureChips({ ms }) {
  return (
    <ul className="ex-mchips" aria-label="Measures">
      {ms.map((m) => (
        <li key={m.id} className="ex-mchip" title={m.def}>
          <Icon name={iconFor(m.concept)} size={14} />
          <b>{m.id}</b> {m.label}
          {m.tag ? <span className="ex-mtag">{m.tag}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// "Adults who lose" by measure: the four shares as a toggle (each prints its
// share once), and a strip of 100 dots, one per 1% of adults, re-coloured
// for the measure picked. A share is rounded to whole dots; "under 1%" is no
// full dot. A range over two extensions draws its low end solid and the rest
// to its high end hatched.
export function dotCounts(losing) {
  const lo = Math.min(...losing);
  const hi = Math.max(...losing);
  const solid = lo < 1 ? 0 : Math.round(lo);
  return { solid, range: Math.max(0, (hi < 1 ? 0 : Math.round(hi)) - solid) };
}
function MeasureDots({ ms, measure, onMeasure }) {
  const m = ms.find((x) => x.id === measure) ?? ms[0];
  const { solid, range } = dotCounts(m.losing);
  return (
    <>
      <ul className="ex-mtoggle" aria-label="Share of adults who lose, by measure: pick one for the dots">
        {ms.map((x) => (
          <li key={x.id} data-dnfull={x.full ? '' : undefined}>
            <button type="button" aria-pressed={x.id === m.id} className={`ex-mtoggle-btn${x.id === m.id ? ' is-on' : ''}`} title={x.def} onClick={() => onMeasure(x.id)}>
              <Icon name={iconFor(x.concept)} size={12} />
              <b>{x.id}</b>
              <span className="ex-dd">{shareOf(x.losing)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="ex-dots" role="img" aria-label={`${m.label}: ${shareOf(m.losing)} of adults lose, one dot per 1%`} data-measure={m.id}>
        {Array.from({ length: 100 }, (_, i) => (
          <span key={i} className={`ex-dot${i < solid ? ' is-lose' : i < solid + range ? ' is-range' : ''}`} style={{ transitionDelay: `${Math.min(i, 60) * 3}ms` }} />
        ))}
      </div>
      <p className="ex-dots-key">
        <span className="ex-dot is-lose" aria-hidden="true" data-icon="" /> One dot = 1% of adults{range ? '; hatched: the range' : ''}
      </p>
    </>
  );
}

// The headline tiles: the share who lose (a range over the measures, then a
// bar per measure), who loses by age (a ruler), the average (a strip of the
// measures), and where it comes from (capital against labour income).
export function Headline({ c, rule, cl, arm, measure = 'M', onMeasure = () => {} }) {
  const full = dnfullFor(cl, rule, arm);
  const ch = rule === 'dn' && !full ? c.charged : null;
  const fills = full ? Object.values(full.by_fill ?? {}) : [];
  const fullAges = fills.length ? [Math.min(...fills.map((f) => f.oldest_losing_on_average)), Math.max(...fills.map((f) => f.oldest_losing_on_average))] : null;
  const s = c.sources_alive;
  const ms = measuresOf(c, rule, cl, arm);
  const all = ms.flatMap((m) => m.losing);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const young = c.all_lose_up_to_age;
  const ages = fullAges ?? ch?.oldest_losing_on_average;
  const ageTo = young ?? (ages ? ages[1] : null);
  const avgs = ms.flatMap((m) => m.avg);
  const A = Math.max(0.1, ...avgs.map(Math.abs)) * 1.15;
  const apos = (x) => `${(((x + A) / (2 * A)) * 100).toFixed(2)}%`;
  const S = Math.max(Math.abs(s.capital), Math.abs(s.labour)) * 1.1;
  const spos = (x) => `${(((x + S) / (2 * S)) * 100).toFixed(2)}%`;
  return (
    <div className="stat-row cols-4 ex-who-tiles">
      <MeasureChips ms={ms} />
      <StatTile icon={iconFor('households')} name="Adults who lose" value={tileRange(lo, hi)} sub={<Lead c="range">{`Share of adults alive in ${D.shock_year}, by measure`}</Lead>}>
        <MeasureDots ms={ms} measure={measure} onMeasure={onMeasure} />
      </StatTile>
      <StatTile
        icon={iconFor('young')}
        name="Who loses, by age"
        value={young ? (young === 20 ? 'Age 20' : `Up to age ${young}`) : ages ? `Up to age ${ages[0] === ages[1] ? ages[0] : `${ages[0]}–${ages[1]}`}` : 'The youngest'}
        sub={<Lead c="age">{young ? 'Every adult this age or younger loses (M)' : ages ? 'Lose on average when transfers bear the cost (T)' : 'Losses, where any, fall on the youngest adults'}</Lead>}
      >
        <div className="ex-ruler" aria-hidden="true">
          <span className="ex-ruler-fill" style={{ width: ageTo ? `${(((ageTo - 20) / 70) * 100).toFixed(1)}%` : '6%' }} />
          <span className="ex-ruler-ticks" data-axis="">
            <span>20</span>
            <span>45</span>
            <span>65</span>
            <span>90</span>
          </span>
        </div>
      </StatTile>
      <StatTile icon={iconFor('measure')} name="Average change" value={pct(c.alive_avg)} tone={tone(c.alive_avg)} sub={<Lead c="consumption">Of remaining-lifetime consumption and bequests</Lead>}>
        <ul className="ex-bars ex-avg">
          {ms.map((m) => (
            <li key={m.id} data-dnfull={m.id === 'BT' && m.full ? '' : undefined} className={m.id === measure ? 'is-on' : undefined}>
              <span className="ex-bar-code" title={m.def}>
                <Icon name={iconFor(m.concept)} size={12} /> {m.id}
              </span>
              <span className="ex-bar-track is-axis">
                <span className="ex-axis-zero" style={{ left: apos(0) }} aria-hidden="true" />
                {m.avg.map((x, k) => (
                  <span key={k} className="ex-avg-dot" style={{ left: apos(x) }} title={`${m.label}: ${pct(x)}`} aria-hidden="true" />
                ))}
              </span>
              {/* M is the tile's figure and T has no other home: each fact once */}
              <span className="ex-dd">{m.id === 'B' || m.id === 'BT' ? avgOf(m.avg) : m.id === 'M' ? <Icon name={iconFor('link')} size={12} /> : ''}</span>
            </li>
          ))}
        </ul>
      </StatTile>
      <StatTile icon={iconFor('inequality')} name="Where it comes from" value={pct(s.capital)} tone={tone(s.capital)} sub={<Lead c="capital">From capital income, at unchanged behaviour</Lead>}>
        <div className="ex-split" aria-label="Capital income against labour income">
          <span className="ex-axis-zero" style={{ left: spos(0) }} aria-hidden="true" />
          <span className={`ex-split-bar ${s.capital >= 0 ? 'is-gain' : 'is-loss'}`} style={{ left: spos(Math.min(0, s.capital)), width: `${((Math.abs(s.capital) / (2 * S)) * 100).toFixed(1)}%` }} aria-hidden="true" />
          <span className={`ex-split-bar ${s.labour >= 0 ? 'is-gain' : 'is-loss'}`} style={{ left: spos(Math.min(0, s.labour)), width: `${((Math.abs(s.labour) / (2 * S)) * 100).toFixed(1)}%` }} aria-hidden="true" />
        </div>
        <ul className="stat-rows ex-stat-rows">
          <li>
            <span className="ex-dt">
              <Lead c="labour">From labour income</Lead>
            </span>
            <span className="ex-dd">{pct(s.labour)}</span>
          </li>
          <li>
            <span className="ex-dt">
              <Lead c="caveat">Behaviour adjusts too: the two need not sum to the average</Lead>
            </span>
          </li>
        </ul>
      </StatTile>
    </div>
  );
}

// The aggregate signs behind the Why cards, from the same OG-UK solves
// (surprise2028.json, UK central, headline year): the interest rate and the
// wage rate for the arm, closure and rule in view, and aggregate consumption
// in the shock year (cohorts2028.json). Every direction word and arrow on
// the cards is computed from these signs.
const SURPRISE_ARM = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
export function whySigns(cl, rule, arm) {
  const c = cell(cl, rule, arm);
  const g = (a, v) => gap('uk_central', SURPRISE_ARM[a], cl, v, HEADLINE_YEAR, rule);
  return {
    r: g(arm, 'r_bp'),
    w: g(arm, 'w'),
    c0: c.c_gap[String(D.shock_year)],
    cAbove: c.first_year_c_above,
    young: youngest(cell(cl, rule, 'stress')),
    stressW: g('stress', 'w'),
    tfpW: g('tfp', 'w'),
  };
}

// The consumption card: a why chain whose every direction is the data's.
export function consumptionChain(x) {
  return [
    x.r == null ? null : { key: 'r', icon: 'interest', dir: x.r, text: `Return on capital ${x.r > 0 ? 'rises' : 'falls'}` },
    x.w == null ? null : { key: 'w', icon: 'pay', dir: x.w, text: `Wage rate ${side(x.w) === 'on' ? 'on' : side(x.w)} the path` },
    { key: 's', icon: 'households', text: `Households ${x.c0 < 0 ? 'save more' : 'spend more'} at first` },
    { key: 'c', icon: 'consumption', dir: x.c0, text: `Consumption starts ${side(x.c0) === 'on' ? 'on' : side(x.c0)} the path` },
  ].filter(Boolean);
}

// Paired horizontal bars: [{ key, label, value, text, concept }], drawn
// against the largest value; text is the printed figure.
function Pairs({ rows, label }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
  return (
    <ul className="ex-pairs" aria-label={label}>
      {rows.map((r) => (
        <li key={r.key}>
          <span className="ex-pair-label">
            <Icon name={iconFor(r.concept)} size={14} /> {r.label}
          </span>
          <span className="ex-bar-track" aria-hidden="true">
            <span className={`ex-bar-fill${r.tone ? ` is-${r.tone}` : ''}`} style={{ width: `${((Math.abs(r.value) / max) * 100).toFixed(1)}%` }} />
          </span>
          <span className="ex-dd">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

// The aggregate consumption gap in the data's years, as a sparkline; the
// first year above the path (beyond the data's window) marked at its end.
function Spark({ c }) {
  const ys = Object.entries(c.c_gap).map(([y, v]) => [Number(y), v]);
  const lo = Math.min(0, ...ys.map(([, v]) => v));
  const hi = Math.max(0, ...ys.map(([, v]) => v));
  const W = 200;
  const H = 48;
  const X = (i) => 4 + (i / Math.max(1, ys.length - 1)) * (W - 8);
  const Y = (v) => 4 + ((hi - v) / (hi - lo || 1)) * (H - 8);
  return (
    <figure className="ex-spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Aggregate consumption gap, ${ys[0][0]} to ${ys[ys.length - 1][0]}`}>
        <line x1="0" x2={W} y1={Y(0)} y2={Y(0)} className="ex-spark-zero" />
        <polyline points={ys.map(([, v], i) => `${X(i)},${Y(v)}`).join(' ')} className="ex-spark-line" />
      </svg>
      <figcaption>
        <Icon name={iconFor('path')} size={12} /> {`Consumption gap, ${ys[0][0]}–${ys[ys.length - 1][0]}`}
        {c.first_year_c_above ? <span className="ex-spark-cross">{` · above from ${c.first_year_c_above} →`}</span> : null}
      </figcaption>
    </figure>
  );
}

// The same average by form: a bar split into consumption, leisure and
// bequests (one part at a time on the scenario path). The values are in the
// tooltips: the parts need not add up to the total.
function ByForm({ p, both }) {
  const parts = [
    { k: 'consumption', label: 'Consumption', v: p.consumption },
    { k: 'leisure', label: 'Leisure', v: p.leisure },
    { k: 'bequests', label: 'Bequests', v: p.bequests },
  ];
  const sum = parts.reduce((a, x) => a + Math.abs(x.v), 0) || 1;
  return (
    <div className="ex-byform" role="group" aria-label="The same average by form">
      <p className="ex-byform-title">
        <Icon name={iconFor('range')} size={14} /> The same average by form{both ? ', central closure' : ''}
      </p>
      <div className="ex-byform-bar">
        {parts.map((x) => (
          <TipTarget key={x.k} className={`ex-byform-seg is-${x.k}${x.v < 0 ? ' is-neg' : ''}`} style={{ width: `${((Math.abs(x.v) / sum) * 100).toFixed(1)}%` }} label={`${x.label}: ${pct(x.v)}`} tip={<><b>{x.label}</b><span className="tip-value">{pct(x.v)}</span></>} />
        ))}
      </div>
      <ul className="ex-byform-key">
        {parts.map((x) => (
          <li key={x.k}>
            <span className={`ex-byform-swatch is-${x.k}`} data-icon="" aria-hidden="true" />
            <Icon name={iconFor(x.k)} size={12} /> {x.label}
          </li>
        ))}
        <li>
          <Icon name={iconFor('caveat')} size={12} /> Parts need not add up to the total
        </li>
      </ul>
    </div>
  );
}

function Why({ cl, rule, arm }) {
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const prof = C.profile_2028;
  const tr = c.income_2028_35_age45.transfers;
  const [bot, top] = [c.alive_by_group[0], c.alive_by_group[6]];
  const x = whySigns(cl, rule, arm);
  const links = Object.fromEntries(consumptionChain(x).map((l) => [l.key, l]));
  const title = x.c0 < 0 ? (x.cAbove ? 'Consumption dips first, then recovers' : 'Consumption dips and stays below') : 'Consumption starts above the path';
  return (
    <div className="cards-grid is-top ex-why-grid">
      <InfoCard icon={iconFor('consumption')} title={title}>
        <Spark c={c} />
        <Items
          className="ex-chain"
          items={[
            {
              key: 'rw',
              icon: 'interest',
              text: (
                <>
                  {links.r ? (
                    <>
                      <Dir x={links.r.dir} />
                      {links.r.text}
                    </>
                  ) : null}
                  {links.r && links.w ? '; ' : ''}
                  {links.w ? (
                    <>
                      <Dir x={links.w.dir} />
                      {links.w.text.replace('Wage rate', 'wage rate')}
                    </>
                  ) : null}
                </>
              ),
            },
            { key: 's', icon: 'households', text: links.s.text },
            {
              key: 'c',
              icon: 'consumption',
              text: (
                <>
                  <Dir x={links.c.dir} />
                  {links.c.text}
                  {x.cAbove ? `; above it from ${x.cAbove}` : '; below it through 2085'}
                </>
              ),
            },
            { key: 'beq', icon: 'bequests', text: 'Bequests rise with the return; fewer hours mean extra leisure' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('lifetimeEarnings')} title="By earnings group: a property of the model">
        <Pairs
          label="Change by lifetime-earnings group"
          rows={[
            { key: 'bot', concept: 'lifetimeEarnings', label: 'Bottom 25%', value: bot, text: <Num x={bot} />, tone: tone(bot) },
            { key: 'top', concept: 'lifetimeEarnings', label: 'Top 1%', value: top, text: <Num x={top} />, tone: tone(top) },
          ]}
        />
        <p className="ex-caveat-chip">
          <Icon name={iconFor('limit')} size={14} /> A property of the model, not a UK finding
        </p>
        <Pairs
          label="Wages as a share of gross income"
          rows={[
            { key: 'wb', concept: 'labour', label: 'Wages, bottom 25%', value: prof.labour[0], text: plain(prof.labour[0]) },
            { key: 'wt', concept: 'labour', label: 'Wages, top 1%', value: prof.labour[6], text: plain(prof.labour[6]) },
          ]}
        />
        <Items
          items={[
            { key: 'tr', icon: 'benefits', text: 'Transfers: the same amount per head in every group' },
            { key: 'w', icon: 'capital', text: `Bottom 25%: ${plain(prof.wealth_share[0])} of wealth, ${plain(prof.earnings_share[0])} of labour income` },
          ]}
        />
        <Pairs
          label="Top tenth's share of wealth"
          rows={[
            { key: 'm', concept: 'model', label: 'Top tenth, model', value: C.wealth_concentration.top_tenth_pct, text: plain(C.wealth_concentration.top_tenth_pct) },
            { key: 'd', concept: 'data', label: 'ONS, 2018–20', value: 43, text: '43%' },
          ]}
        />
      </InfoCard>
      <InfoCard icon={iconFor('finances')} title="Who pays the fiscal cost">
        {rule === 'dn' ? (
          <>
            <div className="ex-timeline ex-tl-who">
              <span className="ex-tl-year">
                <Icon name={iconFor('shock')} size={14} /> 2028
              </span>
              <span className="ex-tl-span">
                <Icon name={iconFor('benefits')} size={12} /> Lower transfers
              </span>
              <span className="ex-tl-year is-end">
                <Icon name={iconFor('finances')} size={14} /> 2036: government consumption
              </span>
            </div>
            <Items items={[{ key: 'value', icon: 'excluded', text: 'Households do not value government consumption in the model' }]} />
            <Pairs
              label="Cost to a 45-year-old over 2028–35, share of consumption"
              rows={[
                { key: 'b', concept: 'age', label: 'Age 45, bottom group', value: tr[0], text: plain(Math.abs(tr[0]), 1) },
                { key: 't', concept: 'age', label: 'Age 45, top 1%', value: tr[6], text: plain(Math.abs(tr[6]), 1) },
              ]}
            />
            <Items items={[{ key: 'gap', icon: 'compare', text: 'Cost over 2028–35: narrows the gap, does not reverse it' }]} />
          </>
        ) : (
          <Items
            items={[
              { key: 'share', icon: 'benefits', text: 'Common rule: transfers stay a fixed share of GDP' },
              { key: 'debt', icon: 'debt', text: 'Public debt absorbs the fiscal effect; no cohort repays it' },
              { key: 'pick', icon: 'rule', text: 'Pick debt-neutral transfers under Fiscal rule to charge households' },
            ]}
          />
        )}
      </InfoCard>
      <InfoCard icon={iconFor('young')} title="The stress test by age" tag={<><Icon name={iconFor('shock')} size={12} /> Stress-test arm</>}>
        <Items
          items={[
            x.stressW == null || x.tfpW == null
              ? null
              : { key: 'w', icon: 'pay', text: `No output gain: the wage rate is ${x.stressW < x.tfpW ? 'lower still' : 'no lower'}` },
            {
              key: 'young',
              icon: 'jobLoss',
              text: (
                <>
                  <Dir x={x.young} />
                  {`Youngest adults ${x.young < 0 ? 'lose' : 'gain least'}: most work ahead, little wealth`}
                </>
              ),
            },
          ].filter(Boolean)}
        />
      </InfoCard>
    </div>
  );
}

const CL_WORDS = { 'zk0.1': 'central closure', zk0: 'closed capital' };
const CL_HEAD = { 'zk0.1': { icon: iconFor('foreign'), text: 'Central closure' }, zk0: { icon: iconFor('closed'), text: 'Closed capital' } };

export default function WhoGainsTab() {
  const { st, set } = useNav();
  const [measure, setMeasure] = useState('M');
  const arm = st.arm;
  const rule = st.wrule;
  const both = st.closure === 'both';
  const cl = st.closure === 'closed' ? 'zk0' : 'zk0.1';
  const cls = both ? ['zk0.1', 'zk0'] : [cl];
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const x = C.birth_year;
  const items = [
    ...GROUP_LABELS.map((label, j) => ({ id: String(j), label, color: GROUP_RAMP[j] })),
    { id: 'all', label: 'All groups', color: ALL_GROUPS_COLOUR, dashed: true },
  ];
  const seriesAt = (k) => {
    const ck = cell(k, rule, arm);
    return items
      .filter((it) => st.groups.includes(it.id))
      .map((it) => ({ ...it, key: it.id, values: it.id === 'all' ? ck.cev_all : ck.cev.map((r) => r[Number(it.id)]) }));
  };
  const panels = cls.map((k) => ({ cl: k, series: seriesAt(k) }));
  const series = panels[0].series;
  // one y-axis for both panels, so their heights compare
  const ys = panels.flatMap((pn) => pn.series.flatMap((s) => s.values)).filter(Number.isFinite);
  const yDomain = both && ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
  const armLabel = ARMS.find((a) => a.id === arm).label;
  const clWords = both ? 'central closure and closed capital' : CL_WORDS[cl];
  const p = c.parts_alive;

  return (
    <>
      <SectionHeading id="who-gains" icon={iconFor('age')} title="Welfare by birth year and earnings group">
        <Lead c="measure">
          Gain or loss, as a %{' '}
          <abbr title="Consumption-equivalent: the constant % change in consumption and bequests, every remaining year, that leaves a household as well off">
            of lifetime consumption
          </abbr>
        </Lead>
      </SectionHeading>
      <ul className="ex-mchips ex-who-chips">
        <li className="ex-mchip" title="Cohort paths are solved for UK central only, so the Scenario picker at the top is fixed on this page">
          <Icon name={iconFor('closed')} size={14} /> UK central only
        </li>
        <li className="ex-mchip">
          <Icon name={iconFor('timing')} size={14} /> {`AI arrives ${D.shock_year}, as a surprise`}
        </li>
        <li className="ex-mchip" title="The paper also reports Korinek et al. (upper), under debt-neutral transfers; its cohort paths are not in this site’s data yet">
          <Icon name={iconFor('caveat')} size={14} /> Korinek et al. (upper): in the paper, not yet here
        </li>
        {both ? (
          <li className="ex-mchip" title="The reasons below are for the central closure">
            <Icon name={iconFor('closure')} size={14} /> With Both, the figures and the chart show each closure
          </li>
        ) : null}
      </ul>
      <ControlBar label="Who gains: options">
        <ControlGroup label="Arm">
          <Segmented options={ARMS} value={arm} onChange={(a) => set({ arm: a })} label="Arm" />
        </ControlGroup>
        <RuleGroup value={rule} onChange={(r) => set({ wrule: r })} only={['common', 'dn']} />
      </ControlBar>
      {both ? (
        cls.map((k) => (
          <div key={k} className="wg-closure">
            <h3 className="wg-closure-title">
              <Icon name={CL_HEAD[k].icon} size={16} /> {CL_HEAD[k].text}
            </h3>
            <Headline c={cell(k, rule, arm)} rule={rule} cl={k} arm={arm} measure={measure} onMeasure={setMeasure} />
          </div>
        ))
      ) : (
        <Headline c={c} rule={rule} cl={cl} arm={arm} measure={measure} onMeasure={setMeasure} />
      )}
      <ByForm p={p} both={both} />
      <WhoHeatmap cl={both ? 'zk0.1' : cl} rule={rule} arm={arm} both={both} measure={measure} onMeasure={setMeasure} ms={measuresOf(c, rule, cl, arm)} />
      <div className="cards-stack stack-gap">
        <Card
          id="welfare-chart"
          icon={iconFor('path')}
          title="Welfare change by birth year"
          finding={
            <span className="ex-ctx">
              <Lead c="scenario">{armLabel}</Lead>
              <Lead c="rule">{ruleLabel(rule)}</Lead>
              <Lead c="closure">{clWords.charAt(0).toUpperCase() + clWords.slice(1)}</Lead>
            </span>
          }
          unit={<Lead c="measure">Consumption-equivalent change, % of remaining-lifetime consumption and bequests</Lead>}
          controls={
            <ControlBar label="Welfare chart: options">
              <ControlGroup label="Earnings groups">
                <SeriesChips items={items} shown={st.groups} onChange={(groups) => set({ groups: WG_GROUPS.filter((g) => groups.includes(g)) })} label="Earnings groups shown" />
              </ControlGroup>
            </ControlBar>
          }
          about={{
            shows: (
              <Items
                items={[
                  { key: 'cev', icon: 'consumption', text: 'Constant % change in consumption and bequests, every remaining year' },
                  { key: 'path', icon: 'onPath', text: 'On the OBR-central path, it leaves the household as well off' },
                  { key: 'labour', icon: 'labour', text: 'Labour is held at the OBR-central path' },
                  { key: 'alive', icon: 'age', text: `Born up to ${LAST_ALIVE}: adults in ${D.shock_year}, remaining lives only` },
                  { key: 'later', icon: 'young', text: 'Later cohorts count their whole lives' },
                ]}
              />
            ),
            how: (
              <Items
                items={[
                  { key: 'paths', icon: 'model', text: 'From the household paths of the OG-UK solves' },
                  { key: 'own', icon: 'measure', text: 'The model’s own utility, discounting, survival and growth adjustment' },
                  { key: 'ref', icon: 'onPath', text: 'Reference: the OBR-central path, restarted in 2028 without the shock' },
                  { key: 'check', icon: 'data', text: 'Household consumption matches every solve’s aggregate gap, 2028–2036' },
                ]}
              />
            ),
            definitions: (
              <Items
                items={[
                  { key: 'groups', icon: 'lifetimeEarnings', text: 'Earnings groups: percentiles of lifetime earnings, not income deciles' },
                  { key: 'conly', icon: 'consumption', text: 'Consumption-only figures are a sensitivity in the paper' },
                  { key: 'first', icon: 'provisional', text: 'Post-2035 fiscal cost charged: a first-order estimate, not a model run' },
                  ...(D.dnfull?.ready
                    ? [
                        { key: 'full', icon: 'model', text: 'Main arm, central closure: solved to the horizon instead, a model run' },
                        { key: 'tr', icon: 'benefits', text: 'Transfers, not government consumption, hold debt/GDP on the path' },
                        { key: 'ref', icon: 'compare', text: 'Against a no-shock path solved under the same rule' },
                      ]
                    : []),
                ]}
              />
            ),
            caveats: (
              <Items
                items={[
                  { key: 'job', icon: 'excluded', text: 'The model has no job loss' },
                  { key: 'wealth', icon: 'inequality', text: 'It spreads wealth more evenly than UK data' },
                  { key: 'beq', icon: 'bequests', text: 'It places a value on leaving bequests' },
                  { key: 'sens', icon: 'range', text: 'The share of adults who lose is sensitive to all three' },
                  { key: 'assets', icon: 'interest', text: 'No asset prices: revaluing existing assets is left out' },
                  { key: 'old', icon: 'age', text: 'So that is not in the gain to older adults' },
                  { key: 'fill', icon: 'young', text: `Born after 2011: up to ${c.fill_max_pp.toFixed(2)} percentage points from extending past 2085` },
                ]}
              />
            ),
            sources: <Lead c="source">{`${D.source}, paper/cohort_welfare.py.`}</Lead>,
          }}
          method="welfare"
          download={{
            title: 'Welfare change by birth year',
            context: () => `UK central · ${armLabel} · ${ruleLabel(rule)} · ${clWords}`,
            table: () => ({
              columns: ['Birth year', ...panels.flatMap((pn) => pn.series.map((s) => `${s.label}${both ? `, ${CL_WORDS[pn.cl]}` : ''} (%)`))],
              rows: x.map((yr, i) => [yr, ...panels.flatMap((pn) => pn.series.map((s) => s.values[i]))]),
            }),
            legend: () => series.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed })),
          }}
        >
          {series.length ? (
            <div className={both ? 'wg-panels' : undefined}>
              {panels.map((pn) => (
                <figure key={pn.cl} className="wg-panel">
                  {both ? (
                    <figcaption className="wg-panel-title" data-panel-title="">
                      <Icon name={CL_HEAD[pn.cl].icon} size={14} /> {CL_HEAD[pn.cl].text}
                    </figcaption>
                  ) : null}
                  <LineChart
                    x={x}
                    series={pn.series.map((s) => ({ ...s, closure: CL_WORDS[pn.cl] }))}
                    height={both ? 320 : 380}
                    noEndLabels
                    dots={false}
                    yUnit="% change"
                    xUnit="Birth year"
                    unit="%"
                    yDomain={yDomain}
                    valueFormat={(v) => minus(`${v > 0 ? '+' : ''}${v.toFixed(2)}`)}
                    tipTitle="Born"
                    ariaLabel={`Welfare change by birth year and earnings group, ${armLabel}, ${CL_WORDS[pn.cl]}`}
                    markers={[{ year: LAST_ALIVE + 1, label: `← Adults in ${D.shock_year} | Enter later →` }]}
                  />
                </figure>
              ))}
            </div>
          ) : (
            <div className="unpublished-plot">
              <p>Every group is hidden. Choose one under Earnings groups above.</p>
            </div>
          )}
        </Card>
      </div>
      <SectionHeading id="who-why" icon={iconFor('why')} title="What drives the result">
        <Lead c="link">
          <NavLink tab="method" sub="how" anchor="m-generations" className="nav-link ex-linkchip">
            Why age matters: many generations at once →
          </NavLink>
        </Lead>
      </SectionHeading>
      <Why cl={both ? 'zk0.1' : cl} rule={rule} arm={arm} />
    </>
  );
}
