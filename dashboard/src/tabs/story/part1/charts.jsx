'use client';

import { useInView } from '@/components/story/motion.js';
import { DrawPath, FadeG, GrowRect, TileGrid } from '@/components/story/primitives.jsx';
import { BICS_WAVE, EXPOSURE_GROUPS, OBR, OBR_LABEL, OBR_VINTAGE, SERIES } from './data.js';
import { Axes, Figure, Legend, SourceLine, W, linePath, scales } from './frame.jsx';
import { span3 } from './format.js';

// Part 1's graphics. Each takes the active `state` of its scrolly block and
// draws the complete picture for that state; nothing prints a value (the
// cards do, once). Bars are changes (growth rates by year or quarter);
// lines are levels or paths over time. Motion comes only from the framework
// primitives, gated on the figure entering the viewport.

// Round domain and ticks round the data, with zero when asked.
function domain(values, step, withZero = false) {
  const lo = Math.floor(Math.min(...values, ...(withZero ? [0] : [])) / step) * step;
  const hi = Math.ceil(Math.max(...values, ...(withZero ? [0] : [])) / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

const yearTicks = (xs, every = 5) => xs.filter((x) => x % every === 0 || x === xs[xs.length - 1]).map((x) => ({ x }));

// Year ticks on a decimal-year axis (monthly or quarterly points): at each
// January, every `every` years from the first whole year.
// The first tick is the first point's year (its January may sit a few weeks
// before the first point), so panels sharing a start share their ticks.
function decimalYearTicks(t0, t1, every) {
  const out = [];
  for (let y = Math.round(t0); y <= t1; y += every) out.push({ x: y, label: String(y) });
  return out;
}

const qYear = (q) => Number(q.slice(0, 4));

// 1: real GDP growth by calendar year (ONS outturn, full years only), then
// the OBR's forecast as a dashed line to the right. The two are not joined:
// the OBR's table starts from an earlier estimate of the last outturn year.
// The full scale is kept so the pandemic years read at their true size;
// they are labelled. state 0: bars; 1: + OBR forecast.
export function GdpChart({ state }) {
  const [ref, seen] = useInView();
  const g = SERIES.gdp_growth;
  const h = 260;
  const { lo, hi, ticks } = domain([...g.y, ...OBR.y], 5, true);
  const x0 = g.x[0];
  const x1 = OBR.x[OBR.x.length - 1];
  const gLast = g.x[g.x.length - 1];
  const band = (W - 50) / (x1 - x0 + 1);
  const sc = scales({ x0, x1, lo, hi, h, pad: band / 2 });
  const bw = band * 0.68;
  const split = (sc.X(gLast) + sc.X(OBR.x[0])) / 2;
  const fc = state >= 1;
  const minAt = g.x[g.y.indexOf(Math.min(...g.y))];
  const maxAt = g.x[g.y.indexOf(Math.max(...g.y))];
  const label = `Bar chart: real GDP growth in each calendar year from ${x0} to ${gLast}, ONS outturn. Growth was lowest in ${minAt}${
    Math.min(...g.y) < 0 ? ', when it was below zero,' : ''
  } and highest in ${maxAt}, the pandemic fall and rebound.${
    fc ? ` A separate dashed line to the right shows the ${OBR_LABEL}, for ${OBR.x[0]} to ${x1}; it is not joined to the bars.` : ''
  }`;
  return (
    <Figure
      innerRef={ref}
      title={fc ? `Real GDP growth, ${x0} to ${gLast}, and the OBR’s forecast to ${x1}` : `Real GDP growth, ${x0} to ${gLast}`}
      titleReserve={`Real GDP growth, ${x0} to ${gLast}, and the OBR’s forecast to ${x1}`}
      unit={`Percentage change on the previous calendar year. Full years only: ${gLast} is the latest complete year.`}
      legend={[
        { key: 'ons', label: 'ONS outturn', color: 'var(--series-2)', block: true },
        ...(fc ? [{ key: 'obr', label: OBR_LABEL, color: 'var(--pe-gray-800)', dashed: true }] : []),
      ]}
      source={
        <SourceLine
          items={[
            { id: g.source, name: 'GDP year-on-year growth' },
            ...(fc ? [{ id: OBR.source, name: `Economic and fiscal outlook, ${OBR_VINTAGE}`, detail: 'Table A.1' }] : []),
          ]}
        />
      }
    >
      <svg className="story-svg p1-svg" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        <Axes sc={sc} yTicks={ticks} zero xTicks={[...yearTicks(g.x), { x: x1 }]} />
        <line x1={split} x2={split} y1={sc.Y(hi)} y2={sc.bottom} className="p1-split" />
        <text x={split - 5} y={sc.Y(hi) + 4} dy="0.7em" textAnchor="end" className="p1-note-label">
          Outturn
        </text>
        <FadeG on={seen && fc}>
          <text x={split + 5} y={sc.Y(hi) + 4} dy="0.7em" textAnchor="start" className="p1-note-label">
            Forecast
          </text>
        </FadeG>
        {g.x.map((x, i) => {
          const v = g.y[i];
          return (
            <GrowRect
              key={x}
              x={sc.X(x) - bw / 2}
              y={sc.Y(Math.max(0, v))}
              width={bw}
              height={Math.abs(sc.Y(v) - sc.Y(0))}
              on={seen}
              delay={i * 35}
              className={`p1-bar${v < 0 ? ' is-neg' : ''}`}
            />
          );
        })}
        <text x={sc.X(minAt) + bw / 2 + 4} y={sc.Y(Math.min(...g.y) * 0.6)} dy="0.35em" textAnchor="start" className="p1-note-label">
          Pandemic
        </text>
        <FadeG on={seen && fc}>
          <path d={linePath(sc, OBR.x, OBR.y)} className="p1-forecast" />
          {OBR.x.map((x, i) => (
            <circle key={x} cx={sc.X(x)} cy={sc.Y(OBR.y[i])} r={3} className="p1-forecast-dot" />
          ))}
        </FadeG>
      </svg>
    </Figure>
  );
}

// 1b: the latest quarters. Quarter-on-quarter growth, a recent window, with
// the current (incomplete) year's quarters marked.
export function GdpQuartersChart() {
  const [ref, seen] = useInView();
  const g = SERIES.gdp_quarterly;
  const h = 230;
  const n = g.x.length;
  const lastQ = g.x[n - 1];
  const yearNow = qYear(lastQ);
  const thisYear = `${yearNow} Q1${lastQ.endsWith('Q1') ? '' : `–${lastQ.slice(5)}`}`;
  const { lo, hi, ticks } = domain(g.y, 0.5, true);
  const band = (W - 50) / n;
  const sc = scales({ x0: 0, x1: n - 1, lo, hi, h, pad: band / 2 });
  const bw = band * 0.66;
  const firstOfYear = g.x.map((q, i) => ({ q, i })).filter(({ q }) => q.endsWith('Q1'));
  return (
    <Figure
      innerRef={ref}
      title={`Real GDP growth by quarter, ${g.x[0]} to ${lastQ}`}
      unit={`Percentage change on the previous quarter, seasonally adjusted. ${lastQ} is a first estimate.`}
      legend={[
        { key: 'past', label: `${g.x[0]} to ${yearNow - 1} Q4`, color: 'var(--series-5)', block: true },
        { key: 'now', label: `${thisYear} (year not yet complete)`, color: 'var(--series-2)', block: true },
      ]}
      source={
        <SourceLine
          items={[
            { id: g.source, name: 'GDP quarter-on-quarter growth' },
            { id: 'ons_ihyr', name: 'GDP growth on the same quarter a year earlier' },
          ]}
        />
      }
    >
      <svg
        className="story-svg p1-svg"
        viewBox={`0 0 ${W} ${h}`}
        role="img"
        aria-label={`Bar chart: real GDP growth in each quarter from ${g.x[0]} to ${lastQ}, on the previous quarter, with the quarters of ${yearNow} marked.`}
      >
        <Axes sc={sc} yTicks={ticks} zero xTicks={firstOfYear.map(({ q, i }) => ({ x: i, label: q.slice(0, 4) }))} />
        {g.x.map((q, i) => {
          const v = g.y[i];
          return (
            <GrowRect
              key={q}
              x={sc.X(i) - bw / 2}
              y={sc.Y(Math.max(0, v))}
              width={bw}
              height={Math.abs(sc.Y(v) - sc.Y(0))}
              on={seen}
              delay={i * 30}
              className={`p1-bar${qYear(q) === yearNow ? '' : ' is-past'}${v < 0 ? ' is-neg' : ''}`}
            />
          );
        })}
      </svg>
    </Figure>
  );
}

// A single line over decimal years (t) or whole years (x), drawn in when seen.
function TimeLine({ s, step, h = 250, withZero = false, every = 4, title, unit, label, source, color = 'var(--series-2)', on = true, extraRef }) {
  const t = s.t ?? s.x;
  const { lo, hi, ticks } = domain(s.y, step, withZero);
  const sc = scales({ x0: t[0], x1: t[t.length - 1], lo, hi, h });
  const xTicks = s.t ? decimalYearTicks(t[0], t[t.length - 1], every) : yearTicks(s.x);
  return (
    <Figure title={title} unit={unit} source={source} innerRef={extraRef}>
      <svg className="story-svg p1-svg" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={label}>
        <Axes sc={sc} yTicks={ticks} zero={withZero} xTicks={xTicks} />
        <DrawPath d={linePath(sc, t, s.y)} on={on} className="p1-line" style={{ stroke: color }} />
      </svg>
    </Figure>
  );
}

// 2: output per hour worked, quarterly index.
export function ProductivityChart() {
  const [ref, seen] = useInView();
  const s = SERIES.productivity_oph;
  const span = `${s.x[0]} to ${s.x[s.x.length - 1]}`;
  return (
    <TimeLine
      extraRef={ref}
      on={seen}
      s={s}
      step={5}
      title={`Output per hour worked, whole economy, ${span}`}
      unit="Index, 2023 = 100, quarterly, seasonally adjusted"
      label={`Line chart: output per hour worked in the whole economy, a quarterly index with 2023 equal to 100, from ${span}.`}
      source={
        <SourceLine
          items={[{ id: s.source, name: 'output per hour worked' }]}
          note="Hours worked come partly from the Labour Force Survey (see the note on its quality under work)."
        />
      }
    />
  );
}

// One small panel of the labour market set: no figure frame of its own.
function Panel({ s, step, withZero, title, on, color }) {
  const h = 150;
  const { lo, hi, ticks } = domain(s.y, step, withZero);
  const sc = scales({ x0: s.t[0], x1: s.t[s.t.length - 1], lo, hi, h });
  return (
    <div className="p1-panel">
      <p className="p1-panel-title">{title}</p>
      <svg className="story-svg p1-svg" viewBox={`0 0 ${W} ${h}`} aria-hidden="true">
        <Axes sc={sc} yTicks={ticks} zero={withZero} xTicks={decimalYearTicks(s.t[0], s.t[s.t.length - 1], 4)} />
        <DrawPath d={linePath(sc, s.t, s.y)} on={on} className="p1-line" style={{ stroke: color }} />
      </svg>
    </div>
  );
}

// 3: employment and unemployment rates, two stacked panels, each with its
// own axis, one point per rolling three-month period. state 0: employment
// drawn; 1: + unemployment.
export function LabourPanels({ state }) {
  const [ref, seen] = useInView();
  const e = SERIES.employment_rate;
  const u = SERIES.unemployment_rate;
  const span = `${e.x[0].slice(0, 4)} to ${span3(e.last)}`;
  return (
    <figure className="p1-figure" ref={ref}>
      <p className="story-figure-title">Employment and unemployment, {span}</p>
      <p className="story-figure-unit">Rolling three-month averages, seasonally adjusted. Each panel has its own scale.</p>
      <div
        role="img"
        aria-label={`Two line charts, each with its own scale: the employment rate for people aged 16 to 64${
          state >= 1 ? ' and the unemployment rate for people aged 16 and over' : ' (drawn) and the unemployment rate for people aged 16 and over (not yet drawn)'
        }, three-month averages, ${span}.`}
      >
        <Panel s={e} step={2} title="Employment rate: % of people aged 16 to 64" on={seen} color="var(--series-2)" />
        <Panel s={u} step={3} withZero title="Unemployment rate: % of economically active people aged 16 and over" on={seen && state >= 1} color="var(--pe-gray-700)" />
      </div>
      <figcaption>
        <SourceLine
          items={[
            { id: e.source, name: 'employment rate' },
            { id: u.source, name: 'unemployment rate' },
          ]}
        />
      </figcaption>
    </figure>
  );
}

// 3b: regular pay growth, nominal, one point per rolling three-month period.
export function PayChart() {
  const [ref, seen] = useInView();
  const s = SERIES.pay_growth;
  const span = `${s.x[0].slice(0, 4)} to ${span3(s.last)}`;
  return (
    <TimeLine
      extraRef={ref}
      on={seen}
      s={s}
      step={2}
      withZero
      color="var(--series-2)"
      title={`Regular pay growth, ${span}`}
      unit="Percentage change on the same three months a year earlier, excluding bonuses, before adjusting for inflation"
      label={`Line chart: growth of average weekly regular pay on a year earlier, three-month averages, ${span}.`}
      source={<SourceLine items={[{ id: s.source, name: 'average weekly earnings, regular pay' }]} />}
    />
  );
}

// 4: compensation of employees as a share of GDP, annual (full years only).
export function LabourShareChart() {
  const [ref, seen] = useInView();
  const s = SERIES.labour_share;
  const last = s.x[s.x.length - 1];
  return (
    <TimeLine
      extraRef={ref}
      on={seen}
      s={s}
      step={2}
      title={`Compensation of employees as a share of GDP, ${s.x[0]} to ${last}`}
      unit="Per cent of GDP at current prices, annual. Leaves out the income of the self-employed."
      label={`Line chart: compensation of employees as a share of GDP, annual, from ${s.x[0]} to ${last}.`}
      source={
        <SourceLine
          items={[
            { id: 'ons_dtwm', name: 'compensation of employees' },
            { id: 'ons_ybha', name: 'GDP at current prices' },
          ]}
          note={`The share is one series divided by the other. The annual series ends at ${last}, the latest full year.`}
        />
      }
    />
  );
}

// 5a: share of businesses using AI by BICS wave. state 0: all businesses;
// 1: + businesses with 10 or more employees.
export function AiUseChart({ state }) {
  const [ref, seen] = useInView();
  const a = SERIES.business_ai_use;
  const b = SERIES.business_ai_use_10plus;
  const h = 250;
  const idx = a.x.map((_, i) => i);
  const { lo, hi, ticks } = domain([...a.y, ...b.y], 10, true);
  const sc = scales({ x0: 0, x1: idx.length - 1, lo, hi, h });
  const last = idx.length - 1;
  const two = state >= 1;
  const short = (d) => d.replace(/^\d+ /, '');
  return (
    <Figure
      innerRef={ref}
      title={`Businesses using at least one AI technology, ${short(a.x[0])} to ${short(a.x[last])}`}
      unit="Per cent of businesses, by survey wave (dated at its midpoint)"
      legend={[
        { key: 'all', label: 'All businesses', color: 'var(--series-5)' },
        ...(two ? [{ key: 'ten', label: '10 or more employees', color: 'var(--series-2)' }] : []),
      ]}
      source={
        <SourceLine
          items={[{ id: a.source, name: 'Business Insights and Conditions Survey', detail: `Wave ${BICS_WAVE}, Figure 1` }]}
          note="Private-sector businesses in the industries the survey covers, weighted by count of businesses."
        />
      }
    >
      <svg
        className="story-svg p1-svg"
        viewBox={`0 0 ${W} ${h}`}
        role="img"
        aria-label={`Line chart: share of businesses using at least one AI technology, by survey wave from ${a.x[0]} to ${a.x[last]}, all businesses${two ? ', and businesses with 10 or more employees' : ''}.`}
      >
        <Axes
          sc={sc}
          yTicks={ticks}
          zero
          xTicks={[
            { x: 0, label: short(a.x[0]), anchor: 'start' },
            { x: last, label: short(a.x[last]), anchor: 'end' },
          ]}
        />
        <DrawPath d={linePath(sc, idx, a.y)} on={seen} className="p1-line" style={{ stroke: 'var(--series-5)' }} />
        <DrawPath d={linePath(sc, idx, b.y)} on={seen && two} className="p1-line" style={{ stroke: 'var(--series-2)' }} />
      </svg>
    </Figure>
  );
}

// 5b: 100 tiles, one per cent of UK workers each, regrouping into the three
// exposure groups DSIT reports. Same grid size and keys in both states, so
// the tiles travel. state 0: one block; 1: three groups.
const GRID_W = 17;
const GRID_H = 10;

export function exposureTiles(state) {
  const groups = EXPOSURE_GROUPS.flatMap((g, gi) => Array.from({ length: Math.round(g.value) }, (_, j) => ({ g, gi, j })));
  return groups.map(({ g, gi, j }, i) => {
    if (state < 1) return { key: `t${i}`, x: 3.5 + (i % 10), y: Math.floor(i / 10), color: 'var(--pe-gray-400)', delay: 0 };
    return { key: `t${i}`, x: gi * 6 + (j % 5), y: GRID_H - 1 - Math.floor(j / 5), color: g.color, delay: (i % 10) * 12 };
  });
}

export function ExposureTiles({ state, source }) {
  const grouped = state >= 1;
  const label = grouped
    ? 'A grid of 100 tiles, each one per cent of UK workers, in three groups by exposure to AI: high exposure and high complementarity, high exposure and low complementarity, and low exposure.'
    : 'A grid of 100 tiles, each one per cent of UK workers.';
  return (
    <figure className="p1-figure">
      <p className="story-figure-title">UK workers by exposure to AI</p>
      <p className="story-figure-unit">Each tile is one per cent of UK workers</p>
      <div className="p1-tiles">
        <TileGrid tiles={exposureTiles(state)} width={GRID_W} height={GRID_H} label={label} />
      </div>
      {grouped ? (
        <ol className="p1-groups">
          {EXPOSURE_GROUPS.map((g) => (
            <li key={g.id}>
              <span className="p1-swatch is-block" style={{ '--sw': g.color }} aria-hidden="true" />
              {g.name}
            </li>
          ))}
        </ol>
      ) : (
        <Legend items={[{ key: 'w', label: 'UK workers', color: 'var(--pe-gray-400)', block: true }]} />
      )}
      <figcaption>{source}</figcaption>
    </figure>
  );
}
