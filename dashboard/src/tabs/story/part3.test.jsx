// Story part 3 prints the provisional uk-ai-study figures from
// aiStudy2425.json: the headline figures once each, the Provisional chip,
// the "A different model" card, and decile 1 with its caveat.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import R from '@/data/relatedWork.json';
import Part3 from './Part3.jsx';
import { fmtBn, fmtDecilePct, fmtGbp, fmtMillions, fmtPence, fmtPp, fmtShare, MINUS } from './part3/format.js';

afterEach(cleanup);

// The part as StoryTab passes it (not imported, so other parts' edits cannot break this test).
const PART = { id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'Jobs, incomes and the public finances' };
const renderPart = () => render(<Part3 part={PART} />);
const count = (text, s) => text.split(s).length - 1;
// The text a number check reads: axis and tile-unit labels removed.
const checkedText = (container) => {
  const c = container.cloneNode(true);
  c.querySelectorAll('[data-axis]').forEach((n) => n.remove());
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
  });
});

describe('Part3', () => {
  it('prints each headline figure exactly once', () => {
    const { container } = renderPart();
    const text = checkedText(container);
    const H = D.headline;
    for (const s of [fmtBn(H.central_cost.value), fmtPp(H.central_poverty.value), fmtPp(H.central_gini.value), fmtMillions(H.central_displaced.value)]) {
      expect(count(text, s), s).toBe(1);
    }
    expect(text).toContain('£7.4bn');
    expect(text).toContain('+2.34pp');
    expect(text).toContain('+1.76pp');
  });

  it('prints every ladder, rule, pence, share and per-worker figure', () => {
    const { container } = renderPart();
    const text = checkedText(container);
    for (const r of D.ladder.filter((x) => x.id !== 'central_50')) {
      expect(count(text, fmtBn(r.cost_bn)), r.id).toBe(1);
      expect(count(text, fmtPp(r.poverty_pp)), r.id).toBe(1);
    }
    for (const r of D.rules.filter((x) => x.id !== 'exposure')) expect(count(text, fmtBn(r.cost_bn)), r.id).toBe(1);
    for (const r of D.per_pound) {
      expect(text).toContain(fmtPence(r.government_p));
      expect(text).toContain(fmtPence(r.household_p));
    }
    for (const k of ['claim_uc', 'claim_uc_entitled', 'existing_unemployed_claim', 'capital_over_limit', 'other_earner', 'homeowner'])
      expect(text).toContain(fmtShare(D.displaced[k].value));
    for (const k of ['uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed']) expect(count(text, fmtGbp(D.displaced[k].value))).toBe(1);
    D.deciles.values.forEach((v) => expect(count(text, fmtDecilePct(v))).toBe(1));
    expect(text).not.toMatch(/\d-\d*\.?\d+(pp|%|bn)/);
    expect(text).not.toMatch(/(^|[\s(])-(£|\d)/);
  });

  it('marks the part provisional and links the PR in every source line', () => {
    const { container } = renderPart();
    const head = container.querySelector('.story-part-head');
    expect(within(head).getByText('Provisional')).toHaveProperty('className', 'notice-chip');
    const sources = container.querySelectorAll('.story-source');
    expect(sources.length).toBe(container.querySelectorAll('.scrolly').length);
    sources.forEach((s) => {
      expect(s.textContent).toContain('PolicyEngine-UK microsimulation, provisional');
      expect(s.querySelector('a').getAttribute('href')).toBe('https://github.com/PolicyEngine/uk-ai-study/pull/18');
    });
  });

  it('opens with the "A different model" card', () => {
    renderPart();
    const h = screen.getByRole('heading', { name: 'A different model' });
    const card = h.closest('.p3-break');
    expect(card.textContent).toContain('Microcosm UK 2024-25');
    expect(card.textContent).toContain('cannot be added to or compared with');
    expect(card.closest('.scrolly')).toBeNull();
  });

  it('greys decile 1, gives it no value label and carries the caveat', () => {
    const { container } = renderPart();
    const d1 = container.querySelector('[data-decile="1"]');
    expect(d1.querySelector('.p3-fill-muted')).not.toBeNull();
    expect(d1.querySelector('.p3-row-value').textContent).toBe('see note');
    const cav = d1.querySelector('[data-caveat="bottom-decile"]');
    expect(cav.textContent).toContain('does not report the bottom income decile as a finding');
    expect(cav.textContent).toContain(fmtDecilePct(D.deciles.values[0]));
    expect(cav.textContent).toContain(`${MINUS}0.33%`);
    expect(cav.textContent).toContain(`${MINUS}0.10%`);
    expect(container.querySelector('[data-decile="2"] .p3-fill-loss')).not.toBeNull();
  });

  it('prints the parsed input rates', () => {
    const { container } = renderPart();
    const text = container.textContent;
    expect(text).toContain('7% of employees');
    expect(text).toContain('1.67% of employees');
    expect(text).not.toMatch(/NaN/);
  });

  it('draws no regions and uses neutral wording', () => {
    const { container } = renderPart();
    const text = container.textContent;
    expect(text).not.toMatch(/\b(should|crisis|needs|poor|rich)\b/i);
    expect(text).not.toMatch(/region/i);
  });
  it('prints no signed, £, pence or per cent figure twice', () => {
    const { container } = renderPart();
    const c = container.cloneNode(true);
    // related PolicyEngine work quotes another study's figures, checked
    // against relatedWork.json by check_numbers.py
    c.querySelectorAll('[data-axis], [data-input], .p3-related').forEach((n) => n.remove());
    const figs = c.textContent.match(/[+\u2212]?£?\d[\d,]*(\.\d+)?(bn|pp|p|%|m)(?![a-z])|£\d[\d,]*/g) ?? [];
    const seen = {};
    for (const f of figs) seen[f] = (seen[f] ?? 0) + 1;
    expect(Object.entries(seen).filter(([, n]) => n > 1)).toEqual([]);
  });

  it('puts the five tile shares in the graphic key, not the cards', () => {
    const { container } = renderPart();
    const key = container.querySelector('#p3-who .p3-tkey');
    for (const k of ['claim_uc', 'claim_uc_entitled', 'capital_over_limit', 'other_earner', 'homeowner']) {
      expect(key.querySelector(`[data-key="${k}"]`).textContent).toContain(fmtShare(D.displaced[k].value));
    }
    expect(key.querySelector('[data-key="capital_over_limit"] [data-input]').textContent).toBe('£16,000');
    expect(key.querySelectorAll('.is-current').length).toBe(1);
    const cards = container.querySelector('#p3-who .scrolly-steps').textContent;
    expect(cards).not.toContain(fmtShare(D.displaced.claim_uc.value));
    expect(cards).toContain(fmtShare(D.displaced.existing_unemployed_claim.value));
  });

  it('gives every step a kicker', () => {
    const { container } = renderPart();
    container.querySelectorAll('.scrolly-step').forEach((st) => expect(st.querySelector('.scrolly-kicker'), st.id).not.toBeNull());
  });

  it('counts the caveat rankings as results and reads the quoted inputs from the data', () => {
    const { container } = renderPart();
    const cav = container.querySelector('[data-caveat="bottom-decile"]');
    expect(cav.querySelector('[data-input]')).toBeNull();
    const inputs = [...container.querySelectorAll('[data-input]')].map((n) => n.textContent);
    expect(inputs).toEqual(expect.arrayContaining(['7%', '1.67%', '60%', '£16,000']));
  });

  it('closes with what the study leaves out and links onward', () => {
    const { container } = renderPart();
    const close = container.querySelector('.p3-close');
    expect(close.closest('.scrolly')).toBeNull();
    expect(close.textContent).toContain('corporation tax');
    const hrefs = [...close.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://github.com/PolicyEngine/uk-ai-study/pull/18');
    expect(hrefs.some((h) => h.includes('tab=method&sub=studies'))).toBe(true);
    const related = [...close.querySelectorAll('.p3-related a')].map((a) => a.getAttribute('href'));
    expect(related).toEqual(R.items.map((x) => x.url));
    for (const x of [R.items[0].gini_base, R.items[0].gini_full]) expect(close.textContent).toContain(x);
  });
});
