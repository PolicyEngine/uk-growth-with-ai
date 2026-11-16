import { fmtTick, tickStep } from './scale.js';

// Tick labels only: no axis line, no tick marks (data-axis: scale, not
// data, for the number checks). Each tick sits in a group moved by a
// transform, so on a rescale (View) the ticks glide with the marks; keyed
// by value, a tick that stays keeps its element.
//
//   <Axis side="left" scale={y} ticks={niceTicks(lo, hi)} at={plotLeft} />
//   <Axis side="bottom" scale={x} ticks={yearTicks(2010, 2031)} at={plotBottom} format={String} />
//
// `title`: the axis title with its unit (e.g. "Gap against the OBR-central
// path, % of GDP"; "Year"), a <text data-axis-title="y"> on a left or right
// axis, "x" on a bottom one (check_axes.mjs looks for it), also data-axis
// (scale, not data). Placed by default: a y title level, above the top
// tick, starting at `titleX` (default 0, the svg's left edge; a right axis
// ends at `at`); an x title centred under the ticks (`titleX` default: the
// middle of the ticks). `titleX` / `titleY` move it.
//
//   <Axis side="left" scale={y} ticks={t} at={plotLeft} title="Percentage points" />
//   <Axis side="bottom" scale={x} ticks={yrs} at={plotBottom} title="Year" />
export default function Axis({ side = 'left', scale, ticks, at, format, anchor, offset = 8, className = '', title, titleX, titleY }) {
  const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : tickStep(ticks[0] ?? 0, ticks[0] ?? 1);
  const fmt = format ?? ((v) => fmtTick(v, step));
  const left = side === 'left';
  const right = side === 'right';
  return (
    <g className={`ch-axis is-${side} ${className}`.trim()}>
      {ticks.map((v, i) => {
        const p = scale(v);
        const tf = left || right ? `translate(0px, ${p}px)` : `translate(${p}px, 0px)`;
        const a = typeof anchor === 'function' ? anchor(v, i, ticks.length) : anchor;
        return (
          <g key={v} className="ch-tick-g" style={{ transform: tf }}>
            {left || right ? (
              <text data-axis="" className="ch-tick" x={left ? at - offset : at + offset} y={0} dy="0.35em" textAnchor={a ?? (left ? 'end' : 'start')}>
                {fmt(v)}
              </text>
            ) : (
              <text data-axis="" className="ch-tick" x={0} y={at + offset + 10} textAnchor={a ?? 'middle'}>
                {fmt(v)}
              </text>
            )}
          </g>
        );
      })}
      {title ? <AxisTitle side={side} scale={scale} ticks={ticks} at={at} offset={offset} x={titleX} y={titleY}>{title}</AxisTitle> : null}
    </g>
  );
}

function AxisTitle({ side, scale, ticks, at, offset, x, y, children }) {
  const ps = ticks.map((v) => scale(v));
  const lo = ps.length ? Math.min(...ps) : 0;
  const hi = ps.length ? Math.max(...ps) : 0;
  if (side === 'bottom' || side === 'top') {
    return (
      <text data-axis-title="x" data-axis="" className="ch-axis-title is-x" x={x ?? (lo + hi) / 2} y={y ?? at + offset + 30} textAnchor="middle">
        {children}
      </text>
    );
  }
  const right = side === 'right';
  return (
    <text data-axis-title="y" data-axis="" className="ch-axis-title is-y" x={x ?? (right ? at + offset : 0)} y={y ?? Math.max(12, lo - 16)} textAnchor={right ? 'end' : 'start'}>
      {children}
    </text>
  );
}
