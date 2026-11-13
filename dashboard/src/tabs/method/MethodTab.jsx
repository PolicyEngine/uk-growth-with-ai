'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import { SectionHeading } from '@/components/ui/Card.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD, RULES as RULE_NAMES } from '@/lib/labels.js';
import { S, ZETA, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR } from '@/tabs/ai/surprise.js';
import { REPO, issue, pr } from '@/tabs/ai/links.js';
import F from '@/data/methodFacts.json';
import { ext } from '../shared/ui.jsx';
import ModelFlow from './ModelFlow.jsx';
import Cohorts from './Cohorts.jsx';

// Method, one page: the shock, closures and income measures, fiscal rules
// and public finances, the model, limitations, revision history. Each fact
// has its one home here; chart cards link to these sections by anchor. The
// scenarios themselves are on Scenarios, sources on Other studies, commands
// on Code.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;
const DOC_MAIN = (p) => `${REPO}/blob/main/docs/${p}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;

const SECTIONS = [
  { id: METHOD.shock.id, title: METHOD.shock.label, icon: 'zap' },
  { id: METHOD.closures.id, title: METHOD.closures.label, icon: 'globe' },
  { id: METHOD.rules.id, title: METHOD.rules.label, icon: 'landmark' },
  { id: METHOD.model.id, title: METHOD.model.label, icon: 'sigma' },
  { id: METHOD.limits.id, title: METHOD.limits.label, icon: 'alert' },
  { id: METHOD.history.id, title: METHOD.history.label, icon: 'history' },
];

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
            <p>It is the {S.closures[BOUND].role}: choose Closed capital or Both under Closure at the top of Results to see it.</p>
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

const RULE_TEXT = {
  common: {
    id: 'rule-default',
    icon: 'sliders',
    tag: 'Default, on every Results chart',
    line: `Government consumption and transfers are fixed shares of GDP, so spending follows GDP. From ${LATE_YEAR} a debt rule steers spending.`,
  },
  fixed: {
    id: 'rule-fixed',
    icon: 'landmark',
    tag: 'Sensitivity, not yet solved',
    line: 'Consumption and transfers stay at their OBR-central levels. This is the OBR’s convention.',
  },
  dn: {
    id: 'rule-dn',
    icon: 'scale',
    tag: 'Headline rule on Who gains',
    line: `Transfers adjust from ${SURPRISE_YEAR + 1} so debt/GDP follows the OBR-central path. Households bear the fiscal effect.`,
  },
};
const RULES = RULE_NAMES.map((r) => ({ ...RULE_TEXT[r.id], title: r.label }));

function Limitations() {
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
          <NavLink tab="results" sub="finances" anchor="tax-gap">
            Results, Public finances
          </NavLink>
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
    <div className="info-card mx-card">
      <ul className="limit-list">
        {items.map((it) => (
          <li key={it.title}>
            <Icon name={it.icon} size={18} />
            <div>
              <h3>{it.title}</h3>
              <p>{it.line}</p>
              <div className="limit-more">{it.more}</div>
            </div>
          </li>
        ))}
      </ul>
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

export default function MethodTab() {
  const nic = F.nics;
  return (
    <div className="page-with-contents mx-tab mx-method">
      <OnThisPage tab="method" sections={SECTIONS} label="Method contents" />
      <div className="page-body">
        <section>
          <SectionHeading id="m-shock" icon="zap" title="The shock">
            OG-UK has no AI parameter. AI changes two numbers in production.
          </SectionHeading>
          <div className="card-grid">
            <InfoCard
              icon="cpu"
              title="Automation"
              className="mx-card"
              more={
                <>
                  <p>Production is Cobb-Douglas, so the labour share is exactly 1 &minus; &gamma;.</p>
                  <p>A fall of f points sets &gamma; to 0.35 + f/100. The ramp needs a small OG-Core patch (see{' '}
                    <NavLink tab="code" anchor="before">Code</NavLink>).</p>
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
        </section>

        <section>
          <SectionHeading id="m-closures" icon="globe" title="Closures and income measures">
            Who finances new capital, and which measure of income leads.
          </SectionHeading>
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
        </section>

        <section>
          <SectionHeading id="m-rules" icon="landmark" title="Fiscal rules and public finances">
            How the budget adjusts, and how debt responds to the interest rate.
          </SectionHeading>
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
          <div className="card-grid cols-2">
            <InfoCard icon="percent" title="How debt is repriced" className="mx-card" id="m-debt">
              <p>
                All government debt in the model is one-year debt, so a higher interest rate applies to the whole stock at once. UK gilts
                reprice more slowly, so the model&rsquo;s rise in debt/GDP after {HEADLINE_YEAR} is overstated.
              </p>
              <p className="mx-sub">The check that reprices debt at the speed the OBR assumes: {ext(pr(43), 'PR #43')}.</p>
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="m-model" icon="sigma" title="The model">
            OG-UK, the UK calibration of OG-Core: households, firms, a government, markets.
          </SectionHeading>
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
                  <p>OG-UK&rsquo;s path tolerance is 10<sup>−4</sup>. Run times are on <NavLink tab="code">Code</NavLink>.</p>
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
              <p>A restart test and a sanity check guard every number. The commands are on <NavLink tab="code" anchor="pipeline">Code</NavLink>.</p>
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="m-limits" icon="alert" title="Limitations">
            What the model leaves out, each stated once.
          </SectionHeading>
          <Limitations />
        </section>

        <section>
          <SectionHeading id="m-history" icon="history" title="Revision history">
            How the design changed. Each decision is recorded on the tracker.
          </SectionHeading>
          <div className="info-card mx-card mx-history">
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
          </div>
        </section>
      </div>
    </div>
  );
}
