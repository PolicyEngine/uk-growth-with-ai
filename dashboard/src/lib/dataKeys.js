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
import { DATA_SET, DATA_FILE } from '@/lib/dataFlag.js';
import NICS2028 from '@/tabs/explore/nics2028.json';
import CO2028 from '@/data/cohorts2028.json';

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
export const COHORT_YEAR = COHORTS.shock_year;

// The earnings-group profile of one closure: { labour, capital, transfers,
// wealth_share, earnings_share, bequests }, each by group.
export const profileOf = (closure) => closure[keyOf(closure, 'profile_')];
export const profileYear = (closure) => Number(keyOf(closure, 'profile_')?.match(/^profile_(\d{4})/)?.[1]);

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
    // the debt rule's first year in run periods (OG-UK tG1, from the shock year)
    tg1: 10,
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
    tg1: 9,
  },
};
// The active set's entry, each null field filled from the 2028 set.
export const SET = Object.fromEntries(Object.entries(SETS[2028]).map(([k, v]) => [k, SETS[DATA_SET][k] ?? v]));
// The fields the active set takes from 2028 (empty on the 2028 set).
export const SET_MISSING = Object.keys(SETS[2028]).filter((k) => SETS[DATA_SET][k] == null);
export { DATA_SET, DATA_FILE };

// The NICs measure the Public finances causes chart uses (PolicyEngine UK,
// employer NICs on one basis; a copy of SET.nicsPath).
export const NICS = NICS2028;
