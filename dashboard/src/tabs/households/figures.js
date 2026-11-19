// The figures story part 3 and Explore > Households print, as strings in
// their printed formats, each listed once at its home. Used by the tests
// (part3.test.jsx, households.test.jsx); scripts/checks/part3.py rebuilds
// the same lists independently from aiStudy2425.json for the rendered dump.
import D from '@/data/aiStudy2425.json';
import { MINUS, fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtMillions, fmtPct1, fmtPctSigned1, fmtPence, fmtPp, fmtShare } from '@/tabs/story/part3/format.js';

// What the number check counts: £ amounts, pp, Gini points, pence, per
// cent, millions.
export const FIG = /−?£[\d,]+(?:\.\d+)?(?:bn)?|[+−]?\d+\.\d\dpp|[+−]\d+\.\d\d points|\b\d+p(?![A-Za-z])|[+−]?\d+(?:\.\d+)?%|\d+\.\d\dm/g;

// The Gini on its 0 to 100 scale (review round 1, R1-06): a change in
// points, "+1.76 points", and a level with one decimal, "30.3". The study
// prints Gini changes x100; "pp" would read as a percentage.
export const fmtGiniPts = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${v < 0 ? MINUS : '+'}${Math.abs(v).toFixed(2)} points` : '');
export const fmtGiniLevel = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '');
// the baseline level, 0 to 100 (the data's value_points; an older file
// carries the 0 to 1 value only)
export const giniLevel = (g) => g?.value_points ?? (Number.isFinite(g?.value) ? g.value * 100 : NaN);

const lad = (id) => D.ladder.find((r) => r.id === id);
const rule = (id) => D.rules.find((r) => r.id === id);
const pp = (id) => D.per_pound.find((r) => r.id === id);
const ch = (id) => D.channels.rows.find((r) => r.id === id);
const rk = (id) => D.rankings.find((r) => r.id === id).values;

export function storyFigures() {
  const H = D.headline;
  const J = D.per_pound_20.job_loss;
  return [
    // 1 the main case
    fmtMillions(H.central_displaced.value), fmtBn(H.central_cost.value), fmtPp(H.central_poverty.value), fmtPct1(D.baseline.absolute_bhc_pct.value),
    fmtPp(H.central_poverty_relative.value), fmtPct1(D.baseline.relative_bhc_pct.value), fmtGiniPts(H.central_gini.value), fmtBn(H.central_cost.sd),
    fmtPp(H.central_poverty_ahc.value),
    // 2 channels
    ...['displacement', 'wage', 'capital'].map((k) => fmtBn(ch(k).cost_bn)), fmtBn(D.channels.sum_bn), fmtBn2(D.channels.interaction_bn),
    // 3 deciles 2-10, and decile 1 under the three rankings in its caveat
    ...D.deciles.values.slice(1).map(fmtDecilePct), fmtDecilePct(D.deciles.values[0]), fmtDecilePct(rk('pre_pension')[0]),
    fmtDecilePct(rk('hbai_excl_large_ppc')[0]),
    // 4 what changes the answer: four stylised rules (exposure: step 1, restated as an axis label)
    ...['uniform', 'junior', 'compression'].flatMap((k) => [fmtBn(rule(k).cost_bn), fmtPp(rule(k).poverty_pp)]),
    // ... job loss against wage cuts
    fmtPence(J.min_p), fmtPence(J.max_p), fmtPence(J.government_p),
    // the gross pay each pair removes, in the margin panel's definition line once the build carries it
    ...(Number.isFinite(D.per_pound_20.gross_cut_bn) ? [fmtBn(D.per_pound_20.gross_cut_bn)] : []),
    fmtPence(pp('wage_cuts').government_p), fmtBn(lad('central_20').cost_bn), fmtPp(lad('central_20').poverty_pp), fmtBn(lad('wage_cuts').cost_bn),
    fmtPp(lad('wage_cuts').poverty_pp),
    // ... break-evens (take-up and JSA: Explore > Households since round 1)
    fmtPctSigned1(D.breakeven.wage.value_pct), `+${Math.round(D.breakeven.capital.value_pct)}%`,
    // 5 where a lost pound goes (the OBR-sized Sankey, back in the Story: item 19;
    // employer NI in the figure's notes)
    fmtBn(D.sankey.total.earnings_lost_bn), ...['disposable_bn', 'benefits_bn', 'tax_ni_bn', 'other_bn'].map((k) => fmtBn(D.sankey.total[k])),
    fmtShare(D.sankey.tax_benefit_share_pct), fmtBn(D.sankey.employer_ni_bn),
  ];
}

// A decile that gains under every ranking by less than this, in %, is
// said to move "by less than 0.2%" (review round 1, R1-03; item 24).
export const SMALL_DECILE_PCT = 0.2;
const smallGain = () => {
  const R = D.rankings;
  const gain = [...Array(10).keys()].filter((i) => R.every((r) => r.values[i] > 0));
  return gain.length > 0 && gain.every((i) => R.every((r) => Math.abs(r.values[i]) < SMALL_DECILE_PCT));
};

export function householdsFigures() {
  const X = D.displaced;
  const small = (v) => (Math.abs(v) < 0.05 ? '£0.1bn' : fmtBn(v));
  return [
    ...D.cost_components.rows.map((r) => small(r.cost_bn)),
    ...['central_20', 'takeup', 'takeup_jsa', 'wage_cuts'].map((k) => fmtPp(lad(k).gini_pp)),
    ...['takeup', 'takeup_jsa'].flatMap((k) => [fmtBn(lad(k).cost_bn), fmtPp(lad(k).poverty_pp)]),
    ...['obr', 'obr_takeup', 'obr_takeup_jsa'].flatMap((k) => [fmtBn(lad(k).cost_bn), fmtPp(lad(k).poverty_pp), fmtPp(lad(k).gini_pp)]),
    fmtBn(rule('klein_top_loaded').cost_bn),
    ...['uniform', 'junior', 'compression'].map((k) => fmtPp(rule(k).gini_pp)),
    fmtPp(rule('klein_top_loaded').poverty_pp), fmtPp(rule('klein_top_loaded').gini_pp),
    ...['job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'].flatMap((k) => [fmtPence(pp(k).government_p), fmtPence(pp(k).household_p)]),
    ...['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner'].map((k) => fmtShare(X[k].value)),
    ...['uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'].map((k) => fmtGbp(X[k].value)),
    ...D.policy.rows.flatMap((r) => [fmtBn(r.cost_bn), fmtPp(r.poverty_pp), fmtPp(r.gini_pp)]),
    // the rankings' threshold, not a result (rankingsWords)
    ...(smallGain() ? [`${SMALL_DECILE_PCT}%`] : []),
  ];
}

export const counts = (xs) => xs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});
