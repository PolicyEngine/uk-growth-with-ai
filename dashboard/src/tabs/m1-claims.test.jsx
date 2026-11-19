// M1's gated claims (Maria's round: NNI, pay, debt, consumption, what the
// gain is made of, the overlap and its sign caveats), on BOTH data files
// whatever the flag. Each condition is computed here from the raw JSON, not
// with the page's helper, and each claim must print exactly where it holds.
import { describe, expect, it, vi } from 'vitest';
import S2028 from '@/data/surprise2028.json';
import S2027 from 'ugai-surprise2027'; // null unless the 2027 run has its file (R4-16)
import CO from '@/data/cohorts2028.json';

// the 2027 file only when it is loaded (R4-16)
const FILES = Object.fromEntries(Object.entries({ 2028: S2028, 2027: S2027 }).filter(([, D]) => D));
const pickFile = async (D) => {
  vi.resetModules();
  vi.doMock('@/lib/activeData.js', () => ({ default: D }));
};
const done = (D, sid, arm, cl) => D.results[sid]?.[arm]?.[cl]?.status === 'done';
const g = (D, sid, arm, cl, v, y = D.headline_year) => (done(D, sid, arm, cl) ? D.results[sid][arm][cl].gaps[v][D.years.indexOf(y)] : null);
const side = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
const SIDS = ['uk_low', 'uk_central', 'uk_high', 'korinek'];
const CLS = ['zk0.1', 'zk0'];

// BP9 Chart B.4, read independently of lib/obrOverlap.js (obr-overlap-fable.md, section 1)
const J = [0.03, 0.06, 0.11, 0.19, 0.3, 0.47];
const SC = [0.03, 0.08, 0.17, 0.33, 0.57, 0.88];

describe('the overlap figures follow the data set’s years (obr-overlap-fable.md; surprise2027-runs.md)', () => {
  it('adoption clock 0.19–0.33% on both; calendar 0.41–0.80% on 2028 and 0.27–0.54% on 2027', async () => {
    for (const [name, D] of Object.entries(FILES)) {
      await pickFile(D);
      const { ADOPTION, CALENDAR, pctRange } = await import('@/lib/obrOverlap.js');
      const n = D.headline_year - D.surprise_year + 1;
      expect(pctRange(ADOPTION), name).toBe(`${J[n - 1].toFixed(2)}–${SC[n - 1].toFixed(2)}%`);
      const last = D.headline_year - 2025;
      const first = D.surprise_year - 2025;
      const cal = [J[last - 1] - J[first - 2], SC[last - 1] - SC[first - 2]];
      expect(pctRange(CALENDAR), name).toBe(`${cal[0].toFixed(2)}–${cal[1].toFixed(2)}%`);
      expect(pctRange(CALENDAR), name).toBe(name === '2028' ? '0.41–0.80%' : '0.27–0.54%');
      expect(pctRange(ADOPTION), name).toBe('0.19–0.33%');
    }
  });
});

for (const [name, D] of Object.entries(FILES)) {
  describe(`M1 claims probe, surprise${name}.json`, () => {
    it('sign caveat: fires where the netted gap leaves its side (net min(input, calendar high)), never on pay', async () => {
      await pickFile(D);
      const { signMayFlip } = await import('@/lib/obrOverlap.js');
      const last = D.headline_year - 2025;
      const first = D.surprise_year - 2025;
      const calHi = SC[last - 1] - SC[first - 2];
      const fired = [];
      for (const s of D.scenarios)
        for (const cl of CLS)
          for (const v of ['Y', 'GNI', 'NNI', 'w', 'debt_gdp_pp', 'tax_gdp_pp']) {
            const x = g(D, s.id, 'tfp', cl, v);
            const z = g(D, s.id, 'tz', cl, v);
            if (x == null || z == null) {
              expect(signMayFlip(s.id, cl, v)).toBeNull();
              continue;
            }
            const y = x - ((x - z) / s.tfp_gain_pct) * Math.min(s.tfp_gain_pct, calHi);
            const flips = side(x) !== 'on' && side(y) !== side(x);
            expect(signMayFlip(s.id, cl, v), `${s.id} ${cl} ${v}`).toBe(flips);
            if (flips) fired.push(`${s.id} ${cl} ${v}`);
            if (v === 'w') expect(flips).toBe(false);
          }
      // Fable's list on the 2028 data (obr-overlap-fable.md, "Direction
      // chips"): debt/GDP with some foreign capital and GDP and national
      // income with none, for UK central and UK low, and NNI
      if (name === '2028') {
        for (const c of ['uk_central zk0.1 debt_gdp_pp', 'uk_low zk0.1 debt_gdp_pp', 'uk_central zk0 Y', 'uk_low zk0 Y', 'uk_central zk0 GNI', 'uk_low zk0 GNI', 'uk_central zk0.1 NNI', 'uk_low zk0.1 NNI']) expect(fired).toContain(c);
        expect(fired.filter((c) => c.startsWith('korinek'))).toEqual([]);
        // an extension beyond Fable's chip list, on the calendar clock only
        // (Fable's own table has it flip at net 0.4): Explore's debt chip
        expect(fired.filter((c) => c.startsWith('uk_high')).sort()).toEqual(['uk_high zk0 debt_gdp_pp', 'uk_high zk0 tax_gdp_pp']);
      }
    });

    it('national income leads as NNI with GNI beside it; the sign words follow both sides', async () => {
      await pickFile(D);
      const { incomeNotes } = await import('@/tabs/ai/Landing.jsx');
      for (const sid of SIDS)
        for (const cl of CLS) {
          const n = g(D, sid, 'tfp', cl, 'NNI');
          const gn = g(D, sid, 'tfp', cl, 'GNI');
          const inc = incomeNotes(sid, cl);
          if (n == null) {
            expect(inc).toBeNull();
            continue;
          }
          expect(inc.beside.x).toBe(gn);
          expect(inc.tip.includes('Before depreciation (GNI) it is'), `${sid} ${cl}`).toBe(side(gn) !== side(n));
          // never says which is smaller (Fable's note: NNI can exceed GNI)
          expect(inc.tip).not.toMatch(/smaller|less than GNI|below GNI/);
        }
    });

    it('pay caveat: the sign line only where the two cases split; the sensitivity clause only where it is above', async () => {
      await pickFile(D);
      const { payCaveat, paySigns } = await import('@/tabs/story/part2/caveats.js');
      for (const sid of SIDS) {
        const b = g(D, sid, 'tfp', 'zk0', 'w');
        const c = g(D, sid, 'tfp', 'zk0.1', 'w');
        if (b == null || c == null) {
          expect(payCaveat(sid)).toBeNull();
          continue;
        }
        const split = side(b) !== side(c);
        expect(paySigns(sid) === 'flips', sid).toBe(split);
        const sens = D.sensitivity?.['zk0.5']?.results?.[sid]?.tfp;
        const z = sens?.status === 'done' ? sens.gaps.w[D.years.indexOf(D.headline_year)] : null;
        const line = payCaveat(sid);
        if (split) expect(line).toBe('Its sign depends on how much capital comes from abroad.');
        else if (b < -0.005 && c < -0.005) {
          expect(line.startsWith('It stays below the forecast path with or without foreign capital')).toBe(true);
          expect(line.includes('only in a sensitivity'), sid).toBe(z != null && z > 0.005);
          if (z != null && z > 0.005) expect(line).toContain(z < 0.25 ? 'edge above' : 'end above');
        } else expect(line).toBeNull();
      }
    });

    it('debt: the OBR-pace side first, then the model’s, each named where they differ', async () => {
      await pickFile(D);
      const { debtLine } = await import('@/tabs/ai/Landing.jsx');
      for (const sid of SIDS)
        for (const cl of CLS) {
          const d = g(D, sid, 'tfp', cl, 'debt_gdp_pp', D.late_year);
          const line = debtLine(sid, cl);
          if (d == null) {
            expect(line).toBeNull();
            continue;
          }
          const obr = D.results[sid].tfp[cl].debt_gdp_pp_obr_repricing_late;
          expect(line.startsWith(`At the OBR’s repricing pace, public debt ends ${side(obr)} the forecast path in ${D.late_year}`), `${sid} ${cl}`).toBe(true);
          expect(line.includes(`and debt ends ${side(d)} the forecast path`)).toBe(side(obr) !== side(d));
          expect(line).not.toMatch(/\bthe path\b/);
        }
    });

    it('consumption: "stays below … through Y" only for an unbroken run from the shock; the headline value and GDP from gaps', async () => {
      await pickFile(D);
      const { consumptionWords } = await import('@/tabs/ai/Landing.jsx');
      const { fmt } = await import('@/tabs/ai/surprise.js');
      for (const sid of SIDS)
        for (const cl of CLS) {
          const w = consumptionWords(sid, cl);
          if (!done(D, sid, 'tfp', cl)) {
            expect(w).toBeNull();
            continue;
          }
          const ys = D.years.filter((y) => y >= D.surprise_year);
          const cs = ys.map((y) => g(D, sid, 'tfp', cl, 'C', y));
          if (!(cs[0] < -0.005)) {
            expect(w).toBeNull();
            continue;
          }
          let k = 0;
          while (k < cs.length && cs[k] < -0.005) k += 1;
          const end = ys[k - 1];
          expect(w.end, `${sid} ${cl}`).toBe(end);
          expect(w.head).toContain(`${fmt(g(D, sid, 'tfp', cl, 'C'))} in ${D.headline_year}`);
          if (end >= D.headline_year) expect(w.head.startsWith(`Consumption stays below the forecast path through ${end}`)).toBe(true);
          else expect(w.head.startsWith(`Consumption is below the forecast path from ${D.surprise_year} to ${end}, then`)).toBe(true);
          // the reason only with the return on capital up and investment up at the shock
          const why = g(D, sid, 'tfp', cl, 'r_bp') > 0 && g(D, sid, 'tfp', cl, 'I', D.surprise_year) > 0;
          expect(!!w.why).toBe(why);
        }
    });

    it('R3-17: the pay line says "falls slightly in the shock year" only where pay falls in that year alone; consumption never "through" a year it is above', async () => {
      await pickFile(D);
      const { payWords } = await import('@/tabs/story/part2/caveats.js');
      const { consumptionWords } = await import('@/tabs/ai/Landing.jsx');
      for (const sid of SIDS)
        for (const cl of CLS) {
          if (!done(D, sid, 'tfp', cl)) continue;
          const w = g(D, sid, 'tfp', cl, 'w');
          const pg = D.results[sid].tfp[cl].pay_growth_pct;
          const win = D.years.map((y, i) => [y, pg?.[i]]).filter(([y]) => y >= D.surprise_year && y <= D.headline_year).map(([, x]) => x);
          const slight = w < -0.005 && win[0] < 0 && win[0] > -0.5 && win.slice(1).every((x) => x > 0);
          expect(payWords(sid, cl) === `falls slightly in ${D.surprise_year}, then grows more slowly than on the path`, `${sid} ${cl}`).toBe(slight);
          const c = consumptionWords(sid, cl);
          if (c) for (let y = D.surprise_year; y <= c.end; y += 1) expect(g(D, sid, 'tfp', cl, 'C', y), `${sid} ${cl} ${y}`).toBeLessThan(-0.005);
          if (c && c.end < D.years.at(-1)) expect(g(D, sid, 'tfp', cl, 'C', c.end + 1)).toBeGreaterThanOrEqual(-0.005);
        }
      // the two flips round 3 recorded (section D)
      if (name === '2027') {
        expect(payWords('korinek', 'zk0')).toBe(`falls slightly in ${D.surprise_year}, then grows more slowly than on the path`);
        expect(consumptionWords('uk_central', 'zk0.1').end).toBe(D.late_year - 1);
      }
      if (name === '2028') expect(consumptionWords('uk_central', 'zk0.1').end).toBe(D.late_year);
    });

    it('the shock is defined with UK central’s two inputs, from the data', async () => {
      await pickFile(D);
      const { render } = await import('@testing-library/react');
      const { shockDefinition } = await import('@/tabs/story/part2/steps.jsx');
      const s = D.scenarios.find((x) => x.id === 'uk_central');
      const { container, unmount } = render(<p>{shockDefinition()}</p>);
      expect(container.textContent).toContain(`the labour share falls ${s.labour_share_fall_pp.toFixed(1)}pp and output at given inputs rises ${s.tfp_gain_pct.toFixed(1)}%`);
      expect(container.textContent).toContain(`from ${D.surprise_year} to ${D.headline_year}`);
      unmount();
    });
  });
}

describe('what the gain is made of (Maria’s point 4; item-18 “All 12 cells”, item 21)', () => {
  // the scene's cell: some foreign capital, debt-neutral transfers, main version
  const c = CO.closures['zk0.1'].rules.dn.tfp;
  const min = Math.min(...c.cev_all);
  it('"every birth year gains" only with the smallest change at least 0.005%; "mostly bequests" and "consumption changes little" each gated', async () => {
    const { gainWords, whoAnswer, whoNote, debtRuleYear } = await import('@/tabs/story/part2/steps.jsx');
    const w = gainWords();
    expect(w.state).toBe(min >= 0.005 ? 'gain' : min < 0 ? 'loss' : null);
    if (min >= 0.005) {
      // the title states "every birth year gains"; the closing line says it
      // only where it has nothing on what the gain is made of (R4-07)
      const beq = c.parts_alive.bequests / c.alive_avg > 0.5;
      expect(w.text.startsWith('Every birth year gains on average as modelled')).toBe(!beq);
      expect(w.text.includes('Most of the gain is the value the model puts on bequests')).toBe(beq);
      expect(w.text.includes('consumption changes little')).toBe(c.parts_alive.bequests / c.alive_avg > 0.5 && Math.abs(c.parts_alive.consumption) / c.alive_avg < 0.2);
    }
    // "from 2036", the year after the last charged year (item 21, row 4)
    const yr = Math.max(...Object.keys(c.c_gap).map(Number)) + 1;
    expect(debtRuleYear()).toBe(yr);
    expect(whoNote().startsWith(`From ${yr} the cost falls on government consumption, which model households do not value`)).toBe(true);
    // "about one in six" (Maria's point 4), from dnfull's lower losing share
    if (CO.dnfull?.ready && CO.dnfull.closure === 'zk0.1') expect(whoNote()).toMatch(/; if transfers bear it, about one in \w+ adults lose\.$/);
    expect(whoAnswer().split(/\s+/).length).toBeLessThanOrEqual(25);
    expect(whoAnswer()).not.toMatch(/fewer hours|after \d{4}/);
  });
  it('the gate over all 12 cells matches item 18’s count (7 gain, 5 loss on the 2028 cohorts)', () => {
    let gain = 0;
    let loss = 0;
    for (const cl of ['zk0.1', 'zk0'])
      for (const rule of ['dn', 'common'])
        for (const arm of ['tfp', 'zfixed', 'stress']) {
          const m = Math.min(...CO.closures[cl].rules[rule][arm].cev_all);
          if (m >= 0.005) gain += 1;
          else if (m < 0) loss += 1;
        }
    if (CO.shock_year === 2028) expect([gain, loss]).toEqual([7, 5]);
  });
  it('p2-who-0: "around retirement age" for a peak at 60–70; "older adults hold more wealth" only with wealth above the adult mean there', async () => {
    const { render } = await import('@testing-library/react');
    const { whoLead } = await import('@/tabs/story/part2/steps.jsx');
    const { peakAge } = await import('@/tabs/story/part2/charts.jsx');
    const { wealthRatioAt } = await import('@/lib/dataKeys.js');
    const age = peakAge();
    const { container, unmount } = render(<p>{whoLead()}</p>);
    const t = container.textContent;
    expect(t.startsWith(age >= 60 && age <= 70 ? 'Gains are largest around retirement age' : `Gains are largest around age ${age}`)).toBe(true);
    expect(t.includes('older adults hold more wealth')).toBe((wealthRatioAt(CO.closures['zk0.1'], age) ?? 0) > 1);
    expect(t.includes('earn the higher return on it')).toBe((wealthRatioAt(CO.closures['zk0.1'], age) ?? 0) > 1 && c.sources_alive.capital > 0);
    // never a wealth peak
    expect(t).not.toMatch(/most wealth|wealth peaks|peak wealth/);
    if (CO.shock_year === 2028) expect(t).toBe('Gains are largest around retirement age; older adults hold more wealth and earn the higher return on it.');
    unmount();
  });
});
