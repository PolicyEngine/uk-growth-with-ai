'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import SummaryBox, { SummaryLink, SummaryRow } from '@/components/ui/SummaryBox.jsx';
import { side } from '@/tabs/ai/lines.js';

// The answer that opens an Explore page, in one summary card (push D, Q6a;
// components/ui/SummaryBox.jsx) on the full content width: the scope line
// (`scope`), the label, then one row of equal chips, one per measure
// (measure icon, name, then an arrow and a direction word in the gain or
// loss colour where that applies; data-dir-concept keeps the sign), an
// optional no-foreign-capital note, the why as one inline chain on one line
// (icons and arrows, not a list), and one caveat line, each row led by an
// icon. No context line:
// the settings pill names the settings; `label` (optional) leads the strip
// where it does not follow the Version picker. The data come from
// answers.js; every direction from the sign.
const I = ({ c, size = 16 }) => <Icon name={iconFor(c)} size={size} />;
export const ARROW = { above: '↑', below: '↓', on: '→' };

export default function AnswerStrip({ a, label, scope }) {
  return (
    <SummaryBox className="ex-strip" scope={scope} label={label}>
      {a.chips?.length ? (
        <ul className="ex-chips is-row" aria-label="Direction of each measure against the OBR’s central forecast path" style={{ '--n': a.chips.length }}>
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
        <SummaryRow icon="closed" className="ex-closed" data-chip="closed">
          {a.closed.values.map((x, i) => (x == null ? null : <span key={i} data-dir={side(x)} />))}
          {a.closed.text}
        </SummaryRow>
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
        <SummaryRow icon="why" className="ex-why-line">
          <span className="ex-why-label">Why:</span>{' '}
          {a.why.map((l, i) => (
            <span key={l.key} className="ex-why-step">
              {i ? (
                <>
                  <Icon name="arrowRight" size={14} className="ex-why-arrow" />
                  <span className="visually-hidden">, so </span>
                </>
              ) : null}
              <I c={l.icon} />
              {l.dir == null ? <span>{l.text}</span> : <span data-dir={side(l.dir)}>{l.text}</span>}
            </span>
          ))}
        </SummaryRow>
      ) : null}
      {a.caveat ? (
        <SummaryRow icon="caveat" className="ex-caveat-line">
          {a.caveat}
        </SummaryRow>
      ) : null}
      {a.link ? (
        <SummaryLink tab="explore" sub="finances" anchor={a.link.anchor}>
          {a.link.text}
        </SummaryLink>
      ) : null}
    </SummaryBox>
  );
}
