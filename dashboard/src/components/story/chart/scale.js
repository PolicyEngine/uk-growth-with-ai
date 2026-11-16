// Scales and ticks for the story's charts (lifted from part1/frame.jsx and
// part2/frame.jsx). Pure functions: no React.

// A linear scale from `domain` [d0, d1] to `range` [r0, r1] (pixels).
//   const x = linear([2010, 2031], [40, 600]); x(2020); x.invert(320);
export function linear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = (v) => r0 + (v - d0) * k;
  f.invert = (px) => d0 + (px - r0) / k;
  f.domain = [d0, d1];
  f.range = [r0, r1];
  return f;
}

const STEPS = [1, 2, 2.5, 5, 10];

// The round step that gives at most `max` intervals over [lo, hi].
export function tickStep(lo, hi, max = 4) {
  const span = Math.abs(hi - lo) || 1;
  const raw = span / Math.max(1, max);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const m = STEPS.find((s) => s * mag >= raw - 1e-12) ?? 10;
  return m * mag;
}

// Round ticks inside [lo, hi]: between 2 and max + 1 of them (so "three or
// four ticks, five at most" is niceTicks(lo, hi, 4)). Each tick is a clean
// multiple of the step (no 0.30000000000000004).
export function niceTicks(lo, hi, max = 4) {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const step = tickStep(a, b, max);
  const dp = decimals(step);
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(Number(v.toFixed(dp)));
  return out;
}

// [lo, hi] widened to the nearest ticks outside it, for an axis that ends
// on a tick.
export function niceDomain(lo, hi, max = 4) {
  const step = tickStep(lo, hi, max);
  const dp = decimals(step);
  return [Number((Math.floor(lo / step + 1e-9) * step).toFixed(dp)), Number((Math.ceil(hi / step - 1e-9) * step).toFixed(dp))];
}

const decimals = (step) => {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  return s.includes('.') ? s.split('.')[1].length : 0;
};

// Tick text: as many decimals as the step needs, U+2212 for negatives,
// "0" for zero. Pass `step` from tickStep, or the ticks themselves.
export function fmtTick(v, step) {
  const dp = Math.min(2, decimals(step ?? 1));
  const t = Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(dp);
  return v < -1e-9 ? `−${t}` : t;
}

// Year labels for an x axis: first and last always, at most `max` in all,
// the inner ones on a round interval (1, 2, 5, 10, 20, 25 years) and never
// closer than half an interval to the ends.
export function yearTicks(x0, x1, max = 5) {
  const a = Math.ceil(x0);
  const b = Math.floor(x1);
  if (b <= a) return [a];
  if (b - a + 1 <= max) return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const steps = [1, 2, 5, 10, 20, 25, 50];
  for (const s of steps) {
    const inner = [];
    for (let y = Math.ceil((a + 1) / s) * s; y < b; y += s) if (y - a >= s / 2 && b - y >= s / 2) inner.push(y);
    if (inner.length + 2 <= max) return [a, ...inner, b];
  }
  return [a, b];
}

// The index of the data x nearest to `x` (xs sorted ascending).
export function nearestIndex(xs, x) {
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return Math.abs(xs[hi] - x) < Math.abs(xs[lo] - x) ? hi : lo;
}
