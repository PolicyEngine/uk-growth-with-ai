import katex from 'katex';

// KaTeX rendered to an HTML string, for React to insert with
// dangerouslySetInnerHTML. Math is never typeset by walking the DOM after
// render (KaTeX auto-render): that replaces text nodes React owns, and the
// next re-render then fails with "Failed to execute 'insertBefore' / 'removeChild'
// on 'Node'" (#26). React must own every node it reconciles, so the math is
// produced as markup inside an element whose children React does not manage.
export function texToHtml(tex, displayMode = false) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    return tex.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  }
}

export function Tex({ tex, display = false }) {
  return <span className="tex" dangerouslySetInnerHTML={{ __html: texToHtml(tex, display) }} />;
}

// Inline math in a plain string: \( ... \) (inline) and $$ ... $$ (display).
const MATH = /\\\((.+?)\\\)|\$\$(.+?)\$\$/gs;

// Split a string into text and typeset math. `wrapText` formats the text
// parts (e.g. linking OBR citations). Non-strings pass through unchanged.
export function withMath(text, wrapText = (t) => t) {
  if (typeof text !== 'string') return text;
  const out = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    if (m.index > last) out.push(<span key={`t${last}`}>{wrapText(text.slice(last, m.index))}</span>);
    out.push(<Tex key={`m${m.index}`} tex={m[1] ?? m[2]} display={m[2] !== undefined} />);
    last = m.index + m[0].length;
  }
  if (!out.length) return wrapText(text);
  if (last < text.length) out.push(<span key={`t${last}`}>{wrapText(text.slice(last))}</span>);
  return out;
}
