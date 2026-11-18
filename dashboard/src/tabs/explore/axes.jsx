'use client';

// Axis titles for an HTML chart (heatmap, dot rows, bar rows): one short
// line in the chart's own box, no icon (round 1: icons in headers only), the y title (what a row or the value
// axis is, with its unit) and the x title, each marked data-axis-title so
// scripts/check_axes.mjs finds them. A reference label ("OBR baseline
// = 0") may follow.
export function AxisTitles({ y, x, reference, className = '' }) {
  return (
    <p className={`ex-axis-titles ${className}`}>
      <span>
        <span data-axis-title="y" data-axis="">{y}</span>
        {x ? (
          <>
            {' · '}
            <span data-axis-title="x" data-axis="">{x}</span>
          </>
        ) : null}
        {reference ? (
          <>
            {' · '}
            <span className="ex-axis-ref">{reference}</span>
          </>
        ) : null}
      </span>
    </p>
  );
}
