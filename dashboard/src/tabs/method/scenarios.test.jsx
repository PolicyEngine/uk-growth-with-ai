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
    // #m-scenarios and #m-timing are the Key settings rows these sit in (MethodTab)
    for (const id of ['s-scenarios', 'm-arms', 's-arms', 's-timing', 'arm-tfp', 'arm-tz', 'arm-ss', 'm-jump', 'scenario-map', 'timing'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.textContent).toContain('A stress test, not a bound or a forecast');
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });
  // Method redesign (section 4; M18 supersedes push D, Q9.2): one anatomy,
  // every old anchor kept, every Key settings row closed at rest
  it('Method reads in the model pages’ anatomy, and every anchor other pages link to lands', () => {
    const { container } = render(<MethodTab />);
    const heads = [...container.querySelectorAll('.page-body > section > .section-heading h2')].map((h) => h.textContent);
    expect(heads).toEqual(['How it works', 'Key settings', 'What the model leaves out', 'Sources']);
    const order = ['m-model', 'model-diagram', 'md-detail', 'm-arms', 's-arms', 'arm-tfp', 'arm-tz', 'arm-ss', 'm-settings', 'm-shock', 'm-shock-head', 'm-scenarios', 's-scenarios', 'scenario-map', 'm-timing', 's-timing', 'timing', 'm-jump', 'm-closures', 'closure-central', 'closure-bound', 'm-measures', 'm-rules', 'rule-default', 'rule-fixed', 'rule-dn', 'm-debt', 'm-generations', 'm-generations-more', 'm-tax', 'm-path', 'm-limits', 'm-sources', 'm-history'];
    const at = order.map((id) => container.querySelector(`#${id}`));
    at.forEach((el, i) => expect(el, order[i]).not.toBeNull());
    for (let i = 1; i < at.length; i++) expect(at[i - 1].compareDocumentPosition(at[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${order[i - 1]} before ${order[i]}`).toBeTruthy();
    for (const id of order) expect(container.querySelectorAll(`[id="${id}"]`), id).toHaveLength(1);
    // the eight rows, closed at rest
    const rows = [...container.querySelectorAll('.mx-setting')];
    expect(rows.map((r) => r.id)).toEqual(['m-shock', 'm-scenarios', 'm-timing', 'm-closures', 'm-rules', 'm-generations', 'm-tax', 'm-path']);
    for (const r of rows) {
      expect(r.querySelector(':scope > button.mx-setting-head').getAttribute('aria-expanded'), r.id).toBe('false');
      expect(r.querySelector(':scope > .mx-setting-body').hidden, r.id).toBe(true);
      expect(r.closest('.card'), r.id).toBeNull();
    }
    const nav = [...container.querySelectorAll('nav a, option')].map((a) => a.textContent.trim()).filter(Boolean);
    for (const t of ['How it works', 'Key settings', 'What the model leaves out', 'Sources']) expect(nav, t).toContain(t);
    expect(container.querySelector('.mx-chain, .story-chain')).toBeNull();
  });
  // M6: the three versions stay open at rest (the stress-test card's two
  // figures are the page's counted ones)
  it('keeps the arm cards visible at rest, outside every closed row', () => {
    const { container } = render(<MethodTab />);
    for (const id of ['arm-tfp', 'arm-tz', 'arm-ss']) expect(container.querySelector(`#${id}`).closest('[hidden]'), id).toBeNull();
  });
  it('opens a row when a link reveals it or anything inside it', async () => {
    const { act } = await import('@testing-library/react');
    const { container } = render(<MethodTab />);
    const row = container.querySelector('#m-rules');
    expect(row.querySelector('.mx-setting-body').hidden).toBe(true);
    act(() => {
      container.querySelector('#m-debt').dispatchEvent(new CustomEvent('reveal', { bubbles: true }));
    });
    expect(row.querySelector('.mx-setting-body').hidden).toBe(false);
    expect(row.querySelector('.mx-setting-head').getAttribute('aria-expanded')).toBe('true');
    // one row open does not close another
    act(() => {
      container.querySelector('#m-closures').dispatchEvent(new CustomEvent('reveal', { bubbles: true }));
    });
    expect(row.querySelector('.mx-setting-body').hidden).toBe(false);
    expect(container.querySelector('#m-closures .mx-setting-body').hidden).toBe(false);
  });
  it('binds every Key settings cell to the data, each at most twelve words', async () => {
    const { ZETA, CENTRAL, BOUND, SURPRISE_YEAR, HEADLINE_YEAR, LATE_YEAR } = await import('@/tabs/ai/surprise.js');
    const { RULES } = await import('@/lib/labels.js');
    const { container } = render(<MethodTab />);
    const cell = (id, k) => container.querySelector(`#${id} .mx-setting-${k} .mx-setting-v`).textContent;
    expect(cell('m-timing', 'uses')).toBe(`A surprise in ${SURPRISE_YEAR}; full weight by ${HEADLINE_YEAR}`);
    expect(cell('m-closures', 'uses')).toContain(`ζK = ${ZETA[CENTRAL]}`);
    expect(cell('m-closures', 'also')).toContain(`ζK = ${ZETA[BOUND]}`);
    expect(cell('m-rules', 'uses')).toBe(`${RULES[0].label}; debt rule from ${LATE_YEAR}`);
    expect(cell('m-generations', 'uses')).toBe('80 ages (20 to 99), seven earnings groups');
    for (const v of container.querySelectorAll('.mx-setting-v')) expect(v.textContent.trim().split(/\s+/).length, v.textContent).toBeLessThanOrEqual(12);
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
  // Method redesign (M18 supersedes push D, Q9.4): the Replicate row sits
  // at the foot of each Key settings row's body, at most one; with a code
  // icon first
  it('gives each Key settings row at most one replicate row, last in its body, with a code icon', () => {
    const { container } = render(<MethodTab />);
    for (const body of container.querySelectorAll('.mx-setting-body')) {
      const rows = body.querySelectorAll('.mx-uses');
      const id = body.parentElement.id;
      expect(rows.length, id).toBeLessThanOrEqual(1);
      if (!rows.length) continue;
      expect(rows[0].parentElement, id).toBe(body);
      expect(body.lastElementChild, id).toBe(rows[0]);
      const first = rows[0].firstElementChild;
      expect(first.tagName.toLowerCase() === 'svg' || !!first.querySelector('svg'), id).toBe(true);
    }
    // no row under a section heading any more
    for (const h of container.querySelectorAll('.page-body > section > .section-heading')) expect(h.nextElementSibling?.classList.contains('mx-uses'), h.id).toBeFalsy();
  });
  // push D, Q9.5: the fiscal rules and debt repricing share one template
  // in an even grid; the common rule shows its first-year step from the data
  it('lays the fiscal rules out as four cards of one template, the common rule with UK central’s stat row', async () => {
    const { investStep } = await import('./investStep.js');
    const { signed, LATE_YEAR } = await import('@/tabs/ai/surprise.js');
    const { container } = render(<MethodTab />);
    const grid = container.querySelector('#m-rules .card-grid.mx-rules');
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
    const limits = container.querySelector('#m-limits').closest('section');
    const groups = [...limits.querySelectorAll('.mx-limit-group')];
    expect(groups.map((g) => g.querySelector('.mx-limit-head').textContent)).toEqual(['Structure', 'Behaviour', 'Inputs', 'Public finances']);
    for (const g of groups) expect(g.querySelector('.mx-limit-head svg'), g.dataset.group).not.toBeNull();
    const titles = [...limits.querySelectorAll('.mx-limit-group .mx-limit-title')].map((t) => t.textContent.replace(/:$/, ''));
    expect([...titles].sort()).toEqual(LIMIT_GROUPS.flatMap((g) => g.titles).sort());
    for (const g of groups) expect([...g.querySelectorAll('.mx-limit-title')].map((t) => t.textContent.replace(/:$/, '')).sort(), g.dataset.group).toEqual([...LIMIT_GROUPS.find((x) => x.key === g.dataset.group).titles].sort());
    expect(titles).toHaveLength(12);
  });
});
