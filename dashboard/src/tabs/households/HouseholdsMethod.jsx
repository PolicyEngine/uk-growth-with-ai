'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import { SectionHeading } from '@/components/ui/Card.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { Items, KeyFacts } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import IconText from '@/tabs/method/IconText.jsx';
import { NavLink } from '@/lib/nav.jsx';
import UsedBy from '@/tabs/method/UsedBy.jsx';
import { D, MODEL_YEAR, PAPER_URL } from '@/tabs/story/part3/shared.jsx';
import { fmtInputPct, fmtPct1 } from '@/tabs/story/part3/format.js';

// Method and sources > Household method: how uk-ai-study (PolicyEngine/
// uk-ai-study PR #18, provisional) produces the results in story part 3 and
// Explore > Households, in short sections, following the paper's "Data and
// methods" (paper/sections/methodology.tex). Model parameters and data
// counts are the paper's printed values (paper/values_generated.tex) and the
// build manifest, carried in aiStudy2425.json `method`. Results are not
// repeated here. Its vintages are in Data and code's one vintages table;
// this page keeps an anchored line there (#hm-vintage).

const M = D.method;
const In = ({ children }) => <span data-input="">{children}</span>;
const CENTRAL_PCT = Number(/([\d.]+)% prescribed/.exec(D.headline.central_displaced.note)?.[1]);

const SECTIONS = [
  { id: 'hm-pipeline', title: 'The pipeline', icon: iconFor('stages') },
  { id: 'hm-data', title: 'Data and model', icon: iconFor('data') },
  { id: 'hm-exposure', title: 'AI exposure', icon: iconFor('ai') },
  { id: 'hm-shock', title: 'The shock', icon: iconFor('shock') },
  { id: 'hm-rules', title: 'Who loses the job', icon: iconFor('jobLoss') },
  { id: 'hm-takeup', title: 'Benefits and take-up', icon: iconFor('takeUp') },
  { id: 'hm-draws', title: 'Draws and spread', icon: iconFor('draws') },
  { id: 'hm-out', title: 'What it leaves out', icon: iconFor('excluded') },
];

const STAGES = [
  ['data', 'Microcosm UK 2024–25', 'Households and incomes, calibrated to official totals'],
  ['ai', 'AI exposure', 'A score for each of nine occupation groups (C-AIOE)'],
  ['shock', 'The shock', 'Job loss, wage rises, higher capital income'],
  ['model', 'PolicyEngine-UK', `Taxes and benefits, ${MODEL_YEAR}, before and after`],
  ['draws', 'Draws', 'The difference, averaged over random draws of who is displaced'],
];

function Pipeline() {
  return (
    <ol className="hm-flow" aria-label="The study’s pipeline in five stages">
      {STAGES.map(([icon, title, text], i) => (
        <li key={title} className="hm-stage">
          <span className="hm-stage-n">{i + 1}</span>
          <Icon name={iconFor(icon)} size={18} />
          <b>{title}</b>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HouseholdsMethod() {
  return (
    <div className="page-with-contents mx-tab hm-page">
      <OnThisPage tab="method" sub="households" sections={SECTIONS} label="Household method contents" />
      <div className="page-body">
        <header className="hh-lead">
          <p className="hh-question page-q">
            <Icon name={iconFor('households')} size={18} />
            <span>How does the household study produce its results?</span>
          </p>
          <p className="hh-answer">
            <IconText icon="jobLoss">
              On a calibrated sample of UK households, the study removes the earnings of employees chosen at random, weighted by AI exposure, for
              one year.
            </IconText>
          </p>
          <p className="notice-chip">
            <IconText icon="provisional">Provisional</IconText>
          </p>
        </header>

        <section>
          <SectionHeading id="hm-pipeline" icon={iconFor('stages')} title="The pipeline">
            <IconText icon="stages">Data, exposure and the shock feed the tax-benefit model; results are averaged over draws.</IconText>
          </SectionHeading>
          <Pipeline />
        </section>

        <section>
          <SectionHeading id="hm-data" icon={iconFor('data')} title="Data and model">
            <IconText icon="timing">One year, {MODEL_YEAR}.</IconText>
          </SectionHeading>
          <UsedBy id="hm-data" />
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
                  { icon: 'source', text: 'The Family Resources Survey 2024–25.' },
                  { icon: 'pay', text: 'Top incomes from the HMRC Survey of Personal Incomes.' },
                  { icon: 'check', text: 'Imputed variables; weights calibrated to administrative and survey totals.' },
                ]}
              />
            </InfoCard>
            <InfoCard icon={iconFor('model')} title={`PolicyEngine-UK ${M.policyengine_uk}`}>
              <Items
                items={[
                  { icon: 'version', text: `Release bundle: policyengine.py ${M.policyengine}.` },
                  { icon: 'tax', text: `Income tax, National Insurance and benefits for ${MODEL_YEAR}.` },
                  { icon: 'poverty', text: 'Incomes follow HBAI, before and after housing costs.' },
                  { icon: 'cost', text: 'The cost is the fall in the government balance.' },
                  { icon: 'finances', text: 'It counts income tax, employee and employer NI, and benefits.' },
                  { icon: 'excluded', text: 'No corporation tax; household spending held at baseline.' },
                ]}
              />
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="hm-exposure" icon={iconFor('ai')} title="AI exposure">
            <IconText icon="measure">The complementarity-adjusted AI occupational exposure index (C-AIOE).</IconText>
          </SectionHeading>
          <Items
            className="hm-items"
            items={[
              { icon: 'source', text: 'Starts from the AI Occupational Exposure index of Felten, Raj and Seamans.' },
              { icon: 'ai', text: 'It links progress in ten AI applications to occupational abilities.' },
              { icon: 'jobKeep', text: 'Scaled down where AI more likely complements than replaces (Pizzinelli et al.).' },
              { icon: 'measure', text: 'Mapped to UK SOC2020, averaged over nine major occupation groups.' },
              { icon: 'caveat', text: 'So exposure varies between groups, not within them.' },
              { icon: 'excluded', text: 'Shifted so elementary occupations, the least exposed, score zero: no displacement.' },
            ]}
          />
        </section>

        <section>
          <SectionHeading id="hm-shock" icon={iconFor('shock')} title="The shock">
            <IconText icon="caveat">An assumed shock, applied in one year; not estimated from data.</IconText>
          </SectionHeading>
          <div className="card-grid is-top">
            <InfoCard icon={iconFor('jobLoss')} title="Job loss">
              <Items
                items={[
                  { icon: 'jobLoss', text: <>Central case: <In>{fmtInputPct(CENTRAL_PCT)}</In> of employees displaced.</> },
                  { icon: 'source', text: 'A calibration taken from an Irish study of the same kind.' },
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
                  { icon: 'why', text: 'In proportion to their group’s complementarity.' },
                  { icon: 'jobKeep', text: 'No one who keeps their job loses pay.' },
                ]}
              />
            </InfoCard>
            <InfoCard icon={iconFor('capital')} title="Capital income">
              <Items
                items={[
                  { icon: 'capital', text: <>Interest and dividend income rise by <In>{fmtPct1(M.capital_uplift_pct)}</In>.</> },
                  { icon: 'interest', text: <>A <In>{M.return_shock_pp}</In>-point rise in the return.</> },
                  { icon: 'capital', text: 'Rents and pension returns are unchanged.' },
                  { icon: 'excluded', text: 'The self-employed are outside both labour-market shocks.' },
                ]}
              />
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="hm-rules" icon={iconFor('jobLoss')} title="Who loses the job">
            <IconText icon="draws">Five rules share out the same expected number of job losses.</IconText>
          </SectionHeading>
          <UsedBy id="hm-rules" />
          <Items
            className="hm-items"
            items={[
              { icon: 'ai', text: <><b>In proportion to exposure</b> (the central case): the rule above.</> },
              { icon: 'age', text: <><b>Junior-tilted:</b> higher chance at ages 16 to 24, same occupation quotas.</> },
              { icon: 'pay', text: <><b>Expertise compression:</b> doubled chances for the top earnings third, above-median-exposure occupations.</> },
              { icon: 'draws', text: <><b>Uniform:</b> every employee equally likely.</> },
              { icon: 'limit', text: <><b>Top-loaded stress test:</b> exposure times junior and wage-tier factors.</> },
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
        </section>

        <section>
          <SectionHeading id="hm-takeup" icon={iconFor('takeUp')} title="Benefits and take-up">
            <IconText icon="takeUp">What a displaced worker can claim, and whether they do.</IconText>
          </SectionHeading>
          <UsedBy id="hm-takeup" />
          <KeyFacts
            className="mx-facts-row"
            facts={[
              { icon: 'benefits', value: <In>£{M.uc_single_month_gbp}</In>, label: 'UC a month, single, 25 or over' },
              { icon: 'households', value: <In>£{M.uc_couple_month_gbp}</In>, label: 'UC a month, couple' },
              { icon: 'pay', value: <><In>{M.uc_taper_pct}</In>p</>, label: 'in the pound of partner’s earnings, above the work allowance' },
              { icon: 'capital', value: <In>£{M.uc_capital_limit_gbp}</In>, label: 'capital above this removes entitlement' },
            ]}
          />
          <Items
            className="hm-items"
            items={[
              { icon: 'benefits', text: <>Universal Credit is means-tested on the benefit unit, {MODEL_YEAR}.</> },
              { icon: 'takeUp', text: 'Each benefit unit keeps its take-up decision drawn in the data.' },
              { icon: 'excluded', text: 'New-style JSA is paid only where the survey reports an award.' },
              { icon: 'jobLoss', text: 'So the newly displaced do not get it.' },
            ]}
          />
          <Items
            className="hm-items mx-foot-items"
            items={[
              { icon: 'compare', text: 'Two variants relax this, on the same draws:' },
              { icon: 'takeUp', text: 'Every benefit unit with a displaced worker claims UC.' },
              { icon: 'benefits', text: <>Contribution condition met: also <In>£{M.jsa_week_gbp}</In> a week of new-style JSA, 26 weeks.</> },
            ]}
          />
        </section>

        <section>
          <SectionHeading id="hm-draws" icon={iconFor('draws')} title="Draws and spread">
            <IconText icon="draws">Who is displaced is random, so each result is a mean over draws.</IconText>
          </SectionHeading>
          <KeyFacts
            className="mx-facts-row"
            facts={[
              { icon: 'draws', value: '50', label: 'draws: central case, five rules, policy responses' },
              { icon: 'draws', value: '20', label: 'draws: channel split, take-up and JSA, wage cuts', sub: 'also OBR-sized, break-evens' },
              { icon: 'caveat', value: '1', label: 'draw (seed 0): a few labelled sensitivities' },
            ]}
          />
          <Items
            className="hm-items"
            items={[
              { icon: 'data', text: <>Uneven weights: {M.employee_rows} employee records, effective sample about {M.kish_n}.</> },
              { icon: 'range', text: <>Realised displaced: {M.displaced_min_m} to {M.displaced_max_m} million across the 50 central draws.</> },
              { icon: 'caveat', text: 'A standard deviation shows how much a single draw can vary.' },
              { icon: 'limit', text: 'It is not a confidence interval.' },
              { icon: 'limit', text: 'Neither it nor a mean’s standard error reflects sampling or assumption uncertainty.' },
            ]}
          />
        </section>

        <section>
          <SectionHeading id="hm-out" icon={iconFor('excluded')} title="What it leaves out">
            <IconText icon="excluded">The study traces current rules, not behaviour or the wider economy.</IconText>
          </SectionHeading>
          <ul className="mx-limit-grid hm-out-grid">
            {[
              ['excluded', 'No re-employment, partners’ hours, redundancy pay or drawing on savings.'],
              ['timing', 'A one-year stock of job loss.'],
              ['model', 'Not linked to OG-UK: no OG-UK prices, wages or interest rates.'],
              ['tax', 'No corporation tax, VAT or other indirect taxes.'],
              ['finances', 'The public-sector pay bill of the displaced is outside the balance.'],
              ['benefits', 'Council tax reduction does not respond to the lost earnings.'],
              ['limit', 'The benefit cap applies without its nine-month grace period.'],
              ['age', 'No reduced hiring of young workers, the margin early evidence emphasises.'],
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
                OG-UK&rsquo;s limitations
              </NavLink>
              ; OG-UK has no unemployment.
            </IconText>
          </p>
        </section>

        <section>
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
            <li>
              <a href={PAPER_URL} target="_blank" rel="noreferrer">
                <Icon name="arrowRight" size={16} strokeWidth={2} /> The draft paper (PDF)
              </a>
            </li>
            <li>
              <NavLink tab="explore" sub="households" className="p3-close-link">
                <Icon name="arrowRight" size={16} strokeWidth={2} /> Explore: households
              </NavLink>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
