'use client';

// Link to a numbered caveat (or any step) on UK growth with AI › How the
// scenarios are built. That sub-tab is not mounted while Results is showing,
// so the link switches sub-tab through the hash router, waits for the target
// to render, then scrolls to it.
export default function CaveatLink({ id, children }) {
  function go(e) {
    e.preventDefault();
    if (window.location.hash !== '#growth/method') window.location.hash = '#growth/method';
    let tries = 0;
    function attempt() {
      const el = document.getElementById(id);
      if (el && el.offsetHeight > 0) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 60) requestAnimationFrame(attempt);
    }
    requestAnimationFrame(attempt);
  }
  return (
    <a href="#growth/method" onClick={go}>
      {children}
    </a>
  );
}
