'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sankey as d3sankey, sankeyJustify } from 'd3-sankey';

// A Sankey diagram for the story: flows as ribbons whose width is the value.
//
//   <Sankey graphs={[before, after]} active={i} label="..." />
//
// Each graph is { nodes: [{ id, label, sub?, color }], links: [{ source,
// target, value, color? }] }, with source and target as node ids. Every graph
// in `graphs` has the same nodes and links in the same order, so moving
// `active` from one graph to the next morphs the ribbons (CSS transitions on
// the path geometry; a browser without them jumps to the new state). All
// graphs share one scale: a pound is the same width in each, so a total that
// grows takes more room.
//
// The flow runs left to right at every width. Labels are direct (no legend): `label`
// on the first line, `sub` (value and share, formatted by the caller) on the
// second. First-column labels sit to the left of their node, last-column
// labels to the right, and middle-column labels above their node.
// prefers-reduced-motion removes the transitions (story.css), so each state
// is drawn at once.

// The box is the container's own width in pixels (measured), so text is
// drawn at its CSS size whatever the card's width; narrow boxes (< 420px)
// get narrower label rooms.
function useWidth(fallback) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const x = Math.round(e.contentRect.width);
      if (x > 0) setW((old) => (Math.abs(old - x) > 1 ? x : old));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Inflow minus outflow at every node that has both, for tests and checks:
// a well-formed flow returns an empty list.
export function imbalances(graph, tol = 1e-6) {
  const inn = {};
  const out = {};
  for (const l of graph.links) {
    out[l.source] = (out[l.source] ?? 0) + l.value;
    inn[l.target] = (inn[l.target] ?? 0) + l.value;
  }
  return graph.nodes
    .filter((n) => n.id in inn && n.id in out && Math.abs(inn[n.id] - out[n.id]) > tol * Math.max(1, Math.abs(inn[n.id])))
    .map((n) => ({ id: n.id, in: inn[n.id], out: out[n.id] }));
}

const total = (g) => {
  const targets = new Set(g.links.map((l) => l.target));
  return g.links.filter((l) => !targets.has(l.source)).reduce((s, l) => s + l.value, 0);
};

// Lay out one graph in a long x short box (long = the flow direction).
function layout(graph, x0, long, top, short, frac, nodeWidth, pad) {
  const gen = d3sankey()
    .nodeId((d) => d.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(nodeWidth)
    .nodePadding(pad)
    .nodeSort(null)
    .linkSort(null)
    .extent([
      [x0, top],
      [x0 + long, top + Math.max(pad * 2, short * frac)],
    ]);
  return gen({ nodes: graph.nodes.map((d) => ({ ...d })), links: graph.links.map((d) => ({ ...d })) });
}

// A ribbon as a filled band (not a stroke), so its width is exact.
function ribbon(l) {
  const w = l.width / 2;
  const x0 = l.source.x1;
  const x1 = l.target.x0;
  const xm = (x0 + x1) / 2;
  const a0 = l.y0 - w;
  const b0 = l.y0 + w;
  const a1 = l.y1 - w;
  const b1 = l.y1 + w;
  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  return `M${P(x0, a0)}C${P(xm, a0)} ${P(xm, a1)} ${P(x1, a1)}L${P(x1, b1)}C${P(xm, b1)} ${P(xm, b0)} ${P(x0, b0)}Z`;
}

export default function Sankey({ graphs, active = 0, label, width = 640, height = 340, nodeWidth = 14, pad = 18, leftRoom = 56, rightRoom = 150, narrowLeftRoom = 40, narrowRightRoom = 112 }) {
  const [ref, W] = useWidth(width);
  const narrow = W < 420;
  const H = narrow ? Math.round(height * 0.85) : height;
  const L = narrow ? narrowLeftRoom : leftRoom;
  const R = narrow ? narrowRightRoom : rightRoom;
  // room above for middle-column labels
  const top = 34;
  const long = W - L - R;
  const short = H - top - 6;
  const max = Math.max(...graphs.map(total));
  const g = graphs[Math.min(active, graphs.length - 1)];
  const laid = useMemo(() => layout(g, L, long, top, short, total(g) / max, nodeWidth, pad), [g, L, long, short, max, nodeWidth, pad]);
  return (
    <svg ref={ref} className="sankey" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <g className="sankey-links">
        {laid.links.map((l, i) => (
          <path
            key={`${l.source.id}-${l.target.id}-${i}`}
            className="sankey-link"
            d={ribbon(l)}
            style={{ fill: l.color ?? l.source.color, opacity: l.width > 0.5 ? 0.38 : 0 }}
          />
        ))}
      </g>
      <g className="sankey-nodes">
        {laid.nodes.map((n) => {
          const first = n.x0 <= L + 1;
          const last = n.x1 >= L + long - 1;
          const middle = !first && !last;
          const tx = first ? n.x0 - 6 : last ? n.x1 + 6 : (n.x0 + n.x1) / 2;
          const anchor = first ? 'end' : last ? 'start' : 'middle';
          // beside the node, centred on it; above it for a middle column
          const ty = middle ? n.y0 - (n.sub ? 20 : 7) : (n.y0 + n.y1) / 2 - (n.sub ? 7 : 0);
          return (
            <g key={n.id} className="sankey-node" data-node={n.id}>
              <rect className="sankey-rect" x={n.x0} y={n.y0} width={Math.max(n.x1 - n.x0, 1)} height={Math.max(n.y1 - n.y0, 1)} style={{ fill: n.color }} />
              <text className="sankey-label" x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle">
                <tspan x={tx}>{n.label}</tspan>
                {n.sub ? (
                  <tspan className="sankey-sub" x={tx} dy="1.25em">
                    {n.sub}
                  </tspan>
                ) : null}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
