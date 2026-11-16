'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtDecilePct } from './format.js';
import { GrowRect } from '@/components/story/primitives.jsx';
import { useIsPhone } from '@/components/story/motion.js';
import { D, FigureHead, Source, entryClass, useBeat } from './shared.jsx';

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
export function BottomDecileCaveat() {
  return (
    <div className="p3-caveat-items" data-caveat="bottom-decile">
      <Items
        items={[
          { icon: 'caveat', text: 'The study does not report the bottom income decile as a finding' },
          { icon: 'why', text: 'Some households there make large pension contributions and receive capital income' },
          { icon: 'range', text: 'Its sign depends on how households are ranked:' },
        ]}
      />
      <Items
        className="p3-rank-items"
        items={bottomDecileRankings().map(([v, how]) => ({
          key: how,
          icon: signIcon(v),
          text: (
            <>
              <strong>{fmtDecilePct(v)}</strong> {how}
            </>
          ),
        }))}
      />
    </div>
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
  };
}
const SHAPE = decileShape();

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

function DecilesFigure({ phone, ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead icon="deciles" title="Change in household disposable income by income decile" unit="Per cent, before housing costs, central case" replay={e.replay} />
      <ol className="p3-rows p3-deciles">
        {VALUES.map((v, i) => {
          const n = i + 1;
          const first = n === 1;
          const fill = first ? 'p3-fill-muted' : v < 0 ? 'p3-fill-loss' : 'p3-fill-gain';
          const name = n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n);
          return (
            <li
              key={n}
              className={`p3-row p3-dec${first ? ' is-caveat' : ''}${n === SHAPE.worst ? ' is-worst' : ''}`}
              data-decile={n}
              style={{ '--beat': `${ORDER_DELAY(n)}ms` }}
            >
              <span className="p3-row-label p3-dec-label">{name}</span>{' '}
              <span className="p3-row-bar">
                <DecBar v={v} on={e.on} fill={fill} delay={ORDER_DELAY(n)} />
              </span>{' '}
              <span className="p3-row-value">{first ? <span className="p3-muted">see note</span> : fmtDecilePct(v)}</span>
              {first && !phone ? <BottomDecileCaveat /> : null}
            </li>
          );
        })}
      </ol>
      <Source>mean of {DEC.draws} draws, each household weighted by its number of members</Source>
    </figure>
  );
}

export default function Deciles() {
  // On phones the caveat moves from the graphic into the card, so the
  // sticky graphic stays short; it is rendered in one place only.
  const phone = useIsPhone();
  const steps = [
    {
      id: 'p3-deciles-step',
      kicker: '4 · Where the loss falls',
      title: SHAPE.upperMiddle ? 'The largest falls are in the upper-middle deciles' : `The largest fall is in decile ${SHAPE.worst}`,
      icon: 'deciles',
      body: (
        <>
          <Items
            items={[
              SHAPE.hump && SHAPE.upperMiddle && { icon: 'deciles', text: 'Hump-shaped: assumed job losses fall mostly in upper-middle deciles' },
              { icon: signIcon(VALUES[SHAPE.worst - 1]), text: `Largest fall: decile ${SHAPE.worst}` },
              SHAPE.topLess && { icon: 'capital', text: VALUES[9] >= 0 ? 'At the top, higher capital income offsets the earnings lost' : 'At the top, higher capital income offsets part of the loss' },
              { icon: 'caveat', text: 'Decile 1 is drawn grey: not a finding; see the note' },
            ]}
          />
          {phone ? <BottomDecileCaveat /> : null}
        </>
      ),
    },
  ];
  return <Scrolly id="p3-deciles" steps={steps} graphic={(i, r, ctx) => <DecilesFigure phone={phone} ctx={ctx} />} label="Change in household disposable income by income decile" />;
}
