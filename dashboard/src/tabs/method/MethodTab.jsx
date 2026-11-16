'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import PageIntro from '@/components/ui/PageIntro.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items, WhyChain } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from './IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { METHOD, RULES as RULE_NAMES } from '@/lib/labels.js';
import { S, ZETA, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR } from '@/tabs/ai/surprise.js';
import { REPO, URLS, issue, pr } from '@/tabs/ai/links.js';
import F from '@/data/methodFacts.json';
import { ext } from '../shared/ui.jsx';
import ModelDiagram, { flowTable, diagramSvg } from './ModelDiagram.jsx';
import Cohorts from './Cohorts.jsx';
import ScenariosSection from './ScenariosSection.jsx';
import UsedBy from './UsedBy.jsx';

// OG-UK method, one page: the model, the shock, the scenarios (inputs, arms
// and timing), closures and income measures, fiscal rules and public
// finances, the path, limitations. Each fact has its one home here; chart
// cards link to these sections by anchor, and each section lists the charts
// that use it (UsedBy). Sources and published figures are on Evidence;
// commands, vintages and the revision history on Data and code.

const DOC = (p) => `${REPO}/blob/rerun/surprise-2028/docs/${p}`;
const DOC_MAIN = (p) => `${REPO}/blob/main/docs/${p}`;
const pct = (x, dp = 1) => `${(x * 100).toFixed(dp)}%`;

const SECTIONS = [
  { id: METHOD.model.id, title: METHOD.model.label, icon: iconFor('model') },
  { id: METHOD.shock.id, title: METHOD.shock.label, icon: iconFor('shock') },
  { id: 'm-scenarios', title: 'Scenarios', icon: iconFor('scenario') },
  { id: METHOD.closures.id, title: METHOD.closures.label, icon: iconFor('closure') },
  { id: METHOD.rules.id, title: METHOD.rules.label, icon: iconFor('finances') },
  { id: 'm-path', title: 'Steady state and path', icon: iconFor('path') },
  { id: METHOD.limits.id, title: METHOD.limits.label, icon: iconFor('limit') },
];

function ClosureCards() {
  return (
    <div className="card-grid cols-2">
      <InfoCard
        icon={iconFor('foreign')}
        title="Central closure"
        className="mx-card"
        id="closure-central"
        more={
          <Items
            items={[
              { icon: 'foreign', text: <>Foreign investors meet {pct(ZETA[CENTRAL], 0)} of excess capital demand; world rate 2%.</> },
              { icon: 'debt', text: <>Foreigners hold 40% of new government debt (&zeta;<sub>D</sub>).</> },
              { icon: 'model', text: 'Both are OG-UK’s defaults.' },
              { icon: 'data', text: <>Fits UK income paid abroad and GNI/GDP better than closed ({ext(DOC_MAIN('closure_choice.md'), 'closure memo')}).</> },
              { icon: 'timing', text: 'Foreign capital resets each year.' },
              { icon: 'capital', text: <>So part of the {SURPRISE_YEAR} capital gap is an instant inflow.</> },
            ]}
          />
        }
        moreTitle="Why it is central"
        morePreview="UK income paid abroad, GNI/GDP"
      >
        <p className="mx-big">
          <Icon name={iconFor('foreign')} size={18} className="mx-dt-icon" />
          &zeta;<sub>K</sub> = {ZETA[CENTRAL]}
        </p>
        <Items items={[{ icon: 'gni', text: 'Part of the extra capital is foreign-owned: GNI rises less than GDP.' }]} />
      </InfoCard>
      <InfoCard
        icon={iconFor('closed')}
        title="Closed-capital bound"
        className="mx-card"
        id="closure-bound"
        more={
          <Items
            items={[
              { icon: 'households', text: 'UK households’ saving finances all the extra capital.' },
              { icon: 'gni', text: 'GNI and GDP nearly coincide.' },
              { icon: 'closure', text: <>The {S.closures[BOUND].role}: on Explore, choose Closed capital or Both.</> },
            ]}
          />
        }
        moreTitle="What it bounds"
        morePreview="Household-financed capital"
      >
        <p className="mx-big">
          <Icon name={iconFor('closed')} size={18} className="mx-dt-icon" />
          &zeta;<sub>K</sub> = {ZETA[BOUND]}
        </p>
        <Items
          items={[
            { icon: 'closed', text: 'No foreign capital flows in.' },
            { icon: 'interest', text: 'Results do not depend on the world interest rate.' },
          ]}
        />
      </InfoCard>
    </div>
  );
}

const MEASURES = [
  { k: 'GDP', icon: 'gdp', t: 'Output produced in the UK', d: `The stress test holds it at the OBR-central path in ${HEADLINE_YEAR}.` },
  { k: 'GNI', icon: 'gni', t: 'Income UK residents keep', d: 'GDP less the return paid on foreign-owned capital. The headline.' },
  { k: 'NNI', icon: 'depreciation', t: 'GNI after depreciation', d: 'GNI − δK, with δ = 0.065 a year (OG-UK, ONS capital stocks).' },
];

// The three fiscal rules: name and one-line meaning from lib/labels.js (the
// one definition the pickers, tooltips and downloads read), with Method's
// detail. Rendered once, here.
const RULE_TEXT = {
  common: {
    id: 'rule-default',
    icon: 'rule',
    tag: 'Default: every solve, and Explore unless you choose another',
    items: [
      { icon: 'finances', text: 'Government consumption and transfers are fixed shares of GDP.' },
      { icon: 'debt', text: `From ${LATE_YEAR} a debt rule steers spending, in every run.` },
      { icon: 'timing', text: `So debt is quoted for ${HEADLINE_YEAR} and ${LATE_YEAR}.` },
    ],
  },
  fixed: {
    id: 'rule-fixed',
    icon: 'finances',
    tag: 'A choice on Explore (UK central, Korinek et al.)',
    items: [{ icon: 'forecast', text: 'This is the OBR’s convention.' }],
  },
  dn: {
    id: 'rule-dn',
    icon: 'debt',
    tag: 'Headline rule on Who gains',
    items: [{ icon: 'benefits', text: `Transfers adjust from ${SURPRISE_YEAR + 1} so debt/GDP follows the OBR-central path.` }],
  },
};
const NOTE_ICON = { common: 'path', fixed: 'finances', dn: 'households' };
const RULES = RULE_NAMES.map((r) => ({
  ...RULE_TEXT[r.id],
  title: r.label,
  items: [{ icon: NOTE_ICON[r.id], text: `${r.note}.` }, ...RULE_TEXT[r.id].items],
}));

function Limitations() {
  const items = [
    {
      icon: 'scarceGoods',
      title: 'One sector',
      points: [
        { icon: 'scarceGoods', text: 'Spending cannot shift towards goods that stay scarce.' },
        { icon: 'model', text: 'OG-UK has an eight-sector build; these runs do not use it.' },
      ],
    },
    {
      icon: 'labour',
      title: 'No unemployment',
      points: [
        { icon: 'labour', text: 'The labour market always clears.' },
        { icon: 'pay', text: 'Displacement shows in the wage, not in jobs.' },
        { icon: 'excluded', text: 'There is no search or matching.' },
        { icon: 'compare', text: 'The OBR’s scenario adjusts through jobs instead.' },
      ],
    },
    {
      icon: 'scenario',
      title: 'Imposed technology paths',
      points: [
        { icon: 'scenario', text: 'The capital-share and productivity paths are calibrated, not estimated.' },
        { icon: 'ai', text: <>Adoption, new tasks and diffusion sit in the &gamma; and Z ramps.</> },
      ],
    },
    {
      icon: 'capital',
      title: 'Slow capital response',
      points: [
        { icon: 'timing', text: `Capital has three years to respond by ${HEADLINE_YEAR}.` },
        { icon: 'foreign', text: 'Foreign inflows are capped.' },
        { icon: 'compare', text: 'Implied capital-supply elasticity: below every case in Korinek et al.’s Table 5.' },
        { icon: 'capital', text: <>It rises towards the steady state as saving builds ({ext(DOC('red_flags_1_3.md'), 'red flag 1')}).</> },
      ],
    },
    {
      icon: 'tax',
      title: 'Revenue responds too little',
      points: [
        { icon: 'tax', text: 'One income-tax schedule covers labour and capital income alike.' },
        { icon: 'closed', text: 'With closed capital, tax/GDP can even rise.' },
        {
          icon: 'link',
          text: (
            <>
              The gap against the OBR&rsquo;s tax rates:{' '}
              <NavLink tab="explore" sub="finances" anchor="tax-gap">
                Explore, Public finances
              </NavLink>
              .
            </>
          ),
        },
      ],
    },
    {
      icon: 'forecast',
      title: 'Part of the effect may be counted twice',
      points: [
        { icon: 'forecast', text: 'UK central’s TFP target partly uses the OBR central AI path.' },
        { icon: 'compare', text: 'The baseline already contains that path.' },
        { icon: 'limit', text: 'So part of the effect may be counted twice.' },
        { icon: 'revision', text: <>Recorded on {ext(issue(27), 'issue #27')}; a decision is pending.</> },
      ],
    },
    {
      icon: 'timing',
      title: 'Perfect foresight',
      points: [
        { icon: 'timing', text: `From ${SURPRISE_YEAR} everyone knows the whole path.` },
        { icon: 'excluded', text: 'There is no uncertainty.' },
        { icon: 'households', text: 'Earnings differ only by permanent ability type.' },
        { icon: 'limit', text: 'Precautionary saving is not a channel.' },
      ],
    },
    {
      icon: 'equation',
      title: 'Substitution fixed at one',
      points: [
        { icon: 'equation', text: 'Capital and labour combine Cobb-Douglas: their elasticity of substitution is one.' },
        { icon: 'labourShare', text: 'So the labour share follows γ exactly, by construction.' },
      ],
    },
    {
      icon: 'pay',
      title: 'No markups',
      points: [
        { icon: 'pay', text: 'Firms are competitive: wages and rents equal marginal products.' },
      ],
    },
    {
      icon: 'foreign',
      title: 'Foreign AI providers',
      points: [{ icon: 'foreign', text: 'Their returns enter only through ζK, the foreign-owned share of new capital.' }],
    },
    {
      icon: 'interest',
      title: 'No money, trade or exchange rate',
      points: [
        { icon: 'interest', text: 'A real model: no inflation or monetary policy.' },
        { icon: 'foreign', text: 'Links abroad: capital and gilts only; no trade or exchange rate.' },
      ],
    },
    {
      icon: 'excluded',
      title: 'No regions or housing',
      points: [{ icon: 'excluded', text: 'One national economy, with no regions and no housing market.' }],
    },
  ];
  return (
    <ul className="mx-limit-grid">
      {items.map((it) => (
        <li key={it.title} className="mx-limit-tile">
          <h3>
            <Icon name={iconFor(it.icon)} size={18} />
            <span>{it.title}</span>
          </h3>
          <Items items={it.points} />
        </li>
      ))}
    </ul>
  );
}


export default function MethodTab() {
  const nic = F.nics;
  return (
    <div className="page-with-contents mx-tab mx-method">
      <OnThisPage tab="method" sub="how" sections={SECTIONS} label="Method contents" />
      <div className="page-body">
        <PageIntro
          icon={iconFor('equation')}
          question="How does OG-UK turn an AI scenario into these results?"
          answer={<IconText icon="model">A model of the whole UK economy in which every market clears. Each result is a gap against a no-shock run, not a forecast.</IconText>}
        >
          <WhyChain
            className="mx-chain"
            label="From an AI scenario to a result"
            links={[
              { icon: 'scenario', text: 'An AI scenario' },
              { icon: 'ai', text: 'Two production inputs change' },
              { icon: 'model', text: 'Every market re-clears' },
              { icon: 'path', text: 'Gap against the OBR-central path' },
            ]}
          />
        </PageIntro>
        <section>
          <SectionHeading id="m-model" icon={iconFor('model')} title="The model">
            <IconText icon="link">OG-UK, the UK calibration of {ext(URLS.ogCore, 'OG-Core')}. Choose a block to light its flows.</IconText>
          </SectionHeading>
          <UsedBy id="m-model" />
          <Card
            id="model-diagram"
            icon={iconFor('model')}
            title="OG-UK in four blocks"
            finding={<IconText icon="breakEven">Households, firms, a government and the rest of the world, trading until every market clears.</IconText>}
            logo={false}
            download={{ title: 'OG-UK in four blocks', context: 'The flows between the blocks of the model', table: flowTable, svg: diagramSvg, legend: () => [] }}
          >
            <ModelDiagram />
          </Card>
          <div className="card-grid cols-2">
            <div className="info-card mx-card mx-figure" id="m-generations">
              <h3 className="info-card-title">
                <Icon name={iconFor('generations')} size={18} />
                <span>Many generations at once</span>
              </h3>
              <Cohorts />
            </div>
            <InfoCard
              icon={iconFor('tax')}
              title="How labour is taxed"
              className="mx-card"
              id="m-tax"
              more={
                <Items
                  items={[
                    { icon: 'tax', text: 'Fitted functions already include employee NICs; adding them double-counts.' },
                    { icon: 'labour', text: 'Employer NICs: a payroll tax from the first pound, no allowance.' },
                    {
                      icon: 'data',
                      text: (
                        <>
                          PolicyEngine-UK, {nic.year}: <span data-path="methodFacts.nics.employer_avg_of_employment_income">{pct(nic.employer_avg_of_employment_income)}</span> of employment income;{' '}
                          <span data-path="methodFacts.nics.employer_marginal">{pct(nic.employer_marginal)}</span> at the margin (
                          {ext(`${REPO}/blob/rerun/surprise-2028/analysis/nics/measure_nics.py`, 'measure_nics.py')}).
                        </>
                      ),
                    },
                  ]}
                />
              }
              moreTitle="Employee and employer NICs"
              morePreview="Fitted function, flat payroll tax"
            >
              <Items
                items={[
                  { icon: 'labour', text: 'Employee NICs: inside the fitted income-tax function.' },
                  {
                    icon: 'link',
                    text: (
                      <>
                        Employer NICs: flat payroll tax; rate against average on{' '}
                        <NavLink tab="explore" sub="finances" anchor="tax-gap">
                          Explore, Public finances
                        </NavLink>
                        .
                      </>
                    ),
                  },
                ]}
              />
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="m-shock" icon={iconFor('shock')} title="The shock">
            <IconText icon="ai">OG-UK has no AI parameter. AI changes two numbers in production.</IconText>
          </SectionHeading>
          <UsedBy id="m-shock" />
          <div className="card-grid">
            <InfoCard
              icon={iconFor('ai')}
              title="Automation"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'equation', text: <>Cobb-Douglas production: the labour share is exactly 1 &minus; &gamma;.</> },
                    { icon: 'scenario', text: <>A fall of f points sets &gamma; to 0.35 + f/100.</> },
                    {
                      icon: 'code',
                      text: (
                        <>
                          The ramp needs a small OG-Core patch (<NavLink tab="method" sub="code" anchor="before">Data and code</NavLink>).
                        </>
                      ),
                    },
                  ]}
                />
              }
              moreTitle="How it maps"
              morePreview="Labour share = 1 − γ"
            >
              <Items
                items={[
                  { icon: 'capital', text: <>The capital share &gamma; rises.</> },
                  { icon: 'labour', text: 'The labour share falls by the same points.' },
                ]}
              />
            </InfoCard>
            <InfoCard
              icon={iconFor('productivity')}
              title="Productivity"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'measure', text: 'Z also absorbs the model’s arbitrary units of capital and labour.' },
                    { icon: 'caveat', text: 'So its level is not comparable across arms.' },
                    { icon: 'compare', text: 'Each arm fixes output at given inputs instead.' },
                  ]}
                />
              }
              moreTitle="Why Z is not a percentage"
              morePreview="Z is also a units constant"
            >
              <Items items={[{ icon: 'productivity', text: 'Z moves so output at fixed inputs changes by the scenario’s gain.' }]} />
            </InfoCard>
            <InfoCard
              icon={iconFor('forecast')}
              title="Everything else unchanged"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'forecast', text: 'Baseline: the OBR-central path, trend productivity growth 1% a year.' },
                    { icon: 'ai', text: 'That OBR figure already includes its own central AI assumption.' },
                    { icon: 'path', text: 'So every result is AI beyond that path, not against no AI.' },
                    { icon: 'debt', text: 'Spending is set so 2030 debt/GDP matches the OBR’s (rerun R1).' },
                    { icon: 'compare', text: 'Every gap is against a no-shock restart of that path.' },
                  ]}
                />
              }
              moreTitle="The OBR-central path"
              morePreview="OBR-central baseline, the restart"
            >
              <Items items={[{ icon: 'model', text: 'Demographics, tax functions and policy stay as on the OBR-central path.' }]} />
            </InfoCard>
          </div>
        </section>

        <ScenariosSection uses={<UsedBy id="m-scenarios" />} />

        <section>
          <SectionHeading id="m-closures" icon={iconFor('closure')} title="Closures and income measures">
            <IconText icon="capital">Who finances new capital, and which measure of income leads.</IconText>
          </SectionHeading>
          <UsedBy id="m-closures" />
          <ClosureCards />
          <div className="info-card mx-card mx-measures" id="m-measures">
            <h3 className="info-card-title">
              <Icon name={iconFor('measure')} size={18} />
              <span>Three income measures</span>
            </h3>
            <div className="mx-measure-row">
              {MEASURES.map((m, i) => (
                <div key={m.k} className="mx-measure">
                  <span className="mx-measure-k">
                    <Icon name={iconFor(m.icon)} size={16} className="mx-measure-icon" />
                    {m.k}
                  </span>
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
          <SectionHeading id="m-rules" icon={iconFor('finances')} title="Fiscal rules and public finances">
            <IconText icon="rule">How the budget adjusts, and how debt responds to the interest rate.</IconText>
          </SectionHeading>
          <UsedBy id="m-rules" />
          <div className="card-grid mx-rules">
            {RULES.map((r) => (
              <InfoCard key={r.id} id={r.id} icon={iconFor(r.icon)} title={r.title} className="mx-card">
                <p className="mx-kicker">
                  <IconText icon="link">{r.tag}</IconText>
                </p>
                <Items items={r.items} />
              </InfoCard>
            ))}
          </div>
          <div className="card-grid cols-2">
            <InfoCard icon={iconFor('interest')} title="How debt is repriced" className="mx-card" id="m-debt">
              <Items
                items={[
                  { icon: 'interest', text: 'All model debt is one-year: a rate rise reprices the whole stock.' },
                  { icon: 'finances', text: 'UK gilts reprice more slowly.' },
                  { icon: 'limit', text: <>So the model overstates the rise in debt/GDP after {HEADLINE_YEAR}.</> },
                  { icon: 'check', text: <>Repriced at the OBR&rsquo;s assumed speed: {ext(pr(43), 'PR #43')}.</> },
                ]}
              />
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="m-path" icon={iconFor('path')} title="Steady state and path">
            <IconText icon="check">How each run is solved and checked. When the shock arrives and how it ramps up is on{' '}
            <NavLink tab="method" sub="how" anchor="m-timing">
              Scenarios, when it happens
            </NavLink>
            .</IconText>
          </SectionHeading>
          <UsedBy id="m-path" />
          <div className="card-grid cols-2">
            <InfoCard
              icon={iconFor('path')}
              title="Steady state, then the path"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'path', text: 'Time path iteration guesses whole price paths.' },
                    { icon: 'generations', text: 'It solves every cohort, then updates the guess.' },
                    { icon: 'measure', text: <>OG-UK&rsquo;s path tolerance is 10<sup>−4</sup>.</> },
                    { icon: 'timing', text: <>Run times: <NavLink tab="method" sub="code">Data and code</NavLink>.</> },
                  ]}
                />
              }
              moreTitle="Time path iteration"
              morePreview="Nested fixed points"
            >
              <Items items={[{ icon: 'breakEven', text: 'Each run finds the long run, then the yearly path to it.' }]} />
            </InfoCard>
            <InfoCard
              icon={iconFor('check')}
              title="Gated before and after"
              className="mx-card"
              more={
                <Items
                  items={[
                    {
                      icon: 'start',
                      text: (
                        <>
                          A no-shock restart must reproduce the baseline, {SURPRISE_YEAR}–{LATE_YEAR}, within 10<sup>−4</sup>.
                        </>
                      ),
                    },
                    { icon: 'check', text: 'After each solve, a sanity check tests identities and the labour share.' },
                    { icon: 'limit', text: 'Any failure stops the run.' },
                  ]}
                />
              }
              moreTitle="The two gates"
              morePreview="Continuation gate, sanity check"
            >
              <Items
                items={[
                  { icon: 'check', text: 'A restart test and a sanity check guard every number.' },
                  { icon: 'code', text: <>Commands: <NavLink tab="method" sub="code" anchor="pipeline">Data and code</NavLink>.</> },
                ]}
              />
            </InfoCard>
          </div>

        </section>

        <section>
          <SectionHeading id="m-limits" icon={iconFor('limit')} title="Limitations">
            <IconText icon="excluded">What the model leaves out, each stated once.</IconText>
          </SectionHeading>
          <UsedBy id="m-limits" />
          <Limitations />
        </section>

        <p className="mx-moved" id="m-history" tabIndex={-1}>
          <IconText icon="revision">
            Revision history: one list with the changelog, on{' '}
            <NavLink tab="method" sub="code" anchor="changelog">
              Data and code
            </NavLink>
            .
          </IconText>
        </p>
      </div>
    </div>
  );
}
