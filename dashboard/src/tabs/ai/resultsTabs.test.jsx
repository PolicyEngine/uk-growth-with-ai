// The results tabs print what the data file holds: rendered against a
// fixture with altered values, the altered values appear, a pending cell
// prints "pending", and the series handed to LineChart equal path().
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import real from '@/data/surprise2028.json';

const fixture = JSON.parse(JSON.stringify(real));
const H = fixture.years.indexOf(fixture.headline_year);
const L = fixture.years.indexOf(fixture.late_year);
const done = (r) => ({ status: 'done', label: 'fixture', gaps: Object.fromEntries(Object.keys(r.gaps).map((k) => [k, fixture.years.map(() => 0)])) });
const base = Object.values(Object.values(real.results)[0])[0]['zk0.1'];
const tfpC = done(base);
tfpC.gaps.GNI[H] = 1.2345;
tfpC.gaps.Y[H] = 2.3456;
tfpC.gaps.debt_gdp_pp[L] = 7.7777;
tfpC.gaps.C[H] = 4.44;
fixture.results.uk_central.tfp['zk0.1'] = tfpC;
fixture.results.uk_central.tfp.zk0 = { status: 'pending' };

const plotted = [];
vi.doMock('@/data/surprise2028.json', () => ({ default: fixture }));
vi.doMock('@/components/LineChart.jsx', () => ({
  default: (props) => {
    plotted.push(props);
    return null;
  },
}));

const { default: ResultsTab } = await import('@/tabs/ai/ResultsTab.jsx');
const { default: PublicFinancesTab } = await import('@/tabs/ai/PublicFinancesTab.jsx');
const { path, CENTRAL } = await import('@/tabs/ai/surprise.js');

describe('results tabs follow the data file', () => {
  it('Results shows the altered headline values and pending bounds', () => {
    const { container } = render(<ResultsTab sid="uk_central" onTab={() => {}} />);
    const t = container.textContent;
    expect(t).toContain('+1.23%');
    expect(t).toContain('+2.35%');
    expect(t).toContain('+4.4%');
    expect(t).toContain('closed capital pending');
  });

  it('Public finances shows the altered debt value', () => {
    const { container } = render(<PublicFinancesTab sid="uk_central" />);
    expect(container.textContent).toContain('+7.78pp');
  });

  it('the plotted series equal path()', () => {
    plotted.length = 0;
    render(<ResultsTab sid="uk_central" onTab={() => {}} />);
    const gni = plotted.find((p) => p.ariaLabel.includes('(GNI)'));
    const line = gni.series.find((s) => s.key === 'tfp-c');
    expect(line.values).toEqual(path('uk_central', 'tfp', CENTRAL, 'GNI'));
    expect(gni.series.some((s) => s.key === 'tfp-b')).toBe(false);
  });
});
