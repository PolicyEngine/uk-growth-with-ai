'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtMonths, fmtPct1, fmtPctSigned0, fmtPctSigned1, fmtPence, fmtPenceRange, fmtPp } from './format.js';
import { AxisTitle, D, FigureHead, Key, MarkProvider, MODEL_YEAR, OutsideRebuildFlag, Source, entryClass, ladder, perPound, rule, useBeat, asLines } from './shared.jsx';
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
// Homes: each rule's cost (the exposure rule's is the main case's, step
// 1: restated here as an axis label), the pence per pound and the 20-draw
// costs and poverty rises of the two margins, and the break-evens. Each
// rule's poverty rise has its home on Explore > Households (position only
// here, a read-out on hover or focus).

// ---- panel A: four stylised rules (50 paired draws) -----------------------
// One cost x poverty plane, both axes from zero (charts-finale-fable.md A):
// cost runs left to right while the poverty rise stays nearly flat. Each
// rule's name and values are one direct label (an <ol> over the plot: each
// number once in the DOM); `place` is the label's side of its dot and the
// leader's depth. `short`: the phone label (600px and below). What each
// rule assumes, and its citation, is in the figure's notes (rulesNotes).
const RULES = [
  { id: 'uniform', label: 'Uniform', place: { side: 'below', anchor: 'start', lead: 16 }, beat: 400 },
  { id: 'junior', label: 'Ages 16 to 24', place: { side: 'below', anchor: 'end', lead: 58 }, beat: 800 },
  { id: 'exposure', label: 'Main: by AI exposure', short: 'Main: AI exposure', central: true, place: { side: 'below', anchor: 'start', lead: 16 }, beat: 0 },
  { id: 'compression', label: 'Exposed higher earners', place: { side: 'above', anchor: 'end', lead: 16 }, beat: 1200 },
];
// the panel head is a finding (story-finding-titles-fable.md): the main
// rule's cost is neither the cheapest nor the dearest of the four
const MAIN_BETWEEN = (() => {
  const costs = RULES.map((r) => rule(r.id).cost_bn);
  const c = rule('exposure').cost_bn;
  return c > Math.min(...costs) && c < Math.max(...costs);
})();
// The plane's domain: cost £0-12bn, the poverty rise 0-3.3pp.
const X_MAX = 12;
const Y_MAX = 3.3;
const X_TICKS = [0, 3, 6, 9, 12];
const Y_TICKS = [0, 1, 2, 3];
const px = (v) => (v / X_MAX) * 100;
const py = (v) => (1 - v / Y_MAX) * 100;

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

// Panel A: the plane. Positions are a pure function of `on` (the beat):
// before it, every dot sits on the central ring and only the central label
// shows; then the others slide out along their connectors in turn
// (--beat), and the stress-test note fades in last. Final state on a jump
// or reload, replay on scroll-back, static under reduced motion (CSS).
// The list items are the hover and focus targets; the readout mounts only
// while one is hovered or focused (data-axis: it restates the labels).
function RulesPanel({ on }) {
  const [hot, setHot] = useState(null);
  const c = rule('exposure');
  const cx = px(c.cost_bn);
  const cy = py(c.poverty_pp);
  const hd = hot ? rule(hot) : null;
  const hr = RULES.find((r) => r.id === hot);
  return (
    <div className={`p3-plane${on ? ' is-on' : ''}${hot ? ' is-hot' : ''}`}>
      <p className="p3-group-head p3-group-first" data-title-fallback={MAIN_BETWEEN ? undefined : ''}>
        {MAIN_BETWEEN ? 'The main case’s cost sits between the other rules’' : `Four rules for who loses the job, ${rule('uniform').draws} draws each`}
      </p>
      <p className="story-figure-unit p3-group-unit">{`Cost to the public finances, £bn a year, against the absolute poverty rise, pp. Four rules, ${rule('uniform').draws} draws each.`}</p>
      <div className="p3-plane-heads">
        <span data-mark="r-poverty" className="p3-plane-ytitle">
          <AxisTitle axis="y">Absolute poverty rise, pp</AxisTitle>
        </span>
        <span className="p3-plane-stress" style={{ '--beat': '1700ms' }}>
          <span className="p3-long">Top-loaded extreme case: off the scale</span>
          <span className="p3-short">Extreme case: off scale</span>
          <Icon name="arrowRight" size={14} />
        </span>
      </div>
      <div className="p3-plane-plot">
        <svg className="p3-plane-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {Y_TICKS.filter((t) => t > 0).map((t) => (
            <line key={t} className="p3-plane-grid" x1={0} x2={100} y1={py(t)} y2={py(t)} />
          ))}
          <line className="p3-plane-axis is-y" data-mark="r-poverty" x1={0} x2={0} y1={0} y2={100} />
          <line className="p3-plane-axis is-x" data-mark="r-cost" x1={0} x2={100} y1={100} y2={100} />
          {RULES.filter((r) => !r.central).map((r) => {
            const d = rule(r.id);
            return <line key={r.id} className="p3-plane-link" x1={cx} y1={cy} x2={px(d.cost_bn)} y2={py(d.poverty_pp)} style={{ '--beat': `${r.beat}ms` }} />;
          })}
        </svg>
        <span className="p3-plane-ticks is-y" data-axis="" aria-hidden="true">
          {Y_TICKS.map((t) => (
            <span key={t} style={{ top: `${py(t)}%` }}>
              {t ? `${t}pp` : '0'}
            </span>
          ))}
        </span>
        <span className="p3-plane-ticks is-x" data-axis="" aria-hidden="true">
          {X_TICKS.map((t) => (
            <span key={t} style={{ left: `${px(t)}%` }}>
              £{t}
              {t ? 'bn' : ''}
            </span>
          ))}
        </span>
        {RULES.map((r) => {
          const d = rule(r.id);
          const x = on || r.central ? px(d.cost_bn) : cx;
          const y = on || r.central ? py(d.poverty_pp) : cy;
          return <span key={r.id} className={`p3-plane-dot${r.central ? ' is-ring' : ''}${hot === r.id ? ' is-hot' : ''}`} style={{ left: `${x}%`, top: `${y}%`, '--beat': `${r.beat}ms` }} aria-hidden="true" />;
        })}
        <ol className="p3-plane-labels" aria-label="Cost and absolute poverty rise under each rule">
          {RULES.map((r) => {
            const d = rule(r.id);
            const { side, anchor, lead } = r.place;
            const restate = r.central ? { 'data-axis': '' } : {};
            return (
              <li
                key={r.id}
                data-row={r.id}
                className={`p3-plane-label is-${side} is-${anchor}${r.central ? ' is-central' : ''}${hot === r.id ? ' is-hot' : ''}`}
                style={{ left: `${px(d.cost_bn)}%`, top: `${py(d.poverty_pp)}%`, '--lead': `${lead}px`, '--beat': `${r.beat}ms` }}
                tabIndex={0}
                onMouseEnter={() => setHot(r.id)}
                onMouseLeave={() => setHot(null)}
                onFocus={() => setHot(r.id)}
                onBlur={() => setHot(null)}
              >
                <span className="p3-plane-name">
                  {r.short ? (
                    <>
                      <span className="p3-long">{r.label}</span>
                      <span className="p3-short">{r.short}</span>
                    </>
                  ) : (
                    r.label
                  )}
                </span>
                {/* the main case's figures have their home in step 1: restated (data-axis) */}
                <span className="p3-plane-vals">
                  <span {...restate}>{fmtBn(d.cost_bn)}</span> · <span {...restate}>{fmtPp(d.poverty_pp)}</span>
                </span>
              </li>
            );
          })}
        </ol>
        {hd ? (
          <p className="p3-plane-readout" data-axis="">
            <strong>{hr.label}</strong>: {fmtBn(hd.cost_bn)} a year; poverty {fmtPp(hd.poverty_pp)}; Gini {fmtPp(hd.gini_pp).replace('pp', ' points')}
          </p>
        ) : null}
      </div>
      <p className="p3-plane-xtitle" data-mark="r-cost">
        <AxisTitle axis="x">Cost to the public finances, £bn a year</AxisTitle>
      </p>
    </div>
  );
}

// A dumbbell on its own axis from zero: two marks joined by a line, no text
// on the track; under it the two values, each name and value in its own
// column (item 32). Marks and value rows are data-mark "<panel> <margin>",
// so a step's highlight lights the number with its dot.
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
          </span>
        ))}
      </div>
      <Ticks max={max} fmt={fmt} />
      <dl className="p3-db-vals">
        {marks.map((m) => (
          <div key={m.id} className={`p3-db-row is-${m.id}`} data-mark={`${panel} ${m.id}`}>
            <dt>
              <span className={`p3-db-sw is-${m.id}`} aria-hidden="true" />
              {MARGIN_NAME[m.id]}
            </dt>
            {' '}
            <dd>{m.text}</dd>{' '}
          </div>
        ))}
      </dl>
    </div>
  );
}

const MARGIN_NAME = { job: 'Job loss', cut: 'Wage cuts' };
// The gross pay each pair removes: printed once the build carries it
// (per_pound_20.gross_cut_bn); never derived here.
const GROSS = D.per_pound_20.gross_cut_bn;

function MarginPanel({ on }) {
  const maxC = Math.max(JOB.cost_bn, CUT.cost_bn) * 1.15;
  const maxP = Math.max(JOB.poverty_pp, CUT.poverty_pp) * 1.15;
  const aria = { job: 'Job loss: the main case on these draws', cut: 'Wage cuts of the same gross size' };
  return (
    <>
      <p className="p3-group-head p3-group-first" data-title-fallback={CL.povertyMore === 'job' ? undefined : ''}>
        {CL.povertyMore === 'job' ? `Wage cuts of the same size raise poverty ${CL.far ? 'far ' : ''}less` : `Job loss or wage cuts, ${D.per_pound_20.draws} draws`}
      </p>
      <p className="story-figure-unit p3-group-unit p3-margin-def">
        Each pair removes the same gross pay{Number.isFinite(GROSS) ? `, ${fmtBn(GROSS)} a year` : ''}: as job loss, or as wage cuts graded by AI exposure with no jobs lost.
      </p>
      <OutsideRebuildFlag />
      <div className="p3-margin-grid">
        <div className="p3-margin-group is-alone">
          <p className="p3-margin-group-label">Each case alone</p>
          <div className="p3-margin-group-panels">
            <Dumbbell
              head="Cost per £1 of pay removed"
              panel="m-pence"
              scale
              max={100}
              on={on}
              delay={0}
              fmt={(t) => `${t}p`}
              marks={[
                { id: 'job', v: J.government_p, name: 'Job loss', text: fmtPence(J.government_p) },
                { id: 'cut', v: W.government_p, name: 'Wage cuts', text: fmtPence(W.government_p) },
              ]}
            />
          </div>
        </div>
        <div className="p3-margin-group is-gains">
          <p className="p3-margin-group-label">With the assumed gains added back</p>
          <div className="p3-margin-group-panels">
            <Dumbbell
              head="Cost to the public finances, £bn a year"
              panel="m-cost"
              max={maxC}
              on={on}
              delay={300}
              fmt={(t) => `£${t}bn`}
              marks={[
                { id: 'job', v: JOB.cost_bn, name: aria.job, text: fmtBn(JOB.cost_bn) },
                { id: 'cut', v: CUT.cost_bn, name: aria.cut, text: fmtBn(CUT.cost_bn) },
              ]}
            />
            <Dumbbell
              head="Absolute poverty rise, pp"
              panel="m-poverty"
              max={maxP}
              on={on}
              delay={500}
              fmt={(t) => `${t}pp`}
              marks={[
                { id: 'job', v: JOB.poverty_pp, name: aria.job, text: fmtPp(JOB.poverty_pp) },
                { id: 'cut', v: CUT.poverty_pp, name: aria.cut, text: fmtPp(CUT.poverty_pp) },
              ]}
            />
          </div>
        </div>
      </div>
      <p className="p3-margin-note">
        Means of {D.per_pound_20.draws} paired draws. Job loss alone: {fmtPenceRange(J.min_p, J.max_p)} across them.
      </p>
    </>
  );
}

function BreakEvenPanel({ on }) {
  return (
    <>
      <p className="p3-group-head p3-group-first" data-title-fallback={BREAKS.every((b) => Number.isFinite(b.value)) ? undefined : ''}>
        {BREAKS.every((b) => Number.isFinite(b.value)) ? 'Any one of three changes brings the cost to zero' : 'What sets the cost to zero'}
      </p>
      <p className="story-figure-unit p3-group-unit">
        <AxisTitle axis="y">Main setting, then break-even setting</AxisTitle>, for each of three assumptions; the other two held at main settings.
      </p>
      <ol className="p3-ch-be" data-mark="breakeven">
        {BREAKS.map((b, i) => (
          <li key={b.id} className="p3-ch-be-row" data-row={`be-${b.id}`} data-mark={`be-${b.id}`} style={{ '--beat': `${i * 200}ms` }}>
            <span className="p3-row-label">{b.label}</span>
            <span className="p3-ch-be-from">
              <span className="p3-ch-be-cap">Main</span> <span data-input="">{b.centralText}</span>
            </span>
            <span className={`p3-ch-be-arrow${on ? ' is-on' : ''}`} aria-hidden="true" />
            <span className="p3-ch-be-to">
              <span className="p3-ch-be-cap">Break-even</span> <strong className="p3-row-value">{b.valueText}</strong>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

// Each panel's notes, in the figure's "Sources and notes" (one group a
// panel), worded as they were.
const rulesNotes = () => [
  // the figure's year: on phones its unit line is hidden while one panel shows
  { icon: 'timing', text: `All three tests: ${MODEL_YEAR}, the household study` },
  { icon: 'scenario', text: 'Uniform: every employee equally likely' },
  { icon: 'scenario', text: <>Ages 16 to 24: tilted to them, after <Ref id="klein">Klein Teeselink (2025)</Ref></> },
  { icon: 'scenario', text: 'Main: in proportion to AI exposure' },
  { icon: 'scenario', text: <>Exposed higher earners: expertise compression, after <Ref id="autor">Autor (2024)</Ref></> },
  { icon: 'draws', text: `${rule('uniform').draws} paired draws per rule` },
  {
    icon: 'inequality',
    text: (
      <NavLink tab="explore" sub="households" anchor="hh-rules">
        Gini changes by rule, and a top-loaded extreme case
      </NavLink>
    ),
  },
];

const marginNotes = () => [
  { icon: 'tax', text: 'Both pence figures include employer NI' },
  { icon: 'draws', text: 'Job loss here is the main case, on the same draws as the wage cuts' },
  { icon: 'wageCut', text: <>Wage cuts in place of job loss, after <Ref id="acemoglu">Acemoglu and Restrepo (2022)</Ref></> },
  marginClaims().perPoundMore === 'cut' ? { icon: 'why', text: 'A pay cut loses tax at the worker’s marginal (last-pound) rate, a lost job at the average rate, and benefits replace little here' } : null,
];

const breakEvenNotes = () => [
  { icon: 'arithmetic', text: 'Interpolated between runs' },
  { icon: 'draws', text: <>The wage row is {BE.wage.draws === 1 ? 'one draw' : `${BE.wage.draws} draws`}; the others, {BE.capital.draws} paired draws</> },
  { icon: 'timing', text: 'The time row comes from a half-year run that also removes Universal Credit a real spell would pay; the true break-even is probably shorter' },
  {
    icon: 'takeUp',
    text: (
      <>
        Full benefit take-up and new-style Jobseeker’s Allowance (JSA), as on <Ref id="jsa" />:{' '}
        <NavLink tab="explore" sub="households" anchor="hh-ladder">
          Explore, households
        </NavLink>
      </>
    ),
  },
];

function ChangesSource() {
  return (
    <Source
      files={[rule('uniform').file, D.per_pound_20.file, J.file, BE.wage.file, BE.capital.file, BE.duration.file]}
      refs={['klein', 'autor', 'acemoglu', 'jsa']}
      groups={[
        { title: 'Who loses the job', notes: rulesNotes() },
        { title: 'Job loss or wage cuts', notes: marginNotes() },
        { title: 'Break-even', notes: breakEvenNotes() },
      ]}
    />
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
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene p3-ch${all ? ' is-all' : ''}`)} data-panel={PANEL_NAME[cur]} data-step={step ?? 0}>
      <FigureHead
        icon="scenario"
        title="The cost changes with every assumption tested"
        unit={`The household study, ${MODEL_YEAR}`}
        replay={e.replay}
        source={<ChangesSource />}
      />
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
    // the scene head prints the title beside the question: they differ
    question: 'What would change the cost and the poverty rise?',
    hint: 'Watch the chart change with each assumption',
    key: 'change',
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
        Change who loses the job and the cost moves {RC.spreadWords}; poverty, {RC.costFar ? 'far less' : 'too'}
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
          With the assumed gains added back, {K[CL.costMore]} {CL.costMore === CL.perPoundMore ? 'still ' : ''}
          {verb(CL.costMore, 'costs', 'cost')} more and {verb(CL.costMore, 'raises', 'raise')} poverty more
        </>
      ) : (
        <>
          With the assumed gains added back, {K[CL.costMore]} {CL.costMore === CL.perPoundMore ? 'still ' : ''}
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
        The cost falls to zero if wages rise <Re>{BW.valueText}</Re>, capital income <Re>{BC.valueText}</Re>, or job loss lasts{' '}
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
      <Scrolly id="p3-changes" scene sub={changesSub()} steps={asLines(CHANGES_STEPS)} graphic={(i, r, ctx) => <ChangesFigure step={i} ctx={ctx} />} label={LABEL} />
    </MarkProvider>
  );
}
