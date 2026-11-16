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
import { Items } from '@/components/story/Items.jsx';
import { A, ResultLinks, resultUrl, COHORT_URL, OG_DEFAULTS, SRC } from './part2/sources.jsx';

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

function shockSteps() {
  return [
    {
      id: 'p2-shock-1',
      icon: 'shock',
      title: 'AI moves part of income from labour to capital',
      body: (
        <>
          <Items
            items={[
              { icon: 'model', text: <><A href={SRC.ogUk}>OG-UK</A> models the whole economy: households, firms, government</> },
              { icon: 'measure', text: 'Each tile is one per cent of output' },
              { icon: 'labour', text: 'Left: paid for work. Right: paid to capital’s owners' },
              {
                icon: 'capital',
                text: (
                  <>
                    The scenarios assume AI lets capital do some workers&rsquo; tasks, so capital&rsquo;s share rises (<A href={SRC.imfSip}>IMF, SIP/2026/072</A>;{' '}
                    <A href={SRC.korinekT3}>Korinek et al., 2026</A>)
                  </>
                ),
              },
            ]}
          />
          <More tab="method" sub="how" anchor="m-scenarios">How large the shift is in each scenario</More>
        </>
      ),
    },
    {
      id: 'p2-shock-2',
      icon: 'productivity',
      title: 'And the same inputs produce more',
      body: (
        <>
          <Items
            items={[
              {
                icon: 'productivity',
                text: (
                  <>
                    They also assume AI raises output at given inputs, the new tiles (<A href={SRC.bp9}>OBR, Briefing paper No.9</A>; <A href={SRC.imfSip}>IMF, SIP/2026/072</A>)
                  </>
                ),
              },
              { icon: 'pay', text: 'Pay against the no-shock path depends on each move’s size' },
              { icon: 'capital', text: 'And on how much new capital arrives' },
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
      icon: 'range',
      title: 'The UK scenarios and their range',
      body: (
        <>
        <span id="p2-scenarios" className="p2-anchor" aria-hidden="true" />
        <Items
          items={[
            { icon: 'scenario', text: 'They differ in how far the labour share falls and output rises' },
            {
              icon: 'source',
              text: (
                <>
                  <NavLink tab="method" sub="how" anchor="scen-uk_low">UK low</NavLink>: the <A href={SRC.bp9}>OBR&rsquo;s low AI case</A> and the <A href={SRC.imfSip}>IMF&rsquo;s task mapping</A>.{' '}
                  <NavLink tab="method" sub="how" anchor="scen-uk_central">UK central</NavLink>: the <A href={SRC.imfSip}>IMF&rsquo;s UK baseline</A>.{' '}
                  <NavLink tab="method" sub="how" anchor="scen-uk_high">UK high</NavLink>: the <A href={SRC.frs26}>OBR&rsquo;s upper AI case</A> (Fiscal risks and sustainability, July 2026)
                </>
              ),
            },
            { icon: 'arithmetic', text: 'Each size at the end of the ramp is calculated here from those sources, not published by the OBR or IMF' },
            dir
              ? { icon: dir, text: `Main arm: GDP ${dir === 'gapUp' ? 'above' : 'below'} the OBR-central path from ${SURPRISE_YEAR}` }
              : { icon: 'path', text: `Main arm: GDP against the OBR-central path from ${SURPRISE_YEAR}` },
            { icon: 'timing', text: `Then it ${after} once the scenario’s ramp completes in ${HEADLINE_YEAR}` },
            { icon: 'range', text: 'UK low, central, high: one shape, each higher; the band spans them' },
          ]}
        />
        <ResultLinks files={[[`${SCEN_NAME[sid]} result file`, resultUrl(sid, 'tfp', cl)]]} method="m-scenarios" methodText="What each scenario assumes" />
        </>
      ),
    },
    {
      id: 'p2-scen-4',
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
                    <A href={SRC.korinekT3}>Korinek et al. (2026), the &lsquo;substantial&rsquo; scenario for the US, Table 3</A>: not a UK calibration
                  </>
                ),
              },
              { icon: 'path', text: `${SCEN_NAME[sid]}, chosen at the top, is the coloured line` },
            ]}
          />
          <More tab="method" sub="how" anchor="m-scenarios">What each scenario assumes, and its sources</More>
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
  const closureItem =
    closure === 'both'
      ? null
      : {
          icon: 'closure',
          text: (
            <>
              The central closure is <A href={OG_DEFAULTS}>OG-UK&rsquo;s inherited default openness</A>, not a UK calibration.{' '}
              <NavLink patch={{ closure: 'both' }}>Show both closures</NavLink>: how much depends on foreign capital
            </>
          ),
        };
  return [
    {
      id: 'p2-arms-0',
      icon: 'ai',
      title: 'Automation + productivity: the main arm',
      body: (
        <>
        <Items
          items={[
            { icon: 'capital', text: 'Assumed: capital’s share of income rises' },
            { icon: 'productivity', text: 'Assumed: output at given inputs rises too (sources as above)' },
            { icon: 'link', text: 'This arm gives the headline figures above' },
            closureItem,
          ]}
        />
        <ResultLinks files={[['result file', resultUrl(sid, 'tfp', cl)]]} method="m-arms" methodText="The three arms" />
        </>
      ),
    },
    {
      id: 'p2-arms-1',
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
          <ResultLinks files={[['result file', resultUrl(sid, 'tz', cl)]]} method="arm-tz" methodText="This arm on Method" />
        </>
      ),
    },
    {
      id: 'p2-arms-2',
      icon: 'breakEven',
      title: 'The stress test: GDP held on the path',
      body: (
        <>
          <Items
            items={[
              { icon: 'capital', text: 'The same shift in income to capital' },
              { icon: 'productivity', text: `Output at given inputs cut: GDP back on the path in ${HEADLINE_YEAR}` },
              {
                icon: 'compare',
                text: (
                  <>
                    Like the <A href={SRC.efoBox22}>OBR&rsquo;s technological displacement scenario (March 2026 outlook)</A>, it leaves GDP unchanged
                  </>
                ),
              },
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
          <ResultLinks files={[['result file', resultUrl(sid, 'ss', cl)]]} method="arm-ss" methodText="How the stress test is set" />
          <More tab="method" sub="how" anchor="m-closures">How the closures work</More>
          <More tab="explore" sub="economy" anchor="economy-wall">Each arm year by year</More>
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
          <ResultLinks files={[['cohort welfare script', COHORT_URL]]} method="m-generations" methodText="How welfare is measured" />
          {scope}
        </>
      ),
    },
    {
      id: 'p2-who-1',
      icon: 'entrants',
      title: 'Then the cohorts that enter later',
      body: (
        <>
          <Items
            items={[
              { icon: 'entrants', text: `Entering after ${SURPRISE_YEAR}, they live whole lives on the new path` },
              allGain ? { icon: 'gapUp', text: 'As modelled, under debt-neutral transfers (a model fiscal rule), they gain too' } : null,
              allGain ? { icon: 'capital', text: 'A higher return on saving and, later, higher consumption' } : null,
              allGain ? { icon: 'pay', text: 'These outweigh pay rates below the path' } : null,
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
          <ResultLinks files={[['result file', resultUrl(sid, 'tfp', cl)]]} method="m-rules" methodText="Fiscal rules and public finances" />
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
                      The OBR-central path is OG-UK&rsquo;s own, on the OBR&rsquo;s central productivity growth (<A href={SRC.efoMar26}>March 2026 outlook</A>)
                    </>
                  ),
                },
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
      icon: 'finances',
      title: 'Without the output gain',
      body: (
        <>
          <Items
            items={[
              higher
                ? { icon: 'gapUp', text: `No productivity gain: debt ends further above the path by ${LATE_YEAR}` }
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
              ['technology unchanged', resultUrl(sid, 'tz', cl)],
              ['stress test', resultUrl(sid, 'ss', cl)],
            ]}
            method="m-arms"
          />
          <More tab="explore" sub="finances">Debt, tax and the fiscal rules</More>
        </>
      ),
    },
  ];
}

// Which model this part uses, in one line: the full comparison of the two
// models closes the story.
function LensLine() {
  return (
    <p className="p2-lens-line">
      <Tx icon="model">
        This part uses <A href={SRC.ogUk}>OG-UK</A>, a whole-economy model built on <A href={SRC.ogCore}>OG-Core</A>, with no unemployment. Part 3 uses a different model, not added to it.
      </Tx>
    </p>
  );
}

// The band that ends part 2: part 3 next, and links to the figures' homes
// (the tab row's sub-tabs).
const DEEPER = [
  { tab: 'explore', sub: 'economy', label: 'Economy', icon: 'gdp' },
  { tab: 'explore', sub: 'finances', label: 'Public finances', icon: 'finances' },
  { tab: 'explore', sub: 'who', label: 'Who gains and who loses', icon: 'age' },
  { tab: 'explore', sub: 'economy', anchor: 'ex-across', label: 'Across scenarios', icon: 'range' },
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
// answers, and one takeaway with no new figure.
export const SUBS = {
  shock: {
    title: 'The shock',
    icon: 'shock',
    question: 'What does the AI shock change in the model?',
    takeaway: 'The scenarios move income from labour to capital and let the same inputs produce more.',
  },
  morph: {
    title: 'From the record to the scenarios',
    icon: 'path',
    question: 'How far does GDP move from the OBR-central path in each scenario?',
    takeaway: 'In every scenario GDP rises above the OBR-central path; the larger the assumed shock, the higher the line.',
  },
  arms: {
    title: 'Three arms: output and public debt',
    icon: 'ai',
    question: 'What does the productivity gain add, for output and for public debt?',
    takeaway: 'Without the productivity gain, GDP is lower and public debt ends further above the path.',
  },
  who: {
    title: 'Who gains and who loses',
    icon: 'age',
    question: 'Which generations gain, and which lose?',
    takeaway: 'As modelled, gains are largest for adults near retirement, and later cohorts gain too; on other measures some adults lose.',
  },
};

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
          OG-UK: an AI shock arriving in {SURPRISE_YEAR}, as gaps against the OBR-central path, OG-UK&rsquo;s own no-shock path on the OBR&rsquo;s central productivity growth. That growth already
          includes the OBR&rsquo;s central assumption for AI (<A href={SRC.bp9}>Briefing paper No.9, Annex B</A>).
        </Tx>
      </PartHead>

      <LensLine />

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
            The main arm, automation + productivity, against the OBR-central path. Change the scenario or closure at the top of the page.
          </Tx>
        </p>
        <HeadlineTiles sid={sid} />
        <SummaryWhy sid={sid} />
        <ResultLinks
          files={[
            ['result file', resultUrl(sid, 'tfp', cl)],
            ...(closure === 'both' ? [['closed-capital result file', resultUrl(sid, 'tfp', BOUND)]] : []),
          ]}
          method="m-measures"
          methodText="The three income measures"
        />
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

      <NextBand />
    </>
  );
}
