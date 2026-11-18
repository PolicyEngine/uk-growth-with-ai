'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import StoryBeat from '@/components/story/StoryBeat.jsx';
import { useNav } from '@/lib/nav.jsx';
import { DebtNote, HeadlineTiles } from '@/tabs/ai/Landing.jsx';
import { BOUND, HEADLINE_YEAR, SCEN_NAME, SURPRISE_YEAR, gap } from '@/tabs/ai/surprise.js';
import { dirWord } from './part2/dir.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { WelfareShape } from './part2/charts.jsx';
import { MorphChart } from './part2/Morph.jsx';
import OutputSplit from './part2/OutputSplit.jsx';
import { MarkProvider } from '@/components/story/highlight.jsx';
import { shockSteps, morphCardSteps, morphAnswer, whoAnswer, MORPH_STATES, whoCardSteps, partMarks, Say } from './part2/steps.jsx';

export { scenarioDir } from './part2/steps.jsx';

// Part 2: what OG-UK projects when the AI shock starts, unanticipated, in
// 2028, against the forecast path. It is the one home of the
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
    question: 'What does the AI shock change?',
    // the first topic of part 2: the full pinned question screen, with part
    // 1's recap as the transition (Fable's decision); P1_RECAP is part 1's
    pin: 'full',
    hint: 'Watch tiles move from labour to capital, then new tiles arrive',
    answer: 'Income shifts to capital, and the same inputs produce more',
    answerTo: { tab: 'method', sub: 'how', anchor: 'm-scenarios' },
  },
  morph: {
    title: 'GDP, scenario by scenario',
    icon: 'path',
    question: 'How far does GDP move from the OBR’s central forecast path?',
    hint: 'Watch the axis switch from growth to a gap against the forecast path',
    answer: 'GDP ends above the forecast path in every scenario',
    // the caption is about every scenario's line
    answerHighlight: ['scen-uk_low', 'scen-uk_central', 'scen-uk_high', 'scen-korinek'],
  },
  who: {
    title: 'Gains and losses by generation',
    icon: 'age',
    question: 'Which generations gain, and which lose?',
    hint: 'Mark your birth year on the curve',
    answer: 'All adults gain as modelled; if transfers bear the cost after 2036, some adults lose',
    answerHighlight: ['cohort-adults'],
    // replaced by whoAnswer() at render, from the data
    answerTo: { tab: 'explore', sub: 'who' },
  },
};

// What part 2 showed, three items, each to its home, no figure.
// Question and answer chips (q, a); `text` is the answer, for the chip's
// one-line form.
export const RECAP = [
  { icon: 'gdp', q: 'How far does GDP move?', a: 'Above the OBR’s central forecast path in every scenario', to: 'story-headline' },
  { icon: 'outputSplit', q: 'Who gets the extra output?', a: 'Capital income rises more than GDP', to: 'story-output' },
  { icon: 'age', q: 'Who gains and who loses?', a: 'Gains peak near retirement; if transfers bear the cost after 2036, some adults lose', to: { tab: 'explore', sub: 'who' } },
].map((it) => ({ ...it, text: it.a }));

// Beat B3's words from the signs (story-beats-fable.md): GDP above the
// path and 0 < GNI gap < GDP gap gives "Output is up. Part of the gain goes
// abroad."; otherwise the plain form. null while the solve is pending (no
// beat). Pay rates are left out on purpose: their sign can flip.
export function beat2031(sid, cl) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null) return null;
  if (y > 0.005 && g != null && g > 0.005 && g < y) {
    return {
      head: 'Output is up. Part of the gain goes abroad.',
      line: `The shock is complete. More is produced than on the forecast path; ${cl === BOUND ? 'some of the extra income goes to holders of UK government debt abroad' : 'some of the extra income goes to owners abroad'}.`,
    };
  }
  return { head: 'The shock is complete', line: `GDP is ${dirWord(y)} the forecast path.` };
}

export default function Part2({ part }) {
  const { st } = useNav();
  const sid = st.s;
  const closure = st.closure;
  const cl = primaryClosure(closure);
  const marks = partMarks(sid);
  const b3 = beat2031(sid, cl);
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

      <StoryBeat
        id={String(SURPRISE_YEAR)}
        num={SURPRISE_YEAR}
        head="More AI, sooner, as a surprise"
        line={`In every scenario, AI does more, sooner, than the OBR expects. Nobody planned for it, so the economy follows the forecast path until ${SURPRISE_YEAR}.`}
      />

      {/* the GDP scene: the gap, the four scenarios, then the headline
          figures as its last step (the tiles are in the DOM in every state) */}
      <Scrolly
        id="p2-morph"
        scene
        sub={{ ...SUBS.morph, answer: morphAnswer(cl) ?? SUBS.morph.answer, answerNote: <DebtNote sid={sid} cl={cl} /> }}
        label="From GDP growth to the gap against the OBR’s central forecast path, then the four scenarios and the headline figures"
        steps={[...morphCardSteps(sid, cl), headlineStep(sid)]}
        graphic={(i, reduce, ctx) => <MorphChart state={i === 0 && !reduce && !(ctx?.entered ?? true) ? 1 : (MORPH_STATES[i] ?? 4)} sid={sid} cl={cl} />}
      />

      {b3 ? <StoryBeat id={String(HEADLINE_YEAR)} num={HEADLINE_YEAR} head={b3.head} line={b3.line} from="above" /> : null}

      <OutputSplit sid={sid} closure={closure} />

      <Scrolly
        id="p2-who"
        scene
        sub={{ ...SUBS.who, answer: whoAnswer() ?? SUBS.who.answer }}
        label="Welfare change by birth year"
        steps={whoCardSteps()}
        graphic={(i) => <WelfareShape state={i} />}
      />
    </MarkProvider>
  );
}

// The GDP scene's last step: the three headline figures (their one home,
// #story-headline, which the Hero, Explore and Headline link to): one
// sentence with no figure and no link that names the scenario, the year and
// the forecast path (headline-tiles-fable.md section 2; no chip), then a
// three-row ledger of label, number and note. The public debt line is the
// scene's caption note (DebtNote, under the closing line in the frame).
// What the figures are measured against (main arm, forecast path) is in
// the GDP figure's notes (part2/Morph.jsx, morphGroups).
function headlineStep(sid) {
  return {
    id: 'p2-headline',
    icon: 'headline',
    title: `The headline figures: ${SCEN_NAME[sid]}, ${HEADLINE_YEAR}`,
    highlight: [`scen-${sid}`],
    body: (
      <>
        <Say>
          {SCEN_NAME[sid]} scenario, {HEADLINE_YEAR}: each figure is a gap against the OBR&rsquo;s central forecast path.
        </Say>
        <section id="story-headline" className="summary story-headline p2-headline-step" aria-label={`The headline figures: ${SCEN_NAME[sid]}, ${HEADLINE_YEAR}`}>
          <HeadlineTiles sid={sid} />
        </section>
      </>
    ),
  };
}
