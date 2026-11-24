// Part 2's caveats (economics review, round 1), in words read from the data
// files for the scenario and closure in view. Each fact they qualify has its
// home elsewhere (Explore, Method, Who gains), so they print no figure:
// shares become "about half", counts "one in six", and each line links the
// figure's home. Every function returns null when a solve is pending or the
// caveat does not hold for the cell in view.
import S from '@/lib/activeData.js';
import { COHORTS as C } from '@/lib/dataKeys.js';
import { YEARS, HEADLINE_YEAR, LATE_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, gap, payLine, result } from '@/tabs/ai/surprise.js';
import { EPS2 } from './dir.js';

const H = YEARS.indexOf(HEADLINE_YEAR);
// the model's first adult age (cohort_welfare.py FIRST_AGE)
const FIRST_ADULT_AGE = 20;

// A ratio as words, or null outside the range a phrase fits.
// The nearest of five fractions: "about" within 0.03 of it, otherwise
// "over" or "under" it; null below a fifth or above 0.85. With { all: true }
// a ratio within 0.02 of one is "about all" (the zeta_K 0.5 foreign share,
// zk05-share-fable.md); callers whose ratio sits below one leave it off.
const FRACS = [
  [1 / 4, 'a quarter'],
  [1 / 3, 'a third'],
  [1 / 2, 'half'],
  [2 / 3, 'two-thirds'],
  [3 / 4, 'three-quarters'],
];
export function fracWord(r, { all = false } = {}) {
  if (all && Number.isFinite(r) && r >= 0.98 && r <= 1.02) return 'about all';
  if (!Number.isFinite(r) || r < 0.2 || r > 0.85) return null;
  const [f, w] = FRACS.reduce((a, b) => (Math.abs(b[0] - r) < Math.abs(a[0] - r) ? b : a));
  return `${Math.abs(r - f) < 0.03 ? 'about' : r < f ? 'under' : 'over'} ${w}`;
}

// A share of people (per cent) as "one in six", "more than two in five".
export function peopleWord(pct) {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  if (pct >= 50) return 'more than half';
  if (pct >= 40) return 'more than two in five';
  if (pct >= 33) return 'about one in three';
  const n = Math.round(100 / pct);
  const word = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);
  return `about one in ${word}`;
}

// The pay tile: does the main view's wage gap change sign between the two
// foreign-capital cases the page offers (none, some)? 'flips' when it
// does, else null. The ζK 0.5 sensitivity is not a case the page offers,
// so it is not counted here (Maria's point 3): see paySensAbove.
export function paySigns(sid) {
  const ws = [gap(sid, 'tfp', BOUND, 'w'), gap(sid, 'tfp', CENTRAL, 'w')].filter((x) => x != null);
  if (ws.length < 2) return null;
  const signs = new Set(ws.map((w) => (Math.abs(w) < EPS2 ? 0 : Math.sign(w))));
  return signs.size > 1 ? 'flips' : null;
}
// The ζK 0.5 sensitivity's wage gap in the headline year, or null while it
// is pending.
export function paySens(sid) {
  const sens = S.sensitivity?.['zk0.5']?.results?.[sid]?.tfp;
  const x = sens?.status === 'done' ? sens.gaps.w?.[H] : null;
  return typeof x === 'number' ? x : null;
}
// The pay caveat's one sentence (Maria's point 3), from the signs: with
// both foreign-capital cases below the path, say so, and add the
// sensitivity's clause only where it ends above the path ("edge above"
// while the gap is under a quarter of a per cent, "end above" beyond).
// The cases split: the sign depends on foreign capital. null otherwise.
export const PAY_EDGE = 0.25;
// The headline stat list's pay note (Vahid, 22 Nov: "consilidate"), the
// same logic as payCaveat in fewer words: { lead, sens } where `sens` is
// 'edge' or 'end' when the zeta-K 0.5 sensitivity's pay gap is above the
// path (z > EPS2), the stat list linking "(sensitivity)" to its table.
export function payNote(sid) {
  const b = gap(sid, 'tfp', BOUND, 'w');
  const c = gap(sid, 'tfp', CENTRAL, 'w');
  if (b == null || c == null) return null;
  if (paySigns(sid) === 'flips') return { lead: 'Its sign depends on how much capital comes from abroad.', sens: null };
  if (!(b < -EPS2 && c < -EPS2)) return null;
  const z = paySens(sid);
  const sens = z != null && z > EPS2 ? (z < PAY_EDGE ? 'edge' : 'end') : null;
  return { lead: 'Below the path with or without foreign capital', sens };
}
export function payCaveat(sid) {
  const b = gap(sid, 'tfp', BOUND, 'w');
  const c = gap(sid, 'tfp', CENTRAL, 'w');
  if (b == null || c == null) return null;
  if (paySigns(sid) === 'flips') return 'Its sign depends on how much capital comes from abroad.';
  if (!(b < -EPS2 && c < -EPS2)) return null;
  const z = paySens(sid);
  const tail = z != null && z > EPS2 ? `; only in a sensitivity with far more foreign capital does it ${z < PAY_EDGE ? 'edge' : 'end'} above` : '';
  return `It stays below the forecast path with or without foreign capital${tail}.`;
}

// Why the pay rate ends below the path (results review, 22 Nov 2026, F1),
// three steps from the scenario list and the gap, main arm:
// 1. the share cut alone: pay = labour's share x output per unit of
//    labour, so with output per unit unchanged it moves by s1/s0 - 1, with
//    s0 = 1 - gamma0, s1 = 1 - gamma1 (gamma1 the scenario's terminal
//    capital share, gamma0 = gamma1 less the share fall);
// 2. how much of that the productivity input and more capital per hour
//    win back by the headline year: "about half" at 40-60% of step 1,
//    "most" above, "part" below;
// 3. arithmetic, not a model run: with capital supplied at an unchanged
//    return, k = ((gamma1/gamma0)(1+t))^(1/(1-gamma1)) and pay moves by
//    (s1/s0)(1+t)k^gamma1 - 1, t the productivity input.
// null unless the gap is below the path and the inputs are in the data.
export function payWhy(sid, cl = CENTRAL, rule = 'common') {
  const w = gap(sid, 'tfp', cl, 'w', HEADLINE_YEAR, rule);
  const s = S.scenarios?.find((x) => x.id === sid);
  if (w == null || !(w < -EPS2) || !s) return null;
  const fall = s.labour_share_fall_pp;
  const g1 = s.gamma_terminal;
  const t = s.tfp_gain_pct / 100;
  if (![fall, g1, t].every(Number.isFinite) || !(fall > 0)) return null;
  const g0 = g1 - fall / 100;
  const ratio = (1 - g1) / (1 - g0);
  const step1 = 100 * (ratio - 1);
  const back = (w - step1) / -step1;
  const won = back > 0.6 ? 'most' : back >= 0.4 ? 'about half' : back > 0 ? 'part' : null;
  const k = ((g1 / g0) * (1 + t)) ** (1 / (1 - g1));
  const free = 100 * (ratio * (1 + t) * k ** g1 - 1);
  const freeWords = Math.abs(free) < 0.05 ? 'on the path' : `about ${Math.abs(free).toFixed(1)}% ${free > 0 ? 'above' : 'below'} the path`;
  return [
    `Why below: this scenario moves ${fall.toFixed(1)} points of income from labour to capital, which alone lowers the pay rate about ${(-step1).toFixed(1)}%.`,
    won ? `Higher productivity and more capital per hour win back ${won} of that by ${HEADLINE_YEAR}.` : null,
    `Capital is slow to arrive: if it came at an unchanged return, the same inputs would put the pay rate ${freeWords} (arithmetic, not a model run).`,
  ]
    .filter(Boolean)
    .join(' ');
}

// María's test, in the Story's visible text (María re-review M1, 24 Nov
// 2026): labour income = labour's share x output, exactly, in the model.
// After the shift labour gets (1 - gamma1) of every 100; its income keeps
// up only if output grows more than s0/s1 - 1. Here it grows less, so
// labour income ends below the path; hours fall too, which gives the pay
// rate (labour income per hour) its last step. Main arm, headline year,
// common rule. { lines: [..] }, or null where output meets the bar or a
// solve is pending. Each figure from the data: the share from the scenario
// list, the gaps from the results; labour income = (1 + w)(1 + L) - 1.
const n1 = (x) => (Number.isInteger(Math.round(x * 10) / 10) ? String(Math.round(x)) : x.toFixed(1));
export function payTest(sid, cl = CENTRAL) {
  const s = S.scenarios?.find((x) => x.id === sid);
  const y = gap(sid, 'tfp', cl, 'Y');
  const w = gap(sid, 'tfp', cl, 'w');
  const l = gap(sid, 'tfp', cl, 'L');
  if (!s || y == null || w == null || l == null) return null;
  const after = 100 * (1 - s.gamma_terminal);
  const before = after + s.labour_share_fall_pp;
  const need = 100 * (before / after - 1);
  if (!(y < need)) return null;
  const li = 100 * ((1 + w / 100) * (1 + l / 100) - 1);
  if (!(li < -EPS2)) return null;
  const lines = [
    `Labour now gets ${n1(after)} of every 100, down from ${n1(before)}.`,
    `Its income keeps up only if output grows more than ${need.toFixed(1)}%.`,
    `Here output grows ${y.toFixed(1)}%, so labour income ends ${Math.abs(li).toFixed(1)}% below the path.`,
  ];
  if (w < -EPS2) lines.push(`Hours ${l < 0 ? 'fall' : 'rise'} ${Math.abs(l).toFixed(1)}%, so the pay rate ends ${Math.abs(w).toFixed(1)}% below.`);
  return { lines, need, li };
}

// The pay rate after the headline year (María re-review M2): main arm,
// common rule, from the headline year to LATE_YEAR. The gap is furthest
// below the path in the headline year and narrows each year after; capital
// per hour (1 + K)/(1 + L) keeps rising and hours keep falling. Each clause
// only where the data shows it in every year; "above the path from <year>"
// where the gap crosses zero. null unless the headline-year gap is below
// the path and is the lowest of the run.
export function payPath(sid, cl = CENTRAL) {
  const r = result(sid, 'tfp', cl);
  if (r?.status !== 'done') return null;
  const i0 = YEARS.indexOf(HEADLINE_YEAR);
  const i1 = YEARS.indexOf(LATE_YEAR);
  const w = r.gaps.w?.slice(i0, i1 + 1);
  const L = r.gaps.L?.slice(i0, i1 + 1);
  const K = r.gaps.K?.slice(i0, i1 + 1);
  if (!w || w.length < 2 || w.some((x) => typeof x !== 'number') || !(w[0] < -EPS2)) return null;
  const narrows = w.slice(1).every((x, i) => x > w[i]);
  if (!narrows) return null;
  const kph = K && L ? K.map((k, i) => (1 + k / 100) / (1 + L[i] / 100)) : null;
  const kUp = kph && kph.slice(1).every((x, i) => x > kph[i]);
  const hDown = L && L.slice(1).every((x, i) => x < L[i]);
  const f = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2)}%`;
  const end = w[w.length - 1];
  const upFrom = end > EPS2 ? YEARS[i0 + w.findIndex((x) => x > EPS2)] : null;
  const why = [kUp ? 'Capital per hour worked keeps rising' : null, hDown ? 'hours keep falling' : null].filter(Boolean).join('; ');
  // steady, not a step in the debt rule's first year: LATE_YEAR's change
  // is no more than twice the largest change before it
  return [
    `The pay rate is furthest below the path in ${HEADLINE_YEAR} (${f(w[0])}) and narrows each year after, to ${f(end)} in ${LATE_YEAR}.`,
    upFrom ? `It is above the path from ${upFrom}.` : null,
    why ? `${why.charAt(0).toUpperCase()}${why.slice(1)}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

// The pay rate's narrowing after the headline year is steady, not a step
// in the debt rule's first year (LATE_YEAR): that year's change is no more
// than twice the largest change before it. The first year after the
// headline year, or null where it does not hold.
export function paySteadyFrom(sid, cl = CENTRAL) {
  const r = result(sid, 'tfp', cl);
  if (r?.status !== 'done') return null;
  const i0 = YEARS.indexOf(HEADLINE_YEAR);
  const w = r.gaps.w?.slice(i0, YEARS.indexOf(LATE_YEAR) + 1);
  if (!w || w.length < 4 || w.some((x) => typeof x !== 'number')) return null;
  const steps = w.slice(1).map((x, i) => x - w[i]);
  if (!steps.every((d) => d > 0)) return null;
  return steps[steps.length - 1] <= 2 * Math.max(...steps.slice(0, -1)) ? YEARS[i0 + 1] : null;
}

// The pay tile's line (review round 3, R3-17): payLine's, except where
// pay falls only in the shock year and grows in every later year to the
// headline year (pay_growth_pct; Korinek with no foreign capital on the
// 2027 data, -0.02 in 2027), which payLine calls plainly "below the
// forecast path". "Slightly" needs the fall under half a per cent.
export function payWords(sid, cl, w = gap(sid, 'tfp', cl, 'w')) {
  const base = payLine(sid, cl, w);
  if (base !== 'below the forecast path') return base;
  const r = result(sid, 'tfp', cl);
  const g = r.status === 'done' ? r.pay_growth_pct : null;
  if (!Array.isArray(g)) return base;
  const win = g.filter((_, i) => YEARS[i] >= SURPRISE_YEAR && YEARS[i] <= HEADLINE_YEAR);
  const ok = win.length > 1 && win.every((x) => typeof x === 'number') && win[0] < 0 && win[0] > -0.5 && win.slice(1).every((x) => x > 0);
  return ok ? `falls slightly in ${SURPRISE_YEAR}, then grows more slowly than on the path` : base;
}

// Who gains (UK central, some foreign capital, debt-neutral transfers): what the
// adults' average is made of, and who loses when transfers bear the cost
// after the solved years (cohorts2028.json dnfull, solved to the horizon).
export function welfareWords() {
  const c = C.closures?.[CENTRAL]?.rules?.dn?.tfp;
  if (!c?.parts_alive || !(c.alive_avg > 0)) return null;
  const p = c.parts_alive;
  const bequests = fracWord(p.bequests / c.alive_avg);
  const r = p.consumption / c.alive_avg;
  const consumption = r > 0 && r < 0.1 ? 'under a tenth' : fracWord(r);
  const full = C.dnfull?.ready && C.dnfull.closure === CENTRAL ? C.dnfull : null;
  const hold = full?.by_fill?.hold;
  const ages = hold?.by_age ? Object.keys(hold.by_age).map(Number).sort((a, b) => a - b) : [];
  const young = ages.length && Object.values(full.by_fill).every((f) => f.by_age?.[ages[0]]?.[0] < 0) ? ages[0] : null;
  const lose = full ? Math.min(...full.range.joint_losing_pct) : null;
  const loseNb = full ? Math.min(...full.range.no_bequest_losing_pct) : null;
  // the age under which adults lose on average when transfers bear the
  // cost (Fable round 7, S3): one more than the youngest fill's
  // oldest_losing_on_average, so it holds for every fill (as the Explore
  // tile's "Up to age" range starts); null unless every fill has one
  const olds = full ? Object.values(full.by_fill ?? {}).map((f) => f.oldest_losing_on_average) : [];
  const under = olds.length && olds.every((x) => Number.isInteger(x) && x >= FIRST_ADULT_AGE) ? Math.min(...olds) + 1 : null;
  return { bequests, consumption, young, lose: peopleWord(lose), loseNb: peopleWord(loseNb), under };
}

// The share of adults alive in 2028 who lose, as a range over the measures
// (cohorts2028.json, UK central, some foreign capital, debt-neutral
// transfers, main version): as charted (to 2036), without bequest value,
// and with the transfers kept on to the horizon (dnfull), with and without
// bequest value. "under 1%" below one per cent, else whole per cent.
// null when the cells are missing.
export function loseRange() {
  const c = C.closures?.[CENTRAL]?.rules?.dn?.tfp;
  const full = C.dnfull?.ready && C.dnfull.closure === CENTRAL ? C.dnfull.range : null;
  const xs = [c?.alive_losing_pct, c?.no_bequest_losing_pct, ...(full?.joint_losing_pct ?? []), ...(full?.no_bequest_losing_pct ?? [])].filter(Number.isFinite);
  if (xs.length < 2) return null;
  const word = (x) => (x < 1 ? 'under 1%' : `${Math.round(x)}%`);
  return { lo: word(Math.min(...xs)), hi: word(Math.max(...xs)) };
}
