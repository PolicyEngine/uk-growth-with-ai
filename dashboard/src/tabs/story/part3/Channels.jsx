'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { fmtBn, fmtBn2 } from './format.js';
import { D, DivBar, FigureHead, Source } from './shared.jsx';

// Step 2, the three channels (results.tex: "Running each channel alone on 20
// paired draws"). The graphic is the home of each channel's cost and of their
// sum; a positive value is a cost to the Exchequer, a negative one a gain.

const C = D.channels;
const row = (id) => C.rows.find((r) => r.id === id);
const ROWS = [
  { id: 'displacement', label: 'Earnings lost by the displaced: less tax and NI, more benefits', fill: 'p3-fill-loss' },
  { id: 'wage', label: 'Higher wages for those who keep their jobs', fill: 'p3-fill-gain' },
  { id: 'capital', label: 'Higher interest and dividend income', fill: 'p3-fill-gain' },
];
const LO = Math.min(0, ...C.rows.map((r) => r.cost_bn)) * 1.05;
const HI = Math.max(0, ...C.rows.map((r) => r.cost_bn)) * 1.05;

function Graphic() {
  return (
    <figure className="p3-figure">
      <FigureHead title="The central cost nets three flows" unit={`Cost to the public finances of each channel run alone, £bn a year, mean of ${C.draws} draws`} />
      <ol className="p3-rows">
        {ROWS.map((r) => (
          <li key={r.id} className="p3-row is-reached" data-row={r.id}>
            <span className="p3-row-label">{r.label}</span>{' '}
            <span className="p3-row-bar">
              <DivBar value={row(r.id).cost_bn} lo={LO} hi={HI} fill={r.fill} />
            </span>{' '}
            <span className="p3-row-value">{fmtBn(row(r.id).cost_bn)}</span>
          </li>
        ))}
        <li className="p3-row p3-row-total is-reached" data-row="sum">
          <span className="p3-row-label">The three together</span>{' '}
          <span className="p3-row-bar">
            <DivBar value={C.sum_bn} lo={LO} hi={HI} fill="p3-fill-cost" />
          </span>{' '}
          <span className="p3-row-value">{fmtBn(C.sum_bn)}</span>
        </li>
      </ol>
      <p className="p3-key">Positive: a cost (lower receipts or higher spending). Negative: higher net receipts.</p>
      <Source>channel split, seeds 0 to 19</Source>
    </figure>
  );
}

export default function Channels() {
  const steps = [
    {
      id: 'p3-channels',
      kicker: '2 · Three channels',
      title: 'A cost that is the difference between larger flows',
      body: (
        <>
          <p>
            The central cost nets three flows. Run alone, job loss costs the Exchequer the income tax and National Insurance the displaced no
            longer pay, plus the benefits they now receive. Higher wages for those who keep their jobs, and higher interest and dividend
            income, each raise net receipts by a similar amount.
          </p>
          <p>Together the three channels come within {fmtBn2(C.interaction_bn)} of the full shock on the same draws.</p>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-channels" steps={steps} graphic={Graphic} label="Cost to the public finances of each of the three channels run alone" />;
}
