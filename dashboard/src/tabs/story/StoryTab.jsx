'use client';

import Hero from './Hero.jsx';
import Part1 from './Part1.jsx';
import Part2 from './Part2.jsx';
import Part3 from './Part3.jsx';
import StoryRail from './StoryRail.jsx';
import TwoLenses from './TwoLenses.jsx';

// The story: a hero, then three parts, each a run of scrolly blocks.
//   1 Where the UK stands: official data only, no forecasts of ours
//   2 What OG-UK projects: our 2028-surprise solves (surprise2028.json)
//   3 Jobs, incomes and the public finances: the PolicyEngine-UK
//     displacement study, provisional (aiStudy2425.json)
//   Close: what each model can and cannot say (TwoLenses)
// The part files are one writer each; this shell owns the order and the
// "you are here" rail (StoryRail).
export const PARTS = [
  { id: 'story-part-1', n: 1, icon: 'landmark', kicker: 'Part 1', title: 'Where the UK stands' },
  { id: 'story-part-2', n: 2, icon: 'trend', kicker: 'Part 2', title: 'What a model of the whole economy projects' },
  { id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'Jobs, incomes and the public finances' },
];
// the rail's names are short, so four fit in one row
const RAIL = [
  { id: PARTS[0].id, short: '1', title: 'Where the UK stands' },
  { id: PARTS[1].id, short: '2', title: 'The whole economy' },
  { id: PARTS[2].id, short: '3', title: 'Households' },
  { id: 'story-close', short: '4', title: 'Two lenses' },
];

export default function StoryTab() {
  return (
    <div className="story">
      <StoryRail sections={RAIL} />
      <Hero />
      <section className="story-part" id={PARTS[0].id} aria-labelledby={`${PARTS[0].id}-h`}>
        <Part1 part={PARTS[0]} />
      </section>
      <section className="story-part" id={PARTS[1].id} aria-labelledby={`${PARTS[1].id}-h`}>
        <Part2 part={PARTS[1]} />
      </section>
      <section className="story-part" id={PARTS[2].id} aria-labelledby={`${PARTS[2].id}-h`}>
        <Part3 part={PARTS[2]} />
      </section>
      <TwoLenses />
    </div>
  );
}
