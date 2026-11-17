// Hyphenated names ("OBR-central", "uk-ai-study", "OG-UK") kept whole on one
// line and drawn tight: each hyphenated word sits in a nowrap span, and the
// hyphen in a span that pulls in Inter's wide side bearings (story.css
// .hy-dash). A normal hyphen (U+002D) throughout: the non-breaking hyphen
// (U+2011) is not in the self-hosted Inter subset and falls back to
// another font, which opened the gaps the review saw.
//
//   <Hy>gaps against the no-shock baseline</Hy>
//   hy('uk-ai-study') → the same nodes, for a string inside other markup
const WORD = /(\S*\w-\w\S*)/;

export function hy(text) {
  if (typeof text !== 'string' || !text.includes('-')) return text;
  return text.split(WORD).map((part, i) =>
    i % 2 ? (
      <span key={i} className="hy">
        {part.split('-').map((w, j) => (
          <span key={j}>
            {j ? <span className="hy-dash">-</span> : null}
            {w}
          </span>
        ))}
      </span>
    ) : (
      part
    ),
  );
}

export function Hy({ children }) {
  return <>{hy(children)}</>;
}
