import { describe, it, expect } from 'vitest';
import S from '@/data/surprise2028.json';
import { debtTitle, taxTitle, debtMoreInfo, taxMoreInfo, debtWhy, taxWhy } from '@/tabs/ai/financesInfo.js';

// Item 17: each More info sentence is gated on the data's signs for the
// rule and closure shown (public-finances-moreinfo-fable.md). Expected
// sides are read straight from the JSON here, not from the builders.
const Y = S.years;
const H = S.headline_year;
const L = S.late_year;
const SY = S.surprise_year;
const ARMS = ['tfp', 'tz', 'ss'];
const NAME = Object.fromEntries(S.arms.map((a) => [a.id, a.short || a.label]));
const RK = { dn: 'debt_neutral', fixed: 'fixed_spending' };
const rec = (sid, arm, cl, rule) => (RK[rule] ? S.rules[RK[rule]].results?.[sid]?.[arm]?.[cl] : S.results[sid][arm][cl]);
const g = (sid, arm, cl, v, year, rule) => {
  const r = rec(sid, arm, cl, rule);
  return r?.status === 'done' ? r.gaps[v][Y.indexOf(year)] : null;
};
const sideOf = (x) => (Math.abs(x) < 0.005 ? 'on' : x > 0 ? 'above' : 'below');
const SIDS = S.scenarios.map((s) => s.id);
const solved = (sid, rule) => !RK[rule] || S.rules[RK[rule]].scenarios.includes(sid);
const text = (items, key) => items.find((i) => i.key === key)?.text;

describe('item 17: Public finances More info', () => {
  for (const sid of SIDS)
    for (const rule of ['common', 'fixed', 'dn'])
      for (const closure of ['central', 'closed', 'both']) {
        if (!solved(sid, rule)) continue;
        const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
        it(`${sid}, ${rule}, ${closure}`, () => {
          const why = debtWhy(sid, closure, rule);
          // 2.3 only under the common rule
          expect(why.some((i) => /^s\d/.test(i.key))).toBe(rule === 'common');
          if (rule === 'common') {
            const s3 = text(why, 's3');
            for (const a of ARMS) {
              const x = g(sid, a, cl, 'debt_gdp_pp', H, rule);
              const nm = a === 'ss' ? `the ${NAME[a]}` : NAME[a];
              if (sideOf(x) === 'below') expect(s3.split('below the path')[0]).toContain(nm);
            }
            const s4 = text(why, 's4');
            const obr = rec(sid, 'tfp', cl, rule).debt_gdp_pp_obr_repricing_late;
            expect(s4).toContain(`${Math.abs(obr).toFixed(1)}pp ${sideOf(obr)} the path in ${NAME.tfp}`);
            for (const a of ['tz', 'ss']) {
              const o = rec(sid, a, cl, rule).debt_gdp_pp_obr_repricing_late;
              if (sideOf(o) !== sideOf(obr)) expect(s4).toContain(`${Math.abs(o).toFixed(1)}pp ${sideOf(o)}`);
            }
            // 5: the model figure names its side where it differs from the OBR pace
            const s5 = text(why, 's5');
            const late = rec(sid, 'tfp', cl, rule).gaps.debt_gdp_pp[Y.indexOf(S.late_year)];
            if (sideOf(late) !== sideOf(obr)) expect(s5).toContain(`${Math.abs(late).toFixed(1)}pp ${sideOf(late)} the path`);
            else expect(s5).toContain(`gives ${Math.abs(late).toFixed(1)}pp (`);
            // 2: "tax/GDP is lower" only if it is below the path in every
            // year the sentence covers, in every version
            const s2 = text(why, 's2');
            if (s2) {
              const from = /^From (\d{4})/.exec(s2)?.[1] ? Number(/^From (\d{4})/.exec(s2)[1]) : SY;
              const yrs = Y.filter((y) => y >= from && y <= S.late_year);
              const low = ARMS.every((a) => yrs.every((y) => sideOf(g(sid, a, cl, 'tax_gdp_pp', y, rule)) === 'below'));
              expect(s2.includes('tax/GDP is lower')).toBe(low && ARMS.every((a) => yrs.every((y) => g(sid, a, cl, 'r_bp', y, rule) > 0)));
            }
            // 1: every version's first-year side
            const s1 = text(why, 's1');
            const first = new Set(ARMS.map((a) => sideOf(g(sid, a, cl, 'debt_gdp_pp', SY, rule))));
            if (first.size === 1) expect(s1).toContain(`${[...first][0]} the path in all three versions`);
          }
          // 2.4 only with some foreign capital
          const tw = taxWhy(sid, closure, rule);
          if (closure !== 'central') expect(tw.map((i) => i.key)).toEqual(['closed']);
          else {
            const every = ARMS.every((a) => Y.filter((y) => y >= SY).every((y) => sideOf(g(sid, a, cl, 'tax_gdp_pp', y, rule)) === 'below'));
            expect(tw.some((i) => i.key === 't1')).toBe(every);
            const t = ARMS.map((a) => ({ a, x: g(sid, a, cl, 'tax_gdp_pp', H, rule) })).sort((p, q) => Math.abs(p.x) - Math.abs(q.x));
            const t4 = text(tw, 't4');
            if (t4) {
              expect(t4.indexOf(NAME[t[0].a])).toBeLessThan(t4.indexOf(NAME[t[2].a]));
            }
            const cLow = ARMS.every((a) => g(sid, a, cl, 'C', H, rule) < g(sid, a, cl, 'Y', H, rule));
            expect(tw.some((i) => i.key === 't3')).toBe(cLow);
          }
          // no year typed: every year printed is one of the data's
          const all = [...debtMoreInfo(sid, closure, rule), ...taxMoreInfo(sid, closure, rule)].flatMap((gr) => gr.items.map((i) => `${i.head ?? ''} ${i.text}`)).join(' ');
          for (const yr of all.match(/\b20\d\d\b/g) ?? []) expect([...Y, 2030, 2026].includes(Number(yr))).toBe(true);
          // the titles: one sentence each, with the late (debt) year
          const dt = debtTitle(sid, closure, rule);
          expect(dt).toMatch(new RegExp(String(rule === 'dn' ? SY + 1 : L)));
          expect(taxTitle(sid, closure, rule)).toContain(String(H));
        });
      }
});
