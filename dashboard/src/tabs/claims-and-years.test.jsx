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
import S2027 from '@/data/surprise2027.json';
import { typedYears, yearKeys } from '@/lib/sourceScan.js';
import BASE from '../../scripts/ratchet-baselines.json';

afterEach(cleanup);

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
  ['lib/dataFlag.js', "? '2028' : String(raw)", 'the default data set'],
  ['lib/activeData.js', 'const FILES = { 2028: S2028, 2027: S2027 };', 'the data-file table'],
  ['lib/dataKeys.js', '2028: {', 'the per-set table'],
  ['lib/dataKeys.js', '2027: {', 'the per-set table'],
  ['lib/dataKeys.js', 'SETS[2028]', 'the 2028 set is the fallback'],
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
  ['tabs/method/sources.js', "'surprise.py: SURPRISE_YEAR = 2028'", 'the code line it links (a swap blocker: the 2027 set names its year elsewhere)'],
  ['tabs/method/ScenarioMap.jsx', '(FRS 2026, Box 4.1)', 'a publication'],
  ['tabs/story/TwoLenses.jsx', 'Doorley et al. (2026)', 'a citation'],
];

const unallowed = () =>
  typedYears().filter((h) => {
    let t = h.text;
    for (const [re] of FIXED_FORMS) t = t.replace(re, (m) => m.replace(/20\d\d/, 'YYYY'));
    if (!new RegExp(`(?<![\\d.\\w/-])${h.year}(?![\\d\\w])`).test(t)) return false;
    return !ALLOW.some(([f, phrase]) => h.file === f && h.text.includes(phrase));
  });

const within = (name, n) => {
  const b = BASE.probes[name]?.baseline;
  expect(n, `${name}: ${n} against baseline ${b}`).toBeLessThanOrEqual(b ?? 0);
};

describe('no typed years or keys', () => {
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

const FILES = { 2028: S2028, 2027: S2027 };
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
      }
    });
  });
}
