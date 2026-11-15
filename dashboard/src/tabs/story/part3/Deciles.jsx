'use client';

import { useEffect, useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtDecilePct } from './format.js';
import { D, DivBar, FigureHead, Source } from './shared.jsx';

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

function Graphic(phone) {
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
            <li key={n} className={`p3-row p3-dec${first ? ' is-caveat' : ''}`} data-decile={n}>
              <span className="p3-row-label p3-dec-label">{name}</span>{' '}
              <span className="p3-row-bar">
                <DivBar value={v} lo={LO} hi={HI} on fill={fill} />
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

// The decile with the largest fall (1-based), read from the data.
const WORST = VALUES.indexOf(Math.min(...VALUES)) + 1;

export default function Deciles() {
  // On phones the caveat moves from the graphic into the card, so the
  // sticky graphic stays short; it is rendered in one place only.
  const phone = usePhone();
  const steps = [
    {
      id: 'p3-deciles-step',
      kicker: '4 · Where the loss falls',
      title: 'The largest falls are in the upper-middle deciles',
      body: (
        <>
          <p>
            Ranked by baseline income, the change is hump-shaped. Job losses concentrate in the upper-middle deciles, where the largest fall is in
            decile {WORST}. At the top, higher capital income offsets the earnings lost, and the change is close to zero.
          </p>
          <p>
            The bottom decile is not a finding: some households there make large pension contributions and receive capital income, and its sign
            changes with how households are ranked.
          </p>
          {phone ? <BottomDecileCaveat /> : null}
        </>
      ),
    },
  ];
  return <Scrolly id="p3-deciles" steps={steps} graphic={() => Graphic(phone)} label="Change in household disposable income by income decile" />;
}
