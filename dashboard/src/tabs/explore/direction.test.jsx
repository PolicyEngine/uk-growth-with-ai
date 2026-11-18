// Every direction icon on Explore follows the sign of its value under the
// scenario, closure and fiscal rule picked (and, on Who gains, its own rule
// and arm). The expected icon is computed here from the raw data with its
// own threshold, not with the helper the pages use.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import S from '@/lib/activeData.js';
import CO from '@/data/cohorts2028.json';
import { NavProvider } from '@/lib/nav.jsx';
import ResultsTab from '@/tabs/ai/ResultsTab.jsx';
import { economyAnswer, financesAnswer } from '@/tabs/explore/answers.js';
import { debtParts } from '@/tabs/ai/FinancesSection.jsx';
import { stressItems } from '@/tabs/ai/Headline.jsx';
import { whySigns } from '@/tabs/cohorts/CohortsTab.jsx';
import WhoGainsTab from '@/tabs/cohorts/CohortsTab.jsx';
import { sensClaims } from '@/tabs/explore/SensitivityTable.jsx';
import { ruleSolved } from '@/tabs/ai/surprise.js';

afterEach(cleanup);

const SCEN = S.scenarios.map((s) => s.id);
const CLOSURES = ['central', 'closed', 'both'];
const RULES = ['common', 'fixed', 'dn'];
const RULE_KEY = { fixed: 'fixed_spending', dn: 'debt_neutral' };
const H = S.years.indexOf(S.headline_year);
const L = S.years.indexOf(S.late_year);
const raw = (sid, arm, cl, rule) => (rule === 'common' ? S.results : S.rules[RULE_KEY[rule]].results)[sid]?.[arm]?.[cl];
const val = (sid, arm, cl, v, rule, k = H) => {
  const r = raw(sid, arm, cl, rule);
  return r?.status === 'done' ? r.gaps[v][k] : null;
};
const want = (x) => (x > 0.005 ? 'gapUp' : x < -0.005 ? 'gapDown' : 'onPath');
const word = (x) => (x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on');
const dataDir = (x) => (x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on');
const clOf = (closure) => (closure === 'closed' ? 'zk0' : 'zk0.1');

const at = (query) => {
  window.history.replaceState(null, '', `/?${query}`);
  return render(
    <NavProvider>
      <ResultsTab />
    </NavProvider>,
  );
};

describe('the answer chips that open Economy and Public finances', () => {
  for (const sid of SCEN)
    for (const closure of CLOSURES)
      for (const rule of RULES)
        it(`${sid}, ${closure}, ${rule}`, () => {
          const cl = clOf(closure);
          for (const [fn, vars] of [
            [economyAnswer, ['Y', 'GNI', 'w']],
            [financesAnswer, ['debt_gdp_pp', 'tax_gdp_pp']],
          ]) {
            const items = fn(sid, closure, rule);
            if (typeof items === 'string') {
              // not solved: a sentence, no icon
              expect(vars.some((v) => val(sid, 'tfp', cl, v, rule) == null)).toBe(true);
              continue;
            }
            const rows = items.chips;
            expect(rows).toHaveLength(vars.length);
            rows.forEach((r, i) => {
              const x = val(sid, 'tfp', cl, vars[i], rule);
              expect(r.dir, `${vars[i]} ${x}`).toBe(want(x));
              expect(r.word).toContain(word(x));
              // colour: gain above / loss below for income and output, neutral for debt and tax
              const tone = ['Y', 'GNI', 'w'].includes(vars[i]) && word(x) !== 'on' ? (x > 0 ? 'gain' : 'loss') : null;
              expect(r.tone).toBe(tone);
            });
            // the no-foreign-capital chip (Both): each named measure is on the other side with no foreign capital
            if (closure === 'both' && items.closed)
              items.closed.values.forEach((x) => expect(vars.some((v) => word(val(sid, 'tfp', 'zk0.1', v, rule)) !== word(x))).toBe(true));
            // the why: labour share's arrow and the pay words follow its sign
            if (fn === economyAnswer && items.why) {
              const ls = val(sid, 'tfp', cl, 'labour_share_pp', rule);
              expect(items.why[0].dir).toBe(ls);
              expect(items.why[0].text).toContain({ above: '↑', below: '↓', on: 'unchanged' }[word(ls)]);
              expect(items.why[1].text).toBe(ls < -0.005 ? 'pay grows less than output' : ls > 0.005 ? 'pay grows more than output' : 'pay keeps pace with output');
            }
          }
        });
});

describe('the cards’ inline arrows', () => {
  for (const sid of SCEN)
    for (const closure of CLOSURES)
      for (const rule of RULES)
        it(`debt/GDP and the four measures: ${sid}, ${closure}, ${rule}`, () => {
          const cl = clOf(closure);
          const { container, unmount } = at(`tab=explore&sub=finances&s=${sid}&closure=${closure}&rule=${rule}`);
          // item 17: the finding is the card's title, with no arrows; its
          // side words follow every version's late-year sign
          const title = container.querySelector('#debt-gdp .card-head h3')?.textContent ?? '';
          const p = debtParts(sid, closure, rule);
          const a = val(sid, 'tfp', cl, 'debt_gdp_pp', rule);
          const b = val(sid, 'tfp', cl, 'debt_gdp_pp', rule, L);
          // not solved: no card under a rule not solved for the scenario; a
          // card that says so (and prints no figure) for a pending cell
          if (a == null || b == null) {
            const card = container.querySelector('#debt-gdp');
            if (!ruleSolved(rule, sid)) expect(card).toBeNull();
            else {
              expect(card.textContent).toMatch(/not solved/);
              expect(card.querySelector('.card-head h3')?.textContent ?? '').not.toMatch(/\d\.\d/);
            }
          }
          else {
            const cls = closure === 'both' ? ['zk0.1', 'zk0'] : [cl];
            const sides = new Set(cls.flatMap((c) => ['tfp', 'tz', 'ss'].map((arm) => dataDir(val(sid, arm, c, 'debt_gdp_pp', rule, L)))));
            if (rule === 'dn' && sides.size === 1 && sides.has('on')) expect(title).toContain('stays on the path');
            else if (sides.size === 1) expect(title).toContain(`is ${[...sides][0]} the path`);
            else expect(title).toMatch(/except in|depends on/);
            // at the OBR's repricing speed: the arrow follows that value's sign
            const obr = raw(sid, 'tfp', cl, 'common')?.debt_gdp_pp_obr_repricing_late;
            if (p?.obr != null) expect(p.obr).toBe(obr);
          }
          unmount();
          // the four-measure card: the pay rate (and GNI) arrows, when every arm shown is on one side
          const inc = at(`sub=income&s=${sid}&closure=${closure}&rule=${rule}`);
          const md = [...inc.container.querySelectorAll('#measures .card-finding [data-dir]')].map((e) => e.dataset.dir);
          const sides = (v) => [...new Set(['tfp', 'tz', 'ss'].map((arm) => val(sid, arm, cl, v, rule)).filter((x) => x != null).map(dataDir))];
          const exp = [sides('w'), sides('GNI')].filter((s) => s.length === 1).map((s) => s[0]);
          if (val(sid, 'tfp', cl, 'w', rule) != null || sides('w').length) expect(md).toEqual(exp);
          inc.unmount();
        });
});

describe('the stress-test items', () => {
  for (const sid of SCEN)
    it(sid, () => {
      const items = stressItems(sid);
      for (const [key, cl] of [['c', 'zk0.1'], ['b', 'zk0']]) {
        const s = S.results[sid].ss[cl];
        const t = S.results[sid].tz[cl];
        const item = items.find((i) => i.key === key);
        if (s.status !== 'done' || t.status !== 'done') expect(item).toBeUndefined();
        else {
          expect(item.icon).toBe(s.Z_terminal < t.Z_terminal ? 'gapDown' : 'gapUp');
          expect(item.text).toContain(s.Z_terminal < t.Z_terminal ? 'fall' : 'rise');
        }
      }
    });
});

describe('Who gains: what drives the result, every claim from the signs', () => {
  const SARM = { tfp: 'tfp', zfixed: 'tz', stress: 'ss' };
  for (const cl of ['zk0.1', 'zk0'])
    for (const rule of ['common', 'dn'])
      for (const arm of ['tfp', 'zfixed', 'stress'])
        it(`${cl}, ${rule}, ${arm}`, () => {
          const x = whySigns(cl, rule, arm);
          const r = val('uk_central', SARM[arm], cl, 'r_bp', rule);
          const w = val('uk_central', SARM[arm], cl, 'w', rule);
          const c = CO.closures[cl].rules[rule][arm];
          const c0 = c.c_gap[String(CO.shock_year)];
          if (r != null) expect(Math.sign(x.r)).toBe(Math.sign(r));
          if (w != null) expect(x.w).toBe(w);
          expect(x.c0).toBe(c0);
          // rendered: block A's lead and line follow the sign of the shock-year gap
          window.history.replaceState(null, '', `/?tab=explore&sub=who&closure=${cl === 'zk0' ? 'closed' : 'central'}&rule=${rule}&arm=${arm}`);
          const { container, unmount } = render(
            <NavProvider>
              <WhoGainsTab />
            </NavProvider>,
          );
          const boxes = [...container.querySelectorAll('.ex-why2 > .finding')];
          expect(boxes).toHaveLength(4);
          const [A, , , Dbox] = boxes;
          const lead = A.querySelector('.finding-lead').textContent;
          if (c0 < 0) expect(lead).toMatch(c.first_year_c_above ? /falls below the forecast path first, then rises above it/ : /stays below the forecast path/);
          else expect(lead).toContain('starts above the forecast path');
          if (c.first_year_c_above) expect(A.textContent).toContain(`above the forecast path from ${c.first_year_c_above}`);
          // the line's two ends: the first and last years of c_gap
          const ys = Object.keys(c.c_gap).map(Number);
          expect([...A.querySelectorAll('.ex-cl-year')].map((e) => Number(e.textContent))).toEqual([Math.min(...ys), Math.max(...ys)]);
          // block D: the youngest adult and age 65 in the stress test
          const xs = CO.closures[cl].birth_year;
          const s = CO.closures[cl].rules[rule].stress;
          const young = s.cev_all[xs.indexOf(CO.shock_year - 20)];
          const vals = [...Dbox.querySelectorAll('.ex-bars2-val')];
          expect(vals[0].className).toContain(dataDir(young) === 'above' ? 'is-gain' : dataDir(young) === 'below' ? 'is-loss' : 'ex-bars2-val');
          expect(Dbox.querySelector('.finding-lead').textContent).toContain(young < 0 ? 'the youngest adults lose' : 'gain least');
          unmount();
        });
});

describe('the sensitivity card', () => {
  it('each claim’s icon follows the comparison in every scenario', () => {
    const res = S.sensitivity['zk0.5'].results;
    // the scenarios solved at both closures; none (the partial 2027 export)
    // means no claim at all
    const SCEN = S.scenarios.map((s) => s.id).filter((sid) => res[sid]?.tfp?.status === 'done' && S.results[sid].tfp['zk0.1'].status === 'done');
    if (!SCEN.length) {
      expect(sensClaims(res)).toEqual([]);
      return;
    }
    const claims = Object.fromEntries(sensClaims(res).map((c) => [c.key, c]));
    const diffs = (v) => SCEN.map((sid) => res[sid].tfp.gaps[v][H] - S.results[sid].tfp['zk0.1'].gaps[v][H]);
    for (const v of ['K', 'Y']) {
      const d = diffs(v);
      const exp = d.every((x) => x > 0.005) ? 'gapUp' : d.every((x) => x < -0.005) ? 'gapDown' : 'compare';
      expect(claims[v.toLowerCase()].icon).toBe(exp);
    }
    const w = SCEN.map((sid) => res[sid].tfp.gaps.w[H]);
    // item 42: when every main-version pay rate is above the path (and was
    // below it at zeta_K 0.1) the title says so and the claim is dropped
    const wc = SCEN.map((sid) => S.results[sid].tfp['zk0.1'].gaps.w[H]);
    if (w.every((x) => x > 0.005) && wc.every((x) => x < -0.005)) expect(claims.w).toBeUndefined();
    else expect(claims.w.icon).toBe(w.some((x) => x < -0.005) ? 'gapDown' : w.some((x) => x > 0.005) ? 'gapUp' : 'onPath');
    expect(claims.gni.icon).toBe(SCEN.every((sid) => res[sid].tfp.gaps.GNI[H] < res[sid].tfp.gaps.Y[H]) ? 'foreign' : 'gni');
  });
});
