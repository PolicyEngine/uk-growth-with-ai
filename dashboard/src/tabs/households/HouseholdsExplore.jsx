'use client';

import Disclosure from '@/components/ab/Disclosure.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import Card, { SectionHeading, StatTile } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { D, MODEL_YEAR, OBR_SCENARIO, OutsideRebuild, PAPER_URL, PR_URL, ladder, perPound, rule } from '@/tabs/story/part3/shared.jsx';
import { fmtBn, fmtGbp, fmtInputPct, fmtPence, fmtPp, fmtShare } from '@/tabs/story/part3/format.js';
import { BarRows, STEP, StoryRef, Ticks } from './charts.jsx';

// Explore > Households: the uk-ai-study detail (PolicyEngine/uk-ai-study
// PR #18, provisional), moved out of story part 3. One-line question, the
// answer, charts, then detail and sources. Every figure is printed once
// across part 3 and this page: a value the story prints is drawn here as a
// bar and its cell links to the story step. Every chart has a CSV download
// (components/ui/DownloadMenu through Card). Values from
// data/aiStudy2425.json (docs/story/part3-notes.md).

const CTX = `uk-ai-study PR #${D.source.pr} (provisional), ${D.source.dataset}, ${MODEL_YEAR}, commit ${D.source.commit.slice(0, 7)}`;
const bnSmall = (v) => (Math.abs(v) < 0.05 ? 'under £0.1bn' : fmtBn(v));
const OBR_RATE = D.sankey.displacement_rate_pct;
const UNIT3 = 'Cost: £bn a year. Poverty: change in absolute poverty before housing costs, pp. Gini: change in points';

// --- 1. The cost by tax and benefit (50 draws) -------------------------------
function CostByTax() {
  const C = D.cost_components;
  const lo = Math.min(...C.rows.map((r) => r.cost_bn)) * 1.08;
  const hi = Math.max(...C.rows.map((r) => r.cost_bn)) * 1.08;
  return (
    <Card
      id="hh-cost-lines"
      icon="landmark"
      title="The central cost by tax and benefit"
      finding="Lost income tax and National Insurance on earnings outweigh the higher tax on dividends and savings."
      unit={`Change in each line, £bn a year; positive is a cost to the public finances. Mean of ${C.draws} draws`}
      download={{
        context: CTX,
        table: { columns: ['line', 'cost_bn_mean', 'cost_bn_sd'], rows: C.rows.map((r) => [r.label, r.cost_bn, r.sd_bn]) },
      }}
      about={{
        how: 'Each line is the change in that item of the government balance, baseline to shocked, averaged over the draws. The lines sum to the central cost in story part 3, step 1.',
        sources: `${C.file}: ${C.key}.`,
      }}
    >
      <BarRows
        cols={['£bn']}
        lo={lo}
        hi={hi}
        rows={C.rows.map((r) => ({
          id: r.id,
          label: r.label,
          bar: { kind: 'div', value: r.cost_bn, fill: r.cost_bn >= 0 ? 'p3-fill-loss' : 'p3-fill-gain' },
          cells: [bnSmall(r.cost_bn)],
        }))}
      />
    </Card>
  );
}

// --- 2. Every variant: take-up, JSA, wage cuts, OBR-sized -------------------
const LADDER = [
  { id: 'central_20', label: 'Central case, seeds 0 to 19', story: STEP.margin },
  { id: 'takeup', label: 'Every benefit unit with a displaced worker claims UC', story: STEP.moves },
  { id: 'takeup_jsa', label: 'Plus 26 weeks of new-style JSA for those who qualify', story: STEP.moves },
  { id: 'wage_cuts', label: 'Wage cuts of the same gross size instead of job loss', story: STEP.margin },
  { group: true, id: 'g-obr' },
  { id: 'obr', label: 'OBR-sized displacement' },
  { id: 'obr_takeup', label: 'OBR-sized, every displaced worker’s benefit unit claims UC' },
  { id: 'obr_takeup_jsa', label: 'OBR-sized, plus new-style JSA' },
];

function Ladder() {
  const hi = Math.max(...D.ladder.filter((r) => r.id !== 'central_50').map((r) => r.cost_bn)) * 1.05;
  return (
    <Card
      id="hh-ladder"
      icon="layers"
      title="Every variant of the shock"
      finding="Full take-up and new-style JSA raise the cost and shrink the poverty rise; wage cuts cost most and raise poverty least."
      unit={`${UNIT3}. Mean of 20 draws per row`}
      download={{
        context: CTX,
        table: {
          columns: ['variant', 'draws', 'cost_bn', 'poverty_bhc_pp', 'gini_pp'],
          rows: D.ladder.map((r) => [r.label, r.draws, r.cost_bn, r.poverty_pp, r.gini_pp]),
        },
      }}
      about={{
        how: 'The take-up, JSA and wage-cut rows reuse the central draws with seeds 0 to 19, so the same people are displaced in each: compare them with the first row, not with the 50-draw headline.',
        caveats: 'The OBR-sized rows are a different, smaller shock, not steps on the central ladder. The take-up, JSA, wage-cut and OBR-sized runs sit outside the study’s attested rebuild.',
        sources: 'results/robustness/dividend_coverage_draws.csv (run central), results/takeup/takeup_draws.csv, results/wage_cut/wage_cut_draws.csv (variant table3), results/next_runs/obr_benchmark.json.',
      }}
      foot={
        <p className="hh-foot">
          <OutsideRebuild />
        </p>
      }
    >
      <BarRows
        cols={['Cost', 'Poverty', 'Gini']}
        hi={hi}
        rows={LADDER.map((x) => {
          if (x.group)
            return {
              id: x.id,
              group: (
                <>
                  OBR-sized: a different, smaller shock, sized to {OBR_SCENARIO}. <span data-input="">{fmtInputPct(OBR_RATE)}</span> of
                  employees displaced, no rise in other wages or capital income
                </>
              ),
            };
          const r = ladder(x.id);
          return {
            id: x.id,
            label: x.label,
            bar: { value: r.cost_bn, fill: 'p3-fill-cost' },
            cells: [
              x.story ? <StoryRef step={x.story} /> : fmtBn(r.cost_bn),
              x.story ? <StoryRef step={x.story} /> : fmtPp(r.poverty_pp),
              fmtPp(r.gini_pp),
            ],
          };
        })}
      />
    </Card>
  );
}

// --- 3. Five displacement rules (50 paired draws) ----------------------------
const RULES = [
  { id: 'uniform', label: 'Uniform', storyCost: STEP.rules },
  { id: 'junior', label: 'Tilted towards workers aged 16 to 24', storyCost: STEP.rules },
  { id: 'exposure', label: 'In proportion to AI exposure (central)', storyCost: STEP.central, central: true },
  { id: 'compression', label: 'Expertise compression', storyCost: STEP.rules },
  { id: 'klein_top_loaded', label: 'Top-loaded stress test' },
];

function Rules() {
  const hi = Math.max(...D.rules.map((r) => r.cost_bn)) * 1.05;
  return (
    <Card
      id="hh-rules"
      icon="users"
      title="Five rules for who loses the job"
      finding="Poverty rises under every rule, and by more than in the central case under the other four."
      unit={`${UNIT3}. Mean of ${rule('uniform').draws} paired draws`}
      download={{
        context: CTX,
        table: {
          columns: ['rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'gini_pp'],
          rows: D.rules.map((r) => [r.label, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.gini_pp]),
        },
      }}
      about={{
        how: 'Every rule displaces the same expected number of employees; every other wage change and every capital-income change are the same, so the rows isolate who is displaced. The rules share assignment seeds.',
        definitions:
          'Junior-tilted: a higher chance for workers aged 16 to 24 within occupation quotas. Expertise compression: doubled chances for the top earnings third in above-median-exposure occupations. Top-loaded stress test: exposure times a junior factor and wage-tier factors that load displacement on above-median earners.',
        sources: `${D.rules[0].file}: <rule>.exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp.`,
      }}
    >
      <BarRows
        cols={['Cost', 'Poverty', 'Gini']}
        hi={hi}
        rows={RULES.map((x) => {
          const r = rule(x.id);
          return {
            id: x.id,
            label: x.label,
            bar: { value: r.cost_bn, fill: x.central ? 'p3-fill-ref' : 'p3-fill-cost' },
            cells: [
              x.storyCost ? <StoryRef step={x.storyCost} /> : fmtBn(r.cost_bn),
              x.central ? <StoryRef step={STEP.central} /> : fmtPp(r.poverty_pp),
              x.central ? <StoryRef step={STEP.central} /> : fmtPp(r.gini_pp),
            ],
          };
        })}
      />
    </Card>
  );
}

// --- 4. Cost per pound of earnings lost --------------------------------------
const PP_LABEL = {
  job_loss: 'Job loss',
  job_loss_takeup: 'Job loss, every displaced worker’s benefit unit claims UC',
  job_loss_takeup_jsa: 'Job loss, plus new-style JSA',
};

function PerPound() {
  const j20 = D.per_pound_20.job_loss;
  const w = perPound('wage_cuts');
  const er = D.per_pound_20.wage_cuts_employer_ni_p;
  const seed0 = ['job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'].map(perPound);
  return (
    <Card
      id="hh-per-pound"
      icon="banknote"
      title="Cost per pound of earnings lost"
      finding="On one draw, full take-up and JSA raise the cost of a pound lost through job loss; it stays below the 20-draw wage-cut figure."
      unit={
        <>
          Pence of cost per <span data-axis="">£1</span> of gross earnings removed, each margin alone (no wage or capital channel)
        </>
      }
      download={{
        context: CTX,
        table: {
          columns: ['case', 'draws', 'government_balance_p', 'household_basis_p', 'employer_ni_p', 'range_low_p', 'range_high_p'],
          rows: [
            ['Job loss', D.per_pound_20.draws, j20.government_p, '', '', j20.min_p, j20.max_p],
            ['Wage cuts', w.draws, w.government_p, w.household_p, er, '', ''],
            ...seed0.map((r) => [`${r.label} (seed 0)`, r.draws, r.government_p, r.household_p, '', '', '']),
          ],
        },
      }}
      about={{
        definitions:
          'Government: the fall in the government balance, employer NI included. Household: the part of the lost pound that income tax, employee NI and benefits absorb.',
        caveats: 'At central scale the household split of job loss exists for one draw (seed 0) only, so it is shown apart from the 20-draw rows.',
        sources: `${j20.file} (run channel_displacement) over ${D.per_pound_20.file} (variant cut_only); seed 0: ${perPound('job_loss').file} and results/takeup/takeup_draws.csv (scenario disp_only).`,
      }}
      foot={
        <p className="hh-foot">
          <OutsideRebuild />
        </p>
      }
    >
      <p className="p3-legend" aria-hidden="true">
        <span className="p3-swatch p3-fill-hh" /> Income tax, employee NI and benefits <span className="p3-swatch p3-fill-gov" /> Employer NI
      </p>
      <BarRows
        cols={['Government', 'Household']}
        hi={100}
        rows={[
          { id: 'g20', group: `Matching bases: ${D.per_pound_20.draws} paired draws` },
          {
            id: 'pp-job',
            label: 'Job loss',
            bar: { value: j20.government_p, fill: 'p3-fill-neutral' },
            cells: [<StoryRef key="a" step={STEP.margin} />, <span key="b" className="p3-muted">not on 20 draws</span>],
          },
          {
            id: 'pp-cut',
            label: 'Wage cuts',
            bar: {
              kind: 'stack',
              parts: [
                [w.household_p, 'p3-fill-hh'],
                [er, 'p3-fill-gov'],
              ],
            },
            cells: [<StoryRef key="a" step={STEP.margin} />, <StoryRef key="b" step={STEP.margin} />],
          },
          { id: 'g0', group: 'Job loss on one draw (seed 0), with the household split' },
          ...seed0.map((r) => ({
            id: `pp-${r.id}`,
            label: PP_LABEL[r.id],
            bar: {
              kind: 'stack',
              parts: [
                [r.household_p, 'p3-fill-hh'],
                [r.government_p - r.household_p, 'p3-fill-gov'],
              ],
            },
            cells: [fmtPence(r.government_p), fmtPence(r.household_p)],
          })),
        ]}
      />
    </Card>
  );
}

// --- 5. Who the displaced are (OBR-sized run) ----------------------------------
function Displaced() {
  const X = D.displaced;
  const limit = Number(/£([\d,]+)/.exec(X.capital_over_limit.label)?.[1]?.replace(/,/g, '') ?? NaN);
  const tiles = [
    ['claim_uc', 'Claim Universal Credit', 'of benefit units with a displaced worker (the data’s take-up flags)'],
    ['claim_uc_entitled', 'Claim, if entitled', 'of those entitled to UC once displaced'],
    ['existing_unemployed_claim', 'Already unemployed', 'of entitled units with an unemployed member claim UC in the baseline'],
    [
      'capital_over_limit',
      'Capital above the UC limit',
      <>
        hold more than <span data-input="">{fmtGbp(limit)}</span>, so have no UC entitlement
      </>,
    ],
    ['other_earner', 'Another earner', 'have another earner in the benefit unit'],
    ['homeowner', 'Own their home', 'so get no UC housing element'],
  ];
  const uc = [
    ['uc_per_displaced', 'UC per displaced worker', 'added in a year, with the data’s take-up flags'],
    ['uc_per_displaced_takeup', 'With full take-up', 'every benefit unit with a displaced worker claims'],
    ['uc_per_existing_unemployed', 'Per person already unemployed', 'in the baseline, for comparison'],
  ];
  return (
    <Card
      id="hh-displaced"
      icon="usersRound"
      title="Who the displaced are"
      finding="Many displaced workers’ benefit units have capital, a working partner or an owned home, so Universal Credit replaces little of their earnings."
      unit={`Benefit units containing a displaced worker, in the run sized to ${OBR_SCENARIO}`}
      download={{
        context: CTX,
        table: { columns: ['measure', 'value', 'unit'], rows: [...tiles, ...uc].map(([k]) => [X[k].label, X[k].value, X[k].unit]) },
      }}
      about={{
        caveats: 'The shares count benefit units, not persons. The groups overlap, and the data give no cross-tabulation.',
        sources: `${X.claim_uc.file} (diagnostics.obr, existing_unemployed); UC per worker: ${X.uc_per_displaced.file} and results/takeup/takeup_draws.csv.`,
      }}
      foot={
        <p className="hh-foot">
          <OutsideRebuild />
        </p>
      }
    >
      <div className="hh-tiles">
        {tiles.map(([k, name, sub]) => (
          <StatTile key={k} name={name} value={fmtShare(X[k].value)} sub={sub} />
        ))}
      </div>
      <div className="hh-tiles hh-tiles-3">
        {uc.map(([k, name, sub]) => (
          <StatTile key={k} name={name} value={fmtGbp(X[k].value)} sub={sub} />
        ))}
      </div>
    </Card>
  );
}

// --- 6. Deciles under three rankings ------------------------------------------
const RANK_FILL = ['p3-fill-cost', 'p3-fill-hh', 'p3-fill-ref'];

function DivRect({ v, lo, hi, fill }) {
  const zx = (-lo / (hi - lo)) * 100;
  const w = (Math.abs(v) / (hi - lo)) * 100;
  return (
    <>
      <rect className={fill} x={v >= 0 ? zx : zx - w} y={1} width={w} height={8} />
      <line x1={zx} x2={zx} y1={0} y2={10} className="p3-zero" vectorEffect="non-scaling-stroke" />
    </>
  );
}

function Rankings() {
  const R = D.rankings;
  const all = R.flatMap((r) => r.values);
  const lo = Math.floor(Math.min(0, ...all));
  const hi = Math.ceil(Math.max(0, ...all));
  return (
    <Card
      id="hh-rankings"
      icon="bars"
      title="Income change by decile under three rankings"
      finding="Deciles 2 to 10 look alike under all three rankings; decile 1 changes sign, so the study does not report it."
      unit={`Change in household disposable income before housing costs, %, central case; mean of ${D.deciles.draws} draws`}
      download={{
        context: CTX,
        table: { columns: ['decile', ...R.map((r) => r.id)], rows: Array.from({ length: 10 }, (_, i) => [i + 1, ...R.map((r) => r.values[i])]) },
      }}
      about={{
        how: 'Each household is weighted by its number of members. The rankings differ only in how households are placed in deciles.',
        caveats:
          'Decile 1: some high-weight households with large personal pension contributions sit there under the HBAI ranking and receive capital income. Its sign depends on the ranking, and the study does not report it as a finding.',
        sources: 'results/appendix/decile_ranking_sensitivity.csv: disposable_change_pct.',
      }}
    >
      <p className="p3-legend hh-legend" aria-hidden="true">
        {R.map((r, i) => (
          <span key={r.id} className="hh-leg">
            <span className={`p3-swatch ${RANK_FILL[i]}`} /> {r.label}
          </span>
        ))}
      </p>
      <div className="hh-rank">
        <div className="hh-rank-axis">
          <span />
          <Ticks lo={lo} hi={hi} step={1} />
        </div>
        <ol>
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className={`hh-rank-row${i === 0 ? ' is-caveat' : ''}`} data-decile={i + 1}>
              <span className="hh-label">{i === 0 ? '1 (bottom)' : i === 9 ? '10 (top)' : i + 1}</span>
              <span className="hh-rank-bars">
                {R.map((r, k) => (
                  <svg key={r.id} className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                    <DivRect v={r.values[i]} lo={lo} hi={hi} fill={i === 0 ? 'p3-fill-muted' : RANK_FILL[k]} />
                  </svg>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="p3-caveat" data-caveat="bottom-decile">
        Decile 1 is drawn in grey: its sign depends on the ranking, and the study does not report it as a finding. Its three values, and the
        HBAI values for the other deciles, are printed in story part 3, <StoryRef step={STEP.deciles} />.
      </p>
    </Card>
  );
}

// --- 7. Policy responses (50 draws, policy_draws.csv) ------------------------
function policyRow(r) {
  return {
    id: r.id,
    label: <span data-input="">{r.label}</span>,
    bar: { value: r.cost_bn, fill: 'p3-fill-cost' },
    cells: [fmtBn(r.cost_bn), fmtPp(r.poverty_pp), fmtPp(r.gini_pp)],
  };
}

function Policy() {
  const P = D.policy;
  const hi = Math.max(...P.rows.map((r) => r.cost_bn)) * 1.05;
  return (
    <Card
      id="hh-policy"
      icon="handshake"
      title="Three policy responses on top of the central shock"
      finding="In these simulations, each response lowers poverty and the Gini; they differ in cost and in whom they reach."
      unit={`${UNIT3}, against the shocked world. Mean of ${P.rows[0].draws} draws`}
      download={{
        context: CTX,
        table: {
          columns: ['reform', 'displacement_rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'poverty_sd_pp', 'gini_pp'],
          rows: P.rows.map((r) => [r.reform, r.family, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.poverty_sd_pp, r.gini_pp]),
        },
      }}
      about={{
        how: P.note,
        caveats: 'The designs differ in aim, take-up and administration. The rows compare cost, poverty and the Gini only, and do not rank the designs.',
        sources: `${P.file}: ${P.key}.`,
      }}
    >
      <BarRows
        cols={['Cost', 'Poverty', 'Gini']}
        hi={hi}
        rows={[...P.rows.slice(0, 3).map(policyRow), { id: 'g-r1', group: 'Wage insurance under two other displacement rules' }, ...P.rows.slice(3).map(policyRow)]}
      />
    </Card>
  );
}

// --- page ------------------------------------------------------------------------
const FILES = [
  ['The central case', 'results/robustness/central_monte_carlo.json'],
  ['Cost by tax and benefit', D.cost_components.file],
  ['Channels', D.channels.file],
  ['Take-up and JSA', 'results/takeup/takeup_draws.csv, takeup_runs.json'],
  ['Wage cuts', 'results/wage_cut/wage_cut_draws.csv'],
  ['OBR-sized runs and the Sankey', 'results/next_runs/obr_benchmark.json, obr_benchmark_draws.csv, obr_household_deciles.csv'],
  ['Displacement rules', D.rules[0].file],
  ['Deciles', 'results/appendix/decomposition_ci.csv, decile_ranking_sensitivity.csv'],
  ['Break-evens', 'results/robustness/survivor_wage_grid.csv, next_runs/capital_variants_draws.csv, robustness/duration_takeup_sensitivity.json'],
  ['Policy responses', D.policy.file],
];

function Sources() {
  return (
    <Disclosure title="Detail and sources" preview="Result files, commit, how the page is built">
      <div className="hh-sources">
        <p>
          Every figure on this page and in story part 3 is read from copies of the study’s committed result files, at commit{' '}
          <code>{D.source.commit.slice(0, 7)}</code> of branch <code>{D.source.branch}</code> (read {D.source.fetched}), by{' '}
          <code>dashboard/scripts/build_ai_study_data.py</code>, which checks each against the value the paper prints.
        </p>
        <ul>
          {FILES.map(([what, f]) => (
            <li key={what}>
              <b>{what}:</b> <code>{f}</code>
            </li>
          ))}
        </ul>
        <p>
          <a href={PAPER_URL} target="_blank" rel="noreferrer">
            The draft paper (PDF)
          </a>{' '}
          ·{' '}
          <a href={PR_URL} target="_blank" rel="noreferrer">
            uk-ai-study PR #{D.source.pr}
          </a>{' '}
          ·{' '}
          <NavLink tab="method" sub="households">
            Household method
          </NavLink>
        </p>
      </div>
    </Disclosure>
  );
}

export default function HouseholdsExplore() {
  return (
    <div className="hh-page">
      <header className="hh-lead">
        <p className="hh-question">What moves the cost of AI job displacement, and who it falls on?</p>
        <p className="hh-answer">
          In this provisional microsimulation, who loses the job, whether earnings fall through job loss or wage cuts, and benefit take-up each
          move the cost by billions of pounds a year. Job loss raises poverty more than wage cuts of the same size. The headline findings are in{' '}
          <NavLink tab="story" anchor="story-part-3">
            story part 3
          </NavLink>
          ; a cell marked “step” links to the figure there.
        </p>
        <Notice>Provisional</Notice>
      </header>
      <SectionHeading id="hh-cost" icon="landmark" title="What moves the cost">
        How the central cost is made up, and how it changes with take-up, JSA, wage cuts and who loses the job.
      </SectionHeading>
      <div className="card-grid cols-2">
        <CostByTax />
        <Ladder />
        <Rules />
        <PerPound />
      </div>
      <SectionHeading id="hh-who" icon="usersRound" title="Who it falls on">
        Who the displaced are, and how the income change by decile depends on how households are ranked.
      </SectionHeading>
      <Displaced />
      <Rankings />
      <SectionHeading id="hh-responses" icon="handshake" title="Policy responses">
        Three stylised additions to the benefit system, simulated on top of the central shock.
      </SectionHeading>
      <Policy />
      <Sources />
    </div>
  );
}
