'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Disclosure from '@/components/ab/Disclosure.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import Card, { SectionHeading } from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';
import { AxisTitles } from '@/tabs/explore/axes.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { URLS, efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { D, MODEL_YEAR, OBR_SCENARIO, OutsideRebuildFlag, PAPER_URL, PR_URL, Replay, entryClass, ladder, perPound, rule, useSeenBeat } from '@/tabs/story/part3/shared.jsx';
import { fmtBn, fmtGbp, fmtInputPct, fmtPence, fmtPp, fmtShare } from '@/tabs/story/part3/format.js';
import { Chip, Notes, Plane, PointList, STEP, StoryRef, signedTick } from './charts.jsx';

// Explore > Households: the uk-ai-study detail (PolicyEngine/uk-ai-study
// PR #18), apart from story part 3. "Provisional" is said once, in the
// lead. Every figure is printed once across part 3 and this page: a value
// the story prints is drawn here as a position, and its row carries one
// link to the step. Every chart has a CSV download (Card's DownloadMenu);
// its notes are an icon row of short items. Figures from
// data/aiStudy2425.json (docs/story/part3-notes.md); the two models are never
// drawn together here.

// The study's model year and status come from the data file (the refreshed
// file carries model_year_label, provisional and status; the older one only
// the shared MODEL_YEAR).
const YEAR = D.model_year_label ?? MODEL_YEAR;
const STATUS = D.provisional === false ? (D.status ?? null) : 'provisional';
const PR = D.source.pr_url ?? PR_URL;
const PAPER = D.source.paper_url ?? PAPER_URL;
const CTX = `uk-ai-study PR #${D.source.pr}${STATUS ? ` (${STATUS})` : ''}, ${D.source.dataset}, ${YEAR}, commit ${D.source.commit.slice(0, 7)}`;
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
export function rankingsWords(R) {
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const same = [];
  const flip = [];
  for (let i = 0; i < 10; i += 1) (new Set(R.map((r) => sgn(r.values[i]))).size === 1 ? same : flip).push(i + 1);
  if (!flip.length) return 'Every decile has the same sign under all three rankings';
  return `Deciles ${span(same)} have the same sign under all three; ${flip.length === 1 ? `decile ${flip[0]} changes` : `deciles ${span(flip)} change`} sign`;
}
// Cost lines: lost income tax and NI against the higher tax on dividends
// and savings, from the cost components.
export function costWords(rows) {
  const v = (id) => rows.find((r) => r.id === id)?.cost_bn ?? 0;
  const lost = v('other_income_tax') + v('employer_ni') + v('employee_ni');
  const gained = -(v('dividend_tax') + v('savings_tax'));
  return lost > gained ? 'Lost income tax and NI outweigh higher tax on dividends and savings' : 'Higher tax on dividends and savings outweighs lost income tax and NI';
}
// Full take-up and JSA against the central case on the same draws.
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
  return all ? 'Each response lowers poverty and the Gini; costs and reach differ' : 'The responses differ in cost and in what they do to poverty and the Gini';
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
  if (atLeast === others.length) return `${lead}, by at least as much as centrally under the other ${others.length}`;
  return `${lead}; ${atLeast} of the other ${others.length} raise it at least as much as the central rule`;
}
const bnSmall = (v) => (Math.abs(v) < 0.05 ? (v < 0 ? 'a saving under £0.1bn' : 'under £0.1bn') : fmtBn(v));
const OBR_RATE = D.sankey.displacement_rate_pct;
const I = ({ c, size = 14 }) => <Icon name={iconFor(c) ?? c} size={size} />;
// a line with a leading icon (Card's finding and unit lines)
const Line = ({ icon, children }) => (
  <>
    <I c={icon} /> {children}
  </>
);

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
      finding={<Line icon="tax">{costWords(C.rows)}</Line>}
      unit={
        <>
          <Line icon="measure">Change in each line, £bn a year; positive is a cost</Line> <Chip icon="draws">{C.draws} draws</Chip>
        </>
      }
      download={{ context: CTX, table: { columns: ['line', 'cost_bn_mean', 'cost_bn_sd'], rows: C.rows.map((r) => [r.label, r.cost_bn, r.sd_bn]) } }}
      foot={
        <Notes
          how={['Each line: that item of the government balance, baseline to shocked', 'Averaged over the draws; the lines sum to the central cost']}
          sources={[`${C.file}: ${C.key}`]}
        />
      }
    >
      <div className={entryClass(e, 'hh-wf')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Rows: tax and benefit lines" x="Bars: change in each line, £bn a year, stacked from zero" reference="Zero line: no change" />
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
              <b>Net: the central cost</b>
            </span>
            {bar(net.from, net.to, 'is-net', rows.length)}
            <span className="hh-wf-ref">
              <StoryRef step={STEP.central} />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// --- 2. Every variant: one cost × poverty plane ------------------------------
// The central case on 20 draws and wage cuts (their cost and poverty
// figures are printed in story step 6: positions here), full take-up and JSA
// (printed here: their home since round 1 moved them out of the story),
// and the OBR-sized runs, a different, smaller shock in their own group and
// colour (printed here). Arrows: central to full take-up to JSA, within
// each group; none joins the groups.
const VARIANTS = [
  { id: 'central_20', icon: 'jobLoss', label: 'Central case, the same 20 draws', story: STEP.margin, ring: true },
  { id: 'takeup', icon: 'takeUp', label: 'Every displaced worker’s benefit unit claims UC' },
  { id: 'takeup_jsa', icon: 'benefits', label: 'Plus 26 weeks of new-style JSA' },
  { id: 'wage_cuts', icon: 'wageCut', label: 'Wage cuts of the same gross size', story: STEP.margin },
  { id: 'obr', icon: 'jobLoss', label: 'OBR-sized displacement', group: 'b' },
  { id: 'obr_takeup', icon: 'takeUp', label: 'OBR-sized, full UC take-up', group: 'b' },
  { id: 'obr_takeup_jsa', icon: 'benefits', label: 'OBR-sized, plus new-style JSA', group: 'b' },
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
      icon: v.icon,
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
      finding={<Line icon="takeUp">{takeupWords().long}</Line>}
      unit={
        <>
          <Line icon="measure">Cost, £bn a year, against absolute poverty, change</Line> <Chip icon="draws">20 paired draws each</Chip>
        </>
      }
      download={{
        context: CTX,
        table: { columns: ['variant', 'draws', 'cost_bn', 'poverty_bhc_pp', 'gini_pp'], rows: D.ladder.map((r) => [r.label, r.draws, r.cost_bn, r.poverty_pp, r.gini_pp]) },
      }}
      foot={
        <>
          <Flag />
          <Notes
            how={['Take-up, JSA and wage cuts reuse the central seeds 0 to 19', 'Compare them with the central case on these draws, not the headline']}
            caveats={['The OBR-sized runs are a smaller shock, not steps on the central ladder', `Sized to ${OBR_SCENARIO}`, ...takeupBoundWords()]}
            sources={['results/robustness/dividend_coverage_draws.csv (run central)', 'results/takeup/takeup_draws.csv', 'results/wage_cut/wage_cut_draws.csv (variant table3)', 'results/next_runs/obr_benchmark.json', <>26 weeks: the {ext(URLS.jsa, 'new-style JSA limit (GOV.UK)')}</>, <>OBR-sized: the study&rsquo;s conversion of {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}&rsquo;s unemployment rise</>]}
          />
        </>
      }
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Replay onClick={e.replay} />
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise for each variant; arrows run from the central case to full take-up to JSA, within each group"
          points={VARIANTS.map((v) => ({ id: v.id, icon: v.icon, group: v.group, ring: v.ring, name: v.label, x: ladder(v.id).cost_bn, y: ladder(v.id).poverty_pp }))}
          arrows={VARIANT_ARROWS}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Absolute poverty (BHC), change, pp"
          xTitle="Exchequer cost, £bn a year"
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
                <Chip icon="limit" tone="b">
                  A different, smaller shock
                </Chip>{' '}
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
// The top-loaded stress test runs off the cost scale: an arrow at the edge,
// its value printed there.
const RULES = [
  { id: 'uniform', icon: 'draws', label: 'Uniform' },
  { id: 'junior', icon: 'age', label: 'Junior-tilted (ages 16 to 24)' },
  { id: 'exposure', icon: 'ai', label: 'In proportion to AI exposure (central)', ring: true },
  { id: 'compression', icon: 'pay', label: 'Expertise compression' },
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
      finding={<Line icon="poverty">{rulesWords(D.rules)}</Line>}
      unit={
        <>
          <Line icon="measure">Cost, £bn a year, against absolute poverty, change</Line> <Chip icon="draws">{rule('uniform').draws} paired draws each</Chip>
        </>
      }
      download={{
        context: CTX,
        table: { columns: ['rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'gini_pp'], rows: D.rules.map((r) => [r.label, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.gini_pp]) },
      }}
      foot={
        <Notes
          how={['Every rule displaces the same expected number of employees', 'Other wage and capital-income changes are the same; seeds are shared']}
          caveats={['The rules are the study’s stylised designs', 'Junior-tilted: a higher chance for workers aged 16 to 24', 'Compression: doubled chances for top earners in exposed occupations', 'Top-loaded: displacement loaded on above-median earners', ...rulesReviewWords(D.rules)]}
          sources={[`${D.rules[0].file}: exchequer_cost_bn, poverty_change_bhc_pp, gini_change_pp`]}
        />
      }
    >
      <div className={entryClass(e, 'hh-plane-wrap')} ref={ref}>
        <Replay onClick={e.replay} />
        <Plane
          on={e.on}
          label="Scatter: cost against the poverty rise under each displacement rule; the top-loaded stress test is off the cost scale"
          points={RULES.map((r) => ({ id: r.id, icon: r.icon, ring: r.ring, group: 'c', name: r.label, x: rule(r.id).cost_bn, y: rule(r.id).poverty_pp }))}
          off={{ y: K.poverty_pp, text: <>Top-loaded {fmtBn(K.cost_bn)}</> }}
          xMax={xMax}
          yMax={yMax}
          xUnit={(t) => `£${t}bn`}
          yUnit="pp"
          yTitle="Absolute poverty (BHC), change, pp"
          xTitle="Exchequer cost, £bn a year"
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
              icon: x.icon,
              tone: 'c',
              ring: x.ring,
              label: x.label,
              cells: x.ring ? [{ span: 3, node: <StoryRef step={STEP.central} /> }] : [{ span: 1, node: <StoryRef step={STEP.rules} /> }, fmtPp(r.poverty_pp), fmtPp(r.gini_pp)],
            };
          }),
          { id: 'klein_top_loaded', icon: 'limit', tone: 'off', label: 'Top-loaded stress test', cells: [<span key="a" className="hh-muted">at the arrow</span>, fmtPp(K.poverty_pp), fmtPp(K.gini_pp)] },
        ]}
      />
    </Card>
  );
}

// --- 4. Cost per pound of earnings lost: stacked pence -----------------------
const PP_LABEL = {
  job_loss: 'Job loss',
  job_loss_takeup: 'Job loss, full UC take-up',
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
      finding={<Line icon="takeUp">On one draw, full take-up and JSA raise the cost of a pound lost</Line>}
      unit={
        <>
          <Line icon="measure">
            Pence per <span data-axis="">£1</span> of gross earnings removed, each margin alone
          </Line>
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
      foot={
        <>
          <Flag />
          <Notes
            how={['Government: the fall in the government balance, employer NI included', 'Household: the part tax, employee NI and benefits absorb']}
            sources={[`${j20.file} (run channel_displacement)`, `${D.per_pound_20.file} (variant cut_only)`, `seed 0: ${perPound('job_loss').file}`, 'results/takeup/takeup_draws.csv (scenario disp_only)']}
          />
        </>
      }
    >
      <p className="p3-legend hh-legend" aria-hidden="true">
        <span className="hh-leg">
          <span className="p3-swatch p3-fill-hh" /> Tax, employee NI and benefits
        </span>
        <span className="hh-leg">
          <span className="p3-swatch p3-fill-gov" /> Employer NI and the rest
        </span>
      </p>
      <div className={entryClass(e, 'hh-pp')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Rows: job loss and wage cuts" x="Bar: where each pound of lost gross pay goes, pence" />
        <div className="hh-pp-group">
          <p className="hh-pp-head">
            <Chip icon="draws">{D.per_pound_20.draws} paired draws</Chip>
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
          <p className="hh-note">
            <I c="caveat" size={13} /> Job loss: no household split on these draws (grey)
          </p>
        </div>
        <div className="hh-pp-group">
          <p className="hh-pp-head">
            <Chip icon="draws">one draw (seed 0)</Chip>
            <span className="hh-pp-cols" aria-hidden="true">
              <span>Government</span>
              <span>Household</span>
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
// A funnel of claims (each stage names its base), three reason tiles (the
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
  const key = (ev) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) {
      ev.preventDefault();
      setView(view === 'data' ? 'full' : 'data');
    }
  };
  const stages = [
    ['all', 'Benefit units with a displaced worker', 100, null],
    ['claim_uc', 'Claim UC, with the data’s take-up flags', X.claim_uc.value, 'of all of them'],
    ['claim_uc_entitled', 'Claim, among those entitled once displaced', X.claim_uc_entitled.value, 'of the entitled'],
  ];
  const reasons = [
    ['capital_over_limit', 'piggy', <>Capital above <span data-input="">{fmtGbp(limit)}</span>: no UC</>],
    ['other_earner', 'users', 'Another earner in the benefit unit'],
    ['homeowner', 'home', 'Own their home: no housing element'],
  ];
  return (
    <Card
      id="hh-displaced"
      icon="usersRound"
      title="Who the displaced are"
      finding={<Line icon="benefits">Capital, a working partner or a home each limit UC entitlement</Line>}
      unit={
        <>
          <Line icon="households">Benefit units with a displaced worker</Line> <Chip icon="limit" tone="b">OBR-sized run</Chip>
        </>
      }
      download={{
        context: CTX,
        table: {
          columns: ['measure', 'value', 'unit'],
          rows: ['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner', 'uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'].map((k) => [X[k].label, X[k].value, X[k].unit]),
        },
      }}
      foot={
        <>
          <Flag />
          <Notes
            caveats={['Shares count benefit units, not persons', 'The groups overlap; the data give no cross-tabulation', 'Take-up flags: the dataset’s imputation, not DWP take-up statistics']}
            sources={[`${X.claim_uc.file} (diagnostics.obr, existing_unemployed)`, `UC per worker: ${X.uc_per_displaced.file}`, 'results/takeup/takeup_draws.csv', <>Capital limit: {ext(URLS.ucEligibility, 'UC eligibility (GOV.UK)')}</>]}
          />
        </>
      }
    >
      <div className={entryClass(e, 'hh-disp')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Rows: benefit units with a displaced worker" x="Bar: share of those units, %" />
        <ol className="hh-funnel">
          {stages.map(([k, name, v, base], i) => (
            <li key={k} className="hh-funnel-row" data-row={k}>
              <span className="hh-funnel-bar" style={{ width: `${v}%`, transitionDelay: `${i * 250}ms` }} />
              <span className="hh-funnel-text">
                {k === 'all' ? <I c="households" size={13} /> : <I c="takeUp" size={13} />}
                {base ? <b>{fmtShare(v)}</b> : null} {name}
                {base ? <span className="hh-muted"> ({base})</span> : null}
              </span>
            </li>
          ))}
          <li className="hh-funnel-row is-compare" data-row="existing_unemployed_claim">
            <span className="hh-funnel-bar" style={{ width: `${X.existing_unemployed_claim.value}%`, transitionDelay: '750ms' }} />
            <span className="hh-funnel-text">
              <I c="compare" size={13} />
              <b>{fmtShare(X.existing_unemployed_claim.value)}</b> of entitled units already unemployed claim
            </span>
          </li>
        </ol>
        <ul className="hh-reasons">
          {reasons.map(([k, icon, text], i) => (
            <li key={k} className="hh-reason" data-row={k} style={{ '--d': `${900 + i * 120}ms` }}>
              <Icon name={icon} size={20} />
              <b>{fmtShare(X[k].value)}</b> <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="hh-uc">
          <div className="hh-uc-head">
            <p className="hh-uc-title">
              <I c="benefits" /> UC added in a year, per person
            </p>
            <span className="p3-switch" role="radiogroup" aria-label="UC take-up" onKeyDown={key}>
              {[
                ['data', 'Take-up as in the data'],
                ['full', 'Full take-up'],
              ].map(([k, name]) => (
                <button key={k} type="button" role="radio" aria-checked={view === k} tabIndex={view === k ? 0 : -1} className={view === k ? 'is-on' : ''} onClick={() => setView(k)}>
                  {name}
                </button>
              ))}
            </span>
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
      finding={<Line icon="deciles">{rankingsWords(R)}</Line>}
      unit={
        <>
          <Line icon="measure">Change in disposable income before housing costs, %, central case</Line> <Chip icon="draws">{D.deciles.draws} draws</Chip>
        </>
      }
      download={{
        context: CTX,
        table: { columns: ['decile', ...R.map((r) => r.id)], rows: Array.from({ length: 10 }, (_, i) => [i + 1, ...R.map((r) => r.values[i])]) },
      }}
      foot={
        <Notes
          how={['Each household weighted by its number of members', 'The rankings differ only in how households are placed in deciles']}
          caveats={['Decile 1: some households make large pension contributions', 'They also receive capital income; the sign depends on the ranking']}
          sources={['results/appendix/decile_ranking_sensitivity.csv: disposable_change_pct']}
        />
      }
    >
      <p className="p3-legend hh-legend" aria-hidden="true">
        {R.map((r, i) => (
          <span key={r.id} className="hh-leg">
            <span className={`p3-swatch ${RANK_FILL[i]}`} /> {r.label}
          </span>
        ))}
      </p>
      <div className={entryClass(e, 'hh-db')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Rows: income decile, 1 = bottom" x="Change in disposable income before housing costs, %" reference="Zero line: no change" />
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
            return (
              <div role="listitem" key={i} className={`hh-db-row${first ? ' is-caveat' : ''}`} data-decile={i + 1} style={{ '--beat': `${(first ? 10 : i) * 60}ms` }}>
                <span className="hh-db-label">
                  {first ? <I c="caveat" size={12} /> : null}
                  {i === 0 ? '1 (bottom)' : i === 9 ? '10 (top)' : i + 1}
                </span>
                <span className="hh-db-track" aria-hidden="true">
                  <span className="hh-db-zero" style={{ left: `${X(0)}%` }} />
                  <span className="hh-db-line" style={{ left: `${X(Math.min(...vs))}%`, width: `${X(Math.max(...vs)) - X(Math.min(...vs))}%` }} />
                  {vs.map((v, k) => (
                    <span key={k} className={`hh-db-dot ${first ? 'p3-fill-muted' : RANK_FILL[k]}`} style={{ left: `${X(v)}%` }} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <Items
        className="hh-items"
        items={[
          { icon: 'caveat', text: <span data-caveat="bottom-decile">Decile 1, grey: its sign depends on the ranking; not a finding</span> },
          { icon: 'link', text: <StoryRef step={STEP.deciles} /> },
        ]}
      />
    </Card>
  );
}

// --- 7. Policy responses (50 draws): three cards, the study's order ----------
// Each card: a cost bar on one shared scale, and the poverty and Gini
// changes. Wage insurance under the two other displacement rules is a strip
// on its card. No ranking words; the order is the study's.
const POLICY_ICON = { R1_wage_insurance: 'shield', R2_uc_circuit_breaker: 'plus', R3_cap_suspension_taper_cut: 'sliders' };
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
        <I c="cost" size={13} /> {fmtBn(r.cost_bn)}
      </span>{' '}
      <span className="hh-pol-num">
        <I c="poverty" size={13} /> {fmtPp(r.poverty_pp)}
      </span>{' '}
      <span className="hh-pol-num">
        <I c="inequality" size={13} /> {fmtPp(r.gini_pp)}
      </span>
    </>
  );
  return (
    <Card
      id="hh-policy"
      icon="handshake"
      title="Policy responses"
      finding={<Line icon="poverty">{policyWords(main)}</Line>}
      unit={
        <>
          <Line icon="measure">Cost £bn a year; poverty and Gini changes, against the shocked world</Line> <Chip icon="draws">{P.rows[0].draws} draws</Chip>
        </>
      }
      download={{
        context: CTX,
        table: {
          columns: ['reform', 'displacement_rule', 'draws', 'cost_bn', 'cost_sd_bn', 'poverty_bhc_pp', 'poverty_sd_pp', 'gini_pp'],
          rows: P.rows.map((r) => [r.reform, r.family, r.draws, r.cost_bn, r.cost_sd_bn, r.poverty_pp, r.poverty_sd_pp, r.gini_pp]),
        },
      }}
      foot={
        <Notes
          how={['Each response simulated on top of the central shock', 'Poverty lines held at their shocked values', 'Wage insurance: an untaxed transfer, so its cost is gross', 'The two UC changes: costs net of withdrawal elsewhere']}
          caveats={['The designs are the study’s own; no external source', 'The designs differ in aim, take-up and administration', 'Compared on cost, poverty and the Gini only, not ranked']}
          sources={[`${P.file}: ${P.key}`]}
        />
      }
    >
      <div className={entryClass(e, 'hh-pol')} ref={ref}>
        <Replay onClick={e.replay} />
        <AxisTitles y="Cards: one policy response each" x="Bar: Exchequer cost, £bn a year" />
        <ul className="hh-pol-cards">
          {main.map((r, i) => {
            return (
              <li key={r.id} className="hh-pol-card" data-row={r.id}>
                <p className="hh-pol-title">
                  <Icon name={POLICY_ICON[r.reform]} size={18} />
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
                          <I c="scenario" size={12} /> {FAMILY[o.family] ?? o.family}
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
const FILES = [
  ['The central case', 'results/robustness/central_monte_carlo.json'],
  ['Cost by tax and benefit', D.cost_components.file],
  ['Channels', D.channels.file],
  ['Take-up and JSA', 'results/takeup/takeup_draws.csv, results/takeup/takeup_runs.json'],
  ['Wage cuts', 'results/wage_cut/wage_cut_draws.csv'],
  ['OBR-sized runs and the Sankey', 'results/next_runs/obr_benchmark.json, results/next_runs/obr_benchmark_draws.csv, results/next_runs/obr_household_deciles.csv'],
  ['Displacement rules', D.rules[0].file],
  ['Deciles', 'results/appendix/decomposition_ci.csv, results/appendix/decile_ranking_sensitivity.csv'],
  ['Break-evens', 'results/robustness/survivor_wage_grid.csv, results/next_runs/capital_variants_draws.csv, results/robustness/duration_takeup_sensitivity.json'],
  ['Policy responses', D.policy.file],
];

function Sources() {
  return (
    <Disclosure title="Detail and sources" preview="Result files, commit, how the page is built">
      <div className="hh-sources">
        <Items
          items={[
            { icon: 'source', text: <>Read from the study’s committed result files, commit <a href={`https://github.com/${D.source.repo}/tree/${D.source.commit}`} target="_blank" rel="noreferrer"><code>{D.source.commit.slice(0, 7)}</code></a></> },
            { icon: 'check', text: <>Each checked against the paper by <code>build_ai_study_data.py</code></> },
          ]}
        />
        <ul data-reference="">
          {FILES.map(([what, f]) => (
            <li key={what}>
              <b>{what}:</b> {linkAiFiles(f)}
            </li>
          ))}
        </ul>
        <p className="hh-links">
          <a href={PAPER} target="_blank" rel="noreferrer">
            <I c="source" /> {STATUS === 'provisional' ? 'The draft paper (PDF)' : 'The paper (PDF)'}
          </a>
          <a href={PR} target="_blank" rel="noreferrer">
            <I c="code" /> uk-ai-study PR #{D.source.pr}
          </a>
          <NavLink tab="method" sub="households">
            <I c="model" /> Household method
          </NavLink>
        </p>
      </div>
    </Disclosure>
  );
}

// The three findings of the lead, each a chip to its section.
export const FINDINGS = [
  { id: 'rules', anchor: 'hh-rules', icon: 'scenario', title: 'Who loses the job', text: rulesCostWords(D.rules) },
  { id: 'margin', anchor: 'hh-ladder', icon: 'wageCut', title: 'Job loss vs wage cuts', text: marginWords() },
  { id: 'takeup', anchor: 'hh-ladder', icon: 'takeUp', title: 'Benefit take-up', text: takeupWords().short },
];

export default function HouseholdsExplore() {
  return (
    <div className="hh-page">
      <header className="hh-lead">
        <p className="hh-question page-q">
          <Icon name="usersRound" size={18} />
          <span>What moves the cost of AI job displacement, and who it falls on?</span>
        </p>
        <ul className="hh-findings">
          {FINDINGS.map((f) => (
            <li key={f.id}>
              <NavLink tab="explore" sub="households" anchor={f.anchor} className="hh-finding">
                <I c={f.icon} size={16} />
                <span>
                  <b>{f.title}</b> {f.text}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="hh-lead-row">
          {STATUS === 'provisional' ? (
            <Notice>
              <I c="provisional" size={13} /> Provisional
            </Notice>
          ) : null}
          <a className="hh-chip is-link" href={URLS.hbai} target="_blank" rel="noreferrer" title="Every poverty figure on this page is before housing costs (BHC), this dashboard’s default basis; DWP's HBAI publishes both. Absolute poverty: the line is held at its baseline value">
            <I c="poverty" size={13} /> Poverty: before housing costs (default)
          </a>
          <NavLink tab="story" anchor="story-part-3" className="hh-chip is-link">
            <I c="link" size={13} /> Headlines in story part 3
          </NavLink>
        </div>
      </header>
      <SectionHeading id="hh-cost" icon="landmark" title="What moves the cost">
        <I c="cost" /> The cost by line, and how variants and rules move it
      </SectionHeading>
      {/* the two shorter cards share a row, then the two planes */}
      <div className="card-grid cols-2 hh-cost-grid">
        <CostByTax />
        <PerPound />
        <Variants />
        <Rules />
      </div>
      <SectionHeading id="hh-who" icon="usersRound" title="Who it falls on">
        <I c="households" /> Who the displaced are, and deciles under three rankings
      </SectionHeading>
      <div className="card-grid cols-2">
        <Displaced />
        <Rankings />
      </div>
      <SectionHeading id="hh-responses" icon="handshake" title="Policy responses">
        <I c="benefits" /> Three stylised additions, simulated on top of the central shock
      </SectionHeading>
      <Policy />
      <Sources />
    </div>
  );
}
