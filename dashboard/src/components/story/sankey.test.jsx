// The shared Sankey: every node's inflow equals its outflow in a
// well-formed graph, and the component draws one ribbon per link.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Sankey, { imbalances } from './Sankey.jsx';

afterEach(cleanup);

const g = (k) => ({
  nodes: [
    { id: 'a', label: 'A', color: '#333' },
    { id: 'b', label: 'B', sub: '1', color: '#666' },
    { id: 'c', label: 'C', color: '#999' },
    { id: 'd', label: 'D', color: '#999' },
  ],
  links: [
    { source: 'a', target: 'b', value: 6 + k },
    { source: 'a', target: 'c', value: 4 - k },
    { source: 'b', target: 'd', value: 6 + k },
  ],
});

describe('Sankey', () => {
  it('finds a node whose inflow and outflow differ', () => {
    expect(imbalances(g(0))).toEqual([]);
    const bad = g(0);
    bad.links[2].value = 5;
    expect(imbalances(bad)).toEqual([{ id: 'b', in: 6, out: 5 }]);
  });
  it('draws a ribbon per link and a labelled node per node, in every state', () => {
    for (const active of [0, 1]) {
      const { container, unmount } = render(<Sankey graphs={[g(0), g(2)]} active={active} label="test" />);
      expect(container.querySelectorAll('.sankey-link')).toHaveLength(3);
      expect(container.querySelectorAll('.sankey-node')).toHaveLength(4);
      expect(container.querySelector('svg').getAttribute('aria-label')).toBe('test');
      unmount();
    }
  });
  it('draws as before without the opt-in props', () => {
    const { container } = render(<Sankey graphs={[g(0)]} label="test" />);
    for (const l of container.querySelectorAll('.sankey-link')) {
      expect(l.getAttribute('class')).toBe('sankey-link');
      expect(l.style.opacity).toBe('0.38');
    }
    for (const n of container.querySelectorAll('.sankey-node')) expect(n.getAttribute('class')).toBe('sankey-node');
  });
  it('reveals columns, keeps hidden parts in the DOM, and highlights a target', () => {
    const { container } = render(<Sankey graphs={[g(0)]} label="test" reveal={1} highlight="d" linkOpacity={0.7} />);
    const links = [...container.querySelectorAll('.sankey-link')];
    expect(links.map((l) => l.classList.contains('is-on'))).toEqual([true, true, false]);
    expect(links.map((l) => l.classList.contains('is-hl'))).toEqual([false, false, true]);
    expect(links[0].style.opacity).toBe('0.7');
    const hidden = [...container.querySelectorAll('.sankey-node.is-hidden')].map((n) => n.dataset.node);
    expect(hidden).toEqual(['d']);
    expect(container.querySelectorAll('.sankey-node')).toHaveLength(4);
  });
});
