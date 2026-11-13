// The Cohorts tab prints what cohorts2028.json holds and follows the toggles.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import D from '@/data/cohorts2028.json';
import CohortsTab, { cell, pct } from '@/tabs/cohorts/CohortsTab.jsx';

afterEach(cleanup);

describe('Cohorts tab', () => {
  it('headline defaults to the central closure, debt-neutral, main arm', () => {
    const { container } = render(<CohortsTab sid="uk_central" />);
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

  it('stress test reads about zero, with the share losing and the young who all lose', () => {
    const { container } = render(<CohortsTab sid="uk_central" />);
    fireEvent.click(screen.getByRole('radio', { name: /stress test/ }));
    const c = cell('zk0.1', 'dn', 'stress');
    const t = container.textContent;
    expect(Math.abs(c.alive_avg)).toBeLessThan(0.1);
    expect(t).toContain('about zero');
    expect(t).toContain(`${Math.round(c.alive_losing_pct)}%`);
    expect(t).toContain(`everyone aged ${c.all_lose_up_to_age} or younger`);
  });

  it('charges the post-2035 cost only under debt-neutral transfers', () => {
    const { container } = render(<CohortsTab sid="uk_central" />);
    fireEvent.click(screen.getByRole('radio', { name: /Common fiscal rule/ }));
    expect(container.textContent).not.toContain('first-order estimate');
  });

  it('switches rule, closure and arm', () => {
    const { container } = render(<CohortsTab sid="uk_central" />);
    fireEvent.click(screen.getByRole('radio', { name: /Common fiscal rule/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Closed capital/ }));
    fireEvent.click(screen.getByRole('radio', { name: /stress test/ }));
    expect(container.textContent).toContain(pct(cell('zk0', 'common', 'stress').alive_avg));
  });

  it('says cohort results are UK central only under another scenario', () => {
    const { container } = render(<CohortsTab sid="korinek" />);
    expect(container.textContent).toContain('UK central only');
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
