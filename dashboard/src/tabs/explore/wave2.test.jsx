// Explore wave 2: the slope chart's sign flips, the Who gains heatmap and
// dot strip, and the wall. Every expectation is computed here from the raw
// data with its own threshold, across scenarios, closures and rules.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import S from '@/data/surprise2028.json';
import CO from '@/data/cohorts2028.json';
import { NavProvider } from '@/lib/nav.jsx';
import ClosureSlope, { slopeRows, SLOPE_MEASURES } from '@/tabs/explore/ClosureSlope.jsx';
import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import WhoGainsTab, { dotCounts } from '@/tabs/cohorts/CohortsTab.jsx';
import { grid, AGES } from '@/tabs/cohorts/WhoHeatmap.jsx';

afterEach(cleanup);
const H = S.years.indexOf(S.headline_year);
const RULE_KEY = { fixed: 'fixed_spending', dn: 'debt_neutral' };
const raw = (sid, arm, cl, rule, v) => {
  const r = (rule === 'common' ? S.results : S.rules[RULE_KEY[rule]].results)[sid]?.[arm]?.[cl];
  return r?.status === 'done' ? r.gaps[v][H] : null;
};
const sgn = (x) => (x > 0.005 ? 1 : x < -0.005 ? -1 : 0);
const wrap = (ui, q) => {
  window.history.replaceState(null, '', `/?${q}`);
  return render(<NavProvider>{ui}</NavProvider>);
};

describe('central closure to closed capital', () => {
  for (const s of S.scenarios)
    for (const rule of ['common', 'fixed', 'dn'])
      it(`${s.id}, ${rule}: flips from the signs`, () => {
        for (const m of SLOPE_MEASURES)
          for (const r of slopeRows(s.id, S.arms.map((a) => a.id), rule, m.v)) {
            const c = raw(s.id, r.arm.id, 'zk0.1', rule, m.v);
            const b = raw(s.id, r.arm.id, 'zk0', rule, m.v);
            expect(r.c).toBe(c);
            expect(r.b).toBe(b);
            expect(r.flips).toBe(c != null && b != null && sgn(c) * sgn(b) === -1);
          }
      });
  it('prints no figure, and a flip is said in words with its direction', () => {
    for (const s of S.scenarios) {
      const { container, unmount } = wrap(<ClosureSlope sid={s.id} />, `tab=explore&s=${s.id}`);
      container.querySelectorAll('[data-axis]').forEach((e) => e.remove());
      expect(container.querySelector('.ex-slope').textContent).not.toMatch(/\d\.\d\d/);
      for (const fig of container.querySelectorAll('.ex-slope-panel')) {
        const flips = slopeRows(s.id, S.arms.map((a) => a.id), 'common', fig.dataset.measure).filter((r) => r.flips);
        const note = fig.querySelector('.ex-slope-note.is-flip');
        expect(!!note).toBe(flips.length > 0);
        if (note) expect(note.textContent).toContain(raw(s.id, flips[0].arm.id, 'zk0', 'common', fig.dataset.measure) > 0 ? 'above' : 'below');
      }
      unmount();
    }
  });
});

describe('the economy wall', () => {
  it('eight tiles, one arms control; a title opens a tile and Escape closes it', () => {
    const { container } = wrap(<ResultsTab sub="economy" />, 'tab=explore');
    expect(container.querySelectorAll('.ex-wall .ex-tile')).toHaveLength(8);
    expect(container.querySelectorAll('.ex-wall-section [aria-label="Arms shown"]')).toHaveLength(1);
    const btn = container.querySelector('#tile-C .ex-tile-open');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#tile-C .card-finding')).not.toBeNull();
    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    // old group anchors still land
    for (const id of ['economy-demand', 'economy-factors', 'economy-prices']) expect(container.querySelector(`#${id}`)).not.toBeNull();
  });
});

describe('who gains: heatmap and dots', () => {
  it('as modelled: every cell is the data cohort, never averaged', () => {
    for (const [cl, C] of Object.entries(CO.closures))
      for (const rule of Object.keys(C.rules))
        for (const arm of Object.keys(C.rules[rule])) {
          const g = grid(cl, rule, arm, 'M');
          AGES.forEach((age, k) => {
            const i = C.birth_year.indexOf(CO.shock_year - age);
            expect(g[k].cells).toEqual([...C.rules[rule][arm].cev[i], C.rules[rule][arm].cev_all[i]]);
          });
          // no per-group grid for the other measures: holes, never synthesised
          for (const m of ['B', 'T', 'BT']) expect(grid(cl, rule, arm, m).every((r) => r.cells.slice(0, 7).every((x) => x == null))).toBe(true);
          expect(grid(cl, rule, arm, 'B').every((r) => r.cells[7] == null)).toBe(true);
        }
  });
  it('100 dots, whole dots only: under 1% is none', () => {
    expect(dotCounts([0.049])).toEqual({ solid: 0, range: 0 });
    expect(dotCounts([14.954])).toEqual({ solid: 15, range: 0 });
    expect(dotCounts([14.82, 17.57])).toEqual({ solid: 15, range: 3 });
  });
  it('the toggle re-colours the dots and the heatmap together', () => {
    const { container } = wrap(<WhoGainsTab />, 'tab=explore&sub=who');
    const dots = () => container.querySelectorAll('.ex-dots .ex-dot.is-lose').length;
    expect(dots()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /^.*BT/ }));
    const bt = CO.dnfull.range.no_bequest_losing_pct;
    expect(dots()).toBe(Math.round(Math.min(...bt)));
    expect(container.querySelector('#who-heatmap table').dataset.measure).toBe('BT');
  });
});
