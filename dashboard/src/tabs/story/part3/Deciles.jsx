'use client';

import { useEffect, useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtDecilePct } from './format.js';
import { D, DivBar, FigureHead, Source } from './shared.jsx';

// Block 6, change in household disposable income (before housing costs) by
// income decile. Decile 1 is drawn grey with the caveat beside it and no
// value label: the caveat sentence is the home of its figure, because the
// study does not report the bottom income decile as a finding.

const DEC = D.deciles;
const VALUES = DEC.values;
const LO = Math.floor(Math.min(0, ...VALUES));
const HI = Math.ceil(Math.max(0, ...VALUES));

// The two other rankings, read from the caveat string (no numeric field).
const grab = (name) => Number(new RegExp(`${name} (-?[\\d.]+)%`).exec(DEC.bottom_decile_caveat)?.[1] ?? NaN);
export const RANK_PRE_PENSION = grab('pre_pension');
export const RANK_EXCL_PPC = grab('hbai_excl_large_ppc');

// The other two rankings are results (counted by the number check), not
// inputs. A ranking whose value cannot be read is left out of the sentence.
export function BottomDecileCaveat() {
  const others = [
    [RANK_PRE_PENSION, 'ranking on income before pension contributions'],
    [RANK_EXCL_PPC, 'leaving out households with large personal pension contributions'],
  ].filter(([v]) => fmtDecilePct(v));
  return (
    <p className="p3-caveat" data-caveat="bottom-decile">
      Decile 1 is drawn in grey. The study does not report the bottom income decile as a finding, because its sign depends on how
      households are ranked: {fmtDecilePct(VALUES[0])} on the ranking used here
      {others.map(([v, how], i) => (
        <span key={how}>
          {i === others.length - 1 ? ', and ' : ', '}
          {fmtDecilePct(v)} {how}
        </span>
      ))}
      .
    </p>
  );
}

// True at phone width (<= 900px). Without matchMedia (tests, server render)
// it is false, so the caveat sits in the graphic.
function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}

// Which deciles each step brings forward (1-based).
const FOCUS = [
  [2, 3, 4, 5, 6, 7, 8, 9],
  [10],
  [1],
];

function Graphic(active, phone) {
  const focus = FOCUS[active] ?? FOCUS[0];
  return (
    <figure className="p3-figure">
      <FigureHead title="Change in household disposable income by income decile" unit="Per cent, before housing costs, central case" />
      <ol className="p3-rows p3-deciles">
        {VALUES.map((v, i) => {
          const n = i + 1;
          const first = n === 1;
          const fill = first ? 'p3-fill-muted' : v < 0 ? 'p3-fill-loss' : 'p3-fill-gain';
          const name = n === 1 ? '1 (bottom)' : n === 10 ? '10 (top)' : String(n);
          return (
            <li key={n} className={`p3-row p3-dec${focus.includes(n) ? ' is-current' : ' is-dim'}${first ? ' is-caveat' : ''}`} data-decile={n}>
              <span className="p3-row-label p3-dec-label">{name}</span>
              {' '}
              <span className="p3-row-bar">
                <DivBar value={v} lo={LO} hi={HI} on fill={fill} />
              </span>
              {' '}
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

const KICKER = 'By income decile';

export default function Deciles() {
  // On phones the caveat moves from the graphic into the last step card, so
  // the sticky graphic stays short; it is rendered in one place only.
  const phone = usePhone();
  const steps = [
    {
      id: 'p3-dec-middle',
      kicker: KICKER,
      title: 'Average income falls in deciles 2 to 9',
      body: (
        <p>
          In the central case, household disposable income before housing costs falls in deciles 2 to 9 of the baseline income
          distribution. The largest fall is in decile 8.
        </p>
      ),
    },
    {
      id: 'p3-dec-top',
      kicker: KICKER,
      title: 'The top income decile',
      body: <p>In the top income decile the change is small, and its confidence interval across draws includes zero.</p>,
    },
    {
      id: 'p3-dec-bottom',
      kicker: KICKER,
      title: 'The bottom income decile',
      body: (
        <>
          <p>
            The bottom income decile shows a rise on this ranking, but the study does not treat it as a finding: some households with
            large pension contributions sit in decile 1 and receive capital income, and the sign changes under other rankings.
          </p>
          {phone ? <BottomDecileCaveat /> : null}
        </>
      ),
    },
  ];
  return <Scrolly id="p3-deciles" steps={steps} graphic={(active) => Graphic(active, phone)} label="Change in household disposable income by income decile" />;
}
