'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Items } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { fmtBn, fmtBn2 } from './format.js';
import { About, D, FigureHead, Source, entryClass, useBeat } from './shared.jsx';

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
    { key: 'wage', icon: 'pay', text: `Higher pay for those still employed ${effectWords(row('wage').cost_bn)}` },
    { key: 'capital', icon: 'capital', text: `Higher interest and dividend income ${effectWords(row('capital').cost_bn)}` },
  ];
}
// The netting waterfall (scene 3-2): job loss rises from zero; higher wages
// hangs from its top and drops; higher capital income drops again; the
// landing bar, "Sum of the three runs", stands from zero. Only the three
// channel values and their sum are printed: the intermediate bar ends are
// positions, not running totals. Each bar spans [from, to] in £bn.
export function waterfall() {
  const bars = [];
  let at = 0;
  for (const r of ROWS) {
    const v = row(r.id).cost_bn;
    bars.push({ ...r, value: v, from: at, to: at + v });
    at += v;
  }
  bars.push({ id: 'sum', icon: 'arithmetic', label: 'Sum of the three runs', value: C.sum_bn, from: 0, to: C.sum_bn, sum: true });
  return bars;
}
const BARS = waterfall();
const ENDS = BARS.flatMap((b) => [b.from, b.to]);
const LO = Math.min(0, ...ENDS) * 1.05;
const HI = Math.max(0, ...ENDS) * 1.05;
const X = (v) => ((v - LO) / (HI - LO)) * 100;

function ChannelsFigure({ ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  return (
    <figure className={entryClass(e, 'p3-figure p3-scene')}>
      <FigureHead icon="arithmetic" title="The central cost nets three flows" unit="Cost to the public finances of each channel run alone, £bn a year" replay={e.replay} />
      <ol className="p3-rows p3-wf">
        {BARS.map((b, i) => {
          const lo = Math.min(b.from, b.to);
          const w = X(Math.max(b.from, b.to)) - X(lo);
          // a bar grows away from where it starts: from zero, or from the end of the bar above
          const fromRight = b.to < b.from;
          return (
            <li key={b.id} className={`p3-row p3-wf-row${b.sum ? ' p3-row-total' : ''}`} data-row={b.id} style={{ '--beat': `${i * 600}ms` }}>
              <span className="p3-row-label p3-row-label-icon">
                <Icon name={iconFor(b.icon)} size={14} /> {b.label}
              </span>{' '}
              <span className="p3-row-bar">
                <svg className="p3-bar p3-wf-svg" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                  <line className="p3-zero" x1={X(0)} x2={X(0)} y1={0} y2={10} vectorEffect="non-scaling-stroke" />
                  {/* the connector: where this bar starts, from the bar above */}
                  {i > 0 ? <line className="p3-wf-link" x1={X(b.sum ? BARS[i - 1].to : b.from)} x2={X(b.sum ? BARS[i - 1].to : b.from)} y1={-6} y2={10} vectorEffect="non-scaling-stroke" /> : null}
                  <rect
                    className={`p3-wf-bar ${b.sum ? 'p3-fill-cost' : fillFor(b.value)}`}
                    x={X(lo)}
                    y={1}
                    width={Math.max(0, w)}
                    height={8}
                    style={{ transformOrigin: fromRight ? 'right center' : 'left center' }}
                  />
                </svg>
              </span>{' '}
              <span className="p3-row-value">{fmtBn(b.value)}</span>
            </li>
          );
        })}
      </ol>
      <Items
        className="p3-key-items"
        items={[
          { icon: 'cost', text: 'Positive: a cost (lower receipts or higher spending)' },
          { icon: 'tax', text: 'Negative: higher net receipts' },
          { icon: 'arithmetic', text: <>The three come within about {fmtBn2(C.interaction_bn)} of the full shock</> },
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
      icon: 'arithmetic',
      body: (
        <>
          <Items
            items={[
              ...channelItems(),
              {
                key: 'bases',
                icon: 'draws',
                text: (
                  <>
                    Other bases: <a href="#p3-central-step">step 1</a>, 50 draws; <a href="#p3-margin-step">step 6</a>, 20 paired
                  </>
                ),
              },
            ]}
          />
          <About>
            <Items items={[{ icon: 'capital', text: 'Capital income does not depend on who is displaced' }]} />
          </About>
        </>
      ),
    },
  ];
  return <Scrolly id="p3-channels" steps={steps} graphic={(i, r, ctx) => <ChannelsFigure ctx={ctx} />} label="Cost to the public finances of each of the three channels run alone" />;
}
