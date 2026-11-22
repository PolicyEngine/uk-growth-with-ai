'use client';

import { useEnterState, useDrawIn } from '@/components/story/motion.js';
import { TileField } from '@/components/story/primitives.jsx';
import { ChartHover, Crosshair, ModelBadge, barPath as chartBar } from '@/components/story/chart/index.js';
import { BICS_WAVE, EXPOSURE_GROUPS, FACTS, OBR, OBR_VINTAGE, OPH_BASE, SERIES } from './data.js';
import { WORKERS_PERIOD, aiTitle, employmentTitle, forecastTitle, outputTitle, payTitle, productivityTitle, workersTitle } from './findings.js';
import { FigTitle, FigUnit, Figure, SourceLine, XTicks, YGrid, linePath, linear, niceTicks, useBox, useSvgId, yearTicks } from './frame.jsx';
import { idx1, pct1, share0, span3, tick } from './format.js';

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

// The marks part 1's step texts point at (highlight.jsx): id -> colour,
// marker shape and label. A step's highlight names these ids, the figure's
// marks carry them as data-mark, and <Key id> in the text takes the colour
// and shape, so the coloured words are the legend. Teal and amber are kept
// for gains and losses, so none is used here.
export const P1_MARKS = {
  'gdp-latest': { color: 'var(--p1-ink)', shape: 'square', label: 'the latest full year' },
  'gdp-annual': { color: 'var(--pe-gray-500)', shape: 'square', label: 'earlier years' },
  'obr-forecast': { color: 'var(--p1-ink)', shape: 'circle', label: 'the OBR’s forecast' },
  'q-now': { color: 'var(--p1-ink)', shape: 'square', label: 'this year’s quarters' },
  'q-past': { color: 'var(--pe-gray-400)', shape: 'square', label: 'earlier quarters' },
  employment: { color: 'var(--series-2)', shape: 'circle', label: 'Employment' },
  unemployment: { color: 'var(--c-labour)', shape: 'square', label: 'Unemployment' },
  pay: { color: 'var(--c-capital)', shape: 'triangle', label: 'Pay growth' },
  productivity: { color: 'var(--rank-1)', shape: 'diamond', label: 'Output per hour' },
  share: { color: 'var(--series-5)', shape: 'line', label: 'Employees’ share' },
  'ai-all': { color: 'var(--series-2)', shape: 'circle', label: 'All businesses' },
  'ai-ten': { color: 'var(--c-labour)', shape: 'square', label: '10 or more employees' },
  workers_high_exposure_high_complementarity: { color: 'var(--rank-1)', shape: 'square', label: 'High exposure, AI could help (high complementarity)' },
  workers_high_exposure_low_complementarity: { color: 'var(--rank-2)', shape: 'square', label: 'High exposure, AI could replace tasks (low complementarity)' },
  workers_low_exposure: { color: 'var(--rank-3)', shape: 'square', label: 'Low exposure' },
};
const mk = (id) => ({ '--mk': P1_MARKS[id].color });

const qYear = (q) => Number(q.slice(0, 4));
const qNum = (q) => Number(q.slice(-1));
const longest = (a) => a.reduce((m, s) => (s.length > m.length ? s : m), '');

// A vertical bar from y0 (the zero line) to y1, from the shared Bars
// outline: a 2px radius on its free end only (1px when thinner than 6px).
export const barPath = (x, w, y0, y1) => chartBar({ pos: x, size: w, from: y0, to: y1 });

// ---------------------------------------------------------------------------
// Scene 1A. The output canvas: annual growth bars growing left to right
// (state 0), the OBR's forecast drawing in left to right (1: a clip-path
// wipe and its dots in turn), then this year's quarters (2). State 2 is three beats:
// the x axis zooms to the quarterly window, the annual bars widening and
// sliding with it (a transform on their group, so no bar changes height);
// the annual bars, forecast and annual ticks fade; the quarterly bars grow
// from zero inside each year's slot. Annual and quarterly growth are
// different measures, so no bar ever turns into another.

const OUT_H = 218;
const OUT_M = { l: 34, r: 8, t: 22, b: 24 };

// The forecast years the card names, as indices into the OBR's series:
// the first two and the last.
export const OBR_NAMED = [0, 1, OBR.y.length - 1];

export function OutputCanvas({ state, notes }) {
  const [ref, seen] = useDrawIn();
  const [box, w, h] = useBox(OUT_H);
  const clip = useSvgId('p1-out-clip');
  const g = SERIES.gdp_growth;
  const q = SERIES.gdp_quarterly;
  const L = OUT_M.l;
  const R = w - OUT_M.r;
  // narrow (phones): the quarterly state's two labels over the plot take
  // two lines (side by side they overlapped at 390), so the plot starts
  // 16px lower; the figure's height is unchanged
  const narrow = R - L < 460;
  const T = OUT_M.t + (narrow ? 16 : 0);
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
  // findings as titles (story-finding-titles-fable.md). The quarterly
  // state keeps its label, marked as a fallback (check_text prints it): the
  // ruling took it as not reached, but the third card shows it, and its
  // step already says every quarter grew, so its finding needs a ruling
  const heads = [outputTitle(), forecastTitle(), { title: `Real GDP growth by quarter, ${q.x[0]} to ${lastQ}`, fallback: true }];
  const titles = heads.map((x) => x.title);
  const units = [
    `Real GDP, percentage change on the previous calendar year, ${x0} to ${gLast}. ONS.`,
    `Real GDP, percentage change on the previous year: ONS outturn to ${gLast}; OBR forecast, ${OBR_VINTAGE}, to ${x1}.`,
    `Percentage change on the previous quarter, seasonally adjusted. ${lastQ} is a first estimate.`,
  ];
  const source = zoomed ? (
    <SourceLine
      items={[
        { id: q.source, name: 'GDP quarterly growth' },
        { id: 'ons_ihyr', name: 'GDP growth on a year earlier' },
      ]}
      through={`${lastQ}, first estimate`}
      notes={notes}
    />
  ) : (
    <SourceLine
      items={[
        { id: g.source, name: 'GDP year-on-year growth' },
        ...(fc ? [{ id: OBR.source, name: `Economic and fiscal outlook, ${OBR_VINTAGE}`, detail: 'Table A.1' }] : []),
      ]}
      through={fc ? `${gLast}; OBR forecast to ${x1}` : String(gLast)}
      notes={notes}
    />
  );

  // the crosshair's read-out: the bars' values by year (outturn, then the
  // OBR's years once drawn), or by quarter once zoomed; mounted only while
  // a pointer, touch or key is on the chart
  const years = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
  const at = (xs, ys) => years.map((yr) => (xs.includes(yr) ? ys[xs.indexOf(yr)] : NaN));
  const qIdx = q.x.map((_, i) => i);
  const qX = (i) => L + (qYear(q.x[i]) - z0) * slotZ + (qNum(q.x[i]) - 0.5) * qSlot;
  const cross = zoomed
    ? {
        xs: qIdx,
        x: linear(0, q.x.length - 1, qX(0), qX(q.x.length - 1)),
        y: YQ,
        formatX: (i) => q.x[i],
        unit: 'Percentage change on the previous quarter',
        series: [{ key: 'q', name: 'Real GDP growth', icon: 'gdp', color: 'var(--pe-gray-800)', ys: q.y, format: pct1 }],
      }
    : {
        xs: years,
        x: linear(x0, x1, XA(x0), XA(x1)),
        y: YA,
        unit: 'Percentage change on the previous calendar year',
        series: [
          { key: 'ons', name: 'ONS outturn', icon: 'gdp', color: 'var(--pe-gray-800)', ys: at(g.x, g.y), format: pct1 },
          ...(fc ? [{ key: 'obr', name: 'OBR forecast', icon: 'forecast', color: 'var(--pe-gray-800)', ys: at(OBR.x, OBR.y), format: pct1 }] : []),
        ],
      };
  return (
    <Figure
      icon={zoomed ? 'period' : 'gdp'}
      innerRef={ref}
      title={titles[Math.min(state, 2)]}
      titleFallback={heads[Math.min(state, 2)].fallback}
      titleReserve={longest(titles)}
      unit={units[zoomed ? 2 : Math.min(state, 1)]}
      unitReserve={longest(units)}
      source={source}
      className="p1-out"
    >
      <div ref={box} className="p1-plot">
        <Crosshair {...cross} width={w} height={h} top={T} bottom={B} label={label}>
        <g className={`p1-canvas${zoomed ? ' is-q' : ''}${fc ? ' is-fc' : ''}${seen ? ' is-seen' : ''}`} data-state={state}>
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
                    data-mark={i === g.x.length - 1 ? 'gdp-latest' : 'gdp-annual'}
                    style={{ transitionDelay: seen ? `${Math.min(i * 20, 400)}ms` : '0ms' }}
                  />
                ))}
                <path d={linePath(XA, YA, OBR.x, OBR.y)} className="p1-forecast p1-only-fc" data-mark="obr-forecast" />
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
                data-mark="obr-forecast"
                style={{ transform: `translateX(${(zoomed ? zoomX(XA(x)) : XA(x)).toFixed(2)}px)`, '--i': i }}
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
          {/* the two series of the quarterly state, labelled directly (check_axes) */}
          <text x={L + 2} y={T - (narrow ? 25 : 8)} className="p1-note p1-only-q" data-label-for="q-past">
            Earlier quarters
          </text>
          <text x={R} y={T - 8} textAnchor="end" className="p1-note p1-only-q" data-label-for="q-now">
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
                  data-mark={yr === z1 ? 'q-now' : 'q-past'}
                  data-series={yr === z1 ? 'q-now' : 'q-past'}
                  style={{ transitionDelay: zoomed ? `${600 + Math.min(i * 20, 400)}ms` : '0ms' }}
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
                // the last year on the plot's right edge, end-anchored so the
                // svg does not cut it (edge probe: "2031" at 390)
                textAnchor={x > R - 14 ? 'end' : 'middle'}
                className={`p1-tick p1-xt${on ? ' is-on' : ''}`}
                style={{ transform: `translateX(${x.toFixed(2)}px)` }}
              >
                {yr}
              </text>
            );
          })}
        </g>
        </Crosshair>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Scene 1B. The labour board: one panel, the step's series with its full
// axes (employment, regular pay growth, output per hour; one per card).
// Each series is drawn once in a unit box on its own domain and placed in
// the panel; a change of focus fades the old series and axes out and the
// new ones in. Unemployment and the employee share are in UK vitals only.

const N = 1000; // the unit box each series is drawn in
const BOARD_H = 230;
const BOARD_M = { l: 34, r: 8, t: 10, b: 28 };

export const boardSeries = () => {
  const e = SERIES.employment_rate;
  const p = SERIES.pay_growth;
  const o = SERIES.productivity_oph;
  const span = (x) => `${x.x[0].slice(0, 4)} to ${span3(x.last)}`;
  return [
    {
      key: 'employment_rate',
      mark: 'employment',
      tipUnit: '% of people aged 16 to 64, three-month average',
      s: e,
      icon: 'labour',
      name: 'Employment',
      long: 'the employment rate for people aged 16 to 64',
      span: span(e),
      head: employmentTitle(),
      unit: `Per cent of people aged 16 to 64, three-month average, seasonally adjusted, ${span(e)}. ONS.`,
      src: [{ id: e.source, name: 'employment rate' }],
    },
    {
      key: 'pay_growth',
      mark: 'pay',
      tipUnit: '% on a year earlier, three-month average',
      s: p,
      zero: true,
      area: true,
      icon: 'pay',
      name: 'Pay growth',
      long: 'growth of average weekly regular pay on a year earlier',
      span: span(p),
      head: payTitle(),
      unit: `Percentage change on a year earlier, excluding bonuses, before inflation, three-month average, ${span(p)}. ONS.`,
      src: [{ id: p.source, name: 'average weekly earnings, regular pay' }],
    },
    {
      key: 'productivity_oph',
      mark: 'productivity',
      tipUnit: `Index, ${OPH_BASE} = 100`,
      s: o,
      icon: 'productivity',
      name: 'Output per hour',
      long: `output per hour worked in the whole economy, a quarterly index with ${OPH_BASE} equal to 100`,
      span: `${o.x[0]} to ${o.x[o.x.length - 1]}`,
      head: productivityTitle(),
      unit: `Index, ${OPH_BASE} = 100, quarterly, seasonally adjusted, whole economy, ${o.x[0]} to ${o.x[o.x.length - 1]}. ONS.`,
      src: [{ id: o.source, name: 'output per hour worked' }],
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

// "2026 JUL" -> "Jul 2026" (a rolling three-month average's middle month);
// quarters and years as they are
const periodLabel = (x) => {
  const m = String(x).match(/^(\d{4}) ([A-Z]{3})$/);
  return m ? `${m[2][0]}${m[2].slice(1).toLowerCase()} ${m[1]}` : String(x);
};

export function LabourBoard({ focus, notes }) {
  const [ref, seen] = useDrawIn();
  const [box, w, h] = useBox(BOARD_H);
  const gid = useSvgId('p1-pay-fade');
  const all = boardSeries();
  // the left margin holds the widest tick label of the three series (an
  // index tick such as 102.5 is five characters), at about 7px a character
  const widest = Math.max(...all.map((x) => Math.max(...unitSeries(x).d.ticks.map((t) => tick(t).length))));
  const L = Math.max(BOARD_M.l, Math.ceil(widest * 7.2 + 10));
  const R = w - BOARD_M.r;
  const T = BOARD_M.t;
  const B = h - BOARD_M.b;
  const f = Math.max(0, Math.min(focus, all.length - 1));
  const cur = all[f];
  // the crosshair reads the series in focus, as its card formats it
  const ct = cur.s.t ?? cur.s.x;
  const cd = niceTicks(cur.s.y, { withZero: !!cur.zero });
  const boardCross = {
    xs: ct,
    x: linear(ct[0], ct[ct.length - 1], L, R),
    y: linear(cd.lo, cd.hi, B, T),
    formatX: (t) => periodLabel(cur.s.x[ct.indexOf(t)]),
    unit: cur.tipUnit,
    series: [{ key: cur.key, name: cur.name, icon: cur.icon, color: 'var(--pe-gray-800)', ys: cur.s.y, format: cur.key === 'productivity_oph' ? idx1 : pct1 }],
  };
  const label = `Line chart: ${cur.long}, ${cur.span}.`;
  const tr = `translate(${L}px, ${T}px) scale(${((R - L) / N).toFixed(5)}, ${((B - T) / N).toFixed(5)})`;
  return (
    <Figure
      icon={cur.icon}
      innerRef={ref}
      title={cur.head.title}
      titleFallback={cur.head.fallback}
      titleReserve={longest(all.map((x) => x.head.title))}
      unit={cur.unit}
      unitReserve={longest(all.map((x) => x.unit))}
      source={<SourceLine items={cur.src} through={periodLabel(cur.s.last ?? cur.s.x[cur.s.x.length - 1])} notes={notes} />}
      className="p1-board"
    >
      <div ref={box} className="p1-plot">
        <Crosshair {...boardCross} width={w} height={h} top={T} bottom={B} label={label}>
          <g className={`p1-board-svg${seen ? ' is-seen' : ''}`} data-focus={f}>
            {all.map((x, i) => {
              const u = unitSeries(x);
              const Y = linear(u.d.lo, u.d.hi, B, T);
              const X = linear(u.t[0], u.t[u.t.length - 1], L, R);
              const xt = yearTicks(u.t[0], u.t[u.t.length - 1])
                .map((yr) => {
                  const xx = X(Math.max(yr, u.t[0]));
                  return { key: yr, x: xx, label: String(yr), anchor: xx > R - 16 ? 'end' : xx < L + 16 ? 'start' : 'middle' };
                })
                // a year label too close to the last one is dropped (390px: "20232026")
                .filter((t, k, a) => k === a.length - 1 || a[a.length - 1].x - t.x >= 56);
              return (
                <g key={x.key} className={`p1-board-axes${i === f ? ' is-on' : ''}`}>
                  <YGrid ticks={u.d.ticks} Y={Y} x0={L} x1={R} />
                  <XTicks ticks={xt} y={B + 18} />
                </g>
              );
            })}
            {all.map((x, i) => {
              const u = unitSeries(x);
              const on = i === f;
              const ex = L + (u.end[0] * (R - L)) / N;
              const ey = T + (u.end[1] * (B - T)) / N;
              return (
                <g key={x.key} className={`p1-board-series${on ? ' is-focus' : ''}`} data-mark={x.mark} style={mk(x.mark)}>
                  {u.area ? (
                    <defs>
                      <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={u.top} y2={u.zeroV}>
                        <stop offset="0" stopColor={P1_MARKS.pay.color} stopOpacity="0.18" />
                        <stop offset="1" stopColor={P1_MARKS.pay.color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  ) : null}
                  <g style={{ transform: tr }}>
                    {u.area ? <path d={u.area} className="p1-board-area" style={{ fill: `url(#${gid})` }} /> : null}
                    <path d={u.d0} className={`p1-board-line${seen ? ' is-drawn' : ''}`} />
                  </g>
                  <circle cx={ex} cy={ey} r={3.5} className="p1-board-end" />
                </g>
              );
            })}
          </g>
        </Crosshair>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Scene 1C. AI so far: the share of businesses using AI by survey wave,
// all businesses and those with 10 or more employees (whose end label
// carries their latest value, its home), then the exposure tiles.

const AI_H = 204;
const AI_M = { l: 34, r: 10, t: 12, b: 24 };

export function AiUseChart({ notes, lines = 2 }) {
  const [ref, seen] = useDrawIn();
  // one line a step (polish round): all businesses, then 10 or more
  // employees drawn on top; scrolling back past the step undraws it
  const ten = seen && lines >= 2;
  const [box, w, aiH] = useBox(AI_H);
  const gid = useSvgId('p1-ai-fade');
  const a = SERIES.business_ai_use;
  const b = SERIES.business_ai_use_10plus;
  const idx = a.x.map((_, i) => i);
  const last = idx.length - 1;
  const L = AI_M.l;
  const R = w - AI_M.r;
  // narrow (phones): the x title gets its own line under the two dates,
  // which it overlapped at 390 and 360 (review r2 #2), and the plot starts
  // 16px lower, so the upper end label has room above its line's end
  const narrow = R - L < 460;
  const T = AI_M.t + (narrow ? 16 : 0);
  const B = aiH - AI_M.b - (narrow ? 16 : 0);
  const D = niceTicks([...a.y, ...b.y], { withZero: true });
  const X = linear(0, last, L + 4, R - 4);
  const Y = linear(D.lo, D.hi, B, T);
  const short = (d) => d.replace(/^\d+ /, '');
  const aiHead = aiTitle();
  const dA = linePath(X, Y, idx, a.y);
  const area = `${dA}L${X(last).toFixed(1)},${Y(0).toFixed(1)}L${X(0).toFixed(1)},${Y(0).toFixed(1)}Z`;
  // end labels clear of their lines: over the label's width (about 7px a
  // character at 12px), above the highest point of the upper line and
  // below the lowest point of the lower one
  const under = (ys, chars) => idx.filter((i) => X(Math.min(last, i + 1)) >= X(last) - chars * 7.6 - 16 || i === last - 1).map((i) => Y(ys[i]));
  // phones: 8px higher too (sign-off minor 8: the line touched its last characters)
  const tenY = Math.max(T + (narrow ? 2 : 10), Math.min(...under(b.y, 27)) - (narrow ? 17 : 9));
  // "All businesses, 29.7%" (polish round F: the shorter label sat on its
  // own line near Sept 2026): under the lowest point of its line over the
  // whole label's width, right-aligned at the end dot like the other
  const allY = Math.min(B - 4, Math.max(...under(a.y, 22)) + 17);
  return (
    <Figure
      icon="ai"
      innerRef={ref}
      title={aiHead.title}
      titleFallback={aiHead.fallback}
      unit={`Per cent of businesses using at least one AI technology: all businesses, and those with 10 or more employees, ${short(a.x[0])} to ${short(a.x[last])}. ONS.`}
      source={<SourceLine items={[{ id: a.source, name: 'Business Insights and Conditions Survey', detail: `Wave ${BICS_WAVE}, Figure 1` }]} through={`Wave ${BICS_WAVE}, ${a.x[last]}`} notes={notes} />}
      className="p1-ai"
    >
      <div ref={box} className="p1-plot">
        <Crosshair
          xs={idx}
          x={X}
          y={Y}
          width={w}
          height={aiH}
          top={T}
          bottom={B}
          formatX={(i) => a.x[i]}
          unit="Per cent of businesses"
          series={[
            { key: 'all', name: 'All businesses', icon: 'business', color: 'var(--pe-gray-800)', ys: a.y, format: pct1 },
            { key: 'ten', name: '10 or more employees', icon: 'business', color: 'var(--pe-gray-500)', ys: b.y, format: pct1 },
          ]}
          label={`Line chart: share of businesses using at least one AI technology, by survey wave from ${a.x[0]} to ${a.x[last]}, all businesses, and businesses with 10 or more employees.`}
        >
        <g className="p1-ai-svg is-two" style={{ '--mk-all': P1_MARKS['ai-all'].color, '--mk-ten': P1_MARKS['ai-ten'].color }}>
          <defs>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={Y(Math.max(...a.y))} y2={Y(0)}>
              <stop offset="0" stopColor={P1_MARKS["ai-all"].color} stopOpacity="0.18" />
              <stop offset="1" stopColor={P1_MARKS["ai-all"].color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <YGrid ticks={D.ticks} Y={Y} x0={L} x1={R} />
          <XTicks
            y={narrow ? aiH - 22 : aiH - 6}
            ticks={[
              { x: X(0), label: short(a.x[0]), anchor: 'start', key: 'a' },
              { x: X(last), label: short(a.x[last]), anchor: 'end', key: 'b' },
            ]}
          />
          <text x={(L + R) / 2} y={aiH - 4} textAnchor="middle" className="p1-axis-title" data-axis-title="x">
            Survey wave, dated at its midpoint
          </text>
          <path d={area} className={`p1-ai-area${seen ? ' is-on' : ''}`} style={{ fill: `url(#${gid})` }} data-mark="ai-all" />
          <path d={dA} pathLength={1} className={`draw-path p1-ai-line is-all${seen ? ' is-on' : ''}`} data-mark="ai-all" />
          <path d={linePath(X, Y, idx, b.y)} pathLength={1} className={`draw-path p1-ai-line is-ten${ten ? ' is-on' : ''}`} data-mark="ai-ten" />
          {idx.map((i) => (
            <g key={i}>
              <circle cx={X(i)} cy={Y(b.y[i])} r={i === last ? 3.5 : 2.25} className={`p1-ai-dot is-ten${ten ? ' is-on' : ''}`} data-mark="ai-ten" />
              <circle cx={X(i)} cy={Y(a.y[i])} r={i === last ? 3.5 : 2.25} className={`p1-ai-dot is-all${seen ? ' is-on' : ''}`} data-mark="ai-all" />
            </g>
          ))}
          <text x={X(last) - (narrow ? 14 : 4)} y={tenY} textAnchor="end" className={`p1-end-label is-ten${ten ? ' is-on' : ''}`} data-mark="ai-ten">
            10 or more employees, <tspan data-axis="">{pct1(FACTS.business_ai_use_10plus.value)}</tspan>
          </text>
          <text x={X(last) - 4} y={allY} textAnchor="end" className={`p1-end-label is-all${seen ? ' is-on' : ''}`} data-mark="ai-all">
            All businesses, <tspan data-axis="">{pct1(FACTS.business_ai_use.value)}</tspan>
          </text>
        </g>
        </Crosshair>
      </div>
    </Figure>
  );
}

// 100 tiles, one per cent of UK workers each, regrouping into the three
// exposure groups DSIT reports. Same keys in both states, so the tiles
// travel. state 0: one block in grey; 1: three groups on the rank ramp,
// staggered by destination group then row (at most about 450ms), each
// tile's colour changing in the last third of its travel. Once grouped,
// each block carries its name tag under it: the share, then the short
// name (22 Nov: no separate legend).
const GRID_W = 17;
// polish round: 7 rows, the tallest state (the 35-tile group, five wide);
// the one block is 17 wide and 6 high (it was 10 by 10, which left three
// empty rows above the groups)
const GRID_H = 7;

// "High exposure, AI could help (high complementarity)" -> "High exposure, AI could help"
const shortGroup = (name) => name.replace(/\s*\(.*\)$/, '');

export function exposureTiles(state) {
  const groups = EXPOSURE_GROUPS.flatMap((g, gi) => Array.from({ length: Math.round(g.value) }, (_, j) => ({ g, gi, j })));
  return groups.map(({ g, gi, j }, i) => {
    if (state < 1) return { key: `t${i}`, x: i % GRID_W, y: GRID_H - 1 - Math.floor(i / GRID_W), color: 'var(--pe-gray-400)', group: 'all' };
    return { key: `t${i}`, x: gi * 6 + (j % 5), y: GRID_H - 1 - Math.floor(j / 5), color: g.color, group: g.id };
  });
}

// `entered` (Scrolly's ctx.entered): the first time the figure comes into
// view it shows the one block, holds, then moves to the step's state
// (useEnterState), so the tiles travel on a deep link and on phones, where
// the figure is drawn once in its last state.
export function ExposureTiles({ state, source, entered = true }) {
  const shown = useEnterState(0, state, entered);
  const grouped = shown >= 1;
  const tiles = exposureTiles(shown);
  // one title for both tile states (story-finding-titles-fable.md)
  const wHead = workersTitle();
  const label = grouped
    ? 'A grid of 100 tiles, each one per cent of UK workers, in three groups by exposure to AI: high exposure and high complementarity, high exposure and low complementarity, and low exposure.'
    : 'A grid of 100 tiles, each one per cent of UK workers.';
  return (
    <figure className={`p1-figure p1-exposure${grouped ? ' is-grouped' : ''}`}>
      <ModelBadge model="official" className="p1-badge" />
      <FigTitle icon="workers" title={wHead.title} fallback={wHead.fallback} source={source} />
      <FigUnit>{`Each tile is one per cent of UK workers; two of the three groups are high exposure. IMF estimates, ${WORKERS_PERIOD}, via DSIT.`}</FigUnit>
      {/* hover (M4): each group's share, from the data; one transparent
          cell over each block (the whole grid before it splits) */}
      <ChartHover
        label="UK workers by exposure to AI"
        items={[
          ...EXPOSURE_GROUPS.map((g) => ({ head: g.name, rows: [{ name: 'Share of UK workers', value: share0(g.value), color: g.color }], unit: `IMF estimates, ${WORKERS_PERIOD}, via DSIT.` })),
          { head: 'UK workers', rows: [{ name: 'Tiles', value: '100, one per cent each', icon: 'workers' }], unit: `IMF estimates, ${WORKERS_PERIOD}, via DSIT.` },
        ]}
      >
      <div className="p1-tiles">
        <TileField tiles={tiles} width={GRID_W} height={GRID_H} label={label} className="p1-tile-grid" />
        <div className="p1-tile-hits" aria-hidden="true" style={{ '--cols': GRID_W }}>
          {grouped ? (
            EXPOSURE_GROUPS.map((g, gi) => <span key={g.id} data-tip={gi} style={{ gridColumn: `${gi * 6 + 1} / span 5` }} />)
          ) : (
            <span data-tip={EXPOSURE_GROUPS.length} style={{ gridColumn: '1 / -1' }} />
          )}
        </div>
        {/* each group's name tag under its block, once grouped (Vahid, 22
            Nov: "name tag below each better"; it replaces the legend): the
            share on one line, the short name under it, in the block's
            colour. It restates the step's figures (data-axis). Three label
            columns of 29%, 42% and 29% of the grid: their centres (14.5%,
            50%, 85.5%) sit on the blocks' (2.5, 8.5 and 14.5 of 17 tile
            columns), and the middle, longest name gets the widest one */}
        <ul className="p1-tile-labels" aria-hidden="true">
          {EXPOSURE_GROUPS.map((g) => (
            <li key={g.id} data-axis="" style={{ '--sw': g.color }}>
              <span className="p1-tile-share">{share0(g.value)}</span>
              <span className="p1-tile-name">{shortGroup(g.name)}</span>
            </li>
          ))}
        </ul>
      </div>
      </ChartHover>
    </figure>
  );
}
