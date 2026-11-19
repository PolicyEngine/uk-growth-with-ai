// Part 2's finding titles and the GDP scene's closing line, on the real
// data file (story-finding-titles-fable.md); part2.test.jsx runs on a
// fixture.
import { describe, expect, it } from 'vitest';
import real from '@/lib/activeData.js';
import { morphAnswer } from './part2/steps.jsx';
import { shockFor } from './part2/shock.js';
import { cellDone, allDone } from '@/lib/dataTestUtils.js';

// The cells solved for the main arm at both closures; on the full file all
// eight. A title that claims "every scenario" must fall back while any is
// pending.

describe('part 2 titles, real data', () => {
  it('closes the GDP scene on how the other foreign-capital case moves every gap', () => {
    if (!real.scenarios.every((s) => cellDone(s.id, 'tfp', 'zk0.1') && cellDone(s.id, 'tfp', 'zk0'))) {
      expect(morphAnswer('zk0.1')).toMatch(/^These are scenarios/);
      expect(morphAnswer('zk0')).toMatch(/^These are scenarios/);
      return;
    }
    expect(morphAnswer('zk0.1')).toBe('With no foreign capital the GDP gap is smaller in every scenario; none is a forecast.');
    expect(morphAnswer('zk0')).toBe('With some foreign capital the GDP gap is larger in every scenario; none is a forecast.');
    // zk0 below zk0.1 in every scenario and every year after the surprise
    const from = real.years.indexOf(real.surprise_year) + 1;
    for (const s of real.scenarios) {
      const a = real.results[s.id].tfp['zk0.1'].gaps.Y;
      const b = real.results[s.id].tfp.zk0.gaps.Y;
      a.slice(from).forEach((v, i) => expect(b[from + i]).toBeLessThan(v));
    }
  });
  it('the shock title holds in all eight cells: added output, some to labour and some to capital', () => {
    let n = 0;
    for (const s of real.scenarios) {
      for (const cl of ['zk0.1', 'zk0']) {
        if (!cellDone(s.id, 'tfp', cl)) continue;
        n += 1;
        const { N, NL, NK } = shockFor(s.id, cl);
        expect(N).toBeGreaterThan(0);
        expect(NL).toBeGreaterThanOrEqual(1);
        expect(NK).toBeGreaterThanOrEqual(1);
      }
    }
    expect(allDone() ? n === 8 : n > 0).toBe(true);
  });
  it('most of capital’s gain is kept in the UK in all eight cells', () => {
    let n = 0;
    for (const s of real.scenarios) {
      for (const cl of ['zk0.1', 'zk0']) {
        const c = real.output_split.change[s.id][cl];
        if (c?.status === 'pending') continue;
        n += 1;
        expect(c.gross_capital).toBeGreaterThan(0);
        expect(c.domestic).toBeGreaterThan(c.gross_capital / 2);
      }
    }
    expect(allDone() ? n === 8 : n > 0).toBe(true);
  });
});
