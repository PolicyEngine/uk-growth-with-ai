import { describe, it, expect } from 'vitest';
import S from '@/data/surprise2028.json';
import { financesFinding } from '@/tabs/ai/financesInfo.js';
import { taxSized, taxSizing } from '@/tabs/ai/FinancesSection.jsx';

const Y = S.years;
const H = S.headline_year;
const RK = { dn: 'debt_neutral', fixed: 'fixed_spending' };
const rec = (sid, arm, cl, rule) => (RK[rule] ? S.rules[RK[rule]].results?.[sid]?.[arm]?.[cl] : S.results[sid][arm][cl]);
const g = (sid, arm, cl, v, rule) => rec(sid, arm, cl, rule)?.gaps?.[v]?.[Y.indexOf(H)];
const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
const NAME = Object.fromEntries(S.arms.map((a) => [a.id, a.short || a.label]));

// Item 38: the page's one Finding reads every headline-year sign
describe('item 38: Public finances Finding', () => {
  for (const sid of S.scenarios.map((s) => s.id))
    for (const rule of ['common', 'fixed', 'dn'])
      for (const closure of ['central', 'closed']) {
        const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
        it(`${sid}, ${rule}, ${closure}`, () => {
          const f = financesFinding(sid, closure, rule);
          if (!rec(sid, 'tfp', cl, rule) || rec(sid, 'tfp', cl, rule).status !== 'done') return expect(f).toBeNull();
          if (rule === 'dn') return expect(f.lead).toMatch(/debt-neutral/);
          const sides = ['tfp', 'tz', 'ss'].map((a) => side(g(sid, a, cl, 'debt_gdp_pp', rule)));
          if (new Set(sides).size === 1) expect(f.lead).toContain(`${sides[0]} the path in every version`);
          else {
            const only = ['below', 'above', 'on'].map((s) => ({ s, ids: ['tfp', 'tz', 'ss'].filter((a, i) => sides[i] === s) })).filter((x) => x.ids.length).sort((a, b) => a.ids.length - b.ids.length)[0];
            expect(f.lead).toContain(`${only.s} the path only in ${only.ids.map((a) => (a === 'ss' ? `the ${NAME[a]}` : NAME[a])).join(' and ')}`);
          }
        });
      }
  it('today, UK central: below the path only for Automation + productivity', () => {
    expect(financesFinding('uk_central', 'central', 'common').lead).toBe(`In ${H}, debt/GDP is below the path only in Automation + productivity; Technology unchanged and the Stress test are above the path.`);
  });
});

// Item 40 (item-40-fable.md): the sized comparison, from the printed values
describe('item 40: the tax-gap sizing', () => {
  it('reads 0.11–0.18pp for UK central today, with the approximation stated elsewhere', () => {
    const model = g('uk_central', 'tfp', 'zk0.1', 'tax_gdp_pp', 'common');
    const ls = g('uk_central', 'tfp', 'zk0.1', 'labour_share_pp', 'common');
    expect(taxSized(model, ls).text).toBe(`Scaled with OBR rates, revenue falls 0.11–0.18pp of GDP more than in the model by ${H}`);
    const z = taxSizing(model, ls);
    expect(z.rg.map((x) => x.toFixed(2))).toEqual(['0.07', '0.13']);
  });
  it('never words it as a counterfactual run, nor starts with "So"', () => {
    for (const sid of S.scenarios.map((s) => s.id))
      for (const rule of ['common', 'fixed', 'dn']) {
        const model = g(sid, 'tfp', 'zk0.1', 'tax_gdp_pp', rule);
        const ls = g(sid, 'tfp', 'zk0.1', 'labour_share_pp', rule);
        const t = taxSized(model ?? null, ls ?? null);
        if (!t) continue;
        expect(t.text).not.toMatch(/^So|would fall/);
        expect(t.kind).toBe('more');
      }
  });
  it('the fallbacks', () => {
    expect(taxSized(0.05, -1.6).kind).toBe('up');
    expect(taxSized(-0.5, -1.6).kind).toBe('within');
    expect(taxSized(null, -1.6)).toBeNull();
  });
});
