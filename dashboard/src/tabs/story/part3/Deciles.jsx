'use client';

import { useId, useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtDecilePct } from './format.js';
import { GrowRect } from '@/components/story/primitives.jsx';
import { D, FigureHead, Fig, Num, NumMarker, Key, MarkProvider, Source, entryClass, useBeat, asLines, MODEL_YEAR } from './shared.jsx';
import { SECTION } from './sources.jsx';
import { ChartHover } from '@/components/story/chart/index.js';

// Step 4, change in household disposable income (before housing costs) by
// income decile. Deciles 2 to 10 are drawn at full strength in the part's
// loss and gain tokens; no step dims them, and each row's label and value
// stay at full strength. Decile 1 is not a result (Vahid, 18 Nov: "why first
// decile is improving?"): a dashed, unfilled outline with its value muted,
// and "not a reliable result: see why", a fold that says why (households
// that only look poor under HBAI: pension contributions deducted, savings
// that gain from the capital shock) and links to the paper's section. Its
// direction depends on the ranking; the second step's table gives it under
// the two other rankings. The run is the FY 2027-28 rerun at uk-ai-study
// main (cd54488), where HBAI decile 1 is +1.86% (paper macro
// genDecileRankHbaiDOneSignedPct); the paper's +1.78% is the earlier
// Microcosm run (9166f9e) on the data/microcosm-2024-25 branch. Dimmed bars
// keep 60% (story-part3.css). The flows by decile (a smaller, OBR-sized run)
// are on Explore > Households, one link line here.

const DEC = D.deciles;
const VALUES = DEC.values;
// the tooltip of each decile (M4): its change, from the data
const decName = (n) => (n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n));
const TIPS = VALUES.map((v, i) => ({
  head: `Decile ${decName(i + 1)}`,
  rows: [
    { name: 'Disposable income', value: fmtDecilePct(v), icon: 'deciles' },
    ...(i === 0 ? [{ name: 'Direction', value: 'depends on the ranking', icon: 'caveat' }] : []),
  ],
  unit: `% change, before housing costs. Main case, ${MODEL_YEAR}, ${DEC.draws} draws. The household study.`,
}));
// the title is a finding (story-finding-titles-fable.md): deciles 2 to 9
// all fall, each interval wholly below zero
const FALLS_2_9 = VALUES.length >= 9 && VALUES.slice(1, 9).every((v, i) => v < 0 && (DEC.ci_high?.[i + 1] ?? 0) < 0);
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
  // M15 wording (Fable 5.2 ruling for Vahid, 24 Nov): no figure from the
  // scene; the group of deciles where the falls overlap, and the top
  // decile only where its interval spans zero
  answer: SHAPE.upperMiddle
    ? `Deciles 6 to 9 lose the largest share of income${SHAPE.topNearZero ? '; the top decile shows no clear change' : ''}.`
    : `The largest fall, as a share of income, is in decile ${SHAPE.worst}.`,
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

// Decile 1's row note: "see why" opens a small note under the row (a
// button, aria-expanded; Escape or a second press closes it), with the
// reason and a link to the paper's section. The figure in it is the
// step-2 table's (its home): the note is hidden at rest, out of the page
// text the number check reads.
const PAPER_DECILES = `${SECTION.results.url}#L54`;
export function DecileOneWhy({ lead = null, rank = true }) {
  const [open, setOpen] = useState(false);
  const id = `p3-d1-why${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const pre = RANK_PRE_PENSION;
  return (
    <span className="p3-dec-note p3-dec-why" onKeyDown={(e) => (e.key === 'Escape' ? setOpen(false) : null)}>
      {lead}not a reliable result:{' '}
      <button type="button" className="p3-dec-why-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        see why
      </button>
      <span id={id} role="note" className="p3-dec-why-pop" hidden={!open}>
        <span className="p3-dec-why-p">Some households here only look low-income: large pension contributions are taken off their income, but they own savings that gain from the capital shock.</span>
        {rank && Number.isFinite(pre) ? (
          <span className="p3-dec-why-p">
            Ranked before pension contributions, this decile {pre < 0 ? `loses ${Math.abs(pre).toFixed(2)}%` : `changes by ${fmtDecilePct(pre)}`}.{' '}
            <a href={PAPER_DECILES} target="_blank" rel="noopener noreferrer">
              The paper, “Where the income loss falls”
            </a>
          </span>
        ) : (
          <span className="p3-dec-why-p">
            <a href={PAPER_DECILES} target="_blank" rel="noopener noreferrer">
              The paper, “Where the income loss falls”
            </a>
          </span>
        )}
      </span>
    </span>
  );
}

function DecilesFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  return (
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead
        icon="deciles"
        title={
          FALLS_2_9 ? (
            'Disposable income falls in every decile from 2 to 9'
          ) : (
            <>
              <span className="p3-long">Change in household disposable income by income decile</span>
              <span className="p3-short">Disposable income by decile</span>
            </>
          )
        }
        fallback={!FALLS_2_9}
        y="% change in disposable income, before housing costs"
        x="by income decile (1 = bottom)"
        unit={`Main case, ${MODEL_YEAR}, ${DEC.draws} draws. The household study.`}
        replay={e.replay}
        source={<DecilesSource />}
      />
      <ChartHover label="Change in disposable income by income decile" items={TIPS}>
        <ol className="p3-rows p3-deciles">
        {VALUES.map((v, i) => {
          const n = i + 1;
          const first = n === 1;
          const fill = first ? 'p3-fill-caveat' : v < 0 ? 'p3-fill-loss' : 'p3-fill-gain';
          const name = n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n);
          // the mark is the bar alone: a step's highlight never fades a label or value
          return (
            <li key={n} className={`p3-row p3-dec${first ? ' is-caveat' : ''}${n === SHAPE.worst ? ' is-worst' : ''}`} data-decile={n} data-tip={i} style={{ '--beat': `${ORDER_DELAY(n)}ms` }}>
              <span className="p3-row-label p3-dec-label">
                {MARKER[n] ? <NumMarker n={MARKER[n]} /> : null} {name}
              </span>{' '}
              <span className="p3-row-bar" data-mark={`d${n}`}>
                <DecBar v={v} on={e.on} fill={fill} delay={ORDER_DELAY(n)} />
              </span>{' '}
              <span className="p3-row-value">{fmtDecilePct(v)}</span>
              {first ? <DecileOneWhy /> : null}
            </li>
          );
        })}
        </ol>
      </ChartHover>
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
