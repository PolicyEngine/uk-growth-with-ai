'use client';

import { useState } from 'react';

// Results' sub-tabs (Vahid, 12 Nov 2026: the page was too long), as AB2026's
// second tab row. URL: ?tab=results&sub=<id>.
export const SUBS = [
  { id: 'overview', label: 'Overview', icon: 'gauge' },
  { id: 'income', label: 'Income and output', icon: 'trend' },
  { id: 'variables', label: 'By variable', icon: 'bars' },
  { id: 'finances', label: 'Public finances', icon: 'landmark' },
];
import LineChart from '@/components/LineChart.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import MiniChart, { niceDomain } from '@/components/ab/MiniChart.jsx';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { SectionHeading, Notice, Unpublished } from '@/components/ab/Section.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_LIGHT, result, path, signed,
  DONE, TOTAL,
} from '@/tabs/ai/surprise.js';
import { ArmToggles, Dumbbells, StressNote } from '@/tabs/ai/Headline.jsx';
import Landing from '@/tabs/ai/Landing.jsx';
import ViewTabs from '@/components/ab/ViewTabs.jsx';
import ClosureSelector from '@/components/ab/ClosureSelector.jsx';
import FinancesSection from '@/tabs/ai/FinancesSection.jsx';

// Results: the headline (takeaway, dumbbells, scenario comparison), the GNI
// and GDP paths, the effect by variable as small multiples, then the public
// finances. Every number comes from surprise2028.json through surprise.js; a
// combination not yet solved shows "pending" or an empty slot, never a zero.
// One show/hide state for the arms is shared by every chart on the tab.

const EFFECT_GROUPS = [
  { group: 'Demand', icon: 'cart', unit: '%', rows: [
    { v: 'C', label: 'Consumption', icon: 'cart' },
    { v: 'I', label: 'Investment', icon: 'construction' },
  ] },
  { group: 'Factors', icon: 'factory', unit: '%', rows: [
    { v: 'K', label: 'Capital stock', icon: 'building' },
    { v: 'L', label: 'Labour', icon: 'users' },
  ] },
  { group: 'Prices and shares', icon: 'percent', unit: 'pp', rows: [
    { v: 'r_bp', label: 'Interest rate', scale: 0.01, icon: 'percent' },
    { v: 'labour_share_pp', label: 'Labour share', icon: 'pie' },
  ] },
];

// The closures the charts draw for the reader's choice
export const closuresFor = (closure) => (closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL]);

// Arms shown whose closed-capital solve is still pending, for the note
export function boundPending(sid, hidden, closure) {
  if (closure === 'central') return [];
  return ARMS.filter((a) => !hidden[a.id] && result(sid, a.id, BOUND).status !== 'done').map((a) => a.short || a.label);
}

export function PendingNote({ names }) {
  if (!names.length) return null;
  return (
    <p className="pending-note">
      <Icon name="lock" size={13} />
      <span>Closed-capital results pending: {names.join(', ')}.</span>
    </p>
  );
}

// Empty-chart message: hidden series, pending closed capital, or no solve
export function emptyText(hidden, closure) {
  if (ARMS.every((a) => hidden[a.id])) return 'Every series is hidden: choose one in the legend above.';
  if (closure === 'closed') return 'Closed-capital results pending for this scenario.';
  return 'No solve for this scenario yet.';
}

function gapSeries(sid, v, hidden, closure = 'central') {
  const cls = closuresFor(closure);
  return ARMS.filter((a) => !hidden[a.id]).flatMap((a) =>
    cls.flatMap((cl) => {
      const p = path(sid, a.id, cl, v);
      if (!p) return [];
      const bound = cl === BOUND;
      return [{
        color: ARM_COLOR[a.id],
        light: ARM_LIGHT[a.id],
        key: `${a.id}-${bound ? 'b' : 'c'}`,
        label: a.short || a.label,
        closure: bound ? 'closed capital' : 'central closure',
        dashed: bound && closure === 'both',
        noEndLabel: bound && closure === 'both',
        values: p,
      }];
    }),
  );
}

// One line in words, no figures (the 2031 values are the headline's).
function shape(sid, v, closure) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const p = path(sid, 'tfp', cl, v);
  if (!p) return { text: 'No solve for this scenario yet.', dir: null };
  const side = (x) => (Math.abs(x) < 0.005 ? 'at' : x > 0 ? 'above' : 'below');
  const parts = ARMS.map((a) => {
    const q = path(sid, a.id, cl, v);
    return q ? `${a.short || a.label} ${side(q[q.length - 1])}` : null;
  }).filter(Boolean);
  const end = p[p.length - 1];
  return {
    text: `In ${HEADLINE_YEAR}, ${cl === BOUND ? 'closed capital' : 'central closure'}: ${parts.join(', ')} the OBR-central path.`,
    dir: Math.abs(end) < 0.005 ? 'minus' : end > 0 ? 'arrowUp' : 'arrowDown',
  };
}

// Consumption below the OBR-central path while national income is above it,
// main arm, every year from the shock to 2031 (results sanity audit A3)
function consumptionNote(sid, closure) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const c = path(sid, 'tfp', cl, 'C');
  const g = path(sid, 'tfp', cl, 'GNI');
  if (!c || !g) return null;
  const from = WINDOW_YEARS.indexOf(SURPRISE_YEAR);
  const below = c.slice(from).every((x) => x < 0);
  const above = g[g.length - 1] > 0;
  return below && above
    ? `Automation + productivity: consumption stays below the OBR-central path through ${HEADLINE_YEAR}, while national income is above it.`
    : null;
}

function GapCard({ sid, v, title, icon, domain, hidden, closure }) {
  const series = gapSeries(sid, v, hidden, closure);
  const sum = shape(sid, v, closure);
  return (
    <ChartCard
      icon={icon}
      title={title}
      summary={
        <span className="summary-line">
          {sum.dir ? <Icon name={sum.dir} size={14} className="dir-icon" /> : null}
          {sum.text}
        </span>
      }
      unit={`% difference from the OBR-central path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
      legend={
        closure === 'both' ? (
          <p className="line-key">
            <span className="swatch is-ink" aria-hidden="true" /> <Icon name="globe" size={13} /> solid: central closure
            <span className="swatch dashed is-ink" aria-hidden="true" /> <Icon name="lock" size={13} /> dashed: closed capital
          </p>
        ) : null
      }
      about={{
        shows: `Each arm against the OBR-central path, ${FIRST_YEAR}–${HEADLINE_YEAR}. Both charts share one y-range so their sizes compare.`,
        how: 'Each gap is the percentage difference from a no-shock restart of OG-UK at the same closure.',
        caveats: (
          <>
            The technology paths are imposed, so the lines show the consequences of given scenarios, not their likelihood.
            {v === 'Y' ? (
              <>
                {' '}Why GDP is below the IMF&rsquo;s UK estimate:{' '}
                <a href="?tab=literature&sub=numbers">Literature, where our numbers sit</a>
                .
              </>
            ) : null}
          </>
        ),
      }}
    >
      <PendingNote names={series.length ? boundPending(sid, hidden, closure) : []} />
      {series.length ? (
        <LineChart
          x={WINDOW_YEARS}
          series={series}
          height={280}
          noValue
          markers={[{ year: SURPRISE_YEAR, label: 'AI shock' }]}
          yDomain={domain}
          unit="%"
          tipTitle={title}
          zeroLabel="OBR central"
          bands={[{ year: HEADLINE_YEAR }]}
          valueFormat={(x) => signed(x, 2)}
          ariaLabel={`${title} against the OBR-central path, ${FIRST_YEAR} to ${HEADLINE_YEAR}`}
        />
      ) : (
        <Unpublished>{emptyText(hidden, closure)}</Unpublished>
      )}
    </ChartCard>
  );
}

function EffectGrid({ sid, hidden, closure }) {
  const vals = (unit) =>
    EFFECT_GROUPS.filter((g) => g.unit === unit).flatMap((g) =>
      g.rows.flatMap((r) => gapSeries(sid, r.v, hidden, closure).flatMap((l) => l.values.map((x) => x * (r.scale || 1)))),
    );
  const pend = boundPending(sid, hidden, closure);
  const domains = { '%': niceDomain(vals('%')), pp: niceDomain(vals('pp')) };
  return (
    <>
      <div className="var-groups">
        {EFFECT_GROUPS.map((g) => (
          <section key={g.group} className="var-group" aria-label={g.group}>
            <h3 className="var-group-title">
              <Icon name={g.icon} size={16} />
              <span>
                {g.group} <span className="var-group-unit">({g.unit === '%' ? '%' : 'percentage points'})</span>
              </span>
            </h3>
            <div className="var-stack">
              {g.rows.map((r) => {
                const k = r.scale || 1;
                const lines = gapSeries(sid, r.v, hidden, closure).map((l) => ({
                  ...l,
                  label: ARMS.find((a) => l.key.startsWith(a.id)).label,
                  closure: closure === 'both' ? l.closure : null,
                  values: l.values.map((x) => x * k),
                }));
                return (
                  <MiniChart
                    key={r.v}
                    icon={r.icon}
                    title={r.label}
                    years={WINDOW_YEARS}
                    lines={lines}
                    domain={domains[g.unit]}
                    unit={g.unit}
                    fmt={(x) => signed(x, 2)}
                    endFmt={(x) => `${signed(x)}${g.unit}`}
                    closure={closure === 'both' ? null : closure === 'closed' ? 'closed capital' : 'central closure'}
                    subtitle={`${HEADLINE_YEAR} value at the line end`}
                    marker={{ year: SURPRISE_YEAR, label: 'AI shock' }}
                    emptyText={emptyText(hidden, closure)}
                    note={
                      [
                        lines.length && pend.length ? `Closed-capital results pending: ${pend.join(', ')}.` : null,
                        r.v === 'C' ? consumptionNote(sid, closure) : null,
                      ]
                        .filter(Boolean)
                        .join(' ') || null
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="note grid-axis">
        <Icon name="calendar" size={14} />
        <span>
          The dashed horizontal line in each chart is the OBR-central path (0); the dotted vertical line is the {SURPRISE_YEAR} AI
          shock. Demand and Factors share one % scale; Prices and shares share one pp scale.
        </span>
      </p>
    </>
  );
}

export default function ResultsTab({ sid, sub = 'overview', onSub, onTab, onScenario, closure = 'central', onClosure }) {
  const [hidden, setHidden] = useState({});
  const [seen, setSeen] = useState({ [sub]: true });
  if (!seen[sub]) setSeen((v) => ({ ...v, [sub]: true }));
  const toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
  const sidPending = ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done');
  const toMethod = () => onTab('method');
  const link = (tab, text) => (
    <a href={`?tab=${tab}`} onClick={(e) => { e.preventDefault(); onTab(tab); }}>
      {text}
    </a>
  );
  // The legend bar at the top of a chart sub-tab: arm toggles and the closure
  const legendBar = (
    <div className="legend-bar">
      <ArmToggles hidden={hidden} onToggle={toggle} />
      <ClosureSelector value={closure} onChange={onClosure} onMore={toMethod} />
    </div>
  );
  // One y-range for the GNI and GDP charts
  const both = ['GNI', 'Y'].flatMap((v) => gapSeries(sid, v, hidden, closure).flatMap((s) => s.values));
  const lo = Math.min(0, ...both);
  const hi = Math.max(0, ...both);

  const panels = {
    overview: (
      <>
        <Landing sid={sid} onScenario={onScenario} detailsId="details" />
        {DONE < TOTAL && sidPending ? (
          <Notice>
            {DONE} of {TOTAL} solves done; the rest show “pending”.
          </Notice>
        ) : null}
        <SectionHeading id="details" icon="layers" title="Explore the details">
          Three kinds of AI and both capital closures, {HEADLINE_YEAR}, differences from the OBR-central path.
        </SectionHeading>
        <div className="charts-stack details-stack">
          <div className="chart-card headline-card">
            <div className="chart-header">
              <h3>
                <Icon name="gauge" size={16} />
                <span>Four measures, three kinds of AI</span>
              </h3>
            </div>
            <ArmToggles hidden={hidden} onToggle={toggle} />
            <Dumbbells sid={sid} hidden={hidden} />
            <p className="note dot-key">
              <span className="key-item">
                <span className="key-dot" aria-hidden="true" />
                <Icon name="globe" size={14} />
                <span>Circle: central closure (some new capital foreign-owned).</span>
              </span>
              <span className="key-item">
                <span className="key-diamond" aria-hidden="true" />
                <Icon name="lock" size={14} />
                <span>Diamond: closed capital (none foreign-owned).</span>
              </span>
              {link('method', 'Closures and terms →')}
            </p>
          </div>
          <div className="chart-card fold-card">
            <Disclosure
              title={
                <span className="fold-title">
                  <Icon name="alert" size={16} />
                  Why the stress test holds GDP at 0
                </span>
              }
              preview="As in the OBR’s Box 2.2 displacement scenario"
            >
              <StressNote sid={sid} />
            </Disclosure>
          </div>
        </div>
      </>
    ),
    income: (
      <>
        <SectionHeading id="paths" icon="trend" title={`National income and GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
          How the gaps build up from the {SURPRISE_YEAR} surprise.
        </SectionHeading>
        {legendBar}
        <div className="charts-grid">
          <GapCard sid={sid} v="GNI" title="Income UK residents keep (GNI)" icon="home" domain={[lo, hi]} hidden={hidden} closure={closure} />
          <GapCard sid={sid} v="Y" title="Total output (GDP)" icon="factory" domain={[lo, hi]} hidden={hidden} closure={closure} />
        </div>
      </>
    ),
    variables: (
      <>
        <SectionHeading id="effects" icon="bars" title={`Effect by variable, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
          Hover, tap or focus a chart for each year.
        </SectionHeading>
        {legendBar}
        <EffectGrid sid={sid} hidden={hidden} closure={closure} />
      </>
    ),
    finances: <FinancesSection sid={sid} hidden={hidden} legendBar={legendBar} closure={closure} />,
  };

  return (
    <>
      <ViewTabs tabs={SUBS} value={sub} onChange={onSub} idPrefix="sub" label="Results sections" variant="sub" />
      {SUBS.map(({ id }) =>
        seen[id] ? (
          <div key={id} id={`sub-${id}`} role="tabpanel" aria-labelledby={`subbtn-${id}`} hidden={id !== sub} className="sub-panel">
            {panels[id]}
          </div>
        ) : null,
      )}
    </>
  );
}
