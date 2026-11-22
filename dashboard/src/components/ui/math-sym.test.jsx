// Maths-style symbols (request 22; Vahid, 22 Nov): MathSym's markup, its
// plain and spoken forms, MathText's tokens, and a sweep of every probe
// page: no parameter symbol is printed as plain text outside a .math-sym
// (SVG text, code blocks and KaTeX are plain by rule).
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import MathSym, { MathText, mathNodes, symSay, symText } from './MathSym.jsx';
import { PAGES, renderPage } from '@/lib/probeTestUtils.jsx';

afterEach(cleanup);

describe('MathSym', () => {
  it('an italic letter with a real subscript, the value upright after " = "', () => {
    const { container } = render(<MathSym name="zetaK" value={0.1} />);
    const s = container.querySelector('.math-sym');
    expect(s.innerHTML).toBe('<i>ζ</i><sub>K</sub> = 0.1');
    expect(s.textContent).toBe('ζK = 0.1');
    // no role and no label: the plain text reads unaided (push E, D10)
    expect(s.hasAttribute('role')).toBe(false);
    expect(s.hasAttribute('aria-label')).toBe(false);
  });
  it('a true minus, and plain and spoken forms for strings built in JS', () => {
    const { container } = render(<MathSym name="delta" value={-0.5} />);
    expect(container.textContent).toBe('δ = −0.5');
    expect(symSay('delta', -0.5)).toBe('delta equals minus 0.5');
    expect(symSay('zetaK', 0.1)).toBe('zeta K equals 0.1');
    expect(symSay('zetaK')).toBe('zeta K');
    expect(symText('zetaK', 0)).toBe('ζK = 0');
    expect(symText('tG1', 10)).toBe('tG1 = 10');
    expect(symSay('tG1', 10)).toBe('T G 1 equals 10');
  });
  it('MathText keeps the text as it was and wraps each symbol', () => {
    const cases = [
      ['Some (main case), ζK = 0.1: foreign investors', ['zetaK']],
      ['at ζK = 0 and 0.1', ['zetaK']],
      ['GNI − δK, with δ = 0.065 a year', ['delta K', 'delta']],
      ['Labour share = 1 − γ', ['gamma']],
      ['Exactly 1 − γ at ε = 1.', ['gamma', 'epsilon']],
      ['Capital share γ up; productivity Z up', ['gamma', 'Z']],
      ['tG1 = 10', ['tG1']],
    ];
    for (const [t, syms] of cases) {
      const { container, unmount } = render(<p>{mathNodes(t)}</p>);
      expect(container.textContent).toBe(t.replace('tG1', 'TG1'));
      expect([...container.querySelectorAll('.math-sym')].map((e) => e.dataset.sym)).toEqual(syms);
      for (const e of container.querySelectorAll('.math-sym')) {
        expect(e.hasAttribute('role')).toBe(false);
        expect(e.hasAttribute('aria-label')).toBe(false);
      }
      unmount();
    }
    // no symbol: the string itself; a Z that is not a symbol stays text
    expect(mathNodes('Zero growth')).toBe('Zero growth');
    const { container } = render(<MathText>{'Generation Z'}</MathText>);
    expect(container.querySelector('.math-sym')).toBeNull();
  });
});

// Where a symbol is still plain text on a page. SVG <text>, code and
// KaTeX are plain by rule; the title= and aria-label attributes are not
// text nodes.
const SYM = /[ζγεδ]|\btG1\b/;
function plainSymbols(root, page) {
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!SYM.test(n.nodeValue)) continue;
    const el = n.parentElement;
    if (el.closest('.math-sym, svg, code, pre, .katex, script, style')) continue;
    out.push(`${page}: ${el.tagName.toLowerCase()} "${n.nodeValue.trim().slice(0, 70)}"`);
  }
  return out;
}

describe('every page: parameter symbols through MathSym', () => {
  it('no plain ζ, γ, ε, δ or tG1 in the page text', () => {
    const all = [];
    for (const p of PAGES) {
      const { container, unmount } = renderPage(p);
      all.push(...plainSymbols(container, p[0]));
      unmount();
    }
    expect([...new Set(all)]).toEqual([]);
  }, 60000);
});
