// Explore > Households and Method and sources > Household method: the
// uk-ai-study detail and method. Every figure is printed once across story
// part 3 and Explore > Households; every chart has a CSV download; decile 1
// carries its caveat; the policy responses are not ranked.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import Part3 from '@/tabs/story/Part3.jsx';
import HouseholdsExplore, { FINDINGS, VARIANT_ARROWS, costSteps } from './HouseholdsExplore.jsx';
import { fmtBn } from '@/tabs/story/part3/format.js';
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
  it('opens with the question, three finding chips, "Provisional" once and a link to the story', () => {
    const { container } = render(<HouseholdsExplore />);
    expect(container.querySelector('.hh-question').textContent).toMatch(/\?$/);
    const chips = [...container.querySelectorAll('.hh-findings .hh-finding')];
    expect(chips.map((c) => c.querySelector('b').textContent)).toEqual(['Who loses the job', 'Job loss vs wage cuts', 'Benefit take-up']);
    expect(chips.length).toBe(FINDINGS.length);
    // the status comes from the data file: "Provisional" once while the
    // study is provisional, not at all once it is merged
    if (D.provisional === false) {
      expect(container.querySelector('.hh-lead .notice-chip')).toBeNull();
      expect(container.textContent).not.toMatch(/provisional/i);
    } else {
      expect(container.querySelector('.hh-lead .notice-chip').textContent.trim()).toBe('Provisional');
      expect(container.textContent.match(/provisional/gi)).toHaveLength(1);
    }
    expect(container.textContent).not.toMatch(/cell marked/i);
    const story = [...container.querySelectorAll('.hh-lead a')].find((a) => a.textContent.includes('Headlines in story part 3'));
    expect(story.getAttribute('href')).toContain('#story-part-3');
  });

  it('gives a row at most one story link, never the same link text twice in a row', () => {
    const { container } = render(<HouseholdsExplore />);
    for (const row of container.querySelectorAll('[data-row]')) expect(row.querySelectorAll('.hh-ref').length, row.dataset.row).toBeLessThanOrEqual(1);
    // no two adjacent links with the same text anywhere (the old "Step 6Step 6")
    const links = [...container.querySelectorAll('a')];
    for (let i = 1; i < links.length; i += 1) {
      const adjacent = links[i - 1].nextElementSibling === links[i] || links[i - 1].parentElement?.nextElementSibling?.contains(links[i]);
      if (adjacent) expect(links[i].textContent, links[i].textContent).not.toBe(links[i - 1].textContent);
    }
    for (const a of container.querySelectorAll('.hh-ref')) expect(a.textContent.trim()).toMatch(/^See story, step \d$/);
  });

  it('draws the cost by line as a waterfall: each line from the end of the last, the net without a value', () => {
    const { rows, net } = costSteps();
    rows.forEach((r, i) => expect(r.from).toBeCloseTo(i ? rows[i - 1].to : 0, 9));
    expect(net.to).toBe(D.cost_components.total_bn);
    const { container } = render(<HouseholdsExplore />);
    const card = container.querySelector('#hh-cost-lines');
    expect(card.querySelector('[data-row="net"] .hh-ref').textContent).toContain('step 1');
    expect(text(card)).not.toContain(fmtBn(D.cost_components.total_bn));
    for (const r of rows.slice(1, -1)) if (Math.abs(r.to - D.cost_components.total_bn) > 0.05) expect(text(card)).not.toContain(fmtBn(r.to));
    expect(card.querySelector('[data-row="other_income_tax"] .hh-wf-label').textContent).toBe('Income tax on earnings (net)');
  });

  it('keeps the OBR-sized runs a separate group: no arrow joins the groups', () => {
    const obr = (id) => id.startsWith('obr');
    for (const [a, b] of VARIANT_ARROWS) expect(obr(a)).toBe(obr(b));
    const { container } = render(<HouseholdsExplore />);
    expect(container.querySelector('#hh-ladder .hh-list-group').textContent).toContain('A different, smaller shock');
  });

  it('switches UC per displaced worker between take-up cases, both values in the DOM', () => {
    const { container } = render(<HouseholdsExplore />);
    const rows = container.querySelector('#hh-displaced .hh-uc-rows');
    expect(rows.classList.contains('is-data')).toBe(true);
    const gbp = (v) => `£${Math.round(v).toLocaleString('en-GB')}`;
    expect(rows.textContent).toContain(gbp(D.displaced.uc_per_displaced.value));
    expect(rows.textContent).toContain(gbp(D.displaced.uc_per_displaced_takeup.value));
    fireEvent.click([...container.querySelectorAll('#hh-displaced [role="radio"]')][1]);
    expect(rows.classList.contains('is-full')).toBe(true);
  });

  it('replaces "About this chart" with the notes icon row, popovers mounted only when open', () => {
    const { container } = render(<HouseholdsExplore />);
    expect(container.textContent).not.toContain('About this chart');
    const card = container.querySelector('#hh-policy');
    expect(card.querySelector('.hh-pop')).toBeNull();
    fireEvent.click(card.querySelector('.hh-note-btn'));
    expect(card.querySelector('.hh-pop')).not.toBeNull();
    expect(card.querySelector('.hh-pop').textContent).not.toMatch(/£\d|\dpp/);
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
    const got = counts([...(text(story).match(FIG) ?? []), ...(text(page).match(FIG) ?? [])]);
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
    expect(container.querySelector('#hh-rankings [data-caveat="bottom-decile"]').textContent).toContain('not a finding');
    expect(text(container.querySelector('#hh-rankings')).match(/[+−]\d+\.\d\d%/g)).toBeNull();
  });

  it('labels the policy responses neutrally and does not rank them', () => {
    const { container } = render(<HouseholdsExplore />);
    const t = container.textContent;
    expect(t).not.toMatch(/cost-effective|per point|best|worst|should|poor|rich/i);
    // the three responses in the study's order; wage insurance under the other rules on its card
    const order = [...container.querySelectorAll('#hh-policy .hh-pol-card')].map((r) => r.dataset.row);
    expect(order).toEqual(D.policy.rows.filter((r) => r.family === 'exposure').map((r) => r.id));
    const sub = [...container.querySelectorAll('#hh-policy .hh-pol-sub [data-row]')].map((r) => r.dataset.row);
    expect(sub).toEqual(D.policy.rows.filter((r) => r.family !== 'exposure').map((r) => r.id));
  });

  it('flags the runs outside the rebuild while the data file lists any', () => {
    const { container } = render(<HouseholdsExplore />);
    const out = D.method.outside_rebuild;
    const flagged = out == null || out.length > 0;
    for (const id of ['hh-ladder', 'hh-per-pound', 'hh-displaced']) expect(container.querySelector(`#${id} .p3-flag`) != null, id).toBe(flagged);
  });
});

describe('Households finding lines hold in the data', () => {
  const lad = (id) => D.ladder.find((r) => r.id === id);
  it('full take-up and JSA cost more and raise poverty less (both groups)', () => {
    for (const [a, b] of [['central_20', 'takeup'], ['takeup', 'takeup_jsa'], ['obr', 'obr_takeup'], ['obr_takeup', 'obr_takeup_jsa']]) {
      expect(lad(b).cost_bn, b).toBeGreaterThan(lad(a).cost_bn);
      expect(lad(b).poverty_pp, b).toBeLessThan(lad(a).poverty_pp);
    }
  });
  it('poverty rises under every rule, more than centrally under the other four', () => {
    const central = D.rules.find((r) => r.id === 'exposure').poverty_pp;
    for (const r of D.rules) {
      expect(r.poverty_pp, r.id).toBeGreaterThan(0);
      if (r.id !== 'exposure') expect(r.poverty_pp, r.id).toBeGreaterThan(central);
    }
  });
  it('each policy response lowers poverty and the Gini', () => {
    for (const r of D.policy.rows) {
      expect(r.poverty_pp, r.id).toBeLessThan(0);
      expect(r.gini_pp, r.id).toBeLessThan(0);
    }
  });
  it('on one draw, full take-up and JSA raise the cost of a pound lost', () => {
    const p = (id) => D.per_pound.find((r) => r.id === id).government_p;
    expect(p('job_loss_takeup')).toBeGreaterThan(p('job_loss'));
    expect(p('job_loss_takeup_jsa')).toBeGreaterThan(p('job_loss_takeup'));
  });
});

describe('HouseholdsMethod', () => {
  it('covers data, exposure, the shock, rules, take-up, draws, what it leaves out and vintages', () => {
    const { container } = render(<HouseholdsMethod />);
    for (const id of ['hm-pipeline', 'hm-data', 'hm-exposure', 'hm-shock', 'hm-rules', 'hm-takeup', 'hm-draws', 'hm-out', 'hm-vintage'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    const t = container.textContent;
    expect(t).toContain(D.model_year_label);
    expect(t).toContain(`PolicyEngine-UK ${D.method.policyengine_uk}`);
    expect(t).toContain('C-AIOE');
    expect(t).not.toMatch(/NaN|undefined/);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(D.source.paper_url);
  });

  it('prints no result figure', () => {
    const { container } = render(<HouseholdsMethod />);
    expect(text(container).match(/[+−]\d+\.\d\dpp|£\d+\.\dbn/g)).toBeNull();
  });
});
