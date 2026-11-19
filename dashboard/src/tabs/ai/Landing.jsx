'use client';

import Icon from '@/components/ab/Icon.jsx';
import { InfoTip, TipTarget } from '@/components/ab/Tip.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { StatTile } from '@/components/ui/Card.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { METHOD, MEASURE } from '@/lib/labels.js';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, FIRST_YEAR, LATE_YEAR, CENTRAL, BOUND, ARMS, YEARS, SCEN_NAME as NAME, gap, fmt, result, DONE, TOTAL, foreignShareOf, PENDING,
} from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { Items } from '@/components/story/Items.jsx';
import { payCaveat, payWords, fracWord } from '@/tabs/story/part2/caveats.js';
import { ADOPTION, ADOPTION_YEAR, SIGN_CAVEAT, breakEven, pctRange, signMayFlip, tfpInput } from '@/lib/obrOverlap.js';
import { iconFor } from '@/lib/concepts.js';
import { dirConcept, dirWord } from '@/tabs/story/part2/dir.js';
import { A } from '@/tabs/story/part2/sources.jsx';
import { URLS } from '@/tabs/ai/links.js';

// The headline: the question, a one-line answer built from the data, three
// headline figures for the chosen scenario's main arm (automation +
// productivity, headline year) at the closure chosen in the header, then
// the one why line.
// The story (tabs/story) places these; it is the one home of the three
// headline figures. A three-row ledger (headline-tiles-fable.md section 2):
// the label left (the hero's three names, word for word), the value right
// in neutral ink (the sign carries the direction), one note under each.
// The number counts up once when first seen (CountUp keeps the exact value
// in the DOM).

const KPIS = [
  {
    v: 'Y',
    concept: 'gdp',
    title: MEASURE.Y.name,
    line: 'everything produced in the UK',
    tip: `${MEASURE.Y.def} The figure is a gap in the level ${HEADLINE_YEAR - SURPRISE_YEAR + 1} years on, not a growth rate.`,
  },
  {
    v: 'w',
    concept: 'pay',
    title: MEASURE.w.name,
    // one line of at most six words (item 7): from the data (payLine)
    line: null,
    tip: MEASURE.w.def,
  },
  {
    // national income leads as NNI (Maria's point 2), GNI beside it
    v: 'NNI',
    concept: 'gni',
    title: MEASURE.NNI.name,
    line: null,
    tip: null,
  },
];

const sideWord = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
const OTHER = { above: 'below', below: 'above', on: 'off' };

// The sign caveat on a direction (obr-overlap-fable.md, "Direction chips";
// lib/obrOverlap.js signMayFlip): one sentence, or null where the sign
// survives netting the OBR's own AI productivity. `be`: the amount netted
// that takes the gap to zero, two decimals.
export function signCaveat(sid, cl, v) {
  if (!signMayFlip(sid, cl, v)) return null;
  const x = gap(sid, 'tfp', cl, v);
  const be = breakEven(sid, cl, v);
  const net = be != null && be <= (tfpInput(sid) ?? 0) + 1e-9 ? ` once ${be.toFixed(2)}% or more of the productivity input is netted` : '';
  return `Its sign depends on the productivity gain: the forecast path already has about ${pctRange(ADOPTION)} of AI productivity by year ${ADOPTION_YEAR}, and the gap turns ${OTHER[sideWord(x)]} the path${net} (see “technology unchanged”).`;
}

// National income's tile, shared by the hero and the ledger: NNI's line,
// GNI beside it ("before depreciation"), and the tip, sign-aware (Maria's
// point 2; review round 1, Fable's note: NNI's gap can be the larger, so
// nothing says which is smaller). null while NNI is pending.
export function incomeNotes(sid, cl) {
  const n = gap(sid, 'tfp', cl, 'NNI');
  if (n == null) return null;
  const g = gap(sid, 'tfp', cl, 'GNI');
  const fs = cl === CENTRAL ? foreignShareOf(result(sid, 'tfp', CENTRAL)) : null;
  const tip = [
    MEASURE.NNI.def,
    cl === BOUND ? 'With no foreign capital, the income paid abroad is the interest to gilt holders abroad.' : 'With some foreign capital, the income paid abroad goes to owners abroad of UK capital and gilts.',
    fs != null ? `About ${Math.round(fs)}% of the extra capital is owned abroad, with openness at OG-Core’s US default, chosen by the study.` : null,
    g != null && sideWord(g) !== sideWord(n) ? `Before depreciation (GNI) it is ${sideWord(g) === 'on' ? 'on' : sideWord(g)} the forecast path; after it, ${sideWord(n) === 'on' ? 'on it' : sideWord(n)}.` : null,
    signCaveat(sid, cl, 'NNI'),
  ]
    .filter(Boolean)
    .join(' ');
  return {
    line: 'income kept after wear and tear',
    beside: g == null ? null : { v: 'GNI', x: g, label: 'Before depreciation (GNI):' },
    tip,
  };
}

// The tile's one sub-line (at most six words): the pay line from the data
// (payLine: "slower growth, not a cut" only while pay still rises every
// year), national income's from incomeNotes, the others fixed.
const KPI_LINE = (k, sid, cl, x) => (k.v === 'w' ? payWords(sid, cl, x) : k.v === 'NNI' ? incomeNotes(sid, cl)?.line : k.line);
const KPI_TIP = (k, sid, cl) => (k.v === 'NNI' ? incomeNotes(sid, cl)?.tip : k.tip);

// The directions in words: GDP and pay against the path, then national
// income (NNI): "gains less than GDP" where both are above the path and
// NNI's gap is the smaller, else its own side. Sign-aware throughout.
const niWords = (y, n) => (n == null ? null : y > 0.005 && n > 0.005 && n < y ? 'national income gains less than GDP' : `national income is ${sideWord(n) === 'on' ? 'on the forecast path' : `${sideWord(n)} it`}`);
export function heroAnswer(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const n = gap(sid, 'tfp', cl, 'NNI');
  if (y == null || w == null) return 'This scenario is not solved yet for the foreign-capital case chosen above.';
  const rel = sideWord;
  const ni = niWords(y, n);
  const pay = `the pay rate is ${rel(w)} it${rel(w) === rel(y) ? ' too' : ''}`;
  return `In this scenario, GDP is ${rel(y)} the forecast path in ${HEADLINE_YEAR}, ${pay}${ni ? `, and ${ni}` : ''}.`;
}

// The same answer as icon items (the text rule): each direction's arrow
// from the sign of the figure it describes (dirConcept, as the tiles'),
// then the sign caveat where a direction may not survive netting the OBR's
// own AI productivity.
export function heroItems(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const n = gap(sid, 'tfp', cl, 'NNI');
  if (y == null || w == null) return [{ icon: 'provisional', text: 'This scenario is not solved yet for the foreign-capital case chosen above' }];
  const out = [
    { icon: dirConcept(y), text: `GDP is ${dirWord(y)} the forecast path in ${HEADLINE_YEAR}` },
    { icon: dirConcept(w), text: `The pay rate is ${dirWord(w)} it${dirWord(w) === dirWord(y) ? ' too' : ''}` },
  ];
  const ni = niWords(y, n);
  if (ni) out.push({ icon: ni.includes('gains less') ? 'gni' : dirConcept(n), text: `${ni[0].toUpperCase()}${ni.slice(1)}` });
  const may = [['Y', MEASURE.Y.name], ['NNI', MEASURE.NNI.name.toLowerCase()]].filter(([v]) => signMayFlip(sid, cl, v)).map(([, name]) => name);
  if (may.length) out.push({ icon: 'caveat', text: `The direction of ${may.join(' and ')} ${SIGN_CAVEAT}` });
  return out;
}

const ENTRIES = [
  { sub: 'income', icon: 'path', title: 'Year by year', text: `How national income and GDP build up from ${FIRST_YEAR} to ${HEADLINE_YEAR}, in three versions.` },
  { sub: 'economy', icon: 'capital', title: 'Inside the economy', text: 'Consumption, investment, capital, labour, the interest rate and the labour share.' },
  { sub: 'finances', icon: 'finances', title: 'Public finances', text: 'Debt and tax as shares of GDP, and why the tax effect is likely understated.' },
];

// The pieces of the former Results > Summary, placed by the story: the
// question and answer open the story (Hero), the tiles and the reasons sit
// in part 2. Each reads the header scenario and closure.
function useSummary(sid) {
  const { st } = useNav();
  const cl = primaryClosure(st.closure);
  const both = st.closure === 'both';
  return {
    cl,
    both,
    sidPending: ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done'),
  };
}

export function SummaryQuestion({ sid, titleId = 'summary-q' }) {
  const { cl } = useSummary(sid);
  return (
    <div className="hero">
      <h2 id={titleId} className="hero-q">
        <span className="hero-q-lead">AI is already here.</span> <span className="hero-q-main">What if, from {SURPRISE_YEAR}, it takes on more work than the OBR expects?</span>
      </h2>
      <Items className="hero-a hero-items" items={heroItems(sid, cl)} />
      <p className="hero-meta">
        {NAME[sid]} scenario{sid === 'korinek' ? ', the upper case' : ''}, {cl === BOUND ? 'no foreign capital' : 'some foreign capital'}, {HEADLINE_YEAR}, against the OBR&rsquo;s central forecast path, as run in <A href={URLS.ogUk}>OG-UK</A>. {SURPRISE_YEAR} is a modelling choice, not a forecast
        <InfoTip label="What is the forecast path?">
          OG-UK&rsquo;s path, set to the OBR&rsquo;s central forecast, which already includes the OBR&rsquo;s own assumption about AI (<A href={`${URLS.obrBp9}#page=51`}>Briefing paper No.9, &para;B.14</A>
          ). It grows at the OBR&rsquo;s 1% a year medium-term productivity rate (<A href={URLS.obrEfo}>Economic and fiscal outlook, March 2026</A>) and matches its 2030 debt/GDP. {overlapTip(sid)} It is defined under {METHOD.shock.label} on Method.
        </InfoTip>
      </p>
    </div>
  );
}

export function HeadlineTiles({ sid }) {
  const { cl, both, sidPending } = useSummary(sid);
  const inc = incomeNotes(sid, cl);
  // a second sub-line, where a caveat belongs to one tile: the pay caveat
  // (Maria's point 3, payCaveat), GNI beside national income, and the sign
  // caveat where a direction may not survive netting the OBR's own AI
  // productivity (obr-overlap-fable.md); the full sentences are in the tips
  const flipNote = (v) => (signMayFlip(sid, cl, v) ? `Its sign ${SIGN_CAVEAT}` : null);
  const extra = {
    Y: [flipNote('Y')],
    w: [payCaveat(sid)],
    NNI: [
      inc?.beside ? (
        <>
          {inc.beside.label} <b data-path={`results.${sid}.tfp.${cl}.gaps.GNI.${HEADLINE_YEAR}`}>{fmt(inc.beside.x)}</b>
        </>
      ) : null,
      flipNote('NNI'),
    ],
  };
  return (
    <>
      <div className="stat-row">
        {KPIS.map((k) => {
          const x = gap(sid, 'tfp', cl, k.v);
          const b = both ? gap(sid, 'tfp', BOUND, k.v) : null;
          return (
            <StatTile
              key={k.v}
              // the GDP scene's step card holds one icon (the step's): the
              // definition opens from the name itself, no tile icon
              name={
                <TipTarget className="p2-tile-name" label={`What is ${k.title}?`} tip={<span>{KPI_TIP(k, sid, cl)}</span>}>
                  {k.title}
                </TipTarget>
              }
              value={
                <span data-path={`results.${sid}.tfp.${cl}.gaps.${k.v}.${HEADLINE_YEAR}`}>
                  <CountUp value={fmt(x)} />
                </span>
              }
              sub={KPI_LINE(k, sid, cl, x)}
            >
              {(extra[k.v] ?? []).filter(Boolean).map((line, i) => (
                <p key={i} className="stat-line p2-tile-note">
                  {line}
                </p>
              ))}
              {both ? (
                <p className="stat-line">
                  With no foreign capital: <b data-path={`results.${sid}.tfp.${BOUND}.gaps.${k.v}.${HEADLINE_YEAR}`}>{fmt(b)}</b>
                </p>
              ) : null}
            </StatTile>
          );
        })}
      </div>
      {DONE < TOTAL && sidPending ? (
        <Notice>
          {DONE} of {TOTAL} solves are done. {result(sid, 'tfp', CENTRAL).status === 'done' ? `For this scenario the no-foreign-capital results are ${PENDING}.` : `This scenario is ${PENDING}.`}
        </Notice>
      ) : null}
    </>
  );
}

// Consumption (Maria's point 6; review round 1, Fable's note: not "below
// for years" everywhere), from gaps.C for the cell in view, by year from
// the shock: the run of years below the path that starts at the shock,
// and the headline year's value beside GDP's. The reason (households save
// more as the return on capital rises) only where the interest rate is up
// in the headline year and investment is up in the shock year. null when
// pending or when consumption starts on or above the path.
export function consumptionWords(sid, cl) {
  const ys = YEARS.filter((y) => y >= SURPRISE_YEAR);
  const c = ys.map((y) => gap(sid, 'tfp', cl, 'C', y));
  if (c.some((x) => x == null) || !(c[0] < -0.005)) return null;
  let k = 0;
  while (k < c.length && c[k] < -0.005) k += 1;
  const end = ys[k - 1];
  const cH = gap(sid, 'tfp', cl, 'C');
  const yH = gap(sid, 'tfp', cl, 'Y');
  const r = gap(sid, 'tfp', cl, 'r_bp');
  const inv = gap(sid, 'tfp', cl, 'I', SURPRISE_YEAR);
  const why = r != null && r > 0 && inv != null && inv > 0 ? 'Households save more as the return on capital rises.' : null;
  const gdp = yH != null && yH > 0.005 ? `, while GDP is ${fmt(yH)}` : '';
  let head;
  if (end >= HEADLINE_YEAR) {
    head = `Consumption stays below the forecast path through ${end}: ${fmt(cH)} in ${HEADLINE_YEAR}${gdp}.`;
  } else {
    head = `Consumption is below the forecast path from ${SURPRISE_YEAR} to ${end}, then ${cH > 0.005 ? 'above it' : 'about on it'}: ${fmt(cH)} in ${HEADLINE_YEAR}.`;
  }
  return { head, why: why && end < HEADLINE_YEAR ? `At first, h${why.slice(1)}` : why, end, cH };
}
export function ConsumptionLine({ sid }) {
  const { cl } = useSummary(sid);
  const w = consumptionWords(sid, cl);
  if (!w) return null;
  return (
    <p className="p2-note p2-consumption" data-claim="consumption">
      {/* the headline-year value carries its data path (check_numbers) */}
      {w.head.slice(0, w.head.indexOf(fmt(w.cH)))}
      <span data-path={`results.${sid}.tfp.${cl}.gaps.C.${HEADLINE_YEAR}`}>{fmt(w.cH)}</span>
      {w.head.slice(w.head.indexOf(fmt(w.cH)) + fmt(w.cH).length)}
      {w.why ? ` ${w.why}` : ''}
    </p>
  );
}

// The forecast path's tip, on the overlap (obr-overlap-fable.md, Landing
// tooltip): the labour-share shift is all extra; the productivity gain is
// not. Every figure from lib/obrOverlap.js and the data.
export function overlapTip(sid) {
  const t = tfpInput(sid);
  const r = pctRange(ADOPTION);
  if (t == null || !r) return 'The labour-share shift is extra to that path; the productivity gain is not all extra.';
  return `The labour-share shift is extra to that path. The productivity gain is not all extra: the path already has about ${r} by year ${ADOPTION_YEAR}, against +${t.toFixed(1)}% in ${NAME[sid]}.`;
}

// Public debt in the main arm at the late year, in words: its side of the
// path, why (the model reprices all debt at once at the higher interest
// rate, where that rate is above the path), and what the OBR's slower
// repricing gives (debt_gdp_pp_obr_repricing_late, Method's "How debt is
// repriced"). Words only: the figures are on Explore > Public finances.
// null when pending.
const side = sideWord;
// How many times one gap is another, in words: "about four", "over
// three"; null under one and a half.
const TIMES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function timesWord(k) {
  if (!(k >= 1.5)) return null;
  if (k > 10.5) return 'more than ten times';
  const n = Math.round(k);
  return `${Math.abs(k - n) < 0.15 ? 'about' : k > n ? 'over' : 'nearly'} ${TIMES[n]} times`;
}
// Public debt in the main arm at the late year, in words, the OBR-pace
// result first (Maria's point 5): its side of the path at the OBR's
// repricing pace (debt_gdp_pp_obr_repricing_late, Method's "How debt is
// repriced"), then, in plain words, the model's own, where all debt pays
// the higher rate at once. Sign-aware: where the two sides differ (UK high
// and Korinek end below the path at the OBR's pace), each side is named.
// Words only: the figures are on Explore > Public finances. null when
// pending. `text` and `slow` keep the model-first parts for Morph's notes.
export function debtParts(sid, cl) {
  const d = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  if (d == null) return null;
  const r = gap(sid, 'tfp', cl, 'r_bp', LATE_YEAR);
  const obr = result(sid, 'tfp', cl).debt_gdp_pp_obr_repricing_late;
  const why = d > 0.005 && r != null && r > 0 ? ' if repriced at once' : '';
  let slow = null;
  if (Number.isFinite(obr) && side(obr) !== side(d)) slow = `it ends ${side(obr)} the forecast path`;
  else if (Number.isFinite(obr) && d > 0.005 && obr < d) {
    const k = obr / d;
    slow = `the gap is ${k < 0.2 ? 'under a fifth' : (fracWord(k) ?? 'smaller')}${fracWord(k) || k < 0.2 ? ' as large' : ''}`;
  }
  // the OBR pace first, then the model's at-once repricing
  let lead = null;
  let atOnce = null;
  if (Number.isFinite(obr)) {
    lead = `ends ${side(obr)} the forecast path in ${LATE_YEAR}`;
    const once = 'in the model, all debt pays the higher rate at once';
    if (side(obr) !== side(d)) atOnce = `${once}, and it ends ${side(d)} the path`;
    else if (d > 0.005 && obr > 0.005 && timesWord(d / obr)) atOnce = `${once}, and the gap is ${timesWord(d / obr)} as large`;
    else if (d > 0.005 && obr > 0.005 && d > obr) atOnce = `${once}, and the gap is larger`;
  } else {
    lead = `ends ${side(d)} the forecast path in ${LATE_YEAR}`;
    if (why) atOnce = 'in the model, all debt pays the higher rate at once';
  }
  return { text: ` ends ${side(d)} the forecast path in ${LATE_YEAR}${why}`, slow, obrPace: Number.isFinite(obr), lead, atOnce, d, obr: Number.isFinite(obr) ? obr : null };
}
export function debtLine(sid, cl) {
  const p = debtParts(sid, cl);
  if (!p) return null;
  return `${p.obrPace ? 'At the OBR’s repricing pace, public debt' : 'Public debt'} ${p.lead}${p.atOnce ? `; ${p.atOnce}` : ''}`;
}

// Under the tiles: the one line on public debt (its words from
// debtParts, the OBR pace first), linking its homes: Explore > Public
// finances and Method's repricing card.
export function SummaryWhy({ sid }) {
  const { cl } = useSummary(sid);
  const p = debtParts(sid, cl);
  if (!p) return null;
  return (
    <p className="p2-note p2-why">
      <DebtWords p={p} />.
    </p>
  );
}
function DebtWords({ p }) {
  return (
    <>
      {p.obrPace ? (
        <>
          At the{' '}
          <NavLink tab="method" sub="how" anchor="m-debt">
            OBR&rsquo;s repricing pace
          </NavLink>
          ,{' '}
          <NavLink tab="explore" sub="finances" anchor="public-finances">
            public debt
          </NavLink>
        </>
      ) : (
        <NavLink tab="explore" sub="finances" anchor="public-finances">
          Public debt
        </NavLink>
      )}{' '}
      {p.lead}
      {p.atOnce ? `; ${p.atOnce}` : ''}
    </>
  );
}

// The GDP scene's one debt line (voice pass, item 7; Maria's point 5):
// under the scene's closing caption, in its frame, the OBR-pace result
// first, then the model's at-once repricing in plain words. It also holds
// the scene's one "More on Explore" link.
export function DebtNote({ sid, cl }) {
  const p = debtParts(sid, cl);
  if (!p) return null;
  // the OBR-pace result only (check_text: a block of at most 25 words);
  // the model's at-once repricing follows under the headline ledger
  // (DebtOnce)
  return (
    <>
      {p.obrPace ? 'At the OBR’s repricing pace, public debt' : 'Public debt'} {p.lead}.{' '}
      <NavLink tab="explore" sub="finances" anchor="public-finances">
        More on Explore
      </NavLink>
    </>
  );
}
// The second half of the debt line (Maria's point 5: the at-once repricing
// second, in plain words), under the headline ledger. null where there is
// nothing to add.
export function DebtOnce({ sid }) {
  const { cl } = useSummary(sid);
  const p = debtParts(sid, cl);
  if (!p?.atOnce) return null;
  return (
    <p className="p2-note p2-debt-once" data-claim="debt-once">
      {`${p.atOnce[0].toUpperCase()}${p.atOnce.slice(1)}.`}
    </p>
  );
}

export function GoDeeper() {
  return (
    <>
      <h3 className="entries-title">Go deeper</h3>
      <div className="entry-grid">
        {ENTRIES.map((e) => (
          <NavLink key={e.sub} tab="explore" sub={e.sub} className="entry-card">
            <span className="entry-head">
              <Icon name={iconFor(e.icon)} size={20} />
              <span className="entry-title">{e.title}</span>
              <Icon name="arrowRight" size={16} strokeWidth={2} className="entry-arrow" />
            </span>
            <span className="entry-text">{e.text}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
}
