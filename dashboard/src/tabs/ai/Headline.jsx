'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, ARM_TEXT_COLOR, ARM_LIGHT, gap, fmt, result } from '@/tabs/ai/surprise.js';

// The Results headline: a takeaway sentence built from the data, a dumbbell
// panel (one row per measure, one marker pair per arm: the central value as a
// filled dot, the closed-capital bound as a hollow dot, on one axis centred on
// the OBR-central path), and a strip comparing the four scenarios. Every value comes
// from surprise2028.json through gap()/fmt(); a pending one says "pending".

export const MEASURES = [
  { v: 'w', label: 'Wage rate', sub: 'pay per unit of labour', icon: 'wallet' },
  { v: 'GNI', label: 'Income UK residents keep', sub: 'national income, GNI', icon: 'home' },
  { v: 'NNI', label: '… after depreciation', sub: 'net national income, NNI', icon: 'layers' },
  { v: 'Y', label: 'Total output', sub: 'GDP', icon: 'factory' },
];

// The dumbbell card's values as a CSV table
export function dumbbellTable(sid, arms, closure) {
  const cls = closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL];
  return {
    columns: ['Measure', 'Arm', 'Closure', `Gap in ${HEADLINE_YEAR} (%)`],
    rows: MEASURES.flatMap((m) =>
      ARMS.filter((a) => arms.includes(a.id)).flatMap((a) =>
        cls.map((cl) => [`${m.label} (${m.sub})`.replace('… ', 'Income '), a.label, cl === BOUND ? 'Closed capital' : 'Central', gap(sid, a.id, cl, m.v)]),
      ),
    ),
  };
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
  // (signs from the Z values: a cut at the central closure, a slight rise
  // with closed capital for UK central and Korinek; results sanity audit)
  return (
    <p>
      The stress test holds {HEADLINE_YEAR} GDP at the OBR-central path, as in the OBR&rsquo;s Box 2.2 displacement scenario.
      {c != null ? (
        <>
          {' '}Under the central closure {phrase(c)} for that{c ? ', so it is a pessimistic bound, not a forecast' : ''}.
        </>
      ) : null}
      {b != null ? (
        <>
          {' '}Under closed capital {phrase(b)}{b === c ? ' too' : ', so there it almost coincides with “technology unchanged” and is not a pessimistic bound'}.
        </>
      ) : null}{' '}
      &ldquo;Technology unchanged&rdquo; shifts the labour share and leaves output at fixed inputs where it was.
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
      <span className="tip-value">{fmt(value)} against the OBR-central path</span>
    </>
  );
}

export function Dumbbells({ sid, arms = ARMS.map((a) => a.id), closure = 'central' }) {
  const shown = ARMS.filter((a) => arms.includes(a.id));
  const showC = closure !== 'closed';
  const showB = closure !== 'central';
  const vals = MEASURES.flatMap((m) => shown.flatMap((a) => [showC ? gap(sid, a.id, CENTRAL, m.v) : null, showB ? gap(sid, a.id, BOUND, m.v) : null])).filter((x) => x != null);
  const top = niceMax(Math.max(0.25, ...vals.map(Math.abs)));
  const D = top * 1.6; // room for the labels beyond the outer dots
  const pct = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(3)}%`;
  const step = [0.1, 0.25, 0.5, 1, 2, 5].find((st) => top / st <= 2.5) ?? top;
  const ticks = [];
  for (let t = -Math.floor(top / step) * step; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  const tickText = (t) => (t === 0 ? '0%' : `${t > 0 ? '+' : '−'}${Math.abs(t)}%`);
  const ssHeld = arms.includes('ss') && gap(sid, 'ss', showC ? CENTRAL : BOUND, 'Y') != null;

  return (
    <div className="dumbbells" role="group" aria-label={`${HEADLINE_YEAR} gaps against the OBR-central path, by measure and arm`}>
      <div className="db-row db-axis-head" aria-hidden="true">
        <span />
        <div className="db-track db-track-head">
          <span className="db-side db-side-left">
            <Icon name="arrowDown" size={12} /> Lower<span className="db-side-long"> than the OBR-central path</span>
          </span>
          <span className="db-side db-side-right">
            Higher<span className="db-side-long"> than the OBR-central path</span> <Icon name="arrowUp" size={12} />
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
              const c = showC ? gap(sid, a.id, CENTRAL, m.v) : null;
              const b = showB ? gap(sid, a.id, BOUND, m.v) : null;
              // the value printed beside the markers: central, or closed capital alone
              const main = showC ? c : b;
              const color = ARM_COLOR[a.id];
              // The value sits beyond the outer dot, away from 0, so it never
              // crosses the zero line.
              const right = main >= 0 || (main != null && Math.abs(main) < 0.005);
              const outer = b == null ? c : c == null ? b : right ? Math.max(b, c) : Math.min(b, c);
              const name = `${m.label} (${m.sub})`;
              return (
                <div key={a.id} className={`db-arm${ARM_LIGHT[a.id] ? ' is-light' : ''}`}>
                  <span className="db-arm-key">
                    <span className="swatch" style={{ borderTopColor: color }} aria-hidden="true" />
                    <span className="db-arm-name">{a.short || a.label}</span>
                  </span>
                  <div className="db-track">
                    <span className="db-zero" style={{ left: pct(0) }} aria-hidden="true" />
                    {main == null ? (
                      <span className="db-pending">pending</span>
                    ) : (
                      <>
                        {b != null && c != null ? (
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
                        {c != null ? (
                          <TipTarget
                            className="db-dot"
                            style={{ left: pct(c), background: color, borderColor: color }}
                            label={`${a.label}, central closure, ${name}: ${fmt(c)}`}
                            tip={<DotTip arm={a.label} closure="Central closure (some new capital foreign-owned)" measure={name} value={c} />}
                          />
                        ) : null}
                        <span
                          className={`db-value${right ? ' is-right' : ' is-left'}`}
                          style={{ ...(right ? { left: pct(outer) } : { right: `calc(100% - ${pct(outer)})` }), color: ARM_TEXT_COLOR[a.id] }}
                        >
                          {fmt(main)}
                        </span>
                      </>
                    )}
                    {showC && showB ? <span className="visually-hidden">closed capital {fmt(b)}</span> : null}
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

