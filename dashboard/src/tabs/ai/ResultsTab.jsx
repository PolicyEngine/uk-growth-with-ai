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
import { ArmToggles, Takeaway, Dumbbells, ScenarioStrip, StressNote } from '@/tabs/ai/Headline.jsx';
import ViewTabs from '@/components/ab/ViewTabs.jsx';
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

function gapSeries(sid, v, hidden) {
  return ARMS.filter((a) => !hidden[a.id]).flatMap((a) => {
    const out = [];
    const c = path(sid, a.id, CENTRAL, v);
    const b = path(sid, a.id, BOUND, v);
    const base = { color: ARM_COLOR[a.id], light: ARM_LIGHT[a.id] };
    if (c) out.push({ ...base, key: `${a.id}-c`, label: a.short || a.label, closure: 'central closure', values: c });
    if (b) out.push({ ...base, key: `${a.id}-b`, label: a.short || a.label, closure: 'closed capital', dashed: true, noEndLabel: true, values: b });
    return out;
  });
}

// One line in words, no figures (the 2031 values are the headline's).
function shape(sid, v) {
  const p = path(sid, 'tfp', CENTRAL, v);
  if (!p) return { text: 'No solve for this scenario yet.', dir: null };
  const side = (x) => (Math.abs(x) < 0.005 ? 'at' : x > 0 ? 'above' : 'below');
  const parts = ARMS.map((a) => {
    const q = path(sid, a.id, CENTRAL, v);
    return q ? `${a.short || a.label} ${side(q[q.length - 1])}` : null;
  }).filter(Boolean);
  const end = p[p.length - 1];
  return {
    text: `In ${HEADLINE_YEAR}, central closure: ${parts.join(', ')} the no-AI path.`,
    dir: Math.abs(end) < 0.005 ? 'minus' : end > 0 ? 'arrowUp' : 'arrowDown',
  };
}

function GapCard({ sid, v, title, icon, domain, hidden }) {
  const series = gapSeries(sid, v, hidden);
  const sum = shape(sid, v);
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
      unit={`% difference from the no-AI path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
      legend={
        <p className="line-key">
          <span className="swatch is-ink" aria-hidden="true" /> <Icon name="globe" size={13} /> solid: central closure
          <span className="swatch dashed is-ink" aria-hidden="true" /> <Icon name="lock" size={13} /> dashed: closed capital
        </p>
      }
      about={{
        shows: `Each arm against the path without AI, ${FIRST_YEAR}–${HEADLINE_YEAR}. Both charts share one y-range so their sizes compare.`,
        how: 'Each gap is the percentage difference from a no-shock restart of OG-UK at the same closure.',
        caveats: 'The technology paths are imposed, so the lines show the consequences of given scenarios, not their likelihood.',
      }}
    >
      {series.length ? (
        <LineChart
          x={WINDOW_YEARS}
          series={series}
          height={280}
          noValue
          yDomain={domain}
          unit="%"
          tipTitle={title}
          zeroLabel="no-AI path"
          bands={[{ year: HEADLINE_YEAR }]}
          valueFormat={(x) => signed(x, 2)}
          ariaLabel={`${title} against the no-AI path, ${FIRST_YEAR} to ${HEADLINE_YEAR}`}
        />
      ) : (
        <Unpublished>No solve for this scenario yet.</Unpublished>
      )}
    </ChartCard>
  );
}

function EffectGrid({ sid, hidden }) {
  const shown = ARMS.filter((a) => !hidden[a.id]);
  const vals = (unit) =>
    EFFECT_GROUPS.filter((g) => g.unit === unit).flatMap((g) =>
      g.rows.flatMap((r) => shown.flatMap((a) => (path(sid, a.id, CENTRAL, r.v) || []).map((x) => x * (r.scale || 1)))),
    );
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
                const lines = shown.flatMap((a) => {
                  const p = path(sid, a.id, CENTRAL, r.v);
                  return p ? [{ key: a.id, label: a.label, color: ARM_COLOR[a.id], light: ARM_LIGHT[a.id], values: p.map((x) => x * k) }] : [];
                });
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
          Each chart runs from {FIRST_YEAR} (left) to {HEADLINE_YEAR} (right), with its {HEADLINE_YEAR} value at the line&rsquo;s end. The
          dashed line in each chart is the no-AI path (0). Demand and Factors share one % scale; Prices and shares share one pp scale.
        </span>
      </p>
    </>
  );
}

export default function ResultsTab({ sid, sub = 'overview', onSub, onTab, onScenario }) {
  const [hidden, setHidden] = useState({});
  const [seen, setSeen] = useState({ [sub]: true });
  if (!seen[sub]) setSeen((v) => ({ ...v, [sub]: true }));
  const toggle = (id) => setHidden((h) => ({ ...h, [id]: !h[id] }));
  const sidPending = ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done');
  const link = (tab, text) => (
    <a href={`?tab=${tab}`} onClick={(e) => { e.preventDefault(); onTab(tab); }}>
      {text}
    </a>
  );
  // One y-range for the GNI and GDP charts
  const both = ['GNI', 'Y'].flatMap((v) => gapSeries(sid, v, hidden).flatMap((s) => s.values));
  const lo = Math.min(0, ...both);
  const hi = Math.max(0, ...both);

  const panels = {
    overview: (
      <>
        <SectionHeading id="headline" icon="target" title={`By ${HEADLINE_YEAR}, after an unexpected AI shock in ${SURPRISE_YEAR}`} />
        <Takeaway sid={sid} />
        {DONE < TOTAL && sidPending ? (
          <Notice>
            {DONE} of {TOTAL} solves done; the rest show “pending”.
          </Notice>
        ) : null}
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
          <Disclosure inCard title="Why the stress test holds GDP at 0" preview="As in the OBR’s Box 2.2 displacement scenario">
            <StressNote sid={sid} />
          </Disclosure>
          <ScenarioStrip sid={sid} onChoose={onScenario} />
        </div>
      </>
    ),
    income: (
      <>
        <SectionHeading id="paths" icon="trend" title={`National income and GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
          How the gaps build up from the {SURPRISE_YEAR} surprise.
        </SectionHeading>
        <ArmToggles hidden={hidden} onToggle={toggle} />
        <div className="charts-grid">
          <GapCard sid={sid} v="GNI" title="Income UK residents keep (GNI)" icon="home" domain={[lo, hi]} hidden={hidden} />
          <GapCard sid={sid} v="Y" title="Total output (GDP)" icon="factory" domain={[lo, hi]} hidden={hidden} />
        </div>
      </>
    ),
    variables: (
      <>
        <SectionHeading id="effects" icon="bars" title={`Effect by variable, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
          Central closure. Hover, tap or focus a chart for each year.
        </SectionHeading>
        <ArmToggles hidden={hidden} onToggle={toggle} />
        <EffectGrid sid={sid} hidden={hidden} />
      </>
    ),
    finances: <FinancesSection sid={sid} hidden={hidden} onToggle={toggle} />,
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
