'use client';

import { Fragment, useState } from 'react';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { ModelLine, PageNotes } from '@/components/ui/PageIntro.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';
import { AxisTitles } from '@/tabs/explore/axes.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { D, MODEL_YEAR, OBR_SCENARIO, OutsideRebuildFlag, PAPER_URL, Replay, entryClass, ladder, perPound, rule, useSeenBeat } from '@/tabs/story/part3/shared.jsx';
import { fmtBn, fmtGbp, fmtInputPct, fmtPence, fmtPp, fmtShare } from '@/tabs/story/part3/format.js';
import { Plane, PointList, STEP, StoryRef, signedTick } from './charts.jsx';
import { SMALL_DECILE_PCT } from './figures.js';

// Explore > Households: the uk-ai-study detail (PolicyEngine/uk-ai-study
// PR #18), apart from story part 3. "Provisional" is said once, in the
// lead. Every figure is printed once across part 3 and this page: a value
// the story prints is drawn here as a position, and its row carries one
// link to the step. Every chart has a CSV download (Card's DownloadMenu)
// and at most one About fold. Round 2: icons in headers only (card and
// section titles); plain dots with direct labels on the two planes. Figures from
// data/aiStudy2425.json (docs/story/part3-notes.md); the two models are never
// drawn together here.

// The study's model year and status come from the data file (the refreshed
// file carries model_year_label, provisional and status; the older one only
// the shared MODEL_YEAR).
const YEAR = D.model_year_label ?? MODEL_YEAR;
const STATUS = D.provisional === false ? (D.status ?? null) : 'provisional';
const PAPER = D.source.paper_url ?? PAPER_URL;
const CTX = `Household study PR #${D.source.pr}${STATUS ? ` (${STATUS})` : ''}, ${D.source.dataset}, ${YEAR}, commit ${D.source.commit.slice(0, 7)}`;
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
// Which deciles lose and which gain under all three rankings, and which
// change sign, read from the data (item 28: "deciles 2 to 10 have the same
// sign" hid that decile 10 gains).
export function rankingsWords(R) {
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const lose = [];
  const gain = [];
  const flip = [];
  for (let i = 0; i < 10; i += 1) {
    const s = new Set(R.map((r) => sgn(r.values[i])));
    (s.size !== 1 ? flip : s.has(-1) ? lose : s.has(1) ? gain : flip).push(i + 1);
  }
  const name = (is) => (is.length === 1 ? `decile ${is[0]}` : `deciles ${span(is)}`);
  const verb = (is, one, many) => (is.length === 1 ? one : many);
  const parts = [
    lose.length ? `${name(lose)} ${verb(lose, 'loses', 'lose')} income` : null,
    // a gain under 0.2% in every ranking is not called a gain (item 24:
    // "Do not write 'decile 10 gains'"; its interval spans zero; review
    // round 1, R1-03)
    gain.length
      ? gain.every((d) => R.every((r) => Math.abs(r.values[d - 1]) < SMALL_DECILE_PCT))
        ? `${name(gain)} ${verb(gain, 'moves', 'move')} by less than ${SMALL_DECILE_PCT}%`
        : `${name(gain)} ${verb(gain, 'gains', 'gain')}`
      : null,
    flip.length ? `${name(flip)} ${verb(flip, 'changes', 'change')} sign` : null,
  ].filter(Boolean);
  const t = parts.join('; ');
  return `${t[0].toUpperCase()}${t.slice(1)}${flip.length ? ' across the rankings' : ' under all three rankings'}`;
}
// Cost lines: lost income tax and NI against the higher tax on dividends
// and savings, from the cost components.
export function costWords(rows) {
  const v = (id) => rows.find((r) => r.id === id)?.cost_bn ?? 0;
  const lost = v('other_income_tax') + v('employer_ni') + v('employee_ni');
  const gained = -(v('dividend_tax') + v('savings_tax'));
  return lost > gained ? 'Lost income tax and NI outweigh higher tax on dividends and savings' : 'Higher tax on dividends and savings outweighs lost income tax and NI';
}
// Full take-up and JSA against the main case on the same draws.
const L = (id) => D.ladder.find((r) => r.id === id);
export function takeupWords() {
  const c = L('central_20');
  const vs = [L('takeup'), L('takeup_jsa')].filter(Boolean);
  const more = vs.every((r) => r.cost_bn > c.cost_bn);
  const less = vs.every((r) => r.poverty_pp < c.poverty_pp);
  if (more && less) return { long: 'Full take-up and JSA cost more and raise poverty less', short: 'full take-up costs more, raises poverty less' };
  return { long: 'Full take-up and JSA move the cost and the poverty rise', short: 'full take-up moves the cost and the poverty rise' };
}
// Economics review, round 1 (words only, computed from the data): the
// top-loaded rule's poverty rise, which the stated routes do not explain,
// and the uniform rule's spread across draws.
export function rulesReviewWords(rules) {
  const k = rules.find((r) => r.id === 'klein_top_loaded');
  const u = rules.find((r) => r.id === 'uniform');
  const out = [];
  if (k && rules.every((r) => r.poverty_pp <= k.poverty_pp) && rules.every((r) => r.cost_bn <= k.cost_bn))
    out.push('Top-loaded displaces above-median earners, yet raises poverty and cost most', 'The study’s published extract does not break that rise down');
  if (u && u.cost_sd_bn >= 0.8 * u.cost_bn) out.push('Uniform: the cost’s spread across draws is about its mean');
  return out;
}
// The data's take-up flags: full take-up and JSA raise the cost and lower
// the poverty rise, so the central poverty rise is an upper bound on that
// count; its cost is not (economics review, round 1).
export function takeupBoundWords() {
  const c = L('central_20');
  const vs = [L('takeup'), L('takeup_jsa')].filter(Boolean);
  if (!c || !vs.length || !vs.every((r) => r.cost_bn > c.cost_bn && r.poverty_pp < c.poverty_pp)) return [];
  return ['With the data’s take-up flags, the poverty rise is an upper bound', 'The cost is not: full take-up and JSA raise it'];
}
export function marginWords() {
  const j = L('central_20');
  const w = L('wage_cuts');
  return !j || !w ? 'compared on the same draws' : j.poverty_pp > w.poverty_pp ? 'job loss raises poverty more' : 'wage cuts raise poverty at least as much';
}
export function rulesCostWords(rules) {
  const cs = rules.map((r) => r.cost_bn);
  const spread = Math.max(...cs) - Math.min(...cs);
  return spread >= 2 ? 'moves the cost by billions a year' : 'moves the cost';
}
export function policyWords(main) {
  const all = main.every((r) => r.poverty_pp < 0 && r.gini_pp < 0);
  return all ? 'Each response lowers poverty and the Gini; their costs differ' : 'The responses differ in cost and in what they do to poverty and the Gini';
}
// The "outside the attested rebuild" flag: shown while the data file lists
// results outside the study's rebuild (or, for an older file, says nothing).
const OUTSIDE = D.method?.outside_rebuild;
const Flag = () => (OUTSIDE == null || OUTSIDE.length ? <OutsideRebuildFlag className="hh-flag" /> : null);

export function rulesWords(rules, central = 'exposure') {
  const c = rules.find((r) => r.id === central);
  const others = rules.filter((r) => r.id !== central);
  const every = rules.every((r) => r.poverty_pp > 0);
  const atLeast = others.filter((r) => r.poverty_pp >= c.poverty_pp).length;
  const lead = every ? 'Poverty rises under every rule' : 'Poverty does not rise under every rule';
  // T15: "least under the central rule" only when every other rule raises it more
  if (others.every((r) => r.poverty_pp > c.poverty_pp)) return `${lead}, least under the main rule`;
  if (atLeast === others.length) return `${lead}, by at least as much as in the main case under the other ${others.length}`;
  return `${lead}; ${atLeast} of the other ${others.length} raise it at least as much as the main rule`;
}
const bnSmall = (v) => (Math.abs(v) < 0.05 ? (v < 0 ? 'a saving under £0.1bn' : 'under £0.1bn') : fmtBn(v));
const OBR_RATE = D.sankey.displacement_rate_pct;
// One About fold per card (Card's `about`): how, caveats and sources as
// short lines; sources are file paths, linked.
const lines = (xs) => (xs?.length ? xs.map((t, i) => <p key={i}>{t}</p>) : null);
const about = ({ how, caveats, sources }) => ({
  how: lines(how),
  caveats: lines(caveats),
  sources: sources?.length ? <div data-reference="">{lines(sources.map((t) => (typeof t === 'string' ? linkAiFiles(t) : t)))}</div> : null,
});

// --- 1. The cost by tax and benefit (50 draws): a diverging waterfall -------
// Each line grows from where the line above ends; the landing bar is the
// net, the central cost, whose home is story step 1 (position only here).
// Only each line's own value is printed: the bar ends in between are
// positions, not running totals.
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

function CostByTax() {
  const C = D.cost_components;
  const [ref, e] = useSeenBeat();
  const { rows, net } = costSteps();
  const ends = rows.flatMap((r) => [r.from, r.to]);
  const lo = Math.min(0, ...ends);
  const hi = Math.max(...ends) * 1.04;
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const bar = (from, to, cls, i) => (
    <span className="hh-wf-track">
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
      title="Cost by tax and benefit"
      finding={costWords(C.rows)}
      unit={`Change in each line, £bn a year; positive is a cost. ${C.draws} draws`}
      download={{ context: CTX, table: { columns: ['line', 'cost_bn_mean', 'cost_bn_sd'], rows: C.rows.map((r) => [r.label, r.cost_bn, r.sd_bn]) } }}
      about={about({
        how: ['Each line: that item of the government balance, baseline to shocked', 'Averaged over the draws; the lines sum to the main-case cost'],
        sources: [`${C.file}: ${C.key}`],
      })}
    >
      <div className={entryClass(e, 'hh-wf')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Tax and benefit lines" x="Change in each line, £bn a year, stacked from zero" reference="Zero line: no change" />
        <div role="list" className="hh-rowlist">
          {rows.map((r, i) => (
            <div role="listitem" key={r.id} className="hh-wf-row" data-row={r.id}>
              <span className="hh-wf-label" title={SHORT[r.id] ? r.label : undefined}>
                {SHORT[r.id] ?? r.label}
              </span>{' '}
              {bar(r.from, r.to, r.cost_bn >= 0 ? 'is-loss' : 'is-gain', i)}{' '}
              <span className="hh-val">{bnSmall(r.cost_bn)}</span>
            </div>
          ))}
          <div role="listitem" className="hh-wf-row is-net" data-row="net">
            <span className="hh-wf-label">
              <b>Net: the main-case cost</b>
            </span>
            {bar(net.from, net.to, 'is-net', rows.length)}{' '}
            {/* the central cost, restated from its home (story step 1): data-axis */}
            <span className="hh-val" data-axis="">
              {fmtBn(net.to)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- 2. Every variant: one cost × poverty plane ------------------------------
// The main case on 20 draws and wage cuts (their cost and poverty
// figures are printed in story step 6: positions here), full take-up and JSA
// (printed here: their home since round 1 moved them out of the story),
// and the OBR-sized runs, a different, smaller shock in their own group and
// colour (printed here). Arrows: central to full take-up to JSA, within
// each group; none joins the groups.
// `lab` and `pos`: the plane's direct label and where it sits; the three
// OBR-sized points sit close together, so their group is labelled once.
const VARIANTS = [
  { id: 'central_20', label: 'Main case, same 20 draws', story: STEP.margin, ring: true, lab: 'Main', pos: 'b' },
  { id: 'takeup', label: 'Every displaced worker’s benefit unit claims UC', lab: 'Full take-up', pos: 't' },
  { id: 'takeup_jsa', label: 'Plus 26 weeks of new-style JSA', lab: 'Plus JSA', pos: 't' },
  { id: 'wage_cuts', label: 'Wage cuts, same gross size', story: STEP.margin, lab: 'Wage cuts', pos: 'tl' },
  { id: 'obr', label: 'OBR-sized displacement', group: 'b' },
  { id: 'obr_takeup', label: 'OBR-sized, full UC take-up', group: 'b', lab: 'OBR-sized runs', pos: 'b' },
  { id: 'obr_takeup_jsa', label: 'OBR-sized, plus new-style JSA', group: 'b' },
];
export const VARIANT_ARROWS = [
  ['central_20', 'takeup'],
  ['takeup', 'takeup_jsa'],
  ['obr', 'obr_takeup'],
  ['obr_takeup', 'obr_takeup_jsa'],
];

function Variants() {
  const [ref, e] = useSeenBeat();
  const xs = VARIANTS.map((v) => ladder(v.id));
  const xMax = Math.max(...xs.map((r) => r.cost_bn)) * 1.08;
  const yMax = Math.max(...xs.map((r) => r.poverty_pp)) * 1.15;
  const row = (v) => {
    const r = ladder(v.id);
    return {
      id: v.id,
      tone: v.group ?? 'a',
      ring: v.ring,
      label: v.label,
      cells: v.story ? [{ span: 2, node: <StoryRef step={v.story} /> }, fmtPp(r.gini_pp)] : [fmtBn(r.cost_bn), fmtPp(r.poverty_pp), fmtPp(r.gini_pp)],
    };
  };
  return (
    <Card
      id="hh-ladder"
      icon="layers"
      title="Every variant of the shock"
      finding={takeupWords().long}
      unit="Cost, £bn a year, against absolute poverty, change. 20 paired draws each"
      download={{
        context: CTX,
        table: { columns: ['variant', 'draws', 'cost_bn', 'poverty_bhc_pp', 'gini_pp'], rows: D.ladder.map((r) => [r.label, r.draws, r.cost_bn, r.poverty_pp, r.gini_pp]) },
      }}
      foot={<Flag />}
      about={about({
        how: ['Take-up, JSA and wage cuts reuse the main-case seeds 0 to 19', 'Compare them with the main case on these draws, not the headline'],
        caveats: ['The OBR-sized runs are a smaller shock, not steps on the main-case ladder', `Sized to ${OBR_SCENARIO}`, ...takeupBoundWords()],
        sources: ['results/robustness/dividend_coverage_draws.csv (run central)', 'results/takeup/takeup_draws.csv', 'results/wage_cut/wage_cut_draws.csv (variant table3)', 'results/next_runs/obr_benchmark.json', <>26 weeks: the {ext(URLS.jsa, 'new-style JSA limit (GOV.UK)')}</>, <>OBR-sized: the study&rsquo;s conversion of {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}&rsquo;s unemployment rise</>],
      })}
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Replay onClick={e.replay} />
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise for each variant; arrows run from the main case to full take-up to JSA, within each group"
          points={VARIANTS.map((v) => ({ id: v.id, group: v.group, ring: v.ring, name: v.label, lab: v.lab, pos: v.pos, x: ladder(v.id).cost_bn, y: ladder(v.id).poverty_pp }))}
          arrows={VARIANT_ARROWS}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Absolute poverty before housing costs (BHC), change, pp"
          xTitle="Cost to the public finances, £bn a year"
        />
      </div>
      <PointList
        cols={['Cost', 'Poverty, pp', 'Gini']}
        rows={[
          ...VARIANTS.filter((v) => !v.group).map(row),
          {
            id: 'g-obr',
            group: (
              <>
                <b className="hh-group-name">A different, smaller shock:</b>{' '}
                <span data-input="">{fmtInputPct(OBR_RATE)}</span> of employees displaced, job loss alone
              </>
            ),
          },
          ...VARIANTS.filter((v) => v.group).map(row),
        ]}
      />
    </Card>
  );
}

// --- 3. Five rules: the same plane, 50 paired draws --------------------------
// Rule costs are printed in story step 5 (the exposure rule is the central
// case, step 1): positions here. Poverty and Gini by rule are printed here.
// The top-loaded extreme case runs off the cost scale: an arrow at the edge,
// its value printed there.
// Junior-tilted and exposure-based sit almost on one point: their labels
// go to opposite sides.
const RULES = [
  { id: 'uniform', label: 'Uniform', lab: 'Uniform', pos: 'b' },
  { id: 'junior', label: 'Junior-tilted (ages 16 to 24)', lab: 'Junior-tilted', pos: 'tl' },
  { id: 'exposure', label: 'In proportion to AI exposure (main)', ring: true, lab: 'AI exposure (main)', pos: 'br' },
  { id: 'compression', label: 'Expertise compression', lab: 'Compression', pos: 'l' },
];
function Rules() {
  const [ref, e] = useSeenBeat();
  const K = rule('klein_top_loaded');
  const xMax = Math.max(...RULES.map((r) => rule(r.id).cost_bn)) * 1.12;
  const yMax = Math.max(K.poverty_pp, ...RULES.map((r) => rule(r.id).poverty_pp)) * 1.12;
  return (
    <Card
      id="hh-rules"
      icon="users"
      title="Five rules for who loses the job"
      finding={rulesWords(D.rules)}
      unit={`Cost, £bn a year, against absolute poverty, change. ${rule('uniform').draws} paired draws each`}
      download={{
        context: CTX,
        table: { columns: ['rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'gini_pp'], rows: D.rules.map((r) => [r.label, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.gini_pp]) },
      }}
      about={about({
        how: ['Every rule displaces the same expected number of employees', 'Other wage and capital-income changes are the same; seeds are shared'],
        caveats: ['The rules are the study’s stylised designs', 'Junior-tilted: a higher chance for workers aged 16 to 24', 'Compression: doubled chances for top earners in exposed occupations', 'Top-loaded: displacement loaded on above-median earners', ...rulesReviewWords(D.rules)],
        sources: [`${D.rules[0].file}: exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp`],
      })}
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Replay onClick={e.replay} />
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise under each displacement rule; the top-loaded extreme case is off the cost scale"
          points={RULES.map((r) => ({ id: r.id, ring: r.ring, group: 'c', name: r.label, lab: r.lab, pos: r.pos, x: rule(r.id).cost_bn, y: rule(r.id).poverty_pp }))}
          off={{ y: K.poverty_pp, text: <>Top-loaded {fmtBn(K.cost_bn)}</> }}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Absolute poverty (BHC), change, pp"
          xTitle="Cost to the public finances, £bn a year"
        />
      </div>
      <PointList
        cols={['Cost', 'Poverty, pp', 'Gini']}
        wideFirst
        rows={[
          ...RULES.map((x) => {
            const r = rule(x.id);
            return {
              id: x.id,
              tone: 'c',
              ring: x.ring,
              label: x.label,
              // cost and poverty by rule are printed in the story (B10, round 2)
              cells: x.ring ? [{ span: 3, node: <StoryRef step={STEP.central} /> }] : [{ span: 2, node: <StoryRef step={STEP.rules} /> }, fmtPp(r.gini_pp)],
            };
          }),
          { id: 'klein_top_loaded', tone: 'off', label: 'Top-loaded extreme case', cells: [<span key="a" className="hh-muted">at the arrow</span>, fmtPp(K.poverty_pp), fmtPp(K.gini_pp)] },
        ]}
      />
    </Card>
  );
}

// --- 4. Cost per pound of earnings lost: stacked pence -----------------------
const PP_LABEL = {
  job_loss: 'Job loss',
  job_loss_takeup: 'Job loss, full Universal Credit (UC) take-up',
  job_loss_takeup_jsa: 'Job loss, plus new-style JSA',
};
function Pence({ parts }) {
  const lefts = parts.map((_, i) => parts.slice(0, i).reduce((a, [v]) => a + v, 0));
  return (
    <span className="hh-pence" aria-hidden="true">
      {parts.map(([v, cls], i) => (
        <span key={i} className={`hh-pence-seg ${cls}`} style={{ left: `${lefts[i]}%`, width: `${v}%`, transitionDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}
function PerPound() {
  const [ref, e] = useSeenBeat();
  const j20 = D.per_pound_20.job_loss;
  const w = perPound('wage_cuts');
  const er = D.per_pound_20.wage_cuts_employer_ni_p;
  const seed0 = ['job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'].map(perPound);
  return (
    <Card
      id="hh-per-pound"
      icon="banknote"
      title="Cost per pound lost"
      finding="On one draw, full take-up and Jobseeker’s Allowance (JSA) raise the cost of a pound lost"
      unit={
        <>
          Pence per <span data-axis="">£1</span> of gross earnings removed, each margin alone
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
      foot={<Flag />}
      about={about({
        how: ['Total: the fall in the government balance, employer NI included', 'Of which household: the part tax, employee NI and benefits absorb', 'Job loss: no household split on the 20 draws (grey)'],
        sources: [`${j20.file} (run channel_displacement)`, `${D.per_pound_20.file} (variant cut_only)`, `seed 0: ${perPound('job_loss').file}`, 'results/takeup/takeup_draws.csv (scenario disp_only)'],
      })}
    >
      <p className="p3-legend hh-legend" aria-hidden="true">
        <span className="hh-leg">
          <span className="p3-swatch p3-fill-hh" /> Tax, employee NI and benefits
        </span>
        <span className="hh-leg">
          <span className="p3-swatch p3-fill-gov" /> The rest of the total: employer NI and other items, not split in the data
        </span>
      </p>
      <div className={entryClass(e, 'hh-pp')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Job loss and wage cuts" x="Where each pound of lost gross pay goes, pence" />
        <div className="hh-pp-group">
          <p className="hh-pp-head">
            <span className="hh-pp-basis">{D.per_pound_20.draws} paired draws</span>
          </p>
          <div role="list" className="hh-rowlist">
            <div role="listitem" className="hh-pp-row" data-row="pp-job">
              <span className="hh-list-label">Job loss</span>
              <Pence parts={[[j20.government_p, 'p3-fill-ref']]} />
              <span className="hh-list-span">
                <StoryRef step={STEP.margin} />
              </span>
            </div>
            <div role="listitem" className="hh-pp-row" data-row="pp-cut">
              <span className="hh-list-label">Wage cuts</span>
              <Pence
                parts={[
                  [w.household_p, 'p3-fill-hh'],
                  [er, 'p3-fill-gov'],
                ]}
              />
              <span className="hh-list-span">
                <StoryRef step={STEP.margin} />
              </span>
            </div>
          </div>
        </div>
        <div className="hh-pp-group">
          <p className="hh-pp-head">
            <span className="hh-pp-basis">One draw (seed 0)</span>
            {/* the household part is a part of the total, not a second part
                beside it; the rest is drawn and named in the legend */}
            <span className="hh-pp-cols" aria-hidden="true">
              <span>Total</span>
              <span>Of which household</span>
            </span>
          </p>
          <div role="list" className="hh-rowlist">
            {seed0.map((r) => (
              <div role="listitem" key={r.id} className="hh-pp-row" data-row={`pp-${r.id}`}>
                <span className="hh-list-label">{PP_LABEL[r.id]}</span>{' '}
                <Pence
                  parts={[
                    [r.household_p, 'p3-fill-hh'],
                    [r.government_p - r.household_p, 'p3-fill-gov'],
                  ]}
                />
                {' '}
                <span className="hh-val">{fmtPence(r.government_p)}</span>{' '}
                <span className="hh-val hh-val-2">{fmtPence(r.household_p)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- 5. Who the displaced are (OBR-sized run) --------------------------------
// Three claim shares, each with its own base (not a funnel: the bases
// differ and 53% > 48%), three reason tiles (the
// groups overlap, so tiles, not a stack), and UC per person with a take-up
// toggle: the two values cross-fade in place, never tween.
export const UC_VIEWS = ['data', 'full'];
function Displaced() {
  const X = D.displaced;
  const [ref, e] = useSeenBeat();
  const [view, setView] = useState('data');
  // the UC capital limit, stated in the data as text ("16,000")
  const limit = Number(String(D.method.uc_capital_limit_gbp).replace(/,/g, ''));
  const max = Math.max(X.uc_per_displaced_takeup.value, X.uc_per_existing_unemployed.value) * 1.08;
  // the share whose take-up decision in the data is to claim, not receipt
  const stages = [
    ['claim_uc', 'would claim UC', X.claim_uc.value, 'of all benefit units with a displaced worker'],
    ['claim_uc_entitled', 'would claim', X.claim_uc_entitled.value, 'of those entitled to UC once displaced'],
  ];
  const reasons = [
    ['capital_over_limit', <>Capital above <span data-input="">{fmtGbp(limit)}</span>: no UC</>],
    ['other_earner', 'Another earner in the benefit unit'],
    ['homeowner', 'Own their home: no housing element'],
  ];
  return (
    <Card
      id="hh-displaced"
      icon="usersRound"
      title="Who the displaced are"
      finding="Capital, a working partner or a home each limit Universal Credit (UC) entitlement"
      unit="Benefit units with a displaced worker, in the OBR-sized run"
      download={{
        context: CTX,
        table: {
          columns: ['measure', 'value', 'unit'],
          rows: ['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner', 'uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'].map((k) => [X[k].label, X[k].value, X[k].unit]),
        },
      }}
      foot={<Flag />}
      about={about({
        caveats: ['Shares count benefit units, not persons', 'The groups overlap; the data give no cross-tabulation', 'Take-up flags: the dataset’s imputation, not DWP take-up statistics'],
        sources: [`${X.claim_uc.file} (diagnostics.obr, existing_unemployed)`, `UC per worker: ${X.uc_per_displaced.file}`, 'results/takeup/takeup_draws.csv', <>Capital limit: {ext(URLS.ucEligibility, 'UC eligibility (GOV.UK)')}</>],
      })}
    >
      <div className={entryClass(e, 'hh-disp')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Benefit units with a displaced worker" x="Share of those units, %" />
        <ul className="hh-funnel">
          {stages.map(([k, name, v, base], i) => (
            <li key={k} className="hh-funnel-row" data-row={k}>
              <span className="hh-funnel-bar" style={{ width: `${v}%`, transitionDelay: `${i * 250}ms` }} />
              <span className="hh-funnel-text">
                <b>{fmtShare(v)}</b> {name}
                <span className="hh-muted"> ({base})</span>
              </span>
            </li>
          ))}
          <li className="hh-funnel-row is-compare" data-row="existing_unemployed_claim">
            <span className="hh-funnel-bar" style={{ width: `${X.existing_unemployed_claim.value}%`, transitionDelay: '500ms' }} />
            <span className="hh-funnel-text">
              <b>{fmtShare(X.existing_unemployed_claim.value)}</b> claim
              <span className="hh-muted"> (of entitled units with someone already unemployed)</span>
            </span>
          </li>
        </ul>
        <ul className="hh-reasons">
          {reasons.map(([k, text], i) => (
            <li key={k} className="hh-reason" data-row={k} style={{ '--d': `${900 + i * 120}ms` }}>
              <b>{fmtShare(X[k].value)}</b> <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="hh-uc">
          <div className="hh-uc-head">
            <p className="hh-uc-title">
              UC added in a year, per person
            </p>
            {/* the one on/off on the site (item-20-fable.md): full take-up
                on top of the data's take-up flags */}
            <button
              type="button"
              role="switch"
              aria-checked={view === 'full'}
              className="uc-switch"
              title="Every displaced worker’s benefit unit claims Universal Credit"
              onClick={() => setView(view === 'full' ? 'data' : 'full')}
            >
              <span className="uc-switch-track" aria-hidden="true">
                <span className="uc-switch-thumb" />
              </span>
              <span>Full take-up</span>
            </button>
          </div>
          <div role="list" className={`hh-uc-rows is-${view}`}>
            <div role="listitem" className="hh-uc-row" data-row="uc_per_displaced">
              <span className="hh-list-label">Per displaced worker</span>
              <span className="hh-uc-track">
                <span className="hh-uc-bar is-data" style={{ width: `${(X.uc_per_displaced.value / max) * 100}%` }} />
                <span className="hh-uc-bar is-full" style={{ width: `${(X.uc_per_displaced_takeup.value / max) * 100}%` }} />
              </span>
              <span className="hh-uc-vals">
                <span className="hh-val is-data">{fmtGbp(X.uc_per_displaced.value)}</span>{' '}
                <span className="hh-val is-full">{fmtGbp(X.uc_per_displaced_takeup.value)}</span>
              </span>
            </div>
            <div role="listitem" className="hh-uc-row" data-row="uc_per_existing_unemployed">
              <span className="hh-list-label">Per person already unemployed</span>{' '}
              <span className="hh-uc-track">
                <span className="hh-uc-bar is-ref" style={{ width: `${(X.uc_per_existing_unemployed.value / max) * 100}%` }} />
              </span>
              {' '}<span className="hh-val">{fmtGbp(X.uc_per_existing_unemployed.value)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- 6. Deciles under three rankings: three markers per decile ---------------
// Positions only: the HBAI values of deciles 2 to 10 and decile 1 under all
// three rankings are printed in story step 4. Decile 1 is grey with the
// caveat icon in every ranking.
const RANK_FILL = ['p3-fill-rank-1', 'p3-fill-rank-2', 'p3-fill-rank-3'];
const RANK_TEXT = ['is-rank-1', 'is-rank-2', 'is-rank-3'];
// short names for the direct labels; the key above gives them in full
const RANK_SHORT = { hbai: 'HBAI', pre_pension: 'Before pensions', hbai_excl_large_ppc: 'HBAI, no large pensions' };
// the decile whose three dots are named: the widest spread, decile 1 aside
const NAMED = (() => {
  const R = D.rankings;
  let best = 1;
  let w = -1;
  for (let i = 1; i < 10; i++) {
    const vs = R.map((r) => r.values[i]);
    const sp = Math.max(...vs) - Math.min(...vs);
    if (sp > w) {
      w = sp;
      best = i;
    }
  }
  return best;
})();
function Rankings() {
  const R = D.rankings;
  const [ref, e] = useSeenBeat();
  const all = R.flatMap((r) => r.values);
  const lo = Math.floor(Math.min(0, ...all));
  const hi = Math.ceil(Math.max(0, ...all));
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const tks = [];
  for (let t = lo; t <= hi; t += 1) tks.push(t);
  return (
    <Card
      id="hh-rankings"
      icon="bars"
      title="Deciles under three rankings"
      finding={rankingsWords(R)}
      unit={`Change in disposable income before housing costs, %, main case. ${D.deciles.draws} draws`}
      download={{
        context: CTX,
        table: { columns: ['decile', ...R.map((r) => r.id)], rows: Array.from({ length: 10 }, (_, i) => [i + 1, ...R.map((r) => r.values[i])]) },
      }}
      about={about({
        how: ['Each household weighted by its number of members', 'The rankings differ only in how households are placed in deciles'],
        caveats: ['Decile 1: some households make large pension contributions', 'They also receive capital income'],
        sources: ['results/appendix/decile_ranking_sensitivity.csv: disposable_change_pct'],
      })}
    >
      <p className="p3-legend hh-legend" aria-hidden="true">
        {R.map((r, i) => (
          <span key={r.id} className="hh-leg" title={/^HBAI\b/.test(r.label) ? 'HBAI: Households Below Average Income, the DWP’s official income measure' : undefined}>
            <span className={`p3-swatch ${RANK_FILL[i]}`} /> {r.label}
          </span>
        ))}
      </p>
      <div className={entryClass(e, 'hh-db')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Income decile, 1 = bottom" x="Change in disposable income before housing costs, %" reference="Zero line: no change" />
        <div className="hh-db-axis" aria-hidden="true" data-axis="">
          <span />
          <span className="hh-db-ticks">
            {tks.map((t) => (
              <span key={t} style={{ left: `${X(t)}%` }}>
                {signedTick(t)}%
              </span>
            ))}
          </span>
        </div>
        <div role="list" className="hh-rowlist">
          {Array.from({ length: 10 }, (_, i) => {
            const vs = R.map((r) => r.values[i]);
            const first = i === 0;
            const named = i === NAMED;
            // the named decile: the lowest and highest dots named beside
            // them, the middle one in a line under the row
            const order = named ? vs.map((v, k) => [v, k]).sort((a, b) => a[0] - b[0]) : [];
            return (
              <Fragment key={i}>
              <div role="listitem" className={`hh-db-row${first ? ' is-caveat' : ''}${named ? ' is-named' : ''}`} data-decile={i + 1} style={{ '--beat': `${(first ? 10 : i) * 60}ms` }}>
                <span className="hh-db-label">
                  {i === 0 ? '1 (bottom)' : i === 9 ? '10 (top)' : i + 1}
                </span>
                <span className="hh-db-track" aria-hidden="true">
                  <span className="hh-db-zero" style={{ left: `${X(0)}%` }} />
                  <span className="hh-db-line" style={{ left: `${X(Math.min(...vs))}%`, width: `${X(Math.max(...vs)) - X(Math.min(...vs))}%` }} />
                  {vs.map((v, k) => (
                    <span key={k} className={`hh-db-dot ${first ? 'p3-fill-muted' : RANK_FILL[k]}`} style={{ left: `${X(v)}%` }} />
                  ))}
                </span>
                {named ? (
                  <span className="hh-db-names" aria-hidden="true">
                    <span className={`hh-db-name is-left ${RANK_TEXT[order[0][1]]}`} style={{ right: `calc(${100 - X(order[0][0])}% + 9px)` }}>
                      {RANK_SHORT[R[order[0][1]].id] ?? R[order[0][1]].label}
                    </span>
                    <span className={`hh-db-name is-right ${RANK_TEXT[order[2][1]]}`} style={{ left: `calc(${X(order[2][0])}% + 9px)` }}>
                      {RANK_SHORT[R[order[2][1]].id] ?? R[order[2][1]].label}
                    </span>
                  </span>
                ) : null}
              </div>
              {named ? (
                <div className="hh-db-row hh-db-namerow" aria-hidden="true">
                  <span />
                  {/* desktop: the middle name only; a phone: all three,
                      stacked, each slid to stay inside the track */}
                  <span className="hh-db-track is-names">
                    {order.map(([v, k], j) => (
                      <span
                        key={k}
                        className={`hh-db-name is-under ${j === 1 ? 'is-mid' : 'is-extra'} ${RANK_TEXT[k]}`}
                        style={{ left: `${X(v)}%`, '--slide': `${-X(v)}%`, '--row': j }}
                      >
                        {RANK_SHORT[R[k].id] ?? R[k].label}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
      <p className="hh-note" data-caveat="bottom-decile">
        Decile 1, grey: its direction depends on how households are ranked, so no conclusion is drawn. <StoryRef step={STEP.deciles} />
      </p>
    </Card>
  );
}

// --- 7. Policy responses (50 draws): three cards, the study's order ----------
// Each card: a cost bar on one shared scale, and the poverty and Gini
// changes. Wage insurance under the two other displacement rules is a strip
// on its card. No ranking words; the order is the study's.
const FAMILY = { junior: 'Junior-tilted displacement', uniform: 'Uniform displacement' };
function Policy() {
  const P = D.policy;
  const [ref, e] = useSeenBeat();
  const max = Math.max(...P.rows.map((r) => r.cost_bn)) * 1.05;
  const main = P.rows.filter((r) => r.family === 'exposure');
  const others = (reform) => P.rows.filter((r) => r.reform === reform && r.family !== 'exposure');
  const nums = (r) => (
    <>
      <span className="hh-pol-num">
        <span className="hh-muted">Cost</span> {fmtBn(r.cost_bn)}
      </span>{' '}
      <span className="hh-pol-num">
        <span className="hh-muted">Poverty</span> {fmtPp(r.poverty_pp)}
      </span>{' '}
      <span className="hh-pol-num">
        <span className="hh-muted">Gini</span> {fmtPp(r.gini_pp)}
      </span>
    </>
  );
  return (
    <Card
      id="hh-policy"
      icon="handshake"
      title="Policy responses"
      finding={policyWords(main)}
      unit={`Cost £bn a year; poverty and Gini changes, against the shocked world. ${P.rows[0].draws} draws`}
      download={{
        context: CTX,
        table: {
          columns: ['reform', 'displacement_rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'poverty_sd_pp', 'gini_pp'],
          rows: P.rows.map((r) => [r.reform, r.family, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.poverty_sd_pp, r.gini_pp]),
        },
      }}
      about={about({
        how: ['Each response simulated on top of the main-case shock', 'Poverty lines held at their shocked values', 'Wage insurance: an untaxed transfer, so its cost is gross', 'The two UC changes: costs net of withdrawal elsewhere'],
        caveats: ['The designs are the study’s own; no external source', 'The designs differ in aim, take-up and administration', 'Compared on cost, poverty and the Gini only, not ranked'],
        sources: [`${P.file}: ${P.key}`],
      })}
    >
      <div className={entryClass(e, 'hh-pol')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="One policy response each" x="Cost to the public finances, £bn a year" />
        <ul className="hh-pol-cards">
          {main.map((r, i) => {
            return (
              <li key={r.id} className="hh-pol-card" data-row={r.id}>
                <p className="hh-pol-title">
                  <span data-input="">{r.label}</span>
                </p>
                <span className="hh-pol-track" aria-hidden="true">
                  <span className="hh-pol-bar" style={{ width: `${(r.cost_bn / max) * 100}%`, transitionDelay: `${i * 200}ms` }} />
                </span>
                <p className="hh-pol-nums">{nums(r)}</p>
                {others(r.reform).length ? (
                  <ul className="hh-pol-sub">
                    {others(r.reform).map((o) => (
                      <li key={o.id} data-row={o.id}>
                        <span className="hh-pol-sub-label">
                          {FAMILY[o.family] ?? o.family}
                        </span>
                        <span className="hh-pol-nums">{nums(o)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
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

// The three findings of the lead, each a chip to its section.
export const FINDINGS = [
  { id: 'rules', anchor: 'hh-rules', title: 'Who loses the job', text: rulesCostWords(D.rules) },
  { id: 'margin', anchor: 'hh-ladder', title: 'Job loss vs wage cuts', text: marginWords() },
  { id: 'takeup', anchor: 'hh-ladder', title: 'Benefit take-up', text: takeupWords().short },
];

// The header: the question (the only heading, with the sources-and-notes
// icon: the paper, the housing-costs basis, the story's headlines), the
// model row (the household study's model line, item 22), the finding chips.
export default function HouseholdsExplore() {
  return (
    <div className="hh-page">
      <header className="hh-lead page-intro">
        <h2 className="hh-question page-q">
          <span>What moves the cost of AI job displacement, and who it falls on?</span>
          <PageNotes
            groups={[
              {
                title: 'About this page',
                notes: [
                  {
                    icon: 'source',
                    text: (
                      <a href={PAPER} target="_blank" rel="noreferrer">
                        {STATUS === 'provisional' ? 'The draft paper (PDF)' : 'The paper (PDF)'}
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
        <ul className="hh-findings">
          {FINDINGS.map((f) => (
            <li key={f.id}>
              <NavLink tab="explore" sub="households" anchor={f.anchor} className="hh-finding">
                <span>
                  <b>{f.title}</b> {f.text}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </header>
      <SectionHeading id="hh-cost" icon="landmark" title="What moves the cost">
        The cost by line, and how variants and rules move it
      </SectionHeading>
      {/* the two shorter cards share a row, then the two planes */}
      <div className="card-grid cols-2 hh-cost-grid">
        <CostByTax />
        <PerPound />
        <Variants />
        <Rules />
      </div>
      <SectionHeading id="hh-who" icon="usersRound" title="Who it falls on">
        Where a lost pound goes, who the displaced are, and deciles under three rankings
      </SectionHeading>
      <p className="hh-note hh-story-link" id="hh-absorb">
        Where a lost pound of earnings goes, by decile (an OBR-sized run):{' '}
        <NavLink tab="story" anchor="p3-pound">
          in the Story, part 3
        </NavLink>
        .
      </p>
      <div className="card-grid cols-2">
        <Displaced />
        <Rankings />
      </div>
      <SectionHeading id="hh-responses" icon="handshake" title="Policy responses">
        Three stylised additions, simulated on top of the main-case shock
      </SectionHeading>
      <Policy />
      <DetailLink />
    </div>
  );
}
