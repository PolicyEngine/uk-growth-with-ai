'use client';

import Icon from '@/components/ab/Icon.jsx';

// The story's one call-out: a note that sits beside the narrative (which
// model a part uses, what a result leaves out). Highlight-band background,
// a 3px left rule, a plain icon and a sentence-case title.
//
//   <Callout icon="info" title="A different model">…</Callout>
export default function Callout({ icon = 'info', title, children, className = '', as: Tag = 'aside', ...rest }) {
  return (
    <Tag className={`story-callout ${className}`} {...rest}>
      <Icon name={icon} size={18} className="story-callout-icon" />
      <div className="story-callout-body">
        {title ? <p className="story-callout-title">{title}</p> : null}
        {children}
      </div>
    </Tag>
  );
}
