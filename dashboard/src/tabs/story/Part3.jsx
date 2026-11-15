'use client';

import Icon from '@/components/ab/Icon.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import PartHead from './PartHead.jsx';
import Central from './part3/Central.jsx';
import Channels from './part3/Channels.jsx';
import Absorb from './part3/Absorb.jsx';
import Deciles from './part3/Deciles.jsx';
import Rules from './part3/Rules.jsx';
import Margin from './part3/Margin.jsx';
import Moves from './part3/Moves.jsx';
import Closing from './part3/Closing.jsx';

// Part 3: a model of households. Provisional results of a separate study, a
// PolicyEngine-UK microsimulation of AI job displacement in FY 2026-27
// (PolicyEngine/uk-ai-study PR #18, an unmerged draft), from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// Eight steps in the paper's order (results.tex): the central case, its
// three channels, what the system absorbs, where the loss falls, who loses
// the job, job loss against wage cuts, what moves the cost, and what the
// study leaves out. The headline findings are printed here once each; the
// detail is on Explore > Households. Formats: part3/format.js.

export default function Part3({ part }) {
  return (
    <>
      <PartHead part={part} extra={<Notice>Provisional</Notice>}>
        What a model of households finds for the public finances, poverty and incomes if a share of employees lose their jobs to AI.
      </PartHead>
      <aside className="p3-break" aria-labelledby="p3-break-h">
        <h3 id="p3-break-h">
          <Icon name="layers" size={18} /> A different model
        </h3>
        <p>
          This part reports a PolicyEngine-UK microsimulation on Microcosm UK 2024-25 data, which is static and covers one year, FY 2026–27. Its
          figures are provisional: the study is a draft under review and they may change. It assumes that people lose their jobs, whereas in
          OG-UK (part 2) the labour market clears and displacement shows in the wage. Its figures therefore cannot be added to or compared with
          part 2’s gaps.
        </p>
      </aside>
      <Central />
      <Channels />
      <Absorb />
      <Deciles />
      <Rules />
      <Margin />
      <Moves />
      <Closing />
    </>
  );
}
