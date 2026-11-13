// Accessors over surprise2028.json, built by
// analysis/surprise/build_dashboard_data.py from the 2028-surprise solves.
// Every gap is against the no-shock restart (continuation) of the same
// closure. A combination that has not been solved yet returns null, and
// every cell and series goes through gap()/fmt() so a pending one cannot
// break the page.
import S from '@/data/surprise2028.json';

export { S };

export const YEARS = S.years; // 2026-2036
export const HEADLINE_YEAR = S.headline_year; // 2031
export const LATE_YEAR = S.late_year; // 2036
export const SURPRISE_YEAR = S.surprise_year; // 2028
export const WINDOW_YEARS = YEARS.filter((y) => y >= S.window[0] && y <= S.window[1]); // 2027-2031
export const FIRST_YEAR = WINDOW_YEARS[0];
export const CLOSURES = ['zk0.1', 'zk0']; // central, closed-capital bound
export const CENTRAL = 'zk0.1';
export const BOUND = 'zk0';
export const ZETA = { 'zk0.1': S.closures['zk0.1'].zeta_K, zk0: S.closures.zk0.zeta_K };
export const SCENARIOS = S.scenarios;
export const scenarioById = (sid) => SCENARIOS.find((s) => s.id === sid);
// The one name of each scenario, as the paper's tables print it (UK low, UK
// central, UK high, Korinek et al. (upper)); set in build_dashboard_data.py.
export const SCEN_NAME = Object.fromEntries(SCENARIOS.map((s) => [s.id, s.label]));
// The upper case where it is defined (paper, methodology: "Upper case:
// Korinek et al., US 'substantial'").
export const KORINEK_FULL = 'Korinek et al., US “substantial” (upper)';
// [{id, label, short}], in display order: 'tfp' automation + productivity
// (the main arm), 'tz' automation with technology unchanged (fixed-input Z),
// 'ss' the OBR-style stress test that holds 2031 GDP at the OBR-central path.
export const ARMS = S.arms;
export const ARM_COLOR = { tfp: 'var(--series-1)', tz: 'var(--series-2)', ss: 'var(--series-5)' };
// The stress test is drawn lighter: a bound, not a forecast.
export const ARM_LIGHT = { ss: true };
export const armById = (id) => ARMS.find((a) => a.id === id);
export const CLOSURE_LABEL = { 'zk0.1': 'central closure', zk0: 'closed capital' };

export const result = (sid, arm, closure) => S.results[sid]?.[arm]?.[closure] ?? { status: 'pending' };
export const isDone = (sid, arm, closure) => result(sid, arm, closure).status === 'done';

// A spending-rule variant (S.rules, e.g. 'debt_neutral'): the same record
// shape as result(), kept apart from the default-rule results. Only the
// scenarios listed in S.rules[rule].scenarios have solves.
export const ruleResult = (rule, sid, arm, closure) =>
  S.rules?.[rule]?.results?.[sid]?.[arm]?.[closure] ?? { status: 'pending' };
export const ruleScenarios = (rule) => S.rules?.[rule]?.scenarios ?? [];

// Gap of variable v in a calendar year, or null when pending.
export function gap(sid, arm, closure, v, year = HEADLINE_YEAR) {
  const r = result(sid, arm, closure);
  if (r.status !== 'done') return null;
  const x = r.gaps[v]?.[YEARS.indexOf(year)];
  return typeof x === 'number' ? x : null;
}
// The 2027-2031 path, or null when pending.
export function path(sid, arm, closure, v) {
  const r = result(sid, arm, closure);
  if (r.status !== 'done') return null;
  return WINDOW_YEARS.map((y) => r.gaps[v][YEARS.indexOf(y)]);
}

// A value that rounds to zero prints unsigned; the minus sign is U+2212.
export const signed = (x, dp = 1) =>
  Math.abs(x) < 0.5 * 10 ** -dp ? (0).toFixed(dp) : `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(dp)}`;
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
