'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtBn } from './format.js';
import { D, FigureHead, HBar, Source, rule } from './shared.jsx';

// Block 3, who loses the job: the cost under each displacement rule. The
// exposure rule is the central case, whose cost is printed in block 1, so
// its bar carries no value here.

const ROWS = [
  { id: 'uniform', label: 'Uniform: every employee equally likely', step: 0 },
  { id: 'exposure', label: 'In proportion to AI exposure (the central case)', step: 0, same: true },
  { id: 'junior', label: 'Tilted towards junior workers', step: 1 },
  { id: 'compression', label: 'Expertise compression', step: 1 },
  { id: 'klein_top_loaded', label: 'Top-loaded stress test', step: 2 },
];
const MAX = Math.max(...D.rules.map((r) => r.cost_bn));

const KICKER = 'Who loses the job';

function Graphic(active) {
  return (
    <figure className="p3-figure">
      <FigureHead title="Cost to the public finances by who is displaced" unit={`Mean of ${rule('uniform').draws} paired draws per rule, a year`} />
      <ol className="p3-rows">
        {ROWS.map((r) => {
          const on = r.step <= active;
          const d = rule(r.id);
          return (
            <li key={r.id} className={`p3-row${on ? ' is-reached' : ' is-pending'}${r.step === active ? ' is-current' : ''}`} data-row={r.id}>
              <span className="p3-row-label">{r.label}</span>
              {' '}
              <span className="p3-row-bar">
                <HBar value={d.cost_bn} max={MAX} on={on} fill={r.same ? 'p3-fill-ref' : 'p3-fill-cost'} />
              </span>
              {' '}
              <span className="p3-row-value">{r.same ? <span className="p3-muted">as above</span> : fmtBn(d.cost_bn)}</span>
            </li>
          );
        })}
      </ol>
      <Source />
    </figure>
  );
}

export default function Rules() {
  const steps = [
    {
      id: 'p3-rules-uniform',
      kicker: KICKER,
      title: 'The same number displaced, different people',
      body: (
        <p>
          Each rule displaces the same expected number of employees and changes only who they are. When every employee is equally
          likely to be displaced, the cost is the lowest of the five rules.
        </p>
      ),
    },
    {
      id: 'p3-rules-tilts',
      kicker: KICKER,
      title: 'Two tilts',
      body: <p>The junior-tilted and expertise-compression rules shift the chance of displacement between groups of workers. One costs slightly less than the central case, the other more.</p>,
    },
    {
      id: 'p3-rules-top',
      kicker: KICKER,
      title: 'A stress test',
      body: (
        <p>
          The top-loaded rule is the study’s stress test. It has the largest cost of the five rules.
        </p>
      ),
    },
  ];
  return <Scrolly id="p3-rules" steps={steps} graphic={Graphic} label="Cost to the public finances under each rule for who is displaced" />;
}
