// Caveats from the economics review of round 1 (16 Nov 2026), each computed
// from surprise2028.json so it follows the pickers and a rerun that moves a
// sign changes the words. Explanations only: no model output is changed.
// Each function returns plain values; the cards word them as short items.
import { S, YEARS, HEADLINE_YEAR, SURPRISE_YEAR, LATE_YEAR, SCENARIOS, ARMS, CENTRAL, BOUND, resultAt } from '@/tabs/ai/surprise.js';
import { side } from '@/tabs/ai/lines.js';

const SENS = 'zk0.5';
const at = (r, v, y = HEADLINE_YEAR) => (r?.status === 'done' ? r.gaps[v]?.[YEARS.indexOf(y)] ?? null : null);
const sensCell = (sid, arm) => S.sensitivity?.[SENS]?.results?.[sid]?.[arm] ?? null;

// The project's 2028 investment flag: an investment gap above the old
// 2026-start design's +17% (analysis/surprise/expectations.json
// i_jump_flag_pct; docs/surprise_2028.md, "The sanity gate"). Flagged and
// reported, never failed. docs/redesign/real-world-plausibility.md rates a
// first-year rise of +15% or more as implausible: larger than any year on
// record since 1948.
export const I_FLAG_PCT = 17;

// The wage rate's side of the path in the headline year, main arm, common
// rule, at each solved closure from the least open to the most: ζK 0, 0.1
// and the 0.5 sensitivity. [{ zeta, x, side }].
export function wageByClosure(sid) {
  const cells = [
    { zeta: S.closures[BOUND].zeta_K, r: resultAt(sid, 'tfp', BOUND, 'common') },
    { zeta: S.closures[CENTRAL].zeta_K, r: resultAt(sid, 'tfp', CENTRAL, 'common') },
    S.sensitivity?.[SENS] ? { zeta: S.sensitivity[SENS].zeta_K, r: sensCell(sid, 'tfp') } : null,
  ].filter(Boolean);
  return cells.map((c) => ({ zeta: c.zeta, x: at(c.r, 'w') })).filter((c) => c.x != null).map((c) => ({ ...c, side: side(c.x) }));
}

// The same in words, one short line per run of equal sides, e.g. ["Wage
// rate below the path at ζK 0 and 0.1", "Above it at ζK 0.5: the sign
// depends on the closure"]; null when every closure gives one side.
export function wageClosureLines(sid) {
  const xs = wageByClosure(sid);
  if (xs.length < 2 || new Set(xs.map((c) => c.side)).size === 1) return null;
  const groups = [];
  for (const c of xs) {
    const last = groups[groups.length - 1];
    if (last && last.side === c.side) last.z.push(c.zeta);
    else groups.push({ side: c.side, z: [c.zeta] });
  }
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  return groups.map((g, i) =>
    i === 0
      ? `Wage rate ${g.side === 'on' ? 'on the path' : `${g.side} the path`} at ζK ${g.z.join(' and ')}`
      : `${cap(g.side === 'on' ? 'on it' : `${g.side} it`)} at ζK ${g.z.join(' and ')}${i === groups.length - 1 ? ': the sign depends on the closure' : ''}`,
  );
}

// Every cell (scenario, arm, closure, including the sensitivity) whose
// investment gap in the shock year is above the flag, largest first.
export function investmentFlags() {
  const out = [];
  const y = SURPRISE_YEAR;
  for (const s of SCENARIOS)
    for (const a of ARMS) {
      for (const cl of [BOUND, CENTRAL]) {
        const x = at(resultAt(s.id, a.id, cl, 'common'), 'I', y);
        if (x != null && x > I_FLAG_PCT) out.push({ sid: s.id, arm: a.id, cl, zeta: S.closures[cl].zeta_K, x });
      }
      const x = at(sensCell(s.id, a.id), 'I', y);
      if (x != null && x > I_FLAG_PCT) out.push({ sid: s.id, arm: a.id, cl: SENS, zeta: S.sensitivity[SENS].zeta_K, x });
    }
  return out.sort((p, q) => q.x - p.x);
}
export const isFlagged = (sid, arm, cl) => investmentFlags().some((f) => f.sid === sid && f.arm === arm && f.cl === cl);

// The last year of an unbroken run below the path from the shock year
// (consumption, main arm), or null if it starts on or above the path.
export function belowThrough(sid, cl, v = 'C', rule = 'common') {
  const r = resultAt(sid, 'tfp', cl, rule);
  if (r.status !== 'done') return null;
  let last = null;
  for (const y of YEARS.filter((t) => t >= SURPRISE_YEAR)) {
    if (r.gaps[v][YEARS.indexOf(y)] < 0) last = y;
    else break;
  }
  return last;
}

// Is the shock year's fall in debt/GDP the denominator alone? The debt stock
// is set before the shock (docs/surprise_2028.md: B, D carry over from
// 2027), so with debt unchanged the ratio falls by the path's ratio times
// GDP's rise: ref × (1/(1+ΔY) − 1). True when the model's gap is a fall and
// equals that within 0.02pp.
export function debtDipIsDenominator(sid, cl, rule = 'common') {
  const r = resultAt(sid, 'tfp', cl, rule);
  const ref = S.closures[cl]?.reference_levels?.debt_gdp;
  if (r.status !== 'done' || !ref) return false;
  const i = YEARS.indexOf(SURPRISE_YEAR);
  const dip = r.gaps.debt_gdp_pp[i];
  const denom = ref[i] * (1 / (1 + r.gaps.Y[i] / 100) - 1);
  return dip < -0.005 && Math.abs(dip - denom) < 0.02;
}

// Debt/GDP's side of the path in the late year, main arm, for the closure:
// under each solved fiscal rule (common, fixed spending) and, for the
// common rule, at the OBR's repricing speed. Debt-neutral holds it on the
// path by construction, so it is left out. [{ key, side }].
export function debtSidesByRule(sid, cl) {
  const out = [];
  const common = resultAt(sid, 'tfp', cl, 'common');
  const c = at(common, 'debt_gdp_pp', LATE_YEAR);
  if (c != null) out.push({ key: 'common', side: side(c) });
  const o = common.status === 'done' ? common.debt_gdp_pp_obr_repricing_late : null;
  if (typeof o === 'number') out.push({ key: 'obr', side: side(o) });
  const f = at(resultAt(sid, 'tfp', cl, 'fixed'), 'debt_gdp_pp', LATE_YEAR);
  if (f != null) out.push({ key: 'fixed', side: side(f) });
  return out;
}
