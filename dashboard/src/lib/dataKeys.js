// The one key-map for every name that carries a year: data keys, data
// files and the pinned documents a data set was built with. A data swap
// (the 2027 shock) then renames nothing in the components, and the probe in
// lib/claimsAndYears.test.jsx fails on any year-suffixed key or file name
// written anywhere else.
//
// Data keys:
//   surprise20xx.json, per cell: foreign_share_dK_<headline year> (the
//   foreign-owned share of the added capital in the headline year), 2031
//   in the 2028 set and 2030 in the 2027 set;
//   cohorts20xx.json, per closure: profile_<shock year> (income shares by
//   earnings group in the shock year); per cell:
//   income_<shock year>_<last flow year>_age45 (income changes for a
//   45-year-old, summed over the shock year to the last flow year).
// A key is built from the file's own year fields, or found by its prefix
// with its years and age read from the key itself.
import S from '@/lib/activeData.js';
import { DATA_SET } from '@/lib/dataFlag.js';
import NICS2028 from '@/tabs/explore/nics2028.json';
import CO2028 from '@/data/cohorts2028.json';
import V2028 from '@/data/site-versions.json';
import MF2028 from '@/data/methodFacts.json';
import S2028 from '@/data/surprise2028.json';
import S2027 from 'ugai-surprise2027'; // null unless the 2027 run has its file (R4-16)

const keyOf = (obj, prefix) => Object.keys(obj ?? {}).find((k) => k.startsWith(prefix)) ?? null;

// ---- surprise20xx.json -------------------------------------------------

// The foreign-owned share of the added capital in the headline year, %, of
// one result record; null when pending or absent.
export const foreignShareKey = (D = S) => `foreign_share_dK_${D.headline_year}`;
export const foreignShareOf = (rec, D = S) => {
  const x = rec?.[foreignShareKey(D)];
  return typeof x === 'number' ? x : null;
};

// ---- cohorts20xx.json --------------------------------------------------
// One cohort file for both sets until cohorts2027.json lands: its years
// are its own (COHORT_YEAR is 2028 under either flag), never SURPRISE_YEAR.
export const COHORTS = CO2028;
// The commit every cohort link and label names. Pinned, not read from the
// file's `source`: model-runs' regeneration (rerun/surprise-2027 8d4c082)
// records uk-growth-with-ai@79c006d, a commit not on GitHub, so push C keeps
// the published 2558375 (peer ruling). The swap removes the pin, and reads
// COHORTS.source again, once rerun/surprise-2027 is merged and pushed.
export const COHORT_SOURCE_COMMIT = '2558375';
export const COHORT_SOURCE = `${String(COHORTS.source ?? '').split('@')[0] || 'uk-growth-with-ai'}@${COHORT_SOURCE_COMMIT}`;
export const COHORT_YEAR = COHORTS.shock_year;
// Never mix years (review round 2, R2-03): any aggregate a cohort sentence
// cites comes from the surprise file of the cohort's own shock year, and
// while the two years differ each cohort view says so in one line.
const SURPRISE_BY_YEAR = { 2028: S2028, 2027: S2027 };
const COHORT_SURPRISE = () => (COHORT_YEAR === S.surprise_year ? S : SURPRISE_BY_YEAR[COHORT_YEAR]);
export const COHORTS_MATCH = () => COHORT_YEAR === S.surprise_year;
const RULE_FILE_KEY = { dn: 'debt_neutral', fixed: 'fixed_spending' };
// The gap of one cell in a year (default: its headline year) in the
// cohort's surprise file, or null.
export function cohortGap(sid, arm, cl, v, rule = 'common', year = null) {
  const D = COHORT_SURPRISE();
  const r = (RULE_FILE_KEY[rule] ? D.rules?.[RULE_FILE_KEY[rule]]?.results : D.results)?.[sid]?.[arm]?.[cl];
  const x = r?.status === 'done' ? r.gaps[v]?.[D.years.indexOf(year ?? D.headline_year)] : null;
  return typeof x === 'number' ? x : null;
}
export const cohortNotice = () =>
  COHORTS_MATCH() ? null : `Results by birth year are from the runs with the shock in ${COHORT_YEAR}; the ${S.surprise_year} runs are not exported yet.`;

// The earnings-group profile of one closure: { labour, capital, transfers,
// wealth_share, earnings_share, bequests }, each by group.
export const profileOf = (closure) => closure[keyOf(closure, 'profile_')];
export const profileYear = (closure) => Number(keyOf(closure, 'profile_')?.match(/^profile_(\d{4})/)?.[1]);

// Wealth by age in the shock year, per closure (wealth_by_age_<shock
// year>, added at rerun/surprise-2027 8d4c082): { age: [...],
// ratio_to_adult_mean: [...], ... }. Wealth rises to age 99: there is no
// peak at retirement. The ratio at one age, or null.
export const wealthByAgeOf = (closure) => closure?.[keyOf(closure, 'wealth_by_age_')] ?? null;
export function wealthRatioAt(closure, age) {
  const w = wealthByAgeOf(closure);
  const i = w?.age?.indexOf(age) ?? -1;
  const x = i >= 0 ? w.ratio_to_adult_mean?.[i] : null;
  return typeof x === 'number' ? x : null;
}

// The windowed income change of one cell, its age, and its years.
export const windowIncomeOf = (c) => c[keyOf(c, 'income_')];
export const windowIncomeAge = (c) => Number(keyOf(c, 'income_')?.match(/_age(\d+)$/)?.[1]);

// ---- files and documents of each data set ------------------------------
// The repository paths a data set was built with. null: not published for
// that set yet (the 2027 runs are local commits on rerun/surprise-2027,
// nothing pushed), so the 2028 target stands and the swap list names it
// (SET_MISSING). Never a guessed path: a link must open.
const SETS = {
  2028: {
    results: 'surprise2028.json',
    cohorts: 'cohorts2028.json',
    branch: 'rerun/surprise-2028',
    designDoc: 'docs/surprise_2028.md',
    sanityDoc: 'docs/results_sanity_2028.md',
    sanityRef: 'audit/sanity-2028-final',
    nicsFile: 'nics_2028.json',
    nicsPath: 'analysis/nics/nics_2028.json',
    nicsRef: 'bf5de33',
    outputDir: 'analysis/surprise/output',
    scenarioFile: (sid) => `uk_growth_with_ai/data/scenarios_surprise2028_${sid}.json`,
    // the commits and solve times each set was built with (R3-04)
    versionsFile: 'site-versions.json',
    methodFactsFile: 'methodFacts.json',
  },
  2027: {
    results: 'surprise2027.json',
    // cohorts2027.json comes after the full set (surprise2027-runs.md)
    cohorts: null,
    // local commits only (816a87e, 5dc7474): links open once pushed
    branch: 'rerun/surprise-2027',
    // the 2027 runs keep the one design note, docs/surprise_2028.md
    designDoc: null,
    sanityDoc: null,
    sanityRef: null,
    // nics_2027.json exists on rerun/surprise-2027, but its copy is not in
    // the dashboard (tabs/explore/nics2028.json is): the 2028 measure stands
    nicsFile: null,
    nicsPath: null,
    nicsRef: null,
    outputDir: 'analysis/surprise2027/output',
    // no scenarios_surprise2027_*.json at 816a87e
    scenarioFile: null,
    // the swap build writes these (review round 3, R3-04)
    versionsFile: null,
    methodFactsFile: null,
  },
};
// The active set's entry, each null field filled from the 2028 set.
// keyed by the data file's own shock year, so the paths always match the
// data shown (the flag only picks the file)
const ACTIVE_SET = SETS[S.surprise_year] ?? SETS[DATA_SET];
export const SET = Object.fromEntries(Object.entries(SETS[2028]).map(([k, v]) => [k, ACTIVE_SET[k] ?? v]));
// The fields the active set takes from 2028 (empty on the 2028 set).
export const SET_MISSING = Object.keys(SETS[2028]).filter((k) => ACTIVE_SET[k] == null);
export { DATA_SET };
// The data file's name, from the file itself (its shock year), so a page
// never names one file while showing another.
export const DATA_FILE = `surprise${S.surprise_year}.json`;
// Is the active set's own copy of a SET field in place (not the 2028
// fallback)? Pages that would print a 2028 commit or solve time beside the
// active data say what they have instead (R3-04).
export const setHas = (key) => !SET_MISSING.includes(key);
// The commits behind the results (site-versions.json) and the method facts
// (methodFacts.json): the 2028 files until the 2027 ones land.
export const VERSIONS = V2028;
export const METHOD_FACTS = MF2028;

// The NICs measure the Public finances causes chart uses (PolicyEngine UK,
// employer NICs on one basis; a copy of SET.nicsPath).
export const NICS = NICS2028;
