'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtDecilePct } from './format.js';
import { GrowRect } from '@/components/story/primitives.jsx';
import { D, DrawsChip, FigureHead, Fold, Ico, Fig, Num, NumMarker, Key, MarkProvider, Source, entryClass, markProps, useBeat } from './shared.jsx';

// Step 4, change in household disposable income (before housing costs) by
// income decile. Decile 1 is drawn grey with the caveat beside it and no
// value label: the caveat sentence is the home of its figure, because the
// study does not report the bottom income decile as a finding.

const DEC = D.deciles;
const VALUES = DEC.values;
const LO = Math.floor(Math.min(0, ...VALUES));
const HI = Math.ceil(Math.max(0, ...VALUES));

// Decile 1 under the two other rankings (decile_ranking_sensitivity.csv).
const grab = (name) => D.rankings.find((r) => r.id === name)?.values[0] ?? NaN;
export const RANK_PRE_PENSION = grab('pre_pension');
export const RANK_EXCL_PPC = grab('hbai_excl_large_ppc');

// The other two rankings are results (counted by the number check), not
// inputs. A ranking whose value cannot be read is left out. Itemised: the
// caveat, its reason, then decile 1 under each ranking, each led by an
// arrow drawn from the value's sign (higher or lower than in the baseline;
// the signed number says the same in words).
export const signIcon = (v) => (v > 0 ? 'rise' : v < 0 ? 'fall' : 'onPath');
export function bottomDecileRankings() {
  return [
    [VALUES[0], 'on the ranking used here'],
    [RANK_PRE_PENSION, 'ranking on income before pension contributions'],
    [RANK_EXCL_PPC, 'leaving out large personal pension contributions'],
  ].filter(([v]) => fmtDecilePct(v));
}
// Decile 1 under the three rankings: a small table (the home of these
// figures), in the third step's card.
export function BottomDecileCaveat() {
  return (
    <table className="p3-rank-table" data-caveat="bottom-decile">
      <caption className="p3-rank-cap">Decile 1’s change, by how households are ranked</caption>
      <tbody>
        {bottomDecileRankings().map(([v, how]) => (
          <tr key={how}>
            <th scope="row">
              <Ico c={signIcon(v)} size={12} /> {how[0].toUpperCase() + how.slice(1)}
            </th>
            <td>
              <Fig path="rankings" mark="d1">
                {fmtDecilePct(v)}
              </Fig>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The decile with the largest fall (1-based), read from the data, and the
// shape words the card uses, each a statement about the data that follows
// it if the data change (part3.test.jsx).
export function decileShape(values = VALUES) {
  const worst = values.indexOf(Math.min(...values)) + 1;
  const w = values[worst - 1];
  return {
    worst,
    // deciles 6 to 9
    upperMiddle: worst >= 6 && worst <= 9,
    // falls smaller at decile 2 and at decile 10 than at the largest
    hump: w < 0 && values[1] > w && values[9] > w,
    // the top decile falls less than the largest fall
    topLess: values[9] > w,
    // the top decile's 95% interval spans zero (claim audit P3-29)
    topNearZero: DEC.ci_low?.[9] < 0 && DEC.ci_high?.[9] > 0,
    // earnings lost are largest in the top decile, in the study's own flows
    // by decile (the step 3 run; claim audit P3-28)
    lossTop: SANKEY_TOP === 10,
  };
}
const SANKEY_LOSS = D.sankey.deciles.map((f) => f.earnings_lost_bn);
const SANKEY_TOP = SANKEY_LOSS.indexOf(Math.max(...SANKEY_LOSS)) + 1;
const SHAPE = decileShape();
export const DECILES_SUB = {
  title: 'Where the loss falls',
  icon: 'deciles',
  question: 'Which households lose most income?',
  hint: 'Watch the bars land, the bottom decile last',
  key: 'lose most',
  answerTo: 'p3-deciles-step',
  answer: `Largest fall: decile ${SHAPE.worst}, ${fmtDecilePct(VALUES[SHAPE.worst - 1])}`,
  takeaway: SHAPE.upperMiddle ? 'Falls in income peak in the upper-middle deciles, as the study reports' : 'The fall in income differs across the distribution; the bottom decile is not a finding',
};
// The deciles the first step lights: the upper-middle ones (6 to 9) when the
// largest fall is there, else the largest fall alone.
const UPPER = SHAPE.upperMiddle ? ['d6', 'd7', 'd8', 'd9'] : [`d${SHAPE.worst}`];
const MARKER = { [SHAPE.worst]: 1, 10: 2, 1: 3 };

// Bars grow from the zero line (kind b): deciles 2 to 10, 40ms apart, then
// the largest fall takes the highlight, then decile 1 grows last, grey.
const ORDER_DELAY = (n) => (n === 1 ? 9 * 40 + 500 : (n - 2) * 40);
function DecBar({ v, on, fill, delay }) {
  const zx = ((0 - LO) / (HI - LO)) * 100;
  const w = (Math.abs(v) / (HI - LO)) * 100;
  return (
    <svg className="p3-bar" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
      {v >= 0 ? (
        <GrowRect x={zx} y={1} width={w} height={8} on={on} horizontal className={fill} delay={delay} />
      ) : (
        <g transform={`translate(${zx} 0) scale(-1 1)`}>
          <GrowRect x={0} y={1} width={w} height={8} on={on} horizontal className={fill} delay={delay} />
        </g>
      )}
      <line x1={zx} x2={zx} y1={0} y2={10} className="p3-zero" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DecilesFigure({ ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  return (
    <figure className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead
        icon="deciles"
        title="Change in household disposable income by income decile"
        y="% change in disposable income, before housing costs"
        x="Income decile, 1 = bottom"
        unit={
          <>
            Central case <DrawsChip>{DEC.draws} draws</DrawsChip>
          </>
        }
        replay={e.replay}
      />
      <ol className="p3-rows p3-deciles">
        {VALUES.map((v, i) => {
          const n = i + 1;
          const first = n === 1;
          const fill = first ? 'p3-fill-muted' : v < 0 ? 'p3-fill-loss' : 'p3-fill-gain';
          const name = n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n);
          const m = markProps(`d${n}`, `p3-row p3-dec${first ? ' is-caveat' : ''}${n === SHAPE.worst ? ' is-worst' : ''}`);
          return (
            <li key={n} {...m} data-decile={n} style={{ '--beat': `${ORDER_DELAY(n)}ms` }}>
              <span className="p3-row-label p3-dec-label">
                {MARKER[n] ? <NumMarker n={MARKER[n]} /> : null} {name}
              </span>{' '}
              <span className="p3-row-bar">
                <DecBar v={v} on={e.on} fill={fill} delay={ORDER_DELAY(n)} />
              </span>{' '}
              <span className="p3-row-value">{first ? <span className="p3-muted">see ③</span> : fmtDecilePct(v)}</span>
            </li>
          );
        })}
      </ol>
      <Source files={[DEC.file, 'results/appendix/decile_ranking_sensitivity.csv']}>each household weighted by its number of members</Source>
    </figure>
  );
}

// Three steps, each one sentence about the bars it lights.
const topSentence = SHAPE.topNearZero
  ? 'the change is close to zero: its interval spans zero'
  : VALUES[9] >= 0
    ? 'assumed higher capital income offsets the earnings lost'
    : 'assumed higher capital income offsets part of the loss';
export const DECILE_STEPS = [
  {
    id: 'p3-deciles-step',
    kicker: 'Step 4 · Where the loss falls',
    icon: 'deciles',
    highlight: UPPER,
    title: SHAPE.upperMiddle ? (
      <>
        <Num n={1} mark={`d${SHAPE.worst}`} /> Falls peak in the upper-middle deciles, largest at <Key id={`d${SHAPE.worst}`}>decile {SHAPE.worst}</Key>
      </>
    ) : (
      <>
        <Num n={1} mark={`d${SHAPE.worst}`} /> The largest fall is at <Key id={`d${SHAPE.worst}`}>decile {SHAPE.worst}</Key>
      </>
    ),
  },
  {
    id: 'p3-deciles-step-2',
    icon: 'capital',
    highlight: ['d10'],
    title: (
      <>
        <Num n={2} mark="d10" /> At <Key id="d10">decile 10</Key>, {topSentence}
      </>
    ),
  },
  {
    id: 'p3-deciles-step-3',
    icon: 'caveat',
    highlight: ['d1'],
    title: (
      <>
        <Num n={3} mark="d1" /> <Key id="d1">Decile 1</Key> is not a finding: its sign depends on the ranking
      </>
    ),
    body: (
      <>
        <BottomDecileCaveat />
        <Fold
          groups={[
            {
              label: 'Caveat',
              items: ['The study does not report the bottom decile as a finding: some households there make large pension contributions and receive capital income'],
            },
            SHAPE.hump && SHAPE.upperMiddle && SHAPE.lossTop
              ? {
                  label: 'Finding',
                  items: ['Hump-shaped: earnings lost peak at the top, where assumed capital income offsets them'],
                }
              : null,
          ]}
        />
      </>
    ),
  },
];

// The deciles, for the colour-keyed words: each bar's colour.
const DECILE_MARKS = Object.fromEntries(
  VALUES.map((v, i) => [
    `d${i + 1}`,
    {
      color: i === 0 ? 'var(--pe-gray-300)' : v < 0 ? 'var(--c-loss)' : 'var(--c-gain)',
      shape: 'square',
      label: `Decile ${i + 1}`,
    },
  ]),
);

export default function Deciles() {
  return (
    <MarkProvider marks={DECILE_MARKS}>
      <Scrolly id="p3-deciles" sub={DECILES_SUB} steps={DECILE_STEPS} graphic={(i, r, ctx) => <DecilesFigure ctx={ctx} />} label="Change in household disposable income by income decile" />
    </MarkProvider>
  );
}
