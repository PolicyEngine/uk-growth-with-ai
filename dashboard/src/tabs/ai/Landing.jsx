'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget, InfoTip } from '@/components/ab/Tip.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { StatTile } from '@/components/ui/Card.jsx';
import CountUp from '@/components/story/CountUp.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, FIRST_YEAR, CENTRAL, BOUND, ARMS, SCENARIOS, SCEN_NAME as NAME, gap, fmt, result, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/lines.js';
import { Items, WhyChain } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { dirConcept, dirWord } from '@/tabs/story/part2/dir.js';
import { A, OG_DEFAULTS, resultUrl } from '@/tabs/story/part2/sources.jsx';
import { URLS } from '@/tabs/ai/links.js';

// The headline: the question, a one-line answer built from the data, three
// headline figures for the chosen scenario's main arm (automation +
// productivity, headline year) at the closure chosen in the header, each
// with the four scenarios on a small range strip, then why and how sure.
// The story (tabs/story) places these; it is the one home of the three
// headline figures. Each tile is a plain icon, a label and a large number
// with an arrow from its sign; the number counts up once when first seen
// (CountUp keeps the exact value in the DOM).

const SHORT = { uk_low: 'Low', uk_central: 'Central', uk_high: 'High', korinek: 'Korinek' };

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
    line: 'What a given amount of work earns, against a path on which pay rises',
    tip: 'The wage rate: pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs. A negative figure is slower growth than on the OBR-central path, not a cut in pay.',
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

// The four scenarios on one line: tooltips only. The scenario is chosen in
// the header, nowhere else.
function RangeBar({ v, sid, title, cl }) {
  const pts = SCENARIOS.map((s) => ({ id: s.id, x: gap(s.id, 'tfp', cl, v) }));
  const done = pts.filter((p) => p.x != null);
  const xs = done.map((p) => p.x);
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const pad = (hi - lo || 1) * 0.1;
  const frac = (x) => ((x - lo + pad) / (hi - lo + 2 * pad)) * 100;
  const pct = (x) => `${frac(x).toFixed(2)}%`;
  const order = [...done].sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const p of order) {
    const last = clusters[clusters.length - 1];
    if (last && frac(p.x) - frac(last[last.length - 1].x) < 2) last.push(p);
    else clusters.push([p]);
  }
  // Names below the track, or above it where they would touch the last
  // name below; widths are estimated in % of a narrow (240px) track, and a
  // name near an end is aligned to that end so it stays inside.
  const names = [];
  const rowEnd = { down: -Infinity, up: -Infinity };
  clusters.forEach((c) => {
    const text = c.map((p) => SHORT[p.id]).join(' · ');
    const w = (text.length * 6.4 * 100) / 240;
    const f = frac(c[0].x);
    const align = f - w / 2 < 0 ? 'start' : f + w / 2 > 100 ? 'end' : 'mid';
    const left = align === 'start' ? f : align === 'end' ? f - w : f - w / 2;
    const row = left >= rowEnd.down + 2 ? 'down' : 'up';
    rowEnd[row] = left + w;
    names.push({ x: c[0].x, up: row === 'up', align, text, on: c.some((p) => p.id === sid) });
  });
  const pending = pts.filter((p) => p.x == null);
  return (
    <div className="kpi-range">
      <p className="kpi-range-title">
        <Icon name={iconFor('range')} size={12} className="p2-tx-icon" />
        The four scenarios
      </p>
      <div className="kpi-range-track">
        <span className="kpi-range-zero" style={{ left: pct(0) }} aria-hidden="true" />
        {done.map((p) => (
          <TipTarget
            key={p.id}
            className={`kpi-range-dot${p.id === sid ? ' is-on' : ''}`}
            style={{ left: pct(p.x) }}
            label={`${NAME[p.id]}, ${title}`}
            tip={
              <>
                <b>{NAME[p.id]}</b>
                <span>
                  {title}, {HEADLINE_YEAR}. Choose it under Scenario at the top for its figure.
                </span>
              </>
            }
          />
        ))}
        {names.map((n) => (
          <span key={n.text} className={`kpi-range-name${n.up ? ' is-up' : ''}${n.on ? ' is-on' : ''} is-${n.align}`} style={{ left: pct(n.x) }} aria-hidden="true">
            {n.text}
          </span>
        ))}
      </div>
      {pending.length ? <p className="kpi-range-pending">Not solved yet at this closure: {pending.map((p) => NAME[p.id]).join(', ')}.</p> : null}
    </div>
  );
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
  return (
    <>
      <div className="stat-row">
        {KPIS.map((k) => {
          const x = gap(sid, 'tfp', cl, k.v);
          const b = both ? gap(sid, 'tfp', BOUND, k.v) : null;
          const dir = dirConcept(x);
          return (
            <StatTile
              key={k.v}
              icon={iconFor(k.concept)}
              name={k.title}
              value={
                <>
                  {dir ? <Icon name={iconFor(dir)} size={22} strokeWidth={2.25} className={`stat-dir is-${dir}`} /> : null}
                  <span data-path={`results.${sid}.tfp.${cl}.gaps.${k.v}.${HEADLINE_YEAR}`}>
                    <CountUp value={fmt(x)} />
                  </span>
                </>
              }
              tone={tone(x)}
              sub={
                <>
                  <Icon name={iconFor('measure')} size={12} className="stat-sub-icon" />
                  {k.line}
                </>
              }
              tip={<InfoTip label={`What is ${k.title.toLowerCase()}?`}>{k.tip}</InfoTip>}
            >
              {both ? (
                <p className="stat-line">
                  <Icon name={iconFor('closure')} size={14} /> With closed capital: <b data-path={`results.${sid}.tfp.${BOUND}.gaps.${k.v}.${HEADLINE_YEAR}`}>{fmt(b)}</b>
                </p>
              ) : null}
              <RangeBar v={k.v} sid={sid} title={k.title} cl={cl} />
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

// Why the headline figures move as they do, as a chain of links for the
// scenario's main arm at closure `cl`: every direction is read from the
// solve's sign (`dir` is the arrow drawn beside the words, and the words say
// the same). Then the qualifiers that must stay visible beside it. null
// when the solve is pending.
export function whyChain(sid, cl, central = cl === CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  const ls = gap(sid, 'tfp', cl, 'labour_share_pp');
  const fs = result(sid, 'tfp', CENTRAL).foreign_share_dK_2031;
  if (y == null) return null;
  const links = [{ key: 'ai', icon: 'ai', text: `AI arrives in ${SURPRISE_YEAR}` }];
  links.push({ key: 'gdp', icon: 'gdp', dir: dirConcept(y), text: `GDP ${dirWord(y)} the path` });
  // capital's share is labour's, the other way round
  if (ls != null) links.push({ key: 'capital', icon: 'capital', dir: dirConcept(-ls), text: `Capital’s share ${dirWord(-ls)} the path (assumed)` });
  if (w != null) links.push({ key: 'pay', icon: 'pay', dir: dirConcept(w), text: `Pay rates ${dirWord(w)} the path` });
  if (g != null) {
    links.push(
      y > 0 && g < y
        ? { key: 'gni', icon: 'gni', text: 'National income gains less than GDP' }
        : { key: 'gni', icon: 'gni', dir: dirConcept(g), text: `National income ${dirWord(g)} the path` },
    );
  }
  const notes = [];
  if (w != null && w < 0) notes.push({ key: 'cut', icon: 'caveat', text: 'Pay: slower growth against a rising path, not a cut' });
  if (ls != null && w != null) notes.push({ key: 'size', icon: 'capital', text: 'How far pay moves depends on how much new capital arrives' });
  if (central && fs != null && g != null && g < y) {
    notes.push({
      key: 'foreign',
      icon: 'foreign',
      text: (
        <>
          About {Math.round(fs)}% of added capital is foreign-owned, from <A href={OG_DEFAULTS}>OG-UK&rsquo;s default openness</A>
        </>
      ),
    });
  }
  return { links, notes };
}

export function SummaryWhy({ sid }) {
  const { cl, both } = useSummary(sid);
  const why = whyChain(sid, cl);
  return (
    <>
      {why ? (
        <div className="why p2-why">
          <h3 className="why-title">
            <Icon name={iconFor('why')} size={18} className="p2-tx-icon" />
            Why
          </h3>
          <WhyChain
            label="Why the figures move, step by step"
            links={why.links.map((l) => ({
              key: l.key,
              icon: l.icon,
              text: (
                <>
                  {l.text}
                  {l.dir ? <Icon name={iconFor(l.dir)} size={15} strokeWidth={2.25} className={`p2-why-dir is-${l.dir}`} /> : null}
                </>
              ),
            }))}
          />
          {why.notes.length ? <Items items={why.notes} className="p2-why-notes" /> : null}
        </div>
      ) : null}
      <div className="p2-sure">
        <p className="p2-sure-title">
          <Icon name={iconFor('caveat')} size={16} /> How sure is this?
        </p>
        <Items
          items={[
            {
              key: 'scen',
              icon: 'scenario',
              text: (
                <>
                  <A href={resultUrl(sid, 'tfp', cl)}>Scenario results</A>, not forecasts
                </>
              ),
            },
            {
              key: 'size',
              icon: 'shock',
              text: (
                <>
                  They depend on the{' '}
                  <NavLink tab="method" sub="how" anchor="m-scenarios">
                    shock&rsquo;s size
                  </NavLink>{' '}
                  and on foreign capital inflows
                </>
              ),
            },
            {
              key: 'closure',
              icon: 'closure',
              text: both ? (
                'Both closures shown: closed capital beside each figure'
              ) : (
                <NavLink patch={{ closure: 'both' }}>Show the figures with no foreign capital beside these</NavLink>
              ),
            },
          ]}
        />
      </div>
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
