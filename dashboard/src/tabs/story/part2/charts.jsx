'use client';

import { useId, useState } from 'react';
import { DrawPath, FadeG } from '@/components/story/primitives.jsx';
import { useInView } from '@/components/story/motion.js';
import {
  YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, SCEN_NAME, ARMS, ARM_COLOR, ARM_TEXT_COLOR, CENTRAL, BOUND, result, fmt,
} from '@/tabs/ai/surprise.js';
import { closuresFor } from '@/tabs/ai/lines.js';
import D from '@/data/cohorts2028.json';
import { NavLink } from '@/lib/nav.jsx';
import { Crosshair, linear } from '@/components/story/chart/index.js';
import { ModelSource, COHORT_URL, COHORT_COMMIT_TEXT, A, SRC, OG_DEFAULTS } from './sources.jsx';
import { W, H, scales, linePath, monotonePath, niceTicks, tickText, placeLabels, Figure, GUTTER, Tx } from './frame.jsx';

// Part 2's line charts: shapes only, no value labels and no tooltips. Each
// takes the active `state` and draws everything that state needs, so a
// reader landing on any step sees a complete picture. The y range is fixed
// across states, so lines do not rescale as they arrive.
//
// DrawPath draws through stroke-dasharray, so a dashed line (closed capital
// beside the central closure) fades in with FadeG instead.

const CL_WORDS = { [CENTRAL]: 'central closure', [BOUND]: 'closed capital' };
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

// Scene 2B: the three arms of one scenario, GDP and public debt, on one
// shared x axis, at the closure(s) chosen in the header (closed capital
// dashed with Both).
//   0-2  the GDP panel at full height; arm i drawn from state i;
//   3    the GDP panel compresses to the top half (a view change: the
//        lines' group scales, strokes do not) and the debt panel draws
//        the main arm;
//   4    the other two arms draw in the debt panel.
// Each panel has its own unit and zero line; the zero lines are labelled
// in the gutter with the arms.
const PH = 284; // the pair's height, in viewBox units
const PM = { l: 36, r: GUTTER, t: 18, b: 26 };
const PT = PM.t;
const PB = PH - PM.b;
const PGAP = 26; // between the panels: room for the debt panel's name
const SPLIT_B = PT + (PB - PT - PGAP) / 2; // GDP panel's bottom when split
const DT = SPLIT_B + PGAP; // debt panel's top
const ARM_LINES = { tfp: ['Automation +', 'productivity'], tz: ['Technology', 'unchanged'], ss: ['Stress test'] };
const PLH = 12; // end-label line height
// Label blocks are placed as if each line were PLH + 3 tall: at 900px and
// below the labels are 13.5 units, so blocks packed at PLH would touch.
const PLH_PLACE = PLH + 3;

function panelScale(values, top, bot) {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(0, ...finite);
  let hi = Math.max(0, ...finite);
  const pad = (hi - lo || 1) * 0.08;
  lo -= pad;
  hi += pad;
  const { ticks, step } = niceTicks(lo, hi, 3);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  return { Y: (v) => bot - ((v - lo) / (hi - lo)) * (bot - top), ticks, step, lo, hi };
}

export function ArmsPair({ state, sid, closure, label }) {
  const [ref, seen] = useInView();
  const cls = closuresFor(closure);
  const both = closure === 'both';
  const s = Math.max(0, Math.min(4, state));
  const split = s >= 3;
  const mk = (v) =>
    ARMS.flatMap((a, i) => cls.map((cl) => ({ key: `${v}-${a.id}-${cl}`, arm: a.id, i, cl, ys: series(sid, a.id, cl, v) })).filter((l) => l.ys));
  const gdp = mk('Y');
  const debt = mk('debt_gdp_pp');
  const x0 = YEARS[0];
  const x1 = YEARS[YEARS.length - 1];
  const X = (x) => PM.l + ((x - x0) / (x1 - x0)) * (W - PM.l - PM.r);
  // GDP: drawn on its full-height scale; split, its group scales by k
  const gFull = panelScale(gdp.flatMap((l) => l.ys), PT, PB);
  const gSplit = panelScale(gdp.flatMap((l) => l.ys), PT, SPLIT_B);
  const gNow = split ? gSplit : gFull;
  const k = (SPLIT_B - PT) / (PB - PT);
  const gT = split ? `translate(0px, ${PT}px) scale(1, ${k.toFixed(4)}) translate(0px, ${-PT}px)` : 'none';
  const dS = panelScale(debt.flatMap((l) => l.ys), DT, PB);
  const gOn = (i) => seen && s >= i;
  const dOn = (i) => seen && s >= (i === 0 ? 3 : 4);
  const ticksG = (sc, Ynow) =>
    sc.ticks.map((v) => ({ v, y: Ynow(v), t: tickText(v, sc.step) }));
  const ends = (lines, Y, top, bot, on) =>
    placeLabels(
      [
        { key: 'zero', v: 0, lines: ['OBR-central', 'path = 0'], color: 'var(--pe-gray-600)', zero: true, on: on(0) },
        ...ARMS.map((a, i) => {
          const l = lines.find((x) => x.arm === a.id && x.cl === cls[0]);
          return { key: a.id, v: l?.ys[l.ys.length - 1], lines: ARM_LINES[a.id] ?? [a.short], color: ARM_TEXT_COLOR[a.id], on: on(i) };
        }),
      ],
      Y,
      top,
      bot,
      PLH_PLACE,
    );
  const gEnds = ends(gdp, gNow.Y, PT, split ? SPLIT_B : PB, gOn);
  const dEnds = ends(debt, dS.Y, DT, PB, dOn);
  const band = [X(SURPRISE_YEAR), X(HEADLINE_YEAR)];
  // The shared crosshair: one year across both panels. Crosshair takes one
  // y scale, so each series passes its points already in drawing units (in
  // its own panel, at this state's scale) and formats the value it stands
  // for: GDP as on Explore (% gap, two decimals), debt in points (one).
  // Rows follow what is drawn: the GDP arms in states 0-2; then the main
  // arm's GDP and the debt arms drawn. The primary closure only (the unit
  // foot says which).
  const xScale = linear([x0, x1], [X(x0), X(x1)]);
  const asRow = (l, Y, v) => {
    const px = l.ys.map((y) => Number(Y(y).toFixed(3)));
    const back = new Map(px.map((p, i) => [p, l.ys[i]]));
    const a = ARMS.find((x) => x.id === l.arm);
    return {
      key: `${v}-${l.arm}`,
      name: `${v === 'Y' ? 'GDP' : 'Debt'}, ${a?.short ?? l.arm}`,
      icon: v === 'Y' ? 'gdp' : 'debt',
      color: ARM_COLOR[l.arm],
      text: ARM_TEXT_COLOR[l.arm],
      ys: px,
      format: (p) => (v === 'Y' ? fmt(back.get(p)) : fmt(back.get(p), 1, ' pp')),
    };
  };
  const prim = (lines) => lines.filter((l) => l.cl === cls[0]);
  const crossSeries = split
    ? [...prim(gdp).filter((l) => l.i === 0).map((l) => asRow(l, gSplit.Y, 'Y')), ...prim(debt).filter((l) => dOn(l.i)).map((l) => asRow(l, dS.Y, 'D'))]
    : prim(gdp).filter((l) => gOn(l.i)).map((l) => asRow(l, gFull.Y, 'Y'));
  // vs: non-scaling strokes, for the GDP lines while their group is
  // compressed. A drawn line's dash (DrawPath) is then dropped: dashing is
  // measured in screen space under non-scaling strokes, which would cut the
  // line. Every GDP arm is fully drawn by then (states 3 and 4).
  const lineEl = (l, Y, on, delay = 0, vs = false) => {
    const d = linePath(X, Y, YEARS, l.ys);
    const mark = `${l.key.startsWith('Y-') ? 'gdp' : 'debt'}-${l.arm}`;
    const style = { stroke: ARM_COLOR[l.arm], strokeWidth: l.arm === 'tfp' ? 2.5 : 2, opacity: l.arm === 'ss' ? 0.6 : 1 };
    if (both && l.cl === BOUND)
      return (
        <FadeG key={l.key} on={on} delay={on ? delay : 0}>
          <path d={d} data-mark={mark} fill="none" vectorEffect={vs ? 'non-scaling-stroke' : undefined} style={{ ...style, strokeDasharray: '5 4' }} />
        </FadeG>
      );
    return (
      <DrawPath
        key={l.key}
        d={d}
        data-mark={mark}
        on={on}
        className={vs ? 'is-whole' : ''}
        vectorEffect={vs ? 'non-scaling-stroke' : undefined}
        style={{ ...style, transitionDelay: on ? `${delay}ms` : '0ms' }}
      />
    );
  };
  const endEl = (p, prefix) => (
    <g key={`${prefix}${p.key}`} className={`p2-pair-end${p.on ? ' is-on' : ''}`} style={{ transform: `translate(${X(x1) + 6}px, ${p.t.toFixed(1)}px)` }}>
      <text className={`p2-end-label${p.zero ? ' is-zero' : ''}`} y={PLH_PLACE / 2 + PLH * 0.25} style={{ fill: p.color }}>
        {p.lines.map((t, i) => (
          <tspan key={t} x={0} dy={i ? PLH : 0}>
            {t}
          </tspan>
        ))}
      </text>
    </g>
  );
  const closureCtl = (
    <p className="p2-closure-ctl">
      <Tx icon="closure" size={12}>
        Closure
      </Tx>
      {[
        ['central', 'Central'],
        ['closed', 'Closed capital'],
        ['both', 'Both'],
      ].map(([c, t]) => (
        <NavLink key={c} patch={{ closure: c }} className={`p2-closure-opt${closure === c ? ' is-on' : ''}`} aria-current={closure === c ? 'true' : undefined}>
          {t}
        </NavLink>
      ))}
    </p>
  );
  return (
    <Figure
      className="p2-pair"
      title="GDP and public debt in three arms"
      unit={`${SCEN_NAME[sid]}, ${both ? 'central closure solid, closed capital dashed' : CL_WORDS[cls[0]]}. Gaps against the OBR-central path`}
      head={closureCtl}
      xTitle={null}
      source={
        <>
          <ModelSource method="m-arms" />. Central closure: <A href={OG_DEFAULTS}>OG-UK&rsquo;s inherited default</A>, not UK-calibrated
        </>
      }
    >
      <div ref={ref} className="p2-pair-box" data-state={s}>
      <Crosshair
        width={W}
        height={PH}
        x={xScale}
        y={(v) => v}
        xs={YEARS}
        top={PT}
        bottom={PB}
        series={crossSeries}
        unit={`${CL_WORDS[cls[0]]}; gaps against the OBR-central path`}
        label={label}
      >
        {/* the shock period, in both panels (the GDP panel's compresses with it) */}
        <g className="p2-pair-gdp" style={{ transform: gT }}>
          <rect x={band[0]} y={PT} width={band[1] - band[0]} height={PB - PT} className="p2-band-shock" />
        </g>
        <text data-axis="" x={band[0] + 4} y={PT + 9} className="p2-band-note">
          AI shock
        </text>
        <g className={`p2-pair-debt${split ? ' is-on' : ''}`}>
          <rect x={band[0]} y={DT} width={band[1] - band[0]} height={PB - DT} className="p2-band-shock" />
        </g>
        {/* panel names (their units) */}
        <text x={PM.l - 30} y={PT - 7} className="p2-panel-name" data-axis-title="y">
          GDP: gap against the OBR-central path, %
        </text>
        <text x={PM.l - 30} y={DT - 9} className={`p2-panel-name p2-pair-debt${split ? ' is-on' : ''}`} data-axis-title="y">
          Public debt: gap, percentage points of GDP
        </text>
        {/* GDP ticks and grid slide with the panel */}
        {ticksG(gFull, gNow.Y).map((t) => (
          <g key={`g${t.v}`} className="p2-pair-tick" style={{ transform: `translate(0px, ${t.y.toFixed(1)}px)` }}>
            <line x1={PM.l} x2={X(x1)} y1={0} y2={0} className={Math.abs(t.v) < 1e-9 ? 'p2-zero' : 'p2-grid'} />
            <text data-axis="" x={PM.l - 6} y={0} dy="0.35em" textAnchor="end" className="p2-tick">
              {t.t}
            </text>
          </g>
        ))}
        <g className="p2-pair-gdp" style={{ transform: gT }}>
          {[...gdp].reverse().map((l) => lineEl(l, gFull.Y, gOn(l.i), 0, split))}
        </g>
        {/* the debt panel: its axis fades in after the compress, then lines draw */}
        <g className={`p2-pair-debt${split ? ' is-on' : ''}`}>
          {ticksG(dS, dS.Y).map((t) => (
            <g key={`d${t.v}`}>
              <line x1={PM.l} x2={X(x1)} y1={t.y} y2={t.y} className={Math.abs(t.v) < 1e-9 ? 'p2-zero' : 'p2-grid'} />
              <text data-axis="" x={PM.l - 6} y={t.y} dy="0.35em" textAnchor="end" className="p2-tick">
                {t.t}
              </text>
            </g>
          ))}
        </g>
        {[...debt].reverse().map((l) => lineEl(l, dS.Y, dOn(l.i), l.i === 0 ? 650 : 0))}
        {/* one x axis for both panels */}
        {[YEARS[0], SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR].map((x) => (
          <text data-axis="" key={`x${x}`} x={X(x)} y={PH - 8} textAnchor="middle" className="p2-tick">
            {x}
          </text>
        ))}
        <text x={W - 4} y={PH - 8} textAnchor="end" className="p2-axis-x-svg" data-axis-title="x">
          Year
        </text>
        {gEnds.map((p) => endEl(p, 'g'))}
        {dEnds.map((p) => endEl(p, 'd'))}
      </Crosshair>
      </div>
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

// True when, under debt-neutral transfers, the cohorts entering in the
// first five years after the shock sit below the youngest adult cohort
// while under the common fiscal rule they do not; the story then says the
// dip appears under one rule and not the other (Who gains has both).
export function entryDip() {
  const xs = D.closures[CENTRAL].birth_year;
  const i0 = xs.indexOf(LAST_ALIVE);
  const rules = D.closures[CENTRAL].rules;
  if (i0 < 0 || !rules.common) return false;
  const dips = (ys) => Math.min(...ys.slice(i0 + 1, i0 + 6)) < ys[i0];
  return dips(rules[WELFARE_RULE].tfp.cev_all) && !dips(rules.common.tfp.cev_all);
}

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

// Scene 2W. The curve is monotone (plan section 4: allowed here only); the
// cohorts that enter after the shock sit under a band, not behind a marker
// line. "Born in" marks one cohort's point on the curve, as a read-out of
// the drawing only: no value is printed.
export function WelfareShape({ state }) {
  const [ref, seen] = useInView();
  const [born, setBorn] = useState('');
  const bornId = `p2-born-in${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const xs = D.closures[CENTRAL].birth_year;
  const ys = welfareCell().cev_all;
  const sc = scales(xs, ys);
  const adults = ys.map((v, i) => (xs[i] <= LAST_ALIVE ? v : NaN));
  const later = ys.map((v, i) => (xs[i] >= LAST_ALIVE ? v : NaN));
  const ticks = xs.filter((x) => x % 20 === 0);
  const bx = sc.X(LAST_ALIVE + 0.5);
  const xr = sc.X(sc.x1);
  const yTop = 16;
  const yBot = H - 28;
  const by = Number(born);
  const bi = Number.isInteger(by) ? xs.indexOf(by) : -1;
  const pick = bi >= 0 && (state >= 1 || by <= LAST_ALIVE) ? [sc.X(by), sc.Y(ys[bi])] : null;
  return (
    <Figure
      icon="age"
      title="Welfare change by birth year"
      unit="UK central, main arm, central closure, debt-neutral transfers (a model fiscal rule). Consumption-equivalent change, %, by birth year"
      xTitle="Birth year"
      source={
        <>
          Source: <A href={SRC.ogUk}>OG-UK</A> (PolicyEngine), cohort welfare by <A href={COHORT_URL}>cohort_welfare.py</A> at {COHORT_COMMIT_TEXT} ·{' '}
          <NavLink tab="method" sub="how" anchor="m-generations">
            Method
          </NavLink>
        </>
      }
      head={
        <p className="p2-born">
          <Tx icon="age" size={12}>
            <label htmlFor={bornId}>Mark a birth year</label>
          </Tx>
          <input
            id={bornId}
            type="number"
            inputMode="numeric"
            min={xs[0]}
            max={state >= 1 ? xs[xs.length - 1] : LAST_ALIVE}
            placeholder="Year"
            value={born}
            onChange={(e) => setBorn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBorn('');
            }}
          />
          <span className="visually-hidden" aria-live="polite">
            {pick ? 'That cohort is marked on the curve.' : ''}
          </span>
        </p>
      }
    >
      <svg
        ref={ref}
        className="story-svg p2-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Line chart, shape only: welfare change by birth year for adults alive in ${D.shock_year}${state >= 1 ? ' and, in a band, the cohorts that enter later' : ''}. ${
          ys.every((v) => v > 0) ? 'Every cohort is above zero as modelled. ' : ''
        }Among adults the change is largest ${peakAge() >= 55 ? 'around retirement age' : 'in middle age'}, and small for both the very oldest and the youngest${
          state >= 1 ? `; it is lowest for cohorts entering just after ${D.shock_year}, then higher` : ''
        }.`}
      >
        <g className={`p2-who-band${state >= 1 ? ' is-on' : ''}`}>
          <rect x={bx} y={yTop} width={Math.max(0, xr - bx)} height={yBot - yTop} className="p2-band-period" />
          <text data-axis="" x={bx + 4} y={yTop + 10} className="p2-band-note">
            Enter later
          </text>
        </g>
        <text x={6} y={9} className="p2-panel-name" data-axis-title="y">
          Consumption-equivalent change, %
        </text>
        <text data-axis="" x={bx - 4} y={yTop + 10} textAnchor="end" className="p2-band-note">
          Adults in {D.shock_year}
        </text>
        {sc.ticks.map((v) => (
          <g key={`y${v}`}>
            <line x1={sc.X(sc.x0)} x2={xr} y1={sc.Y(v)} y2={sc.Y(v)} className={Math.abs(v) < 1e-9 ? 'p2-zero' : 'p2-grid'} />
            <text data-axis="" x={sc.X(sc.x0) - 6} y={sc.Y(v)} dy="0.35em" textAnchor="end" className="p2-tick">
              {tickText(v, sc.step)}
            </text>
          </g>
        ))}
        {ticks.map((x) => (
          <text data-axis="" key={`x${x}`} x={sc.X(x)} y={H - 8} textAnchor="middle" className="p2-tick">
            {x}
          </text>
        ))}
        <text data-axis="" x={xr - 2} y={sc.Y(0) - 4} textAnchor="end" className="p2-band-note">
          No change = 0
        </text>
        <DrawPath data-mark="cohort-adults" d={monotonePath(sc.X, sc.Y, xs, adults)} on={seen} style={{ stroke: 'var(--pe-gray-800)', strokeWidth: 2.5 }} />
        <DrawPath data-mark="cohort-later" d={monotonePath(sc.X, sc.Y, xs, later)} on={seen && state >= 1} style={{ stroke: 'var(--pe-gray-800)', strokeWidth: 2.5 }} />
        {pick ? (
          <g className="p2-born-mark" aria-hidden="true">
            <line x1={pick[0]} x2={pick[0]} y1={yTop} y2={yBot} />
            <circle cx={pick[0]} cy={pick[1]} r={5} />
          </g>
        ) : null}
      </svg>
    </Figure>
  );
}
