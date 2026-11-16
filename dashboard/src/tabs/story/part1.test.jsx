// Story part 1: the home of the official statistics. Each latest figure is
// printed once, in a step card; graphics print no values (axis ticks carry
// data-axis). The expected figures are built here by hand from the data
// file's paths, and the part is rendered against both the real file and a
// fixture with altered values, so a hard-coded number fails.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import real from '@/data/ukContext.json';
import checks from '@/data/ukContextChecks.json';
import Part1Real from '@/tabs/story/Part1.jsx';
import { dateLong, dirOf, dirWord, idx1, monthYear, pct1, share0, tick } from '@/tabs/story/part1/format.js';
import { AiUseChart, ExposureTiles, GdpChart, LabourPanels, exposureTiles } from '@/tabs/story/part1/charts.jsx';
import { DSIT_AROUND } from '@/tabs/story/part1/data.js';

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
    const el = show(Part1Real);
    const q = real.facts.gdp_quarterly_latest.period;
    const lastFull = real.series.gdp_growth.x[real.series.gdp_growth.x.length - 1];
    expect(Number(q.slice(0, 4))).toBeGreaterThan(lastFull);
    const fig = el.querySelectorAll('#p1-output .p1-figure')[1];
    expect(fig.textContent).toContain(`${q.slice(0, 4)} Q1`);
    expect(fig.textContent).toContain('year not yet complete');
    expect(el.querySelectorAll('#p1-output .p1-figure')[0].textContent).toContain(`${lastFull} is the latest complete year`);
    expect(el.querySelectorAll('#p1-productivity .p1-figure')[1].textContent).toContain(`ends at ${real.series.labour_share.x.at(-1)}, the latest full year`);
  });

  it('labels the OBR forecast with its vintage, from the data file', () => {
    const el = show(Part1Real);
    const src = real.sources[real.series.obr_gdp_forecast.source];
    const vintage = monthYear(src.released);
    expect(vintage).toBe('October 2026');
    expect(src.title).toContain(vintage);
    expect(el.textContent).toContain(`OBR forecast, ${vintage}`);
    expect(el.textContent).toContain('starts from the OBR’s March 2026 forecast');
    // drawn dashed and apart from the outturn bars
    expect(el.querySelector('.p1-forecast')).not.toBeNull();
  });

  it('says once that the ONS advises focusing on long-term LFS movements', () => {
    const text = show(Part1Real).textContent;
    expect(text.split('long-term movements').length - 1).toBe(1);
  });

  it('says what one tile of the exposure grid stands for', () => {
    const el = show(Part1Real);
    const fig = el.querySelectorAll('#p1-ai .p1-figure')[1];
    expect(fig.textContent).toContain('Each tile is one per cent of UK workers');
    expect(fig.querySelectorAll('.tile')).toHaveLength(100);
  });

  it('gives every graphic a source line with links from the data file', () => {
    const el = show(Part1Real);
    const urls = new Set(Object.values(real.sources).map((s) => s.url));
    const figs = el.querySelectorAll('.p1-figure');
    expect(figs).toHaveLength(8);
    figs.forEach((fig) => {
      const links = fig.querySelectorAll('.story-source a');
      expect(links.length).toBeGreaterThan(0);
      links.forEach((a) => expect(urls.has(a.getAttribute('href'))).toBe(true));
    });
  });

  it('has four blocks that keep every old step id and block id as link targets', () => {
    const el = show(Part1Real);
    expect([...el.querySelectorAll('.scrolly')].map((b) => b.id)).toEqual(['p1-output', 'p1-work', 'p1-productivity', 'p1-ai']);
    const steps = ['p1-output-0', 'p1-output-1', 'p1-quarters-0', 'p1-work-0', 'p1-work-1', 'p1-pay-0', 'p1-productivity-0', 'p1-share-0', 'p1-ai-0', 'p1-ai-1', 'p1-exposure-0', 'p1-exposure-1'];
    expect([...el.querySelectorAll('.scrolly-step')].map((li) => li.id)).toEqual(steps);
    for (const id of ['p1-quarters', 'p1-pay', 'p1-share', 'p1-exposure']) {
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
      if (!n.querySelector('svg, .p1-swatch')) bare.push(n.textContent.slice(0, 40));
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
  it('draws the outturn alone at step 0, and labels the forecast only once it is drawn', () => {
    const { container } = render(<GdpChart state={0} />);
    // the hidden ghost that holds the card's height (frame.jsx) is not shown
    const shown = container.cloneNode(true);
    shown.querySelectorAll('.p1-title-ghost').forEach((x) => x.remove());
    expect(shown.textContent).not.toContain('OBR forecast');
    expect(container.querySelectorAll('.p1-bar')).toHaveLength(real.series.gdp_growth.x.length);
    expect(container.querySelector('.fade-g .p1-forecast').closest('.fade-g').classList.contains('is-on')).toBe(false);
  });

  it('draws one labour panel and one AI line at step 0', () => {
    const lab = render(<LabourPanels state={0} />).container;
    expect([...lab.querySelectorAll('.draw-path')].map((p) => p.classList.contains('is-on'))).toEqual([true, false]);
    cleanup();
    const ai = render(<AiUseChart state={0} />).container;
    expect([...ai.querySelectorAll('.draw-path')].map((p) => p.classList.contains('is-on'))).toEqual([true, false]);
    expect(ai.textContent).not.toContain('10 or more employees');
    // each drawn line ends in a dot that shows with it
    expect([...ai.querySelectorAll('.draw-end')].map((p) => p.classList.contains('is-on'))).toEqual([true, false]);
    cleanup();
    const lab2 = render(<LabourPanels state={1} />).container;
    expect([...lab2.querySelectorAll('.draw-end')].map((p) => p.classList.contains('is-on'))).toEqual([true, true]);
  });

  it('shows the tiles as one block first, then in the three exposure groups', () => {
    const a = exposureTiles(0);
    expect(new Set(a.map((t) => t.color)).size).toBe(1);
    expect(new Set(exposureTiles(1).map((t) => t.color)).size).toBe(3);
    const block = render(<ExposureTiles state={0} source={null} />).container;
    expect(block.textContent).toContain('Each tile is one per cent of UK workers');
    expect(block.querySelector('.p1-groups')).toBeNull();
    cleanup();
    const groups = render(<ExposureTiles state={1} source={null} />).container;
    expect(groups.querySelectorAll('.p1-groups li')).toHaveLength(3);
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
  expect(arrows.length).toBe(7); // annual, three OBR years, two quarterly, pay
  for (const a of arrows) {
    const v = Number(a.textContent.replace('−', '-').replace('%', ''));
    expect(a.getAttribute('data-dir')).toBe(dirOf(v));
    // the fact's icon is the arrow for that sign (Lucide's class names the glyph)
    const fact = a.closest('.story-fact');
    const glyph = fact.querySelector('.story-fact-icon svg').getAttribute('class');
    expect(glyph).toContain({ rise: 'lucide-arrow-up', fall: 'lucide-arrow-down', flat: 'lucide-minus' }[dirOf(v)]);
    const sub = fact.querySelector('.story-fact-sub').textContent;
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
    expect(el.textContent).toContain('OBR forecast, March 2027');
    // the arrows follow the altered signs (a fall, a zero, rises)
    checkArrows(el);
    expect(el.querySelector('#p1-quarters-0 .p1-growth').getAttribute('data-dir')).toBe('fall');
    expect(el.querySelector('#p1-pay-0 .p1-growth').getAttribute('data-dir')).toBe('flat');
    vi.doUnmock('@/data/ukContext.json');
  });
});
