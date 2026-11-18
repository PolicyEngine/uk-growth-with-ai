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

// Which choice moves a measure most for an arm (item 37,
// ugai-reviews/item-37-fable.md section 5). Like for like: each factor's
// range is taken holding the other two choices fixed, over every row
// solved for all of that factor's levels (scenario: rule x closure rows
// with all four scenarios; closure: scenario x rule rows with both cases;
// rule: scenario x closure rows with all three rules), and summarised as
// the max and the mean over those rows.
const RANGE = (xs) => (xs.some((x) => x == null) || xs.length < 2 ? null : Math.max(...xs) - Math.min(...xs));
const statOf = (rs) => {
  const ys = rs.filter((x) => x != null);
  return ys.length ? { max: Math.max(...ys), mean: ys.reduce((a, b) => a + b, 0) / ys.length, rows: ys.length } : { max: 0, mean: 0, rows: 0 };
};
export function spreads(arm, v) {
  const ids = SCENARIOS.map((s) => s.id);
  const rules = RULES.map((r) => r.id);
  return {
    scenario: statOf(rules.flatMap((rule) => CLS.map((cl) => RANGE(ids.map((sid) => cellValue(sid, arm, cl, rule, v)))))),
    closure: statOf(ids.flatMap((sid) => rules.map((rule) => RANGE(CLS.map((cl) => cellValue(sid, arm, cl, rule, v)))))),
    rule: statOf(ids.flatMap((sid) => CLS.map((cl) => RANGE(rules.map((rule) => cellValue(sid, arm, cl, rule, v)))))),
  };
}
export const NEGLIGIBLE = 0.05;
export const LEAD = 1.25;
// The gate, on spreads()' { factor: { max, mean } }: 'still' when every
// max is below NEGLIGIBLE; 'lead' when one factor is top on max and on
// mean by LEAD or more on both; otherwise the contenders (top on either,
// or within LEAD of the top on either): two make a 'tie' (larger max
// first), three are 'open'.
export function gate(st) {
  const fs = Object.keys(st);
  if (Math.max(...fs.map((f) => st[f].max)) < NEGLIGIBLE) return { kind: 'still', factors: [] };
  const by = (k) => [...fs].sort((a, b) => st[b][k] - st[a][k]);
  const [m1, m2] = by('max');
  const [n1, n2] = by('mean');
  if (m1 === n1 && st[m1].max >= LEAD * st[m2].max && st[n1].mean >= LEAD * st[n2].mean) return { kind: 'lead', factors: [m1] };
  const topMax = st[m1].max;
  const topMean = st[n1].mean;
  const cont = fs.filter((f) => f === m1 || f === n1 || st[f].max * LEAD >= topMax || st[f].mean * LEAD >= topMean);
  if (cont.length >= 3) return { kind: 'open', factors: cont };
  return { kind: 'tie', factors: cont.sort((a, b) => st[b].max - st[a].max) };
}
const CHOICE = { scenario: 'the scenario', closure: 'the foreign-capital case', rule: 'the budget assumption' };
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
const NAME = { Y: 'GDP', GNI: 'GNI', w: 'the pay rate', debt_gdp_pp: 'debt/GDP' };
const cap = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
// [{ choice, kind, measures, text }] for the measures given (default: the
// three this card shows; debt/GDP's line is the AcrossDebt card's), the
// first measure's line first. Measures with the same case and factors
// merge with "and".
export function drivers(arm, vs = ['Y', 'GNI', 'w']) {
  const groups = [];
  for (const v of vs) {
    const g = gate(spreads(arm, v));
    const key = `${g.kind}|${g.factors.join(',')}`;
    const at = groups.find((x) => x.key === key);
    if (at) at.vs.push(v);
    else groups.push({ key, ...g, vs: [v] });
  }
  return groups.map((g) => {
    const ms = and(g.vs.map((v) => NAME[v]));
    const phrase =
      g.kind === 'lead' ? `${CHOICE[g.factors[0]]} moves ${ms} most`
        : g.kind === 'tie' ? `${CHOICE[g.factors[0]]} and ${CHOICE[g.factors[1]]} move ${ms} by similar amounts`
          : g.kind === 'open' ? `no one choice moves ${ms} most`
            : `${ms} barely ${g.vs.length > 1 ? 'move' : 'moves'} with any choice`;
    return { choice: g.kind === 'lead' ? g.factors[0] : g.kind, kind: g.kind, measures: g.vs, text: cap(phrase) };
  });
}
