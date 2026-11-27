// What a model leaves out, in one tinted panel (Method redesign, M16): the
// macro model's twelve limitations and the household study's nine tiles,
// text unchanged. A fallback until a shared caution panel lands: the tint
// is the Story's leaves-out band (--page-bg, story-bands.css .story-leaves),
// with a hairline border, so the Story can adopt the same component.
//   <CautionPanel heading={<SectionHeading … />}>…</CautionPanel>
export default function CautionPanel({ heading, className = '', children }) {
  return (
    <section className={`caution-panel ${className}`.trim()}>
      {heading}
      <div className="caution-panel-body">{children}</div>
    </section>
  );
}
