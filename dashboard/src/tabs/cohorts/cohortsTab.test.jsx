// Who gains prints what cohorts2028.json holds and follows its control bar
// and the header's closure.
import { afterEach, describe, expect, it } from 'vitest';
import { cohortSurprise } from '@/lib/dataTestUtils.js';
import { cleanup, render } from '@testing-library/react';
import { COHORTS as D } from '@/lib/dataKeys.js';
import WhoGainsTab, { cell, pct, tileRange, dnfullFor, whoAnswer, whoFindingOf, RETURN_LINE, byFormLead, whyTokens, consumptionWords, consumptionStats, consumptionUnit, earningsWords, payWords, stressWords, moreInfoReasons, HORIZON_YEAR } from '@/tabs/cohorts/CohortsTab.jsx';
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

const CO_WC = () => D.closures['zk0.1'].wealth_concentration.top_tenth_pct;
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
    // the one Card (task 19): its title is the finding, with no full stop
    expect(parts.matches('article.card')).toBe(true);
    expect(parts.querySelector('.card-head h3').textContent).toBe(byFormLead(c.parts_alive, c.alive_avg).replace(/\.$/, ''));
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
  // wealth above the adult mean at every age unless a case says otherwise
  const run = (c, o = {}) => whoFindingOf(c, { xs, shockYear: sy, arm: 'tfp', T: 16, wealthAt: () => 1.73, ...o });
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
          // A: one why-line (Who cards, A1 to A4); the average no longer
          // rides on it (the link to the breakdown shows in every cell)
          const A = consumptionWords(cl, rule, arm);
          const c0 = c.c_gap[String(D.shock_year)];
          if (A.why.startsWith('Households save more')) {
            expect(sgap(cl, rule, arm, 'r_bp', S.headline_year)).toBeGreaterThan(0);
            expect(sgap(cl, rule, arm, 'I', D.shock_year)).toBeGreaterThan(0);
            expect(c0).toBeLessThan(0);
          }
          expect(A.why.endsWith('at first.')).toBe(c.first_year_c_above != null);
          expect(A.why).not.toMatch(/average gain/);
          // B: the two groups shown, in the order the lead says; B1's gates
          const B = earningsWords(cl, rule, arm);
          if (B.lead.includes('gain more than')) expect(B.bot).toBeGreaterThan(B.top);
          if (B.lead.includes('lose less than')) expect(B.bot).toBeGreaterThan(B.top);
          expect(B.lead).not.toMatch(/lower earners gain more/);
          if (B.why) {
            expect(sgap(cl, rule, arm, 'r_bp', S.headline_year)).toBeGreaterThan(0);
            expect(sgap(cl, rule, arm, 'w', S.headline_year)).toBeLessThan(0);
          }
          // C: the sign of the windowed transfers, the debt held on its path
          const Cw = payWords(cl, rule, arm);
          expect(Cw.stats).toHaveLength(2);
          if (rule === 'dn') {
            const tr = Object.entries(c).find(([k]) => k.startsWith('income_'))[1].transfers;
            if (Cw.lead.includes('pay the fiscal cost')) expect(tr.every((v) => v < 0)).toBe(true);
            if (Cw.why?.startsWith('Transfers fall to keep public debt')) {
              expect(tr.every((v) => v < 0)).toBe(true);
              expect(Math.abs(sgap(cl, rule, arm, 'debt_gdp_pp', t.lastFlowYear))).toBeLessThan(0.005);
            }
            expect(Cw.stats.map((x) => x.value)).toEqual([tr[0], tr[6]]);
            expect(Cw.unit).toBe(`Change in transfers over ${t.shockYear}–${t.lastFlowYear}, at age ${Object.keys(c).find((k) => k.startsWith('income_')).match(/_age(\d+)$/)[1]}, % of consumption`);
            expect(Cw.signed).toBe(true);
          } else {
            if (Cw.lead.includes('fiscal cost')) expect(sgap(cl, 'common', arm, 'debt_gdp_pp', t.debtRuleYear)).toBeGreaterThan(0);
            expect(Cw.why).toBe('Under the common fiscal rule, spending follows GDP; households in the model do not value government consumption.');
            expect(Cw.stats.map((x) => x.label)).toEqual([String(t.shockYear), String(t.lastFlowYear)]);
            for (const x of Cw.stats) expect(x.text).toMatch(/^[+−]?\d+\.\d{2} pp$/);
            expect(Cw.signed).toBe(false);
          }
          // D: the youngest, from the stress cell
          const Dw = stressWords(cl, rule, arm);
          const xs = D.closures[cl].birth_year;
          const s = cell(cl, rule, 'stress');
          expect(Dw.young).toBe(s.cev_all[xs.indexOf(D.shock_year - 20)]);
          expect(Dw.old).toBe(s.cev_all[xs.indexOf(D.shock_year - 65)]);
          if (Dw.lead.includes('the youngest adults lose')) expect(Dw.young).toBeLessThan(0);
          if (Dw.why?.startsWith('The youngest adults have')) expect(sgap(cl, rule, 'stress', 'w', S.headline_year)).toBeLessThan(0);
          if (Dw.why?.startsWith('With no output gain')) expect(sgap(cl, rule, 'stress', 'w', S.headline_year)).toBeLessThan(sgap(cl, rule, 'tfp', 'w', S.headline_year));
          // every title a sentence; every why-line at most 20 words, with a
          // full stop, and no literal year
          for (const b of [A, B, Cw, Dw]) {
            expect(b.lead).toMatch(/\.$/);
            if (b.why == null) continue;
            expect(b.why).toMatch(/\.$/);
            expect(b.why.split(' ').length, b.why).toBeLessThanOrEqual(20);
          }
          // More info: four reasons, each takeaway at most 15 words
          for (const r of moreInfoReasons(cl, rule, arm)) if (r.take) expect(r.take.split(' ').length, r.take).toBeLessThanOrEqual(15);
        });

  // Who cards (Fable 5.2 ruling for Vahid): each gated line goes when its
  // gate is forced false
  it('each gated line is absent when its gate is false', () => {
    const [cl, rule, arm] = ['zk0.1', 'dn', 'tfp'];
    expect(consumptionWords(cl, rule, arm, { r: -1 }).why).toMatch(/^Households spend less/);
    expect(consumptionWords(cl, rule, arm, { inv: -1 }).why).toMatch(/^Households spend less/);
    expect(consumptionWords(cl, rule, arm, { c0: 1 }).why).toBe(`Households spend more from ${D.shock_year}.`);
    expect(consumptionWords(cl, rule, arm, { cAbove: null }).why).not.toMatch(/at first/);
    expect(earningsWords(cl, rule, arm).why).not.toBeNull();
    expect(earningsWords(cl, rule, arm, { r: -1 }).why).toBeNull();
    expect(earningsWords(cl, rule, arm, { w: 1 }).why).toBeNull();
    expect(earningsWords(cl, rule, arm, { labour: [50, 60, 55, 70, 75, 80, 90] }).why).toBeNull();
    expect(payWords(cl, rule, arm).why).toMatch(/^Transfers (fall|rise) to keep public debt/);
    expect(payWords(cl, rule, arm, { debt: 0.5 }).why).toMatch(/^Transfers (fall|rise) to \d{4}; households/);
    expect(payWords(cl, rule, arm, { transfers: [-1, 1, 1, 1, 1, 1, 1] }).why).toBeNull();
    expect(payWords(cl, rule, arm, { transfers: [1, 1, 1, 1, 1, 1, 1] }).why).toMatch(/^Transfers rise/);
    expect(stressWords(cl, rule, arm, { wealthYoung: 1 }).why).not.toMatch(/^The youngest adults have/);
    expect(stressWords(cl, rule, arm, { wealthYoung: 1, tfpW: 1 }).why).toBeNull();
    const take = (o) => Object.fromEntries(moreInfoReasons(cl, rule, arm, o).map((r) => [r.key, r.take]));
    expect(take({ w: 1 }).pay).toBeNull();
    expect(take({ r: -1 }).wealth).toBeNull();
    expect(take({ narrows: false }).transfers).toBe('The same amount is a larger share of a lower earner’s income.');
    expect(take({ wc: 50 }).ons).toBeNull();
    expect(moreInfoReasons(cl, rule, arm, { wc: 50 }).find((r) => r.key === 'ons').head).toBe('Wealth concentration against ONS data');
    expect(moreInfoReasons(cl, 'common', arm).find((r) => r.key === 'transfers').take).toBe('The same amount is a larger share of a lower earner’s income.');
  });

  // the Fable 5.2 ruling for Vahid (R2): card 1's unit line names the
  // shock year when the second stat is the crossing year (a year, no tone),
  // else covers both gaps; the stress test with some foreign capital has no
  // crossing year
  it('card 1: the unit line follows whether there is a crossing year', () => {
    for (const cl of ['zk0', 'zk0.1'])
      for (const rule of ['common', 'dn'])
        for (const arm of ['tfp', 'zfixed', 'stress']) {
          const t = whyTokens(cl, rule, arm);
          const u = consumptionUnit(cl, rule, arm);
          const st = consumptionStats(cl, rule, arm);
          if (t.cAboveYear != null) {
            expect(u).toBe(`Consumption gap vs forecast path in ${t.shockYear}, %; 0 is the path`);
            expect(st[1]).toMatchObject({ key: 'cross', label: 'First year above the path', text: String(t.cAboveYear), value: null });
          } else {
            // the fact the dropped second line carried (Who cards)
            expect(u).toBe(cell(cl, rule, arm).c_gap[String(t.shockYear)] < 0 ? `Consumption gap vs forecast path, %; still below it in ${HORIZON_YEAR}, the last year in the data` : 'Consumption gap vs forecast path, %; 0 is the path');
            expect(st.some((x) => x.key === 'cross')).toBe(false);
          }
        }
    expect(whyTokens('zk0.1', 'dn', 'stress').cAboveYear).toBeNull();
    expect(consumptionUnit('zk0.1', 'dn', 'stress')).toBe(`Consumption gap vs forecast path, %; still below it in ${HORIZON_YEAR}, the last year in the data`);
    const shock = whyTokens('zk0.1', 'dn', 'tfp');
    if (shock.cAboveYear != null) expect(consumptionUnit('zk0.1', 'dn', 'tfp')).toContain(`in ${shock.shockYear},`);
    for (const q of ['tab=who', 'tab=who&arm=stress']) {
      window.history.replaceState(null, '', `/?${q}`);
      const { container, unmount } = render(
        <NavProvider>
          <WhoGainsTab />
        </NavProvider>,
      );
      const card = container.querySelector('.ex-why2 > .why-card');
      expect(card.querySelectorAll('.why-unit'), q).toHaveLength(1);
      const unit = card.querySelector('.why-unit').textContent;
      const year = [...card.querySelectorAll('.why-stat')].find((x) => x.querySelector('dt').textContent === 'First year above the path');
      // the crossing year: shown as a year, with no tone; the unit names the shock year
      if (year) {
        expect(year.querySelector('dd').className, q).toBe('why-stat-value');
        expect(unit, q).toMatch(/^Consumption gap vs forecast path in \d{4}, %; 0 is the path$/);
      } else expect(unit, q).toBe(`Consumption gap vs forecast path, %; still below it in ${HORIZON_YEAR}, the last year in the data`);
      unmount();
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
    // Who cards (Fable 5.2 ruling for Vahid): a title, one why-line led by
    // an icon (none in B2 and D3), two stats and one unit line on every
    // card (card 3 too), one link row ending in an arrow (card 4 only with
    // the stress test in view)
    const cards = [...container.querySelectorAll('.ex-why2 > .why-card')];
    expect(cards).toHaveLength(4);
    const words = [consumptionWords('zk0.1', 'dn', 'tfp'), earningsWords('zk0.1', 'dn', 'tfp'), payWords('zk0.1', 'dn', 'tfp'), stressWords('zk0.1', 'dn', 'tfp')];
    cards.forEach((card, k) => {
      expect(card.querySelector('.finding-lead svg')).not.toBeNull();
      const lines = [...card.querySelectorAll('.why-bullets > li')];
      expect(lines).toHaveLength(words[k].why ? 1 : 0);
      for (const b of lines) {
        expect(b.firstElementChild.querySelector('svg')).not.toBeNull();
        expect(b.textContent.trim().split(/\s+/).length).toBeLessThanOrEqual(20);
      }
      expect(card.querySelectorAll('.why-stat')).toHaveLength(2);
      expect(card.querySelectorAll('.why-unit')).toHaveLength(1);
      const link = card.querySelector('.why-link');
      if (k === 3) expect(link).toBeNull();
      else expect(link.querySelectorAll('svg')).toHaveLength(1);
    });
    expect(cards[0].querySelector('.why-link').textContent).toBe('See the average, split by what changes ');
    expect(cards[1].querySelector('.why-link').textContent).toBe('Why this ranking depends on the model ');
    expect(cards[2].querySelector('.why-link').textContent).toBe('Change the budget assumption ');
    // card 3: the age-45 transfer change, signed to 2 dp and toned, on its face
    const tr = Object.entries(cell('zk0.1', 'dn', 'tfp')).find(([k]) => k.startsWith('income_'))[1].transfers;
    const vals = [...cards[2].querySelectorAll('.why-stat-value')];
    expect(vals.map((v) => v.textContent)).toEqual([pct(tr[0]), pct(tr[6])]);
    expect(vals[0].className).toMatch(/is-(gain|loss)/);
    expect(cards[2].querySelector('.why-unit').textContent).toMatch(/^Change in transfers over \d{4}–\d{4}, at age \d+, % of consumption$/);
    // the welfare unit explains itself in plain words
    const tip = cards[1].querySelector('.why-unit .tip-target');
    expect(tip.textContent).toBe('% of remaining-lifetime consumption and bequests');
    expect(tip.getAttribute('aria-label')).toBe('What does this measure mean?');
    // "as modelled" hedges stay
    expect(cards[1].querySelector('.finding-lead').textContent).toMatch(/^(As modelled|By lifetime earnings)/);
    const more = container.querySelector('#who-model-households');
    expect(more.querySelector('.disclosure-content').hidden).toBe(true);
    // the transfer pair is on card 3 now, not in More info
    expect(more.textContent).not.toContain(`${Math.abs(tr[0]).toFixed(1)}%`);
    // More info: one lead callout, then four reasons of one shape (heading,
    // one pair, one unit, at most one takeaway of 15 words or fewer)
    const mi = more.querySelector('.ex-mi');
    expect(mi.firstElementChild.classList.contains('ex-mi-callout')).toBe(true);
    expect(mi.firstElementChild.textContent).toBe('The ranking by earnings group is a property of the model, not a finding about the UK.');
    expect(mi.querySelectorAll('.ex-mi-callout')).toHaveLength(1);
    expect(mi.querySelector('.ex-mi-sub')).toBeNull();
    const mcards = [...mi.querySelectorAll('.ex-mi-grid > .ex-mi-card')];
    expect(mcards).toHaveLength(4);
    for (const c of mcards) {
      expect(c.querySelector('.ex-mi-head svg')).not.toBeNull();
      expect(c.querySelectorAll('.why-stats')).toHaveLength(1);
      expect(c.querySelectorAll('.why-stat')).toHaveLength(2);
      expect(c.querySelectorAll('.ex-mi-unit')).toHaveLength(1);
      const take = c.querySelectorAll('.ex-mi-text');
      expect(take.length).toBeLessThanOrEqual(1);
      for (const x of take) expect(x.textContent.trim().split(/\s+/).length).toBeLessThanOrEqual(15);
    }
    expect(mcards[2].lastElementChild.className).toBe('ex-mi-text');
    const foot = mcards[3].querySelector('.ex-mi-note');
    expect(foot.textContent.trim()).toBe('Not like for like: ONS counts households in Great Britain; the model counts adults.');
    expect(foot.nextElementSibling.querySelector('a').getAttribute('href')).toContain('ons.gov.uk');
    expect(foot.nextElementSibling.hasAttribute('data-cite')).toBe(true);
    if (CO_WC() < 43) expect(mcards[3].lastElementChild.textContent).toBe('Untested: with wealth as concentrated as in ONS data, the ranking could narrow or reverse.');
    // check_text: every block in the fold at most 25 words
    for (const b of mi.querySelectorAll('p, h4')) if (!b.closest('[data-cite]')) expect(b.textContent.trim().split(/\s+/).length, b.textContent).toBeLessThanOrEqual(25);
  });

  it('card 4 links to the chart only with the stress test in view', () => {
    window.history.replaceState(null, '', '/?tab=who&arm=stress');
    const { container } = render(
      <NavProvider>
        <WhoGainsTab />
      </NavProvider>,
    );
    const card = container.querySelectorAll('.ex-why2 > .why-card')[3];
    const a = card.querySelector('.why-link a');
    expect(a.textContent).toBe('See every age in the chart ');
    expect(a.getAttribute('href')).toBe('#welfare-chart');
  });
});
