// Scroll targets land below whatever sticky bars are showing, measured as
// they are (AB2026 utils/pageScroll.js), never a fixed offset.

export function stickyBottom() {
  if (typeof document === 'undefined') return 0;
  let bottom = 0;
  document.querySelectorAll('[data-sticky-bar]').forEach((el) => {
    if (getComputedStyle(el).position !== 'sticky') return;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top <= bottom + 1) bottom = Math.max(bottom, r.bottom);
  });
  return bottom;
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function scrollBelowBars(el, { smooth = true } = {}) {
  // the bars as they will be once stuck: band and tab row
  let bars = 0;
  document.querySelectorAll('[data-sticky-bar]').forEach((b) => {
    if (getComputedStyle(b).position === 'sticky') bars += b.offsetHeight - (parseFloat(getComputedStyle(b).top) < 0 ? -parseFloat(getComputedStyle(b).top) : 0);
  });
  const top = el.getBoundingClientRect().top + window.scrollY - bars - 16;
  window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced() ? 'smooth' : 'auto' });
}

// Bring an anchor into view once it is laid out (its tab may have just been
// shown): open any fold round it, then scroll and move focus to it.
export function revealAnchor(id, { smooth = true } = {}) {
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) el.dispatchEvent(new CustomEvent('reveal', { bubbles: true }));
    if (el && el.offsetHeight > 0) {
      requestAnimationFrame(() => {
        scrollBelowBars(el, { smooth });
        if (el.tabIndex >= 0) el.focus({ preventScroll: true });
      });
      return;
    }
    if (tries++ < 90) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
