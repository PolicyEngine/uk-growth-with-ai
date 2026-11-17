// Story part 2: the one home of the three headline figures and of where
// 2031 output goes. It prints the tiles and the Why list, and the Sankey's
// shares and the waterfall's changes, from the data file, and no other
// figure: every other chart draws a shape (axis ticks carry data-axis) and
// links to the tab that holds the figures. Rendered against a fixture with
// altered values.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import real from '@/data/surprise2028.json';
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
    expect(svgs.length).toBe(3); // shock tiles, the GDP canvas (2A), who gains
    expect(container.querySelectorAll('svg.sankey')).toHaveLength(1);
    for (const s of svgs) {
      expect(s.getAttribute('role')).toBe('img');
      expect(s.getAttribute('aria-label')).toBeTruthy();
    }
    expect(container.querySelectorAll('svg.sankey')[0].getAttribute('aria-label')).toBeTruthy();
    // the output split's two charts share one foot; the GDP canvas and Who gains repeat theirs in a phone-only Scrolly foot
    expect(container.querySelectorAll('.story-source')).toHaveLength(6);
    expect(container.querySelectorAll('.p2-src-phone')).toHaveLength(2);
    const hrefs = [...container.querySelectorAll('#story-part-2 a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/?tab=explore&sub=who&s=uk_high&closure=both');
    expect(hrefs).toContain('/?tab=explore&sub=finances&s=uk_high&closure=both#public-finances');
    // the Scenarios sub-tab folded into OG-UK method
    expect(hrefs.some((h) => h.startsWith('/?tab=method') && h.endsWith('#m-scenarios'))).toBe(true);
    expect(hrefs.some((h) => h.includes('sub=scenarios'))).toBe(false);
    // the pay caveat's closure link and the other arms' link leave the step
    // text for the figure's notes icon (item 7; wired after the sources merge)
    expect(hrefs.some((h) => h.endsWith('#explore-part-all'))).toBe(false);
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
    expect(head.closest('.scrolly-step').querySelectorAll('a')).toHaveLength(0);
    const note = container.querySelector('#p2-morph .scrolly-graphic-inner .scrolly-takeaway-note');
    expect(note.textContent).toMatch(/^Public debt ends (above|below|on) the path in \d{4}.* More on Explore$/);
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
      expect(vals).toEqual([sgn(ch.labour), sgn(ch.gross_capital), sgn(ch.domestic), sgn(ch.foreign), sgn(ch.depreciation), sgn(ch.gdp)]);
      // each printed change names its path in the data (trace a number)
      const paths = [...out.querySelectorAll('.p2-wf-value[data-path]')].map((n) => n.getAttribute('data-path'));
      expect(paths).toEqual(['labour', 'gross_capital', 'domestic', 'foreign', 'depreciation', 'gdp'].map((k) => `output_split.change.${sid}.${cl}.${k}`));
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

// Every arrow part 2 draws (gapUp, gapDown, onPath) comes from the sign of
// the value it describes, for every scenario and closure (and with the
// header's Both, which reads the central closure).
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
        expect(!!tiles[1].textContent.includes('sign depends on the closure'), `${sid} ${mode}`).toBe(paySigns(sid) === 'flips');
        unmount();
      }
    }
  });

  it('says once, in the About fold, which OBR vintage the path uses', async () => {
    const { PARTS } = await import('@/tabs/story/StoryTab.jsx');
    const { container } = render(<div>{PARTS[1].about}</div>);
    expect(container.textContent).toContain('The path is built on the OBR’s March 2026 forecast');
  });

  it('the headline step is one short sentence, a chip and the three tiles (item 7)', () => {
    const { container } = at('tab=story&s=uk_central');
    const head = container.querySelector('#story-headline');
    expect(head.querySelectorAll('.stat-tile')).toHaveLength(3);
    const lines = [...head.querySelectorAll('p')].filter((p) => !p.closest('.stat-tile'));
    expect(lines.map((p) => p.className)).toEqual(['p2-headline-chip']);
    expect(lines[0].textContent).toBe(`UK central · ${fixture.headline_year}`);
    const say = container.querySelector('#p2-headline .p2-say').textContent;
    expect(say.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(say).not.toMatch(/\d\.\d/);
    // each tile: label, number and one line of at most six words
    for (const t of head.querySelectorAll('.stat-tile .stat-sub')) expect(t.textContent.split(/\s+/).length).toBeLessThanOrEqual(6);
    expect(head.textContent).not.toContain('household consumption');
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
        expect(line).toContain(`ends ${side(d)} the path in ${fixture.late_year}`);
        expect(line.includes('if repriced at once')).toBe(d > 0.005 && r.gaps.r_bp[L] > 0);
        // the OBR's slower repricing: the other side of the path, or a smaller rise, in words
        const obr = r.debt_gdp_pp_obr_repricing_late;
        if (side(obr) !== side(d)) expect(line).toContain(`at the OBR’s repricing pace, it ends ${side(obr)} the path`);
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
      // every figure caption under a model chart links its result files or source
      for (const cap of part.querySelectorAll('figure:not(.p2-shock-fig) figcaption, .p2-output-foot')) {
        expect(cap.querySelector('a[href^="http"]'), cap.textContent).not.toBeNull();
      }
      // the solves at the data file's commit
      const files = [...part.querySelectorAll('a[href*="/analysis/surprise/output"]')].map((a) => a.getAttribute('href'));
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
      expect(cards.length, id).toBeLessThanOrEqual(3);
      for (const c of cards) {
        const say = c.querySelectorAll('.p2-say');
        expect(say.length, c.id).toBe(1);
        expect(say[0].querySelector('.p2-say-text').textContent.trim().split(/\s+/).length, c.id).toBeLessThanOrEqual(25);
      }
    }
    expect(stepsWithoutHighlight(container.querySelector('#story-part-2'))).toEqual([]);
    unmount();
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
