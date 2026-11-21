import { describe, it, expect } from 'vitest';
import S from '@/lib/activeData.js';
import { financesFinding, debtTitle } from '@/tabs/ai/financesInfo.js';
import { taxSized, taxSizing } from '@/tabs/ai/FinancesSection.jsx';

const Y = S.years;
const H = S.headline_year;
const RK = { dn: 'debt_neutral', fixed: 'fixed_spending' };
const rec = (sid, arm, cl, rule) => (RK[rule] ? S.rules[RK[rule]].results?.[sid]?.[arm]?.[cl] : S.results[sid][arm][cl]);
const g = (sid, arm, cl, v, rule) => rec(sid, arm, cl, rule)?.gaps?.[v]?.[Y.indexOf(H)];
const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
const NAME = Object.fromEntries(S.arms.map((a) => [a.id, a.short || a.label]));

// Item 38 (push D, Q6e): the summary box's finding reads every headline-
// year sign, in words ("debt as a share of GDP"), the result first. The
// expected sentence is built here from the raw signs.
const WITH = { tfp: 'with automation and productivity gains', tz: 'with technology unchanged', ss: 'in the stress test' };
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0]);
const full = (s) => (s === 'on' ? 'on the forecast path' : `${s} the forecast path`);
const short = (s) => (s === 'on' ? 'on the path' : `${s} the path`);
function expectedLead(sides) {
  const ids = ['tfp', 'tz', 'ss'];
  const groups = ['below', 'above', 'on'].map((s) => ({ s, ids: ids.filter((a, i) => sides[i] === s) })).filter((x) => x.ids.length).sort((a, b) => a.ids.length - b.ids.length);
  const lead = `In ${H}, debt as a share of GDP is`;
  if (groups.length === 1) return `${lead} ${full(groups[0].s)} in every version`;
  if (groups.length === 2) return `${lead} ${full(groups[0].s)} only ${WITH[groups[0].ids[0]]}; it is ${short(groups[1].s)} in the other two versions`;
  const [a, ...rest] = groups;
  return `${lead} ${full(a.s)} ${WITH[a.ids[0]]}, ${and(rest.map((g) => `${g.s === 'on' ? 'on' : g.s} it ${WITH[g.ids[0]]}`))}`;
}
describe('item 38: the Public finances summary', () => {
  for (const sid of S.scenarios.map((s) => s.id))
    for (const rule of ['common', 'fixed', 'dn'])
      for (const closure of ['central', 'closed', 'both']) {
        const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
        it(`${sid}, ${rule}, ${closure}`, () => {
          const f = financesFinding(sid, closure, rule);
          const done = ['tfp', 'tz', 'ss'].every((a) => rec(sid, a, cl, rule)?.status === 'done');
          if (!done) return expect(f).toBeNull();
          if (rule === 'dn' && /stays on the forecast path/.test(debtTitle(sid, closure, rule))) {
            expect(f.lead).toBe(`Under debt-neutral transfers, transfers to households hold debt as a share of GDP on the forecast path from ${S.surprise_year + 1}; tax as a share of GDP still moves`);
            return expect(f.note).toBeNull();
          }
          const sides = ['tfp', 'tz', 'ss'].map((a) => side(g(sid, a, cl, 'debt_gdp_pp', rule)));
          expect(f.lead).toBe(expectedLead(sides));
          expect(f.lead).not.toMatch(/debt\/GDP/);
          // the note never repeats the finding's words
          if (f.note) {
            expect(rule).toBe('common');
            expect(f.note).toBe(`Whether debt is ${sides[0]} the path in ${H} depends on the productivity gain (compare “${NAME.tz}”).`);
          }
        });
      }
  it('today, UK central: below the path only with automation and productivity gains', () => {
    const sides = ['tfp', 'tz', 'ss'].map((a) => side(g('uk_central', a, 'zk0.1', 'debt_gdp_pp', 'common')));
    if (sides.join() === 'below,above,above') expect(financesFinding('uk_central', 'central', 'common').lead).toBe(`In ${H}, debt as a share of GDP is below the forecast path only with automation and productivity gains; it is above the path in the other two versions`);
  });
  it('the builder covers every arrangement of sides, not only the ones in the data', async () => {
    const { vi } = await import('vitest');
    const sideSets = [
      ['below', 'below', 'below'], ['above', 'above', 'above'], ['on', 'on', 'on'],
      ['below', 'above', 'above'], ['above', 'below', 'below'], ['above', 'above', 'below'], ['below', 'on', 'on'],
      ['below', 'above', 'on'], ['on', 'below', 'above'],
    ];
    const X = { below: -1, above: 1, on: 0 };
    for (const sides of sideSets) {
      vi.resetModules();
      vi.doMock('@/tabs/ai/surprise.js', async (orig) => {
        const m = await orig();
        return { ...m, gap: (sid, arm, cl, v, year, rule) => (v === 'debt_gdp_pp' && year === m.HEADLINE_YEAR ? X[sides[['tfp', 'tz', 'ss'].indexOf(arm)]] : m.gap(sid, arm, cl, v, year, rule)) };
      });
      const { debtLead } = await import('@/tabs/ai/financesInfo.js');
      expect(debtLead('uk_central', 'zk0.1', 'common'), sides.join()).toBe(expectedLead(sides));
      vi.doUnmock('@/tabs/ai/surprise.js');
    }
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
