'use client';

import Hero from './Hero.jsx';
import Part1 from './Part1.jsx';
import Part2 from './Part2.jsx';
import Part3 from './Part3.jsx';
import StoryRail from './StoryRail.jsx';
import TwoLenses from './TwoLenses.jsx';
import { Items } from '@/components/story/Items.jsx';

// The story: a hero, then three parts, each a run of scrolly blocks.
//   1 Where the UK stands: official data only, no forecasts of ours
//   2 What OG-UK projects: our 2028-surprise solves (surprise2028.json)
//   3 Jobs, incomes and the public finances: the PolicyEngine-UK
//     displacement study, provisional (aiStudy2425.json)
//   Close: what each model can and cannot say (TwoLenses)
// The part files are one writer each; this shell owns the order and the
// "you are here" rail (StoryRail).
// Each part's opener (PartHead / PartOpener): its model badge, a handover
// line naming the change of model, and chips that link to the homes of its
// facts (names only: no numbers, each fact has one home). New copy has no
// digits, so the number check's multiset is unchanged.
export const PARTS = [
  {
    id: 'story-part-1',
    n: 1,
    icon: 'record',
    kicker: 'Part 1',
    title: 'Where the UK stands',
    model: 'official',
    chips: [
      { concept: 'gdp', label: 'Output', anchor: 'p1-output' },
      { concept: 'pay', label: 'Work and pay', anchor: 'p1-work' },
      { concept: 'ai', label: 'AI exposure', anchor: 'p1-exposure' },
    ],
  },
  {
    id: 'story-part-2',
    n: 2,
    icon: 'gdp',
    kicker: 'Part 2',
    title: 'What a model of the whole economy projects',
    model: 'oguk',
    handover: 'From measured to modelled: above, published statistics; from here, OG-UK projections, as gaps against the OBR-central path, not forecasts.',
    about: (
      <Items
        items={[
          { icon: 'gdp', text: 'A model of the whole economy, over decades' },
          { icon: 'excluded', text: 'It has no unemployment: displacement shows in the wage' },
          { icon: 'path', text: 'Gaps against the OBR-central path, not forecasts of levels' },
        ]}
      />
    ),
    chips: [
      { concept: 'headline', label: 'Headline figures', anchor: 'story-headline' },
      { concept: 'outputSplit', label: 'Where output goes', anchor: 'story-output' },
      { concept: 'age', label: 'Who gains', anchor: 'p2-who' },
    ],
  },
  {
    id: 'story-part-3',
    n: 3,
    icon: 'households',
    kicker: 'Part 3',
    title: 'Jobs, incomes and the public finances',
    model: 'aistudy',
    answers: 'What happens to the public finances, poverty and incomes if some employees lose their jobs to AI.',
    handover: 'A change of model: a one-year microsimulation of households, provisional. Its figures are not added to or compared with the whole-economy results.',
    about: (
      <Items
        items={[
          { icon: 'data', text: 'PolicyEngine-UK on Microcosm UK survey data, static, for one year' },
          { icon: 'provisional', text: 'A draft under review: its figures may change' },
          { icon: 'jobLoss', text: 'People lose their jobs; in OG-UK the labour market clears' },
        ]}
      />
    ),
    chips: [
      { concept: 'jobLoss', label: 'The central case', anchor: 'p3-central' },
      { concept: 'deciles', label: 'Where the loss falls', anchor: 'p3-deciles' },
      { concept: 'cost', label: 'What moves the cost', anchor: 'p3-moves' },
    ],
  },
];
// the rail's names are short, so four fit in one row
const RAIL = [
  { id: PARTS[0].id, short: '1', icon: 'record', title: 'Where the UK stands' },
  { id: PARTS[1].id, short: '2', icon: 'gdp', title: 'The whole economy' },
  { id: PARTS[2].id, short: '3', icon: 'households', title: 'Households' },
  { id: 'story-close', short: '4', icon: 'compare', title: 'Two lenses' },
];

export default function StoryTab() {
  return (
    <div className="story">
      <StoryRail sections={RAIL} />
      <Hero />
      <section className="story-part" data-part="1" id={PARTS[0].id} aria-labelledby={`${PARTS[0].id}-h`}>
        <Part1 part={PARTS[0]} />
      </section>
      <section className="story-part" data-part="2" id={PARTS[1].id} aria-labelledby={`${PARTS[1].id}-h`}>
        <Part2 part={PARTS[1]} />
      </section>
      <section className="story-part" data-part="3" id={PARTS[2].id} aria-labelledby={`${PARTS[2].id}-h`}>
        <Part3 part={PARTS[2]} />
      </section>
      <TwoLenses />
    </div>
  );
}
