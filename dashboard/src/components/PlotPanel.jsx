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
    margin: { l: 86, r: 18, t: 30, b: 44 },
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
// in place of a legend entry.
function buildAnnotations(rawShapes) {
  return (rawShapes || [])
    .filter((s) => s.label)
    .map((s) => ({
      x: s.x0,
      xref: 'x',
      y: 1,
      yref: 'paper',
      yanchor: 'bottom',
      xanchor: s.labelSide === 'left' ? 'right' : 'left',
      xshift: s.labelSide === 'left' ? -4 : 4,
      text: s.label,
      showarrow: false,
      font: { size: 11, color: resolveColor(s.color) || resolveColor('var(--pe-color-gray-500)') },
    }));
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

    const layout = baseLayout(panel.title);
    layout.shapes = buildShapes(panel.shapes);
    layout.annotations = buildAnnotations(panel.shapes);
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
