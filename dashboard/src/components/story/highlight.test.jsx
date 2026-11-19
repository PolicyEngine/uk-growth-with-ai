// One step, one highlight: step.highlight reaches the figure (ctx.highlight,
// useHighlight, data-hl/data-on on [data-mark]); Key, Fig and Num light
// their mark on hover and focus; the test helper finds steps without one.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import Scrolly from './Scrolly.jsx';
import { Fig, Key, MarkProvider, Num, NumMark, stepsWithoutHighlight, useHighlight } from './highlight.jsx';

afterEach(cleanup);

const MARKS = { a: { color: 'red', shape: 'square', label: 'Series A' }, b: { color: 'blue', shape: 'triangle', label: 'Series B' } };
function Fig2() {
  const lit = useHighlight();
  return (
    <svg data-lit={lit.join(' ')}>
      <rect data-mark="a" />
      <rect data-mark="b" />
      <NumMark n={1} x={5} y={5} mark="b" />
    </svg>
  );
}

describe('highlight', () => {
  const steps = [
    { id: 'h1', title: 'One', highlight: ['a'], body: <p>One</p> },
    { id: 'h2', title: 'Two', highlight: 'b', body: (
      <p>
        <Key id="a">A</Key> and <Fig path="x.y" mark="a">+1%</Fig> and <Num n={1} />
      </p>
    ) },
  ];
  it('passes the shown step ids to the figure and dims the rest', () => {
    const seen = [];
    const { container } = render(
      <MarkProvider marks={MARKS}>
        <Scrolly id="hl" steps={steps} graphic={(i, r, ctx) => (seen.push(ctx.highlight), <Fig2 />)} label="L" />
      </MarkProvider>,
    );
    // jsdom: the last step is shown
    expect(seen.at(-1)).toEqual(['b']);
    const g = container.querySelector('.scrolly-graphic-inner');
    expect(g.getAttribute('data-hl')).toBe('b');
    expect(g.querySelector('[data-mark="a"]').hasAttribute('data-on')).toBe(false);
    expect(g.querySelector('[data-mark="b"]').hasAttribute('data-on')).toBe(true);
    expect(g.querySelector('.hl-nummark').hasAttribute('data-on')).toBe(true);
    expect(container.querySelector('svg[data-lit]').dataset.lit).toBe('b');
    // aria description names the lit marks
    const d = container.querySelector('.scrolly-graphic').getAttribute('aria-describedby');
    expect(document.getElementById(d).textContent).toBe('Highlighted: Series B');
    // steps carry data-highlight
    expect([...container.querySelectorAll('.scrolly-step')].map((li) => li.dataset.highlight)).toEqual(['a', 'b']);
  });
  it('a Key, Fig or Num lights its mark on hover and focus, and a hovered mark marks its words', () => {
    const { container } = render(
      <MarkProvider marks={MARKS}>
        <Scrolly id="hl" steps={steps} graphic={() => <Fig2 />} label="L" />
      </MarkProvider>,
    );
    const g = container.querySelector('.scrolly-graphic-inner');
    const key = container.querySelector('.hl-key');
    expect(key.querySelector('.mark-shape rect')).not.toBeNull();
    expect(key.tabIndex).toBe(0);
    fireEvent.focus(key);
    expect(g.getAttribute('data-hl')).toBe('a');
    fireEvent.blur(key);
    expect(g.getAttribute('data-hl')).toBe('b');
    const fig = container.querySelector('.hl-fig');
    expect(fig.dataset.path).toBe('x.y');
    fireEvent.pointerEnter(fig);
    expect(g.querySelector('[data-mark="a"]').hasAttribute('data-on')).toBe(true);
    fireEvent.pointerLeave(fig);
    fireEvent.focus(container.querySelector('.hl-num'));
    expect(g.getAttribute('data-hl')).toBe('num-1');
    fireEvent.blur(container.querySelector('.hl-num'));
    fireEvent.pointerOver(g.querySelector('[data-mark="a"]'));
    expect(key.classList.contains('is-pointed')).toBe(true);
  });
  it('outside a Scrolly the pieces are plain (not focusable)', () => {
    const { container } = render(
      <p>
        <Key id="a" color="red">A</Key> <Fig path="p">1%</Fig>
      </p>,
    );
    expect(container.querySelector('.hl-key').hasAttribute('tabindex')).toBe(false);
    expect(container.querySelector('.hl-fig').dataset.path).toBe('p');
  });
  it('stepsWithoutHighlight lists cards with no highlight; highlight none needs a reason', () => {
    const { container } = render(
      <Scrolly
        id="hl"
        steps={[
          { id: 'x1', title: 'Has', highlight: ['a'], body: null },
          { id: 'x2', title: 'Missing', body: null },
          { id: 'x3', title: 'None, no reason', highlight: 'none', body: null },
          { id: 'x4', title: 'None, reason', highlight: 'none', highlightWhy: 'text only', body: null },
          { id: 'x5', spacer: true },
        ]}
        graphic={() => null}
        label="L"
      />,
    );
    expect(stepsWithoutHighlight(container)).toEqual(['x2', 'x3']);
  });
});

describe('MarkCallout (step.callout)', () => {
  it('renders the shown step sentence in the figure, aria-hidden and data-axis', () => {
    const { container } = render(
      <Scrolly
        id="co"
        steps={[
          { id: 'c1', title: 'One', highlight: ['a'], callout: 'A rises', body: null },
          { id: 'c2', title: 'Two', highlight: ['b'], callout: true, body: null },
        ]}
        graphic={() => <Fig2 />}
        label="L"
      />,
    );
    const c = container.querySelector('.scrolly-graphic-inner .mark-callout');
    expect(c.textContent).toBe('Two');
    expect(c.getAttribute('aria-hidden')).toBe('true');
    expect(c.hasAttribute('data-axis')).toBe(true);
  });
});
