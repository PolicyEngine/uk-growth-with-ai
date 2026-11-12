'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import HistoricalPaths, { ArmLegend } from '@/tabs/ai/HistoricalPaths.jsx';
import { Cv } from '@/tabs/ai/scenarioStory.jsx';
import CaveatLink from '@/tabs/ai/CaveatLink.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import Sparkline from '@/components/Sparkline.jsx';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';
import { efo, EFO_PAGE } from '@/tabs/ai/links.js';
import {
  D, YEARS, FIRST_YEAR, LAST, LAST_YEAR, signed, gapAt, belowIdx, G1, LS0, LS_FALL, KORINEK,
  US_NAMES, usGap, usGrowthIncrement, ZK, CLOSURE, CL, CL_YEARS, LATE_YEAR, cgap, cpath, HIGH_INFLOW,
  Z_SHARE_SHIFT_YEAR, SHARE_SHIFT_TECH, TG1,
} from '@/tabs/ai/metrics.js';

// Economic effects tab. Every model number is computed from aiScenarios.json through
// metrics.js; the US figures are Anthropic's published Table 3.

// GDP first, then the other five in the context chart, then wages, capital, labour.
const VAR_ORDER = ['Y', 'C', 'I', 'G', 'total_tax_revenue', 'D', 'w', 'K', 'L'];
const LABELS = {
  ...Object.fromEntries(D.vars),
  G: 'Government consumption',
  w: 'Wage rate',
  D: 'Debt',
};
const OPTIONS = VAR_ORDER.map((v) => ({ value: v, label: LABELS[v] }));
const SHOCKED = ['share_shift_tfp_ramp', 'share_shift_ramp'];

// Line swatch, same vocabulary as the shared .plot-legend.
function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
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

// Growth accounting for the 2030 GDP gap, in log points. Exact at epsilon = 1:
// technology (ln(1+tau), the change in output at the fixed baseline 2026
// inputs that the solved Z gives: +3.1% with productivity gains, and Z over
// the fixed-input Z for automation only, whose Z is solved for unchanged 2030
// GDP), the drift of the baseline's K/L since 2026 ((gamma_1 - gamma_0) x its
// log change, common to both arms, #21), capital (gamma_1 x the log capital
// gap) and labour ((1 - gamma_1) x the log labour gap).
const TAU = { share_shift_ramp: SHARE_SHIFT_TECH / 100, share_shift_tfp_ramp: KORINEK.tfp / 100 };
const lgap = (a, v) => Math.log(D.idx[a][v][LAST] / D.idx.baseline[v][LAST]) * 100;
const KL_DRIFT = (G1 - D.assum.gamma_base) * CL.central.baseline.kl_log_change[LAST];
function decomp(a) {
  return { tfp: Math.log(1 + TAU[a]) * 100, capital: G1 * lgap(a, 'K'), labour: (1 - G1) * lgap(a, 'L') };
}
const outputPerLabour = (a) => ((1 + gapAt(a, 'Y') / 100) / (1 + gapAt(a, 'L') / 100) - 1) * 100;

// Effect table: % difference from the OBR-central baseline by variable, with a
// 2026-2030 sparkline per scenario.
const SHOCKED_ORDER = ['share_shift_ramp', 'share_shift_tfp_ramp'];
// GDP, national income and wages are in the headline table, not here.
// Rows other tabs link to.
const ROW_IDS = { dy: 'effect-debt', r: 'effect-rate' };
const PP_ROWS = new Set(['sl', 'grow', 'dy', 'r']);
const EFFECT_GROUPS = [
  { title: 'Demand', rows: [['C', 'Consumption'], ['I', 'Investment']] },
  { title: 'Factors', rows: [['K', 'Capital stock'], ['L', 'Labour']] },
  { title: 'Public finances', rows: [['total_tax_revenue', 'Tax revenue'], ['dy', 'Debt/GDP']] },
  { title: 'Prices, shares and growth', rows: [['r', 'Interest rate'], ['sl', 'Labour share'], ['grow', 'GDP growth']] },
].map((g) => ({ ...g, rows: g.rows.map(([key, label]) => ({ key, label, unit: PP_ROWS.has(key) ? 'pp' : '%' })) }));
function effectPath(r, a) {
  if (r.key === 'sl') return YEARS.map((_, i) => (D.sl[a][i] - D.sl.baseline[i]) * 100);
  if (r.key === 'grow') return [NaN, ...D.grow[a].map((g, i) => g - D.grow.baseline[i])];
  if (r.key === 'dy') return cpath('central', a, 'debt_gdp_pp');
  if (r.key === 'r') return cpath('central', a, 'r_bp').map((x) => x / 100);
  return YEARS.map((_, i) => gapAt(a, r.key, i));
}
const Spark = ({ values, color, unit }) => (
  <Sparkline values={values} years={YEARS} color={color} unit={unit} format={signed} />
);

// CSV: every variable x scenario x year at the central closure (index level
// and gap), then the closure series for both closures over every exported year.
const CLOSURE_VARS = [
  ['Y', 'GDP gap (%)'], ['GNI', 'GNI gap (%)'], ['w', 'Wage gap (%)'],
  ['debt_gdp_pp', 'Debt/GDP gap (pp)'], ['r_bp', 'Interest rate gap (bp)'],
  ['foreign_share_K', 'Foreign-owned share of extra capital (%)'],
];
function downloadCsv(e) {
  e.preventDefault();
  const zk = (c) => `zeta_K=${ZK[c]}`;
  const rows = [['variable', 'scenario', 'closure', 'year', 'index_2026_baseline_100', 'gap_vs_baseline']];
  for (const [v, label] of D.vars) {
    for (const a of D.arms) {
      YEARS.forEach((y, i) => rows.push([label, ARM_META[a].label, zk('central'), y, D.idx[a][v][i].toFixed(4), gapAt(a, v, i).toFixed(4)]));
    }
  }
  for (const a of D.arms) {
    YEARS.forEach((y, i) => rows.push(['Labour share (%)', ARM_META[a].label, zk('central'), y, (D.sl[a][i] * 100).toFixed(4), ((D.sl[a][i] - D.sl.baseline[i]) * 100).toFixed(4)]));
  }
  for (const c of ['central', 'bound']) {
    for (const a of SHOCKED) {
      for (const [v, label] of CLOSURE_VARS) {
        CL_YEARS.forEach((y, i) => {
          const x = CL[c].arms[a][v][i];
          rows.push([label, ARM_META[a].label, zk(c), y, '', x == null ? '' : x.toFixed(4)]);
        });
      }
    }
  }
  const csv = rows.map((r) => r.map((c) => (/[",]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'uk-ai-scenarios.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// Headline table: one row per AI scenario; each cell gives the central
// closure's 2030 gap and, below it, the closed-capital bound's.
const HEAD_COLS = [
  ['GNI', 'National income (GNI)'],
  ['Y', 'GDP'],
  ['w', 'Wage rate'],
];
// Automation only: 2030 GDP is the target its Z is solved for (both closures).
const isTarget = (a, v) => a === 'share_shift_ramp' && v === 'Y';

// The four lines of a closure chart: central solid, bound dashed.
function closureSeries(v) {
  return SHOCKED.flatMap((a) => [
    { key: `${a}-c`, label: ARM_META[a].label, color: ARM_META[a].color, values: cpath('central', a, v) },
    { key: `${a}-b`, label: `ζK = ${ZK.bound}:`, color: ARM_META[a].color, dashed: true, values: cpath('bound', a, v) },
  ]);
}

function ClosureLegend() {
  return (
    <div className="plot-legend">
      <div className="legend-group">
        {SHOCKED.map((a) => (
          <span key={a} className="legend-item">
            <Sw c={ARM_META[a].color} />
            {ARM_META[a].label}
          </span>
        ))}
      </div>
      <div className="legend-group">
        <span className="legend-item">
          <Sw c="var(--pe-color-gray-700)" />
          <span>
            &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.central}, central
          </span>
        </span>
        <span className="legend-item">
          <Sw c="var(--pe-color-gray-700)" dashed />
          <span>
            &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.bound}, closed-capital bound
          </span>
        </span>
      </div>
    </div>
  );
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

  const cBelow = belowIdx('share_shift_tfp_ramp', 'C');
  const cBelowThrough = cBelow.length && cBelow.every((v, k) => v === k) ? YEARS[cBelow[cBelow.length - 1]] : null;
  const cObrAlwaysBelow = belowIdx('share_shift_ramp', 'C').length === YEARS.length;

  // Foreign-owned share of the extra capital, 2030, central closure.
  const foreign = (a) => cgap('central', a, 'foreign_share_K');
  const wageSign = (x) => (x < 0 ? 'lower' : 'higher');
  const wTfpC = cgap('central', 'share_shift_tfp_ramp', 'w');
  const wTfpB = cgap('bound', 'share_shift_tfp_ramp', 'w');
  const wSsBelowBoth = ['central', 'bound'].every((c) => cgap(c, 'share_shift_ramp', 'w') < 0);

  // US 2030 endpoints, drawn on the GDP chart.
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
  const gdpPositionText = `On GDP in ${LAST_YEAR} at the central closure, ${ARM_META.share_shift_tfp_ramp.label} lies ${position(gapAt('share_shift_tfp_ramp', 'Y'))}, and ${ARM_META.share_shift_ramp.label} ${position(gapAt('share_shift_ramp', 'Y'))}`;

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
  const fmtSigned = (v) => signed(v);

  return (
    <div className="growth-page">
      <div className="meth-intro">
        <h2>Economic effects</h2>
        <p className="subtitle">
          National income, GDP, the wage rate, investment and the public finances under each AI scenario, from OG-UK,{' '}
          {FIRST_YEAR}&ndash;{LAST_YEAR}.
        </p>
      </div>

      {/* ---- 1. Headline: GNI first, GDP beside it, the closed-capital bound under each ---- */}
      <section className="section-card growth-hero">
        <p className="key-point">
          National income rises by less than GDP, because most of the extra capital is foreign-owned and its return
          is paid abroad.
        </p>
        <div className="headline-table-wrap">
          <table className="headline-table">
            <thead>
              <tr>
                <th scope="col">{LAST_YEAR}, % against the OBR-central baseline</th>
                {HEAD_COLS.map(([v, label]) => (
                  <th key={v} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHOCKED.map((a) => (
                <tr key={a}>
                  <th scope="row">
                    <Sw c={ARM_META[a].color} />
                    {ARM_META[a].label}
                  </th>
                  {HEAD_COLS.map(([v]) => (
                    <td key={v}>
                      <span className="headline-value">{pctS(cgap('central', a, v))}</span>
                      <span className="headline-bound">
                        {isTarget(a, v) ? (
                          <>by construction</>
                        ) : (
                          <>
                            {pctS(cgap('bound', a, v))} at &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.bound}
                          </>
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-note headline-table-note">
          The wage rate is per efficiency unit of labour, not average earnings. Large figures: the central closure, &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.central}, OG-UK&rsquo;s default and
          not a UK calibration, with &zeta;<sub>D</sub>&nbsp;=&nbsp;{CLOSURE.zeta_D} and a{' '}
          {(CLOSURE.world_int_rate_annual * 100).toFixed(0)}% world interest rate (<Cv id="financing" />). Small
          figures: the closed-capital bound, &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.bound}, in which no capital is
          foreign-owned.
        </p>
        <ul className="txt-bullets headline-bullets">
          <li>
            <b>Ownership.</b> At &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.central}, {foreign('share_shift_tfp_ramp').toFixed(0)}% (
            {ARM_META.share_shift_tfp_ramp.label}) and {foreign('share_shift_ramp').toFixed(0)}% (
            {ARM_META.share_shift_ramp.label}) of the extra capital in {LAST_YEAR} is foreign-owned, about three
            quarters, so GNI is below GDP. In the bound the gap between them is only the interest paid on
            foreign-held gilts.
          </li>
          <li>
            <b>Automation only</b> holds GDP at the baseline&rsquo;s level in {Z_SHARE_SHIFT_YEAR} by construction:
            its Z is solved for that (<a href="#scenarios">Scenario design</a>). GDP differs from the baseline in
            other years (<Cv id="anticipation" />).
          </li>
          <li>
            <b>Wage rate.</b> With productivity gains its sign depends on the closure: it is{' '}
            {wageSign(wTfpC) === wageSign(wTfpB)
              ? `${wageSign(wTfpC)} at both closures in the table`
              : `${wageSign(wTfpC)} at ζK = ${ZK.central} and ${wageSign(wTfpB)} at ${ZK.bound}`}
            , but {pctS(HIGH_INFLOW.w_gap_2030)} with a high-inflow closure (&zeta;<sub>K</sub>&nbsp;=&nbsp;
            {HIGH_INFLOW.zeta_K}; a solve from before the corrective reruns, so not like for like).
            {wSsBelowBoth ? ' With automation only it is lower at both closures.' : null}
          </li>
          <li>
            <b>{FIRST_YEAR} gaps are anticipation</b> under perfect foresight: &gamma; and Z are still at baseline
            values, yet investment is already {pctS(gapAt('share_shift_tfp_ramp', 'I', 0))} above the baseline with
            productivity gains (<Cv id="anticipation" />).
          </li>
          <li>
            <b>Consumption</b>{' '}
            {cBelowThrough ? (
              <>stays below the baseline until {Math.min(cBelowThrough + 1, LAST_YEAR)} with productivity gains, and </>
            ) : null}
            {cObrAlwaysBelow ? 'below it throughout with automation only.' : 'moves above the baseline with automation only.'}
          </li>
        </ul>
        <p className="headline-foot">
          OG-UK output. Government spending is a fixed share of GDP (<Cv id="fiscal" />). Definitions and caveats:{' '}
          <a href="#scenarios">Scenario design</a>.
        </p>
      </section>

      {/* ---- 2. GNI and GDP paths at both closures ---- */}
      <section className="section-card">
        <CardHead
          eyebrow="By closure"
          takeaway={`National income and GDP, ${FIRST_YEAR}–${LAST_YEAR}`}
          title="% above the OBR-central baseline; solid: central closure, dashed: closed-capital bound"
        />
        <div className="grid-2 figure-pair">
          <SvgFigure takeaway="National income (GNI)" title={`% above the baseline path, ${FIRST_YEAR}–${LAST_YEAR}`}>
            <LineChart
              x={YEARS}
              series={closureSeries('GNI')}
              height={340}
              valueFormat={fmtSigned}
              yUnit="% vs the baseline path"
              ariaLabel={`GNI against the baseline path by scenario and closure, ${FIRST_YEAR} to ${LAST_YEAR}`}
            />
          </SvgFigure>
          <SvgFigure takeaway="GDP, with US cases" title={`% above the baseline path, ${FIRST_YEAR}–${LAST_YEAR}`}>
            <LineChart
              x={YEARS}
              series={closureSeries('Y')}
              strip={gapStrip}
              height={340}
              valueFormat={fmtSigned}
              yUnit="% vs the baseline path"
              ariaLabel={`GDP against the baseline path by scenario and closure, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
            />
          </SvgFigure>
        </div>
        <div className="chart-foot">
          <ClosureLegend />
          <p className="chart-note">
            Hollow dots on the GDP chart: Korinek et al. (2026), Table 3, US, {LAST_YEAR}; US Extreme is off scale
            (<Cv id="us" />). The {FIRST_YEAR} gaps are anticipation (<Cv id="anticipation" />).
          </p>
        </div>
      </section>

      {/* ---- 3. Effect of AI by variable: the home of every other number ---- */}
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
                  <tr key={r.key} id={ROW_IDS[r.key]}>
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
                              {r.key === 'dy' ? (
                                <span className="effect-late">
                                  {LATE_YEAR}: {signed(cgap('central', a, 'debt_gdp_pp', LATE_YEAR))}pp
                                </span>
                              ) : null}
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
              Difference from the OBR-central baseline at &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.central}: % for levels,
              pp for debt/GDP, the interest rate, the labour share and growth. GDP, national income and the wage rate
              are in the headline table. Debt/GDP gaps keep moving after {LAST_YEAR}, because debt targeting starts only in{' '}
              {FIRST_YEAR + TG1} (<Cv id="fiscal" />), so each is shown with its {LATE_YEAR} value.
            </div>
          </div>
          <a href="#growth" className="csv-link" onClick={downloadCsv}>
            Download CSV
          </a>
        </div>
        <h3 className="reading-head">Reading the results</h3>
        <ul className="txt-bullets reading-list">
          <li>
            <b>Sources of the GDP gap</b> (log points, {LAST_YEAR}): with productivity gains,{' '}
            {signed(decomp('share_shift_tfp_ramp').tfp)} from technology at fixed inputs and{' '}
            {signed(decomp('share_shift_tfp_ramp').capital)} from capital, {signed(decomp('share_shift_tfp_ramp').labour)}{' '}
            from labour input; with automation only, {signed(decomp('share_shift_ramp').tfp)} from technology at fixed
            inputs (the Z that holds {Z_SHARE_SHIFT_YEAR} GDP at the baseline&rsquo;s), {signed(decomp('share_shift_ramp').capital)}{' '}
            from capital and {signed(decomp('share_shift_ramp').labour)} from labour input. Both also carry{' '}
            {signed(KL_DRIFT)} because the baseline&rsquo;s capital per worker has moved since {FIRST_YEAR}, the year
            the technology targets are set at.
          </li>
          <li>
            <b>The wage rate</b> follows the labour share and output per unit of labour: the labour share falls by{' '}
            {((LS_FALL / LS0) * 100).toFixed(1)}% in proportion, while output per unit of labour changes by{' '}
            {signed(outputPerLabour('share_shift_ramp'))}% with automation only and{' '}
            {signed(outputPerLabour('share_shift_tfp_ramp'))}% with productivity gains. With productivity gains the
            two nearly offset, so the closure, through how much capital arrives, decides the sign.
          </li>
          <li>
            <b>Tax revenue</b> falls with automation only while GDP is unchanged in {LAST_YEAR}, because income
            shifts from labour to capital: the direction of the OBR&rsquo;s &ldquo;less tax-rich&rdquo; finding in{' '}
            <a href={efo(EFO_PAGE.box22)} target="_blank" rel="noreferrer">
              Box 2.2
            </a>
            .
          </li>
        </ul>
      </section>

      {/* ---- 4-5. Results by variable | context since 2000, one selector ---- */}
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
              valueFormat={(v) => v.toFixed(2)}
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
              {variable === 'D' ? (
                <>
                  {' '}
                  Debt/GDP gaps change after {LAST_YEAR}; their {LATE_YEAR} values are in the{' '}
                  <CaveatLink tab="growth" id="effect-debt">effect table</CaveatLink>.
                </>
              ) : null}
            </p>
          </div>
        </section>

        <HistoricalPaths variable={variable} label={LABELS[variable]} selector={selector} />
      </div>

      {/* ---- 6. Against Anthropic's US figures ---- */}
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
          {gdpPositionText} (GDP chart above); GDP growth in {LAST_YEAR} rises by{' '}
          {signed(usGrowthIncrement('Substantial'))}pp in the comparable US case (Substantial).
        </p>
        <SvgFigure takeaway="Labour share vs US cases" title={`% of income, ${FIRST_YEAR}–${LAST_YEAR}`}>
          <LineChart
            x={YEARS}
            series={lsSeries}
            strip={lsStrip}
            height={340}
            yUnit="Labour share (% of income)"
            ariaLabel={`Labour share by scenario, ${FIRST_YEAR} to ${LAST_YEAR}, with US 2030 endpoints`}
          />
        </SvgFigure>
        <p className="chart-note">
          Hollow dots: Korinek et al. (2026), Table 3, US, {LAST_YEAR}; US Extreme is off scale. The two UK AI
          scenarios share one labour-share path. The axis does not start at zero.
        </p>
      </section>
    </div>
  );
}
