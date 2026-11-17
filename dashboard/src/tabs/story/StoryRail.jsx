'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribe } from '@/lib/scrollLoop.js';
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

// The sections' places (page coordinates) and the page's scroll range are
// measured on resize and when any section (or the page) changes size, not
// every frame; each frame only computes the progress from scrollY. The bars'
// fill is written straight to the DOM (bars[i].style.transform); React state
// changes only when the current part or a part's "read" mark does.
function useSectionProgress(ids, bars) {
  const [st, setSt] = useState(() => ({ cur: -1, read: ids.map(() => false) }));
  const last = useRef(st);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let geo = null;
    const fill = ids.map(() => '');
    const read = (f) => {
      if (!geo) {
        const maxScroll = document.documentElement.scrollHeight - f.V;
        geo = {
          maxScroll,
          V: f.V,
          secs: ids.map((id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { top: r.top + f.y, height: r.height };
          }),
        };
      }
      const line = geo.V * 0.35;
      return geo.secs.map((g) => (g ? sectionProgress({ top: g.top, height: g.height, scrollY: f.y, line, maxScroll: geo.maxScroll }) : 0));
    };
    const write = (p) => {
      p.forEach((x, i) => {
        const t = `scaleX(${x.toFixed(3)})`;
        const el = bars.current[i];
        if (el && fill[i] !== t) {
          fill[i] = t;
          el.style.transform = t;
        }
      });
      // the current part: the last one begun and not finished, else the last begun
      let cur = -1;
      p.forEach((x, i) => {
        if (x > 0) cur = i;
      });
      const rd = p.map((x) => x >= 1);
      const o = last.current;
      if (o.cur === cur && rd.every((x, i) => x === o.read[i])) return;
      last.current = { cur, read: rd };
      setSt(last.current);
    };
    const off = subscribe({ read, write });
    const stale = () => {
      geo = null;
      off.invalidate();
    };
    window.addEventListener('resize', stale);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(stale);
    if (ro) {
      ro.observe(document.body);
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) ro.observe(el);
      });
    }
    return () => {
      off();
      ro?.disconnect();
      window.removeEventListener('resize', stale);
    };
  }, [ids, bars]);
  return st;
}

export default function StoryRail({ sections }) {
  const ids = sections.map((s) => s.id);
  const [key] = useState(() => ids);
  const bars = useRef([]);
  const { cur, read } = useSectionProgress(key, bars);
  return (
    <nav className="story-rail" aria-label="Parts of the story" data-sticky-bar="">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id} data-part={i + 1} className={i === cur ? 'is-current' : read[i] ? 'is-read' : undefined}>
            <NavLink tab="story" anchor={s.id} className="story-rail-link" aria-current={i === cur ? 'location' : undefined}>
              <span className="story-rail-n">
                {s.icon ? <Icon name={iconFor(s.icon)} size={14} className="story-rail-ic" /> : null}
                {s.short}
              </span>
              <span className="story-rail-t">{s.title}</span>
              <span className="story-rail-bar" aria-hidden="true">
                <i
                  ref={(el) => {
                    bars.current[i] = el;
                  }}
                  style={{ transform: 'scaleX(0)' }}
                />
              </span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
