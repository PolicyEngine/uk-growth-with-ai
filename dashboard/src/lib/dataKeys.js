// Year-suffixed keys in the data files: one accessor each, so a data swap
// (the 2027 shock) renames no key in the components. A key is found by its
// prefix, and its years and age are read from the key itself.
//   cohorts2028.json, per closure: profile_2028 (income shares by
//   earnings group in the shock year)
//   per cell: income_2028_35_age45 (income changes for a 45-year-old,
//   summed over the shock year to the last flow year)

const keyOf = (obj, prefix) => Object.keys(obj ?? {}).find((k) => k.startsWith(prefix)) ?? null;

// The earnings-group profile of one closure: { labour, capital, transfers,
// wealth_share, earnings_share, bequests }, each by group.
export const profileOf = (closure) => closure[keyOf(closure, 'profile_')];
export const profileYear = (closure) => Number(keyOf(closure, 'profile_')?.match(/^profile_(\d{4})/)?.[1]);

// The windowed income change of one cell, its age, and its years.
export const windowIncomeOf = (c) => c[keyOf(c, 'income_')];
export const windowIncomeAge = (c) => Number(keyOf(c, 'income_')?.match(/_age(\d+)$/)?.[1]);
