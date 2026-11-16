'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// Axis titles for an HTML chart (matrix, heatmap, dot rows, bar rows): one
// short line in the chart's own box, the y title (what a row or the value
// axis is, with its unit) and the x title, each marked data-axis-title so
// scripts/check_axes.mjs finds them. A reference label ("OBR-central path
// = 0") may follow.
export function AxisTitles({ y, x, reference, className = '' }) {
  return (
    <p className={`ex-axis-titles ${className}`}>
      <Icon name={iconFor('measure')} size={14} />
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
