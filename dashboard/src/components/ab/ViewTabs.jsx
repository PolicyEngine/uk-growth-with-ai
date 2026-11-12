'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// Where a scrolling row keeps the chosen tab: 24px in from the edge it was
// near (AB ViewTabs.jsx scrollToShow).
export function scrollToShow({ left, width, scrollLeft, clientWidth }) {
  if (left - 24 < scrollLeft) return Math.max(0, left - 24);
  if (left + width + 24 > scrollLeft + clientWidth) return left + width + 24 - clientWidth;
  return scrollLeft;
}

// The page's flat tab row: a WAI-ARIA tablist, one sliding tint and
// underline for the chosen tab, a row that scrolls inside itself on a phone.
export default function ViewTabs({ tabs, value, onChange }) {
  const rowRef = useRef(null);
  const refs = useRef({});
  const [ind, setInd] = useState({ x: 0, width: 0, ready: false });
  const [fade, setFade] = useState({ start: false, end: false });

  const measure = () => {
    const row = rowRef.current;
    if (!row) return;
    const start = row.scrollLeft > 1;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    setFade((f) => (f.start === start && f.end === end ? f : { start, end }));
  };

  useLayoutEffect(() => {
    const place = () => {
      const node = refs.current[value];
      if (node) setInd((p) => ({ x: node.offsetLeft, width: node.offsetWidth, ready: p.width > 0 }));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [value]);

  useEffect(() => {
    const row = rowRef.current;
    const node = refs.current[value];
    if (row && node) {
      const next = scrollToShow({ left: node.offsetLeft, width: node.offsetWidth, scrollLeft: row.scrollLeft, clientWidth: row.clientWidth });
      if (next !== row.scrollLeft) row.scrollLeft = next;
    }
    measure();
  }, [value]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === value);
    const last = tabs.length - 1;
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i <= 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus({ preventScroll: true });
  };

  return (
    <div className="view-tabs-bar">
      <div
        ref={rowRef}
        className={`view-tabs${fade.start ? ' fade-start' : ''}${fade.end ? ' fade-end' : ''}`}
        role="tablist"
        aria-label="Report sections"
        onKeyDown={onKeyDown}
        onScroll={measure}
      >
        <span
          className={`view-tabs-indicator${ind.ready ? ' is-ready' : ''}`}
          aria-hidden="true"
          style={{ width: ind.width, transform: `translateX(${ind.x}px)` }}
        />
        {tabs.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              ref={(n) => {
                refs.current[t.id] = n;
              }}
              type="button"
              role="tab"
              id={`tabbtn-${t.id}`}
              aria-selected={selected}
              aria-controls={`tab-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className="view-tab"
              onClick={() => onChange(t.id)}
            >
              <Icon name={t.icon} size={18} className="view-tab-icon" />
              <span className="view-tab-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
