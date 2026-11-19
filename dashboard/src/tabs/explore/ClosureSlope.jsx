'use client';

import { sourcesItems } from './sources.jsx';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card.jsx';
import { Items } from '@/components/story/Items.jsx';
import { useChartBox } from '@/components/story/chart/useChartBox.js';
import ChartHover from '@/components/story/chart/ChartHover.jsx';
import { iconFor } from '@/lib/concepts.js';
import { MEASURE, ruleLabel } from '@/lib/labels.js';
import { useNav } from '@/lib/nav.jsx';
import { HEADLINE_YEAR, CENTRAL, BOUND, ARMS, SCEN_NAME, gap, fmt, ruleSolved } from '@/tabs/ai/surprise.js';
import { VERSION_COLOR as ARM_COLOR, VERSION_TEXT_COLOR as ARM_TEXT_COLOR, VERSION_MAIN, VERSION_TOKEN, versionName } from '@/lib/versionColors.js';
import Legend from '@/components/ui/Legend.jsx';
import { placeLabels } from '@/tabs/story/part2/frame.jsx';
import { side, ruleGapText } from '@/tabs/ai/lines.js';
import { Lead, sentenceItems } from '@/tabs/explore/direction.jsx';

// Some foreign capital -> no foreign capital, per measure: a slope chart of two
// solved cases joined by a straight line (no closure between the two is
// solved, so the line is not a range). Four panels on one y scale, one
// shared legend and unit line above them. Each end carries its value to one
// decimal (the four-measure card above has them to two); where the three
// versions' ends are too close to label without moving a label far from its
// end, only the selected version (the Version control's) is labelled. Where
// the two ends fall on opposite sides of the forecast path the panel says so
// in words. Its sources are the four-measure card's.

// Names from lib/labels.js MEASURE (R1-14): the plain name, with the
// national-accounts code once; national income (NNI) before GNI.
const nm = (v) => (MEASURE[v].abbr === MEASURE[v].short || v === 'w' ? MEASURE[v].short : `${MEASURE[v].short} (${MEASURE[v].abbr})`);
export const SLOPE_MEASURES = [
  { v: 'Y', label: nm('Y'), concept: 'gdp' },
  { v: 'NNI', label: nm('NNI'), concept: 'gni' },
  { v: 'GNI', label: nm('GNI'), concept: 'depreciation' },
  { v: 'w', label: nm('w'), concept: 'pay' },
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

// One y scale for all four panels (so slopes compare), from the data: the
// smallest round step that spans every end in at most five steps, zero
// always on it.
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20];
function scaleOf(rows) {
  const xs = rows.flatMap((r) => [r.c, r.b]).filter((x) => x != null);
  const lo0 = Math.min(0, ...xs) * 1.05;
  const hi0 = Math.max(0, ...xs) * 1.05;
  const step = STEPS.find((s) => Math.ceil(hi0 / s - 1e-9) - Math.floor(lo0 / s + 1e-9) <= 5) ?? Math.ceil((hi0 - lo0) / 5);
  const lo = Math.min(-step, Math.floor(lo0 / step + 1e-9) * step);
  const hi = Math.max(step, Math.ceil(hi0 / step - 1e-9) * step);
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t / step) * step);
  return { lo, hi, ticks, dp: step < 1 && !Number.isInteger(step * 2) ? 2 : step < 1 ? 1 : 0 };
}
const MINUS = '−';
const tickText = (t, dp) => (Math.abs(t) < 1e-9 ? '0' : `${t > 0 ? '+' : MINUS}${Math.abs(t).toFixed(dp)}`);
// an end's value label: one decimal, signed, a true minus ("+0.9", "−1.3")
export const endText = (v) => {
  const a = Math.abs(v).toFixed(1);
  return Number(a) === 0 ? '0.0' : `${v > 0 ? '+' : MINUS}${a}`;
};

// Drawn at the panel's measured width (no viewBox scaling), so the text
// renders at its CSS size on every screen.
const W0 = 420;
const TICK_W = 34; // the y tick labels, right-aligned at this x
const VAL_W = 42; // a value label's column beside each end
const GAP = 8;
const PAD = { t: 14, b: 38 };
const LH = 19; // a value label's height, for collision avoidance
// a label set fits when no label sits further than this from its end
const FIT = 24;
const xLabelHalf = (text, fs) => (text.length * fs * 0.56) / 2;

// The value labels at one end of a panel, spread so they do not collide.
function placeEnd(rows, key, Y, top, bot) {
  const items = rows.filter((r) => r[key] != null && r.b != null).map((r) => ({ key: r.arm.id, v: r[key], lines: [endText(r[key])] }));
  const placed = placeLabels(items, Y, top, bot, LH);
  const fits = placed.every((p) => Math.abs(p.t + LH / 2 - p.y) <= FIT);
  return { placed, fits };
}

function Panel({ m, rows, sc, hot, setHot, sid, sel, phone }) {
  const H = phone ? 236 : 264;
  const { ref: boxRef, width: W } = useChartBox({ width: W0, height: H });
  const x0 = TICK_W + GAP + VAL_W + GAP;
  const x1 = W - GAP - VAL_W;
  const Y = (v) => PAD.t + ((sc.hi - v) / (sc.hi - sc.lo)) * (H - PAD.t - PAD.b);
  const flips = rows.filter((r) => r.flips);
  const pending = rows.filter((r) => r.c != null && r.b == null);
  const active = hot?.v === m.v ? rows.find((r) => r.arm.id === hot.arm) : null;
  const top = PAD.t - 4;
  const bot = H - PAD.b + 4;
  // every version's two ends labelled if both ends fit; else the selected
  // version's only (the shared legend names the lines)
  let L = placeEnd(rows, 'c', Y, top, bot);
  let R = placeEnd(rows, 'b', Y, top, bot);
  const all = L.fits && R.fits;
  if (!all) {
    const one = rows.filter((r) => r.arm.id === sel);
    L = placeEnd(one, 'c', Y, top, bot);
    R = placeEnd(one, 'b', Y, top, bot);
  }
  const fsX = phone ? 13 : 14;
  const someT = 'Some foreign capital';
  const noneT = 'No foreign capital';
  const someX = Math.max(x0, xLabelHalf(someT, fsX));
  const noneX = Math.min(x1, W - xLabelHalf(noneT, fsX));
  const drawn = [...rows.filter((r) => r.arm.id !== sel), ...rows.filter((r) => r.arm.id === sel)];
  // hover (M4): each version's two ends, from the data
  const tipRows = drawn.filter((r) => r.c != null);
  const tips = tipRows.map((r) => ({
    head: `${versionName(r.arm)}, ${m.label}`,
    rows: [
      { name: someT, value: fmt(r.c), color: ARM_COLOR[r.arm.id] },
      { name: noneT, value: r.b == null ? 'not yet solved' : fmt(r.b), color: ARM_COLOR[r.arm.id] },
    ],
    unit: `Gap against the forecast path, ${HEADLINE_YEAR}; ${SCEN_NAME[sid]}.${r.flips ? ' Flips sign.' : ''}`,
    kind: 'result',
  }));
  const endLabels = (side, set) =>
    set.placed.map((p) => {
      const ly = p.t + LH / 2;
      const xd = side === 'l' ? x0 : x1;
      const xt = side === 'l' ? x0 - GAP : x1 + GAP;
      const lead = Math.abs(p.y - ly) > 3;
      return (
        <g key={`${side}${p.key}`} className={`ex-slope-val${p.key === sel ? ' is-sel' : ''}`}>
          {lead ? <path className="ex-slope-leader" d={`M${xd + (side === 'l' ? -5 : 5)},${p.y.toFixed(1)} L${xt + (side === 'l' ? -1 : 1)},${ly.toFixed(1)}`} style={{ stroke: ARM_COLOR[p.key] }} /> : null}
          <text x={xt + (side === 'l' ? -2 : 2)} y={ly} dy="0.35em" textAnchor={side === 'l' ? 'end' : 'start'} style={{ fill: ARM_TEXT_COLOR[p.key] }}>
            {p.lines[0]}
          </text>
        </g>
      );
    });
  return (
    // a small multiple, not a figure of its own: the card is the chart, its
    // unit line the four panels' shared y title
    <div
      className="ex-slope-panel"
      role="group"
      aria-labelledby={`ex-slope-t-${m.v}`}
      data-measure={m.v}
      data-label-exempt={all ? undefined : 'ends too close to label every version: the selected version is labelled, the shared legend above names the lines'}
    >
      <div className="ex-slope-title" id={`ex-slope-t-${m.v}`} data-panel-title="">
        {m.label}
      </div>
      <div ref={boxRef}>
      <ChartHover label={`${m.label}: each version, some to no foreign capital`} items={tips}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${m.label}, ${HEADLINE_YEAR}, some foreign capital to no foreign capital, ${SCEN_NAME[sid]}: ${flips.length ? `flips sign for ${flips.map((r) => versionName(r.arm)).join(' and ')}` : 'no version flips sign'}`}>
        {sc.ticks.map((t) => (
          <g key={t}>
            <line x1={x0} x2={x1} y1={Y(t)} y2={Y(t)} className={Math.abs(t) < 1e-9 ? 'ex-slope-zero' : 'ex-slope-grid'} />
            <text x={TICK_W} y={Y(t)} dy="0.35em" textAnchor="end" className="ex-slope-tick" data-axis="">
              {tickText(t, sc.dp)}
            </text>
          </g>
        ))}
        <text x={someX} y={H - 10} textAnchor="middle" className="ex-slope-tick ex-slope-xlab" data-axis="">
          {someT}
        </text>
        <text x={noneX} y={H - 10} textAnchor="middle" className="ex-slope-tick ex-slope-xlab" data-axis="">
          {noneT}
        </text>
        {drawn.map((r) => {
          if (r.c == null) return null;
          const dim = active && active.arm.id !== r.arm.id;
          const on = () => setHot({ v: m.v, arm: r.arm.id });
          return (
            <g
              key={r.arm.id}
              className={`ex-slope-arm${dim ? ' is-dim' : ''}${r.arm.id === sel ? ' is-sel' : ''}`}
              data-tip={tipRows.indexOf(r)}
              style={{ '--arm': ARM_COLOR[r.arm.id] }}
              tabIndex={0}
              role="button"
              aria-label={`${versionName(r.arm)}, ${m.label}: some foreign capital ${fmt(r.c)}, no foreign capital ${fmt(r.b)}${r.flips ? ', flips sign' : ''}`}
              onMouseEnter={on}
              onFocus={on}
              onMouseLeave={() => setHot(null)}
              onBlur={() => setHot(null)}
            >
              {r.b != null ? <line x1={x0} x2={x1} y1={Y(r.c)} y2={Y(r.b)} className="ex-slope-line" /> : null}
              <circle cx={x0} cy={Y(r.c)} r="3.5" className="ex-slope-dot" />
              {r.b != null ? <circle cx={x1} cy={Y(r.b)} r="3.5" className="ex-slope-dot" /> : null}
            </g>
          );
        })}
        {endLabels('l', L)}
        {endLabels('r', R)}
      </svg>
      </ChartHover>
      </div>
      <div className="ex-slope-foot">
        {active ? (
          <p className="ex-slope-readout" role="status">
            {versionName(active.arm)}: {fmt(active.c)} → {fmt(active.b)}
          </p>
        ) : flips.length ? (
          <p className="ex-slope-note is-flip" data-label-for="flip">
            {`Flips ${side(flips[0].b)} the forecast path: ${flips.map((r) => versionName(r.arm).toLowerCase()).join(', ')}`}
          </p>
        ) : pending.length ? (
          <p className="ex-slope-note">
            No-foreign-capital case not solved for {pending.map((r) => versionName(r.arm).toLowerCase()).join(', ')}
          </p>
        ) : (
          <p className="ex-slope-note">
            Same side of the forecast path in both cases
          </p>
        )}
      </div>
    </div>
  );
}

// Phone layout (one column, the type a step smaller), from the viewport.
function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(max-width: 480px)');
    const read = () => setPhone(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);
  return phone;
}

export default function ClosureSlope({ sid }) {
  const { st } = useNav();
  const [hot, setHot] = useState(null);
  const phone = usePhone();
  const rule = st.rule;
  const shown = ARMS.filter((a) => st.arms.includes(a.id));
  const sel = shown.some((a) => a.id === st.armId) ? st.armId : shown.some((a) => a.id === VERSION_MAIN) ? VERSION_MAIN : shown[0]?.id;
  const all = SLOPE_MEASURES.map((m) => ({ m, rows: slopeRows(sid, st.arms, rule, m.v) }));
  const sc = scaleOf(all.flatMap((x) => x.rows));
  const solved = ruleSolved(rule, sid) && all.some((x) => x.rows.some((r) => r.c != null));
  return (
    <Card
      id="closure-slope"
      sources={sourcesItems({ sid, method: 'closures' })}
      icon={iconFor('closure')}
      title="Some foreign capital to no foreign capital"
      finding={<Lead c="compare">Two solved cases joined by a line, not a range between them</Lead>}
      unit={<span className="ex-slope-unit" data-axis-title="y">{`% gap vs forecast path, ${HEADLINE_YEAR}`}</span>}
      // the versions' key, above the panels (the shared legend; the
      // selected version marked current)
      legend={solved ? <Legend className="ex-slope-legend" label="Versions" items={shown.map((a) => ({ key: a.id, label: versionName(a), color: VERSION_TOKEN[a.id], current: a.id === sel }))} /> : null}
      more={[
        { label: 'Compared with', text: 'The OBR’s central forecast path, for each foreign-capital case.' },
        { label: 'Settings', text: `${ruleLabel(rule)}.` },
      ]}
      download={{
        title: `Some foreign capital to no foreign capital, ${HEADLINE_YEAR}`,
        context: () => `${SCEN_NAME[sid]} · ${HEADLINE_YEAR} · % difference from the OBR’s central forecast path · ${ruleLabel(rule).toLowerCase()}`,
        table: () => ({
          columns: ['Measure', 'Version', 'Some foreign capital (%)', 'No foreign capital (%)', 'Flips sign'],
          rows: all.flatMap(({ m, rows }) => rows.map((r) => [m.label, r.arm.label, r.c, r.b, r.flips ? 'yes' : 'no'])),
        }),
      }}
    >
      {solved ? (
        <>
          <div className="ex-slope">
            {all.map(({ m, rows }) => (
              <Panel key={m.v} m={m} rows={rows} sc={sc} hot={hot} setHot={setHot} sid={sid} sel={sel} phone={phone} />
            ))}
          </div>
        </>
      ) : (
        <div className="unpublished-plot">
          <Items items={sentenceItems(ruleSolved(rule, sid) ? 'No version shown is solved.' : ruleGapText(rule, sid))} />
        </div>
      )}
    </Card>
  );
}
