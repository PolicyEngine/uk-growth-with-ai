'use client';

import Icon from '@/components/ab/Icon.jsx';

// The opener of a story part: kicker, heading, one lead sentence.
export default function PartHead({ part, children, extra }) {
  return (
    <header className="story-part-head">
      <p className="story-part-kicker">
        <Icon name={part.icon} size={16} /> {part.kicker}
      </p>
      <h2 id={`${part.id}-h`}>{part.title}</h2>
      {children ? <p>{children}</p> : null}
      {extra}
    </header>
  );
}
