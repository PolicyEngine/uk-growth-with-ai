'use client';

import { useEffect, useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
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
      <FigureHead icon="deciles" title="Change in household disposable income by income decile" unit="Per cent, before housing costs, central case" />
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
      icon: 'deciles',
      body: (
        <>
          <Items
            items={[
              { icon: 'deciles', text: 'Hump-shaped: assumed job losses fall mostly in upper-middle deciles' },
              { icon: signIcon(VALUES[WORST - 1]), text: `Largest fall: decile ${WORST}` },
              { icon: 'capital', text: 'At the top, higher capital income offsets the earnings lost' },
              { icon: 'caveat', text: 'Decile 1 is drawn grey: not a finding; see the note' },
            ]}
          />
          {phone ? <BottomDecileCaveat /> : null}
        </>
      ),
    },
  ];
  return <Scrolly id="p3-deciles" steps={steps} graphic={() => Graphic(phone)} label="Change in household disposable income by income decile" />;
}
