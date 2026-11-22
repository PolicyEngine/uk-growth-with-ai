// Scenarios: every direction arrow on the arm cards follows the sign of the
// value its words describe, for each scenario and closure (the cards show UK
// central; the helpers are checked for all four).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SCENARIOS, CLOSURES, fixedInputVsTz, gap } from '@/tabs/ai/surprise.js';
import { ArmsPart, ScenariosPart, TimingPart, stressMove, tzGdpMove, stressItems, tzGdpItems } from './ScenariosSection.jsx';
import MethodTab, { LIMIT_GROUPS } from './MethodTab.jsx';

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
      </>,
    );
    for (const id of ['m-scenarios', 's-scenarios', 'm-arms', 's-arms', 'm-timing', 's-timing', 'arm-tfp', 'arm-tz', 'arm-ss', 'm-jump', 'scenario-map', 'timing'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.textContent).toContain('A stress test, not a bound or a forecast');
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
  // push D, Q9.2: the reading order, every old anchor kept
  it('Method reads in Vahid’s order, and every anchor other pages link to lands', () => {
    const { container } = render(<MethodTab />);
    const heads = [...container.querySelectorAll('.page-body > section > .section-heading h2')].map((h) => h.textContent);
    expect(heads).toEqual(['Overview', 'What AI changes', 'Closures and income measures', 'Fiscal rules and public finances', 'Solving and checks', 'Limitations']);
    const order = ['m-model', 'm-generations', 'm-shock', 'm-shock-head', 'm-scenarios', 'm-arms', 'm-timing', 'm-closures', 'm-rules', 'm-debt', 'm-path', 'm-limits', 'm-history'];
    const at = order.map((id) => container.querySelector(`#${id}`));
    at.forEach((el, i) => expect(el, order[i]).not.toBeNull());
    for (let i = 1; i < at.length; i++) expect(at[i - 1].compareDocumentPosition(at[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${order[i - 1]} before ${order[i]}`).toBeTruthy();
    for (const id of ['s-scenarios', 's-arms', 's-timing', 'm-jump', 'm-tax', 'm-measures', 'scenario-map', 'timing']) expect(container.querySelector(`#${id}`), id).not.toBeNull();
    const nav = [...container.querySelectorAll('nav a, option')].map((a) => a.textContent.trim()).filter(Boolean);
    for (const t of ['Overview', 'What AI changes', 'Solving and checks']) expect(nav, t).toContain(t);
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
  // push D, Q9.4: one replicate row per section, a code icon first, right
  // under the section's heading
  it('gives each Method section one replicate row, under its heading, with a code icon', () => {
    const { container } = render(<MethodTab />);
    for (const sec of container.querySelectorAll('.page-body > section')) {
      const rows = sec.querySelectorAll('.mx-uses');
      const h = sec.querySelector(':scope > .section-heading').textContent;
      expect(rows.length, h).toBe(1);
      expect(rows[0].previousElementSibling.classList.contains('section-heading'), h).toBe(true);
      const first = rows[0].firstElementChild;
      expect(first.tagName.toLowerCase() === 'svg' || !!first.querySelector('svg'), h).toBe(true);
    }
  });
  // push D, Q9.5: the fiscal rules and debt repricing share one template
  // in an even grid; the common rule shows its first-year step from the data
  it('lays the fiscal rules out as four cards of one template, the common rule with UK central’s stat row', async () => {
    const { investStep } = await import('./investStep.js');
    const { signed, LATE_YEAR } = await import('@/tabs/ai/surprise.js');
    const { container } = render(<MethodTab />);
    const grid = container.querySelector('#m-rules').closest('section').querySelector('.card-grid.mx-rules');
    const cards = [...grid.children];
    expect(cards.map((c) => c.id)).toEqual(['rule-default', 'rule-fixed', 'rule-dn', 'm-debt']);
    for (const c of cards) expect(c.classList.contains('mx-rule-card'), c.id).toBe(true);
    const st = investStep();
    const step = container.querySelector('#rule-default .mx-rule-step');
    if (!st) expect(step).toBeNull();
    else {
      expect(st.late).toBe(LATE_YEAR);
      expect([...step.querySelectorAll('.why-stat-value')].map((d) => d.textContent)).toEqual([`${signed(st.iPrev, 1)}%`, `${signed(st.iLate, 1)}%`, `${signed(st.dLate, 1)}pp`]);
      expect([...step.querySelectorAll('.why-stat-label')].map((d) => d.textContent)).toEqual([`UK central: investment, ${st.prev}`, `Investment, ${st.late}`, `Debt, % of GDP, ${st.late}`]);
    }
    for (const c of cards.slice(1)) expect(c.querySelector('.mx-rule-step'), c.id).toBeNull();
  });
  // push D, Q9.6: the twelve limitations under four headings with icons
  it('groups the limitations under four headings with icons, each item once', () => {
    const { container } = render(<MethodTab />);
    const groups = [...container.querySelectorAll('.mx-limit-group')];
    expect(groups.map((g) => g.querySelector('.mx-limit-head').textContent)).toEqual(['Structure', 'Behaviour', 'Inputs', 'Public finances']);
    for (const g of groups) expect(g.querySelector('.mx-limit-head svg'), g.dataset.group).not.toBeNull();
    const titles = [...container.querySelectorAll('.mx-limit-group .mx-limit-title')].map((t) => t.textContent.replace(/:$/, ''));
    expect([...titles].sort()).toEqual(LIMIT_GROUPS.flatMap((g) => g.titles).sort());
    for (const g of groups) expect([...g.querySelectorAll('.mx-limit-title')].map((t) => t.textContent.replace(/:$/, '')).sort(), g.dataset.group).toEqual([...LIMIT_GROUPS.find((x) => x.key === g.dataset.group).titles].sort());
    expect(titles).toHaveLength(12);
  });
});
