'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtDecilePct } from './format.js';
import { GrowRect } from '@/components/story/primitives.jsx';
import { D, FigureHead, Fig, Num, NumMarker, Key, MarkProvider, Source, entryClass, useBeat, asLines } from './shared.jsx';

// Step 4, change in household disposable income (before housing costs) by
// income decile. Deciles 2 to 10 are drawn at full strength in the part's
// loss and gain tokens; no step dims them, and each row's label and value
// stay at full strength. Decile 1 is drawn grey (neutral) with its value and
// the words "no conclusion drawn": its direction depends on the ranking, and
// the second step's table gives it under the two other rankings. Dimmed bars
// keep 60% (story-part3.css). The flows by decile (a smaller, OBR-sized run)
// are on Explore > Households, one link line here.

const DEC = D.deciles;
const VALUES = DEC.values;
const LO = Math.floor(Math.min(0, ...VALUES));
const HI = Math.ceil(Math.max(0, ...VALUES));

// Decile 1 under the two other rankings (decile_ranking_sensitivity.csv).
const grab = (name) => D.rankings.find((r) => r.id === name)?.values[0] ?? NaN;
export const RANK_PRE_PENSION = grab('pre_pension');
export const RANK_EXCL_PPC = grab('hbai_excl_large_ppc');

// The other two rankings are results (counted by the number check), not
// inputs. A ranking whose value cannot be read is left out. Decile 1 on the
// ranking used here is printed on its bar's row (its home), not in the table.
export function bottomDecileRankings() {
  return [
    [RANK_PRE_PENSION, 'Ranked on income before pension contributions', 'rankings.pre_pension.values.0'],
    [RANK_EXCL_PPC, 'Leaving out large personal pension contributions', 'rankings.hbai_excl_large_ppc.values.0'],
  ].filter(([v]) => fmtDecilePct(v));
}
// Decile 1 under the two other rankings: a small ruled table (the home of
// these figures), in the second step's card.
export function BottomDecileCaveat() {
  return (
    <table className="p3-rank-table" data-caveat="bottom-decile">
      <caption className="p3-rank-cap">Decile 1 under other rankings</caption>
      <tbody>
        {bottomDecileRankings().map(([v, how, path]) => (
          <tr key={how}>
            <th scope="row">{how}</th>
            <td>
              <Fig path={path} mark="d1">
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
    // deciles 6 to 9: the largest fall is there and they are the four largest falls
    upperMiddle: worst >= 6 && worst <= 9 && [...values].sort((a, b) => a - b).slice(0, 4).every((v) => values.slice(5, 9).includes(v)),
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
};
// The deciles the first step lights: the upper-middle ones (6 to 9) when the
// largest fall is there, else the largest fall alone.
const UPPER = SHAPE.upperMiddle ? ['d6', 'd7', 'd8', 'd9'] : [`d${SHAPE.worst}`];
const MARKER = { [SHAPE.worst]: 1, 10: 2 };

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
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  return (
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead
        icon="deciles"
        title={
          <>
            <span className="p3-long">Change in household disposable income by income decile</span>
            <span className="p3-short">Disposable income by decile</span>
          </>
        }
        y={
          <>
            <span className="p3-long">% change in disposable income, before housing costs</span>
            <span className="p3-short">% change, before housing costs</span>
          </>
        }
        x="Income decile, 1 = bottom"
        unit={`Main case, ${DEC.draws} draws`}
        replay={e.replay}
        source={<DecilesSource />}
      />
      <ol className="p3-rows p3-deciles">
        {VALUES.map((v, i) => {
          const n = i + 1;
          const first = n === 1;
          const fill = first ? 'p3-fill-caveat' : v < 0 ? 'p3-fill-loss' : 'p3-fill-gain';
          const name = n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n);
          // the mark is the bar alone: a step's highlight never fades a label or value
          return (
            <li key={n} className={`p3-row p3-dec${first ? ' is-caveat' : ''}${n === SHAPE.worst ? ' is-worst' : ''}`} data-decile={n} style={{ '--beat': `${ORDER_DELAY(n)}ms` }}>
              <span className="p3-row-label p3-dec-label">
                {MARKER[n] ? <NumMarker n={MARKER[n]} /> : null} {name}
              </span>{' '}
              <span className="p3-row-bar" data-mark={`d${n}`}>
                <DecBar v={v} on={e.on} fill={fill} delay={ORDER_DELAY(n)} />
              </span>{' '}
              <span className="p3-row-value">{fmtDecilePct(v)}</span>
              {first ? <span className="p3-dec-note">no conclusion drawn</span> : null}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

// Two steps, each one sentence about the bars it names; no folds.
const topSentence = SHAPE.topNearZero ? 'decile 10 barely moves' : VALUES[9] >= 0 ? 'decile 10 gains' : 'decile 10 falls least';
export const DECILE_STEPS = [
  {
    id: 'p3-deciles-step',
    icon: 'deciles',
    highlight: [...UPPER, 'd10'],
    title: (
      <>
        Income falls most {SHAPE.upperMiddle ? 'in deciles 6 to 9, most ' : ''}in <Num n={1} mark={`d${SHAPE.worst}`} /> <Key id={`d${SHAPE.worst}`}>decile {SHAPE.worst}</Key>;{' '}
        <Num n={2} mark="d10" /> <Key id="d10">{topSentence}</Key>
      </>
    ),
  },
  {
    id: 'p3-deciles-step-2',
    icon: 'caveat',
    highlight: ['d1'],
    title: (
      <>
        <Key id="d1">Decile 1</Key>’s direction depends on how households are ranked, so no conclusion is drawn
      </>
    ),
    body: <BottomDecileCaveat />,
  },
];

// The deciles, for the colour-keyed words: each bar's colour.
const DECILE_MARKS = Object.fromEntries(
  VALUES.map((v, i) => [
    `d${i + 1}`,
    {
      color: i === 0 ? 'var(--pe-gray-500)' : v < 0 ? 'var(--c-loss)' : 'var(--c-gain)',
      shape: 'square',
      label: `Decile ${i + 1}`,
    },
  ]),
);

// The figure's notes and sources, behind its "Sources and notes" button.
function DecilesSource() {
  return (
    <Source
      files={[DEC.file, 'results/appendix/decile_ranking_sensitivity.csv']}
      groups={[
        {
          title: 'More',
          notes: [
            <>
              Where each decile’s lost earnings go, in a smaller run:{' '}
              <NavLink tab="story" anchor="p3-pound">
                Where a lost pound goes
              </NavLink>
              .
            </>,
          ],
        },
      ]}
    >
      each household weighted by its members
    </Source>
  );
}

export default function Deciles() {
  return (
    <MarkProvider marks={DECILE_MARKS}>
      <Scrolly id="p3-deciles" scene sub={DECILES_SUB} steps={asLines(DECILE_STEPS)} graphic={(i, r, ctx) => <DecilesFigure ctx={ctx} />} label="Change in household disposable income by income decile" />
    </MarkProvider>
  );
}
