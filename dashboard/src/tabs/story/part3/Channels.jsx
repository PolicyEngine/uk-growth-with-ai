'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtBn2, fmtInputPct, fmtPct1 } from './format.js';
import { D, FigureHead, InputFig, Num, NumMarker, Key, MarkProvider, Source, entryClass, markProps, useBeat, asLines } from './shared.jsx';
import { RETURN_BASE, RETURN_PP } from './Central.jsx';
import { Ref } from './sources.jsx';

// Step 2, the three channels (results.tex: "Running each channel alone on 20
// paired draws"). The graphic is the home of each channel's cost and of their
// sum; a positive value is a cost to the Exchequer, a negative one a gain.
// The central cost is a residual of these larger flows: the figure's labels
// quote the two assumed gains (inputs), and its notes say, once, how the
// capital gain is built and that dividend tax is counted but corporation tax
// is not.
const M = D.method;

const C = D.channels;
const row = (id) => C.rows.find((r) => r.id === id);
const ROWS = [
  {
    id: 'displacement',
    label: 'Job loss: less tax and NI, more benefits',
  },
  {
    id: 'wage',
    label: (
      <>
        Pay <InputFig path="method.survivor_wage_pct">+{fmtInputPct(M.survivor_wage_pct)}</InputFig> for those still employed
      </>
    ),
  },
  {
    id: 'capital',
    label: (
      <>
        Interest and dividends <InputFig path="method.capital_uplift_pct">+{fmtPct1(M.capital_uplift_pct)}</InputFig>
      </>
    ),
  },
];
// A channel's fill and words follow its sign: positive is a cost to the
// public finances (amber), negative higher net receipts (teal).
export const fillFor = (v) => (v > 0 ? 'p3-fill-loss' : 'p3-fill-gain');
export const effectWords = (v) => (v > 0 ? 'costs the public finances' : v < 0 ? 'raises net receipts' : 'leaves the balance unchanged');
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
  bars.push({
    id: 'sum',
    label: 'Sum of the three runs',
    value: C.sum_bn,
    from: 0,
    to: C.sum_bn,
    sum: true,
  });
  return bars;
}
const BARS = waterfall();
const ENDS = BARS.flatMap((b) => [b.from, b.to]);
const LO = Math.min(0, ...ENDS) * 1.05;
const HI = Math.max(0, ...ENDS) * 1.05;
const X = (v) => ((v - LO) / (HI - LO)) * 100;

function ChannelsFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  return (
    <figure ref={attach} className={entryClass(e, `p3-figure p3-scene`)}>
      <FigureHead
        icon="arithmetic"
        title="The central cost nets three flows"
        y="Cost to the public finances, £bn a year; right of zero a cost"
        x="each channel run alone, then their sum"
        unit={`${C.draws} paired draws`}
        replay={e.replay}
      />
      <ol className="p3-rows p3-wf">
        {BARS.map((b, i) => {
          const lo = Math.min(b.from, b.to);
          const w = X(Math.max(b.from, b.to)) - X(lo);
          // a bar grows away from where it starts: from zero, or from the end of the bar above
          const fromRight = b.to < b.from;
          const m = markProps(b.id, `p3-row p3-wf-row${b.sum ? ' p3-row-total' : ''}`);
          return (
            <li key={b.id} {...m} data-row={b.id} style={{ '--beat': `${i * 600}ms` }}>
              <span className="p3-row-label p3-row-label-icon">
                {b.sum ? null : <NumMarker n={i + 1} />} {b.label}
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
                    style={{
                      transformOrigin: fromRight ? 'right center' : 'left center',
                    }}
                  />
                </svg>
              </span>{' '}
              <span className="p3-row-value">{fmtBn(b.value)}</span>
            </li>
          );
        })}
      </ol>
      {/* the zero line, labelled (C8): scale, not data */}
      <span className="p3-wf-axis" data-axis="" aria-hidden="true">
        <span style={{ left: `${X(0)}%` }}>£0bn: no change</span>
      </span>
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
  key: 'cost',
  answerTo: 'p3-channels-step',
  answer: `Job loss alone ${fmtBn(row('displacement').cost_bn)}; netted, ${fmtBn(C.sum_bn)}`,
};

// The two assumed income rises and the net, in one sentence: their words
// from the signs of the runs.
function risesSentence() {
  const w = effectWords(row('wage').cost_bn);
  const c = effectWords(row('capital').cost_bn);
  const both = w === c ? w.replace('raises', 'raise').replace('costs', 'cost').replace('leaves', 'leave') : null;
  return (
    <>
      Assumed <Num n={2} mark="wage" /> <Key id="wage">higher pay</Key> and <Num n={3} mark="capital" /> <Key id="capital">capital income</Key> {both ?? `: ${w}; ${c}`}, leaving{' '}
      {bigger ? 'a far smaller cost' : 'the net cost'}
    </>
  );
}

// Two steps, each one sentence about the marks it highlights; no folds.
export const CHANNEL_STEPS = [
  {
    id: 'p3-channels-step',
    icon: 'jobLoss',
    highlight: ['displacement'],
    title: (
      <>
        <Key id="displacement">Job loss</Key> alone {effectWords(row('displacement').cost_bn)}: less tax and NI, more benefits
      </>
    ),
  },
  {
    id: 'p3-channels-step-2',
    icon: 'arithmetic',
    // the last step lights every bar: full contrast once the sum lands (C8)
    highlight: ['displacement', 'wage', 'capital', 'sum'],
    title: risesSentence(),
  },
];

// The scene's marks: each bar's colour follows its sign.
const CHANNEL_MARKS = Object.fromEntries(
  BARS.map((b) => [
    b.id,
    {
      color: b.sum ? 'var(--pe-gray-800)' : b.value > 0 ? 'var(--c-loss)' : 'var(--c-gain)',
      shape: 'square',
      label: typeof b.label === 'string' ? b.label : b.id === 'wage' ? 'Higher pay' : 'Higher capital income',
    },
  ]),
);

// The figure's notes and source line, as the Scrolly's foot (round 2,
// phones): inside the card on desktop, after the cards at 900px and below,
// so a pinned phone figure is the chart alone.
function ChannelsNotes() {
  return (
    <>
      <p className="p3-key">
        The sum comes within {fmtBn2(C.interaction_bn)} of the full shock run on these {C.draws} draws;{' '}
        <NavLink tab="story" anchor="p3-central">
          the central case
        </NavLink>{' '}
        is a mean of {D.headline.central_cost.draws}.
      </p>
      <p className="p3-key">
        Both gains are assumed, after <Ref id="doorley">Doorley et al. (2026)</Ref>. The capital gain is a return <span data-input="">{RETURN_PP}</span> points higher on a{' '}
        <span data-input="">{Number(RETURN_BASE.toFixed(3))}%</span> base, dividends included.
      </p>
      <p className="p3-key">
        Tax on the higher dividends is counted (
        <NavLink tab="explore" sub="households" anchor="hh-cost-lines">
          Explore, households
        </NavLink>
        ); corporation tax on the profits behind them is not.
      </p>
      <Source files={[C.file, D.per_pound_20.job_loss.file]}>channel split, seeds 0 to 19</Source>
    </>
  );
}

export default function Channels() {
  return (
    <MarkProvider marks={CHANNEL_MARKS}>
      <Scrolly
        id="p3-channels"
        scene
        foot={<ChannelsNotes />}
        sub={CHANNELS_SUB}
        steps={asLines(CHANNEL_STEPS)}
        graphic={(i, r, ctx) => <ChannelsFigure ctx={ctx} />}
        label="Cost to the public finances of each of the three channels run alone"
      />
    </MarkProvider>
  );
}
