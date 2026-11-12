'use client';

import { useState } from 'react';
import Icon from './Icon.jsx';

// A small-multiples card: icon and name, one mini chart with both arms
// (dashed 0 line labelled "no-AI"), the headline-year values as figures with
// a direction icon and the arm icon, and an optional one-line note. Hover
// or focus the chart for the yearly values.
const W = 300;
const H = 110;
const PAD = { l: 6, r: 6, t: 10, b: 18 };

function MiniChart({ years, lines, unit, fmt, label }) {
  const [hi, setHi] = useState(null);
  const all = lines.flatMap((l) => l.values).concat([0]);
  let lo = Math.min(...all);
  let top = Math.max(...all);
  const span = top - lo || 1;
  lo -= span * 0.12;
  top += span * 0.12;
  const sx = (i) => PAD.l + ((W - PAD.l - PAD.r) * i) / (years.length - 1);
  const sy = (v) => PAD.t + ((top - v) / (top - lo)) * (H - PAD.t - PAD.b);
  const step = (W - PAD.l - PAD.r) / (years.length - 1);
  const desc = lines.map((l) => `${l.label}: ${years.map((y, i) => `${y} ${fmt(l.values[i])}${unit}`).join(', ')}`).join('. ');
  return (
    <div className="mini-chart" tabIndex={0} aria-label={`${label}. ${desc}`} onBlur={() => setHi(null)} onKeyDown={(e) => {
      if (e.key === 'ArrowRight') setHi((h) => (h == null ? 0 : Math.min(years.length - 1, h + 1)));
      if (e.key === 'ArrowLeft') setHi((h) => (h == null ? years.length - 1 : Math.max(0, h - 1)));
    }} onFocus={() => setHi((h) => (h == null ? years.length - 1 : h))}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" aria-hidden="true" onMouseLeave={() => setHi(null)}>
        <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} className="mini-zero" vectorEffect="non-scaling-stroke" />
        {hi != null ? <line x1={sx(hi)} x2={sx(hi)} y1={PAD.t} y2={H - PAD.b} className="mini-guide" vectorEffect="non-scaling-stroke" /> : null}
        {lines.map((l) => (
          <polyline key={l.key} points={l.values.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {years.map((y, i) => (
          <rect key={y} x={sx(i) - step / 2} y={0} width={step} height={H} fill="transparent" onMouseEnter={() => setHi(i)} />
        ))}
      </svg>
      <div className="mini-x" aria-hidden="true">
        <span>{years[0]}</span>
        <span className="mini-zero-label">no-AI = 0</span>
        <span>{years[years.length - 1]}</span>
      </div>
      {hi != null ? (
        <div className="mini-tip" role="status">
          <b>{years[hi]}</b>
          {lines.map((l) => (
            <span key={l.key}>
              <span className="swatch" style={{ borderTopColor: l.color }} />
              {fmt(l.values[hi])}
              {unit}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function dirIcon(x) {
  return Math.abs(x) < 0.005 ? 'minus' : x > 0 ? 'arrowUp' : 'arrowDown';
}

/**
 * figures: [{ key, armIcon, color, label, value (string), raw (number|null), year? }]
 */
export default function VarCard({ icon, title, years, lines, unit, fmt, figures, note }) {
  return (
    <div className="var-card">
      <h4 className="var-card-title">
        <Icon name={icon} size={16} />
        <span>{title}</span>
      </h4>
      {lines.length ? (
        <MiniChart years={years} lines={lines} unit={unit} fmt={fmt} label={title} />
      ) : (
        <div className="mini-pending">No solve for this scenario yet.</div>
      )}
      <div className="var-figures">
        {figures.map((f) => (
          <div key={f.key} className="var-figure">
            <span className="var-figure-value">
              {f.raw != null ? <Icon name={dirIcon(f.raw)} size={14} className="dir-icon" /> : null}
              <span className={f.raw == null ? 'is-pending' : undefined}>{f.value}</span>
            </span>
            <span className="var-figure-label">
              <span className="swatch" style={{ borderTopColor: f.color }} aria-hidden="true" />
              <Icon name={f.armIcon} size={13} />
              <span>
                {f.label}
                {f.year ? `, ${f.year}` : ''}
              </span>
            </span>
          </div>
        ))}
      </div>
      {note ? (
        <p className="var-note">
          <Icon name={note.icon} size={13} />
          <span>{note.text}</span>
        </p>
      ) : null}
    </div>
  );
}
