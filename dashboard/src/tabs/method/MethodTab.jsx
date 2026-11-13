'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { S, SCENARIOS, ZETA, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, ARMS, fixedInputVsTz, gap, signed } from '@/tabs/ai/surprise.js';
import { REPO, issue } from '@/tabs/ai/links.js';
import F from '@/data/methodFacts.json';
import { ext, GoTo, StepRail, StepSection } from '../shared/ui.jsx';
import SubTabs, { SubTabPanel, useSubTabParam } from '../shared/subtabs.jsx';
import Timeline from './Timeline.jsx';
import ScenarioMap from './ScenarioMap.jsx';
import ModelFlow from './ModelFlow.jsx';
import Cohorts from './Cohorts.jsx';

// Scenarios and method, a guided sequence: the shock, its timing, the
// scenarios, the arms (sub-tab Scenarios); closures, rules and the model
// (How it's built); Limitations; History. Each fact has one home here.
// Results live on Results, sources on Literature, commands on Code.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;
const DOC_MAIN = (p) => `${REPO}/blob/main/docs/${p}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;

export const METHOD_SUBS = [
  { id: 'scenarios', label: 'Scenarios', icon: 'target' },
  { id: 'built', label: 'How it’s built', icon: 'sigma' },
  { id: 'limits', label: 'Limitations', icon: 'alert' },
  { id: 'history', label: 'History', icon: 'history' },
];

// The step indicator runs across the first three sub-tabs.
const STEPS = [
  { id: 'm-shock', label: 'The shock', sub: 'scenarios' },
  { id: 'm-timing', label: 'Timing', sub: 'scenarios' },
  { id: 'm-scenarios', label: 'Scenarios', sub: 'scenarios' },
  { id: 'm-arms', label: 'Arms', sub: 'scenarios' },
  { id: 'm-closures', label: 'Closures and rules', sub: 'built' },
  { id: 'm-model', label: 'The model', sub: 'built' },
  { id: 'm-limits', label: 'Limitations', sub: 'limits' },
];

// The stress test's technology change, from the solves (UK central), per
// closure: a cut under the central closure, a slight rise with closed
// capital (results sanity audit, #39). Words follow the signs.
const REF_SID = 'uk_central';
const fx = (cl) => fixedInputVsTz(REF_SID, 'ss', cl);
const move = (x) => (x == null ? null : x < 0 ? `fall (UK central: ${signed(x, 2)}%)` : `rise slightly (UK central: ${signed(x, 2)}%)`);
function stressLine() {
  const c = move(fx(CENTRAL));
  const b = move(fx(BOUND));
  const parts = [];
  if (c) parts.push(`Under the central closure that needs output at fixed inputs to ${c}, against technology unchanged.`);
  if (b) parts.push(`With closed capital it needs them to ${b}, so it almost coincides with technology unchanged.`);
  return parts.join(' ');
}
function stressFixedText() {
  const c = fx(CENTRAL);
  const b = fx(BOUND);
  const w = (x) => (x == null ? 'pending' : x < 0 ? 'falls' : 'rises slightly');
  return `Central closure: ${w(c)}; closed capital: ${w(b)}`;
}
function tzGdpLine() {
  const c = gap(REF_SID, 'tz', CENTRAL, 'Y');
  const b = gap(REF_SID, 'tz', BOUND, 'Y');
  const w = (x) => (x == null ? 'is pending' : Math.abs(x) < 0.005 ? 'is unchanged' : x > 0 ? 'rises a little as capital deepens' : 'ends slightly below the OBR-central path');
  return `In UK central, GDP ${w(c)} under the central closure and ${w(b)} with closed capital. So the stress test’s zero is imposed, not a model outcome.`;
}

const ARM_TEXT = {
  tfp: {
    icon: 'trend',
    role: 'Main result',
    line: 'The capital share rises, and output at fixed inputs rises by the scenario’s gain.',
    fixedText: 'Rises by the scenario’s gain',
    glyph: <path d="M4 14 L12 6 L20 14" />,
    preview: 'Anchored at the starting year',
    more: (
      <>
        <p>Z is solved jointly with &gamma;.</p>
        <p>
          The gain is measured at the baseline&rsquo;s {FIRST_YEAR} capital and labour. No scenario has touched those
          inputs yet.
        </p>
      </>
    ),
  },
  tz: {
    icon: 'scale',
    role: 'Shown beside the stress test',
    line: 'The same rise in the capital share, with output at fixed inputs unchanged.',
    fixedText: 'Unchanged',
    glyph: <path d="M4 10 H20" />,
    preview: 'Why it is shown',
    more: (
      <>
        <p>Income moves from labour to capital, with no productivity gain.</p>
        <p>{tzGdpLine()}</p>
      </>
    ),
  },
  ss: {
    icon: 'alert',
    role: 'A bound, not a forecast',
    line: `${HEADLINE_YEAR} GDP is held at the OBR-central path. ${stressLine()}`,
    fixedText: stressFixedText(),
    glyph: <path d="M4 6 L12 14 L20 6" />,
    preview: 'The R4 secant, the OBR comparison',
    more: (
      <>
        <p>
          Z is solved by secant over full solves (&ldquo;R4&rdquo;). It stops when the {HEADLINE_YEAR} GDP gap is
          within 0.01pp of zero.
        </p>
        <p>It is named after the OBR&rsquo;s March 2026 displacement scenario, where GDP is unchanged.</p>
        <p>It matches the OBR only on GDP. The OBR adjusts through jobs; OG-UK, with no unemployment, through the wage.</p>
      </>
    ),
  },
};

function ArmCards() {
  return (
    <div className="card-grid mx-arms">
      {ARMS.map((a) => {
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
            morePreview={t.preview}
          >
            <p className="mx-kicker">{t.role}</p>
            <p>{t.line}</p>
            <div className="mx-fixed" aria-label={`Output at fixed inputs: ${t.fixedText}`}>
              <svg viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {t.glyph}
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
              Foreign investors supply {pct(ZETA[CENTRAL], 0)} of the excess demand for capital at a 2% world rate.
              Foreigners hold 40% of new government debt (&zeta;<sub>D</sub>). Both are OG-UK&rsquo;s defaults.
            </p>
            <p>
              On UK data it fits income paid abroad and GNI/GDP better than a closed account (
              {ext(DOC_MAIN('closure_choice.md'), 'closure memo')}).
            </p>
            <p>Foreign capital resets each year. So part of the {SURPRISE_YEAR} capital gap is an instant inflow.</p>
          </>
        }
        moreTitle="Why it is central"
        morePreview="UK income paid abroad, GNI/GDP"
      >
        <p className="mx-big">
          &zeta;<sub>K</sub> = {ZETA[CENTRAL]}
        </p>
        <p>Part of the extra capital is foreign-owned, so GNI rises less than GDP.</p>
      </InfoCard>
      <InfoCard
        icon="lock"
        title="Closed-capital bound"
        className="mx-card"
        id="closure-bound"
        more={
          <>
            <p>UK households&rsquo; saving finances all the extra capital. GNI and GDP nearly coincide.</p>
            <p>It is shown beside the central closure everywhere, as the {S.closures[BOUND].role}.</p>
          </>
        }
        moreTitle="What it bounds"
        morePreview="Household-financed capital"
      >
        <p className="mx-big">
          &zeta;<sub>K</sub> = {ZETA[BOUND]}
        </p>
        <p>No foreign capital flows in. Results do not depend on the world interest rate.</p>
      </InfoCard>
    </div>
  );
}

const MEASURES = [
  { k: 'GDP', t: 'Output produced in the UK', d: `The stress test holds it at the OBR-central path in ${HEADLINE_YEAR}.` },
  { k: 'GNI', t: 'Income UK residents keep', d: 'GDP less the return paid on foreign-owned capital. The headline.' },
  { k: 'NNI', t: 'GNI after depreciation', d: 'GNI − δK, with δ = 0.065 a year (OG-UK, ONS capital stocks).' },
];

const RULES = [
  {
    id: 'rule-default',
    icon: 'sliders',
    title: 'Spending follows GDP',
    tag: 'Default, on every Results chart',
    line: `Government consumption and transfers are fixed shares of GDP. From ${LATE_YEAR} a debt rule steers spending.`,
  },
  {
    id: 'rule-fixed',
    icon: 'landmark',
    title: 'Fixed spending',
    tag: 'Sensitivity',
    line: 'Consumption and transfers stay at their OBR-central levels. This is the OBR’s convention.',
  },
  {
    id: 'rule-dn',
    icon: 'scale',
    title: 'Debt-neutral',
    tag: 'For cohort welfare',
    line: `Transfers adjust from ${SURPRISE_YEAR + 1} so debt/GDP follows the OBR-central path. Households bear the fiscal effect.`,
  },
];

function Limitations({ onTab }) {
  const items = [
    {
      icon: 'factory',
      title: 'One sector',
      line: 'Spending cannot shift towards goods that stay scarce.',
      more: <p>OG-UK has an eight-sector build; these runs do not use it.</p>,
    },
    {
      icon: 'users',
      title: 'No unemployment',
      line: 'The labour market always clears. Displacement shows in the wage, not in jobs.',
      more: <p>There is no search or matching. The OBR&rsquo;s scenario adjusts through jobs instead.</p>,
    },
    {
      icon: 'target',
      title: 'Imposed technology paths',
      line: 'The capital-share and productivity paths are calibrated, not estimated.',
      more: <p>Adoption, new tasks and diffusion are folded into the ramps of &gamma; and Z.</p>,
    },
    {
      icon: 'construction',
      title: 'Slow capital response',
      line: `Capital has three years to respond by ${HEADLINE_YEAR}, and foreign inflows are capped.`,
      more: (
        <>
          <p>The implied capital-supply elasticity is below every case in Korinek et al.&rsquo;s Table 5.</p>
          <p>
            It rises towards the steady state as saving builds up ({ext(DOC('red_flags_1_3.md'), 'red flag 1')}).
          </p>
        </>
      ),
    },
    {
      icon: 'receipt',
      title: 'Revenue responds too little',
      line: 'One income-tax schedule covers labour and capital income alike. With closed capital, tax/GDP can even rise.',
      more: (
        <p>
          The gap against the OBR&rsquo;s tax rates is on{' '}
          <GoTo tab="results" id="tax-gap" onTab={onTab}>
            Results, in the tax-gap card
          </GoTo>
          .
        </p>
      ),
    },
    {
      icon: 'layers',
      title: 'Part of the effect may be counted twice',
      line: 'UK central’s TFP target partly uses the OBR central AI path, which the baseline already contains.',
      more: (
        <p>
          So part of the effect may be counted twice. Recorded on {ext(issue(27), 'issue #27')}; a decision is pending.
        </p>
      ),
    },
    {
      icon: 'history',
      title: 'Perfect foresight',
      line: `From ${SURPRISE_YEAR} everyone knows the whole path. There is no uncertainty.`,
      more: <p>Earnings differ only by permanent ability type. Precautionary saving is not a channel.</p>,
    },
  ];
  return (
    <div className="card-grid mx-limits">
      {items.map((it) => (
        <InfoCard key={it.title} icon={it.icon} title={it.title} className="mx-card" more={it.more} moreTitle="Detail">
          <p>{it.line}</p>
        </InfoCard>
      ))}
    </div>
  );
}

const HISTORY = [
  ['11 Nov 2026', 'Corrective reruns R1–R4: OBR debt path, UK demographics, a stated closure, a GDP-neutral share-only arm.', 27],
  ['12 Nov 2026', `Central closure ζK = ${ZETA[CENTRAL]}, GNI first; ζK = ${ZETA[BOUND]} shown beside it as a bound.`, 16],
  ['12 Nov 2026', `AI becomes an unanticipated ${SURPRISE_YEAR} shock from one ${FIRST_YEAR} start. Headline year ${HEADLINE_YEAR}.`, 27],
  ['12 Nov 2026', 'Scenarios calibrated to UK sources; Korinek et al.’s US case kept as an upper case.', 27],
  ['12 Nov 2026', 'OG-UK already includes NICs, so nothing is added. The tax gap becomes a limitation.', 27],
  ['12 Nov 2026', 'Debt-neutral variant for cohort welfare; NNI reported beside GNI.', 27],
  ['12 Nov 2026', '“Automation only” renamed the OBR-style stress test; technology-unchanged arm added.', 27],
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
        idPrefix="msub"
      />
      <SubTabPanel idPrefix="msub" value={sub}>
        {sub !== 'history' ? <StepRail key={sub} steps={STEPS} sub={sub} onSub={setSub} label="Steps on this tab" /> : null}

        {show('scenarios') ? (
          <>
            <StepSection id="m-shock" n={1} icon="zap" title="What the shock is" lede="OG-UK has no AI parameter. AI changes two numbers in production.">
              <div className="card-grid">
                <InfoCard
                  icon="cpu"
                  title="Automation"
                  className="mx-card"
                  more={
                    <>
                      <p>Production is Cobb-Douglas, so the labour share is exactly 1 &minus; &gamma;.</p>
                      <p>A fall of f points sets &gamma; to 0.35 + f/100. The ramp needs a small OG-Core patch (see Code).</p>
                    </>
                  }
                  moreTitle="How it maps"
                  morePreview="Labour share = 1 − γ"
                >
                  <p>The capital share &gamma; rises. The labour share falls by the same number of points.</p>
                </InfoCard>
                <InfoCard
                  icon="gauge"
                  title="Productivity"
                  className="mx-card"
                  more={
                    <>
                      <p>Z also absorbs the model&rsquo;s arbitrary units of capital and labour.</p>
                      <p>So its level is not comparable across arms. Each arm fixes output at given inputs instead.</p>
                    </>
                  }
                  moreTitle="Why Z is not a percentage"
                  morePreview="Z is also a units constant"
                >
                  <p>Productivity Z moves so that output at fixed inputs changes by the scenario&rsquo;s gain.</p>
                </InfoCard>
                <InfoCard
                  icon="layers"
                  title="Everything else unchanged"
                  className="mx-card"
                  more={
                    <>
                      <p>
                        The baseline is the OBR-central path: trend productivity growth of 1% a year, the OBR&rsquo;s central
                        figure. That figure already includes the OBR&rsquo;s own central AI assumption, so every result is AI
                        beyond that path, not against a world with no AI.
                      </p>
                      <p>Its spending is set so 2030 debt/GDP matches the OBR&rsquo;s (rerun R1).</p>
                      <p>Every gap is measured against a no-shock restart of that path.</p>
                    </>
                  }
                  moreTitle="The OBR-central path"
                  morePreview="OBR-central baseline, the restart"
                >
                  <p>Demographics, tax functions and policy stay as on the OBR-central path.</p>
                </InfoCard>
              </div>
            </StepSection>

            <StepSection
              id="m-timing"
              n={2}
              icon="calendar"
              title="When it happens"
              lede={`One start in ${FIRST_YEAR}, a surprise in ${SURPRISE_YEAR}, full weight by ${HEADLINE_YEAR}.`}
            >
              <div className="info-card mx-card mx-figure">
                <Timeline />
              </div>
              <div className="card-grid">
                <InfoCard
                  icon="flag"
                  title={`One starting point, ${FIRST_YEAR}`}
                  className="mx-card"
                  more={
                    <>
                      <p>OG-Core always starts a run in the baseline&rsquo;s first year.</p>
                      <p>So inputs are shifted two years, and the run inherits the {FIRST_YEAR} wealth, debt and population.</p>
                      <p>Details: {ext(DOC('surprise_2028.md'), 'design note')}.</p>
                    </>
                  }
                  moreTitle="How the restart works"
                  morePreview="Shifted inputs, inherited wealth"
                >
                  <p>2026 and {FIRST_YEAR} are identical in every scenario. There is no anticipation.</p>
                </InfoCard>
                <InfoCard
                  icon="zap"
                  title={`A surprise in ${SURPRISE_YEAR}`}
                  className="mx-card"
                  more={
                    <>
                      <p>Households re-plan from the wealth they hold.</p>
                      <p>The {SURPRISE_YEAR} gap is the news plus the ramp&rsquo;s first quarter, not news alone.</p>
                    </>
                  }
                  moreTitle="What the first year contains"
                  morePreview="News plus the first ramp step"
                >
                  <p>Nobody expects AI before {SURPRISE_YEAR}. From then on, everyone knows the whole path.</p>
                </InfoCard>
                <InfoCard
                  icon="construction"
                  title={`The ${SURPRISE_YEAR} jump`}
                  className="mx-card"
                  id="m-jump"
                  more={
                    <>
                      <p>OG-Core 0.17 defines an adjustment cost (<code>firm.adj_cost</code>) but never calls it.</p>
                      <p>So investment jumps for one year. It reflects frictionless capital, not a forecast of a boom.</p>
                    </>
                  }
                  moreTitle="Why there is a spike"
                  morePreview="No adjustment costs in OG-Core 0.17"
                >
                  <p>With no adjustment costs, investment and hours jump in the announcement year.</p>
                </InfoCard>
              </div>
            </StepSection>

            <StepSection
              id="m-scenarios"
              n={3}
              icon="target"
              title="The scenarios"
              lede={`Three UK scenarios and a US upper case. Each is a pair reached in ${HEADLINE_YEAR}.`}
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
                    morePreview={s.id === 'korinek' ? 'Korinek et al., Table 3' : 'IMF UK, OBR FRS, BP9'}
                  >
                    <p className="mx-kicker">
                      {s.id === 'uk_central' ? 'Headline scenario' : s.id === 'korinek' ? 'US inputs' : 'UK range'}
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
                Derivations: {ext(DOC('uk_calibration.md'), 'UK calibration note')}. Published figures are compared on
                Literature.
              </p>
            </StepSection>

            <StepSection id="m-arms" n={4} icon="shuffle" title="Three arms per scenario" lede="The same labour-share fall in each. They differ in output at fixed inputs.">
              <ArmCards />
            </StepSection>
          </>
        ) : null}

        {show('built') ? (
          <>
            <StepSection id="m-closures" n={5} icon="globe" title="Closures and the spending rule" lede="Who finances new capital, which income leads, how the budget adjusts.">
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
                      {i < MEASURES.length - 1 ? (
                        <span className="mx-measure-arrow" aria-hidden="true">
                          →
                        </span>
                      ) : null}
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
                The debt rule starts in {LATE_YEAR} in every run. So debt is quoted for {HEADLINE_YEAR} and {LATE_YEAR}.
              </p>
            </StepSection>

            <StepSection id="m-model" n={6} icon="sigma" title="How it is solved" lede="OG-UK, the UK calibration of OG-Core: households, firms, a government, markets.">
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
                      <p>The fitted functions already include employee NICs. Adding NICs would count them twice.</p>
                      <p>Employer NICs are a payroll tax from the first pound, with no threshold or allowance.</p>
                      <p>
                        PolicyEngine-UK, {nic.year}: {pct(nic.employer_avg_of_employment_income)} of employment income;{' '}
                        {pct(nic.employer_marginal)} at the margin (
                        {ext(`${REPO}/blob/rerun/surprise-2028/analysis/nics/measure_nics.py`, 'measure_nics.py')}).
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
                        {pct(nic.oguk_tau_payroll, 0)} flat
                        <span className="mx-vs">vs {pct(nic.employer_avg_of_labour_cost)} average</span>
                      </dd>
                    </div>
                  </dl>
                  <p className="mx-sub">The average is PolicyEngine-UK&rsquo;s, as a share of labour cost.</p>
                </InfoCard>
              </div>
              <div className="card-grid cols-2">
                <InfoCard
                  icon="repeat"
                  title="Steady state, then the path"
                  className="mx-card"
                  more={
                    <>
                      <p>Time path iteration guesses whole price paths. It solves every cohort, then updates the guess.</p>
                      <p>OG-UK&rsquo;s path tolerance is 10<sup>−4</sup>. Run times are on Code.</p>
                    </>
                  }
                  moreTitle="Time path iteration"
                  morePreview="Nested fixed points"
                >
                  <p>Each run finds the long-run equilibrium, then the yearly path from {SURPRISE_YEAR}.</p>
                </InfoCard>
                <InfoCard
                  icon="lock"
                  title="Gated before and after"
                  className="mx-card"
                  more={
                    <>
                      <p>
                        A no-shock restart must reproduce the baseline over {SURPRISE_YEAR}–{LATE_YEAR}, within 10
                        <sup>−4</sup>.
                      </p>
                      <p>After each solve, a sanity check tests identities and the labour share. Any failure stops the run.</p>
                    </>
                  }
                  moreTitle="The two gates"
                  morePreview="Continuation gate, sanity check"
                >
                  <p>A restart test and a sanity check guard every number. The commands are on Code.</p>
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
          <div className="info-card mx-card mx-history" id="m-history">
            <h3 className="info-card-title">
              <Icon name="history" size={18} />
              <span>Revision history</span>
            </h3>
            <p className="mx-sub">How the design changed. Each decision is recorded on the tracker.</p>
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
