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
// Each part's opener (PartHead / PartOpener), in four lines: "Part n ·
// model" (meta), the title, the one question the part answers, and one
// model line, which carries the handover the old "Next: part n" band said
// (round 1, plan S5/S6). Its copy prints no signed figure (years only, from
// part1/data.js), so the number check's multiset is unchanged.
const ext = { target: '_blank', rel: 'noopener noreferrer' };
export const PARTS = [
  {
    id: 'story-part-1',
    n: 1,
    icon: 'record',
    kicker: 'Part 1',
    title: 'Where the UK stands',
    model: 'official',
    question: 'Where do the UK economy and its labour market stand before AI arrives?',
    modelLine: <Hy>Published statistics only: nothing here is modelled by PolicyEngine, and the one forecast is the OBR’s.</Hy>,
  },
  {
    id: 'story-part-2',
    n: 2,
    icon: 'gdp',
    kicker: 'Part 2',
    title: 'What a model of the whole economy projects',
    model: 'oguk',
    question: 'What happens to output, incomes and the public finances if AI arrives as a shock?',
    modelLine: (
      <>
        Modelled with <a href={URLS.ogUk} {...ext}><Hy>OG-UK</Hy></a> (on <a href={URLS.ogCore} {...ext}><Hy>OG-Core</Hy></a>, no unemployment): gaps against the <Hy>OBR-central</Hy> path, on the{' '}
        <a href={OBR_MARCH_2026} {...ext}>OBR&rsquo;s {MODEL_BASE_VINTAGE}</a> productivity growth, not part 1&rsquo;s {OBR_VINTAGE} forecast.
      </>
    ),
    about: (
      <Items
        items={[
          { icon: 'gdp', text: 'A model of the whole economy, over decades' },
          { icon: 'excluded', text: 'It has no unemployment: displacement shows in the wage' },
          { icon: 'path', text: <Hy>Gaps against the OBR-central path, not forecasts of levels</Hy> },
        ]}
      />
    ),
  },
  {
    id: 'story-part-3',
    n: 3,
    icon: 'households',
    kicker: 'Part 3',
    title: 'Jobs, incomes and the public finances',
    model: 'aistudy',
    question: 'What happens to the public finances, poverty and incomes if some employees lose their jobs to AI?',
    modelLine: <Hy>A change of model: a one-year microsimulation of households. Its figures are not added to or compared with the whole-economy results.</Hy>,
    about: (
      <Items
        items={[
          { icon: 'data', text: <Hy>PolicyEngine-UK on Microcosm UK survey data, static, for one year</Hy> },
          { icon: 'source', text: 'Merged study; its manifest: no full clean-room rerun' },
          { icon: 'jobLoss', text: <Hy>People lose their jobs; in OG-UK the labour market clears</Hy> },
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
