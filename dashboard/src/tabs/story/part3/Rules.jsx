'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn } from './format.js';
import { About, FigureHead, HBar, Source, rule, Ico } from './shared.jsx';

// Step 5, who loses the job: the cost under the four stylised displacement
// rules (results.tex, "Who loses the job"). The exposure rule is the central
// case, whose cost is printed in step 1: its label links there and its bar
// carries no value. The
// top-loaded stress test, and every rule's poverty and Gini change, are on
// Explore > Households.

const ROWS = [
  { id: 'uniform', icon: 'draws', label: 'Uniform: every employee equally likely' },
  { id: 'junior', icon: 'age', label: 'Tilted towards workers aged 16 to 24' },
  { id: 'exposure', icon: 'ai', label: 'In proportion to AI exposure: ', same: true },
  { id: 'compression', icon: 'pay', label: 'Expertise compression: higher earners in exposed occupations' },
];
const MAX = Math.max(...ROWS.map((r) => rule(r.id).cost_bn));

function Graphic() {
  return (
    <figure className="p3-figure">
      <FigureHead icon="scenario" title="Cost to the public finances by who is displaced" unit={`£bn a year, mean of ${rule('uniform').draws} paired draws per rule`} />
      <ol className="p3-rows">
        {ROWS.map((r) => {
          const d = rule(r.id);
          return (
            <li key={r.id} className="p3-row is-reached" data-row={r.id}>
              <span className="p3-row-label">
                <Ico c={r.icon} /> {r.label}
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
      <Items
        className="p3-key-items"
        items={[
          { icon: 'jobLoss', text: 'Each rule displaces the same expected number of employees' },
          { icon: 'onPath', text: 'Every other wage and capital-income change is the same' },
        ]}
      />
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
      icon: 'scenario',
      body: (
        <>
          <Items
            items={[
              { icon: 'jobLoss', text: 'The same expected number of job losses, moved between groups' },
              { icon: 'cost', text: 'The cost changes by several billion pounds a year' },
              { icon: 'tax', text: 'Each person displaced takes their income tax and NI with them' },
              { icon: 'poverty', text: 'Uniform displacement costs least but raises poverty more than the central case' },
            ]}
          />
          <About>
            <Items
              items={[
                { icon: 'why', text: 'Two possible routes, which the study’s draws do not separate:' },
                { icon: 'households', text: 'More job losses in lower-income households' },
                { icon: 'jobLoss', text: 'Or more sole earners displaced' },
                {
                  icon: 'link',
                  text: (
                    <NavLink tab="explore" sub="households" anchor="hh-rules">
                      Poverty and inequality by rule, and a top-loaded stress test
                    </NavLink>
                  ),
                },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-rules" steps={steps} graphic={Graphic} label="Cost to the public finances under four rules for who is displaced" />;
}

