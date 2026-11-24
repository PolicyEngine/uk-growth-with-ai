'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import IconLine from '@/components/ui/IconLine.jsx';
import RefList from '@/components/ui/RefList.jsx';
import CiteFoot from '@/components/ui/CiteFoot.jsx';
import { docItem } from '@/lib/sourceItems.js';
import SettingRow, { SettingHeads } from '@/tabs/method/SettingRow.jsx';
import HouseholdFlow, { flowSvg, flowTable } from './HouseholdFlow.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { ModelLine, PageNotes } from '@/components/ui/PageIntro.jsx';
import UsedBy from '@/tabs/method/UsedBy.jsx';
import CautionPanel from '@/components/ui/CautionPanel.jsx';
import { D, NO_CLEAN_RERUN } from '@/tabs/story/part3/shared.jsx';
import { AI_FULL_RERUN, AI_STUDY, MODEL_YEAR } from '@/tabs/code/ledger.js';
import { URLS } from '@/tabs/ai/links.js';
import { ext } from '@/tabs/shared/ui.jsx';
import { fmtInputPct, fmtPct1 } from '@/tabs/story/part3/format.js';
import { RULE_DEFS, RULE_NAMES, methodName } from './figures.js';
import { REFS } from '@/tabs/story/part3/sources.jsx';
import { MACRO_ABOUT } from '@/lib/labels.js';
import { AHMADI_URL, HOUSEHOLD_REFS, REFERENCES, ahmadiRef } from '@/data/references.js';

// Method and sources > Household method: how uk-ai-study (PolicyEngine/
// uk-ai-study PR #18; its status is read from the data) produces the results in story part 3 and
// Explore > Households, following the paper's "Data and methods"
// (paper/sections/methodology.tex), in the model pages' one anatomy
// (Method redesign, section 5): what it is, how it works (a flow), key
// settings (six rows, each opening to its detail), what it leaves out, and
// its sources. Model parameters and data
// counts are the paper's printed values (paper/values_generated.tex) and the
// build manifest, carried in aiStudy2425.json `method`. Results are not
// repeated here. Its vintages are in Data and code's one vintages table;
// this page keeps an anchored line there (#hm-vintage).

const M = D.method;
// The model year (ledger.js, one home with the Method landing) and the
// status come from aiStudy2425.json
// a status chip only while the study is provisional; once merged, the line says so
const STATUS = AI_STUDY.provisional ? 'Provisional' : AI_STUDY.merged ? `Merged${AI_STUDY.mergedDay ? ` ${AI_STUDY.mergedDay}` : ''}, at ${AI_STUDY.commit.slice(0, 7)}` : null;
// Every published source this page names, linked. The references the
// study cites read the one registry (data/references.js: the key and the
// URL); the rest are this page's own links.
const reg = (id) => [REFERENCES[id].key, REFERENCES[id].url];
const L = {
  frs: reg('frs'),
  spi: reg('spi'),
  hbai: reg('hbai'),
  peUk: ['PolicyEngine UK', URLS.peUk],
  felten: reg('felten'),
  pizzinelli: reg('pizzinelli'),
  doorley: reg('doorley'),
  obrFrs: ['OBR, Fiscal risks and sustainability, July 2026, Box 4.1', 'https://obr.uk/frs/fiscal-risks-and-sustainability-july-2026/'],
  cazzaniga: reg('cazzaniga'),
  ucParams: ['PolicyEngine UK’s Universal Credit parameters', 'https://github.com/PolicyEngine/policyengine-uk/tree/main/policyengine_uk/parameters/gov/dwp/universal_credit'],
  ucGov: ['GOV.UK: Universal Credit, what you’ll get', 'https://www.gov.uk/universal-credit/what-youll-get'],
  jsaGov: ['GOV.UK: Jobseeker’s Allowance, what you’ll get', 'https://www.gov.uk/jobseekers-allowance/what-youll-get'],
  methods: ['the study’s data and methods', AI_STUDY.blob('paper/sections/methodology.tex')],
};
const l = (k, text) => ext(L[k][1], text ?? L[k][0]);
const In = ({ children }) => <span data-input="">{children}</span>;
const CENTRAL_PCT = Number(/([\d.]+)% prescribed/.exec(D.headline.central_displaced.note)?.[1]);
// Inputs the page types (no confirmed data key): each said once here, so a
// Key settings header and its row's body cannot disagree. The grid of
// displacement shares, the new-style JSA duration, and the draws behind the
// variants (the main case's count is read from the data).
const GRID_PCT = [0, 10];
const JSA_WEEKS = 26;
const DRAWS_VARIANTS = 20;
const DRAWS_ONE = 1;

const SECTIONS = [
  { id: 'hm-pipeline', title: 'How it works', icon: iconFor('stages') },
  { id: 'hm-settings', title: 'Key settings', icon: iconFor('rule') },
  { id: 'hm-out', title: 'What it leaves out', icon: iconFor('excluded') },
  { id: 'hm-sources', title: 'Sources', icon: iconFor('record') },
];

// The flow's boxes and arrows (Method redesign, 5.2): only what the study
// has. Exposure sets each group's share of the job losses in the main case
// (not under the Uniform rule), so its arrow names the main case; the cost
// comes out of the tax-benefit step beside the incomes, not after them.
const FLOW = {
  boxes: {
    a: { icon: 'data', title: 'Survey data', line: 'Microcosm UK 2024–25: households and their incomes' },
    b: { icon: 'ai', title: 'AI exposure', line: 'A score for each of nine occupation groups (C-AIOE)' },
    c: { icon: 'shock', title: 'The shock', line: 'Job loss · a wage rise for those who keep jobs · higher capital income' },
    d: { icon: 'model', title: 'PolicyEngine UK', line: `Taxes and benefits, ${MODEL_YEAR}, before and after` },
    e1: { icon: 'households', title: 'Household incomes', line: 'Net income by decile, poverty, the Gini' },
    e2: { icon: 'finances', title: 'Public finances', line: 'The cost: the fall in the government balance' },
  },
  links: [
    { id: 'ad', from: 'a', to: 'd', label: 'the households it runs on' },
    { id: 'bc', from: 'b', to: 'c', label: 'sets each group’s share, in the main case' },
    { id: 'cd', from: 'c', to: 'd', label: 'changed earnings and capital income' },
    { id: 'de1', from: 'd', to: 'e1', label: 'income after taxes and benefits' },
    { id: 'de2', from: 'd', to: 'e2', label: 'taxes lost, benefits paid' },
  ],
  tag: 'Repeated over random draws; each result is a mean',
};

export default function HouseholdsMethod() {
  return (
    <div className="page-with-contents mx-tab hm-page">
      <OnThisPage tab="method" sub="households" sections={SECTIONS} label="Household method contents" />
      <div className="page-body">
        <header className="hh-lead page-intro">
          <h2 className="hh-question page-q">
            <span>How does the household study produce its results?</span>
            <PageNotes />
          </h2>
          <div className="model-row">
            <ModelLine />
          </div>
          <p className="hh-answer">
            <IconText icon="jobLoss">
              <a href={AHMADI_URL} target="_blank" rel="noopener noreferrer" title={REFS.ahmadi.title}>
                The study
              </a>{' '}
              removes, for one year, the earnings of randomly chosen employees in a calibrated UK sample, weighted by AI exposure.
            </IconText>
          </p>
          {STATUS ? (
            <p className="notice-chip">
              <IconText icon={AI_STUDY.provisional ? 'provisional' : 'version'}>{STATUS}</IconText>
            </p>
          ) : null}
          {/* T5 (round 2, moved from the story's part 3 opener): said once, here */}
          {AI_STUDY.merged && (AI_FULL_RERUN === false || NO_CLEAN_RERUN) ? <p className="hh-answer hm-rerun">Results come from the merged study and were not re-run from scratch.</p> : null}
        </header>

        <section>
          <SectionHeading id="hm-pipeline" icon={iconFor('stages')} title="How it works">
            <IconText icon="stages">Data, exposure and the shock feed the tax-benefit model; results are averaged over draws.</IconText>
          </SectionHeading>
          <Card
            id="hm-flow"
            icon={iconFor('stages')}
            title="From survey data to a result"
            sources={[ahmadiRef(), docItem('PolicyEngine UK', URLS.peUk, 'PolicyEngine')]}
            logo={false}
            download={{ title: 'From survey data to a result', context: 'The household study’s steps and what passes between them', table: () => flowTable(FLOW), svg: () => flowSvg(FLOW), legend: () => [] }}
          >
            <HouseholdFlow {...FLOW} />
          </Card>
        </section>

        <section>
          <SectionHeading id="hm-settings" icon={iconFor('rule')} title="Key settings">
            <IconText icon="rule">What the study assumes, and what else was run. Open a row for the detail.</IconText>
          </SectionHeading>
          <div className="mx-settings">
            <SettingHeads />
            <SettingRow id="hm-data" setting="Data and model" uses={`Microcosm UK 2024–25; policyengine-uk ${M.policyengine_uk}; ${MODEL_YEAR}`}>
              <p className="mx-setting-lead">
                <IconText icon="timing">One year, {MODEL_YEAR}.</IconText>
              </p>
              <div className="card-grid cols-2">
                <InfoCard icon={iconFor('data')} title="Microcosm UK 2024–25">
                  <KeyFacts
                    className="mx-facts-row"
                    facts={[
                      { icon: 'households', value: M.households, label: 'households in the file' },
                      { icon: 'generations', value: M.persons, label: 'people in the file' },
                      { icon: 'measure', value: `${M.population_m}m`, label: 'people, grossed up' },
                      { icon: 'labour', value: `${M.employees_m}m`, label: 'employees, grossed up' },
                    ]}
                  />
                  <Items
                    items={[
                      { icon: 'source', text: <>The {l('frs')} 2024–25.</> },
                      { icon: 'pay', text: <>Top incomes from the {l('spi')}.</> },
                      { icon: 'check', text: 'Imputed variables; weights calibrated to administrative and survey totals.' },
                    ]}
                  />
                </InfoCard>
                <InfoCard icon={iconFor('model')} title={`policyengine-uk ${M.policyengine_uk}`}>
                  <p className="mx-sub">
                    <IconText icon="link">{l('peUk', 'PolicyEngine UK on GitHub')}</IconText>
                  </p>
                  <Items
                    items={[
                      { icon: 'version', text: `Release bundle: policyengine.py ${M.policyengine}.` },
                      { icon: 'tax', text: `Income tax, National Insurance and benefits for ${MODEL_YEAR}.` },
                      { icon: 'poverty', text: <>Incomes: {l('hbai', 'DWP Households Below Average Income (HBAI)')}, before and after housing costs.</> },
                      { icon: 'cost', text: 'The cost is the fall in the government balance.' },
                      { icon: 'finances', text: 'It counts income tax, employee and employer NI, and benefits.' },
                      { icon: 'excluded', text: 'No corporation tax; household spending held at baseline.' },
                    ]}
                  />
                </InfoCard>
              </div>
              <UsedBy id="hm-data" />
            </SettingRow>
            <SettingRow id="hm-exposure" setting="AI exposure" uses="C-AIOE, averaged over nine occupation groups">
              <p className="mx-setting-lead">
                <IconText icon="measure">The complementarity-adjusted AI occupational exposure index (C-AIOE).</IconText>
              </p>
              <Items
                className="hm-items"
                items={[
                  { icon: 'source', text: <>Starts from {l('felten')}&rsquo;s AI Occupational Exposure index.</> },
                  { icon: 'ai', text: 'It links progress in ten AI applications to occupational abilities.' },
                  { icon: 'jobKeep', text: 'Scaled down where AI more likely complements than replaces.' },
                  { icon: 'source', text: <>That adjustment: {l('pizzinelli')}.</> },
                  { icon: 'measure', text: 'Mapped to UK SOC2020, averaged over nine major occupation groups.' },
                  { icon: 'caveat', text: 'So exposure varies between groups, not within them.' },
                  { icon: 'excluded', text: 'Shifted so elementary occupations, the least exposed, score zero: no displacement.' },
                ]}
              />
              <UsedBy id="hm-exposure" />
            </SettingRow>
            <SettingRow id="hm-shock" setting="The shock" uses={<><In>{fmtInputPct(CENTRAL_PCT)}</In> of employees displaced; wages of the rest +<In>{fmtInputPct(M.survivor_wage_pct)}</In>; capital income +<In>{fmtPct1(M.capital_uplift_pct)}</In></>} also={<>A grid from <In>{GRID_PCT[0]}</In> to <In>{GRID_PCT[1]}%</In> displaced</>}>
              <p className="mx-setting-lead">
                <IconText icon="caveat">A scenario input from {l('doorley')}, applied in one year; not estimated from data.</IconText>
              </p>
              <div className="card-grid is-top">
                <InfoCard icon={iconFor('jobLoss')} title="Job loss">
                  <Items
                    items={[
                      { icon: 'jobLoss', text: <>Main case: <In>{fmtInputPct(CENTRAL_PCT)}</In> of employees displaced.</> },
                      { icon: 'source', text: <>{l('doorley')}&rsquo;s Irish design, which the study follows.</> },
                      { icon: 'source', text: 'They take it from a Goldman Sachs scenario (Briggs and Kodnani, 2023).' },
                      { icon: 'timing', text: 'About a decade of adoption, here in one year: an impact-year test.' },
                      // the OBR figure: \genObrFrsSubstitutionPct in the paper's values_generated.tex (FRS 2026, Box 4.1)
                      { icon: 'compare', text: <>{l('obrFrs', 'OBR')}, for scale: around <In>10%</In> of workers face substitution within ten years.</> },
                      { icon: 'range', text: <>Grid: <In>{GRID_PCT[0]}–{GRID_PCT[1]}%</In> displacement; presets at <In>1%</In> and <In>13%</In>.</> },
                      { icon: 'deciles', text: 'Shared between groups by employment times exposure.' },
                      { icon: 'draws', text: 'Records drawn at random within each group.' },
                      { icon: 'excluded', text: 'Earnings, hours, pension contributions and statutory pay set to zero.' },
                      { icon: 'timing', text: 'Counted as unemployed for the whole year.' },
                    ]}
                  />
                </InfoCard>
                <InfoCard icon={iconFor('pay')} title="Wages of those still employed">
                  <Items
                    items={[
                      { icon: 'pay', text: <>Wages of those kept rise by <In>{fmtInputPct(M.survivor_wage_pct)}</In> on average.</> },
                      { icon: 'source', text: <>The rise follows {l('doorley')}.</> },
                      { icon: 'why', text: 'In proportion to their group’s complementarity.' },
                      { icon: 'jobKeep', text: 'No one who keeps their job loses pay.' },
                    ]}
                  />
                </InfoCard>
                <InfoCard icon={iconFor('capital')} title="Capital income">
                  <Items
                    items={[
                      { icon: 'capital', text: <>Interest and dividend income rise by <In>{fmtPct1(M.capital_uplift_pct)}</In>.</> },
                      { icon: 'interest', text: <>A <In>{M.return_shock_pp}</In>-point rise in the return, as in {l('doorley')}.</> },
                      { icon: 'source', text: <>They motivate it with {l('cazzaniga')}.</> },
                      { icon: 'capital', text: 'Rents and pension returns are unchanged.' },
                      { icon: 'excluded', text: 'The self-employed are outside both labour-market shocks.' },
                    ]}
                  />
                </InfoCard>
              </div>
              <UsedBy id="hm-shock" />
            </SettingRow>
            <SettingRow id="hm-rules" setting="Who loses the job" uses={RULE_NAMES.exposure.plain} also="Four other rules; wage cuts in place of job loss">
              <p className="mx-setting-lead">
                <IconText icon="draws">Five rules share out the same expected number of job losses.</IconText>
              </p>
              <p className="hm-text">
                <IconText icon="rule">The five rules and the policy variants are the study&rsquo;s designs: {l('methods')}.</IconText>
              </p>
              <Items
                className="hm-items"
                items={[
                  { icon: 'ai', text: <><b>{methodName('exposure')}</b>, the main case: {RULE_DEFS.exposure}.</> },
                  { icon: 'age', text: <><b>{methodName('junior')}:</b> {RULE_DEFS.junior}.</> },
                  { icon: 'pay', text: <><b>{methodName('compression')}:</b> {RULE_DEFS.compression}.</> },
                  { icon: 'draws', text: <><b>{methodName('uniform')}:</b> {RULE_DEFS.uniform}.</> },
                  { icon: 'limit', text: <><b>{methodName('klein_top_loaded')}:</b> {RULE_DEFS.klein_top_loaded}.</> },
                  { icon: 'deciles', text: 'It loads displacement on above-median earners: an upper stress case.' },
                ]}
              />
              <Items
                className="hm-items mx-foot-items"
                items={[
                  { icon: 'compare', text: 'Every other wage and capital-income change is the same under each rule.' },
                  { icon: 'compare', text: 'Separate runs turn the same gross loss into exposure-graded wage cuts.' },
                  { icon: 'jobKeep', text: 'In those runs no one loses a job.' },
                ]}
              />
              <UsedBy id="hm-rules" />
            </SettingRow>
            <SettingRow id="hm-takeup" setting="Benefits and take-up" uses="Take-up as in the data; no new-style JSA for the newly displaced" also={<>Full take-up of Universal Credit; JSA for <In>{JSA_WEEKS}</In> weeks</>}>
              <p className="mx-setting-lead">
                <IconText icon="takeUp">What a displaced worker can claim, and whether they do.</IconText>
              </p>
              <KeyFacts
                className="mx-facts-row"
                facts={[
                  { icon: 'benefits', value: <In>£{M.uc_single_month_gbp}</In>, label: 'Universal Credit (UC) a month, single, 25 or over' },
                  { icon: 'households', value: <In>£{M.uc_couple_month_gbp}</In>, label: 'UC a month, couple' },
                  { icon: 'pay', value: <><In>{M.uc_taper_pct}</In>p</>, label: 'in the pound of partner’s earnings, above the work allowance' },
                  { icon: 'capital', value: <In>£{M.uc_capital_limit_gbp}</In>, label: 'capital above this removes entitlement' },
                ]}
              />
              <Items
                className="hm-items"
                items={[
                  { icon: 'benefits', text: <>Universal Credit is means-tested on the benefit unit, {MODEL_YEAR}.</> },
                  { icon: 'source', text: <>Rates: {l('ucParams', 'PolicyEngine UK parameters')}; current rates on {l('ucGov', 'GOV.UK')}.</> },
                  { icon: 'takeUp', text: 'Each benefit unit keeps its take-up decision drawn in the data.' },
                  { icon: 'excluded', text: 'New-style Jobseeker’s Allowance (JSA): paid only where the survey reports an award.' },
                  { icon: 'jobLoss', text: 'So the newly displaced do not get it.' },
                ]}
              />
              <Items
                className="hm-items mx-foot-items"
                items={[
                  { icon: 'compare', text: 'Two variants relax this, on the same draws:' },
                  { icon: 'takeUp', text: 'Every benefit unit with a displaced worker claims UC.' },
                  { icon: 'benefits', text: <>Contribution condition met: also <In>£{M.jsa_week_gbp}</In> a week of new-style JSA, <In>{JSA_WEEKS}</In> weeks.</> },
                  { icon: 'source', text: <>JSA rates: {l('jsaGov', 'GOV.UK')}.</> },
                ]}
              />
              <UsedBy id="hm-takeup" />
            </SettingRow>
            <SettingRow id="hm-draws" setting="Draws and spread" uses={`Mean of ${D.headline.central_cost.draws} draws, main case`} also={<><In>{DRAWS_VARIANTS}</In> draws and <In>{DRAWS_ONE === 1 ? 'one' : DRAWS_ONE}</In> draw for the variants</>}>
              <p className="mx-setting-lead">
                <IconText icon="draws">Who is displaced is random: each result is a mean over draws, whose counts the study chose ({l('methods')}).</IconText>
              </p>
              <KeyFacts
                className="mx-facts-row"
                facts={[
                  { icon: 'draws', value: '50', label: 'draws: main case, five rules, policy responses' },
                  { icon: 'draws', value: `${DRAWS_VARIANTS}`, label: 'draws: channel split, take-up and JSA, wage cuts', sub: 'also OBR-sized, break-evens' },
                  { icon: 'caveat', value: `${DRAWS_ONE}`, label: 'draw (seed 0): a few labelled sensitivities' },
                ]}
              />
              <Items
                className="hm-items"
                items={[
                  { icon: 'data', text: <>Uneven weights: {M.employee_rows} employee records, effective sample about {M.kish_n}.</> },
                  { icon: 'range', text: <>Realised displaced: {M.displaced_min_m} to {M.displaced_max_m} million across the 50 main-case draws.</> },
                  { icon: 'caveat', text: 'A standard deviation shows how much a single draw can vary.' },
                  { icon: 'limit', text: 'It is not a confidence interval.' },
                  { icon: 'limit', text: 'Neither it nor a mean’s standard error reflects sampling or assumption uncertainty.' },
                ]}
              />
              <UsedBy id="hm-draws" />
            </SettingRow>
          </div>
        </section>

        <CautionPanel
          heading={
            <SectionHeading id="hm-out" icon={iconFor('excluded')} title="What it leaves out">
              <IconText icon="excluded">The study traces current rules, not behaviour or the wider economy.</IconText>
            </SectionHeading>
          }
        >
          <ul className="mx-limit-grid hm-out-grid">
            {[
              ['excluded', 'No re-employment, partners’ hours, redundancy pay or drawing on savings.'],
              ['timing', 'A one-year stock of job loss.'],
              ['model', 'Not linked to the macro model: no prices, wages or interest rates.'],
              ['tax', 'No corporation tax, VAT or other indirect taxes.'],
              ['finances', 'The public-sector pay bill of the displaced is outside the balance.'],
              ['benefits', 'Council tax reduction does not respond to the lost earnings.'],
              ['limit', 'The benefit cap applies without its nine-month grace period.'],
              ['age', 'No reduced hiring of young workers.'],
              ['interest', 'No feedback to prices, interest rates or output.'],
            ].map(([icon, text]) => (
              <li key={text} className="mx-limit-tile hm-out-tile">
                <Icon name={iconFor(icon)} size={16} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="hm-text">
            <IconText icon="link">
              For the wider economy, see{' '}
              <NavLink tab="method" sub="how" anchor="m-limits">
                The macro model&rsquo;s limitations
              </NavLink>
              ; the macro model, {MACRO_ABOUT}, has no unemployment.
            </IconText>
          </p>
        </CautionPanel>

        <section>
          <SectionHeading id="hm-sources" icon={iconFor('record')} title="Sources" />
          <RefList ids={HOUSEHOLD_REFS} compact />
          <IconLine concept="link" className="mx-sources-line">
            All sources, with where each figure is read:{' '}
            <NavLink tab="method" sub="studies" anchor="sources">
              Evidence, sources
            </NavLink>
          </IconLine>
          <p className="mx-moved" id="hm-vintage" tabIndex={-1}>
            <IconText icon="revision">
              Vintages: which study commit and data build the dashboard reads, on{' '}
              <NavLink tab="method" sub="code" anchor="vintages">
                Data and code
              </NavLink>
              .
            </IconText>
          </p>
          <ul className="p3-close-links">
            {/* a citation (check_text exempts [data-cite]) */}
            <li data-cite="">
              <a href={AHMADI_URL} target="_blank" rel="noopener noreferrer">
                <Icon name="arrowRight" size={16} strokeWidth={2} /> {REFS.ahmadi.title} (PDF)
              </a>
            </li>
            <li>
              <NavLink tab="explore" sub="households" className="p3-close-link">
                <Icon name="arrowRight" size={16} strokeWidth={2} /> Explore: households
              </NavLink>
            </li>
          </ul>
          <CiteFoot />
        </section>
      </div>
    </div>
  );
}
