'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { fmtBn, fmtBn2 } from './format.js';
import { About, D, DivBar, FigureHead, Source } from './shared.jsx';

// Step 2, the three channels (results.tex: "Running each channel alone on 20
// paired draws"). The graphic is the home of each channel's cost and of their
// sum; a positive value is a cost to the Exchequer, a negative one a gain.

const C = D.channels;
const row = (id) => C.rows.find((r) => r.id === id);
const ROWS = [
  { id: 'displacement', icon: 'jobLoss', label: 'Job loss: less tax and NI, more benefits' },
  { id: 'wage', icon: 'pay', label: 'Higher wages for those who keep their jobs' },
  { id: 'capital', icon: 'capital', label: 'Higher interest and dividend income' },
];
// A channel's fill and words follow its sign: positive is a cost to the
// public finances (amber), negative higher net receipts (teal).
export const fillFor = (v) => (v > 0 ? 'p3-fill-loss' : 'p3-fill-gain');
export const effectWords = (v) => (v > 0 ? 'costs the public finances' : v < 0 ? 'raises net receipts' : 'leaves the balance unchanged');
// The card's lines, one per channel, the words from the sign of each run.
export function channelItems() {
  return [
    { key: 'displacement', icon: 'jobLoss', text: `Job loss ${effectWords(row('displacement').cost_bn)}: less tax and NI, more benefits` },
    { key: 'wage', icon: 'pay', text: `Higher wages for those still employed ${effectWords(row('wage').cost_bn)}` },
    { key: 'capital', icon: 'capital', text: `Higher interest and dividend income ${effectWords(row('capital').cost_bn)}` },
  ];
}
const LO = Math.min(0, ...C.rows.map((r) => r.cost_bn)) * 1.05;
const HI = Math.max(0, ...C.rows.map((r) => r.cost_bn)) * 1.05;

function Graphic() {
  return (
    <figure className="p3-figure">
      <FigureHead icon="netSum" title="The central cost nets three flows" unit="Cost to the public finances of each channel run alone, £bn a year" />
      <ol className="p3-rows">
        {ROWS.map((r) => (
          <li key={r.id} className="p3-row is-reached" data-row={r.id}>
            <span className="p3-row-label p3-row-label-icon">
              <Icon name={iconFor(r.icon)} size={14} /> {r.label}
            </span>{' '}
            <span className="p3-row-bar">
              <DivBar value={row(r.id).cost_bn} lo={LO} hi={HI} fill={fillFor(row(r.id).cost_bn)} />
            </span>{' '}
            <span className="p3-row-value">{fmtBn(row(r.id).cost_bn)}</span>
          </li>
        ))}
        <li className="p3-row p3-row-total is-reached" data-row="sum">
          <span className="p3-row-label p3-row-label-icon">
            <Icon name={iconFor('netSum')} size={14} /> Sum of the three runs
          </span>{' '}
          <span className="p3-row-bar">
            <DivBar value={C.sum_bn} lo={LO} hi={HI} fill="p3-fill-cost" />
          </span>{' '}
          <span className="p3-row-value">{fmtBn(C.sum_bn)}</span>
        </li>
      </ol>
      <Items
        className="p3-key-items"
        items={[
          { icon: 'cost', text: 'Positive: a cost (lower receipts or higher spending)' },
          { icon: 'tax', text: 'Negative: higher net receipts' },
          { icon: 'netSum', text: <>The three come within about {fmtBn2(C.interaction_bn)} of the full shock</> },
          { icon: 'draws', text: `Job loss and wages: mean of ${C.draws} draws; capital income: one run` },
        ]}
      />
      <Source>channel split, seeds 0 to 19</Source>
    </figure>
  );
}

export default function Channels() {
  const steps = [
    {
      id: 'p3-channels-step',
      kicker: '2 · Three channels',
      title: 'A cost that is the difference between larger flows',
      icon: 'netSum',
      body: (
        <>
          <Items items={channelItems()} />
          <About>
            <Items items={[{ icon: 'capital', text: 'Capital income does not depend on who is displaced' }]} />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-channels" steps={steps} graphic={Graphic} label="Cost to the public finances of each of the three channels run alone" />;
}
