'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// "You are here": a slim rail under the tab row with one segment per part
// of the story. Each segment fills as its part is read; the current part is
// marked (aria-current) and named. On phones only the current part's name
// shows, beside the numbers. Each segment is a link to its part.
//
// A section's progress runs from 0, when its top reaches the reading line,
// to 1, when its bottom does. The page can end before the last section's
// bottom reaches the line, so each section's span is capped at what is left
// to scroll: the last bar fills smoothly and is full at the bottom of the
// page. All positions are in page coordinates.
//
// The rail is also the sticky chapter indicator: part names only (round 1:
// the scene sub-label truncated and repeated the scene header).
export function sectionProgress({ top, height, scrollY, line, maxScroll }) {
  const start = top - line; // scrollY at which the section begins
  const span = Math.max(1, Math.min(height, maxScroll - start));
  if (scrollY >= maxScroll - 2) return 1; // the bottom of the page: every part is read
  return Math.min(1, Math.max(0, (scrollY - start) / span));
}

function useSectionProgress(ids) {
  const [p, setP] = useState(() => ids.map(() => 0));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const next = ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return sectionProgress({ top: r.top + scrollY, height: r.height, scrollY, line, maxScroll });
      });
      setP((old) => (next.every((x, i) => Math.abs(x - old[i]) < 0.002) ? old : next));
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
  return [p];
}

export default function StoryRail({ sections }) {
  const ids = sections.map((s) => s.id);
  const [key] = useState(() => ids);
  const [p] = useSectionProgress(key);
  // the current part: the last one begun and not finished, else the last begun
  let cur = -1;
  p.forEach((x, i) => {
    if (x > 0) cur = i;
  });
  return (
    <nav className="story-rail" aria-label="Parts of the story" data-sticky-bar="">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} data-part={i + 1} className={i === cur ? 'is-current' : p[i] >= 1 ? 'is-read' : undefined}>
            <NavLink tab="story" anchor={s.id} className="story-rail-link" aria-current={i === cur ? 'location' : undefined}>
              <span className="story-rail-n">
                {s.icon ? <Icon name={iconFor(s.icon)} size={14} className="story-rail-ic" /> : null}
                {s.short}
              </span>
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
