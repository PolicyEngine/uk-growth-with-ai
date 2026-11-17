'use client';

import { NavLink } from '@/lib/nav.jsx';
import { Key } from '@/components/story/highlight.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, gap, result } from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { welfareCell, entryDip, peakAge, series } from './charts.jsx';
import { PART_COLOR } from './split.js';
import { EPS2, dirWord } from './dir.js';
import { stressBelow, debtRuleWord, welfareWords } from './caveats.js';

// Part 2's step cards (round 1): one sentence per step, with at most one
// emphasised term, a colour-keyed <Key> that lights the mark the step
// highlights (step.highlight, data-mark on the chart). A caveat the
// economics review asked for sits once, in the scene where it matters, as
// one short line under the sentence (Note), in words: the figure's home is
// linked, not repeated. Sources are the figure's one source line.

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

// The step's one sentence.
export function Say({ children }) {
  return (
    <p className="p2-say">
      <span className="p2-say-text">{children}</span>
    </p>
  );
}
// A caveat: one short line under the sentence, meta text, no icon.
export function Note({ children }) {
  return <p className="p2-note">{children}</p>;
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
// 'none'). Graphic states 1 and 2. Its inputs' sources are the figure's
// source line.
export function shockSteps() {
  const why = 'An illustration: its tiles move with the step, no data marks';
  return [
    {
      id: 'p2-shock-1',
      icon: 'shock',
      title: 'AI moves part of income from labour to capital',
      highlight: 'none',
      highlightWhy: why,
      body: <Say>The scenarios have AI do some workers&rsquo; tasks, so capital&rsquo;s share of income rises.</Say>,
    },
    {
      id: 'p2-shock-2',
      icon: 'productivity',
      title: 'And the same inputs produce more',
      highlight: 'none',
      highlightWhy: why,
      body: <Say>New tiles arrive: the same inputs now produce more output.</Say>,
    },
  ];
}

// The GDP canvas: two steps. The first card's graphic opens on the record
// (growth, state 1) and turns into the gap (state 2) once in view, so part
// 1's last chart becomes part 2's first without a card of its own
// (MORPH_STATES are the states each card settles in).
export const MORPH_STATES = [2, 4];
export function morphCardSteps(sid, cl) {
  const dir = scenarioDir(cl);
  const rel = dir === 'gapDown' ? 'falls below' : dir === 'gapUp' ? 'rises above' : 'moves against';
  return [
    {
      id: 'p2-morph-2',
      icon: 'path',
      title: 'From growth rates to a gap',
      highlight: ['path', `scen-${sid}`],
      body: (
        <Say>
          The same years, now as the gap against OG-UK&rsquo;s no-shock path: <Key id={`scen-${sid}`}>{SCEN_NAME[sid]}</Key> {rel} it from {SURPRISE_YEAR}.
        </Say>
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
          <Say>
            {sid === 'korinek' ? (
              <>
                The UK scenarios draw in below <Key id="scen-korinek">Korinek et al.</Key>&rsquo;s US inputs: the larger the shock, the higher the line.
              </>
            ) : (
              <>
                The other scenarios draw in: the larger the shock, the higher the line, with <Key id="scen-korinek">Korinek et al.</Key>, on US inputs, highest.
              </>
            )}
          </Say>
        </>
      ),
    },
  ];
}

// Three arms: two steps over ArmsPair states 2 and 4 (ARMS_STATES). The
// main arm is the headline tiles'; the first card draws all three GDP arms.
export const ARMS_STATES = [2, 4];
export function armsCardSteps(sid, closure) {
  const cl = primaryClosure(closure);
  const tz = tzItem(sid, cl);
  const higher = othersEndHigher(sid, cl);
  const late = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  const debt = late == null ? null : `ends ${dirWord(late)} the path by ${LATE_YEAR}`;
  const rule = debtRuleWord(sid, cl);
  return [
    {
      id: 'p2-arms-2',
      icon: 'compare',
      title: 'Without the productivity gain',
      highlight: ['gdp-tz', 'gdp-ss'],
      body: (
        <>
          <span id="p2-arms-0" className="p2-anchor" aria-hidden="true" />
          <Say>
            <Key id="gdp-tz">Technology unchanged</Key> {tz?.icon === 'gapDown' ? 'is lower' : 'is at least as high'}; the stress test returns GDP to the path by {HEADLINE_YEAR}.
          </Say>
          {stressBelow(sid, cl) ? (
            <Note>
              The stress test is not a bound: it builds in a productivity loss, output at given inputs below technology unchanged (
              <NavLink tab="method" sub="how" anchor="m-scenarios">
                Method
              </NavLink>
              ).
            </Note>
          ) : null}
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
          <Say>
            Under the common fiscal rule, <Key id="debt-tfp">public debt</Key> {debt ?? 'is pending at this closure'}
            {higher ? ', higher still without the gain' : ''}.
          </Say>
          {rule ? (
            <Note>
              {rule.kind === 'fixed'
                ? `The sign depends on the fiscal rule: with public spending fixed, debt ends ${rule.dir} the path in ${LATE_YEAR}`
                : `Repricing only new debt, as the OBR does, ${rule.dir === 'below' ? 'debt ends below the path' : 'the rise is smaller'}`}{' '}
              (
              <NavLink tab="explore" sub="finances">
                Public finances
              </NavLink>
              ).
            </Note>
          ) : null}
        </>
      ),
    },
  ];
}

// Who gains and who loses: two steps over WelfareShape states 0 and 1.
export function whoCardSteps() {
  const c = welfareCell();
  const allGain = c.cev_all.every((v) => v > 0);
  const dip = entryDip();
  const w = welfareWords();
  return [
    {
      id: 'p2-who-0',
      icon: 'age',
      title: 'Gains are largest around retirement age',
      highlight: ['cohort-adults'],
      body: (
        <>
          <Say>
            As modelled, gains peak for <Key id="cohort-adults">adults {peakAge() >= 55 ? 'near retirement' : 'in middle age'}</Key>, who hold most wealth.
          </Say>
          {w?.bequests && w.consumption ? (
            <Note>
              Of the adults&rsquo; average gain, {w.bequests} is the value placed on leaving bequests and {w.consumption} is consumption (
              <NavLink tab="explore" sub="who">
                Gains and losses
              </NavLink>
              ).
            </Note>
          ) : null}
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
          <Say>
            <Key id="cohort-later">Later cohorts</Key> {allGain ? 'gain too' : 'are drawn in the band'}
            {dip ? `, least those entering just after ${SURPRISE_YEAR}` : ''}.
          </Say>
        </>
      ),
    },
  ];
}

// The GDP scene's closing line: the direction in every scenario, and which
// ends nearest and furthest from the path (sizes in words; the figures are
// the headline tiles' and Explore's). null when a scenario is pending.
export function morphAnswer(cl) {
  const dir = scenarioDir(cl);
  const ends = SCENARIOS.map((s) => [s.id, gap(s.id, 'tfp', cl, 'Y')]);
  if (!dir || ends.some(([, v]) => v == null)) return null;
  const sorted = [...ends].sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
  const where = dir === 'gapUp' ? 'above' : 'below';
  const name = (id) => SCEN_NAME[id].replace(/ \(.*\)$/, '');
  return `GDP ends ${where} the path in every scenario: least in ${name(sorted[0][0])}, most in ${name(sorted.at(-1)[0])}`;
}

// The generations scene's closing line: where gains peak and, with
// transfers bearing the later cost (solved to the horizon), who loses.
export function whoAnswer() {
  const w = welfareWords();
  if (!w?.lose) return null;
  const peak = peakAge() >= 55 ? 'near retirement' : 'in middle age';
  return `Gains peak ${peak}; if transfers bear the later cost, ${w.young ? `${w.young}-year-olds and ` : ''}${w.lose} adults lose`;
}
