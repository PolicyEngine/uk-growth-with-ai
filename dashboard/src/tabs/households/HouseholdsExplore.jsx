'use client';

import { Fragment } from 'react';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import Legend from '@/components/ui/Legend.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { ModelLine, PageNotes } from '@/components/ui/PageIntro.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { D, MODEL_YEAR, OBR_SCENARIO, OUTSIDE_REBUILD, PAPER_URL, entryClass, ladder, perPound, rule, useSeenBeat } from '@/tabs/story/part3/shared.jsx';
import { fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtInputPct, fmtPence, fmtPp, fmtPpSpread, fmtShare } from '@/tabs/story/part3/format.js';
import { Bar, Plane, STEP, ValueTable, signedTick } from './charts.jsx';
import { RULE_MARGIN_PP, RULE_NAMES, SMALL_DECILE_PCT, fmtGiniPts, ruleName, rulesGap } from './figures.js';
import { REFS } from '@/tabs/story/part3/sources.jsx';

// Explore > Households (item-24-fable.md): the household study's detail,
// apart from story part 3. Seven cards in three sections. Each card's
// title is its finding (a sentence, data-gated with a neutral fallback);
// its lead gives the figures; one unit line; the key above the chart;
// every value in its own table cell; one closed More info; one link to the
// Story scene that tells the same result. Each fact is printed once
// across part 3 and this page: a value whose home is the Story, restated
// here, carries data-axis (scripts/dumptabs.mjs and the tests skip it), as
// does a number in a sentence that the same card's chart prints. No
// control on the page: two states with room are both drawn (section 5).
// Figures from data/aiStudy2425.json (docs/story/part3-notes.md).

// The study's model year and status come from the data file.
const YEAR = D.model_year_label ?? MODEL_YEAR;
const STATUS = D.provisional === false ? (D.status ?? null) : 'provisional';
const PAPER = D.source.paper_url ?? PAPER_URL;
const CTX = `Household study PR #${D.source.pr}${STATUS ? ` (${STATUS})` : ''}, ${D.source.dataset}, ${YEAR}, commit ${D.source.commit.slice(0, 7)}`;
// a figure restated from its home (the Story, or this card's own chart)
const Ax = ({ children }) => <span data-axis="">{children}</span>;

// Orderings in words, computed, so a rerun that moves them changes the text.
const span = (is) => {
  const runs = [];
  for (const i of is) {
    const last = runs[runs.length - 1];
    if (last && i === last[1] + 1) last[1] = i;
    else runs.push([i, i]);
  }
  return runs.map(([a, b]) => (a === b ? `${a}` : `${a} to ${b}`)).join(', ');
};
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const deciles = (R, test) => [...Array(10).keys()].filter((i) => test(R.map((r) => r.values[i]))).map((i) => i + 1);
const name = (is) => (is.length === 1 ? `Decile ${is[0]}` : `Deciles ${span(is)}`);

// Card 6's title: the deciles that lose under all three rankings, and those
// whose sign differs (item 24: "Deciles 2 to 10 have the same sign" hid
// that decile 10's sign is positive).
export function rankingsWords(R) {
  const neg = deciles(R, (vs) => vs.every((v) => v < 0));
  const flip = deciles(R, (vs) => new Set(vs.map(sgn)).size > 1);
  if (!neg.length) return flip.length ? `${name(flip)} ${flip.length === 1 ? 'changes' : 'change'} sign across the rankings` : 'Every decile has the same sign under all three rankings';
  const lose = `${name(neg)} ${neg.length === 1 ? 'loses' : 'lose'} income under all three rankings`;
  return flip.length ? `${lose}; ${name(flip).toLowerCase()} ${flip.length === 1 ? 'changes' : 'change'} sign` : lose;
}
// Card 6's lead: the deciles positive under all three rankings. Under 0.2%
// in size in every ranking they "move by less than 0.2%", never "gain"
// (item 24; the HBAI interval spans zero; review round 1, R1-03).
export function rankingsLead(R) {
  const pos = deciles(R, (vs) => vs.every((v) => v > 0));
  if (!pos.length) return null;
  const small = pos.every((d) => R.every((r) => Math.abs(r.values[d - 1]) < SMALL_DECILE_PCT));
  const one = pos.length === 1;
  return small ? `${name(pos)} ${one ? 'moves' : 'move'} by less than ${SMALL_DECILE_PCT}% under each ranking.` : `${name(pos)} ${one ? 'gains' : 'gain'} under all three rankings.`;
}
// Card 1: lost income tax and NI against the higher tax on dividends and
// savings, from the cost components.
export function costWords(rows) {
  const v = (id) => rows.find((r) => r.id === id)?.cost_bn ?? 0;
  const lost = v('other_income_tax') + v('employer_ni') + v('employee_ni');
  const gained = -(v('dividend_tax') + v('savings_tax'));
  return lost > gained
    ? 'Lost income tax and National Insurance (NI) outweigh higher tax on dividends and savings'
    : 'Higher tax on dividends and savings outweighs lost income tax and National Insurance (NI)';
}
// Card 2: per pound of lost pay, wage cuts against job loss (20 draws).
export function perPoundWords() {
  return perPound('wage_cuts').government_p > D.per_pound_20.job_loss.government_p
    ? 'Per pound of lost pay, wage cuts cost the public finances more than job loss'
    : 'Per pound of lost pay, job loss costs the public finances at least as much as wage cuts';
}
// Card 3: full take-up and JSA against the main case on the same draws.
const L = (id) => D.ladder.find((r) => r.id === id);
export function takeupWords() {
  const c = L('central_20');
  const vs = [L('takeup'), L('takeup_jsa')].filter(Boolean);
  const steps = [c, ...vs];
  const more = steps.every((r, i) => !i || r.cost_bn > steps[i - 1].cost_bn);
  const less = steps.every((r, i) => !i || r.poverty_pp < steps[i - 1].poverty_pp);
  return more && less ? 'Full take-up and JSA cost more and raise poverty less than the main case' : 'Full take-up and JSA change both the cost and the poverty rise';
}
// Economics review, round 1 (words only, computed from the data): the
// top-loaded rule's poverty rise, which the stated routes do not explain,
// and the uniform rule's spread across draws.
export function rulesReviewWords(rules) {
  const k = rules.find((r) => r.id === 'klein_top_loaded');
  const u = rules.find((r) => r.id === 'uniform');
  const out = [];
  if (k && rules.every((r) => r.poverty_pp <= k.poverty_pp) && rules.every((r) => r.cost_bn <= k.cost_bn))
    out.push('Top-loaded displaces above-median earners, yet raises poverty and cost most.', 'The study’s published extract does not break that rise down.');
  if (u && u.cost_sd_bn >= 0.8 * u.cost_bn) out.push('Uniform: the cost’s spread across draws is about its mean.');
  return out;
}
// The data's take-up decisions: full take-up and JSA raise the cost and
// lower the poverty rise, so the main-case poverty rise is an upper bound
// on that count; its cost is not (economics review, round 1).
export function takeupBoundWords() {
  const c = L('central_20');
  const vs = [L('takeup'), L('takeup_jsa')].filter(Boolean);
  if (!c || !vs.length || !vs.every((r) => r.cost_bn > c.cost_bn && r.poverty_pp < c.poverty_pp)) return [];
  return ['With the data’s take-up decisions, the main-case poverty rise is an upper bound; its cost is not.'];
}
export function policyWords(main) {
  const all = main.every((r) => r.poverty_pp < 0 && r.gini_pp < 0);
  return all ? 'Each response lowers poverty and the Gini; their costs differ' : 'The responses differ in cost and in what they do to poverty and the Gini';
}
// Card 4's title: "displacement rule" (item 24), the conditions as before.
export function rulesWords(rules, central = 'exposure') {
  const c = rules.find((r) => r.id === central);
  const others = rules.filter((r) => r.id !== central);
  const every = rules.every((r) => r.poverty_pp > 0);
  const atLeast = others.filter((r) => r.poverty_pp >= c.poverty_pp).length;
  const lead = every ? 'Poverty rises under every displacement rule' : 'Poverty does not rise under every displacement rule';
  // T15: "least under the main rule" only when every other rule raises it
  // by at least RULE_MARGIN_PP more (Fable round 6, S4: no paired interval
  // is exported, and the headline's spread across draws is about 0.2pp)
  if (others.every((r) => r.poverty_pp - c.poverty_pp >= RULE_MARGIN_PP)) return `${lead}, least under the main rule`;
  // the main rule lowest, but others within the margin: a tie, named when
  // the names fit the 14-word title limit, else counted; the gap itself is
  // in the card's More info (rulesTieWords)
  if (atLeast === others.length) {
    const near = nearRules(rules, central);
    const names = ['main', ...near.map((r) => ruleName(r.id).toLowerCase())];
    const named = `${lead}; ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} tie lowest`;
    return named.split(/\s+/).length <= TITLE_WORDS ? named : `${lead}; the main and ${near.length} other rules tie lowest`;
  }
  return `${lead}; ${atLeast} of the other ${others.length} raise it at least as much as the main rule`;
}
const TITLE_WORDS = 14;
// the other rules at or above the main rule but within RULE_MARGIN_PP of it
const nearRules = (rules, central) => {
  const c = rules.find((r) => r.id === central);
  return rules.filter((r) => r.id !== central && r.poverty_pp - c.poverty_pp >= 0 && r.poverty_pp - c.poverty_pp < RULE_MARGIN_PP);
};
// Card 4's tie, a sentence for its lead: the rules the title ties with the
// main one and the largest gap (rulesGap); null when the title names no tie.
export function rulesTieWords(rules, central = 'exposure') {
  const c = rules.find((r) => r.id === central);
  const others = rules.filter((r) => r.id !== central);
  if (others.every((r) => r.poverty_pp - c.poverty_pp >= RULE_MARGIN_PP) || others.some((r) => r.poverty_pp < c.poverty_pp)) return null;
  const near = nearRules(rules, central).map((r) => ruleName(r.id));
  const list = near.length > 1 ? `${near.slice(0, -1).join(', ')} and ${near[near.length - 1]}` : near[0];
  return `${list} ${near.length > 1 ? 'are' : 'is'} within ${rulesGap(rules, central)} of the main rule on poverty.`;
}
// The runs outside the study's rebuild: a caveat line while the data file
// lists any (method.outside_rebuild).
const FLAG = OUTSIDE_REBUILD ? ['Outside the study’s attested rebuild.'] : [];
const OBR_RATE = D.sankey.displacement_rate_pct;
// One More info per card (Card's `about`): how and caveats as lines; the
// sources are references, behind the card's book icon (c0-rulings-opus.md
// ruling 4); file paths linked.
const lines = (xs) => (xs?.length ? xs.map((t, i) => <p key={i}>{t}</p>) : null);
const about = ({ how, caveats, sources }) => ({
  how: lines(how),
  caveats: lines(caveats),
  sources: sources?.length ? <div data-reference="">{lines(sources.map((t) => (typeof t === 'string' ? linkAiFiles(t) : t)))}</div> : null,
});
// a lead of one or two sentences, each its own line
const Lead = ({ children }) => <>{[children].flat().filter(Boolean).map((s, i) => <p key={i} className="hh-lead-s">{s}</p>)}</>;

// --- 1. The cost by tax and benefit (50 draws): a diverging waterfall -------
// Each line grows from where the line above ends; the landing bar is the
// net, the main-case cost, whose home is story step 1 (data-axis here).
const SHORT = { other_income_tax: 'Income tax on earnings (net)' };
export function costSteps() {
  const C = D.cost_components;
  let at = 0;
  const rows = C.rows.map((r) => {
    const s = { ...r, from: at, to: at + r.cost_bn };
    at += r.cost_bn;
    return s;
  });
  return { rows, net: { from: 0, to: C.total_bn } };
}
// a line under £0.05bn in size prints two decimals, not a phrase
const bnLine = (v) => (Math.abs(v) < 0.05 ? fmtBn2(v) : fmtBn(v));

function CostByTax() {
  const C = D.cost_components;
  const [ref, e] = useSeenBeat();
  const { rows, net } = costSteps();
  const ends = rows.flatMap((r) => [r.from, r.to]);
  const lo = Math.min(0, ...ends);
  const hi = Math.max(...ends) * 1.04;
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const bar = (from, to, cls, i) => (
    <span className="hh-wf-track" aria-hidden="true">
      <span className="hh-wf-zero" style={{ left: `${X(0)}%` }} />
      <span
        className={`hh-wf-bar ${cls}`}
        style={{ left: `${X(Math.min(from, to))}%`, width: `${Math.abs(X(to) - X(from))}%`, transformOrigin: to < from ? 'right center' : 'left center', transitionDelay: `${i * 140}ms` }}
      />
    </span>
  );
  return (
    <Card
      id="hh-cost-lines"
      icon="landmark"
      title={costWords(C.rows)}
      lead={
        <Lead>
          {/* the main-case cost: its home is story step 1 */}
          <>
            The eight lines sum to a net cost of <Ax>{fmtBn(C.total_bn)}</Ax> a year, a {C.draws}-draw average.
          </>
        </Lead>
      }
      unit={<span data-axis-title="y">Change in each line, £bn a year</span>}
      more={[
        { label: 'Measure', text: 'Positive is a cost to the public finances.' },
        { label: 'Sample', text: `Mean of ${C.draws} draws.` },
        { label: 'How it is drawn', text: 'Each line starts where the line above ends; the net bar starts at zero.' },
      ]}
      download={{ title: 'Cost by tax and benefit', context: CTX, table: { columns: ['line', 'cost_bn_mean', 'cost_bn_sd'], rows: C.rows.map((r) => [r.label, r.cost_bn, r.sd_bn]) } }}
      about={about({
        how: [
          'Each line is that item of the government balance, baseline to shocked.',
          '“Income tax on earnings (net)” is net of tax on the wage gains of those who keep their jobs.',
          <>
            Tax on dividends and savings rises because the main case raises interest and dividend income by <span data-input="">{fmtInputPct(D.method.capital_uplift_pct)}</span>.
          </>,
        ],
        caveats: ['The cost counts income tax, NI and benefits; it counts no corporation tax.'],
        sources: [`${C.file}: ${C.key}`],
      })}
      story={STEP.central}
    >
      <div className={entryClass(e, 'hh-wf')} ref={ref}>
        <ValueTable
          layout="inline"
          bar
          caption="Change in each line of the government balance, £bn a year"
          rowHead="Line"
          cols={['£bn']}
          rows={[
            ...rows.map((r, i) => ({
              id: r.id,
              label: <span title={SHORT[r.id] ? r.label : undefined}>{SHORT[r.id] ?? r.label}</span>,
              bar: bar(r.from, r.to, r.cost_bn >= 0 ? 'is-loss' : 'is-gain', i),
              cells: [bnLine(r.cost_bn)],
            })),
            // the net, the main-case cost: its home is story step 1
            { id: 'net', main: true, label: 'Net cost (main case)', bar: bar(net.from, net.to, 'is-net', rows.length), cells: [<Ax key="n">{fmtBn(net.to)}</Ax>] },
          ]}
        />
      </div>
    </Card>
  );
}

// --- 2. Cost per pound of pay lost: one table, two draw bases ----------------
// The 20-draw rows (job loss 42p, wage cuts 55p) have their home in the
// Story's margin step: restated, data-axis. The remainder segment
// (employer NI and other items) is drawn from unrounded values and never
// printed: printed parts would not add (41p + 15p against 55p).
const PP_LABEL = {
  job_loss: 'Job loss',
  job_loss_takeup: 'Job loss, full UC take-up',
  job_loss_takeup_jsa: 'Job loss, full UC take-up and JSA',
};
function PerPound() {
  const [ref, e] = useSeenBeat();
  const j20 = D.per_pound_20.job_loss;
  const w = perPound('wage_cuts');
  const seed0 = ['job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'].map(perPound);
  const rising = seed0.every((r, i) => !i || Math.round(r.government_p) > Math.round(seed0[i - 1].government_p));
  const split = (hh, total) => [
    [hh, 'is-hh'],
    [total - hh, 'is-gov'],
  ];
  return (
    <Card
      id="hh-per-pound"
      icon="banknote"
      title={perPoundWords()}
      lead={
        <Lead>
          <>
            Per <Ax>£1</Ax> lost, wage cuts cost <Ax>{fmtPence(w.government_p)}</Ax> and job loss <Ax>{fmtPence(j20.government_p)}</Ax>, employer National Insurance (NI) included: {D.per_pound_20.draws}-draw averages.
          </>
        </Lead>
      }
      unit={
        <span data-axis-title="y">
          Pence per <Ax>£1</Ax> of gross pay removed, each margin alone
        </span>
      }
      legend={
        <Legend
          items={[
            { key: 'hh', label: 'Tax, employee NI and benefits', kind: 'block', color: 'var(--rank-3)' },
            { key: 'gov', label: 'Employer NI and other items', kind: 'block', color: 'var(--rank-1)' },
          ]}
        />
      }
      more={[{ label: 'Sample', text: `As labelled: ${D.per_pound_20.draws} draws, or one draw (seed 0).` }]}
      download={{
        title: 'Cost per pound lost',
        context: CTX,
        table: {
          columns: ['case', 'draws', 'government_balance_p', 'household_basis_p', 'employer_ni_p', 'range_low_p', 'range_high_p'],
          rows: [
            ['Job loss', D.per_pound_20.draws, j20.government_p, '', '', j20.min_p, j20.max_p],
            ['Wage cuts', w.draws, w.government_p, w.household_p, D.per_pound_20.wage_cuts_employer_ni_p, '', ''],
            ...seed0.map((r) => [`${r.label} (seed 0)`, r.draws, r.government_p, r.household_p, '', '', '']),
          ],
        },
      }}
      about={about({
        how: [
          'Total: the fall in the government balance, employer NI included.',
          'Of which: the part of the lost pound that lower income tax, lower employee NI and higher benefits absorb for the household.',
          D.per_pound_20.note,
          <>
            Job loss on {D.per_pound_20.draws} draws ranges from <Ax>{fmtPence(j20.min_p)}</Ax> to <Ax>{fmtPence(j20.max_p)}</Ax> across draws.
          </>,
          // Fable round 7, N1: the one-draw steps, each figure's draw set named
          rising ? (
            <>
              On one draw (seed 0), job loss costs <Ax>{fmtPence(seed0[0].government_p)}</Ax>; full Universal Credit (UC) take-up raises it to <Ax>{fmtPence(seed0[1].government_p)}</Ax> and Jobseeker’s Allowance (JSA) to{' '}
              <Ax>{fmtPence(seed0[2].government_p)}</Ax>.
            </>
          ) : (
            'On one draw (seed 0), full Universal Credit (UC) take-up and Jobseeker’s Allowance (JSA) change the job-loss figure.'
          ),
        ],
        caveats: ['The seed-0 rows are one draw; compare them with each other, not with the 20-draw rows.', ...FLAG],
        sources: [`${j20.file} (run channel_displacement)`, `${D.per_pound_20.file} (variant cut_only)`, `seed 0: ${perPound('job_loss').file}`, 'results/takeup/takeup_draws.csv (scenario disp_only)'],
      })}
      story={STEP.margin}
    >
      <div className={entryClass(e, 'hh-pp')} ref={ref}>
        <ValueTable
          layout="barline"
          bar
          caption="Pence per pound of gross pay removed"
          rowHead="Case"
          cols={['Total', 'Of which tax, employee NI and benefits']}
          rows={[
            { id: 'g-20', group: `${D.per_pound_20.draws} draws` },
            {
              id: 'pp-job',
              label: 'Job loss',
              bar: <Bar value={j20.government_p} max={100} fill="is-ref" />,
              cells: [<Ax key="t">{fmtPence(j20.government_p)}</Ax>, <span key="o" className="hh-muted">not split</span>],
            },
            {
              id: 'pp-cut',
              label: 'Wage cuts',
              bar: <Bar parts={split(w.household_p, w.government_p)} max={100} />,
              cells: [<Ax key="t">{fmtPence(w.government_p)}</Ax>, fmtPence(w.household_p)],
            },
            { id: 'g-0', group: 'One draw (seed 0)' },
            ...seed0.map((r, i) => ({
              id: `pp-${r.id}`,
              label: PP_LABEL[r.id],
              bar: <Bar parts={split(r.household_p, r.government_p)} max={100} delay={i * 120} />,
              cells: [fmtPence(r.government_p), fmtPence(r.household_p)],
            })),
          ]}
          foot={
            <span className="hh-scale" data-axis="">
              {[0, 50, 100].map((t) => (
                <span key={t} style={{ left: `${t}%` }}>
                  {t}p
                </span>
              ))}
            </span>
          }
        />
      </div>
    </Card>
  );
}

// --- 3. Every variant: one cost × poverty plane, then its table ---------------
// The main case on 20 draws and wage cuts (their cost and poverty have
// their home in the Story's margin step: data-axis here), full take-up and
// JSA (home here), and the OBR-sized runs, a different, smaller shock in
// their own group and colour. Arrows: main case to full take-up to JSA,
// within each group; none joins the groups.
const VARIANTS = [
  { id: 'central_20', n: 1, label: 'Job loss (main case)', main: true, story: true, lab: 'Main case', pos: 'l' },
  { id: 'takeup', n: 2, label: 'Full Universal Credit (UC) take-up for the displaced', lab: 'Full take-up', pos: 'b' },
  { id: 'takeup_jsa', n: 3, label: 'Full take-up and 26 weeks of Jobseeker’s Allowance (JSA)', lab: 'Plus JSA', pos: 'r' },
  { id: 'wage_cuts', n: 4, label: 'Wage cuts of the same gross size', story: true, lab: 'Wage cuts', pos: 'tl' },
  { id: 'obr', n: 5, label: 'Job loss', group: 'b', npos: 'l' },
  { id: 'obr_takeup', n: 6, label: 'Full UC take-up', group: 'b', lab: 'OBR-sized shock', pos: 'b', npos: 't' },
  { id: 'obr_takeup_jsa', n: 7, label: 'Full take-up and JSA', group: 'b' },
];
export const VARIANT_ARROWS = [
  ['central_20', 'takeup'],
  ['takeup', 'takeup_jsa'],
  ['obr', 'obr_takeup'],
  ['obr_takeup', 'obr_takeup_jsa'],
];
// Card 3's lead (push D, Q8.4: it supports the title): full take-up, then
// JSA, against the main case on the same draws, from the data.
export function takeupLead() {
  const c = L('central_20');
  const steps = [c, L('takeup'), L('takeup_jsa')].filter(Boolean);
  const up = steps.length > 1 && steps.every((r, i) => !i || (r.cost_bn > steps[i - 1].cost_bn && r.poverty_pp < steps[i - 1].poverty_pp));
  return up
    ? `On the same ${c.draws} draws, each step from the main case raises the cost and lowers the poverty rise.`
    : `Full take-up and JSA are compared with the main case on the same ${c.draws} draws.`;
}
// Card 3's More info: wage cuts against job loss on the same 20 draws.
function marginLead() {
  const j = L('central_20');
  const w = L('wage_cuts');
  if (!(w.cost_bn > j.cost_bn && w.poverty_pp < j.poverty_pp)) return 'Wage cuts of the same gross size are compared with job loss on the same draws.';
  return (
    <>
      Wage cuts of the same gross size cost <Ax>{fmtBn(w.cost_bn)}</Ax> and raise poverty by <Ax>{fmtPpSpread(w.poverty_pp)}</Ax>, against <Ax>{fmtBn(j.cost_bn)}</Ax> and <Ax>{fmtPpSpread(j.poverty_pp)}</Ax> for job loss on the same draws.
    </>
  );
}
const COLS3 = ['Cost', 'Poverty', 'Gini'];

function Variants() {
  const [ref, e] = useSeenBeat();
  const xs = VARIANTS.map((v) => ladder(v.id));
  const xMax = Math.max(...xs.map((r) => r.cost_bn)) * 1.08;
  const yMax = Math.max(...xs.map((r) => r.poverty_pp)) * 1.15;
  const row = (v) => {
    const r = ladder(v.id);
    // the main case and wage cuts: cost and poverty restated from the Story
    const home = (x) => (v.story ? <Ax>{x}</Ax> : x);
    return {
      id: v.id,
      main: v.main,
      marker: { tone: v.group ?? 'a', ring: v.main, n: v.n },
      label: v.label,
      cells: [home(fmtBn(r.cost_bn)), home(fmtPp(r.poverty_pp)), fmtGiniPts(r.gini_pp)],
    };
  };
  return (
    <Card
      id="hh-ladder"
      icon="layers"
      title={takeupWords()}
      lead={<Lead>{takeupLead()}</Lead>}
      unit="Cost, £bn a year; poverty, pp; Gini, points"
      more={[
        { label: 'Measure', text: 'Absolute poverty before housing costs; the Gini on its 0 to 100 scale.' },
        // the count from the variants drawn, not a literal (item 36, E12)
        { label: 'Sample', text: `${[...new Set(xs.map((r) => r.draws))].join(' or ')} draws, the same seeds as the main case.` },
      ]}
      download={{
        title: 'Every variant of the shock',
        context: CTX,
        table: { columns: ['variant', 'draws', 'cost_bn', 'poverty_bhc_pp', 'gini_points'], rows: D.ladder.map((r) => [r.label, r.draws, r.cost_bn, r.poverty_pp, r.gini_pp]) },
      }}
      about={about({
        how: [
          'Take-up, JSA and wage cuts reuse seeds 0 to 19 of the main case.',
          marginLead(),
          <>
            On those {L('central_20').draws} draws the main case costs <Ax>{fmtBn(L('central_20').cost_bn)}</Ax>; the {L('central_50')?.draws ?? D.cost_components.draws}-draw headline is <Ax>{fmtBn(D.cost_components.total_bn)}</Ax>.
          </>,
        ],
        caveats: ['The OBR-sized shock is a different, smaller shock (no wage or capital-income change), not a step from the main case.', `It is sized to ${OBR_SCENARIO}.`, ...takeupBoundWords(), ...FLAG],
        sources: [
          'results/robustness/dividend_coverage_draws.csv (run central)',
          'results/takeup/takeup_draws.csv',
          'results/wage_cut/wage_cut_draws.csv (variant table3)',
          'results/next_runs/obr_benchmark.json',
          <>26 weeks: the {ext(URLS.jsa, 'new-style JSA limit (GOV.UK)')}</>,
          <>OBR-sized: the study&rsquo;s conversion of {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}&rsquo;s unemployment rise</>,
        ],
      })}
      story={STEP.margin}
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise for each variant; arrows run from the main case to full take-up to JSA, within each group"
          points={VARIANTS.map((v) => ({ id: v.id, n: v.n, npos: v.npos, group: v.group, ring: v.main, name: v.label, lab: v.lab, pos: v.pos, x: ladder(v.id).cost_bn, y: ladder(v.id).poverty_pp }))}
          arrows={VARIANT_ARROWS}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Rise in absolute poverty"
          xTitle="Cost to the public finances"
        />
      </div>
      <ValueTable
        caption="Cost, poverty and Gini change for each variant"
        rowHead="Variant"
        cols={COLS3}
        rows={[
          { id: 'g-main', group: 'Main shock' },
          ...VARIANTS.filter((v) => !v.group).map(row),
          {
            id: 'g-obr',
            group: (
              <>
                OBR-sized shock, <span data-input="">{fmtInputPct(OBR_RATE)}</span> of employees displaced
              </>
            ),
          },
          ...VARIANTS.filter((v) => v.group).map(row),
        ]}
      />
    </Card>
  );
}

// --- 4. Five displacement rules: the same plane, 50 draws --------------------
// Cost and poverty under the four stylised rules have their home in the
// Story's rules step, the main rule's three figures in step 1: restated,
// data-axis. The top-loaded extreme case is on the scale (x to £30bn).
// Ages 16 to 24 and By AI exposure sit almost on one point: their labels
// go to opposite sides.
const RULES = [
  { id: 'uniform', n: 1, pos: 'b' },
  { id: 'junior', n: 2, pos: 't', npos: 'l' },
  { id: 'exposure', n: 3, main: true, pos: 'br', npos: 'r' },
  { id: 'compression', n: 4, pos: 'r' },
  { id: 'klein_top_loaded', n: 5, own: true, pos: 'l', npos: 'l' },
];
// Card 4's lead: the cheapest and dearest of the four stylised rules, then
// the extreme case (its cost has its home in this card's table), then the
// title's tie, if any (rulesTieWords).
function rulesLead() {
  const four = RULES.filter((r) => !r.own).map((r) => rule(r.id));
  const lo = four.reduce((a, b) => (b.cost_bn < a.cost_bn ? b : a));
  const hi = four.reduce((a, b) => (b.cost_bn > a.cost_bn ? b : a));
  const K = rule('klein_top_loaded');
  return {
    lead: (
      <>
        Of the four stylised rules, the cost runs from <Ax>{fmtBn(lo.cost_bn)}</Ax> under {ruleName(lo.id)} to <Ax>{fmtBn(hi.cost_bn)}</Ax> under {ruleName(hi.id)}.
      </>
    ),
    // More info (push D, Q8.2): the extreme case, and the title's tie with
    // its gap (rulesGap), restated
    more: [
      <>
        The top-loaded extreme case costs <Ax>{fmtBn(K.cost_bn)}</Ax>.
      </>,
      tieLine(D.rules),
    ].filter(Boolean),
  };
}
// the tie sentence with its gap marked as restated
function tieLine(rules) {
  const t = rulesTieWords(rules);
  const g = rulesGap(rules);
  if (!t) return null;
  const [a, b] = g ? t.split(g) : [t, ''];
  return g ? (
    <>
      {a}
      <Ax>{g}</Ax>
      {b}
    </>
  ) : (
    t
  );
}
function Rules() {
  const [ref, e] = useSeenBeat();
  const all = RULES.map((r) => rule(r.id));
  const xMax = Math.ceil((Math.max(...all.map((r) => r.cost_bn)) * 1.05) / 10) * 10;
  const yMax = Math.max(...all.map((r) => r.poverty_pp)) * 1.12;
  const label = (x) => (x.main ? `${ruleName(x.id)} (main case)` : ruleName(x.id));
  return (
    <Card
      id="hh-rules"
      icon="users"
      title={rulesWords(D.rules)}
      lead={<Lead>{rulesLead().lead}</Lead>}
      unit="Cost, £bn a year; poverty, pp; Gini, points"
      more={[
        { label: 'Measure', text: 'Absolute poverty before housing costs; the Gini on its 0 to 100 scale.' },
        { label: 'Sample', text: `${rule('uniform').draws} draws, the same seeds for every rule.` },
        { label: 'Tie', text: `The title calls the main rule the least only when every other rule’s poverty rise is at least ${RULE_MARGIN_PP}pp higher; closer rules tie.` },
      ]}
      download={{
        title: 'Five rules for who loses the job',
        context: CTX,
        table: { columns: ['rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'gini_points'], rows: D.rules.map((r) => [ruleName(r.id), r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.gini_pp]) },
      }}
      about={about({
        how: ['Every rule displaces the same expected number of employees.', 'Wage and capital-income changes are the same under every rule.', ...rulesLead().more],
        caveats: [
          'The rules are the study’s stylised designs.',
          `${ruleName('junior')}: a higher chance for workers aged 16 to 24.`,
          `${ruleName('compression')}: doubled chances for top earners in exposed occupations.`,
          `${RULE_NAMES.klein_top_loaded.short}: displacement loaded on above-median earners.`,
          ...rulesReviewWords(D.rules),
        ],
        sources: [`${D.rules[0].file}: exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp`],
      })}
      story={STEP.rules}
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise under each displacement rule"
          points={RULES.map((x) => ({ id: x.id, n: x.n, npos: x.npos, ring: x.main, group: x.own ? 'off' : 'c', name: label(x), lab: RULE_NAMES[x.id].short, pos: x.pos, x: rule(x.id).cost_bn, y: rule(x.id).poverty_pp }))}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Rise in absolute poverty"
          xTitle="Cost to the public finances"
        />
      </div>
      <ValueTable
        caption="Cost, poverty and Gini change under each displacement rule"
        rowHead="Displacement rule"
        cols={COLS3}
        rows={RULES.map((x) => {
          const r = rule(x.id);
          // the four stylised rules' cost and poverty, and all three of the
          // main rule's: their home is the Story
          const home = (v, gini = false) => (x.own || (gini && !x.main) ? v : <Ax>{v}</Ax>);
          return {
            id: x.id,
            main: x.main,
            marker: { tone: x.own ? 'off' : 'c', ring: x.main, n: x.n },
            label: label(x),
            cells: [home(fmtBn(r.cost_bn)), home(fmtPp(r.poverty_pp)), home(fmtGiniPts(r.gini_pp), true)],
          };
        })}
      />
    </Card>
  );
}

// --- 5. Who the displaced are (OBR-sized run): three bar sets ----------------
// Not a funnel: the three claim shares have three bases, and 53% > 48%.
// The three limits overlap, so three separate bars, never stacked. UC per
// person is drawn for both take-up cases (item 24: a two-state switch that
// changes one number is drawn as two bars).
function Displaced() {
  const X = D.displaced;
  const [ref, e] = useSeenBeat();
  // the UC capital limit, stated in the data as text ("16,000")
  const limit = Number(String(D.method.uc_capital_limit_gbp).replace(/,/g, ''));
  const gbpMax = Math.max(X.uc_per_displaced.value, X.uc_per_displaced_takeup.value, X.uc_per_existing_unemployed.value) * 1.05;
  const set = (id, head, rows, max, fmt) => (
    <div className="hh-set" key={id}>
      <p className="hh-set-head">{head}</p>
      <ValueTable
        layout="barline"
        bar
        caption={head}
        rowHead="Group"
        cols={['Value']}
        className="hh-set-tbl"
        rows={rows.map(([k, label, ref2], i) => ({
          id: k,
          label,
          bar: <Bar value={X[k].value} max={max} fill={ref2 ? 'is-ref' : 'is-neutral'} delay={i * 160} />,
          cells: [fmt(X[k].value)],
        }))}
      />
    </div>
  );
  const under = X.claim_uc.value < 50;
  return (
    <Card
      id="hh-displaced"
      icon="usersRound"
      title={under ? 'Under half of displaced workers’ benefit units would claim Universal Credit (UC)' : 'Half or more of displaced workers’ benefit units would claim Universal Credit (UC)'}
      lead={
        <Lead>
          {[
            <>
              In all, <Ax>{fmtShare(X.claim_uc.value)}</Ax> would claim. Among the units entitled to UC once displaced, <Ax>{fmtShare(X.claim_uc_entitled.value)}</Ax> would.
            </>,
            <>
              Among entitled units with someone already unemployed, <Ax>{fmtShare(X.existing_unemployed_claim.value)}</Ax> do.
            </>,
          ]}
        </Lead>
      }
      unit={<span data-axis-title="y">Share of benefit units with a displaced worker, %</span>}
      more={[
        {
          label: 'Settings',
          text: (
            <>
              The OBR-sized shock, <span data-input="">{fmtInputPct(OBR_RATE)}</span> of employees displaced.
            </>
          ),
        },
      ]}
      download={{
        title: 'Who the displaced are',
        context: CTX,
        table: {
          columns: ['measure', 'value', 'unit'],
          rows: ['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner', 'uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'].map((k) => [X[k].label, X[k].value, X[k].unit]),
        },
      }}
      about={about({
        how: ['Each benefit unit keeps the UC take-up decision drawn for it in the data.', 'A partner’s earnings reduce the UC award; capital above the limit removes it; owners get no housing element.'],
        caveats: ['Shares count benefit units, not persons.', 'The three groups in “What limits entitlement” overlap; the data give no cross-tabulation.', 'The take-up decisions are the dataset’s imputation, not DWP take-up statistics.', ...FLAG],
        sources: [`${X.claim_uc.file} (diagnostics.obr, existing_unemployed)`, `UC per worker: ${X.uc_per_displaced.file}`, 'results/takeup/takeup_draws.csv', <>Capital limit: {ext(URLS.ucEligibility, 'UC eligibility (GOV.UK)')}</>],
      })}
      story={STEP.pound}
    >
      <div className={entryClass(e, 'hh-disp')} ref={ref}>
        {set(
          'claim',
          'Share that would claim UC',
          [
            ['claim_uc', 'All units with a displaced worker'],
            ['claim_uc_entitled', 'Those entitled to UC once displaced'],
            ['existing_unemployed_claim', 'Entitled units with someone already unemployed', true],
          ],
          100,
          fmtShare,
        )}
        {set(
          'limits',
          'What limits entitlement',
          [
            [
              'capital_over_limit',
              <>
                Capital above <span data-input="">{fmtGbp(limit)}</span> (no UC)
              </>,
            ],
            ['other_earner', 'Another earner in the benefit unit'],
            ['homeowner', 'Own their home (no housing element)'],
          ],
          100,
          fmtShare,
        )}
        {set(
          'uc',
          'UC added in a year, £ per person',
          [
            ['uc_per_displaced', 'Per displaced worker, take-up as in the data'],
            ['uc_per_displaced_takeup', 'Per displaced worker, full take-up'],
            ['uc_per_existing_unemployed', 'Per person already unemployed', true],
          ],
          gbpMax,
          fmtGbp,
        )}
      </div>
    </Card>
  );
}

// --- 6. Deciles under three rankings: three dots per decile -------------------
// The HBAI values have their home in the Story's deciles step: the value
// column restates them (data-axis). Decile 1 is grey in every ranking.
const RANK_FILL = ['p3-fill-rank-1', 'p3-fill-rank-2', 'p3-fill-rank-3'];
const RANK_COLOR = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)'];
const HBAI = (
  <abbr title="Households Below Average Income, the DWP’s official income measure" className="hh-abbr">
    HBAI
  </abbr>
);
// the legend's short names; the download keeps the data's labels
const RANK_SHORT = {
  hbai: <span>{HBAI} income (the study’s ranking)</span>,
  pre_pension: 'Income before pension contributions',
  hbai_excl_large_ppc: <span>{HBAI}, large pension contributors left out</span>,
};
function Rankings() {
  const R = D.rankings;
  const [ref, e] = useSeenBeat();
  const all = R.flatMap((r) => r.values);
  const lo = Math.floor(Math.min(0, ...all));
  const hi = Math.ceil(Math.max(0, ...all));
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const tks = [];
  for (let t = lo; t <= hi; t += 1) tks.push(t);
  const lead = rankingsLead(R);
  return (
    <Card
      id="hh-rankings"
      icon="bars"
      title={rankingsWords(R)}
      lead={lead ? <Lead>{lead}</Lead> : null}
      unit={<span data-axis-title="y">% change in disposable income, by decile</span>}
      legend={<Legend label="Rankings" items={R.map((r, i) => ({ key: r.id, label: RANK_SHORT[r.id] ?? r.label, kind: 'dot', color: RANK_COLOR[i] }))} />}
      more={[
        { label: 'Measure', text: 'Disposable income before housing costs.' },
        { label: 'Settings', text: 'The main case.' },
        { label: 'Sample', text: `${D.deciles.draws} draws.` },
      ]}
      download={{
        title: 'Deciles under three rankings',
        context: CTX,
        table: { columns: ['decile', ...R.map((r) => r.id)], rows: Array.from({ length: 10 }, (_, i) => [i + 1, ...R.map((r) => r.values[i])]) },
      }}
      about={about({
        how: ['Each household is weighted by its number of members.', 'The rankings differ only in how households are placed in deciles.'],
        caveats: [
          'Decile 1 includes households with large pension contributions that also receive capital income.',
          <>
            Decile 1 under the three rankings:{' '}
            {R.map((r, i) => (
              <Fragment key={r.id}>
                {i ? ', ' : ''}
                <Ax>{fmtDecilePct(r.values[0])}</Ax>
              </Fragment>
            ))}
            .
          </>,
        ],
        sources: ['results/appendix/decile_ranking_sensitivity.csv: disposable_change_pct'],
      })}
      story={STEP.deciles}
    >
      <div className={entryClass(e, 'hh-db')} ref={ref}>
        <div role="table" aria-label="Change in disposable income by decile, three rankings" className="hh-db-table">
          <div role="row" className="hh-db-axis">
            <span role="columnheader" className="hh-db-label">
              <span className="visually-hidden">Decile</span>
            </span>
            <span className="hh-db-ticks" aria-hidden="true" data-axis="">
              {tks.map((t) => (
                <span key={t} className={t % 2 ? 'is-odd' : undefined} style={{ left: `${X(t)}%` }}>
                  {signedTick(t)}%
                </span>
              ))}
            </span>
            <span role="columnheader" className="hh-db-head">
              {HBAI}
            </span>
          </div>
          {Array.from({ length: 10 }, (_, i) => {
            const vs = R.map((r) => r.values[i]);
            const first = i === 0;
            return (
              <div role="row" key={i} className={`hh-db-row${first ? ' is-caveat' : ''}`} data-decile={i + 1} style={{ '--beat': `${(first ? 10 : i) * 60}ms` }}>
                <span role="rowheader" className="hh-db-label">
                  {i === 0 ? '1 (bottom)' : i === 9 ? '10 (top)' : i + 1}
                </span>{' '}
                <span className="hh-db-track" aria-hidden="true">
                  <span className="hh-db-zero" style={{ left: `${X(0)}%` }} />
                  <span className="hh-db-line" style={{ left: `${X(Math.min(...vs))}%`, width: `${X(Math.max(...vs)) - X(Math.min(...vs))}%` }} />
                  {vs.map((v, k) => (
                    <span key={k} className={`hh-db-dot ${first ? 'p3-fill-muted' : RANK_FILL[k]}`} style={{ left: `${X(v)}%` }} />
                  ))}
                </span>{' '}
                {/* the study's ranking, restated from the Story's deciles step
                    (its 20-draw values, deciles.values: the Story's figure
                    exactly; the rankings file agrees to within 0.01) */}
                <span role="cell" className={`hh-db-val${first ? ' hh-muted' : ''}`}>
                  <Ax>{fmtDecilePct(D.deciles.values[i])}</Ax>
                </span>
              </div>
            );
          })}
        </div>
        <p className="hh-note" data-caveat="bottom-decile">
          Decile 1, grey: its direction depends on how households are ranked, so no conclusion is drawn.
        </p>
      </div>
    </Card>
  );
}

// --- 7. Policy responses (50 draws): one table with a cost bar -----------------
// The study's order; wage insurance under the two other displacement rules
// as indented sub-rows. All three main rows use the main-case shock, so
// none is "the main case". No ranking words.
function Policy() {
  const P = D.policy;
  const [ref, e] = useSeenBeat();
  const max = Math.ceil((Math.max(...P.rows.map((r) => r.cost_bn)) * 1.05) / 10) * 10;
  const main = P.rows.filter((r) => r.family === 'exposure');
  const others = (reform) => P.rows.filter((r) => r.reform === reform && r.family !== 'exposure');
  const costs = main.map((r) => r.cost_bn);
  const row = (r, sub = false) => ({
    id: r.id,
    sub,
    label: sub ? `Under the ${ruleName(r.family).toLowerCase()} rule` : <span data-input="">{r.label}</span>,
    bar: <Bar value={r.cost_bn} max={max} thin={sub} />,
    cells: [fmtBn(r.cost_bn), fmtPp(r.poverty_pp), fmtGiniPts(r.gini_pp)],
  });
  return (
    <Card
      id="hh-policy"
      icon="handshake"
      title={policyWords(main)}
      lead={
        <Lead>
          {[
            <>
              The costs run from <Ax>{fmtBn(Math.min(...costs))}</Ax> to <Ax>{fmtBn(Math.max(...costs))}</Ax> a year.
            </>,
            'Wage insurance is costed gross; the two Universal Credit (UC) changes are costed net of withdrawal elsewhere.',
          ]}
        </Lead>
      }
      unit={<span data-axis-title="y">Cost, £bn a year; poverty, pp; Gini, points</span>}
      more={[
        { label: 'Compared with', text: 'The main case after the shock, not today.' },
        { label: 'Sample', text: `${P.rows[0].draws} draws.` },
      ]}
      download={{
        title: 'Policy responses',
        context: CTX,
        table: {
          columns: ['reform', 'displacement_rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'poverty_sd_pp', 'gini_points'],
          rows: P.rows.map((r) => [r.reform, r.family, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.poverty_sd_pp, r.gini_pp]),
        },
      }}
      about={about({
        how: ['Each response is simulated on top of the main-case shock.', 'Poverty lines are held at their shocked values.', 'Wage insurance is an untaxed transfer that means tests ignore.'],
        caveats: ['The designs are the study’s own.', 'They differ in aim, take-up and administration.', 'Compared on cost, poverty and the Gini only; not ranked.'],
        sources: [`${P.file}: ${P.key}`],
      })}
    >
      <div className={entryClass(e, 'hh-pol')} ref={ref}>
        <ValueTable
          layout="stack"
          bar
          caption="Cost, poverty and Gini change for each policy response"
          rowHead="Response"
          cols={COLS3}
          rows={main.flatMap((r) => [row(r), ...others(r.reform).map((o) => row(o, true))])}
        />
      </div>
    </Card>
  );
}

// --- page ------------------------------------------------------------------------
// The result files, the commit and how the page is built: on Method and
// sources > Detail and sources (item 23), one line here.
function DetailLink() {
  return (
    <p className="hh-detail-link">
      <NavLink tab="method" sub="detail">
        Detail and sources: result files, commit, how the page is built
      </NavLink>
    </p>
  );
}

// The page's three sections, for the nav under the question: titles only.
export const SECTIONS = [
  { id: 'hh-cost', title: 'What moves the cost', icon: 'landmark', sub: 'The cost by line, per pound of lost pay, by variant and by displacement rule' },
  { id: 'hh-who', title: 'Who loses income', icon: 'usersRound', sub: 'The displaced workers’ benefit units, and income by decile' },
  { id: 'hh-responses', title: 'Policy responses', icon: 'handshake', sub: 'Three stylised additions, each simulated on top of the main case' },
];

// The head: the question (with the sources-and-notes icon: the paper, the
// housing-costs basis, the story's headlines), the model row (the household
// study's model line, item 22), the three section links.
export default function HouseholdsExplore() {
  const [cost, who, resp] = SECTIONS;
  return (
    <div className="hh-page">
      <header className="hh-lead page-intro">
        <h2 className="hh-question page-q">
          <span>What moves the cost of AI job displacement, and who loses income?</span>
          <PageNotes
            groups={[
              {
                title: 'About this page',
                notes: [
                  {
                    icon: 'source',
                    text: (
                      <a href={PAPER} target="_blank" rel="noreferrer">
                        {`${STATUS === 'provisional' ? 'Draft: ' : ''}${REFS.ahmadi.title} (PDF)`}
                      </a>
                    ),
                  },
                  {
                    icon: 'poverty',
                    text: (
                      <>
                        Poverty is{' '}
                        <a href={URLS.hbai} target="_blank" rel="noreferrer" title="DWP's HBAI publishes both bases; absolute poverty holds the line at its baseline value">
                          before housing costs
                        </a>
                      </>
                    ),
                  },
                  {
                    icon: 'link',
                    text: (
                      <NavLink tab="story" anchor="story-part-3">
                        Headlines in story part 3
                      </NavLink>
                    ),
                  },
                ],
              },
            ]}
          />
        </h2>
        <div className="model-row">
          <ModelLine link />
        </div>
        <nav className="hh-nav" aria-label="On this page">
          <span className="hh-nav-label" aria-hidden="true">
            On this page
          </span>
          {SECTIONS.map((s) => (
            <NavLink key={s.id} tab="explore" sub="households" anchor={s.id} className="hh-nav-link">
              {s.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <SectionHeading id={cost.id} icon={cost.icon} title={cost.title}>
        {cost.sub}
      </SectionHeading>
      {/* 2 × 2: the cost lines and per pound, then the two planes */}
      <div className="card-grid cols-2 hh-cost-grid">
        <CostByTax />
        <PerPound />
        <Variants />
        <Rules />
      </div>
      <SectionHeading id={who.id} icon={who.icon} title={who.title}>
        {who.sub}
      </SectionHeading>
      <div className="card-grid cols-2">
        <Displaced />
        <Rankings />
      </div>
      <SectionHeading id={resp.id} icon={resp.icon} title={resp.title}>
        {resp.sub}
      </SectionHeading>
      <Policy />
      <DetailLink />
    </div>
  );
}
