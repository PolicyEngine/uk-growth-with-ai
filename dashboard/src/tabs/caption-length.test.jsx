// Caption length (consolidated-design-fable.md section 6): a card's title
// over 14 words (a Story figure's over 10), a lead over 25, a unit line over
// 16, or any p, figcaption or li in a card and outside More info over 25
// words. The count of offenders may not rise above its baseline in
// scripts/ratchet-baselines.json (probes.caption_length).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage, insideFold, words, recordCount } from '@/lib/probeTestUtils.jsx';

// how many of each selector were seen: a rule whose selector matches
// nothing anywhere checks nothing
const seen = {};
import BASE from '../../scripts/ratchet-baselines.json';

afterEach(cleanup);

// [selector, limit, what]
const RULES = [
  ['.card .card-head h3', 14, 'card title'],
  ['.ch-title, .story-figure-title', 10, 'story figure title'],
  ['.finding-lead', 25, 'lead'],
  ['.card-unit, .ch-unit, .story-figure-unit', 16, 'unit'],
];
const BODY = 25;
// The words of a caption as read, without its sources button and popover,
// hidden copies or screen-reader-only text.
const SKIP = 'button, [hidden], .src-pop, [role="dialog"], .visually-hidden, .p1-title-ghost, .dl-menu';
function ownText(el) {
  let t = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement;
    if (p && p !== el && p.closest(SKIP) && el.contains(p.closest(SKIP))) continue;
    t += ` ${n.textContent}`;
  }
  return t;
}

export function captionOffenders(root, page) {
  const out = [];
  for (const [sel, max, what] of RULES)
    for (const el of root.querySelectorAll(sel)) {
      seen[what] = (seen[what] ?? 0) + 1;
      if (insideFold(el)) continue;
      // a stacked title (one per step) is measured per stack
      const parts = el.querySelectorAll('.p1-title-stack').length ? [...el.querySelectorAll('.p1-title-stack')] : [el];
      for (const part of parts) {
        const t = ownText(part);
        const n = words(t);
        if (n > max) out.push(`${page}: ${what} ${n} words > ${max}: ${t.trim().slice(0, 90)}`);
      }
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
    for (const [, , what] of RULES) expect(seen[what] ?? 0, `${what}: selector matched nothing`).toBeGreaterThan(0);
  }, 60000);
  // One fold (section 6): every fold's rendered title is "More info". The
  // lint rule sees literal titles only; this reads what renders.
  it('every fold is titled More info, no more offenders than the baseline', () => {
    const bad = [];
    let n = 0;
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      for (const t of container.querySelectorAll('.disclosure-title, summary')) {
        n += 1;
        const own = [...t.childNodes].filter((c) => !(c.nodeType === 1 && c.classList.contains('disclosure-preview'))).map((c) => c.textContent).join('').trim();
        // the part opener's one "About this model" fold is approved (Vahid,
        // 22 Nov; Fable push E, B14): asserted below, not counted
        if (t.matches('.part-opener-about > summary') && own === 'About this model') continue;
        if (own !== 'More info') bad.push(`${p[0]}: "${own.slice(0, 60)}"`);
      }
      // each part opener has at most one fold, and it is "About this model"
      for (const o of container.querySelectorAll('.part-opener')) {
        const ds = o.querySelectorAll('details');
        expect(ds.length).toBeLessThanOrEqual(1);
        for (const d of ds) expect(d.querySelector(':scope > summary')?.textContent.trim()).toBe('About this model');
      }
      unmount();
    }
    expect(n).toBeGreaterThan(0);
    recordCount('fold_titles', bad.length);
    const b = BASE.probes.fold_titles.baseline;
    if (bad.length > (b ?? 0)) console.warn(`fold titles: ${bad.length}\n${[...new Set(bad)].join('\n')}`);
    expect(bad.length, `fold_titles: ${bad.length} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
  }, 60000);
});
