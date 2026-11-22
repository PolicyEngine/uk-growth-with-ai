// Every text leads with an icon (Vahid, 21 Nov: "all text should have
// icon"): every scrolly step card on every page carries exactly one icon,
// its own (.scrolly-card-icon, from step.icon), and no second one in its
// body (check_text rule (a): a step card has exactly one icon; its closing
// line is a block of its own). Every closing line (.scrolly-takeaway, from
// Scrolly, TopicHead and OutputSplit), essential caveat line
// (.src-essential) and standalone note (the shock's two tile lines are
// now its step cards' second lines, under the card's one icon)
// (round 8, M3: the generations notes, Closing's lead, Changes' margin
// note, Pound's decile caveat, the close-why, ClosureSlope's notes,
// Headline's grey-values note, Households' decile 1 note) leads with one. The
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
  it('every closing line, essential caveat, tile caption and standalone note leads with one icon', () => {
    const bad = [];
    const seen = {};
    // with the standalone notes that state a finding, a caveat or a reading
    // instruction (Fable round 8, D6 and M3; check_text NOTE_ICON_SEL).
    // Notes inside a step card (.p2-note) stay iconless.
    const SEL = ['.scrolly-takeaway', '.src-essential', '.scrolly-takeaway-note', '.p3-margin-note', '.p3-pound-caveat', '.close-why', '.ex-slope-note', '.db-headline-note', '.hh-note[data-caveat="bottom-decile"]'];
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
