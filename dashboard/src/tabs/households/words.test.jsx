import { describe, it, expect } from 'vitest';
import D from '@/data/aiStudy2425.json';
import { rulesWords, rankingsWords, rankingsLead, costWords, takeupWords, perPoundWords, policyWords } from './HouseholdsExplore.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';
import { RULE_MARGIN_PP, ruleName, rulesGap } from './figures.js';

// Every comparison the Households page states is computed from the data
// file, so these tests check the words against the data, not literal text.
const L = (id) => D.ladder.find((r) => r.id === id);

describe('households wording follows the data', () => {
  it('rules: "least under the main rule" only when every other rule is at least the margin higher', () => {
    const c = D.rules.find((r) => r.id === 'exposure');
    const others = D.rules.filter((r) => r.id !== 'exposure');
    // T15 and Fable round 6 S4: "least" only when every other rule raises
    // poverty by at least RULE_MARGIN_PP more than the main rule
    const clear = others.every((r) => r.poverty_pp - c.poverty_pp >= RULE_MARGIN_PP);
    expect(rulesWords(D.rules).includes('least under the main rule')).toBe(clear);
    if (!clear && others.every((r) => r.poverty_pp >= c.poverty_pp)) {
      const near = others.filter((r) => r.poverty_pp - c.poverty_pp < RULE_MARGIN_PP);
      for (const r of near) expect(rulesWords(D.rules)).toContain(ruleName(r.id).toLowerCase());
      expect(rulesWords(D.rules)).toContain(`which are within ${rulesGap(D.rules)}`);
    }
    expect(rulesWords(D.rules).startsWith('Poverty rises under every displacement rule')).toBe(D.rules.every((r) => r.poverty_pp > 0));
  });
  it('rules: the current data names the main and ages 16 to 24 rules, 0.03pp apart', () => {
    // pins aiStudy2425.json as committed: main 2.4016pp, ages 16 to 24 2.4317pp
    expect(rulesWords(D.rules)).toBe('Poverty rises under every displacement rule, lowest under the main and ages 16 to 24 rules, which are within 0.03pp');
  });
  it('rules: a clear margin keeps "least under the main rule"; a lower rule is counted', () => {
    const r = (id, poverty_pp) => ({ id, poverty_pp });
    expect(rulesWords([r('exposure', 2), r('junior', 2.1), r('uniform', 2.5)])).toBe('Poverty rises under every displacement rule, least under the main rule');
    expect(rulesWords([r('exposure', 2), r('junior', 2.04), r('uniform', 2.08), r('compression', 3)])).toBe('Poverty rises under every displacement rule, lowest under the main, ages 16 to 24 and uniform rules, which are within 0.08pp');
    expect(rulesWords([r('exposure', 2), r('junior', 1.9), r('uniform', 2.5)])).toBe('Poverty rises under every displacement rule; 1 of the other 2 raise it at least as much as the main rule');
  });
  it('rankings: deciles named as losing and changing sign are exactly those that do', () => {
    const at = (d) => D.rankings.map((r) => r.values[d - 1]);
    const all = Array.from({ length: 10 }, (_, i) => i + 1);
    const flips = all.filter((d) => new Set(at(d).map(Math.sign)).size > 1);
    const neg = all.filter((d) => at(d).every((v) => v < 0));
    const w = rankingsWords(D.rankings);
    if (!flips.length && !neg.length) expect(w).toMatch(/Every decile/);
    for (const d of flips) expect(w).toMatch(new RegExp(`decile ${d} changes sign|deciles .*\\b${d}\\b.* change sign`));
    if (neg.length) expect(w).toMatch(/^Deciles? .* lose|^Decile \d+ loses/);
    // a decile positive under all three: "moves by less than 0.2%" when small in every ranking, never "gains"
    const pos = all.filter((d) => at(d).every((v) => v > 0));
    const lead = rankingsLead(D.rankings);
    if (!pos.length) expect(lead).toBeNull();
    else if (pos.every((d) => at(d).every((v) => Math.abs(v) < 0.2))) expect(lead).toMatch(/by less than 0\.2% under each ranking\.$/);
    else expect(lead).toMatch(/gains? under all three rankings\.$/);
  });
  it('cost lines, take-up, margin and policy follow the signs in the data', () => {
    const v = (id) => D.cost_components.rows.find((r) => r.id === id)?.cost_bn ?? 0;
    expect(costWords(D.cost_components.rows).startsWith('Lost')).toBe(v('other_income_tax') + v('employer_ni') + v('employee_ni') > -(v('dividend_tax') + v('savings_tax')));
    const c = L('central_20');
    const t = L('takeup');
    const j = L('takeup_jsa');
    const ok = c.cost_bn < t.cost_bn && t.cost_bn < j.cost_bn && c.poverty_pp > t.poverty_pp && t.poverty_pp > j.poverty_pp;
    expect(takeupWords().includes('cost more and raise poverty less than the main case')).toBe(ok);
    const p = (id) => D.per_pound.find((r) => r.id === id).government_p;
    expect(perPoundWords().includes('wage cuts cost the public finances more')).toBe(p('wage_cuts') > D.per_pound_20.job_loss.government_p);
    const main = D.policy.rows.filter((r) => r.family === 'exposure');
    expect(policyWords(main).startsWith('Each response lowers')).toBe(main.every((r) => r.poverty_pp < 0 && r.gini_pp < 0));
  });
  it('result file names link to the study at the data file commit', () => {
    const parts = linkAiFiles('results/low.json: x');
    const a = parts.find((p) => typeof p !== 'string');
    expect(a.props.href).toContain(D.source.files_base_url ?? D.source.commit);
    expect(a.props.href.endsWith('results/low.json')).toBe(true);
  });
});
