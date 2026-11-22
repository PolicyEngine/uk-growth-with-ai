// The GDP scene's scroll-linked change from growth to the gap (#p2-morph,
// card 2; Vahid, 22 Nov: "animation doesnt work well"), sampled at t = 0,
// 0.25, 0.5, 0.75 and 1: one axis at full strength at every moment, the
// zero line on its axis's 0, no line drawn between two scales, every dot
// on its own line, and the gap line and its labels only once the gap axis
// is in place. Reduced motion: the end state.
import { describe, expect, it } from 'vitest';
import S from '@/lib/activeData.js';
import { morphGeometry, scrubFrame, scrubLayout, SCRUB_SWAP } from './Morph.jsx';
import { series } from './charts.jsx';
import { CENTRAL } from '@/tabs/ai/surprise.js';

const T = [0, 0.25, 0.5, 0.75, 1];
const ys = series(S.scenarios.find((x) => x.id === 'uk_central') ? 'uk_central' : S.scenarios[0].id, 'tfp', CENTRAL, 'Y');
const a = morphGeometry(1, ys);
const b = morphGeometry(2, ys);
const same = (p, q) => p.length === q.length && p.every(([x, y], i) => x === q[i][0] && y === q[i][1]);

describe('the growth-to-gap scrub', () => {
  it('holds one axis at full strength, and the baseline on that axis’s 0, at every sample', () => {
    for (const t of T) {
      const f = scrubFrame(t);
      expect(f.axisA + f.axisB, `t=${t}`).toBe(1);
      const L = scrubLayout(f, a, b);
      const g = f.at === 'a' ? a : b;
      expect(L.zeroY, `t=${t}`).toBe(g.zeroY);
      // the gap axis's own 0: its tick at 0, when it has one
      const z = b.yTicksD.find((k) => k.v === 0);
      if (f.at === 'b' && z) expect(L.zeroY).toBeCloseTo(z.y, 6);
    }
    expect(scrubFrame(0).at).toBe('a');
    expect(scrubFrame(1).at).toBe('b');
  });
  it('draws no line between two scales: the record and forecast on the growth geometry, the gap line on the gap axis’s', () => {
    for (const t of T) {
      const L = scrubLayout(scrubFrame(t), a, b);
      expect(same(L.act, a.act) && same(L.obr, a.obr) && same(L.gap, b.gap), `t=${t}`).toBe(true);
      // the gap line's x domain is the gap axis's: every point on b's x scale
      for (const [x] of L.gap) expect(x).toBeGreaterThanOrEqual(b.X(S.surprise_year) - 1e-9);
    }
  });
  it('shows the gap line, its labels and ring only after the gap axis is in place, and fades the growth lines before', () => {
    for (const t of T) {
      const f = scrubFrame(t);
      if (f.reveal > 0) expect(f.axisB).toBe(1);
      if (f.out > 0) expect(f.e).toBeLessThan(SCRUB_SWAP);
    }
    expect(scrubFrame(0)).toMatchObject({ out: 1, reveal: 0, axisA: 1 });
    expect(scrubFrame(1)).toMatchObject({ out: 0, reveal: 1, axisB: 1 });
  });
  it('reduced motion: the end state at every sample', () => {
    for (const t of T) expect(scrubFrame(t, true)).toMatchObject({ out: 0, reveal: 1, axisB: 1, at: 'b' });
  });
});
