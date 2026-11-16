'use client';

import { useInView } from '@/components/story/motion.js';
import { BICS_WAVE, EXPOSURE_GROUPS, OBR, OBR_VINTAGE, SERIES } from './data.js';
import { FigTitle, FigUnit, Figure, SourceLine, XTicks, YGrid, linePath, linear, niceTicks, useSvgId, useWidth, yearTicks } from './frame.jsx';
import { span3 } from './format.js';

// Part 1's graphics: four figures, each drawing the complete picture for
// the active state of its scrolly block. Nothing prints a value (the cards
// do, once); ticks are data-axis. Motion follows the scene plan's rule 1:
// a view change of the same data (zoom, a panel growing or shrinking),
// entrance from a baseline (bars grow from zero, lines draw), or tiles
// regrouping. No mark slides from one value to another. Every transition
// is a CSS transition on transform or opacity (story-part1.css), so
// reduced motion shows each state at once and scrolling back reverses it.
//
// Text that belongs to one state only (a band label, a direct label) is
// visibility: hidden in the other states, not just transparent, so the
// page's text at load holds only what that state shows.

const qYear = (q) => Number(q.slice(0, 4));
const qNum = (q) => Number(q.slice(-1));
const longest = (a) => a.reduce((m, s) => (s.length > m.length ? s : m), '');

// A bar from y0 (the zero line) to y1 with a 2px radius on its free end
// only (1px when thinner than 6px); the flat extreme of the cap is the value.
export function barPath(x, w, y0, y1) {
  const up = y1 < y0;
  const len = Math.abs(y1 - y0);
  const r = Math.min(w < 6 ? 1 : 2, w / 2, len);
  const s = up ? 1 : -1; // from the free end back towards the base
  const f = (v) => v.toFixed(2);
  return `M${f(x)},${f(y0)}V${f(y1 + s * r)}Q${f(x)},${f(y1)} ${f(x + r)},${f(y1)}H${f(x + w - r)}Q${f(x + w)},${f(y1)} ${f(x + w)},${f(y1 + s * r)}V${f(y0)}Z`;
}

// ---------------------------------------------------------------------------
// Scene 1A. The output canvas: annual growth bars (state 0), the OBR's
// forecast (1), then this year's quarters (2). State 2 is three beats:
// the x axis zooms to the quarterly window, the annual bars widening and
// sliding with it (a transform on their group, so no bar changes height);
// the annual bars, forecast and annual ticks fade; the quarterly bars grow
// from zero inside each year's slot. Annual and quarterly growth are
// different measures, so no bar ever turns into another.

const OUT_H = 236;
const OUT_M = { l: 34, r: 8, t: 22, b: 24 };

export function OutputCanvas({ state }) {
  const [ref, seen] = useInView();
  const [box, w] = useWidth();
  const clip = useSvgId('p1-out-clip');
  const g = SERIES.gdp_growth;
  const q = SERIES.gdp_quarterly;
  const h = OUT_H;
  const L = OUT_M.l;
  const R = w - OUT_M.r;
  const T = OUT_M.t;
  const B = h - OUT_M.b;
  const fc = state >= 1;
  const zoomed = state >= 2;

  // annual: one slot per year, outturn then the OBR's years
  const x0 = g.x[0];
  const gLast = g.x[g.x.length - 1];
  const x1 = OBR.x[OBR.x.length - 1];
  const slotA = (R - L) / (x1 - x0 + 1);
  const startA = (yr) => L + (yr - x0) * slotA;
  const XA = (yr) => startA(yr) + slotA / 2;
  // the quarterly window: the years its quarters fall in, one slot each
  const z0 = qYear(q.x[0]);
  const z1 = qYear(q.x[q.x.length - 1]);
  const slotZ = (R - L) / (z1 - z0 + 1);
  const XZ = (yr) => L + (yr - z0 + 0.5) * slotZ;
  // the zoom, one transform on the annual marks: maps XA(yr) to XZ(yr)
  const k = slotZ / slotA;
  const tx = L - k * startA(z0);
  const zoomX = (x) => k * x + tx;

  const A = niceTicks([...g.y, ...OBR.y], { withZero: true });
  const YA = linear(A.lo, A.hi, B, T);
  const Q = niceTicks(q.y, { withZero: true });
  const YQ = linear(Q.lo, Q.hi, B, T);

  const bwA = slotA * 0.64;
  const qSlot = slotZ / 4;
  const bwQ = qSlot * 0.64;
  const lastQ = q.x[q.x.length - 1];
  const thisYear = `${z1} Q1${lastQ.endsWith('Q1') ? '' : `–${lastQ.slice(5)}`}`;

  // x ticks, keyed by year: annual every five years (first and last always),
  // the zoomed window every year; each slides with the zoom
  const tA = yearTicks(x0, x1);
  const tZ = Array.from({ length: z1 - z0 + 1 }, (_, i) => z0 + i);
  const tAll = [...new Set([...tA, ...tZ])].sort((a, b) => a - b);

  const minAt = g.x[g.y.indexOf(Math.min(...g.y))];
  const maxAt = g.x[g.y.indexOf(Math.max(...g.y))];
  const label = zoomed
    ? `Bar chart: real GDP growth in each quarter from ${q.x[0]} to ${lastQ}, on the previous quarter, with the quarters of ${z1} marked.`
    : `Bar chart: real GDP growth in each calendar year from ${x0} to ${gLast}, ONS outturn. Growth was lowest in ${minAt}${
        Math.min(...g.y) < 0 ? ', when it was below zero,' : ''
      } and highest in ${maxAt}, the pandemic fall and rebound.${
        fc ? ` A separate dashed line to the right shows the OBR’s forecast, for ${OBR.x[0]} to ${x1}; it is not joined to the bars.` : ''
      }`;
  const titles = [
    `Real GDP growth, ${x0} to ${gLast}`,
    `Real GDP growth, ${x0} to ${gLast}, and the OBR’s forecast to ${x1}`,
    `Real GDP growth by quarter, ${q.x[0]} to ${lastQ}`,
  ];
  const units = [
    `Percentage change on the previous calendar year. ${gLast} is the latest complete year.`,
    `Percentage change on the previous quarter, seasonally adjusted. ${lastQ} is a first estimate.`,
  ];
  const source = zoomed ? (
    <SourceLine
      items={[
        { id: q.source, name: 'GDP quarter-on-quarter growth' },
        { id: 'ons_ihyr', name: 'GDP growth on the same quarter a year earlier' },
      ]}
    />
  ) : (
    <SourceLine
      items={[
        { id: g.source, name: 'GDP year-on-year growth' },
        ...(fc ? [{ id: OBR.source, name: `Economic and fiscal outlook, ${OBR_VINTAGE}`, detail: 'Table A.1' }] : []),
      ]}
    />
  );

  return (
    <Figure
      icon={zoomed ? 'period' : 'gdp'}
      innerRef={ref}
      title={titles[Math.min(state, 2)]}
      titleReserve={longest(titles)}
      unit={units[zoomed ? 1 : 0]}
      unitReserve={longest(units)}
      source={source}
      className="p1-out"
    >
      <div ref={box} className="p1-plot">
        <svg
          className={`story-svg p1-svg p1-canvas${zoomed ? ' is-q' : ''}${fc ? ' is-fc' : ''}${seen ? ' is-seen' : ''}`}
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={label}
          data-state={state}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={L} y={0} width={R - L} height={h} />
            </clipPath>
          </defs>
          <YGrid ticks={A.ticks} Y={YA} x0={L} x1={R} className="p1-annual" />
          <YGrid ticks={Q.ticks} Y={YQ} x0={L} x1={R} className="p1-quarterly" />
          <g clipPath={`url(#${clip})`}>
            <g className="p1-zoom" style={{ transform: zoomed ? `translate(${tx.toFixed(2)}px, 0px) scale(${k.toFixed(4)}, 1)` : 'translate(0px, 0px) scale(1, 1)' }}>
              <g className="p1-annual">
                <rect x={startA(2020)} y={T} width={2 * slotA} height={B - T} className="p1-band" />
                <rect x={startA(OBR.x[0])} y={T} width={R - startA(OBR.x[0])} height={B - T} className="p1-band p1-only-fc" />
                {g.x.map((x, i) => (
                  <path
                    key={x}
                    d={barPath(XA(x) - bwA / 2, bwA, YA(0), YA(g.y[i]))}
                    className={`p1-bar p1-bar-a${g.y[i] < 0 ? ' is-neg' : ''}${seen ? ' is-on' : ''}`}
                    style={{ transitionDelay: seen ? `${Math.min(i * 20, 400)}ms` : '0ms' }}
                  />
                ))}
                <path d={linePath(XA, YA, OBR.x, OBR.y)} className="p1-forecast p1-only-fc" />
              </g>
            </g>
          </g>
          {/* the forecast's open dots move with the zoom (not scaled), so they stay round */}
          <g className="p1-annual">
            {OBR.x.map((x, i) => (
              <circle
                key={x}
                cx={0}
                cy={YA(OBR.y[i])}
                r={3.5}
                className="p1-forecast-dot p1-only-fc p1-zoom"
                style={{ transform: `translateX(${(zoomed ? zoomX(XA(x)) : XA(x)).toFixed(2)}px)` }}
              />
            ))}
          </g>
          {/* band labels, above the plot */}
          <text x={startA(2020) + 2} y={T - 8} className="p1-note p1-only-a">
            Pandemic
          </text>
          <text x={startA(OBR.x[0]) + 2} y={T - 8} className="p1-note p1-only-fc">
            OBR forecast
          </text>
          {/* quarters: they grow from zero once the zoom has landed */}
          <rect x={L + (z1 - z0) * slotZ} y={T} width={slotZ} height={B - T} className="p1-band p1-only-q" />
          <text x={R} y={T - 8} textAnchor="end" className="p1-note p1-only-q">
            {thisYear}: year not yet complete
          </text>
          <g className="p1-quarterly">
            {q.x.map((qq, i) => {
              const yr = qYear(qq);
              const x = L + (yr - z0) * slotZ + (qNum(qq) - 0.5) * qSlot - bwQ / 2;
              return (
                <path
                  key={qq}
                  d={barPath(x, bwQ, YQ(0), YQ(q.y[i]))}
                  className={`p1-bar p1-bar-q${yr === z1 ? ' is-now' : ''}${q.y[i] < 0 ? ' is-neg' : ''}${zoomed ? ' is-on' : ''}`}
                  style={{ transitionDelay: zoomed ? `${900 + Math.min(i * 20, 400)}ms` : '0ms' }}
                />
              );
            })}
          </g>
          {tAll.map((yr) => {
            const inZ = tZ.includes(yr);
            const on = zoomed ? inZ : tA.includes(yr);
            const x = zoomed ? (inZ ? XZ(yr) : zoomX(XA(yr))) : XA(yr);
            return (
              <text
                key={yr}
                data-axis=""
                x={0}
                y={h - 6}
                textAnchor="middle"
                className={`p1-tick p1-xt${on ? ' is-on' : ''}`}
                style={{ transform: `translateX(${x.toFixed(2)}px)` }}
              >
                {yr}
              </text>
            );
          })}
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Scene 1B. The labour board: one large panel with the step's series and
// full axes, over four sparklines of the other series (line, name, end dot,
// no axes, each on its own scale). Each series is drawn once, in a unit box
// on its own domain; its group's transform places it in the panel or in a
// sparkline slot, so a change of focus is a view change of the same data:
// the incoming series grows from its slot into the panel while the old one
// shrinks into the slot it leaves. The axes then fade in for the new focus.
// Clicking a sparkline (`onPick(i)`) brings its step to the trigger line,
// the same as scrolling to it.

const N = 1000; // the unit box each series is drawn in
const BOARD_H = 270;
const BOARD_M = { l: 34, r: 8, t: 10 };
const PANEL_B = 176;
const STRIP_NOTE_Y = 216;
const STRIP_NAME_Y = 234;
const SPARK = { y: 240, h: 26 };
const CELL_GAP = 14;

export const boardSeries = () => {
  const e = SERIES.employment_rate;
  const u = SERIES.unemployment_rate;
  const p = SERIES.pay_growth;
  const o = SERIES.productivity_oph;
  const s = SERIES.labour_share;
  const span = (x) => `${x.x[0].slice(0, 4)} to ${span3(x.last)}`;
  const rolling = 'rolling three-month averages, seasonally adjusted';
  return [
    {
      key: 'employment_rate',
      s: e,
      icon: 'labour',
      name: 'Employment',
      long: 'the employment rate for people aged 16 to 64',
      span: span(e),
      title: `Employment rate, ${span(e)}`,
      unit: `Per cent of people aged 16 to 64; ${rolling}`,
      src: [{ id: e.source, name: 'employment rate' }],
    },
    {
      key: 'unemployment_rate',
      s: u,
      zero: true,
      icon: 'labour',
      name: 'Unemployment',
      long: 'the unemployment rate for people aged 16 and over',
      span: span(u),
      title: `Unemployment rate, ${span(u)}`,
      unit: `Per cent of economically active people aged 16 and over; ${rolling}`,
      src: [{ id: u.source, name: 'unemployment rate' }],
    },
    {
      key: 'pay_growth',
      s: p,
      zero: true,
      area: true,
      icon: 'pay',
      name: 'Pay growth',
      long: 'growth of average weekly regular pay on a year earlier',
      span: span(p),
      title: `Regular pay growth, ${span(p)}`,
      unit: 'Percentage change on the same three months a year earlier, excluding bonuses, before adjusting for inflation',
      src: [{ id: p.source, name: 'average weekly earnings, regular pay' }],
    },
    {
      key: 'productivity_oph',
      s: o,
      icon: 'productivity',
      name: 'Output per hour',
      long: 'output per hour worked in the whole economy, a quarterly index with 2023 equal to 100',
      span: `${o.x[0]} to ${o.x[o.x.length - 1]}`,
      title: `Output per hour worked, whole economy, ${o.x[0]} to ${o.x[o.x.length - 1]}`,
      unit: 'Index, 2023 = 100, quarterly, seasonally adjusted',
      src: [{ id: o.source, name: 'output per hour worked' }],
    },
    {
      key: 'labour_share',
      s,
      icon: 'labourShare',
      name: 'Labour share',
      long: 'compensation of employees as a share of GDP, annual',
      span: `${s.x[0]} to ${s.x[s.x.length - 1]}`,
      title: `Compensation of employees as a share of GDP, ${s.x[0]} to ${s.x[s.x.length - 1]}`,
      unit: `Per cent of GDP at current prices, annual; ends at ${s.x[s.x.length - 1]}, the latest full year`,
      src: [
        { id: 'ons_dtwm', name: 'compensation of employees' },
        { id: 'ons_ybha', name: 'GDP at current prices' },
      ],
    },
  ];
};

// One series in its unit box: x over its own span, y over its own domain
// (zero included for unemployment and pay growth).
function unitSeries(b) {
  const t = b.s.t ?? b.s.x;
  const d = niceTicks(b.s.y, { withZero: !!b.zero });
  const U = linear(t[0], t[t.length - 1], 0, N);
  const V = linear(d.lo, d.hi, N, 0);
  const d0 = linePath(U, V, t, b.s.y);
  const end = [U(t[t.length - 1]), V(b.s.y[b.s.y.length - 1])];
  const area = b.area ? `${d0}L${N},${V(0).toFixed(1)}L0,${V(0).toFixed(1)}Z` : null;
  return { t, d, d0, end, area, top: V(Math.max(...b.s.y)), zeroV: V(0) };
}

const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs.join(''));

export function LabourBoard({ focus, onPick }) {
  const [ref, seen] = useInView();
  const [box, w] = useWidth();
  const gid = useSvgId('p1-pay-fade');
  const all = boardSeries();
  const L = BOARD_M.l;
  const R = w - BOARD_M.r;
  const T = BOARD_M.t;
  const B = PANEL_B;
  // four sparklines in a row; two rows of two below 480px, where four
  // names would collide
  const cols = w < 480 ? 2 : 4;
  const rowH = 44;
  const boardH = BOARD_H + (4 / cols - 1) * rowH;
  const cellW = (R - L - (cols - 1) * CELL_GAP) / cols;
  const f = Math.max(0, Math.min(focus, all.length - 1));
  const others = all.filter((_, i) => i !== f);
  const slotOf = (i) => {
    if (i === f) return { x: L, y: T, w: R - L, h: B - T };
    const k = others.indexOf(all[i]);
    const row = Math.floor(k / cols);
    return { x: L + (k % cols) * (cellW + CELL_GAP), y: SPARK.y + row * rowH, w: cellW, h: SPARK.h, nameY: STRIP_NAME_Y + row * rowH };
  };
  const cur = all[f];
  const label = `Line chart: ${cur.long}, ${cur.span}. Four smaller charts below it show ${andList(others.map((o) => o.name.toLowerCase()))}, each on its own scale.`;
  return (
    <Figure
      icon={cur.icon}
      innerRef={ref}
      title={cur.title}
      titleReserve={longest(all.map((b) => b.title))}
      unit={cur.unit}
      unitReserve={longest(all.map((b) => b.unit))}
      source={<SourceLine items={cur.src} />}
      className="p1-board"
    >
      <div ref={box} className="p1-plot">
        <svg
          className={`story-svg p1-svg p1-board-svg${seen ? ' is-seen' : ''}`}
          width="100%"
          height={boardH}
          viewBox={`0 0 ${w} ${boardH}`}
          role="img"
          aria-label={label}
          data-focus={f}
        >
          {all.map((b, i) => {
            const u = unitSeries(b);
            const Y = linear(u.d.lo, u.d.hi, B, T);
            const X = linear(u.t[0], u.t[u.t.length - 1], L, R);
            const xt = yearTicks(u.t[0], u.t[u.t.length - 1]).map((yr) => {
              const x = X(Math.max(yr, u.t[0]));
              return { key: yr, x, label: String(yr), anchor: x > R - 16 ? 'end' : x < L + 16 ? 'start' : 'middle' };
            });
            return (
              <g key={b.key} className={`p1-board-axes${i === f ? ' is-on' : ''}`}>
                <YGrid ticks={u.d.ticks} Y={Y} x0={L} x1={R} />
                <XTicks ticks={xt} y={B + 18} />
              </g>
            );
          })}
          <text x={L} y={STRIP_NOTE_Y} className="p1-note">
            The other four, each on its own scale
          </text>
          {all.map((b, i) => {
            const u = unitSeries(b);
            const sl = slotOf(i);
            const on = i === f;
            const tr = `translate(${sl.x.toFixed(2)}px, ${sl.y.toFixed(2)}px) scale(${(sl.w / N).toFixed(5)}, ${(sl.h / N).toFixed(5)})`;
            const ex = sl.x + (u.end[0] * sl.w) / N;
            const ey = sl.y + (u.end[1] * sl.h) / N;
            return (
              <g key={b.key} className={`p1-board-series${on ? ' is-focus' : ''}`}>
                {u.area ? (
                  <defs>
                    <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={u.top} y2={u.zeroV}>
                      <stop offset="0" stopColor="var(--pe-gray-800)" stopOpacity="0.18" />
                      <stop offset="1" stopColor="var(--pe-gray-800)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                ) : null}
                <g className="p1-board-move" style={{ transform: tr }}>
                  {u.area ? <path d={u.area} className="p1-board-area" style={{ fill: `url(#${gid})` }} /> : null}
                  <path d={u.d0} className={`p1-board-line${seen ? ' is-drawn' : ''}`} />
                </g>
                <circle cx={0} cy={0} r={3.5} className="p1-board-end p1-board-move" style={{ transform: `translate(${ex.toFixed(2)}px, ${ey.toFixed(2)}px)` }} />
                <text x={0} y={0} className={`p1-spark-name${on ? '' : ' is-on'}`} style={{ transform: `translate(${sl.x.toFixed(2)}px, ${sl.nameY ?? STRIP_NAME_Y}px)` }}>
                  {b.name}
                </text>
              </g>
            );
          })}
        </svg>
        {onPick ? (
          <div className="p1-spark-hits">
            {others.map((o) => {
              const i = all.indexOf(o);
              const sl = slotOf(i);
              return (
                <button
                  key={o.key}
                  type="button"
                  className="p1-spark-hit"
                  style={{ left: `${(sl.x / w) * 100}%`, width: `${(sl.w / w) * 100}%`, top: sl.nameY - 14, height: SPARK.y + SPARK.h - STRIP_NAME_Y + 18 }}
                  aria-label={`Show ${o.name.toLowerCase()} on the large chart`}
                  onClick={() => onPick(i)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Scene 1C. AI arrives: the share of businesses using AI by survey wave
// (state 0: all businesses; 1: + businesses with 10 or more employees),
// then the exposure tiles.

const AI_H = 220;
const AI_M = { l: 34, r: 10, t: 12, b: 24 };

export function AiUseChart({ state }) {
  const [ref, seen] = useInView();
  const [box, w] = useWidth();
  const gid = useSvgId('p1-ai-fade');
  const a = SERIES.business_ai_use;
  const b = SERIES.business_ai_use_10plus;
  const idx = a.x.map((_, i) => i);
  const last = idx.length - 1;
  const L = AI_M.l;
  const R = w - AI_M.r;
  const T = AI_M.t;
  const B = AI_H - AI_M.b;
  const D = niceTicks([...a.y, ...b.y], { withZero: true });
  const X = linear(0, last, L + 4, R - 4);
  const Y = linear(D.lo, D.hi, B, T);
  const two = state >= 1;
  const short = (d) => d.replace(/^\d+ /, '');
  const dA = linePath(X, Y, idx, a.y);
  const area = `${dA}L${X(last).toFixed(1)},${Y(0).toFixed(1)}L${X(0).toFixed(1)},${Y(0).toFixed(1)}Z`;
  return (
    <Figure
      icon="ai"
      innerRef={ref}
      title={`Businesses using at least one AI technology, ${short(a.x[0])} to ${short(a.x[last])}`}
      unit="Per cent of businesses, by survey wave (dated at its midpoint)"
      source={<SourceLine items={[{ id: a.source, name: 'Business Insights and Conditions Survey', detail: `Wave ${BICS_WAVE}, Figure 1` }]} />}
      className="p1-ai"
    >
      <div ref={box} className="p1-plot">
        <svg
          className={`story-svg p1-svg p1-ai-svg${two ? ' is-two' : ''}`}
          width="100%"
          height={AI_H}
          viewBox={`0 0 ${w} ${AI_H}`}
          role="img"
          aria-label={`Line chart: share of businesses using at least one AI technology, by survey wave from ${a.x[0]} to ${a.x[last]}, all businesses${two ? ', and businesses with 10 or more employees' : ''}.`}
        >
          <defs>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={Y(Math.max(...a.y))} y2={Y(0)}>
              <stop offset="0" stopColor="var(--pe-gray-800)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--pe-gray-800)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <YGrid ticks={D.ticks} Y={Y} x0={L} x1={R} />
          <XTicks
            y={AI_H - 6}
            ticks={[
              { x: X(0), label: short(a.x[0]), anchor: 'start', key: 'a' },
              { x: X(last), label: short(a.x[last]), anchor: 'end', key: 'b' },
            ]}
          />
          <path d={area} className={`p1-ai-area${seen ? ' is-on' : ''}`} style={{ fill: `url(#${gid})` }} />
          <path d={linePath(X, Y, idx, b.y)} pathLength={1} className={`draw-path p1-ai-line is-ten${seen && two ? ' is-on' : ''}`} />
          <path d={dA} pathLength={1} className={`draw-path p1-ai-line is-all${seen ? ' is-on' : ''}`} />
          {idx.map((i) => (
            <g key={i}>
              <circle cx={X(i)} cy={Y(b.y[i])} r={i === last ? 3.5 : 2.25} className={`p1-ai-dot is-ten${seen && two ? ' is-on' : ''}`} />
              <circle cx={X(i)} cy={Y(a.y[i])} r={i === last ? 3.5 : 2.25} className={`p1-ai-dot is-all${seen ? ' is-on' : ''}`} />
            </g>
          ))}
          <text x={X(last) - 8} y={Y(b.y[last]) - 10} textAnchor="end" className={`p1-end-label is-ten${two ? ' is-on' : ''}`}>
            10 or more employees
          </text>
          <text x={X(last) - 4} y={Y(a.y[last]) + 26} textAnchor="end" className="p1-end-label is-all is-on">
            All businesses
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// 100 tiles, one per cent of UK workers each, regrouping into the three
// exposure groups DSIT reports. Same keys in both states, so the tiles
// travel. state 0: one block in grey; 1: three groups on the rank ramp,
// staggered by destination group then row (at most about 450ms), each
// tile's colour changing in the last third of its travel. The group names
// fade in as the last tile lands.
const GRID_W = 17;
const GRID_H = 10;
const TILE = 14;
const TILE_GAP = 3;

export function exposureTiles(state) {
  const groups = EXPOSURE_GROUPS.flatMap((g, gi) => Array.from({ length: Math.round(g.value) }, (_, j) => ({ g, gi, j })));
  return groups.map(({ g, gi, j }, i) => {
    if (state < 1) return { key: `t${i}`, x: 3.5 + (i % 10), y: Math.floor(i / 10), color: 'var(--pe-gray-400)', delay: Math.floor(i / 10) * 12 };
    const row = Math.floor(j / 5);
    return { key: `t${i}`, x: gi * 6 + (j % 5), y: GRID_H - 1 - row, color: g.color, delay: gi * 110 + row * 14 };
  });
}

export function ExposureTiles({ state, source }) {
  const grouped = state >= 1;
  const step = TILE + TILE_GAP;
  const label = grouped
    ? 'A grid of 100 tiles, each one per cent of UK workers, in three groups by exposure to AI: high exposure and high complementarity, high exposure and low complementarity, and low exposure.'
    : 'A grid of 100 tiles, each one per cent of UK workers.';
  return (
    <figure className={`p1-figure p1-exposure${grouped ? ' is-grouped' : ''}`}>
      <FigTitle icon="workers" title={grouped ? 'UK workers by exposure to AI' : 'UK workers'} reserve="UK workers by exposure to AI" />
      <FigUnit>Each tile is one per cent of UK workers</FigUnit>
      <div className="p1-tiles">
        <svg className="tile-grid p1-tile-grid" viewBox={`0 0 ${GRID_W * step} ${GRID_H * step}`} role="img" aria-label={label}>
          {exposureTiles(state).map((t) => (
            <rect
              key={t.key}
              className="tile p1-tile"
              width={TILE}
              height={TILE}
              rx={2}
              style={{ transform: `translate(${t.x * step}px, ${t.y * step}px)`, fill: t.color, transitionDelay: `${t.delay}ms, ${t.delay + 500}ms` }}
            />
          ))}
        </svg>
      </div>
      <ol className={`p1-groups${grouped ? ' is-on' : ''}`} aria-hidden={grouped ? undefined : true}>
        {EXPOSURE_GROUPS.map((g) => (
          <li key={g.id}>
            <span className="p1-swatch is-block" style={{ '--sw': g.color }} aria-hidden="true" />
            {g.name}
          </li>
        ))}
      </ol>
      <figcaption>{source}</figcaption>
    </figure>
  );
}
