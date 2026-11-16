'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import Sankey from '@/components/story/Sankey.jsx';
import { fmtBn, fmtInputPct, fmtShare } from './format.js';
import { D, FigureHead, OBR_SCENARIO, OutsideRebuildFlag, Source } from './shared.jsx';

// Step 3, what the system absorbs (results.tex, "Household absorption of job
// loss by baseline decile"): a Sankey of the OBR-sized run, job loss alone,
// from results/next_runs/obr_household_deciles.csv. Each income decile's
// earnings lost flow to four destinations. The figure is the home of the
// destination totals, the earnings total and (in its key) employer NI, which
// sits on top of the earnings lost; the card adds the share absorbed.

const S = D.sankey;
// Order: each small node sits between two tall ones, so labels never
// collide. Labels are short (the shared Sankey keeps about 112px for the last
// column's labels on phones); the value is the `sub`.
export const DESTS = [
  { id: 'disposable', key: 'disposable_bn', label: 'Disposable income', color: 'var(--c-loss)' },
  { id: 'benefits', key: 'benefits_bn', label: 'More benefits', color: 'var(--series-3)' },
  { id: 'tax', key: 'tax_ni_bn', label: 'Less tax and NI', color: 'var(--series-2)' },
  { id: 'other', key: 'other_bn', label: 'Other items', color: 'var(--pe-gray-400)' },
];

// The graph: income decile -> destination, £bn a year, the same at every
// width (components/story/Sankey.jsx flows left to right on phones too).
export function absorbGraph() {
  const nodes = [
    ...S.deciles.map((_, i) => ({ id: `d${i + 1}`, label: String(i + 1), color: 'var(--pe-gray-500)' })),
    ...DESTS.map((d) => ({ id: d.id, label: d.label, sub: fmtBn(S.total[d.key]), color: d.color })),
  ];
  const links = [];
  S.deciles.forEach((f, i) => {
    for (const d of DESTS) links.push({ source: `d${i + 1}`, target: d.id, value: f[d.key], color: d.color });
  });
  return { nodes, links };
}

function Graphic() {
  const g = absorbGraph();
  return (
    <figure className="p3-figure p3-sankey">
      <FigureHead
        title={
          <>
            Job loss alone, a run sized to {OBR_SCENARIO} (<span data-input="">{fmtInputPct(S.displacement_rate_pct)}</span> of employees
            displaced), not the central case
          </>
        }
        unit={`Where ${fmtBn(S.total.earnings_lost_bn)} of earnings lost goes, £bn a year, mean of ${S.draws} draws`}
      />
      <OutsideRebuildFlag />
      <p className="p3-sankey-axis" aria-hidden="true">
        <span>Income decile (1 = bottom)</span>
        <span>Where the loss lands</span>
      </p>
      <Sankey
        graphs={[g]}
        label="Sankey diagram: earnings lost by each income decile, flowing to lower disposable income, lower income tax and employee NI, other items and more benefits"
        width={640}
        height={360}
        pad={7}
      />
      <p className="p3-key">
        How to read it: each ribbon runs from an income decile to where its lost earnings land; its width is pounds a year. Other items are
        mainly pension contributions no longer paid. Decile 1 carries the ranking caveat of step 4. Employers also stop paying{' '}
        {fmtBn(S.employer_ni_bn)} of National Insurance on these earnings, a cost to the government on top of the flows shown.
      </p>
      <Source>run sized to the OBR scenario, household flows by baseline decile</Source>
    </figure>
  );
}

export default function Absorb() {
  const steps = [
    {
      id: 'p3-absorb-step',
      kicker: '3 · What the system absorbs',
      title: 'Where a lost pound of earnings goes',
      body: (
        <>
          <p>
            To see job loss on its own, this run displaces fewer employees, with no rise in other wages or capital income. Most of the
            earnings lost fall on households’ disposable income. Income tax, employee National Insurance and benefits absorb{' '}
            {fmtShare(S.tax_benefit_share_pct)} of the loss; benefits add little.
          </p>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-absorb" steps={steps} graphic={Graphic} label="Where the earnings lost to job loss go, by income decile" />;
}
