'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtInputPct, fmtBn, fmtPp } from './format.js';
import { FigureHead, HBar, Source, ladder } from './shared.jsx';

// Block 2, what changes the cost: the paired ladder (20 draws, seeds 0-19)
// and, apart, the OBR-sized rows, a different and smaller shock. The graphic
// is the home of every rung's cost and poverty change.

export const OBR_RATE = Number(/([\d.]+)% displacement/.exec(ladder('obr').note)?.[1] ?? NaN);

const MAIN = [
  { id: 'central_20', label: 'Central case, the same 20 draws' },
  { id: 'takeup', label: 'Every benefit unit with a displaced worker claims UC' },
  { id: 'takeup_jsa', label: 'Plus 26 weeks of new-style JSA' },
  { id: 'wage_cuts', label: 'Wage cuts with the same gross earnings loss' },
];
const OBR = [
  { id: 'obr', label: 'OBR-sized displacement' },
  { id: 'obr_takeup', label: 'OBR-sized, every displaced worker’s benefit unit claims UC' },
  { id: 'obr_takeup_jsa', label: 'OBR-sized, plus new-style JSA' },
];
const MAX = Math.max(...[...MAIN, ...OBR].map((r) => ladder(r.id).cost_bn));

function Row({ r, on }) {
  const d = ladder(r.id);
  return (
    <li className={`p3-row${on ? ' is-reached' : ' is-pending'}`} data-row={r.id}>
      <span className="p3-row-label">{r.label}</span>
      {' '}
      <span className="p3-row-bar">
        <HBar value={d.cost_bn} max={MAX} on={on} fill="p3-fill-cost" />
      </span>
      {' '}
      <span className="p3-row-value">{fmtBn(d.cost_bn)}</span>
      {' '}
      <span className="p3-row-value p3-row-value-2">{fmtPp(d.poverty_pp)}</span>
    </li>
  );
}

function Graphic(active) {
  return (
    <figure className="p3-figure">
      <FigureHead title="What changes the cost" unit={`Mean of ${ladder('takeup').draws} draws per row`} />
      <div className="p3-cols" aria-hidden="true">
        <span />
        <span>Cost, a year</span>
        <span>Poverty</span>
      </div>
      <ol className="p3-rows p3-rows-2col">
        {MAIN.map((r, i) => (
          <Row key={r.id} r={r} on={i <= active} />
        ))}
      </ol>
      <p className={`p3-group-head${active >= 4 ? ' is-reached' : ' is-pending'}`}>A different, smaller shock</p>
      <ol className="p3-rows p3-rows-2col">
        {OBR.map((r) => (
          <Row key={r.id} r={r} on={active >= 4} />
        ))}
      </ol>
      <p className="p3-key">Poverty: change in absolute poverty before housing costs, percentage points.</p>
      <Source />
    </figure>
  );
}

export default function Ladder() {
  const steps = [
    {
      id: 'p3-ladder-base',
      kicker: 'What changes the cost',
      title: 'A paired base',
      body: (
        <p>
          The variants below reuse the first {ladder('takeup').draws} draws of the central case (seeds 0 to 19), so the same people lose
          their jobs in each. The first bar is the central case on those draws alone.
        </p>
      ),
    },
    {
      id: 'p3-ladder-takeup',
      title: 'Every displaced worker’s benefit unit claims Universal Credit',
      body: (
        <p>
          In the data, not every household entitled to Universal Credit claims it. When every benefit unit with a displaced worker claims,
          the cost rises, and absolute poverty before housing costs still rises, by less.
        </p>
      ),
    },
    {
      id: 'p3-ladder-jsa',
      title: 'Adding new-style Jobseeker’s Allowance',
      body: (
        <p>
          Displaced workers aged 18 to 65 who meet the contribution condition also receive 26 weeks of new-style JSA. The cost rises
          again and the poverty rise is smaller again.
        </p>
      ),
    },
    {
      id: 'p3-ladder-wage',
      title: 'Wage cuts instead of job losses',
      body: (
        <p>
          Here no one loses their job: wage cuts graded by occupational AI exposure remove the same gross earnings as the displacement
          did. The loss is spread across many earners. This row has the largest cost and the smallest rise in poverty.
        </p>
      ),
    },
    {
      id: 'p3-ladder-obr',
      title: 'An OBR-sized shock',
      body: (
        <p>
          The lower group is a different shock, not a step on the ladder:{' '}
          <span data-input="" data-path="ladder[obr].note">
            {fmtInputPct(OBR_RATE)}
          </span>{' '}
          of employees displaced, with no rise in other wages or in capital income, sized to the OBR’s March 2026 scenario. Without those
          two channels it costs more than the central case in the first bar, though fewer people lose their jobs.
        </p>
      ),
    },
  ];
  return <Scrolly id="p3-ladder" steps={steps} graphic={Graphic} label="Cost and poverty change for each variant of the displacement scenario" />;
}

