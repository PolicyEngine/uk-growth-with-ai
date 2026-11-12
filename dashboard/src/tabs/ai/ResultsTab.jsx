'use client';

import LineChart from '@/components/LineChart.jsx';
import Sparkline from '@/components/Sparkline.jsx';
import ChartCard from '@/components/ab/ChartCard.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { SectionHeading, Note, Notice, Unpublished } from '@/components/ab/Section.jsx';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, result, gap, path, signed, fmt, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';

// Results: the 2031 headline tiles, the GNI and GDP paths and the effect of
// AI by variable. Every number comes from surprise2028.json through
// surprise.js; a combination not yet solved shows "pending", never a zero.
// Each fact is stated once: the 2031 GNI/GDP values are the tiles', so the
// chart end labels name the line only.

const TILES = [
  { v: 'GNI', label: 'National income (GNI)', icon: 'banknote' },
  { v: 'Y', label: 'GDP', icon: 'bars' },
  { v: 'NNI', label: 'Net national income (NNI)', icon: 'layers' },
  { v: 'w', label: 'Wage rate', icon: 'briefcase' },
];

const EFFECT_GROUPS = [
  { group: 'Demand', rows: [
    { v: 'C', label: 'Consumption', unit: '%' },
    { v: 'I', label: 'Investment', unit: '%' },
  ] },
  { group: 'Factors', rows: [
    { v: 'K', label: 'Capital stock', unit: '%' },
    { v: 'L', label: 'Labour', unit: '%' },
  ] },
  { group: 'Prices and shares', rows: [
    { v: 'r_bp', label: 'Interest rate', unit: 'pp', scale: 0.01 },
    { v: 'labour_share_pp', label: 'Labour share', unit: 'pp' },
  ] },
];

function Swatch({ color, dashed }) {
  return <span className={`swatch${dashed ? ' dashed' : ''}`} style={{ borderTopColor: color }} aria-hidden="true" />;
}

function Tile({ sid, arm, t }) {
  const c = gap(sid, arm, CENTRAL, t.v);
  const b = gap(sid, arm, BOUND, t.v);
  const heldAtZero = arm === 'ss' && t.v === 'Y' && c != null;
  return (
    <div className="headline-tile">
      <div className="headline-tile-name">
        <Icon name={t.icon} size={15} />
        <span>{t.label}</span>
      </div>
      <div className={`headline-tile-value${c == null ? ' is-text' : ''}`}>{fmt(c)}</div>
      <div className="headline-tile-sub">closed capital {fmt(b)}</div>
      {heldAtZero ? <div className="headline-tile-meaning">Held at zero by construction</div> : null}
    </div>
  );
}

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

function shape(sid, v) {
  // Direction and shape in words, no figures: the 2031 values are the tiles'.
  const words = ARMS.map((a) => {
    const p = path(sid, a.id, CENTRAL, v);
    if (!p) return null;
    const end = p[p.length - 1];
    const hi = Math.max(...p);
    const top = WINDOW_YEARS[p.indexOf(hi)];
    if (Math.abs(end) < 0.005) return `${a.label}: back at the no-AI path by ${HEADLINE_YEAR}${hi > 0.02 ? `, after a rise to ${top}` : ''}`;
    if (end > 0) return `${a.label}: above the no-AI path in ${HEADLINE_YEAR}${hi > end + 0.02 ? `, after peaking in ${top}` : ', rising through the window'}`;
    return `${a.label}: below the no-AI path in ${HEADLINE_YEAR}${hi > 0.02 ? `, after an early rise to ${top}` : ', falling through the window'}`;
  }).filter(Boolean);
  return words.length ? `${words.join('. ')}.` : 'No solve for this scenario yet.';
}

function GapCard({ sid, v, title }) {
  const series = chartSeries(sid, v);
  return (
    <ChartCard
      icon="trend"
      title={title}
      summary={shape(sid, v)}
      unit={`% against the no-AI path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
      legend={
        series.length ? (
          <div className="legend-chips">
            {series.map((s) => (
              <span key={s.key} className="legend-chip">
                <Swatch color={s.color} dashed={s.dashed} />
                {s.dashed ? `${ARMS.find((a) => s.key.startsWith(a.id)).label}, closed capital` : `${s.label}, central`}
              </span>
            ))}
          </div>
        ) : null
      }
      about={{
        shows: `The gap between each AI scenario and the path without AI, ${FIRST_YEAR}–${HEADLINE_YEAR}. Solid lines use the central capital closure; dashed lines the closed-capital bound. Hover a point for its value.`,
        how: 'Each gap is the percentage difference from a no-shock restart of OG-UK at the same closure. The closures are defined in Scenarios and method.',
        caveats: 'The technology paths are imposed, so the lines show the general-equilibrium consequences of given scenarios, not their likelihood.',
      }}
    >
      {series.length ? (
        <LineChart
          x={WINDOW_YEARS}
          series={series}
          height={300}
          noValue
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

function EffectRows({ sid }) {
  return (
    <div className="effect-rows" role="table" aria-label={`Effect of AI by variable, ${HEADLINE_YEAR}, central closure`}>
      <div className="effect-row effect-row-head" role="row">
        <span role="columnheader">Variable</span>
        {ARMS.map((a) => (
          <span key={a.id} role="columnheader" className="effect-arm-head">
            <Swatch color={ARM_COLOR[a.id]} />
            {a.label}
          </span>
        ))}
      </div>
      {EFFECT_GROUPS.map((g) => (
        <div key={g.group} role="rowgroup" className="effect-group">
          <div className="effect-group-label" role="row">
            <span role="rowheader">{g.group}</span>
          </div>
          {g.rows.map((r, i) => (
            <div key={r.v} className={`effect-row${i % 2 ? '' : ' is-banded'}`} role="row">
              <span className="effect-name" role="rowheader">{r.label}</span>
              {ARMS.map((a) => {
                const k = r.scale || 1;
                const p = path(sid, a.id, CENTRAL, r.v);
                return (
                  <span key={a.id} className="effect-cell" role="cell">
                    <span className="effect-arm-mobile">
                      <Swatch color={ARM_COLOR[a.id]} />
                    </span>
                    {p ? (
                      <>
                        <span className="effect-value">
                          {signed(p[p.length - 1] * k)}
                          {r.unit}
                        </span>
                        <Sparkline values={p.map((x) => x * k)} years={WINDOW_YEARS} color={ARM_COLOR[a.id]} unit={r.unit} format={signed} />
                      </>
                    ) : (
                      <span className="effect-value is-pending">pending</span>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ResultsTab({ sid, onTab }) {
  const gT = gap(sid, 'tfp', CENTRAL, 'GNI');
  const yT = gap(sid, 'tfp', CENTRAL, 'Y');
  const wT = gap(sid, 'tfp', CENTRAL, 'w');
  const takeaway =
    gT == null
      ? 'The solves for this scenario are still running; each figure shows “pending” until they land.'
      : [
          `With automation and productivity, national income (GNI) ${gT > 0 ? 'rises' : 'falls'} by ${HEADLINE_YEAR}`,
          gT > 0 && yT != null && yT > gT ? ', by less than GDP' : '',
          wT != null ? `, and the wage rate ${wT < 0 ? 'falls' : 'rises'}.` : '.',
        ].join('');
  const anyPending = DONE < TOTAL;
  const sidPending = ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done');

  return (
    <>
      <p className="tab-lede">
        The macroeconomic effects of AI on the UK: an unanticipated {SURPRISE_YEAR} AI shock run through OG-UK, the UK
        overlapping-generations model, against the path without AI.
      </p>

      <SectionHeading id="headline" icon="trend" title={`${HEADLINE_YEAR} against the no-AI path`}>
        {takeaway}
      </SectionHeading>
      {anyPending && sidPending ? (
        <Notice>
          {DONE} of {TOTAL} solves done; the rest show “pending”.
        </Notice>
      ) : null}
      <div className="headline-rows">
        {ARMS.map((a) => (
          <div key={a.id} className="headline-row">
            <div className="headline-row-label">
              <Swatch color={ARM_COLOR[a.id]} />
              {a.label}
            </div>
            <div className="headline-tiles">
              {TILES.map((t) => (
                <Tile key={t.v} sid={sid} arm={a.id} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Note>
        % against the no-AI path. Large figures: central closure. Small figures: closed-capital bound.{' '}
        <a href="?tab=method" onClick={(e) => { e.preventDefault(); onTab('method'); }}>
          Closures and terms
        </a>
      </Note>

      <SectionHeading id="paths" icon="trend" title={`National income and GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
        How the gaps build up from the {SURPRISE_YEAR} surprise to the headline year.
      </SectionHeading>
      <div className="charts-grid">
        <GapCard sid={sid} v="GNI" title="National income (GNI)" />
        <GapCard sid={sid} v="Y" title="GDP" />
      </div>

      <div className="charts-stack stack-gap">
        <ChartCard
          icon="bars"
          title={`Effect by variable, ${HEADLINE_YEAR}`}
          summary={`Demand, factors and prices under the central closure: the ${HEADLINE_YEAR} gap and the ${FIRST_YEAR}–${HEADLINE_YEAR} path for each arm. Hover a path for its values.`}
          about={{
            how: 'Difference from the no-AI path: % for levels, percentage points for the interest rate and the labour share. Central closure.',
          }}
        >
          <EffectRows sid={sid} />
        </ChartCard>
      </div>
      <p className="section-link">
        <a href="?tab=finances" onClick={(e) => { e.preventDefault(); onTab('finances'); }}>
          Tax, debt and the spending rule are on Public finances →
        </a>
      </p>
    </>
  );
}
