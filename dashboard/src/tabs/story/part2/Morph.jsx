'use client';

import U from '@/data/ukContext.json';
import { NavLink } from '@/lib/nav.jsx';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCEN_NAME, ARM_COLOR, ARM_TEXT_COLOR, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import { W, H, niceTicks, SOURCE } from './frame.jsx';
import { series } from './charts.jsx';

// From the record to the model, in one chart whose axes and lines move
// between three states as the reader scrolls:
//   0  real GDP growth, ONS outturn (part 1's data, read by key);
//   1  + the OBR's forecast of growth, dashed, open dots;
//   2  the axis changes from growth (% a year) to a gap (% against the
//      OBR-central path): the forecast line flattens into the zero line and
//      the scenario's GDP gap rises out of it.
// Every line keeps the same number of points in every state, so the CSS
// transition on `d` interpolates (a browser without it jumps). Shapes
// only: ticks carry data-axis, no value is printed. Reduced motion turns
// the transitions off (story-part2.css): each state is drawn at once.

const M = { l: 36, r: 14, t: 24, b: 28 };
const PX0 = M.l;
const PX1 = W - M.r;
const PY0 = M.t;
const PY1 = H - M.b;
const OFF = 6; // growth beyond +-OFF points runs off the scale, labelled

const SER = U.series ?? {};
const SRC = U.sources ?? {};
const numeric = (s) =>
  s && Array.isArray(s.x) ? s.x.map((x, i) => [x, s.y?.[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) : [];
// The last ten years of outturn, whatever the file's last year is.
const ACT_ALL = numeric(SER.gdp_growth);
const ACT_LAST = ACT_ALL.length ? ACT_ALL[ACT_ALL.length - 1][0] : SURPRISE_YEAR - 2;
export const ACT = ACT_ALL.filter(([x]) => x > ACT_LAST - 10);
export const OBR = numeric(SER.obr_gdp_forecast);
const OBR_LAST = OBR.length ? OBR[OBR.length - 1][0] : HEADLINE_YEAR;
// A partial latest year, if the file marks one ({ partial: { x, label } }).
const PARTIAL = SER.gdp_growth?.partial && Number.isFinite(SER.gdp_growth.partial.x) ? SER.gdp_growth.partial : null;

const monthYear = (iso) => {
  const d = iso ? new Date(`${iso}T00:00:00Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
};
const OBR_VINTAGE = monthYear(SRC[SER.obr_gdp_forecast?.source]?.released);
const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };

// Growth axis: round ticks over the in-scale values, always with room below zero.
const inScale = [...ACT, ...OBR].map(([, y]) => y).filter((y) => Math.abs(y) <= OFF);
const G_STEP = niceTicks(Math.min(-1, ...inScale), Math.max(1, ...inScale), 4).step;
const G_LO = Math.floor(Math.min(-1, ...inScale) / G_STEP) * G_STEP;
const G_HI = Math.ceil(Math.max(1, ...inScale) / G_STEP) * G_STEP;
const G_TICKS = {
  step: G_STEP,
  ticks: Array.from({ length: Math.round((G_HI - G_LO) / G_STEP) + 1 }, (_, i) => Math.round((G_LO + i * G_STEP) * 100) / 100),
};

const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

// The x domain of each state.
const X_DOMAIN = [
  [ACT[0]?.[0] ?? YEARS[0], ACT_LAST],
  [ACT[0]?.[0] ?? YEARS[0], Math.max(OBR_LAST, ACT_LAST)],
  [YEARS[0], LATE_YEAR],
];
const X_TICKS = [
  ACT.map(([x]) => x).filter((x, i, a) => (x % 5 === 0 && x - a[0] > 1 && a[a.length - 1] - x > 1) || i === 0 || i === a.length - 1),
  [...new Set([ACT[0]?.[0], ...ACT.map(([x]) => x).filter((x) => x % 5 === 0 && x - ACT[0][0] > 1), ACT_LAST, OBR_LAST])],
  [YEARS[0], SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR],
];

// Gap axis for the chosen scenario's GDP line.
function gapAxis(ys) {
  const v = ys ?? [0];
  const lo0 = Math.min(0, ...v);
  const hi0 = Math.max(0.5, ...v) * 1.08;
  const t = niceTicks(lo0, hi0, 4);
  const hi = Math.max(hi0, t.ticks[t.ticks.length - 1]);
  // room below the zero line for its label
  const lo = Math.min(lo0, t.ticks[0]) - (lo0 < 0 ? 0 : hi * 0.12);
  return { ticks: t.ticks, step: t.step, lo, hi };
}

const tickText = (v, step) => {
  const dp = step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0;
  const t = Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(Math.min(dp, 2));
  return v < -1e-9 ? `−${t}` : t;
};

const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

// Everything the chart draws in state s, as coordinates.
export function morphGeometry(s, gapYs) {
  const X = lin(...X_DOMAIN[s], PX0, PX1);
  const Yg = lin(G_LO, G_HI, PY1, PY0);
  const ga = gapAxis(gapYs);
  const Yd = lin(ga.lo, ga.hi, PY1, PY0);
  const gapState = s >= 2;
  const zeroY = gapState ? Yd(0) : Yg(0);
  const obrAt = (yr) => {
    const p = OBR.find(([x]) => x === yr) ?? OBR[OBR.length - 1];
    return p ? p[1] : 0;
  };
  // the outturn: flattened onto the zero line and out of view in state 2
  const act = ACT.map(([x, y]) => [X(x), gapState ? zeroY : Yg(y)]);
  // the forecast over the model's years: past its last year it sits on its
  // last point (states 0-1); in state 2 it is the zero line
  const obr = YEARS.map((yr) => [X(gapState ? yr : Math.min(yr, OBR_LAST)), gapState ? zeroY : Yg(obrAt(Math.min(Math.max(yr, OBR[0]?.[0] ?? yr), OBR_LAST)))]);
  // the scenario's gap: on the forecast line until state 2
  const gap = YEARS.map((yr, i) => [X(gapState ? yr : Math.min(yr, OBR_LAST)), gapState ? Yd(gapYs?.[i] ?? 0) : obr[i][1]]);
  return {
    X,
    zeroY,
    act,
    obr,
    gap,
    yTicksG: G_TICKS.ticks.map((v) => ({ v, y: Yg(v), t: tickText(v, G_TICKS.step) })),
    yTicksD: ga.ticks.map((v) => ({ v, y: Yd(v), t: tickText(v, ga.step) })),
    off: ACT.filter(([, y]) => Math.abs(y) > OFF).map(([x, y]) => ({ x: X(x), year: x, up: y > 0 })),
  };
}

const OFF_YEARS = ACT.filter(([, y]) => Math.abs(y) > OFF).map(([x]) => x);
const OFF_NOTE = OFF_YEARS.length ? ` ${OFF_YEARS.join(' and ')} run${OFF_YEARS.length > 1 ? '' : 's'} off the scale (arrows).` : '';
const STATE_TEXT = (sid, cl) => [
  { title: 'Real GDP growth', unit: `ONS outturn: percentage change on the previous calendar year.${OFF_NOTE}` },
  { title: 'Real GDP growth', unit: `ONS outturn (solid) and the OBR’s forecast${OBR_VINTAGE ? `, ${OBR_VINTAGE}` : ''} (dashed): percentage change on the previous year.${OFF_NOTE}` },
  { title: 'GDP against the OBR-central path', unit: `${SCEN_NAME[sid]}, automation + productivity, ${CL_WORDS[cl]}. A gap in %, not a growth rate` },
];

const sourceText = (s) => {
  const ons = SRC[SER.gdp_growth?.source];
  const obr = SRC[SER.obr_gdp_forecast?.source];
  const a = ons ? `${ons.publisher}, ${ons.series ?? ons.title}` : 'ONS';
  const b = obr ? `${obr.publisher ?? 'OBR'}, ${obr.title ?? 'Economic and fiscal outlook'}` : 'OBR, Economic and fiscal outlook';
  if (s === 0) return `Source: ${a}.`;
  if (s === 1) return `Sources: ${a}; ${b}.`;
  return SOURCE;
};

export function MorphChart({ state, sid, cl }) {
  const s = Math.max(0, Math.min(2, state));
  const ys = series(sid, 'tfp', cl, 'Y');
  const g = morphGeometry(s, ys);
  const text = STATE_TEXT(sid, cl)[s];
  const allTicks = [...new Set(X_TICKS.flat())].sort((a, b) => a - b);
  const split = ACT.length && OBR.length ? (g.X(ACT_LAST) + g.X(OBR[0][0])) / 2 : null;
  const dPath = (pts) => pathOf(pts);
  const dStyle = (pts) => ({ d: `path('${pathOf(pts)}')` });
  const lastGap = g.gap[g.gap.length - 1];
  const label = [
    `Line chart, shape only. Real GDP growth each year from ${ACT[0]?.[0]} to ${ACT_LAST}, ONS outturn, solid with filled dots.`,
    s >= 1 ? `The OBR’s forecast of growth from ${OBR[0]?.[0]} to ${OBR_LAST}, dashed with open dots.` : '',
    s >= 2
      ? `The axis then changes from growth in % a year to a gap in % against the OBR-central path: the forecast becomes the zero line, and GDP in ${SCEN_NAME[sid]}'s main arm rises above it from ${SURPRISE_YEAR}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure className="p2-figure p2-morph" data-state={s}>
      <p className="story-figure-title">{text.title}</p>
      <p className="story-figure-unit">{text.unit}</p>
      <svg className="story-svg p2-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <defs>
          <clipPath id="p2-morph-clip">
            <rect x={PX0 - 4} y={PY0 - 8} width={PX1 - PX0 + 8} height={PY1 - PY0 + 12} />
          </clipPath>
        </defs>
        {/* the two y axes: growth (states 0-1), gap (state 2) */}
        <g className={`p2-mo-axis${s < 2 ? ' is-on' : ''}`}>
          {g.yTicksG.map((t) => (
            <g key={`g${t.v}`}>
              {Math.abs(t.v) > 1e-9 ? <line x1={PX0} x2={PX1} y1={t.y} y2={t.y} className="p2-grid" /> : null}
              <text data-axis="" x={PX0 - 6} y={t.y} dy="0.35em" textAnchor="end" className="p2-tick">
                {t.t}
              </text>
            </g>
          ))}
        </g>
        <g className={`p2-mo-axis${s >= 2 ? ' is-on' : ''}`}>
          {g.yTicksD.map((t) => (
            <g key={`d${t.v}`}>
              {Math.abs(t.v) > 1e-9 ? <line x1={PX0} x2={PX1} y1={t.y} y2={t.y} className="p2-grid" /> : null}
              <text data-axis="" x={PX0 - 6} y={t.y} dy="0.35em" textAnchor="end" className="p2-tick">
                {t.t}
              </text>
            </g>
          ))}
        </g>
        {/* x ticks slide to their place in each state */}
        {allTicks.map((x) => {
          const on = X_TICKS[s].includes(x);
          return (
            <g key={`x${x}`} className={`p2-mo-move${on ? ' is-on' : ''}`} style={{ transform: `translate(${g.X(x).toFixed(1)}px, 0px)` }}>
              <text data-axis="" x={0} y={H - 8} textAnchor="middle" className="p2-tick">
                {x}
              </text>
            </g>
          );
        })}
        {/* outturn | forecast, state 1 */}
        {split != null ? (
          <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`}>
            <line x1={split} x2={split} y1={PY0 - 10} y2={PY1} className="p2-marker" />
            <text data-axis="" x={split - 5} y={PY0 - 12} textAnchor="end" className="p2-marker-label">
              Outturn
            </text>
            <text data-axis="" x={split + 5} y={PY0 - 12} className="p2-marker-label">
              Forecast
            </text>
          </g>
        ) : null}
        {/* AI arrives and the shock complete, state 2 */}
        <g className={`p2-mo-fade${s >= 2 ? ' is-on' : ''}`}>
          {[
            [SURPRISE_YEAR, 'AI arrives'],
            [HEADLINE_YEAR, 'Shock complete'],
          ].map(([x, t]) => (
            <g key={x}>
              <line x1={g.X(x)} x2={g.X(x)} y1={PY0 - 10} y2={PY1} className="p2-marker" />
              <text data-axis="" x={g.X(x) + 5} y={PY0 - 12} className="p2-marker-label">
                {t}
              </text>
            </g>
          ))}
        </g>
        {/* the zero line moves from zero growth to the OBR-central path */}
        <line x1={PX0} x2={PX1} y1={0} y2={0} className="p2-zero p2-mo-move is-on" style={{ transform: `translate(0px, ${g.zeroY.toFixed(1)}px)` }} />
        <g clipPath="url(#p2-morph-clip)">
          <path className={`p2-mo-line p2-mo-act${s < 2 ? ' is-on' : ''}`} d={dPath(g.act)} style={dStyle(g.act)} />
          {g.act.map(([x, y], i) => (
            <g key={`a${ACT[i][0]}`} className={`p2-mo-move${s < 2 ? ' is-on' : ''}`} style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` }}>
              <circle r={2.8} className={`p2-mo-dot${PARTIAL && PARTIAL.x === ACT[i][0] ? ' is-open' : ''}`} />
            </g>
          ))}
          <path className={`p2-mo-line p2-mo-obr${s >= 1 ? ' is-on' : ''}${s >= 2 ? ' is-zero' : ''}`} d={dPath(g.obr)} style={dStyle(g.obr)} />
          {OBR.map(([x], i) => {
            const k = YEARS.indexOf(x);
            const p = k >= 0 ? g.obr[k] : [g.X(x), g.zeroY];
            return (
              <g key={`o${x}`} className={`p2-mo-move${s === 1 ? ' is-on' : ''}`} style={{ transform: `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)` }}>
                <circle r={2.8} className="p2-mo-dot is-open" data-i={i} />
              </g>
            );
          })}
          <path
            className={`p2-mo-line p2-mo-gap${s >= 2 && ys ? ' is-on' : ''}`}
            d={dPath(g.gap)}
            style={{ ...dStyle(g.gap), stroke: ARM_COLOR.tfp }}
          />
        </g>
        {/* off-scale years (states 0-1): named, not valued */}
        <g className={`p2-mo-fade${s < 2 ? ' is-on' : ''}`}>
          {g.off.map((o) => (
            <text key={o.year} data-axis="" x={o.x + (o.up ? 7 : -7)} y={o.up ? PY0 + 8 : PY1 - 6} textAnchor={o.up ? 'start' : 'end'} className="p2-mo-off">
              {o.year} {o.up ? '↑' : '↓'}
            </text>
          ))}
        </g>
        {/* direct labels */}
        <g className={`p2-mo-fade${s === 0 ? ' is-on' : ''}`}>
          <text x={g.act[g.act.length - 1]?.[0] - 4} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
            ONS outturn
          </text>
        </g>
        <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`}>
          <text x={PX1} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
            OBR forecast
          </text>
        </g>
        <g className={`p2-mo-fade${s >= 2 ? ' is-on' : ''}`}>
          <text x={PX1} y={g.zeroY + 14} textAnchor="end" className="p2-mo-label">
            OBR-central path = 0
          </text>
          {ys ? (
            <text x={PX1} y={lastGap[1] - 8} textAnchor="end" className="p2-mo-label" style={{ fill: ARM_TEXT_COLOR.tfp }}>
              {SCEN_NAME[sid]}
            </text>
          ) : null}
          <g className="p2-mo-newaxis">
            <rect x={PX0 + 4} y={PY0 + 2} className="p2-mo-newaxis-box" width={122} height={20} rx={3} />
            <text x={PX0 + 10} y={PY0 + 12} dy="0.35em">
              New scale: gap, %
            </text>
          </g>
        </g>
      </svg>
      <figcaption className="story-source">{sourceText(s)}</figcaption>
    </figure>
  );
}

export function morphSteps(sid, cl) {
  return [
    {
      id: 'p2-morph-0',
      kicker: 'From the record to the model',
      title: 'Where growth has been',
      body: (
        <p>
          Part 1 ended with the official record: real GDP growth each year, as the ONS measures it. Outturns are drawn solid,
          with filled dots.
        </p>
      ),
    },
    {
      id: 'p2-morph-1',
      kicker: 'From the record to the model',
      title: 'The OBR’s forecast',
      body: (
        <p>
          The OBR&rsquo;s forecast{OBR_VINTAGE ? ` of ${OBR_VINTAGE}` : ''} carries growth on to {OBR_LAST}. It is a forecast, not
          a measurement, so it is dashed, with open dots.
        </p>
      ),
    },
    {
      id: 'p2-morph-2',
      kicker: 'From the record to the model',
      title: 'From growth rates to a gap',
      body: (
        <>
          <p>
            OG-UK starts from a path without the AI shock, built on the OBR&rsquo;s central assumptions: the OBR-central path.
            Its results are not growth rates but gaps against that path, so the scale changes. Zero is now the OBR-central path,
            and the blue line is how far GDP in {SCEN_NAME[sid]} sits above it, {cl === BOUND ? 'with closed capital' : 'at the central closure'}.
          </p>
          <p>
            The model projects gaps, not the level of GDP, and it has no unemployment. <NavLink tab="method" sub="how">How the path is set</NavLink>
          </p>
        </>
      ),
    },
  ];
}

