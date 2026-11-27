// Story beats (story-beats-fable.md) and the part openers' "which model?"
// tip: one beat per id, each numeral from its data key, B3's headline from
// the signs for every scenario and closure, no signed figure in any beat,
// and each part's model label with a one-line tip without figures.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import S from '@/lib/activeData.js';
import U from '@/data/ukContext.json';
import StoryTab from './StoryTab.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { beatHeadline } from './Part2.jsx';
import { AI_SINCE } from './Part1.jsx';
import { CENTRAL_RATE } from './part3/Central.jsx';
import { MODELS } from './PartHead.jsx';

afterEach(cleanup);

const story = (q = 'tab=story') => {
  window.history.replaceState(null, '', `/?${q}`);
  return render(
    <NavProvider>
      <StoryTab />
    </NavProvider>,
  ).container;
};
const SIGNED = /[+−-]\d+(\.\d+)?\s?(%|pp)/;

describe('story beats', () => {
  it('prints the four beats once each, in story order, numerals from the data', () => {
    const el = story();
    const beats = [...el.querySelectorAll('aside.story-beat:not(.has-icon)')];
    expect(beats.map((b) => b.id)).toEqual([`beat-${AI_SINCE}`, `beat-${S.surprise_year}`, `beat-${S.headline_year}`, 'beat-7pct']);
    expect(AI_SINCE).toBe(Number(U.series.business_ai_use.x[0].match(/\d{4}/)[0]));
    expect(beats[0].querySelector('.beat-num').textContent).toBe(String(AI_SINCE));
    expect(beats[1].querySelector('.beat-num').textContent).toBe(String(S.surprise_year));
    expect(beats[2].querySelector('.beat-num').textContent).toBe(String(S.headline_year));
    // B4 is the 7%'s home: a quoted input with its data path, inside part 3
    const b4 = beats[3].querySelector('.beat-num');
    expect(b4.textContent).toBe(`${CENTRAL_RATE}%`);
    expect(b4.hasAttribute('data-input')).toBe(true);
    expect(b4.dataset.path).toBe('headline.central_displaced.note');
    expect(beats[3].closest('#story-part-3')).not.toBeNull();
    // its sources (Doorley et al., Briggs and Kodnani, the study paper,
    // each a new-tab link with noopener) are in part 3's "About this
    // model", in the DOM with the fold closed (part openings, 22 Nov)
    expect(el.querySelectorAll('.beat-cite')).toHaveLength(0);
    const cite = el.querySelector('#story-part-3 .part-opener-about .part-opener-sources');
    expect(cite.hasAttribute('data-cite')).toBe(true);
    const links = [...cite.querySelectorAll('a')];
    expect(links.map((a) => a.textContent.trim())).toEqual(['Doorley et al. (2026)', 'Briggs and Kodnani (2023)', 'Ahmadi (2026)']);
    // the household study's paper: author-year, the full title on hover, the paper's PDF
    expect(cite.textContent).toMatch(/Household modelling: Ahmadi \(2026\)/);
    expect(links[2].getAttribute('title')).toBe('Ahmadi (2026), Who bears the AI shock? The distributional and fiscal incidence in the UK, PolicyEngine');
    expect(links[2].getAttribute('href')).toMatch(/\/paper\/main\.pdf$/);
    expect(links[0].getAttribute('href')).toBe('https://doi.org/10.26504/jr16');
    expect(links[1].getAttribute('href')).toMatch(/^https:\/\/www\.gspublishing\.com\/.*\.pdf$/);
    expect(links[2].getAttribute('href')).toMatch(/uk-ai-study\/blob\/[0-9a-f]{40}\/paper\/main\.pdf$/);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
    // the surprise-year and 7% beats are their parts' lead stat blocks,
    // right after the opener
    for (const id of [`beat-${S.surprise_year}`, 'beat-7pct']) {
      const b = el.querySelector(`#${id}`);
      expect(b.classList.contains('is-lead')).toBe(true);
      expect(b.previousElementSibling.matches('header.part-opener')).toBe(true);
    }
    expect(el.querySelector(`#beat-${S.surprise_year} .beat-line`).textContent).toBe(`In every scenario, the economy follows the forecast path until ${S.surprise_year}.`);
    expect(el.querySelector('#beat-7pct .beat-head').textContent).toBe('of employees assumed jobless for a year');
    for (const b of beats) {
      // real text, never hidden, not a heading, no icon, no signed figure
      expect(b.getAttribute('aria-hidden')).toBeNull();
      expect(b.querySelector('h1, h2, h3, h4, svg')).toBeNull();
      // at most 8 words, B3's two short sentences (Fable's exact words) 9
      expect(b.querySelector('.beat-head').textContent.split(/\s+/).length).toBeLessThanOrEqual(9);
      expect(b.querySelector('.beat-line').textContent.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(b.textContent).not.toMatch(SIGNED);
    }
  });

  // push D, Q3: the OBR-sized run's beat is a full-size beat with no
  // numeral: its headline leads with one icon, no empty numeral slot
  it('prints the OBR-sized run as a full-size beat led by an icon, not a compact marker', () => {
    const el = story();
    const b = el.querySelector('#beat-obr-run');
    expect(b.classList.contains('has-icon')).toBe(true);
    expect(b.classList.contains('is-compact')).toBe(false);
    expect(b.querySelector('.beat-num')).toBeNull();
    const head = b.querySelector('.beat-head');
    expect(head.textContent).toBe('A smaller shock');
    // the icon comes first, before the words
    expect(head.firstElementChild.matches('svg') || head.firstElementChild.querySelector('svg') != null).toBe(true);
    expect(b.querySelectorAll('svg')).toHaveLength(1);
    expect(b.closest('#story-part-3')).not.toBeNull();
  });

  it('builds B3 from the signs for every scenario and closure, never from pay', () => {
    for (const s of S.scenarios) {
      for (const cl of ['zk0.1', 'zk0']) {
        const r = S.results[s.id].tfp[cl];
        const b = beatHeadline(s.id, cl);
        if (r.status !== 'done') {
          expect(b).toBeNull();
          continue;
        }
        const i = S.years.indexOf(S.headline_year);
        const y = r.gaps.Y[i];
        const g = r.gaps.GNI[i];
        expect(b.head === 'Output is up. Part of the gain goes abroad.').toBe(y > 0.005 && g > 0.005 && g < y);
        expect(`${b.head} ${b.line}`).not.toMatch(/pay/i);
        expect(`${b.head} ${b.line}`).not.toMatch(SIGNED);
      }
    }
  });
});

describe('part openers', () => {
  it('give each part its question as the h2 and a "which model?" tip on the model label', () => {
    const el = story();
    // parts 1-3; the close's opener (item 34) has a title, not a question, and no model tip
    const heads = [...el.querySelectorAll('.part-opener:not(.close-opener)')];
    expect(heads).toHaveLength(3);
    expect(el.querySelectorAll('.part-opener.close-opener')).toHaveLength(1);
    for (const h of heads) {
      expect(h.querySelector('h2 svg, .part-opener-q, .part-opener-model')).toBeNull();
      expect(h.querySelector('h2').textContent).toMatch(/\?$/);
      const tip = h.querySelector('.part-opener-model-tip');
      expect(tip.getAttribute('aria-label')).toBe('Which model is this?');
    }
    for (const m of Object.values(MODELS)) expect(m.tip).not.toMatch(/\d\s?(%|pp)/);
    // the household tip no longer says "never added": the part 3 fold and the close say it
    expect(MODELS.aistudy.tip).not.toMatch(/added/);
  });

  it('bridge only into part 4: parts 2 and 3 open after a divider, named by their eyebrow', () => {
    const el = story();
    const bridges = [...el.querySelectorAll('nav.part-links.story-next')];
    expect(bridges.map((b) => b.querySelector('.part-links-kicker').textContent)).toEqual(['Next: part 4']);
    // part 4's bridge follows the leaves-out section after part 3 (push D, Q4)
    expect(bridges.map((b) => b.closest('section').id)).toEqual(['story-leaves-out']);
    expect(bridges.map((b) => b.querySelector('a').getAttribute('href'))).toEqual(['#story-close']);
    for (const b of bridges) expect(b.querySelector('.part-links-row')).toBeNull();
    for (const b of bridges) expect(b.querySelector('.part-links-lead')).toBeNull();
    // parts 1 and 2 end in a divider; the eyebrows say what each part is
    expect(el.querySelectorAll('#story-part-1 > hr.part-divider, #story-part-2 > hr.part-divider')).toHaveLength(2);
    const eyebrow = (n) => el.querySelector(`#story-part-${n} .part-opener-meta`).textContent;
    expect(eyebrow(1)).toBe('Part 1 · Official statistics: the UK economy and jobs so far');
    expect(eyebrow(2)).toBe(`Part 2 · Macro model: the whole UK economy, year by year to ${S.late_year}`);
    expect(eyebrow(3)).toBe('Part 3 · Household study: one year of assumed job loss, household by household');
    for (const n of [1, 2, 3]) expect(eyebrow(n).split(/\s+/).length - 4).toBeLessThanOrEqual(12);
  });
});
