// Inputs and sources: every input row keeps its anchor (Method redesign,
// M3). The ids are typed in inputs.js, frozen at the slug each label had on
// 22 Nov 2026 under the 2028 set, so a reworded label or an added symbol
// cannot move a link from another page.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NavProvider } from '@/lib/nav.jsx';
import { INPUTS, ROWS } from './inputs.js';
import InputsPage, { InputsPart } from './InputsPage.jsx';

afterEach(cleanup);

const FROZEN = [
  'in-uk-low-output-at-fixed-inputs',
  'in-uk-low-labour-share-fall',
  'in-uk-central-output-at-fixed-inputs',
  'in-uk-central-labour-share-fall-headline',
  'in-uk-high-output-at-fixed-inputs',
  'in-uk-high-labour-share-fall',
  'in-korinek-et-al-substantial-us-labour-shar',
  'in-stress-test-gdp-held-at-the-obr-s-centra',
  'in-which-pairs-the-three-arms-the-headline',
  'in-the-scenario-s-ai-starts-as-a-surprise-o',
  'in-linear-four-year-ramp-to-full-weight',
  'in-perfect-foresight-after-the-surprise',
  'in-trend-productivity-growth',
  'in-2030-debt-gdp-target',
  'in-vintage',
  'in-demographics',
  'in-tax-functions',
  'in-k-share-of-the-extra-capital-firms-want-',
  'in-k-bound-no-foreign-capital',
  'in-d-foreign-share-of-new-government-debt',
  'in-world-interest-rate',
  'in-capital-share-labour-share-65',
  'in-elasticity-of-substitution',
  'in-depreciation',
  'in-households-80-ages-seven-earnings-groups',
  'in-employer-nics-as-a-payroll-tax',
  'in-common-rule-debt-rule-from-2036',
  'in-fixed-spending',
  'in-debt-neutral-transfers',
  'in-debt-repricing-speed-sensitivity',
  'in-solver-and-gate-tolerances',
  'in-employees-displaced-survivors-wage-rise',
  'in-rise-in-the-return-on-capital',
];

describe('Inputs and sources', () => {
  it('every input row has its frozen id, once, in both data sets', () => {
    expect(ROWS.map((r) => r.id)).toEqual(FROZEN);
    expect(INPUTS.map((r) => r.id)).toEqual(FROZEN);
    expect(new Set(FROZEN).size).toBe(FROZEN.length);
  });
  // push D, Q9.2c: every input group closed under a header with its count;
  // a closed group shows its key rows, the rest one click away
  it('groups the inputs, each closed with a count, key rows shown', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { container } = render(<InputsPart />);
    const groups = [...new Set(ROWS.map((r) => r.group))];
    expect(groups).toEqual(['Scenarios', 'Timing', 'Baseline', 'Model parameters', 'Fiscal rules and solver', 'Household study']);
    for (const g of groups) {
      const all = ROWS.filter((r) => r.group === g);
      expect(all.some((r) => r.key), g).toBe(true);
      const head = [...container.querySelectorAll('.mx-inputs-group th')].find((th) => th.textContent.startsWith(g));
      expect(head.textContent, g).toContain(`(${all.length})`);
      for (const r of all) expect(container.querySelector(`#${r.id}`).hidden, r.id).toBe(!r.key && !all.every((x) => x.key));
      const btn = head.querySelector('button.mx-group-toggle');
      if (btn) {
        expect(btn.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(btn);
        for (const r of all) expect(container.querySelector(`#${r.id}`).hidden, r.id).toBe(false);
      }
    }
    expect(container.textContent).toContain('Open a row for its arithmetic');
  });
  it('opens a closed input group when a link reveals one of its rows', async () => {
    const { act } = await import('@testing-library/react');
    const { container } = render(<InputsPart />);
    const r = ROWS.find((x) => !x.key && !ROWS.filter((y) => y.group === x.group).every((y) => y.key));
    expect(container.querySelector(`#${r.id}`).hidden).toBe(true);
    act(() => {
      container.querySelector(`#${r.id}`).dispatchEvent(new CustomEvent('reveal', { bubbles: true }));
    });
    expect(container.querySelector(`#${r.id}`).hidden).toBe(false);
  });
  // Method redesign, section 6: its own page, every old anchor on it
  it('is its own page, with the inputs anchors and a Sources section', () => {
    window.history.replaceState(null, '', '/?tab=method&sub=inputs');
    const { container } = render(
      <NavProvider>
        <InputsPage />
      </NavProvider>,
    );
    for (const id of ['m-inputs', 'm-inputs-head', 'inputs-table', 'in-sources', ...ROWS.map((r) => r.id)]) expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.querySelector('#m-inputs-head').closest('#m-inputs')).not.toBeNull();
    expect(container.querySelector('#in-sources').compareDocumentPosition(container.querySelector('.mx-uses')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const ev = [...container.querySelectorAll('#in-sources ~ * a, .mx-sources-line a')].find((a) => a.textContent === 'Evidence, Sources');
    expect(ev.getAttribute('href')).toMatch(/tab=method&sub=studies#sources$/);
  });
});
