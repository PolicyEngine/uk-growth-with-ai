'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import Card from '@/components/ui/Card.jsx';
import { Pause } from '@/components/story/chart/index.js';
import Sankey from '@/components/story/Sankey.jsx';
import { AxisTitles } from '@/tabs/explore/axes.jsx';
import { ext } from '@/tabs/shared/ui.jsx';
import { efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { fmtBn, fmtShare } from '@/tabs/story/part3/format.js';
import { D, OBR_SCENARIO, Replay, entryClass, ladder, useSeenBeat } from '@/tabs/story/part3/shared.jsx';
import { CENTRAL_RATE } from '@/tabs/story/part3/Central.jsx';

// Where a lost pound goes (moved from story part 3 in round 2: a different,
// smaller run). The study's "Household absorption of job loss by baseline
// decile" (results.tex): the OBR-sized run, job loss alone, from
// results/next_runs/obr_household_deciles.csv. Each income decile's earnings
// lost flow to four destinations. This card is the home of the destination
// totals, the earnings total, the share absorbed and employer NI. Styled as
// the other Households cards: header, one finding line, one unit line, the
// figure, one About fold.

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
// Decile 1 carries the ranking caveat: its node and ribbons stay grey.
export const CAVEAT_GREY = 'var(--pe-gray-300)';

// The graph: income decile -> destination, £bn a year.
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

// Statements about this run, from the data: whether it is smaller than the
// central case and whether disposable income takes most of the loss.
export const SMALLER = CENTRAL_RATE != null && S.displacement_rate_pct < CENTRAL_RATE;
export const MOST = S.total.disposable_bn > S.total.earnings_lost_bn / 2;

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

// "Follow a lost pound": choosing a decile re-runs the pour with that
// decile's ribbons lit end to end. No new figure: the split is read from the
// ribbons' widths.
export default function AbsorbCard() {
  const [ref, e] = useSeenBeat();
  const box = useRef(null);
  const [follow, setFollow] = useState(null);
  const [paused, setPaused] = useState(false);
  const g = absorbGraph();
  useEffect(() => {
    box.current?.querySelectorAll('[data-node], [data-target]').forEach((el) => {
      const id = el.getAttribute('data-node') ?? el.getAttribute('data-target');
      if (POUR_ORDER.includes(id)) el.setAttribute('data-mark', id);
    });
  });
  return (
    <Card
      id="hh-absorb"
      icon="banknote"
      title="Where a lost pound goes"
      finding={
        <>
          {MOST ? 'Most' : 'Part'} of the loss falls on disposable income; less tax and NI and more benefits absorb {fmtShare(S.tax_benefit_share_pct)}
        </>
      }
      unit={
        <>
          Job loss alone, a {SMALLER ? 'smaller ' : ''}run sized to {OBR_SCENARIO}, not the central case; {fmtBn(S.total.earnings_lost_bn)} of earnings lost, {S.draws} draws
        </>
      }
      download={{
        context: `uk-ai-study, ${S.file}`,
        table: {
          columns: ['decile', 'earnings_lost_bn', ...DESTS.map((d) => d.key)],
          rows: S.deciles.map((f, i) => [i + 1, f.earnings_lost_bn, ...DESTS.map((d) => f[d.key])]),
        },
      }}
      about={{
        how: <p>Each decile’s lost gross earnings, split by where the loss lands. Other items: mainly pension contributions no longer paid.</p>,
        caveats: <p>Benefits replace little partly because the data flag only some newly entitled people as claiming UC. Decile 1 is grey: no conclusion is drawn.</p>,
        sources: (
          <p data-reference="">
            {S.file}; {ladder('obr')?.file}. Sized to {ext(efo(EFO_PAGE.box22), 'OBR Box 2.2')}.
          </p>
        ),
      }}
    >
      <div
        className={entryClass(e, 'hh-absorb')}
        ref={(n) => {
          box.current = n;
          ref.current = n;
        }}
      >
        <span className="hh-absorb-actions">
          <Pause paused={paused} onClick={() => setPaused(!paused)} />
          <Replay onClick={e.replay} />
        </span>
        <AxisTitles y="£bn a year" x="Income decile, 1 = bottom, to where the loss lands" />
        <div className="p3-follow" role="group" aria-label="Follow one decile’s lost earnings">
          <span className="p3-follow-label">Follow one decile</span>
          {S.deciles.map((_, i) => (
            <button key={i} type="button" className={`p3-follow-btn${follow === i + 1 ? ' is-on' : ''}${i === 0 ? ' is-caveat' : ''}`} aria-pressed={follow === i + 1} onClick={() => setFollow(follow === i + 1 ? null : i + 1)}>
              {i + 1}
            </button>
          ))}
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
        <p className="hh-note">Employers also stop paying {fmtBn(S.employer_ni_bn)} of NI, a further cost to government.</p>
      </div>
    </Card>
  );
}
