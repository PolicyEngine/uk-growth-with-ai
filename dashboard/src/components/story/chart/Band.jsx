// A period band: full plot height, no border, an 11px label inside its
// top-left corner. Replaces dashed marker lines. kind: 'forecast' and
// 'pandemic' (--ch-band), 'shock' (--ch-band-shock, 2028 to 2031). The label
// is data-axis (an annotation of the scale, like a tick).
//
//   <Band x={x} from={2028} to={2031} top={plotTop} bottom={plotBottom} kind="shock" label="Extra AI" />
export default function Band({ x, from, to, top, bottom, kind = 'forecast', label, className = '' }) {
  const a = Math.min(x(from), x(to));
  const b = Math.max(x(from), x(to));
  return (
    <g className={`ch-band is-${kind} ${className}`.trim()}>
      <rect className="ch-band-rect" x={a} y={top} width={Math.max(0, b - a)} height={Math.max(0, bottom - top)} />
      {label ? (
        <text data-axis="" className="ch-note" x={a + 6} y={top + 14}>
          {label}
        </text>
      ) : null}
    </g>
  );
}
