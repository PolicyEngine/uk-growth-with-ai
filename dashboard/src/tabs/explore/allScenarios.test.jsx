// Across scenarios (the matrix explorer): every cell is drawn, the cells not
// solved are holes, every solved cell prints its figure (the one in view
// with a marker), a cell sets the pickers, and the downloads carry every value.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { pickInPill } from '@/components/ui/pillTestUtils.js';
import AllScenarios, { AcrossDebt } from '@/tabs/explore/AllScenarios.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { fmt } from '@/tabs/ai/surprise.js';
import { cellsTable, cellValue, drivers, spreads, gate } from '@/tabs/explore/cells.js';
import { gap, HEADLINE_YEAR, foreignShareOf } from '@/tabs/ai/surprise.js';
import { DATA_SET } from '@/lib/dataFlag.js';

afterEach(cleanup);

// Counts and figures pinned to the 2028 file (the data these items were
// written against); on another file the counts come from its own data.
const PINNED = DATA_SET === 2028;
const SIDS = ['uk_low', 'uk_central', 'uk_high', 'korinek'];
const RULES = ['common', 'fixed', 'dn'];
const solved = (sid, cl, rule, v = 'Y', arm = 'tfp') => cellValue(sid, arm, cl, rule, v) != null;
const holes = (v = 'Y') => SIDS.flatMap((sid) => RULES.flatMap((rule) => ['zk0.1', 'zk0'].filter((cl) => !solved(sid, cl, rule, v)))).length;
// a rule solved for Korinek et al. at both closures: debt-neutral where it
// is (the 2028 file), else the common rule
const KR = solved('korinek', 'zk0', 'dn') && solved('korinek', 'zk0.1', 'dn') ? 'dn' : 'common';

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
    // the cells not solved are holes (2028: debt-neutral and fixed
    // spending for UK low and UK high, both foreign-capital cases)
    expect(container.querySelectorAll('#all-scenarios .ex-mx-cell.is-hole')).toHaveLength(holes());
    if (PINNED) expect(holes()).toBe(2 * 2 * 2);
    // the cell in view (UK central, some foreign capital, common rule) prints its
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
        if (x == null) expect(container.querySelector(`[data-cell="${sid}|common|${cl}"]`).className).toContain('is-hole');
        else expect(txt).toContain(fmt(x, 2, '%'));
      }
    // the sensitivity, as dot rows, moved here from Method
    expect(container.querySelector('#closure-sensitivity .ex-sd')).not.toBeNull();
  });

  it('with Closure = Both, both foreign-capital cases of the scenario in view are in view', () => {
    const { container } = at(`tab=explore&s=korinek&closure=both&rule=${KR}`);
    const cur = [...container.querySelectorAll('#all-scenarios .ex-mx-cell.is-current')].map((e) => e.dataset.cell);
    expect(cur.sort()).toEqual([`korinek|${KR}|zk0`, `korinek|${KR}|zk0.1`]);
  });

  it('a cell sets the pickers', () => {
    const { container } = at('tab=explore');
    const name = { dn: 'debt-neutral transfers', common: 'common fiscal rule' }[KR];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Korinek et al\\..*${name}, no foreign capital, GDP`) }));
    const p = new URLSearchParams(window.location.search);
    expect([p.get('s'), p.get('closure'), p.get('rule')]).toEqual(['korinek', 'closed', KR]);
    expect(container.querySelector(`[data-cell="korinek|${KR}|zk0"]`).className).toContain('is-current');
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
    expect(container.querySelectorAll('#debt-cells .ex-mx-cell.is-hole')).toHaveLength(holes('debt_gdp_pp'));
    if (PINNED) expect(holes('debt_gdp_pp')).toBe(8);
  });

  it('the download table covers every cell, with pending ones marked', () => {
    const t = cellsTable('tfp', 'Automation + productivity');
    expect(t.rows).toHaveLength(5 * 6 * 4);
    // every measure's row for each cell not solved (2028: 5 measures x 4
    // holes x 2 closures; NNI leads with GNI beside it, Maria's point 2)
    expect(t.rows.filter((r) => r[7] === 'not yet solved')).toHaveLength(5 * holes());
    if (PINNED) expect(holes()).toBe(4 * 2);
    expect(cellValue('uk_low', 'tfp', 'zk0.1', 'dn', 'Y')).toBeNull();
    expect(cellValue('uk_central', 'tfp', 'zk0.1', 'common', 'Y')).toBe(gap('uk_central', 'tfp', 'zk0.1', 'Y', HEADLINE_YEAR));
  });

  // item 37 (item-37-fable.md): like-for-like ranges, and "most" only for
  // a factor top on max and mean by 1.25x or more
  it('ranges are like for like: max and mean over the rows solved for every level', () => {
    const s = spreads('tfp', 'w');
    if (!PINNED) return;
    expect(s.scenario.rows).toBe(2);
    expect(s.closure.rows).toBe(8);
    expect(s.rule.rows).toBe(4);
    // the known near tie: A+P pay, scenario 1.485 against closure 1.481
    expect(s.scenario.max).toBeCloseTo(1.485, 2);
    expect(s.closure.max).toBeCloseTo(1.481, 2);
  });
  it('the gate: lead, tie, open and still', () => {
    const f = (a, b, c) => ({ scenario: { max: a[0], mean: a[1] }, closure: { max: b[0], mean: b[1] }, rule: { max: c[0], mean: c[1] } });
    expect(gate(f([4.48, 3.67], [1.92, 1.1], [0.3, 0.18]))).toEqual({ kind: 'lead', factors: ['scenario'] });
    // A+P pay (1.485 v 1.481 on max): a tie, larger max first
    expect(gate(f([1.485, 1.11], [1.481, 0.86], [0.15, 0.08]))).toEqual({ kind: 'tie', factors: ['scenario', 'closure'] });
    // Stress GNI (0.67 v 0.63): a 1.06x lead is not "most"
    expect(gate(f([0.67, 0.4], [0.63, 0.39], [0.06, 0.04]))).toEqual({ kind: 'tie', factors: ['scenario', 'closure'] });
    // top on max but not on mean: not a lead
    expect(gate(f([3, 1], [2, 1.5], [0.1, 0.1])).kind).toBe('tie');
    expect(gate(f([1, 1], [0.9, 0.9], [0.85, 0.85])).kind).toBe('open');
    expect(gate(f([0.008, 0.005], [0.004, 0.002], [0.007, 0.004]))).toEqual({ kind: 'still', factors: [] });
    // exactly 1.25x on both is a lead
    expect(gate(f([1.25, 1.25], [1, 1], [0.1, 0.1])).kind).toBe('lead');
  });
  it('prints the fable’s lines for each version on today’s data', () => {
    const t = (arm) => drivers(arm).map((d) => d.text);
    if (!PINNED) return;
    expect(t('tfp')).toEqual(['The scenario moves GDP, national income and GNI most', 'The scenario and the foreign-capital case move the pay rate by similar amounts']);
    expect(t('tz')).toEqual(['The foreign-capital case moves GDP and GNI most', 'The scenario moves national income and the pay rate most']);
    expect(drivers('ss', ['w', 'GNI', 'Y']).map((d) => d.text)).toEqual(['The scenario moves the pay rate most', 'The scenario and the foreign-capital case move GNI by similar amounts', 'GDP barely moves with any choice']);
    expect(drivers('tfp', ['debt_gdp_pp'])[0].text).toBe('The budget assumption and the scenario move debt/GDP by similar amounts');
    expect(drivers('tz', ['debt_gdp_pp'])[0].text).toBe('No one choice moves debt/GDP most');
    expect(drivers('ss', ['debt_gdp_pp'])[0].text).toBe('The budget assumption and the scenario move debt/GDP by similar amounts');
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
      // not solved: a hole, no figure
      if (!solved('uk_central', k.split('|')[2], 'fixed')) {
        expect(td.className).toContain('is-hole');
        expect(td.textContent).not.toMatch(/\d\.\d/);
        continue;
      }
      expect(td.textContent).toMatch(/\d\.\d\d% In view/);
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
      pickInPill(card, 'Version', armName);
      for (const [v, name] of [['Y', 'GDP'], ['GNI', 'GNI'], ['w', 'Pay rate']]) {
        pickInPill(card, 'Measure', name);
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

// Item 14 (checks-words2.md): the zeta_K 0.5 card keeps its definition,
// claims, flag and units behind one "More info" fold, closed; each figure
// in it is read from the data (headline year, surprise year, the flag).
describe('the zeta_K 0.5 card’s More info fold', () => {
  it('is closed by default, opens on click, and words the foreign share and the flag from the data', async () => {
    const S = (await import('@/lib/activeData.js')).default;
    const { I_FLAG_PCT, investmentFlags } = await import('@/tabs/explore/caveats.js');
    const { container } = at('tab=explore');
    const card = container.querySelector('#closure-sensitivity');
    const btn = card.querySelector('#sens-more .disclosure-toggle');
    expect(btn.textContent.trim()).toBe('More info');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    const body = card.querySelector('#sens-more .disclosure-content');
    expect(body.hidden).toBe(true);
    // nothing solved at zeta_K 0.5 (the partial 2027 export): the card says
    // so and prints no figure
    if (S.sensitivity['zk0.5'].results.uk_central.tfp.status !== 'done') {
      expect(card.textContent).toMatch(/not (?:yet )?solved/);
      expect(card.querySelector('.ex-sg')?.textContent ?? '').not.toMatch(/\d\.\d\d/);
      return;
    }
    // the grid reads alone, above the fold
    expect(card.querySelector('.ex-sg')).not.toBeNull();
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(body.hidden).toBe(false);
    const t = body.textContent;
    // the definition and the value are two lines, never run together
    const defs = [...body.querySelectorAll('.ex-sg-def')].map((p) => p.textContent);
    expect(defs[0]).toBe(`ζK = ${S.sensitivity['zk0.5'].zeta_K}: foreign investors supply half of the extra capital firms want, not half of added capital.`);
    const x = foreignShareOf(S.sensitivity['zk0.5'].results.uk_central.tfp);
    expect(defs[1]).toBe(`In ${HEADLINE_YEAR} about all of the added capital (${Math.round(x)}%) ends up foreign-owned.`);
    expect(t).not.toMatch(/new capital|further above the forecast path/);
    const fl = investmentFlags().filter((f) => f.cl === 'zk0.5');
    expect(t).toContain(`Investment jumps up to ${Math.round(fl[0].x)}% above the path in ${S.surprise_year}, beyond our +${I_FLAG_PCT}% plausibility check, so we treat this sensitivity as implausible.`);
    expect(body.querySelectorAll('#sens-flag a')).toHaveLength(2);
    // the comparison and settings rows last under How to read (item 36,
    // Card.jsx cardMore); the flag under Caveats; the unit is visible (item 42)
    const read = body.querySelector('[data-group="read"]');
    expect(read.querySelector('.ex-fin-more-head').textContent).toBe('How to read');
    expect(read.lastElementChild.textContent).toBe('Settings Spending follows GDP.');
    expect(body.querySelector('[data-group="caveats"] #sens-flag')).not.toBeNull();
    expect(card.querySelector('.card-unit [data-axis-title="y"]').textContent).toBe(`ζK = ${S.sensitivity['zk0.5'].zeta_K}, ${HEADLINE_YEAR}, % gap vs forecast path`);
    // item 42: the gated title; the pay-rate claim is not repeated in the fold
    expect(card.querySelector('.card-head h3').textContent).toBe('More foreign capital puts the main version’s pay rate above the path');
    expect(t).not.toMatch(/The pay rate is/);
    // item 39: the key line under the grid, visible with the fold closed
    const key = card.querySelector('.ex-sg-keyline');
    expect(key.textContent).toContain('sign differs from some foreign capital (ζK 0.1)');
    expect(key.textContent).toContain('higher / lower than with some foreign capital');
  });

  it('fracWord says "about all" within 0.02 of one, only when asked', async () => {
    const { fracWord } = await import('@/tabs/story/part2/caveats.js');
    expect(fracWord(1.004, { all: true })).toBe('about all');
    expect(fracWord(0.98, { all: true })).toBe('about all');
    expect(fracWord(1.02, { all: true })).toBe('about all');
    expect(fracWord(1.03, { all: true })).toBeNull();
    expect(fracWord(0.9, { all: true })).toBeNull();
    expect(fracWord(1.004)).toBeNull();
    expect(fracWord(0.5, { all: true })).toBe('about half');
  });
});
