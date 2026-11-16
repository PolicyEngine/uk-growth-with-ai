// Story part 1: the home of the official statistics. Each latest figure is
// printed once, in the UK vitals panel or a step card; graphics print no values (axis ticks carry
// data-axis). The expected figures are built here by hand from the data
// file's paths, and the part is rendered against both the real file and a
// fixture with altered values, so a hard-coded number fails.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import real from '@/data/ukContext.json';
import checks from '@/data/ukContextChecks.json';
import Part1Real from '@/tabs/story/Part1.jsx';
import { dateLong, dirOf, dirWord, idx1, monthYear, pct1, share0, tick } from '@/tabs/story/part1/format.js';
import { AiUseChart, ExposureTiles, LabourBoard, OutputCanvas, barPath, boardSeries, exposureTiles } from '@/tabs/story/part1/charts.jsx';
import { DSIT_AROUND } from '@/tabs/story/part1/data.js';
import { FinalState } from '@/components/story/motion.js';

afterEach(cleanup);

const PART = { id: 'story-part-1', n: 1, icon: 'record', kicker: 'Part 1', title: 'Where the UK stands' };

const show = (Part1) => {
  const { container } = render(
    <section id="story-part-1">
      <Part1 part={PART} />
    </section>,
  );
  return container.querySelector('#story-part-1');
};

// The part's text with the axis ticks set aside, as the number check reads it.
const textWithoutAxes = (el) => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('[data-axis]').forEach((n) => n.remove());
  return copy.textContent;
};

// Percentages (whole or one decimal) and bare one-decimal numbers (the index).
const FIGURE = /[−-]?\d+(?:\.\d+)?%|\b\d+\.\d\b(?!%)/g;
const figures = (text) => (text.match(FIGURE) ?? []).sort();

// Every figure part 1 prints, from its JSON path, in the page's format.
function expected(D) {
  const f = D.facts;
  const obr = D.series.obr_gdp_forecast.y;
  const hh = f.workers_high_exposure_high_complementarity.value;
  const hl = f.workers_high_exposure_low_complementarity.value;
  return [
    pct1(f.gdp_growth_latest.value),
    pct1(f.gdp_quarterly_latest.value),
    pct1(f.gdp_quarterly_yoy.value),
    pct1(obr[0]),
    pct1(obr[1]),
    pct1(obr[obr.length - 1]),
    idx1(f.productivity_oph_latest.value),
    pct1(f.employment_rate_latest.value),
    pct1(f.unemployment_rate_latest.value),
    pct1(f.pay_growth_latest.value),
    pct1(f.labour_share_latest.value),
    pct1(f.business_ai_use.value),
    pct1(f.business_ai_use_10plus.value),
    share0(hh),
    share0(hl),
    share0(f.workers_low_exposure.value),
    share0(hh + hl), // the two high-exposure groups' sum, in the source note
    share0(DSIT_AROUND), // "around 70%", the DSIT text, in the source note
  ].sort();
}

describe('part 1 formatters', () => {
  it('formats as published, with U+2212 for negatives', () => {
    expect(pct1(75.3)).toBe('75.3%');
    expect(pct1(-10)).toBe('−10.0%');
    expect(pct1(1)).toBe('1.0%');
    expect(idx1(100.1)).toBe('100.1');
    expect(share0(35.0)).toBe('35%');
    expect(tick(-5)).toBe('−5');
    expect(dateLong('2026-11-12')).toBe('12 November 2026');
    expect(monthYear('2026-10-28')).toBe('October 2026');
  });
});

describe('story part 1, real data', () => {
  it('prints each latest figure once, and no other figure', () => {
    const text = textWithoutAxes(show(Part1Real));
    expect(figures(text)).toEqual(expected(real));
    // figures printed by a single fact appear exactly once
    const counts = {};
    for (const f of expected(real)) counts[f] = (counts[f] ?? 0) + 1;
    for (const [f, n] of Object.entries(counts)) expect(text.split(f).length - 1).toBe(n);
    // the OBR's 2025 outturn (in its note, not a value) is not printed
    const outturn = real.series.obr_gdp_forecast.note.match(/gives ([\d.]+)% as the OBR's 2025 outturn/)[1];
    if (`${outturn}%` !== pct1(real.facts.gdp_growth_latest.value)) expect(text).not.toContain(`${outturn}%`);
  });

  it('prints exactly the figures ukContextChecks.json records from the primary files', () => {
    const text = textWithoutAxes(show(Part1Real));
    expect(figures(text)).toEqual(checks.figures.map((f) => f.printed).sort());
    for (const f of checks.figures) {
      expect(f.primary_file).toMatch(/^analysis\/story\/raw\//);
      expect(f.url).toMatch(/^https:\/\//);
      expect(f.release_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('labels the current year by its quarters, apart from the full-year bars', () => {
    const q = real.facts.gdp_quarterly_latest.period;
    const lastFull = real.series.gdp_growth.x[real.series.gdp_growth.x.length - 1];
    expect(Number(q.slice(0, 4))).toBeGreaterThan(lastFull);
    const annual = render(<OutputCanvas state={0} />).container;
    expect(annual.querySelector('.story-figure-unit').textContent).toContain(`${lastFull} is the latest complete year`);
    cleanup();
    const quarters = render(<OutputCanvas state={2} />).container;
    const note = quarters.querySelector('.p1-only-q.p1-note');
    expect(note.textContent).toContain(`${q.slice(0, 4)} Q1`);
    expect(note.textContent).toContain('year not yet complete');
    cleanup();
    const share = render(<LabourBoard focus={4} />).container;
    expect(share.querySelector('.story-figure-unit').textContent).toContain(`ends at ${real.series.labour_share.x.at(-1)}, the latest full year`);
  });

  it('labels the OBR forecast with its vintage, from the data file', () => {
    const el = show(Part1Real);
    const src = real.sources[real.series.obr_gdp_forecast.source];
    const vintage = monthYear(src.released);
    expect(vintage).toBe('October 2026');
    expect(src.title).toContain(vintage);
    expect(el.textContent).toContain(`The OBR’s central forecast, published ${vintage}`);
    expect(el.textContent).toContain('no-shock path uses the OBR’s March 2026 productivity growth');
    // drawn dashed and apart from the outturn bars
    expect(el.querySelector('.p1-forecast')).not.toBeNull();
  });

  it('says once that the ONS advises focusing on long-term LFS movements', () => {
    const text = show(Part1Real).textContent;
    expect(text.split('long-term movements').length - 1).toBe(1);
  });

  it('says what one tile of the exposure grid stands for', () => {
    const el = show(Part1Real);
    const fig = el.querySelector('#p1-ai .p1-exposure');
    expect(fig.textContent).toContain('Each tile is one per cent of UK workers');
    expect(fig.querySelectorAll('.tile')).toHaveLength(100);
  });

  it('gives every graphic a source line with links from the data file', () => {
    const el = show(Part1Real);
    const urls = new Set([...Object.values(real.sources).flatMap((s) => [s.page, s.url]), ...Object.values(real.links).map((l) => l.url)]);
    const figs = el.querySelectorAll('.p1-figure');
    expect(figs).toHaveLength(4); // output canvas, labour board, AI use, exposure tiles
    figs.forEach((fig) => {
      const links = fig.querySelectorAll('.story-source a');
      expect(links.length).toBeGreaterThan(0);
      links.forEach((a) => expect(urls.has(a.getAttribute('href'))).toBe(true));
      // the visible source line links readable pages, never a CSV or spreadsheet download
      fig.querySelectorAll('.story-source:not(li) a').forEach((a) => expect(a.getAttribute('href')).not.toMatch(/generator\?/));
    });
  });

  it('links every printed figure to its source page, not a download', () => {
    const el = show(Part1Real);
    const paths = el.querySelectorAll('[data-path]');
    expect(paths.length).toBe(checks.figures.length);
    paths.forEach((n) => {
      const a = n.closest('a');
      expect(a, n.getAttribute('data-path')).not.toBeNull();
      expect(a.getAttribute('href')).toMatch(/^https:\/\//);
      expect(a.getAttribute('href')).not.toMatch(/generator\?/);
    });
    for (const s of Object.values(real.sources)) expect(s.page).toMatch(/^https:\/\/(www\.ons\.gov\.uk|obr\.uk|www\.gov\.uk)\//);
    for (const f of checks.figures) expect(f.page).toMatch(/^https:\/\//);
  });

  it('opens with a UK vitals panel: seven tiles, each value linked, period and release stamped', () => {
    const el = show(Part1Real);
    const tiles = el.querySelectorAll('#p1-vitals .p1-vital');
    expect([...tiles].map((t) => t.dataset.vital)).toEqual(['gdp', 'productivity', 'employment', 'unemployment', 'pay', 'share', 'ai']);
    tiles.forEach((t) => {
      expect(t.querySelector('[data-path]').closest('a')).not.toBeNull();
      expect(t.textContent).toMatch(/Through /);
      expect(t.textContent).toMatch(/Released \d+ \w+ \d{4}/);
      expect(t.querySelector('svg.p1-vital-spark').getAttribute('aria-hidden')).toBe('true');
    });
    // the first estimate is flagged, from the fact's note
    expect(el.querySelector('#p1-vital-gdp .p1-flag').textContent).toContain('First estimate');
    expect(el.querySelector('#p1-vital-employment .p1-flag')).toBeNull();
    // the panel comes before the first scene
    expect(el.querySelector('#p1-vitals').compareDocumentPosition(el.querySelector('#p1-output')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('records a next release only where the publisher lists one after the fetch date', () => {
    for (const s of Object.values(real.sources)) if (s.next_release) expect(s.next_release > s.fetched).toBe(true);
    expect(real.sources.ons_bics.next_release).toBeUndefined();
    expect(real.sources.obr_efo_oct2026.next_release).toBeUndefined();
  });

  it('marks a y-axis title on every chart', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.p1-figure').forEach((fig) => expect(fig.querySelector('[data-axis-title="y"]')).not.toBeNull());
    expect(el.querySelector('.p1-ai [data-axis-title="x"]')).not.toBeNull();
  });

  it('keeps each topic takeaway true of the series on the page', async () => {
    const { OUTPUT_TAKEAWAY, WORK_TAKEAWAY, AI_TAKEAWAY } = await import('@/tabs/story/Part1.jsx');
    const S = real.series;
    // output: every year after the rebound below most 2010s years; every quarter of the current year above zero
    const g = (y) => S.gdp_growth.y[S.gdp_growth.x.indexOf(y)];
    const tens = S.gdp_growth.x.filter((y) => y >= 2010 && y <= 2019).map(g);
    S.gdp_growth.x.filter((y) => y >= 2023).forEach((y) => expect(tens.filter((t) => t > g(y)).length).toBeGreaterThan(tens.length / 2));
    const lastYear = S.gdp_quarterly.x.at(-1).slice(0, 4);
    S.gdp_quarterly.x.forEach((q, i) => q.startsWith(lastYear) && expect(S.gdp_quarterly.y[i]).toBeGreaterThan(0));
    expect(OUTPUT_TAKEAWAY).toContain('each quarter of this year has grown');
    // work: unemployment lower than at the end of last year; pay growth peaked in 2023 and is lower now; output per hour about 100
    const u = S.unemployment_rate;
    expect(u.y.at(-1)).toBeLessThan(u.y[u.x.indexOf(`${Number(u.x.at(-1).slice(0, 4)) - 1} DEC`)]);
    const p = S.pay_growth;
    expect(p.x[p.y.indexOf(Math.max(...p.y))].slice(0, 4)).toBe('2023');
    expect(p.y.at(-1)).toBeLessThan(Math.max(...p.y));
    expect(Math.abs(S.productivity_oph.y.at(-1) - 100)).toBeLessThan(0.5);
    expect(WORK_TAKEAWAY).toContain('2023 peak');
    // AI: each September wave above the one a year before; the 10+ group up more; the two high-exposure groups a majority
    for (const k of ['business_ai_use', 'business_ai_use_10plus']) {
      const sep = S[k].x.map((x, i) => (/Sept/.test(x) ? S[k].y[i] : null)).filter((v) => v != null);
      sep.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(sep[i]));
    }
    const rise = (k) => S[k].y.at(-1) - S[k].y[0];
    expect(rise('business_ai_use_10plus')).toBeGreaterThan(rise('business_ai_use'));
    const f = real.facts;
    expect(f.workers_high_exposure_high_complementarity.value + f.workers_high_exposure_low_complementarity.value).toBeGreaterThan(50);
    expect(AI_TAKEAWAY).toMatch(/most UK workers/);
  });

  it('has three scenes that keep every old step id and block id as link targets', () => {
    const el = show(Part1Real);
    expect([...el.querySelectorAll('.scrolly')].map((b) => b.id)).toEqual(['p1-output', 'p1-work', 'p1-ai']);
    const steps = ['p1-output-0', 'p1-output-1', 'p1-quarters-0', 'p1-work-0', 'p1-work-1', 'p1-pay-0', 'p1-productivity-0', 'p1-share-0', 'p1-ai-0', 'p1-ai-1', 'p1-exposure-0', 'p1-exposure-1'];
    expect([...el.querySelectorAll('.scrolly-step')].map((li) => li.id)).toEqual(steps);
    for (const id of ['p1-quarters', 'p1-pay', 'p1-productivity', 'p1-share', 'p1-exposure']) {
      const a = el.querySelector(`#${id}`);
      expect(a).not.toBeNull();
      expect(a.closest('.scrolly-step').id).toBe(`${id}-0`);
    }
  });

  it('shows one figure per block at a time and makes the others inert', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.p1-swap').forEach((sw) => {
      const layers = [...sw.children];
      expect(layers.filter((l) => l.classList.contains('is-on'))).toHaveLength(1);
      layers.filter((l) => !l.classList.contains('is-on')).forEach((l) => {
        expect(l.getAttribute('aria-hidden')).toBe('true');
        expect(l.hasAttribute('inert')).toBe(true);
      });
    });
  });

  it('keeps step cards to 60 words or fewer (caveats in a disclosure)', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.scrolly-card').forEach((c) => {
      const copy = c.cloneNode(true);
      copy.querySelectorAll('details').forEach((d) => d.remove());
      expect(copy.textContent.trim().split(/\s+/).length).toBeLessThanOrEqual(60);
    });
  });

  it('makes every card a short title with an icon, key facts or items, and no long lines', () => {
    const el = show(Part1Real);
    // each child span counted apart (textContent glues a fact's value, label and sub)
    const words = (n) => [...(n.children.length ? n.children : [n])].map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim().split(' ').length;
    el.querySelectorAll('.scrolly-card').forEach((c) => {
      expect(c.querySelector('.scrolly-title-icon svg')).not.toBeNull();
      expect(c.querySelectorAll('.story-items > li, .story-facts > li').length).toBeGreaterThanOrEqual(2);
      c.querySelectorAll('p').forEach((pp) => expect(words(pp)).toBeLessThanOrEqual(25));
      // every item and fact has its icon, and is about a dozen words
      c.querySelectorAll('.story-items > li, .story-facts > li').forEach((li) => {
        expect(li.querySelector('svg')).not.toBeNull();
        expect(words(li)).toBeLessThanOrEqual(12);
      });
    });
  });

  it('leads every line of text with a plain icon (or a colour swatch in a legend)', () => {
    const el = show(Part1Real);
    const bare = [];
    el.querySelectorAll('p, li, summary, h2, h3, h4').forEach((n) => {
      if (n.closest('svg, .p1-title-ghost, [data-axis]') || !n.textContent.trim()) return;
      if (n.querySelector('p, li')) return; // leaf blocks only
      // shared pieces this part does not own: the step kicker (scrolly), the part's heading (PartHead)
      if (n.matches('.scrolly-kicker, .story-part-head h2')) return;
      // a scene sub-header's icon sits beside its heading (Scrolly's scene-head)
      if (!n.querySelector('svg, .p1-swatch') && !n.closest('.scene-head')?.querySelector('svg')) bare.push(n.textContent.slice(0, 40));
    });
    expect(bare).toEqual([]);
  });

  it('keeps the source lines to the citation (no caveat notes)', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.p1-figure .story-source').forEach((s) => {
      expect(s.textContent).not.toMatch(/Labour Force Survey|leaves out|drawn apart/i);
    });
  });

  it('closes the part with the next-part band', () => {
    const el = show(Part1Real);
    expect(el.querySelector('.story-next a').getAttribute('href')).toBe('#story-part-2');
  });

  it('labels or hides every graphic for screen readers', () => {
    const el = show(Part1Real);
    el.querySelectorAll('svg').forEach((svg) => {
      const ok = (svg.getAttribute('role') === 'img' && svg.getAttribute('aria-label')) || svg.getAttribute('aria-hidden') === 'true';
      expect(Boolean(ok)).toBe(true);
    });
  });
});

describe('story part 1, first states', () => {
  // A page load (and the number check's dump) starts each block on step 0.
  it('draws the outturn alone at step 0, and shows the forecast only from step 1', () => {
    const { container } = render(<OutputCanvas state={0} />);
    const svg = container.querySelector('.p1-canvas');
    expect(svg.classList.contains('is-fc')).toBe(false);
    expect(svg.classList.contains('is-q')).toBe(false);
    expect(container.querySelectorAll('.p1-bar-a')).toHaveLength(real.series.gdp_growth.x.length);
    expect(container.querySelectorAll('.p1-bar-q')).toHaveLength(real.series.gdp_quarterly.x.length);
    expect(container.querySelector('.p1-forecast').classList.contains('p1-only-fc')).toBe(true);
    cleanup();
    const fc = render(<OutputCanvas state={1} />).container.querySelector('.p1-canvas');
    expect(fc.classList.contains('is-fc')).toBe(true);
    expect(fc.classList.contains('is-q')).toBe(false);
  });

  it('zooms the annual bars as one group, never changing a bar, then grows the quarters', () => {
    const a = render(<OutputCanvas state={1} />).container;
    const dA = [...a.querySelectorAll('.p1-bar-a')].map((p) => p.getAttribute('d'));
    expect(a.querySelector('.p1-zoom').style.transform).toContain('scale(1, 1)');
    cleanup();
    const q = render(<OutputCanvas state={2} />).container;
    // the bars' own geometry is the same in both states: only their group's transform changes
    expect([...q.querySelectorAll('.p1-bar-a')].map((p) => p.getAttribute('d'))).toEqual(dA);
    expect(q.querySelector('.p1-zoom').style.transform).toMatch(/translate\(.*\) scale\([\d.]+, 1\)/);
    expect([...q.querySelectorAll('.p1-bar-q')].every((p) => p.classList.contains('is-on'))).toBe(true);
  });

  it('rounds only the free end of a bar (the shared Bars outline)', () => {
    // a positive bar from y=100 up to y=40: the base corners are square
    expect(barPath(10, 8, 100, 40)).toMatch(/^M10,100L10,42Q/);
    expect(barPath(10, 8, 100, 40)).toMatch(/L18,100Z$/);
    // a negative bar from y=100 down to y=160
    expect(barPath(10, 8, 100, 160)).toMatch(/^M10,100L10,158Q/);
  });

  it('keeps all five series on the labour board at every step, one in focus', () => {
    const n = boardSeries().length;
    expect(n).toBe(5);
    for (let f = 0; f < n; f += 1) {
      const c = render(<LabourBoard focus={f} />).container;
      expect(c.querySelectorAll('.p1-board-series')).toHaveLength(5);
      expect(c.querySelectorAll('.p1-board-series.is-focus')).toHaveLength(1);
      expect([...c.querySelectorAll('.p1-board-series')].findIndex((g) => g.classList.contains('is-focus'))).toBe(f);
      expect(c.querySelectorAll('.p1-board-axes.is-on')).toHaveLength(1);
      expect(c.querySelector('.ch-cross svg').getAttribute('aria-label')).toMatch(/Four smaller charts below it show .*, each on its own scale\./);
      cleanup();
    }
  });

  it('draws one AI line at step 0 and labels the second only once it is drawn', () => {
    const ai = render(<AiUseChart state={0} />).container;
    expect([...ai.querySelectorAll('.p1-ai-line')].map((p) => p.classList.contains('is-on'))).toEqual([false, true]);
    expect(ai.querySelector('.p1-end-label.is-ten').classList.contains('is-on')).toBe(false);
    cleanup();
    const two = render(<AiUseChart state={1} />).container;
    expect([...two.querySelectorAll('.p1-ai-line')].map((p) => p.classList.contains('is-on'))).toEqual([true, true]);
    expect(two.querySelector('.p1-end-label.is-ten').classList.contains('is-on')).toBe(true);
  });

  it('shows the tiles as one block first, then in the three exposure groups', () => {
    const a = exposureTiles(0);
    expect(new Set(a.map((t) => t.color)).size).toBe(1);
    expect(new Set(exposureTiles(1).map((t) => t.color)).size).toBe(3);
    const block = render(<ExposureTiles state={0} source={null} />).container;
    expect(block.textContent).toContain('Each tile is one per cent of UK workers');
    expect(block.querySelector('.p1-groups').classList.contains('is-on')).toBe(false);
    cleanup();
    // FinalState: the figure's final state at once (no one-shot entry hold)
    const groups = render(
      <FinalState.Provider value>
        <ExposureTiles state={1} source={null} />
      </FinalState.Provider>,
    ).container;
    expect(groups.querySelectorAll('.p1-groups li')).toHaveLength(3);
    expect(groups.querySelector('.p1-groups').classList.contains('is-on')).toBe(true);
  });

  it('opens the exposure tiles on the one block, then moves to the step state once in view', () => {
    vi.useFakeTimers();
    const { container } = render(<ExposureTiles state={1} source={null} entered />);
    expect(container.querySelector('.p1-exposure').classList.contains('is-grouped')).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(container.querySelector('.p1-exposure').classList.contains('is-grouped')).toBe(true);
    vi.useRealTimers();
  });

  it('keeps the same 100 tile keys in both states, so the tiles travel', () => {
    const a = exposureTiles(0);
    const b = exposureTiles(1);
    expect(a).toHaveLength(100);
    expect(a.map((t) => t.key)).toEqual(b.map((t) => t.key));
  });

  it('takes "around 70%" from the DSIT text the data file records', () => {
    expect(real.facts.workers_high_exposure_high_complementarity.note).toContain(`around ${share0(DSIT_AROUND)}`);
  });
});

// Each growth-rate arrow must follow its value's sign, and the words beside
// it ('up', 'down', 'unchanged') must say the same.
const checkArrows = (el) => {
  const arrows = [...el.querySelectorAll('.p1-growth')];
  expect(arrows.length).toBe(7); // annual, three OBR years, year-on-year quarter; the GDP and pay tiles
  for (const a of arrows) {
    const v = Number(a.textContent.replace('−', '-').replace('%', ''));
    expect(a.getAttribute('data-dir')).toBe(dirOf(v));
    // the fact's icon is the arrow for that sign (Lucide's class names the glyph)
    const fact = a.closest('.story-fact, .p1-vital');
    const glyph = fact.querySelector('.story-fact-icon svg, .p1-vital-dir svg').getAttribute('class');
    expect(glyph).toContain({ rise: 'lucide-arrow-up', fall: 'lucide-arrow-down', flat: 'lucide-minus' }[dirOf(v)]);
    const sub = fact.querySelector('.story-fact-sub, .p1-vital-label').textContent;
    expect(sub).toContain(dirWord(v));
  }
};

describe('story part 1, direction arrows', () => {
  it('maps a sign to its arrow and word', () => {
    expect([dirOf(1.2), dirOf(-0.4), dirOf(0)]).toEqual(['rise', 'fall', 'flat']);
    expect([dirWord(1.2), dirWord(-0.4), dirWord(0)]).toEqual(['up', 'down', 'unchanged']);
  });
  it('draws each arrow from its value’s sign, real data', () => {
    checkArrows(show(Part1Real));
  });
});

describe('story part 1, altered data', () => {
  it('prints the figures the data file holds', async () => {
    const fx = JSON.parse(JSON.stringify(real));
    fx.facts.gdp_growth_latest.value = 2.7;
    fx.facts.gdp_quarterly_latest.value = -0.4;
    fx.facts.gdp_quarterly_yoy.value = 2.2;
    fx.facts.pay_growth_latest.value = 0;
    fx.series.obr_gdp_forecast.y = [0.9, 1.4, 1.5, 1.6, 1.7, 2.1];
    fx.facts.productivity_oph_latest.value = 103.4;
    fx.facts.employment_rate_latest.value = 71.9;
    fx.facts.unemployment_rate_latest.value = 5.6;
    fx.facts.labour_share_latest.value = 51.2;
    fx.facts.business_ai_use.value = 31.4;
    fx.facts.business_ai_use_10plus.value = 42.6;
    fx.facts.workers_high_exposure_high_complementarity.value = 41;
    fx.facts.workers_high_exposure_low_complementarity.value = 28;
    fx.facts.workers_low_exposure.value = 31;
    fx.sources[fx.series.obr_gdp_forecast.source].released = '2027-03-03';
    vi.resetModules();
    vi.doMock('@/data/ukContext.json', () => ({ default: fx }));
    const { default: Part1Fix } = await import('@/tabs/story/Part1.jsx');
    const el = show(Part1Fix);
    expect(figures(textWithoutAxes(el))).toEqual(expected(fx));
    expect(el.textContent).toContain('The OBR’s central forecast, published March 2027');
    // the arrows follow the altered signs (a fall, a zero, rises)
    checkArrows(el);
    expect(el.querySelector('#p1-vital-gdp .p1-growth').getAttribute('data-dir')).toBe('fall');
    expect(el.querySelector('#p1-vital-pay .p1-growth').getAttribute('data-dir')).toBe('flat');
    expect(el.querySelector('#p1-vital-pay .p1-vital-label').textContent).toContain('unchanged');
    vi.doUnmock('@/data/ukContext.json');
  });
});

// The hero (#story-hero): the first question, its answer as one big figure
// for the scenario and closure in the address (the 2031 GDP gap, main arm;
// its home is part 2's headline tiles, which it links to), and the four
// scenarios' GDP paths drawn over the whole horizon with a y-axis title and
// an end label per line. Expected values are read here from the data file.
describe('hero', () => {
  const sign = (x) => (Math.abs(x) < 0.005 ? '0.00%' : `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}%`);
  const at = async (query) => {
    const { default: Hero } = await import('@/tabs/story/Hero.jsx');
    const { NavProvider } = await import('@/lib/nav.jsx');
    window.history.replaceState(null, '', `/?${query}`);
    return render(
      <NavProvider>
        <Hero />
      </NavProvider>,
    ).container;
  };
  it('prints the chosen scenario’s 2031 GDP gap, linked to its home', async () => {
    const S = (await import('@/data/surprise2028.json')).default;
    const i = S.years.indexOf(S.headline_year);
    for (const [s, cl, q] of [['uk_high', 'zk0.1', 's=uk_high'], ['uk_low', 'zk0', 's=uk_low&closure=closed']]) {
      const el = await at(q);
      const fig = el.querySelector(`.hf-figure [data-path="results.${s}.tfp.${cl}.gaps.Y.${S.headline_year}"]`);
      expect(fig).not.toBeNull();
      expect(fig.textContent).toContain(sign(S.results[s].tfp[cl].gaps.Y[i]));
      expect(el.querySelector('.hf-figure a[href*="story-headline"]')).not.toBeNull();
      cleanup();
    }
  });
  it('draws all four lines over the whole horizon, each labelled, with axis titles', async () => {
    const S = (await import('@/data/surprise2028.json')).default;
    const el = await at('s=uk_central');
    const wide = el.querySelector('svg.hf-svg.is-wide');
    expect(wide.getAttribute('role')).toBe('img');
    expect(wide.querySelector('[data-axis-title="y"]').textContent).toMatch(/GDP gap against the OBR-central path, %/);
    expect(wide.textContent).toContain('OBR-central path = 0');
    expect(wide.textContent).toContain(`AI arrives, ${S.surprise_year}`);
    expect(wide.textContent).toContain(`Shock complete, ${S.headline_year}`);
    const lines = [...wide.querySelectorAll('path.hf-line')];
    expect(lines.map((p) => p.dataset.mark).sort()).toEqual(['korinek', 'uk_central', 'uk_high', 'uk_low']);
    // every line has a point for every year (none stops short)
    for (const p of lines) expect(p.getAttribute('d').match(/[ML]/g).length).toBe(S.years.length);
    const i = S.years.indexOf(S.headline_year);
    for (const s of ['uk_low', 'uk_central', 'uk_high', 'korinek']) {
      expect(wide.textContent).toContain(`${sign(S.results[s].tfp['zk0.1'].gaps.Y[i])} in ${S.headline_year}`);
    }
    // nothing scrubs with the scroll: the reveal is a CSS animation only
    expect(wide.querySelector('.hf-reveal').getAttribute('width')).not.toBeNull();
    expect(el.querySelector('.hf-line.is-on').dataset.mark).toBe('uk_central');
  });
});
