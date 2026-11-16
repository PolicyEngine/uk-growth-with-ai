'use client';

import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { iconFor } from '@/lib/concepts.js';
import { fmtBn, fmtBn2 } from './format.js';
import { D, DrawsChip, FigureHead, Fold, Ico, NumMarker, SeriesName, Source, entryClass, highlightFor, hlClass, markProps, useBeat } from './shared.jsx';

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
    { key: 'wage', icon: 'pay', text: `Assumed higher pay for those still employed ${effectWords(row('wage').cost_bn)}` },
    { key: 'capital', icon: 'capital', text: `Assumed higher interest and dividend income ${effectWords(row('capital').cost_bn)}` },
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

function ChannelsFigure({ hl = [], ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  return (
    <figure className={entryClass(e, `p3-figure p3-scene${hlClass(hl)}`)}>
      <FigureHead
        icon="arithmetic"
        title="The central cost nets three flows"
        y="Cost to the public finances, £bn a year"
        x="each channel run alone, then their sum"
        unit={<DrawsChip>{C.draws} paired draws</DrawsChip>}
        replay={e.replay}
      />
      <ol className="p3-rows p3-wf">
        {BARS.map((b, i) => {
          const lo = Math.min(b.from, b.to);
          const w = X(Math.max(b.from, b.to)) - X(lo);
          // a bar grows away from where it starts: from zero, or from the end of the bar above
          const fromRight = b.to < b.from;
          const m = markProps(b.id, hl, `p3-row p3-wf-row${b.sum ? ' p3-row-total' : ''}`);
          return (
            <li key={b.id} {...m} data-row={b.id} style={{ '--beat': `${i * 600}ms` }}>
              <span className="p3-row-label p3-row-label-icon">
                <NumMarker n={i + 1} /> <Icon name={iconFor(b.icon)} size={14} /> {b.label}
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
      {/* the reading guide (the card interprets) and the one figure of the sum's gap */}
      <p className="p3-key p3-iconed">
        <Ico c="cost" size={12} /> Right of zero: a cost to the public finances; left: higher net receipts
      </p>
      <p className="p3-key p3-iconed">
        <Ico c="arithmetic" size={12} /> The sum comes within {fmtBn2(C.interaction_bn)} of the full shock run
      </p>
      <Source files={[C.file, D.per_pound_20.job_loss.file]}>channel split, seeds 0 to 19</Source>
    </figure>
  );
}

// The topic opener; the takeaway's words follow the signs of the runs. The
// answer chip: the scene's own figures (job loss alone, the sum).
const bigger = Math.abs(row('displacement').cost_bn) > Math.abs(C.sum_bn) && row('wage').cost_bn < 0 && row('capital').cost_bn < 0;
export const CHANNELS_SUB = {
  title: 'Three channels',
  icon: 'arithmetic',
  question: 'What makes up the cost?',
  hint: 'Watch three flows net to one cost',
  answer: `Job loss alone ${fmtBn(row('displacement').cost_bn)}; netted, ${fmtBn(C.sum_bn)}`,
  takeaway: bigger ? 'The net cost is far smaller than the cost of job loss alone: assumed higher pay and capital income offset much of it' : 'The net cost combines job loss with the two assumed income rises',
};

// The two assumed income rises, said together when their effects agree.
function risesSentence() {
  const w = effectWords(row('wage').cost_bn);
  const c = effectWords(row('capital').cost_bn);
  const pay = <SeriesName s="gain">higher pay</SeriesName>;
  const cap = <SeriesName s="gain">capital income</SeriesName>;
  return w === c ? (
    <>
      <NumMarker n={2} /> Assumed {pay} and <NumMarker n={3} /> {cap} each {w.replace('raises', 'raise').replace('costs', 'cost').replace('leaves', 'leave')}
    </>
  ) : (
    <>
      <NumMarker n={2} /> Assumed {pay} {w}; <NumMarker n={3} /> {cap} {c}
    </>
  );
}

// Three steps, each one sentence about the marks it highlights.
export const CHANNEL_STEPS = [
  {
    id: 'p3-channels-step',
    kicker: 'Step 2 · Three channels',
    icon: 'jobLoss',
    highlight: ['displacement'],
    title: (
      <>
        <NumMarker n={1} /> <SeriesName s={row('displacement').cost_bn > 0 ? 'loss' : 'gain'}>Job loss</SeriesName> alone {effectWords(row('displacement').cost_bn)}: less tax and NI, more benefits
      </>
    ),
  },
  { id: 'p3-channels-step-2', icon: 'pay', highlight: ['wage', 'capital'], title: risesSentence() },
  {
    id: 'p3-channels-step-3',
    icon: 'arithmetic',
    highlight: ['sum'],
    title: (
      <>
        <NumMarker n={4} /> Netted, the three runs leave {bigger ? 'a far smaller cost' : 'the net cost'}
      </>
    ),
    body: (
      <Fold
        groups={[
          { label: 'Definitions', items: ['Each channel is run alone on the same draws; capital income does not depend on who is displaced, so it is one run'] },
          {
            label: 'See also',
            items: [
              <>
                The central cost on three bases, which differ only by draws: <a href="#p3-central-step">50 draws</a>, <a href="#p3-margin-step">20 paired draws</a>, and this sum
              </>,
            ],
          },
        ]}
      />
    ),
  },
];

export default function Channels() {
  return (
    <Scrolly
      id="p3-channels"
      sub={CHANNELS_SUB}
      steps={CHANNEL_STEPS}
      graphic={(i, r, ctx) => <ChannelsFigure hl={highlightFor(CHANNEL_STEPS, i, ctx)} ctx={ctx} />}
      label="Cost to the public finances of each of the three channels run alone"
    />
  );
}
