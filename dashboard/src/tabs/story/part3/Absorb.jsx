'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import Sankey from '@/components/story/Sankey.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtBn, fmtInputPct, fmtShare } from './format.js';
import { D, FigureHead, OBR_SCENARIO, OutsideRebuildFlag, Source, Ico } from './shared.jsx';

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
      <FigureHead icon="benefits"
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
      <p className="p3-key p3-key-head p3-iconed">
        <Ico c="caveat" size={14} /> How to read it
      </p>
      <Items
        className="p3-key-items"
        items={[
          { icon: 'deciles', text: 'Each ribbon: a decile’s lost earnings, to where they land' },
          { icon: 'measure', text: 'Width: pounds a year' },
          { icon: 'caveat', text: 'Other items: mainly pension contributions no longer paid' },
          { icon: 'limit', text: 'Decile 1 carries the ranking caveat of step 4' },
          { icon: 'tax', text: <>Employers also stop paying {fmtBn(S.employer_ni_bn)} of NI: a further cost to government</> },
        ]}
      />
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
      icon: 'households',
      body: (
        <Items
          items={[
            { icon: 'jobLoss', text: 'Job loss on its own: fewer displaced, no other income rises' },
            { icon: 'households', text: 'Most earnings lost fall on households’ disposable income' },
            { icon: 'tax', text: <>Income tax, employee NI and benefits absorb {fmtShare(S.tax_benefit_share_pct)} of the loss</> },
            { icon: 'benefits', text: 'Benefits add little' },
          ]}
        />
      ),
    },
  ];
  return <Scrolly id="p3-absorb" steps={steps} graphic={Graphic} label="Where the earnings lost to job loss go, by income decile" />;
}
