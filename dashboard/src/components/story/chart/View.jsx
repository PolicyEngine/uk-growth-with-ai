// A view change of the same data (zoom, pan, rescale, FLIP): a group whose
// affine transform eases to its new value (600ms, --ch-ease) while strokes
// inside keep their width (vector-effect: non-scaling-stroke). Marks are
// drawn once at the "from" scales; the transform maps them to the "to"
// scales. Keep text, end dots and ticks outside the group (they would
// stretch): Axis and Grid glide on their own.
//
//   const v = viewFor(xAll, xZoom, yAll, yZoom);   // scales from scale.js
//   <View {...v}><Line x={xAll} y={yAll} … /></View>

// a, b with to(v) = a * from(v) + b for linear scales
export function affine(from, to) {
  const [d0, d1] = from.domain;
  const p0 = from(d0);
  const p1 = from(d1);
  const a = (to(d1) - to(d0)) / (p1 - p0 || 1);
  return { a, b: to(d0) - a * p0 };
}

export function viewFor(xFrom, xTo, yFrom, yTo) {
  const X = xFrom && xTo ? affine(xFrom, xTo) : { a: 1, b: 0 };
  const Y = yFrom && yTo ? affine(yFrom, yTo) : { a: 1, b: 0 };
  return { sx: X.a, tx: X.b, sy: Y.a, ty: Y.b };
}

export default function View({ sx = 1, sy = 1, tx = 0, ty = 0, className = '', children, ...rest }) {
  const m = `matrix(${sx}, 0, 0, ${sy}, ${tx}, ${ty})`;
  return (
    <g className={`ch-view ${className}`.trim()} style={{ transform: m }} {...rest}>
      {children}
    </g>
  );
}
