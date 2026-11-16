'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtBn, fmtPence, fmtPenceRange, fmtPp } from './format.js';
import { About, D, FigureHead, HBar, OutsideRebuildFlag, Source, StackBar, ladder, perPound, Ico } from './shared.jsx';

// Step 6, job loss against wage cuts (results.tex, "How the earnings loss
// arrives"), on matching 20-draw bases only: pence per pound with each
// channel alone (job loss: the channel split's displacement run; wage cuts:
// variant cut_only), then cost and poverty with the survivor-wage and
// capital channels on in both (central seeds 0-19 against variant table3).
// The graphic is the home of all these figures, including the central case
// on the 20 draws, to which step 7 refers.

const J = D.per_pound_20.job_loss;
const W = perPound('wage_cuts');
const ER = D.per_pound_20.wage_cuts_employer_ni_p;
const JOB = ladder('central_20');
const CUT = ladder('wage_cuts');
const MAXC = Math.max(JOB.cost_bn, CUT.cost_bn);
const MAXP = Math.max(JOB.poverty_pp, CUT.poverty_pp);

function Graphic() {
  return (
    <figure className="p3-figure">
      <FigureHead icon="wageCut" title="The same earnings loss as job loss or as wage cuts" unit={`Mean of ${D.per_pound_20.draws} paired draws in every row`} />
      <OutsideRebuildFlag />
      <p className="p3-group-head p3-group-first">
        <Ico c="cost" /> Cost to the public finances per <span data-axis="">£1</span> of earnings lost, each margin alone
      </p>
      <p className="p3-legend" aria-hidden="true">
        <span className="p3-swatch p3-fill-hh" /> Income tax, employee NI and benefits <span className="p3-swatch p3-fill-gov" /> Employer NI
      </p>
      <ol className="p3-rows">
        <li className="p3-row" data-row="pp-job">
          <span className="p3-row-label">
            <Ico c="jobLoss" /> Job loss <span className="p3-muted">(range {fmtPenceRange(J.min_p, J.max_p)} across draws)</span>
          </span>{' '}
          <span className="p3-row-bar">
            <HBar value={J.government_p} max={100} fill="p3-fill-ref" />
          </span>{' '}
          <span className="p3-row-value">{fmtPence(J.government_p)}</span>
        </li>
        <li className="p3-row" data-row="pp-cut">
          <span className="p3-row-label">
            <Ico c="wageCut" /> Wage cuts: {fmtPence(W.household_p)} plus {fmtPence(ER)} of employer NI
          </span>{' '}
          <span className="p3-row-bar">
            <StackBar
              parts={[
                [W.household_p, 'p3-fill-hh'],
                [ER, 'p3-fill-gov'],
              ]}
              max={100}
            />
          </span>{' '}
          <span className="p3-row-value">{fmtPence(W.government_p)}</span>
        </li>
      </ol>
      <p className="p3-group-head">
        <Ico c="capital" /> With higher wages for those still employed and higher capital income, as in the central case</p>
      <div className="p3-cols" aria-hidden="true">
        <span />
        <span>Cost</span>
        <span>Poverty</span>
      </div>
      <ol className="p3-rows p3-rows-2col">
        {[
          ['job', 'Job loss: the central case on these draws', JOB, 'jobLoss'],
          ['cut', 'Wage cuts of the same gross size', CUT, 'wageCut'],
        ].map(([id, label, d, ic]) => (
          <li key={id} className="p3-row p3-row-pair" data-row={`m-${id}`}>
            <span className="p3-row-label">
              <Ico c={ic} /> {label}
            </span>{' '}
            <span className="p3-row-bar p3-row-bar-2">
              <HBar value={d.cost_bn} max={MAXC} fill="p3-fill-cost" />
              <HBar value={d.poverty_pp} max={MAXP} fill="p3-fill-loss" />
            </span>{' '}
            <span className="p3-row-value">{fmtBn(d.cost_bn)}</span>{' '}
            <span className="p3-row-value p3-row-value-2">{fmtPp(d.poverty_pp)}</span>
          </li>
        ))}
      </ol>
      <p className="p3-key">
        <Ico c="measure" size={12} /> Cost: £bn a year (blue). Poverty: change in absolute poverty before housing costs (amber). Job loss alone: no split by item on these draws (grey).</p>
      <Source>wage-cut runs, central seeds 0 to 19</Source>
    </figure>
  );
}

export default function Margin() {
  const steps = [
    {
      id: 'p3-margin-step',
      kicker: '6 · Job loss or wage cuts',
      title: 'Wage cuts cost more per pound; job loss raises poverty more',
      icon: 'wageCut',
      body: (
        <>
          <Items
            items={[
              { icon: 'wageCut', text: 'No one loses a job: wage cuts graded by AI exposure' },
              { icon: 'pay', text: 'They remove the same gross earnings as the job losses' },
              { icon: 'poverty', text: 'Job loss concentrates the loss, moving more households below the poverty line' },
              { icon: 'caveat', text: 'The ordering is a result for this shock, not the UK system' },
            ]}
          />
          <About>
            <Items
              items={[
                { icon: 'wageCut', text: 'A cut removes pounds taxed at the worker’s marginal rates' },
                { icon: 'jobLoss', text: 'A lost job removes whole earnings, even below the personal allowance' },
                { icon: 'benefits', text: 'The Universal Credit it adds is less than the tax forgone' },
                { icon: 'tax', text: 'Employer NI is of similar size on both margins' },
                { icon: 'households', text: 'A loss spread across many earners moves few below the poverty line' },
              ]}
            />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-margin" steps={steps} graphic={Graphic} label="Cost per pound and poverty: job loss against wage cuts of the same gross size" />;
}
