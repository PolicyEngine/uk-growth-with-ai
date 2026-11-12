'use client';

import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { TipBox, useOutside } from './Tip.jsx';

// A small-multiple line chart: every line on one shared y-domain (passed in,
// so cards in a group compare), a dashed 0 line for the OBR-central path, each line
// end-labelled with its last value in the series colour (HTML, so the label
// is page text). Hover, tap or keyboard (arrow keys) moves a crosshair that
// lists every line's value in that year.
const W = 300;
const H = 120;
const PAD = { t: 8, b: 8 };
const LABEL_GAP = 7; // min vertical gap between end labels, % of height

export function niceDomain(values) {
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  return [lo - span * 0.08, hi + span * 0.08];
}

export default function MiniChart({ title, icon, years, lines, domain, unit, fmt, closure = 'central closure', endFmt, marker = null, note = null, subtitle = null, emptyText = 'No solve for this scenario yet.' }) {
  const [hi, setHi] = useState(null);
  const box = useRef(null);
  useOutside(box, hi != null, () => setHi(null));
  const [lo, top] = domain;
  const sx = (i) => (W * i) / (years.length - 1);
  const yPct = (v) => PAD.t + ((top - v) / (top - lo)) * (100 - PAD.t - PAD.b);
  const sy = (v) => (yPct(v) / 100) * H;
  const nearest = (clientX) => {
    const r = box.current.querySelector('svg').getBoundingClientRect();
    return Math.max(0, Math.min(years.length - 1, Math.round(((clientX - r.left) / r.width) * (years.length - 1))));
  };
  // End labels: stacked so none overlap
  const ends = lines
    .filter((l) => !l.noEndLabel)
    .map((l) => ({ ...l, end: l.values[l.values.length - 1], y: yPct(l.values[l.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  const gapPct = LABEL_GAP * 1.6;
  for (let i = 1; i < ends.length; i += 1) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gapPct);
  // ...and pulled back up if the stack runs past the bottom of the plot
  for (let i = ends.length - 1; i >= 0; i -= 1) {
    const floor = i === ends.length - 1 ? 96 : ends[i + 1].y - gapPct;
    if (ends[i].y > floor) ends[i].y = floor;
  }
  const desc = lines.map((l) => `${l.label}: ${years.map((y, i) => `${y} ${fmt(l.values[i])}${unit}`).join(', ')}`).join('. ');

  return (
    <div className="mini-card">
      <h4 className="var-card-title">
        <Icon name={icon} size={16} />
        <span>{title}</span>
      </h4>
      {subtitle ? <p className="mini-sub">{subtitle}</p> : null}
      {lines.length ? (
        <div
          ref={box}
          className="mini-chart"
          tabIndex={0}
          aria-label={`${title}, ${closure}. ${desc}`}
          onMouseMove={(e) => setHi(nearest(e.clientX))}
          onMouseLeave={() => setHi(null)}
          onClick={(e) => setHi(nearest(e.clientX))}
          onFocus={() => setHi((h) => (h == null ? years.length - 1 : h))}
          onBlur={() => setHi(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') setHi((h) => (h == null ? 0 : Math.min(years.length - 1, h + 1)));
            else if (e.key === 'ArrowLeft') setHi((h) => (h == null ? years.length - 1 : Math.max(0, h - 1)));
            else if (e.key === 'Escape') setHi(null);
            else return;
            e.preventDefault();
          }}
        >
          <div className="mini-plot">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
              <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} className="mini-zero" vectorEffect="non-scaling-stroke" />
              {marker && years.includes(marker.year) ? (
                <line x1={sx(years.indexOf(marker.year))} x2={sx(years.indexOf(marker.year))} y1={0} y2={H} className="mini-marker" vectorEffect="non-scaling-stroke" />
              ) : null}
              {hi != null ? <line x1={sx(hi)} x2={sx(hi)} y1={0} y2={H} className="mini-guide" vectorEffect="non-scaling-stroke" /> : null}
              {lines.map((l) => (
                <polyline
                  key={l.key}
                  points={l.values.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={l.light ? 1.75 : l.dashed ? 2 : 2.5}
                  strokeDasharray={l.dashed ? '5 4' : undefined}
                  opacity={l.light ? 0.8 : 1}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {marker && years.includes(marker.year) ? (
              <span className="mini-marker-label" style={{ left: `${(100 * years.indexOf(marker.year)) / (years.length - 1)}%` }} data-axis="">
                {marker.label}
              </span>
            ) : null}
            {hi != null
              ? lines.map((l) => (
                  <span key={l.key} className="mini-dot" style={{ left: `${(100 * hi) / (years.length - 1)}%`, top: `${yPct(l.values[hi])}%`, background: l.color }} />
                ))
              : null}
            {hi != null ? (
              <TipBox className="chart-tip mini-tip" style={{ left: `${(100 * hi) / (years.length - 1)}%`, top: 0 }}>
                <b>
                  {title}, {years[hi]}
                </b>
                {closure ? <span className="tip-sub">{closure}</span> : null}
                {lines.map((l) => (
                  <span key={l.key} className="tip-row">
                    <span className={`swatch${l.dashed ? ' dashed' : ''}`} style={{ borderTopColor: l.color }} />
                    <span className="tip-name">
                      {l.label}
                      {l.closure ? `, ${l.closure}` : ''}
                    </span>
                    <span className="tip-value">
                      {fmt(l.values[hi])}
                      {unit}
                    </span>
                  </span>
                ))}
              </TipBox>
            ) : null}
            <div className="mini-x" data-axis="">
              {years.map((y, i) => (
                <span key={y} className={`mini-x-tick${i % 2 ? ' is-odd' : ''}`} style={{ left: `${(100 * i) / (years.length - 1)}%` }}>
                  {y}
                </span>
              ))}
            </div>
          </div>
          <div className="mini-ends">
            {ends.map((l) => (
              <span key={l.key} className="mini-end" style={{ top: `${l.y}%`, color: l.textColor || l.color }}>
                {endFmt(l.end)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mini-pending">{emptyText}</div>
      )}
      {note ? <p className="mini-note">{note}</p> : null}
    </div>
  );
}
