'use client';

import { useEffect, useRef, useState } from 'react';

// Plotly needs literal colours, so `var(--token)` values (the shared chart
// palette in globals.css) are resolved against the document at draw time.
function resolveColor(c) {
  if (typeof c !== 'string' || !c.startsWith('var(')) return c;
  const name = c.slice(4, -1).split(',')[0].trim();
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || c;
}

const FALLBACK_PALETTE = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6'];

// Chart chrome (paper, grid, axes, type) comes from the PolicyEngine tokens
// in globals.css, resolved to literals at draw time like the series colours.
function baseLayout(title) {
  const paper = resolveColor('var(--pe-color-bg-primary)');
  const grid = resolveColor('var(--pe-color-gray-100)');
  const axis = resolveColor('var(--pe-color-gray-500)');
  const line = resolveColor('var(--pe-color-gray-200)');
  return {
    margin: { ...MARGIN },
    paper_bgcolor: paper,
    plot_bgcolor: paper,
    font: { family: 'Inter, Roboto, sans-serif', size: 11, color: resolveColor('var(--pe-color-gray-600)') },
    xaxis: {
      showgrid: true,
      gridcolor: grid,
      zeroline: false,
      color: axis,
      ticks: 'outside',
      tickfont: { size: 11 },
      linecolor: line,
    },
    yaxis: {
      title: {
        text: title,
        font: { size: 13, color: resolveColor('var(--pe-color-gray-800)'), family: 'Inter, Roboto, sans-serif' },
        standoff: 14,
      },
      showgrid: true,
      gridcolor: grid,
      zeroline: false,
      color: axis,
      tickfont: { size: 11 },
      linecolor: line,
      automargin: true,
    },
    showlegend: false,
    hovermode: 'x unified',
    shapes: [],
  };
}

// A shape with a `label` gets an on-chart annotation at the top of its rule,
// in place of a legend entry. A label drawn right of its rule that would run
// past the plot's right edge (a narrow column, or a rule near the end of the
// x range) flips to the left of the rule and moves up one row, clear of any
// label already sitting there.
const MARGIN = { l: 86, r: 18, t: 30, b: 44 };
const LABEL_ROW = 15;
const labelWidth = (text) => text.length * 6.2 + 8;

function xExtent(traces) {
  const xs = traces.flatMap((t) => t.x).filter((v) => typeof v === 'number');
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
}

function buildAnnotations(rawShapes, extent, width) {
  const plotW = width - MARGIN.l - MARGIN.r;
  let raised = false;
  const annotations = (rawShapes || [])
    .filter((s) => s.label)
    .map((s) => {
      let left = s.labelSide === 'left';
      let yshift = 0;
      if (!left && extent && plotW > 0) {
        const room = ((extent[1] - s.x0) / (extent[1] - extent[0] || 1)) * plotW + MARGIN.r;
        if (labelWidth(s.label) > room) {
          left = true;
          yshift = LABEL_ROW;
          raised = true;
        }
      }
      return {
        x: s.x0,
        xref: 'x',
        y: 1,
        yref: 'paper',
        yanchor: 'bottom',
        xanchor: left ? 'right' : 'left',
        xshift: left ? -4 : 4,
        yshift,
        text: s.label,
        showarrow: false,
        font: { size: 11, color: resolveColor(s.color) || resolveColor('var(--pe-color-gray-500)') },
      };
    });
  return { annotations, marginT: MARGIN.t + (raised ? LABEL_ROW : 0) };
}

function buildShapes(rawShapes) {
  return (rawShapes || []).map((s) => ({
    type: 'line',
    xref: 'x',
    yref: 'paper',
    x0: s.x0,
    x1: s.x1,
    y0: 0,
    y1: 1,
    line: {
      color: resolveColor(s.color) || resolveColor('var(--pe-color-gray-400)'),
      width: s.width || 1,
      dash: s.dash || 'dot',
    },
  }));
}

// `firstNames` is the trace-name list from panel index 0 of this group; later
// panels inherit any empty names by position (Plotly subplot pattern).
const NO_NAMES = [];

export default function PlotPanel({ panel, firstNames = NO_NAMES, visible = true }) {
  const ref = useRef(null);
  // Plotly arrives by a deferred CDN <script> in layout.tsx, which can land
  // after this component mounts. Poll until it is there instead of giving up,
  // or the chart stays blank until the next prop change.
  const [plotlyReady, setPlotlyReady] = useState(false);
  const panelRef = useRef(panel);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);
  useEffect(() => {
    const id = setInterval(() => {
      if (window.Plotly) {
        setPlotlyReady(true);
        clearInterval(id);
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!plotlyReady) return;
    const el = ref.current;
    if (!el) return;

    const traces = panel.traces.map((t, i) => {
      const name = t.name || firstNames[i] || '';
      return {
        x: t.x,
        y: t.y,
        mode: 'lines',
        type: 'scatter',
        name,
        line: {
          color: resolveColor(t.color) || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
          width: t.width || 2,
          dash: t.dash || 'solid',
        },
        showlegend: false,
        hovertemplate: `%{x}: %{y:.2f}<extra>${name}</extra>`,
      };
    });

    const layout = baseLayout(panel.yTitle !== undefined ? panel.yTitle : panel.title);
    layout.shapes = buildShapes(panel.shapes);
    // Pin the x axis to the data: Plotly's autorange also stretches to fit
    // annotation text, which on a narrow chart pushed the axis decades
    // past the last year.
    const extent = xExtent(panel.traces);
    if (extent) layout.xaxis.range = extent;
    const { annotations, marginT } = buildAnnotations(panel.shapes, extent, el.clientWidth);
    layout.annotations = annotations;
    layout.margin.t = marginT;
    // Panels can ask for a zero-based y axis. Left off by default so the
    // template's own charts keep their tight auto-range.
    if (panel.yRangeMode) layout.yaxis.rangemode = panel.yRangeMode;
    layout.showlegend = false;

    window.Plotly.newPlot(el, traces, layout, { displayModeBar: false, responsive: true });

    return () => {
      try {
        window.Plotly.purge(el);
      } catch {
        /* ignore */
      }
    };
  }, [panel, firstNames, plotlyReady]);

  // Plotly's `responsive` only listens for window resizes. Follow the
  // container instead, so a chart drawn in a hidden tab or a half-width
  // column picks up its real width once it is laid out.
  useEffect(() => {
    const el = ref.current;
    if (!plotlyReady || !el || typeof ResizeObserver === 'undefined') return undefined;
    let last = 0;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w <= 0 || w === last || !el.data) return;
      last = w;
      const p = panelRef.current;
      const { annotations, marginT } = buildAnnotations(p.shapes, xExtent(p.traces), w);
      const shifts = (list) => list.map((a) => `${a.xanchor}${a.yshift || 0}`).join();
      const relabel = shifts(annotations) !== shifts(el.layout.annotations || []);
      Promise.resolve(window.Plotly.Plots.resize(el))
        .then(() => relabel && window.Plotly.relayout(el, { annotations, 'margin.t': marginT }))
        .catch(() => {});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [plotlyReady]);

  // Resize when becoming visible (e.g. tab switch or filter changes).
  useEffect(() => {
    if (!visible || !plotlyReady || !ref.current) return;
    const id = requestAnimationFrame(() => {
      try {
        window.Plotly.Plots.resize(ref.current);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [visible, plotlyReady]);

  return (
    <div className="panel-cell" style={{ display: visible ? '' : 'none' }}>
      <div className="plot" ref={ref} />
    </div>
  );
}
