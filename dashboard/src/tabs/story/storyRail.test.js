import { describe, expect, it } from 'vitest';
import { sectionProgress } from './StoryRail.jsx';

// a page 5000px tall in an 800px viewport: maxScroll 4200; line at 280
const base = { line: 280, maxScroll: 4200 };

describe('story rail progress', () => {
  it('runs from 0 at the section top to 1 at its bottom', () => {
    const s = { ...base, top: 1000, height: 1000 };
    expect(sectionProgress({ ...s, scrollY: 600 })).toBe(0);
    expect(sectionProgress({ ...s, scrollY: 1220 })).toBeCloseTo(0.5);
    expect(sectionProgress({ ...s, scrollY: 1720 })).toBe(1);
  });
  it('fills the last section by the bottom of the page, smoothly', () => {
    // the last section: its bottom (4800) never reaches the line (4200 + 280)
    const s = { ...base, top: 3800, height: 1000 };
    expect(sectionProgress({ ...s, scrollY: 3520 })).toBe(0);
    const mid = sectionProgress({ ...s, scrollY: 3860 });
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
    expect(sectionProgress({ ...s, scrollY: 4200 })).toBe(1);
  });
  it('a section that starts below the reachable line is full at the bottom', () => {
    const s = { ...base, top: 4700, height: 300 };
    expect(sectionProgress({ ...s, scrollY: 4200 })).toBe(1);
  });
});
