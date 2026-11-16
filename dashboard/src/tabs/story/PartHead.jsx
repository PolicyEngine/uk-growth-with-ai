'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// The opener of a story part, on a full-bleed band: a large part numeral,
// kicker, heading, one lead sentence.
export default function PartHead({ part, children, extra }) {
  return (
    <header className="story-part-head">
      <p className="story-part-numeral" aria-hidden="true" data-axis="">
        {part.n}
      </p>
      <p className="story-part-kicker">
        <Icon name={iconFor(part.icon)} size={16} /> {part.kicker}
      </p>
      <h2 id={`${part.id}-h`}>{part.title}</h2>
      {children ? <p>{children}</p> : null}
      {extra}
    </header>
  );
}
