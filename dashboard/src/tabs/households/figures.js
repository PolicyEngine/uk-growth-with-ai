// The figures story part 3 and Explore > Households print, as strings in
// their printed formats, each listed once at its home. Used by the tests
// (part3.test.jsx, households.test.jsx); scripts/checks/part3.py rebuilds
// the same lists independently from aiStudy2425.json for the rendered dump.
import D from '@/data/aiStudy2425.json';
import { fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtMillions, fmtPct1, fmtPctSigned1, fmtPence, fmtPp, fmtShare } from '@/tabs/story/part3/format.js';

// What the number check counts: £ amounts, pp, pence, per cent, millions.
export const FIG = /−?£[\d,]+(?:\.\d+)?(?:bn)?|[+−]?\d+\.\d\dpp|\b\d+p(?![A-Za-z])|[+−]?\d+(?:\.\d+)?%|\d+\.\d\dm/g;

const lad = (id) => D.ladder.find((r) => r.id === id);
const rule = (id) => D.rules.find((r) => r.id === id);
const pp = (id) => D.per_pound.find((r) => r.id === id);
const ch = (id) => D.channels.rows.find((r) => r.id === id);
const rk = (id) => D.rankings.find((r) => r.id === id).values;

export function storyFigures() {
  const H = D.headline;
  const S = D.sankey;
  const J = D.per_pound_20.job_loss;
  return [
    // 1 the central case
    fmtMillions(H.central_displaced.value), fmtBn(H.central_cost.value), fmtPp(H.central_poverty.value), fmtPct1(D.baseline.absolute_bhc_pct.value),
    fmtPp(H.central_poverty_relative.value), fmtPct1(D.baseline.relative_bhc_pct.value), fmtPp(H.central_gini.value), fmtBn(H.central_cost.sd),
    fmtPp(H.central_poverty_ahc.value),
    // 2 channels
    ...['displacement', 'wage', 'capital'].map((k) => fmtBn(ch(k).cost_bn)), fmtBn(D.channels.sum_bn), fmtBn2(D.channels.interaction_bn),
    // 3 the Sankey (wide labels) and its card
    fmtBn(S.total.earnings_lost_bn), ...['disposable_bn', 'benefits_bn', 'tax_ni_bn', 'other_bn'].map((k) => fmtBn(S.total[k])),
    fmtShare(S.tax_benefit_share_pct), fmtBn(S.employer_ni_bn),
    // 4 deciles 2-10, and decile 1 under the three rankings in its caveat
    ...D.deciles.values.slice(1).map(fmtDecilePct), fmtDecilePct(D.deciles.values[0]), fmtDecilePct(rk('pre_pension')[0]),
    fmtDecilePct(rk('hbai_excl_large_ppc')[0]),
    // 5 four stylised rules (exposure: step 1)
    ...['uniform', 'junior', 'compression'].map((k) => fmtBn(rule(k).cost_bn)),
    // 6 job loss against wage cuts
    fmtPence(J.min_p), fmtPence(J.max_p), fmtPence(J.government_p), fmtPence(pp('wage_cuts').household_p), fmtPence(D.per_pound_20.wage_cuts_employer_ni_p),
    fmtPence(pp('wage_cuts').government_p), fmtBn(lad('central_20').cost_bn), fmtPp(lad('central_20').poverty_pp), fmtBn(lad('wage_cuts').cost_bn),
    fmtPp(lad('wage_cuts').poverty_pp),
    // 7 break-evens (take-up and JSA: Explore > Households since round 1)
    fmtPctSigned1(D.breakeven.wage.value_pct), `+${Math.round(D.breakeven.capital.value_pct)}%`,
  ];
}

export function householdsFigures() {
  const X = D.displaced;
  const small = (v) => (Math.abs(v) < 0.05 ? '£0.1bn' : fmtBn(v));
  return [
    ...D.cost_components.rows.map((r) => small(r.cost_bn)),
    ...['central_20', 'takeup', 'takeup_jsa', 'wage_cuts'].map((k) => fmtPp(lad(k).gini_pp)),
    ...['takeup', 'takeup_jsa'].flatMap((k) => [fmtBn(lad(k).cost_bn), fmtPp(lad(k).poverty_pp)]),
    ...['obr', 'obr_takeup', 'obr_takeup_jsa'].flatMap((k) => [fmtBn(lad(k).cost_bn), fmtPp(lad(k).poverty_pp), fmtPp(lad(k).gini_pp)]),
    fmtBn(rule('klein_top_loaded').cost_bn),
    ...['uniform', 'junior', 'compression', 'klein_top_loaded'].flatMap((k) => [fmtPp(rule(k).poverty_pp), fmtPp(rule(k).gini_pp)]),
    ...['job_loss', 'job_loss_takeup', 'job_loss_takeup_jsa'].flatMap((k) => [fmtPence(pp(k).government_p), fmtPence(pp(k).household_p)]),
    ...['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner'].map((k) => fmtShare(X[k].value)),
    ...['uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed'].map((k) => fmtGbp(X[k].value)),
    ...D.policy.rows.flatMap((r) => [fmtBn(r.cost_bn), fmtPp(r.poverty_pp), fmtPp(r.gini_pp)]),
  ];
}

export const counts = (xs) => xs.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});
