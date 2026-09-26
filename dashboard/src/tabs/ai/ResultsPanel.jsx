'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import HistoricalPaths, { ArmLegend } from '@/tabs/ai/HistoricalPaths.jsx';
import { Cv } from '@/tabs/ai/scenarioStory.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';
import {
  D, YEARS, FIRST_YEAR, LAST, LAST_YEAR, signed, gapAt, growthIncrement, belowIdx,
  US_NAMES, usGap, usGrowthIncrement,
} from '@/tabs/ai/metrics.js';

// Results tab. Every model number is computed from aiScenarios.json through
// metrics.js; the US figures are Anthropic's published Table 3.

// GDP first, then the other five in the context chart, then wages, capital, labour.
const VAR_ORDER = ['Y', 'C', 'I', 'G', 'total_tax_revenue', 'D', 'w', 'K', 'L'];
const LABELS = {
  ...Object.fromEntries(D.vars),
  G: 'Government consumption',
  w: 'Wages',
  D: 'Debt',
};
const OPTIONS = VAR_ORDER.map((v) => ({ value: v, label: LABELS[v] }));
const SHOCKED = ['anthropic_ramp', 'obr_ramp'];

// Line swatch, same vocabulary as the shared .plot-legend.
function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
}

function Kpi({ value, label, sub, color }) {
  return (
    <div className="kpi">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">
        {color ? <Sw c={color} /> : null}
        {label}
      </div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

// Card header: an eyebrow naming the section, the takeaway as the heading,
// and the descriptive title as a subtitle.
function CardHead({ eyebrow, takeaway, title }) {
  return (
    <div className="chart-head">
      {eyebrow ? <div className="growth-eyebrow">{eyebrow}</div> : null}
      <h2 className="chart-takeaway">{takeaway}</h2>
      {title ? <p className="chart-subtitle">{title}</p> : null}
    </div>
  );
}

const pctS = (x, dp = 1) => `${signed(x, dp)}%`;
const range = (xs) => [Math.min(...xs), Math.max(...xs)];

// Effect table: % difference from the no-AI baseline by variable, with a
// 2026-2030 sparkline per scenario.
const SHOCKED_ORDER = ['obr_ramp', 'anthropic_ramp'];
const EFFECT_GROUPS = [
  { title: 'Output and demand', rows: [['Y', 'GDP'], ['C', 'Consumption'], ['I', 'Investment']] },
  { title: 'Factors', rows: [['K', 'Capital stock'], ['L', 'Labour'], ['w', 'Average wage']] },
  { title: 'Public finances', rows: [['total_tax_revenue', 'Tax revenue'], ['D', 'Public debt']] },
  { title: 'Shares and growth', rows: [['sl', 'Labour share'], ['grow', 'GDP growth']] },
].map((g) => ({ ...g, rows: g.rows.map(([key, label]) => ({ key, label, unit: key === 'sl' || key === 'grow' ? 'pp' : '%' })) }));
function effectPath(r, a) {
  if (r.key === 'sl') return YEARS.map((_, i) => (D.sl[a][i] - D.sl.baseline[i]) * 100);
  if (r.key === 'grow') return [NaN, ...D.grow[a].map((g, i) => g - D.grow.baseline[i])];
  return YEARS.map((_, i) => gapAt(a, r.key, i));
}
function Spark({ values, color, unit }) {
  const [hover, setHover] = useState(null);
  const W = 200;
  const PH = 34; // plot height
  const H = PH + 18; // plus ticks and end-year labels
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => Number.isFinite(v));
  const vs = pts.map(([, v]) => v);
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 1e-6) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const sy = (v) => PH - 4 - ((v - lo) / (hi - lo)) * (PH - 8);
  const sx = (i) => 6 + (i * (W - 12)) / (YEARS.length - 1);
  const zeroIn = lo < 0 && hi > 0;
  return (
    <div className="spark">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pts.map(([i, v]) => `${YEARS[i]}: ${signed(v)}${unit}`).join(', ')}>
        {zeroIn ? <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} className="spark-zero" /> : null}
        {YEARS.map((y, i) => (
          <line key={y} x1={sx(i)} x2={sx(i)} y1={PH + 1} y2={PH + 4} className="spark-tick" />
        ))}
        <text x={sx(0)} y={H - 2} className="spark-year" textAnchor="start">
          {YEARS[0]}
        </text>
        <text x={sx(YEARS.length - 1)} y={H - 2} className="spark-year" textAnchor="end">
          {YEARS[YEARS.length - 1]}
        </text>
        <polyline points={pts.map(([i, v]) => `${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="1.8" />
        {pts.map(([i, v]) => (
          <circle
            key={i}
            cx={sx(i)}
            cy={sy(v)}
            r={hover === i ? 4 : 2.6}
            fill={color}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {pts.map(([i]) => (
          <rect
            key={`h${i}`}
            x={sx(i) - 10}
            y={0}
            width={20}
            height={PH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover != null ? (
        <span className="spark-tip" style={{ left: sx(hover), top: sy(values[hover]) }}>
          {YEARS[hover]}: <b>{signed(values[hover])}{unit}</b>
        </span>
      ) : null}
    </div>
  );
}

// CSV of every variable x scenario x year: index level and % gap.
function downloadCsv(e) {
  e.preventDefault();
  const rows = [['variable', 'scenario', 'year', 'index_2026_no_ai_100', 'gap_vs_no_ai_pct']];
  for (const [v, label] of D.vars) {
    for (const a of D.arms) {
      YEARS.forEach((y, i) => rows.push([label, ARM_META[a].label, y, D.idx[a][v][i].toFixed(4), gapAt(a, v, i).toFixed(4)]));
    }
  }
  for (const a of D.arms) {
    YEARS.forEach((y, i) => rows.push(['Labour share (%)', ARM_META[a].label, y, (D.sl[a][i] * 100).toFixed(4), ((D.sl[a][i] - D.sl.baseline[i]) * 100).toFixed(4)]));
  }
  const csv = rows.map((r) => r.map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'uk-ai-scenarios.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function ResultsPanel() {
  const [variable, setVariable] = useState('Y');

  const series = D.arms.map((arm) => ({
    label: ARM_META[arm].label,
    color: ARM_META[arm].color,
    values: D.idx[arm][variable],
  }));
  // One state, two selectors: one at the foot of each chart card.
  const selector = (
    <div className="results-toolbar">
      <Select label="Variable" options={OPTIONS} value={variable} onChange={setVariable} />
    </div>
  );

  // Investment-led gain (referee M10).
  const cBelow = belowIdx('anthropic_ramp', 'C');
  const cBelowThrough = cBelow.length && cBelow.every((v, k) => v === k) ? YEARS[cBelow[cBelow.length - 1]] : null;
  // Automation-only consumption shortfall, as positive % below the baseline, low to high.
  const [cObrLo, cObrHi] = range(YEARS.map((_, i) => -gapAt('obr_ramp', 'C', i)));
  const wagesAlwaysBelow = SHOCKED.every((a) => belowIdx(a, 'w').length === YEARS.length);

  // GDP against the no-AI path: UK lines, US 2030 endpoints in the strip.
  const gapSeries = D.arms.map((arm) => ({
    label: ARM_META[arm].label,
    color: ARM_META[arm].color,
    values: YEARS.map((_, i) => gapAt(arm, 'Y', i)),
  }));
  const ukMaxGap = Math.max(...SHOCKED.map((a) => gapAt(a, 'Y')));
  const gapStrip = {
    title: 'US 2030',
    points: US_NAMES.filter((n) => n !== 'No AI').map((name) => ({
      label: `US ${name}`,
      value: usGap(name),
      color: US_COLORS[name],
      offScale: usGap(name) > 2 * Math.max(ukMaxGap, 1) ? 'high' : undefined,
    })),
  };
  // Where each UK AI scenario falls among the US cases, from the data.
  const usSorted = US_NAMES.filter((n) => n !== 'No AI').map((n) => [n, usGap(n)]).sort((p, q) => p[1] - q[1]);
  const position = (v) => {
    if (v < usSorted[0][1]) return `below US ${usSorted[0][0]}`;
    for (let k = 0; k < usSorted.length - 1; k++) {
      if (v <= usSorted[k + 1][1]) return `between US ${usSorted[k][0]} and US ${usSorted[k + 1][0]}`;
    }
    return `above US ${usSorted[usSorted.length - 1][0]}`;
  };
  const gdpPositionText = `${ARM_META.anthropic_ramp.label} lies ${position(gapAt('anthropic_ramp', 'Y'))}, and ${ARM_META.obr_ramp.label} ${position(gapAt('obr_ramp', 'Y'))}`;

  // Labour share: the two UK AI scenarios share one gamma path, so one line.
  const lsSeries = [
    { label: ARM_META.baseline.label, color: ARM_META.baseline.color, values: D.sl.baseline.map((v) => v * 100) },
    {
      label: 'Both AI scenarios',
      color: ARM_META.anthropic_ramp.color,
      values: D.sl.anthropic_ramp.map((v) => v * 100),
    },
  ];
  const lsStrip = {
    title: 'US 2030',
    points: US_NAMES.map((name) => ({
      label: `US ${name}`,
      value: D.anth[name].lshare,
      color: US_COLORS[name],
      offScale: name === 'Extreme',
    })),
  };

  return (
    <div className="growth-page">
      <div className="meth-intro">
        <h2>Economic effects</h2>
        <p className="subtitle">
          GDP, investment, consumption, wages and the public finances under each AI scenario, from OG-UK,{' '}
          {FIRST_YEAR}&ndash;{LAST_YEAR}.
        </p>
      </div>

      {/* ---- 1. Headline ---- */}
      <section className="section-card growth-hero">
        <CardHead
          eyebrow="Headline"
          takeaway={<>Effects on UK GDP by {LAST_YEAR}</>}
        />
        <div className="kpi-strip">
          <Kpi
            value={pctS(gapAt('anthropic_ramp', 'Y'))}
            label={ARM_META.anthropic_ramp.label}
            sub={`UK GDP against the no-AI baseline, ${LAST_YEAR}`}
            color={ARM_META.anthropic_ramp.color}
          />
          <Kpi
            value={pctS(gapAt('obr_ramp', 'Y'))}
            label={ARM_META.obr_ramp.label}
            sub={`UK GDP against the no-AI baseline, ${LAST_YEAR}`}
            color={ARM_META.obr_ramp.color}
          />
          <Kpi
            value={`${signed(growthIncrement('anthropic_ramp'))}pp`}
            label={`GDP growth in ${LAST_YEAR}`}
            sub={`${ARM_META.anthropic_ramp.label} against the no-AI baseline`}
            color={ARM_META.anthropic_ramp.color}
          />
          <Kpi
            value={
              <>
                {pctS(gapAt('anthropic_ramp', 'K'))}
              </>
            }
            label={`Capital stock, ${LAST_YEAR}`}
            sub={`${ARM_META.anthropic_ramp.label} against the no-AI baseline`}
            color={ARM_META.anthropic_ramp.color}
          />
        </div>
        <p className="key-point">The GDP gain is investment-led, not consumption-led.</p>
        <ul className="txt-bullets headline-bullets">
          <li>
            <b>Investment:</b> {pctS(gapAt('anthropic_ramp', 'I', 0))} above the baseline already in {FIRST_YEAR} (
            {ARM_META.anthropic_ramp.label}).
          </li>
          <li>
            <b>Consumption:</b>{' '}
            {cBelowThrough ? (
              <>
                below the baseline until {cBelowThrough + 1 <= LAST_YEAR ? cBelowThrough + 1 : cBelowThrough} (
                {pctS(gapAt('anthropic_ramp', 'C'))}) with productivity gains;{' '}
              </>
            ) : null}
            {cObrLo.toFixed(1)}&ndash;{cObrHi.toFixed(1)}% below throughout with automation only.
          </li>
          {wagesAlwaysBelow ? (
            <li>
              <b>Wages:</b> below the baseline in every year in both scenarios;{' '}
              {pctS(gapAt('anthropic_ramp', 'w'))} and {pctS(gapAt('obr_ramp', 'w'))} in {LAST_YEAR}.
            </li>
          ) : null}
        </ul>
        <p className="headline-foot">
          OG-UK output. Government spending is a fixed share of GDP (<Cv id="fiscal" />: spending held at baseline
          levels). Definitions and caveats: <a href="#scenarios">Scenario design</a>.
        </p>
      </section>

      {/* ---- 2-3. Results by variable | context since 2000, one selector ---- */}
      <div className="grid-2 results-pair">
        <section className="section-card">
          <CardHead
            eyebrow="By variable"
            takeaway={
              <>
                {LABELS[variable]} by scenario, {FIRST_YEAR}&ndash;{LAST_YEAR}
              </>
            }
            title={<>Index, {FIRST_YEAR} no-AI baseline = 100</>}
          />
          {selector}
          <div className="chart-slot">
            <LineChart x={YEARS} series={series} height={380} ariaLabel={`${LABELS[variable]} index by scenario`} />
          </div>
          <div className="chart-foot">
            <ArmLegend />
            <p className="chart-note">
              The AI scenarios start away from 100 because of anticipation (<Cv id="anticipation" />).
              {variable === 'I' ? (
                <>
                  {' '}
                  The {LAST_YEAR} fall is the end of the ramp, not a forecast (<Cv id="investment" />).
                </>
              ) : null}
              {variable === 'G' ? (
                <>
                  {' '}
                  Government consumption moves with GDP by construction (<Cv id="fiscal" />).
                </>
              ) : null}
            </p>
          </div>
        </section>

        <HistoricalPaths variable={variable} label={LABELS[variable]} selector={selector} />
      </div>

      {/* ---- 4. Against Anthropic's US figures ---- */}
      <section className="section-card">
        <CardHead
          eyebrow="US comparison"
          takeaway="Comparison with Korinek et al. (2026)"
          title={
            <>
              Each country against its own no-AI path; timing and model differences: <Cv id="us" />
            </>
          }
        />
        <p className="chart-note section-lede">
          {gdpPositionText}; GDP growth in {LAST_YEAR} rises by {signed(usGrowthIncrement('Substantial'))}pp in the
          comparable US case (Substantial).
        </p>
        <div className="grid-2 figure-pair">
          <SvgFigure
            takeaway="GDP gain vs US cases"
            title={`% above the no-AI path, ${FIRST_YEAR}–${LAST_YEAR}`}
          >
            <LineChart
              x={YEARS}
              series={gapSeries}
              strip={gapStrip}
              height={340}
              ariaLabel={`GDP against the no-AI path by scenario, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
            />
          </SvgFigure>
          <SvgFigure
            takeaway="Labour share vs US cases"
            title={`% of income, ${FIRST_YEAR}–${LAST_YEAR}`}
          >
            <LineChart
              x={YEARS}
              series={lsSeries}
              strip={lsStrip}
              height={340}
              ariaLabel={`Labour share by scenario, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
            />
          </SvgFigure>
        </div>
        <p className="chart-note">
          Hollow dots: Korinek et al. (2026), Table 3, US, {LAST_YEAR}; US Extreme is off scale. The two UK AI
          scenarios share one labour-share path. The labour-share axis does not start at zero.
        </p>
      </section>


      {/* ---- 5. Effect of AI by variable ---- */}
      <section className="section-card">
        <CardHead takeaway="Effect of AI by variable" />
        <div className="impact-table-wrap">
          <table className="effect-table">
            <thead>
              <tr>
                <th>Variable</th>
                {SHOCKED_ORDER.map((a) => (
                  <th key={a}>
                    <span className="effect-head">
                      <Sw c={ARM_META[a].color} />
                      {ARM_META[a].label}
                    </span>
                    <span className="effect-sub">
                      {LAST_YEAR} &middot; path {FIRST_YEAR}&ndash;{LAST_YEAR}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EFFECT_GROUPS.map((g) => [
                <tr key={g.title} className="group-row">
                  <th colSpan={3}>{g.title}</th>
                </tr>,
                ...g.rows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    {SHOCKED_ORDER.map((a) => {
                      const vals = effectPath(r, a);
                      return (
                        <td key={a} className="effect-cell">
                          <div className="effect-inner">
                            <span className="effect-value">
                              {signed(vals[LAST])}
                              {r.unit}
                            </span>
                            <Spark values={vals} color={ARM_META[a].color} unit={r.unit} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <div className="effect-foot">
          <div className="chart-note">
            <div>
              Difference from the no-AI baseline: % for levels, pp for the labour share and growth. {FIRST_YEAR}{' '}
              values: <Cv id="accounting" />.
            </div>
            <div>
              Government consumption moves one-for-one with GDP by construction (<Cv id="fiscal" />).
            </div>
          </div>
          <a href="#growth" className="csv-link" onClick={downloadCsv}>
            Download CSV
          </a>
        </div>
      </section>
    </div>
  );
}
