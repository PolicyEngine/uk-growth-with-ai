'use client';

import { useState } from 'react';
import Select from '@/components/Select.jsx';
import SvgFigure from '@/components/SvgFigure.jsx';
import LineChart from '@/components/LineChart.jsx';
import FIGURE_SVGS from '@/data/aiFigureSvgs.js';
import D from '@/data/aiScenarios.json';

const ARM_META = {
  baseline: { label: 'UK, no AI', color: 'var(--chart-uk-baseline)' },
  obr_ramp: { label: 'UK, OBR displacement', color: 'var(--chart-uk-obr)' },
  anthropic_ramp: { label: 'UK, Anthropic substantial', color: 'var(--chart-uk-ai)' },
};

const US_COLORS = {
  'No AI': 'var(--chart-us-noai)',
  Modest: 'var(--chart-us-modest)',
  Substantial: 'var(--chart-us-substantial)',
  Extreme: 'var(--chart-us-extreme)',
};

// The six the brief asks for first, then the three the source dashboard showed
// as small multiples.
const VAR_ORDER = ['C', 'I', 'G', 'total_tax_revenue', 'D', 'Y', 'w', 'K', 'L'];
const LABELS = Object.fromEntries(D.vars);

const OPTIONS = VAR_ORDER.map((v) => ({ value: v, label: LABELS[v] }));

// Line swatch, same vocabulary as the shared .plot-legend.
function Sw({ c, dashed }) {
  return (
    <span
      className={`legend-line${dashed ? ' dashed' : ''}`}
      style={{ borderTopColor: c }}
    />
  );
}

export default function ResultsPanel() {
  const [variable, setVariable] = useState('Y');

  const series = D.arms.map((arm) => ({
    label: ARM_META[arm].label,
    color: ARM_META[arm].color,
    values: D.idx[arm][variable],
  }));
  const gap =
    (D.idx.anthropic_ramp[variable][4] / D.idx.baseline[variable][4] - 1) * 100;

  return (
    <>
      <div className="section-card">
        <div className="results-note lead">
          <b>Every result on this page is 1-sector.</b> <code>multi_sector=False</code> in{' '}
          <code>run_scenarios.py</code>. Single-sector Cobb-Douglas was chosen so that &epsilon;=1 makes
          the labour share exactly 1&minus;&gamma; and Anthropic&rsquo;s &minus;3.9pp target is hit by
          algebra rather than numerical calibration. The cost is that the{' '}
          <b>demand-composition channel is absent</b> — there is only one good, so spending cannot shift
          from what gets automated toward what stays scarce. That is precisely Moll &amp; Imas&rsquo;s
          Assumption 2, and on it these runs are no better than Anthropic&rsquo;s one-good model.
          OG-UK&rsquo;s 8-sector build carries it, but that build&rsquo;s transition diverges past
          t&asymp;7.
        </div>

        <div className="key-diff">
          <b>Both UK scenarios grow more slowly than their US counterparts.</b> Under Anthropic&rsquo;s{' '}
          <b>substantial</b> scenario UK GDP reaches <b>112.3</b> by 2030 against their US <b>117.4</b>,
          and growth <b>2.93%</b> against <b>5.4%</b>. Under the OBR{' '}
          <b>technological-displacement</b> scenario — productivity offsetting displacement to hold output
          roughly flat — GDP reaches 108.7 and growth 1.87%, barely above the no-AI baseline of 106.8 and
          1.62%. The gap is general equilibrium: capital has to be accumulated before it produces, so by
          2030 only part of the gain has arrived.
        </div>
        <SvgFigure
          title="GDP"
          caption="Index, 2026 = 100. Solid = UK (OG-UK model output). Dashed = US (Anthropic Table 3; 2030 endpoints published, paths interpolated by us)."
          svg={FIGURE_SVGS.gdp}
        />
      </div>

      <div className="section-card">
        <SvgFigure
          title="GDP at 2030 — index, 2026 = 100"
          caption="Solid bars are UK model output; faded bars are Anthropic's published US figures. The UK Anthropic bar is their substantial scenario, so its direct US counterpart is US Substantial. The UK no-AI baseline is 106.8."
          svg={FIGURE_SVGS.gdpBar}
        />
      </div>

      <div className="section-card">
        <SvgFigure
          title="GDP growth rate"
          caption="Per cent a year. US markers at the right edge are Anthropic's 2030 figures: Table 3 publishes 2030 endpoints only, so those are the endpoints themselves and no US path is drawn. US Extreme (15.4%) is off this scale — see the note below."
          svg={FIGURE_SVGS.growth}
        />
        <div className="results-note">
          <b>US Extreme is omitted from the growth chart.</b> At 15.4% a year it compresses every other
          series into the bottom eighth of the pane; it is in the summary table below. The three UK
          paths and the three lower US scenarios all sit between 1.6% and 5.4%.
        </div>
      </div>

      <div className="section-card">
        <SvgFigure
          title="Labour share of income"
          caption="Per cent. Both UK scenarios impose Anthropic's 3.9pp fall, ramped over the window. US levels start from 60%, the UK from 65%, so compare the slopes rather than the levels. The dashed US marks are Anthropic's 2030 endpoints (Table 3, published for 2030 only); no US path is drawn between 2026 and 2030."
          svg={FIGURE_SVGS.labourShare}
        />
      </div>

      <div className="section-card">
        <div className="results-toolbar">
          <Select
            label="Variable"
            options={OPTIONS}
            value={variable}
            onChange={setVariable}
          />
          <span className={`results-gap${gap < 0 ? ' neg' : ''}`}>
            {gap >= 0 ? '+' : ''}
            {gap.toFixed(1)}% at 2030, Anthropic substantial vs no-AI baseline
          </span>
        </div>
        <SvgFigure
          title={`${LABELS[variable]} — index, 2026 = 100`}
          caption="UK model output only; Anthropic publishes nothing comparable for these variables. All three arms are indexed on the common 2026 baseline, so the shocked arms do not start at exactly 100."
        >
          <LineChart x={D.years} series={series} />
        </SvgFigure>
        <div className="plot-legend">
          {D.arms.map((a) => (
            <span key={a} className="legend-item">
              <Sw c={ARM_META[a].color} />
              {ARM_META[a].label}
            </span>
          ))}
        </div>
        {(variable === 'I' || variable === 'G') && (
          <div className="results-note">
            Investment and government spending both move sharply in 2030 in{' '}
            <b>every arm including the no-AI baseline</b>. It is present in the raw model output and is
            not an AI effect; it is shown as computed rather than smoothed.
          </div>
        )}
      </div>

      <div className="section-card">
        <div className="obr-head">
          <h3>What each scenario assumes</h3>
        </div>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Scenario</th>
              <th style={{ width: '43%' }}>What it says</th>
              <th>How it enters OG-UK</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Sw c="var(--chart-uk-baseline)" />
                <b>UK, no AI</b>
                <br />
                <span className="cell-tag">baseline</span>
              </td>
              <td>
                No AI shock at all. The UK economy on its existing calibration: OBR-based productivity
                growth, ONS demographics, the current tax system.
              </td>
              <td>
                &gamma; = 0.35 (labour share 65%), Z = 1.0 throughout. Every other path is measured
                against this.
              </td>
            </tr>
            <tr>
              <td>
                <Sw c="var(--chart-uk-obr)" />
                <b>UK, OBR displacement</b>
                <br />
                <span className="cell-tag">official UK</span>
              </td>
              <td>
                <b>OBR March 2026 EFO, Box 2.2</b> — their own AI scenario. Machines substitute for
                labour, capital deepens, and productivity rises for the workers who remain. Their words:{' '}
                <i>
                  &ldquo;higher trend productivity fully offsets lower employment to leave the{' '}
                  <b>level of GDP unchanged</b>… this implies a{' '}
                  <b>lower labour share and a higher corporate profit share</b>… As labour income faces
                  a higher effective tax rate, this{' '}
                  <b>reduces the tax-richness of economic activity</b>.&rdquo;
                </i>{' '}
                Equilibrium unemployment rises to <b>5.5%</b>.
              </td>
              <td>
                &gamma; ramps 0.35 &rarr; 0.389 (automation), and{' '}
                <b>Z is solved so the GDP level is unchanged</b> — the defining feature of their case.
                Z = 0.9435. Their 5.5% unemployment has <b>no counterpart</b>: OG-Core has no
                labour-market block.
              </td>
            </tr>
            <tr>
              <td>
                <Sw c="var(--chart-uk-ai)" />
                <b>UK, Anthropic substantial</b>
                <br />
                <span className="cell-tag">US scenario, UK model</span>
              </td>
              <td>
                <b>Korinek et al. (2026), Table 3, &ldquo;substantial&rdquo; column</b> — their middle
                case, not the modest one and not the extreme one. By 2030: labour share falls{' '}
                <b>60&cent; &rarr; 56.1&cent;</b> (&minus;3.9pp), measured TFP rises <b>+3.1%</b>, GDP
                +8.3% above the no-AI path, growth 5.4%, cognitive unemployment 4.5%.
              </td>
              <td>
                &gamma; ramps 0.35 &rarr; 0.389 to deliver the same <b>&minus;3.9pp</b> labour-share
                fall, applied to the UK&rsquo;s 65% rather than the US 60%. <b>Z solved jointly</b> for
                their +3.1% TFP = 0.9727. Their unemployment and wage split have no counterpart.
              </td>
            </tr>
            <tr className="row-secondary">
              <td>
                <Sw c="var(--chart-us-noai)" dashed />
                US, Anthropic
                <br />
                No AI / Modest / Substantial / Extreme
              </td>
              <td>
                Anthropic&rsquo;s four published US paths. <b>Reference only</b> — these are their own
                model&rsquo;s output for the United States, not anything run here.
              </td>
              <td>
                Not run. Table 3 publishes <b>2030 endpoints only</b>, so the dashed lines between 2026
                and 2030 are interpolated by us, not published by them.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="results-note">
          <b>Why both UK scenarios use the same &gamma; path.</b> Neither source publishes a UK
          labour-share number, so both impose Anthropic&rsquo;s &minus;3.9pp fall as the automation
          intensity. What separates them is <b>what Z is solved against</b>: Anthropic&rsquo;s +3.1%
          measured TFP, versus OBR&rsquo;s unchanged GDP level. That is the entire difference between
          the blue and green paths.
        </div>
        <div className="results-note">
          <b>What neither can represent.</b> No unemployment, no search frictions, no occupational
          split, no household-level distinction between labour and capital taxation. So{' '}
          <b>neither scenario speaks to displacement</b> — and OG-UK cannot test the OBR&rsquo;s central
          fiscal claim, because the mechanism behind &ldquo;reduced tax-richness&rdquo; is labour income
          being taxed more heavily than the capital income replacing it. That is a PolicyEngine
          question, not an OG-UK one.
        </div>
      </div>

      <div className="section-card">
        <div className="obr-head">
          <h3>What was changed</h3>
        </div>
        <table className="impact-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Baseline</th>
              <th>UK — Anthropic substantial</th>
              <th>UK — OBR displacement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>&epsilon; elasticity of substitution</td>
              <td>1.0</td>
              <td>1.0</td>
              <td>1.0</td>
            </tr>
            <tr>
              <td>&gamma; capital weight (automation)</td>
              <td>0.35</td>
              <td colSpan={2} style={{ textAlign: 'center' }}>
                ramps to 0.3890 — labour share &minus;3.9pp
              </td>
            </tr>
            <tr>
              <td>Z total factor productivity</td>
              <td>1.000</td>
              <td>0.9727</td>
              <td>0.9435</td>
            </tr>
            <tr>
              <td>target</td>
              <td>—</td>
              <td>+3.1% measured TFP</td>
              <td>GDP level unchanged</td>
            </tr>
          </tbody>
        </table>
        <div className="results-note">
          Automation <b>ramps</b> over the window in both scenarios, mirroring Anthropic&rsquo;s design
          where capability and adoption build to 2030. This requires time-varying <code>gamma</code>,
          which standard OG-Core does not support.
        </div>
        <div className="results-note">
          <b>Read with these.</b> Both solved Z values are <b>below 1</b>: the &gamma; move needed for a
          3.9pp labour-share fall delivers <b>+5.99%</b> output on its own, nearly double
          Anthropic&rsquo;s +3.1% TFP target, so Z must fall to reconcile them.{' '}
          <b>Anthropic&rsquo;s two published targets cannot both hold under Cobb-Douglas</b> — their model
          is task-based CES at &epsilon;=0.5. For OBR the same arithmetic is coherent. The comparison is
          also cross-country and cross-model: OG-UK is OLG with UK demographics and a tax system;
          Anthropic&rsquo;s is a five-year US scenario device with neither. And{' '}
          <b>neither scenario can speak to displacement</b> — there is no unemployment, no search friction
          and no occupational split in this model. Finally, every figure here inherits the{' '}
          <code>g_y_annual = 1.1%</code> sourcing error set out under{' '}
          <b>Methodology &rsaquo; OG-UK vs OBR numbers</b>.
        </div>
      </div>


      <div className="section-card">
        <div className="obr-head">
          <h3>2030 summary</h3>
        </div>
        <table className="impact-table numeric">
          <thead>
            <tr>
              <th>Path</th>
              <th>2026</th>
              <th>2027</th>
              <th>2028</th>
              <th>2029</th>
              <th>2030</th>
              <th>growth</th>
              <th>labour share</th>
            </tr>
          </thead>
          <tbody>
            {D.arms.map((a) => (
              <tr key={a}>
                <td>
                  <Sw c={ARM_META[a].color} />
                  {ARM_META[a].label}
                </td>
                {D.idx[a].Y.map((v, i) => (
                  <td key={i}>{v.toFixed(1)}</td>
                ))}
                <td>
                  <b>{D.grow[a][D.grow[a].length - 1].toFixed(2)}%</b>
                </td>
                <td>{(D.sl[a][4] * 100).toFixed(1)}%</td>
              </tr>
            ))}
            {Object.entries(D.anth).map(([name, v]) => (
              <tr key={name} className="row-secondary">
                <td>
                  <Sw c={US_COLORS[name]} dashed />
                  US, Anthropic {name}
                </td>
                <td colSpan={4} className="cell-na">
                  not published
                </td>
                <td>{v.idx2030.toFixed(1)}</td>
                <td>
                  <b>{v.growth.toFixed(1)}%</b>
                </td>
                <td>{v.lshare.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="results-note">
          UK figures are OG-UK model output, indexed so the 2026 baseline is 100. Anthropic publishes
          2030 endpoints only; their 2024=100 index is rebased here on their own 2% no-AI trend, and the
          dashed paths between 2026 and 2030 are interpolated rather than published. UK labour shares
          start from 65%, the US from 60%.
        </div>
      </div>
    </>
  );
}
