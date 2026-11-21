'use client';

import { hy } from '@/components/story/Hy.jsx';
import { useEffect, useRef } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import Sankey from '@/components/story/Sankey.jsx';
import StoryBeat from '@/components/story/StoryBeat.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { absorbGraph, DESTS, MOST, POUR_ORDER } from '@/tabs/households/Absorb.jsx';
import { fmtBn, fmtShare } from './format.js';
import { docItem } from '@/lib/sourceItems.js';
import { efo, EFO_PAGE } from '@/tabs/ai/links.js';
import { D, FigureHead, Source, entryClass, useBeat } from './shared.jsx';
import { DecileOneWhy } from './Deciles.jsx';

// Where a lost pound of earnings goes (item 19: back in the Story, clearly
// labelled). The study's "Household absorption of job loss by baseline
// decile" (results.tex): a different, smaller run (job loss alone, sized to
// the OBR's scenario, 20 draws), so a run-switch marker on the page comes
// first and the figure's kicker names the run. Each income decile's earnings lost
// flow to four destinations, in the shared Sankey (pour, particles, node
// values), decile 1 dashed and muted, "not a reliable result: see why"
// (Deciles.jsx DecileOneWhy, without the ranking figure: that is the
// main run's). The Story is the home of the
// destination totals, the earnings total and the share absorbed; Explore >
// Households links here. Employer NI (its home), the other items, the UC
// caveat, the result file and OBR Box 2.2 are behind the title's button.

const S = D.sankey;
// the title is a finding (story-finding-titles-fable.md)
const TAX_MORE = S.total.tax_ni_bn > S.total.benefits_bn;
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

// The figure's notes and sources, behind its "Sources and notes" button.
function PoundSource() {
  return (
    <Source files={[S.file]} items={[docItem('OBR, March 2026, Box 2.2: the run is sized to its scenario', efo(EFO_PAGE.box22), 'Office for Budget Responsibility')]}
      groups={[
        {
          title: 'How it’s counted',
          notes: [
            { icon: 'tax', text: <>Employers also stop paying {fmtBn(S.employer_ni_bn)} of NI, a further cost to government.</> },
            { icon: 'measure', text: 'Other items: mainly pension contributions no longer paid.' },
            { icon: 'benefits', text: 'Benefits replace little partly because the data flag only some newly entitled people as claiming Universal Credit (UC).' },
          ],
        },
      ]}
    >
      {hy('OBR-sized')} run, {S.draws} draws
    </Source>
  );
}

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
      <FigureHead
        kicker={<>{hy('OBR-sized')} run · not the main case</>}
        icon="pay"
        title={TAX_MORE ? 'Lower tax absorbs more of the lost earnings than benefits' : 'Where lost earnings go, by income decile'}
        fallback={!TAX_MORE}
        y="£bn a year of earnings lost"
        x="by decile (1 = lowest)"
        unit={`OBR-sized run, job loss alone, average of ${S.draws} runs. The household study.`}
        unit2={`${fmtBn(S.total.earnings_lost_bn)} of earnings lost a year.`}
        replay={e.replay}
        source={<PoundSource />}
      />
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
      <p className="p3-pound-caveat">
        <DecileOneWhy lead="Decile 1, dashed: " rank={false} />
      </p>
    </figure>
  );
}

export default function Pound() {
  return (
    <>
      <StoryBeat
        id="obr-run"
        num={null}
        icon="jobLoss"
        head="A smaller shock"
        line={
          <>
            Job loss alone, sized to the OBR’s scenario: <span data-input="">{RATE}</span> of employees.
          </>
        }
      />
      <Scrolly id="p3-pound" sub={POUND_SUB} steps={POUND_STEPS} graphic={(i, r, ctx) => <PoundFigure ctx={ctx} />} label="Where lost earnings go, by income decile: an OBR-sized run, not the main case" />
    </>
  );
}
