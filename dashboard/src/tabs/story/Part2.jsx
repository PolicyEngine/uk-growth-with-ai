'use client';

import Scrolly from '@/components/story/Scrolly.jsx';
import Reveal from '@/components/story/Reveal.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import Icon from '@/components/ab/Icon.jsx';
import { HeadlineTiles, SummaryWhy } from '@/tabs/ai/Landing.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, BOUND, gap, result } from '@/tabs/ai/surprise.js';
import { primaryClosure, closuresFor } from '@/tabs/ai/lines.js';
import PartHead from './PartHead.jsx';
import ShockTiles from './part2/ShockTiles.jsx';
import { ScenarioPaths, ArmPaths, WelfareShape, welfareCell, series, afterWords, afterWordsAll } from './part2/charts.jsx';
import { More } from './part2/frame.jsx';
import { MorphChart, morphSteps } from './part2/Morph.jsx';
import OutputSplit from './part2/OutputSplit.jsx';

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
// arms, who gains, public finances, then one line of links.

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
      kicker: 'The shock',
      title: 'AI moves part of income from labour to capital',
      body: (
        <>
          <p>
            OG-UK is a model of the whole UK economy: households, firms and the government. Each tile in the grid is one per cent of output;
            tiles on the left are paid for work, tiles on the right go to the owners of capital as profits, interest and rents.
          </p>
          <p>
            In the model AI lets capital do tasks that workers did, so capital&rsquo;s share of income rises and labour&rsquo;s falls. The
            tiles that move are exaggerated so the shift is visible.
          </p>
          <More tab="method" sub="scenarios">How large the shift is in each scenario</More>
        </>
      ),
    },
    {
      id: 'p2-shock-2',
      kicker: 'The shock',
      title: 'And the same inputs produce more',
      body: (
        <>
          <p>
            AI also raises output at given inputs of capital and work: the new tiles. Whether pay ends up above or below the no-shock path
            depends on the size of each move and on how much new capital arrives. The shock comes as a surprise in {SURPRISE_YEAR}: nobody in
            the model sees it coming.
          </p>
          <More tab="explore" sub="economy" anchor="explore-part-economy">The labour share, capital and the rest of the economy</More>
        </>
      ),
    },
  ];
}

function scenarioSteps(sid, cl) {
  const after = afterWordsAll(SCENARIOS.map((s) => series(s.id, 'tfp', cl, 'Y')).filter(Boolean)) ?? 'changes more slowly';
  return [
    {
      id: 'p2-scen-2',
      kicker: 'Four scenarios',
      title: 'UK central, within the UK range',
      body: (
        <p>
          The scenarios differ in how far the labour share falls and how much output at given inputs rises. In the main arm of each
          scenario, GDP rises above the OBR-central path from {SURPRISE_YEAR} and {after} once the shock is complete in {HEADLINE_YEAR}.
          UK central has a larger shift and a larger productivity gain than UK low, and UK high larger again: the same shape, higher. The
          shaded band is the UK range, from UK low to UK high.
        </p>
      ),
    },
    {
      id: 'p2-scen-4',
      kicker: 'Four scenarios',
      title: 'Korinek et al.: an upper case from the US',
      body: (
        <>
          <p>
            A US scenario, kept as a labelled upper case rather than a UK calibration. The scenario chosen at the top of the page,{' '}
            {SCEN_NAME[sid]}, is the coloured line; change it there.
          </p>
          <More tab="method" sub="scenarios">What each scenario assumes, and its sources</More>
          <More tab="explore" sub="economy" anchor="income">GDP and national income year by year</More>
        </>
      ),
    },
  ];
}

function armSteps(sid, closure) {
  const cl = primaryClosure(closure);
  const tz = gap(sid, 'tz', cl, 'Y');
  const tfp = gap(sid, 'tfp', cl, 'Y');
  const kicker = `Three arms, ${SCEN_NAME[sid]}`;
  const closureNote =
    closure === 'both' ? (
      <p>Solid lines are the central closure, where some new capital is foreign-owned; dashed lines are closed capital, where none is.</p>
    ) : (
      <p>
        {cl === BOUND ? 'The lines are for closed capital.' : 'The lines are at the central closure.'} <NavLink patch={{ closure: 'both' }}>Show both closures</NavLink> to see how much depends on
        foreign capital.
      </p>
    );
  return [
    {
      id: 'p2-arms-0',
      kicker,
      title: 'Automation + productivity: the main arm',
      body: <p>Both moves happen: capital&rsquo;s share rises and output at given inputs rises. This arm gives the headline figures above.</p>,
    },
    {
      id: 'p2-arms-1',
      kicker,
      title: 'Automation with technology unchanged',
      body: (
        <p>
          Capital&rsquo;s share rises, but output at given inputs stays as it was.
          {tz != null && tfp != null ? (tz < tfp ? ' GDP is lower than in the main arm.' : ' GDP is at least as high as in the main arm.') : ''}
        </p>
      ),
    },
    {
      id: 'p2-arms-2',
      kicker,
      title: 'The OBR-style stress test',
      body: (
        <>
          <p>
            The same shift, with output at given inputs cut so that GDP in {HEADLINE_YEAR} is back on the OBR-central path: a bound in which
            AI adds no output, not a forecast. It matches the OBR&rsquo;s scenario on GDP only: the OBR adjusts through jobs, OG-UK through the
            wage.
          </p>
          {closureNote}
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
    sid === 'uk_central' ? null : <p>Who gains is solved for UK central only. This chart is always UK central, central closure, debt-neutral transfers, whatever is chosen above.</p>;
  return [
    {
      id: 'p2-who-0',
      kicker: 'Who gains',
      title: 'Gains are largest around retirement age',
      body: (
        <>
          <p>
            The line is the welfare change of each birth year, for adults alive in {SURPRISE_YEAR}, in UK central as modelled. The gain is largest for adults around
            retirement age, who hold more wealth and collect the higher return on it. It is smaller for the oldest adults and for the
            youngest, who have the most working years ahead and the least wealth{someLose ? '; under some measures they lose' : ''}.
          </p>
          {scope}
        </>
      ),
    },
    {
      id: 'p2-who-1',
      kicker: 'Who gains',
      title: 'Then the cohorts that enter later',
      body: (
        <>
          <p>
            People who enter the economy after {SURPRISE_YEAR} live their whole lives on the new path.{allGain ? ' As modelled, under debt-neutral transfers, they gain too: a higher return on saving and, later, higher consumption outweigh lower pay rates.' : ''}{' '}
            The measures, the earnings groups and the other arms are on Who gains.
          </p>
          <More tab="explore" sub="who">Who gains, by age and earnings group</More>
        </>
      ),
    },
  ];
}

function debtSteps(sid, closure) {
  const cl = primaryClosure(closure);
  const main = debtWords(sid, 'tfp', cl);
  return [
    {
      id: 'p2-debt-0',
      kicker: 'Public finances',
      title: 'Public debt against the path',
      body: (
        <p>
          {main
            ? `In ${SCEN_NAME[sid]}, main arm, common fiscal rule, public debt as a share of GDP ${main}.${
                main.includes('rises above') ? ' The model reprices all government debt at the higher interest rate at once, which overstates the later rise.' : ''
              } After ${HEADLINE_YEAR} the OBR-central path is the model’s continuation of the OBR forecast.`
            : 'This solve is not done yet at the closure chosen above.'}
        </p>
      ),
    },
    {
      id: 'p2-debt-1',
      kicker: 'Public finances',
      title: 'Without the output gain',
      body: (
        <>
          <p>
            {othersEndHigher(sid, cl)
              ? `In the two arms with no productivity gain, debt ends further above the path by ${LATE_YEAR}.`
              : 'The two arms with no productivity gain are drawn beside the main arm.'}{' '}
            Public finances also covers tax, the fiscal rules and why the tax effect is likely understated.
          </p>
          <More tab="explore" sub="finances">Debt, tax and the fiscal rules</More>
        </>
      ),
    },
  ];
}

// Two lenses, before part 2: which model this part uses and how part 3's
// differs. The full comparison closes the story.
function TwoLenses() {
  return (
    <aside className="p2-lenses" aria-label="Two models, two lenses">
      <p>
        <Icon name="trend" size={16} />
        <span>
          <b>This part: OG-UK</b>, a model of the whole economy. It has no unemployment, and its results are gaps against the
          OBR-central path, not forecasts of levels.
        </span>
      </p>
      <p>
        <Icon name="usersRound" size={16} />
        <span>
          <b>Part 3: a different model</b> (provisional), a one-year microsimulation of UK households if some employees are assumed to lose their jobs. The two
          sets of numbers are not added together.
        </span>
      </p>
    </aside>
  );
}

// One line of links to the figures' homes (the tab row's sub-tabs).
const DEEPER = [
  { tab: 'explore', sub: 'economy', label: 'Economy' },
  { tab: 'explore', sub: 'finances', label: 'Public finances' },
  { tab: 'explore', sub: 'who', label: 'Who gains' },
  { tab: 'explore', sub: 'all', label: 'All scenarios' },
  { tab: 'method', sub: 'scenarios', label: 'Scenarios' },
  { tab: 'method', sub: 'how', label: 'OG-UK method' },
];
function DeeperLinks() {
  return (
    <nav className="p2-deeper" aria-label="Part 2 in detail">
      <span className="p2-deeper-lead">In detail:</span>
      {DEEPER.map((d) => (
        <NavLink key={`${d.tab}-${d.sub}`} tab={d.tab} sub={d.sub}>
          {d.label}
        </NavLink>
      ))}
    </nav>
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
        OG-UK results for an AI shock arriving as a surprise in {SURPRISE_YEAR}, as gaps against the OBR-central path, which already includes the OBR&rsquo;s own central AI assumption.
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

      <DeeperLinks />
    </>
  );
}
