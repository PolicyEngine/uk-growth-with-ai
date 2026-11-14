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

// the debt-neutral variant: an altered main-arm GDP gap at the central closure
fixture.rules.debt_neutral.results.uk_central.tfp['zk0.1'].gaps.Y[H] = 3.2109;

vi.doMock('@/data/surprise2028.json', () => ({ default: fixture }));

const { default: ResultsTab } = await import('@/tabs/ai/ResultsTab.jsx');
const { default: LineChart } = await import('@/components/LineChart.jsx');
const { NavProvider } = await import('@/lib/nav.jsx');
const { path, CENTRAL } = await import('@/tabs/ai/surprise.js');

// Render Results at an address: the tab reads every choice from the URL.
const at = (query) => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <ResultsTab />
    </NavProvider>,
  );
};

describe('Results follows the data file', () => {
  it('shows the altered values and pending bounds', () => {
    const text = (query) => {
      const { container, unmount } = at(query);
      const t = container.textContent;
      unmount();
      return t;
    };
    // Summary: the headline tiles; with Both, the pending closed-capital value says so
    expect(text('tab=results')).toContain('+2.35%');
    expect(text('closure=both')).toContain('With closed capital: pending');
    // Income and output: the four-measure card
    const income = text('sub=income&closure=both');
    expect(income).toContain('+1.23%');
    expect(income).toContain('closed capital pending');
    expect(text('sub=economy')).toContain('+4.4%');
    expect(text('sub=finances')).toContain('+7.78pp');
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

  it('dumbbell dot and tax-gap bar: focus shows arm, closure and value', () => {
    const { unmount } = at('sub=income');
    const dot = screen.getByLabelText(/Automation \+ productivity, central closure, Income UK residents keep/);
    fireEvent.focus(dot);
    let tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('Central closure');
    expect(tip).toContain('+1.23% against the OBR-central path');
    fireEvent.blur(dot);
    unmount();
    at('sub=finances');
    const bar = screen.getByLabelText(/^OBR: 19–23pp/);
    fireEvent.focus(bar);
    tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('OBR');
    expect(tip).toContain('19–23pp');
  });

  it('fiscal-rule card: debt-neutral transfers print their own gaps for UK central only; fixed spending is shown disabled', () => {
    const open = (sid, closure = 'central') => {
      const { container, unmount } = at(`sub=finances&s=${sid}&closure=${closure}`);
      fireEvent.click(screen.getByRole('radio', { name: /Debt-neutral/ }));
      const t = container.querySelector('#fiscal-rule .chart-plot').textContent;
      unmount();
      return t;
    };
    const dn = open('uk_central');
    expect(dn).toContain('+3.21%');
    // 3 arms x 4 measures at one closure, twice that with both
    expect(dn.match(/[+−]?\d+\.\d\d%/g)).toHaveLength(12);
    expect(open('uk_central', 'both').match(/[+−]?\d+\.\d\d%/g)).toHaveLength(24);
    const other = open('uk_high');
    expect(other).toContain('solved for UK central only');
    expect(other).not.toMatch(/\d\.\d\d%/);
    at('sub=finances');
    const fixed = screen.getByRole('radio', { name: /Fixed spending/ });
    expect(fixed.disabled).toBe(true);
    expect(fixed.textContent).toContain('Not yet solved');
  });

  it('the rule and the arms are in the address', () => {
    at('sub=finances');
    fireEvent.click(screen.getByRole('radio', { name: /Debt-neutral/ }));
    expect(window.location.search).toContain('rule=dn');
    fireEvent.click(screen.getAllByRole('button', { name: 'Stress test' })[0]);
    expect(window.location.search).toContain('arms=tfp,tz');
  });
});
