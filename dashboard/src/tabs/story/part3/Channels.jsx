'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { fmtBn, fmtBn2, fmtInputPct, fmtPct1 } from './format.js';
import { Essential } from '@/components/ui/SourceLine.jsx';
import { D, FigureHead, InputFig, MODEL_YEAR, Num, NumMarker, Key, MarkProvider, Source, entryClass, markProps, useBeat, asLines } from './shared.jsx';
import { RETURN_BASE, RETURN_PP } from './Central.jsx';
import { Ref } from './sources.jsx';
import { ChartHover, Legend } from '@/components/story/chart/index.js';

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
// the title is a finding (story-finding-titles-fable.md): the two assumed
// gains (both negative costs) offset over half of job loss's cost, not all
const OFFSET = (() => {
  const w = row('wage')?.cost_bn;
  const k = row('capital')?.cost_bn;
  const d = row('displacement')?.cost_bn;
  if (!(w < 0 && k < 0 && d > 0)) return false;
  const off = -(w + k);
  return off > d / 2 && off < d;
})();
// Each row is named by its effect on the budget (Maria M2), from its sign:
// a positive run is a cost, a negative one extra revenue. The assumed rise
// that drives a row is its sub-line, with no plus sign beside a bar that
// runs left.
export const budgetWords = (v) => (v > 0 ? 'a cost' : v < 0 ? 'extra revenue' : 'no change');
const ROWS = [
  {
    id: 'displacement',
    label: `Job loss: ${budgetWords(row('displacement')?.cost_bn)}`,
    sub: 'Less tax and NI, more benefits',
  },
  {
    id: 'wage',
    label: `Higher pay: ${budgetWords(row('wage')?.cost_bn)}`,
    sub: (
      <>
        <InputFig path="method.survivor_wage_pct">{fmtInputPct(M.survivor_wage_pct)}</InputFig> higher for those still employed
      </>
    ),
  },
  {
    id: 'capital',
    label: `Higher interest and dividends: ${budgetWords(row('capital')?.cost_bn)}`,
    sub: (
      <>
        <InputFig path="method.capital_uplift_pct">{fmtPct1(M.capital_uplift_pct)}</InputFig> higher
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
    label: `Sum of the three runs: ${C.sum_bn > 0 ? 'a net cost' : C.sum_bn < 0 ? 'net extra revenue' : 'no net change'}`,
    value: C.sum_bn,
    from: 0,
    to: C.sum_bn,
    sum: true,
  });
  return bars;
}
const BARS = waterfall();
// the tooltip of each bar (M4): its name, its effect on the budget and the
// run's value, from the data; the channels are household-study results
const TIPS = BARS.map((b, i) => ({
  head: typeof b.label === 'string' ? b.label : null,
  rows: [{ name: b.sum ? 'Sum of the three runs' : `Channel ${i + 1} alone`, value: fmtBn(b.value), icon: 'arithmetic' }],
  unit: `Public finance cost, £bn a year (positive = cost), ${MODEL_YEAR}. The household study.`,
}));
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
        title={OFFSET ? 'Two assumed gains offset most of job loss’s cost' : 'Three flows make up the cost'}
        fallback={!OFFSET}
        y="Public finance cost, £bn a year (positive = cost)"
        x={`${MODEL_YEAR}: each channel alone, then their sum`}
        unit={`${C.draws} paired draws. The household study.`}
        replay={e.replay}
        source={<ChannelsSource />}
      />
      {/* the budget key (Maria M2): a cost runs right, extra revenue left */}
      <Legend
        label="Budget effect"
        items={[
          { key: 'cost', label: 'Cost', kind: 'block', color: 'var(--c-loss)' },
          { key: 'revenue', label: 'Extra revenue', kind: 'block', color: 'var(--c-gain)' },
          { key: 'net', label: 'Net', kind: 'block', color: 'var(--pe-gray-800)' },
        ]}
      />
      {/* hover (M4): each row's run, its budget effect and value */}
      <ChartHover label="Cost to the public finances of each channel run alone, then their sum" items={TIPS}>
        <ol className="p3-rows p3-wf">
        {BARS.map((b, i) => {
          const lo = Math.min(b.from, b.to);
          const w = X(Math.max(b.from, b.to)) - X(lo);
          // a bar grows away from where it starts: from zero, or from the end of the bar above
          const fromRight = b.to < b.from;
          const m = markProps(b.id, `p3-row p3-wf-row${b.sum ? ' p3-row-total' : ''}`);
          return (
            <li key={b.id} {...m} data-row={b.id} data-tip={i} style={{ '--beat': `${i * 600}ms` }}>
              <span className="p3-row-label p3-row-label-icon">
                {b.sum ? null : <NumMarker n={i + 1} />}{' '}
                <span className="p3-row-label-text">
                  {b.label}
                  {b.sub ? (
                    <>
                      {' '}
                      <span className="p3-row-sub">{b.sub}</span>
                    </>
                  ) : null}
                </span>
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
      </ChartHover>
      {/* the zero line, labelled (C8): scale, not data */}
      <span className="p3-wf-axis" data-axis="" aria-hidden="true">
        <span className={X(0) < 15 ? 'is-start' : X(0) > 85 ? 'is-end' : undefined} style={{ left: `${X(0)}%` }}>
          £0bn: no change
        </span>
      </span>
      <Essential icon="excluded">Dividend tax is counted; corporation tax on the profits is not</Essential>
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
  // the title says the gains offset most of the cost and the bars print
  // both figures (story-finding-titles-fable.md): the caveat instead
  answer: 'Both gains are assumptions, not results: without them the cost is the first bar.',
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
        <Key id="displacement">Job loss</Key> alone {effectWords(row('displacement').cost_bn)}: less tax and National Insurance, more benefits
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

// The figure's notes and sources, behind its "Sources and notes" button,
// in labelled groups.
function ChannelsSource() {
  return (
    <Source
      files={[C.file, D.per_pound_20.job_loss.file]}
      refs={['doorley']}
      groups={[
        {
          title: 'Assumptions',
          notes: [
            { icon: 'scenario', text: <>Both gains assumed, after <Ref id="doorley">Doorley et al. (2026)</Ref></> },
            {
              icon: 'interest',
              text: (
                <>
                  Capital gain: a return <span data-input="">{RETURN_PP}</span> points higher on a <span data-input="">{Number(RETURN_BASE.toFixed(3))}%</span> base, dividends included
                </>
              ),
            },
          ],
        },
        {
          title: 'How it’s counted',
          notes: [
            {
              icon: 'tax',
              text: (
                <>
                  Dividend tax by household:{' '}
                  <NavLink tab="explore" sub="households" anchor="hh-cost-lines">
                    Explore, households
                  </NavLink>
                </>
              ),
            },
          ],
        },
        {
          title: 'Draws',
          notes: [
            { icon: 'draws', text: <>{C.draws} draws; the sum comes within {fmtBn2(C.interaction_bn)} of the full shock run</> },
            {
              icon: 'answer',
              text: (
                <>
                  <NavLink tab="story" anchor="p3-central">
                    The main case
                  </NavLink>{' '}
                  is a mean of {D.headline.central_cost.draws}
                </>
              ),
            },
          ],
        },
      ]}
    >
      channel split, seeds 0 to 19
    </Source>
  );
}

export default function Channels() {
  return (
    <MarkProvider marks={CHANNEL_MARKS}>
      <Scrolly
        id="p3-channels"
        scene
        sub={CHANNELS_SUB}
        steps={asLines(CHANNEL_STEPS)}
        graphic={(i, r, ctx) => <ChannelsFigure ctx={ctx} />}
        label="Cost to the public finances of each of the three channels run alone"
      />
    </MarkProvider>
  );
}
