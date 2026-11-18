// Explore wave 2: the slope chart's sign flips, the Who gains heatmap and
// dot strip, and the wall. Every expectation is computed here from the raw
// data with its own threshold, across scenarios, closures and rules.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { pickInPill } from '@/components/ui/pillTestUtils.js';
import S from '@/lib/activeData.js';
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

describe('some foreign capital to no foreign capital', () => {
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
  it('end labels are the data to one decimal, and a flip is said in words with its direction', () => {
    // one decimal, signed with a true minus; the two-decimal figures stay
    // the four-measure card's
    const one = (x) => (Math.abs(x) < 0.05 ? '0.0' : `${x > 0 ? '+' : '\u2212'}${Math.abs(x).toFixed(1)}`);
    for (const s of S.scenarios) {
      const { container, unmount } = wrap(<ClosureSlope sid={s.id} />, `tab=explore&s=${s.id}`);
      for (const fig of container.querySelectorAll('.ex-slope-panel')) {
        const rows = slopeRows(s.id, S.arms.map((a) => a.id), 'common', fig.dataset.measure);
        const want = rows.filter((r) => r.c != null && r.b != null).flatMap((r) => [one(r.c), one(r.b)]);
        const got = [...fig.querySelectorAll('.ex-slope-val text')].map((t) => t.textContent);
        for (const g of got) expect(g).toMatch(/^(0\.0|[+\u2212]\d+\.\d)$/);
        // every end labelled, or (ends too close) the selected version's two
        expect(got.length === want.length || got.length === 2).toBe(true);
        for (const g of got) expect(want).toContain(g);
      }
      container.querySelectorAll('[data-axis]').forEach((e) => e.remove());
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
    // item 37: one versions control, the wall's pill (no chip toggles)
    expect(container.querySelectorAll('.ex-wall-head .settings-chip')).toHaveLength(1);
    expect(container.querySelector('.ex-wall-head .settings-chip').getAttribute('aria-label')).toMatch(/versions/i);
    expect(container.querySelectorAll('.ex-wall-section .chips, .ex-wall-section .control-bar')).toHaveLength(0);
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
          // no grid for the other measures in the data: holes, never synthesised
          for (const m of ['B', 'T', 'BT']) expect(grid(cl, rule, arm, m).every((r) => r.cells.every((x) => x == null))).toBe(true);
        }
  });
  it('100 dots, whole dots only: under 1% is none', () => {
    expect(dotCounts([0.049])).toEqual({ solid: 0, range: 0 });
    expect(dotCounts([14.954])).toEqual({ solid: 15, range: 0 });
    expect(dotCounts([14.82, 17.57])).toEqual({ solid: 15, range: 3 });
  });
  it('the toggle re-colours the dots and the heatmap together', () => {
    const { container } = wrap(<WhoGainsTab />, 'tab=explore&sub=who');
    const dots = () => container.querySelectorAll('.ex-dotstrip .ex-dots .ex-dot.is-lose').length;
    expect(dots()).toBe(0);
    // the measure is chosen in the heatmap's pill; the tile's rows follow
    pickInPill(container.querySelector('#who-heatmap'), 'Measure', 'Both');
    expect(container.querySelector('.ex-mtoggle-row.is-on').textContent).toMatch(/^Both/);
    const bt = CO.dnfull.range.no_bequest_losing_pct;
    expect(dots()).toBe(Math.round(Math.min(...bt)));
    expect(container.querySelector('#who-heatmap table').dataset.measure).toBe('BT');
    // the dot strip prints no share: each has its home in the tile's toggle
    expect(container.querySelector('.ex-dotstrip').textContent.replace('One dot = 1% of adults', '')).not.toMatch(/\d+%/);
    // heatmap cells: gain or loss class from the sign of the data
    pickInPill(container.querySelector('#who-heatmap'), 'Measure', 'As modelled');
    const C = CO.closures['zk0.1'].rules.dn.tfp;
    const cells = [...container.querySelectorAll('#who-heatmap tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.className.includes('is-gain') ? 1 : td.className.includes('is-loss') ? -1 : 0)));
    AGES.forEach((age, k) => {
      const i = CO.closures['zk0.1'].birth_year.indexOf(CO.shock_year - age);
      expect(cells[k]).toEqual([...C.cev[i], C.cev_all[i]].map((x) => (x >= 0 ? 1 : -1)));
    });
  });
});
