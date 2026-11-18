// Story beats (story-beats-fable.md) and the part openers' "which model?"
// tip: one beat per id, each numeral from its data key, B3's headline from
// the signs for every scenario and closure, no signed figure in any beat,
// and each part's model label with a one-line tip without figures.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import S from '@/lib/activeData.js';
import U from '@/data/ukContext.json';
import StoryTab, { BRIDGE_4 } from './StoryTab.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import { beat2031 } from './Part2.jsx';
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
    const beats = [...el.querySelectorAll('aside.story-beat:not(.is-compact)')];
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
    // its sources line: Doorley et al., Briggs and Kodnani, the study paper,
    // each a new-tab link with noopener; the only beat with one
    const cite = beats[3].querySelector('.beat-cite');
    expect(cite.hasAttribute('data-cite')).toBe(true);
    const links = [...cite.querySelectorAll('a')];
    expect(links.map((a) => a.textContent.trim())).toEqual(['Doorley et al. (2026)', 'Briggs and Kodnani (2023)', 'Who bears the AI shock?']);
    expect(links[0].getAttribute('href')).toBe('https://doi.org/10.26504/jr16');
    expect(links[1].getAttribute('href')).toMatch(/^https:\/\/www\.gspublishing\.com\/.*\.pdf$/);
    expect(links[2].getAttribute('href')).toMatch(/uk-ai-study\/blob\/[0-9a-f]{40}\/paper\/main\.pdf$/);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
    expect(el.querySelectorAll('.beat-cite')).toHaveLength(1);
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

  it('builds B3 from the signs for every scenario and closure, never from pay', () => {
    for (const s of S.scenarios) {
      for (const cl of ['zk0.1', 'zk0']) {
        const r = S.results[s.id].tfp[cl];
        const b = beat2031(s.id, cl);
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

  it('bridge each part to the next with one NextPart line, no deep links; only the bridge into part 4 has a second line', () => {
    const el = story();
    const bridges = [...el.querySelectorAll('nav.part-links.story-next')];
    expect(bridges.map((b) => b.querySelector('.part-links-kicker').textContent)).toEqual(['Next: part 2', 'Next: part 3', 'Next: part 4']);
    expect(bridges.map((b) => b.closest('section').id)).toEqual(['story-part-1', 'story-part-2', 'story-part-3']);
    expect(bridges.map((b) => b.querySelector('a').getAttribute('href'))).toEqual(['#story-part-2', '#story-part-3', '#story-close']);
    for (const b of bridges) expect(b.querySelector('.part-links-row')).toBeNull();
    expect(bridges.map((b) => !!b.querySelector('.part-links-lead'))).toEqual([false, false, true]);
    expect(bridges[2].querySelector('.part-links-lead').textContent.trim()).toBe(BRIDGE_4);
  });
});
