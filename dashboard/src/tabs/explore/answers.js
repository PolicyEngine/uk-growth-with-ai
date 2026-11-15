// The one-sentence answers that open Explore's sub-tabs. Words only (above,
// below, on): every figure has its home in a chart below, so a sentence never
// repeats one. They read the same pickers as the charts, so they move with
// them. With Closure = Both the sentence is for the central closure, and any
// measure that falls on the other side with closed capital is named.
import { HEADLINE_YEAR, SCEN_NAME, CENTRAL, BOUND, gap, ruleSolved } from '@/tabs/ai/surprise.js';
import { side, ruleGapText } from '@/tabs/ai/lines.js';
import { ruleLabel } from '@/lib/labels.js';
import { driverWords } from '@/tabs/explore/cells.js';

const where = (x) => (side(x) === 'on' ? 'on the OBR-central path' : `${side(x)} it`);
const first = (x) => (side(x) === 'on' ? 'on the OBR-central path' : `${side(x)} the OBR-central path`);
const sideWords = (x) => (side(x) === 'on' ? 'on the path' : `${side(x)} it`);

// [name, variable] pairs -> the sentence's values and a closed-capital note
function read(sid, closure, rule, vars) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const vals = vars.map(([, v]) => gap(sid, 'tfp', cl, v, HEADLINE_YEAR, rule));
  if (vals.some((x) => x == null)) return null;
  let note = '';
  if (closure === 'both') {
    const other = vars.map(([name, v]) => [name, gap(sid, 'tfp', BOUND, v, HEADLINE_YEAR, rule)]);
    const differ = other.filter(([, x], i) => x != null && side(x) !== side(vals[i]));
    if (differ.length) note = ` With closed capital, ${differ.map(([name, x]) => `${name} is ${sideWords(x)}`).join(' and ')}.`;
  }
  const words = `${closure === 'closed' ? 'closed capital' : 'central closure'}, ${ruleLabel(rule).toLowerCase()}`;
  return { vals, note, words };
}

export function economyAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const r = read(sid, closure, rule, [['GDP', 'Y'], ['national income', 'GNI'], ['the wage rate', 'w']]);
  if (!r) return 'This combination is not solved yet.';
  const [y, g, w] = r.vals;
  return `In ${SCEN_NAME[sid]} with automation + productivity, GDP is ${first(y)} in ${HEADLINE_YEAR}, national income is ${where(g)} and the wage rate is ${where(w)} (${r.words}).${r.note} The labour share falls, so pay per unit of labour can lag behind output. These are gaps against the path, not forecasts of levels.`;
}

export function financesAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const r = read(sid, closure, rule, [['debt/GDP', 'debt_gdp_pp'], ['tax/GDP', 'tax_gdp_pp']]);
  if (!r) return 'This combination is not solved yet.';
  const [d, t] = r.vals;
  return `In ${SCEN_NAME[sid]} with automation + productivity, debt/GDP is ${first(d)} in ${HEADLINE_YEAR} and tax/GDP is ${where(t)} (${r.words}).${r.note} The model's tax effect is likely too small; the card below says why.`;
}

export function allAnswer() {
  return `${driverWords('tfp').replace(/\.$/, '')}, for the main arm in ${HEADLINE_YEAR}. Every solved cell is below, with the UK range shaded.`;
}
