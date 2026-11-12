'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_LIGHT, SCENARIOS, gap, fmt, result } from '@/tabs/ai/surprise.js';

// The Results headline: a takeaway sentence built from the data, a dumbbell
// panel (one row per measure, one marker pair per arm: the central value as a
// filled dot, the closed-capital bound as a hollow dot, on one axis centred on
// the no-AI path), and a strip comparing the four scenarios. Every value comes
// from surprise2028.json through gap()/fmt(); a pending one says "pending".

export const ARM_ICON = { tfp: 'trend', tz: 'arrowLeftRight', ss: 'alert' };

export const MEASURES = [
  { v: 'w', label: 'Wage rate', sub: 'pay per unit of labour', icon: 'wallet' },
  { v: 'GNI', label: 'Income UK residents keep', sub: 'national income, GNI', icon: 'home' },
  { v: 'NNI', label: '… after depreciation', sub: 'net national income, NNI', icon: 'layers' },
  { v: 'Y', label: 'Total output', sub: 'GDP', icon: 'factory' },
];

export function ArmTag({ arm, label, off = false }) {
  return (
    <span className={`arm-tag${ARM_LIGHT[arm] ? ' is-light' : ''}${off ? ' is-off' : ''}`}>
      <span className="swatch" style={{ borderTopColor: ARM_COLOR[arm] }} aria-hidden="true" />
      {arm !== 'ss' ? <Icon name="cpu" size={14} /> : null}
      <Icon name={ARM_ICON[arm]} size={14} />
      <span>{label}</span>
    </span>
  );
}

// A legend whose entries show or hide a series (aria-pressed, fill only).
export function ArmToggles({ hidden, onToggle, arms = ARMS }) {
  return (
    <div className="headline-key" role="group" aria-label="Show or hide a series">
      {arms.map((a) => (
        <button key={a.id} type="button" className="legend-toggle" aria-pressed={!hidden[a.id]} onClick={() => onToggle(a.id)}>
          <ArmTag arm={a.id} label={a.label} off={hidden[a.id]} />
        </button>
      ))}
    </div>
  );
}

function Dir({ x }) {
  if (x == null) return null;
  const name = Math.abs(x) < 0.005 ? 'minus' : x > 0 ? 'arrowUp' : 'arrowDown';
  return <Icon name={name} size={13} className="dir-icon" />;
}

// One block built from the signs and the values, never a fixed claim: the
// main arm first, then technology unchanged, then the stress test as the
// pessimistic bound.
function Num({ x }) {
  return (
    <span className="num">
      <Dir x={x} />
      {fmt(x)}
    </span>
  );
}

// Does holding 2031 GDP flat need output at fixed inputs to fall, i.e. is the
// stress test's Z below the technology-unchanged (fixed-input) Z, at this
// closure? null when either solve is pending.
export function stressFalls(sid, closure) {
  const s = result(sid, 'ss', closure);
  const t = result(sid, 'tz', closure);
  if (s.status !== 'done' || t.status !== 'done') return null;
  return s.Z_terminal < t.Z_terminal;
}

export function StressNote({ sid }) {
  const c = stressFalls(sid, CENTRAL);
  const b = stressFalls(sid, BOUND);
  const phrase = (x) => (x ? 'output at fixed inputs has to fall' : 'output at fixed inputs has to rise slightly');
  return (
    <p className="disclosure-text">
      The stress test holds {HEADLINE_YEAR} GDP at the no-AI path, as in the OBR&rsquo;s Box 2.2 displacement scenario.
      {c != null ? (
        <>
          {' '}Under the central closure {phrase(c)} for that{c ? ', so it is a pessimistic bound, not a forecast' : ''}.
        </>
      ) : null}
      {b != null ? (
        <>
          {' '}Under closed capital {phrase(b)}{b === c ? ' too' : ', so there it is not below “technology unchanged”'}.
        </>
      ) : null}{' '}
      &ldquo;Technology unchanged&rdquo; shifts the labour share and leaves output at fixed inputs where it was.
    </p>
  );
}

export function Takeaway({ sid }) {
  const y = gap(sid, 'tfp', CENTRAL, 'Y');
  const w = gap(sid, 'tfp', CENTRAL, 'w');
  if (y == null || w == null) {
    return <p className="takeaway">The solves for this scenario are still running; each figure shows “pending” until they land.</p>;
  }
  const ty = gap(sid, 'tz', CENTRAL, 'Y');
  const tw = gap(sid, 'tz', CENTRAL, 'w');
  const sg = gap(sid, 'ss', CENTRAL, 'GNI');
  const verb = (x, up, down) => (Math.abs(x) < 0.005 ? 'leaves it unchanged' : x > 0 ? up : down);
  return (
    <p className="takeaway">
      Against the path without AI, automation with a productivity gain {verb(y, 'raises', 'lowers')} GDP <Num x={y} /> and{' '}
      {w < 0 ? 'lowers' : 'raises'} the wage rate <Num x={w} />.
      {ty != null && tw != null ? (
        <>
          {' '}With technology unchanged, GDP {Math.abs(ty) < 0.005 ? 'is unchanged' : ty > 0 ? 'still rises' : 'falls'} <Num x={ty} /> and the
          wage rate {tw < w ? 'falls further' : tw < 0 ? 'falls' : 'rises'} <Num x={tw} />.
        </>
      ) : null}
      {sg != null ? (
        <>
          {' '}The stress test, with output held flat{stressFalls(sid, CENTRAL) ? ', is the pessimistic bound' : ''}: national income <Num x={sg} />.
        </>
      ) : null}
    </p>
  );
}

function niceMax(m) {
  const steps = [0.25, 0.5, 1, 2, 2.5, 5, 10];
  return steps.find((s) => s >= m) ?? Math.ceil(m);
}

function DotTip({ arm, closure, measure, value }) {
  return (
    <>
      <b>{measure}, {HEADLINE_YEAR}</b>
      <span>{arm}</span>
      <span>{closure}</span>
      <span className="tip-value">{fmt(value)} against the no-AI path</span>
    </>
  );
}

export function Dumbbells({ sid, hidden = {} }) {
  const shown = ARMS.filter((a) => !hidden[a.id]);
  const vals = MEASURES.flatMap((m) => shown.flatMap((a) => [gap(sid, a.id, CENTRAL, m.v), gap(sid, a.id, BOUND, m.v)])).filter((x) => x != null);
  const top = niceMax(Math.max(0.25, ...vals.map(Math.abs)));
  const D = top * 1.6; // room for the labels beyond the outer dots
  const pct = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(3)}%`;
  const step = [0.1, 0.25, 0.5, 1, 2, 5].find((st) => top / st <= 2.5) ?? top;
  const ticks = [];
  for (let t = -Math.floor(top / step) * step; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  const tickText = (t) => (t === 0 ? '0%' : `${t > 0 ? '+' : '−'}${Math.abs(t)}%`);
  const ssHeld = !hidden.ss && gap(sid, 'ss', CENTRAL, 'Y') != null;

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
              {m.v === 'Y' && ssHeld ? (
                <span className="db-label-held">
                  <Icon name="alert" size={12} /> Stress test: held at 0 by design
                </span>
              ) : null}
            </span>
          </div>
          <div className="db-arms">
            {shown.map((a) => {
              const c = gap(sid, a.id, CENTRAL, m.v);
              const b = gap(sid, a.id, BOUND, m.v);
              const color = ARM_COLOR[a.id];
              // The value sits beyond the outer dot, away from 0, so it never
              // crosses the zero line.
              const right = c >= 0 || (c != null && Math.abs(c) < 0.005);
              const outer = b == null ? c : right ? Math.max(b, c) : Math.min(b, c);
              const name = `${m.label} (${m.sub})`;
              return (
                <div key={a.id} className={`db-arm${ARM_LIGHT[a.id] ? ' is-light' : ''}`}>
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
                          <TipTarget
                            className="db-dot is-diamond"
                            style={{ left: pct(b), borderColor: color }}
                            label={`${a.label}, closed capital, ${name}: ${fmt(b)}`}
                            tip={<DotTip arm={a.label} closure="Closed capital (none foreign-owned)" measure={name} value={b} />}
                          />
                        ) : null}
                        <TipTarget
                          className="db-dot"
                          style={{ left: pct(c), background: color, borderColor: color }}
                          label={`${a.label}, central closure, ${name}: ${fmt(c)}`}
                          tip={<DotTip arm={a.label} closure="Central closure (some new capital foreign-owned)" measure={name} value={c} />}
                        />
                        <span
                          className={`db-value${right ? ' is-right' : ' is-left'}`}
                          style={right ? { left: pct(outer) } : { right: `calc(100% - ${pct(outer)})` }}
                        >
                          {fmt(c)}
                        </span>
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
            <span key={t} className="db-tick" style={{ left: pct(t) }} data-axis="">
              {tickText(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const STRIP_LABEL = { uk_low: 'UK low', uk_central: 'UK central', uk_high: 'UK high', korinek: 'Korinek (upper)' };
const STRIP_SHORT = { uk_low: 'Low', uk_central: 'Central', uk_high: 'High', korinek: 'Korinek' };

function DotRow({ v, label, icon, sid, onChoose }) {
  const pts = SCENARIOS.map((s) => ({ id: s.id, x: gap(s.id, 'tfp', CENTRAL, v) }));
  const xs = pts.filter((p) => p.x != null).map((p) => p.x);
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const pad = (hi - lo || 1) * 0.12;
  const frac = (x) => ((x - lo + pad) / (hi - lo + 2 * pad)) * 100;
  const pct = (x) => `${frac(x).toFixed(2)}%`;
  // Names of dots closer than 12% of the track alternate above and below
  const below = {};
  const order = pts.filter((p) => p.x != null).sort((a, b) => a.x - b.x);
  for (let i = 1; i < order.length; i += 1) {
    if (frac(order[i].x) - frac(order[i - 1].x) < 12 && !below[order[i - 1].id]) below[order[i].id] = true;
  }
  return (
    <div className="dotrow">
      <span className="dotrow-label">
        <Icon name={icon} size={14} />
        {label}
      </span>
      <div className="dotrow-track">
        <span className="db-zero" style={{ left: pct(0) }} aria-hidden="true" />
        {pts.map((p) =>
          p.x == null ? null : (
            <TipTarget
              key={p.id}
              className={`dotrow-dot${p.id === sid ? ' is-on' : ''}`}
              style={{ left: pct(p.x) }}
              label={`${STRIP_LABEL[p.id]}, ${label}: ${fmt(p.x)}. Select this scenario`}
              onActivate={() => onChoose(p.id)}
              tip={
                <>
                  <b>{STRIP_LABEL[p.id]}</b>
                  <span>{label}, automation + productivity, central closure, {HEADLINE_YEAR}</span>
                  <span className="tip-value">{fmt(p.x)}</span>
                </>
              }
            >
              <span className={`dotrow-name${below[p.id] ? ' is-below' : ''}`} aria-hidden="true">
                {STRIP_SHORT[p.id]}
              </span>
            </TipTarget>
          ),
        )}
      </div>
    </div>
  );
}

export function ScenarioStrip({ sid, onChoose }) {
  return (
    <div className="scen-strip-wrap">
      <p className="scen-strip-title">
        Compare scenarios: automation and productivity, central closure, {HEADLINE_YEAR}
      </p>
      <div className="dotplot">
        <DotRow v="GNI" label="GNI" icon="home" sid={sid} onChoose={onChoose} />
        <DotRow v="w" label="Wage rate" icon="wallet" sid={sid} onChoose={onChoose} />
      </div>
      <div className="scen-strip" role="group" aria-label="Choose a scenario">
        {SCENARIOS.map((s) => {
          const on = s.id === sid;
          const g = gap(s.id, 'tfp', CENTRAL, 'GNI');
          const w = gap(s.id, 'tfp', CENTRAL, 'w');
          return (
            <button key={s.id} type="button" className={`scen-col${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChoose(s.id)}>
              <span className="scen-col-name">{STRIP_LABEL[s.id] || s.label}</span>
              {g == null ? (
                <span className="scen-col-empty" aria-label="not solved yet" />
              ) : (
                <>
                  <span className="scen-col-line">
                    <Icon name="home" size={13} />
                    <span className="scen-col-k">GNI</span>
                    <span className="scen-col-v">{fmt(g)}</span>
                  </span>
                  <span className="scen-col-line">
                    <Icon name="wallet" size={13} />
                    <span className="scen-col-k">Wage rate</span>
                    <span className="scen-col-v">{fmt(w)}</span>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
