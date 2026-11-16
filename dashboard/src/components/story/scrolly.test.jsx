// Scrolly (wave 2 API): step dots as buttons, the scene sub-header, the
// foot, zero-height spacers, the ctx argument, and the old call shape.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
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
    expect(container.querySelector('h3.scrolly-title')).not.toBeNull();
    expect(container.querySelector('.scene-head')).toBeNull();
  });
  it('passes ctx as the third argument', () => {
    const seen = [];
    render(<Scrolly id="b" steps={steps} graphic={(i, r, ctx) => (seen.push(ctx), null)} label="L" />);
    expect(seen[0]).toMatchObject({ inline: false, once: false, prev: null });
    expect(typeof seen[0].entered).toBe('boolean');
  });
  it('step dots are buttons, one per card, labelled, with aria-current; n of m is data-axis', () => {
    const { container } = render(<Scrolly id="b" steps={steps} graphic={() => null} label="L" />);
    const dots = [...container.querySelectorAll('.scrolly-dots button')];
    expect(dots).toHaveLength(3);
    expect(dots[0].getAttribute('aria-label')).toBe('Step 1 of 3: First');
    // jsdom: the last card is active (no layout)
    expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual([null, null, 'step']);
    expect(dots.map((d) => d.tabIndex)).toEqual([-1, -1, 0]);
    expect(container.querySelector('.scrolly-dots').hasAttribute('data-axis')).toBe(true);
    expect(container.querySelector('.scrolly-dots-n').getAttribute('aria-hidden')).toBe('true');
    window.scrollTo = () => {};
    fireEvent.keyDown(dots[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dots[1]);
    fireEvent.keyDown(dots[1], { key: 'End' });
    expect(document.activeElement).toBe(dots[2]);
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
  it('leads a kicker with the step icon', () => {
    const { container } = render(<Scrolly id="b" steps={steps} graphic={() => null} label="L" />);
    const k = container.querySelector('.scrolly-kicker');
    expect(k.querySelector('svg')).not.toBeNull();
    expect(k.textContent).toBe('One');
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
  it('prints the question in the header and the takeaway after the block', () => {
    const { container } = render(<Scrolly id="b" sub={sub} steps={steps} graphic={() => null} label="L" />);
    const h = container.querySelector('header.scene-head');
    expect(h.dataset.scene).toBe('Output');
    expect(h.querySelector('.scene-head-q').textContent).toBe('How fast has the UK grown?');
    expect(h.querySelector('.scene-head-q svg')).not.toBeNull();
    const t = container.querySelectorAll('.scrolly-takeaway');
    expect(t).toHaveLength(1);
    expect(t[0].closest('li')).toBeNull();
    expect(t[0].previousElementSibling.classList.contains('scrolly-steps')).toBe(true);
    expect(t[0].textContent).toBe('Key takeaway: Growth slowed after 2008.');
    expect(t[0].querySelector('svg')).not.toBeNull();
  });
  it('without layout (jsdom: the frame has no height) the question frame is done at once and ctx.entered is true', () => {
    const seen = [];
    const { container } = render(<Scrolly id="b" sub={sub} steps={steps} graphic={(i, r, ctx) => (seen.push(ctx.entered), null)} label="L" />);
    // done: the frame unmounts, the chart is drawn
    expect(container.querySelector('.q-frame')).toBeNull();
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
      expect(q.querySelector('.q-stage-progress').textContent).toContain('Part 2');
      // no pinned screen, no added row
      expect(container.querySelector('.q-stage')).toBeNull();
      expect(container.querySelector('.scrolly').classList.contains('has-stage')).toBe(false);
      expect(container.querySelector('header.scene-head').id).toBe('q-b');
      expect(seen.every((e) => e === false)).toBe(true);
    }, below);
  });
  it("pin: 'full' renders the pinned screen with the recap as real links; the question copy is aria-hidden", () => {
    withLayout(() => {
      const recap = [{ icon: 'gdp', q: 'How fast has the UK grown?', a: 'About 1.5% a year', to: 'q-p1-output' }];
      const { container } = render(
        <section className="story-part" data-part="2">
          <Scrolly id="b" sub={{ ...sub, pin: 'full', recap }} steps={steps} graphic={() => null} label="L" />
        </section>,
      );
      const st = container.querySelector('.scrolly > .q-stage.has-recap');
      expect(st).not.toBeNull();
      expect(st.hasAttribute('data-gap-exempt')).toBe(true);
      expect(st.querySelector('.q-visual').getAttribute('aria-hidden')).toBe('true');
      expect(st.querySelector('.q-visual').hasAttribute('data-axis')).toBe(true);
      expect(st.querySelector('.story-recap-title').textContent).toBe('Part 1 in short');
      expect(st.querySelector('a.story-recap-chip').getAttribute('href')).toContain('#q-p1-output');
      expect(container.querySelector('.scrolly').classList.contains('has-stage')).toBe(true);
      expect(container.querySelector('.q-frame')).toBeNull();
    }, below);
  });
  it('prints the answer after the last card with the question replayed; with answerTo it links to the home and is data-axis', () => {
    const { container, rerender } = render(<Scrolly id="b" sub={{ ...sub, answer: 'About 1.5% a year' }} steps={steps} graphic={() => null} label="L" />);
    const li = container.querySelector('.scrolly-steps > .scrolly-answer');
    expect(li.previousElementSibling.id).toBe('s-c');
    expect(li.nextElementSibling.classList.contains('scrolly-end')).toBe(true);
    let a = li.querySelector('.scrolly-answer-a');
    expect(a.textContent).toBe('AnswerAbout 1.5% a year');
    expect(a.hasAttribute('data-axis')).toBe(false);
    const q = li.querySelector('.scrolly-answer-q');
    expect(q.textContent).toBe('How fast has the UK grown?');
    expect(q.getAttribute('aria-hidden')).toBe('true');
    // jsdom: the last card is active, so the answer is shown
    expect(li.querySelector('.scrolly-answer-card').classList.contains('is-shown')).toBe(true);
    rerender(<Scrolly id="b" sub={{ ...sub, answer: <>1.5%</>, answerTo: 'p1-output-s3' }} steps={steps} graphic={() => null} label="L" />);
    a = container.querySelector('.scrolly-answer-a');
    expect(a.hasAttribute('data-axis')).toBe(true);
    expect(a.querySelector('a').getAttribute('href')).toContain('#p1-output-s3');
  });
  it('a plain string sub has no opener and no takeaway', () => {
    const { container } = render(<Scrolly id="b" sub="Output" steps={steps} graphic={() => null} label="L" />);
    expect(container.querySelector('.q-stage, .scene-head-q, .scrolly-takeaway')).toBeNull();
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
    expect(container.querySelector('.scrolly-answer-card.is-shown .scrolly-answer-text').textContent).toBe('Firms and prices');
  });
});
