'use client';

import LineChart from '@/components/LineChart.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { Unpublished } from '@/components/ab/Section.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import ControlBar, { ArmsGroup } from '@/components/ui/ControlBar.jsx';
import { useNav, subOf, NavLink } from '@/lib/nav.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, ARMS, path, signed, SCEN_NAME, ruleSolved, solvedUnder,
} from '@/tabs/ai/surprise.js';
import { seriesFor, boundPending, emptyText, primaryClosure, closureWords, contextLine, seriesTable, legendOf, side, ruleGapText } from '@/tabs/ai/lines.js';
import { ruleLabel } from '@/lib/labels.js';
import { Dumbbells, StressNote, dumbbellTable, dumbbellSvg, dumbbellLegend } from '@/tabs/ai/Headline.jsx';
import FinancesSection from '@/tabs/ai/FinancesSection.jsx';

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
        <span className="swatch is-ink" aria-hidden="true" /> Solid: central closure
      </span>
      <span className="line-key-item">
        <span className="swatch dashed is-ink" aria-hidden="true" /> Dashed: closed capital
      </span>
    </p>
  );
}

export function PendingLine({ names }) {
  if (!names.length) return null;
  return (
    <p className="icon-line is-muted">
      <Icon name="hourglass" size={16} />
      <span>Closed capital is not solved yet for: {names.join(', ')}.</span>
    </p>
  );
}

// "Automation + productivity above, Technology unchanged above, Stress test
// on the OBR-central path": words only. The 2031 figures are at the line ends.
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
  const where = (s) => (s === 'on' ? 'on the OBR-central path' : `${s} the OBR-central path`);
  const lead = `In ${HEADLINE_YEAR}${closure === 'closed' ? ', with closed capital,' : ''} ${name}`;
  if (sides.length === 1) return `${lead} is ${where(sides[0])}${parts.length > 1 ? ' in every arm shown' : ''}.`;
  return `${lead} is ${sides.map((s) => `${where(s)} in ${parts.filter((p) => p.side === s).map((p) => p.arm.toLowerCase()).join(' and ')}`).join(', and ')}.`;
}

// Two paths closer than half the last printed digit (0.01) in every year
// coincide on the page.
const COINCIDE = 0.005;

// One path chart in the one card: its own y-scale with a visible axis, the
// 2031 value at each line end, and the arms control bar.
export function PathCard({
  sid, v, title, name, icon, years = WINDOW_YEARS, unit = '%', scale = 1, dp = 2, endDp = 2, finding, about, method = 'closures', markers, id, unitLine: unitText, ends = true,
}) {
  const { st, set } = useNav();
  const rule = st.rule;
  // A line that coincides with one before it and ends on the same printed
  // value (the labour share, an imposed input, is the same in every arm)
  // carries no end value of its own: the value prints once and the card's
  // finding says the lines coincide.
  const series = seriesFor(sid, v, years, st.arms, st.closure, scale, rule).map((s, i, all) =>
    all.slice(0, i).some((t) => !t.noEndLabel && t.values.length === s.values.length && signed(t.values[t.values.length - 1], endDp) === signed(s.values[s.values.length - 1], endDp) && t.values.every((x, k) => Math.abs(x - s.values[k]) < COINCIDE)) ? { ...s, noEndLabel: true } : s,
  );
  const last = years[years.length - 1];
  const unitLine = unitText ?? (unit === '%' ? `% difference from the OBR-central path, ${years[0]}–${last}` : `Percentage-point difference from the OBR-central path, ${years[0]}–${last}`);
  return (
    <Card
      id={id}
      icon={icon}
      title={title}
      finding={finding ?? findingFor(sid, v, st.arms, st.closure, name, rule)}
      unit={unitLine}
      controls={
        <ControlBar label={`${title}: options`}>
          <ArmsGroup shown={st.arms} onChange={(arms) => set({ arms })} />
        </ControlBar>
      }
      legend={<ClosureKey closure={st.closure} />}
      about={about}
      method={method}
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
          height={260}
          endLabel="value"
          noEndLabels={!ends}
          unit={unit}
          tipTitle={title}
          zeroLabel="OBR central"
          markers={markers ?? [{ year: SURPRISE_YEAR, label: 'AI arrives' }]}
          bands={[{ year: HEADLINE_YEAR, label: 'Headline year' }]}
          valueFormat={(x) => signed(x, endDp)}
          tipFormat={(x) => signed(x, dp)}
          ariaLabel={`${title} against the OBR-central path, ${years[0]} to ${last}, ${SCEN_NAME[sid]}, ${closureWords(st.closure)}, ${ruleLabel(rule).toLowerCase()}`}
        />
      ) : (
        <Unpublished>{emptyText(st.arms, st.closure, rule, sid)}</Unpublished>
      )}
    </Card>
  );
}

// The GNI and GDP paths carry no end values: their 2031 figures have one home, the four-measure card above them
const READING_PATH = `The zero line is the OBR-central path. The dotted vertical line marks ${SURPRISE_YEAR}, when AI arrives, and the shaded year is ${HEADLINE_YEAR}, the headline year. The main arm's ${HEADLINE_YEAR} values are the story's headline figures, linked from the four-measure card above. Hover, tap or use the arrow keys for each year.`;
const READING = `The zero line is the OBR-central path. The dotted vertical line marks ${SURPRISE_YEAR}, when AI arrives, and the shaded year is ${HEADLINE_YEAR}, the headline year. Each line ends with its ${HEADLINE_YEAR} value; hover, tap or use the arrow keys for other years.`;
const HOW = 'Each gap is the difference from a no-shock restart of OG-UK at the same closure.';
const IMPOSED = 'The technology paths are imposed, so the lines show the consequences of given scenarios, not their likelihood.';

function consumptionFinding(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const c = path(sid, 'tfp', cl, 'C', rule);
  const g = path(sid, 'tfp', cl, 'GNI', rule);
  if (!c || !g) return null;
  const from = WINDOW_YEARS.indexOf(SURPRISE_YEAR);
  return c.slice(from).every((x) => x < 0) && g[g.length - 1] > 0
    ? `With automation + productivity, consumption stays below the OBR-central path through ${HEADLINE_YEAR} while national income is above it: households save more once the shock arrives in ${SURPRISE_YEAR}.`
    : null;
}

// The labour-share fall is an imposed input, the same in every arm: when
// the arms' paths are equal, their lines coincide and the card says so.
function coincideFinding(sid, closure, rule = 'common') {
  const cl = primaryClosure(closure);
  const ps = ARMS.map((a) => path(sid, a.id, cl, 'labour_share_pp', rule)).filter(Boolean);
  if (ps.length < 2) return null;
  const same = ps.every((p) => p.every((x, i) => Math.abs(x - ps[0][i]) < COINCIDE));
  return same ? 'The three arms’ lines coincide: the fall in the labour share is the same imposed input in each arm.' : null;
}

const ECONOMY = [
  { group: 'Demand', icon: 'cart', lede: 'What households spend and what is invested.', rows: [
    { v: 'C', title: 'Consumption', name: 'consumption', icon: 'cart', about: { shows: READING, how: HOW, caveats: 'The direction relies on households foreseeing the whole path once the shock arrives. The model has no share-price gains or demand effects.' } },
    { v: 'I', title: 'Investment', name: 'investment', icon: 'construction', method: 'limits', about: {
      shows: READING,
      how: HOW,
      caveats: `Investment jumps in ${SURPRISE_YEAR} because the model has no adjustment costs: capital is frictionless, so the whole response to the news lands in the first year. The size of that first-year jump is a property of the model, not a forecast of an investment boom, and it grows with the scenario.`,
    } },
  ] },
  { group: 'Factors', icon: 'factory', lede: 'The capital and labour that production uses.', rows: [
    { v: 'K', title: 'Capital stock', name: 'the capital stock', icon: 'building', about: { shows: READING, how: HOW, caveats: 'Foreign capital resets each year, so part of the first-year gap is an inflow that arrives with no investment recorded.' } },
    { v: 'L', title: 'Labour', name: 'labour (hours worked, not jobs)', icon: 'users', about: { shows: READING, how: HOW, definitions: 'Labour is hours worked, weighted by skill. The model has no unemployment, so it is not a count of jobs.' } },
  ] },
  { group: 'Prices and shares', icon: 'percent', lede: 'What capital earns and how income is divided.', rows: [
    { v: 'r_bp', title: 'Interest rate', name: 'the interest rate', icon: 'percent', unit: 'pp', scale: 0.01, method: 'closures', about: { shows: READING, how: HOW, definitions: 'The return on capital, in percentage points.' } },
    { v: 'labour_share_pp', title: 'Labour share', name: 'the labour share of income', icon: 'pie', unit: 'pp', method: 'shock', about: { shows: READING, how: 'The fall in the labour share is the scenario’s input: it is imposed, the same in every arm, and reaches full size in the headline year.' } },
  ] },
];

function IncomePanel({ sid }) {
  const { st, set } = useNav();
  const cl = closureWords(st.closure);
  return (
    <>
      <SectionHeading id="income" icon="home" title={`Income and output, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
        Four measures in {HEADLINE_YEAR}, then how national income and GDP build up from the {SURPRISE_YEAR} surprise.
      </SectionHeading>
      <div className="cards-stack">
        <Card
          id="measures"
          icon="gauge"
          title={`Pay rates, national income and output in ${HEADLINE_YEAR}`}
          finding={`Each arm’s gap against the OBR-central path in ${HEADLINE_YEAR}, ${cl}, ${ruleLabel(st.rule).toLowerCase()}. The wage rate is lower in every arm; whether national income is higher depends on the productivity gain.`}
          unit="% difference from the OBR-central path"
          controls={
            <ControlBar label="Four measures: options">
              <ArmsGroup shown={st.arms} onChange={(arms) => set({ arms })} />
            </ControlBar>
          }
          legend={
            st.closure === 'both' ? (
              <p className="line-key">
                <span className="line-key-item">
                  <span className="key-dot" aria-hidden="true" /> Circle: central closure
                </span>
                <span className="line-key-item">
                  <span className="key-diamond" aria-hidden="true" /> Diamond: closed capital
                </span>
              </p>
            ) : null
          }
          about={{
            shows: `One row per measure, one marker per arm, on one axis centred on the OBR-central path. Under Both, the circle is the central closure and the diamond is closed capital.`,
            how: HOW,
            definitions: (
              <>
                <p>Wage rate: pay per unit of labour, adjusted for skill. GNI: GDP less the return paid on foreign-owned capital. NNI: GNI after depreciation.</p>
                <StressNote sid={sid} />
              </>
            ),
            caveats: 'A negative wage gap is slower growth against a rising path, not a cut in the level of pay, in the main arm of every scenario.',
          }}
          method="closures"
          download={{
            title: `Pay rates, national income and output in ${HEADLINE_YEAR}`,
            context: () => contextLine(sid, st.closure, '% difference from the OBR-central path', st.rule),
            table: () => dumbbellTable(sid, st.arms, st.closure, st.rule),
            svg: () => dumbbellSvg(sid, st.arms, st.closure, st.rule),
            legend: () => dumbbellLegend(st.arms, st.closure),
          }}
        >
          {ruleSolved(st.rule, sid) ? <Dumbbells sid={sid} arms={st.arms} closure={st.closure} rule={st.rule} /> : <Unpublished>{ruleGapText(st.rule, sid)}</Unpublished>}
        </Card>
        <div className="cards-grid">
          <PathCard sid={sid} v="GNI" title="Income UK residents keep (GNI)" name="national income" icon="home" ends={false} about={{ shows: READING_PATH, how: HOW, caveats: IMPOSED }} />
          <PathCard
            sid={sid}
            v="Y"
            title="Total output (GDP)"
            name="GDP"
            icon="factory"
            ends={false}
            about={{
              shows: READING_PATH,
              how: HOW,
              caveats: (
                <>
                  {IMPOSED} Why GDP is below the IMF&rsquo;s UK estimate:{' '}
                  <NavLink tab="method" sub="studies" anchor="imf-gap">
                    Evidence, where our numbers sit
                  </NavLink>
                  .
                </>
              ),
            }}
          />
        </div>
      </div>
    </>
  );
}

function EconomyPanel({ sid }) {
  const { st } = useNav();
  return (
    <>
      {ECONOMY.map((g, gi) => (
        <section key={g.group} aria-label={g.group} className={gi ? 'section-gap' : ''}>
          <SectionHeading id={`economy-${g.group.split(' ')[0].toLowerCase()}`} icon={g.icon} title={g.group}>
            {g.lede}
          </SectionHeading>
          <div className="cards-grid">
            {g.rows.map((r) => (
              <PathCard
                key={r.v}
                sid={sid}
                v={r.v}
                title={r.title}
                name={r.name}
                icon={r.icon}
                unit={r.unit ?? '%'}
                scale={r.scale ?? 1}
                endDp={2}
                finding={r.v === 'C' ? (consumptionFinding(sid, st.closure, st.rule) ?? undefined) : r.v === 'labour_share_pp' ? (coincideFinding(sid, st.closure, st.rule) ?? undefined) : undefined}
                about={r.about}
                method={r.method ?? 'model'}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// A scenario not solved under the fiscal rule chosen: one card in place of
// the page's charts, with the two ways back to a solved view.
export function RulePending({ sid }) {
  const { st, set } = useNav();
  const solved = solvedUnder(st.rule);
  return (
    <Card id="rule-pending" icon="hourglass" title={`${SCEN_NAME[sid]} is not solved under ${ruleLabel(st.rule).toLowerCase()}`} logo={false}>
      <div className="rule-pending">
        <p>{ruleGapText(st.rule, sid)}</p>
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
