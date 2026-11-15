// Story part 3, eight steps in the paper's order, prints the provisional
// uk-ai-study headline findings from aiStudy2425.json once each (the
// detail is on Explore > Households), the Provisional chip, the "A
// different model" card, decile 1 with its caveat, and a Sankey whose
// inflows equal its outflows at every node.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import R from '@/data/relatedWork.json';
import Part3 from './Part3.jsx';
import { imbalances } from '@/components/story/Sankey.jsx';
import { FIG, counts, storyFigures } from '@/tabs/households/figures.js';
import { absorbGraph, DESTS } from './part3/Absorb.jsx';
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

  it('runs eight steps in the paper order, each with a numbered kicker', () => {
    const { container } = renderPart();
    const kickers = [...container.querySelectorAll('.scrolly-kicker')].map((k) => k.textContent);
    expect(kickers.map((k) => k.split(' · ')[0])).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(container.querySelectorAll('.scrolly-step')).toHaveLength(7);
    expect(container.querySelector('.p3-close .scrolly-kicker').textContent).toContain('What the study leaves out');
  });

  it('marks the part provisional, links the PR in every source line, and flags runs outside the rebuild', () => {
    const { container } = renderPart();
    const head = container.querySelector('.story-part-head');
    expect(within(head).getByText('Provisional')).toHaveProperty('className', 'notice-chip');
    const sources = container.querySelectorAll('.story-source');
    expect(sources.length).toBe(container.querySelectorAll('.scrolly').length);
    sources.forEach((s) => {
      expect(s.textContent).toContain('PolicyEngine-UK microsimulation, provisional');
      expect(s.textContent).toContain('FY 2026–27');
      expect(s.querySelector('a').getAttribute('href')).toBe('https://github.com/PolicyEngine/uk-ai-study/pull/18');
    });
    for (const id of ['p3-absorb', 'p3-margin', 'p3-moves']) expect(container.querySelector(`#${id} .p3-chip`), id).not.toBeNull();
  });

  it('opens with the "A different model" card', () => {
    renderPart();
    const h = screen.getByRole('heading', { name: 'A different model' });
    const card = h.closest('.p3-break');
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
    for (const phone of [false, true]) {
      const g = absorbGraph(phone);
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
      if (!phone) S.deciles.forEach((f, i) => expect(out[`d${i + 1}`]).toBeCloseTo(f.earnings_lost_bn, 3));
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
    expect(fig.textContent).toContain('Job loss alone, OBR-sized run (1.67% of employees displaced), not the central case');
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

  it('closes with what the study leaves out and links onward', () => {
    const { container } = renderPart();
    const close = container.querySelector('.p3-close');
    expect(close.closest('.scrolly')).toBeNull();
    expect(close.textContent).toContain('corporation tax');
    const hrefs = [...close.querySelectorAll('a')].map((a) => a.getAttribute('href'));
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
});
