'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget, InfoTip } from '@/components/ab/Tip.jsx';
import { Notice } from '@/components/ab/Section.jsx';
import { StatTile } from '@/components/ui/Card.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { METHOD } from '@/lib/labels.js';
import {
  HEADLINE_YEAR, SURPRISE_YEAR, FIRST_YEAR, CENTRAL, BOUND, ARMS, SCENARIOS, SCEN_NAME as NAME, gap, fmt, result, DONE, TOTAL,
} from '@/tabs/ai/surprise.js';
import { primaryClosure } from '@/tabs/ai/series.js';

// Results > Summary, answer first: the question, a one-line answer built
// from the data, three headline figures for the chosen scenario's main arm
// (automation + productivity, headline year) at the closure chosen in the
// header, each with the four scenarios on a small range strip, then why,
// how sure, and three ways into the detail. This is the one home of the
// three headline figures.

const SHORT = { uk_low: 'Low', uk_central: 'Central', uk_high: 'High', korinek: 'Korinek' };

const KPIS = [
  {
    v: 'Y',
    icon: 'factory',
    title: 'Output (GDP)',
    line: 'Everything produced in the UK',
    tip: 'Gross domestic product: the value of everything produced in the UK, including by foreign-owned capital.',
  },
  {
    v: 'w',
    icon: 'wallet',
    title: 'Pay rates',
    line: 'What a given amount of work earns, against a path on which pay rises',
    tip: 'The wage rate: pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs. A negative figure is slower growth than on the OBR-central path, not a cut in pay.',
  },
  {
    v: 'GNI',
    icon: 'home',
    title: 'Income UK residents keep',
    line: 'Output less what goes to foreign owners (GNI)',
    tip: 'Gross national income: GDP plus the UK’s income from abroad, less income paid to foreign owners of UK capital.',
  },
];

// Pay in words. A negative gap is slower growth, not a fall in the level:
// the no-shock wage rate rises about 3.5% over 2027-31 (continuation.json w
// with 1% a year trend growth; results sanity audit), and no main-arm gap
// in the data file is larger than about 2%.
const payWords = (w) => (w < 0 ? 'pay rates grow more slowly than on the OBR-central path' : 'pay rates grow faster than on the OBR-central path');

export function heroAnswer(sid, cl = CENTRAL) {
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const g = gap(sid, 'tfp', cl, 'GNI');
  if (y == null || w == null) return 'This scenario is not solved yet at the closure chosen above.';
  const out = Math.abs(y) < 0.005 ? 'Output is unchanged' : y > 0 ? (y < 1 ? 'Output rises a little' : 'Output rises') : 'Output falls';
  const keep = g != null && y > 0 && g < y ? ', and the UK keeps less of the gain than GDP suggests' : '';
  return `${out}, ${payWords(w)}${keep}.`;
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
  const names = [];
  clusters.forEach((c, i) => {
    const up = i > 0 && frac(c[0].x) - frac(clusters[i - 1][0].x) < 18 && !names[i - 1]?.up;
    names.push({ x: c[0].x, up, text: c.map((p) => SHORT[p.id]).join(' · '), on: c.some((p) => p.id === sid) });
  });
  const pending = pts.filter((p) => p.x == null);
  return (
    <div className="kpi-range">
      <p className="kpi-range-title">The four scenarios</p>
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
          <span key={n.text} className={`kpi-range-name${n.up ? ' is-up' : ''}${n.on ? ' is-on' : ''}`} style={{ left: pct(n.x) }} aria-hidden="true">
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
  { sub: 'income', icon: 'home', title: 'Year by year', text: `How national income and GDP build up from ${FIRST_YEAR} to ${HEADLINE_YEAR}, in three arms.` },
  { sub: 'economy', icon: 'factory', title: 'Inside the economy', text: 'Consumption, investment, capital, labour, the interest rate and the labour share.' },
  { sub: 'finances', icon: 'landmark', title: 'Public finances', text: 'Debt and tax as shares of GDP, and why the tax effect is likely understated.' },
];

export default function Summary({ sid }) {
  const { st } = useNav();
  const cl = primaryClosure(st.closure);
  const both = st.closure === 'both';
  const y = gap(sid, 'tfp', cl, 'Y');
  const g = gap(sid, 'tfp', cl, 'GNI');
  const w = gap(sid, 'tfp', cl, 'w');
  const ls = gap(sid, 'tfp', cl, 'labour_share_pp');
  const fs = result(sid, 'tfp', CENTRAL).foreign_share_dK_2031;
  const ready = y != null;
  const sidPending = ARMS.some((a) => result(sid, a.id, CENTRAL).status !== 'done' || result(sid, a.id, BOUND).status !== 'done');
  return (
    <section className="summary" aria-labelledby="summary-q">
      <div className="hero">
        <h2 id="summary-q" className="hero-q">
          What happens to the UK economy if AI arrives in {SURPRISE_YEAR}?
        </h2>
        <p className="hero-a">{heroAnswer(sid, cl)}</p>
        <p className="hero-meta">
          {NAME[sid]} scenario{sid === 'korinek' ? ', a US upper case' : ''}, {cl === BOUND ? 'closed capital' : 'central closure'}, {HEADLINE_YEAR}, against the OBR-central path
          <InfoTip label="What is the OBR-central path?">
            The path every figure here is compared with: the economy without the shock, growing at the OBR&rsquo;s central rate. It is defined under {METHOD.shock.label} on Method.
          </InfoTip>
        </p>
      </div>

      <div className="stat-row">
        {KPIS.map((k) => {
          const x = gap(sid, 'tfp', cl, k.v);
          const b = both ? gap(sid, 'tfp', BOUND, k.v) : null;
          return (
            <StatTile
              key={k.v}
              icon={k.icon}
              name={k.title}
              value={fmt(x)}
              tone={tone(x)}
              sub={k.line}
              tip={<InfoTip label={`What is ${k.title.toLowerCase()}?`}>{k.tip}</InfoTip>}
            >
              {both ? (
                <p className="stat-line">
                  <Icon name="lock" size={14} /> With closed capital: <b>{fmt(b)}</b>
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

      {ready ? (
        <div className="why">
          <h3 className="why-title">Why</h3>
          <ul className="why-list">
            <li>
              <Icon name="cpu" size={18} />
              <span>AI makes the economy more productive, so output {y > 0 ? 'rises' : 'falls'}.</span>
            </li>
            {ls != null && w != null ? (
              <li>
                <Icon name="pie" size={18} />
                <span>Capital takes a bigger share of income, so {payWords(w)}. Pay still rises; how much less depends on how much new capital arrives.</span>
              </li>
            ) : null}
            {cl === CENTRAL && fs != null && g != null && g < y ? (
              <li>
                <Icon name="globe" size={18} />
                <span>About {Math.round(fs)}% of the new capital is foreign-owned, so national income gains less than GDP.</span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <p className="icon-line how-sure">
        <Icon name="gauge" size={16} />
        <span>
          <b>How sure is this?</b> It depends on how much foreign capital flows in.{' '}
          {both ? (
            'Both closures are shown: the tiles give closed capital beside the central figure.'
          ) : (
            <NavLink patch={{ closure: 'both' }}>Show the figures with no foreign capital beside these</NavLink>
          )}
          {both ? null : '.'}
        </span>
      </p>

      <h3 className="entries-title">Go deeper</h3>
      <div className="entry-grid">
        {ENTRIES.map((e) => (
          <NavLink key={e.sub} tab="results" sub={e.sub} className="entry-card">
            <span className="entry-head">
              <Icon name={e.icon} size={20} />
              <span className="entry-title">{e.title}</span>
              <Icon name="arrowRight" size={16} strokeWidth={2} className="entry-arrow" />
            </span>
            <span className="entry-text">{e.text}</span>
          </NavLink>
        ))}
      </div>
    </section>
  );
}
