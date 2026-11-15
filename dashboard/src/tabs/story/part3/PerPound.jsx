'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtPence } from './format.js';
import { FigureHead, HBar, Source, perPound } from './shared.jsx';

// Block 4, cost per pound of gross earnings lost, on two bases. The graphic
// is the home of the pence; the cards define the bases and the draws.

const CASES = [
  { id: 'job_loss', label: 'Job loss', step: 0 },
  { id: 'job_loss_takeup', label: 'Job loss, every displaced worker’s benefit unit claims UC', step: 1 },
  { id: 'job_loss_takeup_jsa', label: 'Job loss, plus new-style JSA', step: 1 },
  { id: 'wage_cuts', label: 'Wage cuts', step: 2 },
];

function Graphic(active) {
  return (
    <figure className="p3-figure">
      <FigureHead
        title="Cost per pound of gross earnings lost"
        unit={
          <>
            Pence for each <span data-axis="">£1</span> of earnings lost; a full bar is <span data-axis="">100p</span>
          </>
        }
      />
      <p className="p3-legend" aria-hidden="true">
        <span className="p3-swatch p3-fill-gov" /> Government balance <span className="p3-swatch p3-fill-hh" /> Household
      </p>
      <ol className="p3-rows">
        {CASES.map((c) => {
          const d = perPound(c.id);
          const on = c.step <= active;
          return (
            <li key={c.id} className={`p3-case${on ? ' is-reached' : ' is-pending'}`} data-row={c.id}>
              <span className="p3-case-label">{c.label}</span>
              <span className="p3-row p3-row-sub">
                <span className="p3-row-label p3-sub-label">Government balance</span>
                {' '}
                <span className="p3-row-bar">
                  <HBar value={d.government_p} max={100} on={on} fill="p3-fill-gov" />
                </span>
                {' '}
                <span className="p3-row-value">{fmtPence(d.government_p)}</span>
              </span>
              <span className="p3-row p3-row-sub">
                <span className="p3-row-label p3-sub-label">Household</span>
                {' '}
                <span className="p3-row-bar">
                  <HBar value={d.household_p} max={100} on={on} fill="p3-fill-hh" delay={120} />
                </span>
                {' '}
                <span className="p3-row-value">{fmtPence(d.household_p)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <Source />
    </figure>
  );
}

export default function PerPound() {
  const steps = [
    {
      id: 'p3-pound-job',
      kicker: 'Cost per pound',
      title: 'Two ways to count',
      body: (
        <>
          <p>
            For each pound of gross earnings lost, the government balance counts income tax, employee and employer National Insurance,
            and benefits. The household basis counts what the household no longer pays in income tax and employee National Insurance,
            plus the benefits it gains, so it leaves out employer National Insurance.
          </p>
          <p>The job-loss rows are one draw, with displacement alone: no change in other wages or capital income.</p>
        </>
      ),
    },
    {
      id: 'p3-pound-takeup',
      title: 'With full take-up and JSA',
      body: <p>When every benefit unit with a displaced worker claims Universal Credit, and when new-style JSA is added, each pound lost costs the public finances more.</p>,
    },
    {
      id: 'p3-pound-wage',
      title: 'Wage cuts',
      body: (
        <p>
          Wage cuts alone cost more per pound than job loss on both bases. These rows are the mean of {perPound('wage_cuts').draws} draws,
          with no change in other wages or capital income.
        </p>
      ),
    },
  ];
  return <Scrolly id="p3-perpound" steps={steps} graphic={Graphic} label="Cost to the public finances per pound of gross earnings lost, on two bases" />;
}
