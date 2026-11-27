// The settings pill (item-11-pill-fable.md): the words, the panel and its keyboard.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { SettingsChip, settingsSegments } from './SettingsBar.jsx';
import { dropOrder } from './Pill.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { pickersFor } from '@/lib/labels.js';

afterEach(cleanup);

const ST = { s: 'uk_central', closure: 'central', armId: 'tfp', rule: 'common', wrule: 'dn' };
const words = (tab, sub, st = ST) => settingsSegments(pickersFor(tab, sub), st, { alwaysRule: sub === 'finances' }).map((x) => x.text).join(' · ');

describe('settings pill words', () => {
  it('Economy names every setting it reads; the common rule is never printed there', () => {
    expect(words('explore', 'economy')).toBe('UK central · some foreign capital · automation + productivity');
    expect(words('explore', 'economy', { ...ST, rule: 'fixed' })).toBe('UK central · some foreign capital · automation + productivity · fixed spending');
  });
  it('Public finances always names the budget assumption (Vahid, 18 Nov)', () => {
    expect(words('explore', 'finances')).toBe('UK central · some foreign capital · automation + productivity · common rule');
  });
  it('closure and rule follow the state', () => {
    expect(words('explore', 'economy', { ...ST, s: 'korinek', closure: 'both', armId: 'ss', rule: 'fixed' })).toBe('Korinek et al., substantial (US) · both foreign-capital cases · stress test · fixed spending');
    expect(words('explore', 'economy', { ...ST, closure: 'closed' })).toContain('no foreign capital');
  });
  it('Who gains: the scenario is locked to UK central and the rule is its own', () => {
    expect(words('explore', 'who', { ...ST, s: 'uk_high' })).toBe('UK central · some foreign capital · automation + productivity · debt-neutral');
  });
  it('a uk-ai-study page and a page with no settings have no words', () => {
    expect(words('explore', 'households')).toBe('');
    expect(words('method', 'how')).toBe('');
  });
  it('drops defaults from the end first, then the others; never the first', () => {
    const segs = [{ def: true }, { def: true }, { def: true }, { def: false }];
    expect(dropOrder(segs)).toEqual([2, 1, 3]);
  });
});

describe('settings pill panel', () => {
  it('opens a dialog with the sections, holds focus, chooses by arrow key, closes on Escape and returns focus', () => {
    const { container } = render(
      <NavProvider>
        <div className="subhead">
          <SettingsChip pick={pickersFor('explore', 'economy')} sub="economy" />
        </div>
      </NavProvider>,
    );
    const chip = container.querySelector('.settings-chip');
    expect(chip.getAttribute('aria-haspopup')).toBe('dialog');
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(chip.getAttribute('title')).toContain('UK central');
    // the accessible name has every setting, the common rule included
    expect(chip.getAttribute('aria-label')).toBe('Macro model settings: UK central · some foreign capital · automation + productivity · common rule. Change');
    act(() => fireEvent.click(chip));
    expect(chip.getAttribute('aria-expanded')).toBe('true');
    const pop = document.getElementById(chip.getAttribute('aria-controls'));
    expect(pop.getAttribute('role')).toBe('dialog');
    expect(pop.hidden).toBe(false);
    const groups = [...pop.querySelectorAll('.sp-group-name')].map((g) => g.textContent);
    expect(groups).toEqual(['Scenario', 'Foreign capital', 'Version', 'Budget assumption']);
    // every option has a one-line description
    expect([...pop.querySelectorAll('.sp-option-note')].every((n) => n.textContent.length > 0)).toBe(true);
    // focus starts on the chosen scenario; an arrow key moves and chooses
    expect(document.activeElement.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement.textContent).toContain('UK central');
    act(() => fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' }));
    expect(window.location.search).toContain('s=uk_high');
    expect(pop.hidden).toBe(false);
    act(() => fireEvent.keyDown(document.activeElement, { key: 'Escape' }));
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(chip);
  });
});
