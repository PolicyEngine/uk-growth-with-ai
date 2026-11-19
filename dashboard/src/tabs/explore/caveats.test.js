import { describe, it, expect } from 'vitest';
import S from '@/lib/activeData.js';
import { signHeading, wageByClosure, wageClosureLines, investmentFlags, isFlagged, I_FLAG_PCT, belowThrough, debtDipIsDenominator, debtSidesByRule } from '@/tabs/explore/caveats.js';

import { DATA_SET } from '@/lib/dataFlag.js';

const Y = (y) => S.years.indexOf(y);
// The sides and figures below are pinned to the 2028 file, the data these
// caveats were written against; on another file each is checked against
// that file's own data, and a claim the data no longer supports must be
// dropped by its gate (null), not printed.
const PINNED = DATA_SET === 2028;
const sensDone = (sid) => S.sensitivity?.['zk0.5']?.results?.[sid]?.tfp?.status === 'done';

describe('economics review caveats, read from the active data file', () => {
  it('words the wage-rate sign across the three closures from the data', () => {
    const xs = wageByClosure('uk_central');
    expect(xs.map((c) => c.zeta)).toEqual(sensDone('uk_central') ? [0, 0.1, 0.5] : [0, 0.1]);
    expect(xs[0].x).toBe(S.results.uk_central.tfp.zk0.gaps.w[Y(S.headline_year)]);
    if (sensDone('uk_central')) expect(xs[2].x).toBe(S.sensitivity['zk0.5'].results.uk_central.tfp.gaps.w[Y(S.headline_year)]);
    const lines = wageClosureLines('uk_central');
    if (new Set(xs.map((c) => c.side)).size === 1) {
      expect(lines).toBeNull();
      return;
    }
    if (!PINNED) return;
    // below at 0 and 0.1, above at 0.5 in the data this was written against
    expect(xs.map((c) => c.side)).toEqual(['below', 'below', 'above']);
    expect(lines).toEqual(['Pay rate below the forecast path at ζK 0 and 0.1', 'Above it at ζK 0.5: the sign depends on foreign capital']);
    lines.forEach((t) => expect(t.split(' ').length).toBeLessThanOrEqual(12));
  });

  it('flags every cell whose shock-year investment gap is above +17%, Korinek at ζK 0.5 first', () => {
    const fl = investmentFlags();
    expect(I_FLAG_PCT).toBe(17);
    fl.forEach((f) => expect(f.x).toBeGreaterThan(I_FLAG_PCT));
    if (!PINNED) return;
    expect(fl[0]).toMatchObject({ sid: 'korinek', arm: 'tfp', cl: 'zk0.5' });
    expect(fl[0].x).toBe(S.sensitivity['zk0.5'].results.korinek.tfp.gaps.I[Y(S.surprise_year)]);
    expect(Math.round(fl[0].x)).toBe(64);
    fl.forEach((f) => expect(f.x).toBeGreaterThan(I_FLAG_PCT));
    expect(isFlagged('uk_low', 'tfp', 'zk0.5')).toBe(false);
  });

  it('finds consumption below the forecast path to the late year and the debt dip a denominator effect', () => {
    const c = S.results.uk_central.tfp['zk0.1'].gaps.C;
    const from = S.years.filter((y) => y >= S.surprise_year);
    const run = from.findIndex((y) => !(c[Y(y)] < 0));
    expect(belowThrough('uk_central', 'zk0.1')).toBe(run === 0 ? null : from[(run < 0 ? from.length : run) - 1]);
    if (!PINNED) return;
    expect(belowThrough('uk_central', 'zk0.1')).toBe(S.late_year);
    expect(debtDipIsDenominator('uk_central', 'zk0.1', 'common')).toBe(true);
    // debt-neutral transfers hold debt on the path from the year after the shock: the dip check is not used there
    const sides = debtSidesByRule('uk_central', 'zk0.1');
    expect(sides.map((x) => x.key)).toEqual(['common', 'obr', 'fixed']);
    expect(sides.map((x) => x.side)).toEqual(['above', 'above', 'below']);
    // repricing does not flip UK central's sign; fixed spending does
    expect(signHeading(sides)).toBe('the fiscal rule');
    expect(signHeading([{ key: 'common', side: 'above' }, { key: 'obr', side: 'below' }])).toBe('the repricing speed');
    expect(signHeading([{ key: 'common', side: 'above' }, { key: 'obr', side: 'above' }])).toBeNull();
  });
});
