'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// The end of a story part, as one tight line (scene plan section 5, "End of
// a part"): "Next: part N" and the next part's title as a link, then the
// "go deeper" links to where this part's figures live in detail. The next
// part's opener is the next thing on the page, so this is a line, not a
// band. Links that bring no icon get one from story-identity.css (a link or
// an external-link mark). The story-next* classes stay as test hooks; the
// look is .part-links in story-identity.css.
//
// Round 1 (plan S6): the band is folded into the next part's opener (its
// handover line); the deep links move to the close. NextPart renders
// nothing unless `show` is passed (old callers keep working).
export default function NextPart({ n, title, to, children, links, show = false }) {
  if (!show) return null;
  return (
    <nav className="part-links story-next" aria-label={n ? `Next: part ${n}` : 'Next'}>
      <div className="part-links-inner story-next-inner">
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
