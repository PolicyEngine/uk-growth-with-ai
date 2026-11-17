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
    // The headline tiles (and the pending closed-capital value with Both)
    // live in story part 2: tested in tabs/story/part2.test.jsx.
    // Income and output: the four-measure card; the main arm's GNI, GDP and
    // pay rate have their home in the story: muted reference values here,
    // named once in a line linked there
    const income = text('sub=income&closure=both');
    expect(income.match(/\+1\.23%/g)).toHaveLength(1);
    // that line sits behind the card's "Sources and notes", under "How to read"
    expect(income.match(/headline figures, at home in the story/g)).toBeNull();
    {
      const { container, unmount } = at('sub=income&closure=both');
      const b = container.querySelector('#measures button.src-line-btn');
      fireEvent.click(b);
      const pop = document.getElementById(b.getAttribute('aria-controls')).textContent;
      expect(pop).toContain('How to read');
      expect(pop.match(/headline figures, at home in the story/g)).toHaveLength(1);
      unmount();
    }
    expect(income).toContain('closed capital pending');
    expect(text('sub=economy')).toContain('+4.44%');
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
    const bar = screen.getByLabelText(/^OBR rates, differenced: 19–23pp/);
    fireEvent.focus(bar);
    tip = screen.getByRole('tooltip').textContent;
    expect(tip).toContain('OBR');
    expect(tip).toContain('19–23pp');
  });

  it('every chart follows the fiscal rule; the rule card prints its shift against the common rule', () => {
    const page = (query) => {
      const { container, unmount } = at(query);
      const card = container.querySelector('#fiscal-rule .chart-plot').textContent;
      const all = container.textContent;
      unmount();
      return { card, all };
    };
    // the four-measure card under debt-neutral transfers prints the main
    // arm's own GDP gap (the story shows the common rule only)
    const { container, unmount } = at('sub=income&rule=dn');
    expect(container.textContent).toContain('+3.21%');
    expect(container.textContent).not.toContain('in the story');
    unmount();
    const dn = page('sub=finances&s=uk_central&rule=dn').card;
    // the main arm's GDP shift: 3.2109 less the fixture's common-rule 2.3456
    expect(dn).toContain('+0.87pp');
    // 3 arms x 4 measures at one closure, twice that with both
    expect(dn.match(/[+−]?\d+\.\d\dpp/g)).toHaveLength(12);
    expect(page('sub=finances&s=korinek&closure=both&rule=fixed').card.match(/[+−]?\d+\.\d\dpp/g)).toHaveLength(24);
    const other = page('sub=finances&s=uk_high&rule=dn');
    expect(other.card).toContain('solved for UK central and Korinek et al. (upper) only');
    expect(other.card).not.toMatch(/\d\.\d\d/);
    // every chart on the page says so too, and none prints a figure
    expect(other.all).not.toMatch(/[+−]\d+\.\d+(%|pp)/);
    expect(page('sub=finances&s=uk_low&rule=fixed').card).toContain('Fixed spending: solved for UK central and Korinek et al. (upper) only');
  });

  it('the rule and the arms are in the address', async () => {
    // the rule picker is in the settings bar (components/ui/SettingsBar.jsx)
    const { default: SettingsBar } = await import('@/components/ui/SettingsBar.jsx');
    window.history.replaceState(null, '', '/?tab=explore&sub=finances');
    render(
      <NavProvider>
        <SettingsBar pick={{ rule: true }} />
        <ResultsTab />
      </NavProvider>,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Debt-neutral/ }));
    expect(window.location.search).toContain('rule=dn');
    fireEvent.click(screen.getAllByRole('button', { name: 'Stress test' })[0]);
    expect(window.location.search).toContain('arms=tfp,tz');
  });
});
