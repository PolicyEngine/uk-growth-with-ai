'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { TipBox, useOutside } from '@/components/ab/Tip.jsx';
import { CHART_FONT, minus } from '@/lib/chartTheme.js';

// Data-driven inline-SVG line chart. It measures its container and draws in
// real pixels, so type stays at a fixed size in a half-width column instead
// of scaling down with a viewBox.
//
// `series`: [{ label, sublabel?, color, dashed?, key?, values: number[] }]
//           `dashed` draws the line dashed with hollow markers; `key` (default
//           the label) must be unique when two series share a label;
//           `noEndLabel` draws the line without an end label (use when another
//           series' label already covers the same end point).
// `x`:      number[] (same length as every series)
// `xUnit`:  optional x-axis title, drawn under the year labels
// `dots`:   false draws markers only at the crosshair (for long series)
// `strip`:  optional { title, points: [{ label, value, color, offScale? }] } —
//           single end-point values (e.g. published 2030 figures) drawn as
//           hollow dots in a narrow column right of the last year. A point
//           marked offScale sits on the axis edge with an arrow (offScale:
//           'high' puts it on the top edge, pointing up).
// `compact`: for a small-multiple tile: at most four y ticks (alternate
//           ticks dropped), no marker or band label rows (their lines stay),
//           and markers only at the crosshair.
// `link`:   the crosshair group (default 'oguk'): pointing at a year on one
//           chart shows the crosshair at that year on every chart of the
//           same group on the page; the tooltip stays on the chart under
//           the pointer. false: not linked (uk-ai-study charts never link to
//           OG-UK ones).
//
// Motion: when the data changes (a picker), the lines and their markers
// move to the new values (geometry only, 320ms; the CSS `d` transition, so
// a browser without it switches at once); printed values (end labels)
// cross-fade and never count through intermediate values. Reduced motion:
// everything switches at once (ab.css).

// The linked crosshair: one window event, `lc-year`, { year, src, group }
const LINK_EVENT = 'lc-year';

const FONT = CHART_FONT;
const PAD_T = 22;
const PAD_B = 34;
const STRIP_W = 30;
const ROW = 18; // min vertical gap between stacked end labels
const LINE = 14; // extra height taken by each wrapped end-label line
const SUB_ROW = 13; // extra height taken by a sublabel line
const TICK_GAP = 8; // y tick label to plot edge
const UNIT_ASCENT = 9; // rotated 11px unit label: glyphs reach this far left of its baseline...
const UNIT_DESCENT = 3; // ...and this far right
const UNIT_GAP = 6; // unit label to the widest tick label
const EDGE = 4; // left edge of the svg to the unit label

// Text width in px. Measured with a canvas in the browser, so geometry follows
// the real tick and label strings (a five-character tick like "112.5" needs a
// wider margin than "4"); a per-character estimate stands in during SSR and
// hydration (so the first client render matches the server HTML), and the
// chart re-renders with real measurements once mounted.
let measureCtx = null;
let canMeasure = false;
function textWidth(text, font) {
  if (canMeasure && typeof document !== 'undefined') {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    if (measureCtx) {
      measureCtx.font = font;
      return measureCtx.measureText(text).width;
    }
  }
  const px = Number((font.match(/(\d+(?:\.\d+)?)px/) || [])[1] || 12);
  return text.length * px * 0.6;
}
const AX_FONT = `12px ${FONT}`;
const labelFont = (weight, px = 12) => `${weight} ${px}px ${FONT}`;

// Greedy word wrap of an end label into lines no wider than `max`. A label
// is a list of segments ({ text, weight, kind }); the value is one segment
// and is never split, so a label that does not fit on one line wraps and
// still ends with its number instead of losing it past the svg edge.
function wrapSegments(segments, max) {
  const words = segments.flatMap((seg) =>
    seg.kind === 'text'
      ? seg.text.split(/\s+/).filter(Boolean).map((w) => ({ ...seg, text: w }))
      : [seg],
  );
  const lines = [];
  let line = [];
  let width = 0;
  for (const w of words) {
    const ww = textWidth(w.text, labelFont(w.weight));
    const space = line.length ? textWidth(' ', labelFont(w.weight)) : 0;
    if (line.length && width + space + ww > max) {
      lines.push(line);
      line = [w];
      width = ww;
    } else {
      line.push(w);
      width += space + ww;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}
const lineWidth = (line) =>
  line.reduce((acc, w, i) => acc + textWidth((i ? ' ' : '') + w.text, labelFont(w.weight)), 0);

// Re-render after mount, once web fonts have loaded, with canvas measurement
// switched on.
function useMeasured() {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    canMeasure = true;
    let live = true;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => live && setReady((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

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

// Colour of an end-label segment: series labels and values in the series
// colour; strip labels grey with a darker value; the off-scale note lighter.
function segFill(kind, e) {
  if (kind === 'off') return 'var(--pe-color-gray-500)';
  if (e.strong) return e.textColor || e.color;
  return kind === 'value' ? 'var(--pe-color-gray-800)' : 'var(--pe-color-gray-600)';
}

export default function LineChart({
  x,
  series,
  strip = null,
  height = 360,
  valueFormat = (v) => v.toFixed(1),
  tipFormat = null,
  yUnit = null,
  xUnit = null,
  ariaLabel,
  noValue = false,
  noEndLabels = false,
  zeroLabel = null,
  unit = '',
  tipTitle = null,
  yDomain = null,
  endLabel = 'name',
  markers = [],
  bands = [],
  dots: dotsProp = true,
  link = 'oguk',
  compact = false,
}) {
  const dots = compact ? false : dotsProp;
  const [ref, W] = useWidth(880);
  useMeasured();
  // Crosshair: the year under the pointer, keyboard focus or tap.
  const [hov, setHov] = useState(null);
  // the year another chart of the same group points at
  const [linkedYear, setLinkedYear] = useState(null);
  const boxRef = useRef(null);
  const src = useId();
  useOutside(boxRef, hov != null, () => setHov(null));
  const hovYear = hov == null ? null : x[hov];
  useEffect(() => {
    if (!link || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(LINK_EVENT, { detail: { year: hovYear ?? null, src, group: link } }));
  }, [hovYear, link, src]);
  useEffect(() => {
    if (!link || typeof window === 'undefined') return undefined;
    const on = (e) => {
      const d = e.detail;
      if (d.src !== src && d.group === link) setLinkedYear(d.year);
    };
    window.addEventListener(LINK_EVENT, on);
    return () => window.removeEventListener(LINK_EVENT, on);
  }, [link, src]);

  const onScale = (strip?.points || []).filter((p) => !p.offScale).map((p) => p.value);
  const all = series.flatMap((s) => s.values).concat(onScale).filter((v) => Number.isFinite(v));
  if (!all.length || !x.length) return <div ref={ref} />;

  let lo = yDomain ? yDomain[0] : Math.min(...all);
  let hi = yDomain ? yDomain[1] : Math.max(...all);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  const step = niceStep(span);
  lo = Math.floor((lo - span * 0.04) / step) * step;
  hi = Math.ceil((hi + span * 0.04) / step) * step;
  let ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  // a compact tile keeps at most four ticks: every other one, zero kept
  if (compact && ticks.length > 4) {
    const z = ticks.findIndex((v) => Math.abs(v) < step / 2);
    const keep = z >= 0 ? z % 2 : 0;
    ticks = ticks.filter((_, i) => i % 2 === keep);
  }
  const dp = decimalsFor(step);
  // No "-0.00": a tick that rounds to zero prints unsigned.
  const tickFmt = (v) => (Math.abs(v) < 0.5 * 10 ** -dp ? (zeroLabel ? `${zeroLabel} 0` : (0).toFixed(dp)) : minus(v.toFixed(dp)));
  const tickText = ticks.map(tickFmt);

  // Left margin from the widest formatted tick, plus room for the rotated
  // unit label to its left. Keyed to the tick strings, not the viewport:
  // "112.5" needs more room than "4" at every width.
  const tickW = Math.max(...tickText.map((t) => textWidth(t, AX_FONT)));
  const unitX = EDGE + UNIT_ASCENT;
  const L = Math.ceil((yUnit ? unitX + UNIT_DESCENT + UNIT_GAP : EDGE) + tickW + TICK_GAP);

  // End labels: name, value and any "(off scale)" note, as segments.
  const points = strip?.points || [];
  const segsFor = (text, value, strong, offScale) => [
    ...(endLabel === 'value' ? [] : [{ kind: 'text', text, weight: strong ? 700 : 500 }]),
    ...(noValue && endLabel !== 'value' ? [] : [{ kind: 'value', text: `${valueFormat(value)}${endLabel === 'value' ? unit : ''}`, weight: 700 }]),
    ...(offScale ? [{ kind: 'off', text: '(off scale)', weight: 500 }] : []),
  ];
  const rawLabels = [
    ...series.filter((s) => !s.noEndLabel && !noEndLabels).map((s) => ({ s, segs: segsFor(s.label, s.values[s.values.length - 1], true, false) })),
    ...points.map((p) => ({ p, segs: segsFor(p.label, p.value, false, p.offScale) })),
  ];

  // End-label gutter: wide enough for the longest label on one line, but
  // never more than 42% of the chart. Labels that do not fit wrap onto
  // extra lines rather than running off the svg edge.
  const stripW = strip ? STRIP_W : 0;
  const oneLine = Math.max(0, ...rawLabels.map((l) => lineWidth(wrapSegments(l.segs, Infinity)[0])));
  const subW = Math.max(0, ...series.map((s) => (s.sublabel ? textWidth(s.sublabel, labelFont(400, 11)) : 0)));
  const labelW = rawLabels.length ? Math.min(Math.max(oneLine, subW) + 14 + 6, Math.max(W * 0.42, 120)) : 6;
  const R = Math.max(L + 80, W - labelW - stripW - 8);
  // an x-axis title takes one more line under the year labels
  const BOT = height - PAD_B - (xUnit ? 16 : 0);
  const H = height;

  const stripX = R + stripW / 2 + 4;
  const labelX = R + stripW + 14;
  const labelMax = Math.max(60, W - labelX - 2);

  // X axis: show every k-th year so labels never touch; the last year is
  // always shown, and the label before it is dropped if it would crowd it.
  const yearW = Math.max(...x.map((yr) => textWidth(String(yr), AX_FONT)));
  const pitch = x.length > 1 ? (R - L) / (x.length - 1) : Infinity;
  const every = Math.max(1, Math.ceil((yearW + 6) / pitch));
  const showYear = x.map((_, i) => i % every === 0 || i === x.length - 1);
  for (let i = x.length - 2; i > 0; i -= 1) {
    if (showYear[i]) {
      if ((x.length - 1 - i) * pitch < yearW + 6) showYear[i] = false;
      break;
    }
  }

  const sx = (i) => (x.length === 1 ? L : L + ((R - L) * i) / (x.length - 1));
  // Labels above the plot, band labels and marker labels together: each
  // takes the lowest row where it overlaps no label already placed (widths
  // estimated from the text), and the plot starts below the rows used, so a
  // label never overprints another label or the data.
  const half = x.length > 1 ? (R - L) / (x.length - 1) / 2 : 12;
  const placed = [];
  const place = (a0, w) => {
    let row = 0;
    while (placed.some((p) => p.row === row && a0 < p.b && a0 + w > p.a)) row += 1;
    placed.push({ row, a: a0, b: a0 + w });
    return row;
  };
  const bandRows = bands.map((b) => {
    const i = x.indexOf(b.year);
    if (i < 0 || !b.label || compact) return { b, i, row: 0 };
    const w = String(b.label).length * 6.4 + 6;
    return { b, i, row: place(sx(i) - w / 2, w) };
  });
  const markerRows = [];
  for (const m of markers) {
    const i = x.indexOf(m.year);
    if (i < 0) continue;
    const len = compact ? 0 : String(m.label ?? '').length;
    const end = i === x.length - 1 || sx(i) + 4 + len * 6.4 > R;
    const w = len * 6.4 + 6;
    const a0 = end ? sx(i) - 4 - w : sx(i) + 4;
    markerRows.push({ m, i, end, row: len ? place(a0, w) : 0 });
  }
  const rowsUsed = placed.length ? Math.max(...placed.map((p) => p.row)) + 1 : 1;
  const TOP = PAD_T + (rowsUsed - 1) * 14;
  const labelY = (row) => TOP - 6 - row * 14;
  const sy = (v) => BOT - ((v - lo) / (hi - lo)) * (BOT - TOP);
  // Where a strip point's marker sits. Two points pushed to the same axis
  // edge would be drawn on top of each other, so each off-scale point after
  // the first is offset one row along that edge. The label stack reads the
  // same function, so the leader line always points at its own marker.
  function stripY(p, pi) {
    if (!p.offScale) return sy(p.value);
    const rank = points.filter((q, qi) => q.offScale === p.offScale && qi < pi).length;
    return p.offScale === 'high' ? TOP + 12 + rank * ROW : BOT - rank * ROW;
  }

  // Every end label (series ends and strip points), stacked so none overlap.
  const labels = rawLabels
    .map(({ s, p, segs }) => {
      const lines = wrapSegments(segs, labelMax);
      const subLines = s?.sublabel
        ? wrapSegments([{ kind: 'text', text: s.sublabel, weight: 400 }], labelMax).map((l) =>
            l.map((w) => w.text).join(' '),
          )
        : [];
      // Height below the first line: wrapped lines, then sublabel lines.
      const extra = (lines.length - 1) * LINE + subLines.length * SUB_ROW;
      const base = { lines, subLines, extra, strong: Boolean(s) };
      return s
        ? { ...base, key: `s-${s.key ?? s.label}`, color: s.color, textColor: s.textColor, ax: R, y: sy(s.values[s.values.length - 1]) }
        : { ...base, key: `p-${p.label}`, color: p.color, ax: stripX, y: stripY(p, points.indexOf(p)) };
    })
    .sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  let prevH = 0;
  for (const e of labels) {
    e.ly = Math.max(e.y, prev + prevH);
    prev = e.ly;
    prevH = ROW + e.extra;
  }
  // If the stack runs past the bottom, push it back up.
  let floor = H - 10 - 4;
  for (let i = labels.length - 1; i >= 0; i -= 1) {
    const e = labels[i];
    if (e.ly + e.extra > floor) e.ly = floor - e.extra;
    floor = e.ly - ROW;
  }

  const nearest = (clientX) => {
    const svg = boxRef.current?.querySelector('svg');
    if (!svg) return null;
    const px = clientX - svg.getBoundingClientRect().left;
    const i = Math.round(((px - L) / Math.max(1, R - L)) * (x.length - 1));
    return Math.max(0, Math.min(x.length - 1, i));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHov((h) => (h == null ? 0 : Math.min(x.length - 1, h + 1)));
    else if (e.key === 'ArrowLeft') setHov((h) => (h == null ? x.length - 1 : Math.max(0, h - 1)));
    else if (e.key === 'Escape') setHov(null);
    else return;
    e.preventDefault();
  };
  const tipLeft = hov == null ? 0 : sx(hov);
  const linkedAt = linkedYear == null ? -1 : x.indexOf(linkedYear);
  const cross = hov ?? (linkedAt >= 0 ? linkedAt : null);
  const pathOf = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  // One closure for every line: said once in the tooltip's header
  const closures = [...new Set(series.map((s) => s.closure).filter(Boolean))];
  const oneClosure = closures.length === 1 && series.every((s) => s.closure) ? closures[0] : null;

  return (
    <div
      ref={(n) => {
        ref.current = n;
        boxRef.current = n;
      }}
      className="linechart is-interactive"
      tabIndex={0}
      aria-label={`${ariaLabel}. Use the arrow keys to read each year.`}
      onKeyDown={onKey}
      onFocus={() => setHov((h) => (h == null ? x.length - 1 : h))}
      onBlur={() => setHov(null)}
      onMouseMove={(e) => setHov(nearest(e.clientX))}
      onMouseLeave={() => setHov(null)}
      onClick={(e) => setHov(nearest(e.clientX))}
    >
      {hov != null ? (
        <TipBox className={`chart-tip ${hov > (x.length - 1) / 2 ? 'side-left' : 'side-right'}`} style={{ left: tipLeft, top: 0 }}>
          <b>
            {tipTitle ? `${tipTitle}, ` : ''}
            {x[hov]}
          </b>
          {oneClosure ? <span className="tip-sub">{oneClosure}</span> : null}
          {series.map((s) => (
            <span key={s.key ?? s.label} className="tip-row">
              <span className={`swatch${s.dashed ? ' dashed' : ''}`} style={{ borderTopColor: s.color }} />
              <span className="tip-name">
                {s.label}
                {s.closure && !oneClosure ? `, ${s.closure}` : ''}
              </span>
              <span className="tip-value">
                {(tipFormat ?? valueFormat)(s.values[hov])}
                {unit}
              </span>
            </span>
          ))}
        </TipBox>
      ) : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {/* bands first, so a marker label that reaches into one stays readable */}
        {bandRows.map(({ b, i, row }) => {
          if (i < 0) return null;
          const x0 = Math.max(L, sx(i) - half);
          const x1 = Math.min(R + 6, sx(i) + half);
          return (
            <g key={`band-${b.year}`}>
              <rect x={x0} y={TOP} width={x1 - x0} height={BOT - TOP} className="hl-band" />
              {b.label && !compact ? (
                <text x={(x0 + x1) / 2} y={labelY(row)} className="ax band-label" textAnchor="middle">
                  {b.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {markerRows.map(({ m, i, row, end }) => (
          <g key={`m-${m.year}`}>
            <line x1={sx(i)} x2={sx(i)} y1={TOP} y2={BOT} className="marker-line" />
            {compact ? null : (
              <text x={end ? sx(i) - 4 : sx(i) + 4} y={labelY(row)} className="ax marker-label" textAnchor={end ? 'end' : 'start'}>
                {m.label}
              </text>
            )}
          </g>
        ))}
        {cross != null ? <line x1={sx(cross)} x2={sx(cross)} y1={TOP} y2={BOT} className={`crosshair${hov == null ? ' is-linked' : ''}`} /> : null}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} y1={sy(v)} x2={R} y2={sy(v)} className="g" />
            <text x={L - 8} y={sy(v) + 4} className="ax" textAnchor="end" data-axis="">
              {tickFmt(v)}
            </text>
          </g>
        ))}
        <line x1={L} y1={BOT} x2={R} y2={BOT} className="axis-line" />
        {lo < 0 && hi > 0 ? (
          <g>
            <line x1={L} y1={sy(0)} x2={R} y2={sy(0)} className="zero-line" />
          </g>
        ) : null}
        {yUnit ? (
          <text
            className="ax axis-unit"
            transform={`translate(${unitX}, ${(TOP + BOT) / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {yUnit}
          </text>
        ) : null}
        {x.map((yr, i) =>
          showYear[i] ? (
            <text key={yr} x={sx(i)} y={BOT + 20} className="ax" textAnchor="middle">
              {yr}
            </text>
          ) : null,
        )}
        {xUnit ? (
          <text x={(L + R) / 2} y={BOT + 38} className="ax axis-unit" textAnchor="middle">
            {xUnit}
          </text>
        ) : null}
        {strip ? (
          <g>
            <line x1={stripX} y1={TOP} x2={stripX} y2={BOT} className="strip-rule" />
            <text x={stripX} y={TOP - 6} className="ax strip-title" textAnchor="middle">
              {strip.title}
            </text>
          </g>
        ) : null}
        {series.map((s) => (
          <g key={s.key ?? s.label}>
            <path
              className="lc-line"
              d={pathOf(s.values)}
              style={{ d: `path('${pathOf(s.values)}')` }}
              fill="none"
              stroke={s.color}
              strokeWidth={s.light ? '1.75' : s.dashed ? '2' : '2.5'}
              opacity={s.light ? 0.75 : 1}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              strokeLinejoin="round"
            />
            {s.values.map((v, i) =>
              !dots && i !== cross ? null : s.dashed ? (
                <circle key={i} className="lc-dot" cx={0} cy={0} style={{ transform: `translate(${sx(i).toFixed(1)}px, ${sy(v).toFixed(1)}px)` }} r={i === cross ? 5 : 3} fill="var(--pe-surface, #fff)" stroke={s.color} strokeWidth="1.6">
                  <title>{`${s.label}, ${x[i]}: ${valueFormat(v)}`}</title>
                </circle>
              ) : (
                <circle key={i} className="lc-dot" cx={0} cy={0} style={{ transform: `translate(${sx(i).toFixed(1)}px, ${sy(v).toFixed(1)}px)` }} r={i === cross ? 5 : 3.2} fill={s.color}>
                  <title>{`${s.label}, ${x[i]}: ${valueFormat(v)}`}</title>
                </circle>
              ),
            )}
          </g>
        ))}
        {points.map((p, pi) => {
          const up = p.offScale === 'high';
          const cy = stripY(p, pi);
          return (
            <g key={p.label}>
              <circle cx={stripX} cy={cy} r="4" fill="var(--pe-color-bg-primary)" stroke={p.color} strokeWidth="2" />
              {p.offScale ? (
                <path
                  d={
                    up
                      ? `M ${stripX - 4},${cy - 7} L ${stripX + 4},${cy - 7} L ${stripX},${cy - 13} Z`
                      : `M ${stripX - 4},${cy + 7} L ${stripX + 4},${cy + 7} L ${stripX},${cy + 13} Z`
                  }
                  fill={p.color}
                />
              ) : null}
            </g>
          );
        })}
        {labels.map((e) => (
          <g key={e.key}>
            {Math.abs(e.ly - e.y) > 1.5 || labelX - e.ax > 20 ? (
              <path
                d={
                  e.ax < stripX - 1 && strip
                    ? `M ${e.ax + 6},${e.y} L ${stripX - 8},${e.y} L ${labelX - 4},${e.ly}`
                    : `M ${e.ax + 6},${e.y} L ${labelX - 4},${e.ly}`
                }
                stroke={e.color}
                strokeWidth="1"
                fill="none"
                opacity=".5"
              />
            ) : null}
            <text key={e.lines.map((l) => l.map((w) => w.text).join(' ')).join('|')} className="lc-fade" x={labelX} y={e.ly + 4} style={{ font: `12px ${FONT}` }}>
              {e.lines.map((line, li) => (
                <tspan key={li} x={labelX} dy={li ? LINE : 0}>
                  {line.map((w, wi) => (
                    <tspan key={wi} style={{ fontWeight: w.weight }} fill={segFill(w.kind, e)}>
                      {wi ? ' ' : ''}
                      {w.text}
                    </tspan>
                  ))}
                </tspan>
              ))}
            </text>
            {e.subLines.map((t, si) => (
              <text
                key={si}
                x={labelX}
                y={e.ly + 4 + (e.lines.length - 1) * LINE + (si + 1) * SUB_ROW}
                style={{ font: `11px ${FONT}` }}
                fill="var(--pe-color-gray-500)"
              >
                {t}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
