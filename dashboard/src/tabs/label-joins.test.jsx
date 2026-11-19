// Label and number joins (consolidated-design-fable.md section 6; review
// round 1, R1-21): a row's text, as copy and screen readers read it
// (textContent: adjacent elements with no space run together), has a
// letter directly against a figure ("No bequests15%", "Labour
// income−1.02"), a figure's unit against a word or the next figure
// ("2.04memployees", "Bottom 25%+1.09%"), or an SVG label and its value in
// one <text> ("productivity+1.99pp"). Identifiers (zk0.1, R4, tG1) are not
// figures. The count may not rise above probes.label_joins in
// scripts/ratchet-baselines.json.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage, recordCount } from '@/lib/probeTestUtils.jsx';
import BASE from '../../scripts/ratchet-baselines.json';

afterEach(cleanup);

const JOIN = new RegExp(
  [
    '[A-Za-z][+−]\\d', // a word, then a signed figure
    '(?<![\\w.])[A-Za-z]{2,}\\d+(?:\\.\\d+)?(?:%|pp)', // a word, then a figure with its unit
    '\\d(?:%|pp)[A-Za-z+−]', // a unit, then a word or the next figure
    '\\d(?:\\.\\d+)?(?:m|bn)[a-z]{3,}', // "2.04memployees"
  ].join('|'),
);
const ROWS = 'li, p, button, td, th, dt, dd, figcaption, h2, h3, h4, svg text';

export function joins(root, page) {
  const out = new Set();
  for (const el of root.querySelectorAll(ROWS)) {
    if (el.closest('[data-axis], code, pre')) continue;
    // a row whose child rows are checked on their own
    if (el.querySelector(ROWS.replace(/, svg text$/, ''))) continue;
    const m = el.textContent.match(JOIN);
    if (m) {
      const t = el.textContent;
      out.add(`${page}: ${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''} "…${t.slice(Math.max(0, m.index - 30), m.index + 20)}…"`);
    }
  }
  return [...out];
}

describe('label and number joins', () => {
  it('no more joins than the baseline', () => {
    const all = [];
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      all.push(...joins(container, p[0]));
      unmount();
    }
    recordCount('label_joins', all.length);
    const b = BASE.probes.label_joins.baseline;
    if (all.length > (b ?? 0)) console.warn(`label joins: ${all.length}\n${all.join('\n')}`);
    expect(all.length, `label_joins: ${all.length} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
  }, 60000);
});
