// Who gains prints what cohorts2028.json holds and follows its control bar
// and the header's closure.
import { afterEach, describe, expect, it } from 'vitest';
import { cohortSurprise } from '@/lib/dataTestUtils.js';
import { cleanup, render } from '@testing-library/react';
import D from '@/data/cohorts2028.json';
import WhoGainsTab, { cell, pct, tileRange, dnfullFor, whoAnswer, whoFindingOf, RETURN_LINE, byFormLead, whyTokens, consumptionWords, earningsWords, payWords, stressWords, HORIZON_YEAR } from '@/tabs/cohorts/CohortsTab.jsx';
import { NavProvider } from '@/lib/nav.jsx';
import S from '@/lib/activeData.js';

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
    // the welfare breakdown: the total and each part printed once, beside its bar
    const parts = container.querySelector('#welfare-breakdown');
    expect(parts.querySelector('.finding-lead').textContent).toBe(byFormLead(c.parts_alive, c.alive_avg));
    const vals = [...parts.querySelectorAll('.ex-parts-val')].map((e) => e.textContent);
    expect(vals).toEqual([c.alive_avg, c.parts_alive.consumption, c.parts_alive.leisure, c.parts_alive.bequests].map((x) => pct(x)));
    // the total restates the Average change tile
    expect(parts.querySelector('.ex-parts-val').hasAttribute('data-axis')).toBe(true);
    expect(parts.querySelector('[data-axis-title="y"]').textContent).toContain('% of remaining-lifetime consumption and bequests');
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
    // its caveat: one click away, in the closed More info disclosure
    const more = container.querySelector('#who-model-households');
    expect(more.querySelector('.disclosure-toggle').getAttribute('aria-expanded')).toBe('false');
    expect(more.textContent).toContain('a property of the model, not a finding about the UK');
  });

  it('stress test: the share losing and the young who all lose', () => {
    // the arm is set in the settings pill (one store in the address)
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

// The birth-year finding box (item-18-fable.md, "All 12 cells"): the states
// the 2028 data does not reach, on synthetic cells. The 12 real cells are
// driven by pw/check_cohort_claims.mjs.
describe('Who gains finding box', () => {
  const xs = D.closures['zk0.1'].birth_year;
  const sy = D.shock_year;
  const ageIdx = (age) => xs.indexOf(sy - age);
  // a cell that gains everywhere, peaking at 67, least at 20 among working ages
  const make = (over = {}) => {
    const cev_all = xs.map((y) => {
      const a = sy - y;
      return a < 20 ? 0.3 : a <= 67 ? 0.2 + (a - 20) * 0.02 : 1.14 - (a - 67) * 0.03;
    });
    return { cev_all, sources_alive: { capital: 1.5, labour: -0.7 }, alive_losing_pct: 0.05, no_bequest_losing_pct: 15, ...over };
  };
  const run = (c, o = {}) => whoFindingOf(c, { xs, shockYear: sy, arm: 'tfp', T: 16, ...o });
  const text = (f) => f.lines.map((l) => l.map((p) => p.text).join(''));

  it('gain state: three lines, line 3 joined by "; "', () => {
    const f = run(make());
    expect(f.state).toBe('gain');
    expect(f.lead).toBe('Adults around retirement age gain most.');
    expect(text(f)).toEqual([RETURN_LINE, 'Among working-age adults, the youngest gain least.', 'Every birth year gains on average as modelled; more adults lose if households bear the later fiscal cost or leaving bequests is not valued.']);
  });

  it('the stress test drops the least line; the common rule (no T) drops the fiscal clause', () => {
    expect(text(run(make(), { arm: 'stress', T: null }))).toEqual([RETURN_LINE, 'Every birth year gains on average as modelled; more adults lose if leaving bequests is not valued.']);
  });

  it('fiscal clause alone, and neither clause', () => {
    expect(text(run(make({ no_bequest_losing_pct: 0 })))[2]).toBe('Every birth year gains on average as modelled; more adults lose if households bear the later fiscal cost.');
    expect(text(run(make({ no_bequest_losing_pct: 0 }), { T: null }))[2]).toBe('Every birth year gains on average as modelled.');
  });

  it('lead guard: the adult peak at or below zero reads "lose least"; a peak outside 60-70 names the age', () => {
    const c = make();
    c.cev_all = c.cev_all.map((v) => v - 5);
    expect(run(c).lead).toBe('Adults around retirement age lose least.');
    const d = make();
    d.cev_all[ageIdx(74)] = 9;
    expect(run(d).lead).toBe('Adults around age 74 gain most.');
  });

  it('line 1 drops when capital does not gain or labour does not lose', () => {
    expect(text(run(make({ sources_alive: { capital: 1, labour: 0.1 } })))[0]).not.toBe(RETURN_LINE);
  });

  it('loss state: one run of birth years, then the measures line; no least line', () => {
    const c = make();
    for (let a = 20; a <= 30; a += 1) c.cev_all[ageIdx(a)] = -0.1 - a / 1000;
    for (let i = ageIdx(19); i < xs.length; i += 1) c.cev_all[i] = -0.2;
    const f = run(c);
    expect(f.state).toBe('loss');
    expect(text(f)).toEqual([
      RETURN_LINE,
      `Some birth years lose on average as modelled: those born ${sy - 30}–${xs[xs.length - 1]}, by up to 0.20%.`,
      'More adults lose if households bear the later fiscal cost or leaving bequests is not valued.',
    ]);
  });

  it('adults all gain but a later birth year loses: the loss state, no least line', () => {
    const c = make();
    c.cev_all[ageIdx(10)] = -0.05;
    const f = run(c);
    expect(f.state).toBe('loss');
    expect(text(f)[1]).toBe(`Some birth years lose on average as modelled: those born ${sy - 10}–${sy - 10}, by up to 0.05%.`);
    expect(f.lines.flat().some((p) => p.claim === 'least')).toBe(false);
  });

  it('a broken run prints no years; a loss that rounds to 0.00 prints no size', () => {
    const c = make();
    c.cev_all[ageIdx(25)] = -0.3;
    c.cev_all[ageIdx(35)] = -0.1;
    expect(text(run(c))[1]).toBe('Some birth years lose on average as modelled, by up to 0.30%.');
    const d = make();
    d.cev_all[ageIdx(25)] = -0.001;
    expect(text(run(d))[1]).toBe(`Some birth years lose on average as modelled: those born ${sy - 25}–${sy - 25}.`);
  });

  it('flat state: no birth-year half; the measures line starts with a capital', () => {
    const c = make();
    c.cev_all[ageIdx(10)] = 0.002;
    const f = run(c);
    expect(f.state).toBe('flat');
    expect(text(f)).toEqual([RETURN_LINE, 'Among working-age adults, the youngest gain least.', 'More adults lose if households bear the later fiscal cost or leaving bequests is not valued.']);
  });

  it('the 12 cells on the 2028 data: 7 gain, 5 loss, the least line in 6; each line a sentence of at most 25 words', () => {
    const n = { gain: 0, loss: 0, flat: 0, least: 0 };
    for (const cl of ['central', 'closed'])
      for (const r of ['dn', 'common'])
        for (const a of ['tfp', 'zfixed', 'stress']) {
          const f = whoAnswer(cl, r, a);
          n[f.state] += 1;
          if (f.lines.flat().some((p) => p.claim === 'least')) n.least += 1;
          for (const l of text(f)) {
            expect(l).toMatch(/\.$/);
            expect(l.split(' ').length).toBeLessThanOrEqual(25);
          }
          expect(f.lines.length).toBeGreaterThanOrEqual(2);
          expect(f.lines.length).toBeLessThanOrEqual(3);
        }
    expect(n.gain + n.loss + n.flat).toBe(12);
    // the 2028 data (the spec's table); after a swap these counts may move
    if (D.shock_year === 2028) expect([n.gain, n.loss, n.least]).toEqual([7, 5, 6]);
  });
});

describe('the welfare breakdown lead', () => {
  it('four forms from the signs, lists largest first, the verb agreeing', () => {
    expect(byFormLead({ consumption: 0.07, leisure: 0.2, bequests: 0.52 }, 0.79)).toBe('Most of the average gain is the value of leaving bigger bequests.');
    expect(byFormLead({ consumption: 0.3, leisure: 0.2, bequests: 0.25 }, 0.7)).toBe('The largest part of the average gain is more spending.');
    expect(byFormLead({ consumption: -0.2, leisure: 0.1, bequests: 0.37 }, 0.27)).toBe('Bigger bequests and more free time outweigh less spending.');
    expect(byFormLead({ consumption: -0.5, leisure: 0.1, bequests: 0.3 }, -0.07)).toBe('Less spending outweighs bigger bequests and more free time: on average adults lose.');
    // a part that rounds to 0.00 is left out
    expect(byFormLead({ consumption: -0.2, leisure: 0.004, bequests: 0.37 }, 0.17)).toBe('Bigger bequests outweighs less spending.');
  });

  it('on the 2028 data: "most of" in 4 cells, "outweigh" in 7, a loss in 1', () => {
    const n = { most: 0, largest: 0, outweigh: 0, lose: 0 };
    for (const cl of ['zk0.1', 'zk0'])
      for (const r of ['dn', 'common'])
        for (const a of ['tfp', 'zfixed', 'stress']) {
          const c = cell(cl, r, a);
          const t = byFormLead(c.parts_alive, c.alive_avg);
          n[t.startsWith('Most') ? 'most' : t.startsWith('The largest') ? 'largest' : t.endsWith('adults lose.') ? 'lose' : 'outweigh'] += 1;
          // "most of" only where bequests exceed the other two together
          if (t.startsWith('Most')) expect(c.parts_alive.bequests).toBeGreaterThan(c.parts_alive.consumption + c.parts_alive.leisure);
          if (t.endsWith('adults lose.')) expect(c.alive_avg).toBeLessThanOrEqual(0);
        }
    if (D.shock_year === 2028) expect(n).toEqual({ most: 4, largest: 0, outweigh: 7, lose: 1 });
  });
});

// What drives the result (item-21-fable.md): each block's claims checked
// against the data in all 12 cells, with expectations derived from the JSON.
describe('What drives the result', () => {
  const SARM = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
  const RK = { dn: 'debt_neutral' };
  // the surprise file of the cohort's own year (R2-03)
  const sgap = (cl, rule, arm, v, year) => {
    const CS = cohortSurprise();
    const r = (rule === 'common' ? CS.results : CS.rules[RK[rule]].results).uk_central[SARM[arm]][cl];
    return r.gaps[v][CS.years.indexOf(year === S.headline_year ? CS.headline_year : year)];
  };
  for (const cl of ['zk0.1', 'zk0'])
    for (const rule of ['dn', 'common'])
      for (const arm of ['tfp', 'zfixed', 'stress'])
        it(`${cl}, ${rule}, ${arm}`, () => {
          const c = cell(cl, rule, arm);
          const t = whyTokens(cl, rule, arm);
          const ys = Object.keys(c.c_gap).map(Number);
          expect(t).toEqual({ shockYear: D.shock_year, lastFlowYear: Math.max(...ys), debtRuleYear: Math.max(...ys) + 1, cAboveYear: c.first_year_c_above ?? null });
          // A
          const A = consumptionWords(cl, rule, arm);
          const c0 = c.c_gap[String(D.shock_year)];
          if (A.lines[0].startsWith('Households save more')) {
            expect(sgap(cl, rule, arm, 'r_bp', S.headline_year)).toBeGreaterThan(0);
            expect(sgap(cl, rule, arm, 'I', D.shock_year)).toBeGreaterThan(0);
          }
          if (c.first_year_c_above) expect(A.lines.join(' ')).toContain(`from ${c.first_year_c_above} under ${rule === 'dn' ? 'debt-neutral transfers' : 'the common fiscal rule'}`);
          else expect(A.lines.join(' ')).toContain(`in ${HORIZON_YEAR}`);
          if (A.lines.some((l) => l.startsWith('The average gain is positive'))) {
            expect(c.alive_avg).toBeGreaterThan(0);
            expect(c.parts_alive.bequests + c.parts_alive.leisure).toBeGreaterThan(c.parts_alive.consumption);
            expect(c0).toBeLessThan(0);
          }
          // B: the two groups shown, in the order the lead says
          const B = earningsWords(cl, rule, arm);
          if (B.lead.includes('gain more than')) expect(B.bot).toBeGreaterThan(B.top);
          if (B.lead.includes('lose less than')) expect(B.bot).toBeGreaterThan(B.top);
          expect(B.lead).not.toMatch(/lower earners gain more/);
          // C: years and the sign of the windowed transfers
          const Cw = payWords(cl, rule, arm);
          expect(Cw.lines.join(' ')).toContain(`From ${t.debtRuleYear}`);
          if (rule === 'dn') {
            const tr = Object.entries(c).find(([k]) => k.startsWith('income_'))[1].transfers;
            if (Cw.lead.includes('pay the fiscal cost')) expect(tr.every((v) => v < 0)).toBe(true);
            expect(Cw.lines[0]).toContain(`${t.shockYear}–${t.lastFlowYear}`);
          } else if (Cw.lead.includes('fiscal cost')) expect(sgap(cl, 'common', arm, 'debt_gdp_pp', t.debtRuleYear)).toBeGreaterThan(0);
          // D: the youngest, from the stress cell
          const Dw = stressWords(cl, rule, arm);
          const xs = D.closures[cl].birth_year;
          const s = cell(cl, rule, 'stress');
          expect(Dw.young).toBe(s.cev_all[xs.indexOf(D.shock_year - 20)]);
          expect(Dw.old).toBe(s.cev_all[xs.indexOf(D.shock_year - 65)]);
          if (Dw.lead.includes('the youngest adults lose')) expect(Dw.young).toBeLessThan(0);
          if (Dw.lines.some((l) => l.startsWith('With no output gain'))) expect(sgap(cl, rule, 'stress', 'w', S.headline_year)).toBeLessThan(sgap(cl, rule, 'tfp', 'w', S.headline_year));
          for (const b of [A, B, Cw, Dw]) {
            expect(b.lead).toMatch(/\.$/);
            expect(b.lines.length).toBeGreaterThanOrEqual(1);
            expect(b.lines.length).toBeLessThanOrEqual(3);
            for (const l of b.lines) {
              expect(l).toMatch(/\.$/);
              expect(l.split(' ').length).toBeLessThanOrEqual(25);
            }
          }
        });

  it('the default view: the four boxes, the closed disclosure, no typed horizon year', () => {
    window.history.replaceState(null, '', '/?tab=who');
    const { container } = render(
      <NavProvider>
        <WhoGainsTab />
      </NavProvider>,
    );
    expect(container.querySelectorAll('.ex-why2 > .finding')).toHaveLength(4);
    expect(container.querySelector('.ex-caveat-chip, .ex-timeline, .ex-chain')).toBeNull();
    const more = container.querySelector('#who-model-households');
    expect(more.querySelector('.disclosure-content').hidden).toBe(true);
    // E3's transfer pair, debt-neutral only
    const tr = Object.entries(cell('zk0.1', 'dn', 'tfp')).find(([k]) => k.startsWith('income_'))[1].transfers;
    expect(more.textContent).toContain(`${Math.abs(tr[0]).toFixed(1)}%`);
  });
});
