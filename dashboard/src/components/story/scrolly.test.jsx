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
