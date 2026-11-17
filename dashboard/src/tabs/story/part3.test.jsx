// Story part 3 (round 2): four Scrolly scenes in the paper's order, the
// last ("What changes the answer", the old rules, margin and moves scenes)
// at most four steps and the others at most two, each one sentence naming
// the marks it lights, no folds,
// one source line per figure; it prints the uk-ai-study headline findings
// from aiStudy2425.json once each (the detail, take-up and JSA and the
// lost-pound Sankey included, is on Explore > Households), decile 1 with its
// value and caveat, and a plain list of what the study leaves out. The close
// is one header and one ruled table.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import D from '@/data/aiStudy2425.json';
import Part3 from './Part3.jsx';
import { FIG, counts, storyFigures } from '@/tabs/households/figures.js';
import { CENTRAL_RATE, CENTRAL_SUB, DISPLACED_TILES, centralRate, centralTiles } from './part3/Central.jsx';
import { CHANNELS_SUB, waterfall } from './part3/Channels.jsx';
import { BREAKS, CHANGES_STEPS, PANEL_OF, changesSub, marginClaims, rulesClaims } from './part3/Changes.jsx';
import { CHANNEL_STEPS, effectWords, fillFor } from './part3/Channels.jsx';
import { stepsWithoutHighlight } from '@/components/story/highlight.jsx';
import { DECILES_SUB, bottomDecileRankings, decileShape } from './part3/Deciles.jsx';
import { CLOSING_SUB, LEFT_OUT } from './part3/Closing.jsx';
import { MODEL_YEAR, PROVISIONAL, ladder, rule } from './part3/shared.jsx';
import TwoLenses, { CLOSE_SUB, LENSES, PAY_RESULT } from './TwoLenses.jsx';
import { fmtBn, fmtBn2, fmtDecilePct, fmtGbp, fmtGini, fmtMonths, fmtPct1, fmtPctSigned0, fmtPctSigned1, fmtPence, fmtPenceRange, fmtPp, fmtShare, MINUS } from './part3/format.js';

afterEach(cleanup);

// The part as StoryTab passes it (not imported, so other parts' edits cannot break this test).
const PART = { id: 'story-part-3', n: 3, icon: 'usersRound', kicker: 'Part 3', title: 'A model of households' };
const renderPart = () => render(<Part3 part={PART} />);
// The text a number check reads: axis labels and quoted inputs removed.
const checkedText = (container, extra = '') => {
  const c = container.cloneNode(true);
  // a figure's notes behind its "Sources and notes" button are read as
  // present (SourceLine's hidden record), as the page's number check does
  c.querySelectorAll('[data-source-notes]').forEach((n) => n.removeAttribute('hidden'));
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
      fmtPence(D.per_pound_20.job_loss.government_p),
      fmtPenceRange(D.per_pound_20.job_loss.min_p, D.per_pound_20.job_loss.max_p),
      fmtPence(D.per_pound.find((r) => r.id === 'wage_cuts').government_p),
      fmtPctSigned1(D.breakeven.wage.value_pct),
      fmtMonths(D.breakeven.duration.value_months),
      fmtPp(L('central_20').poverty_pp),
    ])
      expect(text, s).toContain(s);
    // full take-up and JSA print on Explore > Households, not here; the lost-pound Sankey is back here (item 19)
    for (const s of [fmtBn(L('takeup').cost_bn), fmtBn(L('takeup_jsa').cost_bn)]) expect(text, s).not.toContain(s);
    expect(text).toContain(fmtBn(D.sankey.total.earnings_lost_bn));
  });

  it('runs four Scrolly scenes in the paper order, then the leaves-out list; one step, one sentence, one highlight', () => {
    const { container } = renderPart();
    const topics = [...container.querySelectorAll('.scrolly > .scene-head[data-scene]')].map((h) => h.dataset.scene);
    expect(topics).toEqual(['The central case', 'Three channels', 'Where the loss falls', 'Where a lost pound goes', 'What changes the answer']);
    expect(container.querySelector('#p3-close-h').textContent.trim()).toBe('What this one-year test leaves out');
    // at most two steps a scene, four in the merged one; the step ids links point at are kept
    for (const s of container.querySelectorAll('.scrolly')) expect(s.querySelectorAll('.scrolly-step').length, s.id).toBeLessThanOrEqual(s.id === 'p3-changes' ? 4 : 2);
    for (const id of ['p3-central-step', 'p3-channels-step', 'p3-deciles-step', 'p3-rules-step', 'p3-margin-step', 'p3-moves-step']) expect(container.querySelector(`#${id}`), id).not.toBeNull();
    expect(container.querySelector('#p3-absorb, #p3-rules, #p3-margin, #p3-moves')).toBeNull();
    expect(container.querySelector('#p3-takeup-step')).toBeNull();
    expect(stepsWithoutHighlight(container)).toEqual([]);
    // no folds, kickers or kind labels in the steps
    expect(container.querySelector('#story-part-3 details, details')).toBeNull();
    expect(container.textContent).not.toMatch(/About these figures|Key takeaway|Step \d ·/);
    // each step's sentence is 18 words at most (the review's T7 and T12 wordings), and every id it lights is a mark in its figure
    for (const st of container.querySelectorAll('.scrolly-step')) {
      const t = st.querySelector('.p3-step-line');
      if (t) {
        const c = t.cloneNode(true);
        c.querySelectorAll('.hl-num').forEach((m) => m.remove());
        expect(c.textContent.trim().split(/\s+/).length, st.id).toBeLessThanOrEqual(18);
      }
      const block = st.closest('.scrolly');
      const marks = new Set([...block.querySelectorAll('.scrolly-graphic [data-mark]')].flatMap((m) => m.dataset.mark.split(/\s+/)));
      for (const id of st.dataset.highlight.split(' ')) expect(marks.has(id), `${st.id}: ${id}`).toBe(true);
    }
    expect(container.querySelector('#story-part-3 .scrolly-takeaway')).toBeNull();
    const line = (id) => container.querySelector(`#${id} .p3-step-line`).textContent;
    // T14; the central cost is a residual: said once, in the figure's note
    // round 2 sign-off #3: the cost is net of the assumed gains, said in the sentence (the next scene's job loss alone is gross)
    expect(line('p3-central-step-2')).toMatch(/^After assumed pay and capital-income gains, the cost is £\d+\.\dbn a year\. Absolute poverty rises by \+\d\.\d\dpp$/);
    expect(line('p3-channels-step-2')).toContain('Assumed');
    // T12, T7, T6
    expect(line('p3-moves-step')).toBe(`The cost falls to zero if wages rise ${fmtPctSigned1(D.breakeven.wage.value_pct)}, capital income ${fmtPctSigned0(D.breakeven.capital.value_pct)}, or job loss lasts ${fmtMonths(D.breakeven.duration.value_months)}`);
    expect(line('p3-margin-step-2')).toBe('With the assumed gains added back, wage cuts still cost more; job loss raises poverty far more');
    expect(line('p3-deciles-step-2')).toBe('Decile 1’s direction depends on how households are ranked, so no conclusion is drawn');
  });

  it('gives every Scrolly topic a neutral question, a hint and one closing line; no takeaway, no recap', () => {
    for (const sub of [CENTRAL_SUB, CHANNELS_SUB, DECILES_SUB, changesSub(), CLOSE_SUB]) {
      expect(sub.question, sub.title).toMatch(/\?$/);
      expect(sub.question, sub.title).not.toMatch(/\d/);
      expect(sub.takeaway, sub.title).toBeUndefined();
      expect(sub.recap, sub.title).toBeUndefined();
    }
    for (const sub of [CENTRAL_SUB, CHANNELS_SUB, DECILES_SUB, changesSub()]) {
      expect(sub.hint, sub.title).toBeTruthy();
      expect(sub.answer, sub.title).toBeTruthy();
      expect(sub.answerTo, sub.title).toMatch(/^p3-.*-step$/);
    }
    // the leaves-out panel is headed, not asked
    expect(CLOSING_SUB.question).toBeUndefined();
  });

  it('states the study status from the data and gives each figure one source line with one link, at the commit', () => {
    const { container } = renderPart();
    expect(MODEL_YEAR).toMatch(/^FY \d{4}–\d{2}$/);
    if (D.model_year_label) expect(MODEL_YEAR).toBe(D.model_year_label);
    const commit = D.commit ?? D.source.commit;
    if (D.source.files_base_url) expect(D.source.files_base_url).toContain(commit);
    // one quiet "Sources and notes" button a figure, after its title; nothing under the chart
    const btns = container.querySelectorAll('.p3-figure .story-figure-title button.src-line-btn');
    expect(btns.length).toBe(container.querySelectorAll('.scrolly').length);
    expect(container.querySelectorAll('.story-source, .p3-key')).toHaveLength(0);
    btns.forEach((b) => {
      fireEvent.click(b);
      const pop = document.getElementById(b.getAttribute('aria-controls'));
      expect(pop.textContent).toContain(`PolicyEngine-UK microsimulation${PROVISIONAL ? ', provisional' : ''}, ${MODEL_YEAR}`);
      const links = [...pop.querySelectorAll('.src-pop-list a')];
      expect(links[0].textContent).toBe('uk-ai-study results');
      expect(links[0].getAttribute('href')).toBe(`https://github.com/PolicyEngine/uk-ai-study/tree/${commit}/results`);
      // each result file linked at the commit
      for (const a of links.filter((x) => x.textContent.startsWith('results/'))) expect(a.getAttribute('href')).toContain(commit);
      fireEvent.click(b);
    });
    // no call-out, chip or flag boxes
    expect(container.querySelector('.story-callout, .p3-chip, .p3-chip-frame, .p3-draws svg')).toBeNull();
    expect(container.textContent).not.toMatch(/\b(our|we assume)\b/i);
  });

  it('names and links every external input', () => {
    const hrefs = [...renderPart().container.querySelectorAll('a.p3-ref')].map((a) => a.getAttribute('href'));
    // Felten, Pizzinelli, DfE and HBAI are named on Method > Household method
    // the OBR scenario is named on Explore > Households since the lost-pound Sankey moved there (round 2)
    for (const u of ['https://doi.org/10.26504/jr16', 'https://doi.org/10.3982/ECTA19815', 'https://www.gov.uk/guidance/new-style-jobseekers-allowance'])
      expect(hrefs, u).toContain(u);
  });

  it('titles the axes of every part 3 figure, the value axis "y"', () => {
    const { container } = renderPart();
    for (const id of ['p3-central', 'p3-channels', 'p3-deciles', 'p3-changes'])
      expect(container.querySelector(`#${id} .scrolly-graphic [data-axis-title="y"]`), id).not.toBeNull();
  });

  it('has no "A different model" call-out: the opener’s handover line carries the change of model', () => {
    const { container } = renderPart();
    expect(container.querySelector('.story-callout, .p3-model')).toBeNull();
    expect(container.textContent).not.toContain('A different model');
  });

  it('draws decile 1 neutral, with its value and the caveat; the table gives it under the other rankings', () => {
    const { container } = renderPart();
    const d1 = container.querySelector('[data-decile="1"]');
    expect(d1.querySelector('.p3-fill-caveat')).not.toBeNull();
    expect(d1.querySelector('.p3-row-value').textContent).toBe(fmtDecilePct(D.deciles.values[0]));
    expect(d1.querySelector('.p3-dec-note').textContent).toBe('no conclusion drawn');
    const step = container.querySelector('#p3-deciles-step-2');
    expect(step.textContent).toContain('so no conclusion is drawn');
    // the flows by decile are one link away, in the lost-pound scene
    expect(container.querySelector('#p3-deciles a[href*="#p3-pound"]')).not.toBeNull();
    const cav = step.querySelector('[data-caveat="bottom-decile"]');
    for (const s of [`${MINUS}0.32%`, `${MINUS}0.10%`]) expect(cav.textContent).toContain(s);
    expect(cav.textContent).not.toContain(fmtDecilePct(D.deciles.values[0]));
    expect(cav.querySelector('[data-input]')).toBeNull();
    // 2 to 9 in the loss token, and the mark is the bar alone (labels never fade)
    expect(container.querySelector('[data-decile="2"] .p3-fill-loss')).not.toBeNull();
    for (const li of container.querySelectorAll('[data-decile]')) {
      expect(li.hasAttribute('data-mark')).toBe(false);
      expect(li.querySelector('.p3-row-bar').dataset.mark).toBe(`d${li.dataset.decile}`);
    }
  });

  it('reads the quoted inputs from the data and keeps them out of the count', () => {
    const { container } = renderPart();
    const inputs = [...container.querySelectorAll('[data-input]')].map((n) => n.textContent);
    expect(inputs).toEqual(expect.arrayContaining(['7%', '+2.6%', '+39.8%', '0.4']));
    // the assumed pay and capital-income rises are quoted twice (the number checks skip [data-input], so count here):
    // on the channel bars, and as the central settings of the break-even rows (C11); the OBR-sized rate on Explore
    const text = container.textContent;
    for (const s of ['2.6%', '39.8%']) expect(text.split(s).length - 1, s).toBe(2);
    for (const b of container.querySelectorAll('.p3-ch-be-from [data-input]')) expect(b.closest('.p3-ch-be-row')).not.toBeNull();
    // the OBR-sized run's rate is quoted once, in its run-switch marker (data-input)
    expect(inputs).toContain('1.67%');
    expect(text.split('1.67%').length - 1).toBe(1);
  });

  it('uses neutral wording and draws no regions', () => {
    const text = renderPart().container.textContent;
    expect(text).not.toMatch(/\b(should|crisis|needs|poor|rich|cost-effective)\b/i);
    expect(text).not.toMatch(/region/i);
    expect(text).not.toMatch(/\d-\d*\.?\d+(pp|%|bn)/);
    expect(text).not.toMatch(/(^|[\s(])-(£|\d)/);
  });

  it('ends with what the study leaves out as a plain list, and no band: the close carries the links', () => {
    const { container } = renderPart();
    const close = container.querySelector('.p3-close');
    expect(close.closest('.scrolly')).toBeNull();
    expect(close.querySelectorAll('.p3-out-list li')).toHaveLength(LEFT_OUT.length);
    for (const t of LEFT_OUT) expect(t.text.split(/\s+/).length, t.id).toBeLessThanOrEqual(12);
    // a level-(b) header (no icon) and one tinted panel of tiles, one plain icon each
    expect(close.querySelectorAll('.scene-head svg').length).toBe(0);
    expect(close.querySelector('.scene-head h3#p3-close-h')).not.toBeNull();
    expect(close.querySelector('.p3-close-chip').textContent).toBe('A stress test, not a forecast');
    for (const li of close.querySelectorAll('.story-panel .p3-out-list > li')) expect(li.querySelectorAll('svg')).toHaveLength(1);
    expect(close.querySelector('button, .p3-chip-frame')).toBeNull();
    expect(container.querySelector('.story-next')).toBeNull();
    // the dividend and corporation tax asymmetry is said once, in the channels scene
    expect(container.textContent.match(/corporation tax/gi)).toHaveLength(1);
    expect(container.querySelector('#p3-channels .src-essential').textContent).toBe('Dividend tax is counted; corporation tax on the profits is not');
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
    expect(bottomDecileRankings()).toHaveLength(2);
    // "upper bound" qualifies the poverty rise; the cost note follows the take-up runs' sign
    const text = renderPart().container.textContent;
    expect(text).toContain('Poverty rise is an upper bound');
    expect(text).toContain(ladder('takeup').cost_bn > ladder('central_20').cost_bn ? 'fuller benefit take-up raises it' : 'Fuller benefit take-up moves the cost');
    // uniform displacement costs least
    const rules = ['uniform', 'junior', 'exposure', 'compression'].map(rule);
    expect(rule('uniform').cost_bn).toBe(Math.min(...rules.map((r) => r.cost_bn)));
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
      // a figure's notes behind its "Sources and notes" are not on the page
      c.querySelectorAll('[hidden]').forEach((h) => h.remove());
      // a linked citation ("Doorley et al. (2026)") counts as one word
      c.querySelectorAll('.p3-ref').forEach((a) => a.replaceWith('ref'));
      // numbered markers are scale, not words
      c.querySelectorAll('.hl-num, .p3-nm').forEach((m) => m.remove());
      c.querySelectorAll('span').forEach((s) => s.append(' '));
      const n = c.textContent.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
      if (n > (el.tagName === 'LI' ? 12 : 25)) long.push(`${n}: ${el.textContent.slice(0, 60)}`);
    }
    expect(long).toEqual([]);
    // no icon inside a fact, a note, a source line or a table cell
    expect(container.querySelectorAll('.story-fact svg, .p3-key svg, .story-source svg, .lens-chips svg')).toHaveLength(0);
  });

  it('says once in the close that the two models assume opposite pay directions', () => {
    const { container } = render(<TwoLenses />);
    expect(container.querySelector('.lens-close').textContent).toContain('opposite pay directions');
    const cards = container.querySelectorAll('.lens-pay-card');
    expect([...cards].map((c) => c.querySelector('.lens-pay-head').textContent)).toEqual(['Pay is a result', 'Pay is an input']);
    // the input is quoted (data-input); the result restates part 2's pay tile (data-axis), linked to it
    expect(cards[1].querySelector('[data-input]').textContent).toBe(`+${D.method.survivor_wage_pct}%`);
    const res = cards[0].querySelector('[data-axis]');
    expect(res.textContent).toBe(`${PAY_RESULT < 0 ? '−' : '+'}${Math.abs(PAY_RESULT).toFixed(2)}%`);
    expect(res.getAttribute('href')).toContain('#story-headline');
    expect(container.textContent.match(/opposite pay/g)).toHaveLength(1);
  });

  it('ends with one header, the two lenses as real lists of chip links, then at most six links', () => {
    const { container } = render(<TwoLenses />);
    // the question is on the pinned screen only; the header is the title
    expect(container.querySelector('#story-close-h').textContent.trim()).toBe('Two lenses');
    expect(container.textContent.split(CLOSE_SUB.question).length - 1).toBeLessThanOrEqual(1);
    expect(container.querySelector('.lens-table, .story-recap, .scrolly-answer')).toBeNull();
    // one heading per lens naming its model; 4 + 3 "can say" chips, each a link to its scene; 2 outside chips each
    expect([...container.querySelectorAll('h3.lens-kicker')].map((h) => h.textContent.trim())).toEqual(['OG-UK', expect.stringMatching(/^uk-ai-study/)]);
    const can = [...container.querySelectorAll('.lens-circle ul.lens-chips')];
    expect(can.map((u) => u.querySelectorAll('li a').length)).toEqual([4, 3]);
    for (const a of container.querySelectorAll('.lens-circle .lens-chip')) expect(a.getAttribute('href')).toMatch(/#(p2-morph|story-headline|story-output|p2-who|p3-deciles|p3-central)$/);
    expect([...container.querySelectorAll('.lens-outside ul.lens-chips')].map((u) => u.querySelectorAll('li').length)).toEqual([2, 2]);
    for (const l of LENSES) for (const c of [...l.can, ...l.outside]) expect(c.text.split(/\s+/).length, c.text).toBeLessThanOrEqual(4);
    expect(container.querySelector('.lens-overlap').textContent.trim()).toBe('The public finances');
    // decorative circles; no hidden table
    for (const svg of container.querySelectorAll('.lens-rings')) expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelectorAll('.lens-deeper a').length).toBeLessThanOrEqual(6);
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
    expect(before.every((t) => t.color === 'var(--pe-gray-300)')).toBe(true);
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
    // the drawing's own text (its notes behind "Sources and notes" set aside)
    const t = checkedText(fig, ', [data-source-notes]');
    for (const end of [bars[1].to, bars[2].to]) if (Math.abs(end - D.channels.sum_bn) > 0.05) expect(t).not.toContain(fmtBn(end));
    expect(t.match(/[−]?£[\d.]+bn/g)).toEqual(bars.map((b) => fmtBn(b.value)));
    // the interaction is in the figure's notes, behind its "Sources and notes"
    expect(fig.querySelector('[data-source-notes]').textContent).toContain(fmtBn2(D.channels.interaction_bn));
    expect(t).toContain('Sum of the three runs');
  });

  it('prints the draws as plain words, one basis per figure', () => {
    const { container } = renderPart();
    expect(container.textContent).not.toMatch(/three bases|Other bases|Central, step 1|these draws: step 6/);
    for (const f of container.querySelectorAll('.p3-figure')) expect(f.querySelectorAll('.p3-draws svg')).toHaveLength(0);
  });

  it('derives the decile claims and the highlight from the data', () => {
    const v = D.deciles.values;
    const shape = decileShape();
    expect(shape.worst).toBe(v.indexOf(Math.min(...v)) + 1);
    const { container } = renderPart();
    expect(container.querySelector('#p3-deciles .is-worst').dataset.decile).toBe(String(shape.worst));
    const card = container.querySelector('#p3-deciles-step').textContent;
    expect(card).toContain(`decile ${shape.worst}`);
    if (shape.upperMiddle) expect(card).toContain('Income falls most in deciles 6 to 9, most in');
    // a different shape changes the words
    const flat = decileShape([1, -3, -2, -1, -1, -1, -1, -1, -1, -0.5]);
    expect(flat).toMatchObject({ worst: 2, upperMiddle: false, hump: false });
  });

  it('derives the rules claims from the data and prints each rule’s poverty rise beside its dot', () => {
    const rs = ['uniform', 'junior', 'exposure', 'compression'].map(rule);
    const c = rulesClaims();
    expect(c.cheapest).toBe(rs.reduce((a, b) => (b.cost_bn < a.cost_bn ? b : a)).id);
    const { container } = renderPart();
    expect(container.querySelector('#p3-rules-step .p3-step-line').textContent).toContain(c.spreadWords);
    const fig = container.querySelector('#p3-changes .p3-ch-panel[data-panel="rules"]');
    // B10: the three non-central rules' poverty rises are counted here; the central one restates step 1
    expect(checkedText(fig).match(/[+−]\d\.\d\dpp/g)).toEqual(['uniform', 'junior', 'compression'].map((k) => fmtPp(rule(k).poverty_pp)));
    // one cost x poverty plane, both axes from zero (charts-finale A): ticks on both axes, scale only
    expect(fig.querySelectorAll('.p3-plane-ticks[data-axis]')).toHaveLength(2);
    expect(fig.querySelector('.p3-plane-ticks.is-x').textContent).toContain('£0');
    expect(fig.querySelector('[data-axis-title="x"]').textContent).toBe('Cost to the public finances, £bn a year');
    expect(fig.querySelector('[data-axis-title="y"]').textContent).toBe('Absolute poverty rise, pp');
    // one direct label per rule, each with both values; the central case's restate step 1 (data-axis)
    const labels = [...fig.querySelectorAll('ol.p3-plane-labels > li')];
    expect(labels.map((l) => l.dataset.row)).toEqual(['uniform', 'junior', 'exposure', 'compression']);
    const central = fig.querySelector('[data-row="exposure"] .p3-plane-vals');
    expect(central.textContent).toBe(`${fmtBn(rule('exposure').cost_bn)} · ${fmtPp(rule('exposure').poverty_pp)}`);
    expect([...central.querySelectorAll('[data-axis]')]).toHaveLength(2);
    expect(fig.querySelectorAll('.p3-plane-dot.is-ring')).toHaveLength(1);
    // the stress test is named, not drawn or printed
    expect(fig.querySelector('.p3-plane-stress').textContent).not.toMatch(/\d/);
  });

  it('derives the margin sentences and the aria sentence from the signs, and names each margin’s dots', () => {
    const c = marginClaims();
    const pj = D.per_pound_20.job_loss.government_p;
    const pw = D.per_pound.find((r) => r.id === 'wage_cuts').government_p;
    expect(c.perPoundMore).toBe(pw > pj ? 'cut' : 'job');
    expect(c.povertyMore).toBe(ladder('central_20').poverty_pp > ladder('wage_cuts').poverty_pp ? 'job' : 'cut');
    const { container } = renderPart();
    const t1 = container.querySelector('#p3-margin-step .p3-step-line').textContent;
    expect(t1).toContain(c.perPoundMore === 'cut' ? 'wage cuts cost the public finances more than' : 'job loss costs the public finances more than');
    expect(container.querySelector('#p3-margin-step-2 .p3-step-line').textContent).toContain(`${c.povertyMore === 'job' ? 'job loss raises' : 'wage cuts raise'} poverty`);
    const fig = container.querySelector('#p3-changes .p3-ch-panel[data-panel="margin"]');
    // 42p and 55p carry their margin's name (sign-off #5)
    expect(fig.querySelector('[data-mark="m-pence job"] .p3-db-val').textContent).toMatch(new RegExp(`^${fmtPence(pj)} job loss`));
    expect(fig.querySelector('[data-mark="m-pence cut"] .p3-db-val').textContent).toMatch(new RegExp(`^${fmtPence(pw)} wage cuts`));
    expect(fig.querySelectorAll('.p3-ch-ticks[data-axis]')).toHaveLength(3);
  });

  it('shows each break-even as one row: central setting, an arrow, the break-even setting', () => {
    const { container } = renderPart();
    const fig = container.querySelector('#p3-changes .p3-ch-panel[data-panel="breakeven"]');
    expect(fig.querySelectorAll('.p3-ch-be-row')).toHaveLength(3);
    for (const b of BREAKS) {
      const row = fig.querySelector(`[data-row="be-${b.id}"]`);
      expect(row.querySelector('.p3-ch-be-from [data-input]').textContent).toBe(b.centralText);
      expect(row.querySelector('.p3-ch-be-arrow')).not.toBeNull();
      expect(row.querySelector('.p3-ch-be-to .p3-row-value').textContent).toBe(b.valueText);
      expect(checkedText(row).match(FIG) ?? []).toEqual(b.id === 'duration' ? [] : [b.valueText]);
    }
  });

  it('draws the merged scene’s panel from the active step alone: every panel mounted, one shown, all shown when drawn once', () => {
    expect(PANEL_OF).toHaveLength(CHANGES_STEPS.length);
    expect(CHANGES_STEPS.length).toBeLessThanOrEqual(4);
    const { container } = renderPart();
    const panels = container.querySelectorAll('#p3-changes .scrolly-graphic .p3-ch-panel');
    expect([...panels].map((p) => p.dataset.panel)).toEqual(['rules', 'margin', 'breakeven']);
    const shown = [...panels].filter((p) => p.classList.contains('is-shown'));
    // the panel of the step the figure draws (or all, when it is drawn once on a narrow screen)
    const fig = container.querySelector('#p3-changes .p3-ch');
    const step = Number(container.querySelector('#p3-changes .scrolly-graphic-inner').dataset.step);
    if (fig.classList.contains('is-all')) expect(shown).toHaveLength(3);
    else {
      expect(shown.map((p) => p.dataset.panel)).toEqual([['rules', 'margin', 'breakeven'][PANEL_OF[step]]]);
      for (const p of panels) expect(p.hasAttribute('inert')).toBe(!p.classList.contains('is-shown'));
    }
  });

  it('gives each one-card scene a Replay button and plays it again', () => {
    const { container } = renderPart();
    const buttons = container.querySelectorAll('.ch-icon-btn[aria-label="Replay the animation"]');
    expect(buttons.length).toBe(5);
    buttons.forEach((b) => expect(b.getAttribute('aria-label')).toBe('Replay the animation'));
    act(() => fireEvent.click(buttons[0]));
    expect(container.querySelector('#p3-central .p3-scene')).not.toBeNull();
  });

  it('keeps the dividend tax figure on Explore: the story says the asymmetry in words and links there', () => {
    const { container } = renderPart();
    const ch = container.querySelector('#p3-channels');
    expect(ch.querySelector('a[href*="hh-cost-lines"]')).not.toBeNull();
    expect(checkedText(ch)).not.toContain(fmtBn(Math.abs(D.cost_components.rows.find((r) => r.id === 'dividend_tax').cost_bn)));
  });

  it('gives each Scrolly block its own topic header (one scheme: no separate scene heads)', () => {
    const { container } = renderPart();
    expect(container.querySelector('.p3-scene-head')).toBeNull();
    for (const sc of container.querySelectorAll('.scrolly')) expect(sc.querySelector(':scope > .scene-head'), sc.id).not.toBeNull();
  });

  it('keeps the break-evens panel to the break-evens, with one link to take-up and JSA on Explore', () => {
    const { container } = renderPart();
    const fig = container.querySelector('#p3-changes .p3-ch-panel[data-panel="breakeven"]');
    expect(fig.querySelector('.p3-state, .p3-ladder')).toBeNull();
    // its notes (take-up and JSA, linked to Explore) sit behind the figure's "Sources and notes"
    const b = container.querySelector('#p3-changes button.src-line-btn');
    fireEvent.click(b);
    const pop = document.getElementById(b.getAttribute('aria-controls'));
    expect(pop.querySelector('a[href*="hh-ladder"]')).not.toBeNull();
    expect(pop.textContent).toContain('Break-even');
    fireEvent.click(b);
    expect(fig.textContent).not.toContain(fmtBn(ladder('takeup').cost_bn));
  });
});
