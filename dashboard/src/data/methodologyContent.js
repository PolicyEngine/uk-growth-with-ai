// Methodology-tab narrative content.
// Each step has a title and an HTML body (sub-headings + paragraphs).

export const STEPS = [
  {
    title: 'The overlapping-generations idea',
    body: `<div class="sub-heading">Many generations coexist</div>
              <p>The central insight of an overlapping-generations model is that the economy is not populated by a single &ldquo;representative agent.&rdquo; At any moment in time, many generations coexist: young people just entering the labour force, middle-aged workers at peak earnings, and retirees living off savings and pensions. Each generation has a different remaining lifespan, a different stock of accumulated wealth, and therefore a different response to any given policy change.</p>
              <div class="sub-heading">Age cohorts</div>
              <p>OG-Core models S economically active age cohorts (typically 80, representing ages 21 to 100). Each period, a new cohort is born and the oldest cohort dies with some probability. The population distribution by age evolves over time with fertility, mortality, and immigration, and eventually reaches a stationary distribution in the long run.</p>
              <div class="sub-heading">Ability types</div>
              <p>Within each age cohort, households split into J ability types, each with a distinct permanent labour productivity. High-ability types earn more per hour of work and typically save more. This heterogeneity captures how a tax reform affects the income distribution, not just average outcomes.</p>`,
  },
  {
    title: 'Household decisions',
    body: `<div class="sub-heading">Three decisions each period</div>
              <p>Every period, each household makes three decisions: how much to <strong>consume</strong>, how many hours to <strong>work</strong>, and how much to <strong>save</strong> for the future. The household chooses these to maximise expected lifetime utility, subject to a budget constraint.</p>
              <div class="sub-heading">Consumption utility</div>
              <p>Consumption utility follows a CRRA (constant relative risk aversion) function, where the risk aversion parameter governs how strongly households prefer smooth consumption over time. Before entering this function, a Stone-Geary Cobb-Douglas form aggregates the individual consumption goods, accounting for minimum subsistence levels.</p>
              <div class="sub-heading">Labour disutility</div>
              <p>Labour disutility uses an elliptical function rather than a standard power function. This ensures that the marginal cost of working goes to zero when hours are zero (so households always choose to work at least a little) and goes to infinity at the upper bound (so they never hit the ceiling). This avoids computationally expensive occasionally-binding constraint methods.</p>
              <div class="sub-heading">Bequest utility</div>
              <p>Bequest utility captures the &ldquo;warm glow&rdquo; from leaving wealth behind upon death. The age-specific mortality probability weights it, so it matters most for older households. The strength of the bequest motive varies by ability type and is calibrated to match the observed wealth distribution.</p>
              <div class="sub-heading">Budget constraint and Euler equations</div>
              <p>The household's budget constraint says that each period, income from savings returns, labour earnings, bequests received, government transfers, and pensions must cover consumption (including consumption taxes), income and wealth taxes, and savings carried into the next period.</p>
              <p>Two Euler equations characterise the optimal decisions. The labour first-order condition says: work until the after-tax wage equals the marginal disutility. The savings Euler equation says: give up one unit of consumption today only if the discounted, after-tax return makes tomorrow&rsquo;s consumption sufficiently valuable.</p>`,
  },
  {
    title: 'Firms and production',
    body: `<div class="sub-heading">CES technology</div>
              <p>The production side of the economy consists of M industries, each populated by perfectly competitive firms. Each firm combines three inputs: <strong>private capital</strong>, <strong>public capital</strong> (government-provided infrastructure), and <strong>labour</strong>. A constant elasticity of substitution (CES) technology combines them.</p>
              <div class="sub-heading">Substitution and productivity</div>
              <p>The elasticity parameter governs how easily firms substitute between capital and labour. When it equals one, the function reduces to the Cobb-Douglas form. Total factor productivity varies across industries and over time, so the model can capture sector-specific technological change.</p>
              <div class="sub-heading">First-order conditions</div>
              <p>Profit maximisation yields the standard first-order conditions: the <strong>wage equals the marginal product of labour</strong>, and the <strong>rental rate of capital</strong> equals the after-tax marginal product of capital, accounting for depreciation, tax deductions, and investment tax credits.</p>
              <div class="sub-heading">Public capital rents</div>
              <p>One feature of OG-Core sets it apart: <strong>public capital generates economic rents</strong>. Since firms cannot deduct the cost of using government infrastructure, the returns from public capital flow to private capital owners through an augmented rate of return.</p>`,
  },
  {
    title: 'Government',
    body: `<div class="sub-heading">Revenue and spending</div>
              <p>The government in OG-Core collects revenue from <strong>five tax instruments</strong>: individual income taxes, consumption taxes, wealth taxes, corporate income taxes, and bequest taxes. It spends on public goods, infrastructure, pensions, lump-sum transfers, and universal basic income. Issuing debt finances the difference.</p>
              <div class="sub-heading">Income tax: Gouveia-Strauss functions</div>
              <p>The income tax carries the most structure. OG-Core supports several functional forms for effective and marginal tax rates, fitted to detailed tax-benefit calculations. For OG-UK, we use the <strong>Gouveia-Strauss</strong> specification, which estimates the effective tax rate as a smooth, monotonically increasing function of income and derives the marginal tax rate analytically. The estimation runs on PolicyEngine-UK output drawn from the <strong>Enhanced FRS</strong> &mdash; the Family Resources Survey enhanced with HMRC&rsquo;s Survey of Personal Incomes, the Living Costs and Food Survey, and the Wealth and Assets Survey.</p>
              <div class="sub-heading">Other tax instruments</div>
              <p>The <strong>wealth tax</strong> uses a progressive three-parameter function that produces anything from zero taxation to smoothly increasing marginal rates. <strong>Consumption taxes</strong> take linear rates that vary by good, covering VAT and excise. <strong>Corporate income taxes</strong> take flat rates by industry.</p>
              <div class="sub-heading">Fiscal closure rule</div>
              <p>Since debt cannot grow without bound, a <strong>fiscal closure rule</strong> activates after a specified period to bring the debt-to-GDP ratio gradually towards a target. The modeller chooses whether the adjustment falls on government spending, transfers, or a combination of both.</p>`,
  },
  {
    title: 'Market clearing and equilibrium',
    body: `<div class="sub-heading">Supply equals demand</div>
              <p><strong>Market clearing conditions</strong> connect all the pieces above — household decisions, firm production, and government policy. For the economy to be in equilibrium, supply must equal demand in every market simultaneously.</p>
              <div class="sub-heading">Labour and capital markets</div>
              <p>In the <strong>labour market</strong>, the total efficiency-weighted labour supply from all households across all ages and ability types must equal total firm demand across all industries. In the <strong>capital market</strong>, the total stock of savings (both domestic and foreign) must equal the capital firms demand plus government debt. The model runs as an <strong>open economy</strong>: parameters control foreign capital and foreign debt holdings, setting the degree of international capital mobility.</p>
              <div class="sub-heading">Goods and debt markets</div>
              <p>For each <strong>goods market</strong>, industry output must equal consumption demand. The final industry clears residually, absorbing investment, government purchases, and any remaining demand. The <strong>debt market</strong> splits government debt between domestic and foreign holders.</p>
              <div class="sub-heading">What defines an equilibrium</div>
              <p>An equilibrium is a set of prices (the interest rate, wage, and goods prices) such that all households optimise, all firms optimise, the government budget constraint holds, and all four markets clear. Finding one is a large-scale nonlinear fixed-point problem.</p>`,
  },
  {
    title: 'How the model is solved',
    body: `<div class="sub-heading">Two-stage approach</div>
              <p>Finding equilibrium is a two-stage computational problem. The model first solves for the long-run steady state, then computes the transition path from today's economy to that steady state.</p>
              <div class="sub-heading">Stage 1: Steady state</div>
              <p>The model first finds the long-run equilibrium where all variables stay constant (after removing trend growth). It uses a nested fixed-point algorithm. The <em>outer loop</em> guesses a vector of aggregate prices and quantities. The <em>inner loop</em> takes these as given and solves the Euler equations for every combination of ability type and age. Because each type is independent, the inner loop solves them <strong>in parallel</strong>. After solving all households, the algorithm aggregates their decisions, computes firm demands, checks the government budget, and derives new guesses. It iterates until convergence.</p>
              <div class="sub-heading">Stage 2: Transition path (TPI)</div>
              <p>Starting from today&rsquo;s economy, the model then solves for how the economy evolves towards the steady state over T periods. The <em>Time Path Iteration</em> (TPI) method guesses entire time paths for all prices and quantities, solves every cohort&rsquo;s lifetime decisions given those paths (with <strong>rational expectations</strong> about future prices), checks whether the implied paths match the guesses, and iterates. This step produces the year-by-year projections.</p>`,
  },
  {
    title: 'Calibrating for the United Kingdom',
    body: `<div class="sub-heading">From theory to UK data</div>
              <p>OG-Core provides the theoretical framework. Turning it into a model of the <em>UK</em> economy means calibrating every parameter to UK data. The OG-UK calibration layer handles that step.</p>
              <div class="sub-heading">Macroeconomic parameters</div>
              <p>Macroeconomic parameters come from the ONS national accounts and the OBR&rsquo;s Economic and Fiscal Outlook: the debt-to-GDP ratio, the revenue-to-GDP ratio, government spending shares, and growth rates. The state pension age matches current UK rules. Demographics come from the UN World Population Prospects data for the United Kingdom.</p>
              <div class="sub-heading">Tax function estimation</div>
              <p>Tax functions come from PolicyEngine UK. Rather than hard-coding the UK income tax schedule, the model fits smooth <strong>Gouveia-Strauss</strong> functions that capture the effective relationship between income and taxes across the entire population. This approach folds in the interaction of income tax, National Insurance, and the personal allowance taper.</p>
              <div class="sub-heading">Real-world mapping</div>
              <p>The model outputs values in abstract units. To translate them into pound-sterling figures, OG-UK anchors the model&rsquo;s steady-state GDP to the ONS figure and scales all other variables proportionally. Results then read as changes in billions of pounds — a format that policymakers and the public can read directly.</p>`,
  },
  {
    title: 'What this enables',
    body: `<div class="sub-heading">Two complementary views</div>
              <p>Together with a static microsimulation engine, OG-UK supports two complementary views of any UK tax or benefit reform. Static analysis provides the detailed distributional picture: which households gain, which lose, and by how much. OG-UK provides the macroeconomic picture: what happens to GDP, investment, government revenue, interest rates, and wages as the economy adjusts over time.</p>
              <div class="sub-heading">Why both views matter</div>
              <p>The two perspectives can tell different stories. A reform that raises revenue in a static analysis may raise less in practice, because higher tax rates reduce labour supply and investment and shrink the tax base. The reverse also holds: a reform that costs revenue upfront might pay for itself over time through extra economic activity. OG-UK captures these dynamics.</p>
              <div class="sub-heading">Year-by-year transition paths</div>
              <p>The transition path carries the bulk of the answer. Rather than comparing two long-run steady states, it shows the <strong>year-by-year adjustment</strong>: how GDP dips in the first few years, how interest rates respond, when revenue stabilises. These time paths map onto OBR forecast horizons.</p>

              <div class="sub-heading">What the model does not capture</div>
              <p>OG-UK is a structural macro model and inherits the simplifications of that class. The caveats for reading its outputs:</p>
              <ul class="intro-list">
                <li><strong>Smoothed tax functions, not statutory bands.</strong> A single Gouveia&ndash;Strauss function, fitted to PolicyEngine-UK output, folds in income tax and National Insurance. Reforms that change <em>average</em> liability across the income distribution flow through cleanly; reforms whose mechanism is the kink itself (a new threshold, an allowance taper change) come through only to the extent the smoothed function shifts.</li>
                <li><strong>Permanent ability types, no earnings risk.</strong> OG-UK uses J&nbsp;=&nbsp;7 deterministic ability types. There is no idiosyncratic earnings shock within a type, so precautionary savings and earnings-risk-driven inequality are not a channel here. This is a deliberate trade-off &mdash; the OBR&rsquo;s own UK OLG model (<a href="/papers/obr-working-paper-22.pdf" target="_blank" rel="noreferrer">Working Paper No.&nbsp;22</a>) takes the alternative.</li>
                <li><strong>UK as a single entity.</strong> The model calibrates to UK-wide aggregates; there is no England / Scotland / Wales / Northern&nbsp;Ireland breakdown. Devolved tax differentials and reforms with explicit regional incidence sit below the model&rsquo;s granularity.</li>
                <li><strong>Reforms are step changes.</strong> A PolicyEngine reform sets parameter values from a start date and they hold thereafter. Phased introductions, sunset clauses or year-on-year indexation changes need explicit scripting; they are not the default.</li>
                <li><strong>Truncated horizon.</strong> The default 60-period transition assumes the steady state arrives by year 60. Effects that play out over longer horizons collapse into the steady-state anchor.</li>
              </ul>
              <p>None of these are model bugs &mdash; they are choices that make the macro accounting tractable. Worth knowing when reading the charts on the UK growth with AI tab.</p>
`,
  },
  ]
