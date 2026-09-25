'use client';

// Methodology sections, extracted verbatim from the template's ObrTab so the
// OG-UK vs OBR UK OLG comparison text is reused rather than rewritten.

export const OBR_SECTIONS = [
  {
    id: 'obr-overview',
    label: 'Overview',
    Body: () => (
      <>
          <div className="obr-head"><h3>Overview</h3></div>
          <p className="obr-lede">
            This tab compares the two UK overlapping-generations macro models side by side:{' '}
            <strong>OG-UK</strong> — the UK calibration of{' '}
            <a href="https://github.com/PSLmodels/OG-Core" target="_blank" rel="noreferrer">OG-Core</a>,
            maintained by the{' '}
            <a href="https://pslmodels.org" target="_blank" rel="noreferrer">Policy Simulation Library</a> —
            and the <strong>OBR UK OLG</strong> model described in{' '}
            <a href="/papers/obr-working-paper-22.pdf" target="_blank" rel="noreferrer">OBR Working Paper No.&nbsp;22</a>{' '}
            (April&nbsp;2025).
          </p>
          <p className="obr-lede">
            The sections below walk through how each model treats production, households, bequests, the tax
            system, government, the open economy, and the solution method &amp; calibration — so you can see
            where the two approaches agree, where they differ, and when to reach for one over the other. The
            two models occupy complementary niches: OG-UK carries more structural detail and traces full
            year-by-year transition paths; OBR UK OLG calibrates tightly to UK fiscal institutions and
            reports steady-state outcomes.
          </p>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>OG-UK strength</th>
                <th>OBR UK OLG strength</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Transition dynamics</td><td>Full year-by-year paths</td><td>Steady-state only</td></tr>
              <tr><td>UK institutional detail</td><td>Smooth approximations</td><td>Explicit bands and rates</td></tr>
              <tr><td>Within-cohort inequality</td><td>Permanent types</td><td>Stochastic earnings</td></tr>
              <tr><td>Production structure</td><td>Multi-sector CES</td><td>Single-sector Cobb-Douglas</td></tr>
              <tr><td>Tax instruments</td><td>5 instruments</td><td>3 instruments (more detailed)</td></tr>
              <tr><td>Fiscal policy levers</td><td>G, TR, UBI, I<sub>g</sub></td><td>RBI, age-dependent transfers</td></tr>
              <tr><td>Openness</td><td>Open-source, Python</td><td>MATLAB, closed toolkit</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-1',
    label: 'Production',
    Body: () => (
      <>
          <div className="obr-head"><h3>Production technology</h3></div>
          <p className="obr-lede">
            How each model represents firms — the technology for combining capital and labour, and whether
            production is a single aggregate or split across multiple industries.
          </p>
          <table className="comparison-table">
            <thead><tr><th></th><th>OG-UK</th><th>OBR UK OLG</th></tr></thead>
            <tbody>
              <tr><td>Production function</td><td>CES (nests Cobb-Douglas as special case)</td><td>Cobb-Douglas only</td></tr>
              <tr><td>Industries</td><td>M industries (multi-sector)</td><td>Single sector</td></tr>
              <tr><td>Public capital</td><td>Yes — generates rents to private capital</td><td>No</td></tr>
              <tr><td>Capital share</td><td>Configurable per industry</td><td>α = 0.33</td></tr>
              <tr><td>Labour input</td><td>Efficiency-weighted across permanent types</td><td>Efficiency-weighted by age + stochastic shocks</td></tr>
              <tr><td>TFP</td><td>Varies by industry and over time</td><td>Normalised to 1, with labour-augmenting growth g = 1.2%</td></tr>
              <tr><td>Depreciation</td><td>Configurable per industry</td><td>δ = 5%</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-2',
    label: 'Households',
    Body: () => (
      <>
          <div className="obr-head"><h3>Household heterogeneity</h3></div>
          <p className="obr-lede">
            How households differ within each age cohort, and the utility function they maximise. The core
            structural difference: OG-UK uses <strong>permanent ability types</strong> assigned at birth,
            while the OBR model uses <strong>stochastic earnings shocks</strong> each period — the latter
            generates precautionary savings and within-cohort inequality that evolves over the lifecycle.
          </p>
          <table className="comparison-table">
            <thead><tr><th></th><th>OG-UK</th><th>OBR UK OLG</th></tr></thead>
            <tbody>
              <tr><td>Within-cohort variation</td><td>J <strong>permanent ability types</strong> (deterministic)</td><td><strong>Stochastic earnings shocks</strong> (AR(1) persistent + i.i.d. transitory)</td></tr>
              <tr><td>Income inequality driver</td><td>Fixed type assignment at birth</td><td>Random shocks each period (ρ<sup>z</sup> = 0.9, σ<sub>z</sub> = 0.05, σ<sub>e</sub> = 0.7)</td></tr>
              <tr><td>Precautionary savings</td><td>Not a primary channel</td><td>Yes — driven by earnings uncertainty</td></tr>
              <tr><td>Utility function</td><td>CRRA on consumption; elliptical labour disutility</td><td>Cobb-Douglas over consumption and leisure (non-separable)</td></tr>
              <tr><td>Labour disutility</td><td><strong>Elliptical function</strong> — always interior solutions</td><td>Implicit in Cobb-Douglas composite — corner solutions possible</td></tr>
              <tr><td>Risk aversion parameter</td><td>σ on consumption only</td><td>σ₂ = 2 on consumption-leisure composite</td></tr>
              <tr><td>Consumption aggregation</td><td>Stone-Geary Cobb-Douglas (subsistence levels, I goods)</td><td>Single consumption good</td></tr>
              <tr><td>Discount factor</td><td>β<sub>j</sub> varies by ability type</td><td>β = 0.99 (uniform)</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-3',
    label: 'Bequests',
    Body: () => (
      <>
          <div className="obr-head"><h3>Bequest motive</h3></div>
          <p className="obr-lede">
            How each model handles wealth transfer across generations at death — whether bequests reflect a
            deliberate utility-generating choice, an accident of mortality, or some combination.
          </p>
          <table className="comparison-table">
            <thead><tr><th></th><th>OG-UK</th><th>OBR UK OLG</th></tr></thead>
            <tbody>
              <tr><td>Motive</td><td>“Warm glow” weighted by mortality probability ρ<sub>s</sub></td><td>“Warm glow” with target level, kicks in at age j* = 91</td></tr>
              <tr><td>Varies by type</td><td>Yes — χ<sup>b</sup><sub>j</sub> calibrated per ability type</td><td>Uniform (φ₁ = 10, φ₂ = 4.55)</td></tr>
              <tr><td>Distribution</td><td>To surviving households</td><td>Equal distribution to ages 55–75</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-4',
    label: 'Tax system',
    Body: () => (
      <>
          <div className="obr-head"><h3>Tax system</h3></div>
          <p className="obr-lede">
            <strong>OG-UK</strong> estimates smooth parametric tax functions (Gouveia–Strauss, DEP or linear)
            from microdata that <strong>PolicyEngine UK</strong> generates — an open-source microsimulation
            of the UK income-tax and NICs rulebook. The estimated functions fold in income tax and NICs;
            OG-UK models consumption, wealth, corporate and bequest taxes separately on top. Any reform
            PolicyEngine can represent — rate, threshold or allowance changes — flows straight through after
            re-estimating on post-reform microdata.
          </p>
          <p className="obr-lede">
            The <strong>OBR UK OLG</strong> model instead hard-codes the statutory UK schedule directly:
            income tax as explicit bands (PA £12,570, HRT £50,270, ART £125,140 at 20&nbsp;/&nbsp;40&nbsp;/&nbsp;45%);
            NICs as a separate instrument (£12,570 / £50,270 at 8&nbsp;/&nbsp;2%); VAT as an effective 9.3%;
            and an explicit treatment of pension relief and drawdown taxation. A lever like “+1&nbsp;pp basic
            rate from 2027–28” then takes one parameter to simulate — at the cost of less flexibility for
            reforms that reshape the schedule.
          </p>
      </>
    ),
  },
  {
    id: 'obr-5',
    label: 'Government',
    Body: () => (
      <>
          <div className="obr-head"><h3>Government &amp; fiscal policy</h3></div>
          <p className="obr-lede">
            How the government collects revenue, spends, and closes its budget. The fiscal closure rule —
            which item adjusts to keep debt sustainable — is the modelling choice that determines who bears
            the long-run burden of any reform.
          </p>
          <table className="comparison-table">
            <thead><tr><th></th><th>OG-UK</th><th>OBR UK OLG</th></tr></thead>
            <tbody>
              <tr><td>Budget constraint</td><td>Revenue + new debt = debt service + G + I<sub>g</sub> + pensions + TR + UBI</td><td>Revenue = welfare transfers + RBI + debt service (growth-adjusted)</td></tr>
              <tr><td>Fiscal closure rule</td><td><strong>Configurable</strong>: adjust G, TR, or combination after period T<sub>G1</sub></td><td><strong>Residual Budgetary Item (RBI)</strong> adjusts to stabilise debt/GDP at 100%</td></tr>
              <tr><td>Debt target</td><td>Configurable</td><td>Fixed at 100% of GDP</td></tr>
              <tr><td>Public investment</td><td>Explicit (I<sub>g</sub> contributes to public capital stock)</td><td>Not modelled as productive</td></tr>
              <tr><td>Welfare transfers</td><td>Lump-sum TR</td><td><strong>Age-dependent</strong> transfers (γ<sup>j</sup> scaling) calibrated to OBR welfare spending projections</td></tr>
              <tr><td>State pension</td><td>Part of transfers</td><td><strong>Explicitly modelled</strong> as age-dependent welfare transfer from state pension age onwards</td></tr>
              <tr><td>Spending categories</td><td>G (public goods) + I<sub>g</sub> (infrastructure) + pensions + TR + UBI</td><td>Welfare transfers + residual non-interest spending (G⁰)</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-6',
    label: 'Open economy',
    Body: () => (
      <>
          <div className="obr-head"><h3>Open economy</h3></div>
          <p className="obr-lede">
            How foreign capital and foreign holdings of government debt enter each model, and whether the
            interest rate that follows comes from a global or a domestic margin.
          </p>
          <table className="comparison-table">
            <thead><tr><th></th><th>OG-UK</th><th>OBR UK OLG</th></tr></thead>
            <tbody>
              <tr><td>Approach</td><td><strong>Parameterised capital mobility</strong> (ζ<sub>K</sub> for capital, ζ<sub>D</sub> for debt)</td><td><strong>Binary switch</strong>: fully open (r = 5% exogenous) or fully closed (r endogenous)</td></tr>
              <tr><td>Foreign capital</td><td>Continuous degree of openness</td><td>Either all or nothing</td></tr>
              <tr><td>Net foreign assets</td><td>Derived from capital mobility parameters</td><td>NFA residually determined in open economy</td></tr>
              <tr><td>Interest rate</td><td>Endogenous (influenced by openness parameters)</td><td>Either fixed at 5% (open) or MPK − δ (closed)</td></tr>
            </tbody>
          </table>
      </>
    ),
  },
  {
    id: 'obr-7',
    label: 'Solution & calibration',
    Body: () => (
      <>
          <div className="obr-head"><h3>Solution method &amp; calibration</h3></div>
          <p className="obr-lede">
            Both models are rational-expectations dynamic general equilibrium, but they solve different
            problems. <strong>OG-UK</strong> solves households’ first-order conditions directly via Euler
            equations and iterates to a full <strong>year-by-year transition path</strong> (Time Path
            Iteration), so a reform shows up as a complete trajectory rather than a long-run snapshot.{' '}
            <strong>OBR UK OLG</strong> uses <strong>Value Function Iteration</strong> (Kirkby’s VFI toolkit)
            and compares long-run steady states only; it does not trace the adjustment path between them. As
            a consequence OG-UK’s state space is continuous and its expectations run over the whole path,
            while the OBR model discretises assets and stochastic earnings on a grid and forms expectations
            within each steady state.
          </p>
          <p className="obr-lede">
            Calibration differs mainly in data sources and anchors. <strong>OG-UK</strong> draws demographics
            from the UN World Population Prospects (country 826), age-earning profiles from microdata via its
            permanent ability types, and tax functions from PolicyEngine-UK’s Enhanced FRS (FRS enhanced with
            HMRC SPI, LCFS and WAS); ONS GDP levels anchor the macro aggregates, and the modeller sets fiscal
            targets and growth assumptions. <strong>OBR UK OLG</strong> uses ONS mortality statistics for
            demographics, ONS ASHE plus the HMRC earnings distribution for age-earnings profiles, and
            HMRC / GOV.UK parameters directly for taxes; the model pins to the OBR March 2024 EFO — GDP per
            person of £35,100 (scaling parameter S&nbsp;=&nbsp;19.81), population growth n&nbsp;=&nbsp;0.75%,
            productivity growth g&nbsp;=&nbsp;1.2%, and debt / GDP stabilised at 100%.
          </p>
      </>
    ),
  },
];

export const OBR_SOURCE = 'Source: OBR Working Paper No. 22, “A new UK overlapping generations model” (April 2025). OG-Core documentation and OG-UK calibration code.';
