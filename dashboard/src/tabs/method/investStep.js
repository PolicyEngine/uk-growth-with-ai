// M11 (m11-investment-step-fable.md, the short version): investment steps up
// again in the debt rule's first year (LATE_YEAR). One line for the
// default-rule card, every figure read from the data: UK central, A + P,
// some foreign capital, default rule. Shown only while the step and the debt
// gap that explains it are there (I_late > I_prev, D_late > 0), so it stays
// true when the data changes; otherwise null.
import { CENTRAL, LATE_YEAR, YEARS, gap, signed } from '@/tabs/ai/surprise.js';

export function investStepLine(read = (v, y) => gap('uk_central', 'tfp', CENTRAL, v, y), late = LATE_YEAR, years = YEARS) {
  const prev = years[years.indexOf(late) - 1];
  if (prev == null) return null;
  const iPrev = read('I', prev);
  const iLate = read('I', late);
  const dLate = read('debt_gdp_pp', late);
  if (![iPrev, iLate, dLate].every(Number.isFinite) || !(iLate > iPrev) || !(dLate > 0)) return null;
  return `Investment steps up again in ${late}, the debt rule’s first year. In UK central it is ${signed(iPrev, 1)}% above the forecast path in ${prev} and ${signed(iLate, 1)}% in ${late}. By then AI has left debt ${dLate.toFixed(1)}pp of GDP above that path, so the rule cuts government spending by more, and investment rises.`;
}
