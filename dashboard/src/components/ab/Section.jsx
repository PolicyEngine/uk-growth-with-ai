import Icon from './Icon.jsx';

// A section heading on the page (AB SectionHeading.jsx), its icon bare.
export function SectionHeading({ id, icon, title, children }) {
  return (
    <div className="section-heading" id={id}>
      {icon ? <Icon name={icon} size={20} className="section-icon" /> : null}
      <div className="section-heading-text">
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

// A visible one-line caveat (AB Note.jsx).
export function Note({ children }) {
  return (
    <p className="note">
      <Icon name="info" size={14} />
      <span>{children}</span>
    </p>
  );
}

// A small notice chip for pending or provisional data.
export function Notice({ children }) {
  return <p className="notice-chip">{children}</p>;
}

// A plot-sized box with a sentence, never a zero (AB UnpublishedPlot.jsx).
export function Unpublished({ children }) {
  return (
    <div className="unpublished-plot">
      <p>{children}</p>
    </div>
  );
}
