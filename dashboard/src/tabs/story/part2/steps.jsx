'use client';

import { Key } from '@/components/story/highlight.jsx';
import { YEARS, SURPRISE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, CENTRAL, gap } from '@/tabs/ai/surprise.js';
import { welfareCell, entryDip, peakAge, series, LAST_ALIVE } from './charts.jsx';
import D from '@/data/cohorts2028.json';
import { PART_COLOR } from './split.js';
import { EPS2 } from './dir.js';
import { welfareWords } from './caveats.js';

// Part 2's step cards (round 1): one sentence per step, with at most one
// emphasised term, a colour-keyed <Key> that lights the mark the step
// highlights (step.highlight, data-mark on the chart). A caveat the
// economics review asked for sits once, in the scene where it matters, as
// one short line under the sentence (Note), in words: the figure's home is
// linked, not repeated. Sources are the figure's one source line.

// The marks' colours and shapes, for <Key> (MarkProvider in Part2).
export function partMarks(sid) {
  const scen = Object.fromEntries(
    SCENARIOS.map((s) => [`scen-${s.id}`, { color: s.id === sid ? ARM_COLOR.tfp : 'var(--pe-gray-500)', shape: 'line', label: s.label }]),
  );
  const parts = { labour: 'Labour income', capital: 'Gross capital income', domestic: 'Kept in the UK', foreign: 'Net paid abroad', depreciation: 'Depreciation', gdp: 'GDP' };
  const wf = Object.fromEntries(Object.entries(parts).map(([k, label]) => [`wf-${k}`, { color: PART_COLOR[k], shape: 'square', label }]));
  return {
    ...scen,
    ...wf,
    path: { color: 'var(--pe-gray-700)', shape: 'line', label: 'No-shock baseline' },
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

// The GDP canvas: two steps, then the headline step (Part2.jsx). The first
// card's graphic opens on the record (growth, state 1) and turns into the
// gap (state 2) once in view, so part 1's last chart becomes part 2's first
// without a card of its own; its sentence names the switch of unit, which
// the chart flags on its axis (MORPH_STATES are the states each card
// settles in).
export const MORPH_STATES = [2, 4, 4];
export function morphCardSteps(sid, cl) {
  const dir = scenarioDir(cl);
  const rel = dir === 'gapDown' ? 'falls below' : dir === 'gapUp' ? 'rises above' : 'moves against';
  return [
    {
      id: 'p2-morph-2',
      icon: 'path',
      title: 'The axis switches from growth to a gap',
      highlight: ['path', `scen-${sid}`],
      body: (
        <Say>
          The chart now shows a gap: GDP against the no-shock baseline, built on the OBR&rsquo;s forecast. <Key id={`scen-${sid}`}>{SCEN_NAME[sid]}</Key> {rel} it from {SURPRISE_YEAR}.
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
                The UK scenarios join below <Key id="scen-korinek">Korinek et al.</Key>, built on US inputs: a larger shock means a higher line.
              </>
            ) : (
              <>
                The other scenarios join: a larger shock means a higher line. <Key id="scen-korinek">Korinek et al.</Key>, built on US inputs, is highest.
              </>
            )}
          </Say>
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
  return [
    {
      id: 'p2-who-0',
      icon: 'age',
      title: 'Gains are largest around retirement age',
      highlight: ['cohort-adults'],
      body: (
        <>
          <Say>
            This chart uses another fiscal rule: transfers adjust to keep debt on the path. Gains peak for <Key id="cohort-adults">adults {peakAge() >= 55 ? 'near retirement' : 'in middle age'}</Key>, who hold most wealth.
          </Say>
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
            {dip ? `; those entering just after ${SURPRISE_YEAR} gain least` : ''}.
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

// The generations scene's one closing line, carrying all three framings:
// every adult gains as charted (debt-neutral transfers to 2036); with the
// transfers kept on to the horizon, who loses; and without bequest value
// too (cohorts2028.json dnfull, in words; the figures are on Explore).
export function whoAnswer() {
  const w = welfareWords();
  if (!w?.lose) return null;
  const c = welfareCell();
  const xs = D.closures[CENTRAL].birth_year;
  const adultsGain = c.cev_all.every((v, i) => xs[i] > LAST_ALIVE || v > 0);
  const head = adultsGain ? 'As modelled, every adult gains' : `Gains peak ${peakAge() >= 55 ? 'near retirement' : 'in middle age'}`;
  const nb = w.loseNb ? `; ${w.loseNb}, ignoring bequests` : '';
  return `${head}. If transfers bear the cost after 2036, ${w.lose} lose${nb}.`;
}
