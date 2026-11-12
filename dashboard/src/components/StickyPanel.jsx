'use client';

import { Tex, withMath } from '../lib/katex.jsx';
import { linkObr } from '../lib/obrLinks.jsx';
import { PANEL_DATA } from '../data/methodologyPanels.js';

// Marks for 'grid' sections: y = has it, p = partly, n = does not; any
// other cell value is shown as text.
const GRID_MARK = { y: '✓', p: '~', n: '✗' };

export default function StickyPanel({ stepIndex, panels = PANEL_DATA, id = 'sticky-panel' }) {
  const data = panels[stepIndex] || panels[0];
  // Math is typeset during render (withMath / Tex), never by rewriting the
  // DOM afterwards: React owns these nodes (#26).
  const rich = (text) => withMath(text, linkObr);

  return (
    <div className="example-panel" id={id}>
      <div className="example-header">
        <span className="example-title">{data.title}</span>
        <span className="example-badge">{data.badge}</span>
      </div>
      <div className="example-body">
        {data.sections.map((sec, i) => (
          <div key={i} className="example-section">
            <div className="example-section-title">{rich(sec.label)}</div>
            {sec.type === 'math' &&
              sec.equations.map((eq, j) => (
                <div key={j} className="math-block-dark">
                  {eq.label && <div className="math-label">{rich(eq.label)}</div>}
                  <Tex tex={eq.tex} display />
                </div>
              ))}
            {sec.type === 'grid' && (
              <table className="panel-grid">
                <thead>
                  <tr>
                    <th />
                    {sec.cols.map((c) => (
                      <th key={c}>{rich(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{rich(r.label)}</th>
                      {r.cells.map((c, j) => (
                        <td key={j} className={`pg-${GRID_MARK[c] ? c : 'text'}`}>
                          {GRID_MARK[c] ?? rich(c)}
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
                    <span className="icon">{rich(line.icon)}</span>
                    <span>{rich(line.text)}</span>
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
