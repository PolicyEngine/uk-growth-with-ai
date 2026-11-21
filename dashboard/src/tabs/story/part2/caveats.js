// Part 2's caveats (economics review, round 1), in words read from the data
// files for the scenario and closure in view. Each fact they qualify has its
// home elsewhere (Explore, Method, Who gains), so they print no figure:
// shares become "about half", counts "one in six", and each line links the
// figure's home. Every function returns null when a solve is pending or the
// caveat does not hold for the cell in view.
import S from '@/lib/activeData.js';
import { COHORTS as C } from '@/lib/dataKeys.js';
import { YEARS, HEADLINE_YEAR, SURPRISE_YEAR, CENTRAL, BOUND, gap, payLine, result } from '@/tabs/ai/surprise.js';
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
