// Story part 3, eight sections in the paper's order, each scene at most
// three one-sentence steps that each name the marks they light,
// prints the provisional uk-ai-study headline findings from
// aiStudy2425.json once each (the detail is on Explore > Households), the
// "A different model" call-out that states it is provisional, decile 1 with
// its caveat, a Sankey whose inflows equal its outflows at every node, and a
// "Next" band to the close that carries the onward links.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import Part3, { P3_RECAP } from './Part3.jsx';
import { imbalances } from '@/components/story/Sankey.jsx';
import { FIG, counts, storyFigures } from '@/tabs/households/figures.js';
import { ABSORB_SUB, absorbGraph, CAVEAT_GREY, DESTS } from './part3/Absorb.jsx';
import { CENTRAL_RATE, CENTRAL_SUB, DISPLACED_TILES, centralRate, centralTiles } from './part3/Central.jsx';
import { CHANNELS_SUB, waterfall } from './part3/Channels.jsx';
import { rulesClaims, rulesSub } from './part3/Rules.jsx';
import { marginClaims, marginSub } from './part3/Margin.jsx';
import { BREAKS, movesSub } from './part3/Moves.jsx';
import { CHANNEL_STEPS, effectWords, fillFor } from './part3/Channels.jsx';
import { stepsWithoutHighlight } from '@/components/story/highlight.jsx';
import { DECILES_SUB, bottomDecileRankings, decileShape, signIcon } from './part3/Deciles.jsx';
import { takeupDirections } from './part3/Moves.jsx';
import { CLOSING_SUB, LEFT_OUT } from './part3/Closing.jsx';
import { MODEL_YEAR, OUTSIDE_REBUILD, PROVISIONAL, ladder, rule } from './part3/shared.jsx';
import TwoLenses, { CLOSE_SUB } from './TwoLenses.jsx';
import { fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtGini, fmtMonths, fmtPct1, fmtPctSigned0, fmtPctSigned1, fmtPence, fmtPenceRange, fmtPp, fmtShare, MINUS } from './part3/format.js';

afterEach(cleanup);

// The part as StoryTab passes it (not imported, so other parts' edits cannot break this test).
const PART = { id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'A model of households' };
const renderPart = () => render(<Part3 part={PART} />);
// The text a number check reads: axis labels and quoted inputs removed.
const checkedText = (container, extra = '') => {
  const c = container.cloneNode(true);
  c.querySelectorAll(`[data-axis], [data-input], [hidden]${extra}`).forEach((n) => n.remove());
  // block elements end a line, as innerText does in the browser
  c.querySelectorAll('li, p, div').forEach((n) => n.append(' '));
  return c.textContent;
};

describe('format', () => {
  it('formats with U+2212 minus and the stated shapes', () => {
    expect(fmtBn(7.38)).toBe('£7.4bn');
    expect(fmtBn(-10.4)).toBe(`${MINUS}£10.4bn`);
    expect(fmtPp(2.34)).toBe('+2.34pp');
    expect(fmtPp(-0.01)).toBe(`${MINUS}0.01pp`);
    expect(fmtPence(28.8)).toBe('29p');
    expect(fmtShare(47.9)).toBe('48%');
    expect(fmtGbp(1385)).toBe('£1,385');
    expect(fmtDecilePct(-2.86)).toBe(`${MINUS}2.86%`);
    expect(fmtBn2(0.1502)).toBe('£0.15bn');
    expect(fmtPct1(11.401)).toBe('11.4%');
    expect(fmtPctSigned1(3.73)).toBe('+3.7%');
    expect(fmtGini(0.3021)).toBe('0.302');
    expect(fmtMonths(9.36)).toBe('9.4 months');
    expect(fmtPenceRange(40.6, 43.0)).toBe('41p–43p');
  });
});

describe('Part3', () => {
  it('prints every figure at its home exactly once, and nothing else', () => {
    const { container } = renderPart();
    const text = checkedText(container);
    const got = counts(text.match(FIG) ?? []);
    const exp = counts(storyFigures());
    const off = [...new Set([...Object.keys(got), ...Object.keys(exp)])].filter((k) => got[k] !== exp[k]);
    expect(off.map((k) => `${k}: printed ${got[k] ?? 0}, expected ${exp[k] ?? 0}`)).toEqual([]);
    expect(text).toContain(`from ${fmtGini(D.baseline.gini.value)}`);
    expect(text).toContain(fmtMonths(D.breakeven.duration.value_months));
    expect(text).not.toMatch(/NaN|undefined/);
  });

  it('prints the headline figures the paper prints', () => {
    const text = checkedText(renderPart().container);
    // read from the data, so the test follows a rerun of the study
    const H = D.headline;
    const S = D.sankey;
    const L = (id) => ladder(id);
    for (const s of [
      fmtBn(H.central_cost.value),
      fmtPp(H.central_poverty.value),
      fmtPct1(D.baseline.absolute_bhc_pct.value),
      fmtPct1(D.baseline.relative_bhc_pct.value),
      fmtPp(H.central_gini.value),
      fmtGini(D.baseline.gini.value),
      fmtBn(D.channels.rows.find((r) => r.id === 'displacement').cost_bn),
      fmtBn(D.channels.rows.find((r) => r.id === 'wage').cost_bn),
      fmtBn(D.channels.rows.find((r) => r.id === 'capital').cost_bn),
      fmtPctSigned0(D.breakeven.capital.value_pct),
      ...['earnings_lost_bn', 'tax_ni_bn', 'benefits_bn', 'other_bn', 'disposable_bn'].map((k) => fmtBn(S.total[k])),
      fmtBn(S.employer_ni_bn),
      fmtPence(D.per_pound_20.job_loss.government_p),
      fmtPenceRange(D.per_pound_20.job_loss.min_p, D.per_pound_20.job_loss.max_p),
      fmtPence(D.per_pound.find((r) => r.id === 'wage_cuts').government_p),
      fmtPctSigned1(D.breakeven.wage.value_pct),
      fmtMonths(D.breakeven.duration.value_months),
      fmtBn(L('takeup').cost_bn),
      fmtBn(L('takeup_jsa').cost_bn),
      fmtPp(L('central_20').poverty_pp),
      fmtPp(L('takeup').poverty_pp),
      fmtPp(L('takeup_jsa').poverty_pp),
    ])
      expect(text, s).toContain(s);
  });

  it('runs eight sections in the paper order, each under a topic header with a question; one step, one sentence, one highlight', () => {
    const { container } = renderPart();
    const topics = [...container.querySelectorAll('[data-scene]')].map((h) => h.dataset.scene);
    expect(topics).toEqual(['The central case', 'Three channels', 'Where a lost pound goes', 'Where the loss falls', 'Who loses the job', 'Job loss or wage cuts', 'What moves the cost', 'What the study leaves out']);
    // at most three steps a scene; the step ids links point at are kept
    for (const s of container.querySelectorAll('#story-part-3 .scrolly, .scrolly')) expect(s.querySelectorAll('.scrolly-step').length, s.id).toBeLessThanOrEqual(3);
    for (const id of ['p3-central-step', 'p3-channels-step', 'p3-absorb-step', 'p3-deciles-step', 'p3-rules-step', 'p3-margin-step', 'p3-moves-step', 'p3-takeup-step'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(stepsWithoutHighlight(container)).toEqual([]);
    // each step's sentence is about 15 words at most, and every id it lights is a mark in its figure
    for (const st of container.querySelectorAll('.scrolly-step')) {
      const t = st.querySelector('.scrolly-title');
      if (t) {
        const c = t.cloneNode(true);
        c.querySelectorAll('.hl-num').forEach((m) => m.remove());
        expect(c.textContent.trim().split(/\s+/).length, st.id).toBeLessThanOrEqual(16);
      }
      const block = st.closest('.scrolly');
      const marks = new Set([...block.querySelectorAll('.scrolly-graphic [data-mark]')].flatMap((m) => m.dataset.mark.split(/\s+/)));
      // the Sankey's marks are set on its nodes after mount (a DOM effect)
      if (block.id === 'p3-absorb') continue;
      for (const id of st.dataset.highlight.split(' ')) expect(marks.has(id), `${st.id}: ${id}`).toBe(true);
    }
    // the close of part 3 is a static header: question, then its answer
    const head = container.querySelector('.p3-close [data-scene]');
    expect(head.querySelector('.scene-head-q').textContent).toBe('What does the study leave out?');
    expect(head.querySelector('.scene-head-a').textContent).toContain('Re-employment');
  });

  it('gives every topic a neutral question and a takeaway with no figures', () => {
    for (const sub of [CENTRAL_SUB, CHANNELS_SUB, ABSORB_SUB, DECILES_SUB, rulesSub(), marginSub(), movesSub(), CLOSING_SUB, CLOSE_SUB]) {
      expect(sub.question, sub.title).toMatch(/\?$/);
      expect(sub.takeaway, sub.title).toBeTruthy();
      expect(sub.takeaway, sub.title).not.toMatch(/\d/);
      expect(sub.question, sub.title).not.toMatch(/\d/);
      expect(sub.answer, sub.title).toBeTruthy();
    }
    // every Scrolly topic has a hint, and an answer that links to its home (data-axis, not a second home)
    for (const sub of [CENTRAL_SUB, CHANNELS_SUB, ABSORB_SUB, DECILES_SUB, rulesSub(), marginSub(), movesSub()]) {
      expect(sub.hint, sub.title).toBeTruthy();
      expect(sub.answerTo, sub.title).toMatch(/^p3-.*-step$/);
    }
    expect(P3_RECAP).toHaveLength(3);
    for (const r of P3_RECAP) {
      expect(r.q).toMatch(/\?$/);
      expect(r.a).not.toMatch(/\d/);
      expect(r.to).toMatch(/^q-p3-/);
      expect(r.q.split(' ').length + r.a.split(' ').length).toBeLessThanOrEqual(20);
    }
  });

  it('states the study status from the data, links each figure’s result files at the commit, and flags runs outside the rebuild only while provisional', () => {
    const { container } = renderPart();
    expect(container.querySelector('.story-callout').textContent.includes('provisional')).toBe(PROVISIONAL);
    expect(MODEL_YEAR).toMatch(/^FY \d{4}–\d{2}$/);
    if (D.model_year_label) expect(MODEL_YEAR).toBe(D.model_year_label);
    const commit = D.commit ?? D.source.commit;
    if (D.source.files_base_url) expect(D.source.files_base_url).toContain(commit);
    const sources = container.querySelectorAll('.story-source');
    expect(sources.length).toBe(container.querySelectorAll('.scrolly').length);
    sources.forEach((s) => {
      expect(s.textContent).toContain(`PolicyEngine-UK microsimulation${PROVISIONAL ? ', provisional' : ''}, ${MODEL_YEAR}`);
      expect(s.textContent).toContain(MODEL_YEAR);
      const hrefs = [...s.querySelectorAll('a')].map((a) => a.getAttribute('href'));
      expect(hrefs.at(-1)).toBe(`https://github.com/PolicyEngine/uk-ai-study/pull/${D.source.pr}`);
      const files = hrefs.slice(0, -1);
      expect(files.length).toBeGreaterThan(0);
      for (const h of files) expect(h.startsWith(`https://github.com/PolicyEngine/uk-ai-study/blob/${commit}/results/`), h).toBe(true);
    });
    for (const id of ['p3-absorb', 'p3-margin', 'p3-moves']) expect(!!container.querySelector(`#${id} .p3-flag`), id).toBe(OUTSIDE_REBUILD);
    expect(container.querySelector('.p3-chip')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(our|we assume)\b/i);
  });

  it('names and links every external input', () => {
    const hrefs = [...renderPart().container.querySelectorAll('a.p3-ref')].map((a) => a.getAttribute('href'));
    for (const u of ['https://doi.org/10.26504/jr16', 'https://doi.org/10.1002/smj.3286', 'https://doi.org/10.5089/9798400254802.001', 'https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/', 'https://www.gov.uk/government/collections/households-below-average-income-hbai--2'])
      expect(hrefs, u).toContain(u);
  });

  it('titles the axes of every part 3 figure, the value axis "y"', () => {
    const { container } = renderPart();
    for (const id of ['p3-central', 'p3-channels', 'p3-absorb', 'p3-deciles', 'p3-rules', 'p3-margin', 'p3-moves'])
      expect(container.querySelector(`#${id} .scrolly-graphic [data-axis-title="y"]`), id).not.toBeNull();
  });

  it('opens with the "A different model" call-out', () => {
    const { container } = renderPart();
    const card = container.querySelector('.story-callout');
    expect(card.querySelector('.story-callout-title').textContent).toBe('A different model');
    expect(card.textContent).toContain('Microcosm UK 2024-25');
    expect(card.textContent).toContain(MODEL_YEAR);
    expect(card.textContent).toContain('cannot be added to or compared with');
    expect(card.closest('.scrolly')).toBeNull();
  });

  it('greys decile 1, gives it no value label and carries the caveat with all three rankings', () => {
    const { container } = renderPart();
    const d1 = container.querySelector('[data-decile="1"]');
    expect(d1.querySelector('.p3-fill-muted')).not.toBeNull();
    expect(d1.querySelector('.p3-row-value').textContent).toBe('see ③');
    // the caveat is said once: the third step, its rankings table and fold
    const step = container.querySelector('#p3-deciles-step-3');
    expect(step.textContent).toContain('does not report the bottom decile as a finding');
    expect(container.querySelector('#p3-deciles').textContent.split('not report the bottom decile').length - 1).toBe(1);
    const cav = step.querySelector('[data-caveat="bottom-decile"]');
    for (const s of ['+1.86%', `${MINUS}0.32%`, `${MINUS}0.10%`]) expect(cav.textContent).toContain(s);
    expect(cav.querySelector('[data-input]')).toBeNull();
    expect(container.querySelector('[data-decile="2"] .p3-fill-loss')).not.toBeNull();
  });

  it('builds the Sankey from the OBR-sized run, with inflows equal to outflows at every node', () => {
    const S = D.sankey;
    {
      const g = absorbGraph();
      expect(imbalances(g)).toEqual([]);
      // a two-column graph has no node with both, so check each side too
      const out = {};
      const inn = {};
      for (const l of g.links) {
        expect(l.value).toBeGreaterThanOrEqual(0);
        out[l.source] = (out[l.source] ?? 0) + l.value;
        inn[l.target] = (inn[l.target] ?? 0) + l.value;
      }
      for (const d of DESTS) expect(inn[d.id]).toBeCloseTo(S.total[d.key], 3);
      const totalOut = Object.values(out).reduce((a, b) => a + b, 0);
      expect(totalOut).toBeCloseTo(S.total.earnings_lost_bn, 3);
      S.deciles.forEach((f, i) => expect(out[`d${i + 1}`]).toBeCloseTo(f.earnings_lost_bn, 3));
    }
    // decile flows add up to each decile's earnings lost, and the deciles to the total
    S.deciles.forEach((f) => expect(f.tax_ni_bn + f.benefits_bn + f.other_bn + f.disposable_bn).toBeCloseTo(f.earnings_lost_bn, 3));
    expect(fmtBn(S.total.earnings_lost_bn)).toBe('£24.0bn');
    expect(fmtBn(S.total.tax_ni_bn)).toBe('£6.5bn');
    expect(fmtBn(S.total.benefits_bn)).toBe('£0.4bn');
    expect(fmtBn(S.total.other_bn)).toBe('£1.3bn');
    expect(fmtBn(S.total.disposable_bn)).toBe('£15.8bn');
    expect(fmtBn(S.employer_ni_bn)).toBe('£3.2bn');
    const { container } = renderPart();
    const fig = container.querySelector('#p3-absorb');
    expect(fig.textContent).toContain('Job loss alone, a smaller run sized to the OBR’s March 2026 displacement scenario, not the central case');
    // its rate (1.67%) has its home on Explore > Households
    expect(fig.textContent).not.toContain('1.67%');
    expect(fig.querySelectorAll('.sankey-link')).toHaveLength(40);
  });

  it('reads the quoted inputs from the data and keeps them out of the count', () => {
    const { container } = renderPart();
    const inputs = [...container.querySelectorAll('[data-input]')].map((n) => n.textContent);
    expect(inputs).toEqual(expect.arrayContaining(['7%', '2.6%', '+39.8%', '60%']));
    // each quoted input once in the part (the number checks skip [data-input], so count here):
    // the central wage and capital settings at step 1, the OBR-sized rate on Explore > Households
    const text = container.textContent;
    for (const s of ['2.6%', '39.8%']) expect(text.split(s).length - 1, s).toBe(1);
    expect(text).not.toContain('1.67%');
  });

  it('uses neutral wording and draws no regions', () => {
    const text = renderPart().container.textContent;
    expect(text).not.toMatch(/\b(should|crisis|needs|poor|rich|cost-effective)\b/i);
    expect(text).not.toMatch(/region/i);
    expect(text).not.toMatch(/\d-\d*\.?\d+(pp|%|bn)/);
    expect(text).not.toMatch(/(^|[\s(])-(£|\d)/);
  });

  it('closes with what the study leaves out, then a band to the close that links onward', () => {
    const { container } = renderPart();
    const close = container.querySelector('.p3-close');
    expect(close.closest('.scrolly')).toBeNull();
    expect(close.textContent).toMatch(/corporation tax/i);
    const next = container.querySelector('.story-next');
    expect(next.querySelector('.story-next-link').getAttribute('href')).toBe('#story-close');
    expect(next.textContent).toContain('Two lenses');
    const hrefs = [...next.querySelectorAll('.story-next-links a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`https://github.com/PolicyEngine/uk-ai-study/pull/${D.source.pr}`);
    expect(hrefs).toContain(`https://github.com/PolicyEngine/uk-ai-study/blob/${D.commit ?? D.source.commit}/paper/main.pdf`);
    for (const q of ['tab=explore&sub=households', 'tab=method&sub=households', 'tab=method&sub=studies']) expect(hrefs.some((h) => h.includes(q)), q).toBe(true);
    // related PolicyEngine work lives on Method and sources > Evidence: one link here, no figures
    expect(close.querySelector('.p3-related')).toBeNull();
    const rel = [...next.querySelectorAll('.story-next-links a')].find((a) => a.textContent.includes('Related PolicyEngine work'));
    expect(rel.getAttribute('href')).toContain('tab=method&sub=studies');
  });

  it('keeps unused formats importable', () => {
    expect([fmtGbp, fmtShare, fmtPence].every((f) => typeof f === 'function')).toBe(true);
  });

  // Part 3 does not change with the header's scenario, closure or rule (one
  // provisional study, one year), so each direction is checked once per value.
  it('draws every direction icon and word from the sign of its value', () => {
    for (const r of D.channels.rows) {
      expect(fillFor(r.cost_bn), r.id).toBe(r.cost_bn > 0 ? 'p3-fill-loss' : 'p3-fill-gain');
      expect(effectWords(r.cost_bn), r.id).toBe(r.cost_bn > 0 ? 'costs the public finances' : 'raises net receipts');
    }
    const first = render(<>{CHANNEL_STEPS[0].title}</>).container.textContent;
    expect(first).toContain(effectWords(D.channels.rows.find((r) => r.id === 'displacement').cost_bn));
    for (const [v] of bottomDecileRankings()) expect(signIcon(v)).toBe(v > 0 ? 'rise' : v < 0 ? 'fall' : 'onPath');
    expect(bottomDecileRankings()).toHaveLength(3);
    const t = takeupDirections();
    const dc = ladder('takeup_jsa').cost_bn - ladder('central_20').cost_bn;
    const dp = ladder('takeup_jsa').poverty_pp - ladder('central_20').poverty_pp;
    expect(t.cost.icon).toBe(dc > 0 ? 'rise' : 'fall');
    expect(t.poverty.icon).toBe(dp > 0 ? 'rise' : 'fall');
    const text = renderPart().container.textContent;
    expect(text).toContain(dc > 0 ? 'raise the cost' : 'lower the cost');
    expect(text).toContain(dp < 0 ? 'shrink the poverty rise' : 'add to the poverty rise');
    // the words the card keeps: uniform displacement costs least and raises poverty more than the central case
    const rules = ['uniform', 'junior', 'exposure', 'compression'].map(rule);
    expect(rule('uniform').cost_bn).toBe(Math.min(...rules.map((r) => r.cost_bn)));
    expect(rule('uniform').poverty_pp).toBeGreaterThan(D.headline.central_poverty.value);
  });

  it('keeps part 3 and the close itemised: no block over 25 words, no item over 12', () => {
    const { container } = render(
      <>
        <Part3 part={PART} />
        <TwoLenses />
      </>,
    );
    const long = [];
    for (const el of container.querySelectorAll('p, li, dd, summary')) {
      if (el.querySelector('p, li, dd') || el.closest('svg, [aria-hidden="true"]')) continue;
      // a step's sentence (at most 16 words, checked above) and a recap chip (its question and answer, each checked) are not list items
      if (el.matches('.scrolly-step, .story-recap li')) continue;
      if (el.matches('.story-source, .story-source *')) continue; // citation lines
      const c = el.cloneNode(true);
      // a linked citation ("Doorley et al. (2026)") counts as one word
      c.querySelectorAll('.p3-ref').forEach((a) => a.replaceWith('ref'));
      // numbered markers are scale, not words
      c.querySelectorAll('.hl-num, .p3-nm').forEach((m) => m.remove());
      c.querySelectorAll('span').forEach((s) => s.append(' '));
      const n = c.textContent.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
      if (n > (el.tagName === 'LI' ? 12 : 25)) long.push(`${n}: ${el.textContent.slice(0, 60)}`);
    }
    expect(long).toEqual([]);
    // every icon slot draws an icon (a concept typo in Ico or FigureHead would leave it empty)
    const empty = [...container.querySelectorAll('.p3-ico, .lens-ico, .story-item-icon, .story-fact-icon, .scrolly-title-icon, .plain-icon')].filter((i) => !i.querySelector('svg'));
    expect(empty.length).toBe(0);
  });

  it('shows what the one-year test leaves out as an icon grid, a detail line per tile', () => {
    const { container } = renderPart();
    const tiles = container.querySelectorAll('.p3-close .p3-out-tile');
    expect(tiles).toHaveLength(LEFT_OUT.length);
    expect(container.querySelector('.p3-chip-frame').textContent).toContain('A one-year stress test, not a forecast');
    for (const t of LEFT_OUT) {
      expect(t.label.split(' ').length, t.id).toBeLessThanOrEqual(6);
      expect(t.detail.split(' ').length, t.id).toBeLessThanOrEqual(12);
    }
    // plain list items, every detail line shown (nothing to toggle)
    expect(container.querySelector('.p3-close button')).toBeNull();
    expect(tiles[0].querySelector('.p3-out-detail').textContent).toBe(LEFT_OUT[0].detail);
  });

  it('ends with the two lenses, what each can and cannot say as icon items', () => {
    const { container } = render(<TwoLenses />);
    expect(container.querySelectorAll('.lens')).toHaveLength(2);
    expect([...container.querySelectorAll('.lens-say')].map((h) => h.textContent.trim())).toEqual(['It can say', 'It cannot say', 'It can say', 'It cannot say']);
    expect(container.querySelectorAll('.lens .story-items li .story-item-icon')).toHaveLength(container.querySelectorAll('.lens .story-items li').length);
    expect(container.textContent).toContain('OBR-central path');
    expect(container.textContent).toContain('Job loss as a result: it is assumed');
  });

  // ---- wave 2 scenes: entry beats, derived claims, one home per figure ----

  it('reads the central rate from the data, and never draws NaN tiles', () => {
    expect(CENTRAL_RATE).toBe(7);
    expect(centralRate('Weighted count; no rate stated.')).toBeNull();
    expect(centralRate(null)).toBeNull();
    expect(DISPLACED_TILES).toBe(Math.round(CENTRAL_RATE));
    const before = centralTiles(false);
    const after = centralTiles(true);
    expect(before).toHaveLength(100);
    expect(before.every((t) => t.color === 'var(--pe-gray-200)')).toBe(true);
    // the displaced peel out to a group two columns away, in ink; the count is conserved
    const out = after.filter((t) => t.out);
    expect(out).toHaveLength(DISPLACED_TILES);
    expect(out.every((t) => t.x === 12 && t.color === 'var(--pe-gray-800)')).toBe(true);
    expect(after.filter((t) => !t.out).every((t) => t.x < 10)).toBe(true);
  });

  it('nets the channels as a waterfall that prints no running total', () => {
    const bars = waterfall();
    expect(bars.map((b) => b.id)).toEqual(['displacement', 'wage', 'capital', 'sum']);
    // each channel starts where the one above ends; the landing bar stands from zero
    expect(bars[0].from).toBe(0);
    expect(bars[1].from).toBeCloseTo(bars[0].to, 9);
    expect(bars[2].from).toBeCloseTo(bars[1].to, 9);
    expect(bars[3]).toMatchObject({ from: 0, to: D.channels.sum_bn });
    const fig = renderPart().container.querySelector('#p3-channels .p3-figure');
    const t = checkedText(fig);
    for (const end of [bars[1].to, bars[2].to]) if (Math.abs(end - D.channels.sum_bn) > 0.05) expect(t).not.toContain(fmtBn(end));
    expect(t.match(/[−]?£[\d.]+bn/g)).toEqual([...bars.map((b) => fmtBn(b.value)), fmtBn2(D.channels.interaction_bn)]);
    expect(t).toContain('Sum of the three runs');
  });

  it('reconciles the three bases of the central cost in one line, in one place, without reprinting them', () => {
    const { container } = renderPart();
    const line = [...container.querySelectorAll('p')].filter((p) => /three bases/.test(p.textContent));
    expect(line).toHaveLength(1);
    expect(line[0].closest('#p3-channels-step-3')).not.toBeNull();
    expect(line[0].querySelector('a[href="#p3-central-step"]')).not.toBeNull();
    expect(line[0].querySelector('a[href="#p3-margin-step"]')).not.toBeNull();
    // one draws chip per figure, no "Other bases" clutter
    expect(container.textContent).not.toMatch(/Other bases|Central, step 1|these draws: step 6/);
    for (const f of container.querySelectorAll('#story-part-3 .p3-figure, .p3-figure')) expect(f.querySelectorAll('.p3-draws').length).toBeLessThanOrEqual(1);
  });

  it('keeps decile 1 grey in the Sankey, nodes and ribbons, and never colours another grey', () => {
    const g = absorbGraph();
    expect(g.nodes.find((n) => n.id === 'd1').color).toBe(CAVEAT_GREY);
    for (const l of g.links) expect(l.color === CAVEAT_GREY, `${l.source}->${l.target}`).toBe(l.source === 'd1');
    expect(g.nodes.filter((n) => n.color === CAVEAT_GREY).map((n) => n.id)).toEqual(['d1']);
  });

  it('derives the decile claims and the highlight from the data', () => {
    const v = D.deciles.values;
    const shape = decileShape();
    expect(shape.worst).toBe(v.indexOf(Math.min(...v)) + 1);
    const { container } = renderPart();
    expect(container.querySelector('#p3-deciles .is-worst').dataset.decile).toBe(String(shape.worst));
    const card = container.querySelector('#p3-deciles-step').textContent;
    expect(card).toContain(`decile ${shape.worst}`);
    if (shape.upperMiddle) expect(card).toContain('upper-middle deciles');
    // a different shape changes the words
    const flat = decileShape([1, -3, -2, -1, -1, -1, -1, -1, -1, -0.5]);
    expect(flat).toMatchObject({ worst: 2, upperMiddle: false, hump: false });
  });

  it('derives the rules claims from the data and prints no poverty figure in the rules plot', () => {
    const rs = ['uniform', 'junior', 'exposure', 'compression'].map(rule);
    const c = rulesClaims();
    expect(c.cheapest).toBe(rs.reduce((a, b) => (b.cost_bn < a.cost_bn ? b : a)).id);
    const { container } = renderPart();
    const third = container.querySelector('#p3-rules-step-2').textContent.replace(/\s+/g, ' ');
    expect(third).toContain(c.cheapText.replace('the central case', '').trim());
    const fig = container.querySelector('#p3-rules .p3-figure');
    expect(checkedText(fig)).not.toMatch(/\d\.\d\dpp/);
    // the read-out is mounted only while a dot is focused
    const dot = fig.querySelector('.p3-dot-pov');
    expect(fig.querySelector('.p3-tip')).toBeNull();
    fireEvent.focus(dot);
    expect(fig.querySelector('.p3-tip').textContent).toBe(fmtPp(rule('uniform').poverty_pp));
    fireEvent.blur(dot);
    expect(fig.querySelector('.p3-tip')).toBeNull();
    // the exposure rule is the central case: a ring, no value, a link to step 1
    expect(fig.querySelector('[data-row="exposure"] .p3-dot-cost.is-ring')).not.toBeNull();
    expect(fig.querySelector('[data-row="exposure"] .p3-dot-val')).toBeNull();
  });

  it('derives the margin title and its aria sentence from the signs', () => {
    const c = marginClaims();
    const pj = D.per_pound_20.job_loss.government_p;
    const pw = D.per_pound.find((r) => r.id === 'wage_cuts').government_p;
    expect(c.perPoundMore).toBe(pw > pj ? 'cut' : 'job');
    expect(c.povertyMore).toBe(ladder('central_20').poverty_pp > ladder('wage_cuts').poverty_pp ? 'job' : 'cut');
    const { container } = renderPart();
    const t1 = container.querySelector('#p3-margin-step .scrolly-title').textContent;
    expect(t1).toContain(c.perPoundMore === 'cut' ? 'wage cuts cost the public finances more than' : 'job loss costs the public finances more than');
    expect(container.querySelector('#p3-margin-step-2 .scrolly-title').textContent).toContain(`${c.povertyMore === 'job' ? 'job loss raises' : 'wage cuts raise'} poverty`);
    expect(container.querySelector('#p3-margin .scrolly-graphic').getAttribute('aria-label')).toBe(c.aria);
  });

  it('shows the break-evens as tracks: two words for the cost, one draws chip', () => {
    const { container } = renderPart();
    const fig = container.querySelector('#p3-moves');
    expect(fig.querySelectorAll('.p3-be-track-row')).toHaveLength(3);
    for (const b of BREAKS) {
      const row = fig.querySelector(`[data-row="be-${b.id}"]`);
      expect(checkedText(row).match(FIG) ?? []).toEqual(b.id === 'duration' ? [] : [b.valueText]);
      expect(row.querySelector('.p3-be-word.is-cost').textContent.trim()).toBe('a net cost');
      expect(row.querySelector('.p3-be-word.is-zero').textContent.trim()).toBe('zero');
    }
    // the switch is a radio group; arrow keys move it
    const radios = fig.querySelectorAll('.p3-switch [role="radio"]');
    expect([...radios].map((r) => r.textContent)).toEqual(['Central', 'Break-even']);
    const was = radios[1].getAttribute('aria-checked');
    fireEvent.keyDown(radios[0].parentElement, { key: 'ArrowRight' });
    expect(radios[1].getAttribute('aria-checked')).not.toBe(was);
  });

  it('gives each one-card scene a Replay button and plays it again', () => {
    const { container } = renderPart();
    const buttons = container.querySelectorAll('.ch-icon-btn[aria-label="Replay the animation"]');
    expect(buttons.length).toBe(7);
    buttons.forEach((b) => expect(b.getAttribute('aria-label')).toBe('Replay the animation'));
    act(() => fireEvent.click(buttons[0]));
    expect(container.querySelector('#p3-central .p3-scene')).not.toBeNull();
  });

  it('keeps each step-8 tile to 12 words with its line, the line in the DOM', () => {
    const { container } = renderPart();
    for (const t of LEFT_OUT) expect(`${t.label} ${t.detail}`.split(/\s+/).length, t.id).toBeLessThanOrEqual(12);
    expect(container.querySelectorAll('.p3-out-detail')).toHaveLength(LEFT_OUT.length);
  });

  it('gives each Scrolly block its own topic header (one scheme: no separate scene heads)', () => {
    const { container } = renderPart();
    expect([...container.querySelectorAll('.p3-scene-head')].map((h) => h.dataset.scene)).toEqual(['What the study leaves out']);
    for (const sc of container.querySelectorAll('#story-part-3 .scrolly, .scrolly')) expect(sc.querySelector(':scope > .scene-head'), sc.id).not.toBeNull();
  });

  it('lets a reader follow one decile through the Sankey without printing a new figure', () => {
    const { container } = renderPart();
    const fig = container.querySelector('#p3-absorb');
    const btns = fig.querySelectorAll('.p3-follow-btn');
    expect(btns).toHaveLength(10);
    expect(btns[0].classList.contains('is-caveat')).toBe(true);
    const before = (checkedText(fig).match(FIG) ?? []).length;
    fireEvent.click(btns[7]);
    expect(btns[7].getAttribute('aria-pressed')).toBe('true');
    expect((checkedText(fig).match(FIG) ?? []).length).toBe(before);
    fireEvent.click(btns[7]);
    expect(btns[7].getAttribute('aria-pressed')).toBe('false');
  });

  it('shows both states of step 7, the one not reached dimmed', () => {
    const { container } = renderPart();
    const states = container.querySelectorAll('#p3-moves .p3-state');
    expect([...states].map((x) => x.dataset.state)).toEqual(['breakeven', 'takeup']);
    const off = [...states].filter((x) => x.classList.contains('is-off'));
    expect(off).toHaveLength(1);
    expect(states[1].textContent).toContain(fmtBn(ladder('takeup').cost_bn));
  });
});
