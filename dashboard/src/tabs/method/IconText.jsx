import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// A line of text led by a plain concept icon, for the short lines on the
// Method and sources pages (section sub-lines, card findings, notes, links).
//   <IconText icon="source">Derivations: …</IconText>
export default function IconText({ icon, children, className = '' }) {
  return (
    <span className={`mx-it ${className}`}>
      <Icon name={iconFor(icon)} size={14} className="mx-it-icon" />
      <span className="mx-it-text">{children}</span>
    </span>
  );
}
