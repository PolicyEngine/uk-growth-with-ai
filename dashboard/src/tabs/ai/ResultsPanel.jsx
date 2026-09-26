'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import HistoricalPaths from '@/tabs/ai/HistoricalPaths.jsx';
import CaveatLink from '@/tabs/ai/CaveatLink.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import DotPlot from '@/components/DotPlot.jsx';
import FIGURE_SVGS from '@/data/aiFigureSvgs.js';
import D from '@/data/aiScenarios.json';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';

// One window for every UK-only number on the page: 2026-2029. OG-UK sets
// tG1 = 4, so in 2030 (period 4) government spending switches to a
// debt-targeting rule and investment absorbs it as the residual; 2030
// Government and Investment are artefacts of that rule, not results.
// The only 2030 numbers left are the comparisons with Anthropic, whose
// Table 3 publishes 2030 endpoints only. GDP and the labour share are
// smooth through 2030.
const LAST = 3; // index of 2029 in D.years
const YEAR = D.years[LAST];
const WINDOW = D.years.slice(0, LAST + 1);
const GROW_2029 = LAST - 1; // D.grow starts at 2027
const GROW_2030 = LAST;


// The six HistoricalPaths also shows, then wages, capital and labour.
const VAR_ORDER = ['Y', 'C', 'I', 'G', 'total_tax_revenue', 'D', 'w', 'K', 'L'];
const LABELS = Object.fromEntries(D.vars);
const OPTIONS = VAR_ORDER.map((v) => ({ value: v, label: LABELS[v] }));

const gapAt = (arm, v, i) => (D.idx[arm][v][i] / D.idx.baseline[v][i] - 1) * 100;
const signed = (x, dp = 1) => `${x >= 0 ? '+' : ''}${x.toFixed(dp)}`;

// Line swatch, same vocabulary as the shared .plot-legend.
function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
}

// Numbered caveat link: every footnote on the page points at one caveat id.
function Cv({ id, n }) {
  return <CaveatLink id={`caveat-${id}`}>caveat {n}</CaveatLink>;
}

// One stat tile in the KPI strip. Every value is one the page already
// renders elsewhere (headline, summary table), built with the same helpers.
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

export default function ResultsPanel() {
  const [variable, setVariable] = useState('Y');

  const series = D.arms.map((arm) => ({
    label: ARM_META[arm].label,
    color: ARM_META[arm].color,
    values: D.idx[arm][variable].slice(0, LAST + 1),
  }));
  const gap = gapAt('anthropic_ramp', variable, LAST);

  const Y = (arm, i = LAST) => D.idx[arm].Y[i].toFixed(1);
  const g = (arm, i = GROW_2029) => D.grow[arm][i].toFixed(2);
  const sl = (arm, i = LAST) => (D.sl[arm][i] * 100).toFixed(1);

  const uk = (arm) => ({ label: ARM_META[arm].label, value: D.idx[arm].Y[4], color: ARM_META[arm].color, strong: true });
  const us = (name) => ({ label: `US, Anthropic ${name}`, value: D.anth[name].idx2030, color: US_COLORS[name], hollow: true });

  // Labour share: the two UK scenarios share one gamma path and are
  // identical to one decimal place, so they are drawn as one line.
  const lsSeries = [
    { label: ARM_META.baseline.label, color: ARM_META.baseline.color, values: D.sl.baseline.map((v) => v * 100) },
    {
      label: 'UK, both scenarios',
      sublabel: 'OBR = Anthropic (same γ path)',
      color: ARM_META.anthropic_ramp.color,
      values: D.sl.anthropic_ramp.map((v) => v * 100),
    },
  ];
  const lsStrip = {
    title: 'US 2030',
    points: Object.entries(D.anth).map(([name, v]) => ({
      label: `US ${name}`,
      value: v.lshare,
      color: US_COLORS[name],
      offScale: name === 'Extreme',
    })),
  };

  return (
    <div className="growth-page">
      {/* ---- 1. Headline: takeaway, KPI strip, the three findings ---- */}
      <section className="section-card growth-hero">
        <CardHead
          eyebrow={<>Headline &middot; UK, 2026&ndash;{YEAR}</>}
          takeaway={
            <>
              Anthropic&rsquo;s substantial scenario adds {gapAt('anthropic_ramp', 'Y', LAST).toFixed(1)}% to UK
              GDP by {YEAR}
            </>
          }
        />
        <div className="kpi-strip">
          <Kpi
            value={`${signed(gapAt('anthropic_ramp', 'Y', LAST))}%`}
            label="Anthropic substantial"
            sub={`UK GDP against the no-AI baseline, ${YEAR}`}
            color={ARM_META.anthropic_ramp.color}
          />
          <Kpi
            value={`${signed(gapAt('obr_ramp', 'Y', LAST))}%`}
            label="OBR displacement"
            sub={`UK GDP against the no-AI baseline, ${YEAR}`}
            color={ARM_META.obr_ramp.color}
          />
          <Kpi
            value={
              <>
                {Y('anthropic_ramp', 4)} <span className="kpi-vs">vs</span> {D.anth.Substantial.idx2030.toFixed(1)}
              </>
            }
            label="GDP index at 2030, UK vs US"
            sub="UK Anthropic substantial against Anthropic's US Substantial (2026 = 100)"
          />
          <Kpi
            value={
              <>
                {sl('anthropic_ramp', 0)}% <span className="kpi-vs">&rarr;</span> {sl('anthropic_ramp', 4)}%
              </>
            }
            label="Labour share, 2026 to 2030"
            sub="Both UK scenarios (same γ path)"
          />
        </div>
        <ul className="headline-list">
          <li>
            By <b>{YEAR}</b>, UK GDP under Anthropic&rsquo;s <b>substantial</b> scenario is{' '}
            <b>{Y('anthropic_ramp')}</b> (2026 = 100) against <b>{Y('baseline')}</b> with no AI —{' '}
            <b>{signed(gapAt('anthropic_ramp', 'Y', LAST))}%</b>, growing <b>{g('anthropic_ramp')}%</b> a
            year against {g('baseline')}%.
          </li>
          <li>
            The OBR-based <b>technological-displacement</b> scenario, with Z set for no productivity
            gain at fixed inputs, still reaches {Y('obr_ramp')} ({signed(gapAt('obr_ramp', 'Y', LAST))}%)
            through capital deepening, growing {g('obr_ramp')}%.
          </li>
          <li>
            Against Anthropic&rsquo;s own US figures — published for <b>2030 only</b> — UK GDP reaches{' '}
            <b>{Y('anthropic_ramp', 4)}</b> by 2030 against their US <b>{D.anth.Substantial.idx2030.toFixed(1)}</b>,
            and grows {g('anthropic_ramp', GROW_2030)}% against {D.anth.Substantial.growth.toFixed(1)}%.
            This page does not decompose that gap.
          </li>
        </ul>
        <p className="headline-foot">
          All figures are 1-sector OG-UK output. Read them with <CaveatLink id="ai-step-8">caveats 1&ndash;4</CaveatLink>,
          which affect every number &mdash; including that the shocked arms also change fiscal policy{' '}
          (<Cv id="fiscal" n={1} />). What each scenario assumes, and all ten caveats, are under{' '}
          <a href="#growth/method">How the scenarios are built</a>.
        </p>
      </section>

      {/* ---- 2. Results by variable: the index chart, full width ---- */}
      <section className="section-card">
        <CardHead
          eyebrow="Results by variable"
          takeaway={
            <>
              {LABELS[variable]}: <span className={gap < 0 ? 'neg' : 'pos'}>{signed(gap)}%</span> under Anthropic
              substantial against the no-AI baseline by {YEAR}
            </>
          }
          title={<>Every variable against the no-AI baseline, 2026&ndash;{YEAR} &middot; index, 2026 no-AI baseline = 100</>}
        />
        <div className="results-toolbar">
          <Select label="Variable" options={OPTIONS} value={variable} onChange={setVariable} />
        </div>
        <LineChart x={WINDOW} series={series} height={380} ariaLabel={`${LABELS[variable]} index by scenario`} />
        <p className="chart-note">
          UK model output only; Anthropic publishes nothing comparable for these variables. Covers wages,
          capital and labour as well as the six variables in the context chart below. The shocked arms do
          not start at exactly 100 (<Cv id="anticipation" n={6} />). Window ends {YEAR} &mdash; see{' '}
          <Cv id="window" n={5} />.
        </p>
      </section>

      {/* ---- 3. Context: 2000-2029 levels (Plotly, full width) ---- */}
      <HistoricalPaths />

      {/* ---- 4. Against Anthropic's US figures: dot plot | labour share ---- */}
      <section className="section-card">
        <CardHead
          eyebrow="Against Anthropic's US figures, 2030"
          takeaway="The UK gains less GDP than Anthropic's US Substantial case for the same labour-share fall"
          title={
            <>
              The one place this page uses 2030: Anthropic&rsquo;s Table 3 publishes 2030 endpoints only, so the
              comparison has to be made there (<Cv id="us" n={7} />).
            </>
          }
        />
        <div className="grid-2 figure-pair">
          <SvgFigure
            takeaway={
              <>
                At 2030 the UK Anthropic scenario reaches {Y('anthropic_ramp', 4)}, between US Modest and US
                Substantial
              </>
            }
            title="GDP at 2030 — index, 2026 = 100; stems start at 100"
            caption={`Filled dots are UK model output; hollow dots are Anthropic's published US figures. The UK Anthropic scenario is their substantial scenario, so its direct US counterpart is US Substantial (shaded). The UK no-AI baseline is ${Y('baseline', 4)}.`}
          >
            <DotPlot
              ariaLabel="GDP index at 2030 by scenario, UK and US"
              domain={[100, 150]}
              step={10}
              reference={100}
              groups={[
                { note: 'No AI', rows: [uk('baseline'), us('No AI')] },
                { note: 'Substantial — the like-for-like pair', shade: true, rows: [uk('anthropic_ramp'), us('Substantial')] },
                { note: 'Other scenarios', rows: [uk('obr_ramp'), us('Modest'), us('Extreme')] },
              ]}
            />
          </SvgFigure>
          <SvgFigure
            takeaway="Both UK scenarios take Anthropic's 3.9pp labour-share fall, from 65% rather than the US 60%"
            title="Labour share of income, per cent, 2026–2030"
            caption={
              <>
                UK: 65.0% in 2026, {sl('anthropic_ramp')}% by {YEAR} and {sl('anthropic_ramp', 4)}% at the 2030 end
                of the ramp; the two UK scenarios are identical to one decimal place, so they share one line.
                Hollow dots are Anthropic&rsquo;s published 2030 endpoints (no US path is drawn); US Extreme is off
                the scale. The axis does not start at zero. Compare the falls, not the levels.
              </>
            }
          >
            <LineChart
              x={D.years}
              series={lsSeries}
              strip={lsStrip}
              height={340}
              ariaLabel="Labour share by scenario, 2026 to 2030, with US 2030 endpoints"
            />
          </SvgFigure>
        </div>
        <details className="growth-details">
          <summary>Show the 2026&ndash;2030 GDP paths against Anthropic&rsquo;s US scenarios</summary>
          <SvgFigure
            title="GDP — index, 2026 = 100"
            caption="Solid = UK (OG-UK model output). Dashed = US (Anthropic Table 3; 2030 endpoints published, paths between 2026 and 2030 interpolated by us). GDP is smooth through 2030 — unlike investment and government spending, it is not affected by the 2030 fiscal-rule switch."
            svg={FIGURE_SVGS.gdp}
          />
        </details>
      </section>

      {/* ---- 5. Summary by scenario (full width) ---- */}
      <section className="section-card">
        <CardHead
          eyebrow="Summary by scenario"
          takeaway={
            <>
              UK growth in {YEAR} runs from {g('baseline')}% with no AI to {g('anthropic_ramp')}% under Anthropic
              substantial
            </>
          }
          title="GDP index, 2026 = 100; growth and labour share"
        />
        <div className="impact-table-wrap">
          <table className="impact-table numeric summary-table">
            <thead>
              <tr className="group-head">
                <th rowSpan={2}>Path</th>
                <th colSpan={WINDOW.length + 2}>2026&ndash;{YEAR} (UK model)</th>
                <th colSpan={3} className="col-compare">2030 (for comparison with Anthropic)</th>
              </tr>
              <tr>
                {WINDOW.map((y) => (
                  <th key={y}>{y}</th>
                ))}
                <th>growth {YEAR}</th>
                <th>labour share {YEAR}</th>
                <th className="col-compare">GDP index</th>
                <th className="col-compare">growth</th>
                <th className="col-compare">labour share</th>
              </tr>
            </thead>
            <tbody>
              {D.arms.map((a) => (
                <tr key={a}>
                  <td>
                    <Sw c={ARM_META[a].color} />
                    {ARM_META[a].label}
                  </td>
                  {WINDOW.map((y, i) => (
                    <td key={y}>{Y(a, i)}</td>
                  ))}
                  <td>{g(a)}%</td>
                  <td>{sl(a)}%</td>
                  <td className="col-compare">{Y(a, 4)}</td>
                  <td className="col-compare">{g(a, GROW_2030)}%</td>
                  <td className="col-compare">{sl(a, 4)}%</td>
                </tr>
              ))}
              {Object.entries(D.anth).map(([name, v]) => (
                <tr key={name} className="row-secondary">
                  <td>
                    <Sw c={US_COLORS[name]} dashed />
                    US, Anthropic {name}
                  </td>
                  {Array.from({ length: WINDOW.length + 2 }, (_, i) => (
                    <td key={i} className="cell-na" title="not published">
                      &mdash;
                    </td>
                  ))}
                  <td className="col-compare">{v.idx2030.toFixed(1)}</td>
                  <td className="col-compare">{v.growth.toFixed(1)}%</td>
                  <td className="col-compare">{v.lshare.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="chart-note">
          &mdash; = not published: Anthropic publishes US figures for 2030 only. UK figures are OG-UK model
          output, indexed so the 2026 baseline is 100. The shaded 2030 columns exist only to line up with
          Anthropic, whose 2024 = 100 index is rebased here on their own 2% no-AI trend. UK labour shares
          start from 65%, the US from 60%.
        </p>
      </section>
    </div>
  );
}
