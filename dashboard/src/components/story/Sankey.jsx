'use client';

import { useEffect, useMemo, useState } from 'react';
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
// Wide screens lay the flow out left to right; phones (<= 600px) top to
// bottom, with the labels beside each node row. Labels are direct (no
// legend): `label` on its first line, `sub` (value and share, formatted by
// the caller) on the second. prefers-reduced-motion removes the transitions
// (story.css), so each state is drawn at once.

const PHONE = '(max-width: 600px)';

function usePhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
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
function layout(graph, long, short, frac, nodeWidth, pad) {
  const gen = d3sankey()
    .nodeId((d) => d.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(nodeWidth)
    .nodePadding(pad)
    .nodeSort(null)
    .linkSort(null)
    .extent([
      [0, 0],
      [long, Math.max(pad * 2, short * frac)],
    ]);
  return gen({ nodes: graph.nodes.map((d) => ({ ...d })), links: graph.links.map((d) => ({ ...d })) });
}

// A ribbon as a filled band (not a stroke), so its width is exact.
function ribbon(l, vertical) {
  const w = l.width / 2;
  const x0 = l.source.x1;
  const x1 = l.target.x0;
  const xm = (x0 + x1) / 2;
  const a0 = l.y0 - w;
  const b0 = l.y0 + w;
  const a1 = l.y1 - w;
  const b1 = l.y1 + w;
  const P = vertical ? (x, y) => `${y.toFixed(1)},${x.toFixed(1)}` : (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  return `M${P(x0, a0)}C${P(xm, a0)} ${P(xm, a1)} ${P(x1, a1)}L${P(x1, b1)}C${P(xm, b1)} ${P(xm, b0)} ${P(x0, b0)}Z`;
}

export default function Sankey({ graphs, active = 0, label, width = 640, height = 360, phoneHeight = 520, nodeWidth = 14, pad = 18 }) {
  const phone = usePhone();
  const vertical = phone;
  const W = vertical ? 340 : width;
  const H = vertical ? phoneHeight : height;
  // wide: room for the last column's labels on the right; phone: labels sit
  // below each node bar, so the flow takes the full width
  const labelRoom = vertical ? 8 : 170;
  const long = vertical ? H - 40 : W - labelRoom;
  const short = vertical ? W - labelRoom : H - 8;
  const max = Math.max(...graphs.map(total));
  const g = graphs[Math.min(active, graphs.length - 1)];
  const laid = useMemo(() => layout(g, long, short, total(g) / max, nodeWidth, pad), [g, long, short, max, nodeWidth, pad]);

  const node = (n) => (vertical ? { x: n.y0, y: n.x0, w: n.y1 - n.y0, h: n.x1 - n.x0 } : { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 });
  return (
    <svg className="sankey" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <g className="sankey-links">
        {laid.links.map((l, i) => (
          <path
            key={`${l.source.id}-${l.target.id}-${i}`}
            className="sankey-link"
            d={ribbon(l, vertical)}
            style={{ fill: l.color ?? l.source.color, opacity: l.width > 0.5 ? 0.38 : 0 }}
          />
        ))}
      </g>
      <g className="sankey-nodes">
        {laid.nodes.map((n) => {
          const r = node(n);
          // wide: right of the node, except in the right half before the last
          // column, where it sits to the left; phone: centred below the bar
          const last = !vertical && n.x1 >= long - 1;
          const left = !vertical && !last && n.x0 > long / 2;
          const tx = vertical ? Math.min(Math.max(r.x + r.w / 2, 40), W - 40) : left ? n.x0 - 6 : n.x1 + 6;
          const ty = vertical ? r.y + r.h + 13 : r.y + r.h / 2;
          const anchor = vertical ? 'middle' : left ? 'end' : 'start';
          return (
            <g key={n.id} className="sankey-node" data-node={n.id}>
              <rect className="sankey-rect" x={r.x} y={r.y} width={Math.max(r.w, 1)} height={Math.max(r.h, 1)} style={{ fill: n.color }} />
              <text className="sankey-label" x={tx} y={ty} textAnchor={anchor} dominantBaseline={vertical ? 'hanging' : 'middle'}>
                <tspan x={tx} dy={!vertical && n.sub ? '-0.55em' : 0}>
                  {n.label}
                </tspan>
                {n.sub ? (
                  <tspan className="sankey-sub" x={tx} dy="1.2em">
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
