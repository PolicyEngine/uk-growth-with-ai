// Across scenarios (the matrix explorer): every cell is drawn, the cells not
// solved are holes, every solved cell prints its figure (the one in view
// with a marker), a cell sets the pickers, and the downloads carry every value.
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
    // the cell in view (UK central, central closure, common rule) prints its
    // figure as a muted reference (its home: the story's headline) and a marker
    const cur = container.querySelectorAll('#all-scenarios .ex-mx-cell.is-current');
    expect(cur).toHaveLength(1);
    expect(cur[0].textContent).toContain(fmt(cellValue('uk_central', 'tfp', 'zk0.1', 'common', 'Y'), 2, '%'));
    expect(cur[0].querySelector('.ex-mx-val.is-ref')).not.toBeNull();
    expect(cur[0].textContent).toContain('In view');
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
  it('with another rule picked, the story’s cells (main arm, common rule) print a muted reference figure', () => {
    window.history.replaceState(null, '', '/?tab=explore&rule=fixed&closure=both');
    const { container } = render(
      <NavProvider>
        <AllScenarios />
      </NavProvider>,
    );
    for (const k of ['uk_central|common|zk0.1', 'uk_central|common|zk0']) expect(container.querySelector(`[data-cell="${k}"] .ex-mx-val.is-ref`).textContent).toMatch(/\d\.\d\d%/);
    // the cells in view print their figure with the marker, not muted
    for (const k of ['uk_central|fixed|zk0.1', 'uk_central|fixed|zk0']) {
      const td = container.querySelector(`[data-cell="${k}"]`);
      expect(td.textContent).toMatch(/\d\.\d\d%In view/);
      expect(td.querySelector('.is-ref')).toBeNull();
    }
    expect(container.querySelector('[data-cell="korinek|common|zk0.1"]').textContent).toMatch(/\d\.\d\d%/);
  });
});

describe('Across scenarios: direction icons for every measure and arm', () => {
  it('GDP, GNI, pay rate x three arms, and the debt cells', () => {
    const { container } = at('tab=explore&s=korinek&rule=dn');
    const check = (root, arm, v) => {
      for (const td of root.querySelectorAll('.ex-mx-cell:not(.is-hole)')) {
        const dir = td.querySelector('[data-dir]');
        if (!dir) continue; // a cell whose figure has its home elsewhere
        const [sid, rule, cl] = td.dataset.cell.split('|');
        const x = cellValue(sid, arm, cl, rule, v);
        expect(dir.dataset.dir).toBe(x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on');
        expect(td.className.includes('is-gain')).toBe(x > 0.005);
        expect(td.className.includes('is-loss')).toBe(x < -0.005);
      }
    };
    const card = container.querySelector('#all-scenarios');
    for (const [arm, armName] of [['tfp', /Automation \+ productivity/], ['tz', /Technology unchanged/], ['ss', /Stress test/]]) {
      fireEvent.click([...card.querySelectorAll('[aria-label="Arm"] [role=radio]')].find((b) => armName.test(b.textContent)));
      for (const [v, name] of [['Y', 'GDP'], ['GNI', 'GNI'], ['w', 'Pay rate']]) {
        fireEvent.click([...card.querySelectorAll('[aria-label="Measure"] [role=radio]')].find((b) => b.textContent === name));
        check(card, arm, v);
      }
    }
    cleanup();
    window.history.replaceState(null, '', '/?tab=explore&sub=finances');
    const fin = render(
      <NavProvider>
        <AcrossDebt />
      </NavProvider>,
    );
    for (const td of fin.container.querySelectorAll('#debt-cells .ex-mx-cell:not(.is-hole)')) {
      const [sid, rule, cl] = td.dataset.cell.split('|');
      const x = cellValue(sid, 'tfp', cl, rule, 'debt_gdp_pp');
      expect(td.querySelector('[data-dir]')?.dataset.dir ?? 'on').toBe(x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on');
      // debt is drawn neutral: no gain or loss colour
      expect(/is-(gain|loss)/.test(td.className)).toBe(false);
    }
  });
});
