'use client';

import { useEffect, useState } from 'react';
import { NavLink } from '@/lib/nav.jsx';

// "You are here": a slim rail under the tab row with one segment per part
// of the story. Each segment fills as its part is read; the current part is
// marked (aria-current) and named. On phones only the current part's name
// shows, beside the numbers. Each segment is a link to its part.
function useSectionProgress(ids) {
  const [p, setP] = useState(() => ids.map(() => 0));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      setP((old) => {
        const next = ids.map((id) => {
          const el = document.getElementById(id);
          if (!el) return 0;
          const r = el.getBoundingClientRect();
          return Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
        });
        return next.every((x, i) => Math.abs(x - old[i]) < 0.002) ? old : next;
      });
    };
    const on = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [ids]);
  return p;
}

export default function StoryRail({ sections }) {
  const ids = sections.map((s) => s.id);
  const [key] = useState(() => ids);
  const p = useSectionProgress(key);
  // the current part: the last one begun and not finished, else the last begun
  let cur = -1;
  p.forEach((x, i) => {
    if (x > 0) cur = i;
  });
  return (
    <nav className="story-rail" aria-label="Parts of the story">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} className={i === cur ? 'is-current' : p[i] >= 1 ? 'is-read' : undefined}>
            <NavLink tab="story" anchor={s.id} className="story-rail-link" aria-current={i === cur ? 'location' : undefined}>
              <span className="story-rail-n">{s.short}</span>
              <span className="story-rail-t">{s.title}</span>
              <span className="story-rail-bar" aria-hidden="true">
                <i style={{ transform: `scaleX(${p[i].toFixed(3)})` }} />
              </span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
