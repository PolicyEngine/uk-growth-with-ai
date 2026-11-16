'use client';

import Callout from '@/components/story/Callout.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import PartHead from './PartHead.jsx';
import Central from './part3/Central.jsx';
import Channels from './part3/Channels.jsx';
import Absorb from './part3/Absorb.jsx';
import Deciles from './part3/Deciles.jsx';
import Rules from './part3/Rules.jsx';
import Margin from './part3/Margin.jsx';
import Moves from './part3/Moves.jsx';
import Closing, { CloseLinks } from './part3/Closing.jsx';

// Part 3: a model of households. Provisional results of a separate study, a
// PolicyEngine-UK microsimulation of AI job displacement in FY 2026-27
// (PolicyEngine/uk-ai-study PR #18, an unmerged draft), from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Eight sections in the paper's order (results.tex): the central case, its
// three channels, what the system absorbs, where the loss falls, who loses
// the job, job loss against wage cuts, what moves the cost (two cards:
// break-evens, then take-up and JSA), and what the study leaves out. A
// "Next" band hands over to the close (TwoLenses) and carries the links on. The headline findings are printed here once each; the
// detail is on Explore > Households. Formats: part3/format.js.

export default function Part3({ part }) {
  return (
    <>
      <PartHead part={part}>
        What a model of households finds for the public finances, poverty and incomes if a share of employees are assumed to lose their jobs to AI.
      </PartHead>
      <Callout icon="layers" title="A different model" className="p3-model">
        <p>
          This part reports a PolicyEngine-UK microsimulation on Microcosm UK 2024-25 data, static and for one year, FY 2026–27, whose figures
          are provisional: the study is a draft under review and they may change. It assumes that people lose their jobs, whereas in OG-UK (part
          2) the labour market clears and displacement shows in the wage, so its figures cannot be added to or compared with part 2’s gaps.
        </p>
      </Callout>
      <Central />
      <Channels />
      <Absorb />
      <Deciles />
      <Rules />
      <Margin />
      <Moves />
      <Closing />
      <NextPart title="Two lenses" to="story-close" links={<CloseLinks />}>
        What each model can and cannot say, and why their numbers are not added together.
      </NextPart>
    </>
  );
}
