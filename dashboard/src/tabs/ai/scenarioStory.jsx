'use client';

// Scenario design tab: the steps (left) and the sticky panels (right) for the
// two-pane story. Home of the assumptions, the fiscal convention and the
// caveats. Caveat ids (caveat-sector, ...) are the targets of the numbered
// caveat links on the other tabs; keep CAVEATS below in step with them.

import AiChannels from '@/tabs/ai/AiChannels.jsx';
import CaveatLink from '@/tabs/ai/CaveatLink.jsx';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';
import { URLS, issue, pr, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import {
  D, FIRST_YEAR, LAST, LAST_YEAR, G0, G1, DG, LS0, LS1, LS_FALL, GAMMA_ONLY_GAIN, KL0, Z_OBR, Z_ANTH,
  TG1, OBR, KORINEK, RC_ERROR, CIT_RATE, FIXED, MODEL_RATIOS, signed, gapAt, taxGdpChangePp, taxGdpBase,
} from '@/tabs/ai/metrics.js';
import paths from '@/data/ukAiPaths.json';

// Caveat numbers, in display order. Every <CaveatLink> on the dashboard
// takes its number from here.
export const CAVEATS = [
  'sector', 'displacement', 'fiscal', 'investment', 'accounting', // affect every number
  'anticipation', 'us', 'levels', 'z', // how to read the charts
];
export const caveatNo = (id) => CAVEATS.indexOf(id) + 1;
const N_EVERY = 5;

export function Cv({ id, children }) {
  return <CaveatLink id={`caveat-${id}`}>{children ?? `caveat ${caveatNo(id)}`}</CaveatLink>;
}

const TAX_OBR = taxGdpChangePp('obr_ramp');
const OBR_Y = gapAt('obr_ramp', 'Y');
const ext = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text}
  </a>
);

// OBR/ONS data at 2026 for each chart panel, keyed by the model_ratios key.
const DATA_2026 = (() => {
  const key = (t) =>
    t.startsWith('Consumption') ? 'C' : t.startsWith('Investment') ? 'I' : t.startsWith('Government') ? 'G'
      : t.startsWith('Tax') ? 'total_tax_revenue' : t.startsWith('Public sector net debt') ? 'D' : null;
  const out = {};
  for (const p of paths.panels) {
    const k = key(p.title);
    const h = p.traces[0];
    const i = h.x.indexOf(FIRST_YEAR);
    if (k && i >= 0) out[k] = h.y[i];
  }
  return out;
})();
const RATIO_ROWS = [
  ['C', 'Consumption'],
  ['I', 'Investment'],
  ['G', 'Government consumption'],
  ['total_tax_revenue', 'Tax'],
  ['D', 'Debt'],
];

function Sw({ c, dashed }) {
  return <span className={`legend-line${dashed ? ' dashed' : ''}`} style={{ borderTopColor: c }} />;
}

// One scenario: how it is built in OG-UK, and the source it is calibrated to.
function Scenario({ color, dashed, name, tag, says, enters, saysLabel = 'Calibration source' }) {
  return (
    <article className="scenario-card">
      <header className="scenario-head">
        <span className="scenario-name">
          <Sw c={color} dashed={dashed} />
          {name}
        </span>
        <span className="cell-tag">{tag}</span>
      </header>
      {enters ? (
        <div className="scenario-part">
          <div className="scenario-label">How it is built in OG-UK</div>
          {enters}
        </div>
      ) : null}
      {says ? (
        <div className="scenario-part">
          <div className="scenario-label">{saysLabel}</div>
          {says}
        </div>
      ) : null}
    </article>
  );
}

// Fiscal convention: the committed runs (common G/Y) against the robustness
// run with spending held at baseline levels. Rendered only when the JSON
// carries fixed_spending.
const taxPp = (b) => ((1 + b.tax_gap[LAST] / 100) / (1 + b.Y_gap[LAST] / 100) - 1) * taxGdpBase();
function FiscalTable() {
  if (!FIXED) return null;
  const rows = [];
  for (const arm of ['anthropic_ramp', 'obr_ramp']) {
    rows.push([arm, 'Spending a fixed share of GDP (main runs)', FIXED.common_gy[arm]]);
    rows.push([arm, 'Spending held at baseline levels', FIXED.arms[arm]]);
  }
  return (
    <div className="impact-table-wrap">
      <table className="impact-table numeric">
        <thead>
          <tr>
            <th>{LAST_YEAR}, against the no-AI baseline</th>
            <th>GDP</th>
            <th>Consumption</th>
            <th>Tax revenue</th>
            <th>Debt</th>
            <th>Tax/GDP</th>
            <th>Debt/GDP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([arm, conv, b]) => (
            <tr key={arm + conv}>
              <td>
                <Sw c={ARM_META[arm].color} />
                {ARM_META[arm].label}
                <br />
                <small>{conv}</small>
              </td>
              <td>{signed(b.Y_gap[LAST])}%</td>
              <td>{signed(b.C_gap[LAST])}%</td>
              <td>{signed(b.tax_gap[LAST])}%</td>
              <td>{signed(b.D_gap[LAST])}%</td>
              <td>{signed(taxPp(b), 2)}pp</td>
              <td>{signed(b.debt_gdp_pp[LAST], 2)}pp</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const debtPp = (conv, arm) => FIXED && FIXED[conv][arm].debt_gdp_pp[LAST];

export const STORY_STEPS = [
  {
    title: 'How OG-UK is adapted to study AI',
    content: (
      <>
        <p className="key-point">
          OG-UK has no AI parameter; AI enters through <b>two changes to the production technology</b>, and
          everything else is as in the no-AI baseline.
        </p>
        <ol className="txt-numbered">
          <li>
            <b>Automation</b> enters as a higher capital share &gamma; in production. With &epsilon;&nbsp;=&nbsp;1
            the labour share is 1&minus;&gamma;, so raising &gamma; from {G0} to {G1} lowers it by{' '}
            {LS_FALL.toFixed(1)}pp, from {LS0.toFixed(0)}% to {LS1.toFixed(1)}%. OG-Core holds &gamma; fixed over
            time, so a {ext(URLS.patch, 'patch to its firm block')} makes it time-varying (
            {ext(URLS.patchDoc, 'design notes')}).
          </li>
          <li>
            <b>Productivity</b> enters as TFP Z, solved ({ext(URLS.calibrate, 'calibrate.py')}) so that each
            scenario meets its calibration target at fixed inputs: +{KORINEK.tfp}% for Automation + productivity,
            0% for Automation only.
          </li>
          <li>
            <b>Timing.</b> Both rise linearly from their baseline values in {FIRST_YEAR} to their full values in{' '}
            {LAST_YEAR} and stay there afterwards. Households and firms know the whole path in advance (perfect
            foresight).
          </li>
          <li>
            <b>Everything else is unchanged</b>: every scenario starts from the no-AI baseline&rsquo;s assets and
            debt, uses the same fiscal rule (<Cv id="fiscal" />, with a fixed-spending run as a check), and has the
            same demographics and tax system. The runs are driven by {ext(URLS.solve, 'solve.py')}.
          </li>
        </ol>
      </>
    ),
  },
  {
    title: 'Which channels are in, and which are not',
    content: (
      <>
        <p className="key-point">
          Of the seven AI channels in the table, the runs carry three fully, one partly and three not at all.
        </p>
        <p>
          A channel marked &ldquo;not modelled&rdquo; has no counterpart in the runs, so no result here speaks
          to it. The channel-by-channel comparison with Korinek et al., Moll and Imas and the OBR is under{' '}
          <a href="#coverage">Model coverage</a>.
        </p>
        <AiChannels />
      </>
    ),
  },
  {
    title: 'Scenario 1: No AI',
    content: (
      <Scenario
        color={ARM_META.baseline.color}
        name={ARM_META.baseline.label}
        tag="no-AI baseline"
        saysLabel="Role"
        says={<p>Every other path is measured against this one. It is checked against the OBR&rsquo;s forecast under <a href="#coverage">Model comparison</a>.</p>}
        enters={
          <>
            <p>
              &epsilon; = 1, &gamma; = {G0} and Z = 1 in every year. &gamma; = {G0} (a labour share of{' '}
              {LS0.toFixed(0)}%) is OG-Core&rsquo;s default, not a UK estimate.
            </p>
            <p>
              No AI shock: OG-UK&rsquo;s existing calibration and the current tax system. Labour-augmenting
              productivity grows at {(D.assum.g_y_annual * 100).toFixed(1)}% a year, the OBR&rsquo;s medium-term
              rate; the population follows the UN World Population Prospects projection for the UK.
            </p>
          </>
        }
      />
    ),
  },
  {
    title: 'Scenario 2: Automation only',
    content: (
      <>
        <p className="key-point">
          A shift of income from labour to capital with <b>no output gain at fixed inputs</b>.
        </p>
        <Scenario
          color={ARM_META.obr_ramp.color}
          name={ARM_META.obr_ramp.label}
          tag="automation"
          enters={
            <>
              <p>
                Z offsets the output effect of the higher &gamma; at baseline
                inputs: a pure factor-bias shift with no output gain at fixed K and L. Output per worker still
                rises in equilibrium, because capital deepens.
              </p>
            </>
          }
          says={
            <>
              <p>
                The automation-only case follows the OBR&rsquo;s {ext(efo(EFO_PAGE.box22), 'Box 2.2')} in the March
                2026 <i>Economic and fiscal outlook</i>: a lower labour share with no output
                gain at fixed inputs. In the OBR&rsquo;s words, &ldquo;higher trend productivity fully offsets
                lower employment to leave the level of GDP unchanged&hellip; As labour income faces a higher
                effective tax rate, this reduces the tax-richness of economic activity.&rdquo;
              </p>
              <p>
                The OBR scenario also raises equilibrium unemployment to {OBR.unemployment}%; OG-UK has no
                unemployment, so that part has no counterpart (<Cv id="displacement" />).
              </p>
            </>
          }
        />
        <p className="note-box">
          <b>Comparison with the OBR&rsquo;s fiscal estimate.</b> OG-UK carries part of the tax-richness channel:
          labour and capital income pass through one fitted income-tax function, plus a {CIT_RATE}% corporation
          tax. In {LAST_YEAR} this scenario lowers tax/GDP by {Math.abs(TAX_OBR).toFixed(2)}pp. The OBR (
          {ext(efo(EFO_PAGE.p6_18), 'EFO paragraph 6.18')}) puts the effect of its scenario on receipts at {signed(OBR.receiptsBn, 0).replace('\u2212', '\u2212£')}bn a
          year (about {Math.abs(OBR.receiptsPctGdp)}% of GDP), with borrowing +£{OBR.borrowingBn}bn a year and debt +
          {OBR.debtPctGdp}% of GDP by 2030-31. The model&rsquo;s debt result depends on the fiscal convention (
          <Cv id="fiscal" />
          ).
        </p>
      </>
    ),
  },
  {
    title: 'Scenario 3: Automation + productivity',
    content: (
      <>
        <p className="key-point">
          The same automation, plus a rise in total factor productivity of <b>{KORINEK.tfp}% at fixed inputs</b>.
          This is the main scenario.
        </p>
        <Scenario
          color={ARM_META.anthropic_ramp.color}
          name={ARM_META.anthropic_ramp.label}
          tag="main scenario"
          enters={
            <>
              <p>
                The same &gamma; path as Automation only. Z is solved jointly with &gamma; so that the combined
                change raises measured TFP by {KORINEK.tfp}% at baseline inputs.
              </p>
              <p>
                The {LS_FALL.toFixed(1)}pp fall is applied in percentage points to OG-UK&rsquo;s {LS0.toFixed(0)}%;
                the proportional equivalent (&minus;{((LS_FALL / D.anth['No AI'].lshare) * 100).toFixed(1)}%) would
                give {(LS0 * (1 - LS_FALL / D.anth['No AI'].lshare)).toFixed(1)}%.
              </p>
            </>
          }
          says={
            <p>
              The size of the labour-share fall and the productivity gain are set to match the
              &ldquo;substantial&rdquo; case of{' '}
              {ext(URLS.korinek, 'Korinek, Jones, Sacher, Cotter and McCrory (2026)')}, Anthropic Institute
              Working Paper 2026-02, {ext(URLS.korinekT3, 'Table 3')}: a US labour share that falls from {D.anth['No AI'].lshare.toFixed(0)}% to{' '}
              {D.anth.Substantial.lshare.toFixed(1)}% by 2030, and measured TFP {KORINEK.tfp}% higher. Their
              unemployment ({KORINEK.unempCognitive}% for cognitive workers, {KORINEK.unempAll}% for all workers) and
              wage split have no counterpart in OG-UK.
            </p>
          }
        />
      </>
    ),
  },
  {
    title: 'Comparison points: the US scenarios of Korinek et al.',
    content: (
      <Scenario
        color={US_COLORS.Substantial}
        dashed
        name="US (Korinek et al.): No AI, Modest, Substantial, Extreme"
        tag="published, not run here"
        says={
          <>
            <p>
              The four US scenarios of Korinek et al. (2026), Table 3: their own model&rsquo;s results for the
              United States, not anything run here.
            </p>
            <p>
              Table 3 publishes <b>2030 endpoints only</b>, so the US appears on the charts as single hollow
              dots. Each US scenario is compared with the paper&rsquo;s own US no-AI path, as each UK scenario is
              with the UK no-AI baseline; the two no-AI paths grow at different rates, so levels are not
              compared (<Cv id="us" />
              ).
            </p>
          </>
        }
      />
    ),
  },
  {
    title: 'Why Z sits below 1',
    content: (
      <>
        <p className="key-point">
          Raising &gamma; alone increases output at baseline inputs, so Z must offset part or all of that gain.
        </p>
        <p>
          At the baseline&rsquo;s capital-labour ratio, the rise in &gamma; alone raises output by{' '}
          {GAMMA_ONLY_GAIN.toFixed(2)}%. Z removes that gain in Automation only and all but +{KORINEK.tfp}% of it in
          Automation + productivity, so both solved values are below 1. The two AI scenarios differ only in Z.
        </p>
        <p className="note-box">
          The level of Z has no economic meaning (<Cv id="z" />
          ).
        </p>
      </>
    ),
  },
  {
    title: 'Caveats that affect every number',
    content: (
      <>
        <p className="key-point">
          Five limits apply to every result on <a href="#growth">UK growth paths</a>.
        </p>
        <ol className="caveat-list" start={1}>
          <li id="caveat-sector">
            <b>Every result is 1-sector</b> (<code>multi_sector=False</code>). Cobb-Douglas at one sector makes
            the labour share exactly 1&minus;&gamma;, so the labour-share target is met by construction. The
            cost: with one good, spending cannot shift from what gets automated to what stays scarce, so the
            demand-composition channel is absent. OG-UK&rsquo;s 8-sector build carries that channel, but its
            transition path diverges after about seven periods, so it is not used.
          </li>
          <li id="caveat-displacement">
            <b>No unemployment or displacement.</b> OG-UK has no unemployment, search frictions or occupations.
            Neither scenario speaks to displacement, and the runs contain none of the welfare-spending cost the
            OBR attaches to Box 2.2. The part of the tax-richness channel the model does carry is in step 4.
          </li>
          <li id="caveat-fiscal">
            <b>Fiscal convention: spending rises with GDP.</b> In every arm government consumption G and
            transfers TR are fixed shares of GDP (the baseline&rsquo;s shares), so when AI raises GDP, spending
            rises with it, and debt is the residual. The switch to debt targeting is set to period {TG1} (
            {FIRST_YEAR + TG1}), beyond the window. The OBR convention instead holds spending plans fixed in cash.
            {FIXED ? (
              <>
                {' '}
                A second run holds G and TR at the baseline&rsquo;s levels. Under it, debt/GDP in {LAST_YEAR}{' '}
                <b>falls in both arms</b>: {signed(debtPp('arms', 'anthropic_ramp'), 2)}pp (Automation + productivity) and{' '}
                {signed(debtPp('arms', 'obr_ramp'), 2)}pp (Automation only), against{' '}
                {signed(debtPp('common_gy', 'anthropic_ramp'), 2)}pp and{' '}
                {signed(debtPp('common_gy', 'obr_ramp'), 2)}pp in the main runs. The Automation-only scenario&rsquo;s
                rise in debt is therefore mostly the spending rule, not the technology. GDP and consumption
                barely change between the two conventions.
                <FiscalTable />
                <span className="note-box" style={{ display: 'block' }}>
                  Debt is set a year ahead, so its {FIRST_YEAR} gap is zero while debt/GDP already moves with GDP.
                  Tax/GDP uses the model baseline&rsquo;s {taxGdpBase().toFixed(1)}% in {LAST_YEAR}.
                </span>
              </>
            ) : null}
          </li>
          <li id="caveat-investment">
            <b>The shape of the investment path comes from the ramp.</b> Investment rises from {FIRST_YEAR}{' '}
            because households and firms foresee the higher return to capital (perfect foresight, no adjustment
            costs in OG-Core), and falls back in {LAST_YEAR} because the assumed ramp stops there, so the capital
            stock stops needing to grow as fast. Treat the shape as a property of the assumed ramp, not a
            forecast of an investment boom and bust; the capital stock is the robust quantity.
          </li>
          <li id="caveat-accounting">
            <b>{FIRST_YEAR} ratios carry an accounting error.</b> In {FIRST_YEAR} the model&rsquo;s resource
            constraint misses by {RC_ERROR.units} model units, about {RC_ERROR.pctGdp}% of GDP, in every arm.
            The error is the same in every arm, so gaps between arms are unaffected; {FIRST_YEAR} levels and
            composition ratios are not exact.
          </li>
        </ol>
      </>
    ),
  },
  {
    title: 'Caveats on reading the charts',
    content: (
      <>
        <p className="key-point">Four points on how the charts are built.</p>
        <ol className="caveat-list" start={N_EVERY + 1}>
          <li id="caveat-anticipation">
            <b>{FIRST_YEAR} gaps are anticipation.</b> &gamma; and Z are still at baseline values in{' '}
            {FIRST_YEAR}; the AI arms already differ because households and firms see the ramp coming.
          </li>
          <li id="caveat-us">
            <b>The US comparison is cross-country, cross-model and a year apart.</b> Korinek et al.&rsquo;s Table 3
            figures are for the start of 2030 (growth over the 12 months to then); OG-UK&rsquo;s period 2030 is
            a year later, and the UK ramp runs four years against their three and a half from mid-2026. On a
            like-for-like date the UK gap lies between its 2029 and 2030 values. Levels are not compared: each
            country&rsquo;s gap is measured from its own no-AI path. OG-UK is an OLG model with UK demographics
            and taxes; theirs is a US scenario model with neither.
          </li>
          <li id="caveat-levels">
            <b>The context chart applies the model&rsquo;s changes to the OBR&rsquo;s level.</b> OG-UK&rsquo;s own
            baseline ratios differ from the data, so each scenario path starts from the OBR&rsquo;s {FIRST_YEAR}{' '}
            value and moves by the model&rsquo;s proportional change in the ratio. The AI arms start away from
            the OBR value because of anticipation.
            {MODEL_RATIOS ? (
              <span className="note-box" style={{ display: 'block' }}>
                {MODEL_RATIOS.year}, % of GDP, OG-UK baseline against OBR/ONS:{' '}
                {RATIO_ROWS.filter(([k]) => MODEL_RATIOS.ratios[k] != null).map(([k, name], j) => (
                  <span key={k}>
                    {j ? '; ' : ''}
                    {name} {MODEL_RATIOS.ratios[k].toFixed(1)} against{' '}
                    {DATA_2026[k] != null ? DATA_2026[k].toFixed(1) : 'n/a'}
                  </span>
                ))}
                . Debt/GDP is a calibration target, so it matches by construction.
              </span>
            ) : null}
          </li>
          <li id="caveat-z">
            <b>Z is a normalisation constant.</b> It absorbs the units of K/L, which are arbitrary in the model,
            so its level &mdash; including both solved values sitting below 1 &mdash; has no economic meaning.
            Only the target it is solved for does.
          </li>
        </ol>
        <p className="note-box">
          Three problems in earlier versions are fixed in these results ({ext(pr(11), 'PR #11')}): the AI arms
          set their own spending share ({ext(issue(2), '#2')}), the window stopped at 2029 because of an early
          switch to debt targeting ({ext(issue(3), '#3')}), and productivity growth was mis-sourced (
          {ext(issue(5), '#5')}; see <a href="#coverage">Model coverage</a>).
        </p>
      </>
    ),
  },
];

const i = (text, cls = 'info', icon = '\\(\\to\\)') => ({ icon, text, cls });
const fsLine = (conv, label) =>
  FIXED
    ? [i(`${label}: Automation + productivity ${signed(debtPp(conv, 'anthropic_ramp'), 2)}pp, Automation only ${signed(debtPp(conv, 'obr_ramp'), 2)}pp`, 'info', '=')]
    : [];

export const STORY_PANELS = [
  { title: 'Production with AI', badge: 'Step 1', sections: [
    // Z solve shown per scenario in steps 4-5.
    { label: 'Technology (1 sector, ε = 1)', type: 'math', equations: [
      { label: 'Output', tex: 'Y_t = Z_t\\,K_t^{\\gamma_t}\\,\\bigl(e^{g_y t}L_t\\bigr)^{1-\\gamma_t}' },
      { label: 'Labour share', tex: '\\frac{w_t L_t}{Y_t} = 1-\\gamma_t' },
    ]},
    { label: `The two AI parameters, ${FIRST_YEAR}–${LAST_YEAR}`, type: 'math', equations: [
      { label: 'Ramp', tex: `u_t = \\min(t/${LAST},\\,1), \\quad t = 0 \\text{ in } ${FIRST_YEAR}` },
      { label: 'Automation', tex: `\\gamma_t = ${G0} + ${DG}\\,u_t` },
      { label: 'Labour share', tex: `${LS0.toFixed(0)}\\% \\to ${LS1.toFixed(1)}\\% \\quad (-${LS_FALL.toFixed(1)}\\text{pp})` },
      { label: 'Productivity', tex: 'Z_t = 1 + (Z^{*}-1)\\,u_t' },
    ]},
    { label: 'The Z solve, at baseline inputs', type: 'math', equations: [
      { label: 'Target: output gain at fixed K₀, L₀', tex: `Z^{*}\\,(K_0/L_0)^{${DG}} = 1 + \\text{target}` },
      { label: 'Targets', tex: `\\text{Automation only: } 0\\%, \\quad \\text{Automation + productivity: } +${KORINEK.tfp}\\%` },
    ]},
  ]},
  { title: 'Channel coverage', badge: 'Step 2', sections: [
    { label: 'Modelled', type: 'output', lines: [
      i('Automation: \\(\\gamma\\) ramps', 'accent', '✓'),
      i('Productivity: \\(Z\\) solved to target', 'accent', '✓'),
      i('Capital accumulation: endogenous', 'accent', '✓'),
    ]},
    { label: 'Partly', type: 'output', lines: [
      i('Adoption and diffusion: folded into the ramps of \\(\\gamma\\) and \\(Z\\)', 'info', '~'),
    ]},
    { label: 'Not modelled', type: 'output', lines: [
      i('Unemployment and search', 'warn', '✗'),
      i('New tasks for people', 'warn', '✗'),
      i('Which goods get cheaper (needs several sectors)', 'warn', '✗'),
    ]},
  ]},
  { title: 'UK, no AI', badge: 'Baseline', sections: [
    { label: 'Parameters, every year', type: 'math', equations: [
      { label: '', tex: `\\varepsilon = 1,\\quad \\gamma = ${G0},\\quad Z = 1` },
      { label: 'Labour share', tex: `1-\\gamma = ${LS0.toFixed(0)}\\%` },
      { label: 'Productivity growth', tex: `g_y = ${D.assum.g_y_annual.toFixed(3)}` },
    ]},
    { label: 'Role', type: 'output', lines: [
      i('Every other UK path is measured against this one'),
      i('Population: UN World Population Prospects, UK'),
    ]},
  ]},
  { title: ARM_META.obr_ramp.label, badge: 'Scenario 2', sections: [
    { label: 'Target: no output gain at fixed inputs', type: 'math', equations: [
      { label: 'At baseline K₀, L₀', tex: `Z^{\\text{AO}} K_0^{${G1}} L_0^{${(1 - G1).toFixed(3)}} = K_0^{${G0}} L_0^{${(1 - G0).toFixed(2)}}` },
      { label: 'Solved', tex: `Z^{\\text{AO}} = (K_0/L_0)^{-${DG}} = ${Z_OBR.toFixed(4)}` },
    ]},
    { label: `Against the OBR's Box 2.2, ${LAST_YEAR}`, type: 'output', lines: [
      i(`Labour share \\(-${LS_FALL.toFixed(1)}\\)pp: imposed`, 'accent', '✓'),
      i(`GDP unchanged: only at fixed inputs; in equilibrium ${signed(OBR_Y)}%`, 'info', '~'),
      i(`Tax/GDP: OG-UK ${signed(TAX_OBR, 2)}pp; OBR ≈${OBR.receiptsPctGdp}pp (¶6.18)`, 'info', '='),
      i(`Unemployment ${OBR.unemployment}%: no counterpart`, 'warn', '✗'),
    ]},
  ]},
  { title: ARM_META.anthropic_ramp.label, badge: 'Scenario 3', sections: [
    { label: `Target: +${KORINEK.tfp}% measured TFP`, type: 'math', equations: [
      { label: 'At baseline K₀, L₀', tex: `\\frac{Z^{\\text{AP}} K_0^{${G1}} L_0^{${(1 - G1).toFixed(3)}}}{K_0^{${G0}} L_0^{${(1 - G0).toFixed(2)}}} = ${(1 + KORINEK.tfp / 100).toFixed(3)}` },
      { label: 'Solved', tex: `Z^{\\text{AP}} = ${(1 + KORINEK.tfp / 100).toFixed(3)}\\,(K_0/L_0)^{-${DG}} = ${Z_ANTH.toFixed(4)}` },
    ]},
    { label: 'Calibration to Korinek et al. (2026), Table 3', type: 'output', lines: [
      i(`Labour share \\(-${LS_FALL.toFixed(1)}\\)pp: matched (UK ${LS0.toFixed(0)}% → ${LS1.toFixed(1)}%)`, 'accent', '✓'),
      i(`Measured TFP +${KORINEK.tfp}%: matched, jointly with \\(\\gamma\\)`, 'accent', '✓'),
      i('Their GDP and growth: comparison points, not targets', 'info', '→'),
      i('Their unemployment and wage split: no counterpart', 'warn', '✗'),
    ]},
  ]},
  { title: 'US comparison points', badge: 'Korinek et al.', sections: [
    { label: 'What is published (Table 3)', type: 'output', lines: [
      i('Four US scenarios: No AI, Modest, Substantial, Extreme'),
      i('2030 endpoints only: drawn as hollow dots'),
      i('Compared as gaps from their own no-AI path'),
    ]},
  ]},
  { title: 'Why Z sits below 1', badge: 'Step 7', sections: [
    { label: 'Output gain from γ alone, at baseline K₀/L₀', type: 'math', equations: [
      { label: '', tex: `(K_0/L_0)^{${DG}} - 1 = ${GAMMA_ONLY_GAIN.toFixed(2)}\\%,\\quad K_0/L_0 = ${KL0.toFixed(4)}` },
    ]},
    { label: 'What differs between the AI scenarios', type: 'output', lines: [
      i('Same \\(\\gamma\\) path, fiscal rule and starting state', 'accent', '='),
      i(`\\(Z^{*}\\): ${Z_ANTH.toFixed(4)} (Automation + productivity) against ${Z_OBR.toFixed(4)} (Automation only)`, 'accent', '≠'),
    ]},
  ]},
  { title: 'Affects every number', badge: `Caveats 1–${N_EVERY}`, sections: [
    { label: 'Checklist', type: 'output', lines: [
      i('One sector: no demand-composition channel', 'warn', '1'),
      i('No unemployment or displacement', 'warn', '2'),
      i(`Spending a fixed share of GDP; debt the residual to ${FIRST_YEAR + TG1}`, 'warn', '3'),
      i(`Investment path shaped by the ${LAST_YEAR} end of the ramp`, 'warn', '4'),
      i(`${FIRST_YEAR} accounting error ≈${RC_ERROR.pctGdp}% of GDP, same in every arm`, 'warn', '5'),
    ]},
    ...(FIXED ? [{ label: `Debt/GDP in ${LAST_YEAR}, against the no-AI baseline`, type: 'output', lines: [
      ...fsLine('common_gy', 'Spending a share of GDP'),
      ...fsLine('arms', 'Spending at baseline levels'),
    ]}] : []),
  ]},
  { title: 'How to read the charts', badge: `Caveats ${N_EVERY + 1}–${CAVEATS.length}`, sections: [
    { label: 'Checklist', type: 'output', lines: [
      i(`${FIRST_YEAR} gaps are anticipation`, 'info', '6'),
      i('US: 2030 endpoints, a year earlier than OG-UK’s 2030', 'info', '7'),
      i('Context chart: model changes applied to the OBR level', 'info', '8'),
      i('The level of Z has no meaning, only its target', 'info', '9'),
    ]},
  ]},
];
