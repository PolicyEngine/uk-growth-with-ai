'use client';

import { DrawPath, FadeG } from '@/components/story/primitives.jsx';
import { useInView } from '@/components/story/motion.js';
import {
  YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, ARMS, ARM_COLOR, CENTRAL, BOUND, result,
} from '@/tabs/ai/surprise.js';
import { closuresFor } from '@/tabs/ai/lines.js';
import D from '@/data/cohorts2028.json';
import { W, H, scales, linePath, Axes, Figure } from './frame.jsx';

// Part 2's line charts: shapes only, no value labels and no tooltips. Each
// takes the active `state` and draws everything that state needs, so a
// reader landing on any step sees a complete picture. The y range is fixed
// across states, so lines do not rescale as they arrive.
//
// DrawPath draws through stroke-dasharray, so a dashed line (closed capital
// beside the central closure) fades in with FadeG instead.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };
const ZERO = { key: 'zero', label: 'OBR-central path (the zero line)', color: 'var(--pe-gray-700)', thin: true };
const yearTicks = [SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR];
export const series = (sid, arm, cl, v) => {
  const r = result(sid, arm, cl);
  return r.status === 'done' ? r.gaps[v] : null;
};

// What a GDP gap does after the shock is complete in HEADLINE_YEAR, in
// words, so a sentence is true for the scenario and closure in view: it
// "levels off" when it moves by less than a tenth of its HEADLINE_YEAR size
// by LATE_YEAR (the central closure), and otherwise rises, more
// slowly than before HEADLINE_YEAR (closed capital). null when pending.
export function afterWords(ys) {
  if (!ys) return null;
  const y0 = ys[YEARS.indexOf(SURPRISE_YEAR) - 1] ?? 0;
  const h = ys[YEARS.indexOf(HEADLINE_YEAR)];
  const l = ys[YEARS.indexOf(LATE_YEAR)];
  if (![h, l].every(Number.isFinite)) return null;
  if (Math.abs(l - h) < 0.1 * Math.abs(h)) return 'levels off';
  if (l < h) return 'falls back';
  const before = (h - y0) / (HEADLINE_YEAR - SURPRISE_YEAR + 1);
  const after = (l - h) / (LATE_YEAR - HEADLINE_YEAR);
  return after < before ? 'rises more slowly' : 'keeps rising';
}
// The same over several paths: one phrase when they agree.
export const afterWordsAll = (yss) => [...new Set(yss.map(afterWords).filter(Boolean))].join(' or ') || null;

// The area between two paths, for the shaded UK range.
function bandPath(X, Y, xs, lo, hi) {
  const pts = xs.map((x, i) => [x, lo[i], hi[i]]).filter(([, a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (!pts.length) return null;
  const top = pts.map(([x, , b], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(b).toFixed(1)}`).join('');
  const bottom = [...pts].reverse().map(([x, a]) => `L${X(x).toFixed(1)},${Y(a).toFixed(1)}`).join('');
  return `${top}${bottom}Z`;
}

function Line({ d, on, color, dashed, width = 2.25, faint }) {
  const style = { stroke: color, strokeWidth: width, opacity: faint ? 0.55 : 1 };
  if (dashed)
    return (
      <FadeG on={on}>
        <path d={d} fill="none" style={{ ...style, strokeDasharray: '5 4' }} />
      </FadeG>
    );
  return <DrawPath d={d} on={on} style={style} />;
}

// 2: the main arm's GDP gap in each scenario, drawn in turn; the scenario
// chosen in the header in the main arm's colour, the others grey.
// state 0: the zero line only; then UK low, UK central, UK high and
// Korinek et al. in turn. Lines draw once the chart is in view, so the
// first state's lines draw in too.
export const SCEN_STATE = { uk_low: 1, uk_central: 2, uk_high: 3, korinek: 4 };

export function ScenarioPaths({ state, sid, cl }) {
  const [ref, seen] = useInView();
  const lines = SCENARIOS.map((s) => ({ id: s.id, ys: series(s.id, 'tfp', cl, 'Y') })).filter((l) => l.ys);
  const sc = scales(YEARS, lines.flatMap((l) => l.ys));
  const shown = lines.filter((l) => state >= SCEN_STATE[l.id]);
  // the chosen scenario last, so it sits on top
  const order = [...lines].sort((a, b) => (a.id === sid) - (b.id === sid));
  // The UK range, shaded from UK low to UK high once both are drawn, so
  // the Korinek et al. line reads as a case beyond it, not a UK estimate.
  const lo = lines.find((l) => l.id === 'uk_low')?.ys;
  const hi = lines.find((l) => l.id === 'uk_high')?.ys;
  const band = lo && hi ? bandPath(sc.X, sc.Y, YEARS, lo, hi) : null;
  const last = YEARS.length - 1;
  const kys = lines.find((l) => l.id === 'korinek')?.ys;
  const label = `Line chart, shape only: GDP against the OBR-central path in the four scenarios, automation + productivity, ${CL_WORDS[cl]}. ${
    shown.length ? `Drawn: ${shown.map((l) => SCEN_NAME[l.id]).join(', ')}. Each rises from ${SURPRISE_YEAR} and ${afterWordsAll(shown.map((l) => l.ys))} after ${HEADLINE_YEAR}; the larger the scenario, the higher the line.` : 'Only the OBR-central path is drawn.'
  }${band && state >= SCEN_STATE.uk_high ? ' The UK range, from UK low to UK high, is shaded.' : ''}${band && state >= SCEN_STATE.korinek ? ' Korinek et al., on US inputs, lies above it.' : ''}`;
  return (
    <Figure
      title="GDP in the four scenarios"
      unit={`Automation + productivity, ${CL_WORDS[cl]}. Gap against the OBR-central path, %`}
      legend={[
        { key: 'on', label: `${SCEN_NAME[sid]} (chosen above)`, color: ARM_COLOR.tfp, on: true },
        { key: 'off', label: 'Other scenarios', color: 'var(--pe-gray-400)' },
        ZERO,
      ]}
    >
      <svg ref={ref} className="story-svg p2-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <Axes sc={sc} xTicks={yearTicks} markers={[{ x: SURPRISE_YEAR, label: 'AI arrives' }]} />
        {band ? (
          <FadeG on={seen && state >= SCEN_STATE.uk_high}>
            <path d={band} className="p2-band" />
            <text className="p2-band-label" x={sc.X(YEARS[last]) - 4} y={sc.Y((lo[last] + hi[last]) / 2)} textAnchor="end" dominantBaseline="middle">
              UK range
            </text>
          </FadeG>
        ) : null}
        {band && kys ? (
          <FadeG on={seen && state >= SCEN_STATE.korinek}>
            <text className="p2-beyond-label" x={sc.X(YEARS[last]) - 4} y={sc.Y(kys[last]) - 9} textAnchor="end">
              Korinek et al.: US inputs
            </text>
          </FadeG>
        ) : null}
        {order.map((l) => (
          <Line
            key={l.id}
            d={linePath(sc.X, sc.Y, YEARS, l.ys)}
            on={seen && state >= SCEN_STATE[l.id]}
            color={l.id === sid ? ARM_COLOR.tfp : 'var(--pe-gray-400)'}
            width={l.id === sid ? 3 : 1.75}
          />
        ))}
      </svg>
    </Figure>
  );
}

// 3 and 5: the three arms of one scenario for one variable, at the
// closure(s) chosen in the header. Arm i is drawn from state i (state 0
// draws the main arm); `allFrom` draws every arm from that state.
export function ArmPaths({ state, sid, closure, v, title, unit, label, allFrom }) {
  const [ref, seen] = useInView();
  const cls = closuresFor(closure);
  const both = closure === 'both';
  const lines = ARMS.flatMap((a, i) =>
    cls.map((cl) => ({ key: `${a.id}-${cl}`, arm: a.id, i, cl, ys: series(sid, a.id, cl, v) })).filter((l) => l.ys),
  );
  const sc = scales(YEARS, lines.flatMap((l) => l.ys));
  const isOn = (i) => (allFrom != null ? (i === 0 ? true : state >= allFrom) : state >= i);
  // one swatch per arm: the unit line says which closure is dashed
  const legend = ARMS.filter((a, i) => isOn(i)).map((a) => ({ key: a.id, label: a.short, color: ARM_COLOR[a.id] }));
  return (
    <Figure title={title} unit={`${SCEN_NAME[sid]}, ${both ? 'central closure solid, closed capital dashed' : CL_WORDS[cls[0]]}. ${unit}`} legend={[...legend, ZERO]}>
      <svg ref={ref} className="story-svg p2-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <Axes sc={sc} xTicks={yearTicks} markers={[{ x: SURPRISE_YEAR, label: 'AI arrives' }]} />
        {[...lines].reverse().map((l) => (
          <Line
            key={l.key}
            d={linePath(sc.X, sc.Y, YEARS, l.ys)}
            on={seen && isOn(l.i)}
            color={ARM_COLOR[l.arm]}
            dashed={both && l.cl === BOUND}
            width={l.arm === 'tfp' ? 2.75 : 2}
            faint={l.arm === 'ss'}
          />
        ))}
      </svg>
    </Figure>
  );
}

// 4: welfare by birth year, all earnings groups together, the main arm,
// central closure, the Who gains tab's default rule (debt-neutral
// transfers). UK central only. State 0 draws the adults alive in 2028,
// state 1 adds the cohorts that enter later.
export const LAST_ALIVE = D.shock_year - 20; // youngest adult in the shock year
export const WELFARE_RULE = 'dn';
export const welfareCell = () => D.closures[CENTRAL].rules[WELFARE_RULE].tfp;

// Age in the shock year of the adult cohort with the largest change.
export function peakAge() {
  const xs = D.closures[CENTRAL].birth_year;
  const ys = welfareCell().cev_all;
  let best = 0;
  ys.forEach((v, i) => {
    if (xs[i] <= LAST_ALIVE && v > ys[best]) best = i;
  });
  return D.shock_year - xs[best];
}

export function WelfareShape({ state }) {
  const [ref, seen] = useInView();
  const xs = D.closures[CENTRAL].birth_year;
  const ys = welfareCell().cev_all;
  const sc = scales(xs, ys);
  const adults = ys.map((v, i) => (xs[i] <= LAST_ALIVE ? v : NaN));
  const later = ys.map((v, i) => (xs[i] >= LAST_ALIVE ? v : NaN));
  const ticks = xs.filter((x) => x % 20 === 0);
  return (
    <Figure
      title="Welfare change by birth year"
      unit="UK central, automation + productivity, central closure, debt-neutral transfers, all earnings groups. Consumption-equivalent change, %"
    >
      <svg
        ref={ref}
        className="story-svg p2-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Line chart, shape only: welfare change by birth year for adults alive in ${D.shock_year}${state >= 1 ? ' and the cohorts that enter later' : ''}. ${
          ys.every((v) => v > 0) ? 'Every cohort is above zero as modelled. ' : ''
        }Among adults the change is largest ${peakAge() >= 55 ? 'around retirement age' : 'in middle age'}, and small for both the very oldest and the youngest${
          state >= 1 ? `; it is lowest for cohorts entering just after ${D.shock_year}, then higher` : ''
        }.`}
      >
        <Axes
          sc={sc}
          xTicks={ticks}
          markers={[{ x: LAST_ALIVE + 0.5, label: `Adults in ${D.shock_year}`, anchor: 'end' }]}
        />
        <FadeG on={state >= 1}>
          <text data-axis="" x={sc.X(LAST_ALIVE + 0.5) + 5} y={14} className="p2-marker-label">
            Enter later
          </text>
        </FadeG>
        <DrawPath d={linePath(sc.X, sc.Y, xs, adults)} on={seen} style={{ stroke: 'var(--pe-gray-700)', strokeWidth: 2.5 }} />
        <DrawPath d={linePath(sc.X, sc.Y, xs, later)} on={seen && state >= 1} style={{ stroke: 'var(--pe-gray-700)', strokeWidth: 2.5 }} />
      </svg>
    </Figure>
  );
}
