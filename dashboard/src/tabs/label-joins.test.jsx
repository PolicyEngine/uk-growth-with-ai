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

// Word names written in camel case on purpose (never a join).
const CAMEL_OK = /PolicyEngine|GitHub|JavaScript|TypeScript|LaTeX|OpenAI|DeepMind|ChatGPT|iPhone|YouGov|McKinsey|PwC|KPMG|LinkedIn|HouseholdsMethod|WhoHeatmap|NavLink|DataFrame|PyPI|NumPy|SciPy|TfL|McDonald|MacBook/g;
const LETTERS = new RegExp(
  [
    '(?<![A-Z])[a-z][A-Z][a-z]', // "centralOG", "BarclaysEnd"
    '\\d{4}-\\d{2}-\\d{2}[A-Za-z]', // "2026-11-17Read"
    '(?<![\\w-])(?:19|20)\\d\\d[A-Z]', // "2026AI"
    '\\b[0-9a-f]{7}[A-Z][a-z]', // "ba2e7b0PolicyEngine"
    '\\)[A-Z][a-z]', // "(US)Implausible"
    '[A-Za-z]\\.[A-Z][a-z]{2,}', // "OG-UK.One"
  ].join('|'),
);
export function letterJoins(root, page) {
  const out = new Set();
  const texts = [];
  for (const el of root.querySelectorAll(ROWS)) {
    if (el.closest('[data-axis], code, pre')) continue;
    if (el.querySelector(ROWS.replace(/, svg text$/, ''))) continue;
    texts.push([el.tagName.toLowerCase(), el.textContent]);
  }
  for (const el of root.querySelectorAll('[aria-label]')) texts.push(['aria', el.getAttribute('aria-label')]);
  for (const [tag, raw] of texts) {
    const t = raw.replace(CAMEL_OK, (w) => w.toLowerCase());
    const m = t.match(LETTERS);
    if (m) out.add(`${page}: ${tag} "…${raw.slice(Math.max(0, m.index - 30), m.index + 20)}…"`);
  }
  return [...out];
}

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

  // Word-word and date-word joins (review round 3, R3-18; R2-33's list):
  // "UK centralOG-UK", "IFS / BarclaysEnd", "Released 2026-11-17Read",
  // "12 Nov 2026AI becomes", "ba2e7b0PolicyEngine", "(US)Implausible",
  // "OG-UK.One tile". Kept apart from label_joins (its own baseline), and read
  // from aria-label text too.
  it('no more letter joins than the baseline', () => {
    const all = [];
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      all.push(...letterJoins(container, p[0]));
      unmount();
    }
    recordCount('label_joins_letters', all.length);
    const b = BASE.probes.label_joins_letters?.baseline;
    if (all.length > (b ?? 0)) console.warn(`letter joins: ${all.length}\n${all.join('\n')}`);
    expect(all.length, `label_joins_letters: ${all.length} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
  }, 60000);
});
