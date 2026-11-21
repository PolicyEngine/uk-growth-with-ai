'use client';

import { useState } from 'react';
import LineChart from '@/components/LineChart.jsx';
import Icon from '@/components/ab/Icon.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import Legend from '@/components/ui/Legend.jsx';
import MoreInfo from '@/components/ui/MoreInfo.jsx';
import Pill from '@/components/ui/Pill.jsx';
import { versionsShownSection } from '@/components/ui/SettingsBar.jsx';
import { useNav, subOf, NavLink } from '@/lib/nav.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, ARMS, path, gap, fmt, signed, SCEN_NAME, ruleSolved, solvedUnder, PENDING, heldAtHeadline,
} from '@/tabs/ai/surprise.js';
import { seriesFor, closuresFor, boundPending, emptyText, primaryClosure, closureWords, contextLine, seriesTable, legendOf, side, ruleGapText } from '@/tabs/ai/lines.js';
import { MEASURE, ruleLabel, rulePlain } from '@/lib/labels.js';
import { Dumbbells, HeadlineNote, stressItems, dumbbellTable, dumbbellSvg, dumbbellLegend } from '@/tabs/ai/Headline.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { Lead, sentenceItems } from '@/tabs/explore/direction.jsx';
import FinancesSection from '@/tabs/ai/FinancesSection.jsx';
import ClosureSlope from '@/tabs/explore/ClosureSlope.jsx';
import { sourcesItems } from '@/tabs/explore/sources.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS, efo, EFO_PAGE, OG_RESULT_URLS } from '@/tabs/ai/links.js';
import { SOURCES as LIT } from '@/data/literature.js';
import { investmentFlags, I_FLAG_PCT, belowThrough, investHighTo } from '@/tabs/explore/caveats.js';
import { payCaveat } from '@/tabs/story/part2/caveats.js';
import { CENTRAL, BOUND, LATE_YEAR, SCEN_NAME as SN, ARM_COLOR } from '@/tabs/ai/surprise.js';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { VERSION_TOKEN, versionName } from '@/lib/versionColors.js';

// Results. The answer and the three headline figures are on Story.
// Income and output, Economy, Public finances: one chart card per measure,
// each reading the header's scenario and closure; the versions shown are
// a section of the wall's pill and the four-measure card's pill (no chip
// toggles). Every number comes from surprise2028.json through
// surprise.js; a combination not yet solved says so and never prints a zero.

// The line-style key under Both: solid for some foreign capital, dashed for
// none, as items of the one legend (components/ui/Legend.jsx).
export function closureKeyItems(closure) {
  if (closure !== 'both') return [];
  return [
    { key: 'cl-some', label: 'Solid: some foreign capital', color: 'var(--pe-gray-800)' },
    { key: 'cl-none', label: 'Dashed: no foreign capital', color: 'var(--pe-gray-800)', kind: 'dashed' },
  ];
}

// The versions' items (item 13): a swatch in each line's colour and its
// name, the same on the economy wall and the Public finances charts.
export function versionItems(arms) {
  return ARMS.filter((a) => arms.includes(a.id)).map((a) => ({ key: a.id, label: versionName(a), color: VERSION_TOKEN[a.id] }));
}

// The versions' one legend, with the closure key under Both.
export function VersionLegend({ arms, closure }) {
  return <Legend className="ex-version-legend" label="Versions" items={[...versionItems(arms), ...closureKeyItems(closure)]} />;
}

export function PendingLine({ names }) {
  if (!names.length) return null;
  return (
    <p className="icon-line is-muted">
      <Icon name="hourglass" size={16} />
      <span>The no-foreign-capital case is not yet solved for: {names.join(', ')}.</span>
    </p>
  );
}

// "Automation + productivity above, Technology unchanged above, Stress test
// on the path": words only (the unit line names the forecast path). The
// 2031 figures are at the line ends.
function findingFor(sid, v, arms, closure, name, rule = 'common') {
  const cl = primaryClosure(closure);
  const parts = ARMS.filter((a) => arms.includes(a.id))
    .map((a) => {
      const p = path(sid, a.id, cl, v, rule);
      return p ? { arm: a.short || a.label, side: side(p[p.length - 1]) } : null;
    })
    .filter(Boolean);
  if (!parts.length) return null;
  const sides = [...new Set(parts.map((p) => p.side))];
  const where = (s) => (s === 'on' ? 'on the forecast path' : `${s} the forecast path`);
  const lead = `In ${HEADLINE_YEAR}${closure === 'closed' ? ', with no foreign capital,' : ''} ${name}`;
  if (sides.length === 1) return `${lead} is ${where(sides[0])}${parts.length > 1 ? ' in every version shown' : ''}.`;
  return `${lead} is ${sides.map((s) => `${where(s)} in ${parts.filter((p) => p.side === s).map((p) => p.arm.toLowerCase()).join(' and ')}`).join(', and ')}.`;
}

// Two paths closer than half the last printed digit (0.01) in every year
// coincide on the page.
const COINCIDE = 0.005;

// One path chart in the one card: its own y-scale with a visible axis and
// the headline-year value at each line end. The versions shown come from
// the page (the wall's pill); a tidy card draws every version.
export function PathCard({
  sid, v, title, name, icon, years = WINDOW_YEARS, unit = '%', scale = 1, dp = 2, endDp = 2, finding, about, method = 'closures', markers, id, unitLine: unitText, ends = true, notes,
  tile = false, open = false, onToggle, sources = true, heading, more, moreId, bands, tidy = false,
}) {
  const { st } = useNav();
  const rule = st.rule;
  // A line that coincides with one before it and ends on the same printed
  // value (the labour share, an imposed input, is the same in every arm)
  // carries no end value of its own: the value prints once and the card's
  // finding says the lines coincide.
  const same = (t, s) => t.values.length === s.values.length && signed(t.values[t.values.length - 1], endDp) === signed(s.values[s.values.length - 1], endDp) && t.values.every((x, k) => Math.abs(x - s.values[k]) < COINCIDE);
  // a tidy card (Public finances, item 17) draws every version, named once
  // in the shared legend, with no chooser of its own
  const arms = tidy ? ARMS.map((a) => a.id) : st.arms;
  const raw = seriesFor(sid, v, years, arms, st.closure, scale, rule)
    .map((s) => (years[years.length - 1] === HEADLINE_YEAR && heldAtHeadline(s.arm, v, s.values[s.values.length - 1]) ? { ...s, endHeld: true } : s))
    .map((s, i, all) => (all.slice(0, i).some((t) => !t.noEndLabel && same(t, s)) ? { ...s, noEndLabel: true } : s));
  // the line that carries a shared label names the lines under it, so no
  // colour is left without a label ("all versions" when every line is one)
  const series = raw.map((s, i) => {
    if (s.noEndLabel) return s;
    const under = raw.filter((t, k) => k > i && t.noEndLabel && same(s, t));
    if (!under.length) return s;
    return { ...s, sublabel: under.length === raw.length - 1 ? 'all versions' : `and ${under.map((t) => t.label).join(', ')}` };
  });
  const last = years[years.length - 1];
  const shown = tidy ? null : (finding ?? findingFor(sid, v, st.arms, st.closure, name, rule));
  // The y-axis title, with the measure's unit: % for a level, pp of GDP
  // for debt and tax, pp for a rate or share (item 36: the short unit; what
  // the gap is against and the span are in More info). The SVG draws it,
  // so the card prints no second unit line; a tidy card, whose SVG draws
  // none, prints `unitLine` as its one unit line.
  const ofGdp = v === 'debt_gdp_pp' || v === 'tax_gdp_pp';
  const yTitle = `Gap vs forecast path, ${unit === '%' ? '%' : ofGdp ? 'pp of GDP' : 'pp'}`;
  const unitLine = unitText ?? yTitle;
  // item 36's rows (Card.jsx cardMore); a tidy card's own groups (item 17's
  // Units) already say them
  const rows = tidy ? [] : [
    unit === '%' ? null : { label: 'Measure', text: `pp is percentage points${ofGdp ? ' of GDP' : ''}.` },
    { label: 'Compared with', text: 'The OBR’s central forecast path; the zero line is the path.' },
    { label: 'Period', text: `${years[0]}–${last}.` },
  ];
  // In the small-multiple wall (tile) the card is compact: title, download
  // and chart; the wall carries the arms control and the legend once. Opened
  // (click or Enter on the title), it spans the wall and shows its finding,
  // notes and "About this chart" too.
  const full = !tile || open;
  // end labels: a full-size chart names each line, with its value and unit
  const named = !tidy && !(ends && tile && !open);
  // a wall tile's title carries its unit ("Interest rate, pp"); the wall's
  // units line above the grid says what the unit measures, so a closed tile
  // draws no y title of its own
  const shortUnit = unit === '%' ? '%' : 'pp';
  const head = tile ? (
    <button type="button" className="ex-tile-open" aria-expanded={open} onClick={onToggle} title={open ? 'Back to the wall (Escape)' : 'Enlarge this chart'}>
      <span data-axis-title={open ? undefined : 'y'}>{`${title}, ${shortUnit}`}</span>
      <Icon name={open ? 'x' : 'arrowUpRight'} size={14} strokeWidth={2} />
    </button>
  ) : (
    title
  );
  return (
    <Card
      id={id}
      icon={icon}
      title={heading ?? head}
      className={tile ? `ex-tile${open ? ' is-open' : ''}` : ''}
      finding={full ? (typeof shown === 'string' ? <Lead c="canSay">{shown}</Lead> : shown) : null}
      unit={tidy ? <Lead c="measure"><span data-axis-title="y">{unitLine}</span></Lead> : null}
      legend={tile ? null : <VersionLegend arms={tidy ? arms : []} closure={st.closure} />}
      moreId={moreId}
      more={full ? [...(more ?? []), ...rows] : null}
      about={full && about?.caveats ? { caveats: about.caveats } : null}
      notes={full && notes?.length ? notes : null}
      sources={sourcesItems({ sid, method, closures: sources ? undefined : [], code: sources })}
      download={{
        title: `${title}, ${years[0]}–${last}`,
        // a download says it in full: it travels without the card's fold
        context: () => contextLine(sid, st.closure, `${unit === '%' ? '%' : ofGdp ? 'pp of GDP' : 'pp'} gap against the OBR’s central forecast path, ${years[0]}–${last}`, rule),
        table: series.length ? () => seriesTable(years, series, unit) : null,
        legend: () => legendOf(series),
      }}
    >
      <PendingLine names={series.length ? boundPending(sid, arms, st.closure, rule) : []} />
      {series.length ? (
        <LineChart
          x={years}
          series={series}
          height={tile ? (open ? 340 : 260) : 260}
          // a closed tile: 3 to 5 ticks with zero always on its scale
          thin={tidy || (tile && !open)}
          // a full-size chart names each line at its end, with its value;
          // a closed tile prints values only (its wall's GNI and GDP tiles,
          // which print no value, name the lines in the same colours)
          endLabel={named ? 'name' : 'value'}
          noValue={!ends}
          unit={unit}
          tipTitle={title}
          yUnit={tidy || (tile && !open) ? null : yTitle}
          yTitleTop
          xUnit={tidy || (tile && !open) ? null : 'Year'}
          zeroNote={tidy ? 'Forecast path' : tile && !open ? null : 'Forecast path = 0'}
          zeroAtEnd={tidy}
          markers={markers ?? [{ year: SURPRISE_YEAR, label: tile && !open ? '' : 'Extra AI starts' }]}
          bands={bands ?? [{ year: HEADLINE_YEAR, label: tile && !open ? '' : 'Headline year' }]}
          valueFormat={(x) => `${signed(x, endDp)}${named && ends ? unit : ''}`}
          tipFormat={(x) => signed(x, dp)}
          ariaLabel={`${title} against the OBR’s central forecast path, ${years[0]} to ${last}, ${SCEN_NAME[sid]}, ${closureWords(st.closure)}, ${ruleLabel(rule).toLowerCase()}`}
        />
      ) : (
        <div className="unpublished-plot">
          {/* a wall tile says only "not yet solved"; the wall's notice, once,
              says where to go (R3-02) */}
          <Items items={sentenceItems(tile && arms.length ? `${PENDING[0].toUpperCase()}${PENDING.slice(1)}.` : emptyText(arms, st.closure, rule, sid))} />
        </div>
      )}
    </Card>
  );
}

const IMPOSED = 'Technology paths are imposed: consequences of given scenarios, not likelihood.';

function consumptionFinding(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const c = path(sid, 'tfp', cl, 'C', rule);
  const g = path(sid, 'tfp', cl, 'NNI', rule);
  if (!c || !g) return null;
  const from = WINDOW_YEARS.indexOf(SURPRISE_YEAR);
  return c.slice(from).every((x) => x < 0) && g[g.length - 1] > 0
    ? `With automation + productivity, consumption stays below the forecast path through ${HEADLINE_YEAR} while ${MEASURE.NNI.name.toLowerCase()} is above it: households save more.`
    : null;
}

// The NNI tile's finding: GNI, before depreciation, beside it, by side of
// the path in the headline year (sign-aware; NNI's gap is not always the
// smaller).
function gniBeside(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const g = gap(sid, 'tfp', cl, 'GNI', HEADLINE_YEAR, rule);
  const n = gap(sid, 'tfp', cl, 'NNI', HEADLINE_YEAR, rule);
  if (g == null || n == null) return null;
  const w = (x) => (side(x) === 'on' ? 'on the forecast path' : `${side(x)} the forecast path`);
  return side(g) === side(n)
    ? `Before depreciation (${MEASURE.GNI.abbr}), with automation + productivity: ${fmt(g)} in ${HEADLINE_YEAR}, also ${w(g)}.`
    : `Before depreciation (${MEASURE.GNI.abbr}), with automation + productivity: ${fmt(g)} in ${HEADLINE_YEAR}, ${w(g)}; after it, ${w(n)}.`;
}

// The labour-share fall is an imposed input, the same in every arm: when
// the arms' paths are equal, their lines coincide and the card says so.
function coincideFinding(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const ps = ARMS.map((a) => path(sid, a.id, cl, 'labour_share_pp', rule)).filter(Boolean);
  if (ps.length < 2) return null;
  const same = ps.every((p) => p.every((x, i) => Math.abs(x - ps[0][i]) < COINCIDE));
  return same ? 'The three versions’ lines coincide: the fall in the labour share is the same imposed input in each version.' : null;
}

// Economics review, round 1: consumption below the path to the last year
// shown (UK central, main arm, some foreign capital, common rule) and the largest
// investment jump above the project's flag (explore/caveats.js).
const C_BELOW = belowThrough('uk_central', CENTRAL) === LATE_YEAR ? LATE_YEAR : null;
const TOP_FLAG = investmentFlags()[0] ?? null;

// The investment flag on the cell in view (Fable round 7, S1): the main
// version's shock-year jump for the scenario and each closure shown, where
// it is above the flag itself (common rule; investmentFlags), largest
// first. The caveat then speaks to the cell on screen before the
// sensitivity's. A sanity-gate flag, not a finding (surprise2027-runs.md,
// ruling 8). [] where none.
export function shownInvestFlags(sid, closure, rule) {
  if (rule !== 'common') return [];
  const cls = closuresFor(closure);
  return investmentFlags().filter((f) => f.sid === sid && f.arm === 'tfp' && cls.includes(f.cl));
}

// The Investment tile's "stays high, then drops" caveat, per cell (review
// round 5, R5-16): the year from investHighTo, main version, for each
// closure shown. null where no closure shown has such a year (no foreign
// capital: investment stays up about evenly). In "both", the closure is
// named unless the two agree.
const CL_WORDS = { [CENTRAL]: 'some foreign capital', [BOUND]: 'no foreign capital' };
function investHighLine(sid, closure, rule) {
  const cells = closuresFor(closure).map((cl) => ({ cl, to: investHighTo(sid, cl, rule) }));
  const hit = cells.filter((c) => c.to != null);
  if (!hit.length) return null;
  const line = (to) => `stays high while the shock builds, to ${to}, then drops`;
  if (hit.length === cells.length && new Set(hit.map((c) => c.to)).size === 1) return `It ${line(hit[0].to)}`;
  return hit.map((c, i) => `${i ? 'with' : 'With'} ${CL_WORDS[c.cl]}, it ${line(c.to)}`).join('; ');
}

// Each group and card names its concept; the icon comes from lib/concepts.js.
const ECONOMY = [
  { group: 'Demand', concept: 'consumption', lede: 'What households spend and what is invested.', rows: [
    { v: 'C', title: 'Consumption', name: 'consumption', concept: 'consumption', about: { caveats: <Items items={[
      { key: 'foresight', icon: 'timing', text: <>The direction relies on households foreseeing the whole path ({ext(URLS.ogCoreDocs, 'OG-Core')})</> },
      { key: 'left', icon: 'excluded', text: 'No share-price gains or demand effects in the model' },
      { key: 'others', icon: 'foreign', text: 'Common rule, some foreign capital: government and foreign owners take part too' },
      C_BELOW ? { key: 'long', icon: 'timing', text: `UK central: consumption stays below the forecast path through ${C_BELOW}` } : null,
    ]} /> } },
    { v: 'I', title: 'Investment', name: 'investment', concept: 'investment', method: 'limits', about: (sid, closure, rule) => ({
      caveats: <Items items={[
        { key: 'jump', icon: 'investment', text: <>Investment jumps in {SURPRISE_YEAR}: {ext(URLS.ogCoreDocs, 'OG-Core')} has no adjustment costs</> },
        investHighLine(sid, closure, rule) ? { key: 'year1', icon: 'capital', text: investHighLine(sid, closure, rule) } : null,
        { key: 'size', icon: 'limit', text: 'That jump is a model property, not a forecast of a boom' },
        { key: 'grows', icon: 'scenario', text: 'It grows with the scenario' },
        ...shownInvestFlags(sid, closure, rule).map((f) => ({ key: `here-${f.cl}`, icon: 'caveat', text: `This scenario, main version, ζK ${f.zeta}: +${Math.round(f.x)}% in ${SURPRISE_YEAR}` })),
        TOP_FLAG && !shownInvestFlags(sid, closure, rule).includes(TOP_FLAG) ? { key: 'flag', icon: 'caveat', text: <>{SN[TOP_FLAG.sid]}{TOP_FLAG.arm === 'tfp' ? ', main version' : ''}, ζK {TOP_FLAG.zeta}: +{Math.round(TOP_FLAG.x)}% in {SURPRISE_YEAR}</> } : null,
        TOP_FLAG ? { key: 'flag2', icon: 'limit', text: <>Implausible: above the +{I_FLAG_PCT}% {ext(OG_RESULT_URLS.sanity, 'investment flag')}, {ext(OG_RESULT_URLS.plausibility, 'beyond any year on record')}</> } : null,
      ]} />,
    }) },
  ] },
  { group: 'Factors', concept: 'capital', lede: 'The capital and labour that production uses.', rows: [
    { v: 'K', title: 'Capital stock', name: 'the capital stock', concept: 'capital', about: { caveats: <Items items={[
      { key: 'reset', icon: 'foreign', text: <>Foreign capital resets each year ({ext(URLS.ogCoreParams, 'OG-Core’s ζK rule')})</> },
      { key: 'inflow', icon: 'capital', text: 'Part of the first-year gap is an inflow with no investment recorded' },
    ]} /> } },
    { v: 'L', title: 'Labour', name: 'labour (hours worked, not jobs)', concept: 'labour', about: { caveats: <Items items={[
      { key: 'hours', icon: 'labour', text: 'Labour is hours worked, weighted by skill' },
      { key: 'jobs', icon: 'excluded', text: 'No unemployment in the model: it is not a count of jobs' },
    ]} /> } },
  ] },
  { group: 'Prices and shares', concept: 'interest', lede: 'What capital earns and how income is divided.', rows: [
    { v: 'r_bp', title: 'Interest rate', name: 'the interest rate', concept: 'interest', unit: 'pp', scale: 0.01, method: 'closures' },
    { v: 'labour_share_pp', title: 'Labour share', name: 'the labour share of income', concept: 'inequality', unit: 'pp', method: 'shock', about: { caveats: <Items items={[
      { key: 'full', icon: 'timing', text: 'It reaches full size in the headline year' },
      { key: 'derived', icon: 'arithmetic', text: <>UK sizes: <NavLink tab="method" sub="how" anchor="m-scenarios">derived from IMF SIP/2026/072</NavLink>, not printed by it</> },
    ]} /> } },
  ] },
];

// The four-measure card's finding, from the signs of the arms shown: the
// pay rate's side in every arm, and whether national income's side
// depends on the version (review round 1, R1-08). National income is NNI
// here (Maria's point 2), which splits differently from GNI: below the
// path in Technology unchanged where GNI is above it, so the gate is
// computed on NNI. The arrow follows the sign.
export function measuresFinding(sid, arms, closure, rule) {
  const cl = primaryClosure(closure);
  const shown = ARMS.filter((a) => arms.includes(a.id));
  const at = (v) => shown.map((a) => gap(sid, a.id, cl, v, HEADLINE_YEAR, rule)).filter((x) => x != null);
  const w = at('w');
  const g = at('NNI');
  if (!w.length) return null;
  const one = (xs) => new Set(xs.map(side)).size === 1;
  const where = (x) => (side(x) === 'on' ? 'on the forecast path' : `${side(x)} the forecast path`);
  const every = shown.length > 1 ? ' in every version shown' : '';
  return {
    wage: one(w) ? { value: w[0], text: `The pay rate is ${where(w[0])}${every}` } : { value: null, text: 'The pay rate’s side depends on the version' },
    gni: !g.length ? null : one(g) ? { value: g[0], text: `national income is ${where(g[0])}${every}` } : { value: null, text: 'national income’s side of the path depends on the version' },
  };
}

function MeasuresFinding({ sid, arms, closure, rule }) {
  const f = measuresFinding(sid, arms, closure, rule);
  if (!f) return null;
  return (
    <>
      <span data-dir={f.wage.value == null ? undefined : side(f.wage.value)}>{f.wage.text}</span>
      {f.gni ? (
        <>
          ; <span data-dir={f.gni.value == null ? undefined : side(f.gni.value)}>{f.gni.text}</span>
        </>
      ) : null}
      .
    </>
  );
}

const MEASURES_TITLE = `${MEASURE.w.name}, ${MEASURE.NNI.name.toLowerCase()} and ${MEASURE.Y.name} in ${HEADLINE_YEAR}`;
function IncomePanel({ sid }) {
  const { st, set } = useNav();
  const cl = closureWords(st.closure);
  return (
    <>
      <SectionHeading id="income" icon={iconFor('gni')} title="How does each version move pay, income and output?">
        <Lead c="path">{`The three versions in ${HEADLINE_YEAR}, then what changes with no foreign capital`}</Lead>
      </SectionHeading>
      <div className="cards-stack">
        <Card
          id="measures"
          // slot 9 (review round 3, R3-12): the story's GDP scene shows the
          // common rule only
          story={st.rule === 'common' ? { anchor: 'p2-morph-2', name: 'the GDP scene' } : null}
          icon={iconFor('measure')}
          title={MEASURES_TITLE}
          finding={ruleSolved(st.rule, sid) ? <MeasuresFinding sid={sid} arms={st.arms} closure={st.closure} rule={st.rule} /> : null}
          // the sentence runs the card's full width (push D, Q6b)
          leadFull
          unit={<span data-axis-title="y">{`% gap vs forecast path, ${HEADLINE_YEAR}`}</span>}
          controls={<Pill className="is-card" title="Options for this chart" name={MEASURES_TITLE} sections={[versionsShownSection(st, set)]} />}
          legend={
            st.closure === 'both' ? (
              <Legend
                items={[
                  { key: 'some', label: 'Circle: some foreign capital', kind: 'dot' },
                  { key: 'none', label: 'Diamond: no foreign capital', kind: 'diamond' },
                ]}
              />
            ) : null
          }
          more={[
            { label: 'Measure', text: `The pay rate is pay per unit of labour, not average earnings. ${MEASURE.NNI.title} is the income UK residents keep after depreciation; ${MEASURE.GNI.abbr} is the same income before it.` },
            { label: 'Compared with', text: 'Each version’s gap against the OBR’s central forecast path; the centre line, 0, is the path.' },
            { label: 'Settings', text: `${cl[0].toUpperCase()}${cl.slice(1)}; ${rulePlain(st.rule)}.` },
          ]}
          about={{
            read: st.rule === 'common' ? <HeadlineNote rule={st.rule} /> : null,
            caveats: (
              <Items
                items={[
                  { key: 'cut', icon: 'pay', text: 'A negative pay-rate gap is a level below a rising path' },
                  { key: 'obr', icon: 'source', text: <>The path assumes productivity growth of 1 per cent a year ({ext(efo(EFO_PAGE.p1_2), 'OBR EFO, March 2026, ¶1.2')})</> },
                  // review round 3, R3-11 (Maria's point 3): the ruled
                  // sentence, from the signs; the sensitivity no longer
                  // reads as a sign that depends on foreign capital
                  payCaveat(sid) ? { key: 'wz0', icon: 'pay', text: payCaveat(sid) } : null,
                  payCaveat(sid) && (payCaveat(sid).includes('sensitivity') || payCaveat(sid).startsWith('Its sign')) ? { key: 'wzlink', icon: 'link', text: <>Figures: Both, and the <NavLink tab="explore" sub="economy" anchor="closure-sensitivity">ζK 0.5 sensitivity</NavLink></> } : null,
                  ...stressItems(sid),
                ]}
              />
            ),
          }}
          sources={sourcesItems({ sid, method: 'closures' })}
          download={{
            title: MEASURES_TITLE,
            context: () => contextLine(sid, st.closure, '% difference from the OBR’s central forecast path', st.rule),
            table: () => dumbbellTable(sid, st.arms, st.closure, st.rule),
            svg: () => dumbbellSvg(sid, st.arms, st.closure, st.rule),
            legend: () => dumbbellLegend(st.arms, st.closure),
          }}
        >
          {ruleSolved(st.rule, sid) ? <Dumbbells sid={sid} arms={st.arms} closure={st.closure} rule={st.rule} /> : <div className="unpublished-plot">
              <Items items={sentenceItems(ruleGapText(st.rule, sid))} />
            </div>}
        </Card>
        <ClosureSlope sid={sid} />
      </div>
    </>
  );
}

// National income (NNI) and GDP open the wall. Like every tile, their lines end in their
// headline-year values (Vahid: values on every panel).
const INCOME_TILES = [
  // national income leads as NNI (Maria's point 2); GNI, before
  // depreciation, beside it in the tile's finding (gniBeside)
  { v: 'NNI', title: MEASURE.NNI.title, name: MEASURE.NNI.name.toLowerCase(), concept: 'gni', method: 'closures', about: { caveats: IMPOSED } },
  {
    v: 'Y', title: MEASURE.Y.title, name: MEASURE.Y.name, concept: 'gdp', method: 'closures',
    about: {
      caveats: (
        <Items
          items={[
            { key: 'imposed', icon: 'scenario', text: IMPOSED },
            {
              key: 'imf',
              icon: 'link',
              text: (
                <>
                  Why below the {ext(LIT.imfSip.url, 'IMF’s UK estimate')}:{' '}
                  <NavLink tab="method" sub="studies" anchor="imf-gap">
                    Evidence: the macro model’s results beside it
                  </NavLink>
                </>
              ),
            },
          ]}
        />
      ),
    },
  },
];

// The wall's legend items: each version in its line's own stroke colour
// (ARM_COLOR, the colour seriesFor gives the charts).
const wallVersionItems = (arms) => ARMS.filter((a) => arms.includes(a.id)).map((a) => ({ key: a.id, label: versionName(a), color: ARM_COLOR[a.id] }));
// The three reading hints, in the "How to read" popover.
export const WALL_HINTS = [
  { key: 'zero', icon: iconFor('onPath'), text: 'Zero line: the OBR’s central forecast path' },
  { key: 'years', icon: iconFor('shock'), text: `Dotted: ${SURPRISE_YEAR}, extra AI starts; shaded: ${HEADLINE_YEAR}` },
  { key: 'open', icon: 'arrowUpRight', text: 'Click or tap a title to enlarge' },
];
function WallHints() {
  return (
    <span className="ex-wall-key" role="list" aria-label="How to read the wall">
      {WALL_HINTS.map((h) => (
        <span key={h.key} role="listitem">
          <Icon name={h.icon} size={14} /> {h.text}
        </span>
      ))}
    </span>
  );
}

// The economy as one small-multiple wall: eight path charts (two to a row
// at desktop widths, one on a phone) on the same years, one arms control,
// one units line and one legend for them all; each tile's title carries its
// unit and its lines end in their headline-year values. A
// tile opens in place across the wall (click or Enter on its title; Escape
// or the title again closes it), and each keeps its own download. The first
// tile of each group keeps the group's old section id, so links still land.
function EconomyPanel({ sid }) {
  const { st, set } = useNav();
  const [open, setOpen] = useState(null);
  const tiles = [
    ...INCOME_TILES.map((r) => ({ ...r, group: 'Income' })),
    ...ECONOMY.flatMap((g) => g.rows.map((r, i) => ({ ...r, group: g.group, groupId: i ? null : `economy-${g.group.split(' ')[0].toLowerCase()}` }))),
  ];
  const toggle = (v) => setOpen((o) => (o === v ? null : v));
  const onKey = (e) => {
    if (e.key !== 'Escape' || open == null) return;
    const btn = e.currentTarget.querySelector('.ex-tile.is-open .ex-tile-open');
    setOpen(null);
    btn?.focus();
  };
  return (
    <section aria-label="The economy, path by path" className="ex-wall-section">
      <SectionHeading id="economy-wall" icon={iconFor('path')} title={`The economy, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
        <Lead c="measure">Eight measures, each against the OBR’s central forecast path</Lead>
      </SectionHeading>
      {seriesFor(sid, 'Y', WINDOW_YEARS, st.arms, st.closure, 1, st.rule).length || !st.arms.length ? null : (
        <p className="page-a-text ex-wall-notice">{emptyText(st.arms, st.closure, st.rule, sid)}</p>
      )}
      {/* one toolbar (push D, Q6c): the versions shown (item 37: a
          section of the wall's pill, no chip toggles), the one legend
          inline (the versions in the charts' own stroke colours, and the
          line styles under Both), and the three reading hints in one
          "How to read" popover (hover, focus or tap); then the unit line */}
      <div className="ex-wall-head">
        <Pill className="is-card" title="Options for every chart on the wall" name={`The economy, ${FIRST_YEAR}–${HEADLINE_YEAR}`} sections={[versionsShownSection(st, set)]} />
        <Legend className="ex-wall-legend" label="Versions" items={[...wallVersionItems(st.arms), ...closureKeyItems(st.closure)]} />
        <TipTarget className="ex-wall-how" label="How to read the wall" tip={<WallHints />}>
          <Icon name="info" size={14} />
          <span>How to read</span>
        </TipTarget>
      </div>
      <p className="ex-wall-units" data-axis-title="y">
        Gap vs forecast path: % for levels, pp for rates and shares
      </p>
      {/* one fold for the wall (item 36, E2): a closed tile carries none */}
      <MoreInfo
        id="economy-wall-more"
        groups={[
          {
            key: 'read',
            title: 'How to read',
            items: [
              { key: 'mea', head: 'Measure', text: 'pp is percentage points, for the interest rate and the labour share; every other tile is a % gap.' },
              { key: 'cmp', head: 'Compared with', text: 'The OBR’s central forecast path; each tile’s zero line is the path.' },
              { key: 'per', head: 'Period', text: `${WINDOW_YEARS[0]}–${WINDOW_YEARS[WINDOW_YEARS.length - 1]}.` },
            ],
          },
        ]}
      />
      <div className="ex-wall" onKeyDown={onKey}>
        {tiles.map((r) => (
          <div key={r.v} className={`ex-wall-cell${open === r.v ? ' is-open' : ''}`} id={r.groupId ?? undefined} data-group={r.group}>
            <PathCard
              tile
              open={open === r.v}
              onToggle={() => toggle(r.v)}
              id={`tile-${r.v}`}
              sid={sid}
              v={r.v}
              title={r.title}
              name={r.name}
              icon={iconFor(r.concept)}
              unit={r.unit ?? '%'}
              scale={r.scale ?? 1}
              endDp={2}
              ends={r.ends ?? true}
              finding={r.v === 'C' ? (consumptionFinding(sid, st.closure, st.rule) ?? undefined) : r.v === 'NNI' ? (gniBeside(sid, st.closure, st.rule) ?? undefined) : r.v === 'labour_share_pp' ? (coincideFinding(sid, st.closure, st.rule) ?? undefined) : undefined}
              about={typeof r.about === 'function' ? r.about(sid, st.closure, st.rule) : r.about}
              method={r.method ?? 'model'}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// A scenario not solved under the fiscal rule chosen: one card in place of
// the page's charts, with the two ways back to a solved view.
export function RulePending({ sid }) {
  const { st, set } = useNav();
  const solved = solvedUnder(st.rule);
  return (
    <Card id="rule-pending" icon={iconFor('timing')} title={`${SCEN_NAME[sid]} is not yet solved under ${ruleLabel(st.rule).toLowerCase()}`} logo={false}>
      <div className="rule-pending">
        <Items items={sentenceItems(ruleGapText(st.rule, sid))} />
        <div className="rule-pending-actions">
          {solved.map((s) => (
            <button key={s.id} type="button" className="rule-pending-btn" onClick={() => set({ s: s.id })}>
              Show {s.label}
            </button>
          ))}
          <button type="button" className="rule-pending-btn" onClick={() => set({ rule: 'common' })}>
            Use the common fiscal rule
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function ResultsTab({ sub: named }) {
  const { st } = useNav();
  const sub = named ?? (st.tab === 'explore' && st.sub !== 'who' ? subOf(st, 'explore') : 'income');
  const sid = st.s;
  const panels = { income: IncomePanel, economy: EconomyPanel, finances: FinancesSection };
  const Panel = panels[sub];
  // Income and Economy share one page: one pending card for both
  if (sub !== 'finances' && !ruleSolved(st.rule, sid))
    return sub === 'income' ? (
      <div id="explore-part-income" className="explore-part">
        <RulePending sid={sid} />
      </div>
    ) : null;
  return (
    <div id={`explore-part-${sub}`} className="explore-part">
      <Panel sid={sid} />
    </div>
  );
}
