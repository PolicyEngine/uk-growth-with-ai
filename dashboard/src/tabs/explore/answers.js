// The one-sentence answers that open Explore's sub-tabs. Words only (above,
// below, on): every figure has its home in a chart below, so a sentence never
// repeats one. They read the same pickers as the charts, so they move with
// them.
import { HEADLINE_YEAR, SCEN_NAME, gap } from '@/tabs/ai/surprise.js';
import { driverWords } from '@/tabs/explore/cells.js';
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

export function allAnswer() {
  return `${driverWords('tfp').replace(/\.$/, '')}, for the main arm in ${HEADLINE_YEAR}. Every solved cell is below, with the UK range shaded.`;
}
