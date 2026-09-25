'use client';

import { useEffect, useRef } from 'react';

const FALLBACK_PALETTE = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6'];

function baseLayout(title) {
  return {
    margin: { l: 86, r: 18, t: 18, b: 44 },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Inter, Roboto, sans-serif', size: 10, color: '#4B5563' },
    xaxis: {
      showgrid: true,
      gridcolor: '#ececec',
      zeroline: false,
      color: '#6B7280',
      ticks: 'outside',
      tickfont: { size: 10 },
      linecolor: '#E2E8F0',
    },
    yaxis: {
      title: {
        text: title,
        font: { size: 13, color: '#1F2937', family: 'Inter, Roboto, sans-serif' },
        standoff: 14,
      },
      showgrid: true,
      gridcolor: '#ececec',
      zeroline: false,
      color: '#6B7280',
      tickfont: { size: 10 },
      linecolor: '#E2E8F0',
      automargin: true,
    },
    showlegend: false,
    hovermode: 'x unified',
    shapes: [],
  };
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
      color: s.color || '#95a5a6',
      width: s.width || 1,
      dash: s.dash || 'dot',
    },
  }));
}

// `firstNames` is the trace-name list from panel index 0 of this group; later
// panels inherit any empty names by position (Plotly subplot pattern).
export default function PlotPanel({ panel, firstNames = [], visible = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Plotly) return;
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
          color: t.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
          width: t.width || 2,
          dash: t.dash || 'solid',
        },
        hovertemplate: `%{x}: %{y:.2f}<extra>${name}</extra>`,
      };
    });

    const layout = baseLayout(panel.title);
    layout.shapes = buildShapes(panel.shapes);
    layout.showlegend = false;

    window.Plotly.newPlot(el, traces, layout, { displayModeBar: false, responsive: true });

    return () => {
      try {
        window.Plotly.purge(el);
      } catch {
        /* ignore */
      }
    };
  }, [panel, firstNames]);

  // Resize when becoming visible (e.g. tab switch or filter changes).
  useEffect(() => {
    if (!visible || !ref.current || !window.Plotly) return;
    const id = requestAnimationFrame(() => {
      try {
        window.Plotly.Plots.resize(ref.current);
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  return (
    <div className="panel-cell" style={{ display: visible ? '' : 'none' }}>
      <div className="plot" ref={ref} />
    </div>
  );
}
