'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sankey as d3sankey, sankeyJustify } from 'd3-sankey';
import { useReducedMotion, useScrollyEntry } from './motion.js';

const WIPE_STEP = 600; // ms between columns revealed together
// wave-2 build-up (scene plan section 6), ms
const SRC_GROW = 400;
const SRC_STAGGER = 40;
const POUR = 800;
const ARRIVE = 650;
const LANE = 7; // flow lanes about 7px apart

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
// labels to the right, and middle-column labels below their node, ending at
// its left edge (under the incoming ribbon).
// prefers-reduced-motion removes the transitions (story.css), so each state
// is drawn at once.
//
// Opt-in, for part 2's output split (a caller that passes none of these
// draws exactly as before):
//   linkOpacity  ribbon opacity (default 0.38);
//   reveal       the number of link columns shown, left to right: ribbons
//                from deeper columns carry `is-wipe` without `is-on`, and
//                nodes deeper than `reveal` carry `is-hidden` (the caller's
//                CSS wipes and fades them; they stay in the DOM, figures too).
//                `--wipe-delay` on each ribbon staggers columns revealed at
//                once, so the left column wipes in first;
//   highlight    a node id: ribbons into it get `is-hl`, the rest `is-dim`;
//   onHover      called with a ribbon's target id on hover or focus, and
//                null on leave;
//   node.stroke, node.labelColor  a node's outline and label colour.
//   node.inline  `sub` on the label's own line ("Kept in the UK 16.3"),
//                not a second line: for crowded end columns.
//   With onHover, ribbons are also focusable (focus and blur act as hover).
//
// Opt-in, wave 2 (scene plan section 6; none changes the default drawing):
//   nodeWidth    a number, or an array of widths by depth (e.g. [44, 44, 44]
//                or [14, 60]); below 480px of measured width every node is
//                14px and every value sits outside;
//   inside       a node's `inner` (its value, short) is drawn inside it, in
//                white, when the node is at least 18px tall; its `sub` line
//                is then not drawn (each value once). Otherwise `sub` sits
//                beside the name as now, with a 1px leader when the node is
//                under 6px;
//   pour         the number of link columns poured, as `reveal`, with the
//                build-up: source nodes grow from their centres (several
//                rise bottom to top, 40ms apart), then each ribbon is
//                revealed left to right (clip-path, 800ms), `pourGap` ms
//                apart per target (top to bottom, or the order of
//                `pourOrder`, an array of target ids), and each target node
//                with its label and value fades in as its ribbon lands. A
//                single graph is enough. Everything stays in the DOM (opacity
//                and clip-path only);
//   replayKey    changing it re-runs the build-up;
//   flow         dashes drift along each ribbon on lanes about 7px apart (so
//                moving matter follows the ribbon's width), one speed for
//                all, after the build settles; off under reduced motion and
//                at 900px and below;
//   interactive  ribbons and nodes are focusable; hover or focus lights
//                everything upstream and downstream of it end to end (the
//                rest drops to 0.25), calls onHover(node id) and shows
//                `tooltip({ kind: 'link' | 'node', link, node })` in a card
//                mounted only while active; `highlight` lights end to end too.
//                Escape clears;
//   onNodeBox    called with { width, height, nodes: { id: { x0, y0, x1, y1 } } }
//                (px in the drawing) whenever the layout changes.

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

export default function Sankey({
  graphs,
  active = 0,
  label,
  width = 640,
  height = 340,
  nodeWidth = 14,
  pad = 18,
  leftRoom = 56,
  rightRoom = 150,
  narrowLeftRoom = 40,
  narrowRightRoom = 112,
  linkOpacity = 0.38,
  reveal,
  highlight,
  onHover,
  inside = false,
  pour,
  pourOrder,
  pourGap = 90,
  replayKey,
  flow = false,
  interactive = false,
  tooltip,
  onNodeBox,
}) {
  // the columns shown before this render, so a newly revealed column waits
  // only for the columns revealed with it
  const [seen, setSeen] = useState({ cur: reveal, from: reveal ?? 0 });
  if (seen.cur !== reveal) setSeen({ cur: reveal, from: seen.cur ?? 0 });
  const wiping = reveal != null;
  const [ref, W] = useWidth(width);
  const reduce = useReducedMotion();
  // reversible (round 1): inside a Scrolly the pour waits for the figure's
  // entry, re-arms on each entry (scrolling back above the scene resets
  // it), and a landing by a jump or a link shows it poured at once
  const entry = useScrollyEntry();
  const narrow = W < 420;
  const perDepth = Array.isArray(nodeWidth);
  const refined = perDepth || inside || pour != null;
  const tight = W < 480; // the wave-2 narrow rule
  const widths = perDepth && !tight ? nodeWidth : null;
  const baseW = perDepth ? (widths ? Math.max(...widths) : 14) : nodeWidth;
  const H = narrow ? Math.round(height * 0.85) : height;
  const L = narrow ? narrowLeftRoom : leftRoom;
  // end nodes with an `inline` value need room for "label value" on one
  // line: about 6.7 units a character at 12px, plus the 6-unit offset
  const g0 = graphs[0];
  const inlineRoom = Math.max(
    0,
    ...g0.nodes.filter((n) => n.inline && n.sub && !g0.links.some((l) => l.source === n.id)).map((n) => Math.ceil((n.label.length + 1 + String(n.sub).length) * 6.7) + 10),
  );
  const R = Math.max(narrow ? narrowRightRoom : rightRoom, inlineRoom);
  const top = 8;
  const long = W - L - R;
  // room below for middle-column labels, when the graph has a middle column
  const hasMiddle = g0.nodes.some((n) => g0.links.some((l) => l.source === n.id) && g0.links.some((l) => l.target === n.id));
  const short = H - top - (hasMiddle ? 30 : 6);
  const max = Math.max(...graphs.map(total));
  const g = graphs[Math.min(active, graphs.length - 1)];
  const laid = useMemo(() => {
    const out = layout(g, L, long, top, short, total(g) / max, baseW, pad);
    if (widths) {
      for (const n of out.nodes) {
        const w = widths[Math.min(n.depth, widths.length - 1)];
        if (n.x0 <= L + 1) n.x1 = n.x0 + w;
        else if (n.x1 >= L + long - 1) n.x0 = n.x1 - w;
        else {
          const c = (n.x0 + n.x1) / 2;
          n.x0 = c - w / 2;
          n.x1 = c + w / 2;
        }
      }
    }
    return out;
  }, [g, L, long, short, max, baseW, pad, widths]);

  // node boxes for callers that place things on the figure
  const boxCb = useRef(onNodeBox);
  useEffect(() => {
    boxCb.current = onNodeBox;
  });
  const boxSig = useRef('');
  useEffect(() => {
    if (!boxCb.current) return;
    const nodes = Object.fromEntries(laid.nodes.map((n) => [n.id, { x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1 }]));
    const sig = JSON.stringify([W, H, nodes]);
    if (sig === boxSig.current) return;
    boxSig.current = sig;
    boxCb.current({ width: W, height: H, nodes });
  }, [laid, W, H]);

  // build-up: re-armed by replayKey (one frame at nothing poured)
  const armKey = `${replayKey ?? ''}|${entry?.run ?? 0}`;
  const [armed, setArmed] = useState({ key: armKey, on: true });
  if (armed.key !== armKey) setArmed({ key: armKey, on: false });
  useEffect(() => {
    if (armed.on) return undefined;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setArmed((a) => ({ ...a, on: true }))));
    return () => cancelAnimationFrame(r);
  }, [armed.on]);
  const pouring = pour != null;
  const entryOn = !entry || entry.entered;
  const instant = Boolean(entry?.instant) && !reduce;
  const poured = pouring ? (armed.on && entryOn ? pour : 0) : null;
  const [pseen, setPseen] = useState({ cur: poured, from: poured ?? 0 });
  if (pseen.cur !== poured) setPseen({ cur: poured, from: Math.min(pseen.cur ?? 0, poured ?? 0) });
  const timing = useMemo(() => {
    if (!pouring) return null;
    const from = Math.min(pseen.from, poured);
    const link = new Map();
    const node = new Map();
    const srcs = laid.nodes.filter((n) => n.depth === 0).sort((a, b) => b.y0 - a.y0);
    let t = 0;
    if (from === 0) {
      srcs.forEach((n, i) => node.set(n.id, i * SRC_STAGGER));
      t = SRC_GROW + SRC_STAGGER * Math.max(0, srcs.length - 1);
    }
    const cols = Math.max(0, ...laid.links.map((l) => l.source.depth + 1));
    for (let c = from; c < Math.min(poured, cols); c++) {
      const ls = laid.links.filter((l) => l.source.depth === c);
      const targets = [...new Set(ls.map((l) => l.target))].sort((a, b) => {
        if (pourOrder) return pourOrder.indexOf(a.id) - pourOrder.indexOf(b.id);
        return a.y0 - b.y0;
      });
      let last = t;
      for (const l of ls) {
        const d = t + targets.indexOf(l.target) * pourGap;
        link.set(l, d);
        node.set(l.target.id, Math.min(node.get(l.target.id) ?? Infinity, d + ARRIVE));
        last = Math.max(last, d);
      }
      t = last + POUR;
    }
    return { link, node, settle: t };
  }, [pouring, pseen.from, poured, laid, pourOrder, pourGap]);
  // at every width (round 1: nothing is static just because the screen is narrow)
  const flowing = flow && !reduce && (!pouring || poured > 0);

  // interactive highlight, end to end
  const [hot, setHot] = useState(null);
  const lit = useMemo(() => {
    const key = hot ?? (interactive && highlight != null ? { kind: 'node', id: highlight } : null);
    if (!key) return null;
    const up = (id, acc) => {
      for (const l of laid.links) if (l.target.id === id && !acc.has(l)) (acc.add(l), up(l.source.id, acc));
      return acc;
    };
    const down = (id, acc) => {
      for (const l of laid.links) if (l.source.id === id && !acc.has(l)) (acc.add(l), down(l.target.id, acc));
      return acc;
    };
    const set = new Set();
    if (key.kind === 'link') {
      const l = laid.links[key.i];
      if (!l) return null;
      set.add(l);
      up(l.source.id, set);
      down(l.target.id, set);
    } else {
      up(key.id, set);
      down(key.id, set);
    }
    const nodes = new Set();
    for (const l of set) (nodes.add(l.source.id), nodes.add(l.target.id));
    if (key.kind === 'node') nodes.add(key.id);
    return { links: set, nodes };
  }, [hot, interactive, highlight, laid]);
  const enter = (h, id) => {
    setHot(h);
    onHover?.(id);
  };
  const leave = () => {
    setHot(null);
    onHover?.(null);
  };
  const focusable = interactive || !!onHover;

  const svg = (
    <svg
      ref={interactive ? undefined : ref}
      className={`sankey${interactive ? ' is-interactive' : ''}${pouring ? ' is-pouring' : ''}${instant ? ' is-instant' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role={focusable ? 'group' : 'img'}
      aria-label={label}
      onKeyDown={interactive ? (e) => e.key === 'Escape' && leave() : undefined}
    >
      <g className="sankey-links">
        {laid.links.map((l, i) => {
          const col = l.source.depth;
          const cls = [
            'sankey-link',
            wiping ? `is-wipe${col < reveal ? ' is-on' : ''}` : '',
            pouring ? `is-pour${col < poured ? ' is-on' : ''}` : '',
            lit ? (lit.links.has(l) ? 'is-hl' : 'is-dim') : !interactive && highlight != null ? (l.target.id === highlight ? 'is-hl' : 'is-dim') : '',
          ]
            .filter(Boolean)
            .join(' ');
          const style = { fill: l.color ?? l.source.color, opacity: l.width > 0.5 ? linkOpacity : 0 };
          if (lit && l.width > 0.5) style.opacity = lit.links.has(l) ? Math.max(linkOpacity, 0.85) : 0.25;
          if (wiping) style['--wipe-delay'] = `${Math.max(0, col - Math.min(seen.from, reveal)) * WIPE_STEP}ms`;
          if (timing?.link.has(l)) style['--pour-delay'] = `${timing.link.get(l)}ms`;
          let hover = null;
          if (interactive) {
            hover = {
              tabIndex: 0,
              'aria-label': `${l.source.label} to ${l.target.label}`,
              onMouseEnter: () => enter({ kind: 'link', i }, l.target.id),
              onMouseLeave: leave,
              onFocus: () => enter({ kind: 'link', i }, l.target.id),
              onBlur: leave,
              'data-target': l.target.id,
            };
          } else if (onHover) {
            hover = {
              tabIndex: 0,
              'aria-label': `${l.source.label} to ${l.target.label}`,
              onMouseEnter: () => onHover(l.target.id),
              onMouseLeave: () => onHover(null),
              onFocus: () => onHover(l.target.id),
              onBlur: () => onHover(null),
              'data-target': l.target.id,
            };
          }
          return <path key={`${l.source.id}-${l.target.id}-${i}`} className={cls} d={ribbon(l)} style={style} {...hover} />;
        })}
      </g>
      {flowing ? (
        <g className="sankey-flow" aria-hidden="true" style={{ '--flow-delay': `${timing ? timing.settle : 0}ms` }}>
          {laid.links
            .filter((l) => l.width > 0.5 && (!pouring || l.source.depth < poured))
            .flatMap((l, i) => lanes(l).map((d, k) => <path key={`${i}-${k}`} className={`sankey-flow-lane${l.width < 4 ? ' is-thin' : ''}`} d={d} />))}
        </g>
      ) : null}
      <g className="sankey-nodes">
        {laid.nodes.map((n) => {
          const first = n.x0 <= L + 1;
          const last = n.x1 >= L + long - 1;
          const middle = !first && !last;
          const nh = n.y1 - n.y0;
          const inner = inside && !tight && n.inner != null && nh >= 18;
          const sub = inner ? null : n.sub;
          // `inline`: the value on the label's own line (crowded end nodes)
          const twoLine = sub && !n.inline;
          // beside the node, centred on it. A middle-column label goes
          // below its node, ending at the node's left edge: there it sits
          // under the incoming ribbon, never on a ribbon. Kept inside the box.
          const tx = first ? n.x0 - 6 : last ? n.x1 + 6 : n.x0 - 4;
          const anchor = first || middle ? 'end' : 'start';
          const ty = middle ? Math.min(n.y1 + 12, H - (twoLine ? 22 : 8)) : (n.y0 + n.y1) / 2 - (twoLine ? 7 : 0);
          const shown = !pouring || n.depth === 0 ? !pouring || poured > 0 : n.depth <= poured;
          const cls = ['sankey-node', wiping && n.depth > reveal ? 'is-hidden' : '', pouring ? `is-pour${n.depth === 0 ? ' is-src' : ''}${shown ? ' is-on' : ''}` : '', lit ? (lit.nodes.has(n.id) ? 'is-hl' : 'is-dim') : '']
            .filter(Boolean)
            .join(' ');
          const style = {};
          if (wiping) style['--wipe-delay'] = `${Math.max(0, n.depth - Math.min(seen.from, reveal)) * WIPE_STEP}ms`;
          if (timing?.node.has(n.id)) style['--pour-delay'] = `${timing.node.get(n.id)}ms`;
          const nodeHover = interactive
            ? {
                tabIndex: 0,
                'aria-label': n.label,
                onMouseEnter: () => enter({ kind: 'node', id: n.id }, n.id),
                onMouseLeave: leave,
                onFocus: () => enter({ kind: 'node', id: n.id }, n.id),
                onBlur: leave,
              }
            : null;
          return (
            <g key={n.id} className={cls} data-node={n.id} style={wiping || pouring ? style : undefined} {...nodeHover}>
              <rect
                className="sankey-rect"
                x={n.x0}
                y={n.y0}
                width={Math.max(n.x1 - n.x0, 1)}
                height={Math.max(nh, 1)}
                rx={refined && !tight ? Math.min(3, nh / 2) : undefined}
                style={n.stroke ? { fill: n.color, stroke: n.stroke, strokeWidth: 1 } : { fill: n.color }}
              />
              {refined && !inner && nh < 6 && !middle ? (
                <line className="sankey-leader" x1={first ? n.x0 : n.x1} x2={first ? n.x0 - 4 : n.x1 + 4} y1={(n.y0 + n.y1) / 2} y2={(n.y0 + n.y1) / 2} />
              ) : null}
              {inner ? (
                <text className="sankey-value" x={(n.x0 + n.x1) / 2} y={(n.y0 + n.y1) / 2} textAnchor="middle" dominantBaseline="central">
                  {n.inner}
                </text>
              ) : null}
              <text className="sankey-label" x={tx} y={ty} textAnchor={anchor} dominantBaseline="middle" style={n.labelColor ? { fill: n.labelColor } : undefined}>
                <tspan x={tx}>{n.label}</tspan>
                {sub && n.inline ? (
                  <tspan className="sankey-sub" dx="0.3em">
                    {sub}
                  </tspan>
                ) : null}
                {twoLine ? (
                  <tspan className="sankey-sub" x={tx} dy="1.25em">
                    {sub}
                  </tspan>
                ) : null}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
  if (!interactive) return svg;
  // the tooltip: at the ribbon's middle or beside the node, flipping side at
  // the drawing's midpoint; mounted only while something is lit
  let tip = null;
  if (hot && tooltip) {
    const l = hot.kind === 'link' ? laid.links[hot.i] : null;
    const n = hot.kind === 'node' ? laid.nodes.find((x) => x.id === hot.id) : null;
    const content = tooltip({ kind: hot.kind, link: l, node: n });
    if (content) {
      const x = l ? (l.source.x1 + l.target.x0) / 2 : n.x1 + 8;
      const y = l ? (l.y0 + l.y1) / 2 : (n.y0 + n.y1) / 2;
      const right = x > W / 2;
      tip = (
        <div className={`sankey-tip${right ? ' is-left' : ''}`} role="tooltip" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}>
          {content}
        </div>
      );
    }
  }
  return (
    <div className="sankey-wrap" ref={ref}>
      {svg}
      {tip}
    </div>
  );
}

// Flow lanes along a ribbon's centre line, about LANE px apart across its
// width (one lane under 4px), each the ribbon's own cubic shifted sideways.
function lanes(l) {
  const n = l.width < 4 ? 1 : Math.max(1, Math.floor(l.width / LANE));
  const x0 = l.source.x1;
  const x1 = l.target.x0;
  const xm = (x0 + x1) / 2;
  const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  return Array.from({ length: n }, (_, k) => {
    const o = n === 1 ? 0 : -l.width / 2 + (l.width / n) * (k + 0.5);
    return `M${P(x0, l.y0 + o)}C${P(xm, l.y0 + o)} ${P(xm, l.y1 + o)} ${P(x1, l.y1 + o)}`;
  });
}
