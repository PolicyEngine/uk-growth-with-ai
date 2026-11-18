import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// One finding in one box (item-18-fable.md): an optional plain icon and a
// bold lead, then two or three plain lines (full sentences, no icons, no
// bullets), an optional note, and optional children (a chart or a table)
// under them. A white box with a hairline border, like a card: no tint,
// no bar, no pills. `actions` (optional) sits at the end of the lead row:
// a card's sources and download buttons. The text follows the pickers, so
// it is a polite live region.
//   <Finding icon="age" lead="…" lines={['…', '…']} note={…}>{children}</Finding>
export default function Finding({ id, icon, lead, lines = [], note, actions, children, className = '' }) {
  const shown = lines.filter(Boolean);
  return (
    <section className={`finding ${className}`.trim()} id={id}>
      <div className="finding-head">
        <p className="finding-lead" aria-live="polite">
          {icon ? <Icon name={iconFor(icon)} size={18} className="finding-icon" /> : null}
          <span>{lead}</span>
        </p>
        {actions ? <div className="finding-actions">{actions}</div> : null}
      </div>
      {shown.length ? (
        <ul className="finding-lines" aria-live="polite">
          {shown.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
      {note ? <p className="finding-note">{note}</p> : null}
      {children ? <div className="finding-body">{children}</div> : null}
    </section>
  );
}
