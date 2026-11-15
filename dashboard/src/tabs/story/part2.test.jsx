// Story part 2: the one home of the three headline figures and of where
// 2031 output goes. It prints the tiles and the Why list, and the Sankey's
// shares and the waterfall's changes, from the data file, and no other
// figure: every other chart draws a shape (axis ticks carry data-axis) and
// links to the tab that holds the figures. Rendered against a fixture with
// altered values.
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
fixture.output_split.change.uk_central.zk0 = { status: 'pending' };

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

  it('prints figures only inside the headline block and where output goes', () => {
    for (const q of ['tab=story', 'tab=story&closure=both', 'tab=story&s=korinek&closure=closed']) {
      const { container, unmount } = at(q);
      const part = container.querySelector('#story-part-2');
      const head = part.querySelector('#story-headline');
      const all = textWithoutAxes(part).match(FIGURE) ?? [];
      const inHead = textWithoutAxes(head).match(FIGURE) ?? [];
      expect(all.length).toBeGreaterThan(0);
      expect(all).toEqual(inHead);
      // outside those two blocks, no decimal number at all
      const rest = part.cloneNode(true);
      rest.querySelectorAll('#story-headline, #story-output, [data-axis]').forEach((n) => n.remove());
      expect(rest.textContent).not.toMatch(/\d\.\d/);
      unmount();
    }
  });

  it('every chart is an image with a text alternative, and links keep the reader’s choices', () => {
    const { container } = at('tab=story&s=uk_high&closure=both');
    const svgs = [...container.querySelectorAll('svg.story-svg, svg.tile-grid')];
    expect(svgs.length).toBe(6);
    expect(container.querySelectorAll('svg.sankey')).toHaveLength(1);
    for (const s of svgs) {
      expect(s.getAttribute('role')).toBe('img');
      expect(s.getAttribute('aria-label')).toBeTruthy();
    }
    expect(container.querySelectorAll('svg.sankey')[0].getAttribute('aria-label')).toBeTruthy();
    expect(container.querySelectorAll('.story-source')).toHaveLength(8);
    const hrefs = [...container.querySelectorAll('.p2-more a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/?tab=explore&sub=who&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=explore&sub=finances&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=method&s=uk_high&closure=both#m-closures');
    expect(hrefs.some((h) => h.startsWith('/?tab=method&sub=scenarios'))).toBe(true);
    // Income and output is Results' first sub-tab, so the address leaves it out
    expect(hrefs).toContain('/?tab=explore&s=uk_high&closure=both#income');
    expect(hrefs.some((h) => h.startsWith('/?tab=explore') && h.endsWith('#explore-part-economy'))).toBe(true);
    // one line of links in place of the Go deeper cards
    expect(container.querySelector('.entry-grid')).toBeNull();
    const deeper = [...container.querySelectorAll('.p2-deeper a')].map((a) => a.getAttribute('href'));
    expect(deeper).toContain('/?tab=explore&sub=finances&s=uk_high&closure=both');
    expect(deeper).toContain('/?tab=method&s=uk_high&closure=both'); // OG-UK method is Method's first sub-tab
    // the labour-share change is linked to, not reprinted
    const out = container.querySelector('#story-output');
    expect([...out.querySelectorAll('a')].some((a) => a.getAttribute('href').endsWith('#explore-part-economy'))).toBe(true);
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

describe('where output goes', () => {
  const S2 = fixture.output_split;
  const PARTS = ['labour', 'domestic', 'foreign', 'depreciation'];
  const sgn = (x) => (Math.abs(x) < 0.005 ? '0.00' : `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}`);

  it('the Sankey balances: inflow equals outflow at every node, and GDP equals the sum of the four parts', async () => {
    const { imbalances } = await import('@/components/story/Sankey.jsx');
    const { sankeyGraph } = await import('@/tabs/story/part2/split.js');
    for (const cl of ['zk0.1', 'zk0']) {
      for (const short of [true, false]) {
        const g = sankeyGraph(S2.baseline[cl], short);
        expect(imbalances(g, 1e-12)).toEqual([]);
        // the middle node is checked by imbalances(); the source and leaves here
        const out = (id) => g.links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0);
        const inn = (id) => g.links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0);
        expect(inn('capital')).toBeCloseTo(out('capital'), 12);
        const leaves = PARTS.reduce((s, k) => s + inn(k), 0);
        expect(out('gdp')).toBeCloseTo(leaves, 12);
        expect(out('gdp')).toBeCloseTo(100, 9);
        for (const k of PARTS) expect(inn(k)).toBeCloseTo(S2.baseline[cl][k], 12);
      }
    }
  });

  it('prints each share and change from the data file, follows the closure, and says so with Both', () => {
    const cases = [
      ['tab=story&s=uk_high', 'uk_high', 'zk0.1'],
      ['tab=story&s=uk_high&closure=closed', 'uk_high', 'zk0'],
      ['tab=story&s=korinek&closure=both', 'korinek', 'zk0.1'],
    ];
    for (const [q, sid, cl] of cases) {
      const { container, unmount } = at(q);
      const out = container.querySelector('#story-output');
      const subs = [...out.querySelectorAll('.sankey-sub')].map((n) => n.textContent);
      const b = S2.baseline[cl];
      const gross = b.domestic + b.foreign + b.depreciation;
      expect(subs).toEqual([(b.labour + gross).toFixed(0), b.labour.toFixed(1), gross.toFixed(1), ...['domestic', 'foreign', 'depreciation'].map((k) => b[k].toFixed(1))]);
      const ch = S2.change[sid][cl];
      const vals = [...out.querySelectorAll('.p2-wf-value')].map((n) => n.textContent.trim());
      expect(vals).toEqual([sgn(ch.labour), sgn(ch.gross_capital), sgn(ch.domestic), sgn(ch.foreign), sgn(ch.depreciation), 'Headline figures']);
      expect(out.textContent.includes('both figures show the central closure')).toBe(q.endsWith('both'));
      expect(out.textContent).toContain(cl === 'zk0' ? 'Closed capital' : 'Central closure');
      unmount();
    }
  });

  it('a pending solve prints pending, not a number', () => {
    const { container } = at('tab=story&s=uk_central&closure=closed');
    const out = container.querySelector('#story-output');
    expect(out.querySelector('.p2-wf')).toBeNull();
    expect(out.textContent).toContain('pending');
  });

  it('the waterfall stacks: each capital part starts where the last ended, and GDP ends at the GDP gap', async () => {
    const { waterfallRows } = await import('@/tabs/story/part2/split.js');
    const ch = S2.change.uk_central['zk0.1'];
    const rows = waterfallRows(ch);
    expect(rows.map((r) => r.id)).toEqual(['labour', 'capital', 'domestic', 'foreign', 'depreciation', 'gdp']);
    expect(rows[2].from).toBe(rows[0].to);
    expect(rows[3].from).toBeCloseTo(rows[2].to, 12);
    expect(rows[4].from).toBeCloseTo(rows[3].to, 12);
    expect(rows[4].to).toBeCloseTo(ch.gdp, 12);
    expect(rows[1].to).toBeCloseTo(ch.gdp, 12);
    expect(ch.gdp).toBeCloseTo(real.results.uk_central.tfp['zk0.1'].gaps.Y[H], 9);
  });
});

describe('from the record to the model', () => {
  it('every line keeps its point count across states, and the gap leaves the forecast line only in the last state', async () => {
    const { morphGeometry, ACT, OBR } = await import('@/tabs/story/part2/Morph.jsx');
    const ys = real.results.uk_central.tfp['zk0.1'].gaps.Y;
    const gs = [0, 1, 2].map((s) => morphGeometry(s, ys));
    expect(ACT.length).toBeGreaterThan(5);
    expect(OBR.length).toBeGreaterThan(2);
    for (const k of ['act', 'obr', 'gap']) expect(new Set(gs.map((g) => g[k].length)).size).toBe(1);
    expect(gs[1].gap).toEqual(gs[1].obr);
    expect(gs[2].obr.every(([, y]) => y === gs[2].zeroY)).toBe(true);
    expect(gs[2].gap.some(([, y]) => y < gs[2].zeroY - 1)).toBe(true);
  });

  it('each state shows its own layers, axis title and source, and prints no figure', async () => {
    const { MorphChart } = await import('@/tabs/story/part2/Morph.jsx');
    const on = (c, sel) => c.querySelector(sel).classList.contains('is-on');
    const seen = [0, 1, 2].map((s) => {
      const { container, unmount } = render(
        <NavProvider>
          <MorphChart state={s} sid="uk_central" cl="zk0.1" />
        </NavProvider>,
      );
      const r = {
        act: on(container, '.p2-mo-act'),
        obr: on(container, '.p2-mo-obr') && !container.querySelector('.p2-mo-obr').classList.contains('is-zero'),
        gap: on(container, '.p2-mo-gap'),
        title: container.querySelector('.story-figure-title > :not(.p2-text-ghost)').textContent,
        source: container.querySelector('.story-source').textContent,
        figures: textWithoutAxes(container).match(/\d\.\d|\d%/g),
      };
      unmount();
      return r;
    });
    expect(seen.map((r) => [r.act, r.obr, r.gap])).toEqual([
      [true, false, false],
      [true, true, false],
      [false, false, true],
    ]);
    expect(seen[0].title).toBe('Real GDP growth');
    expect(seen[2].title).toBe('GDP against the OBR-central path');
    expect(seen[0].source).not.toContain('OG-UK');
    expect(seen[1].source).toContain('Office for Budget Responsibility');
    expect(seen[2].source).toContain('OG-UK');
    for (const r of seen) expect(r.figures).toBeNull();
  });
});

// The outturn series is being extended (2026, perhaps a partial year): the
// morph reads it by key, so a new point that overlaps the forecast's first
// year must still draw and keep the divider off every point.
describe('the morph with a longer outturn series', () => {
  it('draws without NaN and keeps the outturn | forecast divider between points', async () => {
    const uk = JSON.parse(JSON.stringify((await import('@/data/ukContext.json')).default));
    const g = uk.series.gdp_growth;
    g.x.push(g.x[g.x.length - 1] + 1, 'note');
    g.y.push(0.9, null);
    g.partial = { x: g.x[g.x.length - 2], label: 'Q1–Q3' };
    vi.resetModules();
    vi.doMock('@/data/ukContext.json', () => ({ default: uk }));
    const M = await import('@/tabs/story/part2/Morph.jsx');
    expect(M.ACT[M.ACT.length - 1][0]).toBe(g.x[g.x.length - 2]);
    const ys = real.results.uk_central.tfp['zk0.1'].gaps.Y;
    for (const s of [0, 1, 2]) {
      const geo = M.morphGeometry(s, ys);
      for (const k of ['act', 'obr', 'gap']) expect(geo[k].flat().every(Number.isFinite)).toBe(true);
      if (s === 1) {
        const xs = [...geo.act, ...geo.obr].map(([x]) => x);
        expect(xs.every((x) => Math.abs(x - geo.split) > 2)).toBe(true);
      }
    }
    const { container } = render(
      <NavProvider>
        <M.MorphChart state={1} sid="uk_central" cl="zk0.1" />
      </NavProvider>,
    );
    expect(container.innerHTML).not.toMatch(/NaN|undefined/);
    expect(container.querySelectorAll('.p2-mo-dot.is-open').length).toBe(M.OBR.length + 1);
  });
});
