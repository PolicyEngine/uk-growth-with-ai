// Horizontal gridlines only, dotted (--ch-grid, dash 1 4, round caps), and
// a solid zero line (--ch-zero) when zero is inside the y domain. Lines move
// by transform, like Axis ticks, so they glide on a rescale.
//
//   <Grid scale={y} ticks={ticks} x0={plotLeft} x1={plotRight} />
export default function Grid({ scale, ticks, x0, x1, zero = 'auto', className = '' }) {
  const [d0, d1] = scale.domain ?? [-Infinity, Infinity];
  const inDomain = Math.min(d0, d1) <= 0 && Math.max(d0, d1) >= 0;
  const showZero = zero === true || (zero === 'auto' && inDomain);
  return (
    <g className={`ch-grid ${className}`.trim()} aria-hidden="true">
      {ticks
        .filter((v) => !(showZero && Math.abs(v) < 1e-9))
        .map((v) => (
          <line key={v} className="ch-grid-line" x1={x0} x2={x1} y1={0} y2={0} style={{ transform: `translate(0px, ${scale(v)}px)` }} />
        ))}
      {showZero ? <line className="ch-zero" x1={x0} x2={x1} y1={0} y2={0} style={{ transform: `translate(0px, ${scale(0)}px)` }} /> : null}
    </g>
  );
}
