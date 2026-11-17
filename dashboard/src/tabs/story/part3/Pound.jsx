'use client';

import { useEffect, useRef } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import Sankey from '@/components/story/Sankey.jsx';
import StoryBeat from '@/components/story/StoryBeat.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { absorbGraph, DESTS, MOST, POUR_ORDER } from '@/tabs/households/Absorb.jsx';
import { fmtBn, fmtShare } from './format.js';
import { D, FigureHead, Source, entryClass, useBeat } from './shared.jsx';

// Where a lost pound of earnings goes (item 19: back in the Story, clearly
// labelled). The study's "Household absorption of job loss by baseline
// decile" (results.tex): a different, smaller run (job loss alone, sized to
// the OBR's scenario, 20 draws), so a run-switch marker on the page comes
// first and the figure carries a chip. Each income decile's earnings lost
// flow to four destinations, in the shared Sankey (pour, particles, node
// values), decile 1 grey with its caveat. The Story is the home of the
// destination totals, the earnings total and the share absorbed; Explore >
// Households links here.
// SOURCES: move into notes icon: "Employers also stop paying £3.2bn of NI, a
// further cost to government (D.sankey.employer_ni_bn)." "Other items: mainly
// pension contributions no longer paid." "Benefits replace little partly
// because the data flag only some newly entitled people as claiming UC."
// Sources: results/next_runs/obr_household_deciles.csv; sized to OBR Box 2.2
// (efo(EFO_PAGE.box22)).

const S = D.sankey;
const RATE = `${S.displacement_rate_pct.toFixed(2)}%`;

export const POUND_SUB = {
  title: 'Where a lost pound goes',
  icon: 'pay',
  question: 'Where does a lost pound of earnings go?',
  hint: 'Follow each decile into four destinations',
  key: 'pound',
};

export const POUND_STEPS = [
  {
    id: 'p3-pound-step',
    icon: 'pay',
    title: 'Where the lost earnings land',
    // the destinations the sentence names (their Sankey nodes and ribbons)
    highlight: ['disposable', 'tax', 'benefits'],
    body: (
      <p className="p3-step-line">
        {MOST ? 'Most' : 'Part'} of the lost earnings fall on household income; tax, NI and benefits absorb {fmtShare(S.tax_benefit_share_pct)}.
      </p>
    ),
  },
];

const DEST_NAME = Object.fromEntries(DESTS.map((d) => [d.id, d.label]));
const tip = ({ kind, link, node }) =>
  kind === 'link' ? (
    <>
      Decile {link.source.label} <Icon name="arrowRight" size={12} /> {DEST_NAME[link.target.id]}
    </>
  ) : node.id.startsWith('d') ? (
    <>Decile {node.label}: its earnings lost, by destination</>
  ) : (
    <>{DEST_NAME[node.id]}</>
  );

function PoundFigure({ ctx }) {
  const { attach, ...e } = useBeat(ctx?.entered ?? true);
  // the destination nodes and their ribbons carry data-mark, so the step's
  // highlight lights them (as on the Explore card before)
  const box = useRef(null);
  useEffect(() => {
    box.current?.querySelectorAll('[data-node], [data-target]').forEach((el) => {
      const id = el.getAttribute('data-node') ?? el.getAttribute('data-target');
      if (POUR_ORDER.includes(id)) el.setAttribute('data-mark', id);
    });
  });
  return (
    <figure ref={attach} className={entryClass(e, 'p3-figure p3-scene p3-pound')}>
      <p className="p3-pound-chip">OBR-sized run · not the central case</p>
      <FigureHead icon="pay" title="Where lost earnings go, by income decile" y="£bn a year" x="Income decile, 1 = bottom, to where the loss lands" unit={`${fmtBn(S.total.earnings_lost_bn)} of earnings lost a year, ${S.draws} draws`} replay={e.replay} />
      <div className="p3-pound-sankey" ref={box}>
        <Sankey
          graphs={[absorbGraph()]}
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
          replayKey={e.run}
          flow={e.on}
          interactive
          tooltip={tip}
        />
      </div>
      <p className="p3-pound-caveat">Decile 1 is grey: no conclusion is drawn.</p>
      <Source files={[S.file]}>OBR-sized run, {S.draws} draws</Source>
    </figure>
  );
}

export default function Pound() {
  return (
    <>
      <StoryBeat
        id="obr-run"
        compact
        num={null}
        head="A smaller shock"
        line={
          <>
            Job loss alone, sized to the OBR’s scenario: <span data-input="">{RATE}</span> of employees.
          </>
        }
      />
      <Scrolly id="p3-pound" sub={POUND_SUB} steps={POUND_STEPS} graphic={(i, r, ctx) => <PoundFigure ctx={ctx} />} label="Where lost earnings go, by income decile: an OBR-sized run, not the central case" />
    </>
  );
}
