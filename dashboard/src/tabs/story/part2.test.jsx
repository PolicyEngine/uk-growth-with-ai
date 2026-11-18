// Story part 2: the one home of the three headline figures and of where
// 2031 output goes. It prints the tiles and the Why list, and the Sankey's
// shares and the waterfall's changes, from the data file, and no other
// figure: every other chart draws a shape (axis ticks carry data-axis) and
// links to the tab that holds the figures. Rendered against a fixture with
// altered values.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

// Every link behind the "Sources and notes" buttons in `root`: each opened,
// read and closed in turn (the popover is drawn only while open).
function sourceLinks(root) {
  const out = [];
  for (const b of root.querySelectorAll('button.src-line-btn')) {
    fireEvent.click(b);
    const pop = document.getElementById(b.getAttribute('aria-controls'));
    out.push(...[...(pop?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href')));
    fireEvent.click(b);
  }
  return out;
}
const popText = (root) => {
  const b = root.querySelector('button.src-line-btn');
  fireEvent.click(b);
  const t = document.getElementById(b.getAttribute('aria-controls'))?.textContent ?? '';
  fireEvent.click(b);
  return t;
};
import real from '@/lib/activeData.js';
import { stepsWithoutHighlight } from '@/components/story/highlight.jsx';

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

vi.doMock('@/lib/activeData.js', () => ({ default: fixture }));

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
  it('shows the headline tiles from the data file, and the pending no-foreign-capital value', () => {
    const one = at('tab=story');
    expect(one.container.querySelector('#story-headline').textContent).toContain('+2.35%');
    one.unmount();
    const both = at('tab=story&closure=both');
    expect(both.container.querySelector('#story-headline').textContent).toContain('With no foreign capital: not yet solved');
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
      // outside those two blocks, no decimal number at all: the shock scene's
      // quoted input (data-input) and its scale (one small tile is 0.1, in
      // its unit line and strip head) are not figures
      const rest = part.cloneNode(true);
      rest.querySelectorAll('#story-headline, #story-output, [data-axis], [data-input], #p2-shock .story-figure-unit, #p2-shock .p2-shock-strip-head').forEach((n) => n.remove());
      expect(rest.textContent).not.toMatch(/\d\.\d/);
      unmount();
    }
  });

  it('the GDP figure’s notes hold the headline step’s reading notes and links', async () => {
    const { MorphChart } = await import('@/tabs/story/part2/Morph.jsx');
    const { container } = render(
      <NavProvider>
        <MorphChart state={4} sid="uk_central" cl="zk0.1" />
      </NavProvider>,
    );
    expect(popText(container)).toContain('Main version, against the OBR’s central forecast path');
    const links = sourceLinks(container);
    for (const end of ['#economy-wall', '#explore-part-all', '#m-debt']) expect(links.some((h) => h.endsWith(end))).toBe(true);
  });

  it('every chart is an image with a text alternative, and links keep the reader’s choices', () => {
    const { container } = at('tab=story&s=uk_high&closure=both');
    const svgs = [...container.querySelectorAll('svg.story-svg, svg.tile-grid')];
    expect(svgs.length).toBe(4); // the shock's overview and strip, the GDP canvas (2A), who gains
    expect(container.querySelectorAll('svg.sankey')).toHaveLength(1);
    for (const s of svgs) {
      expect(s.getAttribute('role')).toBe('img');
      expect(s.getAttribute('aria-label')).toBeTruthy();
    }
    expect(container.querySelectorAll('svg.sankey')[0].getAttribute('aria-label')).toBeTruthy();
    // one quiet "Sources and notes" button a figure (the output split's two
    // charts share one), no phone-only repeats
    expect(container.querySelectorAll('#story-part-2 button.src-line-btn')).toHaveLength(4);
    expect(container.querySelectorAll('.p2-src-phone')).toHaveLength(0);
    const part2 = container.querySelector('#story-part-2');
    const hrefs = [...[...part2.querySelectorAll('a')].map((a) => a.getAttribute('href')), ...sourceLinks(part2)];
    expect(hrefs).toContain('/?tab=explore&sub=who&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=explore&sub=finances&s=uk_high&closure=both#public-finances');
    // the Scenarios sub-tab folded into OG-UK method
    expect(hrefs.some((h) => h.startsWith('/?tab=method') && h.endsWith('#m-scenarios'))).toBe(true);
    expect(hrefs.some((h) => h.includes('sub=scenarios'))).toBe(false);
    // the pay caveat's closure link and the other arms' link leave the step
    // text for the GDP figure's notes icon (item 7)
    const stepLinks = [...part2.querySelectorAll('.scrolly-step a, .p2-headline-step a')].map((a) => a.getAttribute('href'));
    expect(stepLinks.some((h) => h.endsWith('#explore-part-all') || h.endsWith('#economy-wall'))).toBe(false);
    // no next-part band, no per-step result-file lines or folds
    expect(container.querySelector('.story-next-links')).toBeNull();
    expect(container.querySelector('#story-part-2 .p2-result-links, #story-part-2 details.p2-fold')).toBeNull();
  });

  it('the headline figures are the GDP scene’s last step, and the arms leave the Story for Explore', () => {
    const { container } = at('tab=story&s=uk_low&closure=both');
    const head = container.querySelector('#p2-morph #story-headline');
    expect(head).not.toBeNull();
    expect(head.closest('.scrolly-step').id).toBe('p2-headline');
    expect(container.querySelector('#p2-arms, .p2-pair')).toBeNull();
    // no inline links in the step (item 7); the scene's one "More on
    // Explore" link is the debt note under its caption, in the frame
    expect([...head.closest('.scrolly-step').querySelectorAll('a')].filter((x) => !x.closest('.scrolly-takeaway-in-step'))).toHaveLength(0);
    const note = container.querySelector('#p2-morph .scrolly-takeaway-note');
    expect(note.textContent).toMatch(/^Public debt ends (above|below|on) the forecast path in \d{4}.* More on Explore$/);
    expect([...note.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/?tab=explore&sub=finances&s=uk_low&closure=both#public-finances']);
  });
});

// In jsdom every step sits at the top of the page, so the scrolly shows its
// last state; the graphics are rendered here at each state directly.
describe('each state of each graphic', () => {
  it('lines draw in turn', async () => {
    const { WelfareShape } = await import('@/tabs/story/part2/charts.jsx');
    const drawn = (el) => {
      const { container, unmount } = render(<NavProvider>{el}</NavProvider>);
      const n = container.querySelectorAll('.draw-path.is-on').length + container.querySelectorAll('.fade-g.is-on path').length;
      unmount();
      return n;
    };
    expect([0, 1].map((i) => drawn(<WelfareShape state={i} />))).toEqual([1, 2]);
  });

  it('the GDP canvas: the other scenarios draw in at states 3 and 4, and only Korinek et al. rescales the axis', async () => {
    const { MorphChart, rescales } = await import('@/tabs/story/part2/Morph.jsx');
    const scen = (state, sid, cl) => {
      const { container, unmount } = render(
        <NavProvider>
          <MorphChart state={state} sid={sid} cl={cl} />
        </NavProvider>,
      );
      const on = [...container.querySelectorAll('.p2-mo-scen.is-on')].map((p) => p.getAttribute('data-scen')).sort();
      const ticks = [...container.querySelectorAll('.p2-mo-yt.is-on text')].map((t) => t.textContent);
      unmount();
      return { on, ticks };
    };
    for (const cl of ['zk0.1', 'zk0']) {
      for (const sid of fixture.scenarios.map((x) => x.id)) {
        if (fixture.results[sid].tfp[cl].status !== 'done') continue;
        const st = [2, 3, 4].map((i) => scen(i, sid, cl));
        expect(st[0].on).toEqual([]);
        expect(st[1].on).not.toContain('korinek');
        expect(st[2].on).toContain(sid === 'korinek' ? 'uk_high' : 'korinek');
        // no rescale between states 2 and 3; between 3 and 4 only when
        // Korinek et al. is not the chosen scenario and lies beyond the UK axis
        expect(st[1].ticks).toEqual(st[0].ticks);
        if (sid === 'korinek') expect(rescales(sid, cl)).toBe(false);
        if (!rescales(sid, cl)) expect(st[2].ticks).toEqual(st[1].ticks);
      }
    }
    expect(rescales('uk_central', 'zk0.1')).toBe(true);
  });

  it('the shock strip: tiles cross, then new ones are added, never overlap, and keep their keys', async () => {
    const { shockFor, shockTiles, overviewTiles, WIN } = await import('@/tabs/story/part2/shock.js');
    const sh = shockFor('uk_central', 'central');
    expect([sh.M, sh.N, sh.NL, sh.NK, sh.RL, sh.L0]).toEqual([16, 9, 6, 3, 2, 65]);
    const st = [0, 1, 2].map((s) => shockTiles(s, sh));
    expect(st.map((t) => t.length)).toEqual([sh.RL * WIN + 10, sh.RL * WIN + 10, sh.RL * WIN + 10 + sh.N]);
    for (const tiles of st) {
      const pos = tiles.map((t) => `${t.x},${t.y}`);
      expect(new Set(pos).size).toBe(pos.length);
      for (const t of tiles) expect(t.y >= 0 && t.y < sh.R && t.x >= 0 && t.x < 2 * WIN + 2).toBe(true);
    }
    const left = (tiles) => tiles.filter((t) => t.x < WIN).length;
    expect(left(st[0]) - left(st[1])).toBe(sh.M);
    expect(left(st[2]) - left(st[1])).toBe(sh.NL);
    // the overview never changes; it outlines labour's last RL tiles and capital's last
    const ov = overviewTiles(sh);
    expect(ov).toHaveLength(100);
    expect(ov.filter((t) => t.mark).map((t) => t.key)).toEqual(['l63', 'l64', 'c34']);
    // a forward move leads by 450ms; the way back and a landing do not
    expect(Math.min(...shockTiles(1, sh, { lead: 450 }).filter((t) => t.group === 'moved').map((t) => t.delay))).toBe(450);
    expect(Math.min(...shockTiles(1, sh).filter((t) => t.group === 'moved').map((t) => t.delay))).toBe(0);
  });

  it('the shock’s small-tile counts follow the data in every done cell', async () => {
    const { shockCounts } = await import('@/tabs/story/part2/shock.js');
    const S2 = real.output_split;
    const i = real.years.indexOf(S2.year);
    // section 0 of the spec (shock-tiles-fable.md): M, N, NL, NK, rows
    const TABLE = {
      'uk_low zk0.1': [7, 4, 3, 1, 3],
      'uk_low zk0': [7, 2, 1, 1, 3],
      'uk_central zk0.1': [16, 9, 6, 3, 3],
      'uk_central zk0': [16, 4, 2, 2, 3],
      'uk_high zk0.1': [29, 27, 17, 10, 5],
      'uk_high zk0': [29, 16, 10, 6, 5],
      'korinek zk0.1': [39, 49, 30, 19, 7],
      'korinek zk0': [39, 30, 19, 11, 6],
    };
    let n = 0;
    for (const [sid, byCl] of Object.entries(S2.change)) {
      for (const [cl, ch] of Object.entries(byCl)) {
        if (ch.status !== 'done') continue;
        const inputPp = real.scenarios.find((x) => x.id === sid).labour_share_fall_pp;
        const c = shockCounts(S2.baseline[cl], ch, inputPp);
        expect(c.M).toBe(Math.round(-real.results[sid].tfp[cl].gaps.labour_share_pp[i] * 10));
        expect(c.NL + c.NK).toBe(c.N);
        expect(Math.abs(c.NL - c.M - ch.labour * 10)).toBeLessThanOrEqual(1);
        expect(Math.abs(c.M + c.NK - ch.gross_capital * 10)).toBeLessThanOrEqual(1);
        expect(c.M).toBeGreaterThan(c.NL);
        if (TABLE[`${sid} ${cl}`]) expect([c.M, c.N, c.NL, c.NK, c.R], `${sid} ${cl}`).toEqual(TABLE[`${sid} ${cl}`]);
        n++;
      }
    }
    expect(n).toBe(8);
  });

  it('the shock with a pending solve: the shift draws, the added output says pending', async () => {
    const { default: ShockTiles } = await import('@/tabs/story/part2/ShockTiles.jsx');
    const { shockFor } = await import('@/tabs/story/part2/shock.js');
    const sh = shockFor('uk_central', 'closed');
    expect(sh.ch).toBeNull();
    const draw = (state) => {
      const { container, unmount } = render(
        <NavProvider>
          <ShockTiles state={state} shock={sh} sid="uk_central" />
        </NavProvider>,
      );
      const svgs = [...container.querySelectorAll('svg.tile-field')];
      const r = { strip: svgs[1]?.querySelectorAll('rect').length, caps: [...container.querySelectorAll('.p2-shock-cap.is-on')].map((p) => p.textContent) };
      unmount();
      return r;
    };
    const st = [0, 1, 2].map(draw);
    expect(st[0].strip).toBe(sh.RL * 10 + 10);
    expect(st[1].strip).toBe(st[0].strip);
    expect(st[2].strip).toBe(st[0].strip);
    const input = real.scenarios.find((x) => x.id === 'uk_central').labour_share_fall_pp.toFixed(1);
    expect(st[1].caps).toEqual([`AI moves ${input} of every 100 tiles of output from labour to capital: ${sh.M} small tiles cross. Its size is an assumption for each scenario.`]);
    expect(st[2].caps[1]).toBe('This solve is pending for the foreign-capital case chosen above.');
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
      expect(vals).toEqual([sgn(ch.labour), sgn(ch.gross_capital), sgn(ch.domestic), sgn(ch.foreign), sgn(ch.depreciation), sgn(ch.gdp)]);
      // each printed change names its path in the data (trace a number)
      const paths = [...out.querySelectorAll('.p2-wf-value[data-path]')].map((n) => n.getAttribute('data-path'));
      expect(paths).toEqual(['labour', 'gross_capital', 'domestic', 'foreign', 'depreciation', 'gdp'].map((k) => `output_split.change.${sid}.${cl}.${k}`));
      expect(out.textContent.includes('both figures show some foreign capital')).toBe(q.endsWith('both'));
      expect(out.textContent).toContain(cl === 'zk0' ? 'No foreign capital' : 'Some foreign capital');
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
    expect(rows[5].value).toBe(ch.gdp);
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
    // form (b), as the hero: in the gap state the line starts in the surprise
    // year; every earlier point sits on that first point (no 2027-28 segment)
    const i0 = real.years.indexOf(real.surprise_year);
    for (let i = 0; i < i0; i++) expect(gs[2].gap[i]).toEqual(gs[2].gap[i0]);
    expect(gs[2].gap[i0 + 1][0]).toBeGreaterThan(gs[2].gap[i0][0]);
  });

  it('the other scenarios and the UK range start in the surprise year too', async () => {
    const { MorphChart } = await import('@/tabs/story/part2/Morph.jsx');
    const { container } = render(
      <NavProvider>
        <MorphChart state={4} sid="uk_central" cl="zk0.1" />
      </NavProvider>,
    );
    const pts = (d) => d.match(/[ML]-?[\d.]+,-?[\d.]+/g).map((p) => p.slice(1).split(',').map(Number));
    const i0 = real.years.indexOf(real.surprise_year);
    const scen = [...container.querySelectorAll('.p2-mo-scen')];
    expect(scen.length).toBeGreaterThan(0);
    for (const p of scen) {
      const q = pts(p.getAttribute('d'));
      expect(q).toHaveLength(real.years.length);
      for (let i = 0; i < i0; i++) expect(q[i]).toEqual(q[i0]);
    }
    const band = pts(container.querySelector('.p2-mo-band').getAttribute('d'));
    const x0 = band[i0][0];
    expect(Math.min(...band.map(([x]) => x))).toBe(x0);
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
        title: container.querySelector('.story-figure-title .p2-text-stack > :not(.p2-text-ghost)').textContent,
        source: popText(container),
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
    // findings as titles (story-finding-titles-fable.md)
    expect(seen[0].title).toBe('Growth swung widely in 2020 and 2021');
    expect(seen[1].title).toBe('The OBR’s forecast is steadier than the last ten years');
    expect(seen[2].title).toBe(`GDP runs above the forecast path from ${real.surprise_year}`);
    expect(seen[0].source).not.toContain('OG-UK');
    expect(seen[1].source).toContain('OBR');
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

// Every arrow part 2 draws (gapUp, gapDown, onPath) comes from the sign of
// the value it describes, for every scenario and closure (and with the
// header's Both, which reads some foreign capital).
describe('direction icons follow the signs', () => {
  const SIDS = fixture.scenarios.map((s) => s.id);
  const CLS = ['zk0.1', 'zk0'];
  const sign = (x) => (Math.abs(x) < 0.005 ? 'onPath' : x > 0 ? 'gapUp' : 'gapDown');
  it('the headline tiles: no arrow beside a signed figure; the pay caveat where its sign flips', async () => {
    const { paySigns } = await import('@/tabs/story/part2/caveats.js');
    for (const sid of SIDS) {
      for (const mode of ['central', 'closed', 'both']) {
        const { container, unmount } = at(`tab=story&s=${sid}&closure=${mode}`);
        const tiles = [...container.querySelectorAll('#story-headline .stat-tile')];
        expect(tiles).toHaveLength(3);
        expect(container.querySelector('#story-headline .stat-dir, #story-headline .kpi-range')).toBeNull();
        expect(!!tiles[1].textContent.includes('positive with more foreign capital'), `${sid} ${mode}`).toBe(paySigns(sid) === 'flips');
        // neutral ink: no gain or loss colour on any value
        expect(container.querySelector('#story-headline .stat-value.is-gain, #story-headline .stat-value.is-loss')).toBeNull();
        unmount();
      }
    }
  });

  it('says once, in the About fold, which OBR vintage the path uses', async () => {
    const { PARTS } = await import('@/tabs/story/StoryTab.jsx');
    const { container } = render(<div>{PARTS[1].about}</div>);
    expect(container.textContent).toContain('The forecast path: the OBR’s March 2026 forecast, its AI included');
  });

  it('shows each model’s key limit open, above the About fold, in parts 2 and 3 (item 4)', async () => {
    const { PARTS } = await import('@/tabs/story/StoryTab.jsx');
    const { PartOpener } = await import('@/tabs/story/PartHead.jsx');
    for (const [part, words] of [[PARTS[1], /no unemployment/i], [PARTS[2], /one year/i]]) {
      const { container } = render(<PartOpener part={part} question={part.question} about={part.about} />);
      const line = container.querySelector('.part-opener-line');
      expect(line.textContent).toMatch(words);
      expect(line.closest('details')).toBeNull();
      cleanup();
    }
  });

  it('the headline step is one sentence and a three-row ledger named as in the hero, no chip', () => {
    const { container } = at('tab=story&s=uk_central');
    const head = container.querySelector('#story-headline');
    expect(head.querySelectorAll('.stat-tile')).toHaveLength(3);
    const lines = [...head.querySelectorAll('p')].filter((p) => !p.closest('.stat-tile'));
    expect(lines).toHaveLength(0);
    expect(container.querySelector('.p2-headline-chip')).toBeNull();
    const say = container.querySelector('#p2-headline .p2-say').textContent;
    expect(say).toBe(`UK central scenario, ${fixture.headline_year}: gaps against the OBR’s central forecast path.`);
    expect(say.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(say).not.toMatch(/\d\.\d/);
    // the hero's three names, word for word; the tip's name keeps the case
    expect([...head.querySelectorAll('.stat-name .tip-target')].map((n) => n.textContent)).toEqual(['GDP', 'Pay rates', 'National income']);
    expect(head.querySelector('.stat-name [aria-label]')?.getAttribute('aria-label') ?? '').not.toMatch(/What is gdp/);
    // each tile: label, number and one line of at most six words
    for (const t of head.querySelectorAll('.stat-tile .stat-sub')) expect(t.textContent.split(/\s+/).length).toBeLessThanOrEqual(6);
    expect(head.querySelectorAll('.stat-tile .stat-sub')[2].textContent).toBe('GDP less net income paid abroad');
    expect(head.textContent).not.toContain('capital takes a larger share');
    expect(head.textContent).not.toContain('household consumption');
  });

  it('"slower growth, not a cut" only where pay still rises every year (pay_growth_pct), in the ledger and the hero', async () => {
    const { payLine, payRises } = await import('@/tabs/ai/surprise.js');
    const H = fixture.years.indexOf(fixture.headline_year);
    for (const sid of SIDS) {
      for (const cl of CLS) {
        const r = fixture.results[sid].tfp[cl];
        if (r.status !== 'done') continue;
        const win = r.pay_growth_pct.filter((_, i) => fixture.years[i] >= fixture.surprise_year && fixture.years[i] <= fixture.headline_year);
        expect(win).toHaveLength(fixture.headline_year - fixture.surprise_year + 1);
        expect(payRises(sid, 'tfp', cl)).toBe(win.every((x) => x > 0));
        const w = r.gaps.w[H];
        expect(payLine(sid, cl)).toBe(w < -0.005 ? (win.every((x) => x > 0) ? 'slower growth, not a cut' : 'below the forecast path') : 'pay for the same work');
      }
    }
    // a cell whose pay falls in one year loses the line
    const r = fixture.results.uk_central.tfp['zk0.1'];
    const keep = r.pay_growth_pct;
    r.pay_growth_pct = keep.map((x, i) => (fixture.years[i] === fixture.surprise_year ? -0.1 : x));
    try {
      expect(payLine('uk_central', 'zk0.1')).toBe('below the forecast path');
    } finally {
      r.pay_growth_pct = keep;
    }
  });

  it('the debt line follows the signs, gives the reason where the interest rate is up, and the OBR repricing pace in words', async () => {
    const { debtLine } = await import('@/tabs/ai/Landing.jsx');
    const L = fixture.years.indexOf(fixture.late_year);
    for (const sid of SIDS) {
      for (const cl of CLS) {
        const r = fixture.results[sid].tfp[cl];
        const line = debtLine(sid, cl);
        if (r.status !== 'done') {
          expect(line).toBeNull();
          continue;
        }
        const d = r.gaps.debt_gdp_pp[L];
        const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
        expect(line).toContain(`ends ${side(d)} the forecast path in ${fixture.late_year}`);
        expect(line.includes('if repriced at once')).toBe(d > 0.005 && r.gaps.r_bp[L] > 0);
        // the OBR's slower repricing: the other side of the path, or a smaller rise, in words
        const obr = r.debt_gdp_pp_obr_repricing_late;
        if (side(obr) !== side(d)) expect(line).toContain(`at the OBR’s repricing pace, it ends ${side(obr)} the forecast path`);
        else if (d > 0.005 && obr < d) expect(line).toMatch(/at the OBR’s repricing pace, the gap is .*$/);
        expect(line).not.toMatch(/\d\.\d/);
      }
    }
  });

  it('the scenarios', async () => {
    const { scenarioDir } = await import('@/tabs/story/Part2.jsx');
    const from = fixture.years.indexOf(fixture.surprise_year) + 1;
    for (const cl of CLS) {
      const tails = SIDS.map((sid) => fixture.results[sid].tfp[cl]).filter((r) => r.status === 'done').map((r) => r.gaps.Y.slice(from));
      const flat = tails.flat();
      expect(scenarioDir(cl)).toBe(flat.every((v) => v > 0.005) ? 'gapUp' : flat.every((v) => v < -0.005) ? 'gapDown' : null);
    }
  });

  it('where output goes', async () => {
    const { outChangeItems } = await import('@/tabs/story/part2/OutputSplit.jsx');
    for (const [sid, byCl] of Object.entries(fixture.output_split.change)) {
      for (const [cl, ch] of Object.entries(byCl)) {
        if (ch.status !== 'done') continue;
        const items = outChangeItems(ch);
        expect(items[0].icon, `${sid} ${cl} gdp`).toBe(sign(ch.gdp));
        expect(items[1].icon, `${sid} ${cl} labour`).toBe(sign(ch.labour));
        expect(items[1].text).toContain(ch.labour < 0 ? 'below' : 'above');
      }
    }
  });

  it('attributes inputs: no first person, every model source linked', () => {
    for (const q of ['tab=story', 'tab=story&s=korinek&closure=both']) {
      const { container, unmount } = at(q);
      const part = container.querySelector('#story-part-2');
      expect(part.textContent).not.toMatch(/\b([Oo]ur|[Ww]e)\b/);
      // every model figure's "Sources and notes" links its result files or source
      for (const fig of part.querySelectorAll('figure')) {
        const links = [...sourceLinks(fig), ...[...fig.querySelectorAll('a')].map((a) => a.getAttribute('href'))];
        expect(links.some((h) => h.startsWith('http')), fig.className).toBe(true);
      }
      // the solves at the data file's commit
      const files = [...sourceLinks(part), ...[...part.querySelectorAll('a')].map((a) => a.getAttribute('href'))].filter((h) => h.includes('/analysis/surprise/output'));
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) expect(f).toContain(`/${fixture.source_commit}/`);
      unmount();
    }
  });

  it('gives every block a question, and each step one sentence with no kind label', async () => {
    const { SUBS } = await import('@/tabs/story/Part2.jsx');
    const { OUTPUT_SUB } = await import('@/tabs/story/part2/OutputSplit.jsx');
    for (const sub of [...Object.values(SUBS), OUTPUT_SUB]) {
      expect(sub.question).toMatch(/\?$/);
      expect(sub.title).not.toContain('Where output goes in');
    }
    const { container, unmount } = at('tab=story');
    for (const id of ['p2-shock', 'p2-morph', 'p2-output', 'p2-who']) {
      // at most three steps, each one sentence, no kind label, no fold, no empty item
      expect(container.querySelectorAll(`#${id} .p2-kind, #${id} details`).length, id).toBe(0);
      expect([...container.querySelectorAll(`#${id} li:not([aria-hidden])`)].filter((li) => !li.textContent.trim()).length, id).toBe(0);
      const cards = container.querySelectorAll(`#${id} .scrolly-step:not(.is-spacer)`);
      // at most three cards; the GDP scene four (item 30: the record is a
      // step of its own before the change to the gap)
      expect(cards.length, id).toBeLessThanOrEqual(id === 'p2-morph' ? 4 : 3);
      for (const c of cards) {
        const say = c.querySelectorAll('.p2-say');
        expect(say.length, c.id).toBe(1);
        expect(say[0].querySelector('.p2-say-text').textContent.trim().split(/\s+/).length, c.id).toBeLessThanOrEqual(25);
      }
    }
    expect(container.querySelectorAll('#p2-shock .scrolly-step:not(.is-spacer)')).toHaveLength(3);
    expect(container.querySelectorAll('#p2-output .scrolly-step:not(.is-spacer)')).toHaveLength(2);
    expect(stepsWithoutHighlight(container.querySelector('#story-part-2'))).toEqual([]);
    unmount();
  });

  it('the shock scene: one quoted input, no signed decimal, and says which part is input and which is model', () => {
    for (const q of ['tab=story', 'tab=story&s=korinek&closure=both', 'tab=story&s=uk_low&closure=closed']) {
      const { container, unmount } = at(q);
      const shock = container.querySelector('#p2-shock');
      expect(shock.querySelectorAll('.scrolly-graphic-inner [data-input]'), q).toHaveLength(1);
      expect(shock.textContent).not.toMatch(/[+−]\d+\.\d+/);
      expect(shock.textContent).toContain('Its size is an assumption for each scenario.');
      // the added output's size is OG-UK's, said once, in its caption; its
      // one decimal restates the headline GDP gap (data-axis)
      const two = shock.querySelectorAll('.p2-shock-cap')[1];
      if (/new small tile/.test(two.textContent)) {
        expect(two.textContent).toContain('OG-UK works out the size.');
        expect(two.querySelectorAll('[data-axis]'), q).toHaveLength(1);
      }
      expect(shock.textContent.match(/OG-UK works out the size/g)?.length ?? 0).toBeLessThanOrEqual(1);
      expect(shock.textContent).toContain('OBR’s central forecast path');
      expect(shock.textContent).not.toMatch(/no-shock|[Ii]llustrat/);
      unmount();
    }
  });

  it('labels every chart axis', () => {
    const { container, unmount } = at('tab=story');
    const part = container.querySelector('#story-part-2');
    for (const svg of part.querySelectorAll('svg[role="img"]')) {
      const fig = svg.closest('figure');
      if (fig?.hasAttribute('data-no-axes')) continue;
      expect(fig?.querySelector('[data-axis-title="y"]'), svg.getAttribute('aria-label')).not.toBeNull();
    }
    unmount();
  });

  it('a pinned scenario is in the GDP canvas\'s axis domain', async () => {
    const { canvasLines, canvasDomain, pinnedOf, rescales } = await import('@/tabs/story/part2/Morph.jsx');
    const lines = canvasLines('zk0.1');
    const kor = lines.find((l) => l.id === 'korinek').ys;
    expect(pinnedOf('uk_central', 'uk_central', lines)).toBeNull();
    expect(pinnedOf('korinek', 'uk_central', lines)).toBe('korinek');
    // a pinned Korinek et al. is in the domain from state 2, so it never clips and nothing rescales later
    expect(canvasDomain(2, 'uk_central', lines, 'korinek')).toEqual(expect.arrayContaining(kor));
    expect(rescales('uk_central', 'zk0.1', 'korinek')).toBe(false);
  });
});
