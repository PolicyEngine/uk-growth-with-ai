'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';
import { side } from '@/tabs/ai/lines.js';

// The answer that opens an Explore page, on the full content width, left-
// aligned to the content edge: one row of equal chips, one per measure
// (measure icon, name, then an arrow and a direction word in the gain or
// loss colour where that applies; data-dir-concept keeps the sign), an
// optional no-foreign-capital note, the why as one inline chain on one line
// (icons and arrows, not a list), and one caveat line. No context line:
// the sticky settings chip names the settings. The data come from
// answers.js; every direction from the sign.
const I = ({ c, size = 16 }) => <Icon name={iconFor(c)} size={size} />;
export const ARROW = { above: '↑', below: '↓', on: '→' };

export default function AnswerStrip({ a }) {
  return (
    <div className="ex-strip">
      {a.chips?.length ? (
        <ul className="ex-chips is-row" aria-label="Direction of each measure against the OBR baseline" style={{ '--n': a.chips.length }}>
          {a.chips.map((c) => (
            <li key={c.key} className={`ex-chip${c.tone ? ` is-${c.tone}` : ''}`} data-chip={c.v} data-dir-concept={c.dir}>
              <I c={c.concept} size={18} />
              <span className="ex-chip-name">{c.name}</span>
              <span className="ex-chip-dir">
                <span aria-hidden="true">{ARROW[side(c.value)]}</span> {c.word}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {a.closed ? (
        <p className="ex-closed" data-chip="closed">
          <I c="closed" />
          <span>
            {a.closed.values.map((x, i) => (x == null ? null : <span key={i} data-dir={side(x)} />))}
            {a.closed.text}
          </span>
        </p>
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
        <p className="ex-why-line">
          <span className="ex-why-label">Why:</span>
          {a.why.map((l, i) => (
            <span key={l.key} className="ex-why-step">
              {i ? (
                <>
                  <Icon name="arrowRight" size={14} className="ex-why-arrow" />
                  <span className="visually-hidden">, so</span>
                </>
              ) : null}
              <I c={l.icon} />
              {l.dir == null ? <span>{l.text}</span> : <span data-dir={side(l.dir)}>{l.text}</span>}
            </span>
          ))}
        </p>
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
          {a.caveat ? <span>{a.caveat}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
