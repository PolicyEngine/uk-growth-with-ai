import { FadeG } from '../primitives.jsx';

// Direct labels at the right ends of lines (from part2/frame.jsx). Positions
// are set over every item, drawn or not, so a label never moves when
// another line arrives; overlapping labels are pushed apart and kept inside
// [top, bottom]. items: [{ key, y (px of the line end), lines: [text],
// color, on }]. `delay` (ms) holds labels until their lines have drawn.
//
//   <EndLabels x={plotRight + 6} top={plotTop} bottom={plotBottom} items={[{ key: 'a', y: y(1.2), lines: ['UK central'], color: 'var(--series-2)', on }]} />

// Pure placement: each item gets `t` (top of its first line, px) and
// `shift` (how far it moved from centred on its line end).
export function placeLabels(items, { top = 0, bottom = Infinity, lineHeight = 16 } = {}) {
  const LH = lineHeight;
  const placed = items
    .filter((it) => Number.isFinite(it.y))
    .map((it) => ({ ...it, h: (it.lines?.length ?? 1) * LH }))
    .sort((a, b) => a.y - b.y);
  placed.forEach((p, i) => {
    p.t = p.y - LH / 2;
    if (i && p.t < placed[i - 1].t + placed[i - 1].h) p.t = placed[i - 1].t + placed[i - 1].h;
  });
  for (let i = placed.length - 1; i >= 0; i--) {
    const limit = i === placed.length - 1 ? bottom : placed[i + 1].t;
    if (placed[i].t + placed[i].h > limit) placed[i].t = limit - placed[i].h;
  }
  placed.forEach((p) => {
    p.t = Math.max(top - LH / 2, p.t);
    p.shift = p.t - (p.y - LH / 2);
  });
  return placed;
}

// True when two line ends sit within `gap` px of each other: then a legend
// reads better than end labels (section 4's rule).
export const crowded = (ys, gap = 14) => {
  const s = ys.filter(Number.isFinite).sort((a, b) => a - b);
  return s.some((v, i) => i && v - s[i - 1] < gap);
};

export default function EndLabels({ items, x, top, bottom, lineHeight = 16, delay = 0, className = '' }) {
  const placed = placeLabels(items, { top, bottom, lineHeight });
  return (
    <g className={`ch-end-labels ${className}`.trim()}>
      {placed.map((p) => (
        <FadeG key={p.key} on={p.on ?? true} delay={p.on === false ? 0 : delay}>
          <text className="ch-label" x={x} y={p.t + lineHeight * 0.75} style={{ fill: p.color }}>
            {p.lines.map((l, i) => (
              <tspan key={`${i}${l}`} x={x} dy={i ? lineHeight : 0}>
                {l}
              </tspan>
            ))}
          </text>
        </FadeG>
      ))}
    </g>
  );
}
