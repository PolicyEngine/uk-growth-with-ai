'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import { HeadlineTiles, SummaryWhy } from '@/tabs/ai/Landing.jsx';
import { SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCEN_NAME, BOUND, gap } from '@/tabs/ai/surprise.js';
import { primaryClosure, closuresFor } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { ArmsPair, WelfareShape, series, afterWords } from './part2/charts.jsx';
import { Tx } from './part2/frame.jsx';
import { MorphChart } from './part2/Morph.jsx';
import OutputSplit from './part2/OutputSplit.jsx';
import { MarkProvider } from '@/components/story/highlight.jsx';
import { A, SRC } from './part2/sources.jsx';
import * as P1 from './Part1.jsx';

// Part 1's recap, the transition into part 2, once part 1 exports it (read
// by a computed key so the build does not fail before it lands).
const P1_KEY = 'P1_RECAP';
const P1_RECAP = P1[P1_KEY];
import {
  shockSteps, morphCardSteps, MORPH_STATES, armsCardSteps, ARMS_STATES, whoCardSteps, partMarks, debtWords, othersEndHigher,
} from './part2/steps.jsx';

export { debtWords, othersEndHigher, scenarioDir, tzItem, debtItems } from './part2/steps.jsx';

// Part 2: what OG-UK projects when AI arrives as an unanticipated shock in
// 2028, against the no-shock OBR-central path. It is the one home of the
// three headline figures (HeadlineTiles and SummaryWhy, in #story-headline,
// which Results links to) and of where 2031 output goes (#story-output: the
// Sankey's shares and the waterfall's changes). Every other figure has its
// home on another tab: here the charts draw shapes only, the sentences give
// directions only, and each step links to the figure's home. The header's
// scenario and closure apply throughout, except Who gains, which is solved
// for UK central only. Order: the model line, the shock (2S), the GDP
// canvas from the record to the four scenarios (2A), the headline figures,
// where output goes, three arms with output and public debt (2B), who gains
// (2W), then the band to part 3 with links to the figures' homes.

// One threshold for every direction part 2 states, in words and icons
// (dir.js): no debt gap in the data lies between it and the old 0.05.

// The band that ends part 2: part 3 next, and links to the figures' homes
// (the tab row's sub-tabs).
const DEEPER = [
  { tab: 'explore', sub: 'economy', label: 'Economy', icon: 'gdp' },
  { tab: 'explore', sub: 'finances', label: 'Public finances', icon: 'finances' },
  { tab: 'explore', sub: 'who', label: 'Gains and losses', icon: 'age' },
  { tab: 'method', sub: 'how', anchor: 'm-scenarios', label: 'Scenarios', icon: 'scenario' },
  { tab: 'method', sub: 'how', label: 'OG-UK method', icon: 'model' },
];
function NextBand() {
  return (
    <NextPart
      n={3}
      title="Jobs, incomes and the public finances"
      to="story-part-3"
      links={DEEPER.map((d) => (
        <NavLink key={`${d.tab}-${d.sub}-${d.anchor ?? ''}`} tab={d.tab} sub={d.sub} anchor={d.anchor}>
          <Tx icon={d.icon}>{d.label}</Tx>
        </NavLink>
      ))}
    />
  );
}

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
    recap: P1_RECAP,
    hint: 'Watch tiles move from labour to capital, then new tiles arrive',
    answer: 'Income shifts to capital, and the same inputs produce more',
    answerTo: { tab: 'method', sub: 'how', anchor: 'm-scenarios' },
  },
  morph: {
    title: 'From the record to the scenarios',
    icon: 'path',
    question: 'How far does GDP move from the OBR-central path in each scenario?',
    hint: 'Watch the growth axis turn into a gap against the path',
    answer: 'GDP ends above the path in every scenario: see the headline figures',
    answerTo: 'story-headline',
  },
  arms: {
    title: 'Three arms: output and public debt',
    icon: 'ai',
    question: 'What does the productivity gain add, for output and for public debt?',
    hint: 'Compare the three arms after the shock completes',
    answer: 'Without it, GDP is lower and public debt ends further above the path',
    answerTo: { tab: 'explore', sub: 'finances' },
  },
  who: {
    title: 'Who gains and who loses',
    icon: 'age',
    question: 'Which generations gain, and which lose?',
    hint: 'Mark your birth year on the curve',
    answer: 'Gains peak near retirement; on other measures some adults lose',
    answerTo: { tab: 'explore', sub: 'who' },
  },
};

// What part 2 showed, three items, each to its home, no figure.
// Question and answer chips (q, a); `text` is the answer, for the chip's
// one-line form.
export const RECAP = [
  { icon: 'gdp', q: 'How far does GDP move?', a: 'Above the OBR-central path in every scenario', to: 'story-headline' },
  { icon: 'outputSplit', q: 'Who gets the extra output?', a: 'Capital income rises more than GDP', to: 'story-output' },
  { icon: 'age', q: 'Who gains and who loses?', a: 'Gains peak near retirement; on other measures some lose', to: { tab: 'explore', sub: 'who' } },
].map((it) => ({ ...it, text: it.a }));

export default function Part2({ part }) {
  const { st } = useNav();
  const sid = st.s;
  // the scenario pinned on the GDP canvas, for comparison (one for every
  // copy of the canvas, so phones' per-step copies agree)
  const [pin, setPin] = useState(null);
  const closure = st.closure;
  const cl = primaryClosure(closure);
  const tzLess = (gap(sid, 'tz', cl, 'Y') ?? 0) < (gap(sid, 'tfp', cl, 'Y') ?? 0);
  // what the main arm does after HEADLINE_YEAR at each closure drawn
  const afterMain = closuresFor(closure)
    .map((c) => [c, afterWords(series(sid, 'tfp', c, 'Y'))])
    .filter(([, w]) => w);
  const afterText = afterMain.length
    ? ` and ${afterMain.map(([c, w]) => (afterMain.length > 1 ? `${w} at ${c === BOUND ? 'closed capital' : 'the central closure'}` : w)).join(' and ')} after ${HEADLINE_YEAR}`
    : '';
  const gdpLabel = (i) =>
    [
      `Line chart, shape only: GDP against the OBR-central path, ${SCEN_NAME[sid]}. The main arm, automation + productivity, rises from ${SURPRISE_YEAR}${afterText}.`,
      i >= 1 ? `Technology unchanged is ${tzLess ? 'lower than the main arm' : 'at least as high as the main arm'}.` : '',
      i >= 2 ? `The stress test is back on the path by ${HEADLINE_YEAR}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  const debtMain = debtWords(sid, 'tfp', cl);
  const debtLabel = (i) =>
    `Below it, public debt as a share of GDP against the OBR-central path to ${LATE_YEAR}, ${SCEN_NAME[sid]}.${
      debtMain ? ` In the main arm it ${debtMain}.` : ''
    }${i >= 1 && othersEndHigher(sid, cl) ? ' The other two arms end further above the path.' : ''}`;
  const marks = partMarks(sid);
  return (
    <MarkProvider marks={marks}>
      <PartHead part={part}>
        <Tx icon="model" size={18}>
          <A href={SRC.ogUk}>OG-UK</A> (on <A href={SRC.ogCore}>OG-Core</A>, no unemployment): an AI shock in {SURPRISE_YEAR}, as gaps against the OBR-central path. Part 3 uses a different model.
        </Tx>
      </PartHead>

      <Scrolly
        id="p2-shock"
        scene
        sub={SUBS.shock}
        label="The shock, illustrated"
        steps={shockSteps()}
        graphic={(i, reduce, ctx) => <ShockTiles state={i + 1} entered={ctx?.entered ?? true} />}
      />

      <Scrolly
        id="p2-morph"
        scene
        sub={SUBS.morph}
        label="From GDP growth to the gap against the OBR-central path, then the four scenarios"
        steps={morphCardSteps(sid, cl)}
        graphic={(i) => <MorphChart state={MORPH_STATES[i] ?? 4} sid={sid} cl={cl} pin={pin} onPin={setPin} />}
      />

      <Reveal as="section" id="story-headline" className="summary story-headline" aria-labelledby="story-headline-h">
        <h3 id="story-headline-h" className="p2-headline-title">
          <Tx icon="headline" size={22}>
            The headline figures: {SCEN_NAME[sid]}, {HEADLINE_YEAR}
          </Tx>
        </h3>
        <p className="p2-headline-lead">
          <Tx icon="path" size={16}>
            The main arm, automation + productivity, against the OBR-central path. Change the scenario or closure at the top.
          </Tx>
        </p>
        <HeadlineTiles sid={sid} />
        <SummaryWhy sid={sid} />
      </Reveal>

      <OutputSplit sid={sid} closure={closure} />

      <Scrolly
        id="p2-arms"
        scene
        sub={SUBS.arms}
        label={`GDP and public debt in three arms, ${SCEN_NAME[sid]}`}
        steps={armsCardSteps(sid, closure)}
        graphic={(i) => {
          const s = ARMS_STATES[i] ?? 4;
          return <ArmsPair state={s} sid={sid} closure={closure} label={s < 3 ? gdpLabel(s) : `${gdpLabel(2)} ${debtLabel(s - 3)}`} />;
        }}
      />

      <Scrolly
        id="p2-who"
        scene
        sub={SUBS.who}
        label="Welfare change by birth year"
        steps={whoCardSteps(sid)}
        graphic={(i) => <WelfareShape state={i} />}
      />

      {/* part 2's recap plays as the transition in part 3's first pinned screen */}

      <NextBand />
    </MarkProvider>
  );
}
