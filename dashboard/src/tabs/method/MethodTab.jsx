'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { S, SCENARIOS, ZETA, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, ARMS } from '@/tabs/ai/surprise.js';
import { REPO, issue } from '@/tabs/ai/links.js';
import F from '@/data/methodFacts.json';
import { ext, GoTo, StepRail, StepSection } from '../shared/ui.jsx';
import SubTabs, { SubTabPanel, useSubTabParam } from '../shared/subtabs.jsx';
import Timeline from './Timeline.jsx';
import ScenarioMap from './ScenarioMap.jsx';
import ModelFlow from './ModelFlow.jsx';
import Cohorts from './Cohorts.jsx';

// Scenarios and method: a guided sequence. What the shock is -> when ->
// the scenarios -> the arms -> closures and the spending rule -> how the
// model is solved -> limitations, then the revision history. Each fact has
// one home here; results live on Results, sources on Literature, commands
// on Code.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;
const DOC_MAIN = (p) => `${REPO}/blob/main/docs/${p}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;

// Sub-tabs (?sub=): the guided sequence runs across the first three, and the
// step indicator above them switches sub-tab when a step lives in another.
export const METHOD_SUBS = [
  { id: 'scenarios', label: 'Scenarios', icon: 'target' },
  { id: 'built', label: 'How it’s built', icon: 'sigma' },
  { id: 'limits', label: 'Limitations', icon: 'alert' },
  { id: 'history', label: 'History', icon: 'history' },
];
const STEPS = [
  { id: 'm-shock', label: 'The shock', sub: 'scenarios' },
  { id: 'm-timing', label: 'Timing', sub: 'scenarios' },
  { id: 'm-scenarios', label: 'Scenarios', sub: 'scenarios' },
  { id: 'm-arms', label: 'Arms', sub: 'scenarios' },
  { id: 'm-closures', label: 'Closures and rules', sub: 'built' },
  { id: 'm-model', label: 'The model', sub: 'built' },
  { id: 'm-limits', label: 'Limitations', sub: 'limits' },
];

const ARM_TEXT = {
  tfp: {
    icon: 'trend',
    role: 'Main result',
    line: 'The capital share rises and output at fixed inputs rises by the scenario’s productivity gain.',
    fixed: 'up',
    fixedText: 'Rises by the scenario’s gain',
    more: (
      <p>
        Z is solved jointly with &gamma; so that output at the baseline&rsquo;s {FIRST_YEAR} capital and labour is
        higher by the scenario&rsquo;s productivity gain once the ramp is complete. {FIRST_YEAR} is the ramp&rsquo;s
        zero-weight year and the last year every scenario shares with the baseline, so the gain is measured at inputs
        no scenario has touched.
      </p>
    ),
  },
  tz: {
    icon: 'scale',
    role: 'Shown beside the stress test',
    line: 'The same rise in the capital share, with output at fixed inputs held where it was.',
    fixed: 'flat',
    fixedText: 'Unchanged',
    more: (
      <p>
        Z is set so that output at the baseline&rsquo;s {FIRST_YEAR} inputs is unchanged: automation reallocates
        income from labour to capital but brings no productivity gain. It shows that the stress test&rsquo;s zero
        GDP change is imposed, not a model outcome: with technology unchanged, the economy still grows a little as
        capital deepens.
      </p>
    ),
  },
  ss: {
    icon: 'alert',
    role: 'Pessimistic bound, not a forecast',
    line: `${HEADLINE_YEAR} GDP is held at the no-AI path, which needs output at fixed inputs to fall.`,
    fixed: 'down',
    fixedText: 'Falls, by construction',
    more: (
      <>
        <p>
          Named after the OBR&rsquo;s March 2026 displacement scenario, in which GDP is unchanged. Z is solved by
          secant over full solves (&ldquo;R4&rdquo;) until the {HEADLINE_YEAR} GDP gap is zero within 0.01pp; GDP
          after {HEADLINE_YEAR} is free. In OG-UK, holding GDP flat while the capital share rises needs output at
          fixed inputs to fall, whereas real AI adoption implies some productivity gain.
        </p>
        <p>
          It matches the OBR only on GDP, which is imposed. The OBR&rsquo;s scenario adjusts through employment; OG-UK
          has no unemployment, so this arm adjusts through the wage.
        </p>
      </>
    ),
  },
};

const FIXED_GLYPH = {
  up: <path d="M4 14 L12 6 L20 14" />,
  flat: <path d="M4 10 H20" />,
  down: <path d="M4 6 L12 14 L20 6" />,
};

function ArmCards() {
  return (
    <div className="card-grid mx-arms">
      {ARMS.map((a, i) => {
        const t = ARM_TEXT[a.id];
        if (!t) return null;
        return (
          <InfoCard
            key={a.id}
            id={`arm-${a.id}`}
            icon={t.icon}
            title={a.label}
            className={`mx-card mx-arm mx-arm-${a.id}`}
            more={t.more}
            moreTitle="How Z is set"
            morePreview={i === 2 ? 'R4 secant, the OBR comparison' : 'Anchor year, what it shows'}
          >
            <p className="mx-kicker">{t.role}</p>
            <p>{t.line}</p>
            <div className="mx-fixed" aria-label={`Output at fixed inputs: ${t.fixedText}`}>
              <svg viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {FIXED_GLYPH[t.fixed]}
                </g>
              </svg>
              <span>
                <span className="mx-fixed-label">Output at fixed inputs</span>
                <b>{t.fixedText}</b>
              </span>
            </div>
          </InfoCard>
        );
      })}
    </div>
  );
}

function ClosureCards() {
  const c = S.closures;
  return (
    <div className="card-grid cols-2">
      <InfoCard
        icon="globe"
        title="Central closure"
        className="mx-card"
        id="closure-central"
        more={
          <>
            <p>
              Foreign investors supply {pct(ZETA[CENTRAL], 0)} of the excess demand for capital at the world interest
              rate, with {pct(0.4, 0)} of new government debt held abroad (&zeta;<sub>D</sub>) and a 2% world rate, as
              in OG-UK&rsquo;s defaults. On UK data it matches the income paid abroad and the GNI/GDP ratio better than
              a closed capital account ({ext(DOC_MAIN('closure_choice.md'), 'closure memo')}).
            </p>
            <p>
              Foreign-owned capital is reset every year by this rule, so part of the {SURPRISE_YEAR} capital gap is an
              instant inflow with no investment recorded the year before.
            </p>
          </>
        }
        moreTitle="Why it is central"
        morePreview="UK income paid abroad, GNI/GDP"
      >
        <p className="mx-big">
          &zeta;<sub>K</sub> = {ZETA[CENTRAL]}
        </p>
        <p>Part of the extra capital is foreign-owned, so national income (GNI) rises less than GDP.</p>
      </InfoCard>
      <InfoCard
        icon="lock"
        title="Closed-capital bound"
        className="mx-card"
        id="closure-bound"
        more={
          <p>
            Every pound of extra capital is financed by UK households&rsquo; saving, so GNI and GDP nearly coincide and
            the capital response is slower. It is shown beside the central closure everywhere, as a {c[BOUND].role},
            not in an appendix.
          </p>
        }
        moreTitle="What it bounds"
        morePreview="Household-financed capital"
      >
        <p className="mx-big">
          &zeta;<sub>K</sub> = {ZETA[BOUND]}
        </p>
        <p>No foreign capital flows in; the results do not depend on the world interest rate.</p>
      </InfoCard>
    </div>
  );
}

const MEASURES = [
  { k: 'GDP', t: 'Output produced in the UK', d: 'Total output; the stress test holds it at the no-AI path in ' + HEADLINE_YEAR + '.' },
  { k: 'GNI', t: 'Income UK residents keep', d: 'GDP less the return paid on foreign-owned capital. The headline measure.' },
  {
    k: 'NNI',
    t: 'GNI after depreciation',
    d: 'GNI − δK, with δ = 0.065 a year, OG-UK’s depreciation rate (ONS capital stocks).',
  },
];

const RULES = [
  {
    id: 'rule-default',
    icon: 'sliders',
    title: 'Default: spending follows GDP',
    line: `Government consumption and transfers are fixed shares of GDP until ${LATE_YEAR}; from ${LATE_YEAR} the debt rule moves spending towards the long-run debt ratio.`,
    tag: 'Used on every chart',
  },
  {
    id: 'rule-fixed',
    icon: 'landmark',
    title: 'Fixed spending',
    line: 'Government consumption and transfers stay at the no-AI path’s levels, the OBR’s convention for scenarios.',
    tag: 'Sensitivity',
  },
  {
    id: 'rule-dn',
    icon: 'scale',
    title: 'Debt-neutral',
    line: `Transfers adjust each year from ${SURPRISE_YEAR + 1} so debt/GDP follows the no-AI path; households bear the shock’s fiscal effect.`,
    tag: 'For cohort welfare',
  },
];

function Limitations({ onTab }) {
  const items = [
    {
      icon: 'factory',
      title: 'One sector',
      line: 'Spending cannot shift towards what stays scarce as automated goods get cheaper.',
      more: 'OG-UK has an eight-sector build, which these runs do not use. Demand shifts are central to Moll and Imas’s argument and absent from every model compared on Literature.',
    },
    {
      icon: 'users',
      title: 'No unemployment',
      line: 'The labour market clears every year, so displacement shows up in the wage, not in jobs.',
      more: 'There is no search, matching or equilibrium unemployment. The OBR’s displacement scenario adjusts through employment instead.',
    },
    {
      icon: 'target',
      title: 'Imposed technology paths',
      line: 'The capital share and productivity paths are calibrated to published sources, not estimated.',
      more: 'Adoption, task reinstatement and diffusion are folded into the ramps of γ and Z. The calibration of each scenario is in the Scenarios step above.',
    },
    {
      icon: 'construction',
      title: 'Slow capital response by 2031',
      line: 'Capital has three years to respond and foreign inflows are capped by ζK, so GDP per unit of productivity is low.',
      more: (
        <>
          Measured as Korinek et al. do, the implied capital-supply elasticity at the headline year is below every case in
          their Table 5 (1 to infinity); it rises towards the steady state as life-cycle saving accumulates. Diagnosis in{' '}
          {ext(DOC('red_flags_1_3.md'), 'red flag 1')}.
        </>
      ),
    },
    {
      icon: 'receipt',
      title: 'Tax system: revenue falls too little',
      line: 'One income-tax schedule covers labour and capital income, so moving income to capital barely moves revenue.',
      more: (
        <>
          The size of the gap against the OBR&rsquo;s effective rates is set out once, on{' '}
          <GoTo tab="results" id="tax-gap" onTab={onTab}>
            Results, in the tax-gap card
          </GoTo>
          . How OG-UK taxes labour is in the Model step above.
        </>
      ),
    },
    {
      icon: 'history',
      title: 'Deterministic, perfect foresight',
      line: `From ${SURPRISE_YEAR} households and firms know the whole path; there is no uncertainty about how AI unfolds.`,
      more: 'Earnings differ by permanent ability type only: there are no earnings shocks, so precautionary saving is not a channel.',
    },
  ];
  return (
    <div className="card-grid mx-limits">
      {items.map((it) => (
        <InfoCard key={it.title} icon={it.icon} title={it.title} className="mx-card" more={<p>{it.more}</p>} moreTitle="Detail">
          <p>{it.line}</p>
        </InfoCard>
      ))}
    </div>
  );
}

const HISTORY = [
  ['11 Nov 2026', 'Corrective reruns R1–R4: baseline debt calibrated to the OBR, UK period-0 demographics, a stated capital closure, and Z solved so the share-only arm holds GDP.', 27],
  ['12 Nov 2026', `Central closure ζK = ${ZETA[CENTRAL]} with GNI first; ζK = ${ZETA[BOUND]} shown beside it as the closed-capital bound.`, 16],
  ['12 Nov 2026', `AI becomes an unanticipated shock in ${SURPRISE_YEAR} from one ${FIRST_YEAR} starting point, replacing perfect foresight from 2026. Headline year ${HEADLINE_YEAR}.`, 27],
  ['12 Nov 2026', 'The scenarios are calibrated to UK sources (UK low, central, high); Korinek et al.’s US case is kept as a labelled upper scenario.', 27],
  ['12 Nov 2026', 'OG-UK already includes National Insurance, so nothing is added; the labour–capital tax gap is reported as a limitation.', 27],
  ['12 Nov 2026', 'Debt-neutral variant for cohort welfare; net national income (NNI) reported beside GNI.', 27],
  ['12 Nov 2026', '“Automation only” renamed the OBR-style stress test, with the technology-unchanged arm shown beside it.', 27],
];

export default function MethodTab({ onTab, active = true }) {
  const nic = F.nics;
  const [sub, setSub] = useSubTabParam(METHOD_SUBS.map((t) => t.id), active);
  const show = (id) => sub === id;
  return (
    <div className="mx-tab mx-method">
      <SubTabs
        tabs={METHOD_SUBS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
        value={sub}
        onChange={setSub}
        ariaLabel="Scenarios and method sections"
        idPrefix="method"
      />
      <SubTabPanel idPrefix="method" value={sub}>
      <header className="mx-intro">
        <h2>How the scenarios are built</h2>
        <p>
          OG-UK has no AI parameter. Each scenario changes two numbers in production, from one starting point, and
          the results compare each path with the same economy without AI.
        </p>
      </header>
      {sub !== 'history' ? <StepRail key={sub} steps={STEPS} sub={sub} onSub={setSub} label="Steps on this tab" /> : null}
      {show('scenarios') ? (
        <>

      <StepSection id="m-shock" n={1} icon="zap" title="What the shock is" lede="AI enters through two changes to how output is produced.">
        <div className="card-grid">
          <InfoCard
            icon="cpu"
            title="Automation"
            className="mx-card"
            more={
              <p>
                Production is Cobb-Douglas (&epsilon; = 1), so the labour share is exactly 1 &minus; &gamma;. A fall of f
                points in the labour share sets &gamma; to 0.35 + f/100 from 0.35 at baseline. The ramp in &gamma; needs a
                small patch to OG-Core, described on Code.
              </p>
            }
            moreTitle="How it maps"
            morePreview="Labour share = 1 − γ"
          >
            <p>The capital share of output &gamma; rises, so the labour share falls by the same number of points.</p>
          </InfoCard>
          <InfoCard
            icon="gauge"
            title="Productivity"
            className="mx-card"
            more={
              <p>
                Z is a normalisation constant as well as productivity: it absorbs the units of capital and labour,
                which are arbitrary in the model, so its level is not comparable across arms. What each arm fixes is
                output at given inputs, set out under Arms.
              </p>
            }
            moreTitle="Why Z is not a percentage"
            morePreview="Z is also a units constant"
          >
            <p>Total factor productivity Z moves so that output at fixed inputs changes by the scenario&rsquo;s gain.</p>
          </InfoCard>
          <InfoCard
            icon="layers"
            title="Everything else unchanged"
            className="mx-card"
            more={
              <p>
                The no-AI path is OG-UK&rsquo;s baseline with trend productivity growth of 1% a year and government
                spending set so that debt/GDP in 2030 matches the OBR&rsquo;s (rerun R1). Every gap is measured against a
                no-shock restart of that baseline, which must reproduce it before any scenario runs.
              </p>
            }
            moreTitle="The no-AI path"
            morePreview="OBR-central baseline, the restart"
          >
            <p>Demographics, tax functions and policy stay as on the no-AI path; only &gamma; and Z move.</p>
          </InfoCard>
        </div>
      </StepSection>

      <StepSection
        id="m-timing"
        n={2}
        icon="calendar"
        title="When it happens"
        lede={`One starting point in ${FIRST_YEAR}, an unanticipated shock at the start of ${SURPRISE_YEAR}, full weight by ${HEADLINE_YEAR}.`}
      >
        <div className="info-card mx-card mx-figure">
          <Timeline />
        </div>
        <div className="card-grid">
          <InfoCard
            icon="flag"
            title={`A single point in ${FIRST_YEAR}`}
            className="mx-card"
            more={
              <p>
                Every scenario equals the baseline exactly in 2026 and {FIRST_YEAR}, and every chart starts at the single{' '}
                {FIRST_YEAR} point. A reform run in OG-Core always starts from the baseline&rsquo;s first year, so the
                time-indexed inputs are shifted two years and the run inherits the baseline&rsquo;s {FIRST_YEAR} wealth,
                debt and population ({ext(DOC('surprise_2028.md'), 'design note')}).
              </p>
            }
            moreTitle="How the restart works"
            morePreview="Shifted inputs, inherited wealth"
          >
            <p>2026 and {FIRST_YEAR} are history, identical in every scenario, so there is no anticipation before the shock.</p>
          </InfoCard>
          <InfoCard
            icon="zap"
            title={`Unanticipated in ${SURPRISE_YEAR}, then foreseen`}
            className="mx-card"
            more={
              <p>
                Households re-plan from the wealth they hold when the path is announced. Perfect foresight from{' '}
                {SURPRISE_YEAR} means the {SURPRISE_YEAR} gap is the announcement-year response plus the first quarter of
                the ramp, not a pure news effect.
              </p>
            }
            moreTitle="What the first year contains"
            morePreview="News plus the first ramp step"
          >
            <p>
              Nobody expects AI before {SURPRISE_YEAR}; from then on households and firms know the whole path.
            </p>
          </InfoCard>
          <InfoCard
            icon="construction"
            title={`The ${SURPRISE_YEAR} announcement jump`}
            className="mx-card"
            id="m-jump"
            more={
              <p>
                OG-Core 0.17 defines a quadratic adjustment cost (<code>firm.adj_cost</code>) but never calls it, so
                investment is whatever moves capital to next year&rsquo;s target. The announcement therefore produces a
                one-year spike in investment and a jump in hours. It reflects the model&rsquo;s frictionless capital, not a
                forecast of an investment boom; removing it would mean editing OG-Core.
              </p>
            }
            moreTitle="Why there is a spike"
            morePreview="No adjustment costs in OG-Core 0.17"
          >
            <p>With no adjustment costs, investment jumps in {SURPRISE_YEAR} as capital moves at once towards its new target.</p>
          </InfoCard>
        </div>
      </StepSection>

      <StepSection
        id="m-scenarios"
        n={3}
        icon="target"
        title="The scenarios"
        lede={`Three UK scenarios and one US upper case, each a labour-share fall and a productivity gain reached in ${HEADLINE_YEAR}.`}
      >
        <div className="info-card mx-card mx-figure">
          <ScenarioMap />
        </div>
        <div className="card-grid mx-scen-grid">
          {SCENARIOS.map((s) => (
            <InfoCard
              key={s.id}
              id={`scen-${s.id}`}
              icon={s.id === 'korinek' ? 'globe' : 'landmark'}
              title={s.id === 'korinek' ? 'Korinek US (upper)' : s.label}
              className={`mx-card mx-scen${s.id === 'korinek' ? ' is-upper' : ''}`}
              more={
                <dl className="mx-facts">
                  {Object.entries(s.sources).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k === 'tfp' ? 'Productivity' : k === 'labour_share' ? 'Labour share' : 'Both inputs'}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              }
              moreTitle="Sources and arithmetic"
              morePreview={s.id === 'korinek' ? 'Korinek et al. Table 3' : 'IMF UK 2026, OBR FRS 2026, BP9'}
            >
              <p className="mx-kicker">
                {s.id === 'uk_central' ? 'Headline scenario' : s.id === 'korinek' ? 'US inputs, not a UK calibration' : 'UK range'}
              </p>
              <dl className="mx-pair">
                <div>
                  <dt>Labour share</dt>
                  <dd>−{s.labour_share_fall_pp.toFixed(1)}pp</dd>
                </div>
                <div>
                  <dt>Output at fixed inputs</dt>
                  <dd>+{s.tfp_gain_pct.toFixed(1)}%</dd>
                </div>
              </dl>
              <p className="mx-sub">&gamma; reaches {s.gamma_terminal.toFixed(3)}.</p>
            </InfoCard>
          ))}
        </div>
        <p className="mx-foot">
          Derivations: {ext(DOC('uk_calibration.md'), 'UK calibration note')}; every published figure is compared on
          Literature.
        </p>
      </StepSection>

      <StepSection
        id="m-arms"
        n={4}
        icon="shuffle"
        title="Three arms per scenario"
        lede="The same labour-share fall in each arm; they differ in what happens to output at fixed inputs."
      >
        <ArmCards />
      </StepSection>

        </>
      ) : null}
      {show('built') ? (
        <>
      <StepSection
        id="m-closures"
        n={5}
        icon="globe"
        title="Closures and the spending rule"
        lede="Who finances the extra capital, which income measure leads, and how the budget adjusts."
      >
        <ClosureCards />
        <div className="info-card mx-card mx-measures" id="m-measures">
          <h3 className="info-card-title">
            <Icon name="ruler" size={18} />
            <span>Three income measures</span>
          </h3>
          <div className="mx-measure-row">
            {MEASURES.map((m, i) => (
              <div key={m.k} className="mx-measure">
                <span className="mx-measure-k">{m.k}</span>
                <span className="mx-measure-t">{m.t}</span>
                <span className="mx-measure-d">{m.d}</span>
                {i < MEASURES.length - 1 ? <span className="mx-measure-arrow" aria-hidden="true">→</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="card-grid mx-rules">
          {RULES.map((r) => (
            <InfoCard key={r.id} id={r.id} icon={r.icon} title={r.title} className="mx-card">
              <p className="mx-kicker">{r.tag}</p>
              <p>{r.line}</p>
            </InfoCard>
          ))}
        </div>
        <p className="mx-foot">
          The debt rule&rsquo;s first year, {LATE_YEAR}, is fixed in calendar time in every run, so debt is quoted for{' '}
          {HEADLINE_YEAR} and {LATE_YEAR}.
        </p>
      </StepSection>

      <StepSection
        id="m-model"
        n={6}
        icon="sigma"
        title="How it is solved"
        lede="OG-UK, the UK calibration of OG-Core: overlapping generations, firms, a government, and markets that clear."
      >
        <ModelFlow />
        <div className="card-grid cols-2">
          <div className="info-card mx-card mx-figure">
            <h3 className="info-card-title">
              <Icon name="usersRound" size={18} />
              <span>Many generations at once</span>
            </h3>
            <Cohorts />
          </div>
          <InfoCard
            icon="receipt"
            title="How labour is taxed"
            className="mx-card"
            id="m-tax"
            more={
              <>
                <p>
                  The fitted functions are estimated on PolicyEngine-UK&rsquo;s income tax plus employee and
                  self-employed National Insurance, so adding NICs would count them twice. Employer NICs are OG-Core&rsquo;s
                  payroll tax, levied from the first pound with no secondary threshold or Employment Allowance.
                </p>
                <p>
                  PolicyEngine-UK, {nic.year}: employer NICs average {pct(nic.employer_avg_of_labour_cost)} of total labour
                  cost ({pct(nic.employer_avg_of_employment_income)} of employment income), with a marginal rate of{' '}
                  {pct(nic.employer_marginal)} ({ext(`${REPO}/blob/rerun/surprise-2028/analysis/nics/measure_nics.py`, 'measure_nics.py')}).
                </p>
              </>
            }
            moreTitle="Employee and employer NICs"
            morePreview="Fitted function, flat payroll tax"
          >
            <dl className="mx-pair">
              <div>
                <dt>Employee NICs</dt>
                <dd className="mx-dd-text">In the fitted income-tax function</dd>
              </div>
              <div>
                <dt>Employer NICs</dt>
                <dd>
                  {pct(nic.oguk_tau_payroll, 0)} flat <span className="mx-vs">vs ~{pct(nic.employer_avg_of_labour_cost, 0)} average</span>
                </dd>
              </div>
            </dl>
            <p className="mx-sub">The average is PolicyEngine-UK&rsquo;s, as a share of labour cost.</p>
          </InfoCard>
        </div>
        <div className="card-grid cols-2">
          <InfoCard
            icon="repeat"
            title="Steady state, then the transition"
            className="mx-card"
            more={
              <p>
                The steady state is found first; time path iteration then guesses whole paths for prices and aggregates,
                solves every cohort&rsquo;s lifetime decisions, and iterates until the guesses are consistent. Each AI run
                takes about eight minutes on a laptop, one at a time. OG-UK&rsquo;s path tolerance is 10<sup>−4</sup>.
              </p>
            }
            moreTitle="Time path iteration"
            morePreview="Nested fixed points"
          >
            <p>Each run solves the long-run equilibrium, then the year-by-year path from {SURPRISE_YEAR} towards it.</p>
          </InfoCard>
          <InfoCard
            icon="lock"
            title="Gated before and after every solve"
            className="mx-card"
            more={
              <p>
                A no-shock restart must reproduce the baseline from {SURPRISE_YEAR} to {LATE_YEAR} (GDP, capital and
                debt/GDP within 10<sup>−4</sup>) before any scenario runs, and every gap is measured against that restart.
                After each solve a sanity check tests the accounting identities, the resource constraint and the
                labour-share path, and stops the run on any failure. The commands are on Code.
              </p>
            }
            moreTitle="The two gates"
            morePreview="Continuation gate, sanity check"
          >
            <p>A restart test and a sanity check guard every number before it reaches this page.</p>
          </InfoCard>
        </div>
      </StepSection>

        </>
      ) : null}
      {show('limits') ? (
      <StepSection id="m-limits" n={7} icon="alert" title="Limitations" lede="What the model leaves out, each stated once.">
        <Limitations onTab={onTab} />
      </StepSection>
      ) : null}

      {show('history') ? (
      <div className="mx-history info-card mx-card">
        <h3 className="info-card-title">
          <Icon name="history" size={18} />
          <span>Revision history</span>
        </h3>
        <p className="mx-sub">What changed in the design, newest last. Decisions are recorded on the tracker.</p>
        <Disclosure inCard title="All changes" preview={`${HISTORY.length} changes, 11–12 Nov 2026`}>
          <ol className="mx-history-list">
            {HISTORY.map(([d, t, n], i) => (
              <li key={i}>
                <span className="mx-history-date">{d}</span>
                <span>
                  {t} {ext(issue(n), `#${n}`)}
                </span>
              </li>
            ))}
          </ol>
        </Disclosure>
      </div>
      ) : null}
      </SubTabPanel>
    </div>
  );
}

