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
// The rail is also the sticky chapter indicator: each segment wears its
// part's accent (data-part, story-identity.css) and the current one names
// the scene being read after a middle dot, on desktop. Scene names come from
// the scene sub-headers ([data-scene], rendered by Scrolly's `sub`); with
// none on the page the rail shows the part name alone.
export function sectionProgress({ top, height, scrollY, line, maxScroll }) {
  const start = top - line; // scrollY at which the section begins
  const span = Math.max(1, Math.min(height, maxScroll - start));
  if (scrollY >= maxScroll - 2) return 1; // the bottom of the page: every part is read
  return Math.min(1, Math.max(0, (scrollY - start) / span));
}

// the scene being read: the last [data-scene] inside the section whose top
// has passed the reading line
function sceneAt(section, line) {
  if (!section) return '';
  let name = '';
  for (const el of section.querySelectorAll('[data-scene]')) {
    if (el.getBoundingClientRect().top <= line) name = el.getAttribute('data-scene') || '';
  }
  return name;
}

function useSectionProgress(ids) {
  const [p, setP] = useState(() => ids.map(() => 0));
  const [scene, setScene] = useState('');
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
      let cur = -1;
      next.forEach((x, i) => {
        if (x > 0) cur = i;
      });
      setScene(cur >= 0 ? sceneAt(document.getElementById(ids[cur]), line) : '');
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
  return [p, scene];
}

export default function StoryRail({ sections }) {
  const ids = sections.map((s) => s.id);
  const [key] = useState(() => ids);
  const [p, scene] = useSectionProgress(key);
  // the current part: the last one begun and not finished, else the last begun
  let cur = -1;
  p.forEach((x, i) => {
    if (x > 0) cur = i;
  });
  return (
    <nav className="story-rail" aria-label="Parts of the story">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} data-part={i + 1} className={i === cur ? 'is-current' : p[i] >= 1 ? 'is-read' : undefined}>
            <NavLink tab="story" anchor={s.id} className="story-rail-link" aria-current={i === cur ? 'location' : undefined}>
              <span className="story-rail-n">
                {s.icon ? <Icon name={iconFor(s.icon)} size={14} className="story-rail-ic" /> : null}
                {s.short}
              </span>
              <span className="story-rail-t">
                {s.title}
                {i === cur && scene ? <span className="story-rail-scene"> · {scene}</span> : null}
              </span>
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
