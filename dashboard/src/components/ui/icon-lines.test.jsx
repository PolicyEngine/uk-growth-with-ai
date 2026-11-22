// One pattern for every icon-led line of text (Vahid, 22 Nov: "why text
// are not align? like icon align and also texts, check all";
// icon-align-audit.md). Every line block (p, li, dd, figcaption) and step
// card on every page whose first element child is an icon is the shared
// IconLine (components/ui/IconLine.jsx, .icon-line): the icon in a fixed
// column, then ONE text span, so a wrapped line hangs under the first
// line's text. The icon's size is its tier's (18 body, 16 ui, 14 meta).
// Exempt, each for a reason in the audit: figure titles (a title row with
// a measuring ghost and a source button), the beat headline, chips, the
// model tag, link rows and the slope chart's notes (being replaced).
// Also a source rule: no file puts a bare icon at the start of a <p> by
// the old inline pattern (.p2-tx-icon / .p1-text-icon before text).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import { ICON_TIER } from './IconLine.jsx';

afterEach(cleanup);

const EXEMPT = [
  '.story-figure-title', // figure title rows (check_text's title rules)
  '.beat-head', // a beat's headline
  '.ex-chip', // chips
  '.model-line', // the model tag: measured segments
  '.mx-uses', // a row of replication links
  '.lens-overlap', // a link label inside the lens chart
  '.mx-big', // a big value
  '.story-chain-link', // diagram arrows
].join(', ');

const leadIcon = (el) => {
  const first = el.firstElementChild;
  return first?.getAttribute('aria-hidden') === 'true' ? first.querySelector(':scope > svg.lucide') : null;
};

describe('every icon-led line is the shared IconLine', () => {
  it('on every page', () => {
    const bad = [];
    let n = 0;
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      for (const el of container.querySelectorAll('p, li, dd, figcaption, h4, .hh-tile-label, .hflow-box-head, .scrolly-card.has-icon')) {
        const svg = leadIcon(el);
        if (!svg || !el.textContent.trim() || el.matches(EXEMPT)) continue;
        n += 1;
        const where = `${p[0]} ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}: ${el.textContent.trim().slice(0, 50)}`;
        if (!el.classList.contains('icon-line')) {
          bad.push(`${where}: not an icon line`);
          continue;
        }
        if (!el.firstElementChild.classList.contains('icon-line-icon')) bad.push(`${where}: icon span without .icon-line-icon`);
        const tier = ['body', 'ui', 'meta'].find((t) => el.classList.contains(`is-${t}`));
        if (!tier) bad.push(`${where}: no tier`);
        else if (Number(svg.getAttribute('width')) !== ICON_TIER[tier]) bad.push(`${where}: icon ${svg.getAttribute('width')}px, tier ${tier} is ${ICON_TIER[tier]}px`);
        // the text is one span (a step card: its body), so it wraps as one block
        if (!el.classList.contains('scrolly-card') && !el.querySelector(':scope > .icon-line-text')) bad.push(`${where}: no .icon-line-text`);
        for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) bad.push(`${where}: bare text beside the icon`);
      }
      unmount();
    }
    expect(n).toBeGreaterThan(40);
    expect(bad).toEqual([]);
  }, 60000);
});

describe('no inline lead icon in the source', () => {
  it('no <p> opens with a .p2-tx-icon or .p1-text-icon before its text', () => {
    const root = join(__dirname, '..', '..');
    const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : /\.jsx$/.test(f) && !/\.test\./.test(f) ? [join(d, f)] : []));
    const bad = [];
    for (const f of files(root)) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<p\b[^>]*>\s*<Icon\b[^>]*className="(p2-tx-icon|p1-text-icon)"/g)) bad.push(`${f.slice(root.length)}: ${m[0].slice(0, 80)}`);
    }
    // exempt: figure title rows, and ClosureSlope's notes (being replaced
    // on another branch)
    expect(bad.filter((b) => !b.includes('ClosureSlope') && !b.includes('story-figure-title'))).toEqual([]);
  });
});
