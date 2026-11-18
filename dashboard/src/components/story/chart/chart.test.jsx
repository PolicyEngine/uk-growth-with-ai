// The shared chart primitives (wave 2): pure helpers and what each
// component puts in the DOM. No demo pages: each primitive on its own.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import SourceLine from '@/components/ui/SourceLine.jsx';
import { studyLabel } from './ModelBadge.jsx';
import {
  Axis, Band, Bars, EndLabels, Frame, Grid, Line, ModelBadge, View,
  affine, barDelay, barPath, crowded, fmtTick, linear, linePath, nearestIndex, niceDomain, niceTicks, placeLabels, tickStep, useChartBox, viewFor, yearTicks,
} from './index.js';

afterEach(cleanup);
const svg = (el) => render(<svg>{el}</svg>).container;

describe('scale', () => {
  it('maps and inverts linearly', () => {
    const x = linear([2010, 2030], [0, 200]);
    expect(x(2020)).toBe(100);
    expect(x.invert(50)).toBe(2015);
    expect(x.domain).toEqual([2010, 2030]);
  });
  it('gives three to five round ticks, no float noise', () => {
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(-0.3, 0.9)).toEqual([0, 0.5]);
    expect(niceTicks(0.1, 0.7)).toEqual([0.2, 0.4, 0.6]);
    for (const [lo, hi] of [[0, 7], [-2.3, 4.1], [60, 80], [0.001, 0.009]]) {
      const t = niceTicks(lo, hi);
      expect(t.length).toBeGreaterThanOrEqual(2);
      expect(t.length).toBeLessThanOrEqual(5);
      for (const v of t) expect(String(v)).not.toMatch(/000000/);
    }
    expect(tickStep(0, 10, 4)).toBe(2.5);
    expect(niceDomain(0.3, 9.2)).toEqual([0, 10]);
  });
  it('formats ticks with U+2212 and the step\'s decimals', () => {
    expect(fmtTick(-0.5, 0.25)).toBe('−0.50');
    expect(fmtTick(0, 0.5)).toBe('0');
    expect(fmtTick(2, 1)).toBe('2');
  });
  it('labels years first and last, at most five', () => {
    expect(yearTicks(2010, 2031)).toEqual([2010, 2015, 2020, 2025, 2031]);
    expect(yearTicks(2028, 2031)).toEqual([2028, 2029, 2030, 2031]);
    for (const [a, b] of [[1950, 2010], [2000, 2023], [2019, 2031]]) {
      const t = yearTicks(a, b);
      expect(t[0]).toBe(a);
      expect(t[t.length - 1]).toBe(b);
      expect(t.length).toBeLessThanOrEqual(5);
    }
  });
  it('finds the nearest data x', () => {
    expect(nearestIndex([2010, 2011, 2015], 2013.4)).toBe(2);
    expect(nearestIndex([2010, 2011, 2015], 2012)).toBe(1);
  });
});

describe('useChartBox', () => {
  it('falls back before measuring, height from aspect, clamped', () => {
    const { result } = renderHook(() => useChartBox({ width: 400, aspect: 0.25, minHeight: 120 }));
    expect(result.current.width).toBe(400);
    expect(result.current.height).toBe(120);
    expect(result.current.ready).toBe(false);
  });
});

describe('ModelBadge and Frame', () => {
  it('names the model as plain text, no icon (round 1)', () => {
    const { container } = render(<ModelBadge model="aistudy" />);
    expect(container.textContent).toBe(studyLabel());
    expect(studyLabel({ model_year_label: 'FY 2027–28', status: 'merged', provisional: false })).toBe('uk-ai-study · FY 2027–28');
    expect(studyLabel({ provisional: true })).toBe('uk-ai-study · provisional');
    expect(container.querySelector('svg')).toBeNull();
  });
  it('yTitle and xTitle render as plain lines marked data-axis-title', () => {
    const { container } = render(
      <Frame title="GDP" yTitle="Gap against the OBR baseline, % of GDP" xTitle="Year">
        <svg />
      </Frame>,
    );
    const yT = container.querySelector('p[data-axis-title="y"]');
    expect(yT.textContent).toBe('Gap against the OBR baseline, % of GDP');
    expect(yT.querySelector('svg')).toBeNull();
    expect(container.querySelector('p[data-axis-title="x"]').textContent).toBe('Year');
    expect(yT.compareDocumentPosition(container.querySelector('.ch-plot')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('the title carries the figure\'s one icon and its "Sources and notes" button; unit none; reserves are hidden copies', () => {
    const { container } = render(
      <Frame model="oguk" title="GDP" titleReserve="GDP against the path" unit="% gap" legend={[{ key: 'a', label: 'UK central', color: 'red' }]} source={<SourceLine items={[{ label: 'OG-UK', url: 'https://example.org' }]} />} essential="Not a forecast." sources={<p>Series ids</p>}>
        <svg />
      </Frame>,
    );
    expect(container.querySelector('p.ch-title svg')).not.toBeNull();
    for (const p of container.querySelectorAll('p.ch-unit, p.ch-source')) expect(p.querySelector('svg')).toBeNull();
    expect(container.querySelector('.ch-legend li .ch-swatch')).not.toBeNull();
    const ghost = container.querySelector('.ch-ghost');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.hasAttribute('data-axis')).toBe(true);
    expect(container.querySelector('p.ch-title button.src-line-btn').getAttribute('aria-label')).toBe('Sources and notes');
    expect(container.querySelector('.ch-foot .src-essential').textContent).toBe('Not a forecast.');
    expect(container.querySelector('details.ch-sources [data-reference]').textContent).toBe('Series ids');
    expect(container.querySelector('[data-model="oguk"]')).not.toBeNull();
  });
});

describe('Axis, Grid, Band', () => {
  const y = linear([-1, 2], [200, 0]);
  it('ticks are data-axis text moved by transform, no lines', () => {
    const c = svg(<Axis side="left" scale={y} ticks={[-1, 0, 1, 2]} at={40} />);
    const t = [...c.querySelectorAll('text.ch-tick')];
    expect(t.map((e) => e.textContent)).toEqual(['−1', '0', '1', '2']);
    expect(t.every((e) => e.hasAttribute('data-axis'))).toBe(true);
    expect(c.querySelector('line')).toBeNull();
    expect(c.querySelector('.ch-tick-g').style.transform).toBe('translate(0px, 200px)');
  });
  it('axis titles carry data-axis-title (y on left/right, x on bottom)', () => {
    let c = svg(<Axis side="left" scale={y} ticks={[-1, 0, 1, 2]} at={40} title="Percentage points" />);
    const t = c.querySelector('[data-axis-title="y"]');
    expect(t.textContent).toBe('Percentage points');
    expect(t.hasAttribute('data-axis')).toBe(true);
    expect(t.getAttribute('y')).toBe('12');
    cleanup();
    c = svg(<Axis side="bottom" scale={linear([2010, 2030], [0, 200])} ticks={[2010, 2030]} at={200} title="Year" format={String} />);
    expect(c.querySelector('[data-axis-title="x"]').getAttribute('x')).toBe('100');
    expect(c.querySelector('[data-axis-title="y"]')).toBeNull();
    cleanup();
    c = svg(<Axis side="left" scale={y} ticks={[0, 1]} at={40} />);
    expect(c.querySelector('[data-axis-title]')).toBeNull();
  });
  it('dotted grid and a zero line only when zero is in the domain', () => {
    let c = svg(<Grid scale={y} ticks={[-1, 0, 1, 2]} x0={0} x1={100} />);
    expect(c.querySelectorAll('.ch-grid-line')).toHaveLength(3);
    expect(c.querySelectorAll('.ch-zero')).toHaveLength(1);
    cleanup();
    c = svg(<Grid scale={linear([60, 80], [200, 0])} ticks={[60, 70, 80]} x0={0} x1={100} />);
    expect(c.querySelectorAll('.ch-zero')).toHaveLength(0);
    expect(c.querySelectorAll('.ch-grid-line')).toHaveLength(3);
  });
  it('a band spans its period and labels it inside', () => {
    const x = linear([2020, 2032], [0, 120]);
    const c = svg(<Band x={x} from={2028} to={2031} top={10} bottom={110} kind="shock" label="Extra AI" />);
    const r = c.querySelector('rect');
    expect([r.getAttribute('x'), r.getAttribute('width'), r.getAttribute('height')]).toEqual(['80', '30', '100']);
    expect(c.querySelector('.ch-band.is-shock text').textContent).toBe('Extra AI');
  });
});

describe('Line', () => {
  const x = linear([0, 3], [0, 300]);
  it('straight by default, breaks at gaps, monotone on request', () => {
    const y = linear([0, 3], [300, 0]);
    expect(linePath(x, y, [0, 1, 2, 3], [0, 1, NaN, 3])).toBe('M0,300L100,200M300,0');
    expect(linePath(x, y, [0, 1, 2], [0, 1, 0], 'monotone')).toMatch(/^M0,300C/);
  });
  it('draws with an end dot; the gradient only when zero is on the axis', () => {
    let c = svg(<Line x={x} y={linear([-1, 3], [300, 0])} xs={[0, 1, 2]} ys={[0, 1, 2]} gradient on />);
    expect(c.querySelector('path.ch-line.is-on').getAttribute('pathLength')).toBe('1');
    expect(c.querySelector('circle.ch-end')).not.toBeNull();
    expect(c.querySelector('.ch-area')).not.toBeNull();
    cleanup();
    c = svg(<Line x={x} y={linear([60, 80], [300, 0])} xs={[0, 1, 2]} ys={[70, 72, 75]} gradient />);
    expect(c.querySelector('.ch-area')).toBeNull();
  });
});

describe('Bars', () => {
  it('rounds the free end only, 1px when thin', () => {
    const up = barPath({ pos: 0, size: 10, from: 100, to: 40 });
    expect(up.startsWith('M0,100L0,42Q0,40 2,40')).toBe(true);
    const thin = barPath({ pos: 0, size: 4, from: 0, to: 50 }, true);
    expect(thin).toContain('Q50,0 50,1');
  });
  it('staggers 20ms, at most 400ms in all', () => {
    expect(barDelay(3, 5)).toBe(60);
    expect(barDelay(39, 40)).toBeLessThanOrEqual(400);
  });
  it('grows from the baseline side', () => {
    const c = svg(<Bars bars={[{ key: 'a', pos: 0, size: 10, from: 100, to: 40, color: 'red' }, { key: 'b', pos: 20, size: 10, from: 100, to: 140, color: 'blue' }]} />);
    const b = [...c.querySelectorAll('.ch-bar')];
    expect(b.map((e) => e.style.transformOrigin)).toEqual(['50% 100%', '50% 0%']);
  });
});

describe('EndLabels', () => {
  it('pushes overlapping labels apart and keeps them inside', () => {
    const p = placeLabels([{ key: 'a', y: 50, lines: ['A'] }, { key: 'b', y: 52, lines: ['B'] }, { key: 'c', y: 200, lines: ['C'] }], { top: 0, bottom: 205 });
    expect(p[1].t - p[0].t).toBeGreaterThanOrEqual(16);
    expect(p[2].t + p[2].h).toBeLessThanOrEqual(205);
    expect(crowded([50, 52, 200])).toBe(true);
    expect(crowded([50, 80])).toBe(false);
  });
  it('renders each label once', () => {
    const c = svg(<EndLabels x={300} top={0} bottom={200} items={[{ key: 'a', y: 50, lines: ['UK', 'central'], color: 'red' }]} />);
    expect(c.querySelectorAll('text.ch-label')).toHaveLength(1);
    expect(c.textContent).toBe('UKcentral');
  });
});

describe('View', () => {
  it('maps marks drawn at one scale onto another', () => {
    const all = linear([2000, 2030], [0, 300]);
    const zoom = linear([2020, 2030], [0, 300]);
    const { a, b } = affine(all, zoom);
    expect(a * all(2025) + b).toBeCloseTo(zoom(2025));
    const v = viewFor(all, zoom, null, null);
    expect(v.sy).toBe(1);
    const c = svg(<View {...v}><path d="M0,0" /></View>);
    expect(c.querySelector('g.ch-view').style.transform).toMatch(/^matrix\(3, 0, 0, 1, -600, 0\)$/);
  });
});

describe('reduced motion hook-up', () => {
  it('no primitive needs a timer to show its final state', () => {
    vi.useFakeTimers();
    const c = svg(<Line x={linear([0, 1], [0, 1])} y={linear([0, 1], [1, 0])} xs={[0, 1]} ys={[0, 1]} />);
    act(() => {});
    expect(c.querySelector('.ch-line.is-on')).not.toBeNull();
    vi.useRealTimers();
  });
});

describe('Replay, Pause, IconGrid, CountUp', async () => {
  const { Replay, Pause } = await import('./index.js');
  const { IconGrid } = await import('../Items.jsx');
  const { default: CountUp } = await import('../CountUp.jsx');
  it('icon buttons are labelled and hidden under reduced motion by class', () => {
    const { container } = render(
      <>
        <Replay onClick={() => {}} />
        <Pause paused onClick={() => {}} />
      </>,
    );
    const b = [...container.querySelectorAll('button.ch-icon-btn.is-motion')];
    expect(b.map((x) => x.getAttribute('aria-label'))).toEqual(['Replay the animation', 'Play the flow']);
    expect(b[1].getAttribute('aria-pressed')).toBe('true');
  });
  it('icon grid: an icon, a name and a line per item', () => {
    const { container } = render(<IconGrid label="Left out" items={[{ icon: 'excluded', title: 'Firms', text: 'No response' }]} />);
    const li = container.querySelector('ul.icon-grid li');
    expect(li.querySelector('svg')).not.toBeNull();
    expect(li.textContent).toBe('FirmsNo response');
  });
  it('a count-up keeps the exact value in the DOM and never draws a partial value before it is seen', () => {
    const { container } = render(<CountUp value="+2.34pp" />);
    expect(container.querySelector('.visually-hidden').textContent).toBe('+2.34pp');
    expect(container.querySelector('.count-up-vis').dataset.final).toBe('+2.34pp');
  });
});

describe('Crosshair', async () => {
  const { Crosshair } = await import('./index.js');
  const { fireEvent } = await import('@testing-library/react');
  const x = linear([2020, 2023], [0, 300]);
  const y = linear([0, 2], [200, 0]);
  const el = (
    <Crosshair width={300} height={200} x={x} y={y} xs={[2020, 2021, 2022, 2023]} top={0} bottom={200} unit="% gap" label="GDP"
      series={[{ key: 'a', name: 'UK central', icon: 'gdp', color: 'red', ys: [0, 0.5, 1, 1.5], format: (v) => `${v.toFixed(1)}%` }]}>
      <path d="M0,0" />
    </Crosshair>
  );
  it('mounts nothing of the read-out while inactive', () => {
    const { container } = render(el);
    expect(container.querySelector('.ch-tip')).toBeNull();
    expect(container.querySelector('[aria-live]').textContent).toBe('');
    expect(container.querySelector('.ch-cross-line')).toBeNull();
  });
  it('keyboard: arrows read a point with year, icon and value; Home, End; Escape clears', () => {
    const { container } = render(el);
    const host = container.querySelector('.ch-cross');
    expect(host.tabIndex).toBe(0);
    fireEvent.keyDown(host, { key: 'ArrowLeft' });
    expect(container.querySelector('.ch-tip-head').textContent).toBe('2023');
    fireEvent.keyDown(host, { key: 'ArrowLeft' });
    expect(container.querySelector('[aria-live]').textContent).toBe('2022: UK central 1.0%');
    expect(container.querySelector('.ch-tip-row svg')).not.toBeNull();
    fireEvent.keyDown(host, { key: 'Home' });
    expect(container.querySelector('.ch-tip-value').textContent).toBe('0.0%');
    expect(container.querySelector('.ch-cross-line').getAttribute('x1')).toBe('0');
    fireEvent.keyDown(host, { key: 'Escape' });
    expect(container.querySelector('.ch-tip')).toBeNull();
    expect(container.querySelector('[aria-live]').textContent).toBe('');
  });
});
