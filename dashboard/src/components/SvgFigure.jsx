'use client';

// Renders a figure whose SVG markup was ported verbatim from the source
// dashboard (uk_ai_trajectories.html). The markup is a build-time constant in
// src/data/aiFigureSvgs.js — no user input reaches it.
export default function SvgFigure({ title, caption, svg, children }) {
  return (
    <figure className="plot-fig">
      <figcaption>
        <span className="plot-fig-title">{title}</span>
        {caption ? <span className="plot-fig-caption">{caption}</span> : null}
      </figcaption>
      {svg ? (
        <div className="plot-fig-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="plot-fig-svg">{children}</div>
      )}
    </figure>
  );
}
