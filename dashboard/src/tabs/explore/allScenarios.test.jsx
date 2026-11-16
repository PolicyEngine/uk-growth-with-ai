// Across scenarios (the matrix explorer): every cell is drawn, the cells not
// solved are holes, the cell in view prints no figure (its home is the
// charts below), a cell sets the pickers, and the downloads carry every value.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { fmt } from '@/tabs/ai/surprise.js';
import { cellsTable, cellValue, driverWords, spreads } from '@/tabs/explore/cells.js';
import { gap, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';

afterEach(cleanup);

const at = (query) => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <AllScenarios />
    </NavProvider>,
  );
};

describe('All scenarios', () => {
  it('draws every cell: solved ones print their value, pending ones are holes, the cell in view links', () => {
    const { container } = at('tab=explore');
    const cells = container.querySelectorAll('#all-scenarios .ex-mx-cell');
    // 4 scenarios x 3 rules x 2 closures
    expect(cells).toHaveLength(4 * 6);
    // debt-neutral and fixed spending: UK low and UK high not solved, both closures
    expect(container.querySelectorAll('#all-scenarios .ex-mx-cell.is-hole')).toHaveLength(2 * 2 * 2);
    // the cell in view (UK central, central closure, common rule) prints no figure
    const cur = container.querySelectorAll('#all-scenarios .ex-mx-cell.is-current');
    expect(cur).toHaveLength(1);
    expect(cur[0].textContent).not.toMatch(/\d\.\d\d/);
    // every other solved cell prints its GDP gap, once
    const txt = container.querySelector('#all-scenarios .ex-mx').textContent;
    for (const sid of ['uk_low', 'uk_high', 'korinek'])
      for (const cl of ['zk0.1', 'zk0']) {
        const x = cellValue(sid, 'tfp', cl, 'common', 'Y');
        expect(txt).toContain(fmt(x, 2, '%'));
      }
    // the sensitivity, as dot rows, moved here from Method
    expect(container.querySelector('#closure-sensitivity .ex-sd')).not.toBeNull();
  });

  it('with Closure = Both, both closures of the scenario in view are in view', () => {
    const { container } = at('tab=explore&s=korinek&closure=both&rule=dn');
    const cur = [...container.querySelectorAll('#all-scenarios .ex-mx-cell.is-current')].map((e) => e.dataset.cell);
    expect(cur.sort()).toEqual(['korinek|dn|zk0', 'korinek|dn|zk0.1']);
  });

  it('a cell sets the pickers', () => {
    const { container } = at('tab=explore');
    fireEvent.click(screen.getByRole('button', { name: /^Korinek et al\..*debt-neutral transfers, closed capital, GDP/ }));
    const p = new URLSearchParams(window.location.search);
    expect([p.get('s'), p.get('closure'), p.get('rule')]).toEqual(['korinek', 'closed', 'dn']);
    expect(container.querySelector('[data-cell="korinek|dn|zk0"]').className).toContain('is-current');
  });

  it('the cell direction icons follow the signs', () => {
    const { container } = at('tab=explore');
    for (const td of container.querySelectorAll('#all-scenarios .ex-mx-cell:not(.is-hole):not(.is-current)')) {
      const [sid, rule, cl] = td.dataset.cell.split('|');
      const x = cellValue(sid, 'tfp', cl, rule, 'Y');
      expect(td.querySelector('[data-dir]').dataset.dir).toBe(x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on');
    }
  });

  it('Public finances: debt/GDP in every solved cell, the one in view too', () => {
    window.history.replaceState(null, '', '/?tab=explore&sub=finances');
    const { container } = render(
      <NavProvider>
        <AcrossDebt />
      </NavProvider>,
    );
    const txt = container.querySelector('#debt-cells .ex-mx').textContent;
    expect(container.querySelector('#fin-across')).not.toBeNull();
    expect(txt).toContain(fmt(cellValue('uk_central', 'tfp', 'zk0.1', 'common', 'debt_gdp_pp'), 2, 'pp'));
    expect(container.querySelectorAll('#debt-cells .ex-mx-cell.is-hole')).toHaveLength(8);
  });

  it('the download table covers every cell, with pending ones marked', () => {
    const t = cellsTable('tfp', 'Automation + productivity');
    expect(t.rows).toHaveLength(4 * 6 * 4);
    expect(t.rows.filter((r) => r[7] === 'pending')).toHaveLength(4 * 4 * 2);
    expect(cellValue('uk_low', 'tfp', 'zk0.1', 'dn', 'Y')).toBeNull();
    expect(cellValue('uk_central', 'tfp', 'zk0.1', 'common', 'Y')).toBe(gap('uk_central', 'tfp', 'zk0.1', 'Y', HEADLINE_YEAR));
  });

  it('says which choice moves each measure most, from the spreads', () => {
    const s = spreads('tfp', 'Y');
    const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
    expect(driverWords('tfp').toLowerCase()).toContain(`the ${top === 'closure' ? 'capital closure' : top === 'rule' ? 'fiscal rule' : 'scenario'} moves gdp`);
  });
});

describe('Across scenarios: each fact once', () => {
  it('with another rule picked, the story’s cells (main arm, common rule) print no figure', () => {
    window.history.replaceState(null, '', '/?tab=explore&rule=fixed&closure=both');
    const { container } = render(
      <NavProvider>
        <AllScenarios />
      </NavProvider>,
    );
    for (const k of ['uk_central|common|zk0.1', 'uk_central|common|zk0', 'uk_central|fixed|zk0.1', 'uk_central|fixed|zk0'])
      expect(container.querySelector(`[data-cell="${k}"]`).textContent).not.toMatch(/\d\.\d\d/);
    expect(container.querySelector('[data-cell="korinek|common|zk0.1"]').textContent).toMatch(/\d\.\d\d%/);
  });
});
