// Story part 1: the home of the official statistics. Each latest figure is
// printed once, in the UK vitals panel, a step card, the AI chart's end
// label or the AI closing line; other graphic text is axis ticks (data-axis). The expected figures are built here by hand from the data
// file's paths, and the part is rendered against both the real file and a
// fixture with altered values, so a hard-coded number fails.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
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

  it('labels the full-year bars by year and puts the latest quarter in the GDP tile', () => {
    const q = real.facts.gdp_quarterly_latest.period;
    const lastFull = real.series.gdp_growth.x[real.series.gdp_growth.x.length - 1];
    expect(Number(q.slice(0, 4))).toBeGreaterThan(lastFull);
    const annual = render(<OutputCanvas state={0} />).container;
    expect(annual.querySelector('.story-figure-unit').textContent).toContain(`previous calendar year, 2010 to ${lastFull}. ONS.`);
    cleanup();
    // the current year's latest quarter is in the GDP tile ("Q3 2026"), flagged
    // a first estimate; the growth on a year earlier is in the panel's notes
    const el = show(Part1Real);
    const gdp = el.querySelector('#p1-vital-gdp');
    expect(gdp.querySelector('#p1-quarters')).not.toBeNull();
    expect(gdp.textContent).toContain(q.replace(/^(\d{4}) (Q\d)$/, '$2 $1'));
    expect(gdp.querySelector('.p1-vital-flag').textContent).toBe('first estimate');
    expect(el.querySelector('#p1-vitals [data-source-notes] [data-path="facts.gdp_quarterly_yoy.value"]').textContent).toBe(pct1(real.facts.gdp_quarterly_yoy.value));
  });

  it('labels the OBR forecast with its vintage, from the data file', () => {
    const el = show(Part1Real);
    const src = real.sources[real.series.obr_gdp_forecast.source];
    const vintage = monthYear(src.released);
    expect(vintage).toBe('October 2026');
    expect(src.title).toContain(vintage);
    expect(el.textContent).toContain(`The OBR’s latest central forecast, published ${vintage}, shown for context`);
    // the two OBR forecasts, said once each (Maria's review, M3): the step
    // card says it is the latest, for context; the output figure's notes say
    // the comparison path is OG-UK's own, on the March 2026 forecast
    expect(el.textContent).toContain('The OBR’s latest forecast, shown for context, has growth of');
    expect(el.textContent.split('March 2026').length - 1).toBe(1);
    expect(el.textContent).toContain('Part 2 measures each scenario against OG-UK’s own forecast path, built on the OBR’s March 2026 forecast, not against this one.');
    // drawn dashed and apart from the outturn bars
    expect(el.querySelector('.p1-forecast')).not.toBeNull();
  });

  it('defines the employment and unemployment rates in their tiles, once', () => {
    const el = show(Part1Real);
    const sub = (k) => el.querySelector(`#p1-vital-${k} .p1-vital-sub-rest`).textContent;
    expect(sub('employment')).toMatch(/^Share of people aged 16–64 in work · /);
    expect(sub('unemployment')).toMatch(/^Share of the economically active \(16\+, in work or looking\) without work · /);
    const text = el.textContent;
    expect(text.split('in work or looking').length - 1).toBe(1);
  });

  it('says the two AI-use lines are groups of businesses by size before any trend', async () => {
    const P = await import('@/tabs/story/Part1.jsx');
    expect(P.AI_HINT).toMatch(/groups of businesses by size/);
    const el = show(Part1Real);
    const first = el.querySelector('#p1-ai-0 .p1-say').textContent;
    expect(first.indexOf('two groups of businesses by size')).toBeGreaterThanOrEqual(0);
    expect(first.indexOf('two groups of businesses by size')).toBeLessThan(first.indexOf('has risen'));
    expect(el.querySelector('.p1-ai .story-figure-unit').textContent).toContain('by size: all businesses, and 10 or more employees');
  });

  it('puts a legend above the exposure grid: the three group names, each block its share', () => {
    const el = show(Part1Real);
    const fig = el.querySelector('#p1-ai .p1-exposure');
    const legend = fig.querySelector('.p1-tile-legend');
    expect(legend).not.toBeNull();
    expect(legend.compareDocumentPosition(fig.querySelector('.p1-tiles')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...legend.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'High exposure, AI could help',
      'High exposure, AI could replace tasks',
      'Low exposure',
    ]);
    expect(legend.querySelectorAll('.ch-swatch.is-block')).toHaveLength(3);
    const f = real.facts;
    expect([...fig.querySelectorAll('.p1-tile-labels li')].map((li) => li.textContent)).toEqual(
      [f.workers_high_exposure_high_complementarity, f.workers_high_exposure_low_complementarity, f.workers_low_exposure].map((x) => share0(x.value)),
    );
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

  it('gives every graphic one quiet "Sources and notes" button after its title, its links from the data file', () => {
    const el = show(Part1Real);
    const urls = new Set([...Object.values(real.sources).flatMap((s) => [s.page, s.url]), ...Object.values(real.links).map((l) => l.url)]);
    const figs = el.querySelectorAll('.p1-figure');
    expect(figs).toHaveLength(4); // output canvas, labour board, AI use, exposure tiles
    figs.forEach((fig) => {
      // at rest: one icon button in the title, no source text, links or folds
      const btns = fig.querySelectorAll('button.src-line-btn');
      expect(btns).toHaveLength(1);
      expect(btns[0].closest('.story-figure-title')).not.toBeNull();
      expect(btns[0].getAttribute('aria-label')).toBe('Sources and notes');
      expect(btns[0].getAttribute('aria-expanded')).toBe('false');
      expect(fig.querySelectorAll('p.story-source, details')).toHaveLength(0);
      expect([...fig.querySelectorAll('a')].filter((a) => !a.closest('[hidden]'))).toHaveLength(0);
      // open: every series links its readable page, never a CSV download
      fireEvent.click(btns[0]);
      expect(btns[0].getAttribute('aria-expanded')).toBe('true');
      const pop = document.getElementById(btns[0].getAttribute('aria-controls'));
      const links = [...pop.querySelectorAll('.src-pop-list a')];
      expect(links.length).toBeGreaterThan(0);
      links.forEach((a) => {
        expect(urls.has(a.getAttribute('href'))).toBe(true);
        expect(a.getAttribute('href')).not.toMatch(/generator\?/);
      });
      pop.querySelectorAll('.src-pop-notes a').forEach((a) => expect(a.getAttribute('href')).toMatch(/^(https:\/\/|\/\?)/));
      fireEvent.click(btns[0]);
      expect(document.getElementById(btns[0].getAttribute('aria-controls'))).toBeNull();
    });
  });

  it('marks every printed figure with its data-path; numbers are not links (the source line links the source)', () => {
    const el = show(Part1Real);
    const paths = el.querySelectorAll('[data-path]');
    expect(paths.length).toBe(checks.figures.length);
    paths.forEach((n) => expect(n.closest('a'), n.getAttribute('data-path')).toBeNull());
    for (const s of Object.values(real.sources)) expect(s.page).toMatch(/^https:\/\/(www\.ons\.gov\.uk|obr\.uk|www\.gov\.uk)\//);
    for (const f of checks.figures) expect(f.page).toMatch(/^https:\/\//);
  });

  it('opens with a UK vitals panel: six metrics of label, value, sparkline and one sub-line; one quiet sources button', () => {
    const el = show(Part1Real);
    const tiles = el.querySelectorAll('#p1-vitals .p1-vital');
    expect([...tiles].map((t) => t.dataset.vital)).toEqual(['gdp', 'productivity', 'employment', 'unemployment', 'pay', 'share']);
    tiles.forEach((t) => {
      expect([...t.querySelectorAll(':scope > p')].map((pp) => pp.className)).toEqual(['p1-vital-name', 'p1-vital-value', 'p1-vital-sub']);
      expect(t.querySelectorAll('a')).toHaveLength(0);
      // one decorative sparkline, no icon
      const svgs = t.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0].closest('.p1-spark').getAttribute('aria-hidden')).toBe('true');
    });
    // the first estimate is said in words, from the fact's note
    expect(el.querySelector('#p1-vital-gdp .p1-vital-sub').textContent).toContain('first estimate');
    expect(el.querySelector('#p1-vital-employment .p1-vital-sub').textContent).not.toContain('first estimate');
    // one sources button; each series linked to its readable page behind it
    const btns = el.querySelectorAll('#p1-vitals button.src-line-btn');
    expect(btns).toHaveLength(1);
    fireEvent.click(btns[0]);
    const links = [...document.querySelectorAll('.src-pop .src-pop-list a')];
    expect(links).toHaveLength(7);
    links.forEach((a) => expect(a.getAttribute('href')).toMatch(/^https:\/\//));
    fireEvent.click(btns[0]);
    // at rest the panel prints no codes, downloads or dates beyond the period
    // (the release dates show on hover or focus only)
    const rest = el.querySelector('#p1-vitals').cloneNode(true);
    rest.querySelectorAll('.p1-vital-sub-hot, [hidden]').forEach((n) => n.remove());
    expect(rest.textContent).not.toMatch(/released|next release|\bCSV\b|IHYQ|LF24|MGSX|KAI9|LZVB|DTWM/i);
    // hovering a metric shows its release and next release
    fireEvent.mouseEnter(tiles[0]);
    expect(tiles[0].classList.contains('is-hot')).toBe(true);
    expect(tiles[0].querySelector('.p1-vital-sub-hot').textContent).toMatch(/Released \d+ \w+ \d{4}/);
    fireEvent.mouseLeave(tiles[0]);
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

  it('keeps each figure title (a finding) true of the series on the page', async () => {
    const F = await import('@/tabs/story/part1/findings.js');
    const S = real.series;
    // output: every year after the rebound below most 2010s years; every quarter of the current year above zero
    const g = (y) => S.gdp_growth.y[S.gdp_growth.x.indexOf(y)];
    const tens = S.gdp_growth.x.filter((y) => y >= 2010 && y <= 2019).map(g);
    S.gdp_growth.x.filter((y) => y >= 2023).forEach((y) => expect(tens.filter((t) => t > g(y)).length).toBeGreaterThan(tens.length / 2));
    const lastYear = S.gdp_quarterly.x.at(-1).slice(0, 4);
    S.gdp_quarterly.x.forEach((q, i) => q.startsWith(lastYear) && expect(S.gdp_quarterly.y[i]).toBeGreaterThan(0));
    expect(F.outputTitle()).toEqual({ title: 'Annual growth since 2023 has been below most 2010s rates', fallback: false });
    // the forecast: every year below at least 6 of the ten 2010s years
    S.obr_gdp_forecast.y.forEach((v) => expect(tens.filter((t) => t > v).length).toBeGreaterThanOrEqual(6));
    expect(F.forecastTitle()).toEqual({ title: `The OBR forecasts growth below most 2010s rates to ${S.obr_gdp_forecast.x.at(-1)}`, fallback: false });
    // work: pay growth peaked in 2023 and is lower now (the step sentences
    // are checked against the series in the next test)
    const e = S.employment_rate;
    const p = S.pay_growth;
    expect(p.x[p.y.indexOf(Math.max(...p.y))].slice(0, 4)).toBe('2023');
    expect(p.y.at(-1)).toBeLessThan(Math.max(...p.y));
    // employment below its early 2020 peak; pay growth back inside its
    // 2010s range; output per hour above every quarter before 2020
    expect(e.x[e.y.indexOf(Math.max(...e.y))]).toMatch(/^2020 (JAN|FEB|MAR)/);
    expect(e.y.at(-1)).toBeLessThan(Math.max(...e.y));
    const p10 = Math.max(...p.y.filter((_, i) => Number(p.x[i].slice(0, 4)) <= 2019));
    expect(p.y.at(-1)).toBeLessThanOrEqual(p10);
    const o = S.productivity_oph;
    expect(o.y.at(-1)).toBeGreaterThan(Math.max(...o.y.filter((_, i) => Number(o.x[i].slice(0, 4)) < 2020)));
    expect([F.employmentTitle(), F.payTitle(), F.productivityTitle()]).toEqual([
      { title: 'The employment rate is below its early 2020 peak', fallback: false },
      { title: 'Regular pay growth is back inside its 2010s range', fallback: false },
      { title: 'Output per hour is higher than any quarter before 2020', fallback: false },
    ]);
    // AI use more than tripled on both lines; three groups within 5 points
    expect(F.aiTitle()).toEqual({ title: 'Business AI use has more than tripled since September 2023', fallback: false });
    expect(F.workersTitle()).toEqual({ title: 'UK workers split into three near-equal groups by AI exposure', fallback: false });
    // AI: each September wave above the one a year before; the 10+ group up more; the two high-exposure groups a majority
    for (const k of ['business_ai_use', 'business_ai_use_10plus']) {
      const sep = S[k].x.map((x, i) => (/Sept/.test(x) ? S[k].y[i] : null)).filter((v) => v != null);
      sep.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(sep[i]));
    }
    const rise = (k) => S[k].y.at(-1) - S[k].y[0];
    expect(rise('business_ai_use_10plus')).toBeGreaterThan(rise('business_ai_use'));
    const f = real.facts;
    expect(f.workers_high_exposure_high_complementarity.value + f.workers_high_exposure_low_complementarity.value).toBeGreaterThan(50);
  });

  it('keeps each step sentence true of the series it highlights', () => {
    const S = real.series;
    const text = show(Part1Real).textContent;
    // jobs: the rate against the same three months a year earlier, "close"
    // within 0.5 points (the sentence is read from the data: findings.js)
    const e = S.employment_rate;
    const yearAgo = (s) => s.y[s.x.indexOf(`${Number(s.x.at(-1).slice(0, 4)) - 1} ${s.x.at(-1).slice(5)}`)];
    const de = e.y.at(-1) - yearAgo(e);
    expect(text).toContain(Math.abs(de) <= 0.5 ? 'Employment is close to its level a year ago.' : de > 0 ? 'Employment is higher than a year ago.' : 'Employment is lower than a year ago.');
    // pay: slowed since its peak, the peak's year from the series
    const p = S.pay_growth;
    const peakYear = p.x[p.y.indexOf(Math.max(...p.y))].slice(0, 4);
    expect(p.y.at(-1)).toBeLessThan(Math.max(...p.y));
    expect(text).toContain(`Regular pay growth has slowed since its ${peakYear} peak. That is before inflation.`);
    // productivity against its 2023 average, "back at" within 0.5 index points
    const o = S.productivity_oph;
    const y23 = o.y.filter((_, i) => o.x[i].startsWith('2023'));
    const dp = o.y.at(-1) - y23.reduce((a, v) => a + v, 0) / y23.length;
    expect(y23).toHaveLength(4);
    expect(text).toContain(Math.abs(dp) < 0.5 ? 'Output per hour is back at its 2023 level.' : dp > 0 ? 'Output per hour is higher than in 2023.' : 'Output per hour is lower than in 2023.');
    expect(text).not.toMatch(/2023 = 100/);
    expect(text).toContain(`Index, ${o.base_year} = 100`);
    // AI: all businesses up every September; the 10+ group up more
    const rise = (k) => S[k].y.at(-1) - S[k].y[0];
    expect(rise('business_ai_use_10plus')).toBeGreaterThan(rise('business_ai_use'));
    expect(text).toContain('AI use among all businesses has risen every September since 2023.');
    expect(text).toContain(`It has risen fastest in businesses with 10 or more employees, to ${pct1(real.facts.business_ai_use_10plus.value)}.`);
    // quarters: every quarter of the latest year grew
    const q = S.gdp_quarterly;
    const yr = q.x.at(-1).slice(0, 4);
    expect(q.y.filter((_, i) => q.x[i].startsWith(yr)).every((v) => v > 0)).toBe(true);
    expect(text).toContain(`grown in every quarter of ${yr} so far`);
  });

  it('gives every topic a question, hint and answer, and a recap of the three, with no figure in a hint or question', async () => {
    const P = await import('@/tabs/story/Part1.jsx');
    for (const q of [P.OUTPUT_Q, P.WORK_Q, P.AI_Q, P.OUTPUT_HINT, P.WORK_HINT, P.AI_HINT]) expect(q.match(FIGURE)).toBeNull();
    const el = show(Part1Real);
    expect([...el.querySelectorAll('.scene-head[id]')].map((h) => h.id)).toEqual(['q-p1-output', 'q-p1-work', 'q-p1-ai']);
    // one closing line a scene: the output and work lines hold no figures;
    // the AI line is the home of its two figures
    expect(P.OUTPUT_TAKEAWAY.match(FIGURE)).toBeNull();
    expect(P.WORK_TAKEAWAY.match(FIGURE)).toBeNull();
    const text = el.textContent;
    expect(text).toContain(P.OUTPUT_TAKEAWAY);
    expect(text).toContain(P.WORK_TAKEAWAY);
    expect(text).toContain('of UK workers are in highly exposed jobs');
    // part 1's recap plays in part 2's first pinned screen (Fable): checked as data
    expect(P.P1_RECAP.map((r) => r.to)).toEqual(['q-p1-output', 'q-p1-work', 'q-p1-ai']);
  });

  it('gives every step a highlight, and its marks exist on the chart', async () => {
    const { stepsWithoutHighlight } = await import('@/components/story/highlight.jsx');
    const el = show(Part1Real);
    expect(stepsWithoutHighlight(el)).toEqual([]);
    // at most three steps a scene
    el.querySelectorAll('.scrolly').forEach((b) => expect(b.querySelectorAll('.scrolly-step:not(.is-spacer)').length).toBeLessThanOrEqual(3));
    const marks = (c) => new Set([...c.querySelectorAll('[data-mark]')].flatMap((m) => m.dataset.mark.split(/\s+/)));
    const out = marks(render(<OutputCanvas state={1} />).container);
    for (const id of ['gdp-latest', 'gdp-annual', 'obr-forecast']) expect(out.has(id)).toBe(true);
    cleanup();
    const board = marks(render(<LabourBoard focus={0} />).container);
    for (const id of ['employment', 'pay', 'productivity']) expect(board.has(id)).toBe(true);
    cleanup();
    const ai = marks(render(<AiUseChart />).container);
    for (const id of ['ai-all', 'ai-ten']) expect(ai.has(id)).toBe(true);
  });

  it('has three scenes that keep every old step id and block id as link targets', () => {
    const el = show(Part1Real);
    expect([...el.querySelectorAll('.scrolly')].map((b) => b.id)).toEqual(['p1-output', 'p1-work', 'p1-ai']);
    const steps = ['p1-output-0', 'p1-output-1', 'p1-output-2', 'p1-work-0', 'p1-pay-0', 'p1-productivity-0', 'p1-ai-0', 'p1-ai-10', 'p1-exposure-0'];
    expect([...el.querySelectorAll('.scrolly-step')].map((li) => li.id)).toEqual(steps);
    // the quarters' figures: their anchor is on the GDP tile, which holds them
    expect(el.querySelector('#p1-quarters').closest('#p1-vital-gdp')).not.toBeNull();
    // old block ids and removed step ids: an anchor in the card that now holds the figure
    const home = { 'p1-ai-1': 'p1-ai-0', 'p1-pay': 'p1-pay-0', 'p1-productivity': 'p1-productivity-0', 'p1-share': 'p1-productivity-0', 'p1-exposure': 'p1-exposure-0', 'p1-work-1': 'p1-work-0', 'p1-share-0': 'p1-productivity-0', 'p1-exposure-1': 'p1-exposure-0' };
    for (const [id, step] of Object.entries(home)) {
      const a = el.querySelector(`#${id}`);
      expect(a, id).not.toBeNull();
      expect(a.closest('.scrolly-step').id).toBe(step);
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

  it('makes every card one sentence, with no fold or links beside it', () => {
    const el = show(Part1Real);
    // each child span counted apart (textContent glues a fact's value, label and sub)
    const words = (n) => [...(n.children.length ? n.children : [n])].map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim().split(' ').length;
    el.querySelectorAll('.scrolly-card').forEach((c) => {
      // the card's one icon (Scrolly draws it from step.icon)
      expect([...c.querySelectorAll('svg')].filter((v) => !v.closest('.hl-key'))).toHaveLength(1);
      expect(c.querySelector('.scrolly-card-icon')).not.toBeNull();
      // one or two short sentences, at most 22 words (the voice pass's
      // exposure step; Key and Fig chips counted as words)
      const say = c.querySelectorAll('.p1-say');
      expect(say).toHaveLength(1);
      expect(say[0].textContent.replace(/\s+/g, ' ').trim().split(' ').length).toBeLessThanOrEqual(22);
      // nothing beside it: no fold, no links, no facts row
      expect(c.querySelectorAll('details, a, .story-facts')).toHaveLength(0);
      c.querySelectorAll('p').forEach((pp) => expect(words(pp)).toBeLessThanOrEqual(25));
      c.querySelectorAll('li').forEach((li) => expect(words(li), li.textContent).toBeLessThanOrEqual(12));
    });
  });

  it('puts icons only where they mark a kind of thing: none in source, unit or fold lines, never two in a block', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.story-source, .story-figure-unit, summary, details li, .p1-say, .p1-vital-sub').forEach((n) => {
      // a key's swatch is the legend mark, not an icon
      expect([...n.querySelectorAll('svg')].filter((v) => !v.closest('.p1-spark, .hl-key, .src-line-btn')), n.textContent.slice(0, 40)).toHaveLength(0);
    });
    el.querySelectorAll('p, li, h3').forEach((n) => {
      if (n.closest('svg') || n.querySelector('p, li')) return;
      // the "Sources and notes" button is a control, not a text icon
      const icons = [...n.querySelectorAll('svg')].filter((v) => !v.closest('.p1-spark, .hl-key, .src-line-btn') && v.getAttribute('role') !== 'img');
      expect(icons.length, n.textContent.slice(0, 40)).toBeLessThanOrEqual(1);
    });
  });

  it('keeps the source lines to the citation (no caveat notes)', () => {
    const el = show(Part1Real);
    el.querySelectorAll('.p1-figure p.story-source').forEach((s) => {
      expect(s.textContent).not.toMatch(/Labour Force Survey|leaves out|drawn apart/i);
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

  it('keeps the three series the cards name on the labour board, one in focus', () => {
    const n = boardSeries().length;
    expect(n).toBe(3);
    for (let f = 0; f < n; f += 1) {
      const c = render(<LabourBoard focus={f} />).container;
      expect(c.querySelectorAll('.p1-board-series')).toHaveLength(3);
      expect([...c.querySelectorAll('.p1-board-series')].findIndex((g) => g.classList.contains('is-focus'))).toBe(f);
      expect(c.querySelectorAll('.p1-board-axes.is-on')).toHaveLength(1);
      cleanup();
    }
  });

  it('draws both AI lines, the larger businesses’ end label carrying their latest value', () => {
    const ai = render(<AiUseChart />).container;
    expect(ai.querySelectorAll('.p1-ai-line')).toHaveLength(2);
    // the value's home is the step text now (its line has its own step): the label restates it
    const lab = ai.querySelector('.p1-end-label.is-ten [data-axis]');
    expect(lab.textContent).toBe(pct1(real.facts.business_ai_use_10plus.value));
  });

  it('shows the tiles as one block first, then in the three exposure groups', () => {
    const a = exposureTiles(0);
    expect(new Set(a.map((t) => t.color)).size).toBe(1);
    expect(new Set(exposureTiles(1).map((t) => t.color)).size).toBe(3);
    const block = render(<ExposureTiles state={0} source={null} />).container;
    expect(block.textContent).toContain('Each tile is one per cent of UK workers');
    cleanup();
    // FinalState: the figure's final state at once (no one-shot entry hold)
    const groups = render(
      <FinalState.Provider value>
        <ExposureTiles state={1} source={null} />
      </FinalState.Provider>,
    ).container;
    expect(groups.querySelector('.p1-exposure').classList.contains('is-grouped')).toBe(true);
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

describe('story part 1, direction words', () => {
  it('maps a sign to its word', () => {
    expect([dirOf(1.2), dirOf(-0.4), dirOf(0)]).toEqual(['rise', 'fall', 'flat']);
    expect([dirWord(1.2), dirWord(-0.4), dirWord(0)]).toEqual(['up', 'down', 'unchanged']);
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
    expect(el.textContent).toContain('The OBR’s latest central forecast, published March 2027');
    // the signed values follow the altered signs (a fall, a zero); the sub-lines carry no direction words
    expect(el.querySelector('#p1-vital-gdp .p1-vital-value').textContent).toMatch(/^−/);
    expect(el.querySelector('#p1-vital-pay .p1-vital-value').textContent).not.toMatch(/^[+−]/);
    expect(el.querySelector('#p1-vital-gdp .p1-vital-sub').textContent).not.toMatch(/^(up|down|unchanged) /);
    vi.doUnmock('@/data/ukContext.json');
  });

  it('words the work scene’s step sentences from the series it is given', async () => {
    const fx = JSON.parse(JSON.stringify(real));
    const e = fx.series.employment_rate;
    const last = e.x.at(-1);
    const ago = e.y[e.x.indexOf(`${Number(last.slice(0, 4)) - 1} ${last.slice(5)}`)];
    e.y[e.y.length - 1] = ago + 1.2;
    const o = fx.series.productivity_oph;
    const y23 = o.y.filter((_, i) => o.x[i].startsWith('2023'));
    o.y[o.y.length - 1] = y23.reduce((a, v) => a + v, 0) / y23.length + 0.2;
    const p = fx.series.pay_growth;
    p.y[p.y.length - 1] = Math.max(...p.y) + 1;
    vi.resetModules();
    vi.doMock('@/data/ukContext.json', () => ({ default: fx }));
    const { default: Part1Fix } = await import('@/tabs/story/Part1.jsx');
    const text = show(Part1Fix).textContent;
    expect(text).toContain('Employment is higher than a year ago.');
    expect(text).toContain('Output per hour is back at its 2023 level.');
    expect(text).toContain(`Regular pay growth is at its highest since ${p.x[0].slice(0, 4)}.`);
    cleanup();
    e.y[e.y.length - 1] = ago - 1.2;
    o.y[o.y.length - 1] = y23[0] - 3;
    vi.resetModules();
    const { default: Part1Low } = await import('@/tabs/story/Part1.jsx');
    const low = show(Part1Low).textContent;
    expect(low).toContain('Employment is lower than a year ago.');
    expect(low).toContain('Output per hour is lower than in 2023.');
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
  it('prints the chosen scenario’s three headline-year gaps, each linked to its home', async () => {
    const S = (await import('@/lib/activeData.js')).default;
    const { heroStats } = await import('@/tabs/story/Hero.jsx');
    const i = S.years.indexOf(S.headline_year);
    const { payLine, scenarioById } = await import('@/tabs/ai/surprise.js');
    const done = (s, cl) => S.results[s].tfp[cl].status === 'done';
    // UK high (some foreign capital) and UK low (none); on a partial file
    // the solved pair UK central and Korinek et al. instead
    const pick = done('uk_high', 'zk0.1') && done('uk_low', 'zk0') ? [['uk_high', 'zk0.1', 's=uk_high'], ['uk_low', 'zk0', 's=uk_low&closure=closed']] : [['uk_central', 'zk0.1', 's=uk_central'], ['korinek', 'zk0', 's=korinek&closure=closed']];
    for (const [s, cl, q] of pick) {
      const el = await at(q);
      // one result unit on the chart's frame: three stats, one anatomy, numbers for all three
      const stats = [...el.querySelectorAll('.hf-stat')];
      expect(stats.map((m) => m.querySelector('.hf-stat-name').textContent)).toEqual(['GDP', 'Pay rate', 'National income']);
      for (const [k, v] of [[0, 'Y'], [1, 'w'], [2, 'NNI']]) {
        const fig = stats[k].querySelector(`.hf-unit [data-path="results.${s}.tfp.${cl}.gaps.${v}.${S.headline_year}"]`) ?? el.querySelector(`.hf-unit [data-path="results.${s}.tfp.${cl}.gaps.${v}.${S.headline_year}"]`);
        expect(fig, `${s} ${v}`).not.toBeNull();
        expect(fig.textContent).toBe(sign(S.results[s].tfp[cl].gaps[v][i]));
        expect(fig.closest('a').getAttribute('href')).toContain('story-headline');
        expect(stats[k].querySelector('.hf-stat-name .tip-target')).not.toBeNull();
      }
      // three links in the stats, no other link but the sources icon's notes
      expect(el.querySelectorAll('.hf-stats a')).toHaveLength(3);
      // neutral ink, no arrows
      expect(el.querySelector('.hf-stat-dir, .hf-unit .is-gain, .hf-unit .is-loss')).toBeNull();
      // the pay line from the data; national income's is the ledger's
      expect(stats[1].querySelector('.hf-stat-line').textContent).toBe(payLine(s, cl));
      if (s === 'uk_high' || s === 'uk_low') expect(payLine(s, cl)).toBe('slower growth, not a cut');
      expect(stats[2].querySelector('.hf-stat-line').textContent).toBe('income kept after wear and tear');
      // GNI beside it, before depreciation (Maria's point 2), from the data
      const gni = stats[2].querySelector(`.hf-stat-beside [data-path="results.${s}.tfp.${cl}.gaps.GNI.${S.headline_year}"]`);
      expect(gni.textContent).toBe(sign(S.results[s].tfp[cl].gaps.GNI[i]));
      expect(stats[2].querySelector('.hf-stat-beside').textContent).toMatch(/^Before depreciation \(GNI\):/);
      // the GDP tip says it is a level
      expect(heroStats(s, cl)[0].tip).toMatch(/A gap in the level, \d+ years on; not a growth rate\.$/);
      // the gilt holders where no capital is foreign-owned
      expect(heroStats(s, cl)[2].tip).toContain(cl === 'zk0' ? 'gilt holders abroad' : 'owners abroad');
      // the kicker: plain, the sources icon on its line
      const kick = el.querySelector('.hf-kicker');
      const nm = (scenarioById(s).short ?? scenarioById(s).label).replace(/[.()]/g, '\\$&');
      expect(kick.textContent).toMatch(new RegExp(`^${nm}( scenario)? · ${S.headline_year} · gap to the forecast path · not a forecast`));
      expect(kick.querySelector('button.src-line-btn')).not.toBeNull();
      expect(el.querySelector('.hf-chip-ctx, figcaption.hf-src')).toBeNull();
      cleanup();
    }
  });
  it('titles the hero: the series name above, then the question in two sentences', async () => {
    const S = (await import('@/lib/activeData.js')).default;
    const el = await at('s=uk_central');
    expect(el.querySelector('.story-hero-text p.hero-series').textContent).toBe('AI and the UK economy: Beyond the forecast');
    const h2 = el.querySelector('h2#story-q');
    expect(h2.previousElementSibling.classList.contains('hero-series')).toBe(true);
    expect(h2.querySelector('.hero-q-lead').textContent).toBe('AI is already here.');
    expect(h2.querySelector('.hero-q-main').textContent).toBe(`What if, from ${S.surprise_year}, it takes on more work than the OBR expects?`);
    expect(h2.textContent).not.toMatch(/arriv/i);
  });
  it('draws all four lines from the surprise year, each labelled, with axis titles', async () => {
    const S = (await import('@/lib/activeData.js')).default;
    const el = await at('s=uk_central');
    const wide = el.querySelector('svg.hf-svg.is-wide');
    expect(wide.getAttribute('role')).toBe('img');
    expect(wide.querySelector('[data-axis-title="y"]').textContent).toMatch(/GDP gap against the OBR’s central forecast path, %/);
    expect(wide.textContent).toContain('0 = forecast path, its own AI included');
    expect(wide.textContent).toContain('Extra AI starts');
    expect(wide.textContent).toContain('Extra AI in full');
    expect(wide.getAttribute('aria-label')).toContain(`each line starts in ${S.surprise_year}`);
    const lines = [...wide.querySelectorAll('path.hf-line')];
    // a line for every scenario solved (all four on the full file)
    const solvedIds = S.scenarios.map((s) => s.id).filter((s) => S.results[s].tfp['zk0.1'].status === 'done').sort();
    expect(lines.map((p) => p.dataset.mark).sort()).toEqual(solvedIds);
    if (S.solves_done === S.solves_total) expect(solvedIds).toEqual(['korinek', 'uk_central', 'uk_high', 'uk_low']);
    // form (b): each line has a point for every year from 2028 on, and its
    // first x is the 2028 guide's
    const i0 = S.years.indexOf(S.surprise_year);
    const guide = Number(wide.querySelector('.hf-ann line').getAttribute('x1'));
    for (const p of lines) {
      const d = p.getAttribute('d');
      expect(d.match(/[ML]/g).length).toBe(S.years.length - i0);
      expect(Number(/^M(-?[\d.]+),/.exec(d)[1])).toBeCloseTo(guide, 0);
    }
    // the chosen line starts with a hollow dot on the guide
    const start = wide.querySelector('.hf-dot-start');
    expect(start.dataset.mark).toBe('uk_central');
    expect(Number(start.getAttribute('cx'))).toBeCloseTo(guide, 0);
    const i = S.years.indexOf(S.headline_year);
    for (const s of solvedIds) {
      expect(wide.textContent).toContain(sign(S.results[s].tfp['zk0.1'].gaps.Y[i]));
    }
    // the first frame is the final one: no draw-in, no count-up
    expect(wide.querySelector('.hf-reveal, clipPath')).toBeNull();
    expect(el.querySelector('.hf-unit .count-up, .hf-unit [data-count]')).toBeNull();
    expect(el.querySelector('.hf-line.is-on').dataset.mark).toBe('uk_central');
  });
});
