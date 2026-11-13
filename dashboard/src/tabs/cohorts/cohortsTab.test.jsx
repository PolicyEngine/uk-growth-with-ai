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
    expect(t).toContain(pct(c.parts_alive.bequests));
    expect(t).not.toMatch(/\b(poor|rich)\b/i);
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
