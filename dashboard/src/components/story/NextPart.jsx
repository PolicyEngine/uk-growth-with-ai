'use client';

import Icon from '@/components/ab/Icon.jsx';

// The band that ends a story part: "Next: part N", the next part's title as a
// link, one sentence on what changes, and optionally a row of links to where
// this part's figures live in detail. Full-bleed, the same band as the part
// heads, so the story reads as chapters.
export default function NextPart({ n, title, to, children, links }) {
  return (
    <nav className="story-next" aria-label={n ? `Next: part ${n}` : 'Next'}>
      <div className="story-next-inner">
        <a className="story-next-link" href={`#${to}`}>
          <span className="story-next-kicker">{n ? `Next: part ${n}` : 'Next'}</span>
          <span className="story-next-title">
            {title} <Icon name="arrowDown" size={18} />
          </span>
        </a>
        {children ? <p className="story-next-lead">{children}</p> : null}
        {links ? <div className="story-next-links">{links}</div> : null}
      </div>
    </nav>
  );
}
