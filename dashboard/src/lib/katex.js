// Helpers around KaTeX (loaded from CDN in index.html).

export function renderMathIn(el) {
  if (!el || typeof window === 'undefined') return;
  if (typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
}

export function renderTex(el, tex, displayMode = true) {
  if (!el || typeof window === 'undefined') return;
  if (typeof window.katex === 'undefined') return;
  try {
    window.katex.render(tex, el, { displayMode, throwOnError: false });
  } catch {
    el.textContent = tex;
  }
}
