// The answers that open Explore's sub-tabs, as a strip of chips (drawn by
// AnswerStrip.jsx): one context chip (scenario, closure, rule), one chip per
// measure whose direction icon, word and colour come from the sign of its
// gap (direction.jsx), an optional closed-capital chip (Closure = Both), a
// one-line why, and one caveat note. Words only (above, below, on): every
// figure has its home in a chart below, so an answer never repeats one. They
// read the same pickers as the charts, so they move with them. An unsolved
// combination returns a sentence (string).
import { HEADLINE_YEAR, SCEN_NAME, CENTRAL, BOUND, gap, ruleSolved } from '@/tabs/ai/surprise.js';
import { side, ruleGapText } from '@/tabs/ai/lines.js';
import { ruleLabel } from '@/lib/labels.js';
import { drivers } from '@/tabs/explore/cells.js';
import { dirConcept } from '@/tabs/explore/direction.jsx';

// ("Gaps against the path, not forecasts" is stated once per page, by the
// shared banner above every tab.)
const word = (x) => (side(x) === 'on' ? 'on the path' : side(x));
// Above the path is a gain for income and output, a loss below; debt and
// tax are drawn neutral (grey).
const POLARITY = { Y: 1, GNI: 1, w: 1 };
export const toneOf = (v, x) => (!POLARITY[v] || side(x) === 'on' ? null : x > 0 ? 'gain' : 'loss');

// [concept, name, variable] triples -> chips, context and closed-capital chip
function read(sid, closure, rule, vars) {
  const cl = closure === 'closed' ? BOUND : CENTRAL;
  const vals = vars.map(([, , v]) => gap(sid, 'tfp', cl, v, HEADLINE_YEAR, rule));
  if (vals.some((x) => x == null)) return null;
  const chips = vars.map(([concept, name, v], i) => ({
    key: v,
    v,
    concept,
    name,
    value: vals[i],
    dir: dirConcept(vals[i]),
    word: i ? word(vals[i]) : `${word(vals[i])}${side(vals[i]) === 'on' ? '' : ' the path'}`,
    tone: toneOf(v, vals[i]),
  }));
  let closed = null;
  if (closure === 'both') {
    const differ = vars
      .map(([, name, v]) => [name, v, gap(sid, 'tfp', BOUND, v, HEADLINE_YEAR, rule)])
      .filter(([, , x], i) => x != null && side(x) !== side(vals[i]));
    if (differ.length) closed = { text: `With closed capital: ${differ.map(([name, , x]) => `${name.toLowerCase()} ${word(x)}`).join(', ')}`, values: differ.map(([, , x]) => x) };
  }
  const context = `${SCEN_NAME[sid]} · automation + productivity · ${HEADLINE_YEAR} · ${closure === 'closed' ? 'closed capital' : 'central closure'} · ${ruleLabel(rule).toLowerCase()}`;
  return { cl, context, chips, closed };
}

export function economyAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const r = read(sid, closure, rule, [['gdp', 'GDP', 'Y'], ['gni', 'National income', 'GNI'], ['pay', 'Wage rate', 'w']]);
  if (!r) return 'This combination is not solved yet.';
  const ls = gap(sid, 'tfp', r.cl, 'labour_share_pp', HEADLINE_YEAR, rule);
  const why =
    ls == null
      ? null
      : [
          { key: 'ls', icon: 'inequality', dir: ls, text: `Labour share ${word(ls)}${side(ls) === 'on' ? '' : ' the path'}` },
          { key: 'pay', icon: 'pay', text: side(ls) === 'below' ? 'Pay grows less than output' : side(ls) === 'above' ? 'Pay grows more than output' : 'Pay keeps pace with output' },
        ];
  return { ...r, why };
}

export function financesAnswer(sid, closure, rule) {
  if (!ruleSolved(rule, sid)) return ruleGapText(rule, sid);
  const r = read(sid, closure, rule, [['debt', 'Debt/GDP', 'debt_gdp_pp'], ['tax', 'Tax/GDP', 'tax_gdp_pp']]);
  if (!r) return 'This combination is not solved yet.';
  return { ...r, link: { anchor: 'tax-gap', icon: 'limit', text: 'The model’s tax effect is likely too small' } };
}

// Which choice moves each measure most, one chip per choice, for the main arm.
export function allAnswer() {
  return {
    context: `Automation + productivity · ${HEADLINE_YEAR} · every solved cell below, UK range shaded`,
    drivers: drivers('tfp').map((d) => ({ key: d.choice, icon: d.choice === 'still' ? 'onPath' : d.choice, text: d.text })),
  };
}
