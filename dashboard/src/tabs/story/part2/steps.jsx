'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { Items } from '@/components/story/Items.jsx';
import { Key } from '@/components/story/highlight.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, gap, result } from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { welfareCell, entryDip, peakAge, series, afterWordsAll } from './charts.jsx';
import { More, Tx } from './frame.jsx';
import { morphItems } from './Morph.jsx';
import { PART_COLOR } from './split.js';
import { EPS2 } from './dir.js';
import { A, Cite, ResultLinks, resultUrl, pathUrl, OG_DEFAULTS, SRC } from './sources.jsx';

// Part 2's step cards (brief-qa B, Vahid: "someone cannot trace the text
// between the plots"): at most three steps per scene, each ONE sentence of
// about 15 words under a small kind label (Assumed, Finding, Key takeaway),
// naming its series with a colour-keyed <Key> that lights the mark the step
// highlights (step.highlight, data-mark on the chart). One takeaway per
// scene. Caveats, comparisons and the attributions sit in a fold under the
// sentence ("About this"), and the result files on one line; Explore and
// Method are linked, not repeated.

const EPS = EPS2;

// The marks' colours and shapes, for <Key> (MarkProvider in Part2).
export function partMarks(sid) {
  const scen = Object.fromEntries(
    SCENARIOS.map((s) => [`scen-${s.id}`, { color: s.id === sid ? ARM_COLOR.tfp : 'var(--pe-gray-500)', shape: 'line', label: s.label }]),
  );
  const arms = { tfp: 'Automation + productivity', tz: 'Technology unchanged', ss: 'Stress test' };
  const lines = Object.fromEntries(
    Object.entries(arms).flatMap(([a, label]) => [
      [`gdp-${a}`, { color: ARM_COLOR[a], shape: 'line', label: `GDP, ${label}` }],
      [`debt-${a}`, { color: ARM_COLOR[a], shape: 'line', label: `Public debt, ${label}` }],
    ]),
  );
  const parts = { labour: 'Labour income', capital: 'Gross capital income', domestic: 'Kept in the UK', foreign: 'Net paid abroad', depreciation: 'Depreciation', gdp: 'GDP' };
  const wf = Object.fromEntries(Object.entries(parts).map(([k, label]) => [`wf-${k}`, { color: PART_COLOR[k], shape: 'square', label }]));
  return {
    ...scen,
    ...lines,
    ...wf,
    path: { color: 'var(--pe-gray-700)', shape: 'line', label: 'OBR-central path' },
    ons: { color: 'var(--pe-gray-800)', shape: 'circle', label: 'ONS outturn' },
    obr: { color: 'var(--pe-gray-500)', shape: 'circle', label: 'OBR forecast' },
    'cohort-adults': { color: 'var(--pe-gray-800)', shape: 'line', label: 'Adults alive in 2028' },
    'cohort-later': { color: 'var(--pe-gray-800)', shape: 'line', label: 'Cohorts entering later' },
  };
}

const KIND = {
  assumed: ['scenario', 'Assumed'],
  finding: ['model', 'Finding'],
  record: ['record', 'Record'],
  takeaway: ['takeaway', 'Key takeaway'],
};
// The step's one sentence, under its kind label.
export function Say({ kind = 'finding', children }) {
  const [icon, label] = KIND[kind];
  return (
    <p className={`p2-say is-${kind}`}>
      <span className="p2-kind">
        <Icon name={iconFor(icon)} size={12} strokeWidth={2.25} />
        {label}
      </span>
      <span className="p2-say-text">{children}</span>
    </p>
  );
}
// The fold under the sentence: caveats, comparisons and attributions.
export function Fold({ title = 'About this', icon = 'caveat', items }) {
  const list = (items ?? []).filter(Boolean);
  if (!list.length) return null;
  return (
    <details className="p2-details p2-fold">
      <summary>
        <Tx icon={icon}>{title}</Tx>
      </summary>
      <Items items={list} />
    </details>
  );
}

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

// GDP after the surprise in every scenario's main arm: above the path in
// every year from SURPRISE_YEAR when all of them are, otherwise null.
export function scenarioDir(cl) {
  const from = YEARS.indexOf(SURPRISE_YEAR);
  const all = SCENARIOS.map((s) => series(s.id, 'tfp', cl, 'Y')).filter(Boolean);
  if (!all.length) return null;
  const tail = all.flatMap((ys) => ys.slice(from + 1));
  if (tail.every((v) => v > EPS2)) return 'gapUp';
  if (tail.every((v) => v < -EPS2)) return 'gapDown';
  return null;
}

// The technology-unchanged arm's GDP against the main arm's, in the
// headline year. null when either is pending.
export function tzItem(sid, cl) {
  const tz = gap(sid, 'tz', cl, 'Y');
  const tfp = gap(sid, 'tfp', cl, 'Y');
  if (tz == null || tfp == null) return null;
  return tz < tfp ? { icon: 'gapDown', text: 'GDP is lower than in the main arm' } : { icon: 'gapUp', text: 'GDP is at least as high as in the main arm' };
}

// Debt/GDP against the path for one solve, as items (icon and words from
// one sign test). null when pending.
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

// The shock (ShockTiles, an illustration with no data marks: highlight
// 'none'). Graphic states 1 and 2.
export function shockSteps() {
  const why = 'An illustration: its tiles move with the step, no data marks';
  return [
    {
      id: 'p2-shock-1',
      icon: 'shock',
      title: 'AI moves part of income from labour to capital',
      highlight: 'none',
      highlightWhy: why,
      body: (
        <>
          <Say kind="assumed">The scenarios have AI do some workers&rsquo; tasks, so capital&rsquo;s share of income rises.</Say>
          <Cite items={[['IMF, SIP/2026/072', SRC.imfSip], ['Korinek et al. (2026)', SRC.korinekT3]]} />
        </>
      ),
    },
    {
      id: 'p2-shock-2',
      icon: 'productivity',
      title: 'And the same inputs produce more',
      highlight: 'none',
      highlightWhy: why,
      body: (
        <>
          <Say kind="takeaway">Income shifts to capital, and the new tiles show the same inputs producing more.</Say>
          <Fold
            items={[
              { icon: 'pay', text: 'Pay against the path depends on each move’s size and new capital' },
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
          <Cite items={[['OBR, Briefing paper No.9', SRC.bp9], ['IMF, SIP/2026/072', SRC.imfSip]]} />
        </>
      ),
    },
  ];
}

// The GDP canvas: three steps over Morph states 1, 2 and 4 (MORPH_STATES).
export const MORPH_STATES = [1, 2, 4];
export function morphCardSteps(sid, cl) {
  const dir = scenarioDir(cl);
  const after = afterWordsAll(SCENARIOS.map((s) => series(s.id, 'tfp', cl, 'Y')).filter(Boolean));
  const k = (id) => <Key id={`scen-${id}`}>{SCEN_NAME[id]}</Key>;
  return [
    {
      id: 'p2-morph-1',
      icon: 'record',
      title: 'The record so far',
      highlight: ['ons', 'obr'],
      body: (
        <Say kind="record">
          Part 1 ended here: <Key id="ons">ONS outturn</Key> and the <Key id="obr">OBR&rsquo;s forecast</Key> of growth.
        </Say>
      ),
    },
    {
      id: 'p2-morph-2',
      icon: 'path',
      title: 'From growth rates to a gap',
      highlight: ['path', `scen-${sid}`],
      body: (
        <>
          <Say kind="finding">
            Zero is now OG-UK&rsquo;s <Key id="path">no-shock path</Key>; {k(sid)} {dir === 'gapDown' ? 'falls below' : dir === 'gapUp' ? 'rises above' : 'moves against'} it from {SURPRISE_YEAR}.
          </Say>
          <Fold title="About the path" icon="forecast" items={morphItems(sid, cl)} />
          <ResultLinks files={[[`${SCEN_NAME[sid]} result file`, resultUrl(sid, 'tfp', cl)], ['no-shock path file', pathUrl(cl)]]} method="m-path" methodText="How the path is set" />
        </>
      ),
    },
    {
      id: 'p2-scen-2',
      icon: 'range',
      title: 'The four scenarios',
      highlight: SCENARIOS.map((s) => `scen-${s.id}`),
      body: (
        <>
          <span id="p2-scenarios" className="p2-anchor" aria-hidden="true" />
          <Say kind="takeaway">
            {k('uk_low')}, {k('uk_central')}, {k('uk_high')} and <Key id="scen-korinek">Korinek et al.</Key>{' '}
            {dir === 'gapUp' ? 'all end above the path' : dir === 'gapDown' ? 'all end below the path' : 'end on both sides of the path'}.
          </Say>
          <Fold
            title="About the scenarios"
            icon="scenario"
            items={[
              after ? { icon: 'timing', text: `After the ramp ends in ${HEADLINE_YEAR}, GDP ${after}` } : null,
              {
                icon: 'source',
                text: (
                  <>
                    UK inputs:{' '}
                    <NavLink tab="method" sub="how" anchor="m-scenarios">
                      derived by this study&rsquo;s rule
                    </NavLink>{' '}
                    from <A href={SRC.bp9}>OBR</A>, <A href={SRC.frs26}>OBR</A>, <A href={SRC.imfSip}>IMF</A>
                  </>
                ),
              },
              {
                icon: 'foreign',
                text: (
                  <>
                    <A href={SRC.korinekT3}>Korinek et al. (2026), Table 3</A>: US, an upper case here
                  </>
                ),
              },
            ]}
          />
          <ResultLinks files={SCENARIOS.map((x) => [x.label, resultUrl(x.id, 'tfp', cl)])} method="m-scenarios" methodText="What each scenario assumes" />
          <More tab="explore" sub="economy" anchor="economy-wall">
            GDP year by year
          </More>
        </>
      ),
    },
  ];
}

// Three arms: three steps over ArmsPair states 0, 2 and 4 (ARMS_STATES).
export const ARMS_STATES = [0, 2, 4];
export function armsCardSteps(sid, closure) {
  const cl = primaryClosure(closure);
  const tz = tzItem(sid, cl);
  const higher = othersEndHigher(sid, cl);
  const tfpUp = (gap(sid, 'tfp', cl, 'Y') ?? 0) > EPS;
  const debt = debtItems(sid, 'tfp', cl);
  const rises = (gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR) ?? 0) > EPS;
  return [
    {
      id: 'p2-arms-0',
      icon: 'ai',
      title: 'Automation + productivity: the main arm',
      highlight: ['gdp-tfp'],
      body: (
        <>
          <Say kind="finding">
            <Key id="gdp-tfp">Automation + productivity</Key>, the headline arm, {tfpUp ? 'lifts GDP above' : 'leaves GDP near'} the path.
          </Say>
          <Fold
            title="Assumed in this arm"
            icon="scenario"
            items={[
              { icon: 'capital', text: 'Capital’s share of income rises' },
              { icon: 'productivity', text: 'Output at given inputs rises (scenario sources)' },
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
            ]}
          />
        </>
      ),
    },
    {
      id: 'p2-arms-2',
      icon: 'compare',
      title: 'Without the productivity gain',
      highlight: ['gdp-tz', 'gdp-ss'],
      body: (
        <>
          <Say kind="finding">
            <Key id="gdp-tz">Technology unchanged</Key> {tz?.icon === 'gapDown' ? 'is lower' : 'is at least as high'}; the <Key id="gdp-ss">stress test</Key> returns GDP
            to the path by {HEADLINE_YEAR}.
          </Say>
          <Fold
            title="The stress test"
            icon="breakEven"
            items={[
              { icon: 'limit', text: 'A bound in which AI adds no output, not a forecast' },
              { icon: 'compare', text: <>It matches the <A href={SRC.efoBox22}>OBR&rsquo;s displacement scenario</A> on GDP only</> },
              { icon: 'labour', text: 'The OBR adjusts through jobs, OG-UK through the wage' },
              {
                icon: 'closure',
                text: (
                  <NavLink tab="method" sub="how" anchor="m-closures">
                    How the closures work
                  </NavLink>
                ),
              },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p2-debt-1',
      icon: 'debt',
      title: 'Public debt against the path',
      highlight: ['debt-tfp', 'debt-tz', 'debt-ss'],
      body: (
        <>
          <span id="p2-debt" className="p2-anchor" aria-hidden="true" />
          <Say kind="takeaway">
            {higher ? (
              <>
                Without the gain, <Key id="debt-tz">public debt</Key> ends further above the path than in the <Key id="debt-tfp">main arm</Key>.
              </>
            ) : (
              <>
                <Key id="debt-tfp">Public debt</Key> in the main arm, beside the two arms without the gain.
              </>
            )}
          </Say>
          <Fold
            title="Public debt in the main arm"
            icon="debt"
            items={[
              ...(debt ?? [{ icon: 'provisional', text: 'This solve is not done yet at this closure' }]),
              rises
                ? {
                    icon: 'limit',
                    text: (
                      <>
                        OG-UK{' '}
                        <NavLink tab="method" sub="how" anchor="m-debt">
                          reprices all debt at once
                        </NavLink>
                        , overstating the later rise
                      </>
                    ),
                  }
                : null,
              {
                icon: 'rule',
                text: (
                  <>
                    Under the{' '}
                    <NavLink tab="method" sub="how" anchor="m-rules">
                      common fiscal rule
                    </NavLink>
                    , a model setting
                  </>
                ),
              },
              { icon: 'ai', text: <>The path&rsquo;s growth includes <A href={SRC.bp9}>the OBR&rsquo;s central AI assumption</A></> },
              {
                icon: 'tax',
                text: (
                  <NavLink tab="method" sub="how" anchor="m-tax">
                    Why the tax effect is likely understated
                  </NavLink>
                ),
              },
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
          <More tab="explore" sub="finances">
            Debt, tax and the fiscal rules
          </More>
        </>
      ),
    },
  ];
}

// Who gains and who loses: two steps over WelfareShape states 0 and 1.
export function whoCardSteps(sid) {
  const c = welfareCell();
  const someLose = c.alive_losing_pct > 0 || c.no_bequest_losing_pct > 0 || (c.charged?.joint_losing_pct?.[1] ?? 0) > 0;
  const allGain = c.cev_all.every((v) => v > 0);
  const dip = entryDip();
  return [
    {
      id: 'p2-who-0',
      icon: 'age',
      title: 'Gains are largest around retirement age',
      highlight: ['cohort-adults'],
      body: (
        <>
          <Say kind="finding">
            As modelled, gains peak for <Key id="cohort-adults">adults {peakAge() >= 55 ? 'near retirement' : 'in middle age'}</Key>, who hold most wealth.
          </Say>
          <Fold
            title="About these figures"
            icon="caveat"
            items={[
              { icon: 'scenario', text: 'UK central, central closure, debt-neutral transfers (a model rule)' },
              sid === 'uk_central' ? null : { icon: 'data', text: 'Always UK central here, whatever is chosen above' },
              { icon: 'households', text: 'Smaller for the oldest and youngest, who have least wealth' },
            ]}
          />
        </>
      ),
    },
    {
      id: 'p2-who-1',
      icon: 'entrants',
      title: 'Then the cohorts that enter later',
      highlight: ['cohort-later'],
      body: (
        <>
          <Say kind="takeaway">
            <Key id="cohort-later">Later cohorts</Key> {allGain ? 'gain too' : 'are drawn in the band'}
            {someLose ? (
              <>
                ; on{' '}
                <NavLink tab="explore" sub="who">
                  other measures
                </NavLink>{' '}
                some adults lose
              </>
            ) : null}
            .
          </Say>
          <Fold
            title="About these figures"
            icon="caveat"
            items={[
              allGain ? { icon: 'capital', text: 'A higher return on saving outweighs pay below the path' } : null,
              dip ? { icon: 'benefits', text: 'The dip: transfers fall until the debt rule starts' } : null,
              dip ? { icon: 'rule', text: 'Not under the common fiscal rule' } : null,
            ]}
          />
          <More tab="explore" sub="who">
            Who gains and who loses, by age and earnings group
          </More>
        </>
      ),
    },
  ];
}
