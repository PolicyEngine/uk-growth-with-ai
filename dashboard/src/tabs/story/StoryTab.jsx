'use client';

import { useScrollProgress } from '@/components/story/motion.js';
import Hero from './Hero.jsx';
import Part1 from './Part1.jsx';
import Part2 from './Part2.jsx';
import Part3 from './Part3.jsx';

// The story: a hero, then three parts, each a run of scrolly blocks.
//   1 Where the UK stands: official data only, no forecasts of ours
//   2 What OG-UK projects: our 2028-surprise solves (surprise2028.json)
//   3 Jobs, incomes and the public finances: the PolicyEngine-UK
//     displacement study, provisional (aiStudy2425.json)
// The part files are one writer each; this shell owns the order and the
// progress track.
export const PARTS = [
  { id: 'story-part-1', n: 1, icon: 'landmark', kicker: 'Part 1', title: 'Where the UK stands' },
  { id: 'story-part-2', n: 2, icon: 'trend', kicker: 'Part 2', title: 'What a model of the whole economy projects' },
  { id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'Jobs, incomes and the public finances' },
];

export default function StoryTab() {
  const [ref, p] = useScrollProgress();
  return (
    <div className="story" ref={ref}>
      <div className="story-track" aria-hidden="true">
        <span style={{ transform: `scaleX(${p.toFixed(4)})` }} />
      </div>
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
    </div>
  );
}
