'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { HEADLINE_YEAR, SURPRISE_YEAR, CENTRAL, SCENARIOS, gap, fmt, signed, result } from '@/tabs/ai/surprise.js';

// The answer-first top of Results > Overview: a question, a one-line answer
// built from the data, three KPI tiles for the selected scenario's main arm
// (automation + productivity, central closure, 2031), each with the four
// scenarios on a small range bar, three "why" bullets and a "how sure" line.
// No jargon here: the precise terms live in tips and in the details below.

const NAME = { uk_low: 'UK low', uk_central: 'UK central', uk_high: 'UK high', korinek: 'Korinek (upper)' };
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
    title: 'Pay',
    line: 'What a given amount of work earns',
    tip: 'The wage rate: pay per unit of labour, adjusted for skill. It is not average earnings, which also move with hours and the mix of jobs.',
  },
  {
    v: 'GNI',
    icon: 'home',
    title: 'Income UK residents keep',
    line: 'Output less what goes to foreign owners',
    tip: 'Gross national income: GDP plus the UK’s income from abroad, less income paid to foreign owners of UK capital.',
  },
];

function dirIcon(x) {
  return Math.abs(x) < 0.005 ? 'minus' : x > 0 ? 'arrowUp' : 'arrowDown';
}

export function heroAnswer(sid) {
  const y = gap(sid, 'tfp', CENTRAL, 'Y');
  const w = gap(sid, 'tfp', CENTRAL, 'w');
  const g = gap(sid, 'tfp', CENTRAL, 'GNI');
  if (y == null || w == null) return 'The results for this scenario are still being solved.';
  const out = Math.abs(y) < 0.005 ? 'Output is unchanged' : y > 0 ? (y < 1 ? 'Output rises a little' : 'Output rises') : 'Output falls';
  const pay = w < 0 ? 'pay rates fall' : 'pay rates rise';
  const keep = g != null && y > 0 && g < y ? ', and the UK keeps less of the gain than GDP suggests' : '';
  return `${out}, ${pay}${keep}.`;
}

function RangeBar({ v, sid, title, onChoose }) {
  const pts = SCENARIOS.map((s) => ({ id: s.id, x: gap(s.id, 'tfp', CENTRAL, v) }));
  const done = pts.filter((p) => p.x != null);
  const xs = done.map((p) => p.x);
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const pad = (hi - lo || 1) * 0.1;
  const frac = (x) => ((x - lo + pad) / (hi - lo + 2 * pad)) * 100;
  const pct = (x) => `${frac(x).toFixed(2)}%`;
  // Each dot is named under it; dots at the same place share one name, and
  // names closer than 18% of the bar alternate below and above.
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
      <div className="kpi-range-track">
        <span className="kpi-range-zero" style={{ left: pct(0) }} aria-hidden="true" />
        {done.map((p) => (
          <TipTarget
            key={p.id}
            className={`kpi-range-dot${p.id === sid ? ' is-on' : ''}`}
            style={{ left: pct(p.x) }}
            label={`${NAME[p.id]}, ${title}: ${fmt(p.x)}. Select this scenario`}
            onActivate={() => onChoose(p.id)}
            tip={
              <>
                <b>{NAME[p.id]}</b>
                <span>
                  {title}, {HEADLINE_YEAR}
                </span>
                <span className="tip-value">{fmt(p.x)}</span>
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
      {pending.length ? (
        <div className="kpi-range-slots" aria-label="Scenarios not solved yet">
          {pending.map((p) => (
            <span key={p.id} className="kpi-slot is-empty">
              {SHORT[p.id]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Landing({ sid, onScenario, detailsId }) {
  const y = gap(sid, 'tfp', CENTRAL, 'Y');
  const g = gap(sid, 'tfp', CENTRAL, 'GNI');
  const ls = gap(sid, 'tfp', CENTRAL, 'labour_share_pp');
  const fs = result(sid, 'tfp', CENTRAL).foreign_share_dK_2031;
  const ready = y != null;
  return (
    <section className="landing" aria-labelledby="landing-q">
      <h2 id="landing-q" className="landing-q">
        What happens to the UK economy if AI arrives in {SURPRISE_YEAR}?
      </h2>
      <p className="landing-a">{heroAnswer(sid)}</p>
      <p className="landing-meta">
        {NAME[sid]} scenario, {HEADLINE_YEAR}, compared with no AI. Change the scenario at the top of the page.
      </p>

      <div className="kpi-grid">
        {KPIS.map((k) => {
          const x = gap(sid, 'tfp', CENTRAL, k.v);
          return (
            <div key={k.v} className="kpi-tile">
              <div className="kpi-name">
                <Icon name={k.icon} size={18} />
                <span>{k.title}</span>
                <TipTarget className="kpi-info" label={`What is ${k.title}?`} tip={<span>{k.tip}</span>}>
                  <Icon name="info" size={14} />
                </TipTarget>
              </div>
              <div className={`kpi-value${x == null ? ' is-pending' : ''}`}>
                {x != null ? <Icon name={dirIcon(x)} size={22} className="dir-icon" /> : null}
                <span>{fmt(x)}</span>
              </div>
              <p className="kpi-line">{k.line}</p>
              <RangeBar v={k.v} sid={sid} title={k.title} onChoose={onScenario} />
            </div>
          );
        })}
      </div>

      {ready ? (
        <div className="why">
          <h3 className="why-title">Why</h3>
          <ul className="why-list">
            <li>
              <Icon name="cpu" size={18} />
              <span>AI makes the economy more productive, so output {y > 0 ? 'rises' : 'falls'}.</span>
            </li>
            {ls != null ? (
              <li>
                <Icon name="pie" size={18} />
                <span>
                  Capital takes a bigger share of income (the labour share moves {signed(ls, 1)}pp), so pay rates{' '}
                  {gap(sid, 'tfp', CENTRAL, 'w') < 0 ? 'fall' : 'rise less'}.
                </span>
              </li>
            ) : null}
            {fs != null && g != null && g < y ? (
              <li>
                <Icon name="globe" size={18} />
                <span>
                  About {Math.round(fs)}% of the new capital is foreign-owned, so national income gains less than GDP.
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <p className="how-sure">
        <Icon name="gauge" size={16} />
        <span>
          <b>How sure is this?</b> It depends on how much foreign capital flows in.{' '}
          <a href={`#${detailsId}`}>See the figures with no foreign capital in the details</a>.
        </span>
      </p>
    </section>
  );
}
