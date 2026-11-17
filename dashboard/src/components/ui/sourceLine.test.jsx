import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import SourceLine, { Essential, summaryOf } from './SourceLine.jsx';
import { NavProvider } from '@/lib/nav.jsx';

afterEach(cleanup);

const ITEMS = [
  { publisher: 'Office for National Statistics', label: 'GDP', id: 'IHYQ', date: '2026-11-12', url: 'https://www.ons.gov.uk/a', kind: 'series' },
  { publisher: 'Office for National Statistics', label: 'Employment', id: 'LF24', date: '2026-10-14', url: 'https://www.ons.gov.uk/b', kind: 'series' },
  { label: 'Method', nav: { tab: 'method', anchor: 'm-model' } },
];

describe('SourceLine', () => {
  it('is one icon button at rest, with no visible text or links', () => {
    const { container } = render(
      <NavProvider>
        <SourceLine items={ITEMS} notes={['A caveat with 1.2%.']} through="2026 Q3" />
      </NavProvider>,
    );
    const b = container.querySelector('button.src-line-btn');
    expect(b.getAttribute('aria-label')).toBe('Sources and notes');
    expect(b.getAttribute('title')).toBe('Sources and notes');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.textContent).toBe('');
    expect(container.querySelectorAll('a')).toHaveLength(0);
    // the notes are kept as a hidden record for the number checks
    const rec = container.querySelector('[data-source-notes]');
    expect(rec.hidden).toBe(true);
    expect(rec.textContent).toContain('A caveat with 1.2%.');
    expect(rec.textContent).toContain('Through 2026 Q3');
  });
  it('opens on click: the notes, then every source with its ID and release date; Esc closes and returns focus', () => {
    const { container } = render(
      <NavProvider>
        <SourceLine items={ITEMS} groups={[{ title: 'Assumptions', notes: ['Assumed.'] }]} through="2026 Q3" />
      </NavProvider>,
    );
    const b = container.querySelector('button.src-line-btn');
    fireEvent.click(b);
    expect(b.getAttribute('aria-expanded')).toBe('true');
    const pop = document.getElementById(b.getAttribute('aria-controls'));
    expect(pop.getAttribute('role')).toBe('dialog');
    const subs = [...pop.querySelectorAll('.src-pop-sub')].map((s) => s.textContent);
    expect(subs).toEqual(['Assumptions', 'Sources']);
    expect(pop.textContent).toContain('Source: ONS · 2 series · Method');
    expect(pop.textContent).toContain('IHYQ');
    expect(pop.textContent).toContain('released 12 Nov 2026');
    expect(pop.textContent).toContain('Through 2026 Q3');
    expect([...pop.querySelectorAll('.src-pop-list a')].map((a) => a.getAttribute('href'))).toEqual(['https://www.ons.gov.uk/a', 'https://www.ons.gov.uk/b', '/?tab=method#m-model']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(b.getAttribute('aria-controls'))).toBeNull();
    expect(document.activeElement).toBe(b);
  });
  it('a second click closes it', () => {
    const { container } = render(<SourceLine items={ITEMS.slice(0, 1)} />);
    const b = container.querySelector('button');
    fireEvent.click(b);
    fireEvent.click(b);
    expect(b.getAttribute('aria-expanded')).toBe('false');
  });
  it('summarises publishers, never every series', () => {
    expect(summaryOf(ITEMS)).toBe('Source: ONS · 2 series · Method');
  });
  it('draws an essential caveat line only when given one', () => {
    const { container } = render(
      <>
        <Essential />
        <Essential>Net of assumed gains.</Essential>
      </>,
    );
    expect(container.querySelectorAll('.src-essential')).toHaveLength(1);
  });
});
