'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// The chapter opener of a story part (scene plan section 5): one strip in
// the part's colours (story-identity.css reads --part-accent and
// --part-tint, set per part by data-part on the section).
//   left:  the numeral, "Part n" and the model badge; the title with the
//          part icon; one line on what the part answers
//   right: the handover line naming the change of model, chips linking to
//          the homes of the part's facts (names only, no numbers: each fact
//          has one home), and an "About this model" disclosure
// It replaces the old head and its padding: no extra height.
export const MODELS = {
  official: { label: 'Official statistics', icon: 'source' },
  oguk: { label: 'OG-UK', icon: 'model' },
  aistudy: { label: 'uk-ai-study · provisional', icon: 'provisional' },
};

// Text with a leading icon: a plain string gets the concept's icon; a node
// is assumed to bring its own (the part files pass <Tx icon=…> or <Icon>).
function Lead({ concept, children }) {
  if (typeof children === 'string') {
    return (
      <>
        <Icon name={iconFor(concept)} size={16} className="part-opener-ic" /> {children}
      </>
    );
  }
  return children;
}

// API fixed by the plan (section 5), for the part builders:
//   <PartOpener part={part} model="official|oguk|aistudy" answers="…"
//     handover={node} about={node} chips={[{ concept, label, anchor }]} />
export function PartOpener({ part, model, answers, handover, about, chips, extra }) {
  const m = MODELS[model];
  // chips sit under the answers line when the side column has the handover
  // (it is the longer text), else in the side column
  const chipsInMain = Boolean(handover);
  const chipList = chips?.length ? (
    <ul className="part-opener-chips" aria-label={`Jump to, in ${part.kicker.toLowerCase()}`}>
      {chips.map((c) => (
        <li key={c.anchor}>
          <NavLink tab="story" anchor={c.anchor} className="part-chip">
            <Icon name={iconFor(c.concept)} size={14} /> {c.label}
          </NavLink>
        </li>
      ))}
    </ul>
  ) : null;
  const side = handover || about || (chips?.length && !chipsInMain);
  return (
    <header className={`part-opener${side ? ' has-side' : ''}`}>
      <div className="part-opener-main">
        <p className="part-opener-kicker">
          <span className="part-opener-numeral" aria-hidden="true" data-axis="">
            {part.n}
          </span>
          <span className="part-opener-part">
            {m ? null : <Icon name={iconFor(part.icon)} size={14} />}
            {part.kicker}
          </span>
          {m ? (
            <span className="part-badge">
              <Icon name={iconFor(m.icon)} size={13} /> {m.label}
            </span>
          ) : null}
        </p>
        <h2 id={`${part.id}-h`}>
          <Icon name={iconFor(part.icon)} size={24} className="part-opener-h-ic" /> {part.title}
        </h2>
        {answers ? (
          <div className="part-opener-answers">
            <Lead concept="answers">{answers}</Lead>
          </div>
        ) : null}
        {extra}
        {chipsInMain ? chipList : null}
      </div>
      {side ? (
        <div className="part-opener-side">
          {handover ? (
            <p className="part-opener-handover">
              <Lead concept="handover">{handover}</Lead>
            </p>
          ) : null}
          {chipsInMain ? null : chipList}
          {about ? (
            <details className="part-opener-about">
              <summary>
                <Icon name={iconFor('caveat')} size={14} /> About this model
              </summary>
              <div className="part-opener-about-body">{about}</div>
            </details>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

// Backward compatible: the part files call
//   <PartHead part={part} extra={…}>lead</PartHead>.
// The model, handover, chips and about come from the part object (StoryTab's
// PARTS). The lead is the answers line, unless PARTS gives a shorter one
// (part 3: the old lead was 26 words and carried no figures).
export default function PartHead({ part, children, extra }) {
  return (
    <PartOpener part={part} model={part.model} answers={part.answers ?? children} handover={part.handover} about={part.about} chips={part.chips} extra={extra} />
  );
}
