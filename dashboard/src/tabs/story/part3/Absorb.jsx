'use client';

import { useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Scrolly from '@/components/story/Scrolly.jsx';
import { Pause } from '@/components/story/chart/index.js';
import Sankey from '@/components/story/Sankey.jsx';
import { Items } from '@/components/story/Items.jsx';
import { fmtBn, fmtShare } from './format.js';
import { AxisTitle, D, FigureHead, Ico, OBR_SCENARIO, OutsideRebuildFlag, Source, entryClass, ladder, useBeat } from './shared.jsx';
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
  { id: 'disposable', key: 'disposable_bn', label: 'Disposable income', color: 'var(--c-loss)' },
  { id: 'benefits', key: 'benefits_bn', label: 'More benefits', color: 'var(--rank-2)' },
  { id: 'tax', key: 'tax_ni_bn', label: 'Less tax and NI', color: 'var(--rank-1)' },
  { id: 'other', key: 'other_bn', label: 'Other items', color: 'var(--pe-gray-400)' },
];
// Decile 1 carries the ranking caveat of step 4: its node and ribbons stay
// grey in every beat, never coloured by a destination.
export const CAVEAT_GREY = 'var(--pe-gray-300)';

// The graph: income decile -> destination, £bn a year, the same at every
// width (components/story/Sankey.jsx flows left to right on phones too).
export function absorbGraph() {
  const nodes = [
    ...S.deciles.map((_, i) => ({ id: `d${i + 1}`, label: String(i + 1), color: i === 0 ? CAVEAT_GREY : 'var(--pe-gray-700)' })),
    ...DESTS.map((d) => ({ id: d.id, label: d.label, sub: fmtBn(S.total[d.key]), color: d.color })),
  ];
  const links = [];
  S.deciles.forEach((f, i) => {
    for (const d of DESTS) links.push({ source: `d${i + 1}`, target: d.id, value: f[d.key], color: i === 0 ? CAVEAT_GREY : d.color });
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

function AbsorbFigure({ ctx }) {
  const e = useBeat(ctx?.entered ?? true);
  const [follow, setFollow] = useState(null);
  const [paused, setPaused] = useState(false);
  const g = absorbGraph();
  const pick = (n) => setFollow(follow === n ? null : n);
  return (
    <figure className={entryClass(e, 'p3-figure p3-sankey p3-scene')}>
      <FigureHead
        icon="benefits"
        title={
          <>
            Job loss alone, a {SMALLER ? 'smaller ' : ''}run sized to <Ref id="obr">{OBR_SCENARIO}</Ref>, not the central case
          </>
        }
        y="£bn a year"
        unit={`Where ${fmtBn(S.total.earnings_lost_bn)} of earnings lost goes, mean of ${S.draws} draws`}
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
        highlight={follow ? `d${follow}` : null}
        tooltip={sankeyTip}
      />
      <Items
        className="p3-key-items p3-key-row"
        items={[
          { icon: 'deciles', text: 'Ribbons: each decile’s lost earnings by destination' },
          { icon: 'caveat', text: 'Other items: mainly pension contributions no longer paid' },
          { icon: 'limit', text: 'Decile 1, grey, carries the ranking caveat of step 4' },
          { icon: 'tax', text: <>Employers also stop paying {fmtBn(S.employer_ni_bn)} of NI, a further cost to government</> },
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
  takeaway: MOST ? 'Households bear most of the earnings lost; lower tax, more benefits and other items take the rest' : 'Tax and benefits absorb much of the earnings lost',
};

export default function Absorb() {
  const steps = [
    {
      id: 'p3-absorb-step',
      title: 'Where a lost pound of earnings goes',
      icon: 'households',
      body: (
        <Items
          items={[
            { icon: 'jobLoss', text: `${SMALLER ? 'A smaller shock' : 'A different shock'}: job loss alone, no other income rises` },
            { icon: 'tax', text: <>Income tax, employee NI and benefits absorb {fmtShare(S.tax_benefit_share_pct)} of the loss</> },
            { icon: 'benefits', text: BENEFIT_SHARE < 5 ? 'Benefits replace under a twentieth of the earnings lost in this run' : 'Benefits replace part of the earnings lost in this run' },
          ]}
        />
      ),
    },
  ];
  return <Scrolly id="p3-absorb" sub={ABSORB_SUB} steps={steps} graphic={(i, r, ctx) => <AbsorbFigure ctx={ctx} />} wide label="Where the earnings lost to job loss go, by income decile" />;
}
