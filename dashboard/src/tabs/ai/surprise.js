// Accessors over surprise2028.json, built by
// analysis/surprise/build_dashboard_data.py from the 2028-surprise solves.
// Every gap is against the no-shock restart (continuation) of the same
// closure. A combination that has not been solved yet returns null, and
// every cell and series goes through gap()/fmt() so a pending one cannot
// break the page.
import S from '@/lib/activeData.js';
import { VERSION_COLOR, VERSION_TEXT_COLOR, VERSION_LIGHT } from '@/lib/versionColors.js';

export { S };

export const YEARS = S.years; // 2026-2036
export const HEADLINE_YEAR = S.headline_year; // 2031
export const LATE_YEAR = S.late_year; // 2036
export const SURPRISE_YEAR = S.surprise_year; // 2028
export const WINDOW_YEARS = YEARS.filter((y) => y >= S.window[0] && y <= S.window[1]); // 2027-2031
export const FIRST_YEAR = WINDOW_YEARS[0];
export const CLOSURES = ['zk0.1', 'zk0']; // central, no-foreign-capital bound
export const CENTRAL = 'zk0.1';
export const BOUND = 'zk0';
export const ZETA = { 'zk0.1': S.closures['zk0.1'].zeta_K, zk0: S.closures.zk0.zeta_K };
// Korinek et al. ran three US scenarios; this is the 'substantial' one
// (Table 3, p.31), a US case used as the upper case. One name everywhere:
// KORINEK_NAME in full, KORINEK_SHORT where space is tight (end labels,
// chips). The data file's label is overridden here, not edited.
export const KORINEK_NAME = 'Korinek et al., substantial (US)';
export const KORINEK_SHORT = 'Korinek, substantial (US)';
export const SCENARIOS = S.scenarios.map((s) => (s.id === 'korinek' ? { ...s, label: KORINEK_NAME, short: KORINEK_SHORT } : s));
export const scenarioById = (sid) => SCENARIOS.find((s) => s.id === sid);
// The one name of each scenario (UK low, UK central, UK high, Korinek et
// al., substantial (US)).
export const SCEN_NAME = Object.fromEntries(SCENARIOS.map((s) => [s.id, s.label]));
// The upper case where it is defined (paper, methodology: "Upper case:
// Korinek et al., US 'substantial'").
export const KORINEK_FULL = KORINEK_NAME;
// [{id, label, short}], in display order: 'tfp' automation + productivity
// (the main arm), 'tz' automation with technology unchanged (fixed-input Z),
// 'ss' the OBR-style stress test that holds 2031 GDP at the forecast path.
export const ARMS = S.arms;
// Teal (--series-1) is the gain colour, so no arm uses it.
export const ARM_COLOR = VERSION_COLOR;
// The stress test is drawn lighter: a bound, not a forecast.
// End labels and figures in text: the darker variant that meets 4.5:1 on white
export const ARM_TEXT_COLOR = VERSION_TEXT_COLOR;
export const ARM_LIGHT = VERSION_LIGHT;
export const armById = (id) => ARMS.find((a) => a.id === id);
export const CLOSURE_LABEL = { 'zk0.1': 'some foreign capital', zk0: 'no foreign capital' };

export const result = (sid, arm, closure) => S.results[sid]?.[arm]?.[closure] ?? { status: 'pending' };
export const isDone = (sid, arm, closure) => result(sid, arm, closure).status === 'done';

// A spending-rule variant (S.rules, e.g. 'debt_neutral'): the same record
// shape as result(), kept apart from the default-rule results. Only the
// scenarios listed in S.rules[rule].scenarios have solves.
export const ruleResult = (rule, sid, arm, closure) =>
  S.rules?.[rule]?.results?.[sid]?.[arm]?.[closure] ?? { status: 'pending' };
export const ruleScenarios = (rule) => S.rules?.[rule]?.scenarios ?? [];

// The fiscal-rule ids of the pickers (labels.js RULES) against the data
// file's keys. 'common' is the default of every solve (S.results).
export const RULE_KEY = { dn: 'debt_neutral', fixed: 'fixed_spending' };
// The record for a scenario, arm and closure under a fiscal rule.
export const resultAt = (sid, arm, closure, rule = 'common') =>
  RULE_KEY[rule] ? ruleResult(RULE_KEY[rule], sid, arm, closure) : result(sid, arm, closure);
// Is the scenario solved under the rule (any arm or closure)?
export const ruleSolved = (rule, sid) => !RULE_KEY[rule] || ruleScenarios(RULE_KEY[rule]).includes(sid);
// The scenarios a rule is solved for, in display order.
export const solvedUnder = (rule) => SCENARIOS.filter((s) => ruleSolved(rule, s.id));

// Gap of variable v in a calendar year, or null when pending.
export function gap(sid, arm, closure, v, year = HEADLINE_YEAR, rule = 'common') {
  const r = resultAt(sid, arm, closure, rule);
  if (r.status !== 'done') return null;
  const x = r.gaps[v]?.[YEARS.indexOf(year)];
  return typeof x === 'number' ? x : null;
}
// The 2027-2031 path, or null when pending.
export function path(sid, arm, closure, v, rule = 'common') {
  const r = resultAt(sid, arm, closure, rule);
  if (r.status !== 'done') return null;
  return WINDOW_YEARS.map((y) => r.gaps[v][YEARS.indexOf(y)]);
}

// A value that rounds to zero prints unsigned; the minus sign is U+2212.
export const signed = (x, dp = 1) =>
  Math.abs(x) < 0.5 * 10 ** -dp ? (0).toFixed(dp) : `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(dp)}`;
// Does pay per unit of labour still rise every year from the surprise to
// the headline year (pay_growth_pct, written by the data build from the
// solve's own pay series, re-trended)? null when the field is missing.
export function payRises(sid, arm, closure) {
  const r = result(sid, arm, closure);
  const g = r.status === 'done' ? r.pay_growth_pct : null;
  if (!Array.isArray(g)) return null;
  const win = g.filter((_, i) => YEARS[i] >= SURPRISE_YEAR && YEARS[i] <= HEADLINE_YEAR);
  return win.length > 0 && win.every((x) => typeof x === 'number' && x > 0);
}
// The pay figure's one line, shared by the hero and part 2's ledger: below
// the path with pay still rising every year, "slower growth, not a cut";
// below it otherwise, the plain side; on or above it, what the figure is.
export function payLine(sid, closure, w = gap(sid, 'tfp', closure, 'w')) {
  if (w == null) return null;
  if (w < -0.005) return payRises(sid, 'tfp', closure) ? 'slower growth, not a cut' : 'below the forecast path';
  return 'pay for the same work';
}

export const fmt = (x, dp = 2, unit = '%') => (x == null ? 'pending' : `${signed(x, dp)}${unit}`);

export const DONE = S.solves_done;
export const TOTAL = S.solves_total;

// Output at fixed inputs of an arm relative to "technology unchanged" (the
// fixed-input Z), %, at a closure: Z_arm / Z_tz - 1. Negative means the arm
// needs a technology cut. null when either solve is pending.
export function fixedInputVsTz(sid, arm, closure) {
  const a = result(sid, arm, closure);
  const t = result(sid, 'tz', closure);
  if (a.status !== 'done' || t.status !== 'done') return null;
  return (a.Z_terminal / t.Z_terminal - 1) * 100;
}
