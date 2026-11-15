'use client';

import Icon from '@/components/ab/Icon.jsx';
import InfoCard from '@/components/ab/InfoCard.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { SectionHeading } from '@/components/ui/Card.jsx';
import OnThisPage from '@/components/ui/OnThisPage.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { D, MODEL_YEAR, PAPER_URL, PR_URL } from '@/tabs/story/part3/shared.jsx';
import { fmtInputPct, fmtPct1 } from '@/tabs/story/part3/format.js';

// Method and sources > Household method: how uk-ai-study (PolicyEngine/
// uk-ai-study PR #18, provisional) produces the results in story part 3 and
// Explore > Households, in short sections, following the paper's "Data and
// methods" (paper/sections/methodology.tex). Model parameters and data
// counts are the paper's printed values (paper/values_generated.tex) and the
// build manifest, carried in aiStudy2425.json `method`. Results are not
// repeated here.

const M = D.method;
const S = D.source;

const SECTIONS = [
  { id: 'hm-pipeline', title: 'The pipeline', icon: 'listTree' },
  { id: 'hm-data', title: 'Data and model', icon: 'database' },
  { id: 'hm-exposure', title: 'AI exposure', icon: 'cpu' },
  { id: 'hm-shock', title: 'The shock', icon: 'zap' },
  { id: 'hm-rules', title: 'Who loses the job', icon: 'users' },
  { id: 'hm-takeup', title: 'Benefits and take-up', icon: 'wallet' },
  { id: 'hm-draws', title: 'Draws and spread', icon: 'shuffle' },
  { id: 'hm-out', title: 'What it leaves out', icon: 'alert' },
  { id: 'hm-vintage', title: 'Vintages', icon: 'history' },
];

const STAGES = [
  ['database', 'Microcosm UK 2024–25', 'Households, people and their incomes, calibrated to official totals'],
  ['cpu', 'AI exposure', 'A score for each of nine occupation groups (C-AIOE)'],
  ['zap', 'The shock', 'Who loses the job, others’ wage rises, higher capital income'],
  ['landmark', 'PolicyEngine-UK', `Taxes and benefits for ${MODEL_YEAR}, baseline and shocked, on the same records`],
  ['shuffle', 'Draws', 'The difference, averaged over random draws of who is displaced'],
];

function Pipeline() {
  return (
    <ol className="hm-flow" aria-label="The study’s pipeline in five stages">
      {STAGES.map(([icon, title, text], i) => (
        <li key={title} className="hm-stage">
          <span className="hm-stage-n">{i + 1}</span>
          <Icon name={icon} size={18} />
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
          <Icon name="usersRound" size={18} />
          <span>How does the household study produce its results?</span>
        </p>
          <p className="hh-answer">
            It takes a calibrated sample of UK households, removes the earnings of employees chosen at random in proportion to their
            occupation’s AI exposure, and runs the tax and benefit system before and after, for one year.
          </p>
          <Notice>Provisional</Notice>
        </header>

        <section>
          <SectionHeading id="hm-pipeline" icon="listTree" title="The pipeline">
            Data, exposure and the shock feed the tax-benefit model; results are averaged over draws.
          </SectionHeading>
          <Pipeline />
        </section>

        <section>
          <SectionHeading id="hm-data" icon="database" title="Data and model">
            One year, {MODEL_YEAR}.
          </SectionHeading>
          <div className="card-grid cols-2">
            <InfoCard icon="database" title="Microcosm UK 2024–25">
              <p>
                The Family Resources Survey 2024–25, with records from the HMRC Survey of Personal Incomes for top incomes, imputed variables and
                household weights calibrated to administrative and survey totals. The file holds {M.households} households and {M.persons} people,
                grossing to {M.population_m} million people and {M.employees_m} million employees.
              </p>
            </InfoCard>
            <InfoCard icon="landmark" title={`PolicyEngine-UK ${M.policyengine_uk}`}>
              <p>
                The tax-benefit model (policyengine.py {M.policyengine} release bundle) computes income tax, National Insurance and benefits for{' '}
                {MODEL_YEAR}. Incomes follow the HBAI statistics, before and after housing costs. The cost is the fall in the government balance:
                income tax, employee and employer NI and benefits, with no corporation tax and household spending held at baseline.
              </p>
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="hm-exposure" icon="cpu" title="AI exposure">
            The complementarity-adjusted AI occupational exposure index (C-AIOE).
          </SectionHeading>
          <p className="hm-text">
            The study starts from the AI Occupational Exposure index of Felten, Raj and Seamans, which links progress in ten AI applications to the
            abilities each occupation needs, and scales it down where AI is more likely to complement than replace human judgement (the
            complementarity index of Pizzinelli and co-authors). Scores are mapped to UK SOC2020 and averaged over the nine major occupation groups,
            so exposure varies between groups, not within them. The scores are shifted so the least-exposed group, elementary occupations, scores
            zero and has no displacement.
          </p>
        </section>

        <section>
          <SectionHeading id="hm-shock" icon="zap" title="The shock">
            An assumed shock, applied in one year; not estimated from data.
          </SectionHeading>
          <div className="card-grid is-top">
            <InfoCard icon="users" title="Job loss">
              <p>
                In the central case <span data-input="">{fmtInputPct(Number(/([\d.]+)% prescribed/.exec(D.headline.central_displaced.note)?.[1]))}</span>{' '}
                of employees are displaced, a calibration taken from an Irish study of the same kind. The number is shared between occupation groups in
                proportion to employment times exposure, and records are drawn at random within each group. A displaced worker’s earnings, hours,
                pension contributions and statutory pay are set to zero, and they count as unemployed for the whole year.
              </p>
            </InfoCard>
            <InfoCard icon="trend" title="Wages of those still employed">
              <p>
                Each surviving employee’s wage rises in proportion to their group’s complementarity, by{' '}
                <span data-input="">{fmtInputPct(M.survivor_wage_pct)}</span> on average. No one who keeps their job loses pay.
              </p>
            </InfoCard>
            <InfoCard icon="piggy" title="Capital income">
              <p>
                Interest and dividend income rise by <span data-input="">{fmtPct1(M.capital_uplift_pct)}</span>, a{' '}
                <span data-input="">{M.return_shock_pp}</span>-point rise in the return; rents and pension returns are unchanged. The self-employed are
                outside both labour-market shocks.
              </p>
            </InfoCard>
          </div>
        </section>

        <section>
          <SectionHeading id="hm-rules" icon="users" title="Who loses the job">
            Five rules share out the same expected number of job losses.
          </SectionHeading>
          <ul className="hm-list">
            <li>
              <b>In proportion to exposure</b> (the central case): the rule above.
            </li>
            <li>
              <b>Junior-tilted:</b> a higher chance for workers aged 16 to 24, within the same occupation quotas.
            </li>
            <li>
              <b>Expertise compression:</b> doubled chances for the top earnings third in above-median-exposure occupations.
            </li>
            <li>
              <b>Uniform:</b> every employee equally likely.
            </li>
            <li>
              <b>Top-loaded stress test:</b> exposure times a junior factor and wage-tier factors that load displacement on above-median earners; an
              upper stress case.
            </li>
          </ul>
          <p className="hm-text">
            Every other wage change and every capital-income change is the same under each rule. A separate set of runs moves the same gross earnings
            loss from job loss to wage cuts graded by exposure, so no one loses a job.
          </p>
        </section>

        <section>
          <SectionHeading id="hm-takeup" icon="wallet" title="Benefits and take-up">
            What a displaced worker can claim, and whether they do.
          </SectionHeading>
          <p className="hm-text">
            Universal Credit is means-tested on the benefit unit: in {MODEL_YEAR} the standard allowance is{' '}
            <span data-input="">£{M.uc_single_month_gbp}</span> a month for a single claimant aged 25 or over and{' '}
            <span data-input="">£{M.uc_couple_month_gbp}</span> for a couple, a partner’s earnings reduce it by{' '}
            <span data-input="">{M.uc_taper_pct}</span> pence in the pound above the work allowance, and capital above{' '}
            <span data-input="">£{M.uc_capital_limit_gbp}</span> removes entitlement. Each benefit unit keeps the take-up decision drawn for it in the
            data, and the model pays new-style JSA only where the survey reports an award, so the newly displaced do not get it.
          </p>
          <p className="hm-text">
            Two variants relax this on the same draws: every benefit unit with a displaced worker claims UC, and those who meet the contribution
            condition also get <span data-input="">£{M.jsa_week_gbp}</span> a week of new-style JSA for 26 weeks.
          </p>
        </section>

        <section>
          <SectionHeading id="hm-draws" icon="shuffle" title="Draws and spread">
            Who is displaced is random, so each result is a mean over draws.
          </SectionHeading>
          <p className="hm-text">
            The central case, the five rules and the policy responses use 50 draws; the channel split, take-up and JSA, wage cuts, the OBR-sized runs
            and the break-evens on capital and duration use 20; a few sensitivities use one draw (seed 0) and are labelled. Calibrated weights are
            uneven: the {M.employee_rows} employee records have an effective sample size of about {M.kish_n}, so the realised number displaced varies
            from {M.displaced_min_m} to {M.displaced_max_m} million across the 50 central draws.
          </p>
          <p className="hm-text">
            A standard deviation describes how much a single draw can vary. It is not a confidence interval, and neither it nor the standard error of
            a mean reflects survey sampling or uncertainty about the assumptions.
          </p>
        </section>

        <section>
          <SectionHeading id="hm-out" icon="alert" title="What it leaves out">
            The study traces current rules, not behaviour or the wider economy.
          </SectionHeading>
          <ul className="hm-list">
            <li>No re-employment, change in partners’ hours, redundancy pay or running down of savings: a one-year stock of job loss.</li>
            <li>No corporation tax, VAT or other indirect taxes; the public-sector pay bill of the displaced is outside the balance.</li>
            <li>Council tax reduction does not respond to the lost earnings, and the benefit cap applies without its nine-month grace period.</li>
            <li>No reduced hiring of young workers, the margin early evidence emphasises.</li>
            <li>No feedback to prices, interest rates or output: for that, see OG-UK in part 2, which has no unemployment.</li>
          </ul>
          <p className="hm-text">
            <NavLink tab="story" anchor="p3-close-h">
              What the study leaves out, in the story
            </NavLink>
          </p>
        </section>

        <section>
          <SectionHeading id="hm-vintage" icon="history" title="Vintages">
            Which version of the study the dashboard reads.
          </SectionHeading>
          <dl className="hm-vintage">
            <div>
              <dt>Study</dt>
              <dd>
                <a href={PR_URL} target="_blank" rel="noreferrer">
                  PolicyEngine/uk-ai-study PR #{S.pr}
                </a>
                , an open draft; branch <code>{S.branch}</code>
              </dd>
            </div>
            <div>
              <dt>Commit</dt>
              <dd>
                <code>{S.commit.slice(0, 7)}</code>, read {new Date(`${S.fetched}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </dd>
            </div>
            <div>
              <dt>Results build</dt>
              <dd>
                Built per the manifest at commit <code>{M.manifest_commit.slice(0, 7)}</code>, {M.manifest_finished.slice(0, 10)}
                {M.manifest_full_rerun === false ? ', which attests the existing results without a full clean-room rerun' : ''}; the dashboard
                reads the data at <code>{S.commit.slice(0, 7)}</code>. The wage-cut, take-up and
                OBR-sized results sit outside that attested rebuild.
              </dd>
            </div>
            <div>
              <dt>Data build</dt>
              <dd>
                <code>{M.data_build}</code>
              </dd>
            </div>
          </dl>
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
