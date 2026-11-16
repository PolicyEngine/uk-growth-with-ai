'use client';

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

// A grid of tiles (the story's recurring unit: one tile = a share of
// workers, households or output). `tiles`: [{ key, x, y, color, dim }]
// positions in tile units; moving a tile to a new x/y animates it, which
// is how tiles regroup between steps.
export function TileGrid({ tiles, size = 14, gap = 3, width, height, label }) {
  const step = size + gap;
  return (
    <svg className="tile-grid" viewBox={`0 0 ${width * step} ${height * step}`} role="img" aria-label={label}>
      {tiles.map((t) => (
        <rect
          key={t.key}
          className={`tile${t.dim ? ' is-dim' : ''}`}
          width={size}
          height={size}
          rx={2}
          style={{ transform: `translate(${t.x * step}px, ${t.y * step}px)`, fill: t.color, transitionDelay: `${t.delay ?? 0}ms` }}
        />
      ))}
    </svg>
  );
}
