import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import AsOf, { asOfItems, fmtDay, latestRelease, readable } from './AsOf.jsx';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

afterEach(cleanup);

describe('AsOf', () => {
  it('picks the latest release per publisher', () => {
    const src = { a: { publisher: 'X', released: '2026-01-02' }, b: { publisher: 'X', released: '2026-03-01' }, c: { publisher: 'Y', released: '2027-01-01' } };
    expect(latestRelease(src, 'X').released).toBe('2026-03-01');
    expect(fmtDay('2026-11-12')).toBe('12 Nov 2026');
  });
  it('is one quiet icon at rest; the ONS and OBR releases and the model commit open behind it', () => {
    const { container } = render(<AsOf inline />);
    const btn = container.querySelector('.as-of button.src-line-btn');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('a')).toHaveLength(0);
    const items = asOfItems();
    expect(items).toHaveLength(3);
    expect(items[0].url).toBe(readable(latestRelease(UK.sources, 'Office for National Statistics').url));
    expect(items[0].url).not.toContain('format=csv');
    expect(readable('https://www.ons.gov.uk/generator?format=csv&uri=/economy/x/pn2')).toBe('https://www.ons.gov.uk/economy/x/pn2');
    expect(items[2].url).toContain(`/commit/${S.source_commit}`);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const links = [...document.querySelectorAll('.src-pop a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(items.map((it) => it.url));
  });
});
