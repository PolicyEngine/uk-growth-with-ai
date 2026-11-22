// Scenarios: every direction arrow on the arm cards follows the sign of the
// value its words describe, for each scenario and closure (the cards show UK
// central; the helpers are checked for all four).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SCENARIOS, CLOSURES, fixedInputVsTz, gap } from '@/tabs/ai/surprise.js';
import { ArmsPart, InputsPart, ScenariosPart, TimingPart, stressMove, tzGdpMove, stressItems, tzGdpItems } from './ScenariosSection.jsx';
import MethodTab from './MethodTab.jsx';

afterEach(cleanup);

const sign = (x) => (x == null ? null : Math.abs(x) < 0.005 ? 0 : Math.sign(x));

describe('Scenarios direction icons', () => {
  it('the stress test arrow follows the sign of output at fixed inputs against technology unchanged', () => {
    for (const s of SCENARIOS) {
      for (const cl of CLOSURES) {
        const x = fixedInputVsTz(s.id, 'ss', cl);
        const m = stressMove(x);
        if (x == null) {
          expect(m).toBeNull();
          continue;
        }
        expect(m.icon, `${s.id} ${cl}`).toBe(x < 0 ? 'gapDown' : 'gapUp');
        expect(m.word, `${s.id} ${cl}`).toBe(x < 0 ? 'falls' : 'rises slightly');
      }
      for (const it of stressItems(s.id)) expect(it.text).toContain(stressMove(fixedInputVsTz(s.id, 'ss', it.key)).word.replace(' slightly', ''));
    }
  });

  it('the technology-unchanged GDP arrow follows the sign of the GDP gap', () => {
    for (const s of SCENARIOS) {
      for (const cl of CLOSURES) {
        const x = gap(s.id, 'tz', cl, 'Y');
        const m = tzGdpMove(x);
        const want = { null: 'caveat', 0: 'onPath', 1: 'gapUp', '-1': 'gapDown' }[sign(x)];
        expect(m.icon, `${s.id} ${cl}`).toBe(want);
      }
      for (const it of tzGdpItems(s.id)) expect(it.text).toContain(tzGdpMove(gap(s.id, 'tz', it.key, 'Y')).word);
    }
  });

  it('renders the arm cards with their items and keeps the anchors', () => {
    const { container } = render(
      <>
        <ScenariosPart />
        <ArmsPart />
        <TimingPart />
        <InputsPart />
      </>,
    );
    for (const id of ['m-scenarios', 's-scenarios', 'm-arms', 's-arms', 'm-timing', 's-timing', 'arm-tfp', 'arm-tz', 'arm-ss', 'm-jump', 'scenario-map', 'timing', 'inputs-table'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.textContent).toContain('A stress test, not a bound or a forecast');
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
  // push D, Q9.2: the reading order, every old anchor kept
  it('Method reads in Vahid’s order, and every anchor other pages link to lands', () => {
    const { container } = render(<MethodTab />);
    const heads = [...container.querySelectorAll('.page-body > section > .section-heading h2')].map((h) => h.textContent);
    expect(heads).toEqual(['Overview', 'What AI changes', 'Inputs and sources', 'Closures and income measures', 'Fiscal rules and public finances', 'Solving and checks', 'Limitations']);
    const order = ['m-model', 'm-generations', 'm-shock', 'm-shock-head', 'm-scenarios', 'm-arms', 'm-timing', 'm-inputs', 'm-inputs-head', 'inputs-table', 'm-closures', 'm-rules', 'm-debt', 'm-path', 'm-limits', 'm-history'];
    const at = order.map((id) => container.querySelector(`#${id}`));
    at.forEach((el, i) => expect(el, order[i]).not.toBeNull());
    for (let i = 1; i < at.length; i++) expect(at[i - 1].compareDocumentPosition(at[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${order[i - 1]} before ${order[i]}`).toBeTruthy();
    for (const id of ['s-scenarios', 's-arms', 's-timing', 'm-jump', 'm-tax', 'm-measures', 'scenario-map', 'timing']) expect(container.querySelector(`#${id}`), id).not.toBeNull();
    const nav = [...container.querySelectorAll('nav a, option')].map((a) => a.textContent.trim()).filter(Boolean);
    for (const t of ['Overview', 'What AI changes', 'Inputs and sources', 'Solving and checks']) expect(nav, t).toContain(t);
  });
  // push D, Q9.2c: every input group closed under a header with its count;
  // a closed group shows its key rows, the rest one click away
  it('groups the inputs, each closed with a count, key rows shown', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { ROWS } = await import('./inputs.js');
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
  // push D, Q9.3: no More info line that only repeats the card titles
  it('Method’s grid folds carry no preview of the card titles', () => {
    const { container } = render(<MethodTab />);
    for (const f of container.querySelectorAll('.mx-foldgrid .disclosure-toggle')) {
      expect(f.querySelector('.disclosure-preview')).toBeNull();
      expect(f.textContent.trim()).toBe('More info');
    }
    expect(container.querySelectorAll('.mx-foldgrid').length).toBeGreaterThan(0);
  });
});
