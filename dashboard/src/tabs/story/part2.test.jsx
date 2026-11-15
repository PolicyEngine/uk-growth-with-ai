// Story part 2: the one home of the three headline figures. It prints the
// tiles and the Why list from the data file, and no other figure: every
// chart draws a shape (axis ticks carry data-axis) and links to the tab
// that holds the figures. Rendered against a fixture with altered values.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import real from '@/data/surprise2028.json';

afterEach(cleanup);

const fixture = JSON.parse(JSON.stringify(real));
const H = fixture.years.indexOf(fixture.headline_year);
const base = fixture.results.uk_central.tfp['zk0.1'];
const tfpC = { ...base, gaps: Object.fromEntries(Object.entries(base.gaps).map(([k, v]) => [k, [...v]])) };
tfpC.gaps.GNI[H] = 1.2345;
tfpC.gaps.Y[H] = 2.3456;
fixture.results.uk_central.tfp['zk0.1'] = tfpC;
fixture.results.uk_central.tfp.zk0 = { status: 'pending' };

vi.doMock('@/data/surprise2028.json', () => ({ default: fixture }));

const { default: Part2 } = await import('@/tabs/story/Part2.jsx');
const { NavProvider } = await import('@/lib/nav.jsx');

const PART = { id: 'story-part-2', n: 2, icon: 'trend', kicker: 'Part 2', title: 'What a model of the whole economy projects' };

// Render part 2 at an address: it reads the scenario and closure from the URL.
const at = (query) => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <section id="story-part-2">
        <Part2 part={PART} />
      </section>
    </NavProvider>,
  );
};

// The page text with the axis ticks set aside, as the number check reads it.
const textWithoutAxes = (el) => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('[data-axis]').forEach((n) => n.remove());
  return copy.textContent;
};
const FIGURE = /[+−-]?\d+(\.\d+)?\s?(%|pp)/g;

describe('story part 2', () => {
  it('shows the headline tiles from the data file, and the pending closed-capital value', () => {
    const one = at('tab=story');
    expect(one.container.querySelector('#story-headline').textContent).toContain('+2.35%');
    one.unmount();
    const both = at('tab=story&closure=both');
    expect(both.container.querySelector('#story-headline').textContent).toContain('With closed capital: pending');
  });

  it('prints figures only inside the headline block', () => {
    for (const q of ['tab=story', 'tab=story&closure=both', 'tab=story&s=korinek&closure=closed']) {
      const { container, unmount } = at(q);
      const part = container.querySelector('#story-part-2');
      const head = part.querySelector('#story-headline');
      const all = textWithoutAxes(part).match(FIGURE) ?? [];
      const inHead = textWithoutAxes(head).match(FIGURE) ?? [];
      expect(all.length).toBeGreaterThan(0);
      expect(all).toEqual(inHead);
      unmount();
    }
  });

  it('every chart is an image with a text alternative, and links keep the reader’s choices', () => {
    const { container } = at('tab=story&s=uk_high&closure=both');
    const svgs = [...container.querySelectorAll('svg.story-svg, svg.tile-grid')];
    expect(svgs.length).toBe(5);
    for (const s of svgs) {
      expect(s.getAttribute('role')).toBe('img');
      expect(s.getAttribute('aria-label')).toBeTruthy();
    }
    expect(container.querySelectorAll('.story-source')).toHaveLength(5);
    const hrefs = [...container.querySelectorAll('.p2-more a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/?tab=explore&sub=who&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=explore&sub=finances&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=method&s=uk_high&closure=both#m-closures');
    expect(hrefs.some((h) => h.startsWith('/?tab=method&sub=scenarios'))).toBe(true);
    // Income and output is Results' first sub-tab, so the address leaves it out
    expect(hrefs).toContain('/?tab=explore&s=uk_high&closure=both');
    expect(hrefs.some((h) => h.startsWith('/?tab=explore&sub=economy'))).toBe(true);
  });

  it('closed capital is dashed only with Both', () => {
    const one = at('tab=story');
    const dashed = (c) => [...c.querySelectorAll('path')].filter((p) => p.style.strokeDasharray).length;
    expect(dashed(one.container)).toBe(0);
    one.unmount();
    const both = at('tab=story&s=uk_low&closure=both');
    // three arms in two charts (GDP and debt)
    expect(dashed(both.container)).toBe(6);
  });
});

// In jsdom every step sits at the top of the page, so the scrolly shows its
// last state; the graphics are rendered here at each state directly.
describe('each state of each graphic', () => {
  it('lines draw in turn', async () => {
    const { ScenarioPaths, ArmPaths, WelfareShape } = await import('@/tabs/story/part2/charts.jsx');
    const drawn = (el) => {
      const { container, unmount } = render(<NavProvider>{el}</NavProvider>);
      const n = container.querySelectorAll('.draw-path.is-on').length + container.querySelectorAll('.fade-g.is-on path').length;
      unmount();
      return n;
    };
    // the shaded UK range fades in with UK high (state 3), as one more path
    expect([0, 1, 2, 3, 4].map((i) => drawn(<ScenarioPaths state={i} sid="uk_central" cl="zk0.1" />))).toEqual([0, 1, 2, 4, 5]);
    const arms = (i, closure, allFrom) => drawn(<ArmPaths state={i} sid="uk_high" closure={closure} v="Y" title="t" unit="u" label="l" allFrom={allFrom} />);
    expect([0, 1, 2].map((i) => arms(i, 'central'))).toEqual([1, 2, 3]);
    expect([0, 1, 2].map((i) => arms(i, 'both'))).toEqual([2, 4, 6]);
    expect([0, 1].map((i) => arms(i, 'central', 1))).toEqual([1, 3]);
    expect([0, 1].map((i) => drawn(<WelfareShape state={i} />))).toEqual([1, 2]);
  });

  it('tiles move between groups and never overlap', async () => {
    const { shockTiles } = await import('@/tabs/story/part2/ShockTiles.jsx');
    const visible = (s) => shockTiles(s).filter((t) => t.color !== 'transparent');
    expect([0, 1, 2].map((s) => visible(s).length)).toEqual([100, 100, 105]);
    for (const s of [0, 1, 2]) {
      const pos = visible(s).map((t) => `${t.x},${t.y}`);
      expect(new Set(pos).size).toBe(pos.length);
    }
    const left = (s) => visible(s).filter((t) => t.x < 8).length;
    expect(left(1)).toBeLessThan(left(0));
    expect(left(2)).toBeGreaterThan(left(1));
  });
});
