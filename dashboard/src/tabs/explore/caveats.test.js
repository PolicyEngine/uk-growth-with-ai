import { describe, it, expect } from 'vitest';
import S from '@/data/surprise2028.json';
import { signHeading, wageByClosure, wageClosureLines, investmentFlags, isFlagged, I_FLAG_PCT, belowThrough, debtDipIsDenominator, debtSidesByRule } from '@/tabs/explore/caveats.js';

const Y = (y) => S.years.indexOf(y);

describe('economics review caveats, read from surprise2028.json', () => {
  it('words the wage-rate sign across the three closures from the data', () => {
    const xs = wageByClosure('uk_central');
    expect(xs.map((c) => c.zeta)).toEqual([0, 0.1, 0.5]);
    expect(xs[0].x).toBe(S.results.uk_central.tfp.zk0.gaps.w[Y(S.headline_year)]);
    expect(xs[2].x).toBe(S.sensitivity['zk0.5'].results.uk_central.tfp.gaps.w[Y(S.headline_year)]);
    const lines = wageClosureLines('uk_central');
    // below at 0 and 0.1, above at 0.5 in the data this was written against
    expect(xs.map((c) => c.side)).toEqual(['below', 'below', 'above']);
    expect(lines).toEqual(['Pay rate below the path at ζK 0 and 0.1', 'Above it at ζK 0.5: the sign depends on foreign capital']);
    lines.forEach((t) => expect(t.split(' ').length).toBeLessThanOrEqual(12));
  });

  it('flags every cell whose 2028 investment gap is above +17%, Korinek at ζK 0.5 first', () => {
    const fl = investmentFlags();
    expect(I_FLAG_PCT).toBe(17);
    expect(fl[0]).toMatchObject({ sid: 'korinek', arm: 'tfp', cl: 'zk0.5' });
    expect(fl[0].x).toBe(S.sensitivity['zk0.5'].results.korinek.tfp.gaps.I[Y(S.surprise_year)]);
    expect(Math.round(fl[0].x)).toBe(64);
    fl.forEach((f) => expect(f.x).toBeGreaterThan(I_FLAG_PCT));
    expect(isFlagged('uk_low', 'tfp', 'zk0.5')).toBe(false);
  });

  it('finds consumption below the path to the late year and the debt dip a denominator effect', () => {
    expect(belowThrough('uk_central', 'zk0.1')).toBe(S.late_year);
    expect(debtDipIsDenominator('uk_central', 'zk0.1', 'common')).toBe(true);
    // debt-neutral transfers hold debt on the path from 2029: the dip check is not used there
    const sides = debtSidesByRule('uk_central', 'zk0.1');
    expect(sides.map((x) => x.key)).toEqual(['common', 'obr', 'fixed']);
    expect(sides.map((x) => x.side)).toEqual(['above', 'above', 'below']);
    // repricing does not flip UK central's sign; fixed spending does
    expect(signHeading(sides)).toBe('the fiscal rule');
    expect(signHeading([{ key: 'common', side: 'above' }, { key: 'obr', side: 'below' }])).toBe('the repricing speed');
    expect(signHeading([{ key: 'common', side: 'above' }, { key: 'obr', side: 'above' }])).toBeNull();
  });
});
