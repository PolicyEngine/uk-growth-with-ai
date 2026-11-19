// ChartHover (M4): nothing is mounted while inactive; a pointer over a mark,
// a tap or an arrow key shows its item; Escape and a tap outside clear it;
// each value carries its data path for check_hover.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import ChartHover from './ChartHover.jsx';

afterEach(cleanup);

const ITEMS = [
  { head: 'UK low', rows: [{ name: 'GDP', value: '+0.31%', path: 'results.uk_low.tfp.zk0.1.gaps.Y.2031' }] },
  { head: 'UK central', rows: [{ name: 'GDP', value: '+0.92%' }], kind: 'result' },
];
const draw = () =>
  render(
    <ChartHover label="Test chart" items={ITEMS}>
      <svg>
        <rect data-tip={0} width={10} height={10} />
        <rect data-tip={1} width={10} height={10} />
      </svg>
    </ChartHover>,
  );

describe('ChartHover', () => {
  it('mounts no card and no read-out while inactive', () => {
    const { container } = draw();
    expect(container.querySelector('.ch-tip')).toBeNull();
    expect(container.querySelector('[aria-live]').textContent).toBe('');
  });
  it('shows the item under the pointer, with its value and path', () => {
    const { container } = draw();
    fireEvent.pointerMove(container.querySelectorAll('rect')[0], { pointerType: 'mouse' });
    const tip = container.querySelector('.ch-tip');
    expect(tip.textContent).toContain('UK low');
    expect(tip.querySelector('[data-path]').getAttribute('data-path')).toBe('results.uk_low.tfp.zk0.1.gaps.Y.2031');
    expect(container.querySelector('[aria-live]').textContent).toBe('UK low, GDP +0.31%');
  });
  it('moves with the arrow keys and clears with Escape', () => {
    const { container } = draw();
    const host = container.querySelector('.ch-hover');
    expect(host.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(host, { key: 'ArrowRight' });
    expect(container.querySelector('.ch-tip').textContent).toContain('UK low');
    fireEvent.keyDown(host, { key: 'ArrowRight' });
    expect(container.querySelector('.ch-tip').textContent).toContain('OG-UK result');
    fireEvent.keyDown(host, { key: 'Escape' });
    expect(container.querySelector('.ch-tip')).toBeNull();
  });
  it('pins on a tap and closes on a tap outside', () => {
    const { container } = draw();
    fireEvent.pointerDown(container.querySelectorAll('rect')[1], { pointerType: 'touch' });
    expect(container.querySelector('.ch-tip').textContent).toContain('UK central');
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(container.querySelector('.ch-tip')).toBeNull();
  });
});

describe('ChartTipCard text', () => {
  it('keeps a space between each name and value and between the lines (no joined words)', async () => {
    const { ChartTipCard } = await import('./ChartHover.jsx');
    const { container } = render(<ChartTipCard head="UK low, 2030" rows={[{ name: 'Labour-share fall by 2030', value: '0.7pp' }, { name: 'GDP gap', value: '+0.41%' }]} unit="OG-UK works it out." />);
    const t = container.textContent.replace(/\s+/g, ' ').trim();
    expect(t).toBe('UK low, 2030 Labour-share fall by 2030 0.7pp GDP gap +0.41% OG-UK works it out.');
  });
});
