// Who gains prints what cohorts2028.json holds and follows its control bar
// and the header's closure.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import D from '@/data/cohorts2028.json';
import WhoGainsTab, { cell, pct, tileRange, dnfullFor } from '@/tabs/cohorts/CohortsTab.jsx';
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
  it('headline defaults to some foreign capital, debt-neutral transfers, main arm', () => {
    const { container } = at();
    const c = cell('zk0.1', 'dn', 'tfp');
    const t = container.textContent;
    expect(t).toContain(pct(c.alive_avg));
    expect(t).toContain(pct(c.alive_by_group[0]));
    expect(t).toContain(pct(c.alive_by_group[6]));
    expect(t).toContain(pct(c.no_bequest_alive_avg));
    expect(t).toContain(pct(c.sources_alive.capital));
    expect(t).toContain(pct(c.sources_alive.labour));
    // the solve to the horizon replaces the first-order charge-back in this cell
    const full = D.dnfull.range;
    expect(t).toContain(pct(full.no_bequest_avg[0]));
    expect(t).toContain(`${Math.round(full.joint_losing_pct[0])}%`);
    expect(t).not.toContain('first order');
    // the by-form split: values in the segments' tooltips
    expect(container.querySelector(`[aria-label="Bequests: ${pct(c.parts_alive.bequests)}"]`)).not.toBeNull();
    expect(t).not.toMatch(/\b(poor|rich)\b/i);
  });

  it('leads with the range of the share who lose, not the as-modelled figure alone', () => {
    const { container } = at();
    const c = cell('zk0.1', 'dn', 'tfp');
    const first = container.querySelector('.stat-tile');
    expect(first.querySelector('.stat-name').textContent).toContain('Adults who lose');
    expect(first.querySelector('.stat-value').textContent).toBe(`Under 1% to ${Math.round(Math.max(c.no_bequest_losing_pct, ...D.dnfull.range.no_bequest_losing_pct))}%`);
    // the earnings-group ranking is a detail with its caveat, not a tile
    expect(container.querySelector('.stat-row').textContent).not.toContain('Top 1%');
    expect(container.textContent).toContain('A property of the model, not a UK finding');
  });

  it('stress test: the share losing and the young who all lose', () => {
    // the arm is set in the settings bar (one store in the address)
    const { container } = at('tab=who&arm=ss');
    const c = cell('zk0.1', 'dn', 'stress');
    const t = container.textContent;
    expect(t).toContain(`${Math.round(c.alive_losing_pct)}%`);
    expect(t).toContain(`Up to age ${c.all_lose_up_to_age}`);
    expect(window.location.search).toContain('arm=ss'); // one store: the model's arm id (lib/nav.jsx)
  });

  it('charges the post-2035 cost only under debt-neutral transfers: first order, or solved where the data has it', () => {
    const { container } = at();
    expect(container.querySelector('.stat-row').textContent).toContain('solved to the horizon');
    cleanup();
    // another arm has no solve to the horizon, so the first-order rows show
    const tz = at('tab=who&arm=tz');
    expect(tz.container.querySelector('.stat-row').textContent).toContain('first order');
    cleanup();
    const common = at('tab=who&arm=tz&rule=common');
    expect(common.container.querySelector('.stat-row').textContent).not.toContain('later fiscal cost');
  });

  it('follows the header closure, and the rule and arm of its control bar', () => {
    const { container } = at('tab=who&closure=closed&wrule=common&arm=stress');
    expect(container.textContent).toContain(pct(cell('zk0', 'common', 'stress').alive_avg));
  });

  it('says it is UK central only; with Both it shows each closure, in tiles and two chart panels', () => {
    const { container } = at('tab=who&s=korinek&closure=both');
    expect(container.textContent).toContain('UK central only');
    expect(container.textContent).toContain('the figures and the chart show each foreign-capital case');
    expect(container.textContent).toContain(pct(cell('zk0.1', 'dn', 'tfp').alive_avg));
    expect(container.textContent).toContain(pct(cell('zk0', 'dn', 'tfp').alive_avg));
    expect(container.querySelectorAll('#welfare-chart .wg-panel')).toHaveLength(2);
  });

  it('the tile range is worded as its rows: a true zero is none, so the range reads up to', () => {
    const { container } = at('tab=who&wrule=common');
    const c = cell('zk0.1', 'common', 'tfp');
    const tile = container.querySelector('.stat-tile');
    expect(tile.querySelector('.stat-value').textContent).toBe(tileRange(c.alive_losing_pct, c.no_bequest_losing_pct));
    if (c.alive_losing_pct <= 0) {
      expect(tile.querySelector('.stat-value').textContent).toBe(`Up to ${Math.round(c.no_bequest_losing_pct)}%`);
      expect(tile.querySelector('.ex-dd').textContent).toBe('none');
    }
    expect(tileRange(0, 4.8)).toBe('Up to 5%');
    expect(tileRange(0.05, 49.5)).toBe('Under 1% to 50%');
    expect(tileRange(12.2, 12.4)).toBe('12%');
    expect(tileRange(0, 0)).toBe('None');
  });

  it('the solve to the horizon shows only from the data, for the main arm, debt-neutral, some foreign capital', () => {
    const { container } = at();
    const rows = container.querySelectorAll('[data-dnfull]');
    if (D.dnfull?.ready) {
      // two rows in the share-who-lose tile, one in the average tile
      expect(rows).toHaveLength(3);
      expect(dnfullFor('zk0.1', 'dn', 'tfp')).not.toBeNull();
    } else {
      expect(rows).toHaveLength(0);
      expect(dnfullFor('zk0.1', 'dn', 'tfp')).toBeNull();
    }
    expect(dnfullFor('zk0', 'dn', 'tfp')).toBeNull();
    expect(dnfullFor('zk0.1', 'common', 'tfp')).toBeNull();
  });

  it('data covers both foreign-capital cases, both rules and three arms', () => {
    for (const cl of ['zk0.1', 'zk0'])
      for (const r of ['dn', 'common'])
        for (const a of ['tfp', 'zfixed', 'stress']) {
          const c = D.closures[cl].rules[r][a];
          expect(c.cev.length).toBe(D.closures[cl].birth_year.length);
          expect(Object.keys(c.c_gap)).not.toContain('2036');
        }
  });
});
