// The Results tab prints what the data file holds, and every chart type's
// tooltip names the year or measure, the arm, the closure and the value with
// its unit. Rendered against a fixture with altered values.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

afterEach(cleanup);
import real from '@/data/surprise2028.json';

const fixture = JSON.parse(JSON.stringify(real));
const H = fixture.years.indexOf(fixture.headline_year);
const L = fixture.years.indexOf(fixture.late_year);
const base = fixture.results.uk_central.tfp['zk0.1'];
const tfpC = { status: 'done', label: 'fixture', gaps: Object.fromEntries(Object.keys(base.gaps).map((k) => [k, fixture.years.map(() => 0)])) };
tfpC.gaps.GNI[H] = 1.2345;
tfpC.gaps.Y[H] = 2.3456;
tfpC.gaps.debt_gdp_pp[L] = 7.7777;
tfpC.gaps.C[H] = 4.44;
fixture.results.uk_central.tfp['zk0.1'] = tfpC;
fixture.results.uk_central.tfp.zk0 = { status: 'pending' };

vi.doMock('@/data/surprise2028.json', () => ({ default: fixture }));

const { default: ResultsTab } = await import('@/tabs/ai/ResultsTab.jsx');
const { default: LineChart } = await import('@/components/LineChart.jsx');
const { default: MiniChart } = await import('@/components/ab/MiniChart.jsx');
const { path, CENTRAL } = await import('@/tabs/ai/surprise.js');

describe('Results follows the data file', () => {
  it('shows the altered values and pending bounds', () => {
    const at = (sub) => {
      const { container, unmount } = render(<ResultsTab sid="uk_central" sub={sub} onSub={() => {}} onTab={() => {}} onScenario={() => {}} />);
      const t = container.textContent;
      unmount();
      return t;
    };
    const overview = at('overview');
    expect(overview).toContain('+1.23%');
    expect(overview).toContain('+2.35%');
    expect(overview).toContain('closed capital pending');
    expect(at('variables')).toContain('+4.4%');
    expect(at('finances')).toContain('+7.78pp');
  });
});

describe('tooltips', () => {
  it('line chart: crosshair lists every series for the year, with unit and closure', () => {
    const values = path('uk_central', 'tfp', CENTRAL, 'GNI');
    const { container } = render(
      <LineChart
        x={[2027, 2028, 2029, 2030, 2031]}
        series={[{ key: 'a', label: 'Automation + productivity', closure: 'central closure', color: 'red', values }]}
        unit="%"
        tipTitle="GNI"
        valueFormat={(x) => x.toFixed(2)}
        ariaLabel="GNI"
      />,
    );
    const chart = container.querySelector('.linechart');
    fireEvent.focus(chart);
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('GNI, 2031');
    expect(tip.textContent).toContain('central closure');
    expect(tip.textContent).toContain('Automation + productivity');
    expect(tip.textContent).toContain('1.23%');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByRole('tooltip').textContent).toContain('2030');
  });

  it('small multiple: tooltip gives the year, closure and each arm with its unit', () => {
    const { container } = render(
      <MiniChart
        title="Interest rate"
        icon="percent"
        years={[2027, 2028]}
        lines={[{ key: 'tfp', label: 'Automation + productivity', color: 'red', values: [0, 0.38] }]}
        domain={[-1, 1]}
        unit="pp"
        fmt={(x) => x.toFixed(2)}
        endFmt={(x) => `${x.toFixed(1)}pp`}
      />,
    );
    fireEvent.focus(container.querySelector('.mini-chart'));
    const tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('Interest rate, 2028');
    expect(tip).toContain('central closure');
    expect(tip).toContain('0.38pp');
  });

  it('dumbbell dot and tax-gap bar: focus shows arm, closure and value', () => {
    const { unmount } = render(<ResultsTab sid="uk_central" sub="overview" onSub={() => {}} onTab={() => {}} onScenario={() => {}} />);
    const dot = screen.getByLabelText(/Automation \+ productivity, central closure, Income UK residents keep/);
    fireEvent.focus(dot);
    let tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('Central closure');
    expect(tip).toContain('+1.23% against the no-AI path');
    fireEvent.blur(dot);
    unmount();
    render(<ResultsTab sid="uk_central" sub="finances" onSub={() => {}} onTab={() => {}} onScenario={() => {}} />);
    const bar = screen.getByLabelText(/Labour minus capital effective tax rate, OBR/);
    fireEvent.focus(bar);
    tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('OBR');
    expect(tip).toContain('19–23pp');
  });
});
