'use client';

// Link to a numbered caveat (or any step) on the Scenario design tab. The
// link switches tab through the hash router, waits for the target to be
// visible, then scrolls to it.
export default function CaveatLink({ id, children }) {
  function go(e) {
    e.preventDefault();
    if (window.location.hash !== '#scenarios') window.location.hash = '#scenarios';
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
    <a href="#scenarios" onClick={go}>
      {children}
    </a>
  );
}
