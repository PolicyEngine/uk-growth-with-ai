// The one-sentence answers that open Explore's sub-tabs. Words only (above,
// below, on): every figure has its home in a chart below, so a sentence never
// repeats one. They read the same pickers as the charts, so they move with
// them.
import { HEADLINE_YEAR, SCENARIOS, CENTRAL, BOUND, SCEN_NAME, gap } from '@/tabs/ai/surprise.js';
import { primaryClosure, closureWords, side, ruleGapText } from '@/tabs/ai/lines.js';
import { ruleLabel } from '@/lib/labels.js';
import { ruleSolved } from '@/tabs/ai/surprise.js';

const where = (x) => (side(x) === 'on' ? 'on the OBR-central path' : `${side(x)} it`);
const first = (x) => (side(x) === 'on' ? 'on the OBR-central path' : `${side(x)} the OBR-central path`);

function choices(closure, rule) {
  return `${closureWords(closure)}, ${ruleLabel(rule).toLowerCase()}`;
}

export function economyAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const cl = primaryClosure(closure);
  const y = gap(sid, 'tfp', cl, 'Y', HEADLINE_YEAR, rule);
  const g = gap(sid, 'tfp', cl, 'GNI', HEADLINE_YEAR, rule);
  const w = gap(sid, 'tfp', cl, 'w', HEADLINE_YEAR, rule);
  if (y == null || g == null || w == null) return 'This combination is not solved yet.';
  return `In ${SCEN_NAME[sid]} with automation + productivity, GDP is ${first(y)} in ${HEADLINE_YEAR}, national income is ${where(g)} and the wage rate is ${where(w)} (${choices(closure, rule)}). The labour share falls, so pay per unit of labour can lag behind output. These are gaps against the path, not forecasts of levels.`;
}

export function financesAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const cl = primaryClosure(closure);
  const d = gap(sid, 'tfp', cl, 'debt_gdp_pp', HEADLINE_YEAR, rule);
  const t = gap(sid, 'tfp', cl, 'tax_gdp_pp', HEADLINE_YEAR, rule);
  if (d == null || t == null) return 'This combination is not solved yet.';
  return `In ${SCEN_NAME[sid]} with automation + productivity, debt/GDP is ${first(d)} in ${HEADLINE_YEAR} and tax/GDP is ${where(t)} (${choices(closure, rule)}). The model's tax effect is likely too small; the card below says why.`;
}

// Which choice moves the main arm's headline-year GDP gap most: the
// scenario, the closure or the fiscal rule (largest spread over the solved
// cells). Words only; the cells are in the charts below.
export function spreads(v = 'Y') {
  const g = (sid, cl, rule) => gap(sid, 'tfp', cl, v, HEADLINE_YEAR, rule);
  const vals = (xs) => xs.filter((x) => x != null);
  const span = (xs) => (xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0);
  const scenario = span(vals(SCENARIOS.map((s) => g(s.id, CENTRAL, 'common'))));
  const closure = Math.max(0, ...SCENARIOS.map((s) => span(vals([g(s.id, CENTRAL, 'common'), g(s.id, BOUND, 'common')]))));
  const rule = Math.max(0, ...SCENARIOS.flatMap((s) => [CENTRAL, BOUND].map((cl) => span(vals(['common', 'fixed', 'dn'].map((r) => g(s.id, cl, r)))))));
  return { scenario, closure, rule };
}

export function allAnswer() {
  const s = spreads('Y');
  const order = Object.entries(s).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const name = { scenario: 'the scenario', closure: 'the capital closure', rule: 'the fiscal rule' };
  return `For the main arm's ${HEADLINE_YEAR} GDP gap, ${name[order[0]]} matters most, then ${name[order[1]]}, then ${name[order[2]]}. Each panel below shows every solved cell at once, with the UK range shaded.`;
}
