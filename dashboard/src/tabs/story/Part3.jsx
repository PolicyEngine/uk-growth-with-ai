'use client';

import Callout from '@/components/story/Callout.jsx';
import { Items, Recap } from '@/components/story/Items.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import Central, { CENTRAL_SUB } from './part3/Central.jsx';
import Channels from './part3/Channels.jsx';
import Absorb from './part3/Absorb.jsx';
import Deciles from './part3/Deciles.jsx';
import Rules, { rulesClaims } from './part3/Rules.jsx';
import Margin from './part3/Margin.jsx';
import Moves from './part3/Moves.jsx';
import Closing, { CloseLinks } from './part3/Closing.jsx';
import { D, Ico, MODEL_YEAR, NO_CLEAN_RERUN, PROVISIONAL } from './part3/shared.jsx';

// Part 3: a model of households. Provisional results of a separate study, a
// PolicyEngine-UK microsimulation of AI job displacement in FY 2026-27
// (PolicyEngine/uk-ai-study PR #18, an unmerged draft), from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Eight sections in the paper's order (results.tex): the central case, its
// three channels, what the system absorbs, where the loss falls, who loses
// the job, job loss against wage cuts, what moves the cost (two cards:
// break-evens, then take-up and JSA), and what the study leaves out, read
// as three scenes under sub-headers (the cost; who it falls on; what changes
// it). Each one-card block plays its beats once on entry (Replay reruns
// them); step ids are unchanged. A
// "Next" band hands over to the close (TwoLenses) and carries the links on. The headline findings are printed here once each; the
// detail is on Explore > Households. Formats: part3/format.js.

// What you just learned (the part's recap, S2's Recap): three of the part's
// questions, each with a worded answer (no figures: each figure has its home
// in its scene) and a link back to the question's header (q-<scene>). The
// words follow the signs of the results.
const H = D.headline;
const RULES = rulesClaims();
export const P3_RECAP = [
  {
    icon: 'cost',
    q: CENTRAL_SUB.question,
    a: `${H.central_cost.value > 0 ? 'A net cost' : 'Net receipts'}; poverty, inequality ${H.central_poverty.value > 0 && H.central_gini.value > 0 ? 'rise' : 'move'}`,
    to: 'q-p3-central',
  },
  { icon: 'scenario', q: 'Does who loses the job matter?', a: RULES.costFar ? 'For cost; far less for poverty' : 'For cost and for poverty', to: 'q-p3-rules' },
  { icon: 'breakEven', q: 'What moves the cost most?', a: 'Wage and capital-income rises; spell length', to: 'q-p3-moves' },
].map((it) => ({ ...it, text: it.a }));

export default function Part3({ part }) {
  return (
    <>
      <PartHead part={part}>
        <Ico c="households" size={18} /> What a model of households finds if a share of employees are assumed to lose their jobs to AI.
      </PartHead>
      <Callout icon="model" title="A different model" className="p3-model">
        <Items
          items={[
            { icon: 'model', text: <>Static PolicyEngine-UK microsimulation, {D.source.dataset} data, {MODEL_YEAR}</> },
            PROVISIONAL
              ? { icon: 'provisional', text: 'Figures are provisional: the study is a draft under review' }
              : { icon: 'source', text: `Merged study${NO_CLEAN_RERUN ? '; its manifest: no full clean-room rerun' : ''}` },
            { icon: 'jobLoss', text: 'Assumes job loss; in OG-UK (part 2) displacement shows in the wage' },
            { icon: 'limit', text: 'Its figures cannot be added to or compared with part 2’s gaps' },
          ]}
        />
      </Callout>
      <Central />
      <Channels />
      <Absorb />
      <Deciles />
      <Rules />
      <Margin />
      <Moves />
      <Closing />
      <Recap items={P3_RECAP} />
      <NextPart title="Two lenses" to="story-close" links={<CloseLinks />} />
    </>
  );
}
