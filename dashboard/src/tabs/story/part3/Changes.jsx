'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPct1, fmtPctSigned0, fmtPctSigned1, fmtPence, fmtPenceRange, fmtPp } from './format.js';
import { AxisTitle, D, FigureHead, Key, MarkProvider, OutsideRebuildFlag, Source, entryClass, ladder, perPound, rule, useBeat, asLines } from './shared.jsx';
import { Ref } from './sources.jsx';

// What changes the answer (round 2): one scene in place of three (who loses
// the job, job loss against wage cuts, what moves the cost; results.tex,
// "Who loses the job", "How the earnings loss arrives" and "What moves the
// central cost"). One figure with three panels on one grid cell: the panel
// shown is a pure function of the active step (graphic(i)), never an effect
// of a step change, so a reader who lands on a step, by a link, an instant
// jump or a reload, sees its panel at once. Every panel stays mounted (the
// inactive ones transparent and inert), so each figure is in the DOM once;
// on phones (the figure drawn once) the panels stack, all shown.
//
// Homes: each rule's cost (the exposure rule's is the central case's, step
// 1: restated here as an axis label), the pence per pound and the 20-draw
// costs and poverty rises of the two margins, and the break-evens. Each
// rule's poverty rise has its home on Explore > Households (position only
// here, a read-out on hover or focus).

// ---- panel A: four stylised rules (50 paired draws) -----------------------
const RULES = [
  { id: 'uniform', label: 'Uniform: every employee equally likely' },
  { id: 'junior', label: 'Tilted towards workers aged 16 to 24, after ', ref: 'klein' },
  { id: 'exposure', label: 'In proportion to AI exposure: the central case', central: true },
  { id: 'compression', label: 'Expertise compression (the study’s rule, after ', close: '): exposed higher earners', ref: 'autor' },
];
const NAME = { uniform: 'Uniform', junior: 'Junior-tilted', exposure: 'Exposure-based', compression: 'Expertise-compression' };
// Both rule axes start at zero: the cost differs about fivefold across
// rules while the poverty rise hardly moves.
const MAXC = Math.max(...RULES.map((r) => rule(r.id).cost_bn)) * 1.12;
const MAXP = Math.max(...RULES.map((r) => rule(r.id).poverty_pp)) * 1.12;

// The rules' claims, from the data (part3.test.jsx).
export function rulesClaims() {
  const rs = RULES.map((r) => rule(r.id));
  const cheap = rs.reduce((a, b) => (b.cost_bn < a.cost_bn ? b : a));
  const spread = Math.max(...rs.map((r) => r.cost_bn)) - Math.min(...rs.map((r) => r.cost_bn));
  // "far less" when the cost varies, relative to its smallest value, at
  // least twice as much as the poverty rise does
  const rel = (xs) => (Math.max(...xs) - Math.min(...xs)) / Math.min(...xs);
  const costFar = rel(rs.map((r) => r.cost_bn)) > 2 * rel(rs.map((r) => r.poverty_pp));
  return {
    costFar,
    cheapest: cheap.id,
    spreadWords: spread >= 2 ? 'by several billion pounds a year' : 'by less than two billion pounds a year',
  };
}

// ---- panel B: job loss against wage cuts (20 paired draws) ----------------
const J = D.per_pound_20.job_loss;
const W = perPound('wage_cuts');
const JOB = ladder('central_20');
const CUT = ladder('wage_cuts');

// The margins' claims, from the signs of the differences (part3.test.jsx).
export function marginClaims() {
  const perPoundMore = W.government_p > J.government_p ? 'cut' : 'job';
  const povertyMore = JOB.poverty_pp > CUT.poverty_pp ? 'job' : 'cut';
  const costMore = CUT.cost_bn > JOB.cost_bn ? 'cut' : 'job';
  const N = { job: 'job loss', cut: 'wage cuts' };
  const v = (k, one, many) => (k === 'job' ? one : many);
  return {
    perPoundMore,
    povertyMore,
    costMore,
    // "far more" when the poverty rise is more than twice the other margin's
    far: Math.max(JOB.poverty_pp, CUT.poverty_pp) > 2 * Math.min(JOB.poverty_pp, CUT.poverty_pp),
    aria: `Each margin alone, ${N[perPoundMore]} ${v(perPoundMore, 'costs', 'cost')} the public finances more per pound of earnings lost. With the wage and capital channels on, ${N[costMore]} ${v(costMore, 'costs', 'cost')} more and ${N[povertyMore]} ${v(povertyMore, 'raises', 'raise')} poverty more.`,
  };
}

// ---- panel C: the break-evens ---------------------------------------------
const BE = D.breakeven;
const M = D.method;
// One row per input: the central setting (an input, quoted), an arrow, the
// break-even setting (a result, its home). Each row's basis is its own: the
// wage row is one draw, the others 20.
export const BREAKS = [
  {
    id: 'wage',
    label: 'Wage rise for those still employed',
    centralText: `+${fmtPct1(M.survivor_wage_pct)}`,
    central: M.survivor_wage_pct,
    value: BE.wage.value_pct,
    valueText: fmtPctSigned1(BE.wage.value_pct),
  },
  {
    id: 'capital',
    label: 'Rise in interest and dividend income',
    centralText: `+${fmtPct1(M.capital_uplift_pct)}`,
    central: M.capital_uplift_pct,
    value: BE.capital.value_pct,
    valueText: fmtPctSigned0(BE.capital.value_pct),
  },
  {
    id: 'duration',
    label: 'Time out of work',
    centralText: '12 months',
    central: 12,
    value: BE.duration.value_months,
    valueText: fmtMonths(BE.duration.value_months),
  },
];

// ---- shared pieces --------------------------------------------------------
// "Nice" ticks from zero to max, three or four of them.
function niceTicks(max) {
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => max / s <= 4) ?? mag * 10;
  const out = [];
  for (let t = 0; t <= max + 1e-9; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
}
// A tick row under a track: scale, not data (data-axis).
function Ticks({ max, fmt }) {
  return (
    <span className="p3-ch-ticks" data-axis="" aria-hidden="true">
      {niceTicks(max).map((t) => {
        const x = (t / max) * 100;
        // the first label starts at its tick, one near the end ends at it, the rest centre
        return (
          <span key={t} className={x === 0 ? 'is-start' : x > 92 ? 'is-end' : undefined} style={{ left: `${x}%` }}>
            {fmt(t)}
          </span>
        );
      })}
    </span>
  );
}

// A position-only poverty dot; its value mounts only while hovered or focused.
function PovertyDot({ id, d, on }) {
  const [tip, setTip] = useState(false);
  return (
    <span
      className={`p3-dot p3-dot-pov${id === 'exposure' ? ' is-ring' : ''}`}
      style={{ left: on ? `${(d.poverty_pp / MAXP) * 100}%` : 0 }}
      tabIndex={on ? 0 : -1}
      role="img"
      aria-label={`${NAME[id]}: poverty rise, position only; values on Explore`}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
      onFocus={() => setTip(true)}
      onBlur={() => setTip(false)}
      onKeyDown={(ev) => ev.key === 'Escape' && setTip(false)}
    >
      {tip ? (
        <span className="p3-tip" role="status">
          {fmtPp(d.poverty_pp)}
        </span>
      ) : null}
    </span>
  );
}

function RulesPanel({ on }) {
  return (
    <>
      <p className="p3-group-head p3-group-first">Who loses the job: four rules, {rule('uniform').draws} paired draws each</p>
      <div className="p3-dp-heads">
        <AxisTitle axis="y">Cost, £bn a year</AxisTitle>
        <AxisTitle axis="y">Absolute poverty, change, percentage points</AxisTitle>
      </div>
      <ol className="p3-dp">
        {RULES.map((r, i) => {
          const d = rule(r.id);
          const left = d.cost_bn / MAXC > 0.6;
          return (
            <li key={r.id} className="p3-dp-row" data-row={r.id} style={{ '--beat': `${i * 120}ms` }}>
              <span className="p3-row-label">
                {r.label}
                {r.ref ? <Ref id={r.ref} /> : null}
                {r.close ?? null}
              </span>
              <span className="p3-dp-track" data-mark="r-cost">
                <span className={`p3-dot p3-dot-cost${r.central ? ' is-ring' : ''}`} style={{ left: on ? `${(d.cost_bn / MAXC) * 100}%` : 0 }}>
                  {/* the central case's cost has its home in step 1: restated (data-axis) */}
                  <span className={`p3-dot-val${left ? ' is-left' : ''}`} {...(r.central ? { 'data-axis': '' } : {})}>
                    {fmtBn(d.cost_bn)}
                  </span>
                </span>
              </span>
              <span className="p3-dp-track" data-mark="r-poverty">
                <PovertyDot id={r.id} d={d} on={on} />
              </span>
            </li>
          );
        })}
        <li className="p3-dp-row p3-ch-tickrow" aria-hidden="true">
          <Ticks max={MAXC} fmt={(t) => `£${t}bn`} />
          <Ticks max={MAXP} fmt={(t) => `${t}pp`} />
        </li>
      </ol>
      <p className="p3-key">
        <NavLink tab="explore" sub="households" anchor="hh-rules">
          Poverty values by rule, and a top-loaded stress test
        </NavLink>
      </p>
    </>
  );
}

// A dumbbell on its own axis from zero: two marks joined by a line, each
// with its value and its margin's name. Marks are data-mark "<panel> <margin>".
function Dumbbell({ head, panel, max, marks, on, delay, fmt, scale = false }) {
  const xs = marks.map((m) => (m.v / max) * 100);
  return (
    <div className="p3-db">
      <p className="p3-db-head">
        <AxisTitle axis="y" scale={scale}>
          {head}
        </AxisTitle>
      </p>
      <div className={`p3-db-track${on ? ' is-on' : ''}`} style={{ '--beat': `${delay}ms` }}>
        <span className="p3-db-link" data-mark={panel} style={{ left: `${Math.min(...xs)}%`, width: `${Math.abs(xs[1] - xs[0])}%` }} />
        {marks.map((m, i) => (
          <span key={m.id} className={`p3-db-mark is-${m.id}${i ? ' is-second' : ''}`} data-mark={`${panel} ${m.id}`}>
            <span className="p3-db-dot" style={{ left: `${xs[i]}%` }} tabIndex={on ? 0 : -1} aria-label={m.name} />
            <span className={`p3-db-val${xs[i] > 62 ? ' is-left' : ''}`} style={{ left: `${xs[i]}%`, '--x': xs[i] }}>
              {m.text}
            </span>
          </span>
        ))}
      </div>
      <Ticks max={max} fmt={fmt} />
    </div>
  );
}

function MarginPanel({ on }) {
  const maxC = Math.max(JOB.cost_bn, CUT.cost_bn) * 1.15;
  const maxP = Math.max(JOB.poverty_pp, CUT.poverty_pp) * 1.15;
  // each value names its margin, with the margin's colour as its key
  const name = (k) => (
    <span className="p3-db-name">
      {' '}
      <span className={`p3-db-sw is-${k}`} aria-hidden="true" />
      {k === 'job' ? 'job loss' : 'wage cuts'}
    </span>
  );
  return (
    <>
      <p className="p3-group-head p3-group-first">Job loss or wage cuts: the same earnings loss, {D.per_pound_20.draws} paired draws</p>
      <OutsideRebuildFlag />
      <Dumbbell
        head="Each margin alone: pence per £1 of earnings lost"
        panel="m-pence"
        scale
        max={100}
        on={on}
        delay={0}
        fmt={(t) => `${t}p`}
        marks={[
          {
            id: 'job',
            v: J.government_p,
            name: 'Job loss',
            text: (
              <>
                {fmtPence(J.government_p)}
                {name('job')} <span className="p3-muted">({fmtPenceRange(J.min_p, J.max_p)} across draws)</span>
              </>
            ),
          },
          {
            id: 'cut',
            v: W.government_p,
            name: 'Wage cuts',
            text: (
              <>
                {fmtPence(W.government_p)}
                {name('cut')}
              </>
            ),
          },
        ]}
      />
      <div className="p3-db-pair">
        <Dumbbell
          head="With wage and capital effects: cost, £bn a year"
          panel="m-cost"
          max={maxC}
          on={on}
          delay={300}
          fmt={(t) => `£${t}bn`}
          marks={[
            { id: 'job', v: JOB.cost_bn, name: 'Job loss: the central case on these draws', text: <>{fmtBn(JOB.cost_bn)}{name('job')}</> },
            { id: 'cut', v: CUT.cost_bn, name: 'Wage cuts of the same gross size', text: <>{fmtBn(CUT.cost_bn)}{name('cut')}</> },
          ]}
        />
        <Dumbbell
          head="Absolute poverty, change, percentage points"
          panel="m-poverty"
          max={maxP}
          on={on}
          delay={500}
          fmt={(t) => `${t}pp`}
          marks={[
            { id: 'job', v: JOB.poverty_pp, name: 'Job loss: the central case on these draws', text: <>{fmtPp(JOB.poverty_pp)}{name('job')}</> },
            { id: 'cut', v: CUT.poverty_pp, name: 'Wage cuts of the same gross size', text: <>{fmtPp(CUT.poverty_pp)}{name('cut')}</> },
          ]}
        />
      </div>
      <p className="p3-key">Both pence figures include employer NI. Job loss here is the central case on these {D.per_pound_20.draws} draws.</p>
      <p className="p3-key">
        Wage cuts are exposure-graded, after <Ref id="acemoglu">Acemoglu and Restrepo (2022)</Ref>, of the same gross size.
      </p>
      {marginClaims().perPoundMore === 'cut' ? <p className="p3-key">A cut is taxed at the worker’s marginal rate, a lost job’s pay at its average, and benefits replace little here.</p> : null}
    </>
  );
}

function BreakEvenPanel({ on }) {
  return (
    <>
      <p className="p3-group-head p3-group-first">What sets the cost to zero, with the other two at central settings</p>
      <p className="p3-db-head">
        <AxisTitle axis="y">Each assumption: central setting, then the break-even setting</AxisTitle>
      </p>
      <ol className="p3-ch-be" data-mark="breakeven">
        {BREAKS.map((b, i) => (
          <li key={b.id} className="p3-ch-be-row" data-row={`be-${b.id}`} data-mark={`be-${b.id}`} style={{ '--beat': `${i * 200}ms` }}>
            <span className="p3-row-label">{b.label}</span>
            <span className="p3-ch-be-from">
              <span className="p3-ch-be-cap">Central</span> <span data-input="">{b.centralText}</span>
            </span>
            <span className={`p3-ch-be-arrow${on ? ' is-on' : ''}`} aria-hidden="true" />
            <span className="p3-ch-be-to">
              <span className="p3-ch-be-cap">Break-even</span> <strong className="p3-row-value">{b.valueText}</strong>
            </span>
          </li>
        ))}
      </ol>
      <p className="p3-key">
        Interpolated between runs. The wage row is {BE.wage.draws === 1 ? 'one draw' : `${BE.wage.draws} draws`}; the others, {BE.capital.draws} paired draws.
      </p>
      <p className="p3-key">The time row comes from a half-year run that also removes Universal Credit a real spell would pay; the true break-even is probably shorter.</p>
      <p className="p3-key">
        Full benefit take-up and new-style JSA, as on <Ref id="jsa" />:{' '}
        <NavLink tab="explore" sub="households" anchor="hh-ladder">
          Explore, households
        </NavLink>
        .
      </p>
    </>
  );
}

// The step → panel map: two steps share the margins panel.
export const PANEL_OF = [0, 1, 1, 2];
const PANELS = [RulesPanel, MarginPanel, BreakEvenPanel];
const PANEL_NAME = ['rules', 'margin', 'breakeven'];

function ChangesFigure({ step, ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  // phones draw the figure once: every panel shown, stacked
  const all = !!ctx?.once;
  const cur = PANEL_OF[Math.max(0, Math.min(step ?? 0, PANEL_OF.length - 1))];
  return (
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene p3-ch${all ? ' is-all' : ''}`)} data-panel={PANEL_NAME[cur]}>
      <FigureHead icon="scenario" title="What changes the cost and the poverty rise" replay={e.replay} />
      <div className="p3-ch-panels">
        {PANELS.map((Panel, k) => {
          const shown = all || k === cur;
          return (
            <section key={PANEL_NAME[k]} className={`p3-ch-panel${shown ? ' is-shown' : ''}`} data-panel={PANEL_NAME[k]} inert={!shown || undefined} aria-hidden={shown ? undefined : true}>
              <Panel on={e.on && shown} />
            </section>
          );
        })}
      </div>
      <Source files={[rule('uniform').file, D.per_pound_20.file, J.file, BE.wage.file, BE.capital.file, BE.duration.file]} />
    </figure>
  );
}

// ---- steps and the topic opener -------------------------------------------
const RC = rulesClaims();
const CL = marginClaims();
const K = {
  job: <Key id="job">job loss</Key>,
  cut: <Key id="cut">wage cuts</Key>,
};
const verb = (k, one, many) => (k === 'job' ? one : many);
const other = (k) => (k === 'job' ? 'cut' : 'job');
// a figure restated from its home in the chart (data-axis: not counted)
const Re = ({ children }) => <span data-axis="">{children}</span>;
const [BW, BC, BD] = BREAKS;

export function changesSub() {
  const cs = RULES.map((r) => rule(r.id).cost_bn);
  return {
    title: 'What changes the answer',
    icon: 'scenario',
    question: 'What changes the answer?',
    hint: 'Watch the chart change with each assumption',
    key: 'changes',
    answer: `Cost ${fmtBn(Math.min(...cs))} to ${fmtBn(Math.max(...cs))} a year by rule; zero if wages rise ${fmtPctSigned1(BE.wage.value_pct)}`,
    answerTo: 'p3-moves-step',
  };
}

export const CHANGES_STEPS = [
  {
    id: 'p3-rules-step',
    icon: 'scenario',
    highlight: ['r-cost', 'r-poverty'],
    title: (
      <>
        Who loses the job moves the cost {RC.spreadWords}, the poverty rise {RC.costFar ? 'far less' : 'too'}
      </>
    ),
  },
  {
    id: 'p3-margin-step',
    icon: 'wageCut',
    highlight: ['m-pence'],
    title: (
      <>
        Per pound lost, {K[CL.perPoundMore]} {verb(CL.perPoundMore, 'costs', 'cost')} the public finances more than {K[other(CL.perPoundMore)]}
      </>
    ),
  },
  {
    id: 'p3-margin-step-2',
    icon: 'poverty',
    highlight: ['m-cost', 'm-poverty'],
    title:
      CL.costMore === CL.povertyMore ? (
        <>
          With the wage and capital-income effects included, {K[CL.costMore]} {CL.costMore === CL.perPoundMore ? 'still ' : ''}
          {verb(CL.costMore, 'costs', 'cost')} more and {verb(CL.costMore, 'raises', 'raise')} poverty more
        </>
      ) : (
        <>
          With the wage and capital-income effects included, {K[CL.costMore]} {CL.costMore === CL.perPoundMore ? 'still ' : ''}
          {verb(CL.costMore, 'costs', 'cost')} more; {K[CL.povertyMore]} {verb(CL.povertyMore, 'raises', 'raise')} poverty {CL.far ? 'far ' : ''}more
        </>
      ),
  },
  {
    id: 'p3-moves-step',
    icon: 'breakEven',
    highlight: ['breakeven'],
    title: (
      <>
        The cost reaches zero if wages rise <Re>{BW.valueText}</Re>, capital income <Re>{BC.valueText}</Re>, or job loss lasts{' '}
        <Re>{BD.valueText}</Re>
      </>
    ),
  },
];

// The marks, with the words a screen reader hears for each highlight.
const MARKS = {
  job: { color: 'var(--pe-gray-800)', shape: 'circle', label: 'Job loss' },
  cut: { color: 'var(--rank-3)', shape: 'circle', label: 'Wage cuts' },
  'r-cost': { color: 'var(--pe-gray-800)', shape: 'none', label: 'cost under each rule' },
  'r-poverty': { color: 'var(--c-loss)', shape: 'none', label: 'poverty rise under each rule' },
  'm-pence': { color: 'var(--pe-gray-800)', shape: 'none', label: 'pence per pound lost, each margin alone' },
  'm-cost': { color: 'var(--pe-gray-800)', shape: 'none', label: 'cost of each margin with wage and capital effects' },
  'm-poverty': { color: 'var(--pe-gray-800)', shape: 'none', label: 'poverty rise of each margin' },
  breakeven: { color: 'var(--pe-gray-800)', shape: 'none', label: 'the three break-even settings' },
};

const LABEL = 'What changes the answer: the cost and poverty rise under four rules for who loses the job; job loss against wage cuts; the break-even settings of three assumptions';

export default function Changes() {
  return (
    <MarkProvider marks={MARKS}>
      <Scrolly id="p3-changes" sub={changesSub()} steps={asLines(CHANGES_STEPS)} graphic={(i, r, ctx) => <ChangesFigure step={i} ctx={ctx} />} label={LABEL} />
    </MarkProvider>
  );
}
