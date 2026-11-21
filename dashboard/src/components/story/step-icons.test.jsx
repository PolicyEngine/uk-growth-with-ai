// Every text leads with an icon (Vahid, 21 Nov: "all text should have
// icon"): every scrolly step card on every page carries exactly one icon,
// its own (.scrolly-card-icon, from step.icon), and no second one in its
// body (check_text rule (a): a step card has exactly one icon; its closing
// line is a block of its own). Every closing line (.scrolly-takeaway, from
// Scrolly, TopicHead and OutputSplit), essential caveat line
// (.src-essential) and tile caption (.p2-shock-cap) leads with one. The
// eye button (.scrolly-show) is a control, not a text icon.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';

afterEach(cleanup);

const icons = (el) => [...el.querySelectorAll('svg.lucide')].filter((s) => !s.closest('.scrolly-show, button'));

describe('every step card leads with one icon', () => {
  it('on every page', () => {
    const bad = [];
    let n = 0;
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      for (const card of container.querySelectorAll('.scrolly-step:not(.is-spacer) > .scrolly-card')) {
        n += 1;
        const own = card.querySelector(':scope > .scrolly-card-icon');
        const k = icons(card).filter((x) => !x.closest('.scrolly-takeaway-in-step')).length;
        if (!own || k !== 1) bad.push(`${p[0]} ${card.closest('.scrolly-step').id}: ${own ? `${k} icons` : 'no icon'}: ${card.textContent.trim().slice(0, 70)}`);
      }
      unmount();
    }
    expect(n).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  }, 60000);
  it('every closing line, essential caveat and tile caption leads with one icon', () => {
    const bad = [];
    const seen = {};
    const SEL = ['.scrolly-takeaway', '.src-essential', '.p2-shock-cap'];
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      for (const sel of SEL)
        for (const el of container.querySelectorAll(sel)) {
          seen[sel] = (seen[sel] ?? 0) + 1;
          const first = el.firstElementChild;
          const k = icons(el).length;
          if (k !== 1 || !first?.querySelector(':scope > svg.lucide')) bad.push(`${p[0]} ${sel}: ${k} icons${k ? ', not leading' : ''}: ${el.textContent.trim().slice(0, 70)}`);
        }
      unmount();
    }
    for (const sel of SEL) expect(seen[sel] ?? 0, sel).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  }, 60000);
});
