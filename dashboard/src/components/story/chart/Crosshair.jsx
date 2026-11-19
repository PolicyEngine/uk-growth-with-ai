'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { nearestIndex } from './scale.js';

// A crosshair and tooltip for a time series, wrapping its SVG. A 1px line
// snaps to the nearest data x; a ringed dot (r 4, 2px surface ring) sits on
// each series; a card shows the year, then one row per series (a plain
// concept icon, the name, the value in the series' text colour), at most
// four rows, and an 11px unit foot. It flips side at the plot's midpoint.
//
// Input: pointer; touch (a tap pins, a tap outside releases); keyboard (the
// plot is focusable: Left and Right move a point, Home and End jump, Escape
// clears). A visually hidden aria-live line reads the point out. Nothing of
// the read-out is in the DOM while inactive (the tooltip and the live text
// are mounted only while a pointer, touch or key is on the chart), so the
// number checks never count it.
//
//   <Crosshair width={w} height={h} x={x} y={y} xs={years} top={t} bottom={b}
//     series={[{ key: 'c', name: 'UK central', icon: 'gdp', color: 'var(--series-2)', text: 'var(--series-2)', ys, format: pct }]}
//     unit="% gap against the forecast path" label="GDP against the path, 2010 to 2031">
//     …the chart's marks…
//   </Crosshair>
export default function Crosshair({ width, height, x, y, xs, series, top = 0, bottom, formatX = String, unit, label, className = '', children }) {
  const [at, setAt] = useState(null); // index into xs, or null
  const [pinned, setPinned] = useState(false);
  const host = useRef(null);
  const rows = series.filter((s) => s.ys).slice(0, 4);
  const B = bottom ?? height;
  const pick = (clientX) => {
    const svg = host.current?.querySelector('svg');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / (r.width || 1)) * width;
    return nearestIndex(xs, x.invert(px));
  };
  // a tap outside releases a pinned point
  useEffect(() => {
    if (!pinned) return undefined;
    const off = (e) => {
      if (!host.current?.contains(e.target)) {
        setPinned(false);
        setAt(null);
      }
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [pinned]);
  const onKey = (e) => {
    const n = xs.length;
    const cur = at ?? n - 1;
    const k = { ArrowRight: at == null ? n - 1 : cur + 1, ArrowLeft: at == null ? n - 1 : cur - 1, Home: 0, End: n - 1 }[e.key];
    if (e.key === 'Escape') {
      setAt(null);
      setPinned(false);
      return;
    }
    if (k == null) return;
    e.preventDefault();
    setAt(Math.max(0, Math.min(n - 1, k)));
  };
  // an index kept from a state with more points (the GDP canvas zooming to
  // its quarters while the pointer is on it) is dropped, not drawn at NaN
  // (WebKit logged <line x1="NaN"> at 390)
  if (at != null && !(at >= 0 && at < xs.length && Number.isFinite(x(xs[at])))) {
    setAt(null);
    return null;
  }
  const px = at != null ? x(xs[at]) : 0;
  const right = px > width / 2;
  const fmt = (s, v) => (Number.isFinite(v) ? (s.format ? s.format(v) : String(v)) : '–');
  const readout = at != null ? `${formatX(xs[at])}: ${rows.map((s) => `${s.name} ${fmt(s, s.ys[at])}`).join(', ')}` : '';
  return (
    <div
      ref={host}
      className={`ch-cross ${className}`.trim()}
      tabIndex={0}
      role="group"
      aria-label={`${label ?? ''}${label ? '. ' : ''}Use the left and right arrow keys to read values`}
      onKeyDown={onKey}
      onBlur={() => {
        if (!pinned) setAt(null);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch' || pinned) return;
        setAt(pick(e.clientX));
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch' && !pinned) setAt(null);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        setAt(pick(e.clientX));
        setPinned(true);
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {children}
        {at != null ? (
          <g className="ch-cross-mark" aria-hidden="true">
            <line className="ch-cross-line" x1={px} x2={px} y1={top} y2={B} />
            {rows.map((s) =>
              Number.isFinite(s.ys[at]) ? <circle key={s.key} className="ch-cross-dot" cx={px} cy={y(s.ys[at])} r={4} style={{ fill: s.color }} /> : null,
            )}
          </g>
        ) : null}
      </svg>
      {at != null ? (
        <div className={`ch-tip${right ? ' is-left' : ''}`} style={{ left: `${(px / width) * 100}%`, top: `${(top / height) * 100}%` }} aria-hidden="true">
          <div className="ch-tip-head">{formatX(xs[at])}</div>
          {rows.map((s) => (
            <div key={s.key} className="ch-tip-row">
              <Icon name={iconFor(s.icon ?? 'path')} size={12} className="ch-tip-icon" />
              <span className="ch-tip-name">{s.name}</span>
              <span className="ch-tip-value" style={{ color: s.text ?? s.color }}>
                {fmt(s, s.ys[at])}
              </span>
            </div>
          ))}
          {unit ? <div className="ch-tip-unit">{unit}</div> : null}
        </div>
      ) : null}
      <span className="visually-hidden" aria-live="polite">
        {readout}
      </span>
    </div>
  );
}
