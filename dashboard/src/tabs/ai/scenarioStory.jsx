'use client';

// Scenario design tab: the steps (left) and the sticky panels (right) for the
// two-pane story. Home of the assumptions, the fiscal convention and the
// caveats. Caveat ids (caveat-sector, ...) are the targets of the numbered
// caveat links on the other tabs; keep CAVEATS below in step with them.

import AiChannels from '@/tabs/ai/AiChannels.jsx';
import CaveatLink from '@/tabs/ai/CaveatLink.jsx';
import { ARM_META, US_COLORS } from '@/tabs/ai/series.js';
import { URLS, issue, pr, efo, EFO_PAGE, REPO_BLOB } from '@/tabs/ai/links.js';
import {
  D, YEARS, FIRST_YEAR, LAST, LAST_YEAR, G0, G1, LS0, LS1, LS_FALL, GAMMA_ONLY_GAIN, KL0, Z_SHARE_SHIFT,
  Z_SHARE_SHIFT_TFP, Z_SHARE_SHIFT_FIXED, Z_SHARE_SHIFT_YEAR, SHARE_SHIFT_TECH, TG1, OBR, KORINEK, CIT_RATE,
  MODEL_RATIOS, ZK, CLOSURE, CL, CL_YEARS, LATE_YEAR, cgap, abroadPct, DEBT_CAL, OBR_DEBT, DEBT_MAX_SHORT,
  DEBT_MAX_SHORT_IDX, signed, gapAt, taxGdpChangePp,
} from '@/tabs/ai/metrics.js';
import paths from '@/data/ukAiPaths.json';

// UK net primary income paid abroad, % of GDP (ONS, The Pink Book 2026,
// 30 October 2026: primary income deficit 1.2% in 2025, 1.6% in 2024). The
// range docs/closure_choice.md checks the central closure's baseline against.
const UK_ABROAD = { lo: 1.2, hi: 1.6, source: 'ONS Pink Book 2026' };

// Caveat numbers, in display order. Every <CaveatLink> on the dashboard
// takes its number from here.
export const CAVEATS = [
  // affect every number
  'imposed', 'sector', 'displacement', 'fiscal', 'investment', 'financing', 'ramp-end',
  // how to read the charts
  'anticipation', 'us', 'levels', 'z',
];
export const caveatNo = (id) => CAVEATS.indexOf(id) + 1;
const N_EVERY = CAVEATS.indexOf('anticipation');

export function Cv({ id, children }) {
  return <CaveatLink id={`caveat-${id}`}>{children ?? `caveat ${caveatNo(id)}`}</CaveatLink>;
}

const TAX_SHARE_SHIFT = taxGdpChangePp('share_shift_ramp');
const SHARE_SHIFT_Y = gapAt('share_shift_ramp', 'Y');
const SS_Y_2026 = gapAt('share_shift_ramp', 'Y', 0);
const SS_Y_LATE = cgap('central', 'share_shift_ramp', 'Y', LATE_YEAR);
// Largest share_shift GDP gap over every exported year (central closure).
const SS_Y_MAX_YEAR = (() => {
  const v = CL.central.arms.share_shift_ramp.Y;
  return CL_YEARS[v.indexOf(Math.max(...v))];
})();
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

export const STORY_STEPS = [
  {
    title: 'How OG-UK is adapted to study AI',
    content: (
      <>
        <p className="key-point">
          OG-UK has no AI parameter; AI enters through <b>two changes to the production technology</b>, and
          everything else is as in the OBR-central baseline.
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
            <b>Productivity</b> enters as TFP Z, solved ({ext(URLS.calibrate, 'calibrate.py')}) for each
            scenario&rsquo;s target: +{KORINEK.tfp}% output at fixed inputs for Automation + productivity, and GDP
            unchanged from the baseline in {Z_SHARE_SHIFT_YEAR} for Automation only.
          </li>
          <li>
            <b>Timing.</b> Both rise linearly from their baseline values in {FIRST_YEAR} to their full values in{' '}
            {LAST_YEAR} and stay there afterwards. Households and firms know the whole path in advance (perfect
            foresight).
          </li>
          <li>
            <b>Everything else is unchanged</b>: every scenario starts from the OBR-central baseline&rsquo;s assets and
            debt, uses the same fiscal rule (<Cv id="fiscal" />), and has the same demographics, tax system and
            capital closure (<Cv id="financing" />). The runs are driven by {ext(URLS.solve, 'solve.py')}.
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
          <a href="#coverage">Model comparison</a>.
        </p>
        <AiChannels />
      </>
    ),
  },
  {
    title: 'Scenario 1: OBR central',
    content: (
      <Scenario
        color={ARM_META.baseline.color}
        name={ARM_META.baseline.label}
        tag="OBR-central baseline"
        saysLabel="Role"
        says={<p>Every other path is measured against this one. It is checked against the OBR&rsquo;s forecast under <a href="#coverage">Model comparison</a>.</p>}
        enters={
          <>
            <p>
              &epsilon; = 1, &gamma; = {G0} and Z = 1 in every year. &gamma; = {G0} (a labour share of{' '}
              {LS0.toFixed(0)}%) is OG-Core&rsquo;s default, not a UK estimate.
            </p>
            <p>
              No AI shock beyond the OBR&rsquo;s own: OG-UK&rsquo;s existing calibration and the current tax system. Labour-augmenting
              productivity grows at {(D.assum.g_y_annual * 100).toFixed(1)}% a year, the OBR&rsquo;s medium-term
              rate, which already includes the OBR&rsquo;s own AI assumption, so every gap on this page is an AI
              effect in addition to it; the population follows the UN World Population Prospects projection for the UK.
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
          A shift of income from labour to capital with <b>GDP unchanged in {Z_SHARE_SHIFT_YEAR}</b>.
        </p>
        <Scenario
          color={ARM_META.share_shift_ramp.color}
          name={ARM_META.share_shift_ramp.label}
          tag="automation"
          enters={
            <>
              <p>
                Z is solved so that equilibrium GDP in {Z_SHARE_SHIFT_YEAR} equals the baseline&rsquo;s (
                {ext(issue(8), '#8')}). Capital still rises, so the Z that holds GDP flat lowers output at fixed
                baseline inputs by {Math.abs(SHARE_SHIFT_TECH).toFixed(1)}% against a pure factor-bias shift (Z ={' '}
                {Z_SHARE_SHIFT.toFixed(4)} against {Z_SHARE_SHIFT_FIXED.toFixed(4)}).
              </p>
              <p>
                Only {Z_SHARE_SHIFT_YEAR} is targeted. GDP is {signed(SS_Y_2026)}% in {FIRST_YEAR} (
                <Cv id="anticipation" />) and {signed(SS_Y_LATE, 2)}% by {LATE_YEAR}.
              </p>
            </>
          }
          says={
            <>
              <p>
                The automation-only case follows the OBR&rsquo;s {ext(efo(EFO_PAGE.box22), 'Box 2.2')} in the March
                2026 <i>Economic and fiscal outlook</i>: a lower labour share with the level of GDP unchanged. In
                the OBR&rsquo;s words, &ldquo;higher trend productivity fully offsets
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
          tax. In {LAST_YEAR} this scenario lowers tax/GDP by {Math.abs(TAX_SHARE_SHIFT).toFixed(2)}pp. The OBR (
          {ext(efo(EFO_PAGE.p6_18), 'EFO paragraph 6.18')}) puts the effect of its scenario on receipts at {signed(OBR.receiptsBn, 0).replace('\u2212', '\u2212£')}bn a
          year (about {Math.abs(OBR.receiptsPctGdp)}% of GDP), with borrowing +£{OBR.borrowingBn}bn a year and debt +
          {OBR.debtPctGdp}% of GDP by 2030-31. The model&rsquo;s debt/GDP gap is in the{' '}
          <CaveatLink tab="growth" id="effect-debt">effect table</CaveatLink>, with its {LATE_YEAR} value; it depends on the fiscal convention (
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
          color={ARM_META.share_shift_tfp_ramp.color}
          name={ARM_META.share_shift_tfp_ramp.label}
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
              with the UK OBR-central baseline; the two baselines grow at different rates, so levels are not
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
          {GAMMA_ONLY_GAIN.toFixed(2)}%. Z removes all but +{KORINEK.tfp}% of that gain in Automation +
          productivity. In Automation only it removes all of it and a further{' '}
          {Math.abs(SHARE_SHIFT_TECH).toFixed(1)}%, the amount that holds {Z_SHARE_SHIFT_YEAR} GDP at the
          baseline&rsquo;s. Both solved values are below 1, and the two AI scenarios differ only in Z.
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
          {['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][N_EVERY] || N_EVERY} limits apply to every result on <a href="#growth">Economic effects</a>.
        </p>
        <ol className="caveat-list" start={1}>
          <li id="caveat-imposed">
            <b>The shock is imposed, not estimated.</b> The labour-share fall and the TFP gain are calibrated to a
            US model (Korinek et al.), and at &epsilon;&nbsp;=&nbsp;1 the labour share falls by construction.
          </li>
          <li id="caveat-sector">
            <b>One sector.</b> With one good, spending cannot shift from what is automated to what stays scarce,
            so the demand-composition channel is absent; OG-UK&rsquo;s 8-sector build carries it, but its
            transition path diverges after about seven periods, so it is not used.
          </li>
          <li id="caveat-displacement">
            <b>Automation only is not the OBR&rsquo;s scenario.</b> The OBR holds GDP unchanged through higher
            unemployment ({OBR.unemployment}%). OG-UK has no unemployment or job search: here GDP is held at the
            baseline&rsquo;s in {Z_SHARE_SHIFT_YEAR} by the choice of Z, not by lost jobs, so none of the
            OBR&rsquo;s welfare-spending cost appears.
          </li>
          <li id="caveat-fiscal">
            <b>Fiscal results depend on the spending rule.</b> Government consumption and transfers are fixed
            shares of GDP in every scenario, so spending rises with AI-driven GDP and debt is the residual; debt
            targeting starts only in {FIRST_YEAR + TG1}, so nothing closes the debt/GDP gaps inside the exported
            years, and they keep moving after {LAST_YEAR} (<CaveatLink tab="growth" id="effect-debt">effect table</CaveatLink>). The gilt rate
            moves one for one with the return on capital, and the whole debt stock reprices each year. The OBR
            convention holds spending plans fixed instead.
            <span className="note-box" style={{ display: 'block' }}>
              The baseline&rsquo;s spending share is set so that its debt/GDP in {LAST_YEAR} equals the
              OBR&rsquo;s ({DEBT_CAL.target_2030_pct.toFixed(1)}%). {LAST_YEAR} is matched, not the path: the baseline
              is flat at about {DEBT_CAL.debt_gdp_pct[0].toFixed(0)}%, and in {YEARS[DEBT_MAX_SHORT_IDX]} it is{' '}
              {DEBT_MAX_SHORT.toFixed(1)}pp below the OBR&rsquo;s {OBR_DEBT[DEBT_MAX_SHORT_IDX].toFixed(1)}% (
              {ext(issue(32), '#32')}).
            </span>
          </li>
          <li id="caveat-investment">
            <b>Investment rises before the technology changes.</b> Agents foresee the ramp (perfect foresight) and
            OG-Core has no capital adjustment costs, so investment jumps from {FIRST_YEAR}. The higher interest
            rate (<CaveatLink tab="growth" id="effect-rate">effect table</CaveatLink>) is what rations it. This is coherent within the model,
            not a forecast of an investment boom.
          </li>
          <li id="caveat-financing">
            <b>Most of the new capital is foreign-owned, and the closure is a choice.</b> Foreign investors supply a
            fraction &zeta;<sub>K</sub> of the gap between the capital firms would demand at the world interest rate
            ({(CLOSURE.world_int_rate_annual * 100).toFixed(0)}%) and the capital domestic savers hold; they also
            buy a share &zeta;<sub>D</sub>&nbsp;=&nbsp;{CLOSURE.zeta_D} of new government debt. The central value,
            &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.central}, is inherited from OG-Core, whose documentation notes it is
            hard to pin down from data; it was not estimated for the UK. Its baseline pays{' '}
            {abroadPct('central', FIRST_YEAR).toFixed(1)}&ndash;{abroadPct('central', LAST_YEAR).toFixed(1)}% of GDP
            abroad over {FIRST_YEAR}&ndash;{LAST_YEAR}, within the UK&rsquo;s {UK_ABROAD.lo}&ndash;{UK_ABROAD.hi}% (
            {UK_ABROAD.source}), but its current account deficit is smaller than the UK&rsquo;s. The closed-capital
            bound, &zeta;<sub>K</sub>&nbsp;=&nbsp;{ZK.bound}, is shown beside it in the headline table and the GNI
            and GDP charts. The reasoning is in{' '}
            {ext(`${REPO_BLOB}/docs/closure_choice.md`, 'closure_choice.md')} ({ext(issue(16), '#16')}).
          </li>
          <li id="caveat-ramp-end">
            <b>The {LAST_YEAR} fall in investment is the end of the ramp.</b> The linear ramp stops in {LAST_YEAR},
            so the capital stock stops needing to grow as fast and the inflow of foreign-owned capital (
            <Cv id="financing" />) falls back.
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
            {FIRST_YEAR}; the AI scenarios already differ because households and firms, under perfect foresight,
            see the ramp coming. Households work more before wages fall: in Automation only, {FIRST_YEAR} is the
            {SS_Y_MAX_YEAR === FIRST_YEAR ? ' largest GDP gap' : ` GDP gap of ${signed(SS_Y_2026)}%`} in{' '}
            {FIRST_YEAR}&ndash;{LATE_YEAR}
            {SS_Y_MAX_YEAR === FIRST_YEAR ? ` (${signed(SS_Y_2026)}%)` : null}.
          </li>
          <li id="caveat-us">
            <b>The US comparison is cross-country, cross-model and a year apart.</b> Korinek et al.&rsquo;s Table 3
            figures are for the start of 2030 (growth over the 12 months to then); OG-UK&rsquo;s period 2030 is
            a year later, and the UK ramp runs four years against their three and a half from mid-2026. On a
            like-for-like date the UK gap lies between its 2029 and 2030 values. Levels are not compared: each
            country&rsquo;s gap is measured from its own baseline. OG-UK is an OLG model with UK demographics
            and taxes; theirs is a US scenario model with neither.
          </li>
          <li id="caveat-levels">
            <b>The context chart applies the model&rsquo;s changes to the OBR&rsquo;s level.</b> OG-UK&rsquo;s own
            baseline ratios differ from the data, so each scenario path starts from the OBR&rsquo;s {FIRST_YEAR}{' '}
            value and moves by the model&rsquo;s proportional change in the ratio. The AI scenarios start away from
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
                . Debt/GDP starts from the model&rsquo;s common {DEBT_CAL.debt_gdp_pct[0].toFixed(1)}% and is
                calibrated to the OBR&rsquo;s in {LAST_YEAR} only (<Cv id="fiscal" />). Government consumption is
                not like for like: the OBR series excludes public investment, and model G is all spending other
                than transfers, pensions and interest.
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
          Three problems in earlier versions were fixed in {ext(pr(11), 'PR #11')}: the AI scenarios set their own
          spending share ({ext(issue(2), '#2')}), the window stopped at 2029 because of an early switch to debt
          targeting ({ext(issue(3), '#3')}), and productivity growth was mis-sourced ({ext(issue(5), '#5')}; see{' '}
          <a href="#coverage">Model comparison</a>). The corrective reruns in {ext(pr(33), 'PR #33')} then removed
          an accounting residual in {FIRST_YEAR} and 2028 that came from the demographic inputs (
          {ext(issue(15), '#15')}), calibrated the baseline debt path ({ext(issue(32), '#32')}), stated the capital
          closure with its bound ({ext(issue(16), '#16')}), and redefined Automation only by unchanged{' '}
          {Z_SHARE_SHIFT_YEAR} GDP ({ext(issue(8), '#8')}).
        </p>
      </>
    ),
  },
];

const i = (text, cls = 'info', icon = '\\(\\to\\)') => ({ icon, text, cls });

const V = (text) => i(text, 'info', '=');

export const STORY_PANELS = [
  { title: 'Production with AI', badge: 'Step 1', sections: [
    { label: 'Technology (one sector, ε = 1)', type: 'math', equations: [
      { label: 'Output', tex: 'Y_t = Z_t\\,K_t^{\\gamma_t}\\,\\bigl(e^{g_y t}L_t\\bigr)^{1-\\gamma_t}' },
      { label: 'Labour share', tex: 's_{L,t} = \\frac{w_t L_t}{Y_t} = 1-\\gamma_t' },
      { label: 'Automation', tex: '\\gamma_t = \\gamma_0 + \\min(t/T,\\,1)\\,(\\gamma_1-\\gamma_0)' },
      { label: 'Productivity', tex: 'Z_t = 1 + \\min(t/T,\\,1)\\,(Z^{*}-1)' },
      { label: 'Z solve, Automation + productivity: target τ at baseline inputs', tex: 'Z^{*} = (1+\\tau)\\,(K_0/L_0)^{-(\\gamma_1-\\gamma_0)}' },
    ]},
    { label: 'Values', type: 'output', lines: [
      V(`\\(\\gamma_0 = ${G0}\\), \\(\\gamma_1 = ${G1}\\): labour share ${LS0.toFixed(0)}% → ${LS1.toFixed(1)}%`),
      V(`\\(T = ${LAST}\\): full values from ${LAST_YEAR}; \\(t = 0\\) is ${FIRST_YEAR}`),
      V(`\\(\\tau = ${(KORINEK.tfp / 100).toFixed(3)}\\) Automation + productivity`),
      V(`Automation only: \\(Z^{*}\\) solved for unchanged ${Z_SHARE_SHIFT_YEAR} GDP`),
    ]},
  ]},
  { title: 'Channel coverage', badge: 'Step 2', sections: [
    { label: 'Modelled', type: 'output', lines: [
      i('Automation: \\(\\gamma\\) ramps', 'accent'),
      i('Productivity: \\(Z\\) solved to target', 'accent'),
      i('Capital accumulation: endogenous', 'accent'),
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
  { title: ARM_META.baseline.label, badge: 'Scenario 1', sections: [
    { label: 'Parameters, every year', type: 'math', equations: [
      { label: '', tex: '\\gamma_t = \\gamma_0, \\quad Z_t = 1, \\quad s_L = 1-\\gamma_0' },
    ]},
    { label: 'Values', type: 'output', lines: [
      V(`\\(\\varepsilon = 1\\), \\(\\gamma_0 = ${G0}\\): labour share ${LS0.toFixed(0)}% (OG-Core default)`),
      V(`\\(g_y = ${D.assum.g_y_annual.toFixed(3)}\\): productivity growth ${(D.assum.g_y_annual * 100).toFixed(1)}% a year`),
      i('Population: UN World Population Prospects, UK'),
    ]},
  ]},
  { title: ARM_META.share_shift_ramp.label, badge: 'Scenario 2', sections: [
    { label: `Target: GDP unchanged in ${Z_SHARE_SHIFT_YEAR}, in equilibrium`, type: 'math', equations: [
      { label: `Solved by secant over full transition-path solves`, tex: `Y_{${Z_SHARE_SHIFT_YEAR}}(Z^{*}) = Y^{\\text{base}}_{${Z_SHARE_SHIFT_YEAR}}` },
      { label: 'For comparison: no output gain at baseline K₀, L₀', tex: 'Z^{\\text{fixed}} = (K_0/L_0)^{-(\\gamma_1-\\gamma_0)}' },
    ]},
    { label: 'Values', type: 'output', lines: [
      V(`\\(Z^{*} = ${Z_SHARE_SHIFT.toFixed(4)}\\), \\(Z^{\\text{fixed}} = ${Z_SHARE_SHIFT_FIXED.toFixed(4)}\\)`),
      V(`Output at fixed inputs: ${signed(SHARE_SHIFT_TECH)}% against \\(Z^{\\text{fixed}}\\)`),
    ]},
    { label: `Against the OBR's Box 2.2, ${LAST_YEAR}`, type: 'grid', cols: ['OG-UK', 'OBR'], rows: [
      { label: 'Labour share', cells: [`−${LS_FALL.toFixed(1)}pp (imposed)`, 'lower'] },
      { label: 'GDP', cells: [`${signed(SHARE_SHIFT_Y)}% (target)`, 'unchanged'] },
      { label: 'Tax/GDP (¶6.18)', cells: [`${signed(TAX_SHARE_SHIFT, 2)}pp`, `≈${OBR.receiptsPctGdp}pp`] },
      { label: 'Unemployment', cells: ['n/a', `${OBR.unemployment}%`] },
    ]},
  ]},
  { title: ARM_META.share_shift_tfp_ramp.label, badge: 'Scenario 3', sections: [
    { label: 'Target: measured TFP gain τ at fixed inputs', type: 'math', equations: [
      { label: 'At baseline K₀, L₀', tex: '\\frac{Z^{*} K_0^{\\gamma_1} L_0^{1-\\gamma_1}}{K_0^{\\gamma_0} L_0^{1-\\gamma_0}} = 1+\\tau' },
      { label: 'Solved', tex: 'Z^{*} = (1+\\tau)\\,(K_0/L_0)^{-(\\gamma_1-\\gamma_0)}' },
    ]},
    { label: 'Values', type: 'output', lines: [
      V(`\\(\\tau = ${(KORINEK.tfp / 100).toFixed(3)}\\), \\(Z^{*} = ${Z_SHARE_SHIFT_TFP.toFixed(4)}\\)`),
    ]},
    { label: 'Calibration to Korinek et al. (2026), Table 3', type: 'output', lines: [
      i(`Labour share −${LS_FALL.toFixed(1)}pp: matched`, 'accent', '='),
      i(`Measured TFP +${KORINEK.tfp}%: matched`, 'accent', '='),
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
    { label: 'Output gain from γ alone, at baseline inputs', type: 'math', equations: [
      { label: '', tex: 'g_{\\gamma} = (K_0/L_0)^{\\gamma_1-\\gamma_0} - 1' },
      { label: 'Hence, with productivity gains', tex: 'Z^{*} = \\frac{1+\\tau}{1+g_{\\gamma}} < 1 \\iff \\tau < g_{\\gamma}' },
    ]},
    { label: 'Values', type: 'output', lines: [
      V(`\\(g_{\\gamma} = ${GAMMA_ONLY_GAIN.toFixed(2)}\\%\\), \\(K_0/L_0 = ${KL0.toFixed(4)}\\) (model units)`),
      V(`\\(Z^{*}\\): ${Z_SHARE_SHIFT.toFixed(4)} Automation only, ${Z_SHARE_SHIFT_TFP.toFixed(4)} Automation + productivity`),
    ]},
  ]},
  { title: 'Affects every number', badge: `Caveats 1–${N_EVERY}`, sections: [
    { label: 'Checklist', type: 'output', lines: [
      [
        'Shock imposed, calibrated to a US model',
        'One sector: no demand-composition channel',
        'No unemployment: not the OBR scenario',
        `Spending a share of GDP; debt the residual to ${FIRST_YEAR + TG1}`,
        'Investment rises early: perfect foresight',
        `Capital closure ζK = ${ZK.central}: OG-UK default; bound ζK = ${ZK.bound}`,
        `${LAST_YEAR} investment fall: end of the ramp`,
      ].map((t, k) => i(t, 'warn', String(k + 1))),
    ].flat() },
  ]},
  { title: 'How to read the charts', badge: `Caveats ${N_EVERY + 1}–${CAVEATS.length}`, sections: [
    { label: 'Checklist', type: 'output', lines: [
      `${FIRST_YEAR} gaps are anticipation`,
      'US: 2030 endpoints, a year earlier than OG-UK’s 2030',
      'Context chart: model changes applied to the OBR level',
      'The level of Z has no meaning, only its target',
    ].map((t, k) => i(t, 'info', String(N_EVERY + k + 1))) },
  ]},
];
