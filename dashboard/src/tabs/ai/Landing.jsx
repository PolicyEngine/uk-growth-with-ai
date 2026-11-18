'use client';

import Icon from '@/components/ab/Icon.jsx';
import { InfoTip, TipTarget } from '@/components/ab/Tip.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { StatTile } from '@/components/ui/Card.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, FIRST_YEAR, LATE_YEAR, CENTRAL, BOUND, ARMS, SCEN_NAME as NAME, gap, fmt, payLine, result, DONE, TOTAL, foreignShareOf,
} from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { Items } from '@/components/story/Items.jsx';
import { paySigns, fracWord } from '@/tabs/story/part2/caveats.js';
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
    title: 'GDP',
    line: 'everything produced in the UK',
    tip: `Gross domestic product: the value of everything produced in the UK, including by foreign-owned capital. The figure is a gap in the level ${HEADLINE_YEAR - SURPRISE_YEAR + 1} years on, not a growth rate.`,
  },
  {
    v: 'w',
    concept: 'pay',
    title: 'Pay rates',
    // one line of at most six words (item 7): from the data (payLine)
    line: null,
    tip: 'Pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs.',
  },
  {
    v: 'GNI',
    concept: 'gni',
    title: 'National income',
    line: 'GDP less net income paid abroad',
    tip: 'Gross national income (GNI): GDP plus the UK’s income from abroad, less income paid abroad to owners of UK capital and holders of UK government debt.',
  },
];

// The tile's one sub-line (at most six words): the pay line from the data
// (payLine: "slower growth, not a cut" only while pay still rises every
// year), the others fixed.
const KPI_LINE = (k, sid, cl, x) => (k.v === 'w' ? payLine(sid, cl, x) : k.line);

export function heroAnswer(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return 'This scenario is not solved yet for the foreign-capital case chosen above.';
  const rel = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
  const keep = g != null && y > 0 && g < y ? ', and national income gains less than GDP' : '';
  const pay = `pay rates are ${rel(w)} it${rel(w) === rel(y) ? ' too' : ''}`;
  return `In this scenario, GDP is ${rel(y)} the forecast path in ${HEADLINE_YEAR}, ${pay}${keep}.`;
}

// The same answer as icon items (the text rule): each direction's arrow
// from the sign of the figure it describes (dirConcept, as the tiles').
export function heroItems(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return [{ icon: 'provisional', text: 'This scenario is not solved yet for the foreign-capital case chosen above' }];
  const out = [
    { icon: dirConcept(y), text: `GDP is ${dirWord(y)} the forecast path in ${HEADLINE_YEAR}` },
    { icon: dirConcept(w), text: `Pay rates are ${dirWord(w)} it${dirWord(w) === dirWord(y) ? ' too' : ''}` },
  ];
  if (g != null && y > 0 && g < y) out.push({ icon: 'gni', text: 'National income gains less than GDP' });
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
          ). It grows at the OBR&rsquo;s 1% a year medium-term productivity rate (<A href={URLS.obrEfo}>Economic and fiscal outlook, March 2026</A>) and matches its 2030 debt/GDP. Every figure here is extra AI beyond it, not against no AI. It is defined under {METHOD.shock.label} on Method.
        </InfoTip>
      </p>
    </div>
  );
}

export function HeadlineTiles({ sid }) {
  const { cl, both, sidPending } = useSummary(sid);
  const fs = foreignShareOf(result(sid, 'tfp', CENTRAL));
  const g = gap(sid, 'tfp', cl, 'GNI');
  const y = gap(sid, 'tfp', cl, 'Y');
  const flips = paySigns(sid) === 'flips';
  // a second sub-line, where a caveat belongs to one tile (the pay sign);
  // the foreign share of the extra capital is in the GNI tile's definition
  const share =
    cl === CENTRAL && fs != null && g != null && y != null && g < y
      ? ` About ${Math.round(fs)}% of the extra capital is owned abroad, with openness at OG-Core’s US default, chosen by the study.`
      : '';
  // the pay tile keeps a short visible form of its caveat (voice pass): a
  // number whose sign can flip does not hide it; the full caveat is in the
  // GDP figure's notes (part2/Morph.jsx, morphGroups)
  const extra = { w: flips ? 'positive with more foreign capital' : null };
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
                <TipTarget className="p2-tile-name" label={`What is ${k.title}?`} tip={<span>{k.tip}{k.v === 'GNI' ? share : ''}</span>}>
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
              {[extra[k.v]].flat().filter(Boolean).map((line, i) => (
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
          {DONE} of {TOTAL} solves are done. For this scenario the no-foreign-capital results are not solved yet and show “pending”.
        </Notice>
      ) : null}
    </>
  );
}

// Public debt in the main arm at the late year, in words: its side of the
// path, why (the model reprices all debt at once at the higher interest
// rate, where that rate is above the path), and what the OBR's slower
// repricing gives (debt_gdp_pp_obr_repricing_late, Method's "How debt is
// repriced"). Words only: the figures are on Explore > Public finances.
// null when pending.
const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
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
  return { text: ` ends ${side(d)} the forecast path in ${LATE_YEAR}${why}`, slow };
}
export function debtLine(sid, cl) {
  const p = debtParts(sid, cl);
  return p ? `Public debt${p.text}${p.slow ? `; at the OBR’s repricing pace, ${p.slow}` : ''}` : null;
}

// Under the tiles: the one line on public debt (its words from
// debtParts), linking its homes: Explore > Public finances and Method's
// repricing card.
export function SummaryWhy({ sid }) {
  const { cl } = useSummary(sid);
  const p = debtParts(sid, cl);
  if (!p) return null;
  return (
    <p className="p2-note p2-why">
      <NavLink tab="explore" sub="finances" anchor="public-finances">
        Public debt
      </NavLink>
      {p.text}
      {p.slow ? (
        <>
          ; at the{' '}
          <NavLink tab="method" sub="how" anchor="m-debt">
            OBR&rsquo;s repricing pace
          </NavLink>
          , {p.slow}
        </>
      ) : null}
      .
    </p>
  );
}

// The GDP scene's one debt line (voice pass, item 7): under the scene's
// closing caption, in its frame; it is also the scene's one "More on
// Explore" link. "If repriced at once" stays with it: at the OBR's pace debt
// ends below the path in two scenarios.
// The OBR-pace clause, with its link to Method, is in the GDP figure's
// notes (part2/Morph.jsx, morphGroups).
export function DebtNote({ sid, cl }) {
  const p = debtParts(sid, cl);
  if (!p) return null;
  return (
    <>
      Public debt{p.text}.{' '}
      <NavLink tab="explore" sub="finances" anchor="public-finances">
        More on Explore
      </NavLink>
    </>
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
