'use client';

import { Key } from '@/components/story/highlight.jsx';
import { COHORTS, COHORT_YEAR, cohortNotice, wealthRatioAt } from '@/lib/dataKeys.js';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { shareInput, tfpInput } from '@/lib/obrOverlap.js';
import { welfareCell, entryDip, peakAge, series } from './charts.jsx';
import { PART_COLOR } from './split.js';
import { EPS2, dirWord } from './dir.js';
import { welfareWords } from './caveats.js';
import { shockFor } from './shock.js';

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
    path: { color: 'var(--pe-gray-700)', shape: 'line', label: 'Forecast path' },
    ons: { color: 'var(--pe-gray-800)', shape: 'circle', label: 'ONS outturn' },
    obr: { color: 'var(--pe-gray-500)', shape: 'circle', label: 'OBR forecast' },
    'cohort-adults': { color: 'var(--pe-gray-800)', shape: 'line', label: `Adults alive in ${COHORT_YEAR}` },
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

// "The shock", defined where it is named (Maria, Part 2): one sentence
// with UK central's two inputs, read from the data's scenario list, and
// the years from the data. null when an input is missing.
export function shockDefinition() {
  const ls = shareInput('uk_central');
  const tfp = tfpInput('uk_central');
  if (ls == null || tfp == null) return null;
  // the inputs are quoted assumptions, not results (data-input, as the
  // shock figure's own quoted input)
  return (
    <>
      An unexpected, lasting shock, phased in from {SURPRISE_YEAR} to {HEADLINE_YEAR}: in {SCEN_NAME.uk_central} the labour share falls <span data-input="">{ls.toFixed(1)}pp</span> and output at given inputs rises{' '}
      <span data-input="">{tfp.toFixed(1)}%</span>.
    </>
  );
}

// The shock (ShockTiles, drawn from the data: shock.js): three cards over
// graphic states 0, 1 and 2, one sentence each and no number (the input and
// the small-tile counts are the figure's). Its marks are tiles, which move
// with the step: highlight 'none'.
export function shockSteps(sid, closure) {
  const { base, ch, moreCapital } = shockFor(sid, closure);
  const why = 'Its tiles move with the step; no marks to light';
  const lab = base?.labour;
  const part = lab == null ? 'most' : lab >= 62 && lab <= 70 ? 'about two thirds' : lab > 50 ? 'the larger part' : 'the smaller part';
  const grows = ch && ch.gdp > 0 && moreCapital;
  return [
    {
      id: 'p2-shock-0',
      icon: 'gdp',
      title: 'Before the shock',
      highlight: 'none',
      highlightWhy: why,
      body: (
        <>
          <Say>Each tile is 1 of every 100 produced on the OBR&rsquo;s central forecast path: {part} is paid to labour, the rest to capital.</Say>
          {shockDefinition() ? <Note>{shockDefinition()}</Note> : null}
        </>
      ),
    },
    {
      id: 'p2-shock-1',
      icon: 'shock',
      title: 'Move 1: income shifts from labour to capital',
      highlight: 'none',
      highlightWhy: why,
      body: <Say>First move: AI does more workers&rsquo; tasks than the OBR expects, so part of labour&rsquo;s income goes to capital.</Say>,
    },
    {
      id: 'p2-shock-2',
      icon: 'productivity',
      title: 'Move 2: output grows',
      highlight: 'none',
      highlightWhy: why,
      body: ch == null ? (
        <Say>This scenario is not yet solved for the foreign-capital case chosen above.</Say>
      ) : grows ? (
        <Say>Then output grows: productivity is higher (an input) and the economy holds more capital (the model&rsquo;s response).</Say>
      ) : (
        <Say>Then output ends {dirWord(ch.gdp)} the forecast path, once productivity, capital and hours have responded.</Say>
      ),
    },
  ];
}

// The GDP canvas: three steps, then the headline step (Part2.jsx). Item 30
// (Vahid: "what is the animation before this? ... as soon as I scroll a
// bit, it changes"): the record (growth, state 1) is a step of its own,
// held like any other; the change to the gap (state 2) runs across the
// second step, linked to the scroll (MorphChart scrub, Scrolly
// stepProgress); then the scenarios (MORPH_STATES are the states each
// card settles in; MORPH_SCRUB the card whose change is scrubbed).
export const MORPH_STATES = [1, 2, 4, 4];
export const MORPH_SCRUB = 1;
export function morphCardSteps(sid, cl) {
  const dir = scenarioDir(cl);
  const rel = dir === 'gapDown' ? 'falls below' : dir === 'gapUp' ? 'rises above' : 'moves against';
  return [
    {
      id: 'p2-morph-1',
      icon: 'gdp',
      title: 'GDP growth, the record and the forecast',
      highlight: ['ons', 'obr'],
      body: (
        <Say>
          This is GDP growth, % a year: the <Key id="ons">ONS record</Key>, then <Key id="obr">the OBR&rsquo;s forecast</Key>.
        </Say>
      ),
    },
    {
      id: 'p2-morph-2',
      icon: 'path',
      title: 'The axis switches from growth to a gap',
      highlight: ['path', `scen-${sid}`],
      body: (
        <Say>
          The axis turns to a gap against the OBR’s central forecast path, which includes its own AI. <Key id={`scen-${sid}`}>{SCEN_NAME[sid]}</Key> {rel} it from {SURPRISE_YEAR}.
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
                The UK scenarios join below <Key id="scen-korinek">Korinek et al., substantial (US)</Key>: a larger shock means a higher line.
              </>
            ) : (
              <>
                The other scenarios join: a larger shock means a higher line. <Key id="scen-korinek">Korinek et al., substantial (US)</Key> is highest.
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
          {/* the rule switch first (Maria's round, M1), as the step's note;
              the step's one sentence is where gains peak, and why */}
          <Note>Here the government passes the shock&rsquo;s budget gain or cost to households as transfers, so debt stays on the forecast path.</Note>
          <Say>{whoLead() ?? 'Gains and losses differ by birth year.'}</Say>
          {cohortNotice() ? <Say>{cohortNotice()}</Say> : null}
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
            {dip ? `; those entering just after ${COHORT_YEAR} gain least` : ''}.
          </Say>
        </>
      ),
    },
  ];
}

// The GDP scene's closing line (story-finding-titles-fable.md: the title
// now says every scenario ends above or below the path, the step says
// which ends nearest and furthest): how the other foreign-capital case
// moves every gap, and that none is a forecast. The case not shown has
// every gap smaller (no foreign capital) or larger (some), in every
// scenario and year after the surprise; otherwise the plain reminder.
export const MORPH_FALLBACK = 'These are scenarios against a forecast, not forecasts.';
export function morphAnswer(cl) {
  const other = cl === CENTRAL ? BOUND : CENTRAL;
  const from = YEARS.indexOf(SURPRISE_YEAR) + 1;
  const pairs = SCENARIOS.map((s) => [series(s.id, 'tfp', cl, 'Y'), series(s.id, 'tfp', other, 'Y')]);
  if (pairs.some(([a, b]) => !a || !b)) return MORPH_FALLBACK;
  // zk0 (no foreign capital) below zk0.1 (some) in every scenario and year
  const lower = pairs.every(([a, b]) => {
    const [zk01, zk0] = cl === CENTRAL ? [a, b] : [b, a];
    return zk01.slice(from).every((v, i) => zk0[from + i] < v);
  });
  if (!lower) return MORPH_FALLBACK;
  // say only what is tested: the GDP gap (review round 1, R1-01: the pay
  // gap is larger in size with no foreign capital)
  return cl === CENTRAL ? 'With no foreign capital the GDP gap is smaller in every scenario; none is a forecast.' : 'With some foreign capital the GDP gap is larger in every scenario; none is a forecast.';
}

// The generations scene's first step after the rule switch (review
// round 2, wealth by age; C1 note on p2-who-0): where gains peak, then why,
// each clause gated on the data of the scene's cell. "Around retirement
// age" needs the adult peak at 60 to 70, else "around age N"; "older
// adults hold more wealth" needs wealth at the peak age above the adult
// mean (wealth_by_age, through lib/dataKeys.js; it rises to age 99, so no
// peak is implied); "earn the higher return on it" needs capital income
// to be a source of the gain (sources_alive.capital > 0). null when the
// peak is not a gain.
export function whoLead() {
  const c = welfareCell();
  const xs = COHORTS.closures[CENTRAL].birth_year;
  const age = peakAge();
  const i = xs.indexOf(COHORT_YEAR - age);
  if (!(c.cev_all[i] > 0)) return null;
  const where = age >= 60 && age <= 70 ? 'around retirement age' : `around age ${age}`;
  const wealth = (wealthRatioAt(COHORTS.closures[CENTRAL], age) ?? 0) > 1;
  const ret = c.sources_alive?.capital > 0;
  const why = wealth && ret ? 'older adults hold more wealth and earn the higher return on it' : wealth ? 'older adults hold more wealth' : ret ? 'older adults earn the higher return on capital' : null;
  return (
    <>
      Gains are largest {where}
      {why ? (
        <>
          ; <Key id="cohort-adults">{why.slice(0, 'older adults'.length)}</Key>
          {why.slice('older adults'.length)}
        </>
      ) : null}
      .
    </>
  );
}

// The year the fiscal cost moves to government consumption in the
// cohort runs: the year after the last year households are charged (the
// last key of c_gap; item-21-fable.md: "from 2036", not "after").
export const debtRuleYear = () => {
  const ks = Object.keys(welfareCell().c_gap ?? {}).map(Number).filter(Number.isFinite);
  return ks.length ? Math.max(...ks) + 1 : null;
};

// What the gain is made of (Maria's point 4, gated per cell: item-21-fable
// row 5 and item-18-fable "All 12 cells"): every birth year gains only
// where the smallest change over all birth years is at least 0.005%;
// "mostly from bequests" needs bequests over half the adults' average,
// "consumption changes little" its part under a fifth of it in size. In
// the loss state, the losing birth years (item 18's L3a). null when the
// cell is missing.
export function gainWords() {
  const c = welfareCell();
  if (!c?.cev_all?.length) return null;
  const xs = COHORTS.closures[CENTRAL].birth_year;
  const min = Math.min(...c.cev_all);
  const p = c.parts_alive;
  const avg = c.alive_avg;
  if (min >= 0.005) {
    const beq = p && avg > 0 && p.bequests / avg > 0.5;
    const little = p && avg > 0 && Math.abs(p.consumption) / avg < 0.2;
    const made = beq && little ? ', mostly from the value the model puts on bequests; consumption changes little' : beq ? ', mostly from the value the model puts on bequests' : '';
    return { state: 'gain', text: `Every birth year gains on average as modelled${made}.` };
  }
  if (min < 0) {
    const lose = c.cev_all.map((v, i) => (v < 0 ? i : -1)).filter((i) => i >= 0);
    const from = xs[lose[0]];
    const to = xs[lose.at(-1)];
    const oneRun = lose.length === lose.at(-1) - lose[0] + 1;
    const x = Math.abs(min).toFixed(2);
    const by = x === '0.00' ? '' : `, by up to ${x}%`;
    return { state: 'loss', text: oneRun ? `Some birth years lose on average as modelled: those born ${from}–${to}${by}.` : `Some birth years lose on average as modelled${by}.` };
  }
  return null;
}

// The generations scene's closing line (Maria's point 4): what the gain is
// made of (gainWords). The note under it (whoNote) says where the cost
// falls from the debt rule's year, and who loses if transfers carry it
// on (dnfull, "about one in six").
export function whoAnswer() {
  return gainWords()?.text ?? null;
}
// The scene's note (check_text: one block at most 25 words): where the
// cost falls from the debt rule's year, and who loses if transfers carry
// it on (dnfull, "about one in six").
export function whoNote() {
  const yr = debtRuleYear();
  if (!yr) return null;
  const w = welfareWords();
  const lose = w?.lose ? `; if transfers bear it, ${w.lose} adults lose` : '';
  return `From ${yr} the cost falls on government consumption, which model households do not value${lose}.`;
}
