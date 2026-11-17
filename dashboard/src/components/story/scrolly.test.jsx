// Scrolly (wave 2 API): step dots as buttons, the scene sub-header, the
// foot, zero-height spacers, the ctx argument, and the old call shape.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import Scrolly from './Scrolly.jsx';
import { TileField, TileGrid, tileDelays, tileSettleMs } from './primitives.jsx';
import { useEnterState } from './motion.js';

afterEach(cleanup);

const steps = [
  { id: 's-a', title: 'First', kicker: 'One', icon: 'gdp', body: <p>a</p> },
  { id: 's-b', title: 'Second', body: <p>b</p> },
  { id: 's-gap', spacer: true },
  { id: 's-c', title: 'Third', body: <p>c</p> },
];

describe('Scrolly', () => {
  it('keeps the old call shape: graphic(i) and plain steps', () => {
    const { container } = render(<Scrolly id="b" steps={steps} graphic={(i) => <p className="g">{i}</p>} label="L" />);
    // jsdom has no layout: every step is past the trigger line, so the last
    expect(container.querySelector('.scrolly-graphic .g').textContent).toBe('3');
    expect(container.querySelectorAll('.scrolly-step:not(.is-spacer)')).toHaveLength(3);
    // the title stays as the step's accessible name, visually hidden
    expect(container.querySelector('h3.scrolly-title.visually-hidden')).not.toBeNull();
    expect(container.querySelector('.scene-head')).toBeNull();
  });
  it('passes ctx as the third argument', () => {
    const seen = [];
    render(<Scrolly id="b" steps={steps} graphic={(i, r, ctx) => (seen.push(ctx), null)} label="L" />);
    expect(seen[0]).toMatchObject({ inline: false, once: false, prev: null });
    expect(typeof seen[0].entered).toBe('boolean');
  });
  it('has no step counter or dots; a scrolly-go event goes to a card', () => {
    const { container } = render(<Scrolly id="b" steps={steps} graphic={() => null} label="L" />);
    expect(container.querySelector('.scrolly-dots')).toBeNull();
    expect(container.textContent).not.toMatch(/\d of \d/);
    window.scrollTo = () => {};
    expect(() => container.querySelector('#b').dispatchEvent(new CustomEvent('scrolly-go', { detail: 1 }))).not.toThrow();
  });
  it('renders the scene sub-header, makes step titles h4, and prints the foot once', () => {
    const { container } = render(<Scrolly id="b" sub={{ title: 'Output', icon: 'gdp' }} foot={<span className="f">Source: ONS</span>} steps={steps} graphic={() => null} label="L" />);
    const h = container.querySelector('header.scene-head');
    expect(h.dataset.scene).toBe('Output');
    expect(h.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('#b').classList.contains('has-sub')).toBe(true);
    expect(container.querySelector('h4.scrolly-title')).not.toBeNull();
    expect(container.querySelectorAll('.f')).toHaveLength(1);
  });
  it('a card is one sentence and one icon: no kicker, no visible title', () => {
    const { container } = render(<Scrolly id="b" steps={steps} graphic={() => null} label="L" />);
    expect(container.querySelector('.scrolly-kicker')).toBeNull();
    const card = container.querySelector('#s-a .scrolly-card');
    expect(card.querySelectorAll('svg')).toHaveLength(1);
    expect(card.querySelector('.scrolly-card-icon')).not.toBeNull();
  });
  it('a single card is a plain block without dots', () => {
    const { container } = render(<Scrolly id="b" steps={[steps[0], steps[2]]} graphic={() => null} label="L" />);
    expect(container.querySelector('#b').classList.contains('is-single')).toBe(true);
    expect(container.querySelector('.scrolly-dots')).toBeNull();
  });
});

describe('TileField', () => {
  const tiles = (s) => [
    { key: 'a', x: 0, y: 0, color: 'red', group: 'g1' },
    { key: 'b', x: s, y: 1, color: 'red', group: 'g1' },
    { key: 'c', x: 5, y: 0, color: 'blue', group: 'g2' },
    ...(s ? [{ key: 'd', x: 6, y: 0, color: 'blue', group: 'g2', enter: 'drop' }] : []),
  ];
  it('staggers by group then row, at most 450ms, own delay wins', () => {
    expect(tileDelays(tiles(0))).toEqual([0, 225, 450]);
    expect(tileDelays([{ key: 'x', x: 0, y: 0, delay: 90 }])).toEqual([90]);
    expect(tileSettleMs(tiles(0))).toBe(1200);
  });
  it('keeps every tile, moves by transform, drops in only tiles new to the state', () => {
    const { container, rerender } = render(<TileField tiles={tiles(0)} width={8} height={2} label="t" />);
    expect(container.querySelector('svg.tile-grid.tile-field')).not.toBeNull();
    expect(container.querySelectorAll('.tile')).toHaveLength(3);
    expect(container.querySelector('.is-drop')).toBeNull();
    rerender(<TileField tiles={tiles(3)} width={8} height={2} label="t" />);
    const r = container.querySelectorAll('.tile');
    expect(r).toHaveLength(4);
    expect(r[1].style.transform).toBe('translate(51px, 17px)');
    expect([...container.querySelectorAll('.is-drop')].length).toBe(1);
  });
  it('TileGrid keeps its wave-1 timing', () => {
    const { container } = render(<TileGrid tiles={[{ key: 'a', x: 0, y: 0, color: 'red', delay: 12 }]} width={1} height={1} label="t" />);
    expect(container.querySelector('svg').getAttribute('class')).toBe('tile-grid');
    expect(container.querySelector('.tile').style.transitionDelay).toBe('12ms');
  });
});

describe('useEnterState', () => {
  it('shows the before state until entered, then moves after the hold', () => {
    let out;
    function F({ entered }) {
      out = useEnterState(0, 2, entered, 400);
      return null;
    }
    const { rerender } = render(<F entered={false} />);
    expect(out).toBe(0);
    rerender(<F entered />);
    expect(out).toBe(0);
    return new Promise((done) =>
      setTimeout(() => {
        act(() => {});
        expect(out).toBe(2);
        done();
      }, 450),
    );
  });
});

describe('Scrolly topic opener (sub.question, sub.takeaway)', () => {
  const sub = { title: 'Output', icon: 'gdp', question: 'How fast has the UK grown?', takeaway: 'Growth slowed after 2008.' };
  it('prints the question in the header (one icon: the title\'s) and the takeaway as the one closing line', () => {
    const { container } = render(<Scrolly id="b" sub={sub} steps={steps} graphic={() => null} label="L" />);
    const h = container.querySelector('header.scene-head');
    expect(h.dataset.scene).toBe('Output');
    expect(h.querySelector('.scene-head-q').textContent).toBe('How fast has the UK grown?');
    expect(h.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('.scrolly-takeaway')).toBeNull();
    const c = container.querySelectorAll('.scrolly-close');
    expect(c).toHaveLength(1);
    expect(c[0].textContent).toBe('Growth slowed after 2008.');
    expect(c[0].querySelectorAll('svg')).toHaveLength(1);
  });
  it('an answer wins over a takeaway: still one closing line, no "Answer" label, no repeated question', () => {
    const { container } = render(<Scrolly id="b" sub={{ ...sub, answer: 'About 1.5% a year' }} steps={steps} graphic={() => null} label="L" />);
    const c = container.querySelectorAll('.scrolly-close');
    expect(c).toHaveLength(1);
    expect(c[0].textContent).toBe('About 1.5% a year');
    expect(container.querySelector('.scrolly-answer-q, .scrolly-answer-label')).toBeNull();
  });
  it('without layout (jsdom: the frame has no height) the question frame is done at once and ctx.entered is true', () => {
    const seen = [];
    const { container } = render(<Scrolly id="b" sub={sub} steps={steps} graphic={(i, r, ctx) => (seen.push(ctx.entered), null)} label="L" />);
    // done: the frame is hidden (it stays mounted to come back on scroll up), the chart is drawn
    expect(container.querySelector('.q-frame').classList.contains('is-done')).toBe(true);
    expect(container.querySelector('.q-stage')).toBeNull();
    expect(seen.at(-1)).toBe(true);
  });
  const withLayout = (fn, rectFor) => {
    const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const gb = Element.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });
    Element.prototype.getBoundingClientRect = function () {
      return rectFor(this) ?? gb.call(this);
    };
    try {
      fn();
    } finally {
      if (oh) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', oh);
      else delete HTMLElement.prototype.offsetHeight;
      Element.prototype.getBoundingClientRect = gb;
    }
  };
  const below = (el) => (el.classList?.contains('q-frame') || el.classList?.contains('q-stage') ? { top: 3000, bottom: 3400, left: 0, right: 0, width: 0, height: 400 } : null);
  it('default: the question plays inside the figure frame (aria-hidden, inert, data-axis, data-gap-exempt) and holds entry moves back', () => {
    withLayout(() => {
      const seen = [];
      const { container } = render(
        <section className="story-part" data-part="2">
          <Scrolly id="b" sub={{ ...sub, hint: 'Watch the gap open', key: 'grown' }} steps={steps} graphic={(i, r, ctx) => (seen.push(ctx.entered), null)} label="L" />
        </section>,
      );
      const q = container.querySelector('.scrolly-graphic-inner > .q-frame');
      expect(q).not.toBeNull();
      expect(q.getAttribute('aria-hidden')).toBe('true');
      expect(q.hasAttribute('inert')).toBe(true);
      expect(q.hasAttribute('data-axis')).toBe(true);
      expect(q.hasAttribute('data-gap-exempt')).toBe(true);
      expect(q.querySelectorAll('.q-stage-w')).toHaveLength(6);
      expect(q.querySelector('.q-stage-w.is-key').textContent.trim()).toBe('grown?');
      expect(q.querySelector('.q-stage-hint').textContent).toBe('Watch the gap open');
      // question and hint only: no numeral, no progress ring
      expect(q.querySelector('.q-stage-progress, .q-stage-numeral, .q-stage-ring')).toBeNull();
      expect(q.querySelectorAll('svg')).toHaveLength(1);
      // no pinned screen, no added row
      expect(container.querySelector('.q-stage')).toBeNull();
      expect(container.querySelector('.scrolly').classList.contains('has-stage')).toBe(false);
      expect(container.querySelector('header.scene-head').id).toBe('q-b');
      expect(seen.every((e) => e === false)).toBe(true);
      // review #3: while the big question waits in the frame, the block is
      // .is-asking (story.css holds the header's copy and the step text)
      expect(container.querySelector('.scrolly').classList.contains('is-asking')).toBe(true);
      // the header still prints the question (opacity only, never removed)
      expect(container.querySelector('.scene-head-q').textContent).toBe('How fast has the UK grown?');
    }, below);
  });
  it('review #3: not asking once the question is done, or without a question', () => {
    const { container } = render(<Scrolly id="b" sub={sub} steps={steps} graphic={() => null} label="L" />);
    // jsdom: no layout, the frame is done at once
    expect(container.querySelector('.scrolly').classList.contains('is-asking')).toBe(false);
    cleanup();
    const plain = render(<Scrolly id="c" sub="Plain" steps={steps} graphic={() => null} label="L" />);
    expect(plain.container.querySelector('.scrolly').classList.contains('is-asking')).toBe(false);
  });
  it("pin: 'full' renders the pinned screen, question and hint only (a recap is not drawn); the question copy is aria-hidden", () => {
    withLayout(() => {
      const recap = [{ icon: 'gdp', q: 'How fast has the UK grown?', a: 'About 1.5% a year', to: 'q-p1-output' }];
      const { container } = render(
        <section className="story-part" data-part="2">
          <Scrolly id="b" sub={{ ...sub, pin: 'full', recap }} steps={steps} graphic={() => null} label="L" />
        </section>,
      );
      const st = container.querySelector('.scrolly > .q-stage');
      expect(st).not.toBeNull();
      expect(st.hasAttribute('data-gap-exempt')).toBe(true);
      expect(st.querySelector('.q-visual').getAttribute('aria-hidden')).toBe('true');
      expect(st.querySelector('.q-visual').hasAttribute('data-axis')).toBe(true);
      expect(st.querySelector('.story-recap, a')).toBeNull();
      expect(container.querySelector('.scrolly').classList.contains('has-stage')).toBe(true);
      expect(container.querySelector('.q-frame')).toBeNull();
    }, below);
  });
  it('prints the closing line after the last card; with answerTo it is data-axis, never a link', () => {
    const { container, rerender } = render(<Scrolly id="b" sub={{ ...sub, answer: 'About 1.5% a year' }} steps={steps} graphic={() => null} label="L" />);
    const li = container.querySelector('.scrolly-steps > .scrolly-answer');
    expect(li.previousElementSibling.id).toBe('s-c');
    expect(li.nextElementSibling.classList.contains('scrolly-end')).toBe(true);
    let a = li.querySelector('.scrolly-close');
    expect(a.hasAttribute('data-axis')).toBe(false);
    // jsdom: the last card is active, so the line is shown
    expect(a.classList.contains('is-shown')).toBe(true);
    rerender(<Scrolly id="b" sub={{ ...sub, answer: <>1.5%</>, answerTo: 'p1-output-s3' }} steps={steps} graphic={() => null} label="L" />);
    a = container.querySelector('.scrolly-close');
    expect(a.hasAttribute('data-axis')).toBe(true);
    expect(a.querySelector('a')).toBeNull();
  });
  it('a plain string sub has no opener and no takeaway', () => {
    const { container } = render(<Scrolly id="b" sub="Output" steps={steps} graphic={() => null} label="L" />);
    expect(container.querySelector('.q-stage, .scene-head-q, .scrolly-close')).toBeNull();
  });
});

describe('TopicHead (a topic that is not a Scrolly)', () => {
  it('renders the header with its q- anchor and the answer (a stage only with pin full)', async () => {
    const { TopicHead } = await import('./QStage.jsx');
    const { container } = render(<TopicHead id="p3-close" titleId="p3-close-h" sub={{ title: 'Limits', icon: 'gdp', question: 'What does the study leave out?', answer: 'Firms and prices' }} />);
    expect(container.querySelector('.q-stage')).toBeNull();
    const h = container.querySelector('header.scene-head');
    expect(h.id).toBe('q-p3-close');
    expect(h.dataset.scene).toBe('Limits');
    expect(h.querySelector('h3').id).toBe('p3-close-h');
    expect(container.querySelector('.scrolly-close.is-shown .scrolly-close-text').textContent).toBe('Firms and prices');
  });
});

describe('the question follows the scroll both ways (round 1)', async () => {
  const { framePhase, stagePhase, nextSkip } = await import('./QStage.jsx');
  const V = 800;
  const y1 = 140;
  const y0 = Math.max(y1 + 120, V * 0.55);
  // the frame's top as the reader scrolls down, back up, and down again
  const run = (tops) => {
    let skip = false;
    let last = null;
    return tops.map((top, i) => {
      const dy = last == null ? 0 : last - top; // scrolling down moves the frame up
      last = top;
      skip = nextSkip({ skip, jumped: i === 0, past: top < y0, before: top >= y0, up: dy < 0 });
      return skip ? 'done' : framePhase({ top, V, y0, y1 }).phase;
    });
  };
  const down = [900, 760, 700, 560, 420, 300, 200, 140];
  it('down: wait, in, reveal, done', () => {
    const p = run(down);
    expect(p[0]).toBe('wait');
    expect(p).toContain('in');
    expect(p).toContain('reveal');
    expect(p.at(-1)).toBe('done');
  });
  it('back up re-expands the question; down again replays arrive, hold, shrink', () => {
    const up = [...down].reverse().slice(1);
    const p = run([...down, ...up, ...down.slice(1)]);
    const n = down.length;
    const back = p.slice(n, n + up.length);
    expect(back).toContain('reveal');
    expect(back).toContain('in');
    expect(back.at(-1)).toBe('wait');
    const again = p.slice(n + up.length);
    expect(again).toContain('in');
    expect(again).toContain('reveal');
    expect(again.at(-1)).toBe('done');
  });
  it('a jump that lands past the start shows the drawn chart; scrolling up by hand brings the question back', () => {
    let skip = nextSkip({ skip: false, jumped: true, past: true, before: false, up: false });
    expect(skip).toBe(true);
    skip = nextSkip({ skip, jumped: false, past: true, before: false, up: false });
    expect(skip).toBe(true);
    skip = nextSkip({ skip, jumped: false, past: true, before: false, up: true });
    expect(skip).toBe(false);
    expect(framePhase({ top: 190, V, y0, y1 }).phase).toBe('reveal');
    // the chart is not drawn while the backdrop is still opaque
    expect(framePhase({ top: 260, V, y0, y1 }).phase).toBe('in');
  });
  it('the pinned stage: arriving, then done once its foot passes the middle, and back', () => {
    const at = (top) => stagePhase({ top, bottom: top + 360, V, R: 100, H: 160 }).phase;
    expect(at(900)).toBe('wait');
    expect(at(300)).toBe('in');
    expect(at(-200)).toBe('done');
    expect(at(300)).toBe('in');
  });
});

describe('reversible entry (motion.js entryStep, round 1)', async () => {
  const { entryStep } = await import('./motion.js');
  const V = 800;
  const at = (s, top, jumped = false) => entryStep(s, { top, bottom: top + 400, V, jumped });
  it('enters on the way down, resets only when scrolled back above (wholly below the screen), replays', () => {
    let s = { entered: false, instant: false, run: 0 };
    s = at(s, 900);
    expect(s.entered).toBe(false);
    s = at(s, 600);
    expect(s).toEqual({ entered: true, instant: false, run: 1 });
    // past the top: still entered (coming back up shows the final state)
    s = at(s, -900);
    expect(s.entered).toBe(true);
    s = at(s, 700);
    expect(s.entered).toBe(true);
    s = at(s, 820);
    expect(s.entered).toBe(false);
    s = at(s, 500);
    expect(s).toEqual({ entered: true, instant: false, run: 2 });
  });
  it('a jump or a link lands on the final state (instant)', () => {
    const s = at({ entered: false, instant: false, run: 0 }, 200, true);
    expect(s.instant).toBe(true);
  });
});
