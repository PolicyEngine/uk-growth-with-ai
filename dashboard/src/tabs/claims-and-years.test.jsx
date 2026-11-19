// The swap's browser-free probe (consolidated-design-fable.md section 6, row
// "No typed years or keys; claims probe"). Lane C0 owns anatomy.test.jsx;
// this file is C1's.
//   1. No year-suffixed data key or data file name outside lib/dataKeys.js.
//   2. No year literal in page code outside the constants, except the
//      allowlist below (file + exact phrase + reason), so a new typed year
//      in an allowlisted file still fails.
//   3. Claims probe, on BOTH data files whatever the flag: each gated claim
//      prints only where its condition holds, the condition computed here
//      from the raw data, not with the page's helper.
//   4. A cell not solved prints "not yet solved" (or a not-solved card),
//      never a figure, on both files.
// Counts above zero are compared with scripts/ratchet-baselines.json.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import S2028 from '@/data/surprise2028.json';
import S2027 from 'ugai-surprise2027'; // null unless the 2027 run has its file (R4-16)
import { typedYears, yearKeys, yearArithmetic, mixedLines, typedYearsWide } from '@/lib/sourceScan.js';
import BASE from '../../scripts/ratchet-baselines.json';
import { recordCount } from '@/lib/probeTestUtils.jsx';

afterEach(cleanup);
// whole pages render here; under a loaded machine 5s is too short
vi.setConfig({ testTimeout: 60000 });

// ---- 1 and 2: the source scan -------------------------------------------

// Year phrases that do not move with the shock: publication vintages and
// dated notes ("March 2026", "15 Nov 2026"), citations ("(2026)"), and the
// named fixed years. Each is a phrase form, not a bare year.
const FIXED_FORMS = [
  [/\b(?:\d{1,2} )?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) 2026\b/g, 'a publication vintage or a dated note'],
  [/\(2026\)/g, 'a citation year'],
  [/\b2030 debt(?:\/GDP)?\b/g, 'the OBR debt target year, fixed (rerun.py)'],
];
// file + exact phrase + reason
const ALLOW = [
  ['lib/dataFlag.js', "const KNOWN = ['2028', '2027'];", 'the flag values'],
  ['lib/dataFlag.js', "? '2027' : String(raw)", 'the default data set (2027 since the swap)'],
  ['lib/dataKeys.js', 'const COHORTS_BY_YEAR = { 2028: CO2028, 2027: CO2027 };', 'each set’s cohort file'],
  ['lib/dataKeys.js', 'export const VERSIONS = S.surprise_year === 2028 ? V2028 : {', 'the 2028 set’s versions file names its own solves'],
  ['lib/dataKeys.js', 'const METHOD_FACTS_BY_YEAR = { 2028: MF2028, 2027: MF2027 };', 'each set’s method facts'],
  ['lib/dataKeys.js', 'export const NICS = { 2028: NICS2028, 2027: NICS2027 }', 'each set’s NICs measure'],
  ['lib/activeData.js', 'const FILES = { 2028: S2028, 2027: S2027 };', 'the data-file table'],
  ['lib/dataKeys.js', '2028: {', 'the per-set table'],
  ['lib/dataKeys.js', '2027: {', 'the per-set table'],
  ['lib/dataKeys.js', 'SETS[2028]', 'the 2028 set is the fallback'],
  ['lib/dataKeys.js', 'const SURPRISE_BY_YEAR = { 2028: S2028, 2027: S2027 };', 'the surprise file of each cohort year (R2-03)'],
  ['components/ab/SiteFooter.jsx', '&copy; 2026 PolicyEngine', 'the copyright year'],
  ['tabs/ai/financesInfo.js', 'export const OGUK_TG1_YEAR = 2030;', 'a fixed model default (R1-23: stays)'],
  ['tabs/code/history.js', "'AI becomes an unanticipated 2028 shock from one 2027 start. Headline year 2031.'", 'a dated history entry: the 12 Nov design'],
  ['tabs/code/CodeTab.jsx', 'start_date=datetime(2026, 1, 1)', 'the OG-UK API example'],
  ['tabs/code/CodeTab.jsx', 'start_year=2026', 'the OG-UK API example'],
  ['tabs/code/pipeline.js', 'the committed 2026-start secant', 'the R1-R4 rerun, a fixed past run'],
  ['tabs/literature/RelatedWork.jsx', '</span> in 2030.', 'the Budget Lab’s own year'],
  ['tabs/method/inputs.js', 'a US case for 2030', 'Korinek et al.’s own year'],
  ['tabs/method/inputs.js', 'measured TFP +3.1% in 2030', 'Korinek et al.’s own year'],
  ['tabs/method/sources.js', 'IMF 2026 Article IV', 'a publication'],
  ['tabs/method/sources.js', 'The Pink Book: 2026', 'a publication'],
  ['tabs/method/ScenarioMap.jsx', '(FRS 2026, Box 4.1)', 'a publication'],
  ['tabs/method/sources.js', 'surpriseYear: DATA_SET === 2028 ?', 'the 2028 set names its year in surprise.py; another set in driver.sh (R3-16)'],
  ['tabs/story/TwoLenses.jsx', 'Doorley et al. (2026)', 'a citation'],
  ['lib/obrOverlap.js', 'export const OBR_YEAR_ONE = 2026;', 'the OBR’s year 1 in BP9 Chart B.4: a property of the source (M1, overlap)'],
];

const unallowed = () =>
  typedYears().filter((h) => {
    let t = h.text;
    for (const [re] of FIXED_FORMS) t = t.replace(re, (m) => m.replace(/20\d\d/, 'YYYY'));
    if (!new RegExp(`(?<![\\d.\\w/-])${h.year}(?![\\d\\w])`).test(t)) return false;
    return !ALLOW.some(([f, phrase]) => h.file === f && h.text.includes(phrase));
  });

const within = (name, n) => {
  recordCount(name, n);
  const b = BASE.probes[name]?.baseline;
  expect(n, `${name}: ${n} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
};

// Year arithmetic: file + expression + what it means. Anything else
// (an off-by-one such as SURPRISE_YEAR + 1 where the shock year is meant,
// R2-01) is counted against probes.year_arithmetic_unnamed.
const ARITH = [
  ['lib/labels.js', 'SURPRISE_YEAR + 1', 'debt is on the path from the year after the shock: transfers at t set debt at t+1'],
  ['lib/labels.js', 'LATE_YEAR - 1', 'the last year transfers adjust, before the debt rule'],
  ['tabs/ai/financesInfo.js', 'SURPRISE_YEAR + 1', 'debt on the path from the year after the shock'],
  ['tabs/ai/FinancesSection.jsx', 'SURPRISE_YEAR + 1', 'the debt-neutral lead: debt on the path from the year after the shock (R2-01, push B 19cf757; the transfers line has no year)'],
  ['tabs/method/inputs.js', 'SURPRISE_YEAR + 1', 'debt on the path from the year after the shock'],
  ['tabs/ai/surprise.js', 'SURPRISE_YEAR + 1', 'RAMP_STEPS: years from the shock to the headline year, inclusive'],
  ['tabs/story/Hero.jsx', 'SURPRISE_YEAR + 1', 'YEARS_ON: the same inclusive count'],
  ['tabs/story/part2/charts.jsx', 'SURPRISE_YEAR + 1', 'the same inclusive count'],
  ['tabs/ai/Landing.jsx', 'SURPRISE_YEAR + 1', '"years on": the same inclusive count'],
  ['tabs/cohorts/CohortsTab.jsx', 'shockYear - 20', 'the youngest adult alive at the shock is 20'],
  ['tabs/story/part2/charts.jsx', 'shock_year - 20', 'the same: LAST_ALIVE'],
  ['tabs/cohorts/CohortsTab.jsx', 'lastFlowYear + 1', 'the debt rule starts the year after the last flow year'],
  ['tabs/method/ScenariosSection.jsx', 'HEADLINE_YEAR - 1', 'the ramp years before full weight'],
  ['tabs/story/Hero.jsx', 'LATE_YEAR - 2', 'where the UK-range label sits (layout only)'],
  ['tabs/story/part2/Morph.jsx', 'SURPRISE_YEAR - 2', 'a fallback used only when the ONS record is empty'],
];

describe('no typed years or keys', () => {
  it('every piece of year arithmetic is named with its meaning', () => {
    const hits = yearArithmetic().filter((h) => !ARITH.some(([f, e]) => h.file === f && h.expr === e));
    if (hits.length) console.warn('year arithmetic not named:', hits.map((h) => `${h.file}:${h.line} ${h.expr} | ${h.text.slice(0, 100)}`));
    within('year_arithmetic_unnamed', hits.length);
    for (const [f, e] of ARITH) expect(yearArithmetic().some((h) => h.file === f && h.expr === e), `stale: ${f} ${e}`).toBe(true);
  });
  it('no source line builds a cohort sentence from an active-set year (R2-03)', () => {
    const hits = mixedLines();
    if (hits.length) console.warn('mixed lines:', hits);
    within('mixed_cohort_years', hits.length);
  });
  it('no year-suffixed data key or data file name outside lib/dataKeys.js', () => {
    const hits = yearKeys();
    if (hits.length) console.warn('year keys:', hits);
    within('year_keys', hits.length);
  });
  it('no year literal in page code outside the constants and the allowlist', () => {
    const hits = unallowed();
    if (hits.length) console.warn('typed years:', hits.map((h) => `${h.file}:${h.line} ${h.year} ${h.text.slice(0, 100)}`));
    within('typed_years', hits.length);
  });
  it('every allowlist entry still matches a line (no stale exemptions)', () => {
    const all = typedYears();
    for (const [f, phrase] of ALLOW) expect(all.some((h) => h.file === f && h.text.includes(phrase)), `${f}: ${phrase}`).toBe(true);
  });
});

// ---- 3 and 4: on both data files ------------------------------------------

// the 2027 file only when it is loaded (R4-16)
const FILES = Object.fromEntries(Object.entries({ 2028: S2028, 2027: S2027 }).filter(([, D]) => D));
// The partial 2027 file the pending checks were written against (UK low
// and UK high, every rule and zeta_K 0.5 not solved), rebuilt from the full
// file so the pending checks stay live after the swap.
const partialOf = (D) => {
  const F = JSON.parse(JSON.stringify(D));
  for (const sid of ['uk_low', 'uk_high']) for (const a of ['tfp', 'tz', 'ss']) for (const cl of ['zk0.1', 'zk0']) F.results[sid][a][cl] = { status: 'pending' };
  for (const r of Object.values(F.rules ?? {})) for (const by of Object.values(r.results ?? {})) for (const a of Object.keys(by)) for (const cl of Object.keys(by[a])) by[a][cl] = { status: 'pending' };
  for (const sc of Object.values(F.sensitivity ?? {})) for (const by of Object.values(sc.results ?? {})) for (const a of Object.keys(by)) by[a] = { status: 'pending' };
  for (const sid of ['uk_low', 'uk_high']) if (F.output_split?.change?.[sid]) for (const cl of Object.keys(F.output_split.change[sid])) F.output_split.change[sid][cl] = { status: 'pending' };
  F.solves_done = 12;
  return F;
};
const WITH_PARTIAL = S2027 ? { ...FILES, 'partial-2027': partialOf(S2027) } : FILES;
const noAxis = (el) => {
  let t = '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement?.closest('[data-axis]')) t += n.textContent;
  return t;
};
const pickFile = async (D) => {
  vi.resetModules();
  vi.doMock('@/lib/activeData.js', () => ({ default: D }));
};
const done = (D, sid, arm, cl) => D.results[sid]?.[arm]?.[cl]?.status === 'done';
const g = (D, sid, arm, cl, v, y) => (done(D, sid, arm, cl) ? D.results[sid][arm][cl].gaps[v][D.years.indexOf(y)] : null);

for (const [name, D] of Object.entries(FILES)) {
  describe(`claims probe, surprise${name}.json`, () => {
    it('the GDP scene’s closing line claims "every scenario" only when it holds in every one', async () => {
      await pickFile(D);
      const { morphAnswer, MORPH_FALLBACK } = await import('@/tabs/story/part2/steps.jsx');
      const from = D.years.indexOf(D.surprise_year) + 1;
      const holds = D.scenarios.every((s) => done(D, s.id, 'tfp', 'zk0.1') && done(D, s.id, 'tfp', 'zk0') && D.results[s.id].tfp['zk0.1'].gaps.Y.slice(from).every((v, i) => D.results[s.id].tfp.zk0.gaps.Y[from + i] < v));
      expect(morphAnswer('zk0.1') !== MORPH_FALLBACK).toBe(holds);
    });
    it('"slower growth, not a cut" only where pay is below the path and rises every year', async () => {
      await pickFile(D);
      const { payLine } = await import('@/tabs/ai/surprise.js');
      for (const s of D.scenarios)
        for (const cl of ['zk0.1', 'zk0']) {
          const w = g(D, s.id, 'tfp', cl, 'w', D.headline_year);
          const line = payLine(s.id, cl);
          if (w == null) {
            expect(line).toBeNull();
            continue;
          }
          const pg = D.results[s.id].tfp[cl].pay_growth_pct;
          const rises = Array.isArray(pg) && D.years.every((y, i) => y < D.surprise_year || y > D.headline_year || pg[i] > 0);
          expect(line === 'slower growth, not a cut', `${s.id} ${cl}`).toBe(w < -0.005 && rises);
        }
    });
    it('consumption "below the forecast path through" the late year only when it is', async () => {
      await pickFile(D);
      const { belowThrough } = await import('@/tabs/explore/caveats.js');
      const c = D.results.uk_central.tfp['zk0.1'].gaps.C;
      const holds = D.years.filter((y) => y >= D.surprise_year).every((y) => c[D.years.indexOf(y)] < 0);
      expect(belowThrough('uk_central', 'zk0.1') === D.late_year).toBe(holds);
    });
    it('the zeta_K 0.5 title and claims say "every scenario" only with every scenario solved', async () => {
      await pickFile(D);
      const { sensTitle, sensClaims } = await import('@/tabs/explore/SensitivityTable.jsx');
      const res = D.sensitivity['zk0.5'].results;
      const all = D.scenarios.every((s) => res[s.id]?.tfp?.status === 'done' && done(D, s.id, 'tfp', 'zk0.1'));
      if (!all) {
        expect(sensTitle(res)).toBe('Gaps with much more foreign capital');
        expect(sensClaims(res)).toEqual([]);
      }
      // a partial copy of a complete file: one scenario pending
      const part = JSON.parse(JSON.stringify(res));
      part[D.scenarios[0].id].tfp = { status: 'pending' };
      expect(sensTitle(part)).toBe('Gaps with much more foreign capital');
      expect(sensClaims(part)).toEqual([]);
    });
    it('the wage-sign lines appear only when the sign differs across closures', async () => {
      await pickFile(D);
      const { wageClosureLines } = await import('@/tabs/explore/caveats.js');
      const H = D.years.indexOf(D.headline_year);
      const ws = [D.results.uk_central.tfp.zk0, D.results.uk_central.tfp['zk0.1'], D.sensitivity['zk0.5'].results.uk_central.tfp].filter((r) => r?.status === 'done').map((r) => r.gaps.w[H]);
      const sides = new Set(ws.map((x) => (x > 0.005 ? 'above' : x < -0.005 ? 'below' : 'on')));
      expect(wageClosureLines('uk_central') != null).toBe(ws.length > 1 && sides.size > 1);
    });
    it('a cell not solved prints "not yet solved" or a not-solved card, never a figure', async () => {
      await pickFile(D);
      const { NavProvider } = await import('@/lib/nav.jsx');
      const { default: ResultsTab } = await import('@/tabs/ai/ResultsTab.jsx');
      const { HeadlineTiles } = await import('@/tabs/ai/Landing.jsx');
      const pend = D.scenarios.map((s) => s.id).filter((sid) => ['tfp', 'tz', 'ss'].every((a) => !done(D, sid, a, 'zk0.1') && !done(D, sid, a, 'zk0')));
      // the full file has none: build one from it, so the check is never vacuous
      const cases = pend.length ? pend.map((sid) => [D, sid]) : [[(() => {
        const F = JSON.parse(JSON.stringify(D));
        for (const a of ['tfp', 'tz', 'ss']) for (const cl of ['zk0.1', 'zk0']) F.results.uk_low[a][cl] = { status: 'pending' };
        return F;
      })(), 'uk_low']];
      for (const [F, sid] of cases) {
        if (F !== D) {
          await pickFile(F);
        }
        const { NavProvider: NP } = F !== D ? await import('@/lib/nav.jsx') : { NavProvider };
        const { default: RT } = F !== D ? await import('@/tabs/ai/ResultsTab.jsx') : { default: ResultsTab };
        const { HeadlineTiles: HT } = F !== D ? await import('@/tabs/ai/Landing.jsx') : { HeadlineTiles };
        for (const sub of ['income', 'economy', 'finances']) {
          window.history.replaceState(null, '', `/?tab=explore&sub=${sub}&s=${sid}`);
          const { container, unmount } = render(
            <NP>
              <RT sub={sub} />
            </NP>,
          );
          // the scenario's own cards: no signed figure, and the not-solved words
          const own = [...container.querySelectorAll('.card')].filter((c) => !c.closest('#all-scenarios, #closure-sensitivity, #fin-across, #debt-cells'));
          for (const c of own) {
            // text outside axis ticks ([data-axis], as dumptabs reads it)
            const plot = [...c.querySelectorAll('.card-finding, .chart-plot, .card-head')].map(noAxis).join(' ');
            // a gap prints signed (surprise.js signed()), or as an unsigned
            // zero: either here would be a pending cell drawn as a number.
            // Unsigned reference figures (OG-UK's 14.8pp tax-rate gap, the
            // 12.3% NICs rate) belong to no scenario.
            expect(plot.match(/.{0,80}(?:[+−-]\d+\.\d+|(?<![\d.])0\.0+)(?:%|pp).{0,40}/)?.[0] ?? null, `${sid} ${sub} #${c.id}`).toBeNull();
          }
          expect(container.textContent, `${sid} ${sub}`).toMatch(/not (?:yet )?solved/);
          unmount();
        }
        window.history.replaceState(null, '', `/?tab=story&s=${sid}`);
        const tiles = render(
          <NP>
            <HT sid={sid} />
          </NP>,
        );
        expect(tiles.container.textContent).not.toMatch(/\d+\.\d+%/);
        expect(tiles.container.textContent).toMatch(/not (?:yet )?solved/);
        tiles.unmount();
        // the Story at that scenario: the headline ledger and the output split
        const { default: Story } = await import('@/tabs/story/StoryTab.jsx');
        const st = render(
          <NP>
            <Story />
          </NP>,
        );
        for (const sel of ['#story-headline', '#story-output']) {
          const el = st.container.querySelector(sel);
          if (!el) continue;
          const t = noAxis(el);
          expect(t.match(/.{0,60}(?:[+−-]\d+\.\d+|(?<![\d.])0\.0+)(?:%|pp).{0,20}/)?.[0] ?? null, `${sid} story ${sel}`).toBeNull();
          expect(t, `${sid} story ${sel}`).toMatch(/not (?:yet )?solved|pending/);
        }
        st.unmount();
      }
    });
  });
}

// ---- the Who gains return line (wealth by age, ruling recorded in
// pushC-plan.md) -------------------------------------------------------------
describe('claims probe, cohorts: "They hold more wealth than younger adults…"', () => {
  it('shows only where the wealth ratio at the age that gains most is above 1', async () => {
    vi.resetModules();
    vi.doUnmock('@/lib/activeData.js');
    const { whoAnswer, whoFindingOf, RETURN_LINE } = await import('@/tabs/cohorts/CohortsTab.jsx');
    const { COHORTS: CO } = await import('@/lib/dataKeys.js');
    let shown = 0;
    for (const closure of ['central', 'closed'])
      for (const rule of ['common', 'dn'])
        for (const arm of ['tfp', 'zfixed', 'stress']) {
          const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
          const c = CO.closures[cl].rules[rule][arm];
          const xs = CO.closures[cl].birth_year;
          const adults = xs.map((_, i) => i).filter((i) => xs[i] <= CO.shock_year - 20);
          const peak = adults.reduce((b, i) => (c.cev_all[i] > c.cev_all[b] ? i : b), adults[0]);
          const age = CO.shock_year - xs[peak];
          const w = Object.entries(CO.closures[cl]).find(([k]) => k.startsWith('wealth_by_age_'))?.[1];
          const ratio = w ? w.ratio_to_adult_mean[w.age.indexOf(age)] : null;
          const holds = c.sources_alive.capital > 0 && c.sources_alive.labour < 0 && ratio != null && ratio > 1;
          const text = whoAnswer(closure, rule, arm).lines.flat().map((p) => p.text).join(' ');
          expect(text.includes(RETURN_LINE), `${cl} ${rule} ${arm}: age ${age}, ratio ${ratio}`).toBe(holds);
          if (holds) shown += 1;
        }
    // it holds today (1.73 at 65), so the check is not vacuous
    expect(shown).toBeGreaterThan(0);
    // and a cell where the age that gains most holds less than the mean drops it
    const c = CO.closures['zk0.1'].rules.common.tfp;
    const f = whoFindingOf(c, { xs: CO.closures['zk0.1'].birth_year, shockYear: CO.shock_year, arm: 'tfp', wealthAt: () => 0.2 });
    expect(f.lines.flat().some((p) => p.text === RETURN_LINE)).toBe(false);
  });
});

// ---- R2-03 at run time: under the 2027 file with the 2028 cohort file, a
// cohort view prints no 2027 shock year except in its one notice line ---------
describe('claims probe, cohort views never mix years', () => {
  it.skipIf(!S2027)('Who gains and the generations scene, on surprise2027.json', async () => {
    await pickFile(S2027);
    const { NavProvider } = await import('@/lib/nav.jsx');
    const { default: ExploreTab } = await import('@/tabs/explore/ExploreTab.jsx');
    const { default: Story } = await import('@/tabs/story/StoryTab.jsx');
    const { COHORT_YEAR, cohortNotice } = await import('@/lib/dataKeys.js');
    const yr = String(S2027.surprise_year);
    expect(COHORT_YEAR === S2027.surprise_year || cohortNotice() != null).toBe(true);
    const strip = (t) => (cohortNotice() ? t.split(cohortNotice()).join(' ') : t);
    window.history.replaceState(null, '', '/?tab=explore&sub=who');
    const who = render(
      <NavProvider>
        <ExploreTab />
      </NavProvider>,
    );
    const inner = who.container.querySelector('#explore-sub-who');
    expect(inner).not.toBeNull();
    if (COHORT_YEAR !== S2027.surprise_year) {
      expect(inner.textContent).toContain(cohortNotice());
      expect(strip(inner.textContent).match(new RegExp(`.{0,60}\\b${yr}\\b.{0,30}`))?.[0] ?? null).toBeNull();
    }
    who.unmount();
    window.history.replaceState(null, '', '/?tab=story');
    const st = render(
      <NavProvider>
        <Story />
      </NavProvider>,
    );
    const steps = [...st.container.querySelectorAll('[id^="p2-who-"]')];
    expect(steps.length).toBeGreaterThan(0);
    const t = steps.map((e) => e.textContent).join(' ');
    if (COHORT_YEAR !== S2027.surprise_year) {
      expect(t).toContain(cohortNotice());
      expect(strip(t).match(new RegExp(`.{0,60}\\b${yr}\\b.{0,30}`))?.[0] ?? null).toBeNull();
    }
    st.unmount();
  });
});

// ---- R3-01: a pending scenario's GDP is never said to rise or fall, and
// the Morph never describes a UK range it does not draw ----------------------
describe('claims probe, pending scenarios in the GDP scene (R3-01)', () => {
  for (const [name, D] of Object.entries(WITH_PARTIAL))
    it(`surprise${name}.json`, async () => {
      await pickFile(D);
      const { morphCardSteps } = await import('@/tabs/story/part2/steps.jsx');
      const { MorphChart } = await import('@/tabs/story/part2/Morph.jsx');
      const { NavProvider } = await import('@/lib/nav.jsx');
      let checked = 0;
      for (const s of D.scenarios)
        for (const cl of ['zk0.1', 'zk0']) {
          const step = morphCardSteps(s.id, cl).find((x) => x.id === 'p2-morph-2');
          const r = render(<NavProvider>{step.body}</NavProvider>);
          const t = r.container.textContent;
          r.unmount();
          if (!done(D, s.id, 'tfp', cl)) {
            checked += 1;
            expect(t, `${s.id} ${cl}`).not.toMatch(/rises above|falls below/);
            expect(t).toMatch(/not yet solved/);
          }
          const range = done(D, 'uk_low', 'tfp', cl) && done(D, 'uk_high', 'tfp', cl);
          for (const state of [2, 3, 4]) {
            window.history.replaceState(null, '', `/?tab=story&s=${s.id}`);
            const m = render(
              <NavProvider>
                <MorphChart state={state} sid={s.id} cl={cl} />
              </NavProvider>,
            );
            const aria = [...m.container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
            if (!range) expect(aria, `${s.id} ${cl} state ${state}`).not.toMatch(/UK range/);
            if (!done(D, s.id, 'tfp', cl)) expect(aria).not.toMatch(new RegExp(`${s.id === 'uk_low' ? 'UK low' : s.id === 'uk_high' ? 'UK high' : '\\u0000'}[^.;]*(rises above|falls below)`));
            m.unmount();
          }
        }
      // the full file has no pending cell: the 2027 file must have some
      if (name === 'partial-2027') expect(checked).toBeGreaterThan(0);
    });
});

// ---- R3-02: a not-solved notice only ever sends the reader to a solved view
describe('claims probe, notices point at solved views (R3-02)', () => {
  for (const [name, D] of Object.entries(WITH_PARTIAL))
    it(`surprise${name}.json`, async () => {
      await pickFile(D);
      const { emptyText, ruleGapText } = await import('@/tabs/ai/lines.js');
      const { ruleSolved } = await import('@/tabs/ai/surprise.js');
      const RK = { dn: 'debt_neutral', fixed: 'fixed_spending' };
      const rec = (sid, a, cl, rule) => (RK[rule] ? D.rules[RK[rule]].results : D.results)?.[sid]?.[a]?.[cl];
      const solvedAt = (sid, cl, rule) => ['tfp', 'tz', 'ss'].some((a) => rec(sid, a, cl, rule)?.status === 'done');
      const NAME = Object.fromEntries(D.scenarios.map((s) => [s.id, s.id === 'korinek' ? 'Korinek et al., substantial (US)' : s.label]));
      let n = 0;
      for (const s of D.scenarios)
        for (const rule of ['common', 'dn', 'fixed'])
          for (const closure of ['central', 'closed']) {
            const cl = closure === 'closed' ? 'zk0' : 'zk0.1';
            if (solvedAt(s.id, cl, rule)) continue;
            const t = ruleSolved(rule, s.id) ? emptyText(['tfp', 'tz', 'ss'], closure, rule, s.id) : ruleGapText(rule, s.id);
            n += 1;
            expect(t, `${s.id} ${rule} ${closure}`).toMatch(/not yet solved|solved for .* only/);
            const fc = /Choose (Some|None) under Foreign capital/.exec(t)?.[1];
            if (fc) expect(solvedAt(s.id, fc === 'Some' ? 'zk0.1' : 'zk0', rule), t).toBe(true);
            if (/Choose the common fiscal rule/.test(t)) expect(solvedAt(s.id, 'zk0.1', 'common') || solvedAt(s.id, 'zk0', 'common'), t).toBe(true);
            const sc = /Choose (.+) under Scenario/.exec(t)?.[1];
            if (sc) for (const [id, nm] of Object.entries(NAME)) if (sc.includes(nm)) expect(solvedAt(id, 'zk0.1', rule) || solvedAt(id, 'zk0', rule), `${t} -> ${id}`).toBe(true);
          }
      if (name === 'partial-2027') expect(n).toBeGreaterThan(0);
    });
});

// ---- R3-04: the swap gate, on since the swap: the active set has every
// file of its own, none borrowed from 2028.
describe('swap gate (R3-04)', () => {
  // the swap made it a standing check: no set borrows another's files
  it('the active set has every file', async () => {
    vi.resetModules();
    vi.doUnmock('@/lib/activeData.js');
    const { SET_MISSING } = await import('@/lib/dataKeys.js');
    expect(SET_MISSING).toEqual([]);
  });
  it('Data and code never prints a 2028 commit or solve time beside another set', async () => {
    vi.resetModules();
    vi.doUnmock('@/lib/activeData.js');
    const { setHas, VERSIONS } = await import('@/lib/dataKeys.js');
    const { VINTAGES, ledger } = await import('@/tabs/code/ledger.js');
    const S = (await import('@/lib/activeData.js')).default;
    if (setHas('versionsFile')) return;
    const solves = VERSIONS.entries.find((e) => e.id === 'solves').value;
    const text = JSON.stringify([VINTAGES, ledger()]);
    if (solves !== S.source_commit) expect(text).not.toContain(solves);
    expect(text).toContain(`Solves and data at ${S.source_commit}`);
  });
});

// ---- R3-05: the stress test's headline-year GDP inside R4's 0.01pp
// tolerance prints as held at zero, never as a residue such as +0.01 -------
describe('tolerance gates, the stress test held (R3-05)', () => {
  for (const [name, D] of Object.entries(FILES))
    it(`surprise${name}.json`, async () => {
      await pickFile(D);
      const { NavProvider } = await import('@/lib/nav.jsx');
      const { default: RT } = await import('@/tabs/ai/ResultsTab.jsx');
      const { R4_TOL_PP, fmt } = await import('@/tabs/ai/surprise.js');
      expect(R4_TOL_PP).toBe(0.01);
      let n = 0;
      for (const s of D.scenarios)
        for (const [closure, cl] of [['central', 'zk0.1'], ['closed', 'zk0']]) {
          const x = g(D, s.id, 'ss', cl, 'Y', D.headline_year);
          if (x == null) continue;
          n += 1;
          expect(Math.abs(x), `${s.id} ${cl}: R4 holds GDP within its tolerance`).toBeLessThanOrEqual(R4_TOL_PP);
          for (const sub of ['income', 'economy']) {
            window.history.replaceState(null, '', `/?tab=explore&sub=${sub}&s=${s.id}&closure=${closure}`);
            const r = render(
              <NavProvider>
                <RT sub={sub} />
              </NavProvider>,
            );
            const t = r.container.querySelector(sub === 'income' ? '#measures' : '#explore-part-economy')?.textContent ?? '';
            expect(t, `${s.id} ${cl} ${sub}`).toContain('0.00% (held)');
            if (fmt(x) !== '0.00%') expect(t.includes(`${fmt(x)} (held)`)).toBe(false);
            r.unmount();
          }
        }
      expect(n).toBeGreaterThan(0);
    });
});

// ---- Round 3's probe gaps -------------------------------------------------
describe('round 3 probe gaps', () => {
  // Years outside 2026-2039 ("Born after 2011" passed the narrow scan): each
  // is a fixed source or history year unless it moves with the data; the
  // count may only fall.
  it('years outside 2026-2039, counted', () => {
    const hits = typedYearsWide();
    within('typed_years_wide', hits.length);
  });

  // Commit and data-file mixing: under one data set, no page prints the
  // other set's results commit or data file name (Data and code, Method,
  // Explore, the Story), in text, links or aria-labels.
  for (const [name, D] of Object.entries(FILES))
    it(`no other set's commit or data file, surprise${name}.json`, async () => {
      await pickFile(D);
      const other = name === '2028' ? S2027 : S2028;
      // with the 2027 file not loaded (R4-16), its name alone
      const bad = (other ? [other.source_commit, `surprise${other.surprise_year}.json`] : ['surprise2027.json']).filter((t) => t !== D.source_commit);
      const { NavProvider } = await import('@/lib/nav.jsx');
      const pages = [
        ['tab=code', (await import('@/tabs/code/CodeTab.jsx')).default],
        ['tab=method', (await import('@/tabs/method/MethodTab.jsx')).default],
        ['tab=explore&sub=economy', (await import('@/tabs/explore/ExploreTab.jsx')).default],
        ['tab=explore&sub=who', (await import('@/tabs/explore/ExploreTab.jsx')).default],
        ['tab=story', (await import('@/tabs/story/StoryTab.jsx')).default],
      ];
      const found = [];
      for (const [q, Page] of pages) {
        window.history.replaceState(null, '', `/?${q}`);
        const r = render(
          <NavProvider>
            <Page />
          </NavProvider>,
        );
        for (const b of r.container.querySelectorAll('button.src-line-btn')) b.click();
        // the dated changelog records past commits on purpose
        for (const h of document.querySelectorAll('#changelog')) h.closest('section')?.remove();
        const blob = [document.body.textContent, ...[...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')), ...[...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'))].join('\n');
        for (const t of bad) if (blob.includes(t)) found.push(`${q}: ${t}`);
        r.unmount();
      }
      if (found.length) console.warn('mixed commits or files:', found);
      within('commit_mixing', found.length);
    });

  // Sentences about a pending scenario, in text and aria-labels: none says
  // where it goes ("rises", "above the path"...). On the full file a
  // synthetic pending UK low keeps the check live.
  for (const [name, D0] of Object.entries(FILES))
    it(`no direction claimed for a pending scenario, surprise${name}.json`, async () => {
      const D = D0.scenarios.some((x) => !done(D0, x.id, 'tfp', 'zk0.1'))
        ? D0
        : (() => {
            const F = JSON.parse(JSON.stringify(D0));
            for (const a of ['tfp', 'tz', 'ss']) for (const cl of ['zk0.1', 'zk0']) F.results.uk_low[a][cl] = { status: 'pending' };
            if (F.output_split?.change?.uk_low) for (const cl of ['zk0.1', 'zk0']) F.output_split.change.uk_low[cl] = { status: 'pending' };
            return F;
          })();
      await pickFile(D);
      const { NavProvider } = await import('@/lib/nav.jsx');
      const { default: Story } = await import('@/tabs/story/StoryTab.jsx');
      const { default: Explore } = await import('@/tabs/explore/ExploreTab.jsx');
      const { SCEN_NAME } = await import('@/tabs/ai/surprise.js');
      const DIR = /\b(rises?|falls?|grows?|gains?|loses?|higher|lower|above|below)\b/;
      const found = [];
      for (const s of D.scenarios.filter((x) => !done(D, x.id, 'tfp', 'zk0.1') && !done(D, x.id, 'tfp', 'zk0'))) {
        const nm = SCEN_NAME[s.id];
        for (const [q, Page] of [[`tab=story&s=${s.id}`, Story], [`tab=explore&sub=economy&s=${s.id}`, Explore], [`tab=explore&sub=finances&s=${s.id}`, Explore]]) {
          window.history.replaceState(null, '', `/?${q}`);
          const r = render(
            <NavProvider>
              <Page />
            </NavProvider>,
          );
          const units = [...r.container.querySelectorAll('p, li, h2, h3, h4, figcaption, td, button')]
            .filter((e) => !e.querySelector('p, li, h2, h3, h4, figcaption, td, button'))
            .map((e) => e.textContent)
            .concat([...r.container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')));
          for (const u of units)
            for (const sent of u.split(/(?<=[.;])\s+/))
              if (sent.includes(nm) && DIR.test(sent) && !/not yet solved|not solved/.test(sent)) found.push(`${q}: ${sent.slice(0, 140)}`);
          r.unmount();
        }
      }
      if (found.length) console.warn('pending-scenario sentences:', found);
      within('pending_sentences', found.length);
    });
});
