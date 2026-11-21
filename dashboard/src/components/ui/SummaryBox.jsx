import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';
import { NavLink } from '@/lib/nav.jsx';

// The summary card that opens an Explore page (push D, Q6a; Public
// finances reuses it, Q6e): one box in the site's card style (the Finding
// box's surface, hairline border and radius), holding
//   - the scope line: the model (its "Which model is this?" tip) and what
//     the figures are, as the first row, under a hairline;
//   - an optional label (the version and year the box answers for);
//   - its rows, each led by one icon (SummaryRow), the last optionally a
//     link row with an arrow (SummaryLink).
// The text follows the pickers, so the rows are a polite live region.
//   <SummaryBox id scope={<>…</>} label="…">
//     <SummaryRow icon="why">…</SummaryRow>
//     <SummaryLink tab sub anchor>…</SummaryLink>
//   </SummaryBox>
export default function SummaryBox({ id, scope, label, labelIcon = 'version', children, className = '' }) {
  return (
    <section className={`summary-box ${className}`.trim()} id={id} aria-label="Summary">
      {scope ? <p className="summary-scope model-scope">{scope}</p> : null}
      {label ? (
        <p className="summary-label">
          <Icon name={iconFor(labelIcon)} size={16} className="summary-icon" />
          <span>{label}</span>
        </p>
      ) : null}
      <div className="summary-rows" aria-live="polite">
        {children}
      </div>
    </section>
  );
}

// One row: its icon, then its content. `strong`: the box's finding (bold,
// title-level).
export function SummaryRow({ icon, strong = false, className = '', children, ...rest }) {
  return (
    <p className={`summary-row${strong ? ' is-strong' : ''} ${className}`.trim()} {...rest}>
      {icon ? <Icon name={iconFor(icon)} size={16} className="summary-icon" /> : null}
      <span className="summary-row-body">{children}</span>
    </p>
  );
}

// The box's link row: the link text, then an arrow.
export function SummaryLink({ tab, sub, anchor, children }) {
  return (
    <p className="summary-row summary-link">
      <NavLink tab={tab} sub={sub} anchor={anchor}>
        {children}
        <Icon name="arrowRight" size={14} className="summary-link-arrow" />
      </NavLink>
    </p>
  );
}
