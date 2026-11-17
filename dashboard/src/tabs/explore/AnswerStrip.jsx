'use client';

import Icon from '@/components/ab/Icon.jsx';
import { WhyChain } from '@/components/story/Items.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { side } from '@/tabs/ai/lines.js';

// The answer that opens an Explore page, on the full content width: a small
// context line, one chip per measure (measure icon, name and direction
// word; round 1: no arrow beside the word, data-dir keeps the sign, coloured gain or loss where that applies), an optional
// closed-capital chip, a one-line why chain and one caveat note. The data
// come from answers.js; every direction from the sign.
const I = ({ c, size = 16 }) => <Icon name={iconFor(c)} size={size} />;

export default function AnswerStrip({ a }) {
  return (
    <div className="ex-strip">
      {a.context ? (
        <p className="ex-context">
          <span>{a.context}</span>
        </p>
      ) : null}
      {a.chips?.length ? (
        <ul className="ex-chips" aria-label="Direction of each measure against the path">
          {a.chips.map((c) => (
            <li key={c.key} className={`ex-chip${c.tone ? ` is-${c.tone}` : ''}`} data-chip={c.v} data-dir-concept={c.dir}>
              <I c={c.concept} size={18} />
              <span className="ex-chip-name">{c.name}</span>
              <span className="ex-chip-dir">{c.word}</span>
            </li>
          ))}
          {a.closed ? (
            <li className="ex-chip is-note" data-chip="closed">
              <I c="closed" />
              <span>
                {a.closed.values.map((x, i) => (x == null ? null : <span key={i} data-dir={side(x)} />))}
                {a.closed.text}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
      {a.drivers?.length ? (
        <ul className="ex-chips">
          {a.drivers.map((d) => (
            <li key={d.key} className="ex-chip is-plain">
              <I c={d.icon} size={18} />
              <span>{d.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {a.why ? (
        <WhyChain
          className="ex-why"
          label="Why"
          links={a.why.map((l) => ({
            ...l,
            text:
              l.dir == null ? (
                l.text
              ) : (
                <span data-dir={side(l.dir)}>{l.text}</span>
              ),
          }))}
        />
      ) : null}
      {a.link || a.caveat ? (
        <p className="ex-caveat-line">
          {a.link ? (
            <span>
              <NavLink tab="explore" sub="finances" anchor={a.link.anchor}>
                {a.link.text}
              </NavLink>
            </span>
          ) : null}
          {a.caveat ? (
            <span>
              {a.caveat}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
