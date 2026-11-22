// Explore > Households and Method and sources > Household method: the
// household study's detail and method (item-24-fable.md). Every figure is
// printed once across story part 3 and Explore > Households; every chart
// has a CSV download; decile 1 carries its caveat; the policy responses are
// not ranked.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import Part3 from '@/tabs/story/Part3.jsx';
import HouseholdsExplore, { SECTIONS, VARIANT_ARROWS, costSteps } from './HouseholdsExplore.jsx';
import { fmtBn, fmtBn2, fmtDecilePct, fmtShare as fmtShareT } from '@/tabs/story/part3/format.js';
import HouseholdsMethod from './HouseholdsMethod.jsx';
import { FIG, RULE_NAMES, counts, householdsFigures, methodName, storyFigures } from './figures.js';
import { CAVEAT_GREY, DESTS, absorbGraph } from './Absorb.jsx';
import { imbalances } from '@/components/story/Sankey.jsx';
import { Plane, ticksBetween } from './charts.jsx';

afterEach(cleanup);

const text = (container, extra = '') => {
  const c = container.cloneNode(true);
  // a figure's notes behind its "Sources and notes" button are read as
  // present (SourceLine's hidden record), as the page's number check does
  c.querySelectorAll('[data-source-notes]').forEach((n) => n.removeAttribute('hidden'));
  c.querySelectorAll(`[data-axis], [data-input], [hidden]${extra}`).forEach((n) => n.remove());
  c.querySelectorAll('li, p, div, td, th').forEach((n) => n.append(' '));
  return c.textContent;
};
// More info as the page dump reads it (scripts/dumptabs.mjs appends
// [data-more-info] text while the fold is closed)
const foldText = (container) => {
  const c = container.cloneNode(true);
  c.querySelectorAll('[data-axis], [data-input]').forEach((n) => n.remove());
  return [...c.querySelectorAll('[data-more-info]')].map((n) => n.textContent).join(' ');
};
const off = (got, exp) => [...new Set([...Object.keys(got), ...Object.keys(exp)])].filter((k) => got[k] !== exp[k]).map((k) => `${k}: printed ${got[k] ?? 0}, expected ${exp[k] ?? 0}`);
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const flat = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('HouseholdsExplore', () => {
  it('opens with the model row, the question and three section links, titles only', () => {
    const { container } = render(<HouseholdsExplore />);
    expect(container.querySelector('.hh-question > span').textContent).toBe('What moves the cost of AI job displacement, and who loses income?');
    // the model row after the title (item 22): the model line, its first
    // segment a link to the household method, the year from the data
    const line = container.querySelector('.hh-question + .model-row .model-line');
    expect([...line.querySelectorAll('.model-line-seg')].map((x) => x.textContent.trim())).toEqual(['Household study', 'PolicyEngine UK', D.model_year_label, 'Macro model settings don’t apply']);
    // a space between segments in the text (R1-21): never "studyPolicyEngine"
    expect(line.textContent).toContain('Household study PolicyEngine UK');
    expect(line.querySelectorAll('a')).toHaveLength(1);
    expect(line.querySelector('a').getAttribute('href')).toContain('sub=households');
    // no chips, no findings in the nav: three plain links to the sections
    expect(container.querySelector('.hh-findings, .hh-finding, .hh-chip')).toBeNull();
    const nav = container.querySelector('nav.hh-nav[aria-label="On this page"]');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.textContent)).toEqual(['What moves the cost', 'Who loses income', 'Policy responses']);
    links.forEach((a, i) => expect(a.getAttribute('href').endsWith(`#${SECTIONS[i].id}`)).toBe(true));
    for (const s of SECTIONS) expect(container.querySelector(`#${s.id} h2`).textContent).toBe(s.title);
    expect(nav.querySelectorAll('svg, select')).toHaveLength(0);
    // the status comes from the data file: "Provisional" once while the
    // study is provisional, not at all once it is merged
    if (D.provisional === false) {
      expect(container.querySelector('.hh-lead .notice-chip')).toBeNull();
      expect(container.textContent).not.toMatch(/provisional/i);
    } else {
      expect(container.querySelector('.hh-lead [data-source-notes]')?.textContent ?? container.textContent).toMatch(/Draft: Ahmadi \(2026\), Who bears the AI shock\?/);
    }
    expect(container.textContent).not.toMatch(/cell marked/i);
    // the story link and the housing-costs basis behind the page's Sources
    // and notes button (kept in the DOM for the checks)
    expect(container.querySelector('.hh-lead').textContent).toContain('Headlines in story part 3');
    // the orphan link line to the lost-pound scene is gone: card 5 links it
    expect(container.querySelector('#hh-absorb')).toBeNull();
  });

  it('gives each card its finding as the title, one story link in the foot (none on the policy card), no Replay, no row links', () => {
    const { container } = render(<HouseholdsExplore />);
    const cards = [...container.querySelectorAll('article.card')];
    const anchors = { 'hh-cost-lines': 'p3-central-step', 'hh-per-pound': 'p3-margin-step', 'hh-ladder': 'p3-margin-step', 'hh-rules': 'p3-rules-step', 'hh-displaced': 'p3-pound', 'hh-rankings': 'p3-deciles-step', 'hh-policy': null };
    expect(cards.map((c) => c.id)).toEqual(Object.keys(anchors));
    for (const card of cards) {
      const title = flat(card.querySelector('.card-head h3 > span'));
      expect(words(title), card.id).toBeLessThanOrEqual(14);
      expect(title, card.id).not.toMatch(/\.$/);
      // the old topic titles are gone from the page (the download keeps them)
      expect(title, card.id).not.toMatch(/^(Cost by tax and benefit|Cost per pound lost|Every variant|Five rules|Who the displaced are|Deciles under three rankings|Policy responses)$/);
      const links = card.querySelectorAll('.story-link a');
      if (anchors[card.id]) {
        expect(links, card.id).toHaveLength(1);
        expect(links[0].textContent.trim()).toBe('See this in the story');
        expect(links[0].getAttribute('href').endsWith(`#${anchors[card.id]}`), card.id).toBe(true);
        expect(links[0].getAttribute('title'), card.id).toMatch(/^In the Story: /);
      } else expect(links, card.id).toHaveLength(0);
      expect(card.querySelector('.hh-ref, [aria-label="Replay the animation"], [role="switch"], [role="radiogroup"], .axis-titles, .ex-axis-titles'), card.id).toBeNull();
      // one unit line, nothing joined to it
      expect(card.querySelectorAll(':scope > .card-unit'), card.id).toHaveLength(1);
    }
    // no control anywhere on the page (section 5)
    expect(container.querySelectorAll('[role="switch"], [role="radiogroup"], .pill, select')).toHaveLength(0);
  });

  it('draws the cost by line as a waterfall: each line from the end of the last, the net restated from story step 1', () => {
    const { rows, net } = costSteps();
    rows.forEach((r, i) => expect(r.from).toBeCloseTo(i ? rows[i - 1].to : 0, 9));
    expect(net.to).toBe(D.cost_components.total_bn);
    const { container } = render(<HouseholdsExplore />);
    const card = container.querySelector('#hh-cost-lines');
    const netRow = card.querySelector('tr[data-row="net"]');
    expect(netRow.classList.contains('is-main')).toBe(true);
    expect(flat(netRow.querySelector('th'))).toBe('Net cost (main case)');
    const netVal = netRow.querySelector('td.hh-tbl-num [data-axis]');
    expect(netVal.textContent).toBe(fmtBn(D.cost_components.total_bn));
    expect(text(card)).not.toContain(fmtBn(D.cost_components.total_bn));
    expect(flat(card.querySelector('tr[data-row="other_income_tax"] th'))).toBe('Income tax on earnings (net)');
    // a line under £0.05bn prints two decimals, not a phrase
    const other = D.cost_components.rows.find((r) => r.id === 'other');
    if (Math.abs(other.cost_bn) < 0.05) expect(flat(card.querySelector('tr[data-row="other"] td.hh-tbl-num'))).toBe(fmtBn2(other.cost_bn));
    expect(card.textContent).not.toMatch(/under £0\.1bn/);
  });

  it('prints every value in its own cell: every row of the cost, poverty and Gini tables has three filled cells', () => {
    const { container } = render(<HouseholdsExplore />);
    for (const id of ['hh-ladder', 'hh-rules', 'hh-policy']) {
      const rows = container.querySelectorAll(`#${id} tbody tr[data-row]`);
      expect(rows.length, id).toBeGreaterThan(0);
      expect([...container.querySelectorAll(`#${id} thead th.hh-tbl-num`)].map(flat), id).toEqual(['Cost', 'Poverty', 'Gini']);
      for (const r of rows) {
        const cells = [...r.querySelectorAll('td.hh-tbl-num')].map(flat);
        expect(cells, `${id} ${r.dataset.row}`).toHaveLength(3);
        cells.forEach((c) => expect(c, `${id} ${r.dataset.row}`).not.toBe(''));
        // the Gini in points, never pp (R1-06)
        expect(cells[2], `${id} ${r.dataset.row}`).toMatch(/^[+−]\d+\.\d\d points$/);
      }
    }
    // the main case: a ring and weight 600, the words "(main case)", no tint
    for (const id of ['hh-ladder', 'hh-rules']) {
      const main = container.querySelectorAll(`#${id} tbody tr.is-main`);
      expect(main, id).toHaveLength(1);
      expect(main[0].querySelector('.hh-pt-key.is-ring'), id).not.toBeNull();
      expect(flat(main[0].querySelector('th')), id).toMatch(/\(main case\)$/);
    }
    expect(container.querySelectorAll('#hh-policy tr.is-main')).toHaveLength(0);
  });

  it('keeps a label and its number apart in the text (section 3)', () => {
    const { container } = render(<HouseholdsExplore />);
    // a row's cells joined as innerText joins them (a tab between cells)
    for (const tr of container.querySelectorAll('tr[data-row]')) {
      const t = [...tr.children].map((c) => c.textContent).join('\t');
      expect(t, tr.dataset.row).not.toMatch(/[A-Za-z)][+−]?£?\d/);
      for (const td of tr.querySelectorAll('td.hh-tbl-num')) expect(td.textContent.startsWith(' '), tr.dataset.row).toBe(true);
    }
    // the page's text, scales (data-axis ticks) aside
    const c = container.cloneNode(true);
    c.querySelectorAll('[data-axis]').forEach((n) => n.remove());
    expect(c.textContent).not.toMatch(/\)£\d|[a-z]£\d+\.\d|[a-z][+−]\d/);
  });

  // push D, Q8.1: one visible caption per chart; each table is named by an
  // aria-label, so its name never shows as a second line beside the card's
  // unit line or a set's head
  it('names every value table by aria-label, with no caption element', () => {
    const { container } = render(<HouseholdsExplore />);
    expect(container.querySelectorAll('caption')).toHaveLength(0);
    for (const t of container.querySelectorAll('table.hh-tbl')) expect(t.getAttribute('aria-label')).toBeTruthy();
    const sets = [...container.querySelectorAll('#hh-displaced .hh-set')];
    for (const s of sets) expect(s.querySelector('table').getAttribute('aria-label')).toBe(flat(s.querySelector('.hh-set-head')));
  });

  // push D, Q8.2 (Vahid: "less text, go to more info if needed"): the
  // title, at most one short lead line, the chart, one unit line
  it('keeps each card to a title, at most one short lead line and one unit line', () => {
    const { container } = render(<HouseholdsExplore />);
    for (const card of container.querySelectorAll('article.card')) {
      const lead = card.querySelectorAll('.card-lead .hh-lead-s');
      expect(lead.length, card.id).toBeLessThanOrEqual(1);
      if (lead.length) expect(words(flat(lead[0])), card.id).toBeLessThanOrEqual(25);
      expect(card.querySelectorAll('.card-unit'), card.id).toHaveLength(1);
    }
    // moved to More info, not dropped
    const fold = (id) => container.querySelector(`#${id} [data-more-info]`).textContent;
    expect(fold('hh-rules')).toMatch(/top-loaded extreme case costs/);
    expect(fold('hh-ladder')).toMatch(/Wage cuts of the same gross size/);
    expect(fold('hh-per-pound')).toMatch(/On one draw \(seed 0\)/);
    expect(fold('hh-policy')).toMatch(/costed gross/);
    // Fable round 7, S5: the UC changes' reach, in the policy card's caveats
    expect(fold('hh-policy')).toMatch(/two UC changes are not limited to the displaced; wage insurance is paid only to the displaced/);
    expect(fold('hh-policy')).toMatch(/the study does not split it/);
    // push D, Q8.6: wage insurance's other rules sit indented under it
    const rows = [...container.querySelectorAll('#hh-policy tbody tr[data-row]')];
    rows.forEach((r, k) => {
      if (r.classList.contains('is-sub')) expect(rows[k - 1].dataset.row.startsWith('R1_wage_insurance'), r.dataset.row).toBe(true);
    });
  });

  it('keeps the OBR-sized runs a separate group: no arrow joins the groups', () => {
    const obr = (id) => id.startsWith('obr');
    for (const [a, b] of VARIANT_ARROWS) expect(obr(a)).toBe(obr(b));
    const { container } = render(<HouseholdsExplore />);
    const groups = [...container.querySelectorAll('#hh-ladder .hh-tbl-group')].map(flat);
    expect(groups[0]).toBe('Main shock');
    expect(groups[1]).toMatch(/^OBR-sized shock, \S+% of employees displaced$/);
  });

  it('draws UC per person for both take-up cases as bars, with no switch', () => {
    const { container } = render(<HouseholdsExplore />);
    const card = container.querySelector('#hh-displaced');
    const gbp = (v) => `£${Math.round(v).toLocaleString('en-GB')}`;
    for (const k of ['uc_per_displaced', 'uc_per_displaced_takeup', 'uc_per_existing_unemployed']) {
      const r = card.querySelector(`tr[data-row="${k}"]`);
      expect(flat(r.querySelector('td.hh-tbl-num'))).toBe(gbp(D.displaced[k].value));
      expect(r.querySelector('.hh-bar-seg')).not.toBeNull();
    }
    expect(card.querySelector('[role="switch"], .uc-switch, .hh-uc-rows')).toBeNull();
    // three sets under their heads; no tiles, no ordered list
    expect([...card.querySelectorAll('.hh-set-head')].map(flat)).toEqual(['Share that would claim UC', 'What limits entitlement', 'UC added in a year, £ per person']);
    expect(card.querySelector('ol, .stat-tile, .hh-reason')).toBeNull();
  });

  it('gives each card one closed More info with the fixed heads, every figure in it restated, and one icon on the title', () => {
    const { container } = render(<HouseholdsExplore />);
    for (const card of container.querySelectorAll('article.card')) {
      expect(card.querySelectorAll('.disclosure').length, card.id).toBe(1);
      expect(card.querySelectorAll('.card-head h3 .card-icon').length, card.id).toBe(1);
      // a figure in the fold carries data-axis or data-input, so the page
      // dump (which reads closed folds) counts each figure once
      expect(foldText(card), card.id).not.toMatch(FIG);
      expect(card.querySelectorAll('.card-lead svg, .card-unit svg, .hh-tbl svg'), card.id).toHaveLength(0);
    }
    // the sources-and-notes book and the model line's icon
    expect(container.querySelectorAll('.hh-lead svg').length).toBe(2);
    expect(container.querySelectorAll('.section-heading p svg').length).toBe(0);
  });

  it('labels the plane dots directly with the rules’ plain names, plain dots with no icons; the extreme case on the scale', () => {
    const { container } = render(<HouseholdsExplore />);
    const labs = [...container.querySelectorAll('#hh-rules .hh-pt-lab')].map((l) => l.textContent);
    expect(labs).toEqual(['uniform', 'junior', 'exposure', 'compression', 'klein_top_loaded'].map((id) => RULE_NAMES[id].short));
    expect(container.querySelectorAll('.hh-pt svg, .hh-pt-key svg')).toHaveLength(0);
    expect([...container.querySelectorAll('#hh-ladder .hh-pt-lab')].map((l) => l.textContent)).toEqual(['Main case', 'Full take-up', 'Plus JSA', 'Wage cuts', 'OBR-sized shock']);
    expect(container.querySelector('#hh-rules .hh-off-val, #hh-rules .hh-arrow.is-off')).toBeNull();
    expect(container.querySelector('#hh-rules').textContent).not.toMatch(/at the arrow/);
    // R1-15: no study term on Explore; plain names only
    expect(container.textContent).not.toMatch(/[Jj]unior-tilted|[Ee]xpertise compression|\bCompression\b|exposure-proportional/);
    for (const id of ['uniform', 'junior', 'compression']) expect(container.querySelector(`#hh-rules tr[data-row="${id}"] th .hh-tbl-name`).textContent.trim()).toBe(RULE_NAMES[id].plain);
    // axis titles name the quantity only; the ticks carry the units
    expect([...container.querySelectorAll('#hh-rules [data-axis-title]')].map((t) => t.textContent)).toEqual(['Rise in absolute poverty', 'Cost to the public finances']);
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

  it('gives every chart card a download, titled with the old topic name', () => {
    const { container } = render(<HouseholdsExplore />);
    const cards = container.querySelectorAll('article.card');
    // seven: where a lost pound goes is back in the Story (item 19)
    expect(cards.length).toBe(7);
    cards.forEach((c) => expect(c.querySelector('.download button'), c.id).not.toBeNull());
  });

  it('greys decile 1 under every ranking and carries the caveat; the HBAI column restates the story values', () => {
    const { container } = render(<HouseholdsExplore />);
    const card = container.querySelector('#hh-rankings');
    const d1 = card.querySelector('[data-decile="1"]');
    expect(d1.querySelectorAll('.p3-fill-muted')).toHaveLength(D.rankings.length);
    expect(d1.querySelector('.hh-db-val').classList.contains('hh-muted')).toBe(true);
    expect(card.querySelector('[data-caveat="bottom-decile"]').textContent).toContain('so no conclusion is drawn');
    const vals = [...card.querySelectorAll('.hh-db-val')];
    expect(vals.map(flat)).toEqual(D.deciles.values.map(fmtDecilePct));
    vals.forEach((v) => expect(v.querySelector('[data-axis]')).not.toBeNull());
    expect(text(card).match(/[+−]\d+\.\d\d%/g)).toBeNull();
    // one shared legend above the plot; no names inside it
    expect(card.querySelectorAll('.card-legend li')).toHaveLength(D.rankings.length);
    expect(card.querySelector('.hh-db-names, .hh-db-namerow')).toBeNull();
    expect(card.querySelector('.card-legend abbr[title]').textContent).toBe('HBAI');
  });

  it('labels the policy responses neutrally, in one table, two to a row at most, and does not rank them', () => {
    const { container } = render(<HouseholdsExplore />);
    const t = container.textContent;
    expect(t).not.toMatch(/cost-effective|per point|best|worst|should|poor|rich/i);
    // the study's order: each response, then wage insurance under the other rules as sub-rows
    const order = [...container.querySelectorAll('#hh-policy tbody tr[data-row]')].map((r) => r.dataset.row);
    const main = D.policy.rows.filter((r) => r.family === 'exposure');
    expect(order).toEqual(main.flatMap((m) => [m.id, ...D.policy.rows.filter((r) => r.reform === m.reform && r.family !== 'exposure').map((r) => r.id)]));
    const sub = [...container.querySelectorAll('#hh-policy tr.is-sub')].map((r) => r.dataset.row);
    expect(sub).toEqual(D.policy.rows.filter((r) => r.family !== 'exposure').map((r) => r.id));
    // R1-24: no grid of policy panels (they were three in a row)
    expect(container.querySelector('.hh-pol-cards, .hh-pol-card')).toBeNull();
  });

  it('flags the runs outside the rebuild in More info while the data file lists any', () => {
    const { container } = render(<HouseholdsExplore />);
    const out = D.method.outside_rebuild;
    const flagged = out == null || out.length > 0;
    for (const id of ['hh-ladder', 'hh-per-pound', 'hh-displaced']) expect(container.querySelector(`#${id} [data-more-info]`).textContent.includes('Outside the study’s attested rebuild'), id).toBe(flagged);
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

describe('Where a lost pound goes (the Story again, item 19; Explore links to it)', () => {
  it('builds the Sankey from the OBR-sized run, with inflows equal to outflows at every node, and says it is not the main case', () => {
    const S = D.sankey;
    const g = absorbGraph();
    expect(imbalances(g)).toEqual([]);
    const out = {};
    const inn = {};
    for (const l of g.links) {
      expect(l.value).toBeGreaterThanOrEqual(0);
      out[l.source] = (out[l.source] ?? 0) + l.value;
      inn[l.target] = (inn[l.target] ?? 0) + l.value;
    }
    for (const d of DESTS) expect(inn[d.id]).toBeCloseTo(S.total[d.key], 3);
    S.deciles.forEach((f, i) => expect(out[`d${i + 1}`]).toBeCloseTo(f.earnings_lost_bn, 3));
    S.deciles.forEach((f) => expect(f.tax_ni_bn + f.benefits_bn + f.other_bn + f.disposable_bn).toBeCloseTo(f.earnings_lost_bn, 3));
    for (const [k, v] of [['earnings_lost_bn', '£24.0bn'], ['tax_ni_bn', '£6.5bn'], ['benefits_bn', '£0.4bn'], ['other_bn', '£1.3bn'], ['disposable_bn', '£15.8bn']]) expect(fmtBn(S.total[k])).toBe(v);
    expect(fmtBn(S.employer_ni_bn)).toBe('£3.2bn');
    // decile 1 grey, nodes and ribbons, and no other
    expect(g.nodes.filter((n) => n.color === CAVEAT_GREY).map((n) => n.id)).toEqual(['d1']);
    for (const l of g.links) expect(l.color === CAVEAT_GREY).toBe(l.source === 'd1');
    // Explore links to the Story scene from the displaced card's foot, with no figure
    const { container } = render(<HouseholdsExplore />);
    const link = container.querySelector('#hh-displaced .story-link a');
    expect(link.getAttribute('href')).toContain('#p3-pound');
    expect(container.querySelector('.sankey')).toBeNull();
  });
});

// Review round 1, R1-15: one map of the rules' names (figures.js), the
// plain name first; the study's term once, in brackets, on Method.
describe('the rules\u2019 names', () => {
  it('Method gives each plain name with the study\u2019s term once in brackets; the Story uses the same plain names', () => {
    const m = render(<HouseholdsMethod />).container.textContent;
    for (const [id, n] of Object.entries(RULE_NAMES)) {
      expect(m, id).toContain(methodName(id));
      if (n.study) expect(m.match(new RegExp(`\\(${n.study}\\)`, 'g')), id).toHaveLength(1);
    }
    const story = render(<Part3 part={{ id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'A model of households' }} />).container.textContent.toLowerCase();
    for (const id of ['uniform', 'junior', 'exposure', 'compression']) expect(story, id).toContain(RULE_NAMES[id].plain.toLowerCase());
  });
});

describe('HouseholdsMethod', () => {
  it('covers data, exposure, the shock, rules, take-up, draws, what it leaves out and vintages', () => {
    const { container } = render(<HouseholdsMethod />);
    for (const id of ['hm-pipeline', 'hm-data', 'hm-exposure', 'hm-shock', 'hm-rules', 'hm-takeup', 'hm-draws', 'hm-out', 'hm-vintage'])
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    const t = container.textContent;
    expect(t).toContain(D.model_year_label);
    expect(t).toContain(`policyengine-uk ${D.method.policyengine_uk}`);
    expect(t).toContain('C-AIOE');
    expect(t).not.toMatch(/NaN|undefined/);
    // T5 (round 2): the study's rebuild status is said here, once
    if (D.status_note && /without a full clean-room rerun/i.test(D.status_note)) expect(t.match(/were not re-run from scratch/g)).toHaveLength(1);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(D.source.paper_url);
  });

  it('prints no result figure', () => {
    const { container } = render(<HouseholdsMethod />);
    expect(text(container).match(/[+−]\d+\.\d\dpp|£\d+\.\dbn/g)).toBeNull();
  });
});

// Item 23 (checks-words2.md): Detail and sources lives on Method and
// sources (sub=detail); Explore > Households keeps one line linking to it.
describe('Detail and sources', () => {
  it('is a Method sub-tab with every result file and the commit; Explore links to it in one line', async () => {
    const { default: HouseholdsDetail, FILES } = await import('./HouseholdsDetail.jsx');
    const { TABS } = await import('@/lib/labels.js');
    expect(TABS.find((t) => t.id === 'method').subs.map((s) => s.id)).toContain('detail');
    const page = render(<HouseholdsDetail />).container;
    expect(page.querySelector('#detail-sources h2').textContent).toBe('Detail and sources');
    expect(page.querySelectorAll('.hh-sources [data-reference] li')).toHaveLength(FILES.length);
    expect(page.textContent).toContain(D.source.commit.slice(0, 7));
    for (const a of page.querySelectorAll('.hh-sources > p a[target="_blank"]')) expect(a.getAttribute('rel')).toContain('noopener');
    const ex = render(<HouseholdsExplore />).container;
    expect(ex.textContent).not.toContain('Result files, commit, how the page is built.');
    const links = [...ex.querySelectorAll('a')].filter((a) => /Detail and sources/.test(a.textContent));
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toMatch(/tab=method&sub=detail/);
    expect(ex.querySelector('.hh-sources')).toBeNull();
  });
});

// Item 28 (checks-words2.md) and item 24's failed claims: the words the
// data support.
describe('Explore > Households, the words the data support', () => {
  it('says would claim, gives each share its base, names losing deciles from the data, and drops reach', async () => {
    const { rankingsWords, rankingsLead, policyWords } = await import('./HouseholdsExplore.jsx');
    const ex = render(<HouseholdsExplore />).container;
    const disp = ex.querySelector('#hh-displaced');
    // the 48%: "would claim", never "claim UC" (its base includes units with no entitlement)
    expect(disp.textContent).not.toMatch(/(^|[^d] )[Cc]laim UC/);
    expect(disp.querySelector('ol')).toBeNull();
    const rows = [...disp.querySelectorAll('tr[data-row]')].slice(0, 3).map((r) => [flat(r.querySelector('th')), flat(r.querySelector('td.hh-tbl-num'))]);
    expect(rows).toEqual([
      ['All units with a displaced worker', fmtShareT(D.displaced.claim_uc.value)],
      ['Those entitled to UC once displaced', fmtShareT(D.displaced.claim_uc_entitled.value)],
      ['Entitled units with someone already unemployed', fmtShareT(D.displaced.existing_unemployed_claim.value)],
    ]);
    // deciles: the boundary read from the data (all three rankings agree)
    const R = D.rankings;
    const lose = [...Array(10).keys()].filter((i) => R.every((r) => r.values[i] < 0)).map((i) => i + 1);
    const gain = [...Array(10).keys()].filter((i) => R.every((r) => r.values[i] > 0)).map((i) => i + 1);
    expect(lose).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(gain).toEqual([10]);
    expect(rankingsWords(R)).toBe('Deciles 2 to 9 lose income under all three rankings; decile 1 changes sign');
    // decile 10 is never said to gain: under 0.2% under each ranking (R1-03)
    expect(rankingsLead(R)).toBe('Decile 10 moves by less than 0.2% under each ranking.');
    expect(ex.querySelector('#hh-rankings .card-head h3').textContent).toContain('Deciles 2 to 9 lose income');
    expect(ex.textContent).not.toMatch(/decile 10 gains/i);
    expect(policyWords(D.policy.rows)).not.toMatch(/reach/);
    expect(ex.textContent).not.toMatch(/\breach\b/);
    // per pound: the household part is labelled as a part of the total;
    // the remainder is drawn and named in the legend, never printed
    const pp = ex.querySelector('#hh-per-pound');
    expect([...pp.querySelectorAll('thead th.hh-tbl-num')].map(flat)).toEqual(['Total', 'Of which tax, employee NI and benefits']);
    expect([...pp.querySelectorAll('.card-legend li')].map(flat)).toEqual(['Tax, employee NI and benefits', 'Employer NI and other items']);
    expect(flat(pp.querySelector('tr[data-row="pp-job"]'))).toContain('not split');
    const w = D.per_pound.find((r) => r.id === 'wage_cuts');
    expect(pp.textContent).not.toContain(`${Math.round(w.government_p - w.household_p)}p`);
    expect(pp.textContent).not.toContain(`${Math.round(D.per_pound_20.wage_cuts_employer_ni_p)}p`);
  });
});

// The plane takes a negative y range (Households redesign, commit 2): the
// policy plane's poverty axis, zero at the top.
describe('charts', () => {
  it('ticksBetween covers a negative range, 0 included', () => {
    expect(ticksBetween(-2, 0, 0.5)).toEqual([-2, -1.5, -1, -0.5, 0]);
    expect(ticksBetween(-1.2, 0.6, 0.5)).toEqual([-1, -0.5, 0, 0.5]);
  });
  it('a plane with yMin < 0 puts y = 0 at the top of the plot', () => {
    const pts = [{ id: 'a', n: 1, x: 10, y: -1.5, name: 'A', lab: 'A' }];
    const { container } = render(<Plane points={pts} xMax={30} yMax={0} yMin={-2} xUnit={(t) => `£${t}bn`} yUnit="pp" label="Test plane" yTitle="y" xTitle="x" />);
    const zero = [...container.querySelectorAll('line.hh-zero')].find((l) => l.getAttribute('x1') !== l.getAttribute('x2'));
    const ys = [...container.querySelectorAll('.hh-axis line')].filter((l) => l.getAttribute('x1') !== l.getAttribute('x2')).map((l) => Number(l.getAttribute('y1')));
    expect(Number(zero.getAttribute('y1'))).toBe(Math.min(...ys));
    const pt = container.querySelector('.hh-pt');
    expect(parseFloat(pt.style.top)).toBeGreaterThan(Number(zero.getAttribute('y1')));
    expect([...container.querySelectorAll('.hh-ticks-ov .is-y')].map((e) => e.textContent)).toEqual(['−2pp', '−1.5pp', '−1pp', '−0.5pp', '0pp']);
  });
});
