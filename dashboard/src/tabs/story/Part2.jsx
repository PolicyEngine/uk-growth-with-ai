'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import Callout from '@/components/story/Callout.jsx';
import NextPart from '@/components/story/NextPart.jsx';
import { HeadlineTiles, SummaryWhy } from '@/tabs/ai/Landing.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, BOUND, gap, result } from '@/tabs/ai/surprise.js';
import { primaryClosure, closuresFor } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { ScenarioPaths, ArmPaths, WelfareShape, welfareCell, entryDip, series, afterWords, afterWordsAll } from './part2/charts.jsx';
import { More } from './part2/frame.jsx';
import { MorphChart, morphSteps } from './part2/Morph.jsx';
import OutputSplit from './part2/OutputSplit.jsx';
import { EPS2 } from './part2/dir.js';
import { Items, Compare } from '@/components/story/Items.jsx';

// Part 2: what OG-UK projects when AI arrives as an unanticipated shock in
// 2028, against the no-shock OBR-central path. It is the one home of the
// three headline figures (HeadlineTiles and SummaryWhy, in #story-headline,
// which Results links to) and of where 2031 output goes (#story-output: the
// Sankey's shares and the waterfall's changes). Every other figure has its
// home on another tab: here the charts draw shapes only, the sentences give
// directions only, and each step links to the figure's home. The header's
// scenario and closure apply throughout, except Who gains, which is solved
// for UK central only. Order: two lenses, the shock, record to model (the
// morph), four scenarios, the headline figures, where output goes, three
// arms, who gains, public finances, then the band to part 3 with links
// to the figures' homes.

const EPS = 0.05;

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
      kicker: 'The shock',
      title: 'AI moves part of income from labour to capital',
      body: (
        <>
          <Items
            items={[
              { icon: 'model', text: 'OG-UK models the whole economy: households, firms, government' },
              { icon: 'measure', text: 'Each tile is one per cent of output' },
              { icon: 'labour', text: 'Left: paid for work. Right: paid to capital’s owners' },
              { icon: 'capital', text: 'AI lets capital do workers’ tasks, so capital’s share rises' },
            ]}
          />
          <More tab="method" sub="scenarios">How large the shift is in each scenario</More>
        </>
      ),
    },
    {
      id: 'p2-shock-2',
      icon: 'productivity',
      kicker: 'The shock',
      title: 'And the same inputs produce more',
      body: (
        <>
          <Items
            items={[
              { icon: 'productivity', text: 'AI also raises output at given inputs: the new tiles' },
              { icon: 'pay', text: 'Pay against the no-shock path depends on each move’s size' },
              { icon: 'capital', text: 'And on how much new capital arrives' },
              { icon: 'timing', text: `The shock comes as a surprise in ${SURPRISE_YEAR}` },
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
      kicker: 'Four scenarios',
      title: 'The UK scenarios and their range',
      body: (
        <Items
          items={[
            { icon: 'scenario', text: 'They differ in how far the labour share falls and output rises' },
            dir
              ? { icon: dir, text: `Main arm: GDP ${dir === 'gapUp' ? 'above' : 'below'} the OBR-central path from ${SURPRISE_YEAR}` }
              : { icon: 'path', text: `Main arm: GDP against the OBR-central path from ${SURPRISE_YEAR}` },
            { icon: 'timing', text: `Then it ${after} once the shock completes in ${HEADLINE_YEAR}` },
            { icon: 'range', text: 'UK low, central, high: one shape, each higher; the band spans them' },
          ]}
        />
      ),
    },
    {
      id: 'p2-scen-4',
      icon: 'scenario',
      kicker: 'Four scenarios',
      title: 'Korinek et al.: an upper case from the US',
      body: (
        <>
          <Items
            items={[
              { icon: 'scenario', text: 'A US scenario, a labelled upper case, not a UK calibration' },
              { icon: 'path', text: `${SCEN_NAME[sid]}, chosen at the top, is the coloured line` },
            ]}
          />
          <More tab="method" sub="scenarios">What each scenario assumes, and its sources</More>
          <More tab="explore" sub="economy" anchor="income">GDP and national income year by year</More>
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
  const kicker = `Three arms, ${SCEN_NAME[sid]}`;
  // the chart's unit line names the closure (and which is dashed with Both)
  const closureItem =
    closure === 'both'
      ? null
      : {
          icon: 'closure',
          text: (
            <>
              <NavLink patch={{ closure: 'both' }}>Show both closures</NavLink>: how much depends on foreign capital
            </>
          ),
        };
  return [
    {
      id: 'p2-arms-0',
      icon: 'ai',
      kicker,
      title: 'Automation + productivity: the main arm',
      body: (
        <Items
          items={[
            { icon: 'capital', text: 'Capital’s share of income rises' },
            { icon: 'productivity', text: 'Output at given inputs rises too' },
            { icon: 'link', text: 'This arm gives the headline figures above' },
            closureItem,
          ]}
        />
      ),
    },
    {
      id: 'p2-arms-1',
      icon: 'capital',
      kicker,
      title: 'Automation with technology unchanged',
      body: (
        <Items
          items={[
            { icon: 'capital', text: 'Capital’s share of income rises' },
            { icon: 'productivity', text: 'Output at given inputs stays as it was' },
            tzItem(sid, cl),
          ]}
        />
      ),
    },
    {
      id: 'p2-arms-2',
      icon: 'breakEven',
      kicker,
      title: 'The OBR-style stress test',
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
            <summary>Against the OBR&rsquo;s own scenario</summary>
            <Items
              items={[
                { icon: 'compare', text: 'It matches the OBR’s scenario on GDP only' },
                { icon: 'labour', text: 'The OBR adjusts through jobs, OG-UK through the wage' },
              ]}
            />
          </details>
          <More tab="method" sub="how" anchor="m-closures">How the closures work</More>
          <More tab="explore" sub="economy" anchor="income">Each arm year by year</More>
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
        <summary>Always UK central here</summary>
        <Items
          items={[
            { icon: 'scenario', text: 'Who gains shows UK central only' },
            { icon: 'source', text: 'The paper also reports Korinek et al. (upper), debt-neutral transfers only' },
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
      kicker: 'Who gains',
      title: 'Gains are largest around retirement age',
      body: (
        <>
          <Items
            items={[
              { icon: 'scenario', text: `UK central, as modelled: adults alive in ${SURPRISE_YEAR}, by birth year` },
              { icon: 'capital', text: 'Near retirement, more wealth earns the higher return' },
              { icon: 'households', text: 'Smaller for the oldest and youngest, who have least wealth' },
              someLose ? { icon: 'limit', text: 'Under some measures they lose' } : null,
            ]}
          />
          {scope}
        </>
      ),
    },
    {
      id: 'p2-who-1',
      icon: 'entrants',
      kicker: 'Who gains',
      title: 'Then the cohorts that enter later',
      body: (
        <>
          <Items
            items={[
              { icon: 'entrants', text: `Entering after ${SURPRISE_YEAR}, they live whole lives on the new path` },
              allGain ? { icon: 'gapUp', text: 'As modelled, under debt-neutral transfers, they gain too' } : null,
              allGain ? { icon: 'capital', text: 'A higher return on saving and, later, higher consumption' } : null,
              allGain ? { icon: 'pay', text: 'These outweigh pay rates below the path' } : null,
            ]}
          />
          {dip ? (
            <details className="p2-details">
              <summary>The dip after the entry line</summary>
              <Items
                items={[
                  { icon: 'benefits', text: 'Under debt-neutral transfers, transfers fall until the debt rule starts' },
                  { icon: 'rule', text: 'Not under the common fiscal rule' },
                ]}
              />
            </details>
          ) : null}
          <More tab="explore" sub="who">Who gains, by age and earnings group</More>
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
  const main = debtWords(sid, 'tfp', cl);
  const items = debtItems(sid, 'tfp', cl);
  const higher = othersEndHigher(sid, cl);
  return [
    {
      id: 'p2-debt-0',
      icon: 'debt',
      kicker: 'Public finances',
      title: 'Public debt against the path',
      body: items ? (
        <>
          <Items
            items={[
              { icon: 'scenario', text: `${SCEN_NAME[sid]}, main arm, common fiscal rule` },
              ...items,
              ...(main.includes('rises above')
                ? [
                    { icon: 'limit', text: 'OG-UK reprices all government debt at the higher interest rate at once' },
                    { icon: 'caveat', text: 'So it overstates the later rise' },
                  ]
                : []),
            ]}
          />
          <details className="p2-details">
            <summary>The path after the OBR&rsquo;s forecast</summary>
            <Items
              items={[
                { icon: 'forecast', text: 'The OBR-central path is OG-UK’s own, on the OBR’s central productivity growth' },
                { icon: 'limit', text: 'Beyond the OBR’s forecast horizon it is the model’s, not the OBR’s' },
              ]}
            />
          </details>
        </>
      ) : (
        <p>This solve is not done yet at the closure chosen above.</p>
      ),
    },
    {
      id: 'p2-debt-1',
      icon: 'finances',
      kicker: 'Public finances',
      title: 'Without the output gain',
      body: (
        <>
          <Items
            items={[
              higher
                ? { icon: 'gapUp', text: `No productivity gain: debt ends further above the path by ${LATE_YEAR}` }
                : { icon: 'compare', text: 'The two arms with no productivity gain are drawn beside it' },
              { icon: 'finances', text: 'Public finances also covers tax and the fiscal rules' },
              { icon: 'tax', text: 'And why the tax effect is likely understated' },
            ]}
          />
          <More tab="explore" sub="finances">Debt, tax and the fiscal rules</More>
        </>
      ),
    },
  ];
}

// Two lenses, before part 2: which model this part uses and how part 3's
// differs, side by side. The full comparison closes the story.
function TwoLenses() {
  return (
    <Callout icon="compare" title="Two models, two lenses">
      <Compare
        className="p2-lenses"
        columns={[
          {
            icon: 'model',
            title: 'This part: OG-UK',
            items: [
              { icon: 'gdp', text: 'A model of the whole economy' },
              { icon: 'excluded', text: 'It has no unemployment' },
              { icon: 'path', text: 'Gaps against the OBR-central path, not forecasts of levels' },
            ],
          },
          {
            icon: 'provisional',
            title: 'Part 3: a different model (provisional)',
            items: [
              { icon: 'households', text: 'A one-year microsimulation of UK households' },
              { icon: 'jobLoss', text: 'It assumes some employees lose their jobs' },
              { icon: 'limit', text: 'The two sets of numbers are not added together' },
            ],
          },
        ]}
      />
    </Callout>
  );
}

// The band that ends part 2: part 3 next, and links to the figures' homes
// (the tab row's sub-tabs).
const DEEPER = [
  { tab: 'explore', sub: 'economy', label: 'Economy' },
  { tab: 'explore', sub: 'finances', label: 'Public finances' },
  { tab: 'explore', sub: 'who', label: 'Who gains' },
  { tab: 'explore', sub: 'all', label: 'All scenarios' },
  { tab: 'method', sub: 'scenarios', label: 'Scenarios' },
  { tab: 'method', sub: 'how', label: 'OG-UK method' },
];
function NextBand() {
  return (
    <NextPart
      n={3}
      title="Jobs, incomes and the public finances"
      to="story-part-3"
      links={DEEPER.map((d) => (
        <NavLink key={`${d.tab}-${d.sub}`} tab={d.tab} sub={d.sub}>
          {d.label}
        </NavLink>
      ))}
    />
  );
}

export default function Part2({ part }) {
  const { st } = useNav();
  const sid = st.s;
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
    `Line chart, shape only: public debt as a share of GDP against the OBR-central path to ${LATE_YEAR}, ${SCEN_NAME[sid]}.${
      debtMain ? ` In the main arm it ${debtMain}.` : ''
    }${i >= 1 && othersEndHigher(sid, cl) ? ' The other two arms end further above the path.' : ''}`;
  return (
    <>
      <PartHead part={part}>
        OG-UK results for an AI shock arriving as a surprise in {SURPRISE_YEAR}: gaps against the OBR-central path, which already includes the OBR&rsquo;s central AI assumption.
      </PartHead>

      <TwoLenses />

      <Scrolly id="p2-shock" label="The shock, illustrated" steps={shockSteps()} graphic={(i) => <ShockTiles state={i + 1} />} />

      <Scrolly
        id="p2-morph"
        label="From GDP growth to the gap against the OBR-central path"
        steps={morphSteps(sid, cl)}
        graphic={(i) => <MorphChart state={i + 1} sid={sid} cl={cl} />}
      />

      <Scrolly
        id="p2-scenarios"
        label="GDP in the four scenarios"
        steps={scenarioSteps(sid, cl)}
        graphic={(i) => <ScenarioPaths state={i + 3} sid={sid} cl={cl} />}
      />

      <Reveal as="section" id="story-headline" className="summary story-headline" aria-labelledby="story-headline-h">
        <h3 id="story-headline-h" className="p2-headline-title">
          The headline figures: {SCEN_NAME[sid]}, {HEADLINE_YEAR}
        </h3>
        <p className="p2-headline-lead">
          The main arm, automation + productivity, against the OBR-central path. Change the scenario or closure at the top of the page.
        </p>
        <HeadlineTiles sid={sid} />
        <SummaryWhy sid={sid} />
      </Reveal>

      <OutputSplit sid={sid} closure={closure} />

      <Scrolly
        id="p2-arms"
        label={`GDP in three arms, ${SCEN_NAME[sid]}`}
        steps={armSteps(sid, closure)}
        graphic={(i) => (
          <ArmPaths
            state={i}
            sid={sid}
            closure={closure}
            v="Y"
            title="GDP in three arms"
            unit="Gap against the OBR-central path, %"
            label={gdpLabel(i)}
          />
        )}
      />

      <Scrolly id="p2-who" label="Welfare change by birth year" steps={whoSteps(sid)} graphic={(i) => <WelfareShape state={i} />} />

      <Scrolly
        id="p2-debt"
        label={`Public debt in three arms, ${SCEN_NAME[sid]}`}
        steps={debtSteps(sid, closure)}
        graphic={(i) => (
          <ArmPaths
            state={i}
            sid={sid}
            closure={closure}
            v="debt_gdp_pp"
            allFrom={1}
            title="Public debt as a share of GDP"
            unit="Gap against the OBR-central path, percentage points"
            label={debtLabel(i)}
          />
        )}
      />

      <NextBand />
    </>
  );
}
