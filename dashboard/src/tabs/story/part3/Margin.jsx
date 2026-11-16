'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtBn, fmtPence, fmtPenceRange, fmtPp } from './format.js';
import { AxisTitle, D, FigureHead, Key, MarkProvider, Num, NumMarker, OutsideRebuildFlag, Source, ladder, perPound, entryClass, useBeat, asLines } from './shared.jsx';
import { Ref } from './sources.jsx';

// Step 6, job loss against wage cuts (results.tex, "How the earnings loss
// arrives"), on matching 20-draw bases only: pence per pound with each
// channel alone (job loss: the channel split's displacement run; wage cuts:
// variant cut_only), then cost and poverty with the survivor-wage and
// capital channels on in both (central seeds 0-19 against variant table3).
// The graphic is the home of all these figures, including the central case
// on the 20 draws, to which step 7 refers.

const J = D.per_pound_20.job_loss;
const W = perPound('wage_cuts');
const ER = D.per_pound_20.wage_cuts_employer_ni_p;
const JOB = ladder('central_20');
const CUT = ladder('wage_cuts');
// The wage-cut pence and its two parts, each rounded to whole pence, need
// not add up as printed (55p = 41p + 15p at the merged commit): say so.
export const ROUNDED_APART = Math.round(W.household_p) + Math.round(ER) !== Math.round(W.government_p);

// The card's title and claims, from the signs of the differences
// (part3.test.jsx): per pound on the margins alone, and poverty with the
// other channels on.
export function marginClaims() {
  const perPoundMore = W.government_p > J.government_p ? 'cut' : 'job';
  const povertyMore = JOB.poverty_pp > CUT.poverty_pp ? 'job' : 'cut';
  const costMore = CUT.cost_bn > JOB.cost_bn ? 'cut' : 'job';
  const NAMES = {
    job: ['Job loss', 'job loss'],
    cut: ['Wage cuts', 'wage cuts'],
  };
  const verb = (k, one, many) => (k === 'job' ? one : many);
  return {
    perPoundMore,
    povertyMore,
    costMore,
    title: `${NAMES[perPoundMore][0]} ${verb(perPoundMore, 'costs', 'cost')} more per pound; ${NAMES[povertyMore][1]} ${verb(povertyMore, 'raises', 'raise')} poverty more`,
    aria: `Dumbbells, 20 paired draws. Each margin alone: ${NAMES[perPoundMore][1]} ${verb(perPoundMore, 'costs', 'cost')} the public finances more per pound of earnings lost. With the wage and capital channels on: ${NAMES[costMore][1]} ${verb(costMore, 'costs', 'cost')} more and ${NAMES[povertyMore][1]} ${verb(povertyMore, 'raises', 'raise')} poverty more.`,
  };
}

// A dumbbell panel on its own axis from zero: two marks joined by a line;
// each mark carries its printed value. The wage-cut pence mark draws its
// employer-NI part as a segment of its own. Each mark is data-mark
// "<panel> <margin>", so a step lights a panel and a word lights a margin.
function Dumbbell({ head, panel, n, scale = false, max, marks, on, delay }) {
  const xs = marks.map((m) => (m.v / max) * 100);
  return (
    <div className="p3-db">
      <p className="p3-db-head">
        {n ? <NumMarker n={n} /> : null}{' '}
        <AxisTitle axis="y" scale={scale}>
          {head}
        </AxisTitle>
      </p>
      <div className="p3-db-track" style={{ '--beat': `${delay}ms` }}>
        <span
          className="p3-db-link"
          data-mark={panel}
          style={{
            left: `${Math.min(...xs)}%`,
            width: `${Math.abs(xs[1] - xs[0])}%`,
          }}
        />
        {marks.map((m, i) => (
          <span key={m.id} className={`p3-db-mark is-${m.id}${i ? ' is-second' : ''}`} data-mark={`${panel} ${m.id}`}>
            {m.seg != null ? (
              <span
                className="p3-db-seg"
                style={{
                  left: `${(m.seg / max) * 100}%`,
                  width: `${((m.v - m.seg) / max) * 100}%`,
                }}
              />
            ) : null}
            <span className="p3-db-dot" style={{ left: `${xs[i]}%` }} tabIndex={on ? 0 : -1} aria-label={m.name} />
            <span className={`p3-db-val${xs[i] > 70 ? ' is-left' : ''}`} style={{ left: `${xs[i]}%`, '--x': xs[i] }}>
              {m.text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MarginFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  const maxC = Math.max(JOB.cost_bn, CUT.cost_bn) * 1.15;
  const maxP = Math.max(JOB.poverty_pp, CUT.poverty_pp) * 1.15;
  return (
    <figure ref={attach} className={entryClass(e, 'p3-figure p3-scene p3-margin')}>
      <FigureHead icon="wageCut" title="The same earnings loss as job loss or as wage cuts" x="Job loss against wage cuts" unit={`${D.per_pound_20.draws} paired draws`} replay={e.replay} />
      <OutsideRebuildFlag />
      <section className="p3-db-group is-a">
        <p className="p3-group-head p3-group-first">Each margin alone, cost to the public finances</p>
        <Dumbbell
          head="Pence per £1 of earnings lost"
          panel="pence"
          scale
          max={100}
          on={e.on}
          delay={0}
          marks={[
            {
              id: 'job',
              v: J.government_p,
              name: 'Job loss',
              text: (
                <>
                  {fmtPence(J.government_p)} <span className="p3-muted">(range {fmtPenceRange(J.min_p, J.max_p)})</span>
                </>
              ),
            },
            {
              id: 'cut',
              v: W.government_p,
              seg: W.household_p,
              name: 'Wage cuts',
              text: (
                <>
                  {fmtPence(W.government_p)}{' '}
                  <span className="p3-muted">
                    = {fmtPence(W.household_p)} + {fmtPence(ER)} employer NI
                    {ROUNDED_APART ? ', each rounded' : ''}
                  </span>
                </>
              ),
            },
          ]}
        />
      </section>
      <section className="p3-db-group is-b">
        <p className="p3-group-head">With the wage and capital channels on, as in the central case</p>
        <div className="p3-db-pair">
          <Dumbbell
            head="Cost, £bn a year"
            panel="cost"
            n={1}
            max={maxC}
            on={e.on}
            delay={1100}
            marks={[
              {
                id: 'job',
                v: JOB.cost_bn,
                name: 'Job loss: the central case on these draws',
                text: fmtBn(JOB.cost_bn),
              },
              {
                id: 'cut',
                v: CUT.cost_bn,
                name: 'Wage cuts of the same gross size',
                text: fmtBn(CUT.cost_bn),
              },
            ]}
          />
          <Dumbbell
            head="Absolute poverty, change, percentage points"
            panel="poverty"
            n={2}
            max={maxP}
            on={e.on}
            delay={1400}
            marks={[
              {
                id: 'job',
                v: JOB.poverty_pp,
                name: 'Job loss: the central case on these draws',
                text: fmtPp(JOB.poverty_pp),
              },
              {
                id: 'cut',
                v: CUT.poverty_pp,
                name: 'Wage cuts of the same gross size',
                text: fmtPp(CUT.poverty_pp),
              },
            ]}
          />
        </div>
        <p className="p3-key">Job loss here is the central case on these draws.</p>
      </section>
      <p className="p3-key">
        Wage cuts are exposure-graded, after <Ref id="acemoglu">Acemoglu and Restrepo (2022)</Ref>, of the same gross size.
      </p>
      {marginClaims().perPoundMore === 'cut' ? <p className="p3-key">A cut is taxed at the worker’s marginal rate, a lost job’s pay at its average rate.</p> : null}
      <Source files={[D.per_pound_20.file, D.per_pound_20.job_loss.file]}>wage-cut runs, central seeds 0 to 19</Source>
    </figure>
  );
}

export function marginSub() {
  return {
    title: 'Job loss or wage cuts',
    icon: 'wageCut',
    question: 'Does it matter whether earnings fall through job loss or wage cuts?',
    hint: 'Watch the two margins trade places',
    key: 'job loss or wage cuts',
    answer: `Per £1 lost: ${fmtPence(J.government_p)} against ${fmtPence(W.government_p)}; poverty ${fmtPp(JOB.poverty_pp)} against ${fmtPp(CUT.poverty_pp)}`,
    answerTo: 'p3-margin-step',
  };
}

// The margins' words, colour-keyed (job loss ink, wage cuts blue, as drawn).
const K = {
  job: <Key id="job">job loss</Key>,
  cut: <Key id="cut">wage cuts</Key>,
  Job: <Key id="job">Job loss</Key>,
  Cut: <Key id="cut">Wage cuts</Key>,
};
const other = (k) => (k === 'job' ? 'cut' : 'job');
const verb = (k, one, many) => (k === 'job' ? one : many);
const CL = marginClaims();
// "far more" when the poverty rise is more than twice the other margin's
const FAR = Math.max(JOB.poverty_pp, CUT.poverty_pp) > 2 * Math.min(JOB.poverty_pp, CUT.poverty_pp) ? 'far ' : '';
export const MARGIN_STEPS = [
  {
    id: 'p3-margin-step',
    icon: 'cost',
    highlight: ['pence'],
    title: (
      <>
        Per pound lost, {K[CL.perPoundMore]} {verb(CL.perPoundMore, 'costs', 'cost')} the public finances more than {K[other(CL.perPoundMore)]}
      </>
    ),
  },
  {
    id: 'p3-margin-step-2',
    icon: 'poverty',
    highlight: ['cost', 'poverty'],
    title: (
      <>
        With other channels on, {K[CL.costMore]} {verb(CL.costMore, 'costs', 'cost')} more <Num n={1} mark="cost" />, {CL.costMore !== CL.povertyMore ? 'but' : 'and'} {K[CL.povertyMore]}{' '}
        {verb(CL.povertyMore, 'raises', 'raise')} poverty {FAR}more <Num n={2} mark="poverty" />
      </>
    ),
  },
];

const MARGIN_MARKS = {
  job: { color: 'var(--pe-gray-800)', shape: 'circle', label: 'Job loss' },
  cut: { color: 'var(--rank-3)', shape: 'circle', label: 'Wage cuts' },
};

export default function Margin() {
  const claims = marginClaims();
  return (
    <MarkProvider marks={MARGIN_MARKS}>
      <Scrolly id="p3-margin" sub={marginSub()} steps={asLines(MARGIN_STEPS)} graphic={(i, r, ctx) => <MarginFigure ctx={ctx} />} label={claims.aria} />
    </MarkProvider>
  );
}
