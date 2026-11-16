'use client';

import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { Hy } from '@/components/story/Hy.jsx';

// The chapter opener of a story part, in four lines (round 1, plan S5/S6):
// one thin rule above it (neutral: no tint, no part colour), then
//   meta:     "Part n · <model>" as plain meta text
//   title:    the h2, with the part's one icon
//   question: the one question the part answers
//   model:    one line on the model (it carries the handover the old "Next:
//             part n" band said at the end of the previous part)
// and "About this model" as the part's one fold, under them. No numeral,
// badge, chips or side column. New copy has no digits, so the number
// check's multiset is unchanged.
export const MODELS = {
  official: { label: 'Official statistics' },
  oguk: { label: 'OG-UK' },
  aistudy: { label: 'uk-ai-study' },
};

// API for the part builders:
//   <PartOpener part={part} />   part = { id, n, icon, kicker, title, model,
//                                         question, modelLine, about }
// `answers`, `handover`, `chips` and `extra` (old API) are not drawn.
export function PartOpener({ part, question, modelLine, about }) {
  const m = MODELS[part.model];
  return (
    <header className="part-opener">
      <p className="part-opener-meta">
        {part.kicker}
        {m ? <> · <Hy>{m.label}</Hy></> : null}
      </p>
      <h2 id={`${part.id}-h`}>
        <Icon name={iconFor(part.icon)} size={24} className="part-opener-h-ic" /> {part.title}
      </h2>
      {question ? <p className="part-opener-q">{question}</p> : null}
      {modelLine ? <p className="part-opener-model">{modelLine}</p> : null}
      {about ? (
        <details className="part-opener-about">
          <summary>About this model</summary>
          <div className="part-opener-about-body">{about}</div>
        </details>
      ) : null}
    </header>
  );
}

// Backward compatible: the part files call
//   <PartHead part={part} extra={…}>lead</PartHead>.
// The question, model line and about come from the part object (StoryTab's
// PARTS); the old lead (`children`) and `extra` are not drawn: the model
// line says what they said.
// eslint-disable-next-line no-unused-vars
export default function PartHead({ part, children, extra }) {
  return <PartOpener part={part} question={part.question} modelLine={part.modelLine} about={part.about} />;
}
