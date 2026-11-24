'use client';

import { useState } from 'react';
import IconLine from '@/components/ui/IconLine.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import LineChart from '@/components/LineChart.jsx';
import Card, { SectionHeading, StatTile } from '@/components/ui/Card.jsx';
import Finding, { noStop } from '@/components/ui/Finding.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import Callout from '@/components/story/Callout.jsx';
import { profileOf, windowIncomeOf, windowIncomeAge, wealthRatioAt } from '@/lib/dataKeys.js';
import { revealAnchor } from '@/lib/scroll.js';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { cohortGap as gap } from '@/lib/dataKeys.js';
import { Lead } from '@/tabs/explore/direction.jsx';
import Pill from '@/components/ui/Pill.jsx';
import { useNav, WG_GROUPS, NavLink } from '@/lib/nav.jsx';
import { ruleLabel, rulePlain } from '@/lib/labels.js';
import { GROUP_RAMP, ALL_GROUPS_COLOUR } from '@/lib/chartTheme.js';
import { COHORTS as D } from '@/lib/dataKeys.js';
import WhoHeatmap, { cohortSources } from '@/tabs/cohorts/WhoHeatmap.jsx';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { REPO } from '@/tabs/ai/links.js';
import { SRC } from '@/tabs/method/sources.js';
import { HEADLINE_YEAR } from '@/tabs/ai/surprise.js';
// The debt-neutral transfer cut from the headline year to 2035, UK central,
// whole per cent, by version and foreign capital (results review, 22 Nov
// 2026, F6): TR against the baseline in
// scenarios_surprise{2027,2028}_uk_central_debt_neutral{,_zk0}.json, the
// same on both sets. Main version: -6.2 to -6.5% (some), -4.7 to -5.4%
// (none); stress test: -8.7 to -9.1% (some), -6.2 to -6.5% (none). Technology
// unchanged is not solved under this rule. Not in the site's data: a rerun
// that moves it must update this.
const DN_TRANSFER_CUT_PCT = { tfp: { 'zk0.1': 6, zk0: 5 }, stress: { 'zk0.1': 9, zk0: 6 } };
export function dnTransferCut(arm, cls) {
  const xs = cls.map((k) => DN_TRANSFER_CUT_PCT[arm]?.[k]).filter((x) => x != null);
  if (xs.length !== cls.length || !xs.length) return null;
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `${lo}%` : `${lo}–${hi}%`;
}
// the paper draft lives on its own pushed branch, not on this history
const PAPER_DRAFT = `${REPO}/blob/paper/first-draft/paper/main.tex`;

// ONS, Household total wealth in Great Britain, April 2018 to March 2020: the
// top tenth of households held 43% of wealth.
const ONS_WEALTH = 'https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/bulletins/totalwealthingreatbritain/april2018tomarch2020';

// Who gains: consumption-equivalent welfare change by birth year and
// lifetime-earnings group, UK central only, from cohorts2028.json (written
// by paper/cohort_welfare.py --json). With Closure = Both, the tiles and the
// chart show each closure (two rows, two panels on one y-axis); the Why
// cards stay with some foreign capital. The headline is the share of adults
// who lose, as a range over the measure, and their ages; then the average
// and where it comes from; then the chart; then why. The ranking by
// earnings group is a detail under Why, with its caveat.

export const ARMS = [
  { id: 'tfp', label: 'Automation + productivity', short: 'Automation + productivity' },
  { id: 'zfixed', label: 'Automation, technology unchanged', short: 'Technology unchanged' },
  { id: 'stress', label: 'OBR-style stress test: no output gain', short: 'Stress test' },
];
export const GROUP_LABELS = ['Bottom 25%', '25th–50th', '50th–70th', '70th–80th', '80th–90th', '90th–99th', 'Top 1%'];
// each option's line in the welfare chart's pill (item-11-pill-fable.md
// section 5; item-20-fable.md for All groups)
const GROUP_DESC = {
  all: 'All seven groups, and their average dashed',
  0: 'The lowest quarter of lifetime earnings',
  1: 'The second quarter',
  2: 'Just above the middle',
  3: 'The upper middle',
  4: 'The second-highest tenth',
  5: 'The top tenth, without the top 1%',
  6: 'The highest 1% of lifetime earnings',
};
const FIRST_AGE = 20; // the model's first adult age (cohort_welfare.py FIRST_AGE)
const RULER_AGE = 65; // the age ruler's 65 tick: the stress card's older bar
const LAST_ALIVE = D.shock_year - FIRST_AGE; // youngest adult in the shock year
// The last year of the model's horizon: START_YEAR + T_USE - 1 in
// paper/cohort_welfare.py (2026 + 60 - 1). Not in the data file.
export const HORIZON_YEAR = 2085;
// ONS, Household total wealth in Great Britain, April 2018 to March 2020:
// the top tenth of households held 43% of wealth. External: not part of a
// data swap.
const ONS_TOP_TENTH = { pct: 43, period: '2018–2020', url: ONS_WEALTH };

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

// Where the smallest change among adults falls, in words, for one cell: the
// youngest adults, the youngest working-age adults (20 to 64), or an age.
export function leastWords(c) {
  return leastWordsOf(c, D.closures[Object.keys(D.closures)[0]].birth_year, D.shock_year);
}
// The same as parts: who ('youngest', 'working': the youngest working-age
// adults, or 'age'), the age, and the verb.
export function leastOf(c, xs = D.closures[Object.keys(D.closures)[0]].birth_year, shockYear = D.shock_year) {
  const ages = xs.map((y) => shockYear - y);
  const adults = ages.map((a, i) => i).filter((i) => ages[i] >= FIRST_AGE && xs[i] <= shockYear - FIRST_AGE);
  const work = adults.filter((i) => ages[i] <= 64);
  const argmin = (is) => is.reduce((b, i) => (c.cev_all[i] < c.cev_all[b] ? i : b), is[0]);
  const y = argmin(adults);
  const verb = (i) => (c.cev_all[i] < 0 ? 'lose' : 'gain least');
  if (ages[y] === FIRST_AGE) return { who: 'youngest', age: ages[y], verb: verb(y) };
  const w = argmin(work);
  if (ages[w] === FIRST_AGE) return { who: 'working', age: ages[w], verb: verb(w) };
  return { who: 'age', age: ages[y], verb: verb(y) };
}
function leastWordsOf(c, xs, shockYear) {
  const l = leastOf(c, xs, shockYear);
  if (l.who === 'youngest') return `The youngest adults ${l.verb}`;
  if (l.who === 'working') return `Among working-age adults, the youngest ${l.verb}`;
  return `Adults around age ${l.age} ${l.verb}`;
}

// The birth-year finding box (item-18-fable.md, "All 12 cells"): a lead and
// two or three lines, each claim gated on the cell in view, so every one is
// true in all 12 cells (2 foreign-capital cases x 2 budget rules x 3
// versions) and after a data swap. Pure: `c` is one cell, `xs` its birth
// years, `T` the low bound of measure T (transfers bear the later fiscal
// cost) or null, M and B from the cell. Each line is a list of parts
// { claim, text }, so the probe can read each claim (data-claim).
export const RETURN_LINE = 'They hold more wealth than younger adults and collect the higher return on it.';
const capFirst = (t) => t[0].toUpperCase() + t.slice(1);
// `wealthAt(age)`: wealth at that age as a ratio to the adult mean (the
// cohort file's wealth_by_age), or null. The return line needs it above 1
// at the age that gains most.
export function whoFindingOf(c, { xs, shockYear, arm, T = null, wealthAt = () => null }) {
  const lastAlive = shockYear - 20;
  const adults = xs.map((y, i) => i).filter((i) => xs[i] <= lastAlive);
  const peak = adults.reduce((b, i) => (c.cev_all[i] > c.cev_all[b] ? i : b), adults[0]);
  const peakAge = shockYear - xs[peak];
  const where = peakAge >= 60 && peakAge <= 70 ? 'around retirement age' : `around age ${peakAge}`;
  const lead = `Adults ${where} ${c.cev_all[peak] > 0 ? 'gain most' : 'lose least'}.`;
  const minAll = Math.min(...c.cev_all);
  const losing = c.cev_all.map((v, i) => i).filter((i) => c.cev_all[i] < 0);
  const state = minAll >= 0.005 ? 'gain' : minAll < 0 ? 'loss' : 'flat';
  const M = c.alive_losing_pct;
  const B = c.no_bequest_losing_pct;
  const fiscal = T != null && T > M;
  const beq = B > M;
  const more =
    fiscal && beq
      ? 'more adults lose if households bear the later fiscal cost or leaving bequests is not valued.'
      : beq
        ? 'more adults lose if leaving bequests is not valued.'
        : fiscal
          ? 'more adults lose if households bear the later fiscal cost.'
          : null;
  const ret = c.sources_alive.capital > 0 && c.sources_alive.labour < 0 && wealthAt(peakAge) > 1 ? [{ claim: 'return', text: RETURN_LINE }] : null;
  const least = state !== 'loss' && arm !== 'stress' ? [{ claim: 'least', text: `${leastWordsOf(c, xs, shockYear)}.` }] : null;
  let lines;
  if (state === 'gain') {
    const birth = { claim: 'birth', text: 'Every birth year gains on average as modelled' };
    lines = [ret, least, more ? [birth, { text: '; ' }, { claim: 'more', text: more }] : [{ ...birth, text: `${birth.text}.` }]];
  } else if (state === 'loss') {
    const from = xs[losing[0]];
    const to = xs[losing[losing.length - 1]];
    const oneRun = losing.length === to - from + 1;
    const x = Math.abs(minAll).toFixed(2);
    const by = x === '0.00' ? '' : `, by up to ${x}%`;
    const text = oneRun ? `Some birth years lose on average as modelled: those born ${from}–${to}${by}.` : `Some birth years lose on average as modelled${by}.`;
    lines = [ret, [{ claim: 'birth', text }], more ? [{ claim: 'more', text: capFirst(more) }] : null];
  } else lines = [ret, least, more ? [{ claim: 'more', text: capFirst(more) }] : null];
  return { icon: 'age', state, lead, lines: lines.filter(Boolean) };
}

// The Who gains answer for the view picked: computed, so it follows the arm,
// rule and closure pickers (Closure = Both reads some foreign capital; the
// fixed-spending rule reads debt-neutral, as the page does).
export function whoAnswer(closure, rule, arm) {
  const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
  const c = cell(cl, rule, arm);
  const T = measuresOf(c, rule, cl, arm).find((m) => m.id === 'T')?.losing[0] ?? null;
  return whoFindingOf(c, { xs: D.closures[cl].birth_year, shockYear: D.shock_year, arm, T, wealthAt: (age) => wealthRatioAt(D.closures[cl], age) });
}

// The box itself: the Finding, with the hooks the claims probe reads
// (data-finding, data-state, data-claim on each claim).
export function WhoFinding({ closure, rule, arm }) {
  const f = whoAnswer(closure, rule, arm);
  return (
    <div data-finding="who" data-state={f.state}>
      <Finding
        icon={f.icon}
        lead={<span data-claim="lead">{f.lead}</span>}
        lines={f.lines.map((parts, i) => (
          <span key={i}>
            {parts.map((p, k) =>
              p.claim ? (
                <span key={k} data-claim={p.claim}>
                  {p.text}
                </span>
              ) : (
                p.text
              ),
            )}
          </span>
        ))}
      />
    </div>
  );
}

export function cell(closure, rule, arm) {
  return D.closures[closure].rules[rule][arm];
}

// The main arm solved with debt-neutral transfers kept on to the horizon,
// measured against a no-shock path solved under the same rule (the paper's
// "solved to the horizon" row, UK central, some foreign capital). Read from the
// `dnfull` block of cohorts2028.json, which paper/cohort_welfare.py --json
// writes once that block is committed: {ready, closure, rule, arm, range:
// {joint_losing_pct, no_bequest_losing_pct, ...: [low, high] over the two
// extensions past the last solved year]}}. Until the block is in the data,
// or while it is not ready, this returns null and nothing renders.
export function dnfullFor(cl, rule, arm) {
  const x = D.dnfull;
  return x?.ready && x.closure === cl && x.rule === rule && x.arm === arm ? x : null;
}

// The measures the tiles compare: as modelled, bequests not valued,
// transfers bearing the later fiscal cost (solved to the horizon where the
// data has it, else a first-order estimate; debt-neutral transfers only) and
// both. Each row names its measure directly (short); the full definition is
// its tooltip.
export function measuresOf(c, rule, cl, arm) {
  const full = dnfullFor(cl, rule, arm);
  const ch = rule === 'dn' && !full ? c.charged : null;
  const t = full ? full.range : ch;
  return [
    { id: 'M', concept: 'model', label: 'As modelled', short: 'Modelled', def: 'The model’s own welfare measure: consumption, leisure and bequests', losing: [c.alive_losing_pct], avg: [c.alive_avg] },
    { id: 'B', concept: 'bequests', label: 'Bequests not valued', short: 'No bequests', def: 'The same, with no value placed on leaving bequests', losing: [c.no_bequest_losing_pct], avg: [c.no_bequest_alive_avg] },
    t
      ? {
          id: 'T',
          concept: 'benefits',
          label: 'Transfers bear the later fiscal cost',
          short: 'Transfers pay',
          tag: full ? 'solved to the horizon' : 'first order',
          def: full
            ? 'Transfers, not government consumption, hold debt/GDP on the forecast path to the horizon: a model run'
            : `The fiscal cost after ${Math.max(...flowYears(c))} charged to households: a first-order estimate, not a model run`,
          losing: t.joint_losing_pct,
          avg: t.joint_avg,
          full: !!full,
        }
      : null,
    t ? { id: 'BT', concept: 'range', label: 'Both', short: 'Both', def: 'Bequests not valued and transfers bearing the later fiscal cost', losing: t.no_bequest_losing_pct, avg: t.no_bequest_avg, full: !!full } : null,
  ].filter(Boolean);
}

const shareOf = (xs) => (xs.length > 1 ? shareRange(xs) : share(xs[0]));
const avgOf = (xs) => (xs.length > 1 ? (xs[0].toFixed(2) === xs[1].toFixed(2) ? pct(xs[0]) : `${pct(xs[0])} to ${pct(xs[1])}`) : pct(xs[0]));

// "Adults who lose" by measure: the four shares as plain rows, each
// printing its share once (its home); the measure picked in the heatmap's
// pill (WhoHeatmap.jsx) is shown by weight. Not a chooser (item-20-fable.md).
export { dotCounts } from '@/tabs/cohorts/WhoHeatmap.jsx';
function MeasureDots({ ms, measure }) {
  const m = ms.find((x) => x.id === measure) ?? ms[0];
  return (
    <ul className="ex-mtoggle" aria-label="Share of adults who lose, by measure">
      {ms.map((x) => (
        <li key={x.id} data-dnfull={x.full ? '' : undefined} className={`ex-mtoggle-row${x.id === m.id ? ' is-on' : ''}`} title={x.def} aria-current={x.id === m.id ? 'true' : undefined}>
          <span className="ex-mtoggle-name">
            {x.short}
            {x.tag ? <span className="ex-mtag"> ({x.tag})</span> : null}
            {/* a no-break space ends the label, so the row's text never runs
                the name into its figure (R1-21); a plain space would be
                dropped at the end of a grid cell */}
            {'\u00a0'}
          </span>
          <span className="ex-dd">{shareOf(x.losing)}</span>
        </li>
      ))}
    </ul>
  );
}

// The headline tiles: the share who lose (a range over the measures, then a
// bar per measure), who loses by age (a ruler), the average (a strip of the
// measures), and where it comes from (capital against labour income).
export function Headline({ c, rule, cl, arm, measure = 'M' }) {
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
      <StatTile icon={iconFor('households')} name="Adults who lose" value={tileRange(lo, hi)} sub={<Lead c="range">{`Share of adults alive in ${D.shock_year}, by measure`}</Lead>}>
        <MeasureDots ms={ms} measure={measure} />
      </StatTile>
      <StatTile
        icon={iconFor('young')}
        name="Who loses, by age"
        value={young ? (young === 20 ? 'Age 20' : `Up to age ${young}`) : ages ? `Up to age ${ages[0] === ages[1] ? ages[0] : `${ages[0]}–${ages[1]}`}` : 'The youngest'}
        sub={<Lead c="age">{young ? 'Every adult this age or younger loses, as modelled' : ages ? 'Lose on average when transfers bear the later cost' : 'Losses, where any, fall on the youngest adults'}</Lead>}
      >
        <div className="ex-ruler" aria-hidden="true">
          <span className="ex-ruler-fill" style={{ width: ageTo ? `${(((ageTo - 20) / 70) * 100).toFixed(1)}%` : '6%' }} />
          <span className="ex-ruler-ticks" data-axis="">
            <span>20</span>
            <span>45</span>
            <span>65</span>
            <span>90</span>
          </span>
          {/* the ruler's unit: its ticks are ages */}
          <span className="ex-ruler-unit">Age in {D.shock_year}</span>
        </div>
      </StatTile>
      <StatTile icon={iconFor('measure')} name="Average change" value={pct(c.alive_avg)} tone={tone(c.alive_avg)} sub={<Lead c="consumption">Of remaining-lifetime consumption and bequests</Lead>}>
        <ul className="ex-bars ex-avg">
          {ms.map((m) => (
            <li key={m.id} data-dnfull={m.id === 'BT' && m.full ? '' : undefined} className={m.id === measure ? 'is-on' : undefined}>
              <span className="ex-bar-code" title={m.def}>
                {m.short}
                {'\u00a0'}
              </span>
              <span className="ex-bar-track is-axis">
                <span className="ex-axis-zero" style={{ left: apos(0) }} aria-hidden="true" />
                {m.avg.map((x, k) => (
                  <span key={k} className="ex-avg-dot" style={{ left: apos(x) }} title={`${m.label}: ${pct(x)}`} aria-hidden="true" />
                ))}
              </span>
              {/* M is the tile's figure (a link to it); every other row prints
                  its own: T's had no home at all (review round 1, R1-10) */}
              {/* the icon alone has a name (review round 3, R3-24) */}
              <span className="ex-dd">
                {m.id === 'M' ? (
                  <span role="img" aria-label={`Total ${avgOf(m.avg)}: see the split below`}>
                    <Icon name={iconFor('link')} size={12} />
                  </span>
                ) : (
                  avgOf(m.avg)
                )}
              </span>
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
            </span>{' '}
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

// With Both (María re-review M10, Fable 5.2 ruling for Vahid, 24 Nov): one
// set of the four tiles, each carrying both foreign-capital cases as two
// labelled values, in place of two stacks of tiles. The foreign-capital
// setting in the header pill stays the one chooser. Where "transfers pay"
// is measured differently in the two cases (a solve to the horizon in one,
// a first-order estimate in the other), its tag prints beside each value
// and one line says so.
const BOTH_CASES = [
  { cl: 'zk0.1', label: 'Some foreign capital' },
  { cl: 'zk0', label: 'No foreign capital' },
];
function TwoValues({ vals, tone: toneOf }) {
  return (
    <span className="ex-two">
      {vals.map((v) => (
        <span key={v.label} className="ex-two-row">
          <span className="ex-two-k">{v.label}</span>{' '}
          <span className={`ex-two-v${toneOf && toneOf(v.x) ? ` is-${toneOf(v.x)}` : ''}`}>{v.text}</span>
        </span>
      ))}
    </span>
  );
}
const ageText = (c, full, ch) => {
  const fills = full ? Object.values(full.by_fill ?? {}) : [];
  const fullAges = fills.length ? [Math.min(...fills.map((f) => f.oldest_losing_on_average)), Math.max(...fills.map((f) => f.oldest_losing_on_average))] : null;
  const young = c.all_lose_up_to_age;
  const ages = fullAges ?? ch?.oldest_losing_on_average;
  return young ? (young === 20 ? 'Age 20' : `Up to age ${young}`) : ages ? `Up to age ${ages[0] === ages[1] ? ages[0] : `${ages[0]}–${ages[1]}`}` : 'The youngest';
};
export function HeadlineBoth({ rule, arm, measure = 'M' }) {
  const cases = BOTH_CASES.map((k) => {
    const c = cell(k.cl, rule, arm);
    const full = dnfullFor(k.cl, rule, arm);
    const ch = rule === 'dn' && !full ? c.charged : null;
    const ms = measuresOf(c, rule, k.cl, arm);
    const all = ms.flatMap((m) => m.losing);
    return { ...k, c, full, ch, ms, lo: Math.min(...all), hi: Math.max(...all) };
  });
  const [a, b] = cases;
  const ids = a.ms.map((m) => m.id).filter((id) => b.ms.some((m) => m.id === id));
  const T = ids.includes('T') ? [a.ms.find((m) => m.id === 'T'), b.ms.find((m) => m.id === 'T')] : null;
  const split = T && T[0].tag !== T[1].tag;
  return (
    <div className="stat-row cols-4 ex-who-tiles is-both" data-both="">
      <StatTile icon={iconFor('households')} name="Adults who lose" value={<TwoValues vals={cases.map((k) => ({ label: k.label, text: tileRange(k.lo, k.hi) }))} />} sub={<Lead c="range">{`Share of adults alive in ${D.shock_year}, by measure`}</Lead>}>
        <ul className="ex-mtoggle" aria-label="Share of adults who lose, by measure, with some and with no foreign capital">
          {ids.map((id) => {
            const [x, y] = [a.ms.find((m) => m.id === id), b.ms.find((m) => m.id === id)];
            return (
              <li key={id} className={`ex-mtoggle-row${id === measure ? ' is-on' : ''}`} title={x.def} aria-current={id === measure ? 'true' : undefined}>
                <span className="ex-mtoggle-name">
                  {x.short}
                  {'\u00a0'}
                </span>
                <span className="ex-dd">
                  {shareOf(x.losing)}
                  {split && id === 'T' ? <span className="ex-mtag"> ({x.tag})</span> : null} · {shareOf(y.losing)}
                  {split && id === 'T' ? <span className="ex-mtag"> ({y.tag})</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="ex-two-note">Each row: some foreign capital · no foreign capital.</p>
        {split ? <p className="ex-two-note">The two are measured differently: one is a model run, the other a first-order estimate.</p> : null}
      </StatTile>
      <StatTile icon={iconFor('young')} name="Who loses, by age" value={<TwoValues vals={cases.map((k) => ({ label: k.label, text: ageText(k.c, k.full, k.ch) }))} />} sub={<Lead c="age">Every adult this age or younger loses, or loses on average where transfers bear the later cost</Lead>} />
      <StatTile icon={iconFor('measure')} name="Average change" value={<TwoValues tone={tone} vals={cases.map((k) => ({ label: k.label, text: pct(k.c.alive_avg), x: k.c.alive_avg }))} />} sub={<Lead c="consumption">Of remaining-lifetime consumption and bequests</Lead>}>
        <ul className="stat-rows ex-stat-rows">
          {ids
            .filter((id) => id !== 'M')
            .map((id) => {
              const [x, y] = [a.ms.find((m) => m.id === id), b.ms.find((m) => m.id === id)];
              return (
                <li key={id} className={id === measure ? 'is-on' : undefined}>
                  <span className="ex-dt" title={x.def}>
                    {x.short}
                  </span>{' '}
                  <span className="ex-dd">
                    {avgOf(x.avg)} · {avgOf(y.avg)}
                  </span>
                </li>
              );
            })}
        </ul>
      </StatTile>
      <StatTile icon={iconFor('inequality')} name="Where it comes from" value={<TwoValues tone={tone} vals={cases.map((k) => ({ label: k.label, text: pct(k.c.sources_alive.capital), x: k.c.sources_alive.capital }))} />} sub={<Lead c="capital">From capital income, at unchanged behaviour</Lead>}>
        <ul className="stat-rows ex-stat-rows">
          <li>
            <span className="ex-dt">
              <Lead c="labour">From labour income</Lead>
            </span>{' '}
            <span className="ex-dd">
              {pct(a.c.sources_alive.labour)} · {pct(b.c.sources_alive.labour)}
            </span>
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
// (the surprise file of the cohort's own year, lib/dataKeys.js cohortGap;
// UK central, headline year): the interest rate and the
// pay rate for the arm, closure and rule in view, and aggregate consumption
// in the shock year (cohorts2028.json). Every direction word and arrow on
// the cards is computed from these signs.
const SURPRISE_ARM = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
export function whySigns(cl, rule, arm) {
  const c = cell(cl, rule, arm);
  const g = (a, v) => gap('uk_central', SURPRISE_ARM[a], cl, v, rule);
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

// The cluster's words (item-21-fable.md), one function per block, pure so
// the tests can read every cell: each returns { lead, lines } and what its
// figure needs. Every year is a token from the data or a named constant:
// the shock year, the last flow year (the last key of c_gap), the year the
// debt rule starts (one after it), the year consumption is first above the
// path, and HORIZON_YEAR.
const flowYears = (c) => Object.keys(c.c_gap).map(Number);
export function whyTokens(cl, rule, arm) {
  const c = cell(cl, rule, arm);
  const lastFlowYear = Math.max(...flowYears(c));
  return { shockYear: D.shock_year, lastFlowYear, debtRuleYear: lastFlowYear + 1, cAboveYear: c.first_year_c_above ?? null };
}

// The Who cards (Fable 5.2 ruling for Vahid, "Who cards"): each block
// returns its title (lead), one why-line or null, and what its card needs.
// Every gate reads the data; `o` overrides the signs, so a test can force a
// gate false and see its line go.
// A. The consumption path. Why-line A1 to A4.
export function consumptionWords(cl, rule, arm, o = {}) {
  const x = { ...whySigns(cl, rule, arm), ...o };
  const t = whyTokens(cl, rule, arm);
  const cAboveYear = 'cAbove' in o ? o.cAbove : t.cAboveYear;
  const inv = o.inv ?? gap('uk_central', SURPRISE_ARM[arm], cl, 'I', rule, t.shockYear);
  const below = x.c0 < 0;
  const lead = below ? (cAboveYear ? 'Consumption falls below the forecast path first, then rises above it.' : 'Consumption stays below the forecast path.') : 'Consumption starts above the forecast path.';
  // "at first" only where consumption later rises above the path (review
  // round 2, R2-11)
  const first = cAboveYear ? ' at first' : '';
  const why = below ? (x.r > 0 && inv > 0 ? `Households save more as the return on capital rises, so they spend less${first}.` : `Households spend less${first}.`) : `Households spend more from ${t.shockYear}.`;
  return { lead, why, below };
}

// A's stat pair (push D, Q7a): the shock year's gap, then the year
// consumption first rises above the path (first_year_c_above), so the
// pair matches the lead's "then rises above it". That year can fall after
// the years c_gap covers, so it is shown as the year itself, not a gap.
// With no such year, the last year's gap. Every year from the data.
export function consumptionStats(cl, rule, arm) {
  const c = cell(cl, rule, arm);
  const t = whyTokens(cl, rule, arm);
  const at = (y) => c.c_gap[String(y)];
  const first = { key: 'start', label: `${t.shockYear}, the shock year`, value: at(t.shockYear) };
  const second = t.cAboveYear != null ? { key: 'cross', label: 'First year above the path', text: String(t.cAboveYear), value: null } : { key: 'last', label: `${t.lastFlowYear}, the last year shown`, value: at(t.lastFlowYear) };
  return [first, second].filter((x) => x.value != null || x.text != null);
}

// A's unit line (the Fable 5.2 ruling for Vahid, R2; Who cards): with a
// crossing year the only gap shown is the shock year's, so the line names
// that year; with none, it says consumption is still below the path at the
// horizon (the fact the dropped second line carried), where it is below.
export function consumptionUnit(cl, rule, arm) {
  const t = whyTokens(cl, rule, arm);
  if (t.cAboveYear != null) return `Consumption gap vs forecast path in ${t.shockYear}, %; 0 is the path`;
  return whySigns(cl, rule, arm).c0 < 0 ? `Consumption gap vs forecast path, %; still below it in ${HORIZON_YEAR}, the last year in the data` : 'Consumption gap vs forecast path, %; 0 is the path';
}

// B. Who gains, by earnings: the bottom 25% against the top 1%. Why-line
// B1, or none (B2).
const rising = (xs) => xs.every((v, i) => i === 0 || v >= xs[i - 1]);
export function earningsWords(cl, rule, arm, o = {}) {
  const c = cell(cl, rule, arm);
  const prof = profileOf(D.closures[cl]);
  const x = { ...whySigns(cl, rule, arm), ...o };
  const [bot, top] = [c.alive_by_group[0], c.alive_by_group[6]];
  const [b, t] = [tone(bot), tone(top)];
  const who = `the ${GROUP_LABELS[0].toLowerCase()} of lifetime earners`;
  const top1 = `the ${GROUP_LABELS[6].toLowerCase()}`;
  let lead = null;
  if (bot > top) {
    if (b === 'gain' && t === 'gain') lead = `As modelled, ${who} gain more than ${top1}.`;
    else if (b === 'gain' && t === 'loss') lead = `As modelled, ${who} gain and ${top1} lose.`;
    else if (b === 'loss' && t === 'loss') lead = `As modelled, ${who} lose less than ${top1}.`;
    else if (b === 'gain' && t === null) lead = `As modelled, ${who} gain and ${top1} are unchanged.`;
  }
  const ranked = lead != null;
  const pr = { ...prof, ...(o.prof ?? {}) };
  const labour = o.labour ?? pr.labour;
  const why =
    ranked && labour[0] < labour[6] && rising(labour) && pr.wealth_share[0] > pr.earnings_share[0] && x.r > 0 && x.w < 0
      ? 'In the model, lower earners rely less on pay, and the higher return on capital reaches them too.'
      : null;
  return { lead: lead ?? `By lifetime earnings: the ${GROUP_LABELS[0].toLowerCase()} and the ${GROUP_LABELS[6].toLowerCase()}.`, why, bot, top };
}

// C. Who pays the fiscal cost. Title unchanged; why-line C1 to C3; the
// stat pair is the age-45 transfer change under debt-neutral transfers,
// and the public debt gap under the common rule.
const NO_VALUE = 'households in the model do not value government consumption.';
// a signed figure in pp, with a space before the unit
export const ppText = (x, dp = 2) => (x == null ? 'n/a' : minus(`${x > 0 ? '+' : ''}${x.toFixed(dp)} pp`));
export function payWords(cl, rule, arm, o = {}) {
  const c = cell(cl, rule, arm);
  const t = whyTokens(cl, rule, arm);
  if (rule === 'dn') {
    const tr = o.transfers ?? windowIncomeOf(c).transfers;
    const gain = tr.every((v) => v > 0);
    const fall = tr.every((v) => v < 0);
    // transfers hold public debt on its path: the debt gap is 0 by the last flow year
    const debt = 'debt' in o ? o.debt : gap('uk_central', SURPRISE_ARM[arm], cl, 'debt_gdp_pp', 'dn', t.lastFlowYear);
    const held = debt != null && Math.abs(debt) < 0.005;
    const dir = gain ? 'rise' : 'fall';
    const why = gain || fall ? (held ? `Transfers ${dir} to keep public debt on its forecast path; ${NO_VALUE}` : `Transfers ${dir} to ${t.lastFlowYear}; ${NO_VALUE}`) : null;
    const age = windowIncomeAge(c);
    return {
      lead: gain ? `Households get the fiscal gain to ${t.lastFlowYear}; after that it goes to government consumption.` : `Households pay the fiscal cost to ${t.lastFlowYear}; after that it falls on government consumption.`,
      why,
      stats: [
        { key: 'bot', label: GROUP_LABELS[0], value: tr[0] },
        { key: 'top', label: GROUP_LABELS[6], value: tr[6] },
      ],
      unit: `Change in transfers over ${t.shockYear}–${t.lastFlowYear}, at age ${age}, % of consumption`,
      signed: true,
    };
  }
  const later = gap('uk_central', SURPRISE_ARM[arm], cl, 'debt_gdp_pp', 'common', t.debtRuleYear);
  const cost = later != null && later > 0;
  const d0 = gap('uk_central', SURPRISE_ARM[arm], cl, 'debt_gdp_pp', 'common', t.shockYear);
  const d1 = gap('uk_central', SURPRISE_ARM[arm], cl, 'debt_gdp_pp', 'common', t.lastFlowYear);
  return {
    lead: cost ? 'As modelled, no household pays the fiscal cost: public debt takes it, then government consumption.' : 'As modelled, no household is charged: public debt takes the fiscal effect, then government consumption.',
    why: `Under the common fiscal rule, spending follows GDP; ${NO_VALUE}`,
    // more debt is not a gain: no tone
    stats: [
      { key: 'start', label: String(t.shockYear), value: d0, text: ppText(d0) },
      { key: 'last', label: String(t.lastFlowYear), value: d1, text: ppText(d1) },
    ],
    unit: 'Public debt gap vs forecast path, pp of GDP; 0 is the path',
    signed: false,
  };
}

// D. The stress test, by age. Why-line D1, D2 or none (D3), from the
// stress test's own signs, not the version in view.
export function stressWords(cl, rule, arm, o = {}) {
  const s = cell(cl, rule, 'stress');
  const x = { ...whySigns(cl, rule, arm), ...o };
  const l = leastOf(s);
  const lead =
    l.who === 'youngest' ? `In the stress test, the youngest adults ${l.verb}.` : l.who === 'working' ? `In the stress test, the youngest working-age adults ${l.verb}.` : `In the stress test, adults around age ${l.age} ${l.verb}.`;
  const wealth = 'wealthYoung' in o ? o.wealthYoung : wealthRatioAt(D.closures[cl], FIRST_AGE);
  const who = o.who ?? l.who;
  const d1 = who !== 'age' && x.stressW != null && x.stressW < 0 && wealth != null && wealth <= 0.25;
  // "further below" needs the main version below the path too
  const d2 = x.stressW != null && x.tfpW != null && x.stressW < x.tfpW && x.tfpW < 0;
  const why = d1
    ? 'The youngest adults have the most working years ahead and little wealth, so lower pay costs them most.'
    : d2
      ? 'With no output gain, the pay rate falls further below the forecast path than in the main version.'
      : null;
  const xs = D.closures[cl].birth_year;
  const at = (age) => s.cev_all[xs.indexOf(D.shock_year - age)];
  return { lead, why, young: at(FIRST_AGE), old: at(RULER_AGE) };
}

// Open the OG-UK settings pill (components/ui/Pill.jsx) at its Budget
// assumption section: the page pill in the model row, or the sub-tab
// header's copy once the page pill is under the sticky stack
// (SettingsBar.jsx useCondensed, data-condensed). The pill focuses its
// first section on opening, so the Budget section's chosen option takes
// focus a frame later.
export function openBudget() {
  const panel = document.querySelector('.tab-panel:not([hidden])') ?? document;
  const page = panel.querySelector('.settings-chip-wrap.is-page .settings-chip');
  const header = document.querySelector('.settings-chip-wrap.is-header .settings-chip');
  const btn = (document.querySelector('[data-condensed]') ? header : page) ?? page ?? header;
  if (!btn) return;
  if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
  const focus = () => {
    const pop = document.getElementById(btn.getAttribute('aria-controls'));
    const group = [...(pop?.querySelectorAll('.sp-group') ?? [])].find((g) => g.querySelector('.sp-group-name')?.textContent.trim() === 'Budget assumption');
    const opt = group?.querySelector('[role="radio"][tabindex="0"]') ?? group?.querySelector('[role="radio"]');
    if (!opt) return;
    opt.focus({ preventScroll: true });
    group.scrollIntoView?.({ block: 'nearest' });
  };
  requestAnimationFrame(() => setTimeout(focus, 0));
}

// A link that opens a folded section (Disclosure's reveal event) and
// scrolls to it, or to a card on this page.
function JumpLink({ to, children }) {
  return (
    <a
      href={`#${to}`}
      className="ex-jump"
      onClick={(e) => {
        e.preventDefault();
        revealAnchor(to, { smooth: true });
      }}
    >
      {children}
    </a>
  );
}

// The welfare breakdown card (item-19-fable.md): the average change for
// adults alive in the shock year (alive_avg) and its three parts
// (parts_alive), each the same measure with one utility term moved to the
// scenario path. The parts are not additive, so a caveat says so.
const PARTS = [
  { k: 'consumption', more: 'more spending', less: 'less spending', bare: 'Spending', tip: 'The change if only spending moved, with free time and bequests as they would be with no extra AI.' },
  { k: 'leisure', more: 'more free time', less: 'less free time', bare: 'Free time', tip: 'The change if only hours worked moved, with spending and bequests as they would be with no extra AI.' },
  { k: 'bequests', more: 'bigger bequests', less: 'smaller bequests', bare: 'Bequests', tip: 'The change if only bequests moved, with spending and free time as they would be with no extra AI.' },
];
const TOTAL_TIP = 'The average change in lifetime welfare, counting spending, free time and bequests together.';
const zero2 = (x) => Math.abs(x) < 0.005;
const partWords = (q, v) => (zero2(v) ? q.bare.toLowerCase() : v > 0 ? q.more : q.less);
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// The card's lead, from the signs (item 19's four forms). Lists run largest
// first; a part that rounds to 0.00 is left out; the verb agrees with the
// first list.
export function byFormLead(p, total) {
  const parts = PARTS.map((q) => ({ q, v: p[q.k] })).filter((x) => !zero2(x.v));
  const pos = parts.filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const neg = parts.filter((x) => x.v < 0).sort((a, b) => a.v - b.v);
  const list = (xs) => andList(xs.map((x) => partWords(x.q, x.v)));
  const verb = (xs) => (xs.length > 1 ? 'outweigh' : 'outweighs');
  if (total > 0 && !neg.length) {
    if (p.bequests > p.consumption + p.leisure) return 'Most of the average gain is the value of leaving bigger bequests.';
    if (pos.length) return `The largest part of the average gain is ${list(pos.slice(0, 1))}.`;
  }
  if (total > 0 && pos.length) return `${capFirst(list(pos))} ${verb(pos)} ${list(neg)}.`;
  if (total <= 0 && neg.length && pos.length) return `${capFirst(list(neg))} ${verb(neg)} ${list(pos)}: on average adults lose.`;
  // guards, not reached on the 2028 data
  return total > 0 ? 'On average adults gain.' : 'On average adults lose.';
}

// One bar per row on a shared axis from min(0, values) to max(0, values),
// padded 5%; one zero line; the value at the bar's end (left end when
// negative). The total restates the Average change tile: data-axis.
function PartBars({ c }) {
  const p = c.parts_alive;
  const rows = [
    { k: 'total', label: 'Total', v: c.alive_avg, tip: TOTAL_TIP, total: true },
    ...PARTS.map((q) => ({ k: q.k, label: capFirst(partWords(q, p[q.k])), v: p[q.k], tip: q.tip })),
  ];
  const vs = rows.map((r) => r.v);
  const lo0 = Math.min(0, ...vs);
  const hi0 = Math.max(0, ...vs);
  const pad = (hi0 - lo0 || 1) * 0.05;
  const lo = lo0 < 0 ? lo0 - pad : 0;
  const hi = hi0 > 0 ? hi0 + pad : 0;
  const at = (x) => `${(((x - lo) / (hi - lo || 1)) * 100).toFixed(2)}%`;
  return (
    <div className="ex-parts-wrap">
      <ul className={`ex-parts${lo0 < 0 ? ' has-neg' : ''}${hi0 > 0 ? ' has-pos' : ''}`} aria-label="Average change and its three parts" style={{ '--parts-fill': GROUP_RAMP[3] }}>
        {rows.map((r) => (
          <li key={r.k} className={r.total ? 'is-total' : undefined}>
            <span className="ex-parts-label">{r.label}</span>{' '}
            <span className="ex-parts-track">
              <span className="ex-parts-plot">
                <span className="ex-parts-zero" style={{ left: at(0) }} aria-hidden="true" />
                <span className="ex-parts-tip" title={r.tip} style={{ left: at(Math.min(0, r.v)), width: `${((Math.abs(r.v) / (hi - lo || 1)) * 100).toFixed(2)}%` }}>
                  <TipTarget className="ex-parts-bar" label={`${r.label}: ${pct(r.v)}`} tip={<><b>{r.label}</b><span className="tip-value">{pct(r.v)}</span><span className="tip-sub">{r.tip}</span></>} />
                </span>
                <span className={`ex-parts-val${r.v < 0 ? ' is-neg' : ''}`} style={r.v < 0 ? { right: `calc(100% - ${at(r.v)})` } : { left: at(r.v) }} data-axis={r.total ? '' : undefined}>
                  {pct(r.v)}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="finding-note">Each part is measured on its own, so the three do not add up exactly to the total.</p>
    </div>
  );
}

// A Finding box that draws a figure carries the card-level Sources and
// notes button its figure reads from (one per card: check_sources.mjs).
function WhoSources() {
  return <SourceLine items={cohortSources()} record={false} />;
}

// The breakdown is the one Card (components/ui/Card.jsx; task 19, "box ui"):
// title, the intro line, the unit, then the bars at the card's full width,
// so the intro no longer sits over an empty column beside the chart.
function ByForm({ c, both }) {
  return (
    <Card
      id="welfare-breakdown"
      className="ex-parts-card"
      icon={iconFor('bequests')}
      title={noStop(byFormLead(c.parts_alive, c.alive_avg))}
      finding={`The average change for adults alive in ${D.shock_year}, split by what changes: spending, free time and bequests.${both ? ' Shown with some foreign capital.' : ''}`}
      unit={<span data-axis-title="y">% of remaining-lifetime consumption and bequests</span>}
      sources={cohortSources()}
    >
      <PartBars c={c} />
    </Card>
  );
}

// The measure's plain words (consistent with the Who gains card's
// Measure row and its "Consumption-equivalent" definition; Method has no
// separate account of it).
const MEASURE_UNIT = '% of remaining-lifetime consumption and bequests';
const MEASURE_TIP = 'A consumption-equivalent welfare change: the constant % change in an adult’s spending and bequests, in every remaining year of their life, that leaves them as well off as the scenario does.';
function MeasureUnit() {
  return (
    <TipTarget className="why-unit-tip" label="What does this measure mean?" tip={<span>{MEASURE_TIP}</span>}>
      {MEASURE_UNIT}
    </TipTarget>
  );
}

// Two big numbers with small labels (push D, Q7a and Q7b): { key, label,
// value, text? }; `text` prints in place of the signed value, and `tone`
// (default on) colours a signed value by its sign.
function StatPair({ stats = [], signed = true }) {
  if (!stats.length) return null;
  return (
    <dl className="why-stats">
      {stats.map((x) => (
        <div key={x.key} className="why-stat">
          <dt className="why-stat-label">{x.label}</dt>
          <dd className={`why-stat-value${signed && x.value != null && tone(x.value) ? ` is-${tone(x.value)}` : ''}`}>{x.text ?? pct(x.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// One "what drives the result" card (push D, Q7a; Who cards, Fable 5.2
// ruling for Vahid): the finding title (as modelled, no full stop), one
// why-line led by an icon (none in the branches with no line), a stat pair
// of two big numbers with small labels, one unit line, and one link row
// ending in an arrow at the card's foot, so cards in a row line up.
// `signed` (default on) tones the pair's values by sign; off where more is
// not a gain (card 3's public debt).
function WhyCard({ icon, lead, why, stats = [], unit, link, actions, signed = true }) {
  return (
    <section className="finding why-card">
      <div className="finding-head">
        <IconLine concept={icon} tier="body" className="finding-lead" iconClassName="finding-icon">
          {noStop(lead)}
        </IconLine>
        {actions ? <div className="finding-actions">{actions}</div> : null}
      </div>
      {why ? (
        <ul className="why-bullets">
          <IconLine as="li" concept={why.icon} iconClassName="why-bullet-icon">
            {why.text}
          </IconLine>
        </ul>
      ) : null}
      <StatPair stats={stats} signed={signed} />
      {unit ? (
        <p className="why-unit" data-axis-title="y">
          {unit}
        </p>
      ) : null}
      {link ? <p className="why-link">{link}</p> : null}
    </section>
  );
}
const Arrow = () => <Icon name="arrowRight" size={14} className="why-link-arrow" />;
// a why-line with the icon of its kind of statement
const whyOf = (text, icon) => (text ? { text, icon } : null);

// The More info panel under card 2 (Who cards, Fable 5.2 ruling for Vahid):
// one lead callout, then four reasons of one shape (heading, one stat pair,
// one unit line, at most one takeaway of 15 words or fewer), 2x2 at desktop
// and one column on phones. Every heading and takeaway is gated on the data.
export function moreInfoReasons(cl, rule, arm, o = {}) {
  const C = D.closures[cl];
  const c = cell(cl, rule, arm);
  const prof = { ...profileOf(C), ...(o.prof ?? {}) };
  const x = { ...whySigns(cl, rule, arm), ...o };
  const tr = o.transfers ?? (rule === 'dn' ? windowIncomeOf(c)?.transfers : null);
  const gapOf = (y) => y.alive_by_group[0] - y.alive_by_group[6];
  const narrows = 'narrows' in o ? o.narrows : rule === 'dn' && gapOf(c) > 0 && gapOf(c) < gapOf(cell(cl, 'common', arm));
  const bot = GROUP_LABELS[0].toLowerCase();
  const top = GROUP_LABELS[6].toLowerCase();
  const wc = o.wc ?? C.wealth_concentration.top_tenth_pct;
  const lessPay = prof.labour[0] < prof.labour[6];
  const spread = prof.wealth_share[0] > prof.earnings_share[0];
  const lessConc = wc < ONS_TOP_TENTH.pct;
  return [
    {
      key: 'pay',
      icon: 'pay',
      head: lessPay ? `The ${bot} depend less on pay` : `Pay, ${bot} and ${top}`,
      take: lessPay && x.w < 0 ? 'A lower pay rate takes a smaller share of the bottom group’s income.' : null,
    },
    {
      key: 'wealth',
      icon: 'capital',
      head: spread ? 'In the model, wealth is spread more evenly than earnings' : `Wealth and earnings of the ${bot}`,
      take: spread && x.r > 0 ? 'So the higher return on capital reaches lower earners too.' : null,
    },
    {
      key: 'transfers',
      icon: 'benefits',
      head: 'Transfers are the same amount per head',
      take:
        rule === 'dn' && tr && tr[0] < tr[6] && tr[6] < 0 && narrows
          ? 'Lower transfers cost the bottom group more, narrowing the gap but not reversing it.'
          : 'The same amount is a larger share of a lower earner’s income.',
    },
    {
      key: 'ons',
      icon: 'inequality',
      head: lessConc ? 'Model wealth is less concentrated than in ONS data' : 'Wealth concentration against ONS data',
      take: lessConc ? 'Untested: with wealth as concentrated as in ONS data, the ranking could narrow or reverse.' : null,
    },
  ];
}

function MiHead({ r }) {
  return (
    <IconLine as="h4" concept={r.icon} tier="ui" className="ex-mi-head">
      {r.head}
    </IconLine>
  );
}
const MiTake = ({ r }) => (r.take ? <p className="ex-mi-text">{r.take}</p> : null);

// What drives the result (item-21-fable.md): four cards of one anatomy
// (WhyCard), then the closed "More info" disclosure, full width.
function Why({ cl, rule, arm }) {
  const C = D.closures[cl];
  const prof = profileOf(C);
  const t = whyTokens(cl, rule, arm);
  const A = consumptionWords(cl, rule, arm);
  const B = earningsWords(cl, rule, arm);
  const Cw = payWords(cl, rule, arm);
  const Dw = stressWords(cl, rule, arm);
  const bot = GROUP_LABELS[0];
  const top = GROUP_LABELS[6];
  const wc = C.wealth_concentration.top_tenth_pct;
  const R = Object.fromEntries(moreInfoReasons(cl, rule, arm).map((r) => [r.key, r]));
  return (
    <div className="ex-stack">
      <div className="ex-why2">
        <WhyCard
          actions={<WhoSources />}
          icon="consumption"
          lead={A.lead}
          why={whyOf(A.why, 'savings')}
          stats={consumptionStats(cl, rule, arm)}
          unit={consumptionUnit(cl, rule, arm)}
          link={
            <JumpLink to="welfare-breakdown">
              See the average, split by what changes <Arrow />
            </JumpLink>
          }
        />
        <WhyCard
          actions={<WhoSources />}
          icon="lifetimeEarnings"
          lead={B.lead}
          why={whyOf(B.why, 'capital')}
          stats={[
            { key: 'bot', label: bot, value: B.bot },
            { key: 'top', label: top, value: B.top },
          ]}
          unit={<MeasureUnit />}
          link={
            <JumpLink to="who-model-households">
              Why this ranking depends on the model <Arrow />
            </JumpLink>
          }
        />
        <WhyCard
          icon="finances"
          lead={Cw.lead}
          why={whyOf(Cw.why, 'rule')}
          stats={Cw.stats}
          unit={Cw.unit}
          signed={Cw.signed}
          link={
            <button type="button" className="ex-jump" onClick={openBudget}>
              Change the budget assumption <Arrow />
            </button>
          }
        />
        <WhyCard
          actions={<WhoSources />}
          icon="young"
          lead={Dw.lead}
          why={whyOf(Dw.why, Dw.why?.startsWith('With no output gain') ? 'pay' : 'young')}
          stats={[
            { key: 'young', label: `Age ${FIRST_AGE} in ${t.shockYear}`, value: Dw.young },
            { key: 'old', label: `Age ${RULER_AGE} in ${t.shockYear}`, value: Dw.old },
          ]}
          unit={<MeasureUnit />}
          // the chart shows the version in view: a link to it reads as the
          // stress test only when that is the version in view
          link={
            arm === 'stress' ? (
              <JumpLink to="welfare-chart">
                See every age in the chart <Arrow />
              </JumpLink>
            ) : null
          }
        />
      </div>
      <div className="ex-mi-box">
        <Disclosure id="who-model-households" title="More info" preview="How the model’s households compare with the UK: pay, transfers and wealth by earnings group">
          <div className="ex-mi">
            <Callout as="div" icon="model" className="ex-mi-callout">
              <p>The ranking by earnings group is a property of the model, not a finding about the UK.</p>
            </Callout>
            <div className="ex-mi-grid">
              <section className="ex-mi-card">
                <MiHead r={R.pay} />
                <StatPair
                  signed={false}
                  stats={[
                    { key: 'b', label: bot, value: prof.labour[0], text: plain(prof.labour[0]) },
                    { key: 't', label: top, value: prof.labour[6], text: plain(prof.labour[6]) },
                  ]}
                />
                <p className="ex-mi-unit">Pay as a share of gross income, {t.shockYear}</p>
                <MiTake r={R.pay} />
              </section>
              <section className="ex-mi-card">
                <MiHead r={R.wealth} />
                <StatPair
                  signed={false}
                  stats={[
                    { key: 'w', label: 'Share of wealth', value: prof.wealth_share[0], text: plain(prof.wealth_share[0]) },
                    { key: 'e', label: 'Share of labour income', value: prof.earnings_share[0], text: plain(prof.earnings_share[0]) },
                  ]}
                />
                <p className="ex-mi-unit">
                  {bot} of lifetime earners, {t.shockYear}
                </p>
                <MiTake r={R.wealth} />
              </section>
              <section className="ex-mi-card">
                <MiHead r={R.transfers} />
                <StatPair
                  signed={false}
                  stats={[
                    { key: 'b', label: bot, value: prof.transfers[0], text: plain(prof.transfers[0]) },
                    { key: 't', label: top, value: prof.transfers[6], text: plain(prof.transfers[6]) },
                  ]}
                />
                <p className="ex-mi-unit">Transfers as a share of gross income, {t.shockYear}</p>
                <MiTake r={R.transfers} />
              </section>
              <section className="ex-mi-card">
                <MiHead r={R.ons} />
                <StatPair
                  signed={false}
                  stats={[
                    { key: 'm', label: `Model, adults, ${t.shockYear}`, value: wc, text: plain(wc) },
                    { key: 'o', label: `ONS, households, ${ONS_TOP_TENTH.period}`, value: ONS_TOP_TENTH.pct, text: `${ONS_TOP_TENTH.pct}%` },
                  ]}
                />
                <p className="ex-mi-unit">Share of wealth held by the top tenth</p>
                <IconLine concept="limit" className="ex-mi-note">
                  Not like for like: ONS counts households in Great Britain; the model counts adults.
                </IconLine>
                <p className="ex-mi-src" data-cite="">
                  Source: {ext(ONS_TOP_TENTH.url, 'ONS, Household total wealth in Great Britain, April 2018 to March 2020')}
                </p>
                <MiTake r={R.ons} />
              </section>
            </div>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

const CL_WORDS = { 'zk0.1': 'some foreign capital', zk0: 'no foreign capital' };
const CL_HEAD = { 'zk0.1': { icon: iconFor('foreign'), text: 'Some foreign capital' }, zk0: { icon: iconFor('closed'), text: 'No foreign capital' } };

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
    { id: 'all', label: 'Average, all groups', color: ALL_GROUPS_COLOUR, dashed: true },
  ];
  // Earnings group, one choice: every group, or one with the average
  const groupPick = st.groups.length === WG_GROUPS.length ? 'all' : st.groups.find((g) => g !== 'all');
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
  const clWords = both ? 'some foreign capital and no foreign capital' : CL_WORDS[cl];

  return (
    <>
      <SectionHeading id="who-gains" icon={iconFor('age')} title="Who gains and who loses, by birth year and earnings group">
        <Lead c="measure">
          Gain or loss, as a %{' '}
          <abbr title="Consumption-equivalent: the constant % change in consumption and bequests, every remaining year, that leaves a household as well off">
            of remaining-lifetime consumption and bequests
          </abbr>
        </Lead>
      </SectionHeading>
      <ul className="ex-mchips ex-who-chips">
        <li className="ex-mchip" title="Cohort paths are solved for UK central only, so the scenario in the settings pill is fixed on this page">
          UK central only
        </li>
        <li className="ex-mchip">
          Extra AI starts in {ext(SRC.surpriseYear.url, `${D.shock_year} (an assumed date)`)}, as a surprise
        </li>
        <li className="ex-mchip" title="The paper also reports Korinek et al., substantial (US), under debt-neutral transfers; its cohort paths are not in this site’s data yet">
          Korinek, substantial (US): in the {ext(PAPER_DRAFT, 'paper draft')}, not yet here
        </li>
        {both ? (
          <li className="ex-mchip" title="The reasons below are for the case with some foreign capital">
            With Both, the figures and the chart show each foreign-capital case
          </li>
        ) : null}
      </ul>
      {/* arm and fiscal rule: the settings pill under the page title (one store) */}
      {/* one stack, one gap between every card (task 19) */}
      <div className="ex-stack">
        {both ? (
          <HeadlineBoth rule={rule} arm={arm} measure={measure} />
        ) : (
          <Headline c={c} rule={rule} cl={cl} arm={arm} measure={measure} />
        )}
        <ByForm c={c} both={both} />
        <WhoHeatmap cl={both ? 'zk0.1' : cl} rule={rule} arm={arm} both={both} measure={measure} onMeasure={setMeasure} ms={measuresOf(c, rule, cl, arm)} />
        <Card
          id="welfare-chart"
          // slot 9 (review round 3, R3-12): the generations scene's case
          story={rule === 'dn' && arm === 'tfp' && cls.includes('zk0.1') ? { anchor: 'p2-who-0', name: 'the generations scene' } : null}
          icon={iconFor('path')}
          title="Welfare change by birth year"
          // round 3 §B (R4-09): the unit line, slot 4, worded as the
          // heatmap's (the spec's 78 characters are over item 36's 60; the
          // title already says "by birth year")
          unit="Change in remaining-lifetime consumption and bequests, %"
          // item 36 (E9): the settings are the pill's and the page's
          more={[
            { label: 'Measure', text: 'Consumption-equivalent welfare change: the change in remaining-lifetime consumption and bequests that is worth the same to each household.' },
            { label: 'Settings', text: `${armLabel}; ${clWords}; ${rulePlain(rule)}.` },
          ]}
          controls={
            <Pill
              className="is-card"
              title="Options for this chart"
              name="Welfare change by birth year"
              sections={[
                {
                  id: 'groups',
                  label: 'Earnings group',
                  glyph: 'users',
                  kind: 'one',
                  value: groupPick,
                  options: [{ value: 'all', label: 'All groups', desc: GROUP_DESC.all }, ...GROUP_LABELS.map((label, j) => ({ value: String(j), label, desc: GROUP_DESC[j] }))],
                  onChange: (g) => set({ groups: g === 'all' ? WG_GROUPS : [g, 'all'] }),
                  seg: groupPick === 'all' ? 'All groups' : GROUP_LABELS[Number(groupPick)],
                  def: groupPick === 'all',
                },
              ]}
            />
          }
          about={{
            caveats: (
              <Items
                items={[
                  { key: 'job', icon: 'excluded', text: 'The model has no job loss' },
                  { key: 'wealth', icon: 'inequality', text: <JumpLink to="who-model-households">How the model’s households compare with the UK</JumpLink> },
                  { key: 'beq', icon: 'bequests', text: 'It places a value on leaving bequests' },
                  { key: 'sens', icon: 'range', text: 'The share of adults who lose is sensitive to all three' },
                  { key: 'assets', icon: 'interest', text: 'No asset prices: revaluing existing assets is left out' },
                  { key: 'old', icon: 'age', text: 'So that is not in the gain to older adults' },
                  { key: 'fill', icon: 'young', text: `Born after 2011: up to ${c.fill_max_pp.toFixed(2)} percentage points from extending past ${HORIZON_YEAR}` },
                  { key: 'groups', icon: 'lifetimeEarnings', text: 'Earnings groups: percentiles of lifetime earnings, not income deciles' },
                  // results review F6: debt-neutral transfers pay the model's
                  // at-once interest bill (at the OBR's repricing pace the
                  // debt rise is about a third as large)
                  rule === 'dn' && dnTransferCut(arm, cls) ? { key: 'reprice', icon: 'interest', text: `Transfers fall about ${dnTransferCut(arm, cls)} from ${HEADLINE_YEAR} to pay a higher interest bill on all debt at once; gilts reprice more slowly, so losses here are on the high side` } : null,
                ]}
              />
            ),
          }}
          sources={cohortSources()}
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
                    // each group named at its line's end (names only: the
                    // values are in the tooltip and the heatmap)
                    noValue
                    dots={false}
                    yUnit="Welfare change, %"
                    xUnit="Birth year"
                    unit="%"
                    zeroNote="No change = 0"
                    yDomain={yDomain}
                    valueFormat={(v) => minus(`${v > 0 ? '+' : ''}${v.toFixed(2)}`)}
                    tipTitle="Born"
                    ariaLabel={`Welfare change by birth year and earnings group, ${armLabel}, ${CL_WORDS[pn.cl]}`}
                    markers={[{ year: LAST_ALIVE + 1, label: `← Adults in ${D.shock_year} | Enter later →` }]}
                  />
                </figure>
              ))}
            </div>
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
