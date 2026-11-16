// Story part 3, eight sections in the paper's order (step 7 in two cards),
// prints the provisional uk-ai-study headline findings from
// aiStudy2425.json once each (the detail is on Explore > Households), the
// "A different model" call-out that states it is provisional, decile 1 with
// its caveat, a Sankey whose inflows equal its outflows at every node, and a
// "Next" band to the close that carries the onward links.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import R from '@/data/relatedWork.json';
import Part3 from './Part3.jsx';
import { imbalances } from '@/components/story/Sankey.jsx';
import { FIG, counts, storyFigures } from '@/tabs/households/figures.js';
import { absorbGraph, DESTS } from './part3/Absorb.jsx';
import { channelItems, effectWords, fillFor } from './part3/Channels.jsx';
import { bottomDecileRankings, signIcon } from './part3/Deciles.jsx';
import { takeupDirections } from './part3/Moves.jsx';
import { LEFT_OUT } from './part3/Closing.jsx';
import { ladder, rule } from './part3/shared.jsx';
import TwoLenses from './TwoLenses.jsx';
import { fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtGini, fmtMonths, fmtPct1, fmtPctSigned1, fmtPence, fmtPenceRange, fmtPp, fmtShare, MINUS } from './part3/format.js';

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
    const text = checkedText(container, ', .p3-related');
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
    for (const s of ['£7.4bn', '+2.34pp', '11.4%', '13.4%', '+1.76pp', '0.302', '£40.7bn', '£23.3bn', '£6.2bn', '£0.4bn', '£1.3bn', '£15.4bn', '£3.1bn', '42p', '41p–43p', '55p', '+3.7%', '+56%', '9.4 months', '£9.9bn', '£12.6bn', '+2.31pp', '+2.10pp', '+1.92pp'])
      expect(text, s).toContain(s);
    expect(text).toContain(`${MINUS}£16.8bn`);
  });

  it('runs eight sections in the paper order, each with a numbered kicker (step 7 in two cards)', () => {
    const { container } = renderPart();
    const kickers = [...container.querySelectorAll('.scrolly-kicker')].map((k) => k.textContent);
    expect(kickers.map((k) => k.split(' · ')[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '7', '8']);
    expect(container.querySelectorAll('.scrolly-step')).toHaveLength(8);
    expect(container.querySelector('#p3-moves #p3-moves-step')).not.toBeNull();
    expect(container.querySelector('#p3-moves #p3-takeup-step')).not.toBeNull();
    expect(container.querySelector('.p3-close .scrolly-kicker').textContent).toContain('What the study leaves out');
  });

  it('marks the part provisional, links the PR in every source line, and flags runs outside the rebuild', () => {
    const { container } = renderPart();
    expect(container.querySelector('.story-callout').textContent).toContain('provisional');
    const sources = container.querySelectorAll('.story-source');
    expect(sources.length).toBe(container.querySelectorAll('.scrolly').length);
    sources.forEach((s) => {
      expect(s.textContent).toContain('PolicyEngine-UK microsimulation, provisional');
      expect(s.textContent).toContain('FY 2026–27');
      expect(s.querySelector('a').getAttribute('href')).toBe('https://github.com/PolicyEngine/uk-ai-study/pull/18');
    });
    for (const id of ['p3-absorb', 'p3-margin', 'p3-moves']) expect(container.querySelector(`#${id} .p3-flag`), id).not.toBeNull();
    expect(container.querySelector('.p3-chip')).toBeNull();
  });

  it('opens with the "A different model" call-out', () => {
    const { container } = renderPart();
    const card = container.querySelector('.story-callout');
    expect(card.querySelector('.story-callout-title').textContent).toBe('A different model');
    expect(card.textContent).toContain('Microcosm UK 2024-25');
    expect(card.textContent).toContain('FY 2026–27');
    expect(card.textContent).toContain('cannot be added to or compared with');
    expect(card.closest('.scrolly')).toBeNull();
  });

  it('greys decile 1, gives it no value label and carries the caveat with all three rankings', () => {
    const { container } = renderPart();
    const d1 = container.querySelector('[data-decile="1"]');
    expect(d1.querySelector('.p3-fill-muted')).not.toBeNull();
    expect(d1.querySelector('.p3-row-value').textContent).toBe('see note');
    const cav = d1.querySelector('[data-caveat="bottom-decile"]');
    expect(cav.textContent).toContain('does not report the bottom income decile as a finding');
    for (const s of ['+1.78%', `${MINUS}0.33%`, `${MINUS}0.10%`]) expect(cav.textContent).toContain(s);
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
    expect(fmtBn(S.total.earnings_lost_bn)).toBe('£23.3bn');
    expect(fmtBn(S.total.tax_ni_bn)).toBe('£6.2bn');
    expect(fmtBn(S.total.benefits_bn)).toBe('£0.4bn');
    expect(fmtBn(S.total.other_bn)).toBe('£1.3bn');
    expect(fmtBn(S.total.disposable_bn)).toBe('£15.4bn');
    expect(fmtBn(S.employer_ni_bn)).toBe('£3.1bn');
    const { container } = renderPart();
    const fig = container.querySelector('#p3-absorb');
    expect(fig.textContent).toContain('Job loss alone, a run sized to the OBR’s March 2026 displacement scenario (1.67% of employees displaced), not the central case');
    expect(fig.textContent).toContain('How to read it');
    expect(fig.querySelectorAll('.sankey-link')).toHaveLength(40);
  });

  it('reads the quoted inputs from the data and keeps them out of the count', () => {
    const { container } = renderPart();
    const inputs = [...container.querySelectorAll('[data-input]')].map((n) => n.textContent);
    expect(inputs).toEqual(expect.arrayContaining(['7%', '2.6%', '39.8%', '60%', '1.67%', '+2.6%', '+39.8%']));
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
    expect(hrefs).toContain('https://github.com/PolicyEngine/uk-ai-study/pull/18');
    expect(hrefs).toContain('https://github.com/PolicyEngine/uk-ai-study/blob/data/microcosm-2024-25/paper/main.pdf');
    for (const q of ['tab=explore&sub=households', 'tab=method&sub=households', 'tab=method&sub=studies']) expect(hrefs.some((h) => h.includes(q)), q).toBe(true);
    const related = [...close.querySelectorAll('.p3-related a')].map((a) => a.getAttribute('href'));
    expect(related).toEqual(R.items.map((x) => x.url));
    for (const x of [R.items[0].gini_base, R.items[0].gini_full]) expect(close.textContent).toContain(x);
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
    const items = channelItems();
    for (const it of items) expect(it.text).toContain(effectWords(D.channels.rows.find((r) => r.id === it.key).cost_bn));
    for (const [v] of bottomDecileRankings()) expect(signIcon(v)).toBe(v > 0 ? 'higher' : v < 0 ? 'lower' : 'onPath');
    expect(bottomDecileRankings()).toHaveLength(3);
    const t = takeupDirections();
    const dc = ladder('takeup_jsa').cost_bn - ladder('central_20').cost_bn;
    const dp = ladder('takeup_jsa').poverty_pp - ladder('central_20').poverty_pp;
    expect(t.cost.icon).toBe(dc > 0 ? 'higher' : 'lower');
    expect(t.poverty.icon).toBe(dp > 0 ? 'higher' : 'lower');
    const text = renderPart().container.textContent;
    expect(text).toContain(`The cost ${t.cost.word}`);
    expect(text).toContain(dp < 0 ? 'The poverty rise is smaller' : 'The poverty rise is larger');
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
      if (el.matches('.story-source, .story-source *')) continue; // citation lines
      const c = el.cloneNode(true);
      c.querySelectorAll('.p3-out-detail').forEach((s) => s.remove()); // hidden until hover, focus or tap
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
    const btn = tiles[0].querySelector('button');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(tiles[0].classList.contains('is-open')).toBe(true);
  });

  it('ends with the two lenses, what each can and cannot say as icon items', () => {
    const { container } = render(<TwoLenses />);
    expect(container.querySelectorAll('.lens')).toHaveLength(2);
    expect([...container.querySelectorAll('.lens-say')].map((h) => h.textContent.trim())).toEqual(['It can say', 'It cannot say', 'It can say', 'It cannot say']);
    expect(container.querySelectorAll('.lens .story-items li .story-item-icon')).toHaveLength(container.querySelectorAll('.lens .story-items li').length);
    expect(container.textContent).toContain('OBR-central path');
    expect(container.textContent).toContain('Job loss as a result: it is assumed');
  });
});
