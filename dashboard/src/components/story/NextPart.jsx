'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// The end of a story part, as one tight line (scene plan section 5, "End of
// a part"): "Next: part N" and the next part's title as a link, then the
// "go deeper" links to where this part's figures live in detail. The next
// part's opener is the next thing on the page, so this is a line, not a
// band. Links that bring no icon get one from story-identity.css (a link or
// an external-link mark). The story-next* classes stay as test hooks; the
// look is .part-links in story-identity.css.
// When the line is wider than the page it scrolls sideways, and its end
// fades (data-more) so the cut-off link reads as more to come.
function useMore() {
  const ref = useRef(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro?.disconnect();
    };
  }, []);
  return [ref, more];
}

export default function NextPart({ n, title, to, children, links }) {
  const [ref, more] = useMore();
  return (
    <nav className="part-links story-next" aria-label={n ? `Next: part ${n}` : 'Next'}>
      <div className="part-links-inner story-next-inner" ref={ref} data-more={more || undefined}>
        <a className="part-links-next story-next-link" href={`#${to}`}>
          <Icon name="arrowDown" size={16} />
          <span className="part-links-kicker">{n ? `Next: part ${n}` : 'Next'}</span>
          <span className="part-links-title">{title}</span>
        </a>
        {children ? (
          <p className="part-links-lead">
            <Icon name={iconFor('handover')} size={14} /> {children}
          </p>
        ) : null}
        {links ? (
          <div className="part-links-row story-next-links">
            <span className="part-links-label">
              <Icon name={iconFor('deeper')} size={14} />
              <span className="visually-hidden">Go deeper</span>
            </span>
            {links}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
