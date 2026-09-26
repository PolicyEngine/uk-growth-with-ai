'use client';

import { useEffect, useRef } from 'react';
import { renderTex, renderMathIn } from '../lib/katex.js';
import { linkObr } from '../lib/obrLinks.jsx';
import { PANEL_DATA } from '../data/methodologyPanels.js';

// Marks for 'grid' sections: y = has it, p = partly, n = does not; any
// other cell value is shown as text.
const GRID_MARK = { y: '✓', p: '~', n: '✗' };

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
            <div className="example-section-title">{linkObr(sec.label)}</div>
            {sec.type === 'math' &&
              sec.equations.map((eq, j) => (
                <div key={j} className="math-block-dark">
                  {eq.label && <div className="math-label">{eq.label}</div>}
                  <span className="katex-render" data-tex={eq.tex} />
                </div>
              ))}
            {sec.type === 'grid' && (
              <table className="panel-grid">
                <thead>
                  <tr>
                    <th />
                    {sec.cols.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{linkObr(r.label)}</th>
                      {r.cells.map((c, j) => (
                        <td key={j} className={`pg-${GRID_MARK[c] ? c : 'text'}`}>
                          {GRID_MARK[c] ?? linkObr(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {sec.type === 'output' && (
              <div className="example-output">
                {sec.lines.map((line, j) => (
                  <div key={j} className={`example-output-line ${line.cls || ''}`}>
                    <span className="icon">{line.icon}</span>
                    <span>{linkObr(line.text)}</span>
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
