'use client';

import IconLine, { IconLineIcon } from '@/components/ui/IconLine.jsx';

// The story's one call-out: a note that sits beside the narrative (which
// model a part uses, what a result leaves out). Highlight-band background,
// a 3px left rule in the part's accent, a plain icon and a sentence-case
// title. With a title the icon leads the title (every text element leads
// with an icon); without one it sits in the margin.
//
// `icon` is a concept from lib/concepts.js.
//
//   <Callout icon="model" title="A different model">…</Callout>
export default function Callout({ icon = 'caveat', title, children, className = '', as: Tag = 'aside', ...rest }) {
  return (
    <Tag className={`story-callout part-callout${title ? ' has-title' : ' icon-line is-ui'} ${className}`} {...rest}>
      {title ? null : <IconLineIcon concept={icon} className="story-callout-icon" />}
      <div className="story-callout-body">
        {title ? (
          <IconLine concept={icon} className="story-callout-title" iconClassName="story-callout-title-icon">
            {title}
          </IconLine>
        ) : null}
        {children}
      </div>
    </Tag>
  );
}
