'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import HistoricalPaths, { ArmLegend } from '@/tabs/ai/HistoricalPaths.jsx';
import { Cv } from '@/tabs/ai/scenarioStory.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import Sparkline from '@/components/Sparkline.jsx';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';
import { efo, EFO_PAGE } from '@/tabs/ai/links.js';
import {
  D, YEARS, FIRST_YEAR, LAST, LAST_YEAR, signed, gapAt, growthIncrement, belowIdx, G1, LS0, LS_FALL, KORINEK,
  US_NAMES, usGap, usGrowthIncrement,
} from '@/tabs/ai/metrics.js';

// Economic effects tab. Every model number is computed from aiScenarios.json through
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
const SHOCKED = ['share_shift_tfp_ramp', 'share_shift_ramp'];

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

// Growth accounting for the 2030 GDP gap, in log points: TFP (ln(1+tau), the
// fixed-input gain the scenario is calibrated to), capital (gamma_1 x the
// log capital gap) and labour ((1 - gamma_1) x the log labour gap).
const TAU = { share_shift_ramp: 0, share_shift_tfp_ramp: KORINEK.tfp / 100 };
const lgap = (a, v) => Math.log(D.idx[a][v][LAST] / D.idx.baseline[v][LAST]) * 100;
function decomp(a) {
  return { tfp: Math.log(1 + TAU[a]) * 100, capital: G1 * lgap(a, 'K'), labour: (1 - G1) * lgap(a, 'L') };
}
const outputPerLabour = (a) => ((1 + gapAt(a, 'Y') / 100) / (1 + gapAt(a, 'L') / 100) - 1) * 100;

// Effect table: % difference from the OBR-central baseline by variable, with a
// 2026-2030 sparkline per scenario.
const SHOCKED_ORDER = ['share_shift_ramp', 'share_shift_tfp_ramp'];
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
const Spark = ({ values, color, unit }) => (
  <Sparkline values={values} years={YEARS} color={color} unit={unit} format={signed} />
);

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
  const cBelow = belowIdx('share_shift_tfp_ramp', 'C');
  const cBelowThrough = cBelow.length && cBelow.every((v, k) => v === k) ? YEARS[cBelow[cBelow.length - 1]] : null;
  const cObrAlwaysBelow = belowIdx('share_shift_ramp', 'C').length === YEARS.length;
  const wagesAlwaysBelow = SHOCKED.every((a) => belowIdx(a, 'w').length === YEARS.length);

  // GDP against the baseline path: UK lines, US 2030 endpoints in the strip.
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
  const gdpPositionText = `${ARM_META.share_shift_tfp_ramp.label} lies ${position(gapAt('share_shift_tfp_ramp', 'Y'))}, and ${ARM_META.share_shift_ramp.label} ${position(gapAt('share_shift_ramp', 'Y'))}`;

  // Labour share: the two UK AI scenarios share one gamma path, so one line.
  const lsSeries = [
    { label: ARM_META.baseline.label, color: ARM_META.baseline.color, values: D.sl.baseline.map((v) => v * 100) },
    {
      label: 'Both AI scenarios',
      color: ARM_META.share_shift_tfp_ramp.color,
      values: D.sl.share_shift_tfp_ramp.map((v) => v * 100),
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
        <div className="kpi-strip">
          <Kpi
            value={pctS(gapAt('share_shift_tfp_ramp', 'Y'))}
            label={ARM_META.share_shift_tfp_ramp.label}
            sub={`UK GDP against the OBR-central baseline, ${LAST_YEAR}`}
            color={ARM_META.share_shift_tfp_ramp.color}
          />
          <Kpi
            value={pctS(gapAt('share_shift_ramp', 'Y'))}
            label={ARM_META.share_shift_ramp.label}
            sub={`UK GDP against the OBR-central baseline, ${LAST_YEAR}`}
            color={ARM_META.share_shift_ramp.color}
          />
          <Kpi
            value={`${signed(growthIncrement('share_shift_tfp_ramp'))}pp`}
            label={`GDP growth in ${LAST_YEAR}`}
            sub={`${ARM_META.share_shift_tfp_ramp.label} against the OBR-central baseline`}
            color={ARM_META.share_shift_tfp_ramp.color}
          />
          <Kpi
            value={pctS(gapAt('share_shift_tfp_ramp', 'K'))}
            label={`Capital stock, ${LAST_YEAR}`}
            sub={`${ARM_META.share_shift_tfp_ramp.label} against the OBR-central baseline`}
            color={ARM_META.share_shift_tfp_ramp.color}
          />
        </div>
        <p className="key-point">The GDP gain is investment-led, not consumption-led.</p>
        <ul className="txt-bullets headline-bullets">
          <li>
            <b>Investment jumps first:</b> already {pctS(gapAt('share_shift_tfp_ramp', 'I', 0))} above the baseline in{' '}
            {FIRST_YEAR} with productivity gains.
          </li>
          <li>
            <b>Consumption</b>{' '}
            {cBelowThrough ? (
              <>stays below the baseline until {Math.min(cBelowThrough + 1, LAST_YEAR)} with productivity gains, and </>
            ) : null}
            {cObrAlwaysBelow ? 'below it throughout with automation only.' : 'moves above the baseline with automation only.'}
          </li>
          {wagesAlwaysBelow ? (
            <li>
              <b>Wages</b> are below the baseline in every year in both scenarios.
            </li>
          ) : null}
        </ul>
        <p className="headline-foot">
          OG-UK output. Government spending is a fixed share of GDP (<Cv id="fiscal" />: spending held at baseline
          levels). How the added capital is financed: <Cv id="financing" />. Definitions and caveats:{' '}
          <a href="#scenarios">Scenario design</a>.
        </p>
      </section>

      {/* ---- 2. Effect of AI by variable: the home of every number ---- */}
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
                    <th scope="row" className="effect-row-head">
                      {r.label}
                    </th>
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
              Difference from the OBR-central baseline: % for levels, pp for the labour share and growth. {FIRST_YEAR}{' '}
              values: <Cv id="accounting" />.
            </div>
          </div>
          <a href="#growth" className="csv-link" onClick={downloadCsv}>
            Download CSV
          </a>
        </div>
        <h3 className="reading-head">Reading the results</h3>
        <ul className="txt-bullets reading-list">
          <li>
            <b>Sources of the GDP gain</b> (log points, {LAST_YEAR}): with productivity gains,{' '}
            {decomp('share_shift_tfp_ramp').tfp.toFixed(1)} from TFP and {decomp('share_shift_tfp_ramp').capital.toFixed(1)} from
            capital deepening, less {Math.abs(decomp('share_shift_tfp_ramp').labour).toFixed(1)} from lower labour input;
            with automation only, {decomp('share_shift_ramp').capital.toFixed(1)} from capital deepening, less{' '}
            {Math.abs(decomp('share_shift_ramp').labour).toFixed(1)} from labour input.
          </li>
          <li>
            <b>Wages</b> follow the labour share and output per unit of labour: the labour share falls by{' '}
            {((LS_FALL / LS0) * 100).toFixed(1)}% in proportion, while output per unit of labour rises{' '}
            {outputPerLabour('share_shift_ramp').toFixed(1)}% with automation only and {outputPerLabour('share_shift_tfp_ramp').toFixed(1)}%
            with productivity gains, so wages fall with automation only and change little with productivity gains.
          </li>
          <li>
            <b>Tax revenue</b> barely moves with automation only although GDP rises, because income shifts from
            labour to capital: the direction of the OBR&rsquo;s &ldquo;less tax-rich&rdquo; finding in{' '}
            <a href={efo(EFO_PAGE.box22)} target="_blank" rel="noreferrer">
              Box 2.2
            </a>
            .
          </li>
        </ul>
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
            title={<>Index, {FIRST_YEAR} OBR-central baseline = 100</>}
          />
          {selector}
          <div className="chart-slot">
            <LineChart
              x={YEARS}
              series={series}
              height={380}
              yUnit={`Index (${FIRST_YEAR} baseline = 100)`}
              ariaLabel={`${LABELS[variable]} index by scenario`}
            />
          </div>
          <div className="chart-foot">
            <ArmLegend />
            <p className="chart-note">
              The vertical axis does not start at zero. The AI scenarios start away from 100 because of
              anticipation (<Cv id="anticipation" />).
              {variable === 'I' ? (
                <>
                  {' '}
                  The early rise is anticipation (<Cv id="investment" />); the {LAST_YEAR} fall is the end of the
                  ramp (<Cv id="ramp-end" />).
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
              Each country against its own baseline; timing and model differences: <Cv id="us" />
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
            title={`% above the baseline path, ${FIRST_YEAR}–${LAST_YEAR}`}
          >
            <LineChart
              x={YEARS}
              series={gapSeries}
              strip={gapStrip}
              height={340}
              yUnit="% vs the baseline path"
              ariaLabel={`GDP against the baseline path by scenario, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
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
              yUnit="Labour share (% of income)"
              ariaLabel={`Labour share by scenario, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
            />
          </SvgFigure>
        </div>
        <p className="chart-note">
          Hollow dots: Korinek et al. (2026), Table 3, US, {LAST_YEAR}; US Extreme is off scale. The two UK AI
          scenarios share one labour-share path. The labour-share axis does not start at zero.
        </p>
      </section>

    </div>
  );
}
