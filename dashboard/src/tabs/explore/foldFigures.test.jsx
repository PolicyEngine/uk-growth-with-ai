// Figures that print only inside closed folds (so the tab dump does not see
// them) equal what the data file holds: the repricing ratio range on Public
// finances and the investment ranges in the zeta_K = 0.5 caveat.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import S from '@/lib/activeData.js';
import SensitivityTable from '@/tabs/explore/SensitivityTable.jsx';
import { REPRICE_RANGE } from '@/tabs/ai/FinancesSection.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { DATA_SET } from '@/lib/dataFlag.js';

// Figures pinned for one data file (a regression anchor); other files are
// checked against their own data only.
const PIN = { 2028: { n: 20, range: ['4', '66'] } }[DATA_SET];

afterEach(cleanup);
const L = S.years.indexOf(S.late_year);
const H = S.years.indexOf(S.headline_year);

describe('figures in folds', () => {
  it('repricing: the ratio range over every common-rule cell still above the forecast path', () => {
    const ratios = [];
    for (const arms of Object.values(S.results))
      for (const by of Object.values(arms))
        for (const cl of ['zk0.1', 'zk0']) {
          const r = by[cl];
          if (r?.status !== 'done') continue;
          const m = r.gaps.debt_gdp_pp[L];
          if (m > 0 && r.debt_gdp_pp_obr_repricing_late > 0) ratios.push((r.debt_gdp_pp_obr_repricing_late / m) * 100);
        }
    expect(ratios.length).toBeGreaterThan(0);
    expect(REPRICE_RANGE).toEqual([Math.min(...ratios), Math.max(...ratios)]);
    if (PIN) {
      expect(ratios.length).toBe(PIN.n);
      expect(REPRICE_RANGE.map((x) => x.toFixed(0))).toEqual(PIN.range);
    }
  });

  it('zeta_K = 0.5: the investment-surge caveat prints the data ranges', () => {
    const { container } = render(
      <NavProvider>
        <SensitivityTable />
      </NavProvider>,
    );
    // the caveats sit behind the card's "Sources and notes" button
    fireEvent.click(screen.getByRole('button', { name: 'Sources and notes' }));
    const done = Object.values(S.sensitivity['zk0.5'].results).filter((a) => a.tfp?.status === 'done');
    const t0 = document.body.textContent;
    if (!done.length) {
      // nothing solved at zeta_K = 0.5: no range, and the card says so
      expect(t0).not.toMatch(/above the forecast path in \d{4}/);
      expect(t0).toMatch(/not solved/);
      return;
    }
    const gaps = done.map((a) => a.tfp.gaps.I);
    const s28 = S.years.indexOf(S.surprise_year);
    const range = (xs) => `${Math.round(Math.min(...xs))}–${Math.round(Math.max(...xs))}%`;
    const t = document.body.textContent;
    expect(container.textContent).toBeTruthy();
    expect(t).toContain(`${range(gaps.map((g) => g[s28]))} above the forecast path in ${S.surprise_year}`);
    expect(t).toContain(`${range(gaps.map((g) => Math.max(...g.slice(s28, H))))} at its peak before ${S.headline_year}`);
    expect(t).toContain(`${range(gaps.map((g) => g[H]))} in ${S.headline_year}`);
  });
});
