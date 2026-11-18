// Explore > Public finances, item 17: the Debt/GDP and Tax/GDP charts'
// titles and their closed "More info" text, from the economics review
// (ugai-reviews/public-finances-moreinfo-fable.md). Pure: every year comes
// from the data's constants and every side from the data, so a control
// change or the 2027 data swap never leaves a false sentence. Each
// sentence is gated on the conditions that file sets; a sentence whose
// condition fails is left out or replaced by the file's alternative.
import {
  S, YEARS, HEADLINE_YEAR, LATE_YEAR, FIRST_YEAR, SURPRISE_YEAR, CENTRAL, ARMS, resultAt, gap, signed,
} from '@/tabs/ai/surprise.js';
import { closuresFor, primaryClosure, side } from '@/tabs/ai/lines.js';

// OG-UK's own debt-rule start: tG1 = 4 periods from 2026 (scenarios.py).
// The one home of this constant; FinancesSection imports it.
export const OGUK_TG1_YEAR = 2030;

const nameOf = (a) => a.short || a.label;
const andList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const NAMES = Object.fromEntries(ARMS.map((a) => [a.id, nameOf(a)]));
// "the Stress test" in running text, as the review writes it
const inText = (id) => (id === 'ss' ? `the ${NAMES[id]}` : NAMES[id]);
const pp = (x, dp = 2) => `${signed(x, dp)}pp`;
const abs1 = (x) => `${Math.abs(x).toFixed(1)}pp`;
const sideWord = (x) => (side(x) === 'on' ? 'on' : side(x));
const where = (x) => (side(x) === 'on' ? 'on the path' : `${side(x)} the path`);

// The values of one measure, per arm, at a closure, rule and year
function byArm(sid, cl, v, year, rule) {
  return ARMS.map((a) => ({ id: a.id, x: gap(sid, a.id, cl, v, year, rule) })).filter((c) => c.x != null);
}
const solved = (sid, cl, rule) => ARMS.every((a) => resultAt(sid, a.id, cl, rule).status === 'done');

// A one-line title from the sides of every version (and every closure
// shown) in `year`: "Debt/GDP is above the path by 2036 in every version",
// or the exceptions by name.
function sidesTitle(name, sid, closure, rule, v, year, by) {
  const cls = closuresFor(closure);
  const cells = cls.flatMap((cl) => byArm(sid, cl, v, year, rule).map((c) => ({ ...c, cl })));
  if (!cells.length) return null;
  const sides = new Set(cells.map((c) => side(c.x)));
  const Name = name.charAt(0).toUpperCase() + name.slice(1);
  if (sides.size === 1) {
    const s = [...sides][0];
    return `${Name} is ${s === 'on' ? 'on the path' : `${s} the path`} ${by} ${year} in every version`;
  }
  if (cls.length > 1) return `${by === 'by' ? 'By' : 'In'} ${year}, ${name}’s side of the path depends on the version and foreign capital`;
  const groups = ['below', 'above', 'on'].map((s) => ({ s, ids: cells.filter((c) => side(c.x) === s).map((c) => c.id) })).filter((g) => g.ids.length);
  // the larger group is the rule, the rest the exceptions
  groups.sort((a, b) => b.ids.length - a.ids.length);
  const [main, ...rest] = groups;
  const say = (s) => (s === 'on' ? 'on the path' : `${s} the path`);
  return `${by === 'by' ? 'By' : 'In'} ${year}, ${name} is ${say(main.s)} except in ${andList(rest.flatMap((g) => g.ids.map((id) => NAMES[id])))}`;
}

export function debtTitle(sid, closure, rule) {
  if (rule === 'dn') {
    const cls = closuresFor(closure);
    const after = YEARS.filter((y) => y > SURPRISE_YEAR && y <= LATE_YEAR);
    const held = cls.every((cl) => ARMS.every((a) => after.every((y) => {
      const x = gap(sid, a.id, cl, 'debt_gdp_pp', y, rule);
      return x != null && side(x) === 'on';
    })));
    if (held) return `Debt/GDP stays on the path from ${SURPRISE_YEAR + 1} in every version`;
  }
  return sidesTitle('debt/GDP', sid, closure, rule, 'debt_gdp_pp', LATE_YEAR, 'by');
}

export function taxTitle(sid, closure, rule) {
  const cls = closuresFor(closure);
  const yrs = YEARS.filter((y) => y >= SURPRISE_YEAR && y <= HEADLINE_YEAR);
  const all = cls.flatMap((cl) => ARMS.flatMap((a) => yrs.map((y) => gap(sid, a.id, cl, 'tax_gdp_pp', y, rule))));
  if (all.length && all.every((x) => x != null && side(x) === 'below')) return `Tax/GDP is below the path in every version, ${SURPRISE_YEAR}–${HEADLINE_YEAR}`;
  return sidesTitle('tax/GDP', sid, closure, rule, 'tax_gdp_pp', HEADLINE_YEAR, 'in');
}

// --- More info -------------------------------------------------------------
// Each item: { key, head?, text }. Groups: { key, title, items }.

function refLines(sid, closure, rule, chart) {
  const cl = primaryClosure(closure);
  const before = YEARS.filter((y) => y >= FIRST_YEAR && y < SURPRISE_YEAR);
  const flat = before.every((y) => ARMS.every((a) => {
    const x = gap(sid, a.id, cl, chart === 'debt' ? 'debt_gdp_pp' : 'tax_gdp_pp', y, rule);
    return x == null || side(x) === 'on';
  }));
  const items = [
    {
      key: 'ai',
      head: `Extra AI starts (${SURPRISE_YEAR}).`,
      text: `The year the scenario’s extra AI begins, as a surprise.${flat ? ' Before it, every line is on the forecast path.' : ''} The date is assumed.`,
    },
  ];
  if (chart === 'debt')
    items.push({
      key: 'rule',
      head: `Debt rule starts (${LATE_YEAR}).`,
      text: `${rule === 'common' ? 'Until this year, government spending keeps pace with GDP. ' : ''}From this year, the model changes spending to steer debt towards its long-run level.`,
    });
  return items;
}

function ruleYear() {
  return [
    { key: 'set', text: `The ${LATE_YEAR} start is set in this study, not taken from the OBR. OG-UK’s own default is ${OGUK_TG1_YEAR}.` },
    { key: 'fixed', text: 'It is a fixed calendar year. It does not move with the year extra AI starts.' },
  ];
}

// 2.3: why the debt lines move as they do. Common rule only; under the other
// rules, the file's alternative.
export function debtWhy(sid, closure, rule) {
  const cl = primaryClosure(closure);
  if (!solved(sid, cl, rule)) return [];
  if (rule === 'dn') {
    const after = YEARS.filter((y) => y > SURPRISE_YEAR && y <= LATE_YEAR);
    const held = ARMS.every((a) => after.every((y) => side(gap(sid, a.id, cl, 'debt_gdp_pp', y, rule)) === 'on'));
    return held ? [{ key: 'dn', text: `Under debt-neutral transfers, debt/GDP is on the path from ${SURPRISE_YEAR + 1} by construction: transfers to households adjust each year to hold it there.` }] : [];
  }
  if (rule === 'fixed') {
    const late = byArm(sid, cl, 'debt_gdp_pp', LATE_YEAR, rule);
    const tfp = late.find((c) => c.id === 'tfp');
    return tfp
      ? [{ key: 'fixed', text: `Under fixed spending, spending stays at its baseline level and does not grow with GDP. In ${LATE_YEAR}, debt/GDP is ${where(tfp.x)} in ${NAMES.tfp} (${pp(tfp.x)}).` }]
      : [];
  }
  const out = [];
  const first = byArm(sid, cl, 'debt_gdp_pp', SURPRISE_YEAR, rule);
  const y0 = byArm(sid, cl, 'Y', SURPRISE_YEAR, rule);
  // 1. the first year: every version's side, and why (GDP up, stock set)
  const s1 = new Set(first.map((c) => side(c.x)));
  const allBelow = s1.size === 1 && s1.has('below');
  if (first.length) {
    const sides = s1.size === 1
      ? `${where(first[0].x)} in all three versions`
      : ['below', 'above', 'on'].map((s) => ({ s, ids: first.filter((c) => side(c.x) === s).map((c) => inText(c.id)) })).filter((g) => g.ids.length).map((g) => `${g.s === 'on' ? 'on the path' : `${g.s} the path`} in ${andList(g.ids)}`).join(', and ');
    const why = allBelow && y0.length === first.length && y0.every((c) => c.x > 0) ? ': GDP is higher and the debt stock has not yet changed' : '';
    out.push({ key: 's1', text: `In ${SURPRISE_YEAR}, debt/GDP is ${sides}${why}.` });
  }
  // 2. then it rises every year, from the first year after which every
  //    version rises to the debt rule's year (read from the data)
  const span = YEARS.filter((y) => y >= SURPRISE_YEAR && y <= LATE_YEAR);
  const path = (id) => span.map((y) => gap(sid, id, cl, 'debt_gdp_pp', y, rule));
  let from = null;
  for (let k = 0; k < span.length - 1 && from == null; k += 1)
    if (ARMS.every((a) => path(a.id).slice(k).every((x, i, xs) => i === 0 || x > xs[i - 1]))) from = span[k];
  const hy = (v) => byArm(sid, cl, v, HEADLINE_YEAR, rule);
  // the reason holds in every year it covers: from the "rises from" year to
  // the debt rule's year, for every version
  const every = (v, test) => from != null && ARMS.every((a) => YEARS.filter((y) => y >= from && y <= LATE_YEAR).every((y) => {
    const x = gap(sid, a.id, cl, v, y, rule);
    return x != null && test(x);
  }));
  const rUp = every('r_bp', (x) => x > 0);
  const taxDown = every('tax_gdp_pp', (x) => side(x) === 'below');
  if (from != null) {
    const lead = from === SURPRISE_YEAR ? 'After that it rises against the path every year.' : `From ${from} it rises against the path every year in every version.`;
    const why = rUp && taxDown ? ` The interest rate is higher and tax/GDP is lower, while spending keeps pace with GDP until ${LATE_YEAR}.` : '';
    out.push({ key: 's2', text: `${lead}${why}` });
  }
  // 3. the headline year, by sign
  const h = hy('debt_gdp_pp');
  const below = h.filter((c) => side(c.x) === 'below');
  const above = h.filter((c) => side(c.x) === 'above');
  if (h.length) {
    const parts = [];
    const verb = (xs) => (xs.length > 1 ? 'are' : 'is');
    if (below.length) parts.push(`By ${HEADLINE_YEAR}, ${andList(below.map((c) => inText(c.id)))} ${verb(below)} ${allBelow ? 'still ' : ''}below the path (${below.map((c) => pp(c.x)).join(', ')}).`);
    if (above.length) {
      const yh = Object.fromEntries(hy('Y').map((c) => [c.id, c.x]));
      const smaller = below.length && above.every((c) => below.every((b) => yh[c.id] < yh[b.id]));
      const zeroSs = above.some((c) => c.id === 'ss') && Math.abs(yh.ss ?? 1) < 0.005;
      const why = smaller ? `: their GDP gain is smaller${zeroSs ? ', or zero in the stress test' : ''}` : '';
      const lead = below.length ? `${andList(above.map((c) => inText(c.id))).replace(/^./, (x) => x.toUpperCase())} ${verb(above)} ${allBelow ? 'already ' : ''}above it` : `By ${HEADLINE_YEAR}, debt/GDP is above the path in ${above.length === ARMS.length ? 'all three versions' : andList(above.map((c) => inText(c.id)))}`;
      parts.push(`${lead} (${above.map((c) => pp(c.x)).join(', ')})${why}.`);
    }
    if (parts.length) out.push({ key: 's3', text: parts.join(' ') });
  }
  // 4. the OBR's repricing pace first (Maria, point 5), then the model
  const obr = ARMS.map((a) => ({ id: a.id, x: resultAt(sid, a.id, cl, rule).debt_gdp_pp_obr_repricing_late })).filter((c) => typeof c.x === 'number');
  const late = byArm(sid, cl, 'debt_gdp_pp', LATE_YEAR, rule);
  if (obr.length === ARMS.length && late.length === ARMS.length) {
    const [m, ...rest] = obr;
    const restText = rest.map((c) => `${abs1(c.x)}${side(c.x) === side(m.x) ? '' : ` ${sideWord(c.x)}`} in ${inText(c.id)}`).join(', ');
    out.push({ key: 's4', text: `At the pace the OBR expects debt to reprice, debt/GDP in ${LATE_YEAR} is ${abs1(m.x)} ${sideWord(m.x)} the path in ${NAMES[m.id]} (${restText}).` });
    // each model figure says its side when it differs from that version's
    // side at the OBR's pace (UK high, Korinek: below at the OBR's pace,
    // above in the model)
    const sideOfObr = Object.fromEntries(obr.map((c) => [c.id, side(c.x)]));
    const f = (c) => `${abs1(c.x)}${side(c.x) === sideOfObr[c.id] ? '' : ` ${sideWord(c.x)} the path`}`;
    out.push({ key: 's5', text: `In the model all debt pays the higher rate at once, which gives ${f(late[0])} (${late.slice(1).map(f).join(', ')}).` });
  }
  return out;
}

// 2.4: why tax/GDP is below the path. Some foreign capital (ζK 0.1) only.
const ETR = S.closures[CENTRAL].reference_effective_tax_rates;
export function taxWhy(sid, closure, rule) {
  if (closure !== 'central') return [{ key: 'closed', text: 'With no foreign capital the model’s sign for tax/GDP changes in some cases, so this explanation is for some foreign capital only: see the card below.' }];
  const cl = CENTRAL;
  if (!solved(sid, cl, rule)) return [];
  const out = [];
  const yrs = YEARS.filter((y) => y >= SURPRISE_YEAR);
  const every = ARMS.every((a) => yrs.every((y) => side(gap(sid, a.id, cl, 'tax_gdp_pp', y, rule)) === 'below'));
  if (every) out.push({ key: 't1', text: `Tax/GDP is below the path in every version, every year from ${SURPRISE_YEAR}.` });
  const ls = gap(sid, 'tfp', cl, 'labour_share_pp', HEADLINE_YEAR, rule);
  if (ls != null && ls < 0 && ETR.labour > ETR.capital_gross)
    out.push({ key: 't2', text: `Income moves from pay to profits (${(-ls).toFixed(1)} points of GDP by ${HEADLINE_YEAR}), and the model taxes labour income more heavily than capital income: ${ETR.labour.toFixed(1)}% against ${ETR.capital_gross.toFixed(1)}%.` });
  const cLow = ARMS.every((a) => {
    const c = gap(sid, a.id, cl, 'C', HEADLINE_YEAR, rule);
    const y = gap(sid, a.id, cl, 'Y', HEADLINE_YEAR, rule);
    return c != null && y != null && c < y;
  });
  if (cLow) out.push({ key: 't3', text: 'Consumption also falls as a share of GDP, so consumption taxes raise less.' });
  const t = byArm(sid, cl, 'tax_gdp_pp', HEADLINE_YEAR, rule);
  if (t.length === ARMS.length && t.every((c) => side(c.x) === 'below')) {
    const sorted = [...t].sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    if (Math.abs(hi.x) - Math.abs(lo.x) >= 0.005) out.push({ key: 't4', text: `The gap is smallest in ${inText(lo.id)} (${pp(lo.x)}) and largest in ${inText(hi.id)} (${pp(hi.x)}).` });
  }
  return out;
}

// 2.5: the units detail
function units(chart, sid, closure) {
  const cl = primaryClosure(closure);
  const lv = S.closures[cl]?.reference_levels;
  const i = YEARS.indexOf(HEADLINE_YEAR);
  const items = chart === 'debt'
    ? [{ key: 'u', text: `pp of GDP, gap against the OBR’s central forecast path, ${FIRST_YEAR}–${LATE_YEAR}. Positive: debt/GDP is above the path.` }]
    : [{ key: 'u', text: `pp of GDP, gap against the OBR’s central forecast path, ${FIRST_YEAR}–${HEADLINE_YEAR}. Positive: tax/GDP is above the path. Tax is all model taxes, employer NICs included.` }];
  const ref = chart === 'debt' ? lv?.debt_gdp?.[i] : lv?.tax_gdp?.[i];
  items.push({ key: 'path', text: `The path is the model’s no-shock run on OBR March 2026 assumptions.${typeof ref === 'number' ? ` On it, ${chart === 'debt' ? 'debt/GDP' : 'tax/GDP'} is ${ref.toFixed(1)}% in ${HEADLINE_YEAR}.` : ''}` });
  return items;
}

export function debtMoreInfo(sid, closure, rule) {
  const why = debtWhy(sid, closure, rule);
  return [
    { key: 'lines', title: 'The reference lines', items: refLines(sid, closure, rule, 'debt') },
    { key: 'year', title: 'The debt rule’s start year', items: ruleYear() },
    why.length ? { key: 'why', title: 'Why the lines move as they do', items: why } : null,
    { key: 'units', title: 'Units', items: units('debt', sid, closure) },
  ].filter(Boolean);
}

export function taxMoreInfo(sid, closure, rule) {
  const why = taxWhy(sid, closure, rule);
  return [
    { key: 'lines', title: 'The reference line', items: refLines(sid, closure, rule, 'tax') },
    why.length ? { key: 'why', title: why.some((k) => k.key === 't1') ? 'Why tax/GDP is below the path' : 'Why tax/GDP moves as it does', items: why } : null,
    { key: 'units', title: 'Units', items: units('tax', sid, closure) },
  ].filter(Boolean);
}
