// Figures that print only inside closed folds (so the tab dump does not see
// them) equal what the data file holds: the repricing ratio range on Public
// finances and the investment ranges in the zeta_K = 0.5 caveat.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import S from '@/data/surprise2028.json';
import SensitivityTable from '@/tabs/explore/SensitivityTable.jsx';
import { REPRICE_RANGE } from '@/tabs/ai/FinancesSection.jsx';
import { NavProvider } from '@/lib/nav.jsx';

afterEach(cleanup);
const L = S.years.indexOf(S.late_year);
const H = S.years.indexOf(S.headline_year);

describe('figures in folds', () => {
  it('repricing: the ratio range over every common-rule cell still above the path', () => {
    const ratios = [];
    for (const arms of Object.values(S.results))
      for (const by of Object.values(arms))
        for (const cl of ['zk0.1', 'zk0']) {
          const r = by[cl];
          if (r?.status !== 'done') continue;
          const m = r.gaps.debt_gdp_pp[L];
          if (m > 0 && r.debt_gdp_pp_obr_repricing_late > 0) ratios.push((r.debt_gdp_pp_obr_repricing_late / m) * 100);
        }
    expect(ratios.length).toBe(20);
    expect(REPRICE_RANGE).toEqual([Math.min(...ratios), Math.max(...ratios)]);
    expect(REPRICE_RANGE.map((x) => x.toFixed(0))).toEqual(['4', '66']);
  });

  it('zeta_K = 0.5: the investment-surge caveat prints the data ranges', () => {
    const { container } = render(
      <NavProvider>
        <SensitivityTable />
      </NavProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /About this table/ }));
    const gaps = Object.values(S.sensitivity['zk0.5'].results).map((a) => a.tfp.gaps.I);
    const s28 = S.years.indexOf(2028);
    const range = (xs) => `${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}%`;
    const t = container.textContent;
    expect(t).toContain(`${range(gaps.map((g) => g[s28]))} above the path in 2028`);
    expect(t).toContain(`${range(gaps.map((g) => Math.max(...g.slice(s28, H))))} at its peak before ${S.headline_year}`);
    expect(t).toContain(`${range(gaps.map((g) => g[H]))} in ${S.headline_year}`);
  });
});
