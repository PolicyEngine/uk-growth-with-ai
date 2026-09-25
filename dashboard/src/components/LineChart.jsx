'use client';

// Data-driven inline-SVG line chart, laid out like the source dashboard's
// charts: gridlines with left-hand value labels, year labels underneath, and
// end-of-line labels in the right-hand gutter.
//
// `series`: [{ label, color, values: number[] }]
// `x`:      number[] (same length as every series)

const W = 880;
const H = 430;
const L = 62;
const R = 668;
const TOP = 26;
const BOT = 384;

function niceTicks(lo, hi, n = 5) {
  const out = [];
  for (let i = 0; i <= n; i += 1) out.push(lo + ((hi - lo) * i) / n);
  return out;
}

export default function LineChart({ x, series, valueFormat = (v) => v.toFixed(1) }) {
  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  if (!all.length || !x.length) return null;

  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;

  const sx = (i) => (x.length === 1 ? L : L + ((R - L) * i) / (x.length - 1));
  const sy = (v) => BOT - ((v - lo) / (hi - lo)) * (BOT - TOP);

  // Stack the right-hand end labels so they never overlap.
  const ends = series
    .map((s, i) => ({ s, i, y: sy(s.values[s.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const e of ends) {
    e.ly = Math.max(e.y, prev + 17);
    prev = e.ly;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {niceTicks(lo, hi).map((v) => (
        <g key={v}>
          <line x1={L} y1={sy(v).toFixed(1)} x2={R} y2={sy(v).toFixed(1)} className="g" />
          <text x={L - 9} y={(sy(v) + 4).toFixed(1)} className="ax" textAnchor="end">
            {valueFormat(v)}
          </text>
        </g>
      ))}
      {x.map((yr, i) => (
        <text key={yr} x={sx(i).toFixed(1)} y={412} className="ax" textAnchor="middle">
          {yr}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.label}>
          <polyline
            points={s.values.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="3.4"
          />
          {s.values.map((v, i) => (
            <circle key={i} cx={sx(i).toFixed(1)} cy={sy(v).toFixed(1)} r="3.4" fill={s.color} />
          ))}
        </g>
      ))}
      {ends.map((e) => (
        <g key={e.s.label}>
          {Math.abs(e.ly - e.y) > 1.5 && (
            <path
              d={`M ${R + 5},${e.y.toFixed(1)} L ${R + 9},${(e.ly - 3.5).toFixed(1)}`}
              stroke={e.s.color}
              strokeWidth="1"
              fill="none"
              opacity=".55"
            />
          )}
          <text
            x={R + 12}
            y={(e.ly + 3.5).toFixed(1)}
            style={{ font: '11.5px Inter, Roboto, sans-serif', fontWeight: 800 }}
            fill={e.s.color}
          >
            {e.s.label}{' '}
            <tspan style={{ fontWeight: 700 }}>
              {valueFormat(e.s.values[e.s.values.length - 1])}
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
