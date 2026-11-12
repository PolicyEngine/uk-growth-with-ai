'use client';

import Icon from '@/components/ab/Icon.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, SCENARIOS, gap, fmt } from '@/tabs/ai/surprise.js';

// The Results headline: a takeaway sentence built from the data, a dumbbell
// panel (one row per measure, one marker pair per arm: the central value as a
// filled dot, the closed-capital bound as a hollow dot, on one axis centred on
// the no-AI path), and a strip comparing the four scenarios. Every value comes
// from surprise2028.json through gap()/fmt(); a pending one says "pending".

export const ARM_ICON = { tfp: 'trend', ss: 'arrowLeftRight' };

export const MEASURES = [
  { v: 'w', label: 'Wage rate', sub: 'pay per unit of labour', icon: 'wallet' },
  { v: 'GNI', label: 'Income UK residents keep', sub: 'national income, GNI', icon: 'home' },
  { v: 'NNI', label: '… after depreciation', sub: 'net national income, NNI', icon: 'layers' },
  { v: 'Y', label: 'Total output', sub: 'GDP', icon: 'factory' },
];

export function ArmTag({ arm, label }) {
  return (
    <span className="arm-tag">
      <span className="swatch" style={{ borderTopColor: ARM_COLOR[arm] }} aria-hidden="true" />
      <Icon name="cpu" size={14} />
      <Icon name={ARM_ICON[arm]} size={14} />
      <span>{label}</span>
    </span>
  );
}

function Dir({ x }) {
  if (x == null) return null;
  const name = Math.abs(x) < 0.005 ? 'minus' : x > 0 ? 'arrowUp' : 'arrowDown';
  return <Icon name={name} size={13} className="dir-icon" />;
}

// One sentence from the signs and the values: never a fixed claim.
export function Takeaway({ sid }) {
  const y = gap(sid, 'tfp', CENTRAL, 'Y');
  const w = gap(sid, 'tfp', CENTRAL, 'w');
  const g = gap(sid, 'ss', CENTRAL, 'GNI');
  if (y == null || w == null) {
    return <p className="takeaway">The solves for this scenario are still running; each figure shows “pending” until they land.</p>;
  }
  const word = (x, up, down) => (Math.abs(x) < 0.005 ? 'unchanged' : x > 0 ? up : down);
  return (
    <p className="takeaway">
      With automation and productivity, total output (GDP) is {word(y, 'higher', 'lower')} by {HEADLINE_YEAR}{' '}
      <span className="num">
        <Dir x={y} />
        {fmt(y)}
      </span>{' '}
      {(y > 0) !== (w > 0) ? 'but' : 'and'} the wage rate is {word(w, 'higher', 'lower')}{' '}
      <span className="num">
        <Dir x={w} />
        {fmt(w)}
      </span>
      {g != null ? (
        <>
          ; if AI only shifts income to capital, the income UK residents keep (GNI) is {word(g, 'higher', 'lower')}{' '}
          <span className="num">
            <Dir x={g} />
            {fmt(g)}
          </span>
          .
        </>
      ) : (
        '.'
      )}
    </p>
  );
}

function niceMax(m) {
  const steps = [0.25, 0.5, 1, 2, 2.5, 5, 10];
  return steps.find((s) => s >= m) ?? Math.ceil(m);
}

export function Dumbbells({ sid }) {
  const vals = MEASURES.flatMap((m) => ARMS.flatMap((a) => [gap(sid, a.id, CENTRAL, m.v), gap(sid, a.id, BOUND, m.v)])).filter((x) => x != null);
  const top = niceMax(Math.max(0.25, ...vals.map(Math.abs)));
  const D = top * 1.6; // room for the labels beyond the outer dots
  const pct = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(3)}%`;
  const step = [0.1, 0.25, 0.5, 1, 2, 5].find((st) => top / st <= 2.5) ?? top;
  const ticks = [];
  for (let t = -Math.floor(top / step) * step; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  const tickText = (t) => (t === 0 ? '0' : `${t > 0 ? '+' : '−'}${Math.abs(t)}`);

  return (
    <div className="dumbbells" role="group" aria-label={`${HEADLINE_YEAR} gaps against the no-AI path, by measure and arm`}>
      <div className="db-row db-axis-head" aria-hidden="true">
        <span />
        <div className="db-track db-track-head">
          <span className="db-side db-side-left">
            <Icon name="arrowDown" size={12} /> Lower<span className="db-side-long"> than without AI</span>
          </span>
          <span className="db-side db-side-right">
            Higher<span className="db-side-long"> than without AI</span> <Icon name="arrowUp" size={12} />
          </span>
        </div>
      </div>
      {MEASURES.map((m) => (
        <div key={m.v} className="db-group">
          <div className="db-label">
            <Icon name={m.icon} size={16} />
            <span>
              <span className="db-label-main">{m.label}</span>
              <span className="db-label-sub">{m.sub}</span>
            </span>
          </div>
          <div className="db-arms">
            {ARMS.map((a) => {
              const c = gap(sid, a.id, CENTRAL, m.v);
              const b = gap(sid, a.id, BOUND, m.v);
              const held = a.id === 'ss' && m.v === 'Y' && c != null;
              const color = ARM_COLOR[a.id];
              // The value sits beyond the outer dot, away from 0, so it never
              // crosses the zero line.
              const right = c >= 0 || (c != null && Math.abs(c) < 0.005);
              const outer = b == null ? c : right ? Math.max(b, c) : Math.min(b, c);
              return (
                <div key={a.id} className="db-arm">
                  <span className="db-arm-key" title={a.label}>
                    <span className="swatch" style={{ borderTopColor: color }} aria-hidden="true" />
                    <span className="visually-hidden">{a.label}: </span>
                  </span>
                  <div className="db-track">
                    <span className="db-zero" style={{ left: pct(0) }} aria-hidden="true" />
                    {c == null ? (
                      <span className="db-pending">pending</span>
                    ) : (
                      <>
                        {b != null ? (
                          <span
                            className="db-bar"
                            style={{ left: pct(Math.min(b, c)), width: `${((Math.abs(b - c) / (2 * D)) * 100).toFixed(3)}%`, background: color }}
                            aria-hidden="true"
                          />
                        ) : null}
                        {b != null ? (
                          <span className="db-dot is-hollow" style={{ left: pct(b), borderColor: color }} title={`Closed capital: ${fmt(b)}`} aria-hidden="true" />
                        ) : null}
                        <span className="db-dot" style={{ left: pct(c), background: color, borderColor: color }} aria-hidden="true" />
                        <span
                          className={`db-value${right ? ' is-right' : ' is-left'}`}
                          style={right ? { left: pct(outer) } : { right: `calc(100% - ${pct(outer)})` }}
                        >
                          {fmt(c)}
                        </span>
                        {held ? <span className="db-held">held at 0 by design</span> : null}
                      </>
                    )}
                    <span className="visually-hidden">closed capital {fmt(b)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="db-row db-axis" aria-hidden="true">
        <span />
        <div className="db-track db-track-axis">
          {ticks.map((t) => (
            <span key={t} className="db-tick" style={{ left: pct(t) }}>
              {tickText(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const STRIP_LABEL = { uk_low: 'UK low', uk_central: 'UK central', uk_high: 'UK high', korinek: 'Korinek (upper)' };

export function ScenarioStrip({ sid, onChoose }) {
  return (
    <div className="scen-strip-wrap">
      <p className="scen-strip-title">
        Compare scenarios: automation and productivity, central closure, {HEADLINE_YEAR}
      </p>
      <div className="scen-strip" role="group" aria-label="Compare scenarios">
        {SCENARIOS.map((s) => {
          const on = s.id === sid;
          return (
            <button key={s.id} type="button" className={`scen-col${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChoose(s.id)}>
              <span className="scen-col-name">{STRIP_LABEL[s.id] || s.label}</span>
              <span className="scen-col-line">
                <Icon name="home" size={13} />
                <span className="scen-col-k">GNI</span>
                <span className="scen-col-v">{fmt(gap(s.id, 'tfp', CENTRAL, 'GNI'))}</span>
              </span>
              <span className="scen-col-line">
                <Icon name="wallet" size={13} />
                <span className="scen-col-k">Wage rate</span>
                <span className="scen-col-v">{fmt(gap(s.id, 'tfp', CENTRAL, 'w'))}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
