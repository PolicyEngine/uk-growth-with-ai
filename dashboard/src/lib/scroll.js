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
  window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduced() ? 'smooth' : 'instant' });
}

// Bring an anchor into view once it is laid out (its tab may have just been
// shown): open any fold round it, then scroll and move focus to it. Instant
// unless `smooth` (a smooth scroll through the story reads as lag, and runs
// every scene on the way).
export function revealAnchor(id, { smooth = false } = {}) {
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) el.dispatchEvent(new CustomEvent('reveal', { bubbles: true }));
    // a step of a pinned desktop scene (Fix A3): its items share one place,
    // so scrolling to the item lands on another state; the block goes to
    // that card's state instead
    const step = el?.closest('.scrolly.is-anchored .scrolly-step');
    if (step && !step.classList.contains('is-spacer')) {
      const blk = step.closest('.scrolly');
      const k = [...blk.querySelectorAll(':scope > .scrolly-steps > .scrolly-step:not(.is-spacer)')].indexOf(step);
      requestAnimationFrame(() => {
        blk.dispatchEvent(new CustomEvent('scrolly-go', { detail: { k: Math.max(0, k), instant: !smooth } }));
        if (el.tabIndex >= 0) el.focus({ preventScroll: true });
      });
      return;
    }
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
