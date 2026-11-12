'use client';

import LineChart from '@/components/LineChart.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { SectionHeading, Notice, Unpublished } from '@/components/ab/Section.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, result, path, signed, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';
import { ArmTag, ARM_ICON, Takeaway, Dumbbells, ScenarioStrip } from '@/tabs/ai/Headline.jsx';
import VarCard from '@/components/ab/VarCard.jsx';

// Results: the 2031 headline tiles, the GNI and GDP paths and the effect of
// AI by variable. Every number comes from surprise2028.json through
// surprise.js; a combination not yet solved shows "pending", never a zero.
// Each fact is stated once: the 2031 GNI/GDP values are the tiles', so the
// chart end labels name the line only.

const EFFECT_GROUPS = [
  { group: 'Demand', icon: 'cart', rows: [
    { v: 'C', label: 'Consumption', unit: '%', icon: 'cart' },
    { v: 'I', label: 'Investment', unit: '%', icon: 'construction' },
  ] },
  { group: 'Factors', icon: 'factory', rows: [
    { v: 'K', label: 'Capital stock', unit: '%', icon: 'building' },
    { v: 'L', label: 'Labour', unit: '%', icon: 'users' },
  ] },
  { group: 'Prices and shares', icon: 'percent', rows: [
    { v: 'r_bp', label: 'Interest rate', unit: 'pp', scale: 0.01, icon: 'percent' },
    { v: 'labour_share_pp', label: 'Labour share', unit: 'pp', icon: 'pie' },
  ] },
];

function chartSeries(sid, v) {
  return ARMS.flatMap((a) => {
    const out = [];
    const c = path(sid, a.id, CENTRAL, v);
    const b = path(sid, a.id, BOUND, v);
    if (c) out.push({ key: `${a.id}-c`, label: a.label, color: ARM_COLOR[a.id], values: c });
    if (b) out.push({ key: `${a.id}-b`, label: 'Closed capital', color: ARM_COLOR[a.id], dashed: true, values: b });
    return out;
  });
}

// One line in words, no figures (the 2031 values are the headline's).
function shape(sid, v) {
  const p = path(sid, 'tfp', CENTRAL, v);
  const q = path(sid, 'ss', CENTRAL, v);
  if (!p) return { text: 'No solve for this scenario yet.', dir: null };
  const end = p[p.length - 1];
  const side = (x) => (Math.abs(x) < 0.005 ? 'at' : x > 0 ? 'above' : 'below');
  const text = `Automation + productivity ends ${side(end)} the no-AI path in ${HEADLINE_YEAR}${
    q ? `; automation only ends ${side(q[q.length - 1])} it` : ''
  }.`;
  return { text, dir: Math.abs(end) < 0.005 ? 'minus' : end > 0 ? 'arrowUp' : 'arrowDown' };
}

function ChartLegend({ sid }) {
  const arms = ARMS.filter((a) => result(sid, a.id, CENTRAL).status === 'done');
  const hasBound = ARMS.some((a) => result(sid, a.id, BOUND).status === 'done');
  return (
    <div className="chart-key">
      {arms.map((a) => (
        <ArmTag key={a.id} arm={a.id} label={a.label} />
      ))}
      <span className="arm-tag">
        <span className="swatch is-ink" aria-hidden="true" />
        <Icon name="globe" size={14} />
        <span>Central</span>
      </span>
      {hasBound ? (
        <span className="arm-tag">
          <span className="swatch dashed is-ink" aria-hidden="true" />
          <Icon name="lock" size={14} />
          <span>Closed capital</span>
        </span>
      ) : null}
    </div>
  );
}

function GapCard({ sid, v, title, icon }) {
  const series = chartSeries(sid, v);
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
      legend={series.length ? <ChartLegend sid={sid} /> : null}
      about={{
        shows: `Each AI scenario against the path without AI, ${FIRST_YEAR}–${HEADLINE_YEAR}. Solid lines: central closure; dashed: closed capital. Hover a point for its value.`,
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
          noEndLabels
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

function bothNote(vals) {
  const done = vals.filter((x) => x != null);
  if (done.length < 2) return null;
  const sgn = (x) => (Math.abs(x) < 0.005 ? 0 : Math.sign(x));
  const [a, b] = done.map(sgn);
  if (a === b && a > 0) return { icon: 'arrowUp', text: 'Above the no-AI path in both arms' };
  if (a === b && a < 0) return { icon: 'arrowDown', text: 'Below the no-AI path in both arms' };
  return { icon: 'arrowLeftRight', text: 'The two arms move in different directions' };
}

function EffectGrid({ sid }) {
  return (
    <div className="var-groups">
      {EFFECT_GROUPS.map((g) => (
        <section key={g.group} className="var-group" aria-label={g.group}>
          <h3 className="var-group-title">
            <Icon name={g.icon} size={16} />
            <span>{g.group}</span>
          </h3>
          <div className="var-stack">
            {g.rows.map((r) => {
              const k = r.scale || 1;
              const lines = ARMS.flatMap((a) => {
                const p = path(sid, a.id, CENTRAL, r.v);
                return p ? [{ key: a.id, label: a.label, color: ARM_COLOR[a.id], values: p.map((x) => x * k) }] : [];
              });
              const ends = ARMS.map((a) => {
                const p = path(sid, a.id, CENTRAL, r.v);
                return p ? p[p.length - 1] * k : null;
              });
              return (
                <VarCard
                  key={r.v}
                  icon={r.icon}
                  title={r.label}
                  years={WINDOW_YEARS}
                  lines={lines}
                  unit={r.unit}
                  fmt={(x) => signed(x, 2)}
                  figures={ARMS.map((a, i) => ({
                    key: a.id,
                    armIcon: ARM_ICON[a.id],
                    color: ARM_COLOR[a.id],
                    label: a.label,
                    raw: ends[i],
                    value: ends[i] == null ? 'pending' : `${signed(ends[i])}${r.unit}`,
                  }))}
                  note={bothNote(ends)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ResultsTab({ sid, onTab, onScenario }) {
  const sidPending = ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done');
  const link = (tab, text) => (
    <a href={`?tab=${tab}`} onClick={(e) => { e.preventDefault(); onTab(tab); }}>
      {text}
    </a>
  );

  return (
    <>
      <p className="tab-lede">
        <Icon name="cpu" size={16} />
        <span>An unanticipated {SURPRISE_YEAR} AI shock in OG-UK, against the path without AI.</span>
      </p>

      <SectionHeading id="headline" icon="target" title={`${HEADLINE_YEAR} against the no-AI path`} />
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
            <span>Four measures, two kinds of AI</span>
          </h3>
        </div>
        <div className="headline-key">
          {ARMS.map((a) => (
            <ArmTag key={a.id} arm={a.id} label={a.label} />
          ))}
        </div>
        <Dumbbells sid={sid} />
        <p className="note dot-key">
          <span className="key-dot" aria-hidden="true" />
          <Icon name="globe" size={14} />
          <span>Filled dot: central closure (some new capital foreign-owned).</span>
          <span className="key-dot is-hollow" aria-hidden="true" />
          <Icon name="lock" size={14} />
          <span>Hollow dot: closed capital (none foreign-owned).</span>
          {link('method', 'Closures and terms →')}
        </p>
        <ScenarioStrip sid={sid} onChoose={onScenario} />
      </div>

      <SectionHeading id="paths" icon="trend" title={`National income and GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
        How the gaps build up from the {SURPRISE_YEAR} surprise.
      </SectionHeading>
      <div className="charts-grid">
        <GapCard sid={sid} v="GNI" title="Income UK residents keep (GNI)" icon="home" />
        <GapCard sid={sid} v="Y" title="Total output (GDP)" icon="factory" />
      </div>

      <SectionHeading id="effects" icon="bars" title={`Effect by variable, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
        Central closure. Large figures are {HEADLINE_YEAR}; hover or focus a chart for each year.
      </SectionHeading>
      <div className="headline-key grid-key">
        {ARMS.map((a) => (
          <ArmTag key={a.id} arm={a.id} label={a.label} />
        ))}
        <span className="arm-tag">
          <span className="swatch is-ink" aria-hidden="true" />
          <Icon name="globe" size={14} />
          <span>Central closure</span>
        </span>
      </div>
      <EffectGrid sid={sid} />
      <p className="section-link">
        <Icon name="landmark" size={14} />
        {link('finances', 'Tax, debt and the spending rule are on Public finances →')}
      </p>
    </>
  );
}
