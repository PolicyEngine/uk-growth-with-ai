'use client';

import { useEffect, useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import Sankey from '@/components/story/Sankey.jsx';
import { fmtBn, fmtInputPct, fmtShare } from './format.js';
import { D, FigureHead, OutsideRebuild, Source } from './shared.jsx';

// Step 3, what the system absorbs (results.tex, "Household absorption of job
// loss by baseline decile"): a Sankey of the OBR-sized run, job loss alone,
// from results/next_runs/obr_household_deciles.csv. Each income decile's
// earnings lost flow to four destinations. The figure is the home of the
// destination totals and the earnings total; the card adds the share
// absorbed and employer NI, which sits on top of the earnings lost.

const S = D.sankey;
// Order: each small node sits between two tall ones, so labels never collide.
export const DESTS = [
  { id: 'disposable', key: 'disposable_bn', label: 'Lower disposable income', color: 'var(--c-loss)' },
  { id: 'benefits', key: 'benefits_bn', label: 'More benefits', color: 'var(--series-3)' },
  { id: 'tax', key: 'tax_ni_bn', label: 'Less income tax and NI', color: 'var(--series-2)' },
  { id: 'other', key: 'other_bn', label: 'Other, mainly pensions', color: 'var(--pe-gray-400)' },
];

// The graph: decile -> destination, £bn a year. Wide screens: ten deciles,
// and the destination labels carry the values. Phones (`phone`): deciles 1
// to 5 are one node, so the labels below the bars have room, and a key below
// the chart carries the values.
export function absorbGraph(phone = false) {
  const groups = phone ? [[0, 1, 2, 3, 4], [5], [6], [7], [8], [9]] : S.deciles.map((_, i) => [i]);
  const name = (g) => (g.length > 1 ? `${g[0] + 1}–${g[g.length - 1] + 1}` : String(g[0] + 1));
  const nodes = [
    ...groups.map((g) => ({ id: `d${name(g)}`, label: name(g), color: 'var(--pe-gray-500)' })),
    ...DESTS.map((d) => ({ id: d.id, label: phone ? '' : d.label, sub: phone ? undefined : fmtBn(S.total[d.key]), color: d.color })),
  ];
  const links = [];
  for (const g of groups) {
    for (const d of DESTS) links.push({ source: `d${name(g)}`, target: d.id, value: g.reduce((a, i) => a + S.deciles[i][d.key], 0), color: d.color });
  }
  return { nodes, links };
}

function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 600px)');
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}

function Graphic(phone) {
  const g = absorbGraph(phone);
  return (
    <figure className="p3-figure p3-sankey">
      <FigureHead
        title={
          <>
            Job loss alone, OBR-sized run (<span data-input="">{fmtInputPct(S.displacement_rate_pct)}</span> of employees displaced), not the
            central case
          </>
        }
        unit={`Where ${fmtBn(S.total.earnings_lost_bn)} of earnings lost goes, £bn a year, mean of ${S.draws} draws`}
      />
      <p className="p3-sankey-axis" aria-hidden="true">
        {phone ? (
          <span>Top: income decile (1 = bottom). Bottom: where the loss lands.</span>
        ) : (
          <>
            <span>Income decile (1 = bottom)</span>
            <span>Where the loss lands</span>
          </>
        )}
      </p>
      <Sankey
        graphs={[g]}
        label="Sankey diagram: earnings lost by each income decile, flowing to lower disposable income, lower income tax and employee NI, other items and more benefits"
        width={640}
        height={380}
        phoneHeight={250}
        pad={phone ? 6 : 8}
      />
      {phone ? (
        <ul className="p3-sankey-key">
          {DESTS.map((d) => (
            <li key={d.id}>
              <span className="p3-swatch" style={{ background: d.color }} /> {d.label} <b>{fmtBn(S.total[d.key])}</b>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="p3-key">
        How to read it: each ribbon runs from an income decile to where its lost earnings land; its width is pounds a year.
        {phone ? ' Deciles 1 to 5 are combined here.' : ''} Decile 1 carries the ranking caveat of step 4.
      </p>
      <Source>OBR-sized run, household flows by baseline decile</Source>
    </figure>
  );
}

export default function Absorb() {
  const phone = usePhone();
  const steps = [
    {
      id: 'p3-absorb',
      kicker: '3 · What the system absorbs',
      title: 'Where a lost pound of earnings goes',
      body: (
        <>
          <p>
            To see job loss on its own, this run displaces fewer employees, with no rise in other wages or capital income. Most of the
            earnings lost fall on households’ disposable income. Income tax, employee National Insurance and benefits absorb{' '}
            {fmtShare(S.tax_benefit_share_pct)} of the loss; benefits add little.
          </p>
          <p>
            Employers also stop paying {fmtBn(S.employer_ni_bn)} of National Insurance on these earnings, a cost to the government on top of
            the flows shown.
          </p>
          <p>
            <OutsideRebuild />
          </p>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-absorb" steps={steps} graphic={() => Graphic(phone)} label="Where the earnings lost to job loss go, by income decile" />;
}
