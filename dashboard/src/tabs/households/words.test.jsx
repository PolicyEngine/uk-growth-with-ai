import { describe, it, expect } from 'vitest';
import D from '@/data/aiStudy2425.json';
import { rulesWords, rankingsWords, costWords, takeupWords, marginWords, policyWords } from './HouseholdsExplore.jsx';
import { linkAiFiles } from '@/tabs/explore/sources.jsx';

// Every comparison the Households page states is computed from the data
// file, so these tests check the words against the data, not literal text.
const L = (id) => D.ladder.find((r) => r.id === id);

describe('households wording follows the data', () => {
  it('rules: every other rule at least as high as central only when true', () => {
    const c = D.rules.find((r) => r.id === 'exposure');
    const others = D.rules.filter((r) => r.id !== 'exposure');
    // T15: "least under the central rule" only when every other rule raises poverty more
    const more = others.every((r) => r.poverty_pp > c.poverty_pp);
    expect(rulesWords(D.rules).includes('least under the central rule')).toBe(more);
    if (!more) expect(rulesWords(D.rules).includes('by at least as much as centrally')).toBe(others.every((r) => r.poverty_pp >= c.poverty_pp));
    expect(rulesWords(D.rules).startsWith('Poverty rises under every rule')).toBe(D.rules.every((r) => r.poverty_pp > 0));
  });
  it('rankings: deciles named as changing sign are exactly those that do', () => {
    const flips = Array.from({ length: 10 }, (_, i) => i + 1).filter((d) => new Set(D.rankings.map((r) => Math.sign(r.values[d - 1]))).size > 1);
    const w = rankingsWords(D.rankings);
    if (!flips.length) expect(w).toMatch(/Every decile/);
    else for (const d of flips) expect(w).toContain(String(d));
  });
  it('cost lines, take-up, margin and policy follow the signs in the data', () => {
    const v = (id) => D.cost_components.rows.find((r) => r.id === id)?.cost_bn ?? 0;
    expect(costWords(D.cost_components.rows).startsWith('Lost')).toBe(v('other_income_tax') + v('employer_ni') + v('employee_ni') > -(v('dividend_tax') + v('savings_tax')));
    const c = L('central_20');
    const ok = ['takeup', 'takeup_jsa'].every((id) => L(id).cost_bn > c.cost_bn && L(id).poverty_pp < c.poverty_pp);
    expect(takeupWords().long.includes('cost more and raise poverty less')).toBe(ok);
    expect(marginWords() === 'job loss raises poverty more').toBe(c.poverty_pp > L('wage_cuts').poverty_pp);
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
