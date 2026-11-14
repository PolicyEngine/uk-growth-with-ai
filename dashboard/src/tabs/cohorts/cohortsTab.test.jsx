// Who gains prints what cohorts2028.json holds and follows its control bar
// and the header's closure.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import D from '@/data/cohorts2028.json';
import WhoGainsTab, { cell, pct } from '@/tabs/cohorts/CohortsTab.jsx';
import { NavProvider } from '@/lib/nav.jsx';

afterEach(cleanup);

const at = (query = 'tab=who') => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <WhoGainsTab />
    </NavProvider>,
  );
};

describe('Who gains tab', () => {
  it('headline defaults to the central closure, debt-neutral transfers, main arm', () => {
    const { container } = at();
    const c = cell('zk0.1', 'dn', 'tfp');
    const t = container.textContent;
    expect(t).toContain(pct(c.alive_avg));
    expect(t).toContain(pct(c.alive_by_group[0]));
    expect(t).toContain(pct(c.alive_by_group[6]));
    expect(t).toContain(pct(c.no_bequest_alive_avg));
    expect(t).toContain(pct(c.sources_alive.capital));
    expect(t).toContain(pct(c.sources_alive.labour));
    expect(t).toContain(pct(c.charged.no_bequest_avg[0]));
    expect(t).toContain(`${Math.round(c.charged.joint_losing_pct[0])}–${Math.round(c.charged.joint_losing_pct[1])}%`);
    expect(t).toContain(pct(c.parts_alive.bequests)); // in the by-form fold
    expect(t).not.toMatch(/\b(poor|rich)\b/i);
  });

  it('leads with the range of the share who lose, not the as-modelled figure alone', () => {
    const { container } = at();
    const c = cell('zk0.1', 'dn', 'tfp');
    const first = container.querySelector('.stat-tile');
    expect(first.querySelector('.stat-name').textContent).toContain('Adults who lose');
    expect(first.querySelector('.stat-value').textContent).toBe(`Under 1% to ${Math.round(c.charged.no_bequest_losing_pct[1])}%`);
    // the earnings-group ranking is a detail with its caveat, not a tile
    expect(container.querySelector('.stat-row').textContent).not.toContain('Top 1%');
    expect(container.textContent).toContain('a property of the model, not a finding about the UK');
  });

  it('stress test: the share losing and the young who all lose', () => {
    const { container } = at();
    fireEvent.click(screen.getByRole('radio', { name: /Stress test/ }));
    const c = cell('zk0.1', 'dn', 'stress');
    const t = container.textContent;
    expect(t).toContain(`${Math.round(c.alive_losing_pct)}%`);
    expect(t).toContain(`Up to age ${c.all_lose_up_to_age}`);
    expect(window.location.search).toContain('arm=stress');
  });

  it('charges the post-2035 cost only under debt-neutral transfers', () => {
    const { container } = at();
    expect(container.querySelector('.stat-row').textContent).toContain('With the fiscal cost after 2035 charged');
    fireEvent.click(screen.getByRole('radio', { name: /Common/ }));
    expect(container.querySelector('.stat-row').textContent).not.toContain('With the fiscal cost after 2035 charged');
    expect(window.location.search).toContain('wrule=common');
  });

  it('follows the header closure, and the rule and arm of its control bar', () => {
    const { container } = at('tab=who&closure=closed&wrule=common&arm=stress');
    expect(container.textContent).toContain(pct(cell('zk0', 'common', 'stress').alive_avg));
  });

  it('says it is UK central only, and that Both shows the central closure', () => {
    const { container } = at('tab=who&s=korinek&closure=both');
    expect(container.textContent).toContain('UK central only');
    expect(container.textContent).toContain('with Both chosen it shows the central closure');
    expect(container.textContent).toContain(pct(cell('zk0.1', 'dn', 'tfp').alive_avg));
  });

  it('data covers both closures, both rules and three arms', () => {
    for (const cl of ['zk0.1', 'zk0'])
      for (const r of ['dn', 'common'])
        for (const a of ['tfp', 'zfixed', 'stress']) {
          const c = D.closures[cl].rules[r][a];
          expect(c.cev.length).toBe(D.closures[cl].birth_year.length);
          expect(Object.keys(c.c_gap)).not.toContain('2036');
        }
  });
});
