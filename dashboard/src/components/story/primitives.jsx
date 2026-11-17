'use client';

import { useMemo, useState } from 'react';

// Drawing primitives for the story's SVG charts. Each takes `on` (the state
// is reached) and animates with CSS transitions only, so reduced motion is
// handled in one place (story.css). Text in charts is always the final value
// in the DOM; the stat tiles' count-ups (CountUp.jsx) keep the exact value in
// the DOM too and animate only a drawn copy.

// A path that draws itself when `on`.
export function DrawPath({ d, on, className = '', style, ...rest }) {
  return <path d={d} pathLength={1} className={`draw-path${on ? ' is-on' : ''} ${className}`} style={style} {...rest} />;
}

// The dot at the end of a DrawPath: it fades in as the draw finishes.
export function DrawEnd({ cx, cy, r = 3.5, on, className = '', ...rest }) {
  return <circle cx={cx} cy={cy} r={r} className={`draw-end${on ? ' is-on' : ''} ${className}`} {...rest} />;
}

// A rect that grows from its base (vertical bars) or from x0 (horizontal).
export function GrowRect({ x, y, width, height, on, horizontal = false, className = '', delay = 0, ...rest }) {
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(0, width)}
      height={Math.max(0, height)}
      className={`grow-rect${horizontal ? ' is-h' : ' is-v'}${on ? ' is-on' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    />
  );
}

// Fades in (and lifts a little) when `on`.
export function FadeG({ on, delay = 0, className = '', children, ...rest }) {
  return (
    <g className={`fade-g${on ? ' is-on' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </g>
  );
}

// A field of unit tiles (the story's recurring unit: one tile = a share of
// workers, households or output). `tiles`: [{ key, x, y, color, group,
// delay, enter, dim }], positions in tile units, keys stable across states.
// Moving a tile to a new x/y makes it travel (transform, 750ms, --ch-ease);
// travel is staggered by destination group, then row, over at most 450ms,
// so a regroup finishes inside 1.2s. A tile's own `delay` (ms) overrides
// the stagger. Colour changes in the last third of the travel, so the eye
// reads movement, not a cross-fade. `enter: 'drop'`: a tile that was not in
// the previous state falls in from 28px above, fading in (450ms). Reduced
// motion: final positions at once (story.css). Tile counts are the
// caller's: nothing is added or dropped here.
//
//   <TileField tiles={tiles} width={17} height={10} label="..." />
export const TILE_TRAVEL = 750;
export const TILE_STAGGER = 450;

// Delay (ms) per tile: own `delay`, else rank of (group, row) over the
// field, spread over TILE_STAGGER. Groups in order of first appearance;
// a tile without `group` is grouped by colour.
export function tileDelays(tiles, stagger = TILE_STAGGER) {
  const order = new Map();
  for (const t of tiles) {
    const g = t.group ?? t.color ?? '';
    if (!order.has(g)) order.set(g, order.size);
  }
  const rankKey = (t) => [order.get(t.group ?? t.color ?? ''), t.y];
  const keys = [...new Set(tiles.map((t) => rankKey(t).join(':')))]
    .map((k) => k.split(':').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((k) => k.join(':'));
  const rank = new Map(keys.map((k, i) => [k, i]));
  const n = keys.length;
  return tiles.map((t) => (Number.isFinite(t.delay) ? t.delay : n > 1 ? Math.round((rank.get(rankKey(t).join(':')) / (n - 1)) * stagger) : 0));
}

// When the last tile of a move has landed, in ms after the state change.
export const tileSettleMs = (tiles) => Math.max(0, ...tileDelays(tiles)) + TILE_TRAVEL;

export function TileField({ tiles, size = 14, gap = 3, width, height, label, className = '', legacy = false }) {
  const step = size + gap;
  // keys of the previous state, so a tile new to this state can drop in
  const sig = tiles.map((t) => t.key).join('|');
  const [snap, setSnap] = useState({ sig, prev: null });
  if (snap.sig !== sig) setSnap({ sig, prev: snap.sig });
  const prevKeys = useMemo(() => (snap.prev == null ? null : new Set(snap.prev.split('|'))), [snap.prev]);
  const delays = legacy ? null : tileDelays(tiles);
  return (
    <svg
      className={`tile-grid${legacy ? '' : ' tile-field'} ${className}`.trim()}
      viewBox={`0 0 ${width * step} ${height * step}`}
      role="img"
      aria-label={label}
    >
      {tiles.map((t, i) => {
        const drop = !legacy && t.enter === 'drop' && prevKeys && !prevKeys.has(t.key);
        const style = { transform: `translate(${t.x * step}px, ${t.y * step}px)`, fill: t.color };
        if (legacy) style.transitionDelay = `${t.delay ?? 0}ms`;
        else style['--d'] = `${delays[i]}ms`;
        return <rect key={t.key} className={`tile${t.dim ? ' is-dim' : ''}${drop ? ' is-drop' : ''}`} width={size} height={size} rx={2} style={style} />;
      })}
    </svg>
  );
}

// The wave-1 name: the same field with its original timing (900ms travel,
// the caller's delays, colour alongside), so existing figures move as before.
export function TileGrid(props) {
  return <TileField {...props} legacy />;
}
