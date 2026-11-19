'use client';

import { useEffect, useId, useRef } from 'react';
import { subscribe } from '@/lib/scrollLoop.js';
import { useSvgScale } from '@/lib/svgScale.js';
import Tween from '@/components/story/Tween.jsx';
import { useIsPhone } from '@/components/story/motion.js';
import U from '@/data/ukContext.json';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCENARIOS, SCEN_NAME, ARM_COLOR, ARM_TEXT_COLOR, CENTRAL, BOUND, scenarioById } from '@/tabs/ai/surprise.js';
import { EPS2 } from './dir.js';
import { ModelBadge } from '@/components/story/chart/index.js';
import { W, H, niceTicks, Tx, placeLabels } from './frame.jsx';
import { modelItems, SRC as LINKS } from './sources.jsx';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { docItem, ukItem } from '@/lib/sourceItems.js';
import { NavLink } from '@/lib/nav.jsx';
import { paySigns } from './caveats.js';
import { DebtNote, debtParts } from '@/tabs/ai/Landing.jsx';

const EFO_MAR26 = LINKS.efoMar26;
import { series, afterWordsAll, scenarioRel, ukRangeDrawn } from './charts.jsx';

// Scene 2A, the GDP canvas: from the record to the scenarios, in one chart
// whose axes and lines move between five states as the reader scrolls:
//   0  real GDP growth, ONS outturn (part 1's data, read by key; kept for
//      links and tests);
//   1  + the OBR's forecast of growth, dashed, open dots, under a
//      "Forecast" band: the block's short first card, where part 1 ends;
//   2  the axis changes from growth (% a year) to a gap (% against the
//      forecast path): the forecast line flattens into the zero line and
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
const CL_WORDS = { [CENTRAL]: 'some foreign capital', [BOUND]: 'no foreign capital' };

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
// the surprise year's index: a scenario line and the UK range start here
const I0 = YEARS.indexOf(SURPRISE_YEAR);
// a year before the surprise drawn at the surprise year (form (b))
const from0 = (i) => Math.max(i, I0);

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
  // the scenario's gap: on the forecast line until state 2. In the gap
  // states it starts in the surprise year (form (b), as the hero): the
  // points before it sit on its first point, so no segment joins 2027 to
  // 2028 and the point count never changes (the morph needs it)
  const gap = YEARS.map((yr, i) =>
    gapState ? [X(Math.max(yr, SURPRISE_YEAR)), Yd(gapYs?.[Math.max(i, I0)] ?? 0)] : [X(Math.min(yr, OBR_LAST)), obr[i][1]],
  );
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

// Where an off-scale year's note goes (states 0-1; push B sign-off): beside
// the frame edge the line leaves by, on the open side of the steep segment
// next to it, so the note never crosses the line. A year off the bottom
// ("2020 ↓") sits left of the segment coming down into it, end-anchored; a
// year off the top ("2021 ↑") right of the segment coming down out of it,
// start-anchored. Measured from the line's x at the note's nearer edge
// (fs: the note's font size in user units).
export function offNotePlace(act, o, fs) {
  const i = ACT.findIndex(([x]) => x === o.year);
  const O = act[i];
  const at = (A, B, y) => A[0] + ((y - A[1]) / (B[1] - A[1])) * (B[0] - A[0]);
  if (O && o.up) {
    const N = act[i + 1];
    const y = PY0 + 0.75 * fs + 2;
    const bottom = y + 0.25 * fs;
    if (N && N[1] > bottom && O[1] < bottom) return { x: at(O, N, bottom) + 4, y, anchor: 'start' };
  } else if (O) {
    const P = act[i - 1];
    const y = PY1 - 0.25 * fs - 4;
    const top = y - 0.75 * fs;
    if (P && P[1] < top && O[1] > top) return { x: at(P, O, top) - 4, y, anchor: 'end' };
  }
  return { x: o.x + (o.up ? 7 : -7), y: o.up ? PY0 + 8 : PY1 - 20, anchor: o.up ? 'start' : 'end' };
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
const SCEN_LINES = { korinek: ['Korinek,', 'substantial (US)'] };
// phones: the gutter holds about 85px at the 14px label size
const SCEN_LINES_PHONE = { korinek: ['Korinek,', 'substantial', '(US)'] };
// Each scenario's two inputs beside its line (Maria M2; Opus/coordinator
// ruling, Fable unavailable): the fall in labour's share, pp, and the output
// gain at given inputs, %, by the headline year, read from the data's
// scenario inputs. null when the file has no such input.
const signed = (v, unit) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}${unit}`;
export function inputsLine(sid) {
  const x = scenarioById(sid) ?? SCENARIOS.find((c) => c.id === sid);
  const a = x?.labour_share_fall_pp;
  const b = x?.tfp_gain_pct;
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return `${signed(-a, 'pp')}, ${signed(b, '%')}`;
}
// where each scenario's inputs come from (the scene's notes)
const INPUT_SOURCE = { uk_low: 'OBR, IMF', uk_central: 'IMF', uk_high: 'OBR upper' };
// end-label block height per line, in viewBox units: room at phone width,
// where the labels are largest
const LH = 17;
// phones draw the labels larger (story-part2.css): more room between them,
// so UK central and UK low never touch
const LH_PHONE = 22;
// the state from which each scenario's line is drawn
const lineFrom = (id, sid) => (id === sid ? 2 : id === 'korinek' ? 4 : 3);

// The area between two paths, for the shaded UK range: always the same
// number of points, so a rescale moves it with the lines. It starts in the
// surprise year (its left edge a vertical there): the years before sit on it.
function bandPath(X, Y, lo, hi) {
  const at = (i) => YEARS[from0(i)];
  const top = YEARS.map((_, i) => `${i ? 'L' : 'M'}${X(at(i)).toFixed(1)},${Y(hi[from0(i)] ?? 0).toFixed(1)}`).join('');
  const bottom = YEARS.map((_, i) => YEARS.length - 1 - i)
    .map((i) => `L${X(at(i)).toFixed(1)},${Y(lo[from0(i)] ?? 0).toFixed(1)}`)
    .join('');
  return `${top}${bottom}Z`;
}

const OFF_YEARS = ACT.filter(([, y]) => Math.abs(y) > OFF).map(([x]) => x);
const OFF_NOTE = OFF_YEARS.length ? ` ${OFF_YEARS.join(' and ')} run${OFF_YEARS.length > 1 ? '' : 's'} off the scale.` : '';
const GAP_TITLE = 'GDP against the OBR’s central forecast path';
// Each state's title is a finding (story-finding-titles-fable.md), with a
// fallback (fallback: true, marked for check_text) when its condition
// fails; the unit line says what is plotted, the years and the source.
// The sign of a scenario's gap in every year after the surprise year:
// 'above', 'below' or null (mixed, or pending).
const gapSide = (ys) => {
  if (!ys) return null;
  const tail = ys.slice(YEARS.indexOf(SURPRISE_YEAR) + 1);
  if (tail.length && tail.every((v) => v > EPS2)) return 'above';
  if (tail.length && tail.every((v) => v < -EPS2)) return 'below';
  return null;
};
// the same in every scenario's main arm
const allSide = (cl) => {
  const sides = SCENARIOS.map((x) => gapSide(series(x.id, 'tfp', cl, 'Y')));
  return sides.every((v) => v && v === sides[0]) ? sides[0] : null;
};
const ACT_LO = ACT.reduce((m, p) => (p[1] < m[1] ? p : m), ACT[0] ?? [null, Infinity]);
const ACT_HI = ACT.reduce((m, p) => (p[1] > m[1] ? p : m), ACT[0] ?? [null, -Infinity]);
const steadier = OBR.length > 0 && ACT.length > 0 && Math.min(...OBR.map((p) => p[1])) >= ACT_LO[1] && Math.max(...OBR.map((p) => p[1])) <= ACT_HI[1];
const ACT_FIRST = ACT.length ? ACT[0][0] : ACT_LAST;
const shortName = (sid) => scenarioById(sid)?.short ?? SCEN_NAME[sid];
const STATE_TEXT = (sid, cl) => {
  const one = gapSide(series(sid, 'tfp', cl, 'Y'));
  const every = allSide(cl);
  return [
    { title: `Growth swung widely in ${[ACT_LO[0], ACT_HI[0]].sort((a, b) => a - b).join(' and ')}`, fallback: false, unit: `ONS real GDP growth, % a year, ${ACT_FIRST} to ${ACT_LAST}.${OFF_NOTE}` },
    {
      title: steadier ? 'The OBR’s forecast is steadier than the last ten years' : 'Real GDP growth',
      fallback: !steadier,
      unit: `Real GDP growth, % a year, ${ACT_FIRST} to ${ACT_LAST}: ONS record (solid), OBR forecast (dashed).`,
    },
    {
      title: one ? `GDP runs ${one} the forecast path from ${SURPRISE_YEAR}` : GAP_TITLE,
      fallback: !one,
      unit: `GDP gap against the OBR’s central forecast path, %. ${shortName(sid)}, ${CL_WORDS[cl]}.`,
    },
    {
      title: every ? `GDP ends ${every} the forecast path in every scenario` : GAP_TITLE,
      fallback: !every,
      unit: `GDP gap against the OBR’s forecast path, %.${ukRangeDrawn(cl) ? ' UK range shaded;' : ''} ${CL_WORDS[cl]}.`,
    },
    {
      title: every ? `GDP ends ${every} the forecast path in every scenario` : GAP_TITLE,
      fallback: !every,
      unit: `GDP gap against the OBR’s forecast path, %. Four scenarios; ${CL_WORDS[cl]}.`,
    },
  ];
};

// The sources of each geometry state, behind the figure's one "Sources
// and notes" button: the record's (ONS, OBR), then the model's, with the
// path's one OBR input and the scenario inputs.
export function morphItems(s) {
  const ons = ukItem(SER.gdp_growth?.source);
  const obr = ukItem(SER.obr_gdp_forecast?.source);
  if (s === 0) return [ons];
  if (s === 1) return [ons, obr];
  return [
    ...modelItems([], 'm-scenarios'),
    docItem('Path input: trend productivity growth, Economic and fiscal outlook, March 2026', EFO_MAR26, 'Office for Budget Responsibility'),
    docItem('Scenario inputs: Briefing paper No.9', LINKS.bp9, 'Office for Budget Responsibility'),
    docItem('Scenario inputs: SIP/2026/072', LINKS.imfSip, 'International Monetary Fund'),
    docItem('Scenario inputs: Korinek et al. (2026), Table 3', LINKS.korinekT3, 'Korinek et al.'),
  ];
}

// The model states' notes (2 on), behind the same button: what the
// headline figures are measured against and the pay tile's sign caveat
// (voice pass: they left the step text). The debt line's repricing clause
// is gone: the scene's own two debt sentences say it (R4-01).
export function morphGroups(s, sid, cl) {
  // the forecast's vintage, out of the unit line (pushB-final-rulings-fable.md 1)
  // the two forecasts, said once (M3 handoff): the dashed line is the OBR's
  // latest, for context; the comparison path is OG-UK's own
  if (s === 1 && OBR_VINTAGE)
    return [
      {
        title: 'How to read',
        notes: [{ icon: 'forecast', text: `The dashed line is the OBR’s latest forecast, of ${OBR_VINTAGE}, shown for context; the comparison path is OG-UK’s own, on its March 2026 assumptions.` }],
      },
    ];
  if (s < 2) return [];
  return [
    {
      title: 'How to read',
      notes: [
        {
          icon: 'scenario',
          text: (
            <span data-axis="">
              {`Each scenario’s inputs by ${HEADLINE_YEAR}, beside its line on wider screens: the fall in labour’s share of output, pp, and the output gain at given inputs, %. ${SCENARIOS.filter((x) => inputsLine(x.id))
                .map((x) => `${shortName(x.id)} ${inputsLine(x.id)}${INPUT_SOURCE[x.id] ? ` (${INPUT_SOURCE[x.id]})` : ''}`)
                .join('; ')}.`}
            </span>
          ),
        },
        {
          icon: 'scenario',
          text: (
            <>
              Main version, against the OBR’s central forecast path. The other two versions are on{' '}
              <NavLink tab="explore" sub="economy" anchor="income">
                Explore
              </NavLink>
            </>
          ),
        },
        paySigns(sid) === 'flips'
          ? {
              icon: 'closure',
              text: (
                <>
                  The sign of the pay-rate gap depends on how much capital comes from abroad. Compare each foreign-capital case on{' '}
                  <NavLink tab="explore" sub="economy" anchor="explore-part-all">
                    Explore
                  </NavLink>
                </>
              ),
            }
          : null,
        // the model's at-once repricing (R4-01's second debt sentence),
        // with the headline figures: here, not under the closing line, so
        // the last card fits beside the figure (coordinator ruling, Fable
        // unavailable)
        s >= 4 && debtParts(sid, cl) ? { icon: 'debt', text: <DebtNote sid={sid} cl={cl} /> } : null,
      ],
    },
  ];
}

// The pinned scenario, when it is not the one chosen and its solve is done:
// drawn from state 2 as a dark grey line (its own path, restyled; never a
// second copy), so two scenarios can be compared with the gap axis holding
// both. Geometry from the solves only.
export const pinnedOf = (pin, sid, lines) => (pin && pin !== sid && lines.some((l) => l.id === pin) ? pin : null);

// `scrub` (item 30, Vahid: "as soon as I scroll a bit, it changes"): the
// change from growth to the gap runs across its own step, linked to the
// scroll (Scrolly stepProgress writes --step-p, 0 to 1, on the block): the
// lines move from the growth geometry to the gap's, the y axis hands over
// (the growth ticks and title fade out as the gap's fade in), the x ticks
// slide. On the page's one scroll loop, attributes and inline styles
// only (Safari-safe: no CSS d). Reduced motion: nothing moves; the growth
// layer cross-fades into the gap layer over the same step.
const easeIO = (x) => x * x * (3 - 2 * x);
const lerpPts = (a, b, t) => a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);
function useMorphScrub(ref, on, g1, g2) {
  const geo = useRef({ g1, g2 });
  useEffect(() => {
    geo.current = { g1, g2 };
  });
  useEffect(() => {
    const fig = ref.current;
    if (!on || !fig) return undefined;
    const blk = fig.closest('.scrolly');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let last = -1;
    // every element the scrub has styled: by the time this effect is torn
    // down, React has already removed the data-scrub attributes of the next
    // state, so the hand-back cannot find them by selector (a jump from
    // part-way through the step left the growth layer at part opacity)
    const touched = new Set();
    // the elements whose transform the scrub writes: on the way out each
    // takes React's current transform again, from its data-tx (React may not
    // rewrite the style itself when its value did not change, as on a jump
    // onward: "2031" left on the plot's edge over "Year")
    const wrote = new Set();
    const setT = (el, v) => {
      el.style.transform = v;
      wrote.add(el);
    };
    const apply = (p) => {
      const { g1: a, g2: b } = geo.current;
      const e = easeIO(p);
      for (const el of fig.querySelectorAll('[data-scrub], [data-scrub-path], [data-scrub-x], [data-scrub-zero], [data-scrub-pt]')) touched.add(el);
      // the hand-over in two halves, so two axes never show at once: the
      // growth layer goes over the first half, the gap's comes over the second
      for (const el of fig.querySelectorAll('[data-scrub="out"]')) el.style.opacity = String(Math.max(0, 1 - 2 * e));
      for (const el of fig.querySelectorAll('[data-scrub="out2"]')) el.style.opacity = String(Math.max(0, 1 - 3 * e));
      for (const el of fig.querySelectorAll('[data-scrub="in"]')) el.style.opacity = String(Math.max(0, 2 * e - 1));
      // dots ride their line
      for (const el of fig.querySelectorAll('[data-scrub-pt]')) {
        const [x1, y1, x2, y2] = el.dataset.scrubPt.split(',').map(Number);
        const m = reduce ? 0 : e;
        setT(el, `translate(${(x1 + (x2 - x1) * m).toFixed(1)}px, ${(y1 + (y2 - y1) * m).toFixed(1)}px)`);
        el.style.opacity = String(Math.max(0, 1 - 2 * e));
      }
      for (const el of fig.querySelectorAll('[data-scrub-path]')) {
        const k = el.dataset.scrubPath;
        if (reduce) {
          el.setAttribute('d', pathOf(k === 'gap' ? b[k] : a[k]));
          // the same two-half hand-over as the axes and labels: the old lines
          // go over the first half, the gap line comes over the second
          // (push B sign-off, suite ruling (i))
          el.style.opacity = String(k === 'gap' ? Math.max(0, 2 * e - 1) : Math.max(0, 1 - 2 * e));
        } else {
          el.setAttribute('d', pathOf(lerpPts(a[k], b[k], e)));
          if (k === 'obr') el.style.opacity = String(1 - e);
          if (k === 'act') el.style.opacity = String(1 - e);
          if (k === 'gap') el.style.opacity = String(Math.min(1, 2 * e));
        }
      }
      for (const el of fig.querySelectorAll('[data-scrub-x]')) {
        const [x1, x2, o1, o2] = el.dataset.scrubX.split(',').map(Number);
        const m = reduce ? (e < 0.5 ? 0 : 1) : e;
        setT(el, `translate(${(x1 + (x2 - x1) * m).toFixed(1)}px, 0px)`);
        // a tick in both states slides; one that leaves goes in the first
        // half, one that arrives comes in the second (no two labels overlap)
        el.style.opacity = String(o1 && o2 ? 1 : o1 ? Math.max(0, 1 - 2 * e) : o2 ? Math.max(0, 2 * e - 1) : 0);
      }
      const z = fig.querySelector('[data-scrub-zero]');
      if (z) {
        const m = reduce ? (e < 0.5 ? 0 : 1) : e;
        setT(z, `translate(0px, ${(a.zeroY + (b.zeroY - a.zeroY) * m).toFixed(1)}px)`);
      }
    };
    const stop = subscribe({
      el: fig,
      read: () => {
        const v = parseFloat(blk?.style.getPropertyValue('--step-p'));
        return Number.isFinite(v) ? v : 1;
      },
      write: (p) => {
        if (Math.abs(p - last) < 0.001) return;
        last = p;
        apply(p);
      },
    });
    return () => {
      stop();
      // hand back to the classes
      for (const el of touched) el.style.opacity = '';
      // each scrubbed transform back to React's current one, which every
      // such element mirrors in data-tx (a cached value is wrong after a
      // scroll back up: React's new value can equal the scrub's last write)
      for (const el of wrote) if (el.dataset.tx != null) el.style.transform = el.dataset.tx;
    };
  }, [on, ref]);
}

export function MorphChart({ state, sid, cl, pin = null, scrub = false }) {
  const s = Math.max(0, Math.min(4, state));
  const figRef = useRef(null);
  // the viewBox is drawn scaled (about 1.35 on desktop, 0.83 on a phone):
  // text sizes in user units come from the chart type scale over it
  const [svgRef, sz] = useSvgScale(W, 1.35);
  const lh0 = useIsPhone() ? LH_PHONE : LH;
  const lh = Math.max(lh0, Math.round(sz.label * 1.4));
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
  // scrubbed from growth (state 1) to the gap (state 2) across the step
  const sc = scrub && s === 2;
  useMorphScrub(figRef, sc, { act: g1.act, obr: g1.obr, gap: g1.gap, zeroY: g1.zeroY }, { act: g2.act, obr: g2.obr, gap: g2.gap, zeroY: g2.zeroY });
  // the gap geometry in view: this state's in the gap states, else state 2's
  const gG = s >= 2 ? g : g2;
  const gOff = k < 2 ? g : g1;
  const split = OBR.length ? g1.split : null;
  const dPath = (pts) => pathOf(pts);
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
    // pad: clear of the scenario label just above it (UK low at phone width)
    { key: 'zero', v: 0, lines: ['Forecast', 'path = 0'], color: 'var(--pe-gray-600)', on: s >= 2, zero: true, pad: 6 },
    ...lines.map((l) => ({
      key: l.id,
      v: l.ys[l.ys.length - 1],
      lines: [
        ...((lh0 === LH_PHONE ? SCEN_LINES_PHONE[l.id] : null) ?? SCEN_LINES[l.id] ?? [SCEN_NAME[l.id]]),
        // its inputs, a grey sub-line, on desktop. A phone's gutter has no
        // room for a line more (the labels overlap), and a key under the plot
        // makes the figure too tall for the last card's hold at 390
        // (check_states): a phone reads them in the figure's More info
        ...(inputsLine(l.id) && lh0 !== LH_PHONE ? [inputsLine(l.id)] : []),
      ],
      sub: inputsLine(l.id) && lh0 !== LH_PHONE ? inputsLine(l.id) : null,
      color: l.id === sid ? ARM_TEXT_COLOR.tfp : 'var(--pe-gray-600)',
      on: s >= from(l.id),
      pinned: l.id === pinned,
    })),
  ];
  const placed = placeLabels(labelItems, gG.Yd, PY0, PY1, lh);
  const shownNames = lines.filter((l) => s >= from(l.id));
  const label = [
    `Line chart, shape only. Real GDP growth each year from ${ACT[0]?.[0]} to ${ACT_LAST}, ONS outturn, solid with filled dots.`,
    s === 1 ? `The OBR’s forecast of growth from ${OBR[0]?.[0]} to ${OBR_LAST}, dashed with open dots, under a band marked Forecast.` : '',
    s >= 2
      ? `The axis then changes from growth in % a year to a gap in % against the OBR’s central forecast path, as run in OG-UK, which is now the zero line. ${scenarioRel(sid, cl) ? `GDP in ${SCEN_NAME[sid]}'s main version ${scenarioRel(sid, cl)} it from ${SURPRISE_YEAR}` : `${SCEN_NAME[sid]} is not yet solved for this foreign-capital case`}; a band marks the extra AI, ${SURPRISE_YEAR} to ${HEADLINE_YEAR}.`
      : '',
    s >= 3
      ? `Drawn: ${shownNames.map((l) => SCEN_NAME[l.id]).join(', ')}. Each ${afterWordsAll(shownNames.map((l) => l.ys)) ?? 'changes more slowly'} after ${HEADLINE_YEAR}; the larger the scenario, the higher the line.${ukRangeDrawn(cl) ? ' The UK range, from UK low to UK high, is shaded.' : ''}`
      : '',
    s >= 4 && sid !== 'korinek' && ukRangeDrawn(cl) ? `${resc ? 'The scale widens and ' : ''}Korinek et al., substantial (US), lies above the UK range.` : '',
    s >= 2 && pinned ? `${SCEN_NAME[pinned]} is pinned for comparison, in dark grey.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure ref={figRef} className={`p2-figure p2-morph${sc ? ' is-scrub' : ''}`} data-state={s} data-rescale={resc ? '' : undefined}>
      {/* the badge flips from the record to the model with the axis */}
      <span className="p2-badge-stack">
        <ModelBadge model="official" className={s < 2 ? undefined : 'p2-text-ghost'} />
        <ModelBadge model="oguk" className={s >= 2 ? undefined : 'p2-text-ghost'} />
      </span>
      {/* every state's title and unit stacked in one grid cell, only the
          current one visible: the drawing below never moves between states */}
      <p className="story-figure-title p2-title-row" data-title-fallback={all[s]?.fallback ? '' : undefined}>
        <span className="p2-text-stack">
          {all.map((t, i) => (
            <span key={i} className={i === s ? undefined : 'p2-text-ghost'} aria-hidden={i === s ? undefined : 'true'}>
              <Tx icon="path">{t.title}</Tx>
            </span>
          ))}
        </span>
        <SourceLine items={morphItems(s)} groups={morphGroups(s, sid, cl)} />
      </p>
      <p className="story-figure-unit p2-text-stack">
        {all.map((t, i) => (
          <span key={i} className={i === s ? undefined : 'p2-text-ghost'} aria-hidden={i === s ? undefined : 'true'}>
            {t.unit}
          </span>
        ))}
      </p>
      <div className="p2-canvas-box">
        <svg ref={svgRef} className="story-svg p2-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ '--svg-k': sz.k }}>
          <defs>
            <clipPath id={clip}>
              <rect x={PX0 - 4} y={CLIP_T} width={PX1 - PX0 + 8} height={CLIP_B - CLIP_T} />
            </clipPath>
          </defs>
          {/* bands: the OBR's forecast years (state 1), the shock (gap states) */}
          {split != null ? (
            <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`} data-scrub={sc ? 'out' : undefined}>
              <rect x={split} y={PY0} width={Math.max(0, PX1 - split)} height={PY1 - PY0} className="p2-band-period" />
              <text data-axis="" x={split + 4} y={PY0 + 10} className="p2-band-note">
                Forecast
              </text>
            </g>
          ) : null}
          <g className={`p2-mo-fade${s >= 2 ? ' is-on' : ''}`} data-scrub={sc ? 'in' : undefined}>
            <rect x={g2.X(SURPRISE_YEAR)} y={PY0} width={g2.X(HEADLINE_YEAR) - g2.X(SURPRISE_YEAR)} height={PY1 - PY0} className="p2-band-shock" />
            <text data-axis="" x={g2.X(SURPRISE_YEAR) + 4} y={PY0 + 10} className="p2-band-note">
              Extra AI
            </text>
          </g>
          {/* the two y axes: growth (states 0-1), gap (states 2-4) */}
          <g className={`p2-mo-axis${s < 2 ? ' is-on' : ''}`} data-scrub={sc ? 'out' : undefined}>
            {g.yTicksG.map((t) => (
              <g key={`g${t.v}`}>
                {Math.abs(t.v) > 1e-9 ? <line x1={PX0} x2={PX1} y1={t.y} y2={t.y} className="p2-grid" /> : null}
                {/* on a phone the tick type is large enough that a label on
                    the plot's foot meets the first year below it ("−2" over
                    "2016", check_fontsize at 390): that one label is left out,
                    its gridline kept */}
                {lh0 === LH_PHONE && t.y >= PY1 - 2 ? null : (
                  <text data-axis="" x={PX0 - 6} y={t.y} dy="0.35em" textAnchor="end" className="p2-tick">
                    {t.t}
                  </text>
                )}
              </g>
            ))}
          </g>
          <g className={`p2-mo-axis${s >= 2 ? ' is-on' : ''}`} data-scrub={sc ? 'in' : undefined}>
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
            const sx = sc ? `${tickX(x, 1).toFixed(1)},${tickX(x, 2).toFixed(1)},${X_TICKS[1].includes(x) ? 1 : 0},${X_TICKS[2].includes(x) ? 1 : 0}` : undefined;
            return (
              <g key={`x${x}`} className={`p2-mo-x${on ? ' is-on' : ''}`} data-scrub-x={sx} data-tx={`translate(${tickX(x, k).toFixed(1)}px, 0px)`} style={{ transform: `translate(${tickX(x, k).toFixed(1)}px, 0px)` }}>
                {/* the growth axis's last year sits on the plot's right edge:
                    end-anchored there, so it is not cut by the svg (item 30,
                    "2031" clipped at 390); its first year sits on the left
                    edge, start-anchored, clear of the "−2" tick, also while it
                    fades out across the scrubbed step (push B sign-off) */}
                <text data-axis="" x={0} y={H - 8} textAnchor={k < 2 && x === OBR_LAST ? 'end' : (k < 2 || sc) && x === X_TICKS[1][0] ? 'start' : 'middle'} className="p2-tick">
                  {x}
                </text>
              </g>
            );
          })}
          {/* the UK range, shaded once UK low and UK high are drawn */}
          {band ? <Tween className={`p2-mo-band${s >= 3 ? ' is-on' : ''}`} morph={{ d: band }} /> : null}
          {/* the zero line moves from zero growth to the OBR’s central forecast path */}
          <line data-mark="path" data-scrub-zero={sc ? '' : undefined} x1={PX0} x2={k >= 2 ? PX1G : PX1} y1={0} y2={0} className="p2-zero p2-mo-move is-on" data-tx={`translate(0px, ${g.zeroY.toFixed(1)}px)`} style={{ transform: `translate(0px, ${g.zeroY.toFixed(1)}px)` }} />
          <g clipPath={`url(#${clip})`}>
            {sc ? (
              <path data-mark="ons" data-scrub-path="act" className="p2-mo-line p2-mo-act is-on" d={dPath(g1.act)} />
            ) : (
              <Tween data-mark="ons" className={`p2-mo-line p2-mo-act${k < 2 ? ' is-on' : ''}`} morph={{ d: dPath(g.act) }} />
            )}
            {(sc ? g1 : g).act.map(([x, y], i) => (
              <g key={`a${ACT[i][0]}`} className={`p2-mo-move${k < 2 || sc ? ' is-on' : ''}`} data-scrub-pt={sc ? `${x},${y},${g2.act[i][0]},${g2.act[i][1]}` : undefined} data-tx={`translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`} style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` }}>
                <circle r={2.8} className={`p2-mo-dot${PARTIAL && PARTIAL.x === ACT[i][0] ? ' is-open' : ''}`} />
              </g>
            ))}
            {sc ? (
              <path data-mark="obr" data-scrub-path="obr" className="p2-mo-line p2-mo-obr is-on" d={dPath(g1.obr)} />
            ) : (
              <Tween data-mark="obr" className={`p2-mo-line p2-mo-obr${k >= 1 ? ' is-on' : ''}${k >= 2 ? ' is-zero' : ''}`} morph={{ d: dPath(g.obr) }} />
            )}
            {OBR.map(([x], i) => {
              const gx = sc ? g1 : g;
              const j = YEARS.indexOf(x);
              const p = j >= 0 ? gx.obr[j] : [gx.X(x), gx.zeroY];
              return (
                <g key={`o${x}`} className={`p2-mo-move${k === 1 || sc ? ' is-on' : ''}`} data-scrub-pt={sc && j >= 0 ? `${p[0]},${p[1]},${g2.obr[j][0]},${g2.obr[j][1]}` : undefined} data-scrub={sc && j < 0 ? 'out2' : undefined} data-tx={`translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`} style={{ transform: `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)` }}>
                  <circle r={2.8} className="p2-mo-dot is-open" data-i={i} />
                </g>
              );
            })}
            {/* the other scenarios: they draw along their own path (state 3
                for the UK ones, state 4 for Korinek et al., after the rescale) */}
            {lines
              .filter((l) => l.id !== sid)
              .map((l) => {
                // from the surprise year on (form (b)), the same point count in every state
                const d = pathOf(YEARS.map((_, i) => [gG.X(YEARS[from0(i)]), gG.Yd(l.ys[from0(i)])]));
                const on = s >= from(l.id);
                return (
                  <Tween
                    key={l.id}
                    pathLength={1}
                    className={`p2-mo-scen${on ? ' is-on' : ''}${l.id === 'korinek' && resc && l.id !== pinned ? ' is-late' : ''}${l.id === pinned ? ' is-pinned' : ''}`}
                    data-scen={l.id}
                    data-mark={`scen-${l.id}`}
                    morph={{ d }}
                  />
                );
              })}
            {sc && ys ? (
              <path className="p2-mo-line p2-mo-gap is-on" data-scrub-path="gap" data-scen={sid} data-mark={`scen-${sid}`} d={dPath(g1.gap)} style={{ stroke: ARM_COLOR.tfp }} />
            ) : (
              <Tween
                className={`p2-mo-line p2-mo-gap${k >= 2 && ys ? ' is-on' : ''}`}
                data-scen={sid}
                data-mark={`scen-${sid}`}
                morph={{ d: dPath(g.gap) }}
                style={{ stroke: ARM_COLOR.tfp }}
              />
            )}
          </g>
          {/* break marks where the outturn leaves the frame (states 0-1) */}
          {(sc ? g1 : g).breaks.map((b) => (
            <g key={b.key} className={`p2-mo-move${k < 2 || sc ? ' is-on' : ''}`} data-scrub={sc ? 'out2' : undefined} style={{ transform: `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)` }}>
              <path d="M-6,2.5L0,-2.5M-1,2.5L5,-2.5" className="p2-mo-break-gap" />
              <path d="M-6,2.5L0,-2.5M-1,2.5L5,-2.5" className="p2-mo-break" />
            </g>
          ))}
          {/* off-scale years (states 0-1): named, not valued */}
          <g className={`p2-mo-fade${k < 2 || sc ? ' is-on' : ''}`} data-scrub={sc ? 'out2' : undefined}>
            {(sc ? g1 : gOff).off.map((o) => {
              const n = offNotePlace((sc ? g1 : gOff).act, o, sz.tick);
              return (
                <text key={o.year} data-axis="" x={n.x} y={n.y} textAnchor={n.anchor} className="p2-mo-off">
                  {o.year} {o.up ? '↑' : '↓'}
                </text>
              );
            })}
          </g>
          {/* direct labels */}
          <g className={`p2-mo-fade${s === 0 ? ' is-on' : ''}`}>
            <text x={g0.act[g0.act.length - 1]?.[0] - 4} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
              ONS outturn
            </text>
          </g>
          <g className={`p2-mo-fade${s === 1 ? ' is-on' : ''}`} data-scrub={sc ? 'out' : undefined}>
            <text x={PX1} y={PY1 - 22} textAnchor="end" className="p2-mo-label">
              OBR forecast
            </text>
          </g>
          {placed.map((p) => (
            <g
              key={p.key}
              className={`p2-mo-end${p.on ? ' is-on' : ''}${p.key === 'korinek' && resc && !p.pinned ? ' is-late' : ''}${p.pinned ? ' is-pinned' : ''}`}
              data-scrub={sc && p.on ? 'in' : undefined}
              style={{ transform: `translate(${PX1G + 6}px, ${p.t.toFixed(1)}px)` }}
            >
              {/* a label pushed off its line's end (labels crowd at the
                  foot: UK central, UK low and the baseline) points back to
                  it, so "UK low" never reads as the end of UK central */}
              {Math.abs(gG.Yd(p.v) - (p.t + lh * 0.45 + (p.pad ?? 0))) > 4 ? (
                <path
                  className="p2-end-leader"
                  d={`M-5,${(gG.Yd(p.v) - p.t).toFixed(1)} L-1,${(lh * 0.45 + (p.pad ?? 0)).toFixed(1)}`}
                  style={{ stroke: p.color }}
                  aria-hidden="true"
                />
              ) : null}
              <text className={`p2-end-label${p.zero ? ' is-zero' : ''}`} y={lh * 0.7 + (p.pad ?? 0)} style={{ fill: p.color }}>
                {p.lines.map((l, i) => (
                  <tspan key={l} x={0} dy={i ? lh - (lh0 === LH ? 2 : 4) : 0} className={p.sub && l === p.sub ? 'p2-end-sub' : undefined} data-axis={p.sub && l === p.sub ? '' : undefined}>
                    {/* a trailing space between lines, for a screen reader
                        (each line has its own x, so nothing moves) */}
                    {i < p.lines.length - 1 ? `${l} ` : l}
                  </tspan>
                ))}
              </text>
            </g>
          ))}
          {/* the headline year on the chosen line: a ring, no value */}
          {ring ? (
            <g className={`p2-mo-ring${s >= 2 ? ' is-on' : ''}`} data-scrub={sc ? 'in' : undefined} style={{ transform: `translate(${ring[0].toFixed(1)}px, ${ring[1].toFixed(1)}px)` }}>
              <circle r={5.5} />
            </g>
          ) : null}
          {/* the switch of unit is said by the step's own sentence and by the
              y axis title handing over (item 30: no boxed callout) */}
          {/* the x axis title in the gap states only: in the growth states the
              last year sits on the plot's right edge, where it ran into it */}
          <g className={`p2-mo-fade${s >= 2 ? ' is-on' : ''}`} data-scrub={sc ? 'in' : undefined}>
            <text x={W - 4} y={H - 8} textAnchor="end" className="p2-axis-x-svg" data-axis-title={s >= 2 ? 'x' : undefined}>
              Year
            </text>
          </g>
          {/* the y axis's title: growth (states 0-1), gap (states 2-4) */}
          <text x={4} y={11} className={`p2-panel-name p2-mo-fade${s < 2 ? ' is-on' : ''}`} data-scrub={sc ? 'out' : undefined} data-axis-title={s < 2 ? 'y' : undefined} aria-hidden={s < 2 ? undefined : 'true'}>
            Real GDP growth, % a year
          </text>
          <text x={4} y={11} className={`p2-panel-name p2-mo-fade${s >= 2 ? ' is-on' : ''}${s === 2 ? ' is-new' : ''}`} data-scrub={sc ? 'in' : undefined} data-axis-title={s >= 2 ? 'y' : undefined} aria-hidden={s >= 2 ? undefined : 'true'}>
            Gap against the OBR’s central forecast path, %
          </text>
        </svg>
      </div>
    </figure>
  );
}
