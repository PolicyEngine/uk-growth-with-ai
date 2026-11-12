'use client';

import { useEffect, useRef, useState } from 'react';

// Small year-by-year line for a table cell. It measures its container and
// draws in real pixels (up to `maxWidth`), so it fits a narrow column instead
// of overflowing it at a fixed 200px, and its year labels stay at full size
// rather than being scaled down with a viewBox (#26).
//
// `years`: labels for each value; `format(v)`: value text for the hover tip.
const PH = 34; // plot height
const H = PH + 18; // plus ticks and end-year labels
const MIN_W = 72;

export default function Sparkline({ values, years, color, unit = '', format = (v) => v.toFixed(1), maxWidth = 200 }) {
  const ref = useRef(null);
  const [W, setW] = useState(maxWidth);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const next = Math.round(e.contentRect.width);
      if (next > 0) setW(Math.max(MIN_W, Math.min(maxWidth, next)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  const pts = values.map((v, i) => [i, v]).filter(([, v]) => Number.isFinite(v));
  const vs = pts.map(([, v]) => v);
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 1e-6) {
    lo -= 0.5;
    hi += 0.5;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const n = years.length;
  const sy = (v) => PH - 4 - ((v - lo) / (hi - lo)) * (PH - 8);
  const sx = (i) => 6 + (i * (W - 12)) / (n - 1);
  const zeroIn = lo < 0 && hi > 0;
  // Hover targets never wider than the gap between points.
  const hitW = Math.min(20, (W - 12) / (n - 1));

  return (
    <div className="spark" ref={ref} style={{ maxWidth }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={pts.map(([i, v]) => `${years[i]}: ${format(v)}${unit}`).join(', ')}
      >
        {zeroIn ? <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} className="spark-zero" /> : null}
        {years.map((y, i) => (
          <line key={y} x1={sx(i)} x2={sx(i)} y1={PH + 1} y2={PH + 4} className="spark-tick" />
        ))}
        <text x={sx(0)} y={H - 2} className="spark-year" textAnchor="start">
          {years[0]}
        </text>
        <text x={sx(n - 1)} y={H - 2} className="spark-year" textAnchor="end">
          {years[n - 1]}
        </text>
        <polyline points={pts.map(([i, v]) => `${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="1.8" />
        {pts.map(([i, v]) => (
          <circle key={i} cx={sx(i)} cy={sy(v)} r={hover === i ? 4 : 2.6} fill={color} />
        ))}
        {pts.map(([i]) => (
          <rect
            key={`h${i}`}
            x={sx(i) - hitW / 2}
            y={0}
            width={hitW}
            height={PH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover != null ? (
        <span className="spark-tip" style={{ left: sx(hover), top: sy(values[hover]) }}>
          {years[hover]}: <b>{format(values[hover])}{unit}</b>
        </span>
      ) : null}
    </div>
  );
}
