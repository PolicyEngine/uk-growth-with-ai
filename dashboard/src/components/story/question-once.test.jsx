// The question on screen once (Vahid, 21 Nov: "remove"; "why repeate
// these"): a topic that plays its question on its stage (QStage, from a
// Scrolly or a TopicHead) hides its header's copy visually
// (story-bands.css section 5); a topic with no stage keeps its header
// shown. The header stays in the DOM: its h3 (the outline), id q-<id> (the
// anchor) and data-scene (the rail).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup } from '@testing-library/react';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';
import { nextHead } from '@/components/story/QStage.jsx';

afterEach(cleanup);

const css = readFileSync('src/app/story-bands.css', 'utf8');
// the block of the motion-on screen rule that hides the header
const HIDE = /@media screen and \(prefers-reduced-motion: no-preference\) \{\s*\.story \.q-stage:not\(\[data-head-shown\]\) \+ \.scene-head\.scene-head \{[^}]*height: 0;[^}]*\}\s*\.story \.q-stage:not\(\[data-head-shown\]\) \+ \.scene-head > \.scene-head-q \{([^}]*)\}/;

describe('a topic shows its question once', () => {
  it('the header copy is hidden visually, on screen with motion on only, and not while its header is shown', () => {
    const m = css.match(HIDE);
    expect(m).not.toBeNull();
    // the visually-hidden pattern: still read by screen readers
    expect(m[1]).toMatch(/position: absolute/);
    expect(m[1]).toMatch(/clip-path: inset\(50%\)/);
    expect(m[1]).not.toMatch(/display: none|visibility: hidden/);
  });
  it('every question header on the Story follows its stage, or has none and stays shown', () => {
    const { container } = renderPage(PAGES[0]);
    const heads = [...container.querySelectorAll('.scene-head.has-q')];
    expect(heads.length).toBeGreaterThan(0);
    const staged = [];
    for (const h of heads) {
      const id = h.id.replace(/^q-/, '');
      const stage = h.previousElementSibling;
      const inline = h.closest('.scrolly.is-inline');
      // one stage per topic, right before its header (the hiding rule's
      // sibling selector), unless the block is drawn inline
      if (!inline) {
        expect(stage?.matches(`.q-stage[data-q="${id}"]`), h.id).toBe(true);
        expect(container.querySelectorAll(`.q-stage[data-q="${id}"]`), h.id).toHaveLength(1);
        staged.push(id);
      }
      // kept for the outline, the anchor and the rail
      expect(h.querySelector('h3.scene-head-q')?.textContent.trim().length, h.id).toBeGreaterThan(0);
      expect(h.hasAttribute('data-scene'), h.id).toBe(true);
      // the stage's copy is aria-hidden: the header's h3 is the one read
      if (stage?.matches('.q-stage')) expect(stage.querySelector('.q-visual').getAttribute('aria-hidden')).toBe('true');
    }
    // the two TopicHead topics named in review are among them
    expect(staged).toEqual(expect.arrayContaining(['story-output']));
  });
});

// Fable 5.2, fix list 10: the landing guard (is-landed) is paint only; the
// header's layout (data-head-shown) follows it only when nothing in view
// can move: a hard jump, or the stage's foot below the viewport.
describe('the header layout state (nextHead)', () => {
  it('the layout rules key on data-head-shown; is-landed keeps paint only', () => {
    expect(css).not.toMatch(/:not\(\.is-landed\)/);
    expect(css.match(/\.q-stage:not\(\[data-head-shown\]\)/g)).toHaveLength(4);
    expect(css).toMatch(/\.q-stage\.is-landed::before \{ content: none; \}/);
  });
  it('a fast-scroll landing with the stage\'s foot above the viewport\'s foot leaves it unchanged', () => {
    expect(nextHead({ head: false, skip: true, hard: false, below: false })).toBe(false);
  });
  it('the same landing in mid-stage (foot below the viewport) raises it', () => {
    expect(nextHead({ head: false, skip: true, hard: false, below: true })).toBe(true);
  });
  it('a hard jump past the start raises it', () => {
    expect(nextHead({ head: false, skip: true, hard: true, below: false })).toBe(true);
  });
  it('an upward move with the stage above the viewport leaves it raised', () => {
    // the guard lifts on the way up (skip false), the foot is above the viewport's foot
    expect(nextHead({ head: true, skip: false, hard: false, below: false })).toBe(true);
  });
  it('it drops once the guard is down and the stage\'s foot is below the viewport', () => {
    expect(nextHead({ head: true, skip: false, hard: false, below: true })).toBe(false);
  });
});
