'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { HeadlineTiles, SummaryWhy } from '@/tabs/ai/Landing.jsx';
import { HEADLINE_YEAR, SCEN_NAME } from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { WelfareShape, WelfareSource } from './part2/charts.jsx';
import { MorphChart, SourceText } from './part2/Morph.jsx';
import { PhoneFoot } from './part2/frame.jsx';
import OutputSplit from './part2/OutputSplit.jsx';
import { MarkProvider } from '@/components/story/highlight.jsx';
import { shockSteps, morphCardSteps, morphAnswer, whoAnswer, MORPH_STATES, whoCardSteps, partMarks, Say } from './part2/steps.jsx';

export { scenarioDir } from './part2/steps.jsx';

// Part 2: what OG-UK projects when AI arrives as an unanticipated shock in
// 2028, against the no-shock OBR-central path. It is the one home of the
// three headline figures (HeadlineTiles and SummaryWhy, in #story-headline,
// the GDP scene's last step, which the Hero and Explore link to) and of
// where 2031 output goes (#story-output: the Sankey's shares and the
// waterfall's changes). Every other figure has its home on another tab:
// here the charts draw shapes only, the sentences give directions only.
// The header's scenario and closure apply throughout, except Who gains,
// which is solved for UK central only. Order: the model line, the shock
// (2S), the GDP canvas from the record to the four scenarios and the
// headline figures (2A), where output goes, who gains (2W). The three arms
// and public debt live on Explore (Economy, Public finances), linked from
// the headline step.

// Each block's opener (Scrolly renders it): a neutral question the block
// answers. Its key takeaway is the last card's closing line (takeaway()),
// not sub.takeaway: a line after the block would add height the Story has
// no room for, and the last cards sit below their minimum height.
export const SUBS = {
  shock: {
    title: 'The shock',
    icon: 'shock',
    question: 'What does the AI shock change in the model?',
    // the first topic of part 2: the full pinned question screen, with part
    // 1's recap as the transition (Fable's decision); P1_RECAP is part 1's
    pin: 'full',
    hint: 'Watch tiles move from labour to capital, then new tiles arrive',
    answer: 'Income shifts to capital, and the same inputs produce more',
    answerTo: { tab: 'method', sub: 'how', anchor: 'm-scenarios' },
  },
  morph: {
    title: 'GDP and the headline figures',
    icon: 'path',
    question: 'How far does GDP move from the OBR-central path in each scenario?',
    hint: 'Watch the axis switch from growth to a gap against the path',
    answer: 'GDP ends above the path in every scenario',
  },
  who: {
    title: 'Who gains and who loses',
    icon: 'age',
    question: 'Which generations gain, and which lose?',
    hint: 'Mark your birth year on the curve',
    answer: 'All adults gain as modelled; with transfers kept on past 2036, some adults lose',
    // replaced by whoAnswer() at render, from the data
    answerTo: { tab: 'explore', sub: 'who' },
  },
};

// What part 2 showed, three items, each to its home, no figure.
// Question and answer chips (q, a); `text` is the answer, for the chip's
// one-line form.
export const RECAP = [
  { icon: 'gdp', q: 'How far does GDP move?', a: 'Above the OBR-central path in every scenario', to: 'story-headline' },
  { icon: 'outputSplit', q: 'Who gets the extra output?', a: 'Capital income rises more than GDP', to: 'story-output' },
  { icon: 'age', q: 'Who gains and who loses?', a: 'Gains peak near retirement; with transfers kept on past 2036, some adults lose', to: { tab: 'explore', sub: 'who' } },
].map((it) => ({ ...it, text: it.a }));

export default function Part2({ part }) {
  const { st } = useNav();
  const sid = st.s;
  const closure = st.closure;
  const cl = primaryClosure(closure);
  const marks = partMarks(sid);
  return (
    <MarkProvider marks={marks}>
      {/* the part's model line is StoryTab's (PARTS[1].modelLine) */}
      <PartHead part={part} />

      <Scrolly
        id="p2-shock"
        scene
        sub={SUBS.shock}
        label="The shock, illustrated"
        steps={shockSteps()}
        graphic={(i) => <ShockTiles state={i + 1} />}
      />

      {/* the GDP scene: the gap, the four scenarios, then the headline
          figures as its last step (the tiles are in the DOM in every state) */}
      <Scrolly
        id="p2-morph"
        scene
        sub={{ ...SUBS.morph, answer: morphAnswer(cl) ?? SUBS.morph.answer }}
        label="From GDP growth to the gap against the OBR-central path, then the four scenarios and the headline figures"
        steps={[...morphCardSteps(sid, cl), headlineStep(sid)]}
        foot={
          <PhoneFoot>
            <SourceText s={4} all />
          </PhoneFoot>
        }
        graphic={(i, reduce, ctx) => <MorphChart state={i === 0 && !reduce && !(ctx?.entered ?? true) ? 1 : (MORPH_STATES[i] ?? 4)} sid={sid} cl={cl} />}
      />

      <OutputSplit sid={sid} closure={closure} />

      <Scrolly
        id="p2-who"
        scene
        sub={{ ...SUBS.who, answer: whoAnswer() ?? SUBS.who.answer }}
        label="Welfare change by birth year"
        steps={whoCardSteps()}
        foot={
          <PhoneFoot>
            <WelfareSource />
          </PhoneFoot>
        }
        graphic={(i) => <WelfareShape state={i} />}
      />
    </MarkProvider>
  );
}

// The GDP scene's last step: the three headline figures (their one home,
// #story-headline, which the Hero, Explore and Headline link to) and the
// one why line under them.
function headlineStep(sid) {
  return {
    id: 'p2-headline',
    icon: 'headline',
    title: `The headline figures: ${SCEN_NAME[sid]}, ${HEADLINE_YEAR}`,
    highlight: [`scen-${sid}`],
    body: (
      <>
        <Say>
          {SCEN_NAME[sid]} in {HEADLINE_YEAR}, main arm, against the OBR-central path; the other two arms are on{' '}
          <NavLink tab="explore" sub="economy" anchor="income">
            Explore
          </NavLink>
          .
        </Say>
        <section id="story-headline" className="summary story-headline p2-headline-step" aria-label={`The headline figures: ${SCEN_NAME[sid]}, ${HEADLINE_YEAR}`}>
          <HeadlineTiles sid={sid} />
          <SummaryWhy sid={sid} />
        </section>
      </>
    ),
  };
}
