// Hyphenated names ("OBR-central", "uk-ai-study", "OG-UK") kept whole on one
// line and drawn tight: each hyphenated word sits in a nowrap span, and the
// hyphen in a span that pulls in Inter's wide side bearings (story.css
// .hy-dash). A normal hyphen (U+002D) throughout: the non-breaking hyphen
// (U+2011) is not in the self-hosted Inter subset and falls back to
// another font, which opened the gaps the review saw. The dash also turns
// tabular figures off: Inter's tnum gives the hyphen a figure's width
// (0.65em against 0.46em), and the story and Explore wrappers set
// tabular-nums, which is what spaces "debt-neutral" and "OG-UK" apart.
//
//   <Hy>gaps against the forecast path</Hy>
//   hy('uk-ai-study') → the same nodes, for a string inside other markup
const WORD = /(\S*\w-\w\S*)/;

export function hy(text) {
  if (typeof text !== 'string' || !text.includes('-')) return text;
  return text.split(WORD).map((part, i) =>
    i % 2 ? (
      <span key={i} className="hy">
        {part.split('-').map((w, j) => (
          <span key={j}>
            {j ? <span className="hy-dash" style={{ fontVariantNumeric: 'normal' }}>-</span> : null}
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
