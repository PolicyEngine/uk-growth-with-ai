// Explore > Households and Method and sources > Household method: the
// uk-ai-study detail and method. Every figure is printed once across story
// part 3 and Explore > Households; every chart has a CSV download; decile 1
// carries its caveat; the policy responses are not ranked.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import Part3 from '@/tabs/story/Part3.jsx';
import HouseholdsExplore from './HouseholdsExplore.jsx';
import HouseholdsMethod from './HouseholdsMethod.jsx';
import { FIG, counts, householdsFigures, storyFigures } from './figures.js';

afterEach(cleanup);

const text = (container, extra = '') => {
  const c = container.cloneNode(true);
  c.querySelectorAll(`[data-axis], [data-input], [hidden]${extra}`).forEach((n) => n.remove());
  c.querySelectorAll('li, p, div').forEach((n) => n.append(' '));
  return c.textContent;
};
const off = (got, exp) => [...new Set([...Object.keys(got), ...Object.keys(exp)])].filter((k) => got[k] !== exp[k]).map((k) => `${k}: printed ${got[k] ?? 0}, expected ${exp[k] ?? 0}`);

describe('HouseholdsExplore', () => {
  it('opens with the question and the answer, marked provisional', () => {
    const { container } = render(<HouseholdsExplore />);
    expect(container.querySelector('.hh-question').textContent).toMatch(/\?$/);
    expect(container.querySelector('.hh-answer')).not.toBeNull();
    expect(container.querySelector('.hh-lead .notice-chip').textContent).toBe('Provisional');
  });

  it('prints every figure at its home exactly once', () => {
    const { container } = render(<HouseholdsExplore />);
    const got = counts(text(container).match(FIG) ?? []);
    expect(off(got, counts(householdsFigures()))).toEqual([]);
    expect(text(container)).not.toMatch(/NaN|undefined/);
  });

  it('prints no figure across part 3 and this page that is not listed at one home', () => {
    const story = render(<Part3 part={{ id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'A model of households' }} />).container;
    const page = render(<HouseholdsExplore />).container;
    const got = counts([...(text(story, ', .p3-related').match(FIG) ?? []), ...(text(page).match(FIG) ?? [])]);
    expect(off(got, counts([...storyFigures(), ...householdsFigures()]))).toEqual([]);
  });

  it('gives every chart card a download', () => {
    const { container } = render(<HouseholdsExplore />);
    const cards = container.querySelectorAll('article.card');
    expect(cards.length).toBe(7);
    cards.forEach((c) => expect(c.querySelector('.download button'), c.id).not.toBeNull());
  });

  it('greys decile 1 under every ranking and carries the caveat, without reprinting the story values', () => {
    const { container } = render(<HouseholdsExplore />);
    const d1 = container.querySelector('#hh-rankings [data-decile="1"]');
    expect(d1.querySelectorAll('.p3-fill-muted')).toHaveLength(D.rankings.length);
    expect(container.querySelector('#hh-rankings [data-caveat="bottom-decile"]').textContent).toContain('does not report it as a finding');
  });

  it('labels the policy responses neutrally and does not rank them', () => {
    const { container } = render(<HouseholdsExplore />);
    const t = container.textContent;
    expect(t).not.toMatch(/cost-effective|per point|best|worst|should|poor|rich/i);
    const order = [...container.querySelectorAll('#hh-policy [data-row]')].map((r) => r.dataset.row);
    expect(order).toEqual(D.policy.rows.map((r) => r.id));
  });

  it('flags the runs outside the rebuild', () => {
    const { container } = render(<HouseholdsExplore />);
    for (const id of ['hh-ladder', 'hh-per-pound']) expect(container.querySelector(`#${id} .p3-chip`), id).not.toBeNull();
  });
});

describe('HouseholdsMethod', () => {
  it('covers data, exposure, the shock, rules, take-up, draws, what it leaves out and vintages', () => {
    const { container } = render(<HouseholdsMethod />);
    for (const id of ['hm-pipeline', 'hm-data', 'hm-exposure', 'hm-shock', 'hm-rules', 'hm-takeup', 'hm-draws', 'hm-out', 'hm-vintage'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    const t = container.textContent;
    expect(t).toContain('FY 2026–27');
    expect(t).toContain(`PolicyEngine-UK ${D.method.policyengine_uk}`);
    expect(t).toContain('C-AIOE');
    expect(t).toContain(D.source.commit.slice(0, 7));
    expect(t).toContain(D.method.data_build);
    expect(t).not.toMatch(/NaN|undefined/);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://github.com/PolicyEngine/uk-ai-study/blob/data/microcosm-2024-25/paper/main.pdf');
  });

  it('prints no result figure', () => {
    const { container } = render(<HouseholdsMethod />);
    expect(text(container).match(/[+−]\d+\.\d\dpp|£\d+\.\dbn/g)).toBeNull();
  });
});
