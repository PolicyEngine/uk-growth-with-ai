'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Pause } from '@/components/story/chart/index.js';
import Sankey from '@/components/story/Sankey.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtBn, fmtShare } from './format.js';
import { AxisTitle, D, DrawsChip, FigureHead, Fold, Ico, Fig, Num, OBR_SCENARIO, OutsideRebuildFlag, Key, MarkProvider, Source, entryClass, ladder, useBeat } from './shared.jsx';
import { CENTRAL_RATE } from './Central.jsx';
import { Ref } from './sources.jsx';

// Step 3, what the system absorbs (results.tex, "Household absorption of job
// loss by baseline decile"): a Sankey of the OBR-sized run, job loss alone,
// from results/next_runs/obr_household_deciles.csv. Each income decile's
// earnings lost flow to four destinations. The figure is the home of the
// destination totals, the earnings total and (in its key) employer NI, which
// sits on top of the earnings lost; the card adds the share absorbed.

const S = D.sankey;
// Order: each small node sits between two tall ones, so labels never
// collide. Labels are short (the shared Sankey keeps about 112px for the last
// column's labels on phones); the value is the `sub`.
export const DESTS = [
  {
    id: 'disposable',
    key: 'disposable_bn',
    label: 'Disposable income',
    color: 'var(--c-loss)',
  },
  {
    id: 'benefits',
    key: 'benefits_bn',
    label: 'More benefits',
    color: 'var(--rank-2)',
  },
  {
    id: 'tax',
    key: 'tax_ni_bn',
    label: 'Less tax and NI',
    color: 'var(--rank-1)',
  },
  {
    id: 'other',
    key: 'other_bn',
    label: 'Other items',
    color: 'var(--pe-gray-400)',
  },
];
// Decile 1 carries the ranking caveat of step 4: its node and ribbons stay
// grey in every beat, never coloured by a destination.
export const CAVEAT_GREY = 'var(--pe-gray-300)';

// The graph: income decile -> destination, £bn a year, the same at every
// width (components/story/Sankey.jsx flows left to right on phones too).
export function absorbGraph() {
  const nodes = [
    ...S.deciles.map((_, i) => ({
      id: `d${i + 1}`,
      label: String(i + 1),
      color: i === 0 ? CAVEAT_GREY : 'var(--pe-gray-700)',
    })),
    ...DESTS.map((d) => ({
      id: d.id,
      label: d.label,
      sub: fmtBn(S.total[d.key]),
      color: d.color,
    })),
  ];
  const links = [];
  S.deciles.forEach((f, i) => {
    for (const d of DESTS)
      links.push({
        source: `d${i + 1}`,
        target: d.id,
        value: f[d.key],
        color: i === 0 ? CAVEAT_GREY : d.color,
      });
  });
  return { nodes, links };
}

// The build (plan section 6, step 5), F's Sankey: on entry the ten decile
// nodes rise bottom to top, then the ribbons pour left to right grouped by
// destination (disposable income, more benefits, less tax and NI, other
// items), 150ms between groups; then the flow dashes drift (pause button;
// off under reduced motion and on phones). Opacity and clip-path only;
// every label and value is in the DOM throughout. Decile 1 stays grey.
//
// "Follow a lost pound" (review idea 3): choosing a decile re-runs the pour
// with that decile's ribbons lit end to end and the rest dimmed. No new
// figure is shown: the decile's split is read from the ribbons' widths, and
// the tooltip names the flow without a value.
export const POUR_ORDER = DESTS.map((d) => d.id);
const DEST_NAME = Object.fromEntries(DESTS.map((d) => [d.id, d.label]));
const sankeyTip = ({ kind, link, node }) =>
  kind === 'link' ? (
    <>
      Decile {link.source.label} <Icon name="arrowRight" size={12} /> {DEST_NAME[link.target.id]}
    </>
  ) : node.id.startsWith('d') ? (
    <>Decile {node.label}: its earnings lost, by destination</>
  ) : (
    <>{DEST_NAME[node.id]}</>
  );

function AbsorbFigure({ ctx, cur, setCur }) {
  const e = useBeat(ctx?.entered ?? true);
  const [follow, setFollow] = useState(null);
  const [paused, setPaused] = useState(false);
  const box = useRef(null);
  const g = absorbGraph();
  const pick = (n) => setFollow(follow === n ? null : n);
  // the destination nodes and their ribbons are the scene's marks
  useEffect(() => {
    box.current?.querySelectorAll('[data-node], [data-target]').forEach((el) => {
      const id = el.getAttribute('data-node') ?? el.getAttribute('data-target');
      if (POUR_ORDER.includes(id)) el.setAttribute('data-mark', id);
    });
  });
  // after the pour, the three sentences light their destinations in turn,
  // once (not under reduced motion); a reader can point at any sentence
  const stepHl = cur == null ? null : ABSORB_LINES[cur]?.highlight[0];
  useEffect(() => {
    if (!e.on || e.reduce || setCur == null) return undefined;
    const ts = [0, 1, 2].map((k) => setTimeout(() => setCur((c) => (c === 'held' ? c : k)), 2200 + k * 2400));
    ts.push(setTimeout(() => setCur((c) => (c === 'held' ? c : null)), 2200 + 3 * 2400));
    return () => ts.forEach(clearTimeout);
  }, [e.on, e.reduce, e.run, setCur]);
  return (
    <figure ref={box} className={entryClass(e, 'p3-figure p3-sankey p3-scene')}>
      <FigureHead
        icon="benefits"
        title={
          <>
            Job loss alone, a {SMALLER ? 'smaller ' : ''}run sized to <Ref id="obr">{OBR_SCENARIO}</Ref>, not the central case
          </>
        }
        y="£bn a year"
        unit={
          <>
            Where {fmtBn(S.total.earnings_lost_bn)} of earnings lost goes <DrawsChip>{S.draws} draws</DrawsChip>
          </>
        }
        replay={e.replay}
        actions={<Pause paused={paused} onClick={() => setPaused(!paused)} />}
      />
      <OutsideRebuildFlag />
      <div className="p3-follow" role="group" aria-label="Follow one decile’s lost earnings">
        <span className="p3-follow-label">
          <Ico c="deciles" size={13} /> <AxisTitle axis="x">Income decile, 1 = bottom</AxisTitle>
          <span className="p3-follow-hint">: follow one</span>
        </span>
        {S.deciles.map((_, i) => (
          <button key={i} type="button" className={`p3-follow-btn${follow === i + 1 ? ' is-on' : ''}${i === 0 ? ' is-caveat' : ''}`} aria-pressed={follow === i + 1} onClick={() => pick(i + 1)}>
            {i + 1}
          </button>
        ))}
        <span className="p3-follow-dest" aria-hidden="true">
          Where the loss lands
        </span>
      </div>
      <Sankey
        graphs={[g]}
        label="Sankey diagram: earnings lost by each income decile, flowing to lower disposable income, lower income tax and employee NI, other items and more benefits"
        width={900}
        height={330}
        pad={7}
        rightRoom={170}
        linkOpacity={0.55}
        nodeWidth={[14, 60]}
        inside
        pour={e.on ? 1 : 0}
        pourOrder={POUR_ORDER}
        pourGap={150}
        replayKey={`${e.run}-${follow ?? ''}`}
        flow={e.on && !paused}
        interactive
        highlight={follow ? `d${follow}` : stepHl}
        tooltip={sankeyTip}
      />
      <Items
        className="p3-key-items p3-key-row"
        items={[
          {
            icon: 'caveat',
            text: 'Other items: mainly pension contributions no longer paid',
          },
          {
            icon: 'tax',
            text: <>Employers also stop paying {fmtBn(S.employer_ni_bn)} of NI, a further cost to government</>,
          },
        ]}
      />
      <Source files={[S.file, ladder('obr')?.file]}>run sized to the OBR scenario (Box 2.2), household flows by baseline decile</Source>
    </figure>
  );
}

// Statements about this run, from the data (claim audit P3-25): whether the
// run is smaller than the central case, whether disposable income takes most
// of the loss, and the share benefits replace.
export const SMALLER = CENTRAL_RATE != null && S.displacement_rate_pct < CENTRAL_RATE;
export const MOST = S.total.disposable_bn > S.total.earnings_lost_bn / 2;
export const BENEFIT_SHARE = (S.total.benefits_bn / S.total.earnings_lost_bn) * 100;

export const ABSORB_SUB = {
  title: 'Where a lost pound goes',
  icon: 'households',
  question: 'Where does a lost pound of earnings go?',
  hint: 'Watch where the lost earnings land',
  key: 'lost pound',
  answerTo: 'p3-absorb-step',
  answer: `Households bear ${fmtBn(S.total.disposable_bn)} of ${fmtBn(S.total.earnings_lost_bn)}`,
  takeaway: MOST ? 'Households bear most of the earnings lost; lower tax, more benefits and other items take the rest' : 'Tax and benefits absorb much of the earnings lost',
};

// The tax and NI absorbed, against the rest of the loss households do not bear.
const TAX_MOST = S.total.tax_ni_bn > (S.total.earnings_lost_bn - S.total.disposable_bn) / 2;
// Three sentences, each lighting one destination; one card (the Sankey is
// full width below it), so the sentences light in turn after the pour and
// on pointing, rather than by scroll.
export const ABSORB_LINES = [
  {
    highlight: ['disposable'],
    text: (
      <>
        <Num n={1} mark="disposable" /> {MOST ? 'Most' : 'Part'} of the loss comes out of households’ <Key id="disposable">disposable income</Key>
      </>
    ),
  },
  {
    highlight: ['tax'],
    text: (
      <>
        <Num n={2} mark="tax" /> <Key id="tax">Less tax and NI</Key> takes {TAX_MOST ? 'most of the rest' : 'part of the rest'}; with benefits,{' '}
        <Fig path="sankey.tax_benefit_share_pct" mark="tax">
          {fmtShare(S.tax_benefit_share_pct)}
        </Fig>
      </>
    ),
  },
  {
    highlight: ['benefits'],
    text: (
      <>
        <Num n={3} mark="benefits" /> <Key id="benefits">More benefits</Key> replace {BENEFIT_SHARE < 5 ? 'under a twentieth' : 'part'} of the earnings lost
      </>
    ),
  },
];

// The destinations, for the colour-keyed words.
const ABSORB_MARKS = Object.fromEntries(DESTS.map((d) => [d.id, { color: d.color, shape: 'square', label: d.label }]));

function AbsorbLines({ cur, setCur }) {
  return (
    <ol className="p3-lines" aria-label="Three readings of the diagram; each lights its destination">
      {ABSORB_LINES.map((l, k) => (
        <li key={k} className={cur === k ? 'is-on' : ''} data-highlight={l.highlight.join(' ')}>
          <button
            type="button"
            className="p3-line-btn"
            aria-pressed={cur === k}
            onMouseEnter={() => setCur(k)}
            onMouseLeave={() => setCur('held')}
            onFocus={() => setCur(k)}
            onBlur={() => setCur('held')}
            onClick={() => setCur(k)}
          >
            {l.text}
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function Absorb() {
  // the sentence lit: an index, null (none), or 'held' once a reader has pointed
  const [cur, setCur] = useState(null);
  const lit = typeof cur === 'number' ? cur : null;
  const steps = [
    {
      id: 'p3-absorb-step',
      kicker: 'Step 3 · Where a lost pound goes',
      icon: 'households',
      highlight: ABSORB_LINES.flatMap((l) => l.highlight),
      body: (
        <>
          <AbsorbLines cur={lit} setCur={setCur} />
          <Fold
            groups={[
              {
                label: 'Definitions',
                items: ['A smaller shock than the central case: job loss alone, with no assumed pay or capital-income rises'],
              },
              {
                label: 'Caveat',
                items: [
                  <>
                    Decile 1 is grey: the study does not report it as a finding (<a href="#p3-deciles-step">step 4</a>)
                  </>,
                ],
              },
            ]}
          />
        </>
      ),
    },
  ];
  return (
    <MarkProvider marks={ABSORB_MARKS}>
      <Scrolly
        id="p3-absorb"
        sub={ABSORB_SUB}
        steps={steps}
        graphic={(i, r, ctx) => <AbsorbFigure ctx={ctx} cur={lit} setCur={setCur} />}
        wide
        label="Where the earnings lost to job loss go, by income decile"
      />
    </MarkProvider>
  );
}
