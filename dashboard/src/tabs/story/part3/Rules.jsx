'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn } from './format.js';
import { About, FigureHead, HBar, Source, rule } from './shared.jsx';

// Step 5, who loses the job: the cost under the four stylised displacement
// rules (results.tex, "Who loses the job"). The exposure rule is the central
// case, whose cost is printed in step 1: its label links there and its bar
// carries no value. The
// top-loaded stress test, and every rule's poverty and Gini change, are on
// Explore > Households.

const ROWS = [
  { id: 'uniform', label: 'Uniform: every employee equally likely' },
  { id: 'junior', label: 'Tilted towards workers aged 16 to 24' },
  { id: 'exposure', label: 'In proportion to AI exposure: ', same: true },
  { id: 'compression', label: 'Expertise compression: higher earners in exposed occupations' },
];
const MAX = Math.max(...ROWS.map((r) => rule(r.id).cost_bn));

function Graphic() {
  return (
    <figure className="p3-figure">
      <FigureHead title="Cost to the public finances by who is displaced" unit={`£bn a year, mean of ${rule('uniform').draws} paired draws per rule`} />
      <ol className="p3-rows">
        {ROWS.map((r) => {
          const d = rule(r.id);
          return (
            <li key={r.id} className="p3-row is-reached" data-row={r.id}>
              <span className="p3-row-label">
                {r.label}
                {r.same ? <a href="#p3-central-step">the central case, step 1</a> : null}
              </span>{' '}
              <span className="p3-row-bar">
                <HBar value={d.cost_bn} max={MAX} fill={r.same ? 'p3-fill-ref' : 'p3-fill-cost'} />
              </span>{' '}
              <span className="p3-row-value">{r.same ? null : fmtBn(d.cost_bn)}</span>
            </li>
          );
        })}
      </ol>
      <p className="p3-key">Each rule displaces the same expected number of employees; every other wage and capital-income change is the same.</p>
      <Source />
    </figure>
  );
}

export default function Rules() {
  const steps = [
    {
      id: 'p3-rules-step',
      kicker: '5 · Who loses the job',
      title: 'The same number displaced, different people',
      body: (
        <>
          <p>
            Moving the same expected number of job losses between groups of workers changes the cost by several billion pounds a year: each
            person displaced takes their income tax and National Insurance with them. Uniform displacement costs least but raises poverty by
            more than the central case.
          </p>
          <About>
            <p>
              The study names two possible routes for the larger poverty rise, more job losses in lower-income households or more sole earners
              displaced, and its draws do not separate them.{' '}
              <NavLink tab="explore" sub="households" anchor="hh-rules">
                Poverty and inequality under each rule, and a top-loaded stress test
              </NavLink>
              .
            </p>
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-rules" steps={steps} graphic={Graphic} label="Cost to the public finances under four rules for who is displaced" />;
}

