import { fmtTick, tickStep } from './scale.js';

// Tick labels only: no axis line, no tick marks (data-axis: scale, not
// data, for the number checks). Each tick sits in a group moved by a
// transform, so on a rescale (View) the ticks glide with the marks; keyed
// by value, a tick that stays keeps its element.
//
//   <Axis side="left" scale={y} ticks={niceTicks(lo, hi)} at={plotLeft} />
//   <Axis side="bottom" scale={x} ticks={yearTicks(2010, 2031)} at={plotBottom} format={String} />
export default function Axis({ side = 'left', scale, ticks, at, format, anchor, offset = 8, className = '' }) {
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
    </g>
  );
}
