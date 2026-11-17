// The sticky header's settings chip: the words, and the popover's keyboard.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { SettingsChip, settingsSegments } from './SettingsBar.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { pickersFor } from '@/lib/labels.js';

afterEach(cleanup);

const ST = { s: 'uk_central', closure: 'central', armId: 'tfp', rule: 'common', wrule: 'dn' };
const words = (tab, sub, st = ST) => settingsSegments(pickersFor(tab, sub), st).map((x) => x.text).join(' · ');

describe('settings chip words', () => {
  it('Economy names every setting it reads, from labels.js', () => {
    expect(words('explore', 'economy')).toBe('UK central · some foreign capital · automation + productivity · common rule');
  });
  it('closure and rule follow the state', () => {
    expect(words('explore', 'finances', { ...ST, s: 'korinek', closure: 'both', armId: 'ss', rule: 'fixed' })).toBe('Korinek et al. (upper) · foreign capital: both · stress test · fixed spending');
    expect(words('explore', 'economy', { ...ST, closure: 'closed' })).toContain('no foreign capital');
  });
  it('Who gains: the scenario is locked to UK central and the rule is its own', () => {
    expect(words('explore', 'who', { ...ST, s: 'uk_high' })).toBe('UK central · some foreign capital · automation + productivity · debt-neutral');
  });
  it('a uk-ai-study page and a page with no settings have no words', () => {
    expect(words('explore', 'households')).toBe('');
    expect(words('method', 'how')).toBe('');
  });
});

describe('settings chip popover', () => {
  it('opens a dialog with the pickers, holds focus, closes on Escape and returns focus', () => {
    const { container } = render(
      <NavProvider>
        <div className="subhead">
          <SettingsChip pick={pickersFor('explore', 'economy')} />
        </div>
      </NavProvider>,
    );
    const chip = container.querySelector('.settings-chip');
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    const pop = document.getElementById(chip.getAttribute('aria-controls'));
    expect(pop.getAttribute('role')).toBe('dialog');
    expect(pop.hidden).toBe(true);
    expect(chip.getAttribute('title')).toContain('UK central');
    act(() => fireEvent.click(chip));
    expect(chip.getAttribute('aria-expanded')).toBe('true');
    expect(pop.hidden).toBe(false);
    const groups = [...pop.querySelectorAll('.sp-group-name')].map((g) => g.textContent);
    expect(groups).toEqual(['Scenario', 'Foreign capital', 'Version', 'Budget assumption']);
    // every option has a one-line description
    expect([...pop.querySelectorAll('.sp-option-note')].every((n) => n.textContent.length > 0)).toBe(true);
    // focus starts on the chosen scenario
    expect(document.activeElement.getAttribute('aria-checked')).toBe('true');
    act(() => fireEvent.keyDown(document.activeElement, { key: 'Escape' }));
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(chip);
  });
});
