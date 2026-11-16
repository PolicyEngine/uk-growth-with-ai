import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import AsOf, { fmtDay, latestRelease, readable } from './AsOf.jsx';
import UK from '@/data/ukContext.json';
import S from '@/data/surprise2028.json';

afterEach(cleanup);

describe('AsOf', () => {
  it('picks the latest release per publisher', () => {
    const src = { a: { publisher: 'X', released: '2026-01-02' }, b: { publisher: 'X', released: '2026-03-01' }, c: { publisher: 'Y', released: '2027-01-01' } };
    expect(latestRelease(src, 'X').released).toBe('2026-03-01');
    expect(fmtDay('2026-11-12')).toBe('12 Nov 2026');
  });
  it('links the ONS and OBR releases and the model commit', () => {
    const { container } = render(<AsOf />);
    const p = container.querySelector('p.as-of');
    expect(p.hasAttribute('data-cite')).toBe(true);
    expect(p.querySelector('svg')).not.toBeNull();
    const links = [...p.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toHaveLength(3);
    expect(links[0]).toBe(readable(latestRelease(UK.sources, 'Office for National Statistics').url));
    expect(links[0]).not.toContain('format=csv');
    expect(readable('https://www.ons.gov.uk/generator?format=csv&uri=/economy/x/pn2')).toBe('https://www.ons.gov.uk/economy/x/pn2');
    expect(links[2]).toContain(`/commit/${S.source_commit}`);
    expect(p.textContent).toContain('model results');
  });
});
