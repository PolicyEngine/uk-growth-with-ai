'use client';

import { TipTarget } from '@/components/ab/Tip.jsx';
import { Hy } from '@/components/story/Hy.jsx';

// The chapter opener of a story part (Fable's part-opener ruling, 17 Nov):
// one thin rule above it, then
//   kicker: "Part n · <model>", 12px muted, the page's one kicker above a
//           heading; the model label opens one line saying which model
//           this is (story-beats-fable.md section 8: a TipTarget, dotted
//           underline, no icon)
//   h2:     the one question the part answers, 24/700, at the full content
//           width
// and "About this model" as the part's one fold, under them. No icon, no
// second line. Its copy prints no signed figure, so the number check's
// multiset is unchanged.
export const MODELS = {
  official: { label: 'Official statistics', tip: 'Published statistics only. The one forecast shown is the OBR’s.' },
  oguk: { label: 'OG-UK', tip: 'A model of the whole economy over decades. It has no unemployment. Results are gaps against the OBR’s central forecast path, which already includes the OBR’s AI.' },
  aistudy: { label: 'Household study', tip: 'A one-year simulation of UK households. Job losses are assumed. Its figures are never added to part 2’s.' },
};

// The model label with its one-line tip.
export function ModelTip({ model }) {
  const m = MODELS[model];
  if (!m) return null;
  return (
    <TipTarget className="part-opener-model-tip" label="Which model is this?" tip={<span className="part-opener-tip">{m.tip}</span>}>
      <Hy>{m.label}</Hy>
    </TipTarget>
  );
}

// API for the part builders:
//   <PartOpener part={part} />   part = { id, n, kicker, model, question, line, about }
// `line`: the model's one key limit, shown open above the fold (newcomer
// review item 4), in the fold body's type.
// `title` stays on the part object for the rail; `answers`, `handover`,
// `chips`, `extra`, `icon` and `modelLine` (old API) are not drawn.
export function PartOpener({ part, question, about }) {
  return (
    <header className="part-opener">
      <p className="part-opener-meta">
        {part.kicker}
        {MODELS[part.model] ? (
          <>
            {' · '}
            <ModelTip model={part.model} />
          </>
        ) : null}
      </p>
      <h2 id={`${part.id}-h`}>{question ?? part.title}</h2>
      {part.line ? <div className="part-opener-about-body part-opener-line">{part.line}</div> : null}
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
// The question and about come from the part object (StoryTab's PARTS); the
// old lead (`children`) and `extra` are not drawn.
// eslint-disable-next-line no-unused-vars
export default function PartHead({ part, children, extra }) {
  return <PartOpener part={part} question={part.question} about={part.about} />;
}
