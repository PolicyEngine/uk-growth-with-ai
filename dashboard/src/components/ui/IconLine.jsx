import Icon from '@/components/ab/Icon.jsx';
import { iconFor } from '@/lib/concepts.js';

// One pattern for every line of text led by an icon (Vahid, 22 Nov: "why
// text are not align? like icon align and also texts, check all"): the
// icon in a fixed column, the text in a second column, so a wrapped line
// hangs under the first line's text, never under the icon. The icon is
// centred on the first line (its span is one line box tall, 1lh), not on
// the block. icon-line.css holds the geometry; each role keeps its own
// text size and colour.
//
// The icon's size follows the text tier (one size per tier, so stacked
// roles of one tier share one column):
//   body  16-17px text (step sentences, closing lines, finding leads): 18px icon, 10px gap
//   ui    14-15px text (notes, summary rows, bullets):                 16px icon, 8px gap
//   meta  11-13px text (captions, caveats, source notes):              14px icon, 6px gap
//
// The role class comes first (tests read it); the icon span is the block's first element child, the text one span
// after it (step-icons.test.jsx and check_text read the first child).
//   <IconLine concept="caveat" tier="meta" className="hh-note">…</IconLine>
//   <IconLine icon="info">…</IconLine>   (a raw Icon.jsx name, where the file has no concept)
export const ICON_TIER = { body: 18, ui: 16, meta: 14 };

export function IconLineIcon({ concept, icon, tier = 'ui', className = '', strokeWidth }) {
  return <Icon name={concept ? iconFor(concept) : icon} size={ICON_TIER[tier]} strokeWidth={strokeWidth} className={`icon-line-icon ${className}`.trim()} />;
}

export default function IconLine({ as: Tag = 'p', concept, icon, tier = 'ui', className = '', iconClassName = '', textClassName = '', children, ...rest }) {
  return (
    <Tag className={`${className} icon-line is-${tier}`.trim()} {...rest}>
      <IconLineIcon concept={concept} icon={icon} tier={tier} className={iconClassName} />
      <span className={`icon-line-text ${textClassName}`.trim()}>{children}</span>
    </Tag>
  );
}
