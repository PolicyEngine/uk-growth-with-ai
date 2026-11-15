// All scenarios: every cell is drawn, the cells not solved are named, no
// figure is printed outside the sensitivity table, and the tooltips and
// downloads carry each cell's value.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AllScenarios from '@/tabs/explore/AllScenarios.jsx';
import { cellsTable, cellValue, driverWords, spreads } from '@/tabs/explore/cells.js';
import { gap, HEADLINE_YEAR } from '@/tabs/ai/surprise.js';

afterEach(cleanup);

describe('All scenarios', () => {
  it('draws every solved cell and names the pending ones', () => {
    const { container } = render(<AllScenarios />);
    // 4 measures x (common: 4 scenarios x 2 closures + two other rules: 2 x 2 x 2)
    expect(container.querySelectorAll('#all-scenarios .as-mark')).toHaveLength(4 * (8 + 8));
    expect(container.querySelectorAll('#all-scenarios .as-band')).toHaveLength(4 * 2);
    expect(container.querySelector('#all-scenarios').textContent).toContain('UK low and UK high: not solved under this rule');
    // values only in tooltips: the card body prints no signed figure
    expect(container.querySelector('#all-scenarios .as-grid').textContent).not.toMatch(/[+−]\d+\.\d\d/);
    // the sensitivity table moved here from Method
    expect(container.querySelector('#closure-sensitivity')).not.toBeNull();
  });

  it('a mark tooltip gives the cell and its value', () => {
    render(<AllScenarios />);
    const x = gap('uk_central', 'tfp', 'zk0.1', 'Y');
    const mark = screen.getAllByLabelText(/^UK central, common rule, central closure, GDP:/)[0];
    fireEvent.focus(mark);
    expect(screen.getByRole('tooltip').textContent).toContain(`${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}%`);
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
