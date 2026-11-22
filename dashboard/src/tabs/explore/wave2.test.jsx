// Explore wave 2: the foreign-capital dumbbells' sign flips, the Who gains heatmap and
// dot strip, and the wall. Every expectation is computed here from the raw
// data with its own threshold, across scenarios, closures and rules.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { pickInPill } from '@/components/ui/pillTestUtils.js';
import S from '@/lib/activeData.js';
import { COHORTS as CO } from '@/lib/dataKeys.js';
import { NavProvider } from '@/lib/nav.jsx';
import ClosureSlope, { slopeNote, slopeRows, SLOPE_MEASURES } from '@/tabs/explore/ClosureSlope.jsx';
import ResultsTab, { WALL_HINTS, shownInvestFlags, I_RECORD_PCT } from '@/tabs/ai/ResultsTab.jsx';
import { I_FLAG_PCT } from '@/tabs/explore/caveats.js';
import { ARM_COLOR } from '@/tabs/ai/surprise.js';
import { versionName } from '@/lib/versionColors.js';
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
  it('the tooltip says a flip whose smaller end is within 0.05 (as printed) is about on the path, not that it flips (Fable round 6, S10)', () => {
    let near = 0;
    for (const s of S.scenarios)
      for (const rule of ['common', 'fixed', 'dn'])
        for (const m of SLOPE_MEASURES)
          for (const r of slopeRows(s.id, S.arms.map((a) => a.id), rule, m.v)) {
            const note = slopeNote(r);
            if (!r.flips) {
              expect(note).toBe('');
              continue;
            }
            const end = Math.abs(r.b) <= Math.abs(r.c) ? 'b' : 'c';
            const inside = Number(Math.abs(r[end]).toFixed(2)) <= 0.05;
            if (inside) near += 1;
            expect(note).toBe(inside ? ` About on the forecast path with ${end === 'b' ? 'no' : 'some'} foreign capital.` : ' Flips sign.');
          }
    // the main data: GDP's technology-unchanged flips all land within 0.05 of the path
    if (S.surprise_year === 2028) expect(near).toBeGreaterThan(0);
    expect(slopeNote({ flips: true, nearPath: null })).toBe(' Flips sign.');
    expect(slopeNote({ flips: true, nearPath: 'b' })).toBe(' About on the forecast path with no foreign capital.');
  });
  it('the flip note: is-flip exactly for a real flip, each version under its own direction; a near-path flip is "about on the forecast path" (Fable push E, fix 1)', () => {
    const arms = S.arms.map((a) => a.id);
    const dirOf = (x) => (x > 0 ? 'above' : 'below');
    for (const s of S.scenarios)
      for (const rule of ['common', 'fixed', 'dn']) {
        const { container, unmount } = wrap(<ClosureSlope sid={s.id} />, `tab=explore&s=${s.id}&rule=${rule}`);
        for (const fig of container.querySelectorAll('.ex-fc-group')) {
          const v = fig.dataset.measure;
          const rows = slopeRows(s.id, arms, rule, v);
          const real = rows.filter((r) => r.flips && !r.nearPath);
          const near = rows.filter((r) => r.flips && r.nearPath);
          const notes = fig.querySelectorAll('.ex-fc-note');
          expect(notes).toHaveLength(1);
          const note = fig.querySelector('.ex-fc-note.is-flip');
          expect(!!note).toBe(real.length > 0);
          const txt = notes[0].textContent;
          if (real.length) {
            // each real flip's version sits after its own direction and before the other's
            for (const r of real) {
              const d = dirOf(r.b);
              const name = versionName(r.arm).toLowerCase();
              const at = txt.indexOf(d);
              expect(at).toBeGreaterThan(-1);
              const seg = txt.slice(at).split(';')[0];
              expect(seg).toContain(name);
            }
          }
          if (near.length) expect(txt).toMatch(/[Aa]bout on (the forecast path|it) with (no|some) foreign capital/);
          if (!real.length) expect(txt).not.toMatch(/Flips/);
        }
        unmount();
      }
  });
  it('dumbbell rows: one per measure and version, each dot the data to one decimal, a flip said in words with its direction', () => {
    // one decimal, signed with a true minus; the two-decimal figures stay
    // the four-measure card's
    const one = (x) => (Math.abs(x) < 0.05 ? '0.0' : `${x > 0 ? '+' : '\u2212'}${Math.abs(x).toFixed(1)}`);
    const pos = (el) => parseFloat(el.style.left);
    for (const s of S.scenarios) {
      const { container, unmount } = wrap(<ClosureSlope sid={s.id} />, `tab=explore&s=${s.id}`);
      const groups = [...container.querySelectorAll('.ex-fc-group')];
      expect(groups.map((g) => g.dataset.measure)).toEqual(SLOPE_MEASURES.map((m) => m.v));
      for (const fig of groups) {
        const v = fig.dataset.measure;
        const rows = [...fig.querySelectorAll('.ex-fc-row')];
        expect(rows.map((r) => r.dataset.arm)).toEqual(S.arms.map((a) => a.id));
        for (const row of rows) {
          const c = raw(s.id, row.dataset.arm, 'zk0.1', 'common', v);
          const b = raw(s.id, row.dataset.arm, 'zk0', 'common', v);
          const some = row.querySelector('.ex-fc-val.is-some');
          const none = row.querySelector('.ex-fc-val.is-none');
          // each dot's printed value is the data, or no figure where the data has none
          expect(some?.textContent ?? null).toBe(c == null ? null : one(c));
          expect(none?.textContent ?? null).toBe(c == null || b == null ? null : one(b));
          expect(row.querySelectorAll('.ex-fc-dot.is-some')).toHaveLength(c == null ? 0 : 1);
          expect(row.querySelectorAll('.ex-fc-dot.is-none')).toHaveLength(c == null || b == null ? 0 : 1);
          if (c != null && b != null) {
            // the filled dot left of the hollow one exactly when it is smaller,
            // and each value outside its own dot: the left one's to its left
            const [ds, dn] = [row.querySelector('.ex-fc-dot.is-some'), row.querySelector('.ex-fc-dot.is-none')];
            expect(pos(ds) <= pos(dn)).toBe(c <= b);
            expect(some.classList.contains('is-left')).toBe(c <= b);
            expect(none.classList.contains('is-left')).toBe(!(c <= b));
            // the bar joins the two dots
            expect(pos(row.querySelector('.ex-fc-bar'))).toBeCloseTo(Math.min(pos(ds), pos(dn)), 2);
          }
          expect(row.classList.contains('is-flip')).toBe(c != null && b != null && sgn(c) * sgn(b) === -1);
        }
        // (the flip note's cases, every rule: the test below)
        // one short note per measure group
        expect(fig.querySelectorAll('.ex-fc-note')).toHaveLength(1);
      }
      // scripts/check_numbers.py reads the values from the page text, in
      // order, from the zero line's name to the note: the same order here
      const want = [];
      for (const m of SLOPE_MEASURES)
        for (const a of S.arms) {
          const c = raw(s.id, a.id, 'zk0.1', 'common', m.v);
          const b = raw(s.id, a.id, 'zk0', 'common', m.v);
          if (c != null) want.push(one(c));
          if (c != null && b != null) want.push(one(b));
        }
      // (the dump leaves the data-axis text out: the zero line's name, the ticks)
      const copy = container.cloneNode(true);
      copy.querySelectorAll('[data-axis]').forEach((e) => e.remove());
      const txt = copy.textContent;
      const k = txt.indexOf('Each row shows');
      const seg = txt.slice(txt.lastIndexOf('Some foreign capital to no foreign capital', k), k);
      expect(seg.match(/(?<![\d.])[+\u2212]?\d+\.\d(?![\d%p])/g) ?? []).toEqual(want);
      // the selected version, the main one by default, is the coloured row
      for (const row of container.querySelectorAll('.ex-fc-row[data-arm]')) expect(row.classList.contains('is-sel')).toBe(row.dataset.arm === 'tfp');
      // the zero line is named, and the note under the figure takes its year from the data
      expect(container.querySelector('.ex-fc-zero-label').textContent).toBe('Forecast path');
      const foot = container.querySelector('.ex-fc-foot');
      expect(foot.textContent).toContain(`${S.headline_year} result`);
      expect(foot.textContent).toContain('the bar’s length shows how much the assumption matters');
      expect(container.textContent).not.toMatch(/OG-UK/);
      // the tooltips are gone with the slope panels
      expect(container.querySelectorAll('.ch-tip, .ex-slope-panel')).toHaveLength(0);
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
    // push D, Q6c: one toolbar row: the pill, the legend inline (the
    // versions in the charts' own stroke colours), then "How to read";
    // the three hints in its popover, nothing dropped; the unit line stays
    const head = container.querySelector('.ex-wall-head');
    expect([...head.children].map((c) => c.className.split(' ').find((k) => /^(settings-chip-wrap|ch-legend|tip-target)$/.test(k)))).toEqual(['settings-chip-wrap', 'ch-legend', 'tip-target']);
    const sw = [...head.querySelectorAll('.ex-wall-legend li')].slice(0, 3).map((li) => li.querySelector('.ch-swatch').style.getPropertyValue('--sw').toLowerCase());
    expect(sw).toEqual(S.arms.map((a) => ARM_COLOR[a.id].toLowerCase()));
    expect(container.querySelectorAll('.ex-version-legend')).toHaveLength(0);
    const how = head.querySelector('.ex-wall-how');
    expect(how.getAttribute('aria-label')).toBe('How to read the wall');
    expect(container.querySelector('.ex-wall-key')).toBeNull();
    fireEvent.focus(how);
    expect([...container.querySelectorAll('.ex-wall-key > span')].map((x) => x.textContent.trim())).toEqual(WALL_HINTS.map((h) => h.text));
    fireEvent.blur(how);
    expect(container.querySelector('.ex-wall-units').textContent).toBe('Gap vs forecast path: % for levels, pp for rates and shares');
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

// Fable round 7, S1: the Investment tile's caveat speaks to the cell on
// screen (main version, each closure shown, common rule) where its own
// shock-year jump is above the flag, before the sensitivity's line. Gated
// on the cell's value, never on the scenario's name.
describe('the investment caveat names the cell on screen', () => {
  const i = S.years.indexOf(S.surprise_year);
  for (const s of S.scenarios)
    for (const closure of ['central', 'closed', 'both'])
      it(`${s.id}, ${closure}`, () => {
        const cls = closure === 'both' ? ['zk0', 'zk0.1'] : closure === 'closed' ? ['zk0'] : ['zk0.1'];
        const want = cls
          .map((cl) => ({ cl, r: S.results[s.id].tfp[cl] }))
          .filter(({ r }) => r.status === 'done' && r.gaps.I[i] >= I_RECORD_PCT)
          .map(({ cl, r }) => `This scenario, main version, ζK = ${S.closures[cl].zeta_K}: +${Math.round(r.gaps.I[i])}% in ${S.surprise_year}${r.gaps.I[i] > I_FLAG_PCT ? '' : ', larger than any year on record'}`);
        const got = shownInvestFlags(s.id, closure, 'common').map((f) => `This scenario, main version, ζK = ${f.zeta}: +${Math.round(f.x)}% in ${S.surprise_year}${f.record ? ', larger than any year on record' : ''}`);
        expect(got.sort()).toEqual(want.sort());
        expect(shownInvestFlags(s.id, closure, 'dn')).toEqual([]);
        const { container, unmount } = wrap(<ResultsTab sub="economy" />, `tab=explore&s=${s.id}&closure=${closure}`);
        // a closed tile carries no fold: open it
        fireEvent.click(container.querySelector('#tile-I .ex-tile-open'));
        const t = container.querySelector('#tile-I').textContent;
        for (const w of want) expect(t).toContain(w);
        if (!want.length) expect(t).not.toContain('This scenario, main version');
        // a record-only line links the plausibility note, never the +17% flag
        for (const a of container.querySelectorAll('#tile-I a')) if (a.textContent === 'larger than any year on record') expect(a.closest('li, p').textContent).not.toMatch(/flag/);
        unmount();
      });
  // the Fable 5.2 ruling for Vahid (R1): the 15% line adds exactly one
  // cell in both data sets: UK high, some foreign capital (2027 set 15.14%,
  // 2028 set 15.07%)
  it('the record threshold adds exactly UK high, some foreign capital', () => {
    const added = [];
    for (const s2 of S.scenarios) for (const f of shownInvestFlags(s2.id, 'both', 'common')) if (f.record) added.push(`${s2.id} ${f.cl}`);
    expect(added).toEqual(['uk_high zk0.1']);
    const x = S.results.uk_high.tfp['zk0.1'].gaps.I[i];
    expect(x).toBeGreaterThanOrEqual(I_RECORD_PCT);
    expect(x).toBeLessThanOrEqual(I_FLAG_PCT);
    expect(Math.round(x)).toBe(15);
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
