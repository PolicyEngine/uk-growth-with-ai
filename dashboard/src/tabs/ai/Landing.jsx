'use client';

import Icon from '@/components/ab/Icon.jsx';
import { InfoTip, TipTarget } from '@/components/ab/Tip.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { StatTile } from '@/components/ui/Card.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, FIRST_YEAR, LATE_YEAR, CENTRAL, BOUND, ARMS, SCEN_NAME as NAME, gap, fmt, result, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { Items } from '@/components/story/Items.jsx';
import { paySigns, headlineShares, consumptionBelowUntil } from '@/tabs/story/part2/caveats.js';
import { iconFor } from '@/lib/concepts.js';
import { dirConcept, dirWord } from '@/tabs/story/part2/dir.js';
import { A } from '@/tabs/story/part2/sources.jsx';
import { URLS } from '@/tabs/ai/links.js';

// The headline: the question, a one-line answer built from the data, three
// headline figures for the chosen scenario's main arm (automation +
// productivity, headline year) at the closure chosen in the header, then
// the one why line.
// The story (tabs/story) places these; it is the one home of the three
// headline figures. Each tile is a plain icon, a label and a large number
// with an arrow from its sign; the number counts up once when first seen
// (CountUp keeps the exact value in the DOM).

const KPIS = [
  {
    v: 'Y',
    concept: 'gdp',
    title: 'Output (GDP)',
    line: 'Everything produced in the UK',
    tip: 'Gross domestic product: the value of everything produced in the UK, including by foreign-owned capital.',
  },
  {
    v: 'w',
    concept: 'pay',
    title: 'Pay rates',
    line: 'Pay for the same work. Below the path is slower growth than on it, not a cut',
    tip: 'Pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs.',
  },
  {
    v: 'GNI',
    concept: 'gni',
    title: 'Income UK residents keep',
    line: 'Output less what goes to foreign owners (GNI)',
    tip: 'Gross national income: GDP plus the UK’s income from abroad, less income paid to foreign owners of UK capital.',
  },
];

export function heroAnswer(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return 'This scenario is not solved yet at the closure chosen above.';
  const rel = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
  const keep = g != null && y > 0 && g < y ? ', and national income gains less than GDP' : '';
  const pay = `pay rates are ${rel(w)} it${rel(w) === rel(y) ? ' too' : ''}`;
  return `In this scenario, GDP is ${rel(y)} the OBR-central path in ${HEADLINE_YEAR}, ${pay}${keep}.`;
}

// The same answer as icon items (the text rule): each direction's arrow
// from the sign of the figure it describes (dirConcept, as the tiles').
export function heroItems(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return [{ icon: 'provisional', text: 'This scenario is not solved yet at the closure chosen above' }];
  const out = [
    { icon: dirConcept(y), text: `GDP is ${dirWord(y)} the OBR-central path in ${HEADLINE_YEAR}` },
    { icon: dirConcept(w), text: `Pay rates are ${dirWord(w)} it${dirWord(w) === dirWord(y) ? ' too' : ''}` },
  ];
  if (g != null && y > 0 && g < y) out.push({ icon: 'gni', text: 'National income gains less than GDP' });
  return out;
}

const tone = (x) => (x == null || Math.abs(x) < 0.005 ? null : x > 0 ? 'gain' : 'loss');

const ENTRIES = [
  { sub: 'income', icon: 'path', title: 'Year by year', text: `How national income and GDP build up from ${FIRST_YEAR} to ${HEADLINE_YEAR}, in three arms.` },
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
        What happens to the UK economy if AI arrives in {SURPRISE_YEAR}?
      </h2>
      <Items className="hero-a hero-items" items={heroItems(sid, cl)} />
      <p className="hero-meta">
        {NAME[sid]} scenario{sid === 'korinek' ? ', a US upper case' : ''}, {cl === BOUND ? 'closed capital' : 'central closure'}, {HEADLINE_YEAR}, against the OBR-central path: <A href={URLS.ogUk}>OG-UK</A>
        &rsquo;s no-shock path. {SURPRISE_YEAR} is a modelling choice, not a forecast
        <InfoTip label="What is the OBR-central path?">
          The path every figure here is compared with: OG-UK&rsquo;s economy without the shock, growing at the OBR&rsquo;s central medium-term productivity rate (OBR,{' '}
          <A href={URLS.obrEfo}>Economic and fiscal outlook, March 2026</A>). It is defined under {METHOD.shock.label} on Method.
        </InfoTip>
      </p>
    </div>
  );
}

export function HeadlineTiles({ sid }) {
  const { cl, both, sidPending } = useSummary(sid);
  const fs = result(sid, 'tfp', CENTRAL).foreign_share_dK_2031;
  const g = gap(sid, 'tfp', cl, 'GNI');
  const y = gap(sid, 'tfp', cl, 'Y');
  const flips = paySigns(sid) === 'flips';
  // a second sub-line, where a caveat belongs to one tile
  const extra = {
    w: flips ? (
      <>
        Its sign depends on how much capital comes from abroad:{' '}
        <NavLink tab="explore" sub="economy" anchor="explore-part-all">
          each closure
        </NavLink>
      </>
    ) : null,
    GNI:
      cl === CENTRAL && fs != null && g != null && y != null && g < y ? (
        <>
          About {Math.round(fs)}% of the extra capital is owned abroad, with openness at <A href={URLS.ogCoreParams}>OG-Core&rsquo;s US default, chosen by the study</A>
        </>
      ) : null,
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
                <TipTarget className="p2-tile-name" label={`What is ${k.title.toLowerCase()}?`} tip={<span>{k.tip}</span>}>
                  {k.title}
                </TipTarget>
              }
              value={
                <span data-path={`results.${sid}.tfp.${cl}.gaps.${k.v}.${HEADLINE_YEAR}`}>
                  <CountUp value={fmt(x)} />
                </span>
              }
              tone={tone(x)}
              sub={k.line}
            >
              {[extra[k.v]].flat().filter(Boolean).map((line, i) => (
                <p key={i} className="stat-line p2-tile-note">
                  {line}
                </p>
              ))}
              {both ? (
                <p className="stat-line">
                  With closed capital: <b data-path={`results.${sid}.tfp.${BOUND}.gaps.${k.v}.${HEADLINE_YEAR}`}>{fmt(b)}</b>
                </p>
              ) : null}
            </StatTile>
          );
        })}
      </div>
      {DONE < TOTAL && sidPending ? (
        <Notice>
          {DONE} of {TOTAL} solves are done. For this scenario the closed-capital results are not solved yet and show “pending”.
        </Notice>
      ) : null}
    </>
  );
}

// Public debt in the main arm at the late year, in words, and why (as
// Explore > Public finances explains it): the common fiscal rule holds
// spending as a share of GDP, so growth brings no dividend, and the model
// reprices all debt at once at the higher interest rate. The reason only
// where the debt gap and the interest-rate gap are both positive. null when
// pending.
export function debtLine(sid, cl) {
  const d = gap(sid, 'tfp', cl, 'debt_gdp_pp', LATE_YEAR);
  if (d == null) return null;
  const r = gap(sid, 'tfp', cl, 'r_bp', LATE_YEAR);
  const where = Math.abs(d) < 0.005 ? 'ends on the path' : d > 0 ? 'ends above the path' : 'ends below the path';
  const why = d > 0.005 && r != null && r > 0 ? ': spending keeps its share of GDP, and all debt is repriced at once at higher rates' : ', under the common fiscal rule';
  return `Public debt ${where} in ${LATE_YEAR}${why}`;
}

// Under the tiles: household consumption where the cell has it, and one
// line to Explore for what the other two arms add (capital drawn in, net
// national income in words; public debt in the three arms): their figures
// are on Explore > Economy and Public finances. Why the figures move
// (capital's share, output at given inputs) is the shock scene's sentence.
export function SummaryWhy({ sid }) {
  const { cl } = useSummary(sid);
  const sh = headlineShares(sid, cl);
  // one clause on what households spend, where the cell has it (UK central)
  const cBelow = consumptionBelowUntil(sid, cl);
  const debt = debtLine(sid, cl);
  return (
    <div className="p2-why">
      {cBelow ? (
        <p className="p2-why-line">
          Under the common fiscal rule, household consumption stays below the path until{' '}
          <NavLink tab="explore" sub="who" patch={{ wrule: 'common' }}>
            {cBelow}
          </NavLink>
          .
        </p>
      ) : null}
      {sh.capital || sh.nni ? (
        <p className="p2-note">
          {sh.capital ? `Technology unchanged alone gives ${sh.capital} the GDP gain, through capital drawn in` : ''}
          {sh.capital && sh.nni ? '; n' : sh.nni ? 'N' : ''}
          {sh.nni ? `et national income rises ${sh.nni} as much as GDP` : ''}:{' '}
          <NavLink tab="explore" sub="economy">
            Economy
          </NavLink>
          .
        </p>
      ) : null}
      {debt ? (
        <p className="p2-note">
          {debt}:{' '}
          <NavLink tab="explore" sub="finances">
            Public finances
          </NavLink>
          .
        </p>
      ) : null}
    </div>
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
