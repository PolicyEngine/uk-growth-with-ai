// Caption length (consolidated-design-fable.md section 6): a card's title
// over 14 words (a Story figure's over 10), a lead over 25, a unit line over
// 16, or any p, figcaption or li in a card and outside More info over 25
// words. The count of offenders may not rise above its baseline in
// scripts/ratchet-baselines.json (probes.caption_length).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage, insideFold, words, recordCount } from '@/lib/probeTestUtils.jsx';
import BASE from '../../scripts/ratchet-baselines.json';

afterEach(cleanup);

// [selector, limit, what]
const RULES = [
  ['.card .card-head h3', 14, 'card title'],
  ['.ch-title', 10, 'story figure title'],
  ['.finding-lead', 25, 'lead'],
  ['.card-unit, .ch-unit', 16, 'unit'],
];
const BODY = 25;

export function captionOffenders(root, page) {
  const out = [];
  for (const [sel, max, what] of RULES)
    for (const el of root.querySelectorAll(sel)) {
      if (insideFold(el)) continue;
      const n = words(el.textContent);
      if (n > max) out.push(`${page}: ${what} ${n} words > ${max}: ${el.textContent.trim().slice(0, 90)}`);
    }
  for (const el of root.querySelectorAll('.card p, .card figcaption, .card li, figure.ch-frame p, figure.ch-frame figcaption')) {
    if (insideFold(el) || el.matches(RULES.map((r) => r[0]).join(', '))) continue;
    // a list item counts once, not again for the p inside it
    if (el.tagName !== 'LI' && el.closest('li') && el.closest('.card')?.contains(el.closest('li'))) continue;
    const n = words(el.textContent);
    if (n > BODY) out.push(`${page}: ${el.tagName.toLowerCase()} ${n} words > ${BODY}: ${el.textContent.trim().slice(0, 90)}`);
  }
  return out;
}

describe('caption length', () => {
  it('no more offenders than the baseline', () => {
    const all = [];
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      all.push(...captionOffenders(container, p[0]));
      unmount();
    }
    recordCount('caption_length', all.length);
    const b = BASE.probes.caption_length.baseline;
    if (all.length > (b ?? 0)) console.warn(`caption length: ${all.length} offenders\n${all.join('\n')}`);
    expect(all.length, `caption_length: ${all.length} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
  });
});
