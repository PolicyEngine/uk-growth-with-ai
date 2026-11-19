// The shared Sankey: every node's inflow equals its outflow in a
// well-formed graph, and the component draws one ribbon per link.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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

// Wave 2 (opt-in): shape, pour, flow, focus and tooltip, node boxes.
const part2 = {
  nodes: [
    { id: 'gdp', label: 'GDP', inner: '100', sub: '100', color: '#333' },
    { id: 'lab', label: 'Labour income', inner: '56.0', sub: '56.0', color: '#43c' },
    { id: 'cap', label: 'Gross capital income', inner: '44.0', sub: '44.0', color: '#543' },
    { id: 'dom', label: 'Kept in the UK', inner: '27.5', sub: '27.5', color: '#543' },
    { id: 'abr', label: 'Paid abroad', inner: '1.6', sub: '1.6', color: '#b98' },
    { id: 'dep', label: 'Depreciation', inner: '14.9', sub: '14.9', color: '#ddd' },
  ],
  links: [
    { source: 'gdp', target: 'lab', value: 56 },
    { source: 'gdp', target: 'cap', value: 44 },
    { source: 'cap', target: 'dom', value: 27.5 },
    { source: 'cap', target: 'abr', value: 1.6 },
    { source: 'cap', target: 'dep', value: 14.9 },
  ],
};

describe('Sankey, wave 2', () => {
  const draw = (props) => render(<Sankey graphs={[part2]} label="t" width={560} height={196} pad={24} rightRoom={118} {...props} />);
  it('a well-formed flow; widths by depth; a 1.6 ribbon is 1 to 3px wide', () => {
    expect(imbalances(part2)).toEqual([]);
    const { container } = draw({ nodeWidth: [44, 44, 44], inside: true });
    const w = [...container.querySelectorAll('.sankey-rect')].map((r) => Number(r.getAttribute('width')));
    expect(w.every((x) => x === 44)).toBe(true);
    const abr = container.querySelector('[data-node="abr"] .sankey-rect');
    const h = Number(abr.getAttribute('height'));
    expect(h).toBeGreaterThanOrEqual(1);
    expect(h).toBeLessThanOrEqual(3);
  });
  it('values inside nodes at least 18px tall, outside otherwise, each once', () => {
    const { container } = draw({ nodeWidth: [44, 44, 44], inside: true });
    for (const n of container.querySelectorAll('.sankey-node')) {
      const h = Number(n.querySelector('.sankey-rect').getAttribute('height'));
      const inner = n.querySelector('.sankey-value');
      const sub = n.querySelector('.sankey-sub');
      expect(!!inner).toBe(h >= 18);
      expect(!!sub).toBe(h < 18);
    }
    expect(container.querySelector('[data-node="abr"] .sankey-leader')).not.toBeNull();
  });
  it('pours with a single graph: nothing poured hides by class only; labels stay in the DOM', () => {
    const { container, rerender } = draw({ pour: 0 });
    expect(container.querySelectorAll('.sankey-link.is-pour.is-on')).toHaveLength(0);
    expect(container.querySelectorAll('.sankey-label')).toHaveLength(6);
    rerender(<Sankey graphs={[part2]} label="t" width={560} height={196} pad={24} rightRoom={118} pour={1} />);
    const on = [...container.querySelectorAll('.sankey-link')].map((l) => l.classList.contains('is-on'));
    expect(on).toEqual([true, true, false, false, false]);
    const d = [...container.querySelectorAll('.sankey-link')].slice(0, 2).map((l) => parseInt(l.style.getPropertyValue('--pour-delay'), 10));
    expect(d[1] - d[0]).toBe(90);
    expect(container.querySelector('[data-node="gdp"]').classList.contains('is-src')).toBe(true);
  });
  it('flow lanes follow ribbon width (about 7px apart)', () => {
    const { container } = draw({ flow: true });
    const lanes = container.querySelectorAll('.sankey-flow-lane');
    expect(lanes.length).toBeGreaterThan(5);
    expect(container.querySelectorAll('.sankey-flow-lane.is-thin').length).toBeGreaterThanOrEqual(1);
  });
  it('interactive: focus lights end to end, tooltip mounted only while active, Escape clears', () => {
    const seen = [];
    const { container } = draw({ interactive: true, onHover: (id) => seen.push(id), tooltip: ({ link, node }) => <span className="tt">{(link?.target ?? node).label}</span> });
    expect(container.querySelector('.tt')).toBeNull();
    const links = [...container.querySelectorAll('.sankey-link')];
    expect(links.every((l) => l.tabIndex === 0)).toBe(true);
    fireEvent.focus(links[3]);
    expect(container.querySelector('.tt').textContent).toBe('Paid abroad');
    expect(links.map((l) => l.classList.contains('is-hl'))).toEqual([false, true, false, true, false]);
    expect(seen).toEqual(['abr']);
    fireEvent.keyDown(container.querySelector('svg'), { key: 'Escape' });
    expect(container.querySelector('.tt')).toBeNull();
  });
  it('reports node boxes', () => {
    let got = null;
    draw({ onNodeBox: (b) => (got = b) });
    expect(Object.keys(got.nodes)).toEqual(['gdp', 'lab', 'cap', 'dom', 'abr', 'dep']);
    expect(got.width).toBeGreaterThan(0);
  });
});
