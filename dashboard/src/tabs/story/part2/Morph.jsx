'use client';

import { useId } from 'react';
import U from '@/data/ukContext.json';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, ARM_TEXT_COLOR, CENTRAL, BOUND } from '@/tabs/ai/surprise.js';
import Icon from '@/components/ab/Icon.jsx';
import { NavLink, useNav } from '@/lib/nav.jsx';
import { iconFor } from '@/lib/concepts.js';
import { ModelBadge } from '@/components/story/chart/index.js';
import { W, H, niceTicks, Tx, placeLabels } from './frame.jsx';
import { A, ModelSource, ResultLinks, resultUrl, pathUrl, readable, SRC as LINKS } from './sources.jsx';

const EFO_MAR26 = LINKS.efoMar26;
import { series, afterWordsAll } from './charts.jsx';
import { EPS2 } from './dir.js';
import { Items } from '@/components/story/Items.jsx';
import { MODEL_BASE_VINTAGE } from '../part1/data.js';

// Scene 2A, the GDP canvas: from the record to the scenarios, in one chart
// whose axes and lines move between five states as the reader scrolls:
//   0  real GDP growth, ONS outturn (part 1's data, read by key; kept for
//      links and tests);
//   1  + the OBR's forecast of growth, dashed, open dots, under a
//      "Forecast" band: the block's short first card, where part 1 ends;
//   2  the axis changes from growth (% a year) to a gap (% against the
//      OBR-central path): the forecast line flattens into the zero line and
//      the chosen scenario's GDP gap rises out of it. The gap axis spans the
//      UK scenarios (and Korinek et al. when that is the one chosen);
//   3  the other UK scenarios draw in and the UK range between UK low and
//      UK high is shaded;
//   4  one rescale beat (the gap axis widens to take Korinek et al., ticks
//      slide, lines follow), then Korinek et al. draws in above the band.
//      No rescale when Korinek et al. is the chosen scenario.
// 0 to 2 is the one value morph the plan keeps (growth to gap, in three
// beats with an axis flag); 2 to 4 are a view change and lines drawing in.
// Every line keeps the same number of points in every state, so the CSS
// transition on `d` interpolates (a browser without it jumps). Shapes
// only: ticks and chart notes carry data-axis, no value is printed.
// Reduced motion turns the transitions off (story-part2.css): each state
// is drawn at once.

const M = { l: 36, r: 14, t: 24, b: 28 };
const GUT = 100; // the gap states' right gutter, for direct labels
const PX0 = M.l;
const PX1 = W - M.r;
const PX1G = W - GUT;
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

// The x domain of geometry states 0-2 (states 3 and 4 share state 2's).
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

// The x scale of geometry state k: the gap state leaves a gutter on the
// right for the scenarios' names.
const xScale = (k) => lin(...X_DOMAIN[k], PX0, k >= 2 ? PX1G : PX1);
// Where an x tick sits in state s: its place in s when it is shown there,
// otherwise its place in the nearest state that shows it. A tick that
// leaves therefore fades where it stood, and one that arrives fades in where
// it will stay; only ticks shown in both states slide.
export function tickX(x, s) {
  const k = Math.min(s, 2);
  const order = [0, 1, 2].filter((j) => X_TICKS[j].includes(x)).sort((a, b) => Math.abs(a - k) - Math.abs(b - k) || a - b);
  return xScale(order.length ? order[0] : k)(x);
}

// Gap axis over the values it must hold: three or four round ticks.
function gapAxis(vals) {
  const v = vals?.length ? vals : [0];
  const lo0 = Math.min(0, ...v);
  const hi0 = Math.max(0.5, ...v) * 1.08;
  const t = niceTicks(lo0, hi0, 4);
  const hi = Math.max(hi0, t.ticks[t.ticks.length - 1]);
  // room below the zero line
  const lo = Math.min(lo0, t.ticks[0]) - (lo0 < 0 ? 0 : hi * 0.1);
  return { ticks: t.ticks, step: t.step, lo, hi };
}

const tickText = (v, step) => {
  const dp = step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0;
  const t = Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(Math.min(dp, 2));
  return v < -1e-9 ? `−${t}` : t;
};

const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

// Everything the chart draws in geometry state s (0-2), as coordinates.
// `dom` is the set of values the gap axis must hold (default: gapYs).
export function morphGeometry(s, gapYs, dom = gapYs) {
  const X = xScale(s);
  const Yg = lin(G_LO, G_HI, PY1, PY0);
  const ga = gapAxis(dom);
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
    Yd,
    zeroY,
    // the outturn | forecast divider: half a year after the last outturn,
    // so it never sits on a point even when both series hold that year
    split: ACT.length ? X(ACT_LAST + 0.5) : null,
    act,
    obr,
    gap,
    yTicksG: G_TICKS.ticks.map((v) => ({ v, y: Yg(v), t: tickText(v, G_TICKS.step) })),
    yTicksD: ga.ticks.map((v) => ({ v, y: Yd(v), t: tickText(v, ga.step) })),
    off: ACT.filter(([, y]) => Math.abs(y) > OFF).map(([x, y]) => ({ x: X(x), year: x, up: y > 0 })),
    breaks: frameBreaks(act),
  };
}

// The outturn is clipped at the plot frame (CLIP_T, CLIP_B); a break mark
// sits where a line leaves or re-enters it, so an off-scale year (2020,
// 2021) reads as cut, not as a line running out of the frame.
const CLIP_T = PY0 - 3;
const CLIP_B = PY1 + 3;
function frameBreaks(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    for (const edge of [CLIP_T, CLIP_B]) {
      if ((y0 - edge) * (y1 - edge) < 0) out.push({ key: `${i}-${edge === CLIP_T ? 't' : 'b'}`, x: x0 + ((edge - y0) / (y1 - y0)) * (x1 - x0), y: edge });
    }
  }
  return out;
}

// The scenarios drawn on the canvas, and the values each state's gap axis
// holds: the UK scenarios in states 2 and 3 (all four when Korinek et al.
// is the one chosen), all four in state 4.
export function canvasLines(cl) {
  return SCENARIOS.map((s) => ({ id: s.id, ys: series(s.id, 'tfp', cl, 'Y') })).filter((l) => l.ys);
}
// `pin`: a scenario pinned for comparison, drawn from state 2, so its line
// is in every gap state's domain.
export function canvasDomain(s, sid, lines, pin = null) {
  const uk = lines.filter((l) => l.id !== 'korinek' || sid === 'korinek' || pin === 'korinek');
  return (s >= 4 ? lines : uk).flatMap((l) => l.ys);
}
// True when the move to state 4 rescales the gap axis.
export const rescales = (sid, cl, pin = null) => {
  const lines = canvasLines(cl);
  const a = gapAxis(canvasDomain(3, sid, lines, pin));
  const b = gapAxis(canvasDomain(4, sid, lines, pin));
  return a.lo !== b.lo || a.hi !== b.hi;
};
const SCEN_LINES = { korinek: ['Korinek et al.', '(US inputs)'] };
// the state from which each scenario's line is drawn
const lineFrom = (id, sid) => (id === sid ? 2 : id === 'korinek' ? 4 : 3);

// The area between two paths, for the shaded UK range: always the same
// number of points, so a rescale moves it with the lines.
function bandPath(X, Y, lo, hi) {
  const top = YEARS.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(hi[i] ?? 0).toFixed(1)}`).join('');
  const bottom = [...YEARS].reverse().map((x, j) => `L${X(x).toFixed(1)},${Y(lo[YEARS.length - 1 - j] ?? 0).toFixed(1)}`).join('');
  return `${top}${bottom}Z`;
}

const OFF_YEARS = ACT.filter(([, y]) => Math.abs(y) > OFF).map(([x]) => x);
const OFF_NOTE = OFF_YEARS.length ? ` ${OFF_YEARS.join(' and ')} run${OFF_YEARS.length > 1 ? '' : 's'} off the scale (arrows).` : '';
const GAP_TITLE = 'GDP against the OBR-central path';
const STATE_TEXT = (sid, cl) => [
  { title: 'Real GDP growth', unit: `ONS outturn: percentage change on the previous calendar year.${OFF_NOTE}` },
  { title: 'Real GDP growth', unit: `ONS outturn (solid) and the OBR’s forecast${OBR_VINTAGE ? `, ${OBR_VINTAGE}` : ''} (dashed): percentage change on the previous year.${OFF_NOTE}` },
  { title: GAP_TITLE, unit: `${SCEN_NAME[sid]}, automation + productivity, ${CL_WORDS[cl]}. A gap in %, not a growth rate or a level` },
  { title: GAP_TITLE, unit: `The UK scenarios, ${SCEN_NAME[sid]} in colour, the UK range shaded. Automation + productivity, ${CL_WORDS[cl]}. Gap, %` },
  { title: GAP_TITLE, unit: `The four scenarios, ${SCEN_NAME[sid]} in colour. Automation + productivity, ${CL_WORDS[cl]}. Gap, %` },
];

// The source line of each geometry state: the record's (ONS, OBR) linked
// to readable pages, then the model's with the drawn solves' result files.
function SourceText({ s }) {
  const ons = SRC_REC.ons;
  const obr = SRC_REC.obr;
  const a = ons ? (
    <>
      {ons.publisher}, <A href={readable(ons)}>{ons.series ?? ons.title}</A>
    </>
  ) : (
    'ONS'
  );
  const b = obr ? (
    <>
      {obr.publisher ?? 'OBR'}, <A href={readable(obr)}>{obr.title ?? 'Economic and fiscal outlook'}</A>
    </>
  ) : (
    'OBR, Economic and fiscal outlook'
  );
  if (s === 0) return <>Source: {a}.</>;
  if (s === 1) return <>Sources: {a}; {b}.</>;
  return <ModelSource method="m-shock" />;
}
const SRC_REC = { ons: SRC[SER.gdp_growth?.source], obr: SRC[SER.obr_gdp_forecast?.source] };

// The pinned scenario, when it is not the one chosen and its solve is done:
// drawn from state 2 as a dark grey line (its own path, restyled; never a
// second copy), so two scenarios can be compared with the gap axis holding
// both. Geometry from the solves only.
export const pinnedOf = (pin, sid, lines) => (pin && pin !== sid && lines.some((l) => l.id === pin) ? pin : null);

export function MorphChart({ state, sid, cl, pin = null, onPin }) {
  const s = Math.max(0, Math.min(4, state));
  // one clip per copy (phones draw a copy per step)
  const clip = `p2-morph-clip${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const k = Math.min(s, 2);
  const ys = series(sid, 'tfp', cl, 'Y');
  const lines = canvasLines(cl);
  const pinned = pinnedOf(pin, sid, lines);
  const from = (id) => (id === pinned ? 2 : lineFrom(id, sid));
  const domAt = (st) => canvasDomain(st, sid, lines, pinned);
  const g = morphGeometry(k, ys, domAt(s));
  const all = STATE_TEXT(sid, cl);
  const allTicks = [...new Set(X_TICKS.flat())].sort((a, b) => a - b);
  // Layers shown in one state only are drawn where that state puts them,
  // so they never jump while fading out.
  const g0 = k === 0 ? g : morphGeometry(0, ys, domAt(2));
  const g1 = k === 1 ? g : morphGeometry(1, ys, domAt(2));
  const g2 = k === 2 ? g : morphGeometry(2, ys, domAt(2));
  // the gap geometry in view: this state's in the gap states, else state 2's
  const gG = s >= 2 ? g : g2;
  const gOff = k < 2 ? g : g1;
  const split = OBR.length ? g1.split : null;
  const dPath = (pts) => pathOf(pts);
  const dStyle = (pts) => ({ d: `path('${pathOf(pts)}')` });
  // the gap axis's ticks over states 2-4: one element per value, sliding
  // with the rescale; a value that leaves fades where the new scale puts it
  const tickSets = [2, 4].map((st) => morphGeometry(2, ys, domAt(st)).yTicksD);
  const dTicks = [...new Map(tickSets.flat().map((t) => [t.v, t])).values()].sort((a, b) => a.v - b.v);
  const dNow = new Set(gG.yTicksD.map((t) => t.v));
  const resc = rescales(sid, cl, pinned);
  const lo = lines.find((l) => l.id === 'uk_low')?.ys;
  const hi = lines.find((l) => l.id === 'uk_high')?.ys;
  const band = lo && hi ? bandPath(gG.X, gG.Yd, lo, hi) : null;
  const iH = YEARS.indexOf(HEADLINE_YEAR);
  const ring = ys ? [gG.X(HEADLINE_YEAR), gG.Yd(ys[iH])] : null;
  // direct labels in the gutter, placed over every label of the gap states
  // (drawn or not), so none moves when another line arrives
  const labelItems = [
    { key: 'zero', v: 0, lines: ['OBR-central', 'path = 0'], color: 'var(--pe-gray-600)', on: s >= 2, zero: true },
    ...lines.map((l) => ({
      key: l.id,
      v: l.ys[l.ys.length - 1],
      lines: SCEN_LINES[l.id] ?? [SCEN_NAME[l.id]],
      color: l.id === sid ? ARM_TEXT_COLOR.tfp : 'var(--pe-gray-600)',
      on: s >= from(l.id),
      pinned: l.id === pinned,
    })),
  ];
  const placed = placeLabels(labelItems, gG.Yd, PY0, PY1, 13);
  const shownNames = lines.filter((l) => s >= from(l.id));
  const label = [
    `Line chart, shape only. Real GDP growth each year from ${ACT[0]?.[0]} to ${ACT_LAST}, ONS outturn, solid with filled dots.`,
    s === 1 ? `The OBR’s forecast of growth from ${OBR[0]?.[0]} to ${OBR_LAST}, dashed with open dots, under a band marked Forecast.` : '',
    s >= 2
      ? `The axis then changes from growth in % a year to a gap in % against the OBR-central path, OG-UK's own no-shock path on one OBR input, which is now the zero line. GDP in ${SCEN_NAME[sid]}'s main arm rises above it from ${SURPRISE_YEAR}; a band marks the shock, ${SURPRISE_YEAR} to ${HEADLINE_YEAR}.`
      : '',
    s >= 3
      ? `Drawn: ${shownNames.map((l) => SCEN_NAME[l.id]).join(', ')}. Each ${afterWordsAll(shownNames.map((l) => l.ys)) ?? 'changes more slowly'} after ${HEADLINE_YEAR}; the larger the scenario, the higher the line. The UK range, from UK low to UK high, is shaded.`
      : '',
    s >= 4 && sid !== 'korinek' ? `${resc ? 'The scale widens and ' : ''}Korinek et al., on US inputs, lies above the UK range.` : '',
    s >= 2 && pinned ? `${SCEN_NAME[pinned]} is pinned for comparison, in dark grey.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure className="p2-figure p2-morph" data-state={s} data-rescale={resc ? '' : undefined}>
      {/* the badge flips from the record to the model with the axis */}
      <span className="p2-badge-stack">
        <ModelBadge model="official" className={s < 2 ? undefined : 'p2-text-ghost'} />
        <ModelBadge model="oguk" className={s >= 2 ? undefined : 'p2-text-ghost'} />
      </span>
      {/* every state's title and unit stacked in one grid cell, only the
          current one visible: the drawing below never moves between states */}
      <p className="story-figure-title p2-text-stack">
        {all.map((t, i) => (
          <span key={i} className={i === s ? undefined : 'p2-text-ghost'} aria-hidden={i === s ? undefined : 'true'}>
            <Tx icon="path">{t.title}</Tx>
          </span>
        ))}
      </p>
      <p className="story-figure-unit p2-text-stack">
        {all.map((t, i) => (
          <span key={i} className={i === s ? undefined : 'p2-text-ghost'} aria-hidden={i === s ? undefined : 'true'}>
            <Tx icon="measure" size={12}>
              {t.unit}
            </Tx>
          </span>
        ))}
      </p>
      <div className="p2-canvas-box">
        <svg className="story-svg p2-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <defs>
            <clipPath id={clip}>
              <rect x={PX0 - 4} y={CLIP_T} width={PX1 - PX0 + 8} height={CLIP_B - CLIP_T} />
            </clipPath>
          </defs>
          {/* bands: the OBR's forecast years (state 1), the shock (gap states) */}
          {split != null ? (
            <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`}>
              <rect x={split} y={PY0} width={Math.max(0, PX1 - split)} height={PY1 - PY0} className="p2-band-period" />
              <text data-axis="" x={split + 4} y={PY0 + 10} className="p2-band-note">
                Forecast
              </text>
            </g>
          ) : null}
          <g className={`p2-mo-fade${s >= 2 ? ' is-on' : ''}`}>
            <rect x={g2.X(SURPRISE_YEAR)} y={PY0} width={g2.X(HEADLINE_YEAR) - g2.X(SURPRISE_YEAR)} height={PY1 - PY0} className="p2-band-shock" />
            <text data-axis="" x={g2.X(SURPRISE_YEAR) + 4} y={PY0 + 10} className="p2-band-note">
              AI shock
            </text>
          </g>
          {/* the two y axes: growth (states 0-1), gap (states 2-4) */}
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
            {dTicks.map((t) => (
              <g
                key={`d${t.v}`}
                className={`p2-mo-yt${dNow.has(t.v) ? ' is-on' : ''}`}
                style={{ transform: `translate(0px, ${gG.Yd(t.v).toFixed(1)}px)` }}
              >
                {Math.abs(t.v) > 1e-9 ? <line x1={PX0} x2={PX1G} y1={0} y2={0} className="p2-grid" /> : null}
                <text data-axis="" x={PX0 - 6} y={0} dy="0.35em" textAnchor="end" className="p2-tick">
                  {t.t}
                </text>
              </g>
            ))}
          </g>
          {/* x ticks: shown in both states, they slide; leaving or arriving,
              they fade in place (tickX) */}
          {allTicks.map((x) => {
            const on = X_TICKS[k].includes(x);
            return (
              <g key={`x${x}`} className={`p2-mo-x${on ? ' is-on' : ''}`} style={{ transform: `translate(${tickX(x, k).toFixed(1)}px, 0px)` }}>
                <text data-axis="" x={0} y={H - 8} textAnchor="middle" className="p2-tick">
                  {x}
                </text>
              </g>
            );
          })}
          {/* the UK range, shaded once UK low and UK high are drawn */}
          {band ? <path className={`p2-mo-band${s >= 3 ? ' is-on' : ''}`} d={band} style={{ d: `path('${band}')` }} /> : null}
          {/* the zero line moves from zero growth to the OBR-central path */}
          <line x1={PX0} x2={k >= 2 ? PX1G : PX1} y1={0} y2={0} className="p2-zero p2-mo-move is-on" style={{ transform: `translate(0px, ${g.zeroY.toFixed(1)}px)` }} />
          <g clipPath={`url(#${clip})`}>
            <path className={`p2-mo-line p2-mo-act${k < 2 ? ' is-on' : ''}`} d={dPath(g.act)} style={dStyle(g.act)} />
            {g.act.map(([x, y], i) => (
              <g key={`a${ACT[i][0]}`} className={`p2-mo-move${k < 2 ? ' is-on' : ''}`} style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` }}>
                <circle r={2.8} className={`p2-mo-dot${PARTIAL && PARTIAL.x === ACT[i][0] ? ' is-open' : ''}`} />
              </g>
            ))}
            <path className={`p2-mo-line p2-mo-obr${k >= 1 ? ' is-on' : ''}${k >= 2 ? ' is-zero' : ''}`} d={dPath(g.obr)} style={dStyle(g.obr)} />
            {OBR.map(([x], i) => {
              const j = YEARS.indexOf(x);
              const p = j >= 0 ? g.obr[j] : [g.X(x), g.zeroY];
              return (
                <g key={`o${x}`} className={`p2-mo-move${k === 1 ? ' is-on' : ''}`} style={{ transform: `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)` }}>
                  <circle r={2.8} className="p2-mo-dot is-open" data-i={i} />
                </g>
              );
            })}
            {/* the other scenarios: they draw along their own path (state 3
                for the UK ones, state 4 for Korinek et al., after the rescale) */}
            {lines
              .filter((l) => l.id !== sid)
              .map((l) => {
                const d = pathOf(YEARS.map((yr, i) => [gG.X(yr), gG.Yd(l.ys[i])]));
                const on = s >= from(l.id);
                return (
                  <path
                    key={l.id}
                    pathLength={1}
                    className={`p2-mo-scen${on ? ' is-on' : ''}${l.id === 'korinek' && resc && l.id !== pinned ? ' is-late' : ''}${l.id === pinned ? ' is-pinned' : ''}`}
                    data-scen={l.id}
                    d={d}
                    style={{ d: `path('${d}')` }}
                  />
                );
              })}
            <path
              className={`p2-mo-line p2-mo-gap${k >= 2 && ys ? ' is-on' : ''}`}
              data-scen={sid}
              d={dPath(g.gap)}
              style={{ ...dStyle(g.gap), stroke: ARM_COLOR.tfp }}
            />
          </g>
          {/* break marks where the outturn leaves the frame (states 0-1) */}
          {g.breaks.map((b) => (
            <g key={b.key} className={`p2-mo-move${k < 2 ? ' is-on' : ''}`} style={{ transform: `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)` }}>
              <path d="M-6,2.5L0,-2.5M-1,2.5L5,-2.5" className="p2-mo-break-gap" />
              <path d="M-6,2.5L0,-2.5M-1,2.5L5,-2.5" className="p2-mo-break" />
            </g>
          ))}
          {/* off-scale years (states 0-1): named, not valued */}
          <g className={`p2-mo-fade${k < 2 ? ' is-on' : ''}`}>
            {gOff.off.map((o) => (
              <text key={o.year} data-axis="" x={o.x + (o.up ? 7 : -7)} y={o.up ? PY0 + 8 : PY1 - 20} textAnchor={o.up ? 'start' : 'end'} className="p2-mo-off">
                {o.year} {o.up ? '↑' : '↓'}
              </text>
            ))}
          </g>
          {/* direct labels */}
          <g className={`p2-mo-fade${s === 0 ? ' is-on' : ''}`}>
            <text x={g0.act[g0.act.length - 1]?.[0] - 4} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
              ONS outturn
            </text>
          </g>
          <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`}>
            <text x={PX1} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
              OBR forecast
            </text>
          </g>
          {placed.map((p) => (
            <g
              key={p.key}
              className={`p2-mo-end${p.on ? ' is-on' : ''}${p.key === 'korinek' && resc && !p.pinned ? ' is-late' : ''}${p.pinned ? ' is-pinned' : ''}`}
              style={{ transform: `translate(${PX1G + 6}px, ${p.t.toFixed(1)}px)` }}
            >
              <text className={`p2-end-label${p.zero ? ' is-zero' : ''}`} y={13 * 0.75} style={{ fill: p.color }}>
                {p.lines.map((l, i) => (
                  <tspan key={l} x={0} dy={i ? 13 : 0}>
                    {l}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
          {/* the headline year on the chosen line: a ring, no value */}
          {ring ? (
            <g className={`p2-mo-ring${s >= 2 ? ' is-on' : ''}`} style={{ transform: `translate(${ring[0].toFixed(1)}px, ${ring[1].toFixed(1)}px)` }}>
              <circle r={5.5} />
            </g>
          ) : null}
          <g className={`p2-mo-fade${s === 2 ? ' is-on' : ''}`}>
            <g className="p2-mo-newaxis">
              <rect x={PX0 + 4} y={PY0 + 16} className="p2-mo-newaxis-box" width={127} height={20} rx={3} />
              <text x={PX0 + 10} y={PY0 + 26} dy="0.35em">
                New scale: gap, %
              </text>
            </g>
          </g>
          {/* the y axis's title: growth (states 0-1), gap (states 2-4) */}
          <text x={4} y={11} className={`p2-panel-name p2-mo-fade${s < 2 ? ' is-on' : ''}`} data-axis-title={s < 2 ? 'y' : undefined} aria-hidden={s < 2 ? undefined : 'true'}>
            Real GDP growth, % a year
          </text>
          <text x={4} y={11} className={`p2-panel-name p2-mo-fade${s >= 2 ? ' is-on' : ''}`} data-axis-title={s >= 2 ? 'y' : undefined} aria-hidden={s >= 2 ? undefined : 'true'}>
            Gap against the OBR-central path, %
          </text>
        </svg>
        {/* the ring's link to the headline figures (no value: their home is
            the tiles below); a page link, so it sits over the drawing */}
        {ring ? (
          <NavLink
            tab="story"
            anchor="story-headline"
            className={`p2-mo-hl${s >= 2 ? ' is-on' : ''}${ring[1] < (PY0 + PY1) / 2 ? ' is-below' : ''}`}
            tabIndex={s >= 2 ? undefined : -1}
            aria-hidden={s >= 2 ? undefined : 'true'}
            style={{ '--x': ((ring[0] / W) * 100).toFixed(2), '--y': ((ring[1] / W) * 100).toFixed(2) }}
          >
            <span data-axis="">{HEADLINE_YEAR}</span>
            <span className="p2-mo-hl-sep" aria-hidden="true">
              ·
            </span>
            Headline figures
            <Icon name={iconFor('next')} size={12} strokeWidth={2} />
          </NavLink>
        ) : null}
      </div>
      <div className="p2-fig-foot">
        {onPin ? <PinRow s={s} sid={sid} pin={pin} pinned={pinned} lines={lines} onPin={onPin} /> : null}
        <span className="p2-axis-x" data-axis-title="x">
          Year
        </span>
      </div>
      <figcaption className="story-source">
        <Tx icon="source" size={12}>
          <SourceText s={s} />
        </Tx>
      </figcaption>
    </figure>
  );
}

// Pin and compare: pin the chosen scenario, then choose another (here or
// in the header); the pinned one stays drawn in dark grey. No value is
// printed: the comparison is of shapes, the figures are the tiles'.
function PinRow({ s, sid, pin, pinned, lines, onPin }) {
  const { set } = useNav();
  if (s < 2) return null;
  const on = pin === sid || pinned != null;
  const others = lines.filter((l) => l.id !== (pinned ?? sid));
  return (
    <span className={`p2-pin${on ? ' is-on' : ''}`}>
      <button type="button" className="p2-pin-btn" aria-pressed={on} onClick={() => onPin(on ? null : sid)}>
        <Icon name={iconFor('compare')} size={13} strokeWidth={2} />
        {on ? `Pinned: ${SCEN_NAME[pin]}` : `Pin ${SCEN_NAME[sid]} to compare`}
      </button>
      {on ? (
        <label className="p2-pin-pick">
          <span className="visually-hidden">Compare it with</span>
          <select value={pinned ? sid : ''} onChange={(e) => e.target.value && set({ s: e.target.value })}>
            <option value="">{pinned ? 'Compare with…' : 'Compare with…'}</option>
            {others.map((l) => (
              <option key={l.id} value={l.id}>
                {SCEN_NAME[l.id]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </span>
  );
}

export function morphSteps(sid, cl) {
  return [
    // A short opener on the OBR's forecast, where part 1 ends (state 1),
    // then the morph to the gap (state 2).
    {
      id: 'p2-morph-1',
      icon: 'record',
      title: 'The record so far',
      body: <Items items={[{ icon: 'forecast', text: 'Where part 1 ended: ONS outturn and the OBR’s forecast' }]} />,
    },
    {
      id: 'p2-morph-2',
      icon: 'path',
      title: 'From growth rates to a gap',
      body: (
        <>
          <Items items={morphItems(sid, cl)} />
          <ResultLinks
            files={[
              [`${SCEN_NAME[sid]} result file`, resultUrl(sid, 'tfp', cl)],
              ['no-shock path file', pathUrl(cl)],
            ]}
            method="m-path"
            methodText="How the path is set"
          />
        </>
      ),
    },
  ];
}

// The morph card's items. The blue line's direction is read from the
// scenario's GDP gap after the surprise (every year above, every year
// below, or neither), so the icon and the words agree with the chart.
export function morphItems(sid, cl) {
  const ys = series(sid, 'tfp', cl, 'Y');
  const tail = ys ? ys.slice(YEARS.indexOf(SURPRISE_YEAR) + 1) : [];
  const dir = !tail.length ? null : tail.every((v) => v > EPS2) ? 'gapUp' : tail.every((v) => v < -EPS2) ? 'gapDown' : null;
  const where = cl === BOUND ? 'with closed capital' : 'at the central closure';
  return [
    { icon: 'forecast', text: `Zero is OG-UK’s own no-shock path, not the OBR’s ${OBR_VINTAGE ? `${OBR_VINTAGE} ` : ''}forecast` },
    {
      icon: 'source',
      text: (
        <>
          It takes one OBR input: <A href={EFO_MAR26}>trend productivity growth, {MODEL_BASE_VINTAGE}</A>
        </>
      ),
    },
    { icon: 'measure', text: 'Results are gaps against that path' },
    dir
      ? { icon: dir, text: `Blue line: GDP in ${SCEN_NAME[sid]} ${dir === 'gapUp' ? 'above' : 'below'} it, ${where}` }
      : { icon: 'path', text: `Blue line: GDP in ${SCEN_NAME[sid]} against it, ${where}` },
  ];
}
