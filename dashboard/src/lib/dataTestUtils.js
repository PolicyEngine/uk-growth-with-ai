// Test helpers over the active data file (dataFlag.js), so a suite that
// loops over cells skips the ones not solved yet and still passes on the
// partial 2027 export. `atLeast` keeps such a loop from going vacuous: on
// the full 2028 file every cell is done, so a filter that drops them all is
// a broken test, not a pending one.
import S from '@/lib/activeData.js';

const RK = { dn: 'debt_neutral', fixed: 'fixed_spending', debt_neutral: 'debt_neutral', fixed_spending: 'fixed_spending' };
// The record of one cell under a rule ('common', 'dn', 'fixed' or the data
// file's rule keys), or undefined.
export const recordOf = (sid, arm, cl, rule = 'common', D = S) =>
  (RK[rule] ? D.rules?.[RK[rule]]?.results : D.results)?.[sid]?.[arm]?.[cl];
export const cellDone = (sid, arm, cl, rule = 'common', D = S) => recordOf(sid, arm, cl, rule, D)?.status === 'done';
// Is any cell of the scenario done under the rule?
export const scenarioDone = (sid, rule = 'common', D = S) => {
  const by = (RK[rule] ? D.rules?.[RK[rule]]?.results : D.results)?.[sid] ?? {};
  return Object.values(by).some((byCl) => Object.values(byCl ?? {}).some((r) => r?.status === 'done'));
};
// The cells of one sensitivity closure (e.g. 'zk0.5') that are done.
export const sensDone = (cl, sid, arm, D = S) => D.sensitivity?.[cl]?.results?.[sid]?.[arm]?.status === 'done';
// Is the whole file solved (every common, rule and sensitivity cell)?
export const allDone = (D = S) => D.solves_done === D.solves_total
  && Object.values(D.rules ?? {}).every((r) => Object.values(r.results ?? {}).every((a) => Object.values(a).every((c) => Object.values(c).every((x) => x.status === 'done'))))
  && Object.values(D.sensitivity ?? {}).every((r) => Object.values(r.results ?? {}).every((a) => Object.values(a).every((x) => x.status === 'done')));
// A loop's count of checked cells: at least one, and every one on a fully
// solved file. Returns the count for the caller's own expect().
export const atLeast = (n, total) => (allDone() ? n === total && n > 0 : n > 0);
