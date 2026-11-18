'use client';

import Hero from './Hero.jsx';
import Part1 from './Part1.jsx';
import Part2 from './Part2.jsx';
import Part3 from './Part3.jsx';
import StoryRail from './StoryRail.jsx';
import TwoLenses from './TwoLenses.jsx';
import { Items } from '@/components/story/Items.jsx';
import { Hy } from '@/components/story/Hy.jsx';
import { URLS } from '@/tabs/ai/links.js';
import { MODEL_BASE_VINTAGE, OBR_MARCH_2026, OBR_VINTAGE } from './part1/data.js';

// The story: a hero, then three parts, each a run of scrolly blocks.
//   1 Where the UK stands: official data only, no forecasts of ours
//   2 What OG-UK projects: our 2028-surprise solves (surprise2028.json)
//   3 Jobs, incomes and the public finances: the PolicyEngine-UK
//     displacement study, provisional (aiStudy2425.json)
//   Close: what each model can and cannot say (TwoLenses)
// The part files are one writer each; this shell owns the order and the
// "you are here" rail (StoryRail).
// Each part's opener (PartHead / PartOpener, Fable's ruling of 17 Nov): a
// kicker "Part n · model" and the part's one question as the h2. `title`
// is the rail's name. The model sentence and its links, and part 3's "not
// added to part 2's", live in the "About this model" fold. Its copy prints
// no signed figure (years only, from part1/data.js), so the number check's
// multiset is unchanged.
const ext = { target: '_blank', rel: 'noopener noreferrer' };
export const PARTS = [
  {
    id: 'story-part-1',
    n: 1,
    kicker: 'Part 1',
    title: 'Where the UK stands',
    model: 'official',
    question: 'Where do the UK economy and its labour market stand today?',
  },
  {
    id: 'story-part-2',
    n: 2,
    kicker: 'Part 2',
    title: 'What a model of the whole economy projects',
    model: 'oguk',
    question: 'What happens to output, incomes and the public finances if, from 2028, AI does more than the OBR already expects?',
    line: 'No unemployment: the shock shows up in pay rates, not in job losses.',
    about: (
      <>
        {/* the AI shock, defined once (ai-shock-wording-fable.md) */}
        <p>The AI shock: AI does more workers’ tasks than the OBR expects, so capital’s share of income rises and the same inputs produce more.</p>
        <p>It arrives in 2028, unannounced, and builds in four yearly steps to 2031.</p>
      <Items
        items={[
          {
            icon: 'gdp',
            text: (
              <>
                <a href={URLS.ogUk} {...ext}><Hy>OG-UK</Hy></a>: a model of the whole economy, over decades
              </>
            ),
          },
          { icon: 'path', text: 'Results are gaps against the OBR’s central forecast path, not forecasts' },
          {
            icon: 'forecast',
            text: (
              <>
                The forecast path: the <a href={OBR_MARCH_2026} {...ext}>OBR&rsquo;s {MODEL_BASE_VINTAGE} forecast</a>,{' '}
                <a href={`${URLS.obrBp9}#page=51`} {...ext}>its AI included</a>
              </>
            ),
          },
          { icon: 'timing', text: `Part 1 shows the OBR’s ${OBR_VINTAGE} update` },
        ]}
      />
      </>
    ),
  },
  {
    id: 'story-part-3',
    n: 3,
    kicker: 'Part 3',
    title: 'Jobs, incomes and the public finances',
    model: 'aistudy',
    question: 'What happens to the public finances, poverty and incomes if some employees lose their jobs to AI?',
    line: 'One year only, with no change in behaviour.',
    about: (
      <Items
        items={[
          { icon: 'data', text: <Hy>PolicyEngine-UK on Microcosm UK survey data</Hy> },
          { icon: 'jobLoss', text: <Hy>Here people lose jobs; in OG-UK everyone who wants work has it</Hy> },
          { icon: 'compare', text: 'Its figures are not added to or compared with part 2’s' },
        ]}
      />
    ),
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
