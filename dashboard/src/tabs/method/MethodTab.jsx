'use client';

import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem } from '@/lib/sourceItems.js';
import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import FoldGrid from './FoldGrid.jsx';
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
import { SRC } from './sources.js';

const cite = (k) => ext(SRC[k].url, SRC[k].label);

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
    <FoldGrid className="card-grid cols-2">
      <InfoCard
        icon={iconFor('foreign')}
        title="Some foreign capital"
        className="mx-card"
        id="closure-central"
        more={
          <Items
            items={[
              { icon: 'foreign', text: <>&zeta;<sub>K</sub>, in OG-Core&rsquo;s definition: the share of excess capital demand that foreigners supply ({cite('ogCoreParams')}).</> },
              { icon: 'model', text: <>{pct(ZETA[CENTRAL], 0)} is OG-Core&rsquo;s US default, chosen by the study and kept by OG-UK ({cite('ogukParams')}); not calibrated to the UK.</> },
              { icon: 'interest', text: <>World interest rate 2%: OG-UK&rsquo;s default ({cite('ogukParams')}; OG-Core&rsquo;s is 4%). A modelling choice, not from a published source.</> },
              { icon: 'debt', text: <>Foreigners buy 40% of new government debt (&zeta;<sub>D</sub>): OG-Core&rsquo;s default, kept by OG-UK ({cite('ogukParams')}). A modelling choice, not from a UK source.</> },
              { icon: 'data', text: <>Its baseline income paid abroad sits inside the UK&rsquo;s ({cite('pinkBook')}).</> },
              { icon: 'caveat', text: <>It misses the current account; the no-foreign-capital case is closer on the net foreign-asset stock ({ext(DOC_MAIN('closure_choice.md'), 'closure memo')}).</> },
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
        <Items
          items={[
            { icon: 'foreign', text: 'Share of excess capital demand met from abroad, not of added capital.' },
            { icon: 'gni', text: `${FOREIGN_DK != null && FOREIGN_DK < 50 ? 'Some' : 'Most'} added capital is foreign-owned: national income (GNI) trails GDP.` },
            { icon: 'rule', text: <>OG-Core&rsquo;s US default, chosen by the study ({cite('closureMemo')}).</> },
          ]}
        />
      </InfoCard>
      <InfoCard
        icon={iconFor('closed')}
        title="No-foreign-capital bound"
        className="mx-card"
        id="closure-bound"
        more={
          <Items
            items={[
              { icon: 'households', text: 'UK households’ saving finances all the extra capital.' },
              { icon: 'gni', text: 'GNI and GDP nearly coincide.' },
              { icon: 'closure', text: <>The {S.closures[BOUND].role}: on Explore, choose No foreign capital or Both.</> },
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
            { icon: 'closed', text: 'No foreign private capital flows in.' },
            { icon: 'debt', text: 'Foreigners still buy 40% of new gilts.' },
            { icon: 'interest', text: 'Results do not depend on the world interest rate.' },
          ]}
        />
      </InfoCard>
    </FoldGrid>
  );
}

// The foreign-owned share of UK central's extra capital in the headline year
// (main arm, some foreign capital, common rule): surprise2028.json
// foreign_share_dK_2031, whole per cent. Its figure has one home (the
// story's GNI tile); Method says only whether it is most.
const FOREIGN_DK = (() => {
  const x = S.results?.uk_central?.tfp?.[CENTRAL]?.foreign_share_dK_2031;
  return typeof x === 'number' ? Math.round(x) : null;
})();

const MEASURES = [
  { k: 'GDP', icon: 'gdp', t: 'Output produced in the UK', d: `The stress test holds it at the OBR’s central forecast path in ${HEADLINE_YEAR}.` },
  { k: 'GNI', icon: 'gni', t: 'Income UK residents keep', d: 'GDP less the return paid on foreign-owned capital and gilts.' },
  { k: 'NNI', icon: 'depreciation', t: 'Net national income: GNI after depreciation', d: 'GNI − δK, with δ = 0.065 a year (OG-UK default parameters).', href: SRC.ogukParams.url },
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
      { icon: 'rule', text: <>A modelling choice, against OG-UK&rsquo;s default of 4 ({ext(SRC.tg1.url, 'tG1 = 10')}).</> },
      { icon: 'timing', text: `So debt is quoted for ${HEADLINE_YEAR} and ${LATE_YEAR}.` },
    ],
  },
  fixed: {
    id: 'rule-fixed',
    icon: 'finances',
    tag: 'A choice on Explore (UK central, Korinek et al.)',
    items: [{ icon: 'rule', text: <>A modelling choice ({cite('fiscalRules')}).</> }],
  },
  dn: {
    id: 'rule-dn',
    icon: 'debt',
    tag: 'Headline rule on Who gains',
    items: [
      { icon: 'rule', text: <>A modelling choice ({cite('fiscalRules')}).</> },
    ],
  },
};
const NOTE_ICON = { common: 'path', fixed: 'finances', dn: 'households' };
const RULES = RULE_NAMES.map((r) => ({
  ...RULE_TEXT[r.id],
  title: r.label,
  items: [{ icon: NOTE_ICON[r.id], text: `${r.note}.` }, ...RULE_TEXT[r.id].items],
}));

// What the model leaves out: one short list, a line each, every fact once.
function Limitations() {
  const items = [
    { title: 'One sector', text: 'no shift towards goods that stay scarce.' },
    { title: 'No unemployment', text: <>displacement shows in pay, not jobs ({ext(SRC.efoMarBox22.url, 'OBR Box 2.2')}).</> },
    { title: 'Imposed technology paths', text: 'from OBR and IMF figures, not estimated.' },
    { title: 'Slow capital response', text: <>elasticity below {ext(SRC.korinekT5.url, 'Korinek et al.’s')} lowest ({ext(DOC('red_flags_1_3.md'), 'red flag 1')}).</> },
    {
      title: 'Revenue responds too little',
      text: (
        <>
          labour and capital income{' '}
          <NavLink tab="explore" sub="finances" anchor="tax-gap">
            taxed alike
          </NavLink>
          .
        </>
      ),
    },
    { title: 'Possible double counting', text: <>the forecast path has the {ext(SRC.bp9B14.url, 'OBR’s AI')} ({ext(issue(27), 'issue #27')}).</> },
    { title: 'Perfect foresight', text: `from ${SURPRISE_YEAR} everyone knows the path; no precautionary saving.` },
    { title: 'Substitution fixed at one', text: 'the labour share follows γ exactly.' },
    { title: 'No markups', text: 'wages and rents equal marginal products.' },
    { title: 'Foreign AI providers', text: 'their returns enter only through ζK.' },
    { title: 'No money, trade or exchange rate', text: 'links abroad are capital and gilts.' },
    { title: 'No regions or housing', text: 'one national economy.' },
  ];
  return (
    <ul className="mx-limit-list">
      {items.map((it) => (
        <li key={it.title}>
          <span className="mx-limit-title">{it.title}:</span> {it.text}
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
          kicker="OG-UK · gaps against the OBR’s central forecast path, not forecasts"
          question="How does OG-UK turn an AI scenario into these results?"
          answer={<IconText icon="model">A model of the whole UK economy in which every market clears. Each result is a gap against the OBR’s central forecast path: OG-UK’s own path on the OBR’s March 2026 productivity growth and debt target, restarted in 2028 without the extra AI. Not a forecast.</IconText>}
        >
          <WhyChain
            className="mx-chain"
            label="From an AI scenario to a result"
            links={[
              { icon: 'scenario', text: 'An AI scenario' },
              { icon: 'ai', text: 'Two production inputs change' },
              { icon: 'model', text: 'Every market re-clears' },
              { icon: 'path', text: 'Gap against the OBR’s central forecast path' },
            ]}
          />
        </PageIntro>
        <section>
          <SectionHeading id="m-model" icon={iconFor('model')} title="The model">
            <IconText icon="link">{ext(URLS.ogUkFork, 'OG-UK')}, the UK calibration of {ext(URLS.ogCore, 'OG-Core')}. Choose a block to light its flows.</IconText>
          </SectionHeading>
          <UsedBy id="m-model" />
          <Card
            id="model-diagram"
            sources={[docItem('OG-UK, the UK calibration', URLS.ogUkFork, 'OG-UK'), docItem('OG-Core, the model it is built on', URLS.ogCore, 'OG-Core')]}
            icon={iconFor('model')}
            title="OG-UK in four blocks"
            finding={<IconText icon="breakEven">Households, firms, a government and the rest of the world, trading until every market clears.</IconText>}
            logo={false}
            download={{ title: 'OG-UK in four blocks', context: 'The flows between the blocks of the model', table: flowTable, svg: diagramSvg, legend: () => [] }}
          >
            <ModelDiagram />
          </Card>
          <FoldGrid className="card-grid cols-2 mx-gen-grid">
            <div className="info-card mx-card mx-figure" id="m-generations">
              <h3 className="info-card-title">
                <Icon name={iconFor('generations')} size={18} />
                <span>Many generations at once</span>
                <SourceLine items={[docItem('OG-Core, the model it is built on', URLS.ogCore, 'OG-Core'), docItem('OG-UK, the UK calibration', URLS.ogUkFork, 'OG-UK')]} />
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
          </FoldGrid>
        </section>

        <section>
          <SectionHeading id="m-shock" icon={iconFor('shock')} title="The shock">
            <IconText icon="ai">OG-UK has no AI parameter. AI changes two numbers in production.</IconText>
          </SectionHeading>
          <UsedBy id="m-shock" />
          <FoldGrid className="card-grid">
            <InfoCard
              icon={iconFor('ai')}
              title="Automation"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'equation', text: <>Cobb-Douglas production: the labour share is exactly 1 &minus; &gamma;.</> },
                    { icon: 'scenario', text: <>A fall of f points sets &gamma; to 0.35 + f/100; 0.35 is OG-UK&rsquo;s default ({cite('ogukParams')}).</> },
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
                    { icon: 'forecast', text: <>Forecast path: OG-UK&rsquo;s path, set to the OBR&rsquo;s central forecast, which already includes the OBR&rsquo;s own assumption about AI ({cite('bp9B14')}; {cite('efoOct127')}).</> },
                    { icon: 'ai', text: <>Its trend productivity growth is 1% a year, from the March 2026 EFO ({cite('efoMarPath')}).</> },
                    { icon: 'path', text: 'So every result is AI beyond that path, not against no AI.' },
                    { icon: 'debt', text: <>Spending is set so 2030 debt/GDP matches the OBR&rsquo;s March 2026 forecast ({cite('efoMarDebt')}; {cite('debtTarget')}).</> },
                    { icon: 'compare', text: 'Every gap is against that path, restarted without the extra AI.' },
                  ]}
                />
              }
              moreTitle="The forecast path"
              morePreview="Forecast path, the restart"
            >
              <Items
                items={[
                  { icon: 'generations', text: <>Demographics: {cite('unWpp')}, via OG-Core.</> },
                  { icon: 'model', text: <>Tax functions ({cite('peUk')}) and policy: as on the forecast path.</> },
                  { icon: 'forecast', text: <>Forecast path: built on the March EFO ({cite('efoMarPath')}).</> },
                ]}
              />
            </InfoCard>
          </FoldGrid>
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
                  <span className="mx-measure-d">{m.href ? ext(m.href, m.d) : m.d}</span>
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
          <FoldGrid className="card-grid mx-rules">
            {RULES.map((r) => (
              <InfoCard key={r.id} id={r.id} icon={iconFor(r.icon)} title={r.title} className="mx-card">
                <p className="mx-kicker">
                  <IconText icon="link">{r.tag}</IconText>
                </p>
                <Items items={r.items} />
              </InfoCard>
            ))}
          </FoldGrid>
          <FoldGrid className="card-grid cols-2">
            <InfoCard icon={iconFor('interest')} title="How debt is repriced" className="mx-card" id="m-debt">
              <Items
                items={[
                  { icon: 'interest', text: 'All model debt is one-year: a rate rise reprices the whole stock.' },
                  { icon: 'finances', text: 'UK gilts reprice more slowly.' },
                  { icon: 'limit', text: <>So the model overstates the rise in debt/GDP after {HEADLINE_YEAR}.</> },
                  { icon: 'check', text: <>Repriced at the OBR&rsquo;s ready-reckoner speed: {ext(pr(43), 'PR #43')}.</> },
                  { icon: 'source', text: <>That speed: {cite('efoOct')}.</> },
                ]}
              />
            </InfoCard>
          </FoldGrid>
        </section>

        <section>
          <SectionHeading id="m-path" icon={iconFor('path')} title="Steady state and path">
            <IconText icon="check">How each run is solved and checked. When the extra AI starts and how it ramps up is on{' '}
            <NavLink tab="method" sub="how" anchor="m-timing">
              Scenarios, when it happens
            </NavLink>
            .</IconText>
          </SectionHeading>
          <UsedBy id="m-path" />
          <FoldGrid className="card-grid cols-2">
            <InfoCard
              icon={iconFor('path')}
              title="Steady state, then the path"
              className="mx-card"
              more={
                <Items
                  items={[
                    { icon: 'path', text: 'Time path iteration guesses whole price paths.' },
                    { icon: 'generations', text: 'It solves every cohort, then updates the guess.' },
                    { icon: 'measure', text: <>Path tolerance 10<sup>−4</sup>: a solver setting, not from a published source.</> },
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
                          Restarted without the extra AI, the model must reproduce the OBR’s central forecast path, {SURPRISE_YEAR}–{LATE_YEAR}: within 10<sup>−4</sup> for GDP, capital and debt/GDP, 10<sup>−3</sup> for the rest.
                        </>
                      ),
                    },
                    { icon: 'check', text: <>After each solve, a sanity check tests identities and the labour share ({cite('checks')}).</> },
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
          </FoldGrid>

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
