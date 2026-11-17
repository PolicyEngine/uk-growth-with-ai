'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { useChartBox } from '@/components/story/chart/useChartBox.js';
import { iconFor } from '@/lib/concepts.js';
import { ruleLabel } from '@/lib/labels.js';
import { useNav } from '@/lib/nav.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, ARMS, ARM_COLOR, SCEN_NAME, gap, fmt, ruleSolved } from '@/tabs/ai/surprise.js';
import { side, ruleGapText } from '@/tabs/ai/lines.js';
import { Lead, sentenceItems } from '@/tabs/explore/direction.jsx';
import { ResultSources } from '@/tabs/explore/sources.jsx';

// Central closure -> closed capital, per measure: a slope chart of two solved
// cases joined by a straight line. The line is not a range between them: no
// closure between the two is solved. Each arm is a line; where the two ends
// fall on opposite sides of the OBR-central path the measure flips sign, and
// the panel says so in words (from the signs). No figure is printed: every
// value here has its home in the four-measure card above (central closure,
// or closed capital with Closure = Closed or Both) and in the story's
// headline tiles; hovering or focusing an end shows it as a read-out.

export const SLOPE_MEASURES = [
  { v: 'Y', label: 'GDP', concept: 'gdp' },
  { v: 'GNI', label: 'GNI', concept: 'gni' },
  { v: 'NNI', label: 'NNI', concept: 'depreciation' },
  { v: 'w', label: 'Wage rate', concept: 'pay' },
];

// Every arm's two ends for one measure, and whether it flips sign (above to
// below the path or the reverse; "on the path" is neither).
export function slopeRows(sid, arms, rule, v) {
  return ARMS.filter((a) => arms.includes(a.id)).map((a) => {
    const c = gap(sid, a.id, CENTRAL, v, HEADLINE_YEAR, rule);
    const b = gap(sid, a.id, BOUND, v, HEADLINE_YEAR, rule);
    const flips = c != null && b != null && side(c) !== 'on' && side(b) !== 'on' && side(c) !== side(b);
    return { arm: a, c, b, flips };
  });
}

// One scale for all four panels (so slopes compare), symmetric about the
// path, with three ticks: the round limit either side and zero.
const LIMITS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20];
function scaleOf(rows) {
  const xs = rows.flatMap((r) => [r.c, r.b]).filter((x) => x != null);
  const m = Math.max(0.1, ...xs.map(Math.abs));
  const top = LIMITS.find((l) => l >= m * 1.05) ?? Math.ceil(m);
  return { top, ticks: [-top, 0, top] };
}
const tickText = (t) => (Math.abs(t) < 1e-9 ? '0' : `${t > 0 ? '+' : '−'}${Math.abs(t)}`);

// Drawn at the panel's measured width (220 before the first measure), so the
// 11px axis text stays 11px on a phone instead of scaling down with a viewBox.
const W0 = 220;
const H = 168;
const PAD = { l: 34, r: 14, t: 18, b: 22 };

function Panel({ m, rows, sc, hot, setHot, sid }) {
  const { ref: boxRef, width: W } = useChartBox({ width: W0, height: H });
  const x0 = PAD.l;
  const x1 = W - PAD.r;
  const Y = (v) => PAD.t + ((sc.top - v) / (2 * sc.top)) * (H - PAD.t - PAD.b);
  const flips = rows.filter((r) => r.flips);
  const pending = rows.filter((r) => r.c != null && r.b == null);
  const active = hot?.v === m.v ? rows.find((r) => r.arm.id === hot.arm) : null;
  return (
    <figure className="ex-slope-panel" data-measure={m.v}>
      <figcaption className="ex-slope-title" data-panel-title="">
        {m.label}
      </figcaption>
      <div ref={boxRef}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.label}, ${HEADLINE_YEAR}, central closure to closed capital, ${SCEN_NAME[sid]}: ${flips.length ? `flips sign for ${flips.map((r) => r.arm.short || r.arm.label).join(' and ')}` : 'no arm flips sign'}`}>
        {sc.ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={Y(t)} y2={Y(t)} className={Math.abs(t) < 1e-9 ? 'ex-slope-zero' : 'ex-slope-grid'} />
            <text x={x0 - 6} y={Y(t) + 4} textAnchor="end" className="ex-slope-tick" data-axis="">
              {tickText(t)}
            </text>
          </g>
        ))}
        <text x={2} y={10} className="ex-slope-axis-title" data-axis-title="y" data-axis="">
          Gap against the OBR-central path, %
        </text>
        <text x={(x0 + x1) / 2} y={H - 6} textAnchor="middle" className="ex-slope-axis-title" data-axis-title="x" data-axis="">
          Closure
        </text>
        <text x={x0} y={H - 6} className="ex-slope-tick" data-axis="">
          Central
        </text>
        <text x={x1} y={H - 6} textAnchor="end" className="ex-slope-tick" data-axis="">
          Closed
        </text>
        {rows.map((r) => {
          if (r.c == null) return null;
          const main = r.arm.id === 'tfp';
          const dim = active && active.arm.id !== r.arm.id;
          // where the line crosses the path, for a sign flip
          const cross = r.flips ? x0 + (r.c / (r.c - r.b)) * (x1 - x0) : null;
          const on = () => setHot({ v: m.v, arm: r.arm.id });
          return (
            <g
              key={r.arm.id}
              className={`ex-slope-arm${dim ? ' is-dim' : ''}${main ? ' is-main' : ''}`}
              style={{ '--arm': ARM_COLOR[r.arm.id] }}
              tabIndex={0}
              role="button"
              aria-label={`${r.arm.label}, ${m.label}: central closure ${fmt(r.c)}, closed capital ${fmt(r.b)}${r.flips ? ', flips sign' : ''}`}
              onMouseEnter={on}
              onFocus={on}
              onMouseLeave={() => setHot(null)}
              onBlur={() => setHot(null)}
            >
              {r.b != null ? <line x1={x0} x2={x1} y1={Y(r.c)} y2={Y(r.b)} className="ex-slope-line" /> : null}
              <circle cx={x0} cy={Y(r.c)} r="3.5" className="ex-slope-dot" />
              {r.b != null ? <circle cx={x1} cy={Y(r.b)} r="3.5" className="ex-slope-dot" /> : null}
              {cross != null ? <circle cx={cross} cy={Y(0)} r="4.5" className="ex-slope-flip" /> : null}
            </g>
          );
        })}
      </svg>
      </div>
      <div className="ex-slope-foot">
        {active ? (
          <p className="ex-slope-readout" role="status">
            {active.arm.short || active.arm.label}: {fmt(active.c)} → {fmt(active.b)}
          </p>
        ) : flips.length ? (
          <p className="ex-slope-note is-flip">
            {`Flips ${side(flips[0].b)} the path: ${flips.map((r) => (r.arm.short || r.arm.label).toLowerCase()).join(', ')}`}
          </p>
        ) : pending.length ? (
          <p className="ex-slope-note">
            Closed capital not solved for {pending.map((r) => (r.arm.short || r.arm.label).toLowerCase()).join(', ')}
          </p>
        ) : (
          <p className="ex-slope-note">
            Same side of the path in both cases
          </p>
        )}
      </div>
    </figure>
  );
}

export default function ClosureSlope({ sid }) {
  const { st } = useNav();
  const [hot, setHot] = useState(null);
  const rule = st.rule;
  const all = SLOPE_MEASURES.map((m) => ({ m, rows: slopeRows(sid, st.arms, rule, m.v) }));
  const sc = scaleOf(all.flatMap((x) => x.rows));
  const solved = ruleSolved(rule, sid) && all.some((x) => x.rows.some((r) => r.c != null));
  return (
    <Card
      id="closure-slope"
      icon={iconFor('closure')}
      title="Central closure to closed capital"
      finding={<Lead c="compare">Two solved cases joined by a line, not a range between them</Lead>}
      unit={<Lead c="measure">{`Each arm’s % difference from the OBR-central path, ${HEADLINE_YEAR}, ${ruleLabel(rule).toLowerCase()}`}</Lead>}
      legend={
        <ul className="ex-slope-key">
          {ARMS.filter((a) => st.arms.includes(a.id)).map((a) => (
            <li key={a.id}>
              <span className="swatch" style={{ borderTopColor: ARM_COLOR[a.id] }} aria-hidden="true" data-icon="" /> {a.short || a.label}
            </li>
          ))}
          <li>
            <span className="ex-slope-key-flip" aria-hidden="true" data-icon="" /> Crosses the path: the sign flips
          </li>
        </ul>
      }
      about={{
        sources: <ResultSources sid={sid} />,
      }}
      method="closures"
      download={{
        title: `Central closure to closed capital, ${HEADLINE_YEAR}`,
        context: () => `${SCEN_NAME[sid]} · ${HEADLINE_YEAR} · % difference from the OBR-central path · ${ruleLabel(rule).toLowerCase()}`,
        table: () => ({
          columns: ['Measure', 'Arm', 'Central closure (%)', 'Closed capital (%)', 'Flips sign'],
          rows: all.flatMap(({ m, rows }) => rows.map((r) => [m.label, r.arm.label, r.c, r.b, r.flips ? 'yes' : 'no'])),
        }),
      }}
    >
      {solved ? (
        <div className="ex-slope">
          {all.map(({ m, rows }) => (
            <Panel key={m.v} m={m} rows={rows} sc={sc} hot={hot} setHot={setHot} sid={sid} />
          ))}
        </div>
      ) : (
        <div className="unpublished-plot">
          <Items items={sentenceItems(ruleSolved(rule, sid) ? 'No arm shown is solved.' : ruleGapText(rule, sid))} />
        </div>
      )}
    </Card>
  );
}
