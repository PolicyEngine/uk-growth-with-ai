// Bars, vertical or horizontal, in pixels. Each bar: { key, pos, size,
// from, to, color, className }: `pos` and `size` across the bar (left and
// width for vertical bars), `from` the baseline and `to` the value end along
// it. A 2px radius on the free end only (1px when the bar is under 6px
// thick), never on the baseline end: the flat extreme of the cap is the
// value. When `on`, bars grow from the baseline (500ms), 20ms apart, the
// whole stagger at most 400ms.
//
//   <Bars bars={[{ key: 'a', pos: x(0), size: 18, from: y(0), to: y(1.2), color: 'var(--c-gain)' }]} on={seen} />

const f1 = (v) => (Math.round(v * 10) / 10).toString();

// The outline of one bar with the free end rounded.
export function barPath({ pos, size, from, to }, horizontal = false, radius = 2) {
  const len = Math.abs(to - from);
  const r = Math.max(0, Math.min(size < 6 ? 1 : radius, size / 2, len));
  const dir = to >= from ? 1 : -1;
  if (!horizontal) {
    const x0 = pos;
    const x1 = pos + size;
    const yb = from;
    const yt = to;
    const yi = yt - dir * r;
    // baseline corners square, the two corners at `to` rounded
    return `M${f1(x0)},${f1(yb)}L${f1(x0)},${f1(yi)}Q${f1(x0)},${f1(yt)} ${f1(x0 + r)},${f1(yt)}L${f1(x1 - r)},${f1(yt)}Q${f1(x1)},${f1(yt)} ${f1(x1)},${f1(yi)}L${f1(x1)},${f1(yb)}Z`;
  }
  const y0 = pos;
  const y1 = pos + size;
  const xb = from;
  const xt = to;
  const xi = xt - dir * r;
  return `M${f1(xb)},${f1(y0)}L${f1(xi)},${f1(y0)}Q${f1(xt)},${f1(y0)} ${f1(xt)},${f1(y0 + r)}L${f1(xt)},${f1(y1 - r)}Q${f1(xt)},${f1(y1)} ${f1(xi)},${f1(y1)}L${f1(xb)},${f1(y1)}Z`;
}

export const barDelay = (i, n, stagger = 20, max = 400) => Math.round(i * Math.min(stagger, n > 1 ? max / (n - 1) : stagger));

export default function Bars({ bars, horizontal = false, on = true, radius = 2, stagger = 20, maxStagger = 400, className = '' }) {
  return (
    <g className={`ch-bars ${className}`.trim()}>
      {bars.map((b, i) => {
        const grows = horizontal ? (b.to >= b.from ? '0% 50%' : '100% 50%') : b.to <= b.from ? '50% 100%' : '50% 0%';
        return (
          <path
            key={b.key}
            className={`ch-bar ${horizontal ? 'is-h' : 'is-v'}${on ? ' is-on' : ''} ${b.className ?? ''}`.trim()}
            d={barPath(b, horizontal, radius)}
            style={{ fill: b.color, transformOrigin: grows, transitionDelay: `${on ? barDelay(i, bars.length, stagger, maxStagger) : 0}ms` }}
          />
        );
      })}
    </g>
  );
}
