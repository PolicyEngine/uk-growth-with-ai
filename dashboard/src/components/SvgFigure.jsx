'use client';

// Renders a figure whose SVG markup was ported verbatim from the source
// dashboard (uk_ai_trajectories.html), or a child chart. The markup is a
// build-time constant in src/data/aiFigureSvgs.js — no user input reaches it.
//
// `takeaway` is the one-line conclusion the reader should draw; `title` is
// the descriptive chart title, shown under it as a subtitle. The caption
// (notes and sources) sits under the chart.
export default function SvgFigure({ takeaway, title, caption, svg, className, children }) {
  return (
    <figure className={`plot-fig${className ? ` ${className}` : ''}`}>
      {takeaway || title ? (
        <figcaption>
          {takeaway ? <span className="plot-fig-takeaway">{takeaway}</span> : null}
          {title ? <span className="plot-fig-title">{title}</span> : null}
        </figcaption>
      ) : null}
      {svg ? (
        <div className="plot-fig-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="plot-fig-svg">{children}</div>
      )}
      {caption ? <p className="plot-fig-caption">{caption}</p> : null}
    </figure>
  );
}
