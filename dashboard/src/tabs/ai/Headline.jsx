'use client';

import Icon from '@/components/ab/Icon.jsx';
import { TipTarget } from '@/components/ab/Tip.jsx';
import { NavLink } from '@/lib/nav.jsx';
import { CHART_COLOURS } from '@/lib/chartTheme.js';
import { cssColour, esc } from '@/lib/download.js';
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
export function dumbbellTable(sid, arms, closure, rule = 'common') {
  const cls = closure === 'closed' ? [BOUND] : closure === 'both' ? [CENTRAL, BOUND] : [CENTRAL];
  return {
    columns: ['Measure', 'Arm', 'Closure', `Gap in ${HEADLINE_YEAR} (%)`],
    rows: MEASURES.flatMap((m) =>
      ARMS.filter((a) => arms.includes(a.id)).flatMap((a) =>
        cls.map((cl) => [`${m.label} (${m.sub})`.replace('… ', 'Income '), a.label, cl === BOUND ? 'Closed capital' : 'Central', gap(sid, a.id, cl, m.v, HEADLINE_YEAR, rule)]),
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

// The main arm's GDP, wage-rate and GNI values are the story's headline tiles: their
// one home. Here those three markers keep their tooltip and the download
// keeps the value; the printed label links to the story instead.
export const ON_SUMMARY = { arm: 'tfp', measures: ['Y', 'w', 'GNI'] };
// Only under the common fiscal rule: the story shows no other rule.
const onSummary = (arm, v, rule = 'common') => rule === 'common' && arm === ON_SUMMARY.arm && ON_SUMMARY.measures.includes(v);

// The axis both drawings share: half-width D (room for the labels beyond
// the outer dots) and the ticks.
function dumbbellScale(sid, arms, closure, rule = 'common') {
  const shown = ARMS.filter((a) => arms.includes(a.id));
  const showC = closure !== 'closed';
  const showB = closure !== 'central';
  const g = (a, cl, v) => gap(sid, a, cl, v, HEADLINE_YEAR, rule);
  const vals = MEASURES.flatMap((m) => shown.flatMap((a) => [showC ? g(a.id, CENTRAL, m.v) : null, showB ? g(a.id, BOUND, m.v) : null])).filter((x) => x != null);
  const top = niceMax(Math.max(0.25, ...vals.map(Math.abs)));
  const D = top * 1.6;
  const step = [0.1, 0.25, 0.5, 1, 2, 5].find((st) => top / st <= 2.5) ?? top;
  const ticks = [];
  for (let t = -Math.floor(top / step) * step; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return { shown, showC, showB, D, ticks };
}
const tickText = (t) => (t === 0 ? '0%' : `${t > 0 ? '+' : '−'}${Math.abs(t)}%`);

// The same chart drawn as SVG from the data, for the PNG and SVG downloads
// (the page draws it in HTML). Every value is printed here, the main arm's
// too: the file stands alone.
export function dumbbellSvg(sid, arms, closure, rule = 'common') {
  const { shown, showC, showB, D, ticks } = dumbbellScale(sid, arms, closure, rule);
  const W = 1000;
  const x0 = 400;
  const x1 = W - 10;
  const X = (v) => x0 + ((v + D) / (2 * D)) * (x1 - x0);
  const ROW = 26;
  const GAP = 14;
  const C = CHART_COLOURS;
  let y = 8;
  let out = '';
  const groupsTop = y;
  for (const m of MEASURES) {
    const gTop = y;
    out += `<text x="0" y="${gTop + 16}" font-size="13" font-weight="600" fill="${C.ink}">${esc(m.label)}</text>`;
    out += `<text x="0" y="${gTop + 32}" font-size="11" fill="${C.muted}">${esc(m.sub)}</text>`;
    for (const a of shown) {
      const cy = y + ROW / 2;
      const col = cssColour(ARM_COLOR[a.id]);
      const txt = cssColour(ARM_TEXT_COLOR[a.id]);
      out += `<line x1="200" x2="214" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="2.5"/>`;
      out += `<text x="220" y="${cy + 4}" font-size="11" fill="${C.axisTitle}">${esc(a.short || a.label)}</text>`;
      const c = showC ? gap(sid, a.id, CENTRAL, m.v, HEADLINE_YEAR, rule) : null;
      const b = showB ? gap(sid, a.id, BOUND, m.v, HEADLINE_YEAR, rule) : null;
      const main = showC ? c : b;
      if (main == null) {
        out += `<text x="${X(0) + 8}" y="${cy + 4}" font-size="11" fill="${C.muted}">pending</text>`;
      } else {
        if (b != null && c != null) out += `<line x1="${X(b)}" x2="${X(c)}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="3" opacity="0.5"/>`;
        if (b != null) out += `<rect x="${X(b) - 4.5}" y="${cy - 4.5}" width="9" height="9" transform="rotate(45 ${X(b)} ${cy})" fill="${C.surface}" stroke="${col}" stroke-width="2"/>`;
        if (c != null) out += `<circle cx="${X(c)}" cy="${cy}" r="5.5" fill="${col}"/>`;
        const right = main >= 0 || Math.abs(main) < 0.005;
        const outer = b == null ? c : c == null ? b : right ? Math.max(b, c) : Math.min(b, c);
        const label = showC && showB ? `${fmt(c)} · closed ${fmt(b)}` : fmt(main);
        out += `<text x="${X(outer) + (right ? 10 : -10)}" y="${cy + 4}" font-size="12" font-weight="700" text-anchor="${right ? 'start' : 'end'}" fill="${txt}">${esc(label)}</text>`;
      }
      y += ROW;
    }
    y = Math.max(y, gTop + 40) + GAP;
    out += `<line x1="0" x2="${W}" y1="${y - GAP / 2}" y2="${y - GAP / 2}" stroke="${C.grid}"/>`;
  }
  out = `<line x1="${X(0)}" x2="${X(0)}" y1="${groupsTop}" y2="${y - GAP / 2}" stroke="${C.zeroLine}"/>` + out;
  for (const t of ticks) out += `<text x="${X(t)}" y="${y + 14}" font-size="11" text-anchor="middle" fill="${C.tick}">${tickText(t)}</text>`;
  return { w: W, h: y + 24, markup: out };
}

export function dumbbellLegend(arms, closure) {
  const keys = ARMS.filter((a) => arms.includes(a.id)).map((a) => ({ label: a.short || a.label, color: cssColour(ARM_COLOR[a.id]) }));
  if (closure === 'both') keys.push({ label: 'Circle: central closure, diamond: closed capital', color: CHART_COLOURS.muted, shape: 'dot' });
  return keys;
}

export function Dumbbells({ sid, arms = ARMS.map((a) => a.id), closure = 'central', rule = 'common' }) {
  const { shown, showC, showB, D, ticks } = dumbbellScale(sid, arms, closure, rule);
  const pct = (x) => `${(((x + D) / (2 * D)) * 100).toFixed(3)}%`;
  const ssHeld = arms.includes('ss') && gap(sid, 'ss', showC ? CENTRAL : BOUND, 'Y', HEADLINE_YEAR, rule) != null;

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
              const c = showC ? gap(sid, a.id, CENTRAL, m.v, HEADLINE_YEAR, rule) : null;
              const b = showB ? gap(sid, a.id, BOUND, m.v, HEADLINE_YEAR, rule) : null;
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
                        {onSummary(a.id, m.v, rule) ? (
                          <NavLink
                            tab="story"
                            anchor="story-headline"
                            className={`db-value db-value-link${right ? ' is-right' : ' is-left'}`}
                            style={right ? { left: pct(outer) } : { right: `calc(100% - ${pct(outer)})` }}
                            aria-label={`${a.label}, ${name}: see the headline figures in the story`}
                          >
                            Headline <Icon name="arrowRight" size={12} strokeWidth={2} />
                          </NavLink>
                        ) : (
                          <span
                            className={`db-value${right ? ' is-right' : ' is-left'}`}
                            style={{ ...(right ? { left: pct(outer) } : { right: `calc(100% - ${pct(outer)})` }), color: ARM_TEXT_COLOR[a.id] }}
                          >
                            {fmt(main)}
                          </span>
                        )}
                      </>
                    )}
                    {showC && showB && !onSummary(a.id, m.v, rule) ? <span className="visually-hidden">closed capital {fmt(b)}</span> : null}
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

