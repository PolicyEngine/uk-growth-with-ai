'use client';

import { useId, useState } from 'react';
import { DrawPath } from '@/components/story/primitives.jsx';
import { useInView } from '@/components/story/motion.js';
import { YEARS, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR, CENTRAL, result } from '@/tabs/ai/surprise.js';
import D from '@/data/cohorts2028.json';
import { NavLink } from '@/lib/nav.jsx';
import { COHORT_URL, COHORT_COMMIT_TEXT, A, SRC } from './sources.jsx';
import { W, H, scales, monotonePath, tickText, Figure, Tx } from './frame.jsx';

// Part 2's line charts: shapes only, no value labels and no tooltips. Each
// takes the active `state` and draws everything that state needs, so a
// reader landing on any step sees a complete picture. The y range is fixed
// across states, so lines do not rescale as they arrive.

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
      unit="UK central, main arm, central closure, debt-neutral transfers (a model fiscal rule). Lifetime gain as a consumption-equivalent change, %, by birth year"
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
          Lifetime gain, % of consumption and bequests
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
