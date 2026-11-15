// Story part 1: the home of the official statistics. Each latest figure is
// printed once, in a step card; graphics print no values (axis ticks carry
// data-axis). The expected figures are built here by hand from the data
// file's paths, and the part is rendered against both the real file and a
// fixture with altered values, so a hard-coded number fails.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import real from '@/data/ukContext.json';
import Part1Real from '@/tabs/story/Part1.jsx';
import { dateLong, idx1, monthYear, pct1, share0, tick } from '@/tabs/story/part1/format.js';
import { AiUseChart, GdpChart, LabourPanels, exposureTiles } from '@/tabs/story/part1/charts.jsx';
import { DSIT_AROUND } from '@/tabs/story/part1/data.js';

afterEach(cleanup);

const PART = { id: 'story-part-1', n: 1, icon: 'landmark', kicker: 'Part 1', title: 'Where the UK stands' };

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
    pct1(obr[0]),
    pct1(obr[1]),
    pct1(obr[obr.length - 1]),
    idx1(f.productivity_oph_latest.value),
    pct1(f.employment_rate_latest.value),
    pct1(f.unemployment_rate_latest.value),
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
    for (const f of ['75.3%', '4.7%', '49.9%', '29.7%', '38.1%', '100.1', '35%', '32%', '33%']) {
      expect(text.split(f).length - 1).toBe(1);
    }
    // the OBR's 2025 outturn is not a value in the data file and is not printed
    expect(text).not.toContain('1.3%');
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
    const fig = el.querySelector('#p1-exposure .p1-figure');
    expect(fig.textContent).toContain('Each tile is one per cent of UK workers');
    expect(fig.querySelectorAll('.tile')).toHaveLength(100);
  });

  it('gives every graphic a source line with links from the data file', () => {
    const el = show(Part1Real);
    const urls = new Set(Object.values(real.sources).map((s) => s.url));
    const figs = el.querySelectorAll('.p1-figure');
    expect(figs).toHaveLength(6);
    figs.forEach((fig) => {
      const links = fig.querySelectorAll('.story-source a');
      expect(links.length).toBeGreaterThan(0);
      links.forEach((a) => expect(urls.has(a.getAttribute('href'))).toBe(true));
    });
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
    expect(container.textContent).not.toContain('OBR forecast');
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

describe('story part 1, altered data', () => {
  it('prints the figures the data file holds', async () => {
    const fx = JSON.parse(JSON.stringify(real));
    fx.facts.gdp_growth_latest.value = 2.7;
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
    vi.doUnmock('@/data/ukContext.json');
  });
});
