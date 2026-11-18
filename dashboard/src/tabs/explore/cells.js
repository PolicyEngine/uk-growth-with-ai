// Every scenario x closure x fiscal rule cell for one arm, in the headline
// year: the data behind Explore > All scenarios (its panels, table and
// downloads). Values come from surprise2028.json through resultAt(); a cell
// that is not solved is { value: null, status: 'pending' }.
import { HEADLINE_YEAR, YEARS, SCENARIOS, CENTRAL, BOUND, CLOSURE_LABEL, resultAt } from '@/tabs/ai/surprise.js';
import { RULES } from '@/lib/labels.js';
import { iconFor } from '@/lib/concepts.js';

export const MEASURES = [
  { v: 'Y', label: 'GDP', title: 'Total output (GDP)', unit: '%', icon: iconFor('gdp'), concept: 'gdp' },
  { v: 'GNI', label: 'GNI', title: 'Income UK residents keep (GNI)', unit: '%', icon: iconFor('gni'), concept: 'gni' },
  { v: 'w', label: 'Pay rate', title: 'Pay rate (wage per unit of labour)', unit: '%', icon: iconFor('pay'), concept: 'pay' },
  { v: 'debt_gdp_pp', label: 'Debt/GDP', title: 'Debt/GDP', unit: 'pp', icon: iconFor('debt'), concept: 'debt' },
];
export const CLS = [CENTRAL, BOUND];
export const ROWS = RULES.flatMap((r) => CLS.map((cl) => ({ rule: r.id, cl, key: `${r.id}|${cl}` })));
export const UK = ['uk_low', 'uk_central', 'uk_high'];

export function cellValue(sid, arm, cl, rule, v) {
  const r = resultAt(sid, arm, cl, rule);
  if (r.status !== 'done') return null;
  const x = r.gaps[v]?.[YEARS.indexOf(HEADLINE_YEAR)];
  return typeof x === 'number' ? x : null;
}

// One row of a panel: each scenario's value (null = pending), the UK range
// when UK low and UK high are both solved, and the names still pending.
export function rowOf(arm, row, v) {
  const vals = Object.fromEntries(SCENARIOS.map((s) => [s.id, cellValue(s.id, arm, row.cl, row.rule, v)]));
  const lo = vals.uk_low;
  const hi = vals.uk_high;
  const band = lo != null && hi != null ? [Math.min(lo, hi), Math.max(lo, hi)] : null;
  const pending = SCENARIOS.filter((s) => vals[s.id] == null).map((s) => s.label);
  return { ...row, vals, band, pending };
}

// A panel's axis: symmetric steps that include zero and every value.
export function axisOf(arm, v) {
  const xs = ROWS.flatMap((row) => Object.values(rowOf(arm, row, v).vals)).filter((x) => x != null);
  const lo = Math.min(0, ...xs);
  const hi = Math.max(0, ...xs);
  const span = Math.max(hi - lo, 0.2);
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5].find((s) => span / s <= 5) ?? 10;
  const min = lo < 0 ? Math.floor((lo - span * 0.04) / step) * step : 0;
  const max = hi > 0 ? Math.ceil((hi + span * 0.04) / step) * step : 0;
  const ticks = [];
  for (let t = min; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
  return { min, max, ticks, at: (x) => (x - min) / (max - min) };
}

export const cellsTable = (arm, armLabel) => ({
  columns: ['Measure', 'Unit', 'Budget assumption', 'Foreign capital', 'Scenario', 'Version', `Gap in ${HEADLINE_YEAR}`, 'Status'],
  rows: MEASURES.flatMap((m) =>
    ROWS.flatMap((row) =>
      SCENARIOS.map((s) => {
        const x = cellValue(s.id, arm, row.cl, row.rule, m.v);
        return [m.label, m.unit === '%' ? '% difference from the OBR’s central forecast path' : 'pp of GDP, difference from the OBR’s central forecast path', RULES.find((r) => r.id === row.rule).label, CLOSURE_LABEL[row.cl], s.label, armLabel, x, x == null ? 'pending' : 'solved'];
      }),
    ),
  ),
});

// Which choice moves a measure most for an arm: the largest spread of its
// headline-year gap across scenarios (common rule, some foreign capital), across
// the two closures (any scenario, common rule) and across the three rules
// (the scenarios solved under every rule, either closure).
export function spreads(arm, v) {
  const span = (xs) => {
    const ys = xs.filter((x) => x != null);
    return ys.length > 1 ? Math.max(...ys) - Math.min(...ys) : 0;
  };
  const ids = SCENARIOS.map((s) => s.id);
  return {
    scenario: span(ids.map((sid) => cellValue(sid, arm, CENTRAL, 'common', v))),
    closure: Math.max(0, ...ids.map((sid) => span(CLS.map((cl) => cellValue(sid, arm, cl, 'common', v))))),
    rule: Math.max(0, ...ids.flatMap((sid) => CLS.map((cl) => span(RULES.map((r) => cellValue(sid, arm, cl, r.id, v)))))),
  };
}
const CHOICE = { scenario: 'the scenario', closure: 'foreign capital', rule: 'the budget assumption' };
export const topChoice = (arm, v) => Object.entries(spreads(arm, v)).sort((a, b) => b[1] - a[1])[0][0];
// "The scenario moves GDP and GNI most; the capital closure, the pay rate;
// the fiscal rule, debt/GDP." Words only.
// A measure that barely moves with any choice (the stress test holds GDP
// on the path by construction) is named as such, not given a driver.
const NEGLIGIBLE = 0.05;
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
// [{ choice: 'scenario' | 'closure' | 'rule' | 'still', measures, text }]:
// one entry per choice that moves a measure most, then the measures that
// barely move with any.
export function drivers(arm) {
  const by = {};
  const still = [];
  for (const m of MEASURES) {
    const name = { w: 'the pay rate', debt_gdp_pp: 'debt/GDP' }[m.v] ?? m.label;
    if (Math.max(...Object.values(spreads(arm, m.v))) < NEGLIGIBLE) still.push(name);
    else (by[topChoice(arm, m.v)] ??= []).push(name);
  }
  const cap = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
  const out = Object.entries(by).map(([k, ms]) => ({ choice: k, measures: ms, phrase: `${CHOICE[k]} moves ${and(ms)} most` }));
  if (still.length) out.push({ choice: 'still', measures: still, phrase: `${and(still)} barely ${still.length > 1 ? 'move' : 'moves'} with any of them` });
  return out.map((d) => ({ ...d, text: cap(d.phrase) }));
}
export function driverWords(arm) {
  const ds = drivers(arm);
  return `${[ds[0].text, ...ds.slice(1).map((d) => d.phrase)].join('; ')}.`;
}
