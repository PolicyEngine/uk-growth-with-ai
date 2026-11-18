'use client';

import { useState } from 'react';
import LineChart from '@/components/LineChart.jsx';
import Icon from '@/components/ab/Icon.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import ControlBar, { ArmsGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, subOf, NavLink } from '@/lib/nav.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, ARMS, path, gap, signed, SCEN_NAME, ruleSolved, solvedUnder,
} from '@/tabs/ai/surprise.js';
import { seriesFor, boundPending, emptyText, primaryClosure, closureWords, contextLine, seriesTable, legendOf, side, ruleGapText } from '@/tabs/ai/lines.js';
import { ruleLabel, rulePlain } from '@/lib/labels.js';
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
import { wageClosureLines, investmentFlags, I_FLAG_PCT, belowThrough } from '@/tabs/explore/caveats.js';
import { CENTRAL, LATE_YEAR, SCEN_NAME as SN } from '@/tabs/ai/surprise.js';

// Results. The answer and the three headline figures are on Story.
// Income and output, Economy, Public finances: one chart card per measure,
// each with the same control bar (arms) and reading the header's scenario
// and closure. Every number comes from surprise2028.json through
// surprise.js; a combination not yet solved says so and never prints a zero.

export function ClosureKey({ closure }) {
  if (closure !== 'both') return null;
  return (
    <p className="line-key">
      <span className="line-key-item">
        <span className="swatch is-ink" aria-hidden="true" /> Solid: some foreign capital
      </span>
      <span className="line-key-item">
        <span className="swatch dashed is-ink" aria-hidden="true" /> Dashed: no foreign capital
      </span>
    </p>
  );
}

export function PendingLine({ names }) {
  if (!names.length) return null;
  return (
    <p className="icon-line is-muted">
      <Icon name="hourglass" size={16} />
      <span>The no-foreign-capital case is not solved yet for: {names.join(', ')}.</span>
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

// One path chart in the one card: its own y-scale with a visible axis, the
// 2031 value at each line end, and the arms control bar.
export function PathCard({
  sid, v, title, name, icon, years = WINDOW_YEARS, unit = '%', scale = 1, dp = 2, endDp = 2, finding, about, method = 'closures', markers, id, unitLine: unitText, ends = true, notes,
  tile = false, open = false, onToggle, sources = true,
}) {
  const { st, set } = useNav();
  const rule = st.rule;
  // A line that coincides with one before it and ends on the same printed
  // value (the labour share, an imposed input, is the same in every arm)
  // carries no end value of its own: the value prints once and the card's
  // finding says the lines coincide.
  const same = (t, s) => t.values.length === s.values.length && signed(t.values[t.values.length - 1], endDp) === signed(s.values[s.values.length - 1], endDp) && t.values.every((x, k) => Math.abs(x - s.values[k]) < COINCIDE);
  const raw = seriesFor(sid, v, years, st.arms, st.closure, scale, rule).map((s, i, all) => (all.slice(0, i).some((t) => !t.noEndLabel && same(t, s)) ? { ...s, noEndLabel: true } : s));
  // the line that carries a shared label names the lines under it, so no
  // colour is left without a label ("all versions" when every line is one)
  const series = raw.map((s, i) => {
    if (s.noEndLabel) return s;
    const under = raw.filter((t, k) => k > i && t.noEndLabel && same(s, t));
    if (!under.length) return s;
    return { ...s, sublabel: under.length === raw.length - 1 ? 'all versions' : `and ${under.map((t) => t.label).join(', ')}` };
  });
  const last = years[years.length - 1];
  const shown = finding ?? findingFor(sid, v, st.arms, st.closure, name, rule);
  // The y-axis title, with the measure's unit: % for a level, percentage
  // points of GDP for debt and tax, percentage points for a rate or share.
  const ofGdp = v === 'debt_gdp_pp' || v === 'tax_gdp_pp';
  const unitWords = unit === '%' ? '%' : ofGdp ? 'percentage points of GDP' : 'percentage points';
  const yTitle = tile && !open ? `Gap against the OBR’s central forecast path, ${unit === '%' ? '%' : 'pp'}` : `Gap against the OBR’s central forecast path, ${unitWords}`;
  const unitLine = unitText ?? (unit === '%' ? `% difference from the OBR’s central forecast path, ${years[0]}–${last}` : `Percentage-point difference from the OBR’s central forecast path, ${years[0]}–${last}`);
  // In the small-multiple wall (tile) the card is compact: title, download
  // and chart; the wall carries the arms control and the legend once. Opened
  // (click or Enter on the title), it spans the wall and shows its finding,
  // notes and "About this chart" too.
  const full = !tile || open;
  // end labels: a full-size chart names each line, with its value and unit
  const named = !(ends && tile && !open);
  const head = tile ? (
    <button type="button" className="ex-tile-open" aria-expanded={open} onClick={onToggle} title={open ? 'Back to the wall (Escape)' : 'Enlarge this chart'}>
      <span>{title}</span>
      <Icon name={open ? 'x' : 'arrowUpRight'} size={14} strokeWidth={2} />
    </button>
  ) : (
    title
  );
  return (
    <Card
      id={id}
      icon={icon}
      title={head}
      className={tile ? `ex-tile${open ? ' is-open' : ''}` : ''}
      finding={full ? (typeof shown === 'string' ? <Lead c="canSay">{shown}</Lead> : shown) : null}
      unit={full ? <Lead c="measure">{unitLine}</Lead> : null}
      controls={
        tile ? null : (
          <ControlBar label={`${title}: options`}>
            <ArmsGroup shown={st.arms} onChange={(arms) => set({ arms })} />
          </ControlBar>
        )
      }
      legend={tile ? null : <ClosureKey closure={st.closure} />}
      about={full && about?.caveats ? { caveats: about.caveats } : null}
      notes={full && notes?.length ? notes : null}
      sources={sourcesItems({ sid, method, closures: sources ? undefined : [], code: sources })}
      download={{
        title: `${title}, ${years[0]}–${last}`,
        context: () => contextLine(sid, st.closure, unitLine, rule),
        table: series.length ? () => seriesTable(years, series, unit) : null,
        legend: () => legendOf(series),
      }}
    >
      <PendingLine names={series.length ? boundPending(sid, st.arms, st.closure, rule) : []} />
      {series.length ? (
        <LineChart
          x={years}
          series={series}
          height={tile ? (open ? 340 : 190) : 260}
          // a full-size chart names each line at its end, with its value;
          // a closed tile prints values only (its wall's GNI and GDP tiles,
          // which print no value, name the lines in the same colours)
          endLabel={named ? 'name' : 'value'}
          noValue={!ends}
          unit={unit}
          tipTitle={title}
          yUnit={yTitle}
          yTitleTop
          xUnit={tile && !open ? null : 'Year'}
          zeroNote={tile && !open ? null : 'Forecast path = 0'}
          markers={markers ?? [{ year: SURPRISE_YEAR, label: tile && !open ? '' : 'Extra AI starts' }]}
          bands={[{ year: HEADLINE_YEAR, label: tile && !open ? '' : 'Headline year' }]}
          valueFormat={(x) => `${signed(x, endDp)}${named && ends ? unit : ''}`}
          tipFormat={(x) => signed(x, dp)}
          ariaLabel={`${title} against the OBR’s central forecast path, ${years[0]} to ${last}, ${SCEN_NAME[sid]}, ${closureWords(st.closure)}, ${ruleLabel(rule).toLowerCase()}`}
        />
      ) : (
        <div className="unpublished-plot">
          <Items items={sentenceItems(emptyText(st.arms, st.closure, rule, sid))} />
        </div>
      )}
    </Card>
  );
}

const IMPOSED = 'Technology paths are imposed: consequences of given scenarios, not likelihood.';

function consumptionFinding(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const c = path(sid, 'tfp', cl, 'C', rule);
  const g = path(sid, 'tfp', cl, 'GNI', rule);
  if (!c || !g) return null;
  const from = WINDOW_YEARS.indexOf(SURPRISE_YEAR);
  return c.slice(from).every((x) => x < 0) && g[g.length - 1] > 0
    ? `With automation + productivity, consumption stays below the forecast path through ${HEADLINE_YEAR} while national income is above it: households save more.`
    : null;
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

// Each group and card names its concept; the icon comes from lib/concepts.js.
const ECONOMY = [
  { group: 'Demand', concept: 'consumption', lede: 'What households spend and what is invested.', rows: [
    { v: 'C', title: 'Consumption', name: 'consumption', concept: 'consumption', about: { caveats: <Items items={[
      { key: 'foresight', icon: 'timing', text: <>The direction relies on households foreseeing the whole path ({ext(URLS.ogCoreDocs, 'OG-Core')})</> },
      { key: 'left', icon: 'excluded', text: 'No share-price gains or demand effects in the model' },
      { key: 'others', icon: 'foreign', text: 'Common rule, some foreign capital: government and foreign owners take part too' },
      C_BELOW ? { key: 'long', icon: 'timing', text: `UK central: consumption stays below the forecast path through ${C_BELOW}` } : null,
    ]} /> } },
    { v: 'I', title: 'Investment', name: 'investment', concept: 'investment', method: 'limits', about: {
      caveats: <Items items={[
        { key: 'jump', icon: 'investment', text: <>Investment jumps in {SURPRISE_YEAR}: {ext(URLS.ogCoreDocs, 'OG-Core')} has no adjustment costs</> },
        { key: 'year1', icon: 'capital', text: `It stays high until the ramp ends in ${HEADLINE_YEAR}, then drops` },
        { key: 'size', icon: 'limit', text: 'That jump is a model property, not a forecast of a boom' },
        { key: 'grows', icon: 'scenario', text: 'It grows with the scenario' },
        TOP_FLAG ? { key: 'flag', icon: 'caveat', text: <>{SN[TOP_FLAG.sid]}{TOP_FLAG.arm === 'tfp' ? ', main version' : ''}, ζK {TOP_FLAG.zeta}: +{Math.round(TOP_FLAG.x)}% in {SURPRISE_YEAR}</> } : null,
        TOP_FLAG ? { key: 'flag2', icon: 'limit', text: <>Implausible: above the +{I_FLAG_PCT}% {ext(OG_RESULT_URLS.sanity, 'investment flag')}, {ext(OG_RESULT_URLS.plausibility, 'beyond any year on record')}</> } : null,
      ]} />,
    } },
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
      { key: 'input', icon: 'scenario', text: 'The labour-share fall is the scenario’s imposed input' },
      { key: 'same', icon: 'compare', text: 'It is the same in every version' },
      { key: 'full', icon: 'timing', text: 'It reaches full size in the headline year' },
      { key: 'derived', icon: 'arithmetic', text: <>UK sizes: <NavLink tab="method" sub="how" anchor="m-scenarios">derived from IMF SIP/2026/072</NavLink>, not printed by it</> },
    ]} /> } },
  ] },
];

// The four-measure card's finding, from the signs of the arms shown: the
// pay rate's side in every arm, and whether national income's side
// depends on the arm (the productivity gain). The arrow follows the sign.
export function measuresFinding(sid, arms, closure, rule) {
  const cl = primaryClosure(closure);
  const shown = ARMS.filter((a) => arms.includes(a.id));
  const at = (v) => shown.map((a) => gap(sid, a.id, cl, v, HEADLINE_YEAR, rule)).filter((x) => x != null);
  const w = at('w');
  const g = at('GNI');
  if (!w.length) return null;
  const one = (xs) => new Set(xs.map(side)).size === 1;
  const where = (x) => (side(x) === 'on' ? 'on the forecast path' : `${side(x)} the forecast path`);
  const every = shown.length > 1 ? ' in every version shown' : '';
  return {
    wage: one(w) ? { value: w[0], text: `The pay rate is ${where(w[0])}${every}` } : { value: null, text: 'The pay rate’s side depends on the version' },
    gni: !g.length ? null : one(g) ? { value: g[0], text: `national income is ${where(g[0])}${every}` } : { value: null, text: 'whether national income is above it depends on the productivity gain' },
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
          icon={iconFor('measure')}
          title={`Pay rates, national income and output in ${HEADLINE_YEAR}`}
          finding={ruleSolved(st.rule, sid) ? <MeasuresFinding sid={sid} arms={st.arms} closure={st.closure} rule={st.rule} /> : null}
          unit={<span data-axis-title="y">{`Each version’s gap against the OBR’s central forecast path (centre line = 0), ${HEADLINE_YEAR}, %; ${cl}, ${rulePlain(st.rule)}`}</span>}
          controls={
            <ControlBar label="Four measures: options">
              <ArmsGroup shown={st.arms} onChange={(arms) => set({ arms })} />
            </ControlBar>
          }
          legend={
            st.closure === 'both' ? (
              <p className="line-key">
                <span className="line-key-item">
                  <span className="key-dot" aria-hidden="true" data-icon="" /> Circle: some foreign capital
                </span>
                <span className="line-key-item">
                  <span className="key-diamond" aria-hidden="true" /> Diamond: no foreign capital
                </span>
              </p>
            ) : null
          }
          about={{
            read: st.rule === 'common' ? <HeadlineNote rule={st.rule} /> : null,
            caveats: (
              <Items
                items={[
                  { key: 'cut', icon: 'pay', text: 'A negative pay-rate gap is a level below a rising path' },
                  { key: 'obr', icon: 'source', text: <>The path assumes productivity growth of 1 per cent a year ({ext(efo(EFO_PAGE.p1_2), 'OBR EFO, March 2026, ¶1.2')})</> },
                  ...(wageClosureLines(sid) ?? []).map((t, i) => ({ key: `wz${i}`, icon: i ? 'closure' : 'pay', text: t })),
                  wageClosureLines(sid) ? { key: 'wzlink', icon: 'link', text: <>Figures: Both, and the <NavLink tab="explore" sub="economy" anchor="closure-sensitivity">ζK 0.5 sensitivity</NavLink></> } : null,
                  ...stressItems(sid),
                ]}
              />
            ),
          }}
          sources={sourcesItems({ sid, method: 'closures' })}
          download={{
            title: `Pay rates, national income and output in ${HEADLINE_YEAR}`,
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

// GNI and GDP open the wall: their main-arm values are the story's headline
// figures and the other arms' are in the four-measure card, so their lines
// carry no end value.
const INCOME_TILES = [
  { v: 'GNI', title: 'Income UK residents keep (GNI)', name: 'national income', concept: 'gni', ends: false, method: 'closures', about: { caveats: IMPOSED } },
  {
    v: 'Y', title: 'Total output (GDP)', name: 'GDP', concept: 'gdp', ends: false, method: 'closures',
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
                    Evidence: OG-UK results beside it
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

// The economy as one small-multiple wall: eight path charts (4 x 2 at full
// width) on the same years, one arms control and one key for them all. A
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
      <div className="ex-wall-head">
        <ControlBar label="Every chart on the wall: options">
          <ArmsGroup shown={st.arms} onChange={(arms) => set({ arms })} />
        </ControlBar>
        <ul className="ex-wall-key" aria-label="How to read the wall">
          <li>
            <Icon name={iconFor('onPath')} size={14} /> Zero line: the OBR’s central forecast path
          </li>
          <li>
            <Icon name={iconFor('shock')} size={14} /> {`Dotted: ${SURPRISE_YEAR}, extra AI starts; shaded: ${HEADLINE_YEAR}`}
          </li>
          {st.closure === 'both' ? (
            <li>
              <span className="swatch dashed is-ink" aria-hidden="true" data-icon="" /> Dashed: no foreign capital
            </li>
          ) : null}
          <li>
            <Icon name="arrowUpRight" size={14} /> Click a title to enlarge
          </li>
        </ul>
      </div>
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
              finding={r.v === 'C' ? (consumptionFinding(sid, st.closure, st.rule) ?? undefined) : r.v === 'labour_share_pp' ? (coincideFinding(sid, st.closure, st.rule) ?? undefined) : undefined}
              about={r.about}
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
    <Card id="rule-pending" icon={iconFor('timing')} title={`${SCEN_NAME[sid]} is not solved under ${ruleLabel(st.rule).toLowerCase()}`} logo={false}>
      <div className="rule-pending">
        <Items items={sentenceItems(ruleGapText(st.rule, sid))} />
        <div className="rule-pending-actions">
          {solved.map((s) => (
            <button key={s.id} type="button" className="segment" onClick={() => set({ s: s.id })}>
              Show {s.label}
            </button>
          ))}
          <button type="button" className="segment" onClick={() => set({ rule: 'common' })}>
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
