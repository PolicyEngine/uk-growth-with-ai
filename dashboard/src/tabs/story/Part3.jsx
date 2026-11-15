'use client';

import Icon from '@/components/ab/Icon.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import PartHead from './PartHead.jsx';
import Central from './part3/Central.jsx';
import Ladder from './part3/Ladder.jsx';
import Rules from './part3/Rules.jsx';
import PerPound from './part3/PerPound.jsx';
import { DisplacedTiles, DisplacedUc } from './part3/Displaced.jsx';
import Deciles from './part3/Deciles.jsx';

// Part 3: jobs, incomes and the public finances. Provisional results of a
// separate study, a PolicyEngine-UK microsimulation of AI job displacement
// (PolicyEngine/uk-ai-study PR #18, an unmerged draft), from
// data/aiStudy2425.json; docs/story/part3-notes.md defines every value.
// These figures appear nowhere else on the site, and each is printed once
// in this part. Formats: part3/format.js.

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
          This part reports a PolicyEngine-UK microsimulation on Microcosm UK 2024-25, which is static and covers one year. It assumes that
          people lose their jobs, whereas in OG-UK (part 2) the labour market clears and displacement shows in the wage. Its figures
          therefore cannot be added to or compared with part 2’s gaps.
        </p>
      </aside>
      <Central />
      <Ladder />
      <Rules />
      <PerPound />
      <DisplacedTiles />
      <DisplacedUc />
      <Deciles />
    </>
  );
}
