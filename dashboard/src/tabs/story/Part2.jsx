'use client';

import { useState } from 'react';
import Scrolly from '@/components/story/Scrolly.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import { HeadlineTiles, SummaryWhy } from '@/tabs/ai/Landing.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, BOUND, gap, result } from '@/tabs/ai/surprise.js';
import { primaryClosure, closuresFor } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { ArmsPair, WelfareShape, welfareCell, entryDip, series, afterWords, afterWordsAll } from './part2/charts.jsx';
import { More, Tx } from './part2/frame.jsx';
import { MorphChart, morphSteps } from './part2/Morph.jsx';
import OutputSplit from './part2/OutputSplit.jsx';
import { EPS2 } from './part2/dir.js';
import { Items, Recap } from '@/components/story/Items.jsx';
import { A, Cite, ResultLinks, resultUrl, OG_DEFAULTS, SRC } from './part2/sources.jsx';

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
const EPS = EPS2;

// Direction of debt/GDP against the path for one solve, in words.
export function debtWords(sid, arm, cl) {
  const r = result(sid, arm, cl);
  if (r.status !== 'done') return null;
  const ys = r.gaps.debt_gdp_pp;
  const early = Math.min(...ys.slice(YEARS.indexOf(SURPRISE_YEAR), YEARS.indexOf(HEADLINE_YEAR) + 1));
  const late = ys[YEARS.indexOf(LATE_YEAR)];
  if (early < -EPS) {
    if (late > EPS) return `first falls below the OBR-central path, then rises above it by ${LATE_YEAR}`;
    return late < -EPS ? `falls below the OBR-central path and is still below it in ${LATE_YEAR}` : `falls below the OBR-central path and is back on it by ${LATE_YEAR}`;
  }
  return late > EPS ? `rises above the OBR-central path after ${SURPRISE_YEAR}` : 'stays close to the OBR-central path';
}

// True when both arms without the productivity gain end with debt/GDP
// further above the path than the main arm.
export function othersEndHigher(sid, cl) {
  const main = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  if (main == null) return false;
  return ['tz', 'ss'].every((a) => {
    const x = gap(sid, a, cl, 'debt_gdp_pp', LATE_YEAR);
    return x != null && x > main;
  });
}

// A topic's key takeaway, as the last item of its last card: no new figure.
export const takeaway = (text) => ({
  icon: 'takeaway',
  key: 'takeaway',
  text: (
    <>
      <strong>Key takeaway:</strong> {text}
    </>
  ),
});

function shockSteps() {
  return [
    {
      id: 'p2-shock-1',
      highlight: [],
      icon: 'shock',
      title: 'AI moves part of income from labour to capital',
      body: (
        <>
          <Items
            items={[
              { icon: 'model', text: <><A href={SRC.ogUk}>OG-UK</A> models the whole economy: households, firms, government</> },
              { icon: 'measure', text: 'Each tile is one per cent of output' },
              { icon: 'labour', text: 'Left: paid for work. Right: paid to capital’s owners' },
              { icon: 'capital', text: 'Assumed: AI does some workers’ tasks, so capital’s share rises' },
            ]}
          />
          <More tab="method" sub="how" anchor="m-scenarios">How large the shift is in each scenario</More>
        </>
      ),
    },
    {
      id: 'p2-shock-2',
      highlight: [],
      icon: 'productivity',
      title: 'And the same inputs produce more',
      body: (
        <>
          <Items
            items={[
              { icon: 'productivity', text: 'Assumed: AI raises output at given inputs, the new tiles' },
              { icon: 'pay', text: 'Pay against the no-shock path depends on each move’s size' },
              {
                icon: 'timing',
                text: (
                  <>
                    The shock arrives unannounced in {SURPRISE_YEAR}:{' '}
                    <NavLink tab="method" sub="how" anchor="m-timing">
                      a modelling choice
                    </NavLink>
                  </>
                ),
              },
              takeaway('income shifts to capital; output per input rises'),
            ]}
          />
          <Cite
            items={[
              ['OBR, Briefing paper No.9', SRC.bp9],
              ['IMF, SIP/2026/072', SRC.imfSip],
              ['Korinek et al. (2026)', SRC.korinekT3],
            ]}
          />
          <More tab="explore" sub="economy" anchor="explore-part-economy">The labour share, capital and the rest of the economy</More>
        </>
      ),
    },
  ];
}

// GDP after the surprise in every scenario's main arm: above the path in
// every year from SURPRISE_YEAR when all of them are (the direction the
// scenarios step states), otherwise null.
export function scenarioDir(cl) {
  const from = YEARS.indexOf(SURPRISE_YEAR);
  const all = SCENARIOS.map((s) => series(s.id, 'tfp', cl, 'Y')).filter(Boolean);
  if (!all.length) return null;
  const tail = all.flatMap((ys) => ys.slice(from + 1));
  if (tail.every((v) => v > EPS2)) return 'gapUp';
  if (tail.every((v) => v < -EPS2)) return 'gapDown';
  return null;
}

function scenarioSteps(sid, cl) {
  const after = afterWordsAll(SCENARIOS.map((s) => series(s.id, 'tfp', cl, 'Y')).filter(Boolean)) ?? 'changes more slowly';
  const dir = scenarioDir(cl);
  return [
    {
      id: 'p2-scen-2',
      highlight: ['scen-uk_low', 'scen-uk_central', 'scen-uk_high'],
      icon: 'range',
      title: 'The UK scenarios and their range',
      body: (
        <>
        <span id="p2-scenarios" className="p2-anchor" aria-hidden="true" />
        <Items
          items={[
            { icon: 'scenario', text: 'They differ in how far the labour share falls and output rises' },

            dir
              ? { icon: dir, text: `Main arm: GDP ${dir === 'gapUp' ? 'above' : 'below'} the OBR-central path from ${SURPRISE_YEAR}` }
              : { icon: 'path', text: `Main arm: GDP against the OBR-central path from ${SURPRISE_YEAR}` },
            { icon: 'timing', text: `Then it ${after} once the scenario’s ramp completes in ${HEADLINE_YEAR}` },
          ]}
        />
        </>
      ),
    },
    {
      id: 'p2-scen-4',
      highlight: ['scen-korinek'],
      icon: 'scenario',
      title: 'Korinek et al.: a US scenario, used here as an upper case',
      body: (
        <>
          <Items
            items={[
              {
                icon: 'scenario',
                text: (
                  <>
                    <A href={SRC.korinekT3}>Korinek et al. (2026), Table 3</A>
                  </>
                ),
              },
              dir === 'gapUp' ? takeaway('GDP ends above the path in every scenario') : null,
            ]}
          />
        <p className="p2-result-links" data-cite="">
          <Tx icon="source" size={12}>
            UK inputs from <A href={SRC.bp9}>OBR BP9</A>, <A href={SRC.frs26}>OBR FRS</A> and <A href={SRC.imfSip}>IMF</A> figures,{' '}
            <NavLink tab="method" sub="how" anchor="m-scenarios">
              derived by this study&rsquo;s rule
            </NavLink>
            , not published by them.
          </Tx>
        </p>
        <ResultLinks files={SCENARIOS.map((x) => [x.label, resultUrl(x.id, 'tfp', cl)])} method="m-scenarios" methodText="What each scenario assumes" />
          <More tab="explore" sub="economy" anchor="economy-wall">GDP and national income year by year</More>
        </>
      ),
    },
  ];
}

// The technology-unchanged arm's GDP against the main arm's, in the
// headline year: the item the arms step prints, icon and words from the
// same comparison. null when either is pending.
export function tzItem(sid, cl) {
  const tz = gap(sid, 'tz', cl, 'Y');
  const tfp = gap(sid, 'tfp', cl, 'Y');
  if (tz == null || tfp == null) return null;
  return tz < tfp ? { icon: 'gapDown', text: 'GDP is lower than in the main arm' } : { icon: 'gapUp', text: 'GDP is at least as high as in the main arm' };
}

function armSteps(sid, closure) {
  const cl = primaryClosure(closure);
  // the chart's unit line names the closure (and which is dashed with Both)
  const closureItems = [
    {
      icon: 'closure',
      text: (
        <>
          Central closure: <A href={OG_DEFAULTS}>OG-UK&rsquo;s inherited default</A>, not UK-calibrated
          {closure === 'both' ? null : (
            <>
              ; <NavLink patch={{ closure: 'both' }}>show both</NavLink>
            </>
          )}
        </>
      ),
    },
  ];
  return [
    {
      id: 'p2-arms-0',
      highlight: ['gdp-tfp'],
      icon: 'ai',
      title: 'Automation + productivity: the main arm',
      body: (
        <>
        <Items
          items={[
            { icon: 'capital', text: 'Assumed: capital’s share of income rises' },
            { icon: 'productivity', text: 'Assumed: output at given inputs rises too (sources as above)' },
            { icon: 'link', text: 'This arm gives the headline figures above' },
            ...closureItems,
          ]}
        />
        </>
      ),
    },
    {
      id: 'p2-arms-1',
      highlight: ['gdp-tz'],
      icon: 'capital',
      title: 'Automation with technology unchanged',
      body: (
        <>
          <Items
            items={[
              { icon: 'capital', text: 'Assumed: capital’s share of income rises' },
              { icon: 'productivity', text: 'Assumed: output at given inputs stays as it was' },
              tzItem(sid, cl),
            ]}
          />
          <ResultLinks
            files={[
              ['main', resultUrl(sid, 'tfp', cl)],
              ['unchanged', resultUrl(sid, 'tz', cl)],
              ['stress test', resultUrl(sid, 'ss', cl)],
            ]}
            method="m-arms"
          />
        </>
      ),
    },
    {
      id: 'p2-arms-2',
      highlight: ['gdp-ss'],
      icon: 'breakEven',
      title: 'The stress test: GDP held on the path',
      body: (
        <>
          <Items
            items={[
              { icon: 'capital', text: 'The same shift in income to capital' },
              { icon: 'productivity', text: `Output at given inputs cut: GDP back on the path in ${HEADLINE_YEAR}` },
              { icon: 'limit', text: 'A bound in which AI adds no output, not a forecast' },
            ]}
          />
          <details className="p2-details">
            <summary>
              <Tx icon="compare">Against the OBR&rsquo;s own scenario</Tx>
            </summary>
            <Items
              items={[
                { icon: 'compare', text: <>It matches the <A href={SRC.efoBox22}>OBR&rsquo;s scenario</A> on GDP only</> },
                { icon: 'labour', text: 'The OBR adjusts through jobs, OG-UK through the wage' },
              ]}
            />
          </details>
          <More tab="method" sub="how" anchor="m-closures">How the closures work</More>
        </>
      ),
    },
  ];
}

function whoSteps(sid) {
  const c = welfareCell();
  const someLose = c.alive_losing_pct > 0 || c.no_bequest_losing_pct > 0 || (c.charged?.joint_losing_pct?.[1] ?? 0) > 0;
  const allGain = c.cev_all.every((v) => v > 0);
  const scope =
    sid === 'uk_central' ? null : (
      <details className="p2-details">
        <summary>
          <Tx icon="scenario">Always UK central here</Tx>
        </summary>
        <Items
          items={[
            { icon: 'scenario', text: 'Who gains and who loses shows UK central only' },
            { icon: 'source', text: <>The <A href={SRC.repo}>study</A> also reports Korinek et al. (upper), debt-neutral transfers only</> },
            { icon: 'data', text: 'Its cohort paths are not yet in this site’s data' },
            { icon: 'rule', text: 'Always central closure, debt-neutral transfers, whatever is chosen above' },
          ]}
        />
      </details>
    );
  const dip = entryDip();
  return [
    {
      id: 'p2-who-0',
      highlight: ['cohort-adults'],
      icon: 'age',
      title: 'Gains are largest around retirement age; some lose',
      body: (
        <>
          <Items
            items={[
              { icon: 'scenario', text: `UK central, as modelled: adults alive in ${SURPRISE_YEAR}, by birth year` },
              { icon: 'capital', text: 'Near retirement, more wealth earns the higher return' },
              { icon: 'households', text: 'Smaller for the oldest and youngest, who have least wealth' },
              someLose
                ? {
                    icon: 'limit',
                    text: (
                      <>
                        On{' '}
                        <NavLink tab="explore" sub="who">
                          other welfare measures
                        </NavLink>
                        , some adults alive in {SURPRISE_YEAR} lose
                      </>
                    ),
                  }
                : null,
            ]}
          />
          {scope}
        </>
      ),
    },
    {
      id: 'p2-who-1',
      highlight: ['cohort-later'],
      icon: 'entrants',
      title: 'Then the cohorts that enter later',
      body: (
        <>
          <Items
            items={[
              { icon: 'entrants', text: `Entering after ${SURPRISE_YEAR}, they live whole lives on the new path` },
              allGain ? { icon: 'gapUp', text: 'As modelled, under debt-neutral transfers, they gain too' } : null,
              allGain ? { icon: 'capital', text: 'A higher return on saving and, later, higher consumption' } : null,
              allGain ? { icon: 'pay', text: 'These outweigh pay rates below the path' } : null,
              allGain && someLose ? takeaway('gains peak near retirement; some adults lose') : null,
            ]}
          />
          {dip ? (
            <details className="p2-details">
              <summary>
                <Tx icon="benefits">The dip after the entry line</Tx>
              </summary>
              <Items
                items={[
                  { icon: 'benefits', text: 'Under debt-neutral transfers, transfers fall until the debt rule starts' },
                  { icon: 'rule', text: 'Not under the common fiscal rule' },
                ]}
              />
            </details>
          ) : null}
          <More tab="explore" sub="who">Who gains and who loses, by age and earnings group</More>
        </>
      ),
    },
  ];
}

// Debt/GDP against the path for one solve, as items: the early move, then
// where it ends by LATE_YEAR, each icon from the same sign test as
// debtWords (so the icon and the words always agree). null when pending.
export function debtItems(sid, arm, cl) {
  const r = result(sid, arm, cl);
  if (r.status !== 'done') return null;
  const ys = r.gaps.debt_gdp_pp;
  const early = Math.min(...ys.slice(YEARS.indexOf(SURPRISE_YEAR), YEARS.indexOf(HEADLINE_YEAR) + 1));
  const late = ys[YEARS.indexOf(LATE_YEAR)];
  if (early < -EPS) {
    const end =
      late > EPS
        ? { icon: 'gapUp', text: `Then rises above it by ${LATE_YEAR}` }
        : late < -EPS
          ? { icon: 'gapDown', text: `Still below it in ${LATE_YEAR}` }
          : { icon: 'onPath', text: `Back on it by ${LATE_YEAR}` };
    return [{ icon: 'gapDown', text: 'Debt as a share of GDP first falls below the OBR-central path' }, end];
  }
  return [
    late > EPS
      ? { icon: 'gapUp', text: `Debt as a share of GDP rises above the OBR-central path after ${SURPRISE_YEAR}` }
      : { icon: 'onPath', text: 'Debt as a share of GDP stays close to the OBR-central path' },
  ];
}

function debtSteps(sid, closure) {
  const cl = primaryClosure(closure);
  const items = debtItems(sid, 'tfp', cl);
  const rises = (gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR) ?? 0) > EPS;
  const higher = othersEndHigher(sid, cl);
  return [
    {
      id: 'p2-debt-0',
      highlight: ['debt-tfp'],
      icon: 'debt',
      title: 'Public debt against the path',
      body: items ? (
        <>
          <span id="p2-debt" className="p2-anchor" aria-hidden="true" />
          <Items
            items={[
              {
                icon: 'scenario',
                text: (
                  <>
                    {SCEN_NAME[sid]}, main arm,{' '}
                    <NavLink tab="method" sub="how" anchor="m-rules">
                      common fiscal rule
                    </NavLink>{' '}
                    (a model setting)
                  </>
                ),
              },
              ...items,
              ...(rises
                ? [
                    {
                      icon: 'limit',
                      text: (
                        <>
                          OG-UK{' '}
                          <NavLink tab="method" sub="how" anchor="m-debt">
                            reprices all government debt at once
                          </NavLink>
                          , overstating the later rise
                        </>
                      ),
                    },
                  ]
                : []),
            ]}
          />

          <details className="p2-details">
            <summary>
              <Tx icon="forecast">The path after the OBR&rsquo;s forecast</Tx>
            </summary>
            <Items
              items={[
                {
                  icon: 'forecast',
                  text: (
                    <>
                      The OBR-central path is OG-UK&rsquo;s own, on <A href={SRC.efoMar26}>OBR productivity growth</A>
                    </>
                  ),
                },
                { icon: 'ai', text: <>Its productivity growth includes <A href={SRC.bp9}>the OBR&rsquo;s central AI assumption</A></> },
                { icon: 'limit', text: 'Beyond the OBR’s forecast horizon it is the model’s, not the OBR’s' },
              ]}
            />
          </details>
        </>
      ) : (
        <>
          <span id="p2-debt" className="p2-anchor" aria-hidden="true" />
          <p>
            <Tx icon="provisional">This solve is not done yet at the closure chosen above.</Tx>
          </p>
        </>
      ),
    },
    {
      id: 'p2-debt-1',
      highlight: ['debt-tz', 'debt-ss'],
      icon: 'finances',
      title: 'Without the output gain',
      body: (
        <>
          <Items
            items={[
              higher
                ? takeaway('without the productivity gain, debt ends further above the path')
                : { icon: 'compare', text: 'The two arms with no productivity gain are drawn beside it' },
              { icon: 'finances', text: 'Public finances also covers tax and the fiscal rules' },
              {
                icon: 'tax',
                text: (
                  <>
                    And{' '}
                    <NavLink tab="method" sub="how" anchor="m-tax">
                      why the tax effect is likely understated
                    </NavLink>
                  </>
                ),
              },
            ]}
          />
          <ResultLinks
            files={[
              ['main arm', resultUrl(sid, 'tfp', cl)],
              ['technology unchanged', resultUrl(sid, 'tz', cl)],
              ['stress test', resultUrl(sid, 'ss', cl)],
            ]}
            method="m-rules"
            methodText="Fiscal rules"
          />
          <More tab="explore" sub="finances">Debt, tax and the fiscal rules</More>
        </>
      ),
    },
  ];
}

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
  { icon: 'outputSplit', q: 'Who receives the extra output?', a: 'Capital income gains more than GDP; labour income falls', to: 'story-output' },
  { icon: 'age', q: 'Who gains and who loses?', a: 'Gains peak near retirement; some adults lose', to: { tab: 'explore', sub: 'who' } },
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
  return (
    <>
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
        steps={[...morphSteps(sid, cl), ...scenarioSteps(sid, cl)]}
        graphic={(i) => <MorphChart state={i + 1} sid={sid} cl={cl} pin={pin} onPin={setPin} />}
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
        steps={[...armSteps(sid, closure), ...debtSteps(sid, closure)]}
        graphic={(i) => <ArmsPair state={i} sid={sid} closure={closure} label={i < 3 ? gdpLabel(i) : `${gdpLabel(2)} ${debtLabel(i - 3)}`} />}
      />

      <Scrolly
        id="p2-who"
        scene
        sub={SUBS.who}
        label="Welfare change by birth year"
        steps={whoSteps(sid)}
        graphic={(i) => <WelfareShape state={i} />}
      />

      <Recap items={RECAP} />

      <NextBand />
    </>
  );
}
