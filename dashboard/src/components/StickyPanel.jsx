'use client';

import { useEffect, useRef } from 'react';
import { renderTex, renderMathIn } from '../lib/katex.js';
import { PANEL_DATA } from '../data/methodologyPanels.js';

export default function StickyPanel({ stepIndex, panels = PANEL_DATA, id = 'sticky-panel' }) {
  const bodyRef = useRef(null);
  const data = panels[stepIndex] || panels[0];

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.querySelectorAll('.katex-render').forEach((el) => {
      renderTex(el, el.dataset.tex, true);
    });
    renderMathIn(bodyRef.current);
  }, [stepIndex, panels]);

  return (
    <div className="example-panel" id={id}>
      <div className="example-header">
        <span className="example-title">{data.title}</span>
        <span className="example-badge">{data.badge}</span>
      </div>
      <div className="example-body" ref={bodyRef}>
        {data.sections.map((sec, i) => (
          <div key={i} className="example-section">
            <div className="example-section-title">{sec.label}</div>
            {sec.type === 'math' &&
              sec.equations.map((eq, j) => (
                <div key={j} className="math-block-dark">
                  {eq.label && <div className="math-label">{eq.label}</div>}
                  <span className="katex-render" data-tex={eq.tex} />
                </div>
              ))}
            {sec.type === 'output' && (
              <div className="example-output">
                {sec.lines.map((line, j) => (
                  <div key={j} className={`example-output-line ${line.cls || ''}`}>
                    <span className="icon">{line.icon}</span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
