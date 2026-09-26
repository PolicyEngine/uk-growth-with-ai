'use client';

import { useEffect, useRef, useState } from 'react';

// Data-driven inline-SVG line chart. It measures its container and draws in
// real pixels, so type stays at a fixed size in a half-width column instead
// of scaling down with a viewBox.
//
// `series`: [{ label, sublabel?, color, values: number[] }]
// `x`:      number[] (same length as every series)
// `strip`:  optional { title, points: [{ label, value, color, offScale? }] } —
//           single end-point values (e.g. published 2030 figures) drawn as
//           hollow dots in a narrow column right of the last year. A point
//           marked offScale sits on the axis edge with an arrow.

const FONT = 'Inter, Roboto, sans-serif';
const PAD_L = 46;
const PAD_T = 22;
const PAD_B = 34;
const STRIP_W = 30;
const ROW = 17; // min vertical gap between stacked end labels
const SUB_ROW = 13; // extra height taken by a sublabel line

// Nice-number tick step: 1, 2, 2.5 or 5 times a power of ten.
function niceStep(range, target = 5) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return f * mag;
}

// Decimals needed to print a tick step exactly (2.5 -> 1, 0.25 -> 2).
function decimalsFor(step) {
  return (String(Number(step.toFixed(6))).split('.')[1] || '').length;
}

function useWidth(initial) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const next = Math.round(e.contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export default function LineChart({
  x,
  series,
  strip = null,
  height = 360,
  valueFormat = (v) => v.toFixed(1),
  ariaLabel,
}) {
  const [ref, W] = useWidth(880);

  const onScale = (strip?.points || []).filter((p) => !p.offScale).map((p) => p.value);
  const all = series.flatMap((s) => s.values).concat(onScale).filter((v) => Number.isFinite(v));
  if (!all.length || !x.length) return <div ref={ref} />;

  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  const step = niceStep(span);
  lo = Math.floor((lo - span * 0.04) / step) * step;
  hi = Math.ceil((hi + span * 0.04) / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const dp = decimalsFor(step);

  // End-label gutter sized to the longest label, within reason.
  const labelChars = Math.max(
    ...series.map((s) => Math.max(s.label.length + 6, (s.sublabel || '').length * 0.92)),
    ...(strip?.points || []).map((p) => p.label.length + (p.offScale ? 9 : 6)),
  );
  const labelW = Math.min(Math.max(labelChars * 6.6 + 18, 130), W * 0.42);
  const stripW = strip ? STRIP_W : 0;
  const L = PAD_L;
  const R = Math.max(L + 80, W - labelW - stripW - 8);
  const TOP = PAD_T;
  const BOT = height - PAD_B;
  const H = height;

  const sx = (i) => (x.length === 1 ? L : L + ((R - L) * i) / (x.length - 1));
  const sy = (v) => BOT - ((v - lo) / (hi - lo)) * (BOT - TOP);
  const stripX = R + stripW / 2 + 4;
  const labelX = R + stripW + 14;

  // Every end label (series ends and strip points), stacked so none overlap.
  const labels = [
    ...series.map((s) => ({
      key: `s-${s.label}`,
      text: s.label,
      sub: s.sublabel,
      value: s.values[s.values.length - 1],
      color: s.color,
      strong: true,
      ax: R,
      y: sy(s.values[s.values.length - 1]),
    })),
    ...(strip?.points || []).map((p) => ({
      key: `p-${p.label}`,
      text: p.label,
      value: p.value,
      color: p.color,
      strong: false,
      offScale: p.offScale,
      ax: stripX,
      y: p.offScale ? BOT : sy(p.value),
    })),
  ].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  let prevH = 0;
  for (const e of labels) {
    e.ly = Math.max(e.y, prev + prevH);
    prev = e.ly;
    prevH = ROW + (e.sub ? SUB_ROW : 0);
  }
  // If the stack runs past the bottom, push it back up.
  let floor = H - 10 - 4;
  for (let i = labels.length - 1; i >= 0; i -= 1) {
    const e = labels[i];
    const h = e.sub ? SUB_ROW : 0;
    if (e.ly + h > floor) e.ly = floor - h;
    floor = e.ly - ROW;
  }

  return (
    <div ref={ref} className="linechart">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} y1={sy(v)} x2={R} y2={sy(v)} className="g" />
            <text x={L - 8} y={sy(v) + 4} className="ax" textAnchor="end">
              {v.toFixed(dp)}
            </text>
          </g>
        ))}
        <line x1={L} y1={BOT} x2={R} y2={BOT} className="axis-line" />
        {x.map((yr, i) => (
          <text key={yr} x={sx(i)} y={BOT + 20} className="ax" textAnchor="middle">
            {yr}
          </text>
        ))}
        {strip ? (
          <g>
            <line x1={stripX} y1={TOP} x2={stripX} y2={BOT} className="strip-rule" />
            <text x={stripX} y={TOP - 6} className="ax strip-title" textAnchor="middle">
              {strip.title}
            </text>
          </g>
        ) : null}
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={s.values.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={sx(i)} cy={sy(v)} r="3.2" fill={s.color} />
            ))}
          </g>
        ))}
        {(strip?.points || []).map((p) => {
          const cy = p.offScale ? BOT : sy(p.value);
          return (
            <g key={p.label}>
              <circle cx={stripX} cy={cy} r="4" fill="var(--pe-color-bg-primary)" stroke={p.color} strokeWidth="2" />
              {p.offScale ? (
                <path d={`M ${stripX - 4},${cy + 7} L ${stripX + 4},${cy + 7} L ${stripX},${cy + 13} Z`} fill={p.color} />
              ) : null}
            </g>
          );
        })}
        {labels.map((e) => (
          <g key={e.key}>
            {Math.abs(e.ly - e.y) > 1.5 || labelX - e.ax > 20 ? (
              <path
                d={`M ${e.ax + 6},${e.y} L ${labelX - 4},${e.ly}`}
                stroke={e.color}
                strokeWidth="1"
                fill="none"
                opacity=".5"
              />
            ) : null}
            <text
              x={labelX}
              y={e.ly + 4}
              style={{ font: `12px ${FONT}`, fontWeight: e.strong ? 700 : 500 }}
              fill={e.strong ? e.color : 'var(--pe-color-gray-600)'}
            >
              {e.text}{' '}
              <tspan style={{ fontWeight: 700 }} fill={e.strong ? e.color : 'var(--pe-color-gray-800)'}>
                {valueFormat(e.value)}
              </tspan>
              {e.offScale ? <tspan fill="var(--pe-color-gray-500)"> (off scale)</tspan> : null}
            </text>
            {e.sub ? (
              <text x={labelX} y={e.ly + 4 + SUB_ROW} style={{ font: `11px ${FONT}` }} fill="var(--pe-color-gray-500)">
                {e.sub}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
