'use client';

import { useEffect, useState } from 'react';
import Select from '@/components/Select.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import Sparkline from '@/components/Sparkline.jsx';
import {
  S, HEADLINE_YEAR, LATE_YEAR, SURPRISE_YEAR, WINDOW_YEARS, FIRST_YEAR, CENTRAL, BOUND, ZETA, SCENARIOS,
  scenarioById, ARMS, ARM_COLOR, result, gap, path, signed, fmt, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';

// Economic effects of the 2028 AI surprise. Every number comes from
// surprise2028.json through surprise.js; a combination not yet solved shows
// "pending".

// Where each scenario's targets come from (docs/uk_calibration.md).
const SOURCE = {
  uk_low: 'OBR Briefing paper 9 J-curve for productivity; labour share from the IMF task mapping',
  uk_central: 'IMF UK Selected Issues 2026 (SIP/2026/072), year 4 of adoption',
  uk_high: 'upper end of OBR Fiscal risks and sustainability, July 2026, Box 4.1',
  korinek: 'Korinek et al. (2026), US “substantial” scenario, Table 3; a US scenario, not a UK calibration',
};
const SCEN_LABEL = { uk_low: 'UK low', uk_central: 'UK central (headline)', uk_high: 'UK high', korinek: 'Korinek US substantial (upper)' };
const OPTIONS = SCENARIOS.map((s) => ({ value: s.id, label: SCEN_LABEL[s.id] || s.label }));

const HEAD_COLS = [
  ['GNI', 'National income (GNI)'],
  ['Y', 'GDP'],
  ['NNI', 'Net national income (NNI)'],
  ['w', 'Wage rate'],
];
const EFFECT_ROWS = [
  { group: 'Demand' },
  { v: 'C', label: 'Consumption', unit: '%' },
  { v: 'I', label: 'Investment', unit: '%' },
  { group: 'Factors' },
  { v: 'K', label: 'Capital stock', unit: '%' },
  { v: 'L', label: 'Labour', unit: '%' },
  { group: 'Prices and shares' },
  { v: 'r_bp', label: 'Interest rate', unit: 'pp', scale: 0.01 },
  { v: 'labour_share_pp', label: 'Labour share', unit: 'pp' },
  { group: 'Public finances' },
  { v: 'tax_gdp_pp', label: 'Tax/GDP', unit: 'pp' },
  { v: 'debt_gdp_pp', label: 'Debt/GDP', unit: 'pp', late: true },
];

function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
}

function CardHead({ eyebrow, takeaway, title }) {
  return (
    <div className="chart-head">
      {eyebrow ? <div className="growth-eyebrow">{eyebrow}</div> : null}
      <h2 className="chart-takeaway">{takeaway}</h2>
      {title ? <p className="chart-subtitle">{title}</p> : null}
    </div>
  );
}

const Zeta = ({ c }) => (
  <>
    &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZETA[c]}
  </>
);

// Lines for one variable: each finished arm, central solid, bound dashed.
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

function GapChart({ sid, v, name }) {
  const series = chartSeries(sid, v);
  return (
    <SvgFigure takeaway={name} title={`% against the no-AI path, ${FIRST_YEAR}–${HEADLINE_YEAR}`}>
      {series.length ? (
        <LineChart
          x={WINDOW_YEARS}
          series={series}
          height={320}
          valueFormat={(x) => signed(x, 2)}
          yUnit="% vs the no-AI path"
          ariaLabel={`${name} against the no-AI path, ${FIRST_YEAR} to ${HEADLINE_YEAR}`}
        />
      ) : (
        <p className="chart-note pending-note">No solve for this scenario yet: pending.</p>
      )}
    </SvgFigure>
  );
}

export default function SurpriseResults() {
  const [sid, setSid] = useState(S.default_scenario);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('s');
    if (q && scenarioById(q)) setSid(q);
  }, []);
  function choose(id) {
    setSid(id);
    const u = new URL(window.location.href);
    u.searchParams.set('s', id);
    window.history.replaceState(null, '', u.toString());
  }
  const scen = scenarioById(sid);

  // Takeaway from signs only, so no figure is stated twice.
  const gT = gap(sid, 'tfp', CENTRAL, 'GNI');
  const yT = gap(sid, 'tfp', CENTRAL, 'Y');
  const wT = gap(sid, 'tfp', CENTRAL, 'w');
  const takeaway =
    gT == null
      ? `The ${SCEN_LABEL[sid]} solves are still running; every figure below shows "pending" until they land.`
      : [
          `With automation and productivity, national income (GNI) ${gT > 0 ? 'rises' : 'falls'} in ${HEADLINE_YEAR}`,
          gT > 0 && yT > gT ? ', by less than GDP' : '',
          wT != null ? `, and the wage rate ${wT < 0 ? 'falls' : 'rises'}.` : '.',
        ].join('');
  const jump = gap(sid, 'tfp', CENTRAL, 'I', SURPRISE_YEAR);

  return (
    <div className="growth-page">
      <div className="meth-intro">
        <h2>Economic effects of a {SURPRISE_YEAR} AI surprise</h2>
        <p className="subtitle">
          National income, GDP, the wage rate and the public finances under each AI scenario, from OG-UK,{' '}
          {FIRST_YEAR}&ndash;{HEADLINE_YEAR}, against the path without AI.
        </p>
      </div>

      <section className="section-card growth-hero">
        <div className="results-toolbar">
          <Select label="Scenario" options={OPTIONS} value={sid} onChange={choose} />
        </div>
        <p className="chart-note scenario-line">
          <b>{SCEN_LABEL[sid]}:</b> labour share {signed(-scen.labour_share_fall_pp, 1)}pp and output at fixed inputs{' '}
          {signed(scen.tfp_gain_pct, 1)}% by {HEADLINE_YEAR}. Source: {SOURCE[sid]}.
        </p>
        <p className="key-point">{takeaway}</p>
        <div className="headline-table-wrap">
          <table className="headline-table">
            <thead>
              <tr>
                <th scope="col">{HEADLINE_YEAR}, % against the no-AI path</th>
                {HEAD_COLS.map(([v, label]) => (
                  <th key={v} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ARMS.map((a) => (
                <tr key={a.id}>
                  <th scope="row">
                    <Sw c={ARM_COLOR[a.id]} />
                    {a.label}
                  </th>
                  {HEAD_COLS.map(([v]) => {
                    const c = gap(sid, a.id, CENTRAL, v);
                    const b = gap(sid, a.id, BOUND, v);
                    return (
                      <td key={v}>
                        <span className={`headline-value${c == null ? ' is-pending' : ''}`}>{fmt(c)}</span>
                        <span className="headline-bound">
                          {a.id === 'ss' && v === 'Y' && c != null ? 'held by construction; ' : ''}
                          closed capital {fmt(b)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-note headline-table-note">
          Large figures: central closure, <Zeta c={CENTRAL} />. Small figures: the closed-capital bound,{' '}
          <Zeta c={BOUND} />, in which no capital is foreign-owned. NNI is GNI less depreciation. The wage rate is per
          efficiency unit of labour, not average earnings. {DONE} of {TOTAL} scenario, arm and closure combinations
          are solved (data built {S.generated_utc.replace('T', ' ')} UTC from commit {S.source_commit}); the rest show
          &ldquo;pending&rdquo;.
        </p>
      </section>

      <section className="section-card">
        <CardHead
          eyebrow="Paths"
          takeaway={`National income and GDP, ${FIRST_YEAR}–${HEADLINE_YEAR}`}
          title="Solid: central closure; dashed: closed-capital bound"
        />
        <div className="grid-2 figure-pair">
          <GapChart sid={sid} v="GNI" name="National income (GNI)" />
          <GapChart sid={sid} v="Y" name="GDP" />
        </div>
        <div className="chart-foot">
          <div className="plot-legend">
            <div className="legend-group">
              {ARMS.map((a) => (
                <span key={a.id} className="legend-item">
                  <Sw c={ARM_COLOR[a.id]} />
                  {a.label}
                  {result(sid, a.id, CENTRAL).status !== 'done' ? ' (pending)' : ''}
                </span>
              ))}
            </div>
            <div className="legend-group">
              <span className="legend-item">
                <Sw c="var(--pe-color-gray-700)" />
                <span>
                  Central (<Zeta c={CENTRAL} />)
                </span>
              </span>
              <span className="legend-item">
                <Sw c="var(--pe-color-gray-700)" dashed />
                <span>
                  Closed capital (<Zeta c={BOUND} />)
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-card">
        <CardHead takeaway="Effect of AI by variable" title={`Central closure, ${HEADLINE_YEAR}, with the ${FIRST_YEAR}–${HEADLINE_YEAR} path`} />
        <div className="impact-table-wrap">
          <table className="effect-table">
            <thead>
              <tr>
                <th>Variable</th>
                {ARMS.map((a) => (
                  <th key={a.id}>
                    <span className="effect-head">
                      <Sw c={ARM_COLOR[a.id]} />
                      {a.label}
                    </span>
                    <span className="effect-sub">
                      {HEADLINE_YEAR} &middot; path {FIRST_YEAR}&ndash;{HEADLINE_YEAR}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EFFECT_ROWS.map((r) =>
                r.group ? (
                  <tr key={r.group} className="group-row">
                    <th colSpan={3}>{r.group}</th>
                  </tr>
                ) : (
                  <tr key={r.v}>
                    <th scope="row" className="effect-row-head">
                      {r.label}
                    </th>
                    {ARMS.map((a) => {
                      const k = r.scale || 1;
                      const p = path(sid, a.id, CENTRAL, r.v);
                      const late = r.late ? gap(sid, a.id, CENTRAL, r.v, LATE_YEAR) : null;
                      return (
                        <td key={a.id} className="effect-cell">
                          {p ? (
                            <div className="effect-inner">
                              <span className="effect-value">
                                {signed(p[p.length - 1] * k)}
                                {r.unit}
                                {late != null ? (
                                  <span className="effect-late">
                                    {LATE_YEAR}: {signed(late * k)}
                                    {r.unit}
                                  </span>
                                ) : null}
                              </span>
                              <Sparkline
                                values={p.map((x) => x * k)}
                                years={WINDOW_YEARS}
                                color={ARM_COLOR[a.id]}
                                unit={r.unit}
                                format={signed}
                              />
                            </div>
                          ) : (
                            <span className="effect-value is-pending">pending</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <div className="effect-foot">
          <div className="chart-note">
            Difference from the no-AI path: % for levels, percentage points for the interest rate, the labour share
            and the tax and debt ratios. Government consumption is a fixed share of GDP until the debt rule starts in{' '}
            {LATE_YEAR}, so debt/GDP keeps moving after {HEADLINE_YEAR} and is shown with its {LATE_YEAR} value.{' '}
            <b>Tax limitation:</b> OG-UK taxes labour and capital income through one income-tax schedule, so the gap
            between their effective rates is about 14pp, against the OBR&rsquo;s 19&ndash;23pp, and employer NICs are
            a flat 15% of labour cost, against a PolicyEngine-UK average of about 11%. Revenue therefore falls too
            little when income shifts from labour to capital.
          </div>
        </div>
      </section>

      <section className="section-card">
        <CardHead takeaway="How the scenarios are run" />
        <ul className="txt-bullets">
          <li>
            <b>Timing.</b> AI arrives as an unanticipated shock at the start of {SURPRISE_YEAR}. Every scenario
            equals the no-AI path in 2026 and 2027, so the charts start from a single {FIRST_YEAR} point. The
            capital share and productivity ramp up over {SURPRISE_YEAR}&ndash;{HEADLINE_YEAR}, reaching full weight
            in {HEADLINE_YEAR}, the headline year.
          </li>
          <li>
            <b>Announcement jump.</b> The model has no adjustment costs, so households and firms re-plan as soon as
            the shock is announced: investment jumps in {SURPRISE_YEAR}
            {jump != null ? ` (${fmt(jump, 1)} with automation and productivity in this scenario, central closure)` : ''}
            .
          </li>
          <li>
            <b>The two arms.</b> Automation + productivity raises the capital share and output at fixed inputs by the
            scenario&rsquo;s amounts. Automation only raises the capital share alone, with productivity solved so
            that {HEADLINE_YEAR} GDP equals the no-AI path.
          </li>
          <li>
            <b>Capital closure.</b> The central closure, <Zeta c={CENTRAL} />, is OG-UK&rsquo;s default for the share
            of extra capital demand met from abroad, not a UK calibration.
          </li>
          <li>
            <b>Reference path.</b> Each gap is against a no-shock restart from {SURPRISE_YEAR} at the same closure,
            which reproduces the OG-UK baseline.
          </li>
        </ul>
      </section>
    </div>
  );
}
